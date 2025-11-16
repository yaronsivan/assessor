import { useState, useEffect } from 'react';
import { runSurvey } from '../hooks/useSurvey';
import { getMessage } from '../config/messages';

function Survey({ mode = 'fun', onComplete, onMessageChange }) {
  const [step, setStep] = useState('name');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    canDecode: null,
    hasStudied: null,
    months: '',
    weeklyHours: '',
    validationAnswers: []
  });
  const [currentValidationQuestion, setCurrentValidationQuestion] = useState(null);
  const [emailError, setEmailError] = useState('');

  const isValidEmail = (email) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      setStep('email');
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || isValidEmail(formData.email)) {
      setEmailError('');
      setStep('canDecode');
    } else {
      setEmailError('Please enter a valid email or leave it blank');
    }
  };

  const handleDecodeAnswer = (answer) => {
    setFormData({ ...formData, canDecode: answer });
    if (answer === 'no') {
      onComplete({
        gateFail: true,
        name: formData.name,
        email: formData.email
      });
    } else {
      setStep('hasStudied');
    }
  };

  const handleStudiedAnswer = (answer) => {
    setFormData({ ...formData, hasStudied: answer });
    if (answer === 'no') {
      // Complete immediately for never-studied users
      onComplete({
        gateFail: false,
        name: formData.name,
        email: formData.email,
        months: 0,
        weeklyHours: 0,
        totalHours: 0,
        hourIdx: 0,
        startIdx: 0,
        trace: [{ topic: 'present', ans: 'n', at: 0, reason: 'no prior study' }],
        extremeBeginner: true
      });
    } else {
      setStep('months');
    }
  };

  const handleHoursSubmit = (e) => {
    e.preventDefault();
    const months = parseInt(formData.months || '1', 10);
    const weeklyHours = parseFloat(formData.weeklyHours || '1');
    setStep('validation');

    // Initialize validation questions
    runSurvey(
      formData.name,
      formData.email,
      months,
      weeklyHours,
      mode,
      (question) => setCurrentValidationQuestion(question),
      (profile) => onComplete(profile)
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
      case 'hasStudied':
        return getMessage('survey.hasStudied', mode);
      case 'months':
        return getMessage('survey.studyDetails', mode);
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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com (optional)"
              className={`w-full px-6 py-4 text-xl border-4 ${emailError ? 'border-red-500' : 'border-purple-300'} focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm`}
              autoFocus
            />
            {emailError && (
              <p className="text-red-300 text-center mt-2">{emailError}</p>
            )}
            <button
              type="submit"
              className="mt-6 w-full bg-purple-500 hover:bg-purple-600 text-white text-xl font-bold px-8 py-4 border-4 border-purple-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Continue
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

        {/* Has Studied Question */}
        {step === 'hasStudied' && (
          <div className="flex gap-6">
            <button
              onClick={() => handleStudiedAnswer('yes')}
              className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold px-12 py-6 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => handleStudiedAnswer('no')}
              className="bg-red-500 hover:bg-red-600 text-white text-2xl font-bold px-12 py-6 border-4 border-red-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              No
            </button>
          </div>
        )}

        {/* Study Hours Form */}
        {step === 'months' && (
          <form onSubmit={handleHoursSubmit} className="w-full max-w-md space-y-6">
            <div>
              <label className="block text-white text-lg mb-2 text-center font-semibold">
                How many months have you studied?
              </label>
              <input
                type="number"
                value={formData.months}
                onChange={(e) => setFormData({ ...formData, months: e.target.value })}
                placeholder="e.g., 6"
                min="0"
                className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-white text-lg mb-2 text-center font-semibold">
                How many hours per week on average?
              </label>
              <input
                type="number"
                value={formData.weeklyHours}
                onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                placeholder="e.g., 3"
                min="0"
                step="0.5"
                className="w-full px-6 py-4 text-xl border-4 border-purple-300 focus:border-purple-500 focus:outline-none text-center shadow-pixel-sm"
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

        {/* Validation Questions */}
        {step === 'validation' && currentValidationQuestion && (
          <div className="flex gap-6">
            <button
              onClick={() => handleValidationAnswer('y')}
              className="bg-green-500 hover:bg-green-600 text-white text-2xl font-bold px-12 py-6 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              Yes
            </button>
            <button
              onClick={() => handleValidationAnswer('n')}
              className="bg-red-500 hover:bg-red-600 text-white text-2xl font-bold px-12 py-6 border-4 border-red-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              No
            </button>
            <button
              onClick={() => handleValidationAnswer('u')}
              className="bg-gray-500 hover:bg-gray-600 text-white text-2xl font-bold px-12 py-6 border-4 border-gray-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
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
