// Web Audio API Synthesizer for Phone Calls (100% Native, Zero External Assets)

let audioCtx: AudioContext | null = null;
let currentLoopTimer: NodeJS.Timeout | null = null;
let activeOscillators: OscillatorNode[] = [];

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAllCallSounds() {
  if (currentLoopTimer) {
    clearInterval(currentLoopTimer);
    clearTimeout(currentLoopTimer);
    currentLoopTimer = null;
  }
  activeOscillators.forEach(osc => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });
  activeOscillators = [];
}

// Outgoing calling ring (tuuut... tuuut...)
export function playOutgoingRingtone() {
  stopAllCallSounds();
  const ctx = getAudioContext();

  const playBeep = () => {
    try {
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(425, ctx.currentTime);
      osc2.frequency.setValueAtTime(450, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.2);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 1.35);
      osc2.stop(ctx.currentTime + 1.35);

      activeOscillators.push(osc1, osc2);
    } catch (e) {
      console.warn('Outgoing sound error:', e);
    }
  };

  playBeep();
  currentLoopTimer = setInterval(playBeep, 3500);
}

// Incoming call ringtone (Cute melodic soft bell)
export function playIncomingRingtone() {
  stopAllCallSounds();
  const ctx = getAudioContext();

  const melody = [
    { freq: 523.25, time: 0.0, dur: 0.18 }, // C5
    { freq: 659.25, time: 0.2, dur: 0.18 }, // E5
    { freq: 783.99, time: 0.4, dur: 0.22 }, // G5
    { freq: 1046.5, time: 0.65, dur: 0.35 }, // C6
    { freq: 880.0, time: 1.1, dur: 0.22 }, // A5
    { freq: 783.99, time: 1.35, dur: 0.45 }, // G5
  ];

  const playPattern = () => {
    try {
      if (ctx.state === 'suspended') ctx.resume();

      melody.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

        gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + note.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.time);
        osc.stop(ctx.currentTime + note.time + note.dur + 0.05);

        activeOscillators.push(osc);
      });
    } catch (e) {
      console.warn('Incoming sound error:', e);
    }
  };

  playPattern();
  currentLoopTimer = setInterval(playPattern, 2800);
}

// Connected chime
export function playConnectedSound() {
  stopAllCallSounds();
  const ctx = getAudioContext();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

// Call ended chime
export function playEndedSound() {
  stopAllCallSounds();
  const ctx = getAudioContext();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.linearRampToValueAtTime(329.63, ctx.currentTime + 0.3); // E4

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
