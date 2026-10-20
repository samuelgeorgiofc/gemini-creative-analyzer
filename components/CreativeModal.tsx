'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  Loader2,
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  FileText,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import {
  buildTueSunWeeksForMonth,
  getAvailableMonths,
  toYMD,
} from '@/lib/date-utils';
import { formatIDR, formatPct, formatROAS } from '@/lib/formatters';
import {
  downloadCreativeTemplate,
  parseCreativesFromExcel,
  ParsedCreativeRow,
} from '@/lib/excel-template';

interface CreativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (creative: CreativeRecord | CreativeRecord[]) => void;
  creativeToEdit?: CreativeRecord | null;
  existingBrands?: string[];
  existingAdTypes?: string[];
}

export default function CreativeModal({
  isOpen,
  onClose,
  onSaved,
  creativeToEdit,
  existingBrands = [],
  existingAdTypes = [],
}: CreativeModalProps) {
  // Input Mode: 'single' form vs 'bulk' Excel upload
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');

  // Date modes: 'weekly_month' (Tue-Sun weeks), 'custom_range', 'single_date'
  const [dateType, setDateType] = useState<'weekly_month' | 'custom_range' | 'single_date'>('weekly_month');
  const availableMonths = useMemo(() => getAvailableMonths(12), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]?.value || '2026-10');
  const weekOptions = useMemo(() => buildTueSunWeeksForMonth(selectedMonth), [selectedMonth]);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('ALL_MONTH');

  // Custom / Single dates
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>('');

  // Creative data fields (Single Mode)
  const [brand, setBrand] = useState<string>('');
  const [adTypeCategory, setAdTypeCategory] = useState<'CPAS Sales' | 'Others'>('CPAS Sales');
  const [otherAdTypeValue, setOtherAdTypeValue] = useState<string>('');
  const [format, setFormat] = useState<'Video' | 'Static' | 'Carousel'>('Video');
  const [adName, setAdName] = useState<string>('');
  const [creativeLink, setCreativeLink] = useState<string>('');

  // Performance metrics inputs (Single Mode)
  const [spendStr, setSpendStr] = useState<string>('');
  const [impressionStr, setImpressionStr] = useState<string>('');
  const [clicksStr, setClicksStr] = useState<string>('');
  const [views6sStr, setViews6sStr] = useState<string>('');
  const [views15sStr, setViews15sStr] = useState<string>('');

  // CPAS Sales fields (Single Mode)
  const [gmvStr, setGmvStr] = useState<string>('');
  const [purchaseStr, setPurchaseStr] = useState<string>('');

  // Bulk Upload States
  const [parsedRows, setParsedRows] = useState<ParsedCreativeRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [fileSizeStr, setFileSizeStr] = useState<string>('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter other ad types (excluding CPAS Sales) for suggestion relook
  const otherExistingTypes = useMemo(() => {
    return existingAdTypes.filter((t) => t && t.toLowerCase() !== 'cpas sales');
  }, [existingAdTypes]);

  // Populate or reset state when modal opens or creativeToEdit changes
  useEffect(() => {
    if (creativeToEdit) {
      setInputMode('single');
      setDateType(creativeToEdit.date_type || 'weekly_month');
      if (creativeToEdit.start_date && creativeToEdit.end_date) {
        setCustomStart(creativeToEdit.start_date);
        setCustomEnd(creativeToEdit.end_date);
      }
      setBrand(creativeToEdit.brand || '');
      const isCpas = creativeToEdit.ad_type?.toLowerCase().includes('cpas');
      if (isCpas) {
        setAdTypeCategory('CPAS Sales');
        setOtherAdTypeValue('');
      } else {
        setAdTypeCategory('Others');
        setOtherAdTypeValue(creativeToEdit.ad_type || '');
      }
      setFormat(creativeToEdit.format || 'Video');
      setAdName(creativeToEdit.ad_name || '');
      setCreativeLink(creativeToEdit.creative_link || '');
      setSpendStr(creativeToEdit.spend ? String(creativeToEdit.spend) : '');
      setImpressionStr(creativeToEdit.impression ? String(creativeToEdit.impression) : '');
      setClicksStr(creativeToEdit.clicks ? String(creativeToEdit.clicks) : '');
      setViews6sStr(creativeToEdit.views_6s ? String(creativeToEdit.views_6s) : '');
      setViews15sStr(creativeToEdit.views_15s ? String(creativeToEdit.views_15s) : '');
      setGmvStr(creativeToEdit.gmv ? String(creativeToEdit.gmv) : '');
      setPurchaseStr(creativeToEdit.purchase ? String(creativeToEdit.purchase) : '');
    } else {
      setInputMode('single');
      setDateType('weekly_month');
      setSelectedWeekKey(weekOptions[1]?.key || 'ALL_MONTH');
      setBrand(existingBrands[0] || '');
      setAdTypeCategory('CPAS Sales');
      setOtherAdTypeValue('');
      setFormat('Video');
      setAdName('');
      setCreativeLink('');
      setSpendStr('');
      setImpressionStr('');
      setClicksStr('');
      setViews6sStr('');
      setViews15sStr('');
      setGmvStr('');
      setPurchaseStr('');
      // Reset bulk state
      setParsedRows([]);
      setFileName('');
      setFileSizeStr('');
      setParseErrors([]);
    }
    setErrorMessage('');
  }, [creativeToEdit, isOpen, weekOptions, existingBrands]);

  if (!isOpen) return null;

  // Real-time metric computations for single mode
  const spend = Number(spendStr.replace(/[^0-9.-]+/g, '')) || 0;
  const impression = Number(impressionStr.replace(/[^0-9.-]+/g, '')) || 0;
  const clicks = Number(clicksStr.replace(/[^0-9.-]+/g, '')) || 0;
  const views6s = Number(views6sStr.replace(/[^0-9.-]+/g, '')) || 0;
  const views15s = Number(views15sStr.replace(/[^0-9.-]+/g, '')) || 0;
  const gmv = Number(gmvStr.replace(/[^0-9.-]+/g, '')) || 0;
  const purchase = Number(purchaseStr.replace(/[^0-9.-]+/g, '')) || 0;

  const cpm = impression > 0 ? (spend / impression) * 1000 : 0;
  const ctr = impression > 0 ? clicks / impression : 0;
  const vtr6s = impression > 0 ? views6s / impression : 0;
  const vtr15s = impression > 0 ? views15s / impression : 0;
  const holdRatio = views6s > 0 ? views15s / views6s : 0;

  const isCpas = adTypeCategory === 'CPAS Sales';
  const finalAdType = isCpas ? 'CPAS Sales' : (otherAdTypeValue.trim() || 'Other');
  const roas = spend > 0 ? gmv / spend : 0;
  const cpp = purchase > 0 ? spend / purchase : 0;
  const cvr = clicks > 0 ? purchase / clicks : 0;
  const aov = purchase > 0 ? gmv / purchase : 0;

  let dateLabel = 'Current Period';
  let startDate = '';
  let endDate = '';

  if (dateType === 'weekly_month') {
    const selectedWeek = weekOptions.find((w) => w.key === selectedWeekKey) || weekOptions[0];
    dateLabel = selectedWeek ? selectedWeek.label : selectedMonth;
    startDate = selectedWeek?.startYMD || '';
    endDate = selectedWeek?.endYMD || '';
  } else if (dateType === 'custom_range') {
    dateLabel = customStart && customEnd ? `${customStart} - ${customEnd}` : customStart || 'Custom Range';
    startDate = customStart;
    endDate = customEnd;
  } else {
    dateLabel = singleDate || toYMD(new Date());
    startDate = singleDate;
    endDate = singleDate;
  }

  // Bulk summary stats
  const validBulkRows = parsedRows.filter((r) => r.isValid);
  const invalidBulkRows = parsedRows.filter((r) => !r.isValid);
  const totalBulkSpend = validBulkRows.reduce((acc, r) => acc + r.spend, 0);
  const totalBulkGMV = validBulkRows.reduce((acc, r) => acc + (r.gmv || 0), 0);

  // Handle template download
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await downloadCreativeTemplate();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to download Excel template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Process uploaded Excel file
  const handleProcessFile = async (file: File) => {
    if (!file) return;
    setIsParsing(true);
    setParseErrors([]);
    setErrorMessage('');
    setFileName(file.name);
    setFileSizeStr((file.size / 1024).toFixed(1) + ' KB');

    try {
      const { items, errors } = await parseCreativesFromExcel(file);
      setParsedRows(items);
      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([err.message || 'Failed to parse file.']);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleProcessFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleProcessFile(files[0]);
    }
  };

  // Single submission handler
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim()) {
      setErrorMessage('Please enter a Brand name.');
      return;
    }
    if (!adName.trim()) {
      setErrorMessage('Please enter an Ad Name.');
      return;
    }
    if (!spendStr || spend <= 0) {
      setErrorMessage('Please enter a valid spend amount in IDR.');
      return;
    }
    if (!isCpas && !otherAdTypeValue.trim()) {
      setErrorMessage('Please enter the custom ad type for Others.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        id: creativeToEdit?.id,
        date_label: dateLabel,
        date_type: dateType,
        start_date: startDate,
        end_date: endDate,
        brand: brand.trim(),
        ad_type: finalAdType,
        format,
        ad_name: adName.trim(),
        creative_link: creativeLink.trim(),
        spend,
        impression,
        clicks,
        views_6s: views6s,
        views_15s: views15s,
        gmv: isCpas ? gmv : undefined,
        purchase: isCpas ? purchase : undefined,
      };

      const method = creativeToEdit ? 'PUT' : 'POST';
      const res = await fetch('/api/creatives', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.creative) {
        onSaved(data.creative);
        onClose();
      } else {
        setErrorMessage(data.error || 'Failed to save creative.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving to Google Sheets.');
    } finally {
      setSaving(false);
    }
  };

  // Bulk submission handler
  const handleBulkSubmit = async () => {
    if (validBulkRows.length === 0) {
      setErrorMessage('No valid creative rows found to upload.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    try {
      const payload = validBulkRows.map((r) => ({
        date_label: dateLabel,
        date_type: dateType,
        start_date: startDate,
        end_date: endDate,
        brand: r.brand,
        ad_type: r.ad_type,
        format: r.format,
        ad_name: r.ad_name,
        creative_link: r.creative_link,
        spend: r.spend,
        impression: r.impression,
        clicks: r.clicks,
        views_6s: r.views_6s,
        views_15s: r.views_15s,
        gmv: r.gmv,
        purchase: r.purchase,
      }));

      const res = await fetch('/api/creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatives: payload }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.creatives)) {
        onSaved(data.creatives);
        onClose();
      } else {
        setErrorMessage(data.error || 'Failed to bulk upload creatives to Google Sheets.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error saving bulk creatives.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl p-6 text-slate-900 dark:text-slate-100 my-8 relative max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header & Mode Switcher */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-8">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {creativeToEdit
                ? 'Edit Creative'
                : inputMode === 'bulk'
                ? 'Bulk Upload Creatives (Excel)'
                : 'Add Creative'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Input performance data. Synced directly with your Google Sheet.
            </p>
          </div>

          {/* Toggle between Single and Bulk Upload if not editing */}
          {!creativeToEdit && (
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  inputMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Single Input</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('bulk')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  inputMode === 'bulk'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Excel</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold ml-0.5">
                  NEW
                </span>
              </button>
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SHARED SECTION: Performance Period Selection (Applies to both Single and Bulk upload) */}
        <div className="mb-4 p-3.5 rounded-md bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Performance Period
              </label>
              {inputMode === 'bulk' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-medium border border-indigo-200 dark:border-indigo-800/60">
                  Applied to all uploaded items
                </span>
              )}
            </div>

            <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setDateType('weekly_month')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  dateType === 'weekly_month'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tue–Sun Week
              </button>
              <button
                type="button"
                onClick={() => setDateType('custom_range')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  dateType === 'custom_range'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Custom Range
              </button>
              <button
                type="button"
                onClick={() => setDateType('single_date')}
                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                  dateType === 'single_date'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Single Date
              </button>
            </div>
          </div>

          {dateType === 'weekly_month' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Week Range</label>
                <select
                  value={selectedWeekKey}
                  onChange={(e) => setSelectedWeekKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                >
                  {weekOptions.map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {dateType === 'custom_range' && (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {dateType === 'single_date' && (
            <div className="pt-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        {/* ----------------- MODE 1: BULK EXCEL UPLOAD ----------------- */}
        {inputMode === 'bulk' && !creativeToEdit ? (
          <div className="space-y-4">
            {/* Step 1: Template Download Banner */}
            <div className="p-3.5 rounded-md bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    Step 1: Download Standard Excel Template
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Pre-configured with all required columns, data types, and sample rows (e.g. &quot;PHD 1234_Brand_...&quot;).
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download Template (.xlsx)</span>
              </button>
            </div>

            {/* Step 2: Upload Dropzone */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Step 2: Upload Completed File (.xlsx, .xls)
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50 dark:bg-[#090d16]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-2.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Click to choose or drag & drop your Excel file here
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Supports .xlsx and .xls format with Brand, Ad Name, Spend, and optional metrics
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Selected File Details */}
            {fileName && (
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-white truncate">{fileName}</span>
                  <span className="text-slate-400 text-[11px] shrink-0">({fileSizeStr})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsedRows([]);
                    setFileName('');
                    setFileSizeStr('');
                    setParseErrors([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Parsing State */}
            {isParsing && (
              <div className="flex items-center justify-center gap-2 p-6 text-xs text-slate-600 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Reading and validating Excel rows...</span>
              </div>
            )}

            {/* Parse Errors */}
            {parseErrors.length > 0 && (
              <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>File Notice:</span>
                </div>
                {parseErrors.map((err, idx) => (
                  <p key={idx} className="text-[11px] pl-5">• {err}</p>
                ))}
              </div>
            )}

            {/* Parsed Rows Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-2.5 pt-1">
                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Rows</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {parsedRows.length} creatives
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Valid & Ready</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {validBulkRows.length} ready
                    </span>
                    {invalidBulkRows.length > 0 && (
                      <span className="text-[10px] text-rose-500 font-medium ml-1">
                        ({invalidBulkRows.length} invalid)
                      </span>
                    )}
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Total Spend</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {formatIDR(totalBulkSpend)}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Total GMV</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {totalBulkGMV > 0 ? formatIDR(totalBulkGMV) : '-'}
                    </span>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Status</th>
                          <th className="py-2 px-2.5">Brand</th>
                          <th className="py-2 px-2.5">Ad Name</th>
                          <th className="py-2 px-2.5">Type</th>
                          <th className="py-2 px-2.5">Format</th>
                          <th className="py-2 px-2.5">Spend</th>
                          <th className="py-2 px-2.5">Impr</th>
                          <th className="py-2 px-2.5">Clicks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                        {parsedRows.map((r, i) => (
                          <tr
                            key={i}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                              !r.isValid ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-slate-400">{i + 1}</td>
                            <td className="py-1.5 px-2.5">
                              {r.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-sans font-medium text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-sans font-medium text-rose-600 dark:text-rose-400"
                                  title={r.validationError}
                                >
                                  <AlertCircle className="w-3 h-3" /> {r.validationError}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                              {r.brand}
                            </td>
                            <td className="py-1.5 px-2.5 font-sans text-slate-800 dark:text-slate-200 max-w-[180px] truncate">
                              {r.ad_name}
                            </td>
                            <td className="py-1.5 px-2.5 font-sans text-slate-600 dark:text-slate-400">
                              {r.ad_type}
                            </td>
                            <td className="py-1.5 px-2.5 font-sans text-slate-600 dark:text-slate-400">
                              {r.format}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-900 dark:text-white font-medium">
                              {formatIDR(r.spend)}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400">
                              {r.impression.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600 dark:text-slate-400">
                              {r.clicks.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Actions for Bulk Upload */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {validBulkRows.length > 0 ? (
                  <>
                    Target period: <strong className="text-slate-800 dark:text-slate-200">{dateLabel}</strong>
                  </>
                ) : (
                  'Select file above to preview data before uploading'
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleBulkSubmit}
                  disabled={saving || validBulkRows.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {validBulkRows.length > 0
                      ? `Upload ${validBulkRows.length} Creatives to Sheet`
                      : 'Upload to Sheet'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ----------------- MODE 2: SINGLE FORM INPUT ----------------- */
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            {/* Section: Brand, Ad Type, Format */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Brand */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Brand <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="brands-datalist"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. PHD or Somethinc"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  required
                />
                <datalist id="brands-datalist">
                  {existingBrands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                {existingBrands.length > 0 && !brand && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {existingBrands.slice(0, 4).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBrand(b)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ad Type */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Ad Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800 mb-1.5">
                  <button
                    type="button"
                    onClick={() => setAdTypeCategory('CPAS Sales')}
                    className={`py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      isCpas
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    CPAS Sales
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdTypeCategory('Others')}
                    className={`py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      !isCpas
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Others
                  </button>
                </div>

                {!isCpas && (
                  <div>
                    <input
                      type="text"
                      list="adtypes-datalist"
                      value={otherAdTypeValue}
                      onChange={(e) => setOtherAdTypeValue(e.target.value)}
                      placeholder="Enter ad type (e.g. Traffic, Video Views)"
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                      required
                    />
                    <datalist id="adtypes-datalist">
                      {otherExistingTypes.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              {/* Format */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormat('Video')}
                    className={`py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      format === 'Video'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('Static')}
                    className={`py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      format === 'Static'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Static
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('Carousel')}
                    className={`py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                      format === 'Carousel'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Carousel
                  </button>
                </div>
              </div>
            </div>

            {/* Ad Name & Link */}
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ad Name / Creative Headline <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Pattern: PHD 1234_Brand_...
                  </span>
                </div>
                <input
                  type="text"
                  value={adName}
                  onChange={(e) => setAdName(e.target.value)}
                  placeholder="PHD 1234_Brand_..."
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Creative Link (TikTok / Instagram / Google Drive URL)
                </label>
                <input
                  type="url"
                  value={creativeLink}
                  onChange={(e) => setCreativeLink(e.target.value)}
                  placeholder="https://www.tiktok.com/@brand/video/... or https://drive.google.com/..."
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Section: Spend & Engagement Metrics */}
            <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-2.5">
              <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Spend & Engagement Metrics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                    Spend (IDR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={spendStr}
                    onChange={(e) => setSpendStr(e.target.value)}
                    placeholder="e.g. 5000000"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                    Impressions
                  </label>
                  <input
                    type="number"
                    value={impressionStr}
                    onChange={(e) => setImpressionStr(e.target.value)}
                    placeholder="e.g. 250000"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Clicks</label>
                  <input
                    type="number"
                    value={clicksStr}
                    onChange={(e) => setClicksStr(e.target.value)}
                    placeholder="e.g. 3500"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                    6s Views (Hook)
                  </label>
                  <input
                    type="number"
                    value={views6sStr}
                    onChange={(e) => setViews6sStr(e.target.value)}
                    placeholder="e.g. 45000"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">
                    15s Views (Hold)
                  </label>
                  <input
                    type="number"
                    value={views15sStr}
                    onChange={(e) => setViews15sStr(e.target.value)}
                    placeholder="e.g. 18000"
                    className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* CPAS E-Commerce Performance */}
            {isCpas && (
              <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  CPAS E-Commerce Performance
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-1 block">
                      Gross Merchandise Value (GMV - IDR)
                    </label>
                    <input
                      type="number"
                      value={gmvStr}
                      onChange={(e) => setGmvStr(e.target.value)}
                      placeholder="e.g. 17500000"
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-1 block">
                      Purchases (Total Orders)
                    </label>
                    <input
                      type="number"
                      value={purchaseStr}
                      onChange={(e) => setPurchaseStr(e.target.value)}
                      placeholder="e.g. 110"
                      className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Calculated Metrics Preview */}
            <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                Calculated Metrics Preview
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">CPM</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {formatIDR(cpm)}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">CTR</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {formatPct(ctr)}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">6s VTR</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {formatPct(vtr6s)}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Hold (15s/6s)</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {formatPct(holdRatio)}
                  </span>
                </div>

                {isCpas && (
                  <>
                    <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">ROAS</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatROAS(roas)}
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Cost Per Purchase</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {formatIDR(cpp)}
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">CVR</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {formatPct(cvr)}
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">AOV</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {formatIDR(aov)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions for Single Form */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>{creativeToEdit ? 'Update' : 'Save to Sheet'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
