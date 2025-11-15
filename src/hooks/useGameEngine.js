import { LEVELS, capIdx } from '../engine/levels';

function shuffle(arr) {
  const newArr = [...arr];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function selectLevelQuestions(all, levelIdx, used, n = 5) {
  const lvl = LEVELS[levelIdx];
  const pool = all
    .filter(q => q.Level === lvl && !used.has(q.__id));
  return shuffle(pool).slice(0, n);
}

export function evaluateBatch(correct, wrong, asked) {
  if (asked === 0) return 'undecided';
  if (wrong >= 2 && correct < 3) return 'demote';
  if (correct >= 3 && wrong <= 2) return 'promote';
  return 'undecided';
}
