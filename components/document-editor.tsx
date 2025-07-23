"use client"

import React, { useEffect, useRef, useState } from 'react';
import { OnlyOfficeService, onlyOfficeConfig } from '@/lib/onlyoffice';
import { Loader2, AlertCircle } from 'lucide-react';

interface DocumentEditorProps {
  documentId: string;
  documentTitle?: string;
  fileType?: string;
  onClose?: () => void;
}

export function DocumentEditor({ documentId, documentTitle, fileType, onClose }: DocumentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [editorLoading, setEditorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorConfig, setEditorConfig] = useState<any>(null);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const editorInstanceRef = useRef<any>(null);

  // First useEffect: Load configuration
  useEffect(() => {
    let mounted = true;
    
    const loadConfig = async () => {
      try {
        if (!mounted) return;
        
        setConfigLoading(true);
        setError(null);

        // Fetch editor configuration from API
        console.log('Fetching editor config for document:', documentId);
        
        // Build URL with query parameters for session documents
        let configUrl = `/api/documents/${documentId}/config`;
        if (documentTitle || fileType) {
          const params = new URLSearchParams();
          if (documentTitle) params.set('title', documentTitle);
          if (fileType) params.set('fileType', fileType);
          configUrl += `?${params.toString()}`;
        }
        
        const response = await fetch(configUrl);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Config API error:', response.status, errorText);
          throw new Error(`Failed to fetch editor configuration: ${response.status}`);
        }

        const { config } = await response.json();
        console.log('Editor config received:', config);
        
        if (!mounted) return;
        setEditorConfig(config);
        setConfigLoading(false);
        
      } catch (err) {
        console.error('Error loading config:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load configuration');
          setConfigLoading(false);
        }
      }
    };

    if (documentId) {
      loadConfig();
    }
    
    return () => {
      mounted = false;
    };
  }, [documentId]);

  // Second useEffect: Initialize editor when config is ready and DOM is mounted
  useEffect(() => {
    if (!editorConfig || configLoading || editorInitialized) return;
    
    let mounted = true;
    
    const initializeEditor = async () => {
      try {
        if (!mounted) return;
        
        setEditorLoading(true);
        setError(null);

        // Create OnlyOffice service instance
        const onlyOfficeService = new OnlyOfficeService(
          onlyOfficeConfig.documentServerUrl,
          onlyOfficeConfig.jwtSecret
        );

        // Load OnlyOffice API
        console.log('Loading OnlyOffice API from:', onlyOfficeConfig.documentServerUrl);
        await OnlyOfficeService.loadOnlyOfficeAPI(onlyOfficeConfig.documentServerUrl);
        console.log('OnlyOffice API loaded successfully');

        if (!mounted) return;
        
        // Wait a moment for the DOM to be fully ready
        setTimeout(() => {
          if (!mounted) return;
          
          const editorContainer = document.getElementById('onlyoffice-editor');
          if (editorContainer) {
            console.log('Initializing OnlyOffice editor with config:', editorConfig);
            const editorInstance = onlyOfficeService.initializeEditor('onlyoffice-editor', editorConfig);
            editorInstanceRef.current = editorInstance;
            console.log('OnlyOffice editor initialized');
            setEditorInitialized(true);
            setEditorLoading(false);
          } else {
            console.error('Editor container with ID "onlyoffice-editor" not found in DOM');
            throw new Error('Editor container not found in DOM');
          }
        }, 100);
        
      } catch (err) {
        console.error('Error initializing editor:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize editor');
          setEditorLoading(false);
        }
      }
    };

    initializeEditor();
    
    return () => {
      mounted = false;
      // Clean up OnlyOffice editor instance
      if (editorInstanceRef.current) {
        try {
          // OnlyOffice cleanup - be defensive about DOM manipulation
          const editorContainer = document.getElementById('onlyoffice-editor');
          if (editorContainer) {
            // Clear the container content safely
            editorContainer.innerHTML = '';
          }
          editorInstanceRef.current = null;
        } catch (cleanupError) {
          console.warn('Error during OnlyOffice cleanup:', cleanupError);
        }
      }
    };
  }, [editorConfig, configLoading, editorInitialized]);

  // Force complete cleanup and reinit when document changes
  useEffect(() => {
    // When documentId changes, force complete cleanup and reinit
    if (editorInstanceRef.current) {
      console.log('Document changed, forcing OnlyOffice cleanup and reinit');
      
      try {
        // Destroy current editor instance
        const editorContainer = document.getElementById('onlyoffice-editor');
        if (editorContainer) {
          editorContainer.innerHTML = '';
        }
        editorInstanceRef.current = null;
      } catch (cleanupError) {
        console.warn('Error during document change cleanup:', cleanupError);
      }
      
      // Reset all states to force complete reinit
      setEditorInitialized(false);
      setConfigLoading(true);
      setEditorLoading(false);
      setError(null);
      setEditorConfig(null);
    }
    
    // Cleanup function for unmount
    return () => {
      if (editorInstanceRef.current) {
        try {
          const editorContainer = document.getElementById('onlyoffice-editor');
          if (editorContainer) {
            editorContainer.innerHTML = '';
          }
          editorInstanceRef.current = null;
        } catch (cleanupError) {
          console.warn('Error during component cleanup:', cleanupError);
        }
      }
      setEditorInitialized(false);
    };
  }, [documentId]);

  if (configLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading document configuration...</p>
          <p className="text-xs text-muted-foreground">Document ID: {documentId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive font-medium">Error loading OnlyOffice editor</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <p className="text-xs text-muted-foreground">Document ID: {documentId}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white">
      {editorLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Initializing OnlyOffice editor...</p>
          </div>
        </div>
      )}
      <div
        id="onlyoffice-editor"
        key={documentId} // Force recreation when document changes
        ref={editorRef}
        className="w-full h-full"
      />
    </div>
  );
}

export default DocumentEditor;
