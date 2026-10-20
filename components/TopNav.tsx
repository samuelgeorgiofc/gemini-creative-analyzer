'use client';

import React from 'react';
import { Database, Moon, Sun, Plus, KeyRound, ExternalLink } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors duration-150">
      {/* Title & Brand */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Creative Analyzer Engine
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          Single-creative performance tracking, video multimodal evaluation, and CPAS sales intelligence
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {/* Google Sheet Storage Link */}
        <a
          href="https://docs.google.com/spreadsheets/d/1YcRLVTQ1eIrYpKvBJ6WAtJXvNugt9Zv-KiRf0Gjhe-U/edit?gid=0#gid=0"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          title="Open Google Spreadsheet"
        >
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Google Sheet</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* API Key Status Pill */}
        <button
          onClick={onOpenApiKeyModal}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
            hasKey
              ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-700 dark:text-amber-300'
          }`}
          title="Configure API Key"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>{hasKey ? 'API Key Active' : 'Inject API Key'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Add Creative CTA */}
        <button
          onClick={onOpenNewCreativeModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Creative</span>
        </button>
      </div>
    </header>
  );
}
