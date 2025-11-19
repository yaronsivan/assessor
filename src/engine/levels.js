export const LEVELS = [
  "Aleph (A1.1)",
  "Aleph+ (A1.2)",
  "Aleph++ (A1.3)",
  "Bet (A2.1)",
  "Bet+ (A2.2)",
  "Bet++ (A2.3)",
  "Gimmel (B1.1)",
  "Gimmel+ (B1.2)",
  "Gimmel++ (B1.3)",
  "Dalet (B2.1)"
];

export function capIdx(i) {
  if (Number.isNaN(i)) i = 0;
  return Math.max(0, Math.min(i, LEVELS.length - 1));
}
