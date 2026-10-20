'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Video,
  ExternalLink,
  Loader2,
  Share2,
} from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';

interface AnalysisDrawerProps {
  creative: CreativeRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onReanalyze: (creative: CreativeRecord) => void;
  isAnalyzing: boolean;
  onOpenVideoPlayer: (creative: CreativeRecord) => void;
}

export default function AnalysisDrawer({
  creative,
  isOpen,
  onClose,
  onReanalyze,
  isAnalyzing,
  onOpenVideoPlayer,
}: AnalysisDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !creative) return null;

  const handleCopy = () => {
    if (!creative.analysis_markdown) return;
    navigator.clipboard.writeText(creative.analysis_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Convert basic markdown elements into clean styled HTML
  const formatMarkdown = (md: string) => {
    if (!md) return '';
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold text-white mt-4 mb-2">$1</h2>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\| (.*) \|/g, (match) => {
        // Simple table row handler
        const cells = match.split('|').filter(Boolean);
        const tdList = cells.map((c) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tdList}</tr>`;
      })
      .replace(/\n\n/g, '<br />');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-[#0f172a] border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Executive One-Slider Report
              </span>
              {creative.model_used && (
                <span className="text-[11px] font-mono text-slate-400">
                  via {creative.model_used}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white tracking-tight line-clamp-1">
              {creative.ad_name}
            </h2>
            <p className="text-xs text-slate-400">
              {creative.brand} • {creative.ad_type} • {creative.format}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Re-analyze Button */}
            <button
              onClick={() => onReanalyze(creative)}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 disabled:opacity-50 transition-colors"
              title="Rerun Gemini Multimodal Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-Analyze</span>
            </button>

            {/* Copy Report */}
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-700/60 bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 text-xs font-semibold transition-colors"
              title="Copy markdown report to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3 text-slate-400">
            <span>Spend: <strong className="text-white">{creative.spend ? `Rp ${Math.round(creative.spend).toLocaleString('id-ID')}` : '-'}</strong></span>
            {creative.roas && (
              <span>ROAS: <strong className="text-emerald-400">{creative.roas.toFixed(2)}x</strong></span>
            )}
            {creative.vtr_6s > 0 && (
              <span>6s VTR: <strong className="text-purple-400">{(creative.vtr_6s * 100).toFixed(2)}%</strong></span>
            )}
          </div>

          {creative.creative_link && (
            <button
              onClick={() => onOpenVideoPlayer(creative)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Watch Video</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 text-slate-400">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-7 h-7 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Gemini is Analyzing the Video & Metrics...
                </h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Downloading media stream, inspecting opening hook (0-3s), listening to audio dialogue, and correlating with your inputted performance numbers.
                </p>
              </div>
            </div>
          ) : creative.analysis_markdown ? (
            <div className="report-content prose prose-invert max-w-none text-xs leading-relaxed text-slate-200">
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMarkdown(creative.analysis_markdown),
                }}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-500">
              <Sparkles className="w-10 h-10 text-slate-600 mb-1" />
              <p className="text-sm font-medium text-slate-300">
                This creative hasn't been analyzed with Gemini yet.
              </p>
              <button
                onClick={() => onReanalyze(creative)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run Gemini Multimodal Analysis</span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {creative.analyzed_at && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 text-right shrink-0">
            Analyzed on {new Date(creative.analyzed_at).toLocaleString('en-GB')}
          </div>
        )}
      </div>
    </div>
  );
}
