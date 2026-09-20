# CLAUDE.md - Ulpan Genie Assessor

> Complete documentation for Claude Code sessions. Read this first to understand the entire codebase.

## Quick Overview

**What is this?** A React + Vite web app that provides adaptive Hebrew language level assessment through an interactive, gamified interface with an animated genie character.

**Who is it for?** Ulpan Bayit (Hebrew language school) to assess prospective students' Hebrew levels before enrollment.

**Core Algorithm:** Mimics founder Yaron Sivan's intuitive level-determination method - finds exact level in 6-14 questions using adaptive 3-phase testing.

---

## Project Structure

```
/web/
├── src/
│   ├── components/           # React components
│   │   ├── Welcome.jsx       # Mode selection (fun vs formal)
│   │   ├── Story.jsx         # Optional genie backstory
│   │   ├── Survey.jsx        # Multi-step user profiling (name, email, background)
│   │   ├── Game.jsx          # Core assessment loop (THE ALGORITHM)
│   │   ├── Question.jsx      # Question display with shuffled options
│   │   ├── Results.jsx       # Final results, recommendations, modals
│   │   ├── GateFail.jsx      # For users who can't read Hebrew alphabet
│   │   ├── Header.jsx        # Navigation, contact modal
│   │   ├── Genie.jsx         # Animated genie character
│   │   ├── CourseSelectionModal.jsx   # In-person vs online course
│   │   ├── LevelAssessmentModal.jsx   # WhatsApp / Intro Session booking
│   │   └── ContactModal.jsx  # Contact form
│   ├── hooks/
│   │   ├── useQuestions.js   # CSV question loading (PapaParse)
│   │   ├── useGameEngine.js  # Batch evaluation helpers
│   │   └── useSurvey.js      # Validation survey logic
│   ├── engine/
│   │   └── levels.js         # LEVELS array (10 levels), capIdx()
│   ├── lib/
│   │   └── supabase.js       # All database operations
│   ├── utils/
│   │   ├── analytics.js      # GA4 + Facebook Pixel
│   │   └── assessmentReport.js  # Email/text report generation
│   ├── config/
│   │   └── messages.js       # Genie dialogue (fun vs formal)
│   ├── assets/               # Images (genie, logos)
│   ├── App.jsx               # MAIN ORCHESTRATOR - phases, routing, layout
│   ├── index.css             # Tailwind + animations
│   └── main.jsx              # React entry point
├── public/data/
│   └── questions.csv         # 102 questions (10 levels)
├── Algorithm.md              # Detailed algorithm docs
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 7 |
| Styling | Tailwind CSS (pixel-art theme) |
| Database | Supabase (PostgreSQL) |
| Analytics | GA4 + Facebook Pixel |
| Webhooks | Make.com (3 endpoints) |
| CSV Parsing | PapaParse |

---

## The 10 Hebrew Levels

```
Index  Name              CEFR    Description
0      Aleph (A1.1)      A1      Absolute beginner
1      Aleph+ (A1.2)     A1      A1 continuation
2      Aleph++ (A1.3)    A1      A1 advanced
3      Bet (A2.1)        A2      A2 beginning
4      Bet+ (A2.2)       A2      A2 continuation
5      Bet++ (A2.3)      A2      A2 advanced
6      Gimmel (B1.1)     B1      B1 beginning
7      Gimmel+ (B1.2)    B1      B1 continuation
8      Gimmel++ (B1.3)   B1      B1 advanced
9      Dalet (B2.1)      B2      B2 beginning (top)
```

---

## User Flow

```
WELCOME                    Mode selection (fun/formal)
    ↓
STORY (optional)           Genie backstory narrative
    ↓
SURVEY                     7 steps:
  1. Name input
  2. Email input           (+ consent checkbox)
  3. Can decode Hebrew?    Yes → continue, No → extreme beginner
  4. Knowledge source      School/Home/Religious/Streets
  5. Study details         Months + hours/week OR self-assessed fluency
  6. Validation questions  3 yes/no grammar questions
    ↓
GAME                       Adaptive assessment (6-14 questions)
  - Warmup phase           2 questions below start level (if startIdx >= 3)
  - Boundary phase         Batch testing at current level
  - Supportive phase       Fill to minimum 6 questions
    ↓
RESULTS                    Level recommendation + course links
```

---

## The Algorithm (Game.jsx)

### Core Concept
Find the highest level a student can pass, then recommend they START at level+1.

### Three Phases

**1. WARMUP** (optional, if startIdx >= 3)
- 2 questions from levels below starting level
- Purpose: Verify basics before testing actual level
- Non-binding (doesn't affect result)

**2. BOUNDARY** (main testing)
- Batch of up to 5 questions at current level
- After each answer, evaluate:
  - **PROMOTE**: 3+ correct AND ≤2 wrong → move up
  - **DEMOTE**: 2+ wrong AND <3 correct → move down
  - **UNDECIDED**: anything else → FINISH

**3. SUPPORTIVE** (if needed)
- If total questions < 6, add more from recommended level
- Just for teacher data, doesn't change result

### Key Rules
- **Minimum questions:** 6
- **Maximum questions:** 14 (hard cap)
- **Just-promoted rule:** If promoted X→X+1 then immediately fail at X+1 → finish at X
- **Floor guard:** At A1.1, if 2 demotes OR 5 total wrong → extreme beginner

### Result Calculation
```javascript
finishedLevel = highest level passed (lastPassedIdx)
recommendedLevel = finishedLevel + 1  // Where to START studying
```

---

## Key Components

### App.jsx (Master Orchestrator)
- Manages phases: WELCOME, STORY, SURVEY, GATE_FAIL, GAME, RESULTS
- Handles URL parameters (`?email=...` for landing page integration)
- Responsive layout: desktop (1/3 genie, 2/3 content) vs mobile
- Genie message management
- Abandonment tracking

### Survey.jsx (Multi-step Form)
- 7 steps collecting user profile
- Webhook to Make.com on email submission
- Creates Supabase assessment record
- Calculates starting level from validation questions

### Game.jsx (Core Algorithm)
- Implements all 3 phases
- Question selection with deduplication
- Batch evaluation logic
- Progress tracking to Supabase

### Results.jsx (Final Screen)
- Generates text + HTML reports
- Sends results webhook to Make.com
- Course selection modal (in-person vs online)
- Assessment booking modal (WhatsApp vs our own booking page)

---

## Integrations

### Supabase
- **Table:** `assessments` (the ONLY table used by this app)
- **Tracks:** Full user journey, all Q&A, decisions, time spent, actions
- **Key columns:**
  - User: `name`, `email`, `device_type`, `geo_country`, `referrer`
  - Profile: `knowledge_source`, `fluency_level`, `months_studied`, `weekly_hours`, `total_hours`
  - Results: `finished_level`, `recommended_level`, `question_history`, `decisions`
  - Actions: `clicked_view_courses`, `clicked_schedule_assessment`, `actions_log`
  - Timing: `duration_seconds`, `time_on_results_seconds`, `abandoned_at`
- **Functions:**
  - `saveAssessmentStart()` - Create record with referrer tracking
  - `updateAssessmentProfile()` - Save survey profile data
  - `updateAssessmentProgress()` - Track questions
  - `saveAssessmentComplete()` - Final results
  - `trackResultsAction()` - Button clicks
  - `trackAbandonment()` - Page exits

**IMPORTANT:** The Supabase database has other tables (lp_sessions, lp_page_events, lp_leads, etc.) that are used by a DIFFERENT landing page project. These `lp_*` tables are completely unrelated to this assessor app - do not touch them.

### Make.com Webhooks
1. **User Started:** `v9y7wnw4apbtyqlexiy5au316rm8fhoj`
2. **Results:** `obn5ra3f86v4s4eqg6bp661yeeqv04u2`
3. **Contact Form:** `8xynd14g6qgte9sgole2rocaq3y5k3hm`

### Analytics
- **GA4:** AssessmentStarted, AssessmentCompleted, ViewCourses, etc.
- **Facebook Pixel:** PageView, Lead (on completion), Contact events

### External Services
- **Booking (`crm.ulpan.co.il/book/ulpan_bayit`):** the free Intro Session.
  Replaced cal.com on 2026-09-20 — cal.com bookings never reached the CRM
  (`api/webhooks/cal-com` has been dead for months), so they produced no lead,
  no appointment, no reminder and no Zoom room on our side.
  **`src/lib/booking.js` is the ONE place naming that URL.** `bookingHref(via)`
  gives the visitor's OWN first-touch `utm_*` all the slots when they have any,
  this site's triple (`assessor_site` / `results` / `intro_session`) when they
  do not, always appends `gclid`/`fbclid` from the 90-day cookies, and marks
  the surface with `via=` (`genie_modal`, `genie_tzabar`, `genie_report`).
  ⚠️ The click is reported as `cta_click` / `intro_session_booking` — **never
  `form_submit` or `generate_lead`**, which the shared PPC container counts as
  Google Ads leads on every site that loads it, with no hostname filter. The
  booking conversion belongs to the CRM booking page, which has no GTM
  container yet.
- **WhatsApp:** +972-55-557-8088
- **Ulpan Bayit:** Course pages at ulpan.co.il/course/{level-code}/

---

## URL Parameters

Landing page integration:
```
https://domain.com/?email=user@example.com
```

**Effect:**
- Skips Welcome screen
- Goes directly to Survey (name input)
- Email pre-filled, consent auto-checked
- After name → skips to "Can decode Hebrew?" step

---

## Question Bank

**File:** `/public/data/questions.csv`
**Format:** `Level,Sentence,Option A,Option B,Option C,Option D,Correct`
**Total:** 102 questions (7-13 per level)

Questions are Hebrew fill-in-the-blank or grammar multiple choice.

---

## Design System

### Pixel-Art Theme
- **Shadows:** `4px 4px 0px rgba(0,0,0,0.25)`
- **Borders:** 4px solid on all buttons
- **Font:** "Press Start 2P" for headers
- **Active state:** `translate-y-1` (pressed effect)

### Colors
- Primary: `purple-500/600/700`
- Success: `green-500`
- Danger: `red-500`
- Background: `from-purple-900 via-blue-900 to-indigo-900`

### Layout Breakpoint
- **Desktop (md+):** Genie 1/3, content 2/3
- **Mobile:** Genie top, content below

### Every `<img>` MUST carry `width` and `height`

Give every image its **intrinsic** pixel size as attributes, even when Tailwind
already sizes it (`h-auto`, `w-auto`, `max-w-xs`, `w-[1024px]`). The attributes
don't fight the classes — the browser derives an aspect ratio from them and
reserves the box before the file arrives, then the CSS still decides the
rendered size.

Skipping this is how `https://assessor.ulpan.co.il/` earned a Google Search
Console **"CLS issue: more than 0.25 (mobile)"** in Sept 2026 (field CLS 0.38).
The mobile welcome screen is especially unforgiving: the content block is
*bottom-anchored* (a `flex-1` spacer above a `flex-shrink-0` block), so an image
that gains height at the top of it shoves the whole block **up** the viewport.
`great assessor2.png` is 1024x740 = 231px tall at `max-w-xs`, and it moved
everything 216px on arrival — 0.30 of the 0.31 total CLS on its own.

