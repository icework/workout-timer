import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCountdownSoundPlayer, primeCountdownAudio, unlockCountdownAudio } from './countdownSound';

class MockOscillator {
  type = 'sine';
  frequency = {
    setValueAtTime: vi.fn(),
  };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class MockBufferSource {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
}

class MockAudioContext {
  static allowResume = false;
  static instances: MockAudioContext[] = [];

  state: AudioContextState = 'suspended';
  currentTime = 12;
  sampleRate = 44100;
  destination = {} as AudioDestinationNode;
  oscillator = new MockOscillator();
  gain = new MockGain();
  bufferSource = new MockBufferSource();

  constructor() {
    MockAudioContext.instances.push(this);
  }

  resume = vi.fn(async () => {
    if (!MockAudioContext.allowResume) {
      throw new Error('Audio context is locked until a user gesture');
    }

    this.state = 'running';
  });

  close = vi.fn(async () => {
    this.state = 'closed';
  });

  createOscillator = vi.fn(() => this.oscillator as unknown as OscillatorNode);
  createGain = vi.fn(() => this.gain as unknown as GainNode);
  createBuffer = vi.fn(() => ({}) as AudioBuffer);
  createBufferSource = vi.fn(() => this.bufferSource as unknown as AudioBufferSourceNode);

  static reset() {
    MockAudioContext.allowResume = false;
    MockAudioContext.instances = [];
  }
}

describe('countdown sound player', () => {
  afterEach(async () => {
    await createCountdownSoundPlayer().cleanup();
    MockAudioContext.reset();
    vi.unstubAllGlobals();
  });

  it('reuses an unlocked audio context after navigation into the timer screen', async () => {
    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
    });

    MockAudioContext.allowResume = true;
    await unlockCountdownAudio();

    MockAudioContext.allowResume = false;
    const timerScreenPlayer = createCountdownSoundPlayer();

    await timerScreenPlayer.playBeeps([3]);

    expect(MockAudioContext.instances).toHaveLength(1);
    expect(MockAudioContext.instances[0].resume).toHaveBeenCalledTimes(1);
    expect(MockAudioContext.instances[0].createOscillator).toHaveBeenCalledTimes(1);
    expect(MockAudioContext.instances[0].oscillator.start).toHaveBeenCalledWith(12);
  });

  it('primeCountdownAudio plays silent buffer synchronously before resume for iOS', async () => {
    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
    });

    MockAudioContext.allowResume = true;
    primeCountdownAudio(); // synchronous — silent buffer and resume() both happen here

    // Silent buffer must have been played synchronously (before any await)
    expect(MockAudioContext.instances).toHaveLength(1);
    expect(MockAudioContext.instances[0].createBufferSource).toHaveBeenCalledTimes(1);
    expect(MockAudioContext.instances[0].bufferSource.start).toHaveBeenCalledTimes(1);
    expect(MockAudioContext.instances[0].resume).toHaveBeenCalledTimes(1);

    // Flush microtask queue so the mock's async resume() can settle
    await Promise.resolve();

    MockAudioContext.allowResume = false;
    const player = createCountdownSoundPlayer();
    await player.playBeeps([3]);

    expect(MockAudioContext.instances[0].createOscillator).toHaveBeenCalledTimes(1);
  });
});
