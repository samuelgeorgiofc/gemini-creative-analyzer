'use client';

import React from 'react';
import { CreativeRecord } from '@/lib/google-sheets';
import { formatIDR, formatNum, formatPct, formatROAS } from '@/lib/formatters';
import { DollarSign, Eye, MousePointer, ShoppingBag, Video, TrendingUp } from 'lucide-react';

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
  const blendedCpp = totalPurchases > 0 ? cpasSpend / totalPurchases : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
      {/* Total Spend */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs relative overflow-hidden">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-400">Total Spend</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg md:text-xl font-bold text-white tracking-tight">
          {formatIDR(totalSpend)}
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          Across {totalCount} creative {totalCount === 1 ? 'asset' : 'assets'}
        </div>
      </div>

      {/* Impressions & CPM */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-400">Impressions & CPM</span>
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
            <Eye className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg md:text-xl font-bold text-white tracking-tight">
          {formatNum(totalImp)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Avg CPM:</span>
          <span className="font-semibold text-slate-200">{formatIDR(avgCpm)}</span>
        </div>
      </div>

      {/* Clicks & CTR */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-400">Clicks & CTR</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <MousePointer className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg md:text-xl font-bold text-white tracking-tight">
          {formatNum(totalClicks)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>Avg CTR:</span>
          <span className="font-semibold text-slate-200">{formatPct(avgCtr)}</span>
        </div>
      </div>

      {/* Video Engagement (6s & 15s) */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-slate-400">Video Retention</span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Video className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg md:text-xl font-bold text-white tracking-tight">
          {formatPct(avgVtr6)}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>6s VTR | 15s:</span>
          <span className="font-semibold text-slate-200">{formatPct(avgVtr15)}</span>
        </div>
      </div>

      {/* CPAS Sales & Blended ROAS */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-900/40 shadow-xs col-span-2 md:col-span-4 lg:col-span-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-emerald-400">CPAS Blended ROAS</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <div className="text-lg md:text-xl font-bold text-emerald-400 tracking-tight">
          {totalGmv > 0 ? formatROAS(blendedRoas) : 'N/A'}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
          <span>GMV: {formatIDR(totalGmv)}</span>
          <span className="font-semibold text-emerald-300">{formatNum(totalPurchases)} orders</span>
        </div>
      </div>
    </div>
  );
}
