export interface ParsedMediaItem {
  label: string;
  rawUrl: string;
  embedUrl: string;
  sourceType: 'tiktok' | 'instagram' | 'drive' | 'direct';
  videoId?: string;
  driveFileId?: string;
  thumbnailUrl?: string;
}

export interface ResolvedMediaContext {
  rawUrl: string;
  sourceType: 'tiktok' | 'instagram' | 'drive' | 'direct';
  title?: string;
  authorHandle?: string;
  coverUrl?: string;
  videoBase64?: string;
  videoMimeType?: string;
  imageBase64?: string;
  imageMimeType?: string;
  mediaAssets?: {
    label: string;
    mimeType: string;
    base64: string;
  }[];
}

// In-memory cache for resolved metadata
const metaCache = new Map<string, { data: any; expiresAt: number }>();

// Serial queue for TikWM (free tier allows ~1 req/sec)
let tikwmQueue: Promise<any> = Promise.resolve();
let lastTikwmCallAt = 0;

function enqueueTikwmCall<T>(fn: () => Promise<T>): Promise<T> {
  const next = tikwmQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastTikwmCallAt;
    if (elapsed < 1150) {
      await new Promise(r => setTimeout(r, 1150 - elapsed));
    }
    lastTikwmCallAt = Date.now();
    return fn();
  });
  tikwmQueue = next.catch(() => {});
  return next;
}

export function extractDriveFileId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

export function extractTikTokVideoId(rawUrl: string): string | null {
  const trimmed = String(rawUrl || '').trim();
  const idMatch =
    trimmed.match(/tiktok\.com\/(?:@[^/]+\/(?:video|photo)|v|embed\/v2|player\/v1)\/(\d+)/i) ||
    trimmed.match(/[?&]item_id=(\d+)/i);
  return idMatch?.[1] || null;
}

