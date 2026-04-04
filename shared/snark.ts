export const ON_TURN_CANCEL_SNARKS: readonly string[] = [
  "Changed your mind? The board saw that.",
  "Indecision is a move too - just not a legal one.",
  "The pieces appreciate the stretch. Still your turn.",
  "Bold strategy: hover menacingly, then retreat.",
  "That square was lonely for a reason.",
  "You almost had a plan. Emphasis on almost.",
  "The king is still waiting. No rush. (There is rush.)",
  "Plot twist: nobody moved.",
  "Schrodinger's move: simultaneously brave and cancelled.",
  "We'll call that a rehearsal. Break a leg next time.",
];

export const OFF_TURN_FIDGET_SNARKS: readonly string[] = [
  "Not your move. The board remains unimpressed.",
  "Premature click detected. Please wait your turn.",
  "You can hold your piece, but time still belongs to your opponent.",
  "Strong fidget energy. Still not your turn.",
  "That was a warm-up drag. Come back on your move.",
  "Hands off the clock sidekick, your turn is coming.",
  "You rehearsed the move. The referee says later.",
  "Great motion, wrong timeline.",
];

export const pickRandomWithoutRepeat = (
  lines: readonly string[],
  previous: string | null
): string => {
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  let candidate = lines[Math.floor(Math.random() * lines.length)];
  while (candidate === previous) {
    candidate = lines[Math.floor(Math.random() * lines.length)];
  }
  return candidate;
};
