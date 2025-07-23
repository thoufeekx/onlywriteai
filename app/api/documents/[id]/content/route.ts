// API route to extract document content server-side
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    
    let documentPath: string;
    const documentsDir = '/app/documents';
    
    if (documentId.startsWith('session-')) {
      // Handle session documents - find the first file in the session folder
      const sessionDir = path.join(documentsDir, documentId);
      
      if (!fs.existsSync(sessionDir)) {
        return NextResponse.json(
          { error: 'Session document not found' },
          { status: 404 }
        );
      }
      
      // Get the first file in the session directory
      const files = fs.readdirSync(sessionDir);
      if (files.length === 0) {
        return NextResponse.json(
          { error: 'No files found in session' },
          { status: 404 }
        );
      }
      
      documentPath = path.join(sessionDir, files[0]);
    } else {
      // Handle regular documents
      documentPath = path.join(documentsDir, `${documentId}.docx`);
    }
    
    // Check if document exists
    if (!fs.existsSync(documentPath)) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // Extract real text content from .docx file using mammoth
    const result = await mammoth.extractRawText({ path: documentPath });
    const extractedText = result.value.trim();
    
    // Get file stats for additional context
    const stats = fs.statSync(documentPath);
    
    // Combine extracted text with metadata
    const content = extractedText.length > 0 
      ? `--- Document Content ---\n${extractedText}\n\n--- Document Info ---\nFile: ${documentId}.docx\nSize: ${stats.size} bytes\nLast modified: ${stats.mtime.toISOString()}`
      : `--- Document Info ---\nFile: ${documentId}.docx (appears to be empty or unreadable)\nSize: ${stats.size} bytes\nLast modified: ${stats.mtime.toISOString()}\n\nNote: No readable text content found in document.`;
    
    return NextResponse.json({
      success: true,
      content: content,
      documentId: documentId
    });
    
  } catch (error) {
    console.error('Error reading document content:', error);
    return NextResponse.json(
      { error: `Failed to read document content: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
