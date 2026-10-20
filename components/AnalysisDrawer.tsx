'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Video,
  Loader2,
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
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Robust markdown renderer for Executive One-Slider report.
   * Accurately renders tables, blockquotes, headers, and bullet lists without text overlap.
   */
  const renderStructuredReport = (markdownText: string) => {
    if (!markdownText) return null;

    const lines = markdownText.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];
    let listBuffer: string[] = [];
    let blockquoteBuffer: string[] = [];
    let keyIdx = 0;

    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      const validRows = tableBuffer.filter((r) => r.trim().startsWith('|'));
      if (validRows.length >= 2) {
        const headerCells = validRows[0]
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean);
        const dataRows = validRows.slice(2).map((row) =>
          row
            .split('|')
            .map((c) => c.trim())
            .filter(Boolean)
        );

        elements.push(
          <div key={`table-${keyIdx++}`} className="overflow-x-auto my-2.5 border border-slate-200 dark:border-slate-800 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {headerCells.map((hc, idx) => (
                    <th
                      key={idx}
                      className={`py-1.5 px-3 text-[11px] uppercase tracking-wider ${
                        idx === 0
                          ? 'whitespace-nowrap w-[130px]'
                          : idx === 1
                          ? 'whitespace-nowrap w-[130px]'
                          : ''
                      }`}
                    >
                      {hc}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {dataRows.map((cols, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    {cols.map((col, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-1.5 px-3 text-xs leading-normal ${
                          cIdx === 0
                            ? 'font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap'
                            : cIdx === 1
                            ? 'font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span dangerouslySetInnerHTML={{ __html: formatInline(col) }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
    };

    const flushList = () => {
      if (listBuffer.length === 0) return;
      elements.push(
        <ul key={`list-${keyIdx++}`} className="space-y-1.5 my-2 pl-4 list-disc text-xs text-slate-700 dark:text-slate-300">
          {listBuffer.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    const flushBlockquote = () => {
      if (blockquoteBuffer.length === 0) return;
      elements.push(
        <div
          key={`bq-${keyIdx++}`}
          className="my-3 p-3.5 rounded bg-slate-50 dark:bg-slate-900/60 border-l-2 border-indigo-600 text-xs text-slate-700 dark:text-slate-300 space-y-1"
        >
          {blockquoteBuffer.map((line, idx) => (
            <p key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
          ))}
        </div>
      );
      blockquoteBuffer = [];
    };

    const formatInline = (str: string) => {
      return str
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic text-slate-600 dark:text-slate-400">$1</em>');
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table line
      if (trimmed.startsWith('|')) {
        flushList();
        flushBlockquote();
        tableBuffer.push(trimmed);
        continue;
      } else {
        flushTable();
      }

      // Blockquote line
      if (trimmed.startsWith('>')) {
        flushList();
        blockquoteBuffer.push(trimmed.replace(/^>\s*/, ''));
        continue;
      } else {
        flushBlockquote();
      }

      // List line
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        listBuffer.push(trimmed.slice(2));
        continue;
      } else {
        flushList();
      }

      // Header 3
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3
            key={`h3-${keyIdx++}`}
            className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-5 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1"
          >
            {trimmed.replace('### ', '')}
          </h3>
        );
        continue;
      }

      // Header 2
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${keyIdx++}`} className="text-sm font-bold text-slate-900 dark:text-white mt-5 mb-2">
            {trimmed.replace('## ', '')}
          </h2>
        );
        continue;
      }

      // Regular paragraph
      if (trimmed.length > 0) {
        elements.push(
          <p
            key={`p-${keyIdx++}`}
            className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 my-1.5"
            dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }}
          />
        );
      }
    }

    flushTable();
    flushList();
    flushBlockquote();

    return elements;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#090d16]">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                One-Slider Report
              </span>
              {creative.model_used && (
                <span className="text-[10px] font-mono text-slate-400">
                  {creative.model_used.replace(/gemini-?/gi, 'AI ')}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
              {creative.ad_name}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {creative.brand} • {creative.ad_type} • {creative.format}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onReanalyze(creative)}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-colors"
              title="Rerun Multimodal Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-Analyze</span>
            </button>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              title="Copy markdown report"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Key Metrics Sub-bar */}
        <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0 font-mono">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <span>Spend: <strong className="text-slate-900 dark:text-white">Rp {Math.round(creative.spend || 0).toLocaleString('id-ID')}</strong></span>
            {creative.roas && (
              <span>ROAS: <strong className="text-emerald-600 dark:text-emerald-400">{creative.roas.toFixed(2)}x</strong></span>
            )}
            {creative.vtr_6s > 0 && (
              <span>6s VTR: <strong className="text-slate-900 dark:text-white">{(creative.vtr_6s * 100).toFixed(2)}%</strong></span>
            )}
          </div>

          {creative.creative_link && (
            <button
              onClick={() => onOpenVideoPlayer(creative)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline font-sans"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Watch Video</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Watching Video & Listening to Audio Track...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                AI Engine is downloading the stream, transcribing opening dialogue (0–6s), and evaluating performance correlation.
              </p>
            </div>
          ) : creative.analysis_markdown ? (
            <div className="break-words">
              {renderStructuredReport(creative.analysis_markdown)}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-500">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This creative has not been analyzed yet.
              </p>
              <button
                onClick={() => onReanalyze(creative)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run AI Analysis</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {creative.analyzed_at && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#090d16] border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 text-right shrink-0">
            Analyzed at {new Date(creative.analyzed_at).toLocaleString('en-GB')}
          </div>
        )}
      </div>
    </div>
  );
}
