'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TopNav from '@/components/TopNav';
import MetricsSummary from '@/components/MetricsSummary';
import FilterBar from '@/components/FilterBar';
import CreativesTable from '@/components/CreativesTable';
import CreativeModal from '@/components/CreativeModal';
import ApiKeyModal from '@/components/ApiKeyModal';
import VideoPlayerModal from '@/components/VideoPlayerModal';
import AnalysisDrawer from '@/components/AnalysisDrawer';
import { CreativeRecord } from '@/lib/google-sheets';
import { KeyRound, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const [creatives, setCreatives] = useState<CreativeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Creative Form Modal state
  const [isCreativeModalOpen, setIsCreativeModalOpen] = useState(false);
  const [creativeToEdit, setCreativeToEdit] = useState<CreativeRecord | null>(null);

  // Modals / Drawers for video and analysis
  const [selectedForVideo, setSelectedForVideo] = useState<CreativeRecord | null>(null);
  const [selectedForAnalysis, setSelectedForAnalysis] = useState<CreativeRecord | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Theme toggle
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedAdType, setSelectedAdType] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ANALYZED' | 'PENDING'>('ALL');

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('gemini_api_key') || '';
      if (saved) setApiKey(saved);
    } catch {
      // ignore
    }
  }, []);

  // Fetch creatives from Google Sheets
  const fetchCreatives = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/creatives');
      const data = await res.json();
      if (data.success && Array.isArray(data.creatives)) {
        setCreatives(data.creatives);
      } else {
        setErrorMsg(data.error || 'Failed to load creatives from Google Sheets.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error fetching data from Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  // Unique brands & ad types derived strictly from existing sheet data
  const existingBrands = useMemo(() => {
    const set = new Set<string>();
    creatives.forEach((c) => {
      if (c.brand && c.brand.trim()) set.add(c.brand.trim());
    });
    return Array.from(set).sort();
  }, [creatives]);

  const existingAdTypes = useMemo(() => {
    const set = new Set<string>();
    creatives.forEach((c) => {
      if (c.ad_type && c.ad_type.trim()) set.add(c.ad_type.trim());
    });
    return Array.from(set).sort();
  }, [creatives]);

  // Filtered creatives list
  const filteredCreatives = useMemo(() => {
    return creatives.filter((c) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.ad_name?.toLowerCase().includes(q);
        const matchesBrand = c.brand?.toLowerCase().includes(q);
        if (!matchesName && !matchesBrand) return false;
      }

      // Brand
      if (selectedBrand !== 'ALL' && c.brand !== selectedBrand) return false;

      // Ad Type
      if (selectedAdType !== 'ALL' && c.ad_type !== selectedAdType) return false;

      // Format
      if (selectedFormat !== 'ALL' && c.format !== selectedFormat) return false;

      // Status
      if (selectedStatus === 'ANALYZED' && !c.analysis_markdown) return false;
      if (selectedStatus === 'PENDING' && c.analysis_markdown) return false;

      return true;
    });
  }, [creatives, searchQuery, selectedBrand, selectedAdType, selectedFormat, selectedStatus]);

  // Handle Trigger Gemini Analysis
  const handleTriggerAnalysis = async (creative: CreativeRecord) => {
    if (!apiKey.trim()) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setAnalyzingId(creative.id);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          creativeId: creative.id,
          apiKey: apiKey.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.creative) {
        setCreatives((prev) =>
          prev.map((item) => (item.id === data.creative.id ? data.creative : item))
        );
        setSelectedForAnalysis(data.creative);
      } else {
        alert(data.error || 'Failed to complete analysis.');
      }
    } catch (err: any) {
      alert(`Analysis error: ${err.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  // Handle Delete
  const handleDeleteCreative = async (id: string) => {
    try {
      const res = await fetch(`/api/creatives?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setCreatives((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert(data.error || 'Failed to delete creative.');
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // Handle Save
  const handleCreativeSaved = (saved: CreativeRecord) => {
    setCreatives((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 dark:bg-[#090d16] dark:text-slate-100 transition-colors duration-150 font-sans">
      {/* Top Navbar */}
      <TopNav
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        onOpenNewCreativeModal={() => {
          setCreativeToEdit(null);
          setIsCreativeModalOpen(true);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Banner if no API key */}
        {!apiKey && (
          <div className="p-3.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold text-amber-900 dark:text-amber-200 mr-1.5">
                  Gemini API Key Required:
                </span>
                <span>
                  To watch video frames, listen to spoken audio dialogue, and generate One-Slider reports, please inject your key.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold shrink-0 transition-colors"
            >
              Inject Key
            </button>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={fetchCreatives}
              className="inline-flex items-center gap-1 font-semibold underline hover:text-rose-900 dark:hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Metrics Summary Overview */}
        <MetricsSummary creatives={creatives} />

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedBrand={selectedBrand}
          onBrandChange={setSelectedBrand}
          selectedAdType={selectedAdType}
          onAdTypeChange={setSelectedAdType}
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          brands={existingBrands}
          adTypes={existingAdTypes}
          creativesToExport={filteredCreatives}
        />

        {/* Creatives Table */}
        {isLoading ? (
          <div className="p-14 text-center rounded-md bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-xs">Connecting to Google Sheet...</p>
          </div>
        ) : (
          <CreativesTable
            creatives={filteredCreatives}
            onOpenVideo={(c) => setSelectedForVideo(c)}
            onOpenAnalysis={(c) => setSelectedForAnalysis(c)}
            onEditCreative={(c) => {
              setCreativeToEdit(c);
              setIsCreativeModalOpen(true);
            }}
            onDeleteCreative={handleDeleteCreative}
            onTriggerAnalysis={handleTriggerAnalysis}
            analyzingId={analyzingId}
          />
        )}
      </main>

      {/* Modals & Slide-over Drawers */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentKey={apiKey}
        onKeySaved={(newKey) => setApiKey(newKey)}
      />

      <CreativeModal
        isOpen={isCreativeModalOpen}
        onClose={() => {
          setIsCreativeModalOpen(false);
          setCreativeToEdit(null);
        }}
        onSaved={handleCreativeSaved}
        creativeToEdit={creativeToEdit}
        existingBrands={existingBrands}
        existingAdTypes={existingAdTypes}
      />

      <VideoPlayerModal
        creative={selectedForVideo}
        onClose={() => setSelectedForVideo(null)}
        isDarkMode={isDarkMode}
      />

      <AnalysisDrawer
        creative={selectedForAnalysis}
        isOpen={Boolean(selectedForAnalysis)}
        onClose={() => setSelectedForAnalysis(null)}
        onReanalyze={handleTriggerAnalysis}
        isAnalyzing={Boolean(selectedForAnalysis && analyzingId === selectedForAnalysis.id)}
        onOpenVideoPlayer={(c) => {
          setSelectedForVideo(c);
        }}
      />
    </div>
  );
}
