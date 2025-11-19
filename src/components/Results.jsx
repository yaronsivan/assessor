import { useState, useEffect, useRef } from 'react';
import { getMessage } from '../config/messages';
import { generateAssessmentReport, generateEmailContent } from '../utils/assessmentReport';
import CourseSelectionModal from './CourseSelectionModal';
import LevelAssessmentModal from './LevelAssessmentModal';

function Results({ mode = 'fun', profile, results, onRestart }) {
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [showAlgorithmPath, setShowAlgorithmPath] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const webhookSent = useRef(false);

  // Keep report generation for future email use
  const report = generateAssessmentReport(profile, results);
  const emailContent = generateEmailContent(profile, results);

  // Map levels to external system IDs
  const getLevelId = (levelName) => {
    const levelIdMap = {
      "Aleph (A1.1)": 258916,
      "Aleph+ (A1.2)": 258917,
      "Aleph++ (A1.3)": 258918,
      "Bet (A2.1)": 258919,
      "Bet+ (A2.2)": 258920,
      "Bet++ (A2.3)": 533690,
      "Gimmel (B1.1)": 258921,
      "Gimmel+ (B1.2)": 258922,
      "Gimmel++ (B1.3)": 258923,
      "Dalet (B2.1)": 258924
    };
    return levelIdMap[levelName] || null;
  };

  // Send results to Make.com webhook when component mounts - only once
  useEffect(() => {
    if (webhookSent.current) return; // Prevent duplicate sends
    webhookSent.current = true;

    const sendResultsWebhook = async () => {
      try {
        await fetch('https://hook.eu1.make.com/obn5ra3f86v4s4eqg6bp661yeeqv04u2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: profile?.name,
            email: profile?.email,
            recommendedLevel: results.recommendedLevel,
            recommendedLevelId: getLevelId(results.recommendedLevel),
            finishedLevel: results.finishedLevel,
            finishedLevelId: getLevelId(results.finishedLevel),
            emailHTML: emailContent,
            analysis: report,
            totalAsked: results.totalAsked,
            timestamp: new Date().toISOString(),
            eventType: 'assessment_completed'
          })
        });
      } catch (error) {
        console.error('Failed to send results webhook:', error);
      }
    };

    sendResultsWebhook();
  }, []); // Empty dependency array means this runs once when component mounts

  // Map levels to skills based on Ulpan Bayit's curriculum
  const levelSkills = {
    "Aleph (A1.1)": {
      mastered: "nothing yet - you're at the breakthrough level",
      toLearn: "the alphabet, cursive and block letters, the present tense, basic conversational skills, and building verbal and nominal sentences"
    },
    "Aleph+ (A1.2)": {
      mastered: "the alphabet, present tense, and basic conversational skills",
      toLearn: "the infinitive, all verb categories in the present tense, and the basics of the past tense"
    },
    "Aleph++ (A1.3)": {
      mastered: "present tense in all verb categories and basic past tense",
      toLearn: "past tense in all verb categories, advanced sentence structures, modal verbs, and preposition conjugation"
    },
    "Bet (A2.1)": {
      mastered: "past tense conjugations and complex sentence structures",
      toLearn: "the future tense, the gerund, and complex sentence connectors (causal, time, consequential)"
    },
    "Bet+ (A2.2)": {
      mastered: "basic future tense and complex connectors",
      toLearn: "advanced future tense conjugations, noun conjugation, nominal verb forms, and conditional sentences"
    },
    "Bet++ (A2.3)": {
      mastered: "most structures of the language",
      toLearn: "to finish future forms, work on speaking flow, and prepare for the intermediate level"
    },
    "Gimmel (B1.1)": {
      mastered: "the language structures but struggle with expression",
      toLearn: "to become a real Hebrew speaker - accurately express yourself, take part in conversations, and extract main ideas from texts"
    },
    "Gimmel+ (B1.2)": {
      mastered: "how to speak but need higher accuracy and register",
      toLearn: "to accurately express your dreams and opinions, take part in complex conversations, read the paper, and work in a Hebrew-requiring environment"
    },
    "Gimmel++ (B1.3)": {
      mastered: "complex conversations and basic journalistic texts",
      toLearn: "to expand your vocabulary and grammatical abilities to express yourself more accurately and fluently"
    },
    "Dalet (B2.1)": {
      mastered: "fluent spontaneous conversation with native speakers",
      toLearn: "academic language, formal writing, reading high-level texts like hard news and popular science, and presenting arguments in a sophisticated manner"
    }
  };

  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getCompleteMessage = () => {
    const finishedSkills = levelSkills[results.finishedLevel];
    const nextSkills = levelSkills[results.recommendedLevel];
    const userName = capitalizeFirstLetter(profile?.name || 'friend');

    if (results.finishedLevel === '—') {
      // New learner - different message structure
      return `Greetings ${userName}, thanks for letting me assess your level! You're just starting your Hebrew journey, and I recommend you begin with level ${results.recommendedLevel}. In this level, you'll learn ${nextSkills?.toLearn || 'the basics'}. If you think I got it right - you can jump to the courses and schedules below. If not, we're happy to set you up for a free level assessment with one of our amazing teachers.`;
    }

    // Experienced learner
    return `Greetings ${userName}, thanks for letting me assess your level! Based on your responses, it seems you've completed level ${results.finishedLevel} and are ready to start level ${results.recommendedLevel}. You've already mastered ${finishedSkills?.mastered || 'previous material'}, and in the next level you'll learn ${nextSkills?.toLearn || 'new material'}. If you think I got it right - you can jump to the courses and schedules below. If not, we're happy to set you up for a free level assessment with one of our amazing teachers.`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mt-12 bg-white/10 backdrop-blur border-4 border-white/30 p-12 shadow-pixel-lg">
        <h2 className="text-4xl font-bold text-white text-center mb-8">
          Your Results
        </h2>

        {/* Assessment Message */}
        <div className="bg-white/20 border-4 border-white/40 p-8 shadow-pixel-sm mb-8">
          <p className="text-white text-lg leading-relaxed text-center">
            {getCompleteMessage()}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setIsCourseModalOpen(true)}
            className="
              bg-purple-500 hover:bg-purple-600
              text-white text-xl font-bold
              px-10 py-4 border-4 border-purple-700
              shadow-pixel-lg active:translate-y-1 active:shadow-pixel
              transition-all duration-200
            "
          >
            View Courses
          </button>

          <button
            onClick={() => setIsAssessmentModalOpen(true)}
            className="
              bg-blue-500 hover:bg-blue-600
              text-white text-xl font-bold
              px-10 py-4 border-4 border-blue-700
              shadow-pixel-lg active:translate-y-1 active:shadow-pixel
              transition-all duration-200
            "
          >
            Schedule In-Person Assessment
          </button>
        </div>

        {/* Email Preview */}
        <div className="mt-8">
          <button
            onClick={() => setShowEmailPreview(!showEmailPreview)}
            className="
              w-full bg-blue-500/20 hover:bg-blue-500/30
              text-blue-200 text-sm font-bold
              px-6 py-3 border-4 border-blue-500/50
              shadow-pixel-sm active:translate-y-1
              transition-all duration-200
            "
          >
            {showEmailPreview ? '▼ Hide' : '▶'} Email Preview
          </button>

          {showEmailPreview && (
            <div className="mt-4 bg-white border-4 border-blue-500 p-6 shadow-pixel">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Email Content</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(emailContent);
                    alert('Email HTML copied to clipboard!');
                  }}
                  className="
                    bg-blue-500 hover:bg-blue-600
                    text-white text-sm font-bold
                    px-4 py-2 border-4 border-blue-700
                    shadow-pixel-sm active:translate-y-1
                    transition-all duration-200
                  "
                >
                  📋 Copy Email HTML
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-300 max-h-96 overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: emailContent }} />
              </div>
            </div>
          )}
        </div>

        {/* Algorithm Path - For Analysis */}
        <div className="mt-8">
          <button
            onClick={() => setShowAlgorithmPath(!showAlgorithmPath)}
            className="
              w-full bg-yellow-500/20 hover:bg-yellow-500/30
              text-yellow-200 text-sm font-bold
              px-6 py-3 border-4 border-yellow-500/50
              shadow-pixel-sm active:translate-y-1
              transition-all duration-200
            "
          >
            {showAlgorithmPath ? '▼ Hide' : '▶'} Algorithm Path (Analysis)
          </button>

          {showAlgorithmPath && (
            <div className="mt-4 bg-gray-900 border-4 border-yellow-500 p-6 shadow-pixel">
              <h3 className="text-xl font-bold text-yellow-300 mb-4">Assessment Journey</h3>

              <div className="mb-4">
                <p className="text-yellow-200 text-sm font-semibold mb-2">Summary:</p>
                <div className="bg-black/50 p-3 rounded text-white font-mono text-xs space-y-1">
                  <div>Starting Level Index: {results.decisions && results.decisions.length > 0 ? '(determined by warmup)' : '0'}</div>
                  <div>Final Level Index: {results.finishedIdx}</div>
                  <div>Recommended Level Index: {results.recommendedIdx}</div>
                  <div>Total Questions Asked: {results.totalAsked}</div>
                  <div>Total Decisions Made: {results.decisions?.length || 0}</div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-yellow-200 text-sm font-semibold mb-2">Decision Path:</p>
                <div className="bg-black/50 p-3 rounded space-y-2">
                  {results.decisions && results.decisions.length > 0 ? (
                    results.decisions.map((decision, idx) => (
                      <div key={idx} className="text-white font-mono text-xs border-l-4 border-yellow-500 pl-3 py-1">
                        <span className="text-gray-400">{idx + 1}.</span> {decision}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs">No decisions recorded (extreme beginner path)</div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-yellow-200 text-sm font-semibold mb-2">Question History:</p>
                <div className="bg-black/50 p-3 rounded max-h-64 overflow-y-auto">
                  {results.questionHistory && results.questionHistory.length > 0 ? (
                    results.questionHistory.map((q, idx) => (
                      <div key={idx} className="text-xs mb-3 border-b border-gray-700 pb-2">
                        <div className="text-gray-400">Q{idx + 1}: Level {q.levelIdx} ({q.level})</div>
                        <div className="text-white font-mono mt-1">{q.question}</div>
                        <div className={`mt-1 ${q.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          User answered: {q.userAnswer} {q.isCorrect ? '✓' : '✗'}
                        </div>
                        {!q.isCorrect && (
                          <div className="text-yellow-300 text-xs mt-1">Correct: {q.correctAnswer}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs">No question history available</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email notification message */}
        <div className="mt-12 bg-white/20 border-4 border-white/40 p-6 text-center shadow-pixel-sm">
          <p className="text-purple-100 text-lg mb-2 font-semibold">
            📧 Detailed Results Sent to Your Email
          </p>
          <p className="text-purple-200 text-base">
            We've sent a detailed assessment report to <strong>{profile?.email || 'your email'}</strong>.
            <br/>
            Please check your inbox (and spam folder, just in case) and mark us as "not spam" if needed!
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-purple-200 text-lg">
            {getMessage('results.thanks', mode)}
          </p>
        </div>
      </div>

      {/* Modals */}
      <CourseSelectionModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        recommendedLevel={results.recommendedLevel}
      />

      <LevelAssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        profile={profile}
        recommendedLevel={results.recommendedLevel}
      />
    </div>
  );
}

export default Results;
