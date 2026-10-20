'use client';

import React from 'react';
import { Search, Filter, Download, Sparkles } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CreativeRecord } from '@/lib/google-sheets';
import { formatIDR, formatPct, formatROAS, formatNum } from '@/lib/formatters';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedBrand: string;
  onBrandChange: (b: string) => void;
  selectedAdType: string;
  onAdTypeChange: (t: string) => void;
  selectedFormat: string;
  onFormatChange: (f: string) => void;
  selectedStatus: 'ALL' | 'ANALYZED' | 'PENDING';
  onStatusChange: (s: 'ALL' | 'ANALYZED' | 'PENDING') => void;
  brands: string[];
  adTypes: string[];
  creativesToExport: CreativeRecord[];
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedBrand,
  onBrandChange,
  selectedAdType,
  onAdTypeChange,
  selectedFormat,
  onFormatChange,
  selectedStatus,
  onStatusChange,
  brands,
  adTypes,
  creativesToExport,
}: FilterBarProps) {
  const handleExportExcel = async () => {
    if (creativesToExport.length === 0) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Creative Performance');

    ws.columns = [
      { header: 'Creative Name', key: 'ad_name', width: 35 },
      { header: 'Brand', key: 'brand', width: 16 },
      { header: 'Period', key: 'date_label', width: 22 },
      { header: 'Ad Type', key: 'ad_type', width: 18 },
      { header: 'Format', key: 'format', width: 12 },
      { header: 'Spend (IDR)', key: 'spend', width: 16 },
      { header: 'Impressions', key: 'impression', width: 14 },
      { header: 'Clicks', key: 'clicks', width: 12 },
      { header: 'CPM (IDR)', key: 'cpm', width: 14 },
      { header: 'CTR', key: 'ctr', width: 12 },
      { header: '6s Views', key: 'views_6s', width: 12 },
      { header: '6s VTR', key: 'vtr_6s', width: 12 },
      { header: '15s Views', key: 'views_15s', width: 12 },
      { header: '15s VTR', key: 'vtr_15s', width: 12 },
      { header: 'Hold Ratio', key: 'hold_ratio', width: 14 },
      { header: 'GMV (IDR)', key: 'gmv', width: 16 },
      { header: 'Purchases', key: 'purchase', width: 12 },
      { header: 'ROAS', key: 'roas', width: 12 },
      { header: 'Cost Per Purchase (CPP)', key: 'cpp', width: 16 },
      { header: 'Creative Link', key: 'creative_link', width: 40 },
      { header: 'Gemini Analysis Status', key: 'status', width: 20 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    creativesToExport.forEach((c) => {
      ws.addRow({
        ad_name: c.ad_name,
        brand: c.brand,
        date_label: c.date_label,
        ad_type: c.ad_type,
        format: c.format,
        spend: c.spend,
        impression: c.impression,
        clicks: c.clicks,
        cpm: c.cpm,
        ctr: (c.ctr * 100).toFixed(2) + '%',
        views_6s: c.views_6s,
        vtr_6s: (c.vtr_6s * 100).toFixed(2) + '%',
        views_15s: c.views_15s,
        vtr_15s: (c.vtr_15s * 100).toFixed(2) + '%',
        hold_ratio: (c.hold_ratio * 100).toFixed(2) + '%',
        gmv: c.gmv || '',
        purchase: c.purchase || '',
        roas: c.roas ? `${c.roas.toFixed(2)}x` : '',
        cpp: c.cpp || '',
        creative_link: c.creative_link,
        status: c.analysis_markdown ? 'Analyzed' : 'Pending',
      });
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `creative-performance-${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  return (
    <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by Ad Name or Brand..."
            className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Right side: Status toggle & Export */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {/* Analysis Status Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => onStatusChange('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({creativesToExport.length})
            </button>
            <button
              onClick={() => onStatusChange('ANALYZED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'ANALYZED' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Analyzed
            </button>
            <button
              onClick={() => onStatusChange('PENDING')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === 'PENDING' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending
            </button>
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors"
            title="Export filtered table to Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Dropdowns row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
        {/* Brand */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Brand</label>
          <select
            value={selectedBrand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="ALL">All Brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Ad Type */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ad Type</label>
          <select
            value={selectedAdType}
            onChange={(e) => onAdTypeChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="ALL">All Ad Types</option>
            {adTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Format */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Format</label>
          <select
            value={selectedFormat}
            onChange={(e) => onFormatChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
          >
            <option value="ALL">All Formats</option>
            <option value="Video">Video</option>
            <option value="Static">Static Image</option>
            <option value="Carousel">Carousel</option>
          </select>
        </div>

        {/* Reset Filters */}
        <div className="flex items-end">
          <button
            onClick={() => {
              onSearchChange('');
              onBrandChange('ALL');
              onAdTypeChange('ALL');
              onFormatChange('ALL');
              onStatusChange('ALL');
            }}
            className="w-full py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:border-slate-700 text-xs font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}
