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

class MockAudioContext {
  static allowResume = false;
  static instances: MockAudioContext[] = [];

  state: AudioContextState = 'suspended';
  currentTime = 12;
  destination = {} as AudioDestinationNode;
  oscillator = new MockOscillator();
  gain = new MockGain();

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

  it('primeCountdownAudio creates and resumes the context synchronously for iOS Chrome', async () => {
    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
    });

    MockAudioContext.allowResume = true;
    primeCountdownAudio(); // synchronous call — no await

    // Flush the microtask queue so the mock's async resume() can settle
    await Promise.resolve();

    MockAudioContext.allowResume = false;
    const player = createCountdownSoundPlayer();
    await player.playBeeps([3]);

    expect(MockAudioContext.instances).toHaveLength(1);
    expect(MockAudioContext.instances[0].resume).toHaveBeenCalledTimes(1);
    expect(MockAudioContext.instances[0].createOscillator).toHaveBeenCalledTimes(1);
  });
});
