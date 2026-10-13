import { create } from 'zustand';
import { ittoAudio } from '../lib/audioEngine';

interface Card {
  id: string;
  description: string;
  owner_id: string;
  locked_by?: string;
  locked_by_name?: string;
  secret_value?: number; 
}

interface GameState {
  state: 'LOBBY' | 'WRITING' | 'SORTING' | 'REVEALING';
  theme: { id?: string; category?: string; title: string; min_label: string; max_label: string } | null;
  players: string[];
  playerNames?: Record<string, string>;
  playerReady?: Record<string, boolean>;
  playerSorted?: Record<string, boolean>;
  playerConnected?: Record<string, boolean>;
  publicHands: Record<string, Card>;
  tableOrder: string[];
  level: number;
  customThemesCount?: number;
}

export interface CursorInfo {
  x: number;
  y: number;
  name: string;
  color: string;
  lastSeen: number;
}

export interface DisconnectNotice {
  userId: string;
  userName: string;
  graceSeconds: number;
}

interface RoundResult {
  win: boolean;
  msg: string;
  levelReached?: number;
  nextLevel?: number;
}

interface GameStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: GameState | null;
  errorMsg: string | null;
  secretCards: Record<string, number>;
  roundResult: RoundResult | null;
  disconnectNotice: DisconnectNotice | null;
  cursors: Record<string, CursorInfo>;
  soundEnabled: boolean;
  toggleSound: () => void;

  connect: (gameSlug: string, roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: any) => void;
  sendCursorMove: (x: number, y: number) => void;
  clearError: () => void;
}

const CURSOR_COLORS = [
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#f97316', // orange
];

