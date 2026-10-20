# Gemini Creative Analyzer

Multimodal E-Commerce & Digital Media Creative Intelligence Engine powered by Google Gemini. Replicates and expands upon the creative analyzer from `pc-aio-tracker` with a focus on single-creative data entry, TikTok/Instagram video understanding, and **CPAS Sales Conversion Intelligence**.

---

## Highlights & Features

- **Single Creative Performance Input (1-by-1)**:
  - Input Brand, Ad Type, Format, Ad Name, Creative Link (TikTok, Instagram, Google Drive, Direct).
  - Spend, Impressions, Clicks, 6s Views, 15s Views.
  - Date period flexibility matching `pc-aio-tracker`: Tuesday–Sunday Weekly Selector, Custom Calendar Range, or Single Date.
- **CPAS Sales & Conversion Capabilities**:
  - Dynamically input GMV and Purchases for CPAS Sales campaigns.
  - Real-time live calculation of ROAS, Cost Per Purchase (CPP / CPA), Conversion Rate (CVR), and Average Order Value (AOV).
- **Multimodal Gemini Creative Analysis**:
  - Downloads and verifies actual MP4 video streams or carousel images.
  - Inspects 0–3s / 0–6s verbatim spoken dialogue and on-screen text in Bahasa Indonesia.
  - Identifies visual hooks: talent attire, setting, props, camera angles, jump-cuts.
  - Categorizes Main Communication Approach.
  - **CPAS Conversion Analysis**: evaluates buyer intent vs. clickbait, offer clarity, commercial framing, trust signals, and correlation with ROAS and CPP.
  - Outputs an executive **One-Slider Report** with zero emojis and an actionable Iteration Roadmap (2 verbatim hook scripts + visual recut + conversion optimization recut).
- **Zero Built-In Key Policy**:
  - Users securely inject their personal Gemini API Key via the UI.
  - Key is stored in the browser's `localStorage` and sent with requests.
  - Includes a one-click connection test tool.
- **Google Sheets Cloud Storage**:
  - Automatically persists all creatives and analyses in Google Sheets (`Creatives` tab).
  - Pre-configured with service account integration.
- **In-App Media Player**:
  - Watch videos directly with TikTok stream/embed, Instagram Reel embed, or Google Drive preview.
- **Excel Export**:
  - Export filtered creative tables to Excel (`.xlsx`) at any time.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```env
SPREADSHEET_ID=1YcRLVTQ1eIrYpKvBJ6WAtJXvNugt9Zv-KiRf0Gjhe-U
GOOGLE_CLIENT_EMAIL=creativeanalyzer@aio-tracker-507715.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

*Note: No Gemini API Key is stored in environment variables; users supply their key directly through the dashboard UI.*

---

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## Deployment to Vercel & GitHub

### GitHub
```bash
git remote add origin https://github.com/<your-username>/gemini-creative-analyzer.git
git push -u origin main
```

### Vercel
Deploy directly via Vercel CLI or import the GitHub repository in the Vercel dashboard:
- Framework Preset: **Next.js**
- Environment Variables to configure in Vercel project settings:
  - `SPREADSHEET_ID`
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
