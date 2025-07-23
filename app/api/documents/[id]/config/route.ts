import { NextRequest, NextResponse } from 'next/server';
import { OnlyOfficeService, onlyOfficeConfig } from '@/lib/onlyoffice';

// GET /api/documents/[id]/config - Get OnlyOffice editor configuration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    
    // Handle different document types
    let document;
    
    if (documentId.startsWith('session-')) {
      // For session-based documents, get info from query params or default
      const url = new URL(request.url);
      const title = url.searchParams.get('title') || 'Uploaded Document';
      const fileType = url.searchParams.get('fileType') || 'docx';
      
      document = {
        id: documentId,
        title: title,
        type: fileType,
      };
    } else if (documentId === 'onlywriteai-test') {
      // For MVP, handle the hardcoded test document
      document = {
        id: documentId,
        title: 'OnlyWriteAI.docx',
        type: 'docx',
      };
    } else {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Create OnlyOffice service instance
    const onlyOfficeService = new OnlyOfficeService(
      onlyOfficeConfig.documentServerUrl,
      onlyOfficeConfig.jwtSecret
    );

    // Generate editor configuration
    const editorConfig = onlyOfficeService.createEditorConfig(
      documentId,
      document.title,
      'user1', // In real app, get from session/auth
      'Demo User', // In real app, get from session/auth
      document.type // Pass file type
    );

    return NextResponse.json({ config: editorConfig });
  } catch (error) {
    console.error('Error generating editor config:', error);
    return NextResponse.json(
      { error: 'Failed to generate editor configuration' },
      { status: 500 }
    );
  }
}
