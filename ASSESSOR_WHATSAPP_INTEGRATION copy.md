# WhatsApp Assessment Integration for Assessor Site

Documentation for integrating WhatsApp assessment option into assessor.ulpan.co.il.

## Overview

We offer mobile users on the assessor website the option to complete the Hebrew level assessment via WhatsApp instead of on the web. The flow is:

1. User enters their details (name, email, **phone**) on assessor site
2. User chooses "Continue on WhatsApp"
3. Assessor site creates a lead in the CRM (with phone number)
4. CRM **automatically sends WhatsApp template** to invite them to the assessment
5. User receives the template message and replies to start the assessment

**Key benefit:** The user doesn't have to manually open WhatsApp and send a message - they just receive a notification and can reply directly.

## The Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ASSESSOR SITE                                │
│                                                                  │
│  1. User lands on assessor.ulpan.co.il                          │
│                    ↓                                             │
│  2. User fills in details:                                       │
│     - Name                                                       │
│     - Email                                                      │
│     - Phone (WhatsApp number)                                   │
│                    ↓                                             │
│  3. Show choice (mobile only):                                   │
│     ┌─────────────────────────────────────────────┐             │
│     │  How would you like to continue?            │             │
│     │                                             │             │
│     │  [Continue on WhatsApp]  ← green btn        │             │
│     │  [Continue here]         ← gray btn         │             │
│     └─────────────────────────────────────────────┘             │
│                    ↓                                             │
│  4a. "Continue here" → Normal web assessment                     │
│  4b. "WhatsApp" → POST /api/contacts (creates lead + triggers)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (if WhatsApp)
┌─────────────────────────────────────────────────────────────────┐
│                     CRM + BOT SERVICE                            │
│                                                                  │
│  5. Lead created with phone number                               │
│  6. Bot service automatically sends assessment template          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S WHATSAPP                              │
│                                                                  │
│  7. User receives template message inviting to assessment        │
│  8. User replies to start assessment                             │
│  9. Assessment completes → Results saved to lead                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation: Just One API Call

The assessor site only needs to make **one API call** when the user chooses WhatsApp. The CRM handles everything else automatically.

### API Endpoint

```
POST https://web-umber-rho-91.vercel.app/api/contacts
Content-Type: application/json
```

### Request Body

```json
{
  "phoneNumber": "+972541234567",
  "fullName": "John Doe",
  "email": "john@example.com",
  "organization": "ulpan_bayit",
  "source": "assessor_site",
  "pipelineStage": "assessment",
  "studentStatus": "prospect"
}
```

**Important:** The `source: "assessor_site"` triggers the automatic WhatsApp template!

### Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `phoneNumber` | **Yes** | - | WhatsApp phone number (will be normalized to +972 format) |
| `fullName` | No | - | Full name (used in personalized template) |
| `email` | No | - | Email address |
| `organization` | No | `ulpan_bayit` | Organization slug |
| `source` | **Yes** | - | **Must be `assessor_site`** to trigger WhatsApp template |
| `pipelineStage` | No | `new` | Use `assessment` since they're starting assessment |
| `studentStatus` | No | `prospect` | Lead status |

### Response

**Success (200):**
```json
{
  "success": true,
  "contact": {
    "id": "uuid-here",
    "phoneNumber": "+972541234567",
    "fullName": "John Doe"
  },
  "assessmentTriggered": true
}
```

The `assessmentTriggered: true` confirms the WhatsApp template was sent.

**Already exists (409):**
```json
{
  "error": "Contact with this phone number already exists",
  "existingId": "uuid-here"
}
```

If the contact already exists, you can still redirect them to WhatsApp manually (see fallback below).

---

## React Implementation

### Step 1: Details Form (collect name, email, phone)

```tsx
import { useState } from 'react';

type Step = 'details' | 'choice' | 'assessment' | 'whatsapp-sent';

export function AssessmentFlow() {
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Collect details
  if (step === 'details') {
    return (
      <form onSubmit={(e) => { e.preventDefault(); setStep('choice'); }} className="space-y-4 max-w-sm mx-auto p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Hebrew Level Assessment</h1>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded-lg p-3"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full border rounded-lg p-3"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp Number</label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full border rounded-lg p-3"
            placeholder="+972 54 123 4567"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg"
        >
          Continue
        </button>
      </form>
    );
  }

  // Step 2: Choose WhatsApp or web
  if (step === 'choice') {
    return <WhatsAppChoice formData={formData} setStep={setStep} setError={setError} setLoading={setLoading} loading={loading} />;
  }

  // Step 3a: WhatsApp sent confirmation
  if (step === 'whatsapp-sent') {
    return (
      <div className="text-center p-6 max-w-sm mx-auto">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Check your WhatsApp!</h2>
        <p className="text-gray-600 mb-4">
          We've sent you a message to start the assessment.
          Open WhatsApp and reply to begin.
        </p>
        <p className="text-sm text-gray-500">
          Didn't receive it? Make sure {formData.phone} is your WhatsApp number.
        </p>
      </div>
    );
  }

  // Step 3b: Web assessment
  return <YourExistingAssessmentComponent />;
}
```

