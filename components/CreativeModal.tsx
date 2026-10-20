'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Sparkles,
  Link as LinkIcon,
  ShoppingBag,
  Eye,
  MousePointer,
  DollarSign,
  TrendingUp,
  Video,
  FileImage,
  Layers,
  Loader2,
  Check,
} from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import {
  buildTueSunWeeksForMonth,
  getAvailableMonths,
  TueSunWeekOption,
  toYMD,
} from '@/lib/date-utils';
import { formatIDR, formatPct, formatROAS, formatNum } from '@/lib/formatters';

interface CreativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (creative: CreativeRecord) => void;
  creativeToEdit?: CreativeRecord | null;
}

const COMMON_BRANDS = [
  'Somethinc',
  'Skintific',
  'Wardah',
  'Scarlett',
  'Avoskin',
  'Originote',
  'Make Over',
  'Emina',
  'Kahf',
  'Garnier',
  'Maybelline',
  'Madame Gie',
];

const AD_TYPES = [
  'CPAS Sales',
  'Video Views',
  'Traffic',
  'Conversions (Website)',
  'Engagement',
  'Reach / Awareness',
  'Lead Generation',
];

export default function CreativeModal({
  isOpen,
  onClose,
  onSaved,
  creativeToEdit,
}: CreativeModalProps) {
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

  // Creative data fields
  const [brand, setBrand] = useState<string>('Somethinc');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [isOtherBrand, setIsOtherBrand] = useState<boolean>(false);

  const [adType, setAdType] = useState<string>('CPAS Sales');
  const [format, setFormat] = useState<'Video' | 'Static' | 'Carousel'>('Video');
  const [adName, setAdName] = useState<string>('');
  const [creativeLink, setCreativeLink] = useState<string>('');

  // Performance metrics inputs
  const [spendStr, setSpendStr] = useState<string>('');
  const [impressionStr, setImpressionStr] = useState<string>('');
  const [clicksStr, setClicksStr] = useState<string>('');
  const [views6sStr, setViews6sStr] = useState<string>('');
  const [views15sStr, setViews15sStr] = useState<string>('');

  // CPAS Sales fields
  const [gmvStr, setGmvStr] = useState<string>('');
  const [purchaseStr, setPurchaseStr] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Populate when editing
  useEffect(() => {
    if (creativeToEdit) {
      setDateType(creativeToEdit.date_type || 'weekly_month');
      if (creativeToEdit.start_date && creativeToEdit.end_date) {
        setCustomStart(creativeToEdit.start_date);
        setCustomEnd(creativeToEdit.end_date);
      }
      if (COMMON_BRANDS.includes(creativeToEdit.brand)) {
        setBrand(creativeToEdit.brand);
        setIsOtherBrand(false);
      } else {
        setIsOtherBrand(true);
        setCustomBrand(creativeToEdit.brand);
      }
      setAdType(creativeToEdit.ad_type || 'CPAS Sales');
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
      // Defaults for new creative
      setDateType('weekly_month');
      setSelectedWeekKey(weekOptions[1]?.key || 'ALL_MONTH');
      setBrand('Somethinc');
      setIsOtherBrand(false);
      setCustomBrand('');
      setAdType('CPAS Sales');
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
    }
    setErrorMessage('');
  }, [creativeToEdit, isOpen, weekOptions]);

  if (!isOpen) return null;

  // Real-time metric computations
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

  const isCpas = adType === 'CPAS Sales';
  const roas = spend > 0 ? gmv / spend : 0;
  const cpp = purchase > 0 ? spend / purchase : 0;
  const cvr = clicks > 0 ? purchase / clicks : 0;
  const aov = purchase > 0 ? gmv / purchase : 0;

  // Compute final date label
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

  const finalBrand = isOtherBrand ? customBrand.trim() || 'Brand' : brand;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adName.trim()) {
      setErrorMessage('Please enter an Ad Name (Creative Name).');
      return;
    }
    if (!spendStr || spend <= 0) {
      setErrorMessage('Please enter a valid spend amount in IDR.');
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
        brand: finalBrand,
        ad_type: adType,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl p-6 text-slate-100 my-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {creativeToEdit ? 'Edit Creative Performance' : 'Add New Creative Performance'}
            </h2>
            <p className="text-xs text-slate-400">
              Input single creative delivery metrics. Will be saved directly into Google Sheets.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Period Selection */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                Performance Period / Date Format
              </label>

              {/* Mode Selector */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDateType('weekly_month')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    dateType === 'weekly_month' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tue–Sun Week
                </button>
                <button
                  type="button"
                  onClick={() => setDateType('custom_range')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    dateType === 'custom_range' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Custom Range
                </button>
                <button
                  type="button"
                  onClick={() => setDateType('single_date')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    dateType === 'single_date' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single Date
                </button>
              </div>
            </div>

            {/* Tue-Sun Week Picker */}
            {dateType === 'weekly_month' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Week Range (Tue–Sun)</label>
                  <select
                    value={selectedWeekKey}
                    onChange={(e) => setSelectedWeekKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
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

            {/* Custom Range Picker */}
            {dateType === 'custom_range' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Single Date Picker */}
            {dateType === 'single_date' && (
              <div className="pt-1">
                <label className="text-[11px] text-slate-400 mb-1 block">Performance Date</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Section 2: Creative Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Brand */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Brand</label>
              {!isOtherBrand ? (
                <div className="space-y-1.5">
                  <select
                    value={brand}
                    onChange={(e) => {
                      if (e.target.value === '__OTHER__') {
                        setIsOtherBrand(true);
                      } else {
                        setBrand(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    {COMMON_BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="__OTHER__">+ Add New Brand...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="Enter brand name"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsOtherBrand(false)}
                    className="px-2 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Ad Type */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Ad Type / Campaign Objective</label>
              <select
                value={adType}
                onChange={(e) => setAdType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              >
                {AD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">Asset Format</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormat('Video')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                    format === 'Video' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3 h-3" /> Video
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('Static')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                    format === 'Static' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileImage className="w-3 h-3" /> Static
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('Carousel')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                    format === 'Carousel' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" /> Carousel
                </button>
              </div>
            </div>
          </div>

          {/* Ad Name & Link */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                Ad Name / Creative Headline <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                placeholder="e.g., SKN_Serum_ObjHandling_B2_UGC_V1"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                Creative Link (TikTok / Instagram / Google Drive URL)
              </label>
              <input
                type="url"
                value={creativeLink}
                onChange={(e) => setCreativeLink(e.target.value)}
                placeholder="https://www.tiktok.com/@somethinc/video/728192837... or https://drive.google.com/..."
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 3: Performance Metrics */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Delivery & Engagement Metrics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">
                  Spend (IDR) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  value={spendStr}
                  onChange={(e) => setSpendStr(e.target.value)}
                  placeholder="e.g. 5000000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Impressions</label>
                <input
                  type="number"
                  value={impressionStr}
                  onChange={(e) => setImpressionStr(e.target.value)}
                  placeholder="e.g. 250000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Clicks</label>
                <input
                  type="number"
                  value={clicksStr}
                  onChange={(e) => setClicksStr(e.target.value)}
                  placeholder="e.g. 3500"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">6s Views (Hook)</label>
                <input
                  type="number"
                  value={views6sStr}
                  onChange={(e) => setViews6sStr(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">15s Views (Hold)</label>
                <input
                  type="number"
                  value={views15sStr}
                  onChange={(e) => setViews15sStr(e.target.value)}
                  placeholder="e.g. 18000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic CPAS Sales Section */}
          {isCpas && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  CPAS Sales & Commerce Conversion Data
                </h3>
              </div>
              <p className="text-[11px] text-emerald-200/70">
                Inputting GMV and purchases activates specialized ROAS, CPP, and conversion capability analysis in the Gemini creative engine.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] text-emerald-200 font-semibold mb-1 block">
                    Gross Merchandise Value (GMV - IDR)
                  </label>
                  <input
                    type="number"
                    value={gmvStr}
                    onChange={(e) => setGmvStr(e.target.value)}
                    placeholder="e.g. 17500000"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-800/80 text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-emerald-200 font-semibold mb-1 block">
                    Purchases (Total Orders)
                  </label>
                  <input
                    type="number"
                    value={purchaseStr}
                    onChange={(e) => setPurchaseStr(e.target.value)}
                    placeholder="e.g. 110"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-800/80 text-xs font-mono text-emerald-300 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Real-time Calculated Metrics Preview */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Calculated Metrics Preview
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">CPM</span>
                <span className="font-bold text-white">{formatIDR(cpm)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">CTR</span>
                <span className="font-bold text-white">{formatPct(ctr)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">6s VTR</span>
                <span className="font-bold text-white">{formatPct(vtr6s)}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Hold Ratio (15s/6s)</span>
                <span className="font-bold text-white">{formatPct(holdRatio)}</span>
              </div>

              {isCpas && (
                <>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                    <span className="text-[10px] text-emerald-300 block">ROAS</span>
                    <span className="font-bold text-emerald-400">{formatROAS(roas)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                    <span className="text-[10px] text-emerald-300 block">Cost Per Purchase (CPP)</span>
                    <span className="font-bold text-emerald-400">{formatIDR(cpp)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                    <span className="text-[10px] text-emerald-300 block">Conversion Rate (CVR)</span>
                    <span className="font-bold text-emerald-400">{formatPct(cvr)}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                    <span className="text-[10px] text-emerald-300 block">Avg Order Value (AOV)</span>
                    <span className="font-bold text-emerald-400">{formatIDR(aov)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{creativeToEdit ? 'Update in Google Sheet' : 'Save to Google Sheet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
