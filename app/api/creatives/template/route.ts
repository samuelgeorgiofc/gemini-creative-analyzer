import { NextResponse } from 'next/server';
import { createTemplateWorkbook } from '@/lib/excel-template';

export async function GET() {
  try {
    const wb = await createTemplateWorkbook();
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Creative_Upload_Template.xlsx"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate template.' },
      { status: 500 }
    );
  }
}

