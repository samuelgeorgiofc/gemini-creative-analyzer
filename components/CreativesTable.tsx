'use client';

import React, { useState } from 'react';
import { Play, Sparkles, Edit2, Trash2, Loader2 } from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import { formatIDR, formatPct, formatROAS, formatNum } from '@/lib/formatters';

interface CreativesTableProps {
  creatives: CreativeRecord[];
  onOpenVideo: (c: CreativeRecord) => void;
  onOpenAnalysis: (c: CreativeRecord) => void;
  onEditCreative: (c: CreativeRecord) => void;
  onDeleteCreative: (id: string) => void;
  onTriggerAnalysis: (c: CreativeRecord) => void;
  analyzingId: string | null;
}

export default function CreativesTable({
  creatives,
  onOpenVideo,
  onOpenAnalysis,
  onEditCreative,
  onDeleteCreative,
  onTriggerAnalysis,
  analyzingId,
}: CreativesTableProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (creatives.length === 0) {
    return (
      <div className="p-12 text-center rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">No Creatives Found</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Add a creative or clear your active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-12 text-center">Video</th>
              <th className="py-2.5 px-3 min-w-[220px]">Creative & Brand</th>
              <th className="py-2.5 px-3 text-right">Spend</th>
              <th className="py-2.5 px-3 text-right">CPM & CTR</th>
              <th className="py-2.5 px-3 text-right">6s & 15s VTR</th>
              <th className="py-2.5 px-3 text-right">CPAS Sales</th>
              <th className="py-2.5 px-3 text-center">One-Slider AI</th>
              <th className="py-2.5 px-3 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
            {creatives.map((c) => {
              const isAnalyzingThis = analyzingId === c.id;
              const hasAnalysis = Boolean(c.analysis_markdown);
              const isCpas =
                c.ad_type?.toLowerCase().includes('cpas') ||
                (c.gmv !== undefined && c.gmv > 0) ||
                (c.purchase !== undefined && c.purchase > 0);

              return (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Thumbnail / Play Preview */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onOpenVideo(c)}
                      className="w-[44px] h-[58px] rounded bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 relative flex items-center justify-center overflow-hidden transition-all group"
                      title="Play / Inspect Creative"
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                      </div>
                    </button>
                  </td>

                  {/* Creative Name, Brand, Format, Date */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs line-clamp-1">
                      {c.ad_name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.brand}</span>
                      <span className="text-slate-400 dark:text-slate-600">•</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.ad_type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                        {c.format}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      {c.date_label || 'Current Period'}
                    </div>
                  </td>

                  {/* Spend */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    <div className="font-semibold text-slate-900 dark:text-white">{formatIDR(c.spend)}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatNum(c.impression)} imps
                    </div>
                  </td>

                  {/* CPM & CTR */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    <div className="text-slate-900 dark:text-slate-200 font-medium">{formatIDR(c.cpm)}</div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                      {formatPct(c.ctr)} CTR
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatNum(c.clicks)} clicks
                    </div>
                  </td>

                  {/* 6s & 15s VTR */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    {c.format === 'Video' || c.views_6s > 0 ? (
                      <>
                        <div className="text-slate-900 dark:text-white font-medium">
                          {formatPct(c.vtr_6s)} <span className="text-[10px] text-slate-400">6s</span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          {formatPct(c.vtr_15s)} <span className="text-[10px] text-slate-400">15s</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Hold: {formatPct(c.hold_ratio)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">-</span>
                    )}
                  </td>

                  {/* CPAS Sales Metrics */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    {isCpas ? (
                      <>
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatROAS(c.roas || 0)} ROAS
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                          GMV: {formatIDR(c.gmv || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatNum(c.purchase || 0)} ord | CPP {formatIDR(c.cpp || 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">-</span>
                    )}
                  </td>

                  {/* Gemini Analysis Button / Status */}
                  <td className="py-2.5 px-3 text-center">
                    {isAnalyzingThis ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Watching...</span>
                      </div>
                    ) : hasAnalysis ? (
                      <button
                        onClick={() => onOpenAnalysis(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>View Report</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onTriggerAnalysis(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Analyze</span>
                      </button>
                    )}
                  </td>

                  {/* Actions: Edit & Delete */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditCreative(c)}
                        className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Creative Data"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {confirmDeleteId === c.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              onDeleteCreative(c.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1 py-0.5 text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
