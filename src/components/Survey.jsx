import { useState, useEffect } from 'react';
import { runSurvey } from '../hooks/useSurvey';
import { getMessage } from '../config/messages';
import { trackAssessmentStarted } from '../utils/analytics';
import { saveAssessmentStart, updateAssessmentProfile } from '../lib/supabase';

function Survey({ mode = 'fun', onComplete, onMessageChange, onAssessmentIdChange }) {
  const [step, setStep] = useState('name');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    consent: false,
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

  const isValidEmail = (email) => {
    if (!email) return false; // Email is now required
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
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

    // Save to Supabase first (this creates the assessment record)
    const assessmentId = await saveAssessmentStart(formData.name, formData.email);
    if (assessmentId && onAssessmentIdChange) {
      onAssessmentIdChange(assessmentId);
    }

    // Send to webhook
    try {
      await fetch('https://hook.eu1.make.com/v9y7wnw4apbtyqlexiy5au316rm8fhoj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          consent: formData.consent,
          timestamp: new Date().toISOString(),
          eventType: 'user_started'
        })
      });
    } catch (error) {
      console.error('Failed to send webhook:', error);
      // Continue anyway - don't block user from proceeding
    } finally {
      setIsSubmittingWebhook(false);
    }

    // Track assessment started
    trackAssessmentStarted();

    setStep('canDecode');
  };

  const handleDecodeAnswer = (answer) => {
    setFormData({ ...formData, canDecode: answer });
    if (answer === 'no') {
      // Complete immediately for users who can't decode - treat as complete beginners
      onComplete({
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
      (profile) => onComplete({
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
      (profile) => onComplete({
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
              placeholder="Enter your name"
              className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
              autoFocus
            />
            <button
              type="submit"
              className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-8 py-4 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Continue
            </button>
          </form>
        )}

        {/* Email Input */}
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
            />

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