Two traps worth knowing before you debug one of these:

- **Lighthouse's root-cause attribution lies here.** It labelled both shifts
  "Web font loaded" and named the Open Sans woff2. Blocking Google Fonts
  entirely left CLS at 0.302-0.308 — unchanged. Always isolate by *blocking the
  suspect resource* and re-measuring before you believe the attribution.
- **A local `npm run build` + `serve` won't show the shift** unless you throttle.
  Reproduce with a mobile emulation + Slow 4G + 4x CPU and a
  `PerformanceObserver` on `layout-shift`; the entries' `sources[].previousRect`
  / `currentRect` tell you exactly which box moved and by how much.

Current intrinsic sizes: `great-assessor.webp` 1024x740, `genie.webp`
864x1184, `brand/logo-full-320.png` 667x129. **Re-export an asset, update the
attributes.**

### Ship page images as WebP, and preload the hero

The two big images are **WebP q80**, not PNG. They were PNGs until Sept 2026 and
cost 601KB + 804KB; as WebP they are 94KB + 41KB -- a 90% cut with no visible
difference (checked at true display size, 3x zoom, and by PSNR over a flattened
background: 33dB title, 41dB genie). There is no lossless option worth taking:
these are AI-generated art with ~85,000 unique colours, so palette quantisation
is lossy and truecolour PNG recompression comes out *larger* than the source.

Two traps if you re-export:

- **Do not downscale.** Both are already sized for a 3x phone
  (`great-assessor` 1024px for a 320 CSS px box, `genie` 864px for 393). They
  look oversized only if you forget DPR.
- **PSNR on raw RGBA is meaningless here.** WebP rewrites the RGB channel under
  fully-transparent pixels, which drags the number to ~16dB while the image is
  in fact pristine. Flatten over the background colour first, then compare.

`vite.config.js` carries a small `preloadHero()` plugin. The hero is the LCP
element but is imported from JS, so the preload scanner never sees it and the
download cannot start until the bundle has parsed -- that was **6.7s** of an
18.8s mobile LCP. The plugin finds the content-hashed asset in the bundle and
injects `<link rel="preload" as="image">`. It **throws** if it cannot find the
asset, so renaming the hero fails the build instead of silently losing the
preload; update `SOURCE` in the plugin when you rename it.

`vercel.json` sets `max-age=31536000, immutable` on `/assets/*`. Everything was
previously served `max-age=0, must-revalidate` -- including content-hashed
files, which are safe to cache forever by construction. Only `headers` is set
there, so Vercel's auto-detected Vite build and SPA routing are untouched.

