import { NextResponse } from 'next/server';
import { getCreativeById, updateCreativeAnalysis } from '@/lib/google-sheets';
import { analyzeCreativeWithGemini } from '@/lib/gemini-analyzer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const creativeId = body.creativeId || body.id;

    // Check for API key from header or body
    const headerKey = request.headers.get('x-gemini-api-key') || '';
    const bodyKey = body.apiKey || body.customApiKey || '';
    const userApiKey = (headerKey || bodyKey).trim();

    if (!userApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini API Key is required. Please set your Gemini API Key in the dashboard settings before running analysis.',
        },
        { status: 400 }
      );
    }

    if (!creativeId) {
      return NextResponse.json(
        { success: false, error: 'Creative ID is required for analysis.' },
        { status: 400 }
      );
    }

    const creative = await getCreativeById(creativeId);
    if (!creative) {
      return NextResponse.json(
        { success: false, error: `Creative with ID ${creativeId} not found in Google Sheets.` },
        { status: 404 }
      );
    }

    // Run multimodal Gemini analysis
    const result = await analyzeCreativeWithGemini(creative, userApiKey);

    // Save back to Google Sheet
    const updated = await updateCreativeAnalysis(
      creative.id,
      result.markdown,
      result.modelUsed
    );

    return NextResponse.json({
      success: true,
      analysis: result.markdown,
      modelUsed: result.modelUsed,
      analyzedAt: result.analyzedAt,
      creative: updated,
    });
  } catch (error: any) {
    console.error('[POST /api/analyze] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to complete creative analysis with Gemini.',
      },
      { status: 500 }
    );
  }
}
