
export const COLORS = {
  warmup: 'warmup',
  work: 'work',
  rest: 'rest',
  stretch: 'rest', // keep green for calm
  idle: 'idle'
}

export function phaseColor(phase) {
  return COLORS[phase] || COLORS.idle;
}

export function formatMMSS(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
