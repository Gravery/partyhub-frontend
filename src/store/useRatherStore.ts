import { create } from 'zustand';
import i18n from '../i18n';
import { ratherAudio } from '../lib/audioEngine';
import { useAuthStore, freshToken } from './useAuthStore';

export type RatherPhase = 'LOBBY' | 'CHOOSING' | 'GUESSING' | 'REVEAL' | 'GAME_OVER';
export type RatherOption = 'A' | 'B';
export type RatherCategory = 'absurd' | 'gross' | 'powers' | 'food' | 'awkward' | 'adult' | 'time' | 'survival' | 'tough';

export const RATHER_CATEGORIES: RatherCategory[] = ['absurd', 'gross', 'powers', 'food', 'awkward', 'adult', 'time', 'survival', 'tough'];
export const RATHER_ROUND_OPTIONS = [5, 8, 10, 15];

export interface Dilemma {
  id: string;
  category: RatherCategory;
  a: string;
  b: string;
}

export interface RoundHistory {
  round: number;
  dilemma: Dilemma;
  choices: Record<string, RatherOption>;
  points: Record<string, number>;
}

export interface RatherState {
  state: RatherPhase;
  language: string;
  round: number;
  totalRounds: number;
  /** Categorias escolhidas no lobby; vazio = todas */
  categories: RatherCategory[];
  categoryCounts: Record<string, number>;
  players: string[];
  playerNames: Record<string, string>;
  playerReady: Record<string, boolean>;
  playerConnected: Record<string, boolean>;
  leaderId: string;
  dilemma: Dilemma | null;
  /** Quem já escolheu (sem revelar o quê) */
  chosen: Record<string, boolean>;
  myChoice: RatherOption | '';
  myGuesses: Record<string, RatherOption> | null;
  guessDone: Record<string, number>;
  guessNeeded: Record<string, number>;
  scores: Record<string, number>;
  predicted: Record<string, number>;
  received: Record<string, number>;
  history: RoundHistory[];
  /** Só na revelação e no fim */
  choices?: Record<string, RatherOption>;
  guesses?: Record<string, Record<string, RatherOption>>;
}

interface RatherStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: RatherState | null;
  errorMsg: string | null;
  disconnectNotice: string | null;
  soundEnabled: boolean;

  connect: (roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: unknown) => void;
  toggleReady: () => void;
  setOptions: (rounds: number, categories: RatherCategory[]) => void;
  startGame: () => void;
  choose: (option: RatherOption) => void;
  guess: (targetId: string, option: RatherOption) => void;
  skipDilemma: () => void;
  nextRound: () => void;
  endGame: () => void;
  restartGame: () => void;
  toggleSound: () => void;
  clearError: () => void;
}

let activeRoomId = '';
let activeToken = '';
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function wsBase(): string {
  const envWs = import.meta.env.VITE_WS_URL;
  const isExternalHost = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (!envWs || (isExternalHost && envWs.includes('localhost'))) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  return envWs;
}

/** Conexão atual: eventos de conexões substituídas (ainda abrindo ou fechando) são ignorados */
let currentWs: WebSocket | null = null;

export const useRatherStore = create<RatherStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  disconnectNotice: null,
  soundEnabled: ratherAudio.enabled,

  connect: (roomId, token) => {
    activeRoomId = roomId;
    activeToken = token;
    get().socket?.close();
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const lang = i18n.language?.startsWith('pt') ? 'pt' : 'en';
    const ws = new WebSocket(`${wsBase()}/rather/${roomId}?token=${encodeURIComponent(token)}&lang=${lang}`);
    const previousWs = currentWs;
    currentWs = ws;
    if (previousWs && previousWs !== ws) previousWs.close();

    ws.onopen = () => {
      if (ws !== currentWs) return;
      set({ isConnected: true, isReconnecting: false, reconnectAttempt: 0, errorMsg: null });
      get().sendMessage('REQUEST_STATE');
    };

    ws.onmessage = (event) => {
      if (ws !== currentWs) return;
      let msg: { type: string; payload: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'GAME_STATE_UPDATE': {
          const prev = get().gameState;
          const next = msg.payload as RatherState;
          if (prev && prev.state !== next.state) {
            if (next.state === 'CHOOSING') ratherAudio.playNewDilemma();
            else if (next.state === 'REVEAL') {
              // Som de acerto quando a maioria dos meus palpites bateu
              const me = useAuthStore.getState().user?.id || '';
              const mine = next.history[next.history.length - 1]?.points?.[me] || 0;
              const asked = next.guessNeeded?.[me] || 0;
              ratherAudio.playReveal(asked > 0 && mine * 2 >= asked);
            }
          }
          set({ gameState: next });
          break;
        }
        case 'ERROR_INPUT':
          set({ errorMsg: String(msg.payload) });
          break;
        case 'PLAYER_DISCONNECTED':
          set({ disconnectNotice: (msg.payload as { userName?: string } | null)?.userName || null });
          break;
        case 'PLAYER_RECONNECTED':
          set({ disconnectNotice: null });
          break;
      }
    };

    ws.onclose = (event) => {
      if (ws !== currentWs) return;
      set({ isConnected: false, socket: null });
      if (!event.wasClean && activeRoomId) {
        const attempt = get().reconnectAttempt;
        set({ isReconnecting: true, reconnectAttempt: attempt + 1 });
        reconnectTimeout = setTimeout(() => {
          if (activeRoomId && activeToken) void freshToken(activeToken).then((tok) => activeRoomId && get().connect(activeRoomId, tok));
        }, Math.min(1000 * Math.pow(1.5, attempt), 10000));
      }
    };

    set({ socket: ws });
  },

  disconnect: () => {
    const closingWs = currentWs;
    currentWs = null;
    closingWs?.close();
    activeRoomId = '';
    activeToken = '';
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    get().socket?.close();
    set({ socket: null, isConnected: false, isReconnecting: false, gameState: null, disconnectNotice: null });
  },

  manualReconnect: () => {
    if (activeRoomId && activeToken) {
      set({ isReconnecting: true });
      void freshToken(activeToken).then((tok) => activeRoomId && get().connect(activeRoomId, tok));
    }
  },

  sendMessage: (type, payload) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }));
  },

  toggleReady: () => get().sendMessage('TOGGLE_READY_LOBBY'),
  setOptions: (rounds, categories) => get().sendMessage('SET_OPTIONS', { rounds, categories }),
  startGame: () => get().sendMessage('START_GAME'),
  choose: (option) => {
    ratherAudio.playPick();
    get().sendMessage('CHOOSE', { option });
  },
  guess: (targetId, option) => {
    ratherAudio.playPick();
    get().sendMessage('GUESS', { targetId, option });
  },
  skipDilemma: () => get().sendMessage('SKIP_DILEMMA'),
  nextRound: () => get().sendMessage('NEXT_ROUND'),
  endGame: () => get().sendMessage('END_GAME'),
  restartGame: () => get().sendMessage('RESTART_GAME'),
  toggleSound: () => set({ soundEnabled: ratherAudio.toggle() }),
  clearError: () => set({ errorMsg: null }),
}));
