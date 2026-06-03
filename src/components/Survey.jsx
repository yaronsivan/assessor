import { useState, useEffect } from 'react';
import Mailcheck from 'mailcheck';
import { runSurvey } from '../hooks/useSurvey';
import { getMessage } from '../config/messages';
import { trackAssessmentStarted } from '../utils/analytics';
import { saveAssessmentStart, updateAssessmentProfile } from '../lib/supabase';

const CRM_API_URL = 'https://web-umber-rho-91.vercel.app/api/contacts';
const VALIDATE_EMAIL_URL = 'https://web-umber-rho-91.vercel.app/api/validate-email';

// Server-side validation: stricter regex + disposable-domain blocklist +
// MX/A record DNS lookup. Returns { valid: boolean, reason?: string }.
// Treats network failures as { valid: true } so a server hiccup doesn't
// block real users — the point is to catch obvious junk, not perfection.
const validateEmailServer = async (email) => {
  try {
    const response = await fetch(VALIDATE_EMAIL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) return { valid: true };
    return await response.json();
  } catch (err) {
    console.error('Email validation error:', err);
    return { valid: true };
  }
};

const readClickCookie = (name) => {
  const m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[2]) : '';
};

// POST a lead to the central CRM. The CRM authenticates assessor.ulpan.co.il
// via its CORS allowlist (no secret needed for the browser path), and the
// `assessor_site` source bypasses the staff-session requirement.
const submitAssessorLead = (fields) => {
  const gclid = readClickCookie('click_gclid');
  const fbclid = readClickCookie('click_fbclid');
  return fetch(CRM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization: 'ulpan_bayit',
      source: 'assessor_site',
      pipelineStage: 'assessment',
      studentStatus: 'prospect',
      ...(gclid ? { gclid } : {}),
      ...(fbclid ? { fbclid } : {}),
      ...fields,
    }),
  });
};

const COUNTRY_CODES = [
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: '+1', flag: '🇺🇸', name: 'USA/Canada' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43', flag: '🇦🇹', name: 'Austria' },
  { code: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'other', flag: '🌍', name: 'Other' },
];

