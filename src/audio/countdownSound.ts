interface AudioContextConstructor {
  new (): AudioContext;
}

interface AudioWindow extends Window {
  AudioContext?: AudioContextConstructor;
  webkitAudioContext?: AudioContextConstructor;
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
 * On iOS Chrome (WKWebView), WebKit's user-gesture indicator does not propagate
 * through async wrappers, so resume() must be initiated in the synchronous call
 * stack of a touch/click event. Additionally, iOS requires actual audio playback
 * (even a silent buffer) to activate AVAudioSession; resume() alone is not enough.
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

  // resume() is called synchronously here (within the user gesture call stack).
  // Once it resolves, play a silent buffer to activate iOS AVAudioSession.
  void context.resume().then(() => {
    if (context.state === 'running') {
      playSilentBuffer(context);
    }
  });
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
