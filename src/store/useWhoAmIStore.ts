import { create } from 'zustand';
import i18n from '../i18n';
import { whoamiAudio } from '../lib/audioEngine';
import { useAuthStore, freshToken } from './useAuthStore';

export type WhoAmIPhase = 'LOBBY' | 'WRITING' | 'ASKING' | 'ANSWERING' | 'GAME_OVER';
export type WhoAmICategory = 'character' | 'place' | 'object' | 'animal' | 'free';
export type PlayerStatus = 'active' | 'solved' | 'gave_up';
export type TurnKind = 'question' | 'guess';

export interface SecretView {
  writerId: string;
  submitted: boolean;
  category: WhoAmICategory | null;
  /** null quando o jogador ainda não pode ver (o próprio segredo) */
  text: string | null;
}

export interface TurnView {
  kind?: TurnKind;
  text?: string;
  auto?: boolean;
  /** Na fase de perguntas, só aparece "enviado" para os outros jogadores */
  submitted?: boolean;
}

export interface LogEntry {
  round: number;
  kind: TurnKind | 'give_up';
  text: string;
  yes: number;
  no: number;
  result: 'yes' | 'no' | 'split' | 'correct' | 'wrong' | 'gave_up';
  auto?: boolean;
}

export interface WhoAmIState {
  state: WhoAmIPhase;
  language: string;
  round: number;
  players: string[];
  playerNames: Record<string, string>;
  playerReady: Record<string, boolean>;
  playerConnected: Record<string, boolean>;
  leaderId: string;
  writingFor: string;
  secrets: Record<string, SecretView>;
  status: Record<string, PlayerStatus>;
  solvedRound: Record<string, number>;
  solvedOrder: string[];
  turns: Record<string, TurnView>;
  answers: Record<string, Record<string, 'yes' | 'no'>>;
  logs: Record<string, LogEntry[]>;
}

interface WhoAmIStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: WhoAmIState | null;
  errorMsg: string | null;
  disconnectNotice: string | null;
  soundEnabled: boolean;

  connect: (roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: unknown) => void;
  toggleReady: () => void;
  startGame: () => void;
  submitSecret: (category: WhoAmICategory, text: string) => void;
  submitTurn: (kind: TurnKind, text: string) => void;
  retractTurn: () => void;
  answer: (askerId: string, answer: 'yes' | 'no') => void;
  giveUp: () => void;
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

export const useWhoAmIStore = create<WhoAmIStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  disconnectNotice: null,
  soundEnabled: whoamiAudio.enabled,

  connect: (roomId, token) => {
    activeRoomId = roomId;
    activeToken = token;
    get().socket?.close();
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    const lang = i18n.language?.startsWith('pt') ? 'pt' : 'en';
    const ws = new WebSocket(`${wsBase()}/whoami/${roomId}?token=${encodeURIComponent(token)}&lang=${lang}`);

    ws.onopen = () => {
      set({ isConnected: true, isReconnecting: false, reconnectAttempt: 0, errorMsg: null });
      get().sendMessage('REQUEST_STATE');
    };

    ws.onmessage = (event) => {
      let msg: { type: string; payload: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'GAME_STATE_UPDATE': {
          const prev = get().gameState;
          const next = msg.payload as WhoAmIState;
          if (prev) {
            // Resposta nova no próprio backlog toca conforme o resultado
            const me = useAuthStore.getState().user?.id || '';
            const before = prev.logs?.[me]?.length || 0;
            const mine = next.logs?.[me] || [];
            const last = mine[mine.length - 1];
            if (mine.length > before && last) {
              if (last.result === 'correct') whoamiAudio.playSolved();
              else if (last.result === 'yes') whoamiAudio.playYes();
              else if (last.result !== 'gave_up') whoamiAudio.playNo();
            } else if (prev.state !== 'ANSWERING' && next.state === 'ANSWERING') {
              whoamiAudio.playSubmit();
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
  startGame: () => get().sendMessage('START_GAME'),
  submitSecret: (category, text) => get().sendMessage('SUBMIT_SECRET', { category, text }),
  submitTurn: (kind, text) => get().sendMessage('SUBMIT_TURN', { kind, text }),
  retractTurn: () => get().sendMessage('RETRACT_TURN'),
  answer: (askerId, answer) => get().sendMessage('ANSWER', { askerId, answer }),
  giveUp: () => get().sendMessage('GIVE_UP'),
  endGame: () => get().sendMessage('END_GAME'),
  restartGame: () => get().sendMessage('RESTART_GAME'),
  toggleSound: () => set({ soundEnabled: whoamiAudio.toggle() }),
  clearError: () => set({ errorMsg: null }),
}));
