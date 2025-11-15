import { capIdx } from '../engine/levels';
import { getMessage } from '../config/messages';

const TOPIC_BY_LEVEL = [
  "present",       // A1.1
  "inf",           // A1.2
  "past",          // A1.3
  "futBasic",      // A2.1
  "futAdv",        // A2.2
  "passive",       // A2.3
  "fluencyDaily",  // B1.1
  "fluencyComplex",// B1.2
  "fluencyNews",   // B1.3
  "academic"       // B2.1
];

export function runSurvey(name, email, months, weeklyHours, mode, onQuestion, onComplete) {
  const totalHours = Math.max(0, (months || 0) * 4.3 * (weeklyHours || 0));
  const hourIdx = capIdx(Math.floor(totalHours / 80));

  let ptr = hourIdx;
  const asked = new Set();
  const trace = [];
  let steps = 0;
  let lastDir = null;
  let lastTopicIdx = ptr;
  let lastAns = 'u';

  const askNext = () => {
    if (steps >= 3) {
      completeValidation();
      return;
    }

    const topic = TOPIC_BY_LEVEL[ptr] || "academic";
    if (asked.has(topic)) {
      completeValidation();
      return;
    }

    asked.add(topic);
    lastTopicIdx = ptr;

    onQuestion({
      text: getMessage(`validationQuestions.${mode}.${topic}`, mode),
      onAnswer: (ans) => {
        lastAns = ans;
        trace.push({ topic, ans, at: ptr });

        const currDir = (ans === 'y') ? 'up' : 'down';

        // Direction flip on adjacent topics -> stop immediately
        if (lastDir && currDir !== lastDir) {
          completeValidation();
          return;
        }

        // Move pointer
        if (ans === 'y') {
          ptr = capIdx(ptr + 1);
        } else {
          ptr = capIdx(ptr - 1);
        }

        steps += 1;
        lastDir = currDir;

        // Ask next question after a short delay
        setTimeout(askNext, 500);
      }
    });
  };

  const completeValidation = () => {
    // Start-level rule: last 'y' => start at lastTopicIdx; last 'n' => previous level
    let proposed = (lastAns === 'y') ? lastTopicIdx : capIdx(lastTopicIdx - 1);

    // Clamp to ±3 around hours
    if (proposed > hourIdx + 3) proposed = hourIdx + 3;
    if (proposed < hourIdx - 3) proposed = hourIdx - 3;

    onComplete({
      gateFail: false,
      name,
      email,
      totalHours,
      hourIdx,
      startIdx: capIdx(proposed),
      trace,
      extremeBeginner: false
    });
  };

  // Start the validation process
  setTimeout(askNext, 1000);
}
