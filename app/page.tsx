"use client"

import type React from "react"
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Loader2, Send, FileText, Plus, Minus, Upload, ChevronRight, Copy, X, Minimize2, Settings, Search } from 'lucide-react';
import { DocumentEditor } from '@/components/document-editor';
import { DocumentExtractor } from '@/lib/document-extractor';
import { MarkdownMessage } from '@/components/markdown-message';
import { FileUpload } from '@/components/ui/file-upload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AI_MODELS, DEFAULT_MODEL, getModelDisplayName } from '@/lib/ai-models';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  searchResults?: any[];
  isSearchResponse?: boolean;
}

export default function OnlyWriteAI() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(400) // Default width in pixels
  const [isResizing, setIsResizing] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentContextAdded, setDocumentContextAdded] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL)
  const [searchMode, setSearchMode] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  // Document state - can be default or uploaded file
  const [currentDocument, setCurrentDocument] = useState({
    id: "onlywriteai-test",
    title: "OnlyWriteAI.docx",
    fileType: "docx"
  })
  const [showFileUpload, setShowFileUpload] = useState(false)

  // Resizing functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    const minWidth = 300 // Minimum sidebar width
    const maxWidth = window.innerWidth * 0.6 // Maximum 60% of screen width
    
    setSidebarWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // Add event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  // Function to extract document content from OnlyOffice
  const extractDocumentContent = async () => {
    try {
      console.log('Extracting document content for:', currentDocument.id);
      
      // Use the utility function to get document context
      const contextMessage = await DocumentExtractor.getDocumentContextForChat(currentDocument.id);
      
      // Add the context to the input
      setInput(prev => prev + contextMessage);
      setDocumentContextAdded(true);
      
      console.log('Document context added successfully');
      
    } catch (error) {
      console.error('Error extracting document content:', error);
      
      // Fallback context
      const fallbackMessage = DocumentExtractor.getFallbackContext();
      setInput(prev => prev + fallbackMessage);
      setDocumentContextAdded(true);
    }
  }

  // Handle file upload
  const handleFileUploaded = (sessionData: {
    sessionId: string;
    fileName: string;
    fileType: string;
    documentId: string;
  }) => {
    console.log('File uploaded successfully:', sessionData);
    
    // Update current document to use the uploaded file
    setCurrentDocument({
      id: sessionData.documentId,
      title: sessionData.fileName,
      fileType: sessionData.fileType
    });
    
    // Hide file upload UI
    setShowFileUpload(false);
    
    // Reset any existing messages for new document
    setMessages([]);
    setDocumentContextAdded(false);
    
    // Show success message
    console.log(`Document switched to: ${sessionData.fileName}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setIsSearching(searchMode)
    setError(null)

    try {
      // Try streaming first, fallback to regular if needed
      const useStreaming = true; // Enable streaming by default
      
      if (useStreaming) {
        // Streaming implementation
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'text/stream'
          },
          body: JSON.stringify({ 
            message: input.trim(),
            model: selectedModel,
            searchMode: searchMode
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Create AI message placeholder
        const aiMessageId = `ai-${Date.now()}`;
        const aiMessage: Message = {
          id: aiMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          searchResults: undefined,
          isSearchResponse: false
        }
        setMessages(prev => [...prev, aiMessage])
        setIsLoading(false) // Hide loading dots, streaming takes over

        // Read streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.error) {
                      throw new Error(data.error + ': ' + data.details);
                    }
                    
                    // Update message with streaming content
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId ? {
                        ...msg,
                        content: data.fullResponse || data.content || msg.content,
                        searchResults: data.searchResults,
                        isSearchResponse: data.isSearchResponse
                      } : msg
                    ));
                    
                    if (data.done) {
                      break;
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse streaming data:', parseError);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        }
      } else {
        // Fallback to non-streaming
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: input.trim(),
            model: selectedModel,
            searchMode: searchMode
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          searchResults: data.searchResults,
          isSearchResponse: data.isSearchResponse
        }

        setMessages(prev => [...prev, aiMessage])
      }
    } catch (err) {
      console.error('Chat error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
      setIsSearching(false)
      // Auto-disable search mode after each search to save API costs
      if (searchMode) {
        setSearchMode(false)
      }
    }
  }

  // Simple clipboard-based text insertion for Community Edition
  const [showPasteInstruction, setShowPasteInstruction] = useState(false);

  const insertTextIntoDocument = async (text: string) => {
    try {
      // Copy text to clipboard
      await navigator.clipboard.writeText(text);
      
      // Show paste instruction
      setShowPasteInstruction(true);
      
      // Hide instruction after 5 seconds
      setTimeout(() => {
        setShowPasteInstruction(false);
      }, 5000);
      
      console.log('Text copied to clipboard:', text);
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
      // Fallback: show text in alert for manual copy
      alert(`Copy this text and paste it in your document:\n\n${text}`);
    }
  };

  // Fix hydration mismatch by setting client state after hydration
  useEffect(() => {
    setIsClient(true)
    
    // Load saved model preference from localStorage
    const savedModel = localStorage.getItem('onlywriteai-selected-model')
    if (savedModel && AI_MODELS[savedModel]) {
      setSelectedModel(savedModel)
    }
  }, [])
  
  // Save model preference to localStorage when changed
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('onlywriteai-selected-model', selectedModel)
    }
  }, [selectedModel, isClient])

  return (
    <div className="h-screen bg-gray-50 font-sans flex overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-col min-h-0" style={{ width: sidebarCollapsed ? '100%' : `calc(100% - ${sidebarWidth}px)` }}>
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">OnlyWriteAI</h1>
              <span className="text-sm text-gray-500">Document Editor</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-600 hover:text-gray-900"
                title="Upload Document"
              >
                <Upload className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-600 hover:text-gray-900"
                title={sidebarCollapsed ? "Show AI Assistant" : "Hide AI Assistant"}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Editor Container - Critical for OnlyOffice */}
        <div className="flex-1 min-h-0 bg-white relative">
          {showFileUpload && (
            <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center">
              <div className="max-w-md w-full mx-4">
                <FileUpload onFileUploaded={handleFileUploaded} />
                <button
                  onClick={() => setShowFileUpload(false)}
                  className="mt-4 w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <DocumentEditor
            key={currentDocument.id} // Force React to remount when document changes
            documentId={currentDocument.id}
            documentTitle={currentDocument.title}
            fileType={currentDocument.fileType}
            onClose={() => {}} // No-op for MVP
          />
        </div>
      </div>

      {/* Resize Handle */}
      {!sidebarCollapsed && (
        <div
          className={`w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-200 flex-shrink-0 relative group ${
            isResizing ? 'bg-blue-500' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
          {/* Visual indicator */}
          <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-8 bg-blue-400 rounded-full"></div>
          </div>
        </div>
      )}

      {/* AI Assistant Sidebar */}
      {!sidebarCollapsed && (
        <div 
          className="bg-white border-l border-gray-200 flex flex-col shadow-lg min-h-0 flex-shrink-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>AI Assistant</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={extractDocumentContent}
                className={`p-1.5 rounded-md transition-colors duration-200 flex items-center space-x-1 ${
                  documentContextAdded 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'
                }`}
                title={documentContextAdded ? 'Document context added!' : 'Add document content to chat'}
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {documentContextAdded ? '✓ Added' : 'Add Doc'}
                </span>
              </button>
              
              {/* Paste Instruction */}
              {showPasteInstruction && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-700 animate-pulse">
                  <span className="font-medium">
                    📋 Text copied! Press Ctrl+V in document to paste
                  </span>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors duration-200 text-gray-600 hover:text-gray-900"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Start a conversation to get AI assistance</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="flex flex-col max-w-[80%]">
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <MarkdownMessage 
                          content={message.content}
                          className="text-sm select-text"
                          searchResults={message.searchResults}
                          isSearchResponse={message.isSearchResponse}
                          onMouseUp={() => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().trim()) {
                              setSelectedText(selection.toString().trim());
                            }
                          }}
                        />
                      ) : (
                        <p 
                          className="text-sm leading-relaxed whitespace-pre-wrap select-text"
                          onMouseUp={() => {
                            const selection = window.getSelection();
                            if (selection && selection.toString().trim()) {
                              setSelectedText(selection.toString().trim());
                            }
                          }}
                        >
                          {message.content}
                        </p>
                      )}
                    </div>
                    
                    {/* Insert button for AI messages */}
                    {message.role === 'assistant' && (
                      <div className="flex items-center space-x-2 mt-2 ml-2">
                        {selectedText && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>Selected: "{selectedText.substring(0, 30)}{selectedText.length > 30 ? '...' : ''}"</span>
                            <button
                              onClick={() => {
                                insertTextIntoDocument(selectedText);
                                setSelectedText('');
                              }}
                              className="flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                              title="Copy selected text to clipboard"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Copy & Insert</span>
                            </button>
                          </div>
                        )}
                        
                        <button
                          onClick={() => insertTextIntoDocument(message.content)}
                          className="flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
                          title="Copy entire message to clipboard"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Copy & Insert All</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(message.content);
                          }}
                          className="flex items-center space-x-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2 rounded-lg bg-gray-100 text-gray-900 rounded-bl-sm">
                  <div className="flex space-x-1 items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2 rounded-lg bg-red-100 text-red-900 rounded-bl-sm">
                  <p className="text-sm leading-relaxed">Error: {error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="mt-auto bg-white border-t border-gray-200 p-4 flex-shrink-0">
            {/* Model Selector */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600 font-medium">AI Model:</span>
              </div>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-auto min-w-[200px] h-8 text-xs">
                  <SelectValue>
                    {getModelDisplayName(selectedModel)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AI_MODELS).map(([key, model]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <span>{model.icon}</span>
                        <span>{model.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    // Auto-expand textarea like ChatGPT
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    
                    // Calculate line height (approximately 20px per line)
                    const lineHeight = 20
                    const minHeight = lineHeight + 16 // 1 line + padding
                    const maxHeight = lineHeight * 6 + 16 // 6 lines + padding
                    
                    const newHeight = Math.max(minHeight, Math.min(target.scrollHeight, maxHeight))
                    target.style.height = newHeight + 'px'
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchMode ? "Enter your search query... (Press Enter to search)" : "Ask AI for help with your document... (Press Enter to send, Shift+Enter for new line)"}
                  className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm leading-5 overflow-y-auto transition-all duration-150 ease-out"
                  disabled={isLoading}
                  rows={1}
                  style={{ 
                    height: input ? 'auto' : '36px', // Start with single line height when empty
                    minHeight: '36px',
                    maxHeight: '136px' // 6 lines * 20px + 16px padding
                  }}
                />
                {/* Search toggle button */}
                <button
                  onClick={() => setSearchMode(!searchMode)}
                  className={`absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                    searchMode 
                      ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' 
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300 focus:ring-gray-500'
                  }`}
                  title={searchMode ? 'Disable web search' : 'Enable web search'}
                >
                  <Search className="w-4 h-4" />
                </button>
                
                {/* Send button */}
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
