export function generateEmailContent(profile, results) {
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const userName = capitalizeFirstLetter(profile?.name || 'friend');
  const { recommendedLevel, finishedLevel, beyondMaxLevel } = results;

  // Get the detailed analysis in a more conversational tone
  const analysis = generateEmailAnalysis(profile, results);

  // Extract level code for URLs
  const getLevelCode = (levelName) => {
    const match = levelName.match(/\(([^)]+)\)/);
    if (!match) return 'a-1-1';
    const parts = match[1].match(/([A-Z])(\d)\.(\d)/);
    if (!parts) return 'a-1-1';
    const letter = parts[1].toLowerCase();
    const num1 = parts[2];
    const num2 = parts[3];
    return `${letter}-${num1}-${num2}`;
  };

  const levelCode = getLevelCode(recommendedLevel);
  const inPersonCourseUrl = `https://ulpan.co.il/course/${levelCode}/`;
  const onlineCourseUrl = `https://ulpan.co.il/course/o-${levelCode}/`;
  const assessmentBookingUrl = 'https://cal.com/ulpan-bayit-level-assessments/20-minute-hebrew-level-assessment';
  const whatsappUrl = `https://wa.me/972555578088?text=${encodeURIComponent(`Hi! My name is ${userName} and I just finished the level test online. I got level ${recommendedLevel}. I'd like to get more info and to set up an in-person level assessment. Toda!`)}`;

  // Build the HTML email - fully compact to avoid whitespace issues in email clients
  let nextStepsText;
  if (beyondMaxLevel) {
    nextStepsText = `Impressive! Based on our assessment, you've mastered content through our highest standard level, <strong>${finishedLevel}</strong>. At your advanced level, we recommend scheduling a personal assessment with one of our experienced teachers. They'll help determine whether our ${finishedLevel} course is the right fit to polish your skills, or if a more customized learning path would better serve your goals.`;
  } else if (finishedLevel === '—') {
    nextStepsText = `Based on our assessment, we recommend you start with level <strong>${recommendedLevel}</strong>.`;
  } else {
    nextStepsText = `Based on our assessment, it looks like you've completed level <strong>${finishedLevel}</strong> and are ready to start level <strong>${recommendedLevel}</strong>.`;
  }

  let email = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your Hebrew Level Assessment Results</title></head><body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #000000; margin: 0; padding: 0;"><div style="max-width: 600px; margin: 0; padding: 0;"><p style="margin: 1em 0;">Dear ${userName},</p><p style="margin: 1em 0;">Thank you for taking the time to complete our online level assessment! We really appreciate it.</p><p style="margin: 1em 0;">Below is a detailed analysis of how we determined your recommended starting level.</p><hr style="border: none; border-top: 1px solid #ccc; margin: 2em 0;"><p style="margin: 1em 0;"><strong>ASSESSMENT ANALYSIS</strong></p>${analysis}<hr style="border: none; border-top: 1px solid #ccc; margin: 2em 0;"><p style="margin: 1em 0;"><strong>NEXT STEPS</strong></p><p style="margin: 1em 0;">${nextStepsText}</p><p style="margin: 1em 0;"><strong>If this feels right to you, here are your next steps:</strong></p><p style="margin: 1em 0;"><strong>📚 View Course Options:</strong><br>• <a href="${inPersonCourseUrl}" style="color: #0066cc;">In-Person Classes</a><br>• <a href="${onlineCourseUrl}" style="color: #0066cc;">Online Classes</a></p><p style="margin: 1em 0;"><strong>📅 Not Sure if This is Right?</strong><br>No problem! Schedule a FREE in-person level assessment with one of our amazing teachers:<br>• <a href="${assessmentBookingUrl}" style="color: #0066cc;">Book Online Assessment</a><br>• <a href="${whatsappUrl}" style="color: #25D366;">Contact us via WhatsApp</a></p><p style="margin: 1em 0;">We're here to help you on your Hebrew learning journey!</p><hr style="border: none; border-top: 1px solid #ccc; margin: 2em 0;"><p style="margin: 1em 0;"><strong>Best regards,</strong><br>The Ulpan Bayit Team</p><p style="margin: 1em 0;">🌐 <a href="https://ulpan.co.il" style="color: #0066cc;">ulpan.co.il</a><br>📞 <a href="tel:+97233004070" style="color: #0066cc;">03-3004070</a><br>💬 <a href="https://wa.me/972555578088" style="color: #25D366;">WhatsApp: 055-557-8088</a></p></div></body></html>`;

  return email;
}

