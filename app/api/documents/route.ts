import { NextRequest, NextResponse } from 'next/server';
import { onlyOfficeConfig } from '@/lib/onlyoffice';

// GET /api/documents - List documents
export async function GET() {
  try {
    // In a real app, you'd fetch from your database
    // For MVP, we'll return mock documents
    const documents = [
      {
        id: 'doc1',
        title: 'Sample Document.docx',
        type: 'docx',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'doc2',
        title: 'Meeting Notes.docx',
        type: 'docx',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create new document
export async function POST(request: NextRequest) {
  try {
    const { title, type = 'docx' } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { error: 'Document title is required' },
        { status: 400 }
      );
    }

    // Generate unique document ID
    const documentId = `doc_${Date.now()}`;
    
    // In a real app, you'd save to database and create the file
    // For MVP, we'll just return the document info
    const document = {
      id: documentId,
      title,
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: `${onlyOfficeConfig.documentServerUrl}/documents/${documentId}`,
    };

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}