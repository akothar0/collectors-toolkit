# Collectors Toolkit — Weekly Build Prompts

Self-contained prompts aligned to the actual codebase. Paste into Cursor, Codex, or Claude Code.

**Agent quick reference:** [`AGENTS.md`](AGENTS.md) · **README:** [`README.md`](README.md)

**MVP status:** Weeks 1–8 are implemented in the repo. Use prompts below for context or incremental work; do not rebuild shipped features unless fixing bugs.

**Codebase patterns (read this before each week):**
- Runtime: `export const runtime = 'nodejs'` + `export const maxDuration = 60` on long API routes (scanner, grader, import)
- Auth: `auth()` from `@clerk/nextjs/server` → `getOrCreateUserId(userId, email)` from `@/lib/users`
- Collection APIs: `getAuthenticatedSupabaseUserId()` from `@/lib/collection-auth` on detail routes
- Rate limit: `checkRateLimit(supabaseUserId, action, limit)` from `@/lib/rate-limit`
- DB: `createServiceClient()` from `@/lib/supabase` for all server-side queries (service role; RLS is deny-all)
- Storage: Supabase `card-images` bucket via `@/lib/card-image-storage`
- Collection photos: `@/lib/collection-photos.ts` (`collection_card_images` table, max 10); legacy `front_image_url` / `back_image_url` fallback
- OpenAI: `import { openai } from '@/lib/openai'`
- Types: define in `@/lib/[feature].ts`, import from there — never inline in route files
- Migrations: `supabase/migrations/001`–`007` (see README / AGENTS.md)

---

## WEEK 4 — Raw Card AI Grader (GPT-4o Vision, multi-image)

