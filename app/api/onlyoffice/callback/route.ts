import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

// OnlyOffice callback handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('OnlyOffice callback received:', body);

    const { status, url, key } = body;

    // Status 2 means document is ready for saving
    if (status === 2) {
      console.log('Document ready for saving, downloading from:', url);
      
      // Download the document from OnlyOffice
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.statusText}`);
      }

      const documentBuffer = await response.arrayBuffer();
      
      // Save to shared volume (accessible by both containers)
      const filePath = path.join('/app/documents', 'OnlyWriteAI.docx');
      await writeFile(filePath, Buffer.from(documentBuffer));
      
      console.log('Document saved successfully to:', filePath);
    }

    // Always return success response to OnlyOffice
    return NextResponse.json({ error: 0 });
    
  } catch (error) {
    console.error('Callback error:', error);
    // Still return success to prevent OnlyOffice errors
    return NextResponse.json({ error: 0 });
  }
}
