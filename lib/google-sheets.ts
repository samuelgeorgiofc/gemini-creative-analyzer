import { google, sheets_v4 } from 'googleapis';
import { parseNum } from './formatters';

export const SHEET_NAME = 'Creatives';

export const SHEET_HEADERS = [
  'id',
  'created_at',
  'date_label',
  'date_type',
  'start_date',
  'end_date',
  'brand',
  'ad_type',
  'format',
  'ad_name',
  'creative_link',
  'spend',
  'impression',
  'clicks',
  'views_6s',
  'views_15s',
  'gmv',
  'purchase',
  'cpm',
  'ctr',
  'vtr_6s',
  'vtr_15s',
  'hold_ratio',
  'roas',
  'cpp',
  'cvr',
  'aov',
  'analysis_markdown',
  'analyzed_at',
  'model_used',
] as const;

export interface CreativeRecord {
  id: string;
  created_at: string;
  date_label: string;
  date_type: 'weekly_month' | 'custom_range' | 'single_date';
  start_date: string;
  end_date: string;
  brand: string;
  ad_type: string;
  format: 'Video' | 'Static' | 'Carousel';
  ad_name: string;
  creative_link: string;
  spend: number;
  impression: number;
  clicks: number;
  views_6s: number;
  views_15s: number;
  gmv?: number;
  purchase?: number;
  cpm: number;
  ctr: number;
  vtr_6s: number;
  vtr_15s: number;
  hold_ratio: number;
  roas?: number;
  cpp?: number;
  cvr?: number;
  aov?: number;
  analysis_markdown?: string;
  analyzed_at?: string;
  model_used?: string;
  rowIndex?: number;
}

function getSheetsClient(): { sheets: sheets_v4.Sheets; spreadsheetId: string } {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID environment variable is not configured.');
  }

  const client_email = process.env.GOOGLE_CLIENT_EMAIL;
  let private_key = process.env.GOOGLE_PRIVATE_KEY;
  if (!client_email || !private_key) {
    throw new Error('Google service account credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) are not set.');
  }

  private_key = private_key.replace(/\\n/g, '\n').replace(/"/g, '');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email,
      private_key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

export function calculateMetrics(input: Partial<CreativeRecord>): {
  cpm: number;
  ctr: number;
  vtr_6s: number;
  vtr_15s: number;
  hold_ratio: number;
  roas?: number;
  cpp?: number;
  cvr?: number;
  aov?: number;
} {
  const spend = parseNum(input.spend);
  const impression = parseNum(input.impression);
  const clicks = parseNum(input.clicks);
  const views_6s = parseNum(input.views_6s);
  const views_15s = parseNum(input.views_15s);
  const gmv = parseNum(input.gmv);
  const purchase = parseNum(input.purchase);

  const cpm = impression > 0 ? (spend / impression) * 1000 : 0;
  const ctr = impression > 0 ? clicks / impression : 0;
  const vtr_6s = impression > 0 ? views_6s / impression : 0;
  const vtr_15s = impression > 0 ? views_15s / impression : 0;
  const hold_ratio = views_6s > 0 ? views_15s / views_6s : 0;

  const isCpas = input.ad_type?.toLowerCase().includes('cpas') || gmv > 0 || purchase > 0;

  let roas: number | undefined = undefined;
  let cpp: number | undefined = undefined;
  let cvr: number | undefined = undefined;
  let aov: number | undefined = undefined;

  if (isCpas) {
    roas = spend > 0 ? gmv / spend : 0;
    cpp = purchase > 0 ? spend / purchase : 0;
    cvr = clicks > 0 ? purchase / clicks : 0;
    aov = purchase > 0 ? gmv / purchase : 0;
  }

  return {
    cpm: Math.round(cpm),
    ctr,
    vtr_6s,
    vtr_15s,
    hold_ratio,
    roas,
    cpp: cpp !== undefined ? Math.round(cpp) : undefined,
    cvr,
    aov: aov !== undefined ? Math.round(aov) : undefined,
  };
}

/**
 * Ensure `Creatives` tab exists in spreadsheet with exact 30 columns.
 */
export async function ensureSheetInitialized(): Promise<void> {
  const { sheets, spreadsheetId } = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:AD1`,
    });
    const firstRow = res.data.values?.[0];
    if (!firstRow || firstRow.length < SHEET_HEADERS.length || firstRow[0] !== 'id') {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:AD1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [Array.from(SHEET_HEADERS)] },
      });
    }
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.includes('Unable to parse range') || msg.includes('not found') || err?.code === 400) {
      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: SHEET_NAME,
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 35,
                      frozenRowCount: 1,
                    },
                  },
                },
              },
            ],
          },
        });
      } catch {
        // ignore if exists
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:AD1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [Array.from(SHEET_HEADERS)] },
      });
    } else {
      throw err;
    }
  }
}

function parseRow(row: any[], rowIndex: number): CreativeRecord | null {
  if (!row || !row[0]) return null;
  return {
    rowIndex,
    id: String(row[0] || '').trim(),
    created_at: String(row[1] || '').trim(),
    date_label: String(row[2] || '').trim(),
    date_type: (row[3] || 'weekly_month') as any,
    start_date: String(row[4] || '').trim(),
    end_date: String(row[5] || '').trim(),
    brand: String(row[6] || '').trim(),
    ad_type: String(row[7] || '').trim(),
    format: (row[8] || 'Video') as any,
    ad_name: String(row[9] || '').trim(),
    creative_link: String(row[10] || '').trim(),
    spend: parseNum(row[11]),
    impression: parseNum(row[12]),
    clicks: parseNum(row[13]),
    views_6s: parseNum(row[14]),
    views_15s: parseNum(row[15]),
    gmv: row[16] !== undefined && row[16] !== '' ? parseNum(row[16]) : undefined,
    purchase: row[17] !== undefined && row[17] !== '' ? parseNum(row[17]) : undefined,
    cpm: parseNum(row[18]),
    ctr: parseNum(row[19]),
    vtr_6s: parseNum(row[20]),
    vtr_15s: parseNum(row[21]),
    hold_ratio: parseNum(row[22]),
    roas: row[23] !== undefined && row[23] !== '' ? parseNum(row[23]) : undefined,
    cpp: row[24] !== undefined && row[24] !== '' ? parseNum(row[24]) : undefined,
    cvr: row[25] !== undefined && row[25] !== '' ? parseNum(row[25]) : undefined,
    aov: row[26] !== undefined && row[26] !== '' ? parseNum(row[26]) : undefined,
    analysis_markdown: String(row[27] || ''),
    analyzed_at: String(row[28] || ''),
    model_used: String(row[29] || ''),
  };
}

function rowFromRecord(rec: CreativeRecord): any[] {
  return [
    rec.id,
    rec.created_at,
    rec.date_label,
    rec.date_type,
    rec.start_date,
    rec.end_date,
    rec.brand,
    rec.ad_type,
    rec.format,
    rec.ad_name,
    rec.creative_link,
    rec.spend,
    rec.impression,
    rec.clicks,
    rec.views_6s,
    rec.views_15s,
    rec.gmv !== undefined ? rec.gmv : '',
    rec.purchase !== undefined ? rec.purchase : '',
    rec.cpm,
    rec.ctr,
    rec.vtr_6s,
    rec.vtr_15s,
    rec.hold_ratio,
    rec.roas !== undefined ? rec.roas : '',
    rec.cpp !== undefined ? rec.cpp : '',
    rec.cvr !== undefined ? rec.cvr : '',
    rec.aov !== undefined ? rec.aov : '',
    rec.analysis_markdown || '',
    rec.analyzed_at || '',
    rec.model_used || '',
  ];
}

export async function getAllCreatives(): Promise<CreativeRecord[]> {
  await ensureSheetInitialized();
  const { sheets, spreadsheetId } = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A1:AD`,
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const list: CreativeRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const item = parseRow(rows[i], i + 1);
    if (item) list.push(item);
  }
  return list;
}

