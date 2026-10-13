// Web Audio API procedural synthesis engine for PartyHub
// Zero external sound asset dependencies, instantaneous latency, works across all browsers.

class BaseSoundFX {
  protected ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      this.enabled = saved !== null ? saved === 'true' : true;
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, String(this.enabled));
    }
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, String(val));
    }
  }

  protected initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

// ==========================================
// 🎆 HANABI SOUND ENGINE
// ==========================================
export class HanabiSoundFX extends BaseSoundFX {
  constructor() {
    super('partyhub_sound_hanabi');
  }

  // Dica entregue: sino zen harmônico
  playClue() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, t); // A5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, t); // E6

    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.65);
    osc2.stop(t + 0.65);
  }

  // Carta jogada com sucesso: assovio de foguete ascendente + explosão brilhante
  playFireworkSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Assovio ascendente
    const whistle = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(300, t);
    whistle.frequency.exponentialRampToValueAtTime(1200, t + 0.2);
    whistleGain.gain.setValueAtTime(0.05, t);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    whistle.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistle.start(t);
    whistle.stop(t + 0.22);

    // Explosão cintilante
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = t + 0.18 + idx * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.07, startT);
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startT);
      osc.stop(startT + 0.55);
    });
  }

  // Fusível detonado (erro): estalo grave e zumbido de alarme
  playFuseExplosion() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  // Descarte de carta: sussurro suave de papel/metal
  playCardDiscard() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.12);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Fanfarra de vitória
  playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const pentatonic = [440, 523.25, 659.25, 783.99, 880, 1046.5];
    pentatonic.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = this.ctx.currentTime + idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.08, startT);
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startT);
      osc.stop(startT + 0.65);
    });
  }
}

// ==========================================
// 🔮 ITTO (THE MIND) SOUND ENGINE
// ==========================================
export class IttoSoundFX extends BaseSoundFX {
  constructor() {
    super('partyhub_sound_itto');
  }

  // Toque sutil ao selecionar ou arrastar carta
  playCardTick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // Confirmação de envio de pista
  playClueSubmitted() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  // Revelação de carta
  playCardReveal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, t); // E5
    osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.15); // G5

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  // Rodada bem sucedida (ordem correta)
  playRoundSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = this.ctx.currentTime + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.07, startT);
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startT);
      osc.stop(startT + 0.55);
    });
  }

  // Erro na ordem (perda de vida)
  playRoundFailed() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, t);
    osc1.frequency.linearRampToValueAtTime(110, t + 0.3);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(311.13, t); // Eb (trítono dissonante)
    osc2.frequency.linearRampToValueAtTime(155, t + 0.3);

    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.38);
    osc2.stop(t + 0.38);
  }
}

// ==========================================
// 🃏 CARDS AGAINST HUMANITY SOUND ENGINE
// ==========================================
export class CahSoundFX extends BaseSoundFX {
  constructor() {
    super('partyhub_sound_cah');
  }

  // Selecionar carta da mão
  playCardSelect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.04);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  // Bater carta na mesa (submissão)
  playCardSlam() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Batida grave
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // Ciclar / Descartar 2 cartas
  playDiscard() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [0, 0.06].forEach((delay) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, t + delay);
      osc.frequency.exponentialRampToValueAtTime(250, t + delay + 0.05);

      gain.gain.setValueAtTime(0.05, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + delay);
      osc.stop(t + delay + 0.07);
    });
  }

  // Czar escolhe o vencedor: fanfarra triunfante cômica (Ta-da!)
  playCzarWinner() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const fanfare = [
      { f: 523.25, t: 0.0, d: 0.1 },  // C5
      { f: 659.25, t: 0.1, d: 0.1 },  // E5
      { f: 783.99, t: 0.2, d: 0.12 }, // G5
      { f: 1046.5, t: 0.32, d: 0.4 }, // C6
    ];

    fanfare.forEach(({ f, t: delay, d }) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = this.ctx.currentTime + delay;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, startT);

      gain.gain.setValueAtTime(0.08, startT);
      gain.gain.exponentialRampToValueAtTime(0.0001, startT + d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startT);
      osc.stop(startT + d + 0.05);
    });
  }

  // Início de nova rodada
  playRoundStart() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }
}

// Singletons exportados
export const hanabiAudio = new HanabiSoundFX();
export const ittoAudio = new IttoSoundFX();
export const cahAudio = new CahSoundFX();
