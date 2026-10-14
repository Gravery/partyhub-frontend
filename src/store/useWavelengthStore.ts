import { create } from 'zustand';
import i18n from '../i18n';

export type WavelengthState =
  | 'LOBBY'
  | 'PSYCHIC_PHASE'
  | 'GUESSING_PHASE'
  | 'REVEAL_PHASE'
  | 'GAME_OVER';

export interface WavelengthTheme {
  id: string;
  category?: string;
  left: string;
  right: string;
}

export interface WavelengthHistory {
  round: number;
  psychicId: string;
  psychicName: string;
  theme: WavelengthTheme;
  targetValue: number;
  guessValue: number;
  distance: number;
  points: number;
  clue: string;
}

export interface WavelengthGameState {
  state: WavelengthState;
  language: string;
  players: string[];
  playerNames: Record<string, string>;
  playerReady: Record<string, boolean>;
  playerConnected: Record<string, boolean>;
  leaderId: string;
  currentPsychicIndex: number;
  psychicId: string;
  psychicName: string;
  isPsychic: boolean;
  round: number;
  totalRounds: number;
  currentTheme: WavelengthTheme;
  targetValue: number | null;
  isTargetVisible: boolean;
  dialValue: number;
  lastDialMoverId?: string;
  currentClue: string;
  roundPoints: number;
  teamScore: number;
  history: WavelengthHistory[];
  customThemesCount?: number;
}

// Síntese de áudio Web Audio API para Wavelength
class WavelengthSoundFX {
  private ctx: AudioContext | null = null;
  public enabled = true;
  private lastTickTime = 0;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Clique de engrenagem analógica ao mover o dial
  playDialTick() {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastTickTime < 40) return; // Limita frequência
    this.lastTickTime = now;

    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 + Math.random() * 80, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  // Chime místico do Médium quando uma dica é dada ou o turno começa
  playPsychicChime() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    frequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.55);
    });
  }

  // Fanfarra dourada de acerto exato (4 pontos / Bullseye)
  playBullseye() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [
      { f: 523.25, t: 0.0, d: 0.12 },
      { f: 659.25, t: 0.1, d: 0.12 },
      { f: 783.99, t: 0.2, d: 0.15 },
      { f: 1046.5, t: 0.32, d: 0.5 },
      { f: 1318.51, t: 0.44, d: 0.6 },
    ];

    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, this.ctx.currentTime + n.t);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + n.t);
      osc.stop(this.ctx.currentTime + n.t + n.d + 0.05);
    });
  }

  // Acerto bom (2 ou 3 pontos)
  playGoodGuess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [
      { f: 440, t: 0.0, d: 0.12 },
      { f: 554.37, t: 0.1, d: 0.14 },
      { f: 659.25, t: 0.2, d: 0.35 },
    ];

    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.f, this.ctx.currentTime + n.t);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + n.t);
      osc.stop(this.ctx.currentTime + n.t + n.d + 0.05);
    });
  }

  // Erro (0 pontos)
  playMiss() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [
      { f: 330, t: 0.0, d: 0.18 },
      { f: 293.66, t: 0.15, d: 0.25 },
      { f: 220, t: 0.32, d: 0.4 },
    ];

    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, this.ctx.currentTime + n.t);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + n.t);
      osc.stop(this.ctx.currentTime + n.t + n.d + 0.05);
    });
  }

  // Mecanismo da cortina abrindo (swoosh)
  playShutterOpen() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.36);
  }
}

export const wavelengthSound = new WavelengthSoundFX();

interface WavelengthStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: WavelengthGameState | null;
  errorMsg: string | null;
  soundEnabled: boolean;

  connect: (roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: any) => void;
  toggleReady: () => void;
  setLanguage: (lang: string) => void;
  startGame: () => void;
  giveClue: (clue: string) => void;
  updateDial: (dial: number) => void;
  confirmGuess: () => void;
  nextRound: () => void;
  restartGame: () => void;
  toggleSound: () => void;
  clearError: () => void;
}

let activeRoomId = '';
let activeToken = '';
let reconnectTimeout: any = null;

