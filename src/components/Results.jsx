import { useState, useEffect, useRef } from 'react';
import { getMessage } from '../config/messages';
import CourseSelectionModal from './CourseSelectionModal';
import LevelAssessmentModal from './LevelAssessmentModal';
import { trackAssessmentCompleted, trackViewCourses, trackScheduleAssessment, trackEvent } from '../utils/analytics';
import { saveAssessmentComplete, trackResultsAction, trackResultsExit } from '../lib/supabase';

// Track sent webhooks at module level to survive StrictMode remounts
const sentWebhooks = new Set();

const CRM_RESULTS_URL = 'https://web-umber-rho-91.vercel.app/api/email/send-assessment-result';

// Map assessor levels to tzabar-lp-il level ids (Dalet and beyond → almost-native-speakers cohort)
const TZABAR_LEVEL_MAP = {
  'Aleph (A1.1)': 'aleph',
  'Aleph+ (A1.2)': 'aleph-plus',
  'Aleph++ (A1.3)': 'aleph-plus-plus',
  'Bet (A2.1)': 'bet',
  'Bet+ (A2.2)': 'bet-plus',
  'Bet++ (A2.3)': 'bet-plus-plus',
  'Gimmel (B1.1)': 'gimmel',
  'Gimmel+ (B1.2)': 'gimmel',
  'Gimmel++ (B1.3)': 'gimmel',
  'Dalet (B2.1)': 'almost-native-speakers',
};

function getTzabarLevel(results) {
  if (!results) return null;
  if (results.beyondMaxLevel) return 'almost-native-speakers';
  return TZABAR_LEVEL_MAP[results.recommendedLevel] || null;
}

function Results({ mode = 'fun', profile, results, onRestart, assessmentId: propAssessmentId, source = '' }) {
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentId, setAssessmentId] = useState(propAssessmentId);
  const resultsStartTime = useRef(Date.now());

  // Send results to the CRM when the component mounts — only once
  useEffect(() => {
    // Use email as unique key to prevent duplicate sends (survives StrictMode remounts)
    const webhookKey = `assessment_${profile?.email}`;
    if (sentWebhooks.has(webhookKey)) return;
    sentWebhooks.add(webhookKey);

    const sendResultsAndSave = async () => {
      // POST to the CRM. The route upserts a lead by email, stamps the
      // hebrew_level, then enrolls in the assessment_complete automation —
      // the walker fires the results email (step 0 of the assessor drip)
      // within ~60s and continues the Day 1/3/7/14 sequence.
      let webhookResult = { status: 'not_sent', response: null, sentAt: null };
      try {
        const response = await fetch(CRM_RESULTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: profile?.email,
            name: profile?.name,
            phone: profile?.phone || undefined,
            level: results.recommendedLevel,
            organization: 'ulpan_bayit',
          }),
        });

        const responseText = await response.text();
        webhookResult = {
          status: response.ok ? 'success' : `error_${response.status}`,
          response: responseText.substring(0, 500),
          sentAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('CRM results-send failed:', error);
        webhookResult = {
          status: 'failed',
          response: error.message,
          sentAt: new Date().toISOString(),
        };
      }

      // Save to Supabase (with CRM call result) - use existing ID if available
      const id = await saveAssessmentComplete(propAssessmentId, profile, results, webhookResult);
      if (id && !propAssessmentId) {
        setAssessmentId(id);
      }
    };

    sendResultsAndSave();

    // Track assessment completion
    trackAssessmentCompleted(results.recommendedLevel);

    // Set up page exit tracking
    const handleBeforeUnload = () => {
      // This will be called with the assessmentId from closure or state
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []); // Empty dependency array means this runs once when component mounts

  // Track page exit when assessmentId is available
  useEffect(() => {
    if (!assessmentId) return;

    const handleBeforeUnload = () => {
      trackResultsExit(assessmentId, resultsStartTime.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also track on component unmount (e.g., when they click "Start Over")
      trackResultsExit(assessmentId, resultsStartTime.current);
    };
  }, [assessmentId]);

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
    const userName = capitalizeFirstLetter(profile?.name || 'friend');

    // Check if user is beyond our highest level
    if (results.beyondMaxLevel) {
      return (
        <>
          My magical senses tell me that you've completed our highest level, <span className="bg-yellow-300 text-purple-900 px-2 py-1 font-bold">{results.finishedLevel}</span>, and you're beyond our standard curriculum! Want to know why? Check your email for the detailed results! Want your level assessed with a non-genie? Set up a level assessment with one of our HUMAN teachers!
        </>
      );
    }

    if (results.finishedLevel === '—') {
      // New learner - different message structure
      return (
        <>
          My magical senses tell me that you should start with level <span className="bg-yellow-300 text-purple-900 px-2 py-1 font-bold">{results.recommendedLevel}</span>. Want to know why? Check your email for the detailed results! Feel this is right? Check the course schedule for your level below! Want your level assessed with a non-genie? Set up a level assessment with one of our HUMAN teachers!
        </>
      );
    }

    // Experienced learner
    return (
      <>
        My magical senses tell me that you've finished level <span className="bg-yellow-300 text-purple-900 px-2 py-1 font-bold">{results.finishedLevel}</span> and should start with level <span className="bg-yellow-300 text-purple-900 px-2 py-1 font-bold">{results.recommendedLevel}</span>. Want to know why? Check your email for the detailed results! Feel this is right? Check the course schedule for your level below! Want your level assessed with a non-genie? Set up a level assessment with one of our HUMAN teachers!
      </>
    );
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
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
          {source === 'tzabar' && getTzabarLevel(results) && (
            <a
              href={`https://tzabar.ulpan.co.il/?level=${getTzabarLevel(results)}#courses`}
              onClick={() => trackEvent('tzabar_register_click', {
                level: results.recommendedLevel,
                tzabar_level: getTzabarLevel(results),
              })}
              className="
                bg-cyan-500 hover:bg-cyan-600
                text-white text-xl font-bold
                px-10 py-4 border-4 border-cyan-700
                shadow-pixel-lg active:translate-y-1 active:shadow-pixel
                transition-all duration-200
                inline-flex items-center justify-center gap-3 text-center
              "
            >
              Register at Ulpan Bayit
              <span className="px-2 py-1 bg-yellow-300 text-purple-900 text-xs font-bold border-2 border-purple-900">
                Garin Tzabar 10–15% off
              </span>
            </a>
          )}

          {/* Only show View Courses button if not beyond max level */}
          {!results.beyondMaxLevel && (
            <button
              onClick={() => {
                trackViewCourses(results.recommendedLevel);
                trackResultsAction(assessmentId, 'view_courses', { level: results.recommendedLevel });
                setIsCourseModalOpen(true);
              }}
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
          )}

          <button
            onClick={() => {
              trackScheduleAssessment(results.recommendedLevel);
              trackResultsAction(assessmentId, 'schedule_assessment', { level: results.recommendedLevel });
              setIsAssessmentModalOpen(true);
            }}
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

      </div>

      {/* Modals */}
      <CourseSelectionModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        recommendedLevel={results.recommendedLevel}
        assessmentId={assessmentId}
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
