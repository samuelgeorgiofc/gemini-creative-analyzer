import { NextResponse } from 'next/server';
import { resolveFullMediaContext, parseCreativeLinks } from '@/lib/media-resolver';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ success: false, error: 'url param is required' }, { status: 400 });
    }

    const meta = await resolveFullMediaContext(url);
    const parsed = parseCreativeLinks(url);

    return NextResponse.json({
      success: true,
      title: meta.title,
      coverUrl: meta.coverUrl,
      authorHandle: meta.authorHandle,
      sourceType: meta.sourceType,
      parsedItems: parsed,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

