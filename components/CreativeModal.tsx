'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Check, Loader2 } from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import {
  buildTueSunWeeksForMonth,
  getAvailableMonths,
  TueSunWeekOption,
  toYMD,
} from '@/lib/date-utils';
import { formatIDR, formatPct, formatROAS } from '@/lib/formatters';

interface CreativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (creative: CreativeRecord) => void;
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
  const [brand, setBrand] = useState<string>('');
  const [adTypeCategory, setAdTypeCategory] = useState<'CPAS Sales' | 'Others'>('CPAS Sales');
  const [otherAdTypeValue, setOtherAdTypeValue] = useState<string>('');
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

  // Filter other ad types (excluding CPAS Sales) for suggestion relook
  const otherExistingTypes = useMemo(() => {
    return existingAdTypes.filter((t) => t && t.toLowerCase() !== 'cpas sales');
  }, [existingAdTypes]);

  // Populate when editing or opening
  useEffect(() => {
    if (creativeToEdit) {
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
    }
    setErrorMessage('');
  }, [creativeToEdit, isOpen, weekOptions, existingBrands]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl p-6 text-slate-900 dark:text-slate-100 my-8 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            {creativeToEdit ? 'Edit Creative' : 'Add Creative'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Input performance data. Synced directly with your Google Sheet.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Period Selection */}
          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Performance Period
              </label>

              <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDateType('weekly_month')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
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
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
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
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
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

          {/* Section 2: Brand, Ad Type, Format */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Brand with Datalist for existing brands */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Brand <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="brands-datalist"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Somethinc"
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

            {/* Ad Type: CPAS Sales vs Others */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Ad Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800 mb-1.5">
                <button
                  type="button"
                  onClick={() => setAdTypeCategory('CPAS Sales')}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
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
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
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
                  {otherExistingTypes.length > 0 && !otherAdTypeValue && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {otherExistingTypes.slice(0, 3).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setOtherAdTypeValue(t)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Asset Format */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Format</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormat('Video')}
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
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
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
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
                  className={`py-1 rounded text-[11px] font-semibold transition-colors ${
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Ad Name / Creative Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={adName}
                onChange={(e) => setAdName(e.target.value)}
                placeholder="e.g. SOMETHINC_Serum_ObjHandling_B2_UGC"
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

          {/* Section 3: Performance Metrics */}
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
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Impressions</label>
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
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">6s Views (Hook)</label>
                <input
                  type="number"
                  value={views6sStr}
                  onChange={(e) => setViews6sStr(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">15s Views (Hold)</label>
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

          {/* Section 4: Dynamic CPAS Sales Data */}
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

          {/* Real-time Calculated Metrics Preview */}
          <div className="p-3 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Calculated Metrics Preview
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">CPM</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{formatIDR(cpm)}</span>
              </div>
              <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">CTR</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{formatPct(ctr)}</span>
              </div>
              <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">6s VTR</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{formatPct(vtr6s)}</span>
              </div>
              <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Hold (15s/6s)</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">{formatPct(holdRatio)}</span>
              </div>

              {isCpas && (
                <>
                  <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">ROAS</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{formatROAS(roas)}</span>
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Cost Per Purchase</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{formatIDR(cpp)}</span>
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">CVR</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{formatPct(cvr)}</span>
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">AOV</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{formatIDR(aov)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{creativeToEdit ? 'Update' : 'Save to Sheet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
