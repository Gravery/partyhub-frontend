import { create } from 'zustand';

export type LudoColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export interface BoardPosition {
  row: number;
  col: number;
}

export interface LudoPawn {
  id: number;
  color: LudoColor;
  step: number; // -1: Yard, 0..50: Track, 51..55: HomeStretch, 56: Home
  position: BoardPosition;
  isHome: boolean;
  inYard: boolean;
}

export interface LudoPlayer {
  id: string;
  username: string;
  color: LudoColor;
  isBot: boolean;
  isConnected: boolean;
  pawns: [LudoPawn, LudoPawn, LudoPawn, LudoPawn];
  score: number;
  hasFinished: boolean;
  finishRank: number;
}

export interface LastMoveInfo {
  playerId: string;
  playerName: string;
  color: LudoColor;
  pawnIndex: number;
  fromStep: number;
  toStep: number;
  dice: number;
  captured: boolean;
  capturedBy?: string;
  capturedPawn?: string;
  isExtraTurn: boolean;
}

export interface LudoGameState {
  state: 'LOBBY' | 'WAITING_ROLL' | 'WAITING_MOVE' | 'GAME_OVER';
  players: LudoPlayer[];
  activePlayerIndex: number;
  activePlayerId: string;
  currentDice: number;
  consecutiveSixes: number;
  validMoves: number[];
  fillBots: boolean;
  leaderId: string;
  winner: LudoPlayer | null;
  rankings: LudoPlayer[];
  actionLog: string[];
  language: string;
  lastMove?: LastMoveInfo | null;
}

// Síntese de áudio Web Audio API para efeitos sonoros táteis e imersivos
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled = true;

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

  playDiceRoll() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160 + Math.random() * 200, this.ctx.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.06 + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + i * 0.06);
      osc.stop(this.ctx.currentTime + i * 0.06 + 0.09);
    }
  }

  playPawnHop() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(560, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  playPawnStep() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(640, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playCapture() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playGoal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + idx * 0.08 + 0.32);
    });
  }
}

export const ludoAudio = new SoundFX();

interface LudoStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: LudoGameState | null;
  errorMsg: string | null;
  isRollingAnimation: boolean;
  soundEnabled: boolean;
  toastMessage: string | null;
  extraTurnBanner: string | null;

  connect: (roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: any) => void;
  chooseColor: (color: LudoColor) => void;
  toggleBots: () => void;
  startGame: () => void;
  rollDice: () => void;
  movePawn: (pawnIndex: number) => void;
  restartGame: () => void;
  toggleSound: () => void;
  clearError: () => void;
  clearToast: () => void;
  clearExtraTurnBanner: () => void;
}

let activeRoomId = '';
let activeToken = '';
let reconnectTimeout: any = null;

export const useLudoStore = create<LudoStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  isRollingAnimation: false,
  soundEnabled: true,
  toastMessage: null,
  extraTurnBanner: null,

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
      } else {
        wsBaseUrl = 'ws://localhost:3333/ws';
      }
    }

    const lang = localStorage.getItem('partyhub_language') || 'en';
    const wsUrl = `${wsBaseUrl}/ludo/${roomId}?token=${token}&lang=${lang}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🎲 Conectado à sala de Ludo:', roomId);
      set({
        socket: ws,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempt: 0,
        errorMsg: null,
      });
    };

    ws.onmessage = (event) => {
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.error('Erro ao interpretar mensagem WS do Ludo:', err);
        return;
      }

      switch (data.type) {
        case 'GAME_STATE': {
          const prevState = get().gameState;
          const nextState: LudoGameState = data.payload;

          // Disparo reativo de áudio baseado em mudanças de estado
          if (nextState.currentDice > 0 && prevState?.currentDice !== nextState.currentDice) {
            set({ isRollingAnimation: true });
            ludoAudio.playDiceRoll();
            setTimeout(() => set({ isRollingAnimation: false }), 450);
          }

          if (nextState.lastMove) {
            const lm = nextState.lastMove;
            if (lm.captured && lm.capturedBy && lm.capturedPawn) {
              const captor = lm.capturedBy;
              set({
                toastMessage: `⚔️ ${captor} capturou o peão de ${lm.capturedPawn}!`,
              });
              ludoAudio.playCapture();
              setTimeout(() => {
                if (get().toastMessage?.includes(captor)) {
                  set({ toastMessage: null });
                }
              }, 3500);
            }

            if (lm.isExtraTurn && lm.playerName) {
              const banner =
                lm.dice === 6
                  ? `🎲 ${lm.playerName} rolou 6! Jogue novamente!`
                  : `⚔️ ${lm.playerName} capturou um peão! Jogue novamente!`;
              set({ extraTurnBanner: banner });
              setTimeout(() => {
                if (get().extraTurnBanner === banner) {
                  set({ extraTurnBanner: null });
                }
              }, 2500);
            }
          }

          if (nextState.state === 'GAME_OVER' && prevState?.state !== 'GAME_OVER') {
            ludoAudio.playGoal();
          }

          set({ gameState: nextState });
          break;
        }

        case 'GAME_ERROR':
          set({ errorMsg: data.payload?.message || 'Ocorreu um erro no jogo.' });
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      console.warn('Conexão WS com o Ludo fechada. Tentando reconectar...');
      set({ socket: null, isConnected: false });

      const attempt = get().reconnectAttempt;
      if (attempt < 10) {
        set({ isReconnecting: true, reconnectAttempt: attempt + 1 });
        const delay = Math.min(1000 * Math.pow(1.5, attempt), 10000);
        reconnectTimeout = setTimeout(() => {
          if (activeRoomId && activeToken) {
            get().connect(activeRoomId, activeToken);
          }
        }, delay);
      } else {
        set({
          isReconnecting: false,
          errorMsg: 'Não foi possível reconectar à sala de Ludo.',
        });
      }
    };

    ws.onerror = (err) => {
      console.error('Erro na conexão WebSocket do Ludo:', err);
    };
  },

  disconnect: () => {
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
      errorMsg: null,
      toastMessage: null,
      extraTurnBanner: null,
      reconnectAttempt: 0,
    });
  },

  manualReconnect: () => {
    if (activeRoomId && activeToken) {
      set({ reconnectAttempt: 0, isReconnecting: true });
      get().connect(activeRoomId, activeToken);
    }
  },

  sendMessage: (type: string, payload: any = {}) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  },

  chooseColor: (color: LudoColor) => {
    get().sendMessage('CHOOSE_COLOR', { color });
  },

  toggleBots: () => {
    get().sendMessage('TOGGLE_BOTS');
  },

  startGame: () => {
    get().sendMessage('START_GAME');
  },

  rollDice: () => {
    get().sendMessage('ROLL_DICE');
  },

  movePawn: (pawnIndex: number) => {
    get().sendMessage('MOVE_PAWN', { pawnIndex });
  },

  restartGame: () => {
    get().sendMessage('RESTART_GAME');
  },

  toggleSound: () => {
    const next = !get().soundEnabled;
    ludoAudio.enabled = next;
    set({ soundEnabled: next });
  },

  clearError: () => {
    set({ errorMsg: null });
  },

  clearToast: () => {
    set({ toastMessage: null });
  },

  clearExtraTurnBanner: () => {
    set({ extraTurnBanner: null });
  },
}));
