/**
 * Síntese de áudio minimalista via Web Audio API para micro-recompensa satisfatória.
 * Sem arquivos de áudio externos, funciona offline e sem lag.
 */

export function playSatisfyingClick() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // 1. Tom de clique mecânico (frequência curta com decay rápido)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime); // Tom harmônico
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);

    // 2. Chime suave de recompensa (pequeno sino sutil)
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();

    chime.type = 'sine';
    chime.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.04); // C6 nota aguda suave
    chimeGain.gain.setValueAtTime(0.08, ctx.currentTime + 0.04);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    chime.connect(chimeGain);
    chimeGain.connect(ctx.destination);

    chime.start(ctx.currentTime + 0.04);
    chime.stop(ctx.currentTime + 0.36);
  } catch (err) {
    // Falha silenciosa caso áudio seja bloqueado pelo navegador antes de interação
  }
}
