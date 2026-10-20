'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Play, Film, Loader2 } from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import { parseCreativeLinks, ParsedMediaItem } from '@/lib/media-resolver';

interface VideoPlayerModalProps {
  creative: CreativeRecord | null;
  onClose: () => void;
}

export default function VideoPlayerModal({ creative, onClose }: VideoPlayerModalProps) {
  const [loading, setLoading] = useState(true);
  const [mediaInfo, setMediaInfo] = useState<{
    coverUrl?: string;
    title?: string;
    authorHandle?: string;
    sourceType?: string;
  } | null>(null);

  useEffect(() => {
    if (!creative || !creative.creative_link) {
      setMediaInfo(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch proxy metadata
    fetch(`/api/media-proxy?url=${encodeURIComponent(creative.creative_link)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMediaInfo(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [creative]);

  if (!creative) return null;

  const parsedItems: ParsedMediaItem[] = parseCreativeLinks(creative.creative_link);
  const firstItem = parsedItems[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {creative.format}
              </span>
              <span className="text-xs font-semibold text-slate-400">{creative.brand}</span>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight mt-0.5 line-clamp-1">
              {creative.ad_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Media Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] max-h-[560px] overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 text-xs text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Loading media stream...</span>
            </div>
          )}

          {/* TikTok Embed */}
          {firstItem?.sourceType === 'tiktok' && firstItem.videoId && (
            <iframe
              src={`https://www.tiktok.com/player/v1/${firstItem.videoId}?music_info=1&description=1`}
              className="w-full h-[520px] border-0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Instagram Embed */}
          {firstItem?.sourceType === 'instagram' && (
            <iframe
              src={firstItem.embedUrl}
              className="w-full h-[520px] border-0"
              allowFullScreen
            />
          )}

          {/* Google Drive Preview */}
          {firstItem?.sourceType === 'drive' && (
            <iframe
              src={firstItem.embedUrl}
              className="w-full h-[520px] border-0"
              allow="autoplay"
              allowFullScreen
            />
          )}

          {/* Direct image fallback */}
          {firstItem?.sourceType === 'direct' && (
            <img
              src={firstItem.rawUrl}
              alt={creative.ad_name}
              className="max-h-[500px] w-auto object-contain mx-auto"
            />
          )}

          {/* Empty or unparseable link */}
          {!firstItem && (
            <div className="p-8 text-center text-xs text-slate-500">
              <Film className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              No playable video preview available for this link.
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div>
            {mediaInfo?.authorHandle && (
              <span className="text-slate-400 font-medium mr-2">
                Creator: @{mediaInfo.authorHandle}
              </span>
            )}
            {mediaInfo?.title && (
              <p className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">
                "{mediaInfo.title}"
              </p>
            )}
          </div>

          {creative.creative_link && (
            <a
              href={creative.creative_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold shrink-0 transition-colors"
            >
              <span>Watch on Platform</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