```
We are building "Collectors Toolkit" — a Next.js 15 App Router app with Clerk, Supabase, and OpenAI GPT-4o.
Weeks 1–3 built the graded card scanner. Week 4 builds the raw card AI grader.

The grader uses GPT-4o Vision directly with a well-engineered grading prompt.
It accepts up to 4 images (full front, back, surface close-up, corner close-up) and returns
PSA, BGS, and CGC grade predictions in a single call.

## Existing codebase to reference
- @/lib/supabase.ts — createServiceClient(), createBrowserClient()
- @/lib/openai.ts — openai (OpenAI client instance)
- @/lib/rate-limit.ts — checkRateLimit(userId, action, limit), getRateLimitStatus(userId, action, limit)
- @/lib/users.ts — getOrCreateUserId(clerkId, email)
- @/lib/scanner.ts — look at how ScannerResult type is defined; use same pattern for grader
- @/lib/scanner-api.ts — look at how error responses are shaped
- @/components/ImageUpload.tsx — reuse this component for each photo step
- src/app/api/scanner/scan/route.ts — look at the exact API route pattern (runtime, maxDuration, auth flow, Supabase upload, error handling); mirror this for the grader route

## Step 1: DB Migration

Create supabase/migrations/002_grader_columns.sql:

ALTER TABLE raw_grade_sessions
  ADD COLUMN IF NOT EXISTS front_image_url text,
  ADD COLUMN IF NOT EXISTS back_image_url text,
  ADD COLUMN IF NOT EXISTS psa_prediction numeric(3,1),
  ADD COLUMN IF NOT EXISTS bgs_prediction numeric(3,1),
  ADD COLUMN IF NOT EXISTS cgc_prediction numeric(3,1),
  ADD COLUMN IF NOT EXISTS submission_company text,
  ADD COLUMN IF NOT EXISTS image_count int default 1;

-- Migrate existing image_url to front_image_url for consistency
UPDATE raw_grade_sessions SET front_image_url = image_url WHERE front_image_url IS NULL AND image_url IS NOT NULL;

Note: keep the existing image_url column (do not drop — backward compat).

## Step 2: Types file

Create src/lib/grader.ts:

export type GraderConfidence = 'low' | 'medium' | 'high';
export type GradingCompanyPrediction = 'PSA' | 'BGS' | 'CGC';

export type GradeResult = {
  sessionId: string;
  frontImageUrl: string;
  backImageUrl: string | null;
  imageCount: number;
  overallGrade: number;           // e.g. 9.2
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  psaPrediction: number;          // PSA whole number prediction (9, 10, etc.)
  bgsPrediction: number;          // BGS 0.5-increment prediction (9.0, 9.5, etc.)
  cgcPrediction: number;          // CGC prediction
  submissionCompany: GradingCompanyPrediction | null;  // best company for this card
  submissionRecommended: boolean;
  submissionRoiNotes: string;
  conditionNotes: string;
  confidence: GraderConfidence;
  error?: string;
};

export const GRADE_LIMIT = 10; // daily limit per user

## Step 3: GPT-4o grading prompt

Create src/lib/grader-prompt.ts:

export const GRADING_SYSTEM_PROMPT = `You are an expert sports card grader with deep knowledge of the PSA, BGS, and CGC grading standards.`;

export function buildGradingUserPrompt(imageCount: number): string {
  return \`Analyze the provided card image${imageCount > 1 ? 's' : ''} carefully. You are grading this sports trading card.

GRADING CRITERIA (examine each carefully):

CENTERING — measure border ratios top/bottom and left/right:
- PSA 10 / BGS 10: 55/45 or better on both axes
- PSA 9 / BGS 9: 60/40 or better
- PSA 8 / BGS 8: 65/35 or better
- PSA 7 / BGS 7: 70/30 or better
- Below 70/30: grade 6 or lower for centering

CORNERS — examine all 4 corners for wear, fraying, rounding, creases:
- 10: Perfectly sharp, no wear under any magnification
- 9: One barely visible nick or tiny wear point
- 8: Light wear on 1-2 corners
- 7: Noticeable wear on multiple corners, some fraying
- 6 and below: Heavy wear, significant fraying or creasing

EDGES — examine all 4 edges for nicks, chips, roughness:
- 10: Perfectly smooth, no defects
- 9: One very minor nick or rough spot
- 8: Light edge wear or very slight roughness
- 7: Multiple minor nicks, some roughness
- 6 and below: Significant nicks, chips, or roughness

SURFACE (front and back) — check for scratches, print lines, stains, creases, gloss loss:
- 10: Pristine, full original gloss, zero defects
- 9: One very minor flaw (tiny scratch, slight print line)
- 8: Light surface wear, minor scratches or slight gloss loss
- 7: Noticeable surface issues, multiple minor flaws
- 6 and below: Heavy surface wear, creases, stains

GRADING COMPANY SCALE DIFFERENCES:
- PSA: Reports whole numbers only (1-10). Overall grade = lowest sub-grade (PSA is strict on the weakest point).
- BGS: Reports in 0.5 increments (1.0-10.0). Averages sub-grades. Can award BGS 9.5 "Black Label" if all sub-grades are 9.5+. Slightly more lenient than PSA.
- CGC: Reports in 0.5 increments. Similar to PSA in strictness.

Return ONLY this JSON object, no other text:
{
  "overallGrade": number,
  "centering": number,
  "corners": number,
  "edges": number,
  "surface": number,
  "psaPrediction": number,
  "bgsPrediction": number,
  "cgcPrediction": number,
  "confidence": "low" | "medium" | "high",
  "conditionNotes": string,
  "submissionRecommended": boolean,
  "submissionCompany": "PSA" | "BGS" | "CGC" | null,
  "submissionRoiNotes": string
}

Rules:
- overallGrade: your synthesized estimate (can be decimal, e.g. 9.2)
- psaPrediction: whole number only (8, 9, 10 — not 8.5)
- bgsPrediction: 0.5 increments only (8.0, 8.5, 9.0, 9.5, 10.0)
- conditionNotes: 2-4 sentences describing SPECIFIC visible defects or strengths. Reference only what you can actually see. Do not fabricate defects.
- submissionCompany: which company gives the best grade for this card's profile; null if not recommended
- submissionRoiNotes: 1-2 sentences on cost-benefit. PSA economy ~$25/card, BGS ~$30, CGC ~$20. Only recommend if expected grade adds meaningful value.
- confidence: "low" if image quality prevents accurate assessment; explain in conditionNotes\`;
}

export function parseGraderResponse(text: string | null): Omit<GradeResult, 'sessionId' | 'frontImageUrl' | 'backImageUrl' | 'imageCount'> | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      overallGrade: Number(parsed.overallGrade) || 0,
      centering: Number(parsed.centering) || 0,
      corners: Number(parsed.corners) || 0,
      edges: Number(parsed.edges) || 0,
      surface: Number(parsed.surface) || 0,
      psaPrediction: Number(parsed.psaPrediction) || 0,
      bgsPrediction: Number(parsed.bgsPrediction) || 0,
      cgcPrediction: Number(parsed.cgcPrediction) || 0,
      confidence: (parsed.confidence as GraderConfidence) || 'low',
      conditionNotes: typeof parsed.conditionNotes === 'string' ? parsed.conditionNotes : '',
      submissionRecommended: Boolean(parsed.submissionRecommended),
      submissionCompany: (parsed.submissionCompany as GradingCompanyPrediction | null) ?? null,
      submissionRoiNotes: typeof parsed.submissionRoiNotes === 'string' ? parsed.submissionRoiNotes : '',
    };
  } catch {
    return null;
  }
}

## Step 4: API Route

Create src/app/api/grader/grade/route.ts.
Mirror the pattern in src/app/api/scanner/scan/route.ts exactly.

Key differences from the scanner route:
- Accept up to 4 image files: frontImage (required), backImage, surfaceImage, cornerImage
- Upload each provided image to Supabase Storage 'card-images' bucket (same upload pattern)
- Send ALL uploaded image URLs to GPT-4o in a single chat.completions.create() call
- Insert into raw_grade_sessions (not graded_scans)
- Rate limit action is 'grade' with GRADE_LIMIT from @/lib/grader

export const runtime = 'nodejs';
export const maxDuration = 60;

Flow:
1. auth() → getOrCreateUserId() → checkRateLimit(supabaseUserId, 'grade', GRADE_LIMIT)
2. Parse FormData: frontImage (File), backImage? (File), surfaceImage? (File), cornerImage? (File)
3. Return 400 if no frontImage
4. Upload each provided image to Supabase Storage (same uploadImage helper pattern as scanner)
5. Build GPT-4o messages:
   const messages = [{
     role: 'user',
     content: [
       { type: 'text', text: buildGradingUserPrompt(imageCount) },
       { type: 'image_url', image_url: { url: frontImageUrl, detail: 'high' } },
       // add backImageUrl, surfaceImageUrl, cornerImageUrl if provided (same shape)
     ]
   }]
6. Call openai.chat.completions.create({ model: 'gpt-4o', messages, response_format: { type: 'json_object' }, max_tokens: 1000 })
7. Parse response.choices[0].message.content using parseGraderResponse()
8. Insert into raw_grade_sessions:
   { user_id: supabaseUserId, image_url: frontImageUrl, front_image_url: frontImageUrl,
     back_image_url: backImageUrl ?? null, image_count: imageCount,
     predicted_grade: grades.overallGrade, sub_centering: grades.centering,
     sub_corners: grades.corners, sub_edges: grades.edges, sub_surface: grades.surface,
     psa_prediction: grades.psaPrediction, bgs_prediction: grades.bgsPrediction,
     cgc_prediction: grades.cgcPrediction, confidence: grades.confidence,
     condition_notes: grades.conditionNotes, submission_recommended: grades.submissionRecommended,
     submission_company: grades.submissionCompany, submission_roi_notes: grades.submissionRoiNotes,
     raw_ai_response: { rawText: responseText, model: 'gpt-4o', imageCount } }
9. Get quota: getRateLimitStatus(supabaseUserId, 'grade', GRADE_LIMIT)
10. Return: { ...GradeResult, sessionId, remainingGrades: quota.remaining }

Also create src/app/api/grader/quota/route.ts (GET):
Mirror src/app/api/scanner/quota/route.ts exactly, just change action to 'grade' and use GRADE_LIMIT.

## Step 5: Grader Page

Replace src/app/grader/page.tsx with a full 'use client' implementation.

The page has a guided multi-step photo capture. Use the existing ImageUpload component.

Layout (desktop: 2 columns; mobile: stacked):
Left column — Photo capture steps:
  Step 1 — "Front of card" (required)
    Label: "Full front photo" 
    Instruction: "Hold card flat · Camera perpendicular · All 4 corners visible · Good lighting"
    <ImageUpload onImageSelected={handleFrontImage} accept="image/*" />
    
  Step 2 — "Back of card" (optional but recommended)
    Label: "Back photo"
    Instruction: "Helps assess back surface and centering"
    <ImageUpload onImageSelected={handleBackImage} accept="image/*" />
    
  Step 3 — "Surface close-up" (optional)
    Label: "Front surface with raking light"
    Instruction: "Angle your phone's flashlight from the side — reveals scratches invisible head-on"
    <ImageUpload onImageSelected={handleSurfaceImage} accept="image/*" />
    
  Step 4 — "Corner close-up" (optional)
    Label: "Any corner you're concerned about"
    Instruction: "For cards near the grade boundary — helps assess wear"
    <ImageUpload onImageSelected={handleCornerImage} accept="image/*" />

Right column — Disclaimer + Submit:
  Yellow disclaimer banner (always visible, not dismissible):
  "⚠️ AI Estimate Only — This is not a professional grade. Accuracy depends heavily on photo quality.
   Use as a rough guide when deciding whether to submit for grading."
  
  "Grade This Card" button (disabled until frontImage is set)
  Rate limit display: fetches /api/grader/quota on mount → "X grades remaining today"
  
Loading state (while POST /api/grader/grade is in-flight):
  Step indicators cycling with animation:
  "Examining centering..." → "Checking corners & edges..." → "Assessing surface..." → "Calculating predictions..."
  
On success: hide form, show GradeResult component
On error: show error message + retry button

## Step 6: GradeResult Component

Create src/components/GradeResult.tsx ('use client').

Props: GradeResult (imported from @/lib/grader) + onReset: () => void

Layout (mobile-first, stack vertically):

Section 1 — Card image strip (if imageUrl provided): small thumbnails of submitted photos

Section 2 — Overall grade badge (large, centered):
  Circle badge with overallGrade in large font
  Grade colors: 9.5-10 = amber/gold, 9.0-9.4 = emerald, 8.0-8.9 = blue, 7.0-7.9 = slate, <7 = gray
  Confidence label below: "High confidence" / "Medium confidence" / "Low confidence ⚠️"
  If confidence is 'low': yellow warning card below badge with retake tips

Section 3 — Sub-grades (4 rows):
  [Label] [Progress bar, w-full, colored by sub-score] [Score/10]
  Centering · Corners · Edges · Surface
  Bar color matches the overall grade color scale

Section 4 — Grade predictions by company (3 side-by-side cards):
  [PSA] [psaPrediction]  e.g. "PSA 9"
  [BGS] [bgsPrediction]  e.g. "BGS 9.0"
  [CGC] [cgcPrediction]  e.g. "CGC 9"
  The submissionCompany card gets a highlighted border + "Recommended" label

Section 5 — Condition notes:
  Light gray card, plain-English AI description

Section 6 — Submission recommendation:
  Green card (recommended) or gray card (not recommended)
  submissionRoiNotes text
  Cost reference: PSA Economy ~$25 · BGS ~$30 · CGC ~$20

Action buttons:
  "Add to Collection" → navigate to /collection/add with grade pre-filled (pass as query params:
    ?grade={psaPrediction}&company={submissionCompany ?? 'PSA'}&session={sessionId})
  "Grade Another Card" → call onReset() to reset page state

## Styling notes
Match the existing design system visible in ImageUpload.tsx and site-shell.tsx:
- rounded-[1.75rem] or rounded-3xl for cards
- border border-slate-200 bg-white shadow-soft
- text-brand-600 for accent color
- font-semibold tracking-tight for headings
- The shadow-soft utility may be defined in tailwind.config.ts — check and use it

## What NOT to build in this week
- Grade history page (week 5 or later)
- Save-to-collection flow (collection manager week)
- Any CardGrade.io integration — pure GPT-4o only
```

