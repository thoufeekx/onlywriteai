// OnlyOffice Document Server Integration
export interface OnlyOfficeConfig {
  documentServerUrl: string;
  jwtSecret: string;
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
  };
  editorConfig: {
    mode: 'edit' | 'view';
    lang: string;
    user: {
      id: string;
      name: string;
    };
    callbackUrl?: string;
  };
}

export class OnlyOfficeService {
  private documentServerUrl: string;
  private jwtSecret: string;

  constructor(documentServerUrl: string, jwtSecret: string) {
    this.documentServerUrl = documentServerUrl;
    this.jwtSecret = jwtSecret;
  }

  // Generate JWT token for OnlyOffice authentication
  generateJWT(payload: any): string {
    // For MVP, we'll disable JWT temporarily to test basic functionality
    // In production, implement proper JWT with crypto library
    return '';
  }

  // Create OnlyOffice editor configuration
  createEditorConfig(documentId: string, documentTitle: string, userId: string, userName: string, fileType?: string): OnlyOfficeConfig {
    // Generate unique document key to prevent caching issues
    // For session documents, add timestamp to ensure uniqueness
    const timestamp = Date.now();
    const uniqueKey = documentId.startsWith('session-') 
      ? `${documentId}-${timestamp}` 
      : documentId;
    
    const config: OnlyOfficeConfig = {
      documentServerUrl: this.documentServerUrl,
      jwtSecret: this.jwtSecret,
      document: {
        fileType: fileType || 'docx',
        key: uniqueKey,
        title: documentTitle,
        url: `http://frontend:3000/api/documents/${documentId}`,
      },
      editorConfig: {
        mode: 'edit',
        lang: 'en',
        user: {
          id: userId,
          name: userName,
        },
        callbackUrl: `http://frontend:3000/api/onlyoffice/callback`,
      },
    };

    return config;
  }

  // Initialize OnlyOffice editor
  initializeEditor(containerId: string, config: OnlyOfficeConfig): void {
    // Check if OnlyOffice API is loaded
    if (typeof (window as any).DocsAPI === 'undefined') {
      console.error('OnlyOffice Document Server API not loaded');
      return;
    }

    const editorConfig = {
      width: '100%',
      height: '100%',
      type: 'desktop',
      documentType: 'word',
      document: config.document,
      editorConfig: {
        ...config.editorConfig,
        callbackUrl: config.editorConfig.callbackUrl,
        customization: {
          compactToolbar: false, // Keep full toolbar
          hideRightMenu: false,  // Keep right panel for formatting
          hideRulers: false,     // Keep rulers for document layout
          unit: 'cm',           // Use centimeters for measurements
        },
      },
      events: {
        onReady: () => {
          console.log('OnlyOffice editor is ready');
        },
        onDocumentStateChange: (event: any) => {
          console.log('Document state changed:', event);
        },
        onError: (error: any) => {
          console.error('OnlyOffice error details:', {
            error,
            documentUrl: config.document.url,
            documentServerUrl: config.documentServerUrl
          });
        },
      },
    };

    // JWT disabled for MVP testing
    // In production, add proper JWT token here
    
    // Create DocEditor instance and store it globally for document extraction
    const docEditor = new (window as any).DocsAPI.DocEditor(containerId, editorConfig);
    
    // Store the instance for document content extraction
    (window as any).docEditorInstance = docEditor;
    console.log('DocEditor instance created and stored globally');
    
    return docEditor;
  }

  // Load OnlyOffice API 
  static async loadOnlyOfficeAPI(documentServerUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if API is already loaded
      if ((window as any).DocsAPI) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      // Direct API loading from OnlyOffice server (no proxy needed in Docker)
      script.src = `${documentServerUrl}/web-apps/apps/api/documents/api.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OnlyOffice API'));
      document.head.appendChild(script);
    });
  }
}

// Environment configuration
export const onlyOfficeConfig = {
  // Browser-accessible URL (localhost for user's browser)
  documentServerUrl: process.env.NEXT_PUBLIC_ONLYOFFICE_URL || 'http://localhost',
  jwtSecret: process.env.ONLYOFFICE_JWT_SECRET || 'myCustomSecretKey2025!@#',
};

// Create service instance
export const onlyOfficeService = new OnlyOfficeService(
  onlyOfficeConfig.documentServerUrl,
  onlyOfficeConfig.jwtSecret
);