export function parseCreativeLinks(rawVal: any): ParsedMediaItem[] {
  if (!rawVal || typeof rawVal !== 'string') return [];
  const trimmed = rawVal.trim();
  if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'N/A') return [];

  const urlMatches = trimmed.match(/https?:\/\/[^\s"'<>]+/gi);
  if (!urlMatches || urlMatches.length === 0) return [];

  return urlMatches.map((rawUrl, idx) => {
    const cleanRaw = rawUrl.replace(/[.,;)]+$/, '');
    const lower = cleanRaw.toLowerCase();
    const label = urlMatches.length > 1 ? `Asset ${idx + 1}` : 'Creative Preview';

    if (lower.includes('tiktok.com')) {
      const videoId = extractTikTokVideoId(cleanRaw);
      return {
        label,
        rawUrl: cleanRaw,
        embedUrl: videoId ? `https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1` : '',
        sourceType: 'tiktok',
        videoId: videoId || undefined,
      };
    }

    if (lower.includes('instagram.com')) {
      let cleanUrl = cleanRaw.split('?')[0].replace(/\/$/, '');
      const embedUrl = cleanUrl.endsWith('/embed') ? cleanUrl : cleanUrl + '/embed';
      return {
        label,
        rawUrl: cleanRaw,
        embedUrl,
        sourceType: 'instagram',
      };
    }

    if (lower.includes('drive.google.com')) {
      const driveFileId = extractDriveFileId(cleanRaw) || undefined;
      return {
        label,
        rawUrl: cleanRaw,
        embedUrl: driveFileId
          ? `https://drive.google.com/file/d/${driveFileId}/preview`
          : cleanRaw,
        sourceType: 'drive',
        driveFileId,
        thumbnailUrl: driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w400` : undefined,
      };
    }

    return {
      label,
      rawUrl: cleanRaw,
      embedUrl: cleanRaw,
      sourceType: 'direct',
      thumbnailUrl: /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(cleanRaw) ? cleanRaw : undefined,
    };
  });
}

/**
 * Binary magic byte sniffer to prevent sending HTML error bodies or invalid files to Gemini.
 */
export function sniffVerifiedMimeType(buf: ArrayBuffer): 'video/mp4' | 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buf || buf.byteLength < 512) return null;
  const bytes = new Uint8Array(buf.slice(0, 16));

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }

  // WebP: RIFF ... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  // MP4 / ISO: bytes 4..7 === "ftyp" (66 74 79 70)
  if (
    buf.byteLength > 4096 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return 'video/mp4';
  }

  return null;
}

export async function resolveTikTokVideo(rawUrl: string): Promise<{
  playUrl?: string;
  wmPlayUrl?: string;
  coverUrl?: string;
  title?: string;
  authorHandle?: string;
} | null> {
  const cached = metaCache.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // Layer 1: TikWM API with rate-limit queue
  try {
    const data = await enqueueTikwmCall(async () => {
      const res = await fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        body: new URLSearchParams({ url: rawUrl, hd: '1' }),
        signal: AbortSignal.timeout(9000),
      });
      if (!res.ok) return null;
      return res.json();
    });

    if (data?.code === 0 && data?.data) {
      const d = data.data;
      const baseHost = 'https://www.tikwm.com';
      const playUrl = d.play ? (d.play.startsWith('http') ? d.play : `${baseHost}${d.play}`) : undefined;
      const wmPlayUrl = d.wmplay ? (d.wmplay.startsWith('http') ? d.wmplay : `${baseHost}${d.wmplay}`) : undefined;
      const coverUrl = d.cover ? (d.cover.startsWith('http') ? d.cover : `${baseHost}${d.cover}`) : undefined;
      const title = d.title || '';
      const authorHandle = d.author?.unique_id || d.author?.nickname || '';

      const resolved = { playUrl, wmPlayUrl, coverUrl, title, authorHandle };
      metaCache.set(rawUrl, { data: resolved, expiresAt: Date.now() + 4 * 3600 * 1000 });
      return resolved;
    }
  } catch {
    // continue to fallback
  }

  // Layer 2: TikTok oEmbed
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl.split('?')[0])}`;
    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const d = await res.json();
      const resolved = {
        coverUrl: d.thumbnail_url,
        title: d.title || '',
        authorHandle: d.author_unique_id || d.author_name || '',
      };
      metaCache.set(rawUrl, { data: resolved, expiresAt: Date.now() + 4 * 3600 * 1000 });
      return resolved;
    }
  } catch {
    // ignore
  }

  return null;
}

export async function resolveInstagramMeta(rawUrl: string): Promise<{
  coverUrl?: string;
  title?: string;
} | null> {
  const cached = metaCache.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(rawUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const html = await res.text();
      const ogImgMatch =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      const ogTitleMatch =
        html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<title>([^<]+)<\/title>/i);

      const coverUrl = ogImgMatch?.[1]?.replace(/&amp;/g, '&');
      const title = ogTitleMatch?.[1];

      const resolved = { coverUrl, title };
      metaCache.set(rawUrl, { data: resolved, expiresAt: Date.now() + 4 * 3600 * 1000 });
      return resolved;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function fetchFileAsBase64(
  url: string,
  maxBytes = 10 * 1024 * 1024
): Promise<{ base64: string; mimeType: 'video/mp4' | 'image/jpeg' | 'image/png' | 'image/webp' } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: url.includes('tiktok') ? 'https://www.tikwm.com/' : 'https://drive.google.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 512 || buf.byteLength > maxBytes) return null;

    const verifiedMime = sniffVerifiedMimeType(buf);
    if (!verifiedMime) return null;

    return {
      base64: Buffer.from(buf).toString('base64'),
      mimeType: verifiedMime,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves full media context for Gemini analysis.
 */
export async function resolveFullMediaContext(
  link: string,
  format: 'Video' | 'Static' | 'Carousel' = 'Video'
): Promise<ResolvedMediaContext> {
  const parsed = parseCreativeLinks(link);
  const first = parsed[0];
  const defaultRes: ResolvedMediaContext = {
    rawUrl: first?.rawUrl || link,
    sourceType: first?.sourceType || 'direct',
    mediaAssets: [],
  };

  if (!first) return defaultRes;

  const lower = first.rawUrl.toLowerCase();

  // TikTok Handler
  if (first.sourceType === 'tiktok') {
    const tt = await resolveTikTokVideo(first.rawUrl);
    if (tt) {
      defaultRes.title = tt.title;
      defaultRes.authorHandle = tt.authorHandle;
      defaultRes.coverUrl = tt.coverUrl;

      const videoCandidates = [tt.playUrl, tt.wmPlayUrl].filter(Boolean) as string[];
      for (const cand of videoCandidates) {
        const file = await fetchFileAsBase64(cand, 9 * 1024 * 1024);
        if (file && file.mimeType === 'video/mp4') {
          defaultRes.videoBase64 = file.base64;
          defaultRes.videoMimeType = file.mimeType;
          defaultRes.mediaAssets?.push({
            label: 'TikTok Video Stream',
            mimeType: file.mimeType,
            base64: file.base64,
          });
          break;
        }
      }
    }
    return defaultRes;
  }

  // Instagram Handler
  if (first.sourceType === 'instagram') {
    const ig = await resolveInstagramMeta(first.rawUrl);
    if (ig) {
      defaultRes.title = ig.title;
      defaultRes.coverUrl = ig.coverUrl;
      if (ig.coverUrl) {
        const img = await fetchFileAsBase64(ig.coverUrl, 3 * 1024 * 1024);
        if (img) {
          defaultRes.imageBase64 = img.base64;
          defaultRes.imageMimeType = img.mimeType;
          defaultRes.mediaAssets?.push({
            label: format === 'Video' ? 'Instagram Reel Frame' : 'Instagram Creative',
            mimeType: img.mimeType,
            base64: img.base64,
          });
        }
      }
    }
    return defaultRes;
  }

  // Google Drive Handler
  if (first.sourceType === 'drive') {
    const driveId = first.driveFileId || extractDriveFileId(first.rawUrl);
    if (driveId) {
      defaultRes.coverUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
      // Try direct MP4 download first
      const directVideoUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
      const video = await fetchFileAsBase64(directVideoUrl, 9 * 1024 * 1024);
      if (video && video.mimeType === 'video/mp4') {
        defaultRes.videoBase64 = video.base64;
        defaultRes.videoMimeType = video.mimeType;
        defaultRes.mediaAssets?.push({
          label: 'Google Drive Video',
          mimeType: video.mimeType,
          base64: video.base64,
        });
        return defaultRes;
      }

      // If not video, try downloading high-res thumbnail/image
      const thumb = await fetchFileAsBase64(defaultRes.coverUrl, 3 * 1024 * 1024);
      if (thumb) {
        defaultRes.imageBase64 = thumb.base64;
        defaultRes.imageMimeType = thumb.mimeType;
        defaultRes.mediaAssets?.push({
          label: 'Google Drive Asset',
          mimeType: thumb.mimeType,
          base64: thumb.base64,
        });
      }
    }
    return defaultRes;
  }

  // Direct URL Handler
  if (first.sourceType === 'direct') {
    const file = await fetchFileAsBase64(first.rawUrl, 9 * 1024 * 1024);
    if (file) {
      if (file.mimeType === 'video/mp4') {
        defaultRes.videoBase64 = file.base64;
        defaultRes.videoMimeType = file.mimeType;
      } else {
        defaultRes.imageBase64 = file.base64;
        defaultRes.imageMimeType = file.mimeType;
      }
      defaultRes.mediaAssets?.push({
        label: file.mimeType === 'video/mp4' ? 'Direct Video' : 'Direct Image',
        mimeType: file.mimeType,
        base64: file.base64,
      });
    }
  }

  return defaultRes;
}
