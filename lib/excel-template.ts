import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ParsedCreativeRow {
  rowNumber: number;
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
  isValid: boolean;
  validationError?: string;
}

/**
 * Creates and formats the Excel Workbook template for bulk creative uploads.
 */
export async function createTemplateWorkbook(): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Creative Analyzer Engine';
  wb.lastModifiedBy = 'Creative Analyzer Engine';
  wb.created = new Date();
  wb.modified = new Date();

  // -------------------------------------------------------------
  // Sheet 1: Template
  // -------------------------------------------------------------
  const ws = wb.addWorksheet('Creative Performance Template', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'Brand *', key: 'brand', width: 18 },
    { header: 'Ad Type *', key: 'ad_type', width: 20 },
    { header: 'Format (Video/Static/Carousel)', key: 'format', width: 28 },
    { header: 'Ad Name *', key: 'ad_name', width: 38 },
    { header: 'Creative Link (TikTok / IG / Drive)', key: 'creative_link', width: 44 },
    { header: 'Spend (IDR) *', key: 'spend', width: 18 },
    { header: 'Impressions', key: 'impression', width: 16 },
    { header: 'Clicks', key: 'clicks', width: 14 },
    { header: '6s Views (Hook)', key: 'views_6s', width: 18 },
    { header: '15s Views (Hold)', key: 'views_15s', width: 18 },
    { header: 'GMV (IDR)', key: 'gmv', width: 18 },
    { header: 'Purchases (Orders)', key: 'purchase', width: 20 },
  ];

  // Header Styling (Row 1)
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  headerRow.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // Indigo-600
  };

  // Add sample rows reflecting user request naming: "PHD 1234_Brand_..."
  const sampleRows = [
    {
      brand: 'PHD',
      ad_type: 'CPAS Sales',
      format: 'Video',
      ad_name: 'PHD 1234_Brand_Promo_HookA',
      creative_link: 'https://www.tiktok.com/@brand/video/730000000001',
      spend: 5000000,
      impression: 250000,
      clicks: 3500,
      views_6s: 45000,
      views_15s: 18000,
      gmv: 17500000,
      purchase: 110,
    },
    {
      brand: 'PHD',
      ad_type: 'Traffic',
      format: 'Static',
      ad_name: 'PHD 1234_Brand_FlashSale_Banner',
      creative_link: 'https://drive.google.com/file/d/1exampleStaticImageFile',
      spend: 2500000,
      impression: 140000,
      clicks: 2800,
      views_6s: 0,
      views_15s: 0,
      gmv: '',
      purchase: '',
    },
    {
      brand: 'PHD',
      ad_type: 'CPAS Sales',
      format: 'Carousel',
      ad_name: 'PHD 1234_Brand_Catalog_Product3',
      creative_link: 'https://www.tiktok.com/@brand/video/730000000002',
      spend: 7200000,
      impression: 380000,
      clicks: 5200,
      views_6s: 60000,
      views_15s: 26000,
      gmv: 25500000,
      purchase: 160,
    },
    {
      brand: 'Somethinc',
      ad_type: 'CPAS Sales',
      format: 'Video',
      ad_name: 'PHD 1234_Brand_Serum_ReviewUGC',
      creative_link: 'https://www.tiktok.com/@brand/video/730000000003',
      spend: 6000000,
      impression: 310000,
      clicks: 4100,
      views_6s: 52000,
      views_15s: 22000,
      gmv: 21000000,
      purchase: 135,
    },
  ];

  sampleRows.forEach((r) => {
    const row = ws.addRow(r);
    row.height = 20;
    row.alignment = { vertical: 'middle' };
  });

  // Borders for sample rows
  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (rowNum > 1) {
        cell.font = { name: 'Calibri', size: 10 };
      }
    });
  });

  // -------------------------------------------------------------
  // Sheet 2: User Instructions
  // -------------------------------------------------------------
  const guideWs = wb.addWorksheet('Instructions & Field Guide');
  guideWs.columns = [
    { header: 'Field / Column', key: 'field', width: 28 },
    { header: 'Required?', key: 'required', width: 14 },
    { header: 'Accepted Values & Examples', key: 'notes', width: 65 },
  ];

  guideWs.getRow(1).height = 24;
  guideWs.getRow(1).font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  guideWs.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };

  const guideData = [
    {
      field: 'Performance Period (Month & Week)',
      required: 'Auto-set',
      notes:
        'IMPORTANT: The Month and Weekly Range (Tue–Sun) are chosen manually directly in the Dashboard/Pop-up modal. All uploaded rows will be automatically tagged with your selected period.',
    },
    {
      field: 'Brand *',
      required: 'YES',
      notes: 'Brand name (e.g., PHD, Somethinc, Brand X).',
    },
    {
      field: 'Ad Type *',
      required: 'YES',
      notes: 'CPAS Sales, Traffic, Video Views, Reach, Engagement, etc.',
    },
    {
      field: 'Format',
      required: 'Recommended',
      notes: 'Video, Static, or Carousel (default is Video if left blank).',
    },
    {
      field: 'Ad Name *',
      required: 'YES',
      notes: 'Ad creative title or headline. Format example: "PHD 1234_Brand_..."',
    },
    {
      field: 'Creative Link',
      required: 'Optional',
      notes: 'TikTok video link, Instagram Reel/post, or Google Drive URL.',
    },
    {
      field: 'Spend (IDR) *',
      required: 'YES',
      notes: 'Gross ad spend in IDR (numbers only, e.g. 5000000).',
    },
    {
      field: 'Impressions',
      required: 'Optional',
      notes: 'Total impressions delivered.',
    },
    {
      field: 'Clicks',
      required: 'Optional',
      notes: 'Total link clicks.',
    },
    {
      field: '6s Views (Hook)',
      required: 'Optional',
      notes: '6-second video views (used to calculate 6s VTR hook rate).',
    },
    {
      field: '15s Views (Hold)',
      required: 'Optional',
      notes: '15-second video views (used to calculate Hold Ratio).',
    },
    {
      field: 'GMV (IDR)',
      required: 'Optional',
      notes: 'Gross merchandise value for CPAS e-commerce campaigns.',
    },
    {
      field: 'Purchases (Orders)',
      required: 'Optional',
      notes: 'Total confirmed e-commerce conversions/purchases.',
    },
  ];

  guideData.forEach((g) => {
    const r = guideWs.addRow(g);
    r.height = 20;
    r.alignment = { vertical: 'middle', wrapText: true };
  });

  return wb;
}

