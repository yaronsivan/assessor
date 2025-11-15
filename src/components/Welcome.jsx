function Welcome({ onComplete }) {
  return (
    <div className="w-full text-center">
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => onComplete('fun', false)}
          className="
            bg-purple-500 hover:bg-purple-600
            text-white text-xl font-bold
            px-10 py-3 border-4 border-purple-700
            transition-all duration-200
            shadow-pixel hover:shadow-pixel-sm
            active:translate-y-1
          "
        >
          Assess My Hebrew Level!
        </button>

        <button
          onClick={() => onComplete('fun', true)}
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
      </div>
    </div>
  );
}

export default Welcome;
