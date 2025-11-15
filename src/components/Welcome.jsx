import { useState } from 'react';

function Welcome({ onComplete }) {
  const [selectedMode, setSelectedMode] = useState('fun');

  return (
    <div className="w-full text-center">
      <div>
        {/* Mode Selection */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => setSelectedMode('fun')}
            className={`
              px-8 py-3 font-bold text-lg transition-all duration-200 border-4
              ${selectedMode === 'fun'
                ? 'bg-purple-500 text-white border-purple-700 shadow-pixel translate-y-0'
                : 'bg-white/20 text-white border-white/40 hover:bg-white/30 shadow-pixel-sm'
              }
            `}
          >
            🧞‍♂️ Fun Mode
          </button>
          <button
            onClick={() => setSelectedMode('formal')}
            className={`
              px-8 py-3 font-bold text-lg transition-all duration-200 border-4
              ${selectedMode === 'formal'
                ? 'bg-blue-500 text-white border-blue-700 shadow-pixel translate-y-0'
                : 'bg-white/20 text-white border-white/40 hover:bg-white/30 shadow-pixel-sm'
              }
            `}
          >
            📋 Formal Mode
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onComplete(selectedMode, false)}
            className="
              bg-purple-500 hover:bg-purple-600
              text-white text-xl font-bold
              px-10 py-3 border-4 border-purple-700
              transition-all duration-200
              shadow-pixel hover:shadow-pixel-sm
              active:translate-y-1
            "
          >
            {selectedMode === 'fun' ? 'Help Me Escape! 🔮' : 'Begin Assessment'}
          </button>

          {selectedMode === 'fun' && (
            <button
              onClick={() => onComplete(selectedMode, true)}
              className="
                bg-purple-900/50 hover:bg-purple-800/70
                text-purple-200 text-xs font-bold
                px-4 py-2 border-4 border-purple-700/50
                transition-all duration-200
                shadow-pixel-sm
                active:translate-y-1
              "
            >
              📜 The Legend of the Assessor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Welcome;
