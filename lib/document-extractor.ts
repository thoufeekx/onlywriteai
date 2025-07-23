// OnlyOffice Document Content Extraction Utility

export interface DocumentExtractionResult {
  success: boolean;
  content?: string;
  error?: string;
}

// Global variable to store the DocEditor instance
declare global {
  interface Window {
    docEditorInstance?: any;
    DocsAPI?: any;
    Api?: any;
  }
}

export class DocumentExtractor {
  
  /**
   * Extract document content from OnlyOffice editor
   * Since createConnector() is only available in paid Developer Edition,
   * we use server-side document reading as fallback
   */
  static async extractDocumentContent(documentId: string): Promise<DocumentExtractionResult> {
    try {
      console.log('Starting document extraction (Community Edition approach)...', documentId);
      
      // Method 1: Try server-side document content extraction
      // This works because we save documents to /app/documents/ via callback
      
      try {
        const response = await fetch(`/api/documents/${documentId}/content`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.content) {
            console.log('Successfully extracted document content from server:', data.content.substring(0, 100) + '...');
            return {
              success: true,
              content: data.content
            };
          }
        } else {
          console.log('Server-side extraction failed:', response.status);
        }
      } catch (fetchError) {
        console.error('Error fetching document content from server:', fetchError);
      }
      
      // Method 2: Try to detect if user has typed content (fallback)
      // Check if OnlyOffice editor is loaded and has content
      const editorContainer = document.getElementById('onlyoffice-editor');
      if (editorContainer) {
        const iframe = editorContainer.querySelector('iframe');
        if (iframe) {
          console.log('OnlyOffice editor detected - document is being edited');
          return {
            success: false,
            error: 'Document content extraction requires OnlyOffice Developer Edition with Advanced API. Using server-side fallback.'
          };
        }
      }
      
      // Method 3: Complete fallback
      console.log('No document content available');
      return {
        success: false,
        error: 'Document content not accessible in Community Edition'
      };
      
    } catch (error) {
      console.error('Document extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format document content for chat context
   */
  static formatDocumentContext(content: string): string {
    // Limit content length to avoid overwhelming the chat
    const maxLength = 2000;
    let formattedContent = content;
    
    if (content.length > maxLength) {
      formattedContent = content.substring(0, maxLength) + '... (content truncated)';
    }
    
    return `\n\n--- Document Context ---\nCurrent document content:\n"${formattedContent}"\n\nPlease help me with: `;
  }

  /**
   * Get fallback context when document extraction fails
   */
  static getFallbackContext(): string {
    return `\n\n--- Document Context ---\nI'm working on a document in OnlyOffice and need writing assistance.\n\nPlease help me with: `;
  }

  /**
   * Main function to extract and format document content for chat
   */
  static async getDocumentContextForChat(documentId: string): Promise<string> {
    try {
      const result = await this.extractDocumentContent(documentId);
      
      if (result.success && result.content) {
        return this.formatDocumentContext(result.content);
      } else {
        console.log('Using fallback context:', result.error);
        return this.getFallbackContext();
      }
    } catch (error) {
      console.error('Error getting document context:', error);
      return this.getFallbackContext();
    }
  }
  
  /**
   * Store DocEditor instance for later use
   * Note: createConnector() requires OnlyOffice Developer Edition with Advanced API
   */
  static storeDocEditorInstance(docEditor: any): void {
    (window as any).docEditorInstance = docEditor;
    console.log('DocEditor instance stored (Community Edition - limited functionality)');
  }
}
