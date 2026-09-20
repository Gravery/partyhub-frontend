import { create } from 'zustand';

export interface CahBlackCard {
  id: string;
  text: string;
  pick: number;
}

export interface CahWhiteCard {
  id: string;
  text: string;
}

export interface RevealedSubmission {
  submissionId?: string;
  cards?: CahWhiteCard[];
  cardId: string;
  text: string;
  playerId: string;
  playerName: string;
  isWinner: boolean;
}

export interface AnonymousSubmission {
  submissionId: string;
  cards: CahWhiteCard[];
  isRevealed?: boolean;
  cardsCount?: number;
  // Fallbacks de compatibilidade
  id?: string;
  text?: string;
}

export interface RoundWinnerInfo {
  playerId: string;
  playerName: string;
  cards?: CahWhiteCard[];
  card: CahWhiteCard;
  winningCard?: CahWhiteCard;
  blackCard?: CahBlackCard;
  pointsWon?: number;
  score?: number;
}

export interface CahState {
  state: 'LOBBY' | 'SELECTING_ANSWERS' | 'JUDGING' | 'ROUND_REVEAL' | 'GAME_OVER';
  players: string[];
  playerNames?: Record<string, string>;
  playerReady?: Record<string, boolean>;
  playerConnected?: Record<string, boolean>;
  scores: Record<string, number>;
  scoreToWin: number;
  roundNumber: number;
  czarId: string;
  czarName?: string;
  isCzar: boolean;
  currentBlackCard?: CahBlackCard;
  myHand: CahWhiteCard[];
  hasSubmitted: boolean;
  submittedStatus: Record<string, boolean>;
  submissionsCount: number;
  totalExpectedSubmissions: number;
  anonymousSubmissions?: AnonymousSubmission[] | null;
  allRevealedSubmissions?: RevealedSubmission[] | null;
  allSubmissionsRevealed?: boolean;
  revealedSubmissionsCount?: number;
  roundWinner?: RoundWinnerInfo | null;
  actionLog: string[];
  discardsRemaining?: number;
}

export interface CahDisconnectNotice {
  userId: string;
  userName: string;
  graceSeconds: number;
}

interface CahStore {
  socket: WebSocket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  gameState: CahState | null;
  errorMsg: string | null;
  disconnectNotice: CahDisconnectNotice | null;
  roundWinnerToast: RoundWinnerInfo | null;

  connect: (roomId: string, token: string) => void;
  disconnect: () => void;
  manualReconnect: () => void;
  sendMessage: (type: string, payload?: any) => void;
  toggleReady: () => void;
  setOptions: (scoreToWin: number) => void;
  startGame: () => void;
  submitAnswer: (cardIds: string | string[]) => void;
  discardCards: (cardIds: string[]) => void;
  revealSubmission: (submissionId: string) => void;
  selectWinner: (submissionOrCardId: string) => void;
  nextRound: () => void;
  restartGame: () => void;
  clearError: () => void;
  clearWinnerToast: () => void;
}

let lastConnParams: { roomId: string; token: string } | null = null;
let reconnectTimeout: any = null;

export const useCahStore = create<CahStore>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  gameState: null,
  errorMsg: null,
  disconnectNotice: null,
  roundWinnerToast: null,

  connect: (roomId, token) => {
    lastConnParams = { roomId, token };

    if (get().socket?.readyState === WebSocket.OPEN) return;

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
    const wsUrl = `${wsBaseUrl}/cah/${roomId}?token=${token}&lang=${lang}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('🃏 Conectado ao servidor de Cartas Contra a Humanidade!');
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
        console.error('Erro ao processar mensagem do servidor CAH:', err);
        return;
      }

      switch (data.type) {
        case 'GAME_STATE_UPDATE':
          set({
            gameState: data.payload,
            disconnectNotice: data.payload.state === 'LOBBY' ? null : get().disconnectNotice,
          });
          break;

        case 'ROUND_WINNER_REVEALED': {
          const payload = data.payload || {};
          const cardsList: CahWhiteCard[] = payload.cards || [];
          const cardObj: CahWhiteCard =
            cardsList[0] || payload.card || payload.winningCard || { id: '', text: '' };
          set({
            roundWinnerToast: {
              playerId: payload.playerId || payload.winnerId || '',
              playerName: payload.playerName || payload.winnerName || 'Jogador',
              cards: cardsList.length > 0 ? cardsList : [cardObj],
              card: cardObj,
              winningCard: cardObj,
              blackCard: payload.blackCard,
              pointsWon: payload.pointsWon || (cardsList.length > 1 ? cardsList.length : 1),
              score: payload.score,
            },
          });
          break;
        }

        case 'SUBMISSION_REVEALED': {
          const { submissionId, cards } = data.payload || {};
          set((state) => {
            if (!state.gameState || !state.gameState.anonymousSubmissions) return state;
            const updatedAnon = state.gameState.anonymousSubmissions.map((sub) => {
              if (sub.submissionId === submissionId) {
                return {
                  ...sub,
                  cards: cards && cards.length > 0 ? cards : sub.cards,
                  isRevealed: true,
                };
              }
              return sub;
            });
            const revealedCount = updatedAnon.filter((s) => s.isRevealed).length;
            return {
              gameState: {
                ...state.gameState,
                anonymousSubmissions: updatedAnon,
                revealedSubmissionsCount: revealedCount,
                allSubmissionsRevealed:
                  revealedCount >= updatedAnon.length && updatedAnon.length > 0,
              },
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
      console.log('🔌 Conexão de CAH encerrada.');
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
          errorMsg:
            'Não foi possível reconectar à sala de Cartas Contra a Humanidade. Verifique sua conexão.',
        });
      }
    };

    ws.onerror = (error) => {
      console.error('Erro no WebSocket de CAH:', error);
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
      roundWinnerToast: null,
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
      console.warn('Tentativa de envio sem conexão WebSocket ativa no CAH');
    }
  },

  toggleReady: () => {
    get().sendMessage('TOGGLE_READY_LOBBY');
  },

  setOptions: (scoreToWin) => {
    get().sendMessage('SET_OPTIONS', { scoreToWin });
  },

  startGame: () => {
    get().sendMessage('START_GAME');
  },

  submitAnswer: (cardIds) => {
    if (Array.isArray(cardIds)) {
      get().sendMessage('SUBMIT_ANSWER', { cardIds, cardId: cardIds[0] });
    } else {
      get().sendMessage('SUBMIT_ANSWER', { cardIds: [cardIds], cardId: cardIds });
    }
  },

  discardCards: (cardIds) => {
    get().sendMessage('DISCARD_CARDS', { cardIds });
  },

  revealSubmission: (submissionId) => {
    get().sendMessage('REVEAL_SUBMISSION', { submissionId, cardId: submissionId });
  },

  selectWinner: (id) => {
    get().sendMessage('SELECT_WINNER', { submissionId: id, cardId: id });
  },

  nextRound: () => {
    get().sendMessage('NEXT_ROUND');
  },

  restartGame: () => {
    get().sendMessage('RESTART_GAME');
  },

  clearError: () => set({ errorMsg: null }),
  clearWinnerToast: () => set({ roundWinnerToast: null }),
}));
