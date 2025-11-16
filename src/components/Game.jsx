import { useState, useEffect } from 'react';
import Question from './Question';
import { useQuestions } from '../hooks/useQuestions';
import { selectLevelQuestions, evaluateBatch } from '../hooks/useGameEngine';
import { LEVELS, capIdx } from '../engine/levels';
import { getMessage } from '../config/messages';

const MIN_QUESTIONS = 6;
const HARD_CAP = 14;

function Game({ mode = 'fun', profile, onComplete, onPhaseChange, onQuestionChange }) {
  const { questions, loading, error } = useQuestions();
  const [gameState, setGameState] = useState('init');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [batchQuestions, setBatchQuestions] = useState([]);
  const [used, setUsed] = useState(new Set());
  const [levelIdx, setLevelIdx] = useState(0);
  const [totalAsked, setTotalAsked] = useState(0);
  const [batchStats, setBatchStats] = useState({ correct: 0, wrong: 0, asked: 0 });
  const [lastPassedIdx, setLastPassedIdx] = useState(-1);
  const [justPromotedFrom, setJustPromotedFrom] = useState(null);
  const [floorDemotes, setFloorDemotes] = useState(0);
  const [a11WrongTotal, setA11WrongTotal] = useState(0);
  const [decisions, setDecisions] = useState([]);
  const [warmTie, setWarmTie] = useState({ asked: 0, correct: 0 });
  const [feedback, setFeedback] = useState(null);
  const [phase, setPhase] = useState('warmup'); // warmup, boundary, supportive, complete
  const [questionHistory, setQuestionHistory] = useState([]); // Track all questions and answers

  // Notify parent of phase changes
  useEffect(() => {
    if (onPhaseChange) {
      onPhaseChange(phase);
    }
  }, [phase, onPhaseChange]);

  // Notify parent of question count changes
  useEffect(() => {
    if (onQuestionChange) {
      onQuestionChange(totalAsked);
    }
  }, [totalAsked, onQuestionChange]);

  useEffect(() => {
    if (!loading && questions.length > 0 && gameState === 'init') {
      const startLevel = capIdx(profile.startIdx);
      setLevelIdx(startLevel);

      // Check if we should do warmups
      if (!profile.extremeBeginner && startLevel >= 3) {
        startWarmups(startLevel);
      } else {
        setPhase('boundary');
        startBoundaryBatch(startLevel);
      }
      setGameState('playing');
    }
  }, [loading, questions, gameState]);

  const startWarmups = (lvl) => {
    const warmupLevels = [capIdx(lvl - 1), capIdx(lvl - 2)];
    const warmupQs = [];

    for (const wLvl of warmupLevels) {
      const qs = selectLevelQuestions(questions, wLvl, used, 1);
      if (qs.length > 0) {
        warmupQs.push({ ...qs[0], levelIdx: wLvl, isWarmup: true });
      }
    }

    if (warmupQs.length > 0) {
      setBatchQuestions(warmupQs);
      setCurrentQuestionIndex(0);
      setCurrentQuestion(warmupQs[0]);
      setPhase('warmup');
    } else {
      setPhase('boundary');
      startBoundaryBatch(lvl);
    }
  };

  const startBoundaryBatch = (lvl) => {
    const remaining = HARD_CAP - totalAsked;
    const batchQs = selectLevelQuestions(questions, lvl, used, Math.min(5, remaining));

    if (batchQs.length === 0) {
      finishGame();
      return;
    }

    setBatchQuestions(batchQs.map(q => ({ ...q, levelIdx: lvl })));
    setCurrentQuestionIndex(0);
    setCurrentQuestion(batchQs.length > 0 ? { ...batchQs[0], levelIdx: lvl } : null);
    setBatchStats({ correct: 0, wrong: 0, asked: 0 });
    setPhase('boundary');
  };

  const startSupportiveQuestions = (lvl, need) => {
    const supportQs = selectLevelQuestions(questions, lvl, used, need);
    setBatchQuestions(supportQs.map(q => ({ ...q, levelIdx: lvl, isSupportive: true })));
    setCurrentQuestionIndex(0);
    setCurrentQuestion(supportQs.length > 0 ? { ...supportQs[0], levelIdx: lvl, isSupportive: true } : null);
    setPhase('supportive');
  };

  const handleAnswer = (selectedOption) => {
    if (!currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.Correct;

    // Show feedback
    setFeedback({
      isCorrect,
      correctAnswer: currentQuestion.Correct
    });

    // Track this question and answer
    setQuestionHistory(prev => [...prev, {
      questionText: currentQuestion.Sentence,
      level: LEVELS[currentQuestion.levelIdx] || 'Unknown',
      correctAnswer: currentQuestion.Correct,
      userAnswer: selectedOption,
      isCorrect,
      phase: currentQuestion.isWarmup ? 'warmup' : currentQuestion.isSupportive ? 'supportive' : 'boundary'
    }]);

    // Mark question as used
    setUsed(prev => new Set([...prev, currentQuestion.__id]));

    // Update stats based on phase
    if (phase === 'warmup') {
      setWarmTie(prev => ({
        asked: prev.asked + 1,
        correct: prev.correct + (isCorrect ? 1 : 0)
      }));
    } else if (phase === 'boundary') {
      setBatchStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
        asked: prev.asked + 1
      }));
    }

    setTotalAsked(prev => prev + 1);

    // Move to next question after a delay
    setTimeout(() => {
      setFeedback(null);
      handleNextQuestion(isCorrect);
    }, 2000);
  };

  const handleNextQuestion = (wasCorrect) => {
    const nextIdx = currentQuestionIndex + 1;

    if (phase === 'warmup') {
      if (nextIdx < batchQuestions.length) {
        setCurrentQuestionIndex(nextIdx);
        setCurrentQuestion(batchQuestions[nextIdx]);
      } else {
        // Warmups done, start boundary batch
        setPhase('boundary');
        startBoundaryBatch(levelIdx);
      }
      return;
    }

    if (phase === 'boundary') {
      // Check if we should end the batch early
      const stats = { ...batchStats };
      if (wasCorrect) stats.correct += 1;
      else stats.wrong += 1;
      stats.asked += 1;

      const outcome = evaluateBatch(stats.correct, stats.wrong, stats.asked);

      if ((outcome === 'demote' || outcome === 'promote') || nextIdx >= batchQuestions.length || totalAsked + 1 >= HARD_CAP) {
        // Batch complete, process outcome
        processBatchOutcome(outcome, stats);
        return;
      }

      // Continue with next question in batch
      setCurrentQuestionIndex(nextIdx);
      setCurrentQuestion(batchQuestions[nextIdx]);
      return;
    }

    if (phase === 'supportive') {
      if (nextIdx < batchQuestions.length && totalAsked < HARD_CAP) {
        setCurrentQuestionIndex(nextIdx);
        setCurrentQuestion(batchQuestions[nextIdx]);
      } else {
        finishGame();
      }
      return;
    }
  };

  const processBatchOutcome = (outcome, stats) => {
    const decision = `${LEVELS[levelIdx]}[+${stats.correct}/-${stats.wrong}]→${outcome}`;
    setDecisions(prev => [...prev, decision]);

    if (outcome === 'promote') {
      setJustPromotedFrom(levelIdx);
      setLastPassedIdx(Math.max(lastPassedIdx, levelIdx));

      if (levelIdx >= LEVELS.length - 1 || totalAsked >= HARD_CAP) {
        finishGame();
        return;
      }

      const newLevel = levelIdx + 1;
      setLevelIdx(newLevel);
      setTimeout(() => startBoundaryBatch(newLevel), 1000);
      return;
    }

    if (outcome === 'demote') {
      // Floor guard
      if (levelIdx === 0) {
        const newFloorDemotes = floorDemotes + 1;
        const newA11Wrong = a11WrongTotal + stats.wrong;
        setFloorDemotes(newFloorDemotes);
        setA11WrongTotal(newA11Wrong);

        if (newFloorDemotes >= 2 || newA11Wrong >= 5) {
          finishGame(true); // extreme floor finalize
          return;
        }
      }

      // If we just attempted one above the last passed && failed => finalize
      if (justPromotedFrom !== null && levelIdx === justPromotedFrom + 1) {
        finishGame();
        return;
      }

      const newLevel = Math.max(0, levelIdx - 1);
      setLevelIdx(newLevel);
      setJustPromotedFrom(null);
      setTimeout(() => startBoundaryBatch(newLevel), 1000);
      return;
    }

    // Undecided
    if (warmTie.asked >= 2 && warmTie.correct === 0) {
      setLastPassedIdx(Math.max(lastPassedIdx, levelIdx - 1));
    } else {
      setLastPassedIdx(Math.max(lastPassedIdx, levelIdx - 1));
    }
    finishGame();
  };

  const finishGame = (extremeFloorFinalize = false) => {
    let finishedIdx = lastPassedIdx;
    let startNextIdx = Math.max(0, finishedIdx + 1);

    if (extremeFloorFinalize || profile.extremeBeginner) {
      finishedIdx = -1;
      startNextIdx = 0;
    }

    // Check if we need supportive questions
    if (!extremeFloorFinalize && !profile.extremeBeginner && totalAsked < MIN_QUESTIONS) {
      const need = Math.min(MIN_QUESTIONS - totalAsked, HARD_CAP - totalAsked);
      startSupportiveQuestions(Math.max(0, startNextIdx - 1), need);
      return;
    }

    // Game complete
    onComplete({
      finishedLevel: finishedIdx >= 0 ? LEVELS[finishedIdx] : '—',
      finishedIdx,
      recommendedLevel: LEVELS[startNextIdx],
      recommendedIdx: startNextIdx,
      totalAsked,
      decisions,
      questionHistory
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-2xl text-white">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-2xl text-red-300">Oops! I had trouble loading the questions. Please refresh and try again.</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-2xl text-white">Processing your results...</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto max-w-4xl">
      {/* Progress indicator - hidden on mobile */}
      <div className="text-center mb-3 hidden md:block">
        <div className="inline-block bg-white/20 px-6 py-2 border-4 border-white/40 shadow-pixel-sm">
          <span className="text-white text-lg font-bold">
            Question {totalAsked + 1}
          </span>
        </div>
      </div>

      <Question
        question={currentQuestion}
        onAnswer={handleAnswer}
        feedback={feedback}
        disabled={feedback !== null}
      />
    </div>
  );
}

export default Game;