/**
 * Generates and downloads the template .xlsx file to the user's browser.
 */
export async function downloadCreativeTemplate(): Promise<void> {
  const wb = await createTemplateWorkbook();
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, 'Creative_Upload_Template.xlsx');
}

/**
 * Safely extracts raw text from an Excel cell value (handling RichText, Hyperlink, Formula).
 */
function extractCellString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'object') {
    if (val.text) return String(val.text).trim();
    if (val.hyperlink) return String(val.hyperlink).trim();
    if (val.result !== undefined) return String(val.result).trim();
    if (Array.isArray(val.richText)) {
      return val.richText.map((t: any) => t.text || '').join('').trim();
    }
  }
  return String(val).trim();
}

/**
 * Safely parses numbers from cell values, stripping currency symbols and formatting.
 */
function extractCellNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'object' && val.result !== undefined && typeof val.result === 'number') {
    return val.result;
  }
  const str = extractCellString(val);
  const clean = str.replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Reads an uploaded Excel file (.xlsx, .xls) and parses valid Creative rows.
 */
export async function parseCreativesFromExcel(file: File): Promise<{
  items: ParsedCreativeRow[];
  errors: string[];
}> {
  const errors: string[] = [];
  const items: ParsedCreativeRow[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(arrayBuffer);

    // Pick first worksheet or one titled 'creative' / 'template'
    let ws = wb.worksheets.find(
      (w) =>
        w.name.toLowerCase().includes('creative') ||
        w.name.toLowerCase().includes('template')
    );
    if (!ws) {
      ws = wb.worksheets[0];
    }

    if (!ws || ws.rowCount < 2) {
      return {
        items: [],
        errors: ['The uploaded file does not contain any data rows.'],
      };
    }

    // Locate header row by looking for key columns ('brand', 'ad name', 'spend')
    let headerRowNum = -1;
    const colMap: Record<string, number> = {};

    ws.eachRow((row, rowNumber) => {
      if (headerRowNum !== -1) return;
      const values = row.values as any[];
      if (!Array.isArray(values)) return;

      const matchedKeys: string[] = [];
      values.forEach((cellVal, colIdx) => {
        const text = extractCellString(cellVal).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (text.includes('brand') || text.includes('merek')) {
          colMap.brand = colIdx;
          matchedKeys.push('brand');
        } else if (text.includes('adname') || text.includes('creativename') || text.includes('headline')) {
          colMap.ad_name = colIdx;
          matchedKeys.push('ad_name');
        } else if (text.includes('spend') || text.includes('cost') || text.includes('biaya')) {
          colMap.spend = colIdx;
          matchedKeys.push('spend');
        } else if (text.includes('adtype') || (text.includes('type') && !text.includes('format'))) {
          colMap.ad_type = colIdx;
        } else if (text.includes('format')) {
          colMap.format = colIdx;
        } else if (text.includes('link') || text.includes('url')) {
          colMap.creative_link = colIdx;
        } else if (text.includes('impression')) {
          colMap.impression = colIdx;
        } else if (text.includes('click') || text.includes('klik')) {
          colMap.clicks = colIdx;
        } else if (text.includes('6s') || text.includes('hook')) {
          colMap.views_6s = colIdx;
        } else if (text.includes('15s') || text.includes('hold')) {
          colMap.views_15s = colIdx;
        } else if (text.includes('gmv') || text.includes('revenue') || text.includes('omset')) {
          colMap.gmv = colIdx;
        } else if (text.includes('purchase') || text.includes('order')) {
          colMap.purchase = colIdx;
        }
      });

      // If at least brand & (ad_name or spend) are present, this is our header row
      if (colMap.brand && (colMap.ad_name || colMap.spend)) {
        headerRowNum = rowNumber;
      }
    });

    if (headerRowNum === -1) {
      return {
        items: [],
        errors: [
          'Could not detect expected headers. Please ensure the columns "Brand", "Ad Name", and "Spend" are included.',
        ],
      };
    }

    // Iterate through data rows
    for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      if (!row || !row.hasValues) continue;

      const brand = colMap.brand ? extractCellString(row.getCell(colMap.brand).value) : '';
      const ad_name = colMap.ad_name ? extractCellString(row.getCell(colMap.ad_name).value) : '';
      const spendVal = colMap.spend ? extractCellNumber(row.getCell(colMap.spend).value) : 0;
      const ad_type_raw = colMap.ad_type ? extractCellString(row.getCell(colMap.ad_type).value) : '';
      const format_raw = colMap.format ? extractCellString(row.getCell(colMap.format).value) : '';
      const creative_link = colMap.creative_link ? extractCellString(row.getCell(colMap.creative_link).value) : '';
      const impression = colMap.impression ? extractCellNumber(row.getCell(colMap.impression).value) : 0;
      const clicks = colMap.clicks ? extractCellNumber(row.getCell(colMap.clicks).value) : 0;
      const views_6s = colMap.views_6s ? extractCellNumber(row.getCell(colMap.views_6s).value) : 0;
      const views_15s = colMap.views_15s ? extractCellNumber(row.getCell(colMap.views_15s).value) : 0;
      const gmvVal = colMap.gmv ? extractCellNumber(row.getCell(colMap.gmv).value) : undefined;
      const purchaseVal = colMap.purchase ? extractCellNumber(row.getCell(colMap.purchase).value) : undefined;

      // Skip empty blank rows
      if (!brand && !ad_name && spendVal === 0) {
        continue;
      }

      // Format resolution
      let format: 'Video' | 'Static' | 'Carousel' = 'Video';
      const fmtLower = format_raw.toLowerCase();
      if (fmtLower.includes('static') || fmtLower.includes('image')) {
        format = 'Static';
      } else if (fmtLower.includes('carousel') || fmtLower.includes('album')) {
        format = 'Carousel';
      }

      const ad_type = ad_type_raw.trim() || 'CPAS Sales';

      // Validation
      const validationReasons: string[] = [];
      if (!brand) validationReasons.push('Missing Brand');
      if (!ad_name) validationReasons.push('Missing Ad Name');
      if (spendVal <= 0) validationReasons.push('Spend must be > 0');

      const isValid = validationReasons.length === 0;

      items.push({
        rowNumber: r,
        brand,
        ad_type,
        format,
        ad_name,
        creative_link,
        spend: spendVal,
        impression,
        clicks,
        views_6s,
        views_15s,
        gmv: gmvVal && gmvVal > 0 ? gmvVal : undefined,
        purchase: purchaseVal && purchaseVal > 0 ? purchaseVal : undefined,
        isValid,
        validationError: validationReasons.join(', '),
      });
    }

    if (items.length === 0) {
      errors.push('No valid data rows found in the uploaded file.');
    }
  } catch (err: any) {
    errors.push(err.message || 'Failed to parse Excel file.');
  }

  return { items, errors };
}

