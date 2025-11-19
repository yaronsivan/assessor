import { useState } from 'react';

function LevelAssessmentModal({ isOpen, onClose, profile, recommendedLevel }) {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const name = profile?.name || '';
    const level = recommendedLevel || '';
    const message = encodeURIComponent(
      `Hi! My name is ${name} and I just finished the level test online. I got level ${level}. I'd like to get more info and to set up an in-person level assessment. Toda!`
    );
    window.open(`https://wa.me/972555578088?text=${message}`, '_blank');
    onClose();
  };

  const handleCalendly = () => {
    window.open('https://cal.com/ulpan-bayit-level-assessments/20-minute-hebrew-level-assessment', '_blank');
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-purple-100 border-8 border-purple-900 shadow-pixel-lg max-w-2xl w-full">
        {/* Header */}
        <div className="bg-purple-600 border-b-8 border-purple-900 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Schedule Assessment</h2>
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 border-4 border-red-700 shadow-pixel-sm active:translate-y-1 active:shadow-none transition-all"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="space-y-6">
            <p className="text-xl text-purple-900 text-center font-semibold mb-8">
              How would you like to schedule your in-person assessment?
            </p>

            {/* WhatsApp Option */}
            <button
              onClick={handleWhatsApp}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-xl font-bold px-8 py-6 border-4 border-green-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              💬 Contact us via WhatsApp
            </button>

            {/* Cal.com Option */}
            <button
              onClick={handleCalendly}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold px-8 py-6 border-4 border-blue-700 shadow-pixel active:translate-y-1 active:shadow-pixel-sm transition-all"
            >
              📅 Schedule Online
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LevelAssessmentModal;
