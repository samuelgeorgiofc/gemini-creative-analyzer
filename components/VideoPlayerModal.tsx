'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Play, Film, Loader2 } from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import { parseCreativeLinks, ParsedMediaItem } from '@/lib/media-resolver';

interface VideoPlayerModalProps {
  creative: CreativeRecord | null;
  onClose: () => void;
  isDarkMode?: boolean;
}

export default function VideoPlayerModal({ creative, onClose, isDarkMode = true }: VideoPlayerModalProps) {
  const [streamLoading, setStreamLoading] = useState(true);
  const [playMode, setPlayMode] = useState<'direct' | 'embed'>('direct');
  const [sourceIdx, setSourceIdx] = useState<number>(0);
  const [streamData, setStreamData] = useState<{
    playUrl?: string;
    wmPlayUrl?: string;
    proxyPlayUrl?: string;
    backupPlayUrls?: string[];
    coverUrl?: string;
    title?: string;
    authorHandle?: string;
  } | null>(null);

  const mediaItems: ParsedMediaItem[] = useMemo(() => {
    if (!creative?.creative_link) return [];
    return parseCreativeLinks(creative.creative_link);
  }, [creative?.creative_link]);

  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const activeItem = mediaItems[activeMediaIdx];

  // Resolve TikTok stream for HTML5 player
  useEffect(() => {
    if (!activeItem || activeItem.sourceType !== 'tiktok') {
      setStreamData(null);
      setStreamLoading(false);
      return;
    }

    setStreamLoading(true);
    setSourceIdx(0);
    setPlayMode('direct');

    const proxyFallbackUrl = `/api/tiktok-video?stream=1&url=${encodeURIComponent(activeItem.rawUrl)}`;

    fetch(`/api/tiktok-video?url=${encodeURIComponent(activeItem.rawUrl)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.video) {
          const v = data.video;
          const allUrls = Array.from(
            new Set([
              v.playUrl,
              v.wmPlayUrl,
              ...(v.backupPlayUrls || []),
              proxyFallbackUrl,
            ].filter(Boolean))
          ) as string[];

          setStreamData({
            playUrl: allUrls[0],
            backupPlayUrls: allUrls,
            proxyPlayUrl: proxyFallbackUrl,
            coverUrl: v.coverUrl,
            title: v.title,
            authorHandle: v.authorHandle,
          });
        } else {
          setStreamData({
            playUrl: proxyFallbackUrl,
            backupPlayUrls: [proxyFallbackUrl],
            proxyPlayUrl: proxyFallbackUrl,
          });
        }
      })
      .catch(() => {
        setStreamData({
          playUrl: proxyFallbackUrl,
          backupPlayUrls: [proxyFallbackUrl],
          proxyPlayUrl: proxyFallbackUrl,
        });
      })
      .finally(() => {
        setStreamLoading(false);
      });
  }, [activeItem]);

  if (!creative) return null;

  const tiktokStreamCandidates = streamData?.backupPlayUrls || [];
  const currentVideoSrc = tiktokStreamCandidates[sourceIdx] || streamData?.playUrl || null;
  const isDirectMp4 = Boolean(activeItem && activeItem.sourceType !== 'tiktok' && /\.mp4(\?|$)/i.test(activeItem.rawUrl));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#090d16]">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white">{creative.brand}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {creative.ad_type}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                {creative.format}
              </span>
            </div>
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
              {creative.ad_name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {activeItem?.sourceType === 'tiktok' && (
              <div className="flex items-center rounded p-0.5 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSourceIdx(0);
                    setPlayMode('direct');
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    playMode === 'direct'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  HTML5
                </button>
                <button
                  type="button"
                  onClick={() => setPlayMode('embed')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    playMode === 'embed'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Embed
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative w-full h-[480px] bg-black flex items-center justify-center overflow-hidden">
          {streamLoading && activeItem?.sourceType === 'tiktok' ? (
            <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span>Resolving HTML5 video stream...</span>
            </div>
          ) : activeItem?.sourceType === 'tiktok' && playMode === 'direct' && currentVideoSrc ? (
            <video
              key={currentVideoSrc}
              src={currentVideoSrc}
              poster={streamData?.coverUrl || undefined}
              controls
              playsInline
              autoPlay
              preload="metadata"
              onError={() => {
                if (sourceIdx + 1 < tiktokStreamCandidates.length) {
                  setSourceIdx((prev) => prev + 1);
                } else {
                  setPlayMode('embed');
                }
              }}
              className="w-full h-full object-contain bg-black"
            />
          ) : isDirectMp4 ? (
            <video
              key={activeItem.rawUrl}
              src={activeItem.rawUrl}
              controls
              playsInline
              autoPlay
              preload="metadata"
              className="w-full h-full object-contain bg-black"
            />
          ) : activeItem?.sourceType === 'tiktok' && playMode === 'embed' && activeItem.videoId ? (
            <iframe
              src={`https://www.tiktok.com/player/v1/${activeItem.videoId}?music_info=1&description=1`}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
            />
          ) : activeItem?.sourceType === 'instagram' ? (
            <iframe
              src={activeItem.embedUrl}
              className="w-full h-full border-0 bg-black"
              allowFullScreen
            />
          ) : activeItem?.sourceType === 'drive' ? (
            <iframe
              src={activeItem.embedUrl}
              className="w-full h-full border-0 bg-black"
              allow="autoplay"
              allowFullScreen
            />
          ) : activeItem?.sourceType === 'direct' ? (
            <img
              src={activeItem.rawUrl}
              alt={creative.ad_name}
              className="max-h-full max-w-full object-contain mx-auto"
            />
          ) : (
            <div className="text-center p-6 text-xs text-slate-500">
              <Film className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <span>Preview not available for this media format.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#090d16] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate pr-2">
            {mediaItems.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                {mediaItems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveMediaIdx(i)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      activeMediaIdx === i
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    #{i + 1}
                  </button>
                ))}
              </div>
            )}
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {streamData?.authorHandle ? `@${streamData.authorHandle}` : creative.ad_name}
            </span>
          </div>

          {activeItem?.rawUrl && (
            <a
              href={activeItem.rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
            >
              <span>Open Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
