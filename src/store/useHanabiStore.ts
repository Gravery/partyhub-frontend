import { create } from 'zustand';

export interface HanabiCard {
  id: string;
  color: string; // "red" | "yellow" | "green" | "blue" | "white" | "multicolor" ou "" se for a própria carta
  number: number; // 1 a 5 ou 0 se for a própria carta
  known_color?: string;
  known_number?: number;
}

export interface HanabiGameResult {
  win: boolean;
  score: number;
  reason: string;
  message: string;
  rating: string;
}

export interface HanabiPlayResult {
  userId: string;
  userName: string;
  cardId: string;
  color: string;
  number: number;
  success: boolean;
  fireworksLevel: number;
  fuseTokens: number;
  isFiveBonus: boolean;
  timestamp: number;
}

export interface HanabiState {
  state: 'LOBBY' | 'PLAYING' | 'GAME_OVER';
  players: string[];
  playerNames?: Record<string, string>;
  playerReady?: Record<string, boolean>;
  playerConnected?: Record<string, boolean>;
  gameMode?: 'classic' | 'rainbow_full' | 'rainbow_one' | 'rainbow_wild';
  perfectShow?: boolean;
  maxScore?: number;
  hands: Record<string, HanabiCard[]>;
  fireworks: Record<string, number>;
  discardPile: HanabiCard[];
  clockTokens: number;
  fuseTokens: number;
  deckCount: number;
  currentPlayer: string;
  finalRoundCountdown: number;
  gameResult?: HanabiGameResult | null;
  actionLog: string[];
  lastAction?: {
    type: 'PLAY' | 'DISCARD' | 'CLUE' | string;
    playerId: string;
    playerName: string;
    cardId?: string;
    targetPlayerId?: string;
    targetCardIds?: string[];
    summary: string;
    success?: boolean;
  };
}

export interface HanabiDisconnectNotice {
  userId: string;
  userName: string;
  graceSeconds: number;
}

interface HanabiStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: HanabiState | null;
  errorMsg: string | null;
  disconnectNotice: HanabiDisconnectNotice | null;
  lastPlayResult: HanabiPlayResult | null;

  connect: (roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: any) => void;
  setGameOptions: (gameMode: string, perfectShow: boolean) => void;
  toggleReady: () => void;
  startGame: () => void;
  giveClue: (targetUserId: string, clueType: 'color' | 'number', value: string | number) => void;
  discardCard: (cardId: string) => void;
  playCard: (cardId: string) => void;
  restartGame: () => void;
  clearError: () => void;
  clearPlayResult: () => void;
}

let lastConnParams: { roomId: string; token: string } | null = null;
let reconnectTimeout: any = null;

export const useHanabiStore = create<HanabiStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  disconnectNotice: null,
  lastPlayResult: null,

  connect: (roomId, token) => {
    lastConnParams = { roomId, token };

    if (get().socket?.readyState === WebSocket.OPEN) return;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

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

    const wsUrl = `${wsBaseUrl}/hanabi/${roomId}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🎆 Conectado ao servidor de Hanabi!');
      set({
        socket: ws,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempt: 0,
        errorMsg: null,
      });
      ws.send(JSON.stringify({ type: 'REQUEST_STATE' }));
    };

    ws.onmessage = (event) => {
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (err) {
        console.error('Erro ao processar mensagem do servidor Hanabi:', err);
        return;
      }

      switch (data.type) {
        case 'GAME_STATE_UPDATE':
          set({
            gameState: data.payload,
            disconnectNotice: data.payload.state === 'LOBBY' ? null : get().disconnectNotice,
          });
          break;

        case 'CARD_PLAY_RESULT':
          set({
            lastPlayResult: {
              ...data.payload,
              timestamp: Date.now(),
            },
          });
          break;

        case 'ERROR_INPUT':
          set({ errorMsg: data.payload });
          break;

        case 'PLAYER_DISCONNECTED':
          set({
            disconnectNotice: {
              userId: data.payload.userId,
              userName: data.payload.userName,
              graceSeconds: data.payload.graceSeconds || 45,
            },
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
      }
    };

    ws.onclose = () => {
      console.log('🔌 Conexão de Hanabi encerrada.');
      const currentAttempt = get().reconnectAttempt;
      set({ socket: null, isConnected: false });

      if (lastConnParams && currentAttempt < 10) {
        const nextAttempt = currentAttempt + 1;
        const delayMs = Math.min(1000 * Math.pow(1.3, nextAttempt), 4000);

        set({ isReconnecting: true, reconnectAttempt: nextAttempt });

        reconnectTimeout = setTimeout(() => {
          if (lastConnParams) {
            get().connect(lastConnParams.roomId, lastConnParams.token);
          }
        }, delayMs);
      } else if (currentAttempt >= 10) {
        set({
          isReconnecting: false,
          errorMsg: 'Não foi possível reconectar à sala de Hanabi. Verifique sua conexão e tente novamente.',
        });
      }
    };

    ws.onerror = (error) => {
      console.error('Erro no WebSocket de Hanabi:', error);
    };
  },

  disconnect: () => {
    lastConnParams = null;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    get().socket?.close();
    set({
      socket: null,
      isConnected: false,
      isReconnecting: false,
      reconnectAttempt: 0,
      gameState: null,
      errorMsg: null,
      disconnectNotice: null,
      lastPlayResult: null,
    });
  },

  manualReconnect: () => {
    if (lastConnParams) {
      set({ reconnectAttempt: 0, isReconnecting: true });
      get().connect(lastConnParams.roomId, lastConnParams.token);
    }
  },

  sendMessage: (type, payload) => {
    const ws = get().socket;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('Tentativa de envio sem conexão WebSocket ativa');
    }
  },

  setGameOptions: (gameMode, perfectShow) => {
    get().sendMessage('SELECT_GAME_OPTIONS', { gameMode, perfectShow });
  },

  toggleReady: () => {
    get().sendMessage('TOGGLE_READY_LOBBY');
  },

  startGame: () => {
    get().sendMessage('START_GAME');
  },

  giveClue: (targetUserId, clueType, value) => {
    get().sendMessage('GIVE_CLUE', { targetUserId, clueType, value });
  },

  discardCard: (cardId) => {
    get().sendMessage('DISCARD_CARD', { cardId });
  },

  playCard: (cardId) => {
    get().sendMessage('PLAY_CARD', { cardId });
  },

  restartGame: () => {
    get().sendMessage('RESTART_GAME');
  },

  clearError: () => set({ errorMsg: null }),
  clearPlayResult: () => set({ lastPlayResult: null }),
}));