function getPlayerColor(userId: string, players: string[] = []): string {
  const index = players.indexOf(userId);
  if (index >= 0) {
    return CURSOR_COLORS[index % CURSOR_COLORS.length];
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

let lastConnParams: { gameSlug: string; roomId: string; token: string } | null = null;
let reconnectTimeout: any = null;
let cursorCleanupInterval: any = null;
let lastCursorSendTime = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  roundResult: null,
  secretCards: {},
  disconnectNotice: null,
  cursors: {},
  soundEnabled: ittoAudio.enabled,
  toggleSound: () => {
    const next = ittoAudio.toggle();
    set({ soundEnabled: next });
  },

  connect: (gameSlug, roomId, token) => {
    lastConnParams = { gameSlug, roomId, token };

    if (get().socket?.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (!cursorCleanupInterval) {
      cursorCleanupInterval = setInterval(() => {
        const now = Date.now();
        const currentCursors = get().cursors;
        let changed = false;
        const filtered: Record<string, CursorInfo> = {};
        for (const [uid, c] of Object.entries(currentCursors)) {
          if (now - c.lastSeen < 3000) {
            filtered[uid] = c;
          } else {
            changed = true;
          }
        }
        if (changed) {
          set({ cursors: filtered });
        }
      }, 1000);
    }

    // Detect websocket base URL:
    const envWs = import.meta.env.VITE_WS_URL;
    const isBrowser = typeof window !== 'undefined';
    const isExternalHost = isBrowser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

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
    const wsUrl = `${wsBaseUrl}/${gameSlug}/${roomId}?token=${token}&lang=${lang}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🔌 Conectado ao servidor do jogo!');
      set({ 
        socket: ws, 
        isConnected: true, 
        isReconnecting: false, 
        reconnectAttempt: 0, 
        errorMsg: null 
      });
      // Solicita estado atualizado imediatamente após conectar
      ws.send(JSON.stringify({ type: 'REQUEST_STATE' }));
    };

    ws.onmessage = (event) => {
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.error('Erro ao fazer parse da mensagem WS:', err);
        return;
      }

      switch (data.type) {
        case 'GAME_STATE_UPDATE': {
          const prevState = get().gameState;
          const newState: GameState = data.payload;
          if (newState.state === 'REVEALING' && prevState?.state !== 'REVEALING') {
            ittoAudio.playCardReveal();
          }
          set((state) => {
            // Se o jogo voltou para o lobby, limpa notice e resultados anteriores
            const isLobby = newState.state === 'LOBBY';
            return {
              gameState: newState,
              secretCards: isLobby ? {} : state.secretCards,
              roundResult: isLobby ? null : state.roundResult,
              disconnectNotice: isLobby ? null : state.disconnectNotice,
            };
          });
          break;
        }

        case 'ERROR_INPUT':
          set({ errorMsg: data.payload });
          break;

        case 'PLAYER_DISCONNECTED':
          set({
            disconnectNotice: {
              userId: data.payload.userId,
              userName: data.payload.userName,
              graceSeconds: data.payload.graceSeconds || 45,
            }
          });
          break;

        case 'PLAYER_RECONNECTED':
          set((state) => {
            if (state.disconnectNotice?.userId === data.payload.userId) {
              return { disconnectNotice: null };
            }
            return state;
          });
          break;

        case 'CURSOR_UPDATE': {
          const { userId, userName, x, y } = data.payload;
          const players = get().gameState?.players || [];
          set((state) => ({
            cursors: {
              ...state.cursors,
              [userId]: {
                x,
                y,
                name: userName || 'Jogador',
                color: getPlayerColor(userId, players),
                lastSeen: Date.now(),
              }
            }
          }));
          break;
        }

        case 'CARD_LOCK_UPDATE':
          ittoAudio.playCardTick();
          set((state) => {
            if (!state.gameState) return state;
            const newHands = { ...state.gameState.publicHands };
            if (newHands[data.payload.cardID]) {
              newHands[data.payload.cardID] = {
                ...newHands[data.payload.cardID],
                locked_by: data.payload.lockedBy,
                locked_by_name: data.payload.lockedByName,
              };
            }
            return { gameState: { ...state.gameState, publicHands: newHands } };
          });
          break;

        case 'TABLE_UPDATED':
          ittoAudio.playCardTick();
          set((state) => {
            if (!state.gameState) return state;
            return { gameState: { ...state.gameState, tableOrder: data.payload } };
          });
          break;

        case 'SECRET_CARD':
          ittoAudio.playCardTick();
          set((state) => ({
            secretCards: {
              ...state.secretCards,
              [data.payload.cardID]: data.payload.secret
            }
          }));
          break;

        case 'ROUND_RESULT':
          if (data.payload?.win) {
            ittoAudio.playRoundSuccess();
          } else {
            ittoAudio.playRoundFailed();
          }
          set({ roundResult: data.payload });
          break;
      }
    };

    ws.onclose = () => {
      console.log('🔌 Conexão com o servidor encerrada.');
      const currentAttempt = get().reconnectAttempt;

      set({ socket: null, isConnected: false });

      // Se ainda temos parâmetros de conexão e não excedemos o limite de 10 tentativas
      if (lastConnParams && currentAttempt < 10) {
        const nextAttempt = currentAttempt + 1;
        const delayMs = Math.min(1000 * Math.pow(1.3, nextAttempt), 4000);

        set({ isReconnecting: true, reconnectAttempt: nextAttempt });

        console.log(`🔄 Tentando reconectar em ${Math.round(delayMs)}ms (tentativa ${nextAttempt}/10)...`);

        reconnectTimeout = setTimeout(() => {
          if (lastConnParams) {
            get().connect(lastConnParams.gameSlug, lastConnParams.roomId, lastConnParams.token);
          }
        }, delayMs);
      } else if (currentAttempt >= 10) {
        set({ 
          isReconnecting: false, 
          errorMsg: 'Não foi possível reconectar à sala após várias tentativas. Verifique sua conexão e tente novamente.' 
        });
      }
    };

    ws.onerror = (error) => {
      console.error('WS Error:', error);
    };
  },

  disconnect: () => {
    lastConnParams = null;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (cursorCleanupInterval) {
      clearInterval(cursorCleanupInterval);
      cursorCleanupInterval = null;
    }
    get().socket?.close();
    set({ 
      socket: null, 
      isConnected: false, 
      isReconnecting: false, 
      reconnectAttempt: 0, 
      gameState: null, 
      roundResult: null, 
      disconnectNotice: null,
      secretCards: {},
      cursors: {},
    });
  },

  manualReconnect: () => {
    if (lastConnParams) {
      set({ reconnectAttempt: 0, isReconnecting: true });
      get().connect(lastConnParams.gameSlug, lastConnParams.roomId, lastConnParams.token);
    }
  },

  sendMessage: (type, payload) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('Tentativa de envio de mensagem sem conexão ativa');
    }
  },

  sendCursorMove: (x, y) => {
    const now = Date.now();
    // Limita o envio de posição de cursor para no máximo 25 mensagens por segundo (~40ms)
    if (now - lastCursorSendTime < 40) return;
    lastCursorSendTime = now;

    get().sendMessage('CURSOR_MOVE', { x, y });
  },

  clearError: () => set({ errorMsg: null }),
}));