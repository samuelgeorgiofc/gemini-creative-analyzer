import { NextResponse } from 'next/server';
import {
  getAllCreatives,
  saveCreative,
  saveCreativesBatch,
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

    const isBulk = Array.isArray(body) || (body && Array.isArray(body.creatives));
    const items = isBulk ? (Array.isArray(body) ? body : body.creatives) : [body];

    if (!items.length) {
      return NextResponse.json(
        { success: false, error: 'No creative data provided.' },
        { status: 400 }
      );
    }

    if (isBulk) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.ad_name || !item.brand || item.spend === undefined) {
          return NextResponse.json(
            { success: false, error: `Item #${i + 1} is missing Brand, Ad Name, or Spend.` },
            { status: 400 }
          );
        }
      }

      const formatted = items.map((item: any) => ({
        date_label: item.date_label || 'Current Period',
        date_type: item.date_type || 'weekly_month',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        brand: String(item.brand || '').trim(),
        ad_type: String(item.ad_type || 'CPAS Sales').trim(),
        format: (item.format || 'Video') as any,
        ad_name: String(item.ad_name || '').trim(),
        creative_link: String(item.creative_link || '').trim(),
        spend: Number(item.spend) || 0,
        impression: Number(item.impression) || 0,
        clicks: Number(item.clicks) || 0,
        views_6s: Number(item.views_6s) || 0,
        views_15s: Number(item.views_15s) || 0,
        gmv: item.gmv !== undefined && item.gmv !== '' ? Number(item.gmv) : undefined,
        purchase: item.purchase !== undefined && item.purchase !== '' ? Number(item.purchase) : undefined,
      }));

      const savedList = await saveCreativesBatch(formatted);
      return NextResponse.json({ success: true, creatives: savedList, count: savedList.length });
    }

    const single = items[0];
    if (!single.ad_name || !single.brand || single.spend === undefined) {
      return NextResponse.json(
        { success: false, error: 'Brand, Ad Name, and Spend are required fields.' },
        { status: 400 }
      );
    }

    const saved = await saveCreative({
      date_label: single.date_label || 'Current Period',
      date_type: single.date_type || 'weekly_month',
      start_date: single.start_date || '',
      end_date: single.end_date || '',
      brand: single.brand,
      ad_type: single.ad_type || 'CPAS Sales',
      format: single.format || 'Video',
      ad_name: single.ad_name,
      creative_link: single.creative_link || '',
      spend: Number(single.spend) || 0,
      impression: Number(single.impression) || 0,
      clicks: Number(single.clicks) || 0,
      views_6s: Number(single.views_6s) || 0,
      views_15s: Number(single.views_15s) || 0,
      gmv: single.gmv !== undefined && single.gmv !== '' ? Number(single.gmv) : undefined,
      purchase: single.purchase !== undefined && single.purchase !== '' ? Number(single.purchase) : undefined,
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

