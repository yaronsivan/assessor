export function generateAssessmentReport(profile, results) {
  const { name, email, months, weeklyHours, trace } = profile;
  const { finishedLevel, recommendedLevel, totalAsked, decisions, questionHistory } = results;

  // Calculate total hours (use profile.totalHours if available)
  const totalHours = profile.totalHours || (months * weeklyHours * 4.3); // ~4.3 weeks per month

  // Map topics to readable abilities
  const topicMap = {
    'present': 'use present tense',
    'inf': 'use infinitives',
    'past': 'discuss past events',
    'futBasic': 'talk about the future',
    'futAdv': 'use advanced future tenses',
    'passive': 'use passive voice',
    'fluencyDaily': 'discuss daily life fluently',
    'fluencyComplex': 'handle complex conversations',
    'fluencyNews': 'understand news and media',
    'academic': 'engage in academic discourse'
  };

  // Extract abilities from validation trace
  const abilities = [];
  const cannotDo = [];

  if (trace && trace.length > 0) {
    trace.forEach(t => {
      const abilityText = topicMap[t.topic] || t.topic;
      if (t.ans === 'y') {
        abilities.push(abilityText);
      } else if (t.ans === 'n') {
        cannotDo.push(abilityText);
      }
    });
  }

  // Extract starting level from decisions
  const startingLevel = questionHistory.length > 0 ? questionHistory.find(q => q.phase === 'boundary')?.level || questionHistory[0]?.level : "Unknown";

  // Group questions by level to track movement
  const levelGroups = {};
  questionHistory.forEach(q => {
    if (q.phase === 'boundary') {
      if (!levelGroups[q.level]) {
        levelGroups[q.level] = { correct: 0, wrong: 0, questions: [] };
      }
      if (q.isCorrect) {
        levelGroups[q.level].correct++;
      } else {
        levelGroups[q.level].wrong++;
      }
      levelGroups[q.level].questions.push(q);
    }
  });

  // Build journey narrative
  let journey = "";
  const levels = Object.keys(levelGroups);
  levels.forEach((level, idx) => {
    const stats = levelGroups[level];
    const decision = decisions[idx] || "";
    const movement = decision.includes("promote") ? "moved to the next level" :
                     decision.includes("demote") ? "moved to the previous level" :
                     "concluded the assessment";

    journey += `At level ${level}, they answered ${stats.correct} questions correctly and ${stats.wrong} incorrectly, so I ${movement}. `;
  });

  // Get wrong answers
  const wrongAnswers = questionHistory.filter(q => !q.isCorrect);

  // Build the report
  let report = `${name}`;
  if (email) report += ` (${email})`;

  // Special case for extreme beginners who never studied
  if (totalAsked === 0) {
    report += ` has never studied Hebrew before. `;
    report += `I started with background questions and they indicated they have no prior experience with the language. `;
    report += `Based on this, I concluded they should start at the very beginning with level ${recommendedLevel}. `;
    report += `No assessment questions were needed.\n`;
    return report;
  }

  report += ` has studied Hebrew for ${months} ${months === 1 ? 'month' : 'months'}`;

  if (weeklyHours > 0) {
    report += `, for ${weeklyHours} ${weeklyHours === 1 ? 'hour' : 'hours'} per week, meaning about ${Math.round(totalHours)} hours in total`;
  }
  report += `. `;

  // Background assessment
  report += `I started with background questions. `;

  if (abilities.length > 0) {
    report += `They reported being able to ${abilities.slice(0, -1).join(', ')}`;
    if (abilities.length > 1) {
      report += ` and ${abilities[abilities.length - 1]}`;
    }
    report += `. `;
  }

  if (cannotDo.length > 0) {
    report += `They indicated they cannot yet `;
    if (cannotDo.length === 1) {
      report += cannotDo[0];
    } else {
      report += `${cannotDo.slice(0, -1).join(', ')} or ${cannotDo[cannotDo.length - 1]}`;
    }
    report += `. `;
  }

  report += `Based on this, I began the test with questions from level ${startingLevel}. `;

  // Journey
  report += journey;

  // Conclusion
  if (finishedLevel === '—') {
    report += `Based on their performance, I concluded they should start at the very beginning with level ${recommendedLevel}. `;
  } else {
    report += `Based on their performance, I concluded they have probably finished level ${finishedLevel} and should start with level ${recommendedLevel}. `;
  }

  report += `Total questions asked: ${totalAsked}.\n\n`;

  // Wrong answers section
  if (wrongAnswers.length > 0) {
    report += `Here are the questions they got wrong and their answers:\n\n`;
    wrongAnswers.forEach((q, idx) => {
      report += `${idx + 1}. Question (${q.level}): "${q.questionText}"\n`;
      report += `   Their answer: "${q.userAnswer}"\n`;
      report += `   Correct answer: "${q.correctAnswer}"\n\n`;
    });
  } else {
    report += `Remarkably, they answered all questions correctly!\n`;
  }

  return report;
}
