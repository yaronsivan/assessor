// src/engine/engine.js
import { LEVELS, capIdx } from "./levels.js";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectLevelQuestions(all, levelIdx, used, n = 5) {
  const lvl = LEVELS[levelIdx];
  const pool = all
    .map((q, i) => ({ ...q, __id: i }))
    .filter(q => q.Level === lvl && !used.has(q.__id));
  return shuffle(pool).slice(0, n);
}

export async function runBoundaryBatch(rl, questions, levelIdx, used, remainingCap) {
  let correct = 0, wrong = 0, asked = 0;
  const batch = selectLevelQuestions(questions, levelIdx, used, Math.min(5, remainingCap));
  if (batch.length === 0) {
    return { outcome: "undecided", asked: 0, correct: 0, wrong: 0 };
  }

  for (const q of batch) {
    if (asked >= remainingCap) break;
    used.add(q.__id);

    console.log(`[${LEVELS[levelIdx]}] ${q.Sentence}`);
    const opts = shuffle(q.options.map((op, idx) => ({ op, idx })));
    opts.forEach((o, i) => console.log(`   ${String.fromCharCode(65 + i)}. ${o.op}`));

    const ans = (await rl.questionAsync("   Your choice (A/B/C/D or S to skip): ")).trim().toUpperCase();
    const chosen = ["A","B","C","D"].includes(ans) ? opts["ABCD".indexOf(ans)].op : null;
    const ok = (chosen !== null) && (chosen === q.Correct);
    console.log(ok ? "   ✅ Correct!\n" : `   ❌ Incorrect. (Correct: ${q.Correct})\n`);

    asked += 1;
    if (ok) correct += 1; else wrong += 1;

    if (wrong >= 2 && correct < 3) return { outcome: "demote", asked, correct, wrong };
    if (correct >= 3 && wrong <= 2) return { outcome: "promote", asked, correct, wrong };
  }

  if (correct >= 3 && wrong <= 2) return { outcome: "promote", asked, correct, wrong };
  if (wrong >= 2 && correct < 3) return { outcome: "demote", asked, correct, wrong };
  return { outcome: "undecided", asked, correct, wrong };
}

export async function askWarmups(rl, questions, levelIdx, used, count = 2) {
  let asked = 0, correct = 0;
  const seq = [capIdx(levelIdx - 1), capIdx(levelIdx - 2)];
  for (const idx of seq) {
    if (asked >= count) break;
    const qset = selectLevelQuestions(questions, idx, used, 1);
    if (qset.length === 0) continue;
    const q = qset[0];
    used.add(q.__id);
    console.log(`[warm-up ${LEVELS[idx]}] ${q.Sentence}`);
    const opts = shuffle(q.options.map((op, i) => ({ op, i })));
    opts.forEach((o, i) => console.log(`   ${String.fromCharCode(65 + i)}. ${o.op}`));
    const ans = (await rl.questionAsync("   Your choice (A/B/C/D or S to skip): ")).trim().toUpperCase();
    const chosen = ["A","B","C","D"].includes(ans) ? opts["ABCD".indexOf(ans)].op : null;
    const ok = (chosen !== null) && (chosen === q.Correct);
    console.log(ok ? "   ✅ Correct!\n" : `   ❌ Incorrect. (Correct: ${q.Correct})\n`);
    asked += 1;
    if (ok) correct += 1;
  }
  return { asked, correct };
}

export async function askSupportive(rl, questions, levelIdx, used, need) {
  let asked = 0;
  const batch = selectLevelQuestions(questions, capIdx(levelIdx), used, need);
  for (const q of batch) {
    used.add(q.__id);
    console.log(`[support ${LEVELS[levelIdx]}] ${q.Sentence}`);
    const opts = shuffle(q.options.map((op, idx) => ({ op, idx })));
    opts.forEach((o, i) => console.log(`   ${String.fromCharCode(65 + i)}. ${o.op}`));
    const ans = (await rl.questionAsync("   Your choice (A/B/C/D or S to skip): ")).trim().toUpperCase();
    const chosen = ["A","B","C","D"].includes(ans) ? opts["ABCD".indexOf(ans)].op : null;
    const ok = (chosen !== null) && (chosen === q.Correct);
    console.log(ok ? "   ✅ Correct!\n" : `   ❌ Incorrect. (Correct: ${q.Correct})\n`);
    asked += 1;
  }
  return asked;
}
