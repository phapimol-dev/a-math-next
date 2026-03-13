class GameSounds {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playTurnSound() {
    // A quick, clean "ping"
    this.playTone(880, 'sine', 0.15, 0.1);
  }

  playWinSound() {
    // Happy major arpeggio
    this.playTone(523.25, 'triangle', 0.1, 0.1); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.1), 100); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.1, 0.1), 200); // G5
    setTimeout(() => this.playTone(1046.50, 'triangle', 0.4, 0.1), 300); // C6
  }

  playLossSound() {
    // Somber minor descending
    this.playTone(440, 'sine', 0.2, 0.1); // A4
    setTimeout(() => this.playTone(415.30, 'sine', 0.2, 0.1), 200); // G#4
    setTimeout(() => this.playTone(392, 'sine', 0.5, 0.1), 400); // G4
  }
}

export const sounds = new GameSounds();
