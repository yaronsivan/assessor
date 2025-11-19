import { useState } from 'react';
import Header from './components/Header';
import Genie from './components/Genie';
import Welcome from './components/Welcome';
import Story from './components/Story';
import Survey from './components/Survey';
import GateFail from './components/GateFail';
import Game from './components/Game';
import Results from './components/Results';
import titleImage from './assets/the great assessor.png';
import { getMessage } from './config/messages';

const PHASES = {
  WELCOME: 'welcome',
  STORY: 'story',
  SURVEY: 'survey',
  GATE_FAIL: 'gate_fail',
  GAME: 'game',
  RESULTS: 'results'
};

function App() {
  const [phase, setPhase] = useState(PHASES.WELCOME);
  const [profile, setProfile] = useState(null);
  const [gameResults, setGameResults] = useState(null);
  const [mode, setMode] = useState('fun'); // 'fun' or 'formal'
  const [gamePhase, setGamePhase] = useState('boundary'); // warmup, boundary, supportive
  const [questionCount, setQuestionCount] = useState(0);
  const [surveyMessage, setSurveyMessage] = useState(null);

  const handleWelcomeComplete = (selectedMode, showStory = false) => {
    setMode(selectedMode);
    if (showStory) {
      setPhase(PHASES.STORY);
    } else {
      setPhase(PHASES.SURVEY);
    }
  };

  const handleStoryComplete = () => {
    setPhase(PHASES.SURVEY);
  };

  const handleSurveyComplete = (surveyProfile) => {
    setProfile(surveyProfile);
    if (surveyProfile.gateFail) {
      setPhase(PHASES.GATE_FAIL);
    } else if (surveyProfile.extremeBeginner) {
      // Skip game for extreme beginners, go straight to results
      setGameResults({
        finishedLevel: '—',
        finishedIdx: -1,
        recommendedLevel: 'Aleph (A1.1)',
        recommendedIdx: 0,
        totalAsked: 0,
        decisions: [],
        questionHistory: []
      });
      setPhase(PHASES.RESULTS);
    } else {
      setPhase(PHASES.GAME);
    }
  };

  const handleGameComplete = (results) => {
    setGameResults(results);
    setPhase(PHASES.RESULTS);
  };

  const handleRestart = () => {
    setPhase(PHASES.WELCOME);
    setProfile(null);
    setGameResults(null);
    setMode('fun');
  };

  const getGenieMessage = () => {
    switch (phase) {
      case PHASES.WELCOME:
        return mode === 'fun'
          ? "Greetings! I am the GREAT ASSESSOR! I have been summoned because someone seeks to know their Hebrew level. Please, I beg you - let me assess your Hebrew level! It's the only way I can set myself free from this lamp!!!"
          : "Welcome to the Hebrew Level Assessment Tool. I will evaluate your Hebrew proficiency through a series of questions and provide you with an accurate level placement.";
      case PHASES.SURVEY:
        return surveyMessage;
      case PHASES.GATE_FAIL:
        return mode === 'fun'
          ? "Ah, I see... You're not quite ready for me yet. But fear not! Come back when you've learned the letters, and I'll be here, waiting in my lamp..."
          : "Thank you for your interest. This assessment requires knowledge of the Hebrew alphabet. Please practice reading Hebrew letters and return when you're ready.";
      case PHASES.GAME:
        if (gamePhase === 'warmup') {
          return getMessage('game.warmup', mode);
        }
        if (gamePhase === 'supportive') {
          return getMessage('game.supportive', mode);
        }
        // Get playful messages array and rotate through them
        const messages = getMessage(`game.playful.${mode}`, mode);
        if (Array.isArray(messages)) {
          return messages[questionCount % messages.length];
        }
        return messages;
      case PHASES.RESULTS:
        if (gameResults && gameResults.finishedLevel === '—') {
          return getMessage('results.beginner', mode, { name: profile?.name });
        }
        return getMessage('results.discovered', mode, { name: profile?.name });
      default:
        return null;
    }
  };

  const genieMessage = getGenieMessage();

  // Full-screen story mode
  if (phase === PHASES.STORY) {
    return <Story mode={mode} onComplete={handleStoryComplete} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Desktop Layout (md and up) */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        {/* Left Column - Genie (1/3 width) */}
        <div className="w-1/3">
          <Genie animated={phase === PHASES.GAME} />
        </div>

        {/* Right Column - Content (2/3 width) */}
        <div className="w-2/3 flex flex-col justify-between p-4 overflow-hidden">
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            {/* Headline - only on welcome screen */}
            {phase === PHASES.WELCOME && (
              <div className="mb-2 flex-shrink-0">
                <img
                  src={titleImage}
                  alt="The Great Assessor"
                  className="mx-auto w-full max-w-md h-auto filter drop-shadow-2xl"
                />
              </div>
            )}

            {/* Genie Message Box */}
            {genieMessage && phase !== PHASES.RESULTS && (
              <div className="mb-3 bg-white text-gray-800 border-4 border-gray-800 px-4 py-3 shadow-pixel flex-shrink-0 mx-auto w-3/4">
                <p className="text-lg text-center leading-snug font-bold">
                  {genieMessage}
                </p>
              </div>
            )}

            {/* Phase Content */}
            <div className="flex-shrink-0 overflow-y-auto w-full">
              <div className="w-full px-4">
                {phase === PHASES.WELCOME && (
                  <Welcome onComplete={handleWelcomeComplete} />
                )}
                {phase === PHASES.SURVEY && (
                  <Survey mode={mode} onComplete={handleSurveyComplete} onMessageChange={setSurveyMessage} />
                )}
                {phase === PHASES.GATE_FAIL && (
                  <GateFail mode={mode} profile={profile} onRestart={handleRestart} />
                )}
                {phase === PHASES.GAME && (
                  <Game
                    mode={mode}
                    profile={profile}
                    onComplete={handleGameComplete}
                    onPhaseChange={setGamePhase}
                    onQuestionChange={setQuestionCount}
                  />
                )}
                {phase === PHASES.RESULTS && (
                  <Results mode={mode} profile={profile} results={gameResults} onRestart={handleRestart} />
                )}
              </div>
            </div>
          </div>

          {/* Footer in right column */}
          <div className="flex-shrink-0 text-center py-3">
            <p className="font-pixel text-white/60 text-sm tracking-wider leading-relaxed">
              THE GREAT ASSESSOR V0.3.7<br/>© 2025
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Layout (below md) */}
      <div className="flex-1 md:hidden flex flex-col overflow-y-auto">
        {phase === PHASES.GAME ? (
          <>
            {/* Game mode: Top section with genie and message in 1:2 columns */}
            <div className="flex flex-shrink-0">
              <div className="w-1/3">
                <Genie animated={true} />
              </div>
              <div className="w-2/3 p-2 flex flex-col justify-center gap-2">
                {/* Question number */}
                <div className="inline-block bg-white/20 px-4 py-1 border-4 border-white/40 shadow-pixel-sm">
                  <span className="text-white text-sm font-bold">
                    Question {questionCount + 1}
                  </span>
                </div>

                {genieMessage && phase !== PHASES.RESULTS && (
                  <div className="bg-white text-gray-800 border-4 border-gray-800 px-3 py-2 shadow-pixel">
                    <p className="text-sm text-center leading-snug font-bold">
                      {genieMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Game questions - full width below */}
            <div className="flex-1 p-4">
              <Game
                mode={mode}
                profile={profile}
                onComplete={handleGameComplete}
                onPhaseChange={setGamePhase}
                onQuestionChange={setQuestionCount}
              />
            </div>
          </>
        ) : (
          <>
            {/* Non-game modes: Genie as background with content on top */}
            <div className="relative flex-1 flex flex-col">
              {/* Genie as background */}
              <div className="absolute top-0 left-0 right-0 z-0 pt-8">
                <Genie animated={false} />
              </div>

              {/* Spacer to push content down */}
              <div className="flex-1 z-0"></div>

              {/* Content overlay - anchored to bottom */}
              <div className="relative z-10 p-4 flex-shrink-0">
                {/* Headline - only on welcome screen */}
                {phase === PHASES.WELCOME && (
                  <div className="mb-4">
                    <img
                      src={titleImage}
                      alt="The Great Assessor"
                      className="mx-auto w-full max-w-xs h-auto filter drop-shadow-2xl"
                    />
                  </div>
                )}

                {/* Genie Message Box */}
                {genieMessage && phase !== PHASES.RESULTS && (
                  <div className="mb-4 bg-white text-gray-800 border-4 border-gray-800 px-4 py-3 shadow-pixel">
                    <p className="text-base text-center leading-snug font-bold">
                      {genieMessage}
                    </p>
                  </div>
                )}

                {/* Phase Content */}
                <div className="mb-4">
                  {phase === PHASES.WELCOME && (
                    <Welcome onComplete={handleWelcomeComplete} />
                  )}
                  {phase === PHASES.SURVEY && (
                    <Survey mode={mode} onComplete={handleSurveyComplete} onMessageChange={setSurveyMessage} />
                  )}
                  {phase === PHASES.GATE_FAIL && (
                    <GateFail mode={mode} profile={profile} onRestart={handleRestart} />
                  )}
                  {phase === PHASES.RESULTS && (
                    <Results mode={mode} profile={profile} results={gameResults} onRestart={handleRestart} />
                  )}
                </div>

                {/* Footer */}
                <div className="text-center py-3">
                  <p className="font-pixel text-white/60 text-xs tracking-wider leading-relaxed">
                    THE GREAT ASSESSOR V0.3.7<br/>© 2025
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
