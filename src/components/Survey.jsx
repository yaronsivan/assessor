import { useState, useEffect } from 'react';
import { runSurvey } from '../hooks/useSurvey';
import { getMessage } from '../config/messages';
import { trackAssessmentStarted } from '../utils/analytics';
import { saveAssessmentStart, updateAssessmentProfile, trackWhatsAppChoice } from '../lib/supabase';

const CRM_API_URL = 'https://web-umber-rho-91.vercel.app/api/contacts';

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

function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function Survey({ mode = 'fun', onComplete, onMessageChange, onAssessmentIdChange, initialEmail = '' }) {
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

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // If email was pre-filled from URL, skip email step entirely
    if (initialEmail) {
      // Save to Supabase and send webhook in background
      const newAssessmentId = await saveAssessmentStart(formData.name, initialEmail);
      if (newAssessmentId) {
        setLocalAssessmentId(newAssessmentId);
        if (onAssessmentIdChange) {
          onAssessmentIdChange(newAssessmentId);
        }
      }

      // Send Make.com webhook (don't await - let it run in background)
      fetch('https://hook.eu1.make.com/v9y7wnw4apbtyqlexiy5au316rm8fhoj', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: initialEmail,
          consent: true,
          timestamp: new Date().toISOString(),
          eventType: 'user_started'
        })
      }).catch(err => console.error('Webhook failed:', err));

      // Note: CRM API call moved to handleWhatsAppChoice - only called when user chooses WhatsApp

      trackAssessmentStarted();

      // On mobile, show WhatsApp choice; on desktop, continue to assessment
      if (isMobile()) {
        setStep('whatsappChoice');
      } else {
        setStep('canDecode');
      }
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

    // Combine country code and phone number
    const localNumber = phoneNumber.trim().replace(/^0+/, '');
    const finalCountryCode = getFullCountryCode();
    const fullPhone = localNumber ? `${finalCountryCode}${localNumber}` : null;

    // Update formData with the combined phone
    if (fullPhone) {
      setFormData({ ...formData, phone: fullPhone });
    }

    // Save to Supabase first (this creates the assessment record)
    const newAssessmentId = await saveAssessmentStart(formData.name, formData.email, fullPhone);
    if (newAssessmentId) {
      setLocalAssessmentId(newAssessmentId);
      if (onAssessmentIdChange) {
        onAssessmentIdChange(newAssessmentId);
      }
    }

    // Send to Make.com webhook (keep existing)
    try {
      await fetch('https://hook.eu1.make.com/v9y7wnw4apbtyqlexiy5au316rm8fhoj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: fullPhone,
          consent: formData.consent,
          timestamp: new Date().toISOString(),
          eventType: 'user_started'
        })
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
    } finally {
      setIsSubmittingWebhook(false);
    }

    // Note: CRM API call moved to handleWhatsAppChoice - only called when user chooses WhatsApp
    // The source: "assessor_site" triggers the WhatsApp template automatically

    // Track assessment started
    trackAssessmentStarted();

    // On mobile, show WhatsApp choice; on desktop, continue to assessment
    if (isMobile()) {
      setStep('whatsappChoice');
    } else {
      setStep('canDecode');
    }
  };

  const handleWhatsAppChoice = async (choice) => {
    // Track the choice in Supabase
    if (localAssessmentId) {
      await trackWhatsAppChoice(localAssessmentId, choice === 'whatsapp');
    }

    if (choice === 'whatsapp') {
      // phoneNumber state is already set from the email step if they entered one
      // Go to WhatsApp phone confirmation/entry step
      setStep('whatsappPhone');
    } else {
      // Continue with web assessment
      setStep('canDecode');
    }
  };

  const getFullCountryCode = () => {
    if (countryCode === 'other') {
      const custom = customCountryCode.trim();
      return custom.startsWith('+') ? custom : `+${custom}`;
    }
    return countryCode;
  };

  const handleWhatsAppPhoneSubmit = async (e) => {
    e.preventDefault();

    const localNumber = phoneNumber.trim().replace(/^0+/, ''); // Remove leading zeros
    const finalCountryCode = getFullCountryCode();

    if (!localNumber) {
      setEmailError('Please enter your phone number');
      return;
    }

    if (countryCode === 'other' && !customCountryCode.trim()) {
      setEmailError('Please enter your country code');
      return;
    }

    // Basic validation: at least 6 digits
    const digitsOnly = localNumber.replace(/\D/g, '');
    if (digitsOnly.length < 6) {
      setEmailError('Please enter a valid phone number');
      return;
    }

    const fullPhone = `${finalCountryCode}${localNumber}`;

    setEmailError('');
    setIsSubmittingWebhook(true);

    // Update formData with the full phone for display later
    setFormData({ ...formData, phone: fullPhone });

    // Call CRM API - source: "assessor_site" triggers the WhatsApp template
    try {
      const readCookie = (name) => {
        const m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]+)'));
        return m ? decodeURIComponent(m[2]) : '';
      };
      const gclid = readCookie('click_gclid');
      const fbclid = readCookie('click_fbclid');

      const response = await fetch(CRM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: fullPhone,
          fullName: formData.name,
          email: formData.email,
          organization: 'ulpan_bayit',
          source: 'assessor_site',
          pipelineStage: 'assessment',
          studentStatus: 'prospect',
          ...(gclid ? { gclid } : {}),
          ...(fbclid ? { fbclid } : {}),
        })
      });

      // Both 200/201 (created) and 409 (exists) are OK
      if (response.ok || response.status === 409) {
        setStep('whatsappSent');
      } else {
        const data = await response.json();
        console.error('CRM API error:', data);
        setEmailError('Failed to send WhatsApp message. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send to CRM:', error);
      setEmailError('Failed to send WhatsApp message. Please try again.');
    } finally {
      setIsSubmittingWebhook(false);
    }
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
      case 'whatsappChoice':
        return "How would you like to continue?";
      case 'whatsappPhone':
        return "What's your WhatsApp number?";
      case 'whatsappSent':
        return "Check your WhatsApp!";
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

        {/* WhatsApp Choice (mobile only) */}
        {step === 'whatsappChoice' && (
          <div className="w-full max-w-md flex flex-col gap-4">
            <p className="text-white text-center mb-2">
              The assessment takes about 5 minutes
            </p>

            <button
              onClick={() => handleWhatsAppChoice('whatsapp')}
              disabled={isSubmittingWebhook}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-xl font-bold px-8 py-4 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {isSubmittingWebhook ? 'Sending...' : 'Continue on WhatsApp'}
            </button>

            <button
              onClick={() => handleWhatsAppChoice('web')}
              disabled={isSubmittingWebhook}
              className="w-full bg-purple-500/50 hover:bg-purple-500/70 text-white text-lg font-bold px-8 py-4 border-4 border-purple-700/50 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Continue on this website
            </button>
          </div>
        )}

        {/* WhatsApp Phone Entry/Confirmation */}
        {step === 'whatsappPhone' && (
          <form onSubmit={handleWhatsAppPhoneSubmit} className="w-full max-w-md">
            <div className="bg-green-500/20 border-4 border-green-500/40 p-4 mb-6 shadow-pixel-sm">
              <div className="flex items-center gap-3 text-white">
                <svg className="w-8 h-8 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <p className="text-sm font-semibold">
                  We'll send you a WhatsApp message to start the assessment
                </p>
              </div>
            </div>

            <label className="block text-white text-sm mb-2 font-semibold">
              Your WhatsApp Number
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
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="54 123 4567"
                className={`flex-1 px-4 py-4 text-xl border-4 ${emailError ? 'border-red-500' : 'border-purple-300'} focus:border-purple-500 focus:outline-none shadow-pixel-sm`}
                autoFocus
              />
            </div>

            {emailError && (
              <p className="text-red-300 text-center mt-3 font-semibold">{emailError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmittingWebhook}
              className="mt-6 w-full bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-xl font-bold px-8 py-4 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all flex items-center justify-center gap-3"
            >
              {isSubmittingWebhook ? 'Sending...' : 'Send me the assessment'}
            </button>

            <button
              type="button"
              onClick={() => setStep('whatsappChoice')}
              disabled={isSubmittingWebhook}
              className="mt-3 w-full text-purple-200 hover:text-white text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          </form>
        )}

        {/* WhatsApp Sent Confirmation */}
        {step === 'whatsappSent' && (
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-700 shadow-pixel">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-lg mb-6">
              We've sent you a WhatsApp message to start the assessment.
              Open WhatsApp and reply to begin!
            </p>
            <p className="text-purple-200 text-sm">
              Didn't receive it? Make sure <span className="font-bold">{formData.phone}</span> is your WhatsApp number.
            </p>
          </div>
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
