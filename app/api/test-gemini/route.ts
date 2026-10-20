import { NextResponse } from 'next/server';
import { testGeminiApiKey } from '@/lib/gemini-analyzer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const apiKey = (body.apiKey || request.headers.get('x-gemini-api-key') || '').trim();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is missing.' },
        { status: 400 }
      );
    }

    const test = await testGeminiApiKey(apiKey);
    return NextResponse.json(test);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to verify API key.' },
      { status: 500 }
    );
  }
}