function generateEmailAnalysis(profile, results) {
  const { months, weeklyHours, trace, knowledgeSource, fluencyLevel, directHours } = profile;
  const { finishedLevel, recommendedLevel, totalAsked, decisions, questionHistory, beyondMaxLevel } = results;

  // Level descriptions
  const levelDescriptions = {
    "Aleph (A1.1)": "the alphabet, cursive and block letters, the present tense, basic conversational skills, and building verbal and nominal sentences",
    "Aleph+ (A1.2)": "the infinitive, all verb categories in the present tense, and the basics of the past tense",
    "Aleph++ (A1.3)": "past tense in all verb categories, advanced sentence structures, modal verbs, and preposition conjugation",
    "Bet (A2.1)": "the future tense, the gerund, and complex sentence connectors (causal, time, consequential)",
    "Bet+ (A2.2)": "advanced future tense conjugations, noun conjugation, nominal verb forms, and conditional sentences",
    "Bet++ (A2.3)": "to finish future forms, work on speaking flow, and prepare for the intermediate level",
    "Gimmel (B1.1)": "to become a real Hebrew speaker - accurately express yourself, take part in conversations, and extract main ideas from texts",
    "Gimmel+ (B1.2)": "to accurately express your dreams and opinions, take part in complex conversations, read the paper, and work in a Hebrew-requiring environment",
    "Gimmel++ (B1.3)": "to expand your vocabulary and grammatical abilities to express yourself more accurately and fluently",
    "Dalet (B2.1)": "academic language, formal writing, reading high-level texts like hard news and popular science, and presenting arguments in a sophisticated manner"
  };

  // Calculate total hours
  const totalHours = profile.totalHours || (months * weeklyHours * 4.3);

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

  // Extract abilities
  const abilities = [];
  const cannotDo = [];

  if (trace && trace.length > 0) {
    trace.forEach(t => {
      const abilityText = topicMap[t.topic] || t.topic;
      if (t.ans === 'y') abilities.push(abilityText);
      else if (t.ans === 'n') cannotDo.push(abilityText);
    });
  }

  // Extract starting level
  const startingLevel = questionHistory.length > 0 ? questionHistory.find(q => q.phase === 'boundary')?.level || questionHistory[0]?.level : "Unknown";

  // Build HTML analysis
  let html = '';

  // Special case for extreme beginners
  if (totalAsked === 0) {
    html += `<p>During the background questions, it became clear that you haven't studied Hebrew before. Based on this, we concluded that you should start at the very beginning with level <strong>${recommendedLevel}</strong>. No assessment questions were needed.</p>`;

    // Add what they'll learn
    const learningContent = levelDescriptions[recommendedLevel];
    if (learningContent) {
      html += `<p>In this level, you'll learn ${learningContent}.</p>`;
    }

    return html;
  }

  // Describe knowledge source
  const sourceDescriptions = {
    'school': 'formal language study (Ulpan, University, or similar)',
    'home': 'growing up in a Hebrew-speaking home',
    'religious': 'Sunday school or synagogue education',
    'streets': 'immersion while living in Israel without formal study'
  };

  const sourceDesc = sourceDescriptions[knowledgeSource] || 'language study';
  html += `<p>Your Hebrew knowledge comes from ${sourceDesc}. `;

  // Study details
  if (knowledgeSource === 'school') {
    if (directHours) {
      html += `You've studied for approximately ${Math.round(totalHours)} hours in total. `;
    } else {
      html += `You've studied for ${months} ${months === 1 ? 'month' : 'months'}`;
      if (weeklyHours > 0) {
        html += `, for ${weeklyHours} ${weeklyHours === 1 ? 'hour' : 'hours'} per week, totaling about ${Math.round(totalHours)} hours`;
      }
      html += `. `;
    }
  } else if (fluencyLevel) {
    const fluencyDescriptions = {
      'a1': 'beginner level (A1) - can understand and use familiar everyday expressions',
      'a2': 'elementary level (A2) - can communicate in simple routine tasks',
      'b1': 'intermediate level (B1) - can deal with most situations while traveling',
      'b2': 'upper intermediate level (B2) - can interact with fluency and spontaneity'
    };
    html += `You self-assessed your fluency as ${fluencyDescriptions[fluencyLevel] || 'intermediate'}. `;
  }
  html += `</p>`;

  // Background assessment
  if (abilities.length > 0 || cannotDo.length > 0) {
    html += `<p>During the background questions, `;

    if (abilities.length > 0) {
      html += `you mentioned you can `;
      if (abilities.length === 1) {
        html += abilities[0];
      } else {
        html += `${abilities.slice(0, -1).join(', ')} and ${abilities[abilities.length - 1]}`;
      }
      html += `. `;
    }

    if (cannotDo.length > 0) {
      html += `You also mentioned you can't yet `;
      if (cannotDo.length === 1) {
        html += cannotDo[0];
      } else {
        html += `${cannotDo.slice(0, -1).join(', ')} or ${cannotDo[cannotDo.length - 1]}`;
      }
      html += `. `;
    }
    html += `</p>`;
  }

  html += `<p>Based on this information, we started the assessment with questions from level ${startingLevel}.</p>`;

  // Simplified summary - just count total correct/wrong per level
  const levelGroups = {};
  questionHistory.forEach(q => {
    if (q.phase === 'boundary') {
      if (!levelGroups[q.level]) {
        levelGroups[q.level] = { correct: 0, wrong: 0 };
      }
      if (q.isCorrect) levelGroups[q.level].correct++;
      else levelGroups[q.level].wrong++;
    }
  });

  const levels = Object.keys(levelGroups);
  if (levels.length > 0) {
    const levelSummaries = levels.map(level => {
      const stats = levelGroups[level];
      return `${stats.correct} correct for ${level}${stats.wrong > 0 ? `, ${stats.wrong} wrong` : ''}`;
    });

    html += `<p>During the assessment, you had ${levelSummaries.join(', ')}. `;
  }

  // Conclusion with what they'll learn
  if (beyondMaxLevel) {
    html += `Based on your performance, you've demonstrated mastery through our highest standard level, <strong>${finishedLevel}</strong>. At this advanced stage, an online test can only tell us so much - we'd love to meet you in person to understand your specific goals and find the perfect fit for your Hebrew journey.</p>`;
  } else if (finishedLevel === '—') {
    html += `Based on your performance, we think you should start with level <strong>${recommendedLevel}</strong>.</p>`;
    // Add what they'll learn in the recommended level
    const learningContent = levelDescriptions[recommendedLevel];
    if (learningContent) {
      html += `<p>In this level, you'll learn ${learningContent}.</p>`;
    }
  } else {
    html += `Based on your performance, we think you've finished level <strong>${finishedLevel}</strong> and should start with level <strong>${recommendedLevel}</strong>.</p>`;
    // Add what they'll learn in the recommended level
    const learningContent = levelDescriptions[recommendedLevel];
    if (learningContent) {
      html += `<p>In this level, you'll learn ${learningContent}.</p>`;
    }
  }

  // Wrong answers
  const wrongAnswers = questionHistory.filter(q => !q.isCorrect);
  if (wrongAnswers.length > 0) {
    html += `<p><strong>Questions you got wrong:</strong></p><ul style="font-size: 14px;">`;
    wrongAnswers.forEach((q, idx) => {
      html += `<li><em>${q.questionText}</em><br>`;
      html += `Your answer: ${q.userAnswer} | Correct answer: ${q.correctAnswer}</li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p><strong>Great job!</strong> You answered all questions correctly!</p>`;
  }

  return html;
}

export function generateAssessmentReport(profile, results) {
  const { name, email, months, weeklyHours, trace, knowledgeSource, fluencyLevel, directHours } = profile;
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

  // Describe knowledge source
  const sourceDescriptions = {
    'school': 'formal language study (Ulpan, University, or similar)',
    'home': 'growing up in a Hebrew-speaking home',
    'religious': 'Sunday school or synagogue education',
    'streets': 'immersion while living in Israel without formal study'
  };

  const sourceDesc = sourceDescriptions[knowledgeSource] || 'language study';
  report += `'s Hebrew knowledge comes from ${sourceDesc}. `;

  // Different descriptions based on knowledge source
  if (knowledgeSource === 'school') {
    if (directHours) {
      report += `They have studied for approximately ${Math.round(totalHours)} hours in total. `;
    } else {
      report += `They have studied for ${months} ${months === 1 ? 'month' : 'months'}`;
      if (weeklyHours > 0) {
        report += `, for ${weeklyHours} ${weeklyHours === 1 ? 'hour' : 'hours'} per week, meaning about ${Math.round(totalHours)} hours in total`;
      }
      report += `. `;
    }
  } else if (fluencyLevel) {
    const fluencyDescriptions = {
      'a1': 'beginner level (A1) - can understand and use familiar everyday expressions',
      'a2': 'elementary level (A2) - can communicate in simple routine tasks',
      'b1': 'intermediate level (B1) - can deal with most situations while traveling',
      'b2': 'upper intermediate level (B2) - can interact with fluency and spontaneity'
    };
    report += `They self-assessed their fluency as ${fluencyDescriptions[fluencyLevel] || 'intermediate'}. `;
  }

  // Background assessment
  report += `I started with background questions. `;

  if (abilities.length > 0) {
    report += `They reported being able to `;
    if (abilities.length === 1) {
      report += abilities[0];
    } else {
      report += `${abilities.slice(0, -1).join(', ')} and ${abilities[abilities.length - 1]}`;
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
