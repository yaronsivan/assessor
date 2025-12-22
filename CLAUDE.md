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
│   │   ├── LevelAssessmentModal.jsx   # WhatsApp/Cal.com booking
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
- Assessment booking modal (WhatsApp vs Cal.com)

---

## Integrations

### Supabase
- **Table:** `assessments`
- **Tracks:** Full user journey, all Q&A, decisions, time spent, actions
- **Functions:**
  - `saveAssessmentStart()` - Create record
  - `updateAssessmentProgress()` - Track questions
  - `saveAssessmentComplete()` - Final results
  - `trackResultsAction()` - Button clicks
  - `trackAbandonment()` - Page exits

### Make.com Webhooks
1. **User Started:** `v9y7wnw4apbtyqlexiy5au316rm8fhoj`
2. **Results:** `obn5ra3f86v4s4eqg6bp661yeeqv04u2`
3. **Contact Form:** `8xynd14g6qgte9sgole2rocaq3y5k3hm`

### Analytics
- **GA4:** AssessmentStarted, AssessmentCompleted, ViewCourses, etc.
- **Facebook Pixel:** PageView, Lead (on completion), Contact events

### External Services
- **Cal.com:** In-person assessment booking
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

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `App.jsx` | Phase management, layouts, URL params |
| `Game.jsx` | THE ALGORITHM - all assessment logic |
| `Survey.jsx` | User profiling, 7 steps |
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
