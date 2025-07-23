import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';

// GET /api/documents/[id] - Serve document file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    
    // Handle session-based documents
    if (documentId.startsWith('session-')) {
      const sessionDir = path.join('/app/documents', documentId);
      
      try {
        // Find the first file in the session directory
        const files = await readdir(sessionDir);
        if (files.length === 0) {
          return NextResponse.json(
            { error: 'No files found in session' },
            { status: 404 }
          );
        }
        
        const fileName = files[0]; // Get the uploaded file
        const filePath = path.join(sessionDir, fileName);
        const fileBuffer = await readFile(filePath);
        const fileExtension = path.extname(fileName).toLowerCase();
        
        // Set appropriate Content-Type based on file extension
        const contentTypes: { [key: string]: string } = {
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.doc': 'application/msword',
          '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.xls': 'application/vnd.ms-excel',
          '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          '.ppt': 'application/vnd.ms-powerpoint',
          '.txt': 'text/plain',
        };
        
        const contentType = contentTypes[fileExtension] || 'application/octet-stream';
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } catch (fileError) {
        console.error('Error reading session file:', fileError);
        return NextResponse.json(
          { error: 'Session file not found' },
          { status: 404 }
        );
      }
    }
    
    // For MVP, serve OnlyWriteAI.docx from shared volume (backward compatibility)
    if (documentId === 'onlywriteai-test') {
      const filePath = path.join('/app/documents', 'OnlyWriteAI.docx');
      
      try {
        const fileBuffer = await readFile(filePath);
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${documentId}.docx"`,
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } catch (fileError) {
        console.error('Error reading OnlyWriteAI.docx:', fileError);
        return NextResponse.json(
          { error: 'DOCX file not found in shared volume' },
          { status: 404 }
        );
      }
    }
    
    // If not a known document, return error
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Failed to serve document' },
      { status: 500 }
    );
  }
}
