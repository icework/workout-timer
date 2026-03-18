interface AudioContextConstructor {
  new (): AudioContext;
}

interface AudioWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
}

// navigator.audioSession is an iOS 17+ / experimental API not yet in TS lib types.
interface NavigatorWithAudioSession extends Navigator {
  audioSession?: { type: string };
}

const BEEP_DURATION_SEC = 0.12;
const BEEP_GAP_SEC = 0.16;
const BEEP_FREQUENCY_HZ = 880;
const MAX_GAIN = 0.35;

let sharedAudioContext: AudioContext | null = null;

/**
 * Pre-create the AudioContext without resuming it. Call this on page mount so
 * iOS has time to initialise the internal audio route before resume() is called
 * from a user gesture. Creating and resuming in the same event handler fails on
 * iOS because the audio route hasn't been set up yet.
 */
export function ensureCountdownAudioContext(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const audioWindow = window as AudioWindow;
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextCtor) {
    return;
  }

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextCtor();
  }

  // Set audio session early so iOS routes through the media channel.
  const nav = navigator as NavigatorWithAudioSession;
  if (nav.audioSession) {
    nav.audioSession.type = 'playback';
  }
}

async function getCountdownAudioContext(): Promise<AudioContext | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const audioWindow = window as AudioWindow;
  const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextCtor();
  }

  const context = sharedAudioContext;

  if (context.state === 'suspended') {
    try {
      await context.resume();
    } catch {
      return null;
    }
  }

  return context.state === 'running' ? context : null;
}

/**
 * Play a 1-sample silent buffer through the context.
 * On iOS, resume() alone transitions the JS state to 'running' but does NOT
 * activate the underlying AVAudioSession. Actually scheduling audio (even silent)
 * is what triggers AVAudioSession activation so subsequent oscillators are heard.
 */
function playSilentBuffer(context: AudioContext): void {
  try {
    const buf = context.createBuffer(1, 1, context.sampleRate);
    const src = context.createBufferSource();
    src.buffer = buf;
    src.connect(context.destination);
    src.start(0);
  } catch {
    // Non-fatal — context may still work without the silent buffer.
  }
}

/**
 * Resume the AudioContext — must be called from a user gesture handler.
 *
 * The context should already exist from an earlier ensureCountdownAudioContext()
 * call. On iOS, creating and resuming in the same gesture fails because the audio
 * route hasn't been initialised yet. Splitting creation (mount) from resumption
 * (click) gives iOS the time it needs.
 */
export function primeCountdownAudio(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Ensure context exists (fallback if ensureCountdownAudioContext wasn't called).
  ensureCountdownAudioContext();

  const context = sharedAudioContext;

  if (!context || context.state === 'running') {
    return;
  }

  playSilentBuffer(context);
  void context.resume();
}

export async function unlockCountdownAudio(): Promise<boolean> {
  const context = await getCountdownAudioContext();
  return context !== null;
}

/**
 * Lightweight Web Audio countdown beeps. Playback failures are swallowed so the timer never breaks.
 */
export function createCountdownSoundPlayer() {
  return {
    async playBeeps(seconds: number[]): Promise<void> {
      if (seconds.length === 0) {
        return;
      }

      const context = await getCountdownAudioContext();

      if (!context) {
        return;
      }

      const baseTime = context.currentTime;

      seconds.forEach((_, index) => {
        const startTime = baseTime + index * BEEP_GAP_SEC;
        const endTime = startTime + BEEP_DURATION_SEC;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(BEEP_FREQUENCY_HZ, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(MAX_GAIN, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start(startTime);
        oscillator.stop(endTime);
      });
    },

    async cleanup(): Promise<void> {
      if (!sharedAudioContext) {
        return;
      }

      const contextToClose = sharedAudioContext;
      sharedAudioContext = null;

      try {
        await contextToClose.close();
      } catch {
        // Ignore cleanup failures for already-closed contexts.
      }
    },
  };
}
