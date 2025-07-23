import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type (OnlyOffice supported formats)
    const supportedTypes = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt'];
    const fileExtension = path.extname(file.name).toLowerCase();
    
    if (!supportedTypes.includes(fileExtension)) {
      return NextResponse.json({ 
        error: `Unsupported file type. Supported: ${supportedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Generate unique session ID
    const sessionId = uuidv4();
    const sessionDir = path.join('/app/documents', `session-${sessionId}`);
    
    // Create session directory
    await mkdir(sessionDir, { recursive: true });
    
    // Save file to session directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(sessionDir, file.name);
    
    await writeFile(filePath, buffer);
    
    console.log(`File uploaded: ${file.name} to session ${sessionId}`);
    
    return NextResponse.json({
      success: true,
      sessionId,
      fileName: file.name,
      fileType: fileExtension.substring(1), // Remove the dot
      documentId: `session-${sessionId}`,
      message: 'File uploaded successfully'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file' 
    }, { status: 500 });
  }
}
