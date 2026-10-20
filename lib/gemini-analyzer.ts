import { CreativeRecord } from './google-sheets';
import { formatIDR, formatPct, formatNum, formatROAS } from './formatters';
import { resolveTikTokVideoServer, resolveInstagramThumbnailFast } from './tiktok-resolver';
import { parseCreativeLinks, extractDriveFileId } from './media-resolver';

export const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
];

export interface GeminiAnalysisResult {
  markdown: string;
  modelUsed: string;
  analyzedAt: string;
}

/**
 * Sniff binary magic bytes to guarantee we never send HTML error pages or invalid buffers to Gemini.
 */
function sniffVerifiedMimeType(buf: ArrayBuffer): 'video/mp4' | 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (!buf || buf.byteLength < 512) return null;
  const bytes = new Uint8Array(buf.slice(0, 16));

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';

  // WebP: RIFF .... WEBP
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

  // MP4 / QuickTime: bytes 4..7 === "ftyp" (66 74 79 70)
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

/**
 * Proven MP4 fetcher from pc-aio-tracker that guarantees complete MP4 download.
 */
async function fetchMp4AsBase64(url: string, maxBytes = 12 * 1024 * 1024): Promise<string | null> {
  if (!url || url.startsWith('/api/')) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: url.includes('tikwm.com') ? 'https://www.tikwm.com/' : 'https://www.tiktok.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(18000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 4096 && buf.byteLength <= maxBytes) {
      const verified = sniffVerifiedMimeType(buf);
      if (verified === 'video/mp4') {
        return Buffer.from(buf).toString('base64');
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchImageAsBase64(url: string, maxBytes = 4 * 1024 * 1024): Promise<{ base64: string; mimeType: string } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.instagram.com/',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 512 && buf.byteLength <= maxBytes) {
      const mime = sniffVerifiedMimeType(buf);
      if (mime && mime.startsWith('image/')) {
        return { base64: Buffer.from(buf).toString('base64'), mimeType: mime };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export interface ResolvedMediaForAI {
  rawUrl: string;
  videoBase64?: string;
  videoMimeType?: string;
  imageBase64?: string;
  imageMimeType?: string;
  captionText?: string;
  authorHandle?: string;
}

export async function resolveMediaForAI(creative: CreativeRecord): Promise<ResolvedMediaForAI> {
  const parsed = parseCreativeLinks(creative.creative_link);
  const first = parsed[0];
  const result: ResolvedMediaForAI = {
    rawUrl: first?.rawUrl || creative.creative_link || '',
  };

  if (!result.rawUrl) return result;

  const lower = result.rawUrl.toLowerCase();

  // 1. TikTok Handler (deep MP4 stream fetch)
  if (lower.includes('tiktok.com')) {
    try {
      const { video } = await resolveTikTokVideoServer(result.rawUrl);
      if (video) {
        result.captionText = video.title || '';
        result.authorHandle = video.authorHandle || video.authorName || '';

        const candidates = [video.wmPlayUrl, video.playUrl, ...(video.backupPlayUrls || [])].filter(
          (u): u is string => Boolean(u && !u.startsWith('/api/'))
        );
        for (const candUrl of candidates) {
          const b64 = await fetchMp4AsBase64(candUrl, 12 * 1024 * 1024);
          if (b64) {
            result.videoBase64 = b64;
            result.videoMimeType = 'video/mp4';
            break;
          }
        }
      }
    } catch {
      // ignore
    }
    return result;
  }

  // 2. Google Drive Handler
  if (lower.includes('drive.google.com')) {
    const driveId = first?.driveFileId || extractDriveFileId(result.rawUrl);
    if (driveId) {
      // Try direct MP4 download
      const directUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;
      const b64 = await fetchMp4AsBase64(directUrl, 12 * 1024 * 1024);
      if (b64) {
        result.videoBase64 = b64;
        result.videoMimeType = 'video/mp4';
        return result;
      }
      // If not MP4, fetch high-res thumbnail
      const thumbUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
      const img = await fetchImageAsBase64(thumbUrl);
      if (img) {
        result.imageBase64 = img.base64;
        result.imageMimeType = img.mimeType;
      }
    }
    return result;
  }

  // 3. Instagram Handler
  if (lower.includes('instagram.com')) {
    try {
      const igMeta = await resolveInstagramThumbnailFast(result.rawUrl);
      if (igMeta?.title) result.captionText = igMeta.title;
      if (igMeta?.coverUrl) {
        const img = await fetchImageAsBase64(igMeta.coverUrl);
        if (img) {
          result.imageBase64 = img.base64;
          result.imageMimeType = img.mimeType;
        }
      }
    } catch {
      // ignore
    }
    return result;
  }

  // 4. Direct video URL
  if (/\.mp4(\?|$)/i.test(result.rawUrl)) {
    const b64 = await fetchMp4AsBase64(result.rawUrl, 12 * 1024 * 1024);
    if (b64) {
      result.videoBase64 = b64;
      result.videoMimeType = 'video/mp4';
    }
  }

  return result;
}

export function buildStrategistPrompt(
  creative: CreativeRecord,
  media: ResolvedMediaForAI
): string {
  const isCpas =
    creative.ad_type?.toLowerCase().includes('cpas') ||
    (creative.gmv !== undefined && creative.gmv > 0) ||
    (creative.purchase !== undefined && creative.purchase > 0);

  const hasVideoAttached = Boolean(media.videoBase64);
  const captionLine = media.captionText ? `Post Caption: "${media.captionText}"\n` : '';
  const authorLine = media.authorHandle ? `Creator/Handle: @${media.authorHandle}\n` : '';

  let perfText = `**Creative Profile & User-Inputted Performance Data:**
- Brand: ${creative.brand}
- Creative / Ad Name: ${creative.ad_name}
- Ad Type / Objective: ${creative.ad_type}
- Asset Format: ${creative.format}
- Performance Period: ${creative.date_label || 'Current Flight'}
- Total Spend: ${formatIDR(creative.spend)}
- Impressions: ${formatNum(creative.impression)}
- Clicks: ${formatNum(creative.clicks)}
- CPM: ${formatIDR(creative.cpm)}
- CTR: ${formatPct(creative.ctr)}
`;

  if (creative.format === 'Video' || creative.views_6s > 0) {
    perfText += `- 6s Views (Hook): ${formatNum(creative.views_6s)} (6s VTR: ${formatPct(creative.vtr_6s)})
- 15s Views (Hold): ${formatNum(creative.views_15s)} (15s VTR: ${formatPct(creative.vtr_15s)})
- Hold Ratio (15s / 6s): ${formatPct(creative.hold_ratio)}
`;
  }

  if (isCpas) {
    perfText += `
**CPAS Sales & Commerce Conversion Data:**
- Gross Merchandise Value (GMV): ${formatIDR(creative.gmv || 0)}
- Purchases (Orders): ${formatNum(creative.purchase || 0)}
- ROAS (GMV / Spend): ${formatROAS(creative.roas || 0)}
- Cost Per Purchase (CPP / CPA): ${formatIDR(creative.cpp || 0)}
- Conversion Rate (CVR: Purchases / Clicks): ${formatPct(creative.cvr || 0)}
- Average Order Value (AOV: GMV / Purchases): ${formatIDR(creative.aov || 0)}
`;
  }

  return `**Role:** 
Act as a Senior Creative Strategist & Performance Marketing Director specializing in TikTok and Instagram Reels.

**CRITICAL MULTIMODAL INSTRUCTION:**
${hasVideoAttached ? `You have been provided with the actual MP4 video file for "${creative.ad_name}".
1. You MUST watch the actual video frames and listen to the audio track directly.
2. For **Verbatim Spoken/Text Hook (0–3s)**:
   - You MUST listen across the opening 0–6 seconds of the spoken audio track to capture the complete opening dialogue verbatim without cutting off early (e.g., if a creator asks a question and immediately responds 'Eits, jangan salah...', transcribe the complete thought).
   - Format this line strictly as:
     Text on screen: "[Transcribe exact on-screen text overlay or 'None']" / Spoken: "[Transcribe exact spoken dialogue across 0–6s verbatim in Bahasa Indonesia, or [specific ambient sound effects / music description if no speech]]"
   - Never omit either modality. If there is spoken dialogue, transcribe it verbatim in Bahasa Indonesia.
3. For **Visual Hook (0–3s)**:
   - Describe with high specificity what physically appears and moves in the video frame: the talent's clothing/attire (e.g. hijab, oversized t-shirt, office blazer), physical setting (e.g. bathroom vanity, bedroom, desk), props (e.g. serum bottle dropper, comment sticker overlay), and camera movement/editing jump-cuts. Avoid vague descriptions.
4. For **Main Communication Approach**:
   - Provide a precise, descriptive category that captures the strategic intent (e.g., "Direct Objection Handling / Creator FAQ Breakdown", "Relatable Workplace Humor / Situational Skit", "Direct Pain Point Callout / Problem-Solution", "Before-After Skin Transformation / Honest Review", "Hard Promo / Limited-Time Flash Deal").` : `Inspect the visual staging, typography, product focus, and visual hook of this creative asset.`}
5. Relate the creative execution directly to the user-inputted performance metrics (${formatIDR(creative.spend)} Spend, ${formatPct(creative.ctr)} CTR${creative.vtr_6s > 0 ? `, ${formatPct(creative.vtr_6s)} 6s VTR` : ''}${isCpas ? `, ${formatROAS(creative.roas || 0)} ROAS, and ${formatIDR(creative.cpp || 0)} CPP` : ''}).
6. Format the output strictly as a structured executive **One-Slider Report** (no walls of text, no media buying or budget allocation advice, and NO decorative emojis/icons).

**Input Data:**
${perfText}${authorLine}${captionLine}Creative Link: ${creative.creative_link}

---

**Required Output Format (Strict One-Slider Layout — NO emojis/icons):**

### Creative Breakdown: Hook & Communication Analysis
> **[${creative.ad_name}]** (${creative.brand} • ${creative.ad_type} • ${creative.format})
> * **Verbatim Spoken/Text Hook (0–3s):** Text on screen: "[Transcribe exact on-screen text or 'None']" / Spoken: "[Transcribe complete spoken dialogue across 0–6s verbatim in Bahasa Indonesia or specific sound description]"
> * **Visual Hook (0–3s):** [Specific frame-by-frame visual description: talent action, clothing, setting, props, camera angle, transitions]
> * **Main Communication Approach:** **[Precise category: e.g., Direct Objection Handling / Creator FAQ Breakdown, Relatable Situational Skit, Problem-Solution Callout]**
> * **Creative-to-Performance Correlation:** [1–2 sentences explaining how this specific creative execution drove the ${formatIDR(creative.spend)} spend scale, ${formatPct(creative.ctr)} CTR${creative.vtr_6s > 0 ? `, and ${formatPct(creative.vtr_6s)} 6s VTR` : ''}]

### The Data Proof
| Metric | Value | Strategic Interpretation |
| :--- | :--- | :--- |
| **Spend** | ${formatIDR(creative.spend)} | Validated delivery volume for this creative angle |
| **CPM** | ${formatIDR(creative.cpm)} | Auction efficiency and audience receptivity |
| **CTR** | ${formatPct(creative.ctr)} | Click intent and hook stopping power |
${
  creative.format === 'Video' || creative.views_6s > 0
    ? `| **6s VTR (Hook)** | ${formatPct(creative.vtr_6s)} | Hook stopping rate across first 6 seconds |
| **15s VTR (Hold)** | ${formatPct(creative.vtr_15s)} | Mid-video retention and interest maintenance |
| **Hold Ratio (15s/6s)** | ${formatPct(creative.hold_ratio)} | Retention efficiency from hook into product payoff |`
    : ''
}
${
  isCpas
    ? `| **GMV Generated** | ${formatIDR(creative.gmv || 0)} | Total gross revenue driven |
| **Purchases** | ${formatNum(creative.purchase || 0)} | Direct conversion orders |
| **ROAS** | ${formatROAS(creative.roas || 0)} | Gross revenue multiplier on ad spend |
| **Cost Per Purchase (CPP)** | ${formatIDR(creative.cpp || 0)} | Customer acquisition cost per order |
| **Conversion Rate (CVR)** | ${formatPct(creative.cvr || 0)} | Conversion efficiency from click to purchase |
| **Average Order Value (AOV)** | ${formatIDR(creative.aov || 0)} | Basket size driven by this creative |`
    : ''
}

${
  isCpas
    ? `### Conversion Capability & E-Commerce Effectiveness (CPAS Sales Analysis)
* **Buyer Intent vs. Clickbait Analysis:** 
  Analyze whether the opening hook and tone attracted high-intent buyers ready to check out or casual scrollers who bounced. Correlate with the creative's **${formatPct(creative.cvr || 0)} CVR** and **${formatROAS(creative.roas || 0)} ROAS**.
* **Offer Clarity & Commercial Framing:** 
  How clearly were the product value proposition, pricing/discount anchor, bundle savings, or purchase urgency communicated? Did the viewer clearly understand *what* to buy and *why now*?
* **Checkout Motivation & Trust Signals:** 
  Did the creative feature trust triggers (e.g. BPOM / dermatological certification, authentic texture demo, unboxing, customer reviews) that supported the **${formatIDR(creative.cpp || 0)} CPP**?`
    : ''
}

### Why This Approach Works (Qualitative Breakdown)
* **Hook Psychology:** Why did this specific visual + verbal hook stop the scroll for **${creative.brand}**? (1–2 sentences on the psychological trigger or curiosity gap).
* **Message Flow & Retention:** How did the creative transition from the opening 3 seconds into the product payoff or demonstration without losing viewer interest?

### Creative Next Steps (Iteration Roadmap)
*(Strict rule: Creative & messaging actions ONLY. Must be 100% specific to ${creative.brand} and this exact creative—no generic advice.)*
* **Replicate the Winning Angle (2 New Verbatim Hook Scripts):**
  * **Hook Script 1:** Complete verbatim 0–5s spoken + on-screen text hook script in Bahasa Indonesia expanding on this approach.
  * **Hook Script 2:** Second distinct verbatim 0–5s hook script testing an alternative emotional/situational angle on the same pillar.
* **Visual Variation (0–3s Recut):** 1 specific shootable visual direction to recut or reshoot the opening 3 seconds to test fresh pacing.
${
  isCpas
    ? `* **Conversion Optimization Recut:** 1 actionable direction to increase ROAS and reduce CPP (e.g. adding a sticky discount voucher banner at 0:04, highlighting bundle tiers, or inserting an unboxing CTA).`
    : ''
}
* **Fatigue Safeguard:** Specific angle pivot once frequency rises without diluting the core brand proposition.`;
}

async function callGemini(
  apiKey: string,
  modelName: string,
  parts: any[],
  systemPrompt: string
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts
        ?.filter((p: any) => !p.thought)
        ?.map((p: any) => p.text || '')
        .join('\n')
        ?.trim();
      if (text && text.length > 80) return text;
    } else {
      const err = await res.text().catch(() => '');
      console.warn(`[gemini-analyzer] ${modelName} returned status ${res.status}: ${err.slice(0, 250)}`);
    }
  } catch (err: any) {
    console.warn(`[gemini-analyzer] ${modelName} error:`, err?.message);
  }
  return null;
}

export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; model?: string; error?: string }> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { success: false, error: 'API key is too short or empty.' };
  }
  const cleanKey = apiKey.trim();
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with OK.' }] }],
        }),
      });
      if (res.ok) return { success: true, model };
    } catch {
      // try next
    }
  }
  return { success: false, error: 'Could not connect to Gemini API with this key.' };
}

