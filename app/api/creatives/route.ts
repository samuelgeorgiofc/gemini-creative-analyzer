import { NextResponse } from 'next/server';
import {
  getAllCreatives,
  saveCreative,
  updateCreative,
  deleteCreative,
  getCreativeById,
} from '@/lib/google-sheets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const creative = await getCreativeById(id);
      if (!creative) {
        return NextResponse.json({ success: false, error: 'Creative not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, creative });
    }

    const creatives = await getAllCreatives();
    return NextResponse.json({ success: true, creatives });
  } catch (error: any) {
    console.error('[GET /api/creatives] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch creatives from Google Sheets.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.ad_name || !body.brand || body.spend === undefined) {
      return NextResponse.json(
        { success: false, error: 'Brand, Ad Name, and Spend are required fields.' },
        { status: 400 }
      );
    }

    const saved = await saveCreative({
      date_label: body.date_label || 'Current Period',
      date_type: body.date_type || 'weekly_month',
      start_date: body.start_date || '',
      end_date: body.end_date || '',
      brand: body.brand,
      ad_type: body.ad_type || 'CPAS Sales',
      format: body.format || 'Video',
      ad_name: body.ad_name,
      creative_link: body.creative_link || '',
      spend: Number(body.spend) || 0,
      impression: Number(body.impression) || 0,
      clicks: Number(body.clicks) || 0,
      views_6s: Number(body.views_6s) || 0,
      views_15s: Number(body.views_15s) || 0,
      gmv: body.gmv !== undefined ? Number(body.gmv) : undefined,
      purchase: body.purchase !== undefined ? Number(body.purchase) : undefined,
    });

    return NextResponse.json({ success: true, creative: saved });
  } catch (error: any) {
    console.error('[POST /api/creatives] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save creative to Google Sheets.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Creative ID is required for update.' }, { status: 400 });
    }

    const updated = await updateCreative(body.id, body);
    return NextResponse.json({ success: true, creative: updated });
  } catch (error: any) {
    console.error('[PUT /api/creatives] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update creative in Google Sheets.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Creative ID is required.' }, { status: 400 });
    }

    const ok = await deleteCreative(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    console.error('[DELETE /api/creatives] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete creative from Google Sheets.' },
      { status: 500 }
    );
  }
}