export async function getCreativeById(id: string): Promise<CreativeRecord | null> {
  const all = await getAllCreatives();
  return all.find(r => r.id === id) || null;
}

export async function saveCreative(
  input: Omit<CreativeRecord, 'id' | 'created_at' | 'cpm' | 'ctr' | 'vtr_6s' | 'vtr_15s' | 'hold_ratio'>
): Promise<CreativeRecord> {
  await ensureSheetInitialized();
  const { sheets, spreadsheetId } = getSheetsClient();

  const id = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const created_at = new Date().toISOString();
  const metrics = calculateMetrics(input);

  const fullRecord: CreativeRecord = {
    ...input,
    id,
    created_at,
    ...metrics,
  };

  const rowValues = rowFromRecord(fullRecord);

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:AD`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] },
  });

  const updatedRange = appendRes.data.updates?.updatedRange || '';
  const matchRow = updatedRange.match(/!A(\d+):/);
  const rowIndex = matchRow ? parseInt(matchRow[1], 10) : undefined;

  return {
    ...fullRecord,
    rowIndex,
  };
}

export async function updateCreative(
  id: string,
  updates: Partial<CreativeRecord>
): Promise<CreativeRecord> {
  await ensureSheetInitialized();
  const { sheets, spreadsheetId } = getSheetsClient();
  const existing = await getCreativeById(id);
  if (!existing || !existing.rowIndex) {
    throw new Error(`Creative with ID ${id} not found.`);
  }

  const merged = { ...existing, ...updates };
  const metrics = calculateMetrics(merged);
  const updatedRecord: CreativeRecord = {
    ...merged,
    ...metrics,
    rowIndex: existing.rowIndex,
  };

  const rowValues = rowFromRecord(updatedRecord);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A${existing.rowIndex}:AD${existing.rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowValues] },
  });

  return updatedRecord;
}

export async function deleteCreative(id: string): Promise<boolean> {
  await ensureSheetInitialized();
  const { sheets, spreadsheetId } = getSheetsClient();
  const all = await getAllCreatives();
  const target = all.find(r => r.id === id);
  if (!target || !target.rowIndex) return false;

  // Clear the row contents
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A${target.rowIndex}:AD${target.rowIndex}`,
  });

  return true;
}

export async function updateCreativeAnalysis(
  id: string,
  analysisMarkdown: string,
  modelUsed: string
): Promise<CreativeRecord> {
  return updateCreative(id, {
    analysis_markdown: analysisMarkdown,
    analyzed_at: new Date().toISOString(),
    model_used: modelUsed,
  });
}
