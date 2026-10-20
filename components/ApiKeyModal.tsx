'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ExternalLink, X, Loader2, Trash2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onKeySaved: (newKey: string) => void;
}

export default function ApiKeyModal({
  isOpen,
  onClose,
  currentKey,
  onKeySaved,
}: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState(currentKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setInputKey(currentKey);
    setTestResult(null);
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!inputKey.trim()) {
      setTestResult({ success: false, message: 'Please enter an API key to test.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `Connected successfully using model: ${data.model || 'gemini-3.8-flash'}!`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to connect. Please verify your API key.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing API key.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (typeof window !== 'undefined') {
      if (trimmed) {
        window.localStorage.setItem('gemini_api_key', trimmed);
      } else {
        window.localStorage.removeItem('gemini_api_key');
      }
    }
    onKeySaved(trimmed);
    onClose();
  };

  const handleRemove = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('gemini_api_key');
    }
    setInputKey('');
    setTestResult(null);
    onKeySaved('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl p-5 text-slate-900 dark:text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Gemini API Key Setup</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your key is stored securely in your browser and used only to analyze creative videos.
          </p>
        </div>

        {/* Info Callout */}
        <div className="p-3 mb-4 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">No Built-In API Key</p>
          This project does not include any pre-configured Gemini keys.
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Get a free key at Google AI Studio <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Input Field */}
        <div className="space-y-1.5 mb-4">
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Google Gemini API Key
          </label>
          <input
            type="password"
            value={inputKey}
            onChange={(e) => {
              setInputKey(e.target.value);
              setTestResult(null);
            }}
            placeholder="AIzaSy... or AQ.Ab8..."
            className="w-full px-3 py-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-2.5 rounded text-xs flex items-start gap-2 mb-4 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <div>
            {currentKey && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testing || !inputKey.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-colors"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Test Key
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
