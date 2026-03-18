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
const MAX_GAIN = 0.05;

let sharedAudioContext: AudioContext | null = null;

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
 * Synchronous unlock — must be called directly from a user gesture handler.
 *
 * On iOS Chrome (WKWebView), both the silent-buffer playback and resume() must
 * happen in the synchronous call stack of the click/touch event. Using .then()
 * defers work to a microtask that is outside the gesture window on older iOS.
 *
 * Correct order (matches Howler.js / Tone.js):
 *   1. playSilentBuffer() — schedules audio, signals "audio intent" to iOS
 *   2. resume()           — transitions the context from suspended → running
 */
export function primeCountdownAudio(): void {
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

  const context = sharedAudioContext;

  if (context.state === 'running') {
    return;
  }

  // iOS routes Web Audio through the "ambient" channel by default, which can
  // be silenced by the OS. Setting type = "playback" switches to the media
  // channel. Requires iOS 17+ / Safari 17+; ignored elsewhere.
  const nav = navigator as NavigatorWithAudioSession;
  if (nav.audioSession) {
    nav.audioSession.type = 'playback';
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