---

## WEEK 5 — Collection Manager: Manual Add + Grid View ✅ SHIPPED

```
Implemented. Key paths:
- src/app/collection/page.tsx, collection/add/page.tsx
- src/app/api/collection/route.ts
- @/lib/collection.ts, collection-rows.ts, collection-presenter.ts, card-catalog.ts
- tests/collection-query.test.ts, collection-presenter.test.ts
```

---

## WEEK 6 — Collection Detail, Edit, Want List ✅ SHIPPED

```
Implemented. Key paths:
- src/app/collection/[id]/page.tsx, src/components/CollectionCardForm.tsx
- src/app/api/collection/[id]/route.ts, @/lib/collection-detail.ts
- src/app/wantlist/page.tsx, src/app/api/wantlist/
- Multi-photo gallery: @/lib/collection-photos.ts, migration 006_collection_card_images.sql
- tests/collection-detail.test.ts, collection-photos.test.ts
```

---

## WEEK 7 — Purchase Import (eBay Screenshots + Bookmarklet, Fanatics PDFs) ✅ SHIPPED

```
Implemented. Key paths:
- src/app/import/, src/app/api/import/, src/app/api/bookmarklet/route.ts
- @/lib/import/* (parse-ebay-screenshot, parse-fanatics-pdf, bookmarklet, limits)
- Migration 003_import_storage.sql
- tests/import-security.test.ts, bookmarklet-url.test.ts
```

---

## WEEK 8 — Portfolio Dashboard + Set Tracker + Deploy ✅ SHIPPED

```
Implemented. Key paths:
- src/app/portfolio/page.tsx, src/app/api/portfolio/route.ts
- @/lib/portfolio.ts, portfolio-server.ts
- src/app/sets/, src/app/api/sets/, @/lib/sets.ts
- Migration 007_rls_sets.sql (RLS on card_sets / collection_set_progress)
- Grader history: src/app/grader/history/page.tsx, @/lib/grader-db.ts
```
