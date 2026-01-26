# WhatsApp Assessment Integration for Assessor Site

Documentation for integrating WhatsApp assessment option into assessor.ulpan.co.il.

## Overview

We want to offer mobile users on the assessor website the option to complete the Hebrew level assessment via WhatsApp. The flow is:

1. User enters their details (name, email, phone) on assessor site
2. Assessor site creates a lead in the CRM
3. User is shown option: "Continue here" or "Continue on WhatsApp"
4. If WhatsApp chosen → redirected to WhatsApp with pre-filled trigger message

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
│     - Phone number                                               │
│                    ↓                                             │
│  3. On submit: POST /api/contacts → Creates lead in CRM         │
│                    ↓                                             │
│  4. Show choice (mobile only):                                   │
│     ┌─────────────────────────────────────────┐                 │
│     │  Prefer WhatsApp?                       │                 │
│     │                                         │                 │
│     │  [Continue on WhatsApp]  ← green btn    │                 │
│     │  [Continue here]         ← gray btn     │                 │
│     └─────────────────────────────────────────┘                 │
│                    ↓                                             │
│  5a. "Continue here" → Normal web assessment                     │
│  5b. "WhatsApp" → Redirect to WhatsApp                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           ↓ (if WhatsApp)
┌─────────────────────────────────────────────────────────────────┐
│                     WHATSAPP BOT                                 │
│                                                                  │
│  6. User sends trigger message (pre-filled)                      │
│  7. Bot finds existing lead (by phone) or creates new one       │
│  8. Bot starts assessment immediately                            │
│  9. Assessment completes → Results saved to lead                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create Lead via API

Before showing the WhatsApp option, create the lead in the CRM so we capture their details.

### API Endpoint

```
POST https://your-web-dashboard-url/api/contacts
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

### Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `phoneNumber` | **Yes** | - | Phone number (will be normalized to +972 format) |
| `fullName` | No | - | Full name |
| `email` | No | - | Email address |
| `organization` | No | `ulpan_bayit` | Organization slug |
| `source` | No | `manual_entry` | Use `assessor_site` for tracking |
| `pipelineStage` | No | `new` | Use `assessment` since they're starting assessment |
| `studentStatus` | No | `prospect` | Lead status |

### Response

**Success (201):**
```json
{
  "success": true,
  "contact": {
    "id": "uuid-here",
    "phoneNumber": "+972541234567",
    "fullName": "John Doe"
  }
}
```

**Already exists (409):**
```json
{
  "error": "Contact with this phone number already exists",
  "existingId": "uuid-here"
}
```

Note: If contact already exists (409), that's fine - the WhatsApp bot will find them by phone number.

### Example Implementation

```typescript
async function createLead(name: string, email: string, phone: string) {
  const response = await fetch('https://your-dashboard-url/api/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: phone,
      fullName: name,
      email: email,
      organization: 'ulpan_bayit',
      source: 'assessor_site',
      pipelineStage: 'assessment',
    }),
  });

  const data = await response.json();

  // Both 201 (created) and 409 (exists) are OK - proceed to WhatsApp option
  if (response.ok || response.status === 409) {
    return { success: true, leadId: data.contact?.id || data.existingId };
  }

  throw new Error(data.error || 'Failed to create lead');
}
```

---

## Step 2: Show WhatsApp Option (Mobile Only)

After successfully creating the lead, show the WhatsApp option on mobile devices.

### WhatsApp Deep Link

```
https://wa.me/97233763626?text=📝%20Start%20Hebrew%20Assessment
```

**Trigger phrase:** `📝 Start Hebrew Assessment`

The bot recognizes this exact phrase and immediately starts the assessment (no AI delay).

### React Component

```tsx
import { useState } from 'react';

const WHATSAPP_URL = 'https://wa.me/97233763626?text=📝%20Start%20Hebrew%20Assessment';

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

interface Props {
  onContinueHere: () => void;
}

export function WhatsAppChoice({ onContinueHere }: Props) {
  // Only show WhatsApp option on mobile
  const showWhatsAppOption = isMobile();

  if (!showWhatsAppOption) {
    // Desktop: just continue with web assessment
    onContinueHere();
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

      <a
        href={WHATSAPP_URL}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Continue on WhatsApp
      </a>

      <button
        onClick={onContinueHere}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors"
      >
        Continue on this website
      </button>
    </div>
  );
}
```

---

## Full Integration Example

```tsx
import { useState } from 'react';
import { WhatsAppChoice } from './WhatsAppChoice';

type Step = 'details' | 'choice' | 'assessment';

export function AssessmentFlow() {
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [error, setError] = useState('');

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Create lead in CRM
      const response = await fetch('https://your-dashboard-url/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phone,
          fullName: formData.name,
          email: formData.email,
          organization: 'ulpan_bayit',
          source: 'assessor_site',
          pipelineStage: 'assessment',
        }),
      });

      // 201 (created) or 409 (exists) are both OK
      if (response.ok || response.status === 409) {
        // 2. Show WhatsApp choice
        setStep('choice');
      } else {
        const data = await response.json();
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleContinueHere = () => {
    setStep('assessment');
  };

  // Step 1: Collect details
  if (step === 'details') {
    return (
      <form onSubmit={handleDetailsSubmit} className="space-y-4 max-w-sm mx-auto p-6">
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
          <label className="block text-sm font-medium mb-1">Phone (WhatsApp)</label>
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
          Start Assessment
        </button>
      </form>
    );
  }

  // Step 2: Choose WhatsApp or web (mobile only)
  if (step === 'choice') {
    return <WhatsAppChoice onContinueHere={handleContinueHere} />;
  }

  // Step 3: Web assessment
  return <YourExistingAssessmentComponent />;
}
```

---

## Bot Side (Already Implemented)

The WhatsApp bot has been updated to:

1. **Recognize the trigger phrase** `📝 Start Hebrew Assessment`
2. **Find existing lead** by phone number (the one created via API)
3. **Start assessment immediately** (bypasses AI)
4. **Handle paused assessments** (offers to resume if one exists)

The bot is deployed and ready at: `+972-3-376-3626`

---

## Testing

1. Open assessor.ulpan.co.il on a mobile device
2. Fill in name, email, phone
3. Submit → Should see WhatsApp choice modal
4. Click "Continue on WhatsApp"
5. WhatsApp opens with pre-filled message
6. Send the message
7. Bot should immediately respond with first assessment question
8. Check CRM → Lead should exist with `source: assessor_site`

---

## Notes

- The WhatsApp option only shows on mobile devices
- If the phone number already exists in CRM, that's OK - bot finds them by phone
- The trigger phrase includes an emoji to prevent accidental triggers
- Assessment results are saved to the lead record when complete