export const useWavelengthStore = create<WavelengthStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  soundEnabled: true,

  connect: (roomId: string, token: string) => {
    activeRoomId = roomId;
    activeToken = token;

    if (get().socket) {
      get().socket?.close();
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const envWs = import.meta.env.VITE_WS_URL;
    const isBrowser = typeof window !== 'undefined';
    const isExternalHost =
      isBrowser &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    let wsBaseUrl = envWs;
    if (!wsBaseUrl || (isExternalHost && wsBaseUrl.includes('localhost'))) {
      if (isBrowser) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsBaseUrl = `${protocol}//${window.location.host}/ws`;
      }
    }

    const currentLang = i18n.language?.startsWith('pt') ? 'pt' : 'en';
    const fullWsUrl = `${wsBaseUrl}/wavelength/${roomId}?token=${encodeURIComponent(token)}&lang=${encodeURIComponent(currentLang)}`;

    try {
      const ws = new WebSocket(fullWsUrl);

      ws.onopen = () => {
        set({
          isConnected: true,
          isReconnecting: false,
          reconnectAttempt: 0,
          errorMsg: null,
        });

        // Sincroniza idioma preferido com a sala
        get().setLanguage(currentLang);
        get().sendMessage('REQUEST_STATE');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'GAME_STATE_UPDATE': {
              const previousState = get().gameState?.state;
              const newState = msg.payload?.state;

              if (previousState === 'PSYCHIC_PHASE' && newState === 'GUESSING_PHASE') {
                wavelengthSound.playPsychicChime();
              } else if (previousState === 'GUESSING_PHASE' && newState === 'REVEAL_PHASE') {
                wavelengthSound.playShutterOpen();
                const pts = msg.payload?.roundPoints;
                if (pts === 4) {
                  setTimeout(() => wavelengthSound.playBullseye(), 350);
                } else if (pts >= 2) {
                  setTimeout(() => wavelengthSound.playGoodGuess(), 350);
                } else {
                  setTimeout(() => wavelengthSound.playMiss(), 350);
                }
              }

              set({ gameState: msg.payload });
              break;
            }

            case 'DIAL_UPDATED': {
              const { dial } = msg.payload;
              if (typeof dial === 'number') {
                const current = get().gameState;
                if (current) {
                  set({
                    gameState: {
                      ...current,
                      dialValue: dial,
                      lastDialMoverId: msg.payload?.moverId,
                    },
                  });
                }
                wavelengthSound.playDialTick();
              }
              break;
            }

            case 'ROUND_REVEALED': {
              const pts = msg.payload?.points;
              wavelengthSound.playShutterOpen();
              if (pts === 4) {
                setTimeout(() => wavelengthSound.playBullseye(), 300);
              } else if (pts >= 2) {
                setTimeout(() => wavelengthSound.playGoodGuess(), 300);
              } else {
                setTimeout(() => wavelengthSound.playMiss(), 300);
              }
              break;
            }

            case 'ERROR_INPUT':
              set({ errorMsg: msg.payload });
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Falha ao processar mensagem do Wavelength:', err);
        }
      };

      ws.onclose = (event) => {
        set({ isConnected: false, socket: null });

        if (!event.wasClean && activeRoomId) {
          const currentAttempt = get().reconnectAttempt;
          const maxDelay = 10000;
          const delay = Math.min(1000 * Math.pow(1.5, currentAttempt), maxDelay);

          set({ isReconnecting: true, reconnectAttempt: currentAttempt + 1 });

          reconnectTimeout = setTimeout(() => {
            if (activeRoomId && activeToken) {
              get().connect(activeRoomId, activeToken);
            }
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.error('Erro na conexão WebSocket do Wavelength:', err);
      };

      set({ socket: ws });
    } catch (err) {
      console.error('Falha ao abrir conexão do Wavelength:', err);
    }
  },

  disconnect: () => {
    activeRoomId = '';
    activeToken = '';
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    const ws = get().socket;
    if (ws) {
      ws.close();
    }
    set({
      socket: null,
      isConnected: false,
      isReconnecting: false,
      gameState: null,
    });
  },

  manualReconnect: () => {
    if (activeRoomId && activeToken) {
      set({ isReconnecting: true });
      get().connect(activeRoomId, activeToken);
    }
  },

  sendMessage: (type: string, payload?: any) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  },

  toggleReady: () => {
    get().sendMessage('TOGGLE_READY_LOBBY');
  },

  setLanguage: (lang: string) => {
    get().sendMessage('SET_LANGUAGE', { language: lang });
  },

  startGame: () => {
    get().sendMessage('START_GAME');
  },

  giveClue: (clue: string) => {
    get().sendMessage('GIVE_CLUE', { clue });
  },

  updateDial: (dial: number) => {
    // Atualização otimista local para fluidez instantânea
    const current = get().gameState;
    if (current) {
      set({ gameState: { ...current, dialValue: dial } });
    }
    wavelengthSound.playDialTick();
    get().sendMessage('UPDATE_DIAL', { dial });
  },

  confirmGuess: () => {
    get().sendMessage('CONFIRM_GUESS');
  },

  nextRound: () => {
    get().sendMessage('NEXT_ROUND');
  },

  restartGame: () => {
    get().sendMessage('RESTART_GAME');
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    wavelengthSound.enabled = next;
    set({ soundEnabled: next });
  },

  clearError: () => {
    set({ errorMsg: null });
  },
}));
