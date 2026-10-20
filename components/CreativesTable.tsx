'use client';

import React, { useState } from 'react';
import {
  Play,
  Film,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  ShoppingBag,
  Loader2,
  Video,
  FileImage,
  Layers,
} from 'lucide-react';
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
      <div className="p-12 text-center rounded-xl bg-[#0f172a] border border-slate-800 text-slate-400">
        <Film className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="text-base font-bold text-white mb-1">No Creatives Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Add your first creative performance record or adjust your search and filters above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#0f172a] border border-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">Preview</th>
              <th className="py-3 px-4 min-w-[200px]">Creative & Brand</th>
              <th className="py-3 px-4 text-right">Spend</th>
              <th className="py-3 px-4 text-right">CPM & CTR</th>
              <th className="py-3 px-4 text-right">6s & 15s VTR</th>
              <th className="py-3 px-4 text-right">CPAS E-Commerce</th>
              <th className="py-3 px-4 text-center">Gemini Analysis</th>
              <th className="py-3 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-slate-300">
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
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Thumbnail / Play Preview */}
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onOpenVideo(c)}
                      className="w-11 h-14 rounded-lg bg-slate-950 border border-slate-800 hover:border-indigo-500 relative flex items-center justify-center overflow-hidden transition-all group/thumb"
                      title="Play / Inspect Creative"
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/10 flex items-center justify-center transition-colors">
                        <Play className="w-4 h-4 text-white fill-white drop-shadow-md" />
                      </div>
                    </button>
                  </td>

                  {/* Creative Name, Brand, Format, Date */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-white text-[13px] tracking-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {c.ad_name}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                      <span className="font-semibold text-slate-300">{c.brand}</span>
                      <span className="text-slate-600">•</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                        {c.ad_type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-950/40 text-indigo-300 border border-indigo-800/40 flex items-center gap-1">
                        {c.format === 'Video' ? (
                          <Video className="w-2.5 h-2.5" />
                        ) : c.format === 'Static' ? (
                          <FileImage className="w-2.5 h-2.5" />
                        ) : (
                          <Layers className="w-2.5 h-2.5" />
                        )}
                        {c.format}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      {c.date_label || 'Current Period'}
                    </div>
                  </td>

                  {/* Spend */}
                  <td className="py-3 px-4 text-right">
                    <div className="font-bold text-white">{formatIDR(c.spend)}</div>
                    <div className="text-[10px] text-slate-500">
                      {formatNum(c.impression)} imps
                    </div>
                  </td>

                  {/* CPM & CTR */}
                  <td className="py-3 px-4 text-right">
                    <div className="font-semibold text-slate-200">{formatIDR(c.cpm)}</div>
                    <div className="text-[11px] text-indigo-400 font-semibold mt-0.5">
                      {formatPct(c.ctr)} CTR
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatNum(c.clicks)} clicks
                    </div>
                  </td>

                  {/* 6s & 15s VTR */}
                  <td className="py-3 px-4 text-right">
                    {c.format === 'Video' || c.views_6s > 0 ? (
                      <>
                        <div className="font-semibold text-purple-400">
                          {formatPct(c.vtr_6s)} <span className="text-[10px] text-slate-500">6s</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {formatPct(c.vtr_15s)} <span className="text-[10px] text-slate-500">15s</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Hold: {formatPct(c.hold_ratio)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">-</span>
                    )}
                  </td>

                  {/* CPAS Sales Metrics */}
                  <td className="py-3 px-4 text-right">
                    {isCpas ? (
                      <>
                        <div className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          {formatROAS(c.roas || 0)} ROAS
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          GMV: {formatIDR(c.gmv || 0)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formatNum(c.purchase || 0)} orders | CPP {formatIDR(c.cpp || 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-500 font-mono text-[11px]">-</span>
                    )}
                  </td>

                  {/* Gemini Analysis Button / Status */}
                  <td className="py-3 px-4 text-center">
                    {isAnalyzingThis ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Watching...</span>
                      </div>
                    ) : hasAnalysis ? (
                      <button
                        onClick={() => onOpenAnalysis(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 transition-colors shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>One-Slider Report</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onTriggerAnalysis(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Analyze</span>
                      </button>
                    )}
                  </td>

                  {/* Actions: Edit & Delete */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditCreative(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                            className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-white"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Delete from Google Sheet"
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