### Step 2: WhatsApp Choice Component

```tsx
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

interface WhatsAppChoiceProps {
  formData: { name: string; email: string; phone: string };
  setStep: (step: 'details' | 'choice' | 'assessment' | 'whatsapp-sent') => void;
  setError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

function WhatsAppChoice({ formData, setStep, setError, setLoading, loading }: WhatsAppChoiceProps) {
  // Only show WhatsApp option on mobile
  const showWhatsAppOption = isMobile();

  const handleWhatsAppChoice = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://web-umber-rho-91.vercel.app/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phone,
          fullName: formData.name,
          email: formData.email,
          organization: 'ulpan_bayit',
          source: 'assessor_site',  // This triggers the WhatsApp template!
          pipelineStage: 'assessment',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success! WhatsApp template was sent
        setStep('whatsapp-sent');
      } else if (response.status === 409) {
        // Contact already exists - still show success (they'll get the message)
        // Or you could redirect them to WhatsApp manually as a fallback
        setStep('whatsapp-sent');
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueHere = () => {
    // For web assessment, you might still want to create the lead
    // (without source='assessor_site' to avoid triggering WhatsApp)
    setStep('assessment');
  };

  if (!showWhatsAppOption) {
    // Desktop: just continue with web assessment
    handleContinueHere();
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-sm mx-auto">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          {/* WhatsApp icon */}
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">How would you like to continue?</h2>
        <p className="text-gray-600 mb-6">
          The assessment takes about 5 minutes
        </p>
      </div>

      <button
        onClick={handleWhatsAppChoice}
        disabled={loading}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <span>Sending...</span>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Continue on WhatsApp
          </>
        )}
      </button>

      <button
        onClick={handleContinueHere}
        disabled={loading}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
      >
        Continue on this website
      </button>
    </div>
  );
}
```

---

## What Happens After the API Call

When you call `POST /api/contacts` with `source: "assessor_site"`:

1. **Lead is created** in the CRM with all the details
2. **Bot service is notified** automatically
3. **WhatsApp template is sent** to the phone number
4. **User receives** a message like:
   > "Hi John! Ready to discover your Hebrew level? Reply to start your 5-minute assessment. 📝"
5. **User replies** and the assessment begins

The response includes `assessmentTriggered: true` to confirm the template was sent.

---

## Template Configuration

The WhatsApp template used is configured via environment variable:

```
TWILIO_ASSESSMENT_TEMPLATE_SID=HXxxxxxx
```

If not set, it falls back to the default welcome template. To create a custom assessment template:

1. Go to Twilio Console → Messaging → Content Editor
2. Create a new WhatsApp template
3. Get the Content SID (starts with `HX`)
4. Set it in the bot service environment on Railway

---

## Testing

1. Open assessor.ulpan.co.il on a mobile device
2. Fill in name, email, and WhatsApp number
3. Click "Continue"
4. Choose "Continue on WhatsApp"
5. See "Check your WhatsApp!" confirmation
6. Open WhatsApp → Should have received assessment invite
7. Reply to start the assessment
8. Check CRM → Lead should exist with `source: assessor_site`

---

## Important Notes

- **Phone number is required** for the WhatsApp flow
- The `source: "assessor_site"` is what triggers the automatic template
- Templates can be sent outside the 24-hour window (unlike regular messages)
- The WhatsApp option only shows on mobile devices
- Assessment results are saved to the lead record when complete

---

## Assessment Database Sync

WhatsApp assessments are automatically synced to the assessor Supabase database when completed.

### Environment Variables (Bot Service)

Add these to the bot service environment on Railway:

```
ASSESSOR_SUPABASE_URL=https://svgdyrsfxcausecwrgbc.supabase.co
ASSESSOR_SUPABASE_ANON_KEY=<your-anon-key>
TWILIO_ASSESSMENT_TEMPLATE_SID=HXxxxxxx
```

### What Gets Synced

When a WhatsApp assessment completes, a new row is inserted into the assessor's `assessments` table with:

| Field | Value |
|-------|-------|
| `name` | Lead's full name |
| `email` | Email from assessment or lead |
| `session_started_at` | When assessment started |
| `session_completed_at` | When completed |
| `duration_seconds` | Time taken |
| `knowledge_source` | Survey answer |
| `recommended_level` | Final recommended level |
| `total_questions_asked` | Number of questions |
| `device_type` | `'whatsapp'` |
| `referrer` | `'whatsapp_bot'` |

This allows you to see WhatsApp assessments alongside web assessments in any dashboards.

---

## Change History

**Previous approach (deprecated):** User clicked a WhatsApp deep link with pre-filled message containing name/email, bot parsed and merged leads.

**Current approach:** User enters phone, API creates lead and automatically sends WhatsApp template. Simpler and better UX - user just receives a message instead of having to send one.
