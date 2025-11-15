export const LEVELS = [
  "A1.1","A1.2","A1.3",
  "A2.1","A2.2","A2.3",
  "B1.1","B1.2","B1.3","B2.1"
];

export function capIdx(i) {
  if (Number.isNaN(i)) i = 0;
  return Math.max(0, Math.min(i, LEVELS.length - 1));
}
