export async function GET() {
  const hasApiKey = !!process.env.GOOGLE_API_KEY;
  const keyLength = process.env.GOOGLE_API_KEY?.length || 0;
  
  return Response.json({
    hasApiKey,
    keyLength,
    keyPreview: process.env.GOOGLE_API_KEY?.substring(0, 10) + "..." || "not set"
  });
}