function Survey({ mode = 'fun', onComplete, onMessageChange, onAssessmentIdChange, initialEmail = '', source = '', issue = '' }) {
  const [step, setStep] = useState('name');
  const [formData, setFormData] = useState({
    name: '',
    email: initialEmail,
    phone: '',
    consent: Boolean(initialEmail), // Auto-consent if coming from landing page with email
    canDecode: null,
    knowledgeSource: null, // 'school', 'home', 'religious', 'streets'
    months: '',
    weeklyHours: '',
    totalHours: '',
    fluencyLevel: null, // For non-school sources
    validationAnswers: []
  });
  const [currentValidationQuestion, setCurrentValidationQuestion] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [emailSuggestion, setEmailSuggestion] = useState(null);
  const [isSubmittingWebhook, setIsSubmittingWebhook] = useState(false);
  const [localAssessmentId, setLocalAssessmentId] = useState(null);
  const [countryCode, setCountryCode] = useState('+972');
  const [customCountryCode, setCustomCountryCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Helper to save profile data to Supabase before completing
  const completeWithProfileSave = async (profile) => {
    if (localAssessmentId) {
      await updateAssessmentProfile(localAssessmentId, profile);
    }
    onComplete(profile);
  };

  const isValidEmail = (email) => {
    if (!email) return false; // Email is now required
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  };

  // On mobile the on-screen keyboard can cover the bottom-anchored form.
  // The viewport meta (interactive-widget=resizes-content) handles this on
  // Android, but iOS Safari ignores it — so when an input gains focus we also
  // scroll it to the centre of the (now shorter) visual viewport. The delay
  // lets the keyboard finish animating before we measure where to scroll.
  const scrollInputIntoView = (e) => {
    const el = e.currentTarget;
    setTimeout(() => {
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 300);
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // If email was pre-filled from URL, skip email step entirely
    if (initialEmail) {
      // Save to Supabase and send webhook in background
      const newAssessmentId = await saveAssessmentStart(formData.name, initialEmail, null, source, issue);
      if (newAssessmentId) {
        setLocalAssessmentId(newAssessmentId);
        if (onAssessmentIdChange) {
          onAssessmentIdChange(newAssessmentId);
        }
      }

      // Create a CRM lead immediately on survey start. Fire-and-forget — a
      // failure here shouldn't block the user from continuing the assessment.
      submitAssessorLead({
        fullName: formData.name,
        email: initialEmail,
      }).catch((err) => console.error('CRM lead-creation failed:', err));

      trackAssessmentStarted();

      setStep('canDecode');
    } else {
      setStep('email');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!formData.email) {
      setEmailError('Email is required');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate consent
    if (!formData.consent) {
      setEmailError('Please consent to receive emails and marketing materials');
      return;
    }

    setEmailError('');
    setIsSubmittingWebhook(true);

    // Server-side validation — block disposable / typo / fake-domain
    // addresses before they ever reach the CRM or trigger an email send.
    const validation = await validateEmailServer(formData.email);
    if (!validation.valid) {
      setEmailError(validation.reason || 'Please enter a valid email address');
      setIsSubmittingWebhook(false);
      return;
    }

    // Combine country code and phone number
    const localNumber = phoneNumber.trim().replace(/^0+/, '');
    const finalCountryCode = getFullCountryCode();
    const fullPhone = localNumber ? `${finalCountryCode}${localNumber}` : null;

    // Update formData with the combined phone
    if (fullPhone) {
      setFormData({ ...formData, phone: fullPhone });
    }

    // Save to Supabase first (this creates the assessment record)
    const newAssessmentId = await saveAssessmentStart(formData.name, formData.email, fullPhone, source, issue);
    if (newAssessmentId) {
      setLocalAssessmentId(newAssessmentId);
      if (onAssessmentIdChange) {
        onAssessmentIdChange(newAssessmentId);
      }
    }

    // Create a CRM lead immediately on email submission.
    try {
      await submitAssessorLead({
        fullName: formData.name,
        email: formData.email,
        ...(fullPhone ? { phoneNumber: fullPhone } : {}),
      });
    } catch (error) {
      console.error('CRM lead-creation failed:', error);
    } finally {
      setIsSubmittingWebhook(false);
    }

    // Track assessment started
    trackAssessmentStarted();

    setStep('canDecode');
  };

  const getFullCountryCode = () => {
    if (countryCode === 'other') {
      const custom = customCountryCode.trim();
      return custom.startsWith('+') ? custom : `+${custom}`;
    }
    return countryCode;
  };

  const handleDecodeAnswer = (answer) => {
    setFormData({ ...formData, canDecode: answer });
    if (answer === 'no') {
      // Complete immediately for users who can't decode - treat as complete beginners
      completeWithProfileSave({
        gateFail: false,
        name: formData.name,
        email: formData.email,
        knowledgeSource: 'none',
        months: 0,
        weeklyHours: 0,
        totalHours: 0,
        hourIdx: 0,
        startIdx: 0,
        trace: [{ topic: 'present', ans: 'n', at: 0, reason: 'cannot decode alphabet' }],
        extremeBeginner: true
      });
    } else {
      setStep('knowledgeSource');
    }
  };

  const handleKnowledgeSourceAnswer = (source) => {
    setFormData({ ...formData, knowledgeSource: source });
    if (source === 'school') {
      setStep('studyInput');
    } else {
      setStep('fluency');
    }
  };

  const handleFluencyAnswer = (level) => {
    setFormData({ ...formData, fluencyLevel: level });

    // Map fluency level to approximate hours/level for validation
    const fluencyToHoursMap = {
      'a1': 80,    // ~80 hours = level 1
      'a2': 240,   // ~240 hours = level 3-4
      'b1': 480,   // ~480 hours = level 6-7
      'b2': 800    // ~800 hours = level 9-10
    };

    const estimatedHours = fluencyToHoursMap[level] || 80;
    const months = Math.round(estimatedHours / (4.3 * 3)); // Assume 3 hrs/week average
    const weeklyHours = 3;

    setStep('validation');
    runSurvey(
      formData.name,
      formData.email,
      months,
      weeklyHours,
      mode,
      (question) => setCurrentValidationQuestion(question),
      (profile) => completeWithProfileSave({
        ...profile,
        knowledgeSource: formData.knowledgeSource,
        fluencyLevel: level
      })
    );
  };

  const handleHoursSubmit = (e) => {
    e.preventDefault();

    let months, weeklyHours, totalHours, directHours;

    // Check if user entered total hours directly
    if (formData.totalHours && formData.totalHours.trim() !== '') {
      totalHours = parseFloat(formData.totalHours);
      directHours = true;
      // Estimate months and weekly hours from total
      weeklyHours = 3; // Assume 3 hours per week average
      months = Math.round(totalHours / (4.3 * weeklyHours));
    } else {
      months = parseInt(formData.months || '1', 10);
      weeklyHours = parseFloat(formData.weeklyHours || '1');
      totalHours = months * weeklyHours * 4.3;
      directHours = false;
    }

    setStep('validation');

    // Initialize validation questions
    runSurvey(
      formData.name,
      formData.email,
      months,
      weeklyHours,
      mode,
      (question) => setCurrentValidationQuestion(question),
      (profile) => completeWithProfileSave({
        ...profile,
        knowledgeSource: formData.knowledgeSource,
        totalHours,
        directHours
      })
    );
  };

  const handleValidationAnswer = (answer) => {
    if (currentValidationQuestion && currentValidationQuestion.onAnswer) {
      currentValidationQuestion.onAnswer(answer);
    }
  };

  const getGenieMessage = () => {
    switch (step) {
      case 'name':
        return getMessage('survey.name', mode);
      case 'email':
        return getMessage('survey.email', mode);
      case 'canDecode':
        return getMessage('survey.canDecode', mode);
      case 'knowledgeSource':
        return "I assume you know some Hebrew if you're here. Where is your knowledge from?";
      case 'studyInput':
        return "Tell me about your studies...";
      case 'fluency':
        return "How would you describe your current Hebrew abilities?";
      case 'validation':
        return currentValidationQuestion?.text || "Let me ask you a few questions...";
      default:
        return "";
    }
  };

  // Notify parent of message changes
  useEffect(() => {
    if (onMessageChange) {
      onMessageChange(getGenieMessage());
    }
  }, [step, currentValidationQuestion, mode, onMessageChange]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center">
        {/* Name Input */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="w-full max-w-md">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              onFocus={scrollInputIntoView}
              placeholder="Enter your name"
              className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
              autoFocus
              name="firstName"
              autoComplete="given-name"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck="false"
              inputMode="text"
            />
            <button
              type="submit"
              className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-8 py-4 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Continue
            </button>
          </form>
        )}

        {/* Email + Phone Input */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="w-full max-w-md">
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (emailSuggestion) setEmailSuggestion(null);
              }}
              onFocus={scrollInputIntoView}
              onBlur={(e) => {
                const val = e.target.value.trim();
                if (!val) {
                  setEmailSuggestion(null);
                  return;
                }
                Mailcheck.run({
                  email: val,
                  suggested: (s) => setEmailSuggestion(s.full),
                  empty: () => setEmailSuggestion(null),
                });
              }}
              placeholder="your.email@example.com"
              className={`w-full px-6 py-4 text-xl border-4 ${emailError ? 'border-red-500' : 'border-purple-300'} focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm`}
              autoFocus
              name="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              inputMode="email"
            />
            {emailSuggestion && (
              <p className="text-purple-200 text-center mt-2 text-sm">
                Did you mean{' '}
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, email: emailSuggestion });
                    setEmailSuggestion(null);
                    setEmailError('');
                  }}
                  className="font-bold underline hover:text-white"
                >
                  {emailSuggestion}
                </button>
                ?
              </p>
            )}

            {/* Phone Input (optional) */}
            <label className="block text-white text-sm mt-4 mb-2 font-semibold">
              Phone (optional)
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="px-2 py-4 text-base border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm bg-white min-w-[100px]"
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.code}
                  </option>
                ))}
              </select>
              {countryCode === 'other' && (
                <input
                  type="text"
                  value={customCountryCode}
                  onChange={(e) => setCustomCountryCode(e.target.value)}
                  placeholder="+XX"
                  className="w-20 px-2 py-4 text-base border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm text-center"
                />
              )}
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onFocus={scrollInputIntoView}
                placeholder="54 123 4567"
                className="flex-1 px-4 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none shadow-pixel-sm"
                name="phone"
                autoComplete="tel-national"
                inputMode="tel"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="mt-6 bg-purple-200/20 border-4 border-purple-300/40 p-4 shadow-pixel-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                  className="mt-1 w-5 h-5 border-4 border-purple-500"
                />
                <span className="text-white font-semibold text-left">
                  I consent to receive emails and marketing materials from Ulpan Bayit
                </span>
              </label>
            </div>

            {emailError && (
              <p className="text-red-300 text-center mt-3 font-semibold">{emailError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmittingWebhook}
              className="mt-6 w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white text-xl font-bold px-8 py-4 border-4 border-purple-700 disabled:border-gray-600 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              {isSubmittingWebhook ? 'Submitting...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Can Decode Question */}
        {step === 'canDecode' && (
          <div className="flex gap-6">
            <button
              onClick={() => handleDecodeAnswer('yes')}
              className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold px-12 py-6 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => handleDecodeAnswer('no')}
              className="bg-red-500 hover:bg-red-600 text-white text-2xl font-bold px-12 py-6 border-4 border-red-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              No
            </button>
          </div>
        )}

        {/* Knowledge Source Question */}
        {step === 'knowledgeSource' && (
          <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleKnowledgeSourceAnswer('school')}
              className="bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold px-6 py-4 border-4 border-blue-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Language School<br/><span className="text-sm">(Ulpan, University, etc.)</span>
            </button>
            <button
              onClick={() => handleKnowledgeSourceAnswer('home')}
              className="bg-green-500 hover:bg-green-600 text-white text-lg font-bold px-6 py-4 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Home<br/><span className="text-sm">(My parents speak it)</span>
            </button>
            <button
              onClick={() => handleKnowledgeSourceAnswer('religious')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-lg font-bold px-6 py-4 border-4 border-yellow-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Sunday School or Shul
            </button>
            <button
              onClick={() => handleKnowledgeSourceAnswer('streets')}
              className="bg-purple-500 hover:bg-purple-600 text-white text-lg font-bold px-6 py-4 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              From the Streets<br/><span className="text-sm">(Living in Israel)</span>
            </button>
          </div>
        )}

        {/* Study Input Form */}
        {step === 'studyInput' && (
          <form onSubmit={handleHoursSubmit} className="w-full max-w-md space-y-6">
            <div>
              <label className="block text-white text-lg mb-2 text-center font-semibold">
                How many months have you studied?
              </label>
              <input
                type="number"
                value={formData.months}
                onChange={(e) => setFormData({ ...formData, months: e.target.value, totalHours: '' })}
                onFocus={scrollInputIntoView}
                placeholder="e.g., 6"
                min="0"
                className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
                autoFocus
                disabled={formData.totalHours !== ''}
              />
            </div>
            <div>
              <label className="block text-white text-lg mb-2 text-center font-semibold">
                How many hours per week on average?
              </label>
              <input
                type="number"
                value={formData.weeklyHours}
                onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value, totalHours: '' })}
                onFocus={scrollInputIntoView}
                placeholder="e.g., 3"
                min="0"
                step="0.5"
                className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
                disabled={formData.totalHours !== ''}
              />
            </div>

            <div className="text-center text-white font-semibold">OR</div>

            <div>
              <label className="block text-white text-lg mb-2 text-center font-semibold">
                Total hours studied (if you prefer)
              </label>
              <input
                type="number"
                value={formData.totalHours}
                onChange={(e) => setFormData({ ...formData, totalHours: e.target.value, months: '', weeklyHours: '' })}
                onFocus={scrollInputIntoView}
                placeholder="e.g., 100"
                min="0"
                className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
                disabled={formData.months !== '' || formData.weeklyHours !== ''}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-8 py-4 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Continue
            </button>
          </form>
        )}

        {/* Fluency Question */}
        {step === 'fluency' && (
          <div className="w-full max-w-2xl space-y-4">
            <button
              onClick={() => handleFluencyAnswer('a1')}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-left font-bold px-6 py-4 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              <div className="text-xl mb-1">Beginner (A1)</div>
              <div className="text-sm opacity-90">I know basic words and phrases for everyday situations</div>
            </button>
            <button
              onClick={() => handleFluencyAnswer('a2')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-left font-bold px-6 py-4 border-4 border-blue-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              <div className="text-xl mb-1">Elementary (A2)</div>
              <div className="text-sm opacity-90">I can have simple conversations about familiar topics</div>
            </button>
            <button
              onClick={() => handleFluencyAnswer('b1')}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white text-left font-bold px-6 py-4 border-4 border-yellow-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              <div className="text-xl mb-1">Intermediate (B1)</div>
              <div className="text-sm opacity-90">I can handle most everyday conversations and travel situations</div>
            </button>
            <button
              onClick={() => handleFluencyAnswer('b2')}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white text-left font-bold px-6 py-4 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              <div className="text-xl mb-1">Upper Intermediate (B2)</div>
              <div className="text-sm opacity-90">I can speak fluently and naturally about most topics</div>
            </button>
          </div>
        )}

        {/* Validation Questions */}
        {step === 'validation' && currentValidationQuestion && (
          <div className="flex gap-2 md:gap-6">
            <button
              onClick={() => handleValidationAnswer('y')}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-lg md:text-2xl font-bold px-4 md:px-12 py-4 md:py-6 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => handleValidationAnswer('n')}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-lg md:text-2xl font-bold px-4 md:px-12 py-4 md:py-6 border-4 border-red-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              No
            </button>
            <button
              onClick={() => handleValidationAnswer('u')}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-lg md:text-2xl font-bold px-4 md:px-12 py-4 md:py-6 border-4 border-gray-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Unsure
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Survey;
