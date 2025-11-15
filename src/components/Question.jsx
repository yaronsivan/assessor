import { useState, useMemo } from 'react';

function Question({ question, onAnswer, feedback, disabled }) {
  const [hoveredOption, setHoveredOption] = useState(null);

  // Shuffle options - recalculate when question changes
  const shuffledOptions = useMemo(() => {
    function shuffleArray(arr) {
      const newArr = [...arr];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      return newArr;
    }

    const opts = question.options.map((opt, idx) => ({ text: opt, letter: String.fromCharCode(65 + idx) }));
    return shuffleArray(opts);
  }, [question]);

  const getOptionClass = (option) => {
    const baseClass = "w-full text-xl p-4 font-bold transition-all duration-200 border-4";

    if (disabled && feedback) {
      if (option.text === question.Correct) {
        return `${baseClass} bg-green-500 text-white border-green-700 shadow-pixel`;
      }
      if (option.text === feedback.selectedOption && !feedback.isCorrect) {
        return `${baseClass} bg-red-500 text-white border-red-700 shadow-pixel`;
      }
      return `${baseClass} bg-gray-400 text-white border-gray-600 opacity-50`;
    }

    if (hoveredOption === option.text) {
      return `${baseClass} bg-purple-500 text-white border-purple-700 shadow-pixel cursor-pointer`;
    }

    return `${baseClass} bg-white text-gray-800 border-gray-300 hover:shadow-pixel shadow-pixel-sm cursor-pointer active:translate-y-1 active:shadow-none`;
  };

  return (
    <div className="space-y-4">
      {/* Question Text */}
      <div className="bg-white border-4 border-gray-800 p-6 shadow-pixel">
        <p className="text-2xl text-gray-800 text-center font-bold leading-relaxed" dir="rtl">
          {question.Sentence}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {shuffledOptions.map((option, idx) => (
          <button
            key={idx}
            onClick={() => !disabled && onAnswer(option.text)}
            onMouseEnter={() => !disabled && setHoveredOption(option.text)}
            onMouseLeave={() => !disabled && setHoveredOption(null)}
            disabled={disabled}
            className={getOptionClass(option)}
          >
            <div className="flex items-center justify-start gap-3" dir="rtl">
              <span className="text-2xl font-bold">{idx + 1}.</span>
              <span className="text-2xl">{option.text}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`text-center text-2xl font-bold py-6 px-4 border-4 ${
          feedback.isCorrect
            ? 'bg-green-500/20 text-green-100 border-green-500'
            : 'bg-red-500/20 text-red-100 border-red-500'
        } shadow-pixel`}>
          {feedback.isCorrect ? '✅ Correct!' : `❌ Incorrect. The correct answer is: ${feedback.correctAnswer}`}
        </div>
      )}
    </div>
  );
}

export default Question;