Measured effect of the two changes together, throttled Pixel 5 (Slow 4G, 4x
CPU), local production builds: **LCP 12.2s -> 2.4s**, CLS unchanged at 0.0038.
(The live page measures higher than the local baseline because of ~1MB of
third-party tags from the GTM container -- that is Roy's, not ours.)

---

## Environment Variables

```env
VITE_FB_PIXEL_ID=your_pixel_id
VITE_GA_MEASUREMENT_ID=your_ga4_id
VITE_SUPABASE_URL=https://svgdyrsfxcausecwrgbc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Running Locally

```bash
cd web
npm install
npm run dev
# Opens at http://localhost:5173/ (or next available port)
```

**Test with email param:**
```
http://localhost:5173/?email=test@example.com
```

**Dev-only Stats Dashboard:**
```
http://localhost:5173/?stats
```
Analytics page showing funnel, level distribution, traffic sources, question performance, and more. Only accessible in development mode (`import.meta.env.DEV`).

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `App.jsx` | Phase management, layouts, URL params |
| `Game.jsx` | THE ALGORITHM - all assessment logic |
| `Survey.jsx` | User profiling, 7 steps, saves profile to Supabase |
| `Stats.jsx` | Dev-only analytics dashboard |
| `Results.jsx` | Final display, reports, modals |
| `supabase.js` | All database operations |
| `assessmentReport.js` | Email/text generation |
| `analytics.js` | GA4 + Facebook Pixel |
| `messages.js` | All genie dialogue |
| `levels.js` | Level definitions |
| `questions.csv` | Question bank |

---

## Common Tasks

### Adding a new question
Edit `/public/data/questions.csv`, add row with format:
```
A1.1,"Hebrew sentence",Option A,Option B,Option C,Option D,Correct Answer
```

### Changing genie messages
Edit `src/config/messages.js` - has `fun` and `formal` versions of each message.

### Modifying the algorithm
Edit `src/components/Game.jsx` - look for:
- `processBatchOutcome()` - promote/demote logic
- `startBoundaryBatch()` - question selection
- `finishGame()` - result calculation

### Adding a new survey step
Edit `src/components/Survey.jsx` - add step to switch statement and update flow.

### Tracking a new event
Edit `src/utils/analytics.js` - add function following existing pattern.

---

## Edge Cases Handled

1. **Extreme beginner:** Can't decode OR fails badly at A1.1 → Level "—"
2. **Beyond max level:** Passes B2.1 → Special message, recommend in-person
3. **Just-promoted-then-failed:** Prevents overshoot
4. **Question pool exhausted:** Graceful finish
5. **Abandonment:** Tracked on page unload
6. **Webhook deduplication:** Prevents double-sends on React remounts

---

## Git Repository

- **Remote:** https://github.com/yaronsivan/assessor.git
- **Branch:** main
- **Location:** `/web/` directory contains the git repo

## Magazine round-trip (added 2026-05-31)

When entered as `?source=magazine&issue=<slug>&email=<email>` (from the Ulpan Magazine level-test ad): the email pre-fills (we ask for the NAME first), and the origin is stored on the `assessments.referrer` column (`magazine:<issue>`). On the results page, magazine referrals see "Read this issue at your level →", which calls the serverless function **`api/magazine-link.js`**. That maps `recommendedLevel`/`beyondMaxLevel` → a magazine level (A1..C1) and HMAC-signs a grant token (`{iss,lvl,exp}`, base64url payload + `.` + base64url HMAC-SHA256), returning `https://ulpan-magazine.vercel.app/api/grant?token=...`. The magazine verifies it and unlocks that issue at that level, no sign-in.

**Env:** `MAGAZINE_GRANT_SECRET` (server-side) — must be the SAME value as the magazine's Vercel env. Token format must stay byte-identical to the magazine's `lib/grant.ts`. Env changes need a redeploy.

## אקטואלי round-trip (added 2026-06-09)

Same machinery as the magazine, but for the **אקטואלי** daily-news site (`aktuali.co.il`) and **without an issue** — אקטואלי's level-test ad is on its MAIN page, so the grant carries only a level. When entered as `?source=aktuali&email=<email>`: the email pre-fills, and the origin is stored on `assessments.referrer` (`aktuali`, no issue — `buildReferrer` already handles a source with no issue). On the results page, aktuali referrals (`source === 'aktuali'`) see "Read אקטואלי at your level →", which calls **`api/aktuali-link.js`**. That maps `recommendedLevel`/`beyondMaxLevel` → an אקטואלי level (a1..c1; **a0 is never an output**) and HMAC-signs a grant token (`{lvl,exp}`, base64url payload + `.` + base64url HMAC-SHA256), returning `https://aktuali.co.il/api/grant?token=...`. אקטואלי verifies it (`Sites/aktuali/lib/grant.ts`) and presets the reader's level, no sign-in.

**Env:** `AKTUALI_GRANT_SECRET` (server-side) — must be the SAME value as the aktuali Vercel env. Token format + level banding must stay byte-identical to אקטואלי's `lib/grant.ts` / `lib/assessor-level.ts`. Env changes need a redeploy.
