import { getMessage } from '../config/messages';

function Results({ mode = 'fun', profile, results, onRestart }) {
  return (
    <div className="max-w-4xl mx-auto">

      <div className="mt-12 bg-white/10 backdrop-blur border-4 border-white/30 p-12 shadow-pixel-lg">
        <h2 className="text-4xl font-bold text-white text-center mb-8">
          Your Results
        </h2>

        <div className="space-y-6">
          {/* Finished Level */}
          <div className="bg-white/20 border-4 border-white/40 p-6 shadow-pixel-sm">
            <p className="text-purple-200 text-lg mb-2 font-semibold">Completed Level:</p>
            <p className="text-5xl font-bold text-white">
              {results.finishedLevel}
              {results.finishedLevel === '—' && (
                <span className="text-2xl text-purple-200 ml-3">(New Learner)</span>
              )}
            </p>
          </div>

          {/* Recommended Start */}
          <div className="bg-purple-500/30 p-6 border-4 border-purple-400 shadow-pixel">
            <p className="text-purple-100 text-lg mb-2 font-semibold">Recommended Starting Level:</p>
            <p className="text-5xl font-bold text-white">
              {results.recommendedLevel}
            </p>
          </div>

          {/* Stats */}
          <div className="bg-white/20 border-4 border-white/40 p-6 text-center shadow-pixel-sm">
            <p className="text-purple-200 text-lg mb-2 font-semibold">Questions Asked</p>
            <p className="text-4xl font-bold text-white">{results.totalAsked}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onRestart}
            className="
              bg-purple-500 hover:bg-purple-600
              text-white text-xl font-bold
              px-10 py-4 border-4 border-purple-700
              shadow-pixel-lg active:translate-y-1 active:shadow-pixel
              transition-all duration-200
            "
          >
            Take Another Test
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-purple-200 text-lg">
            {getMessage('results.thanks', mode)}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Results;