export async function analyzeCreativeWithGemini(
  creative: CreativeRecord,
  userApiKey: string
): Promise<GeminiAnalysisResult> {
  const cleanKey = (userApiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is required. Please set your Gemini API key in the dashboard.');
  }

  // 1. Resolve media stream (direct MP4 via TikWM or verified images)
  const media = await resolveMediaForAI(creative);

  // 2. Build prompt
  const prompt = buildStrategistPrompt(creative, media);

  const systemInstruction =
    'You are a Senior Creative Strategist for TikTok and Instagram Reels. You MUST deeply watch each video frame-by-frame and listen to the audio track directly across the full opening 0–6 seconds. For Verbatim Spoken/Text Hook (0–3s), you MUST always output the complete two-part breakdown: Text on screen: "[Exact on-screen text or \'None\']" / Spoken: "[Transcribe complete spoken dialogue across 0–6s verbatim in Bahasa Indonesia, or [specific ambient sound/music description if no speech]]". Describe specific visual details (talent clothing, setting, props, camera angles, editing jump-cuts) and provide precise communication approach categories (e.g., Direct Objection Handling / Creator FAQ Breakdown, Relatable Workplace Humor / Situational Skit). If CPAS Sales, thoroughly evaluate conversion capability and effectiveness. Format strictly as a concise One-Slider Report with zero emojis and zero decorative icons.';

  // 3. Assemble multimodal parts
  const multimodalParts: any[] = [];
  if (media.videoBase64 && media.videoMimeType) {
    multimodalParts.push({
      text: `ATTACHED VIDEO FILE FOR CREATIVE: "${creative.ad_name}" (Brand: ${creative.brand}, Ad Type: ${creative.ad_type}, Format: ${creative.format}). You MUST watch the video frames and listen to the spoken audio track directly:`,
    });
    multimodalParts.push({
      inlineData: {
        mimeType: media.videoMimeType,
        data: media.videoBase64,
      },
    });
  } else if (media.imageBase64 && media.imageMimeType) {
    multimodalParts.push({
      text: `ATTACHED IMAGE ASSET FOR CREATIVE: "${creative.ad_name}" (${creative.brand} • ${creative.format}):`,
    });
    multimodalParts.push({
      inlineData: {
        mimeType: media.imageMimeType,
        data: media.imageBase64,
      },
    });
  }

  multimodalParts.push({ text: prompt });

  // 4. Call candidate models with multimodal stream
  for (const model of CANDIDATE_MODELS) {
    if (multimodalParts.length > 1) {
      const text = await callGemini(cleanKey, model, multimodalParts, systemInstruction);
      if (text) {
        return {
          markdown: text,
          modelUsed: model,
          analyzedAt: new Date().toISOString(),
        };
      }
    }

    // Text-only fallback if media payload failed
    const textOnly = await callGemini(cleanKey, model, [{ text: prompt }], systemInstruction);
    if (textOnly) {
      return {
        markdown: textOnly,
        modelUsed: `${model}-metadata`,
        analyzedAt: new Date().toISOString(),
      };
    }
  }

  throw new Error('All Gemini models timed out or rejected the request. Please verify your API key and try again.');
}
