import { getMessage } from '../config/messages';

function GateFail({ mode = 'fun', profile, onRestart }) {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div>
        <p className="text-2xl text-white mb-8">
          {profile?.name && `See you soon, ${profile.name}! `}
          Keep practicing and return when you're ready.
        </p>

        <button
          onClick={onRestart}
          className="
            bg-purple-500 hover:bg-purple-600
            text-white text-xl font-bold
            px-8 py-4 border-4 border-purple-700
            shadow-pixel-lg active:translate-y-1 active:shadow-pixel
            transition-all duration-200
          "
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

export default GateFail;
