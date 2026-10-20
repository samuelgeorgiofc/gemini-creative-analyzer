'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play } from 'lucide-react';
import { CreativeRecord } from '@/lib/google-sheets';
import { parseCreativeLinks } from '@/lib/media-resolver';

/**
 * Client-side in-memory cache and concurrency queue for low-resolution preview thumbnails
 * so scrolling or paginating never re-fetches already resolved thumbnails, and bursts of
 * TikTok / Instagram thumbnail lookups never overwhelm upstream resolvers.
 */
const clientThumbCache = new Map<string, string>();
const clientThumbInFlight = new Map<string, Promise<string | null>>();
let activeThumbFetches = 0;
const MAX_CONCURRENT_THUMB_FETCHES = 3;
const thumbFetchWaitQueue: Array<() => void> = [];

function toProxiedThumbUrl(url: string): string {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/tiktok-video')) return trimmed;
  if (trimmed.includes('drive.google.com/thumbnail')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    return `/api/tiktok-video?proxyImg=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

function fetchRemoteThumbnailQueued(rawUrl: string): Promise<string | null> {
  const cached = clientThumbCache.get(rawUrl);
  if (cached) return Promise.resolve(cached);

  const existing = clientThumbInFlight.get(rawUrl);
  if (existing) return existing;

  const task = new Promise<string | null>((resolve) => {
    const run = async () => {
      activeThumbFetches++;
      try {
        const res = await fetch(`/api/tiktok-video?thumbOnly=1&url=${encodeURIComponent(rawUrl)}`);
        if (res.ok) {
          const data = await res.json();
          const resolvedCover = data?.coverUrl ? toProxiedThumbUrl(data.coverUrl) : null;
          if (resolvedCover) {
            clientThumbCache.set(rawUrl, resolvedCover);
            resolve(resolvedCover);
            return;
          }
        }
        resolve(null);
      } catch {
        resolve(null);
      } finally {
        activeThumbFetches--;
        clientThumbInFlight.delete(rawUrl);
        const next = thumbFetchWaitQueue.shift();
        if (next) next();
      }
    };

    if (activeThumbFetches < MAX_CONCURRENT_THUMB_FETCHES) {
      run();
    } else {
      thumbFetchWaitQueue.push(run);
    }
  });

  clientThumbInFlight.set(rawUrl, task);
  return task;
}

interface CreativePreviewThumbButtonProps {
  creative: CreativeRecord;
  onOpen: () => void;
}

/**
 * Vertical Portrait Video/Image Thumbnail Preview Button (`w-[48px] h-[66px]`)
 * ported directly from pc-aio-tracker.
 *
 * - Matches the 9:16 vertical short-form video aspect ratio.
 * - Uses IntersectionObserver so thumbnails are only fetched for visible rows.
 * - Supports Google Drive (`sz=w400`), TikTok (via /api/tiktok-video proxy),
 *   and Instagram with fallback gradients.
 */
export default function CreativePreviewThumbButton({
  creative,
  onOpen,
}: CreativePreviewThumbButtonProps) {
  const mediaItems = useMemo(
    () => parseCreativeLinks(creative.creative_link),
    [creative.creative_link]
  );
  const primary = mediaItems[0];
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const [thumbUrl, setThumbUrl] = useState<string | null>(() => {
    if (!primary) return null;
    if (primary.thumbnailUrl) return primary.thumbnailUrl;
    return clientThumbCache.get(primary.rawUrl) || null;
  });

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const needsRemoteThumb = Boolean(
    primary && (primary.sourceType === 'tiktok' || primary.sourceType === 'instagram')
  );

  useEffect(() => {
    if (!primary) return;
    setImgLoaded(false);
    setImgError(false);

    if (primary.thumbnailUrl) {
      setThumbUrl(primary.thumbnailUrl);
      return;
    }

    const cached = clientThumbCache.get(primary.rawUrl);
    if (cached) {
      setThumbUrl(cached);
      return;
    }

    setThumbUrl(null);
  }, [primary?.rawUrl, primary?.thumbnailUrl]);

  useEffect(() => {
    const el = btnRef.current;
    if (!el || !primary || thumbUrl || !needsRemoteThumb) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [primary, thumbUrl, needsRemoteThumb]);

  useEffect(() => {
    if (!isVisible || !primary || !needsRemoteThumb || thumbUrl) return;

    let cancelled = false;
    fetchRemoteThumbnailQueued(primary.rawUrl).then((resolvedCover) => {
      if (!cancelled && resolvedCover) {
        setThumbUrl(resolvedCover);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isVisible, primary, needsRemoteThumb, thumbUrl]);

  if (!primary) {
    return (
      <div
        className="w-[48px] h-[66px] rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 flex flex-col items-center justify-center text-[9px] font-medium text-slate-400 dark:text-slate-500 select-none"
        title="No creative link provided"
      >
        No Link
      </div>
    );
  }

  const badgeGradient =
    primary.sourceType === 'tiktok'
      ? 'from-slate-900 via-pink-950 to-cyan-950 border-pink-500/40'
      : primary.sourceType === 'instagram'
      ? 'from-purple-950 via-pink-900 to-amber-900 border-pink-500/40'
      : primary.sourceType === 'drive'
      ? 'from-emerald-950 via-teal-900 to-slate-900 border-emerald-500/40'
      : 'from-indigo-950 via-slate-900 to-slate-800 border-indigo-500/40';

  const sourceTag =
    primary.sourceType === 'tiktok'
      ? 'TikTok'
      : primary.sourceType === 'instagram'
      ? 'IG Reel'
      : primary.sourceType === 'drive'
      ? 'G-Drive'
      : creative.format || 'Video';

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onOpen}
      title={`Click to preview ${creative.ad_name || 'creative'}`}
      className={`group relative w-[48px] h-[66px] rounded-md border bg-gradient-to-br ${badgeGradient} flex flex-col items-center justify-center overflow-hidden shadow-xs hover:scale-105 hover:shadow-md transition-all cursor-pointer`}
    >
      {/* Low-res vertical lazy thumbnail image when available */}
      {thumbUrl && !imgError && (
        <img
          src={thumbUrl}
          alt={creative.ad_name || 'Creative preview'}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-200 ${
            imgLoaded ? 'opacity-95 group-hover:opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Subtle dark vignette for legibility */}
      <div
        className={`absolute inset-0 transition-colors ${
          imgLoaded && !imgError
            ? 'bg-gradient-to-t from-black/80 via-black/15 to-black/10 group-hover:from-black/65 group-hover:via-transparent'
            : 'bg-black/35 group-hover:bg-black/15'
        }`}
      />

      {/* Centered Play icon badge */}
      <div className="relative z-10 w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs border border-white/40 flex items-center justify-center text-white group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-colors shadow-xs">
        <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
      </div>

      {/* Bottom Platform / Slide count label */}
      <span className="absolute bottom-1 inset-x-0 z-10 text-center text-[7.5px] font-bold uppercase tracking-wider text-white/95 drop-shadow leading-none px-0.5 truncate">
        {mediaItems.length > 1 ? `${mediaItems.length} Slides` : sourceTag}
      </span>
    </button>
  );
}
