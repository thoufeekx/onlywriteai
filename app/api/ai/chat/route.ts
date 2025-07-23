import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { createModelInstance } from "@/lib/model-factory";
import { DEFAULT_MODEL } from "@/lib/ai-models";
// Removed DuckDuckGo import - now using Brave Search API

// Enhanced system prompt for document assistance
const systemPrompt = `You are OnlyWriteAI, an intelligent writing assistant integrated with OnlyOffice Document Server. You help users with:

1. **Document Analysis**: Review and analyze document content
2. **Writing Assistance**: Improve clarity, grammar, tone, and structure
3. **Content Generation**: Help brainstorm, expand, or rewrite content
4. **Document Context**: Use provided document context to give relevant suggestions

Always:
- Be helpful and constructive
- Provide specific, actionable suggestions
- Maintain conversation context
- Reference document content when provided
- Keep responses concise but thorough

You are embedded in a document editing environment, so focus on practical writing assistance.`;

// Store conversation histories (in production, use Redis or database)
const conversationHistories = new Map<string, ChatMessageHistory>();

export async function POST(req: Request) {
  try {
    const { message, conversationId = 'default', documentContext, model: selectedModel = DEFAULT_MODEL, searchMode = false } = await req.json();
    
    console.log('Received message:', message);
    console.log('Conversation ID:', conversationId);
    console.log('Document context provided:', !!documentContext);

    // Create model instance based on selection
    const model = createModelInstance(selectedModel);
    
    console.log('Using AI model:', selectedModel);

    // Get or create chat history for this conversation
    let messageHistory = conversationHistories.get(conversationId);
    if (!messageHistory) {
      messageHistory = new ChatMessageHistory();
      
      // Add system message to new conversations
      await messageHistory.addAIMessage(systemPrompt);
      
      conversationHistories.set(conversationId, messageHistory);
    }

    // Create prompt template with history
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("history"),
      ["human", "{input}"],
    ]);

    // Create runnable chain with message history
    const runnable = prompt.pipe(model);
    const chain = new RunnableWithMessageHistory({
      runnable,
      getMessageHistory: (_sessionId: string) => messageHistory!,
      inputMessagesKey: "input",
      historyMessagesKey: "history",
    });

    // Handle search mode
    let enhancedInput = message;
    let searchResults = null;
    
    if (searchMode) {
      console.log('Search mode enabled, performing web search...');
      
      try {
        // Extract search keywords using AI
        const keywordExtraction = await model.invoke(
          `Extract 2-4 concise search keywords from this query. Return only the keywords separated by spaces, no other text:\n\n"${message}"`
        );
        
        const searchQuery = keywordExtraction.content || message;
        console.log('Search query:', searchQuery);
        
        // Perform Brave Search API call
        const braveApiKey = process.env.BRAVE_API_KEY;
        if (!braveApiKey) {
          throw new Error('Brave API key not configured');
        }
        
        const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5`;
        const response = await fetch(searchUrl, {
          headers: {
            'X-Subscription-Token': braveApiKey,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
        }
        
        const braveResults = await response.json();
        console.log('Brave search results:', braveResults);
        
        // Transform Brave results to our format
        searchResults = braveResults.web?.results?.map((result: any) => ({
          title: result.title,
          snippet: result.description,
          link: result.url
        })) || [];
        
        // Prepare enhanced input with search results
        const searchContext = searchResults.map((result: any, index: number) => 
          `${index + 1}. **${result.title}**\n   ${result.snippet}\n   Source: ${result.link}`
        ).join('\n\n');
        
        enhancedInput = `User Query: ${message}\n\nWeb Search Results:\n${searchContext}\n\nPlease provide a comprehensive summary based on these search results. Include source references and format your response clearly.`;
        
      } catch (error: any) {
        console.error('Search error:', error);
        
        // Provide specific error messages based on error type
        let errorMessage = 'I encountered an error while searching the web.';
        if (error.message?.includes('Brave API key not configured')) {
          errorMessage = 'Search service is not properly configured. Please contact support.';
        } else if (error.message?.includes('Brave Search API error')) {
          errorMessage = 'The search service is temporarily unavailable. Please try again in a few moments.';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'The search request timed out. Please try again.';
        }
        
        enhancedInput = `I apologize, but ${errorMessage} Let me provide a response based on my knowledge instead.\n\nUser Query: ${message}\n\nNote: Web search is temporarily unavailable, but I can still help with general information and document assistance.`;
      }
    } else if (documentContext) {
      enhancedInput = `Document Context: ${documentContext}\n\nUser Question: ${message}\n\nPlease provide a helpful response based on the document context and user question.`;
    }
    
    // Check if streaming is requested
    const isStreamingRequest = req.headers.get('accept') === 'text/stream';
    
    if (isStreamingRequest) {
      // Streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const config = { configurable: { sessionId: conversationId } };
            const chainStream = await chain.stream({ input: enhancedInput }, config);
            let fullResponse = '';
            
            for await (const chunk of chainStream) {
              // Extract content from AIMessageChunk
              let content = '';
              if (typeof chunk === 'string') {
                content = chunk;
              } else if (chunk && typeof chunk.content === 'string') {
                content = chunk.content;
              } else if (chunk && Array.isArray(chunk.content)) {
                // Handle complex content arrays
                content = chunk.content.map((c: any) => c.text || c.toString()).join('');
              }
              
              if (content) {
                fullResponse += content;
                const data = JSON.stringify({ 
                  content,
                  fullResponse,
                  conversationId,
                  searchResults,
                  isSearchResponse: searchMode
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            
            // Send final message
            const finalData = JSON.stringify({ 
              done: true,
              fullResponse,
              conversationId,
              searchResults,
              isSearchResponse: searchMode
            });
            controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            controller.close();
            
          } catch (error) {
            console.error('Streaming error:', error);
            const errorData = JSON.stringify({ 
              error: 'Streaming failed',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    } else {
      // Non-streaming response (fallback)
      const config = { configurable: { sessionId: conversationId } };
      const response = await chain.invoke({ input: enhancedInput }, config);
      
      // Extract the actual content from the AIMessage response
      let aiResponse = '';
      if (typeof response === 'string') {
        aiResponse = response;
      } else if (response && typeof response.content === 'string') {
        aiResponse = response.content;
      } else if (response && Array.isArray(response.content)) {
        // Handle complex content arrays
        aiResponse = response.content.map((c: any) => c.text || c.toString()).join('');
      } else {
        aiResponse = JSON.stringify(response);
      }
      
      console.log('AI response:', aiResponse);
      console.log('Response type:', typeof aiResponse);

      // Return simple JSON response
      return Response.json({
        message: aiResponse,
        conversationId: conversationId,
        searchResults: searchResults,
        isSearchResponse: searchMode
      });
    }
    
  } catch (error) {
    console.error('Error in AI chat:', error);
    return Response.json({ 
      error: 'Failed to generate response',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
