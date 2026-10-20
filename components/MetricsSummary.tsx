'use client';

import React from 'react';
import { CreativeRecord } from '@/lib/google-sheets';
import { formatIDR, formatNum, formatPct, formatROAS } from '@/lib/formatters';

interface MetricsSummaryProps {
  creatives: CreativeRecord[];
}

export default function MetricsSummary({ creatives }: MetricsSummaryProps) {
  const totalCount = creatives.length;
  const totalSpend = creatives.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalImp = creatives.reduce((acc, c) => acc + (c.impression || 0), 0);
  const totalClicks = creatives.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const totalV6 = creatives.reduce((acc, c) => acc + (c.views_6s || 0), 0);
  const totalV15 = creatives.reduce((acc, c) => acc + (c.views_15s || 0), 0);

  const avgCpm = totalImp > 0 ? (totalSpend / totalImp) * 1000 : 0;
  const avgCtr = totalImp > 0 ? totalClicks / totalImp : 0;
  const avgVtr6 = totalImp > 0 ? totalV6 / totalImp : 0;
  const avgVtr15 = totalImp > 0 ? totalV15 / totalImp : 0;

  // CPAS aggregations
  const cpasCreatives = creatives.filter(
    (c) => c.ad_type?.toLowerCase().includes('cpas') || (c.gmv && c.gmv > 0) || (c.purchase && c.purchase > 0)
  );
  const cpasSpend = cpasCreatives.reduce((acc, c) => acc + (c.spend || 0), 0);
  const totalGmv = cpasCreatives.reduce((acc, c) => acc + (c.gmv || 0), 0);
  const totalPurchases = cpasCreatives.reduce((acc, c) => acc + (c.purchase || 0), 0);
  const blendedRoas = cpasSpend > 0 ? totalGmv / cpasSpend : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {/* Total Spend */}
      <div className="p-3.5 rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
          Total Spend
        </span>
        <div className="text-base md:text-lg font-bold font-mono text-slate-900 dark:text-white">
          {formatIDR(totalSpend)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1">
          {totalCount} creative {totalCount === 1 ? 'record' : 'records'}
        </div>
      </div>

      {/* Impressions & CPM */}
      <div className="p-3.5 rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
          Impressions
        </span>
        <div className="text-base md:text-lg font-bold font-mono text-slate-900 dark:text-white">
          {formatNum(totalImp)}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
          <span>CPM:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">{formatIDR(avgCpm)}</span>
        </div>
      </div>

      {/* Clicks & CTR */}
      <div className="p-3.5 rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
          Clicks
        </span>
        <div className="text-base md:text-lg font-bold font-mono text-slate-900 dark:text-white">
          {formatNum(totalClicks)}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
          <span>CTR:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">{formatPct(avgCtr)}</span>
        </div>
      </div>

      {/* Video Retention */}
      <div className="p-3.5 rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
          6s VTR (Hook)
        </span>
        <div className="text-base md:text-lg font-bold font-mono text-slate-900 dark:text-white">
          {formatPct(avgVtr6)}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
          <span>15s Hold:</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">{formatPct(avgVtr15)}</span>
        </div>
      </div>

      {/* CPAS Sales & Blended ROAS */}
      <div className="p-3.5 rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 col-span-2 md:col-span-4 lg:col-span-1">
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
          CPAS Blended ROAS
        </span>
        <div className="text-base md:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {totalGmv > 0 ? formatROAS(blendedRoas) : '-'}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
          <span>GMV: {formatIDR(totalGmv)}</span>
          <span className="font-mono text-slate-700 dark:text-slate-300">{formatNum(totalPurchases)} orders</span>
        </div>
      </div>
    </div>
  );
}
