'use client';

import React from 'react';
import {
  Sparkles,
  KeyRound,
  Plus,
  Database,
  Moon,
  Sun,
  ExternalLink,
} from 'lucide-react';

interface TopNavProps {
  apiKey: string;
  onOpenApiKeyModal: () => void;
  onOpenNewCreativeModal: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export default function TopNav({
  apiKey,
  onOpenApiKeyModal,
  onOpenNewCreativeModal,
  isDarkMode,
  onToggleTheme,
}: TopNavProps) {
  const hasKey = Boolean(apiKey && apiKey.trim().length > 5);

  return (
    <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Title & Brand */}
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
              Gemini Creative Analyzer
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-normal">
            E-Commerce & Digital Media Multimodal Video Analysis with CPAS Conversion Intelligence
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
        {/* Google Sheet Storage Link */}
        <a
          href="https://docs.google.com/spreadsheets/d/1YcRLVTQ1eIrYpKvBJ6WAtJXvNugt9Zv-KiRf0Gjhe-U/edit?gid=0#gid=0"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          title="Open Connected Google Spreadsheet"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheet</span>
          <ExternalLink className="w-3 h-3 text-slate-500" />
        </a>

        {/* Gemini API Key Status Pill */}
        <button
          onClick={onOpenApiKeyModal}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            hasKey
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/50 animate-pulse'
          }`}
          title="Configure Gemini API Key"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{hasKey ? 'Gemini Key Active' : 'Inject Gemini Key'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light' : 'Switch to Dark'}
          className="p-2 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-slate-300" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Add Creative CTA */}
        <button
          onClick={onOpenNewCreativeModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 active:translate-y-px transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Creative</span>
        </button>
      </div>
    </header>
  );
}
