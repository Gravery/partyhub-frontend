import { create } from 'zustand';
import { api, ApiError, setTokenProvider, type AuthResponse, type AuthUser } from '../lib/api';

export interface UserSession {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    user_metadata?: {
      username?: string;
    };
  };
}

interface AuthState {
  session: UserSession | null;
  user: UserSession['user'] | null;
  username: string | null;
  isLoading: boolean;
  /** A sessão acabou sozinha (refresh recusado); a tela de login avisa o motivo */
  sessionExpired: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (username: string) => void;
  /** Devolve um access token com folga de validade, renovando antes se preciso */
  getValidToken: () => Promise<string | null>;
  /** Renova a sessão agora (ex.: o servidor respondeu 401) */
  refreshSession: () => Promise<string | null>;
}

const STORAGE_TOKEN_KEY = 'partyhub_auth_token';
const STORAGE_REFRESH_KEY = 'partyhub_auth_refresh';
const STORAGE_USER_KEY = 'partyhub_auth_user';

/** Renova este tempo antes de expirar (o token do Supabase dura 1 h) */
const REFRESH_AHEAD_MS = 5 * 60 * 1000;
/** getValidToken renova se faltar menos que isto */
const MIN_VALIDITY_MS = 60 * 1000;
/** Nova tentativa quando a renovação falha por rede ou servidor fora do ar */
const RETRY_DELAY_MS = 30 * 1000;
const LOCK_NAME = 'partyhub-auth-refresh';

/** Momento (ms) em que o JWT expira, lido do próprio token */
function tokenExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function msUntilExpiry(token: string | null | undefined): number {
  const exp = tokenExpiry(token);
  return exp === null ? Infinity : exp - Date.now();
}

function sessionFrom(accessToken: string, refreshToken: string | undefined, user: AuthUser): UserSession {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, user_metadata: { username: user.username } },
  };
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_REFRESH_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

/** Abas diferentes não podem renovar ao mesmo tempo: o Supabase gira o refresh token e revoga o reuso */
async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request(LOCK_NAME, fn);
  }
  return fn();
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  const scheduleRefresh = (token: string | null | undefined, delayOverride?: number) => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    if (!token) return;
    const delay = delayOverride ?? Math.max(0, msUntilExpiry(token) - REFRESH_AHEAD_MS);
    if (!Number.isFinite(delay)) return;
    refreshTimer = setTimeout(() => {
      void get().refreshSession();
    }, delay);
  };

  const applySession = (res: AuthResponse) => {
    if (!res.access_token || !res.user) throw new Error('Resposta de sessão inválida do servidor');
    // O refresh token novo substitui o antigo (rotação); se não vier, mantém o atual
    const refresh = res.refresh_token || get().session?.refresh_token || localStorage.getItem(STORAGE_REFRESH_KEY) || undefined;
    // Refresh e usuário antes do access token: as outras abas reagem à troca do access token
    if (refresh) localStorage.setItem(STORAGE_REFRESH_KEY, refresh);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.user));
    localStorage.setItem(STORAGE_TOKEN_KEY, res.access_token);
    const session = sessionFrom(res.access_token, refresh, res.user);
    set({ session, user: session.user, username: res.user.username, isLoading: false, sessionExpired: false });
    scheduleRefresh(res.access_token);
    return res.access_token;
  };

  const expireSession = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = null;
    clearStorage();
    set({ session: null, user: null, username: null, isLoading: false, sessionExpired: true });
  };

  /** Adota uma sessão que outra aba já renovou (mesmo localStorage) */
  const adoptStoredSession = (): string | null => {
    const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
    const current = get().session?.access_token;
    if (!stored || stored === current) return null;
    if ((tokenExpiry(stored) ?? 0) <= (tokenExpiry(current) ?? 0)) return null;
    const user = readStoredUser() || (get().session ? { id: get().session!.user.id, email: get().session!.user.email, username: get().username || '' } : null);
    if (!user) return null;
    const refresh = localStorage.getItem(STORAGE_REFRESH_KEY) || undefined;
    const session = sessionFrom(stored, refresh, user);
    set({ session, user: session.user, username: user.username, sessionExpired: false });
    scheduleRefresh(stored);
    return stored;
  };

  const doRefresh = (): Promise<string | null> =>
    withRefreshLock(async () => {
      // Outra aba pode ter renovado enquanto esperávamos a vez
      const adopted = adoptStoredSession();
      if (adopted && msUntilExpiry(adopted) > REFRESH_AHEAD_MS) return adopted;

      const refreshToken = localStorage.getItem(STORAGE_REFRESH_KEY) || get().session?.refresh_token;
      const current = get().session?.access_token || null;
      if (!refreshToken) {
        // Sessão antiga, de antes do refresh: só dá para pedir login quando o token vencer
        if (msUntilExpiry(current) <= 0) expireSession();
        return msUntilExpiry(current) > 0 ? current : null;
      }

      try {
        return applySession(await api.refresh(refreshToken));
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
          // Refresh recusado: segue com o token atual enquanto ele valer, depois pede login
          if (msUntilExpiry(current) > MIN_VALIDITY_MS) {
            scheduleRefresh(current, Math.max(0, msUntilExpiry(current) - MIN_VALIDITY_MS));
            return current;
          }
          expireSession();
          return null;
        }
        // Rede ou servidor fora do ar: não derruba ninguém, tenta de novo em instantes
        scheduleRefresh(current, RETRY_DELAY_MS);
        return msUntilExpiry(current) > 0 ? current : null;
      }
    });

  return {
    session: null,
    user: null,
    username: null,
    isLoading: true,
    sessionExpired: false,

    refreshSession: () => {
      if (!refreshInFlight) {
        refreshInFlight = doRefresh().finally(() => {
          refreshInFlight = null;
        });
      }
      return refreshInFlight;
    },

    getValidToken: async () => {
      const token = get().session?.access_token;
      if (!token) return null;
      if (msUntilExpiry(token) > MIN_VALIDITY_MS) return token;
      return get().refreshSession();
    },

    initialize: async () => {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const savedRefresh = localStorage.getItem(STORAGE_REFRESH_KEY) || undefined;
      const savedUser = readStoredUser();

      if (!savedToken) {
        set({ session: null, user: null, username: null, isLoading: false });
        return;
      }

      // Mostra a sessão guardada já; a validação abaixo corrige se preciso
      if (savedUser) {
        const session = sessionFrom(savedToken, savedRefresh, savedUser);
        set({ session, user: session.user, username: savedUser.username });
      }

      let token: string | null = savedToken;
      if (msUntilExpiry(savedToken) <= REFRESH_AHEAD_MS) {
        token = await get().refreshSession();
        if (!token) {
          set({ isLoading: false });
          return;
        }
      }

      try {
        const res = await api.getMe(token);
        const user = res.user || savedUser;
        if (!user) throw new ApiError('Sessão inválida', 401);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
        const current = get().session?.access_token || token;
        const session = sessionFrom(current, get().session?.refresh_token || savedRefresh, user);
        set({ session, user: session.user, username: user.username, isLoading: false });
        scheduleRefresh(current);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Token recusado (revogado ou relógio diferente): uma tentativa de renovar antes de desistir
          const renewed = await get().refreshSession();
          if (!renewed) expireSession();
          set({ isLoading: false });
          return;
        }
        // Servidor fora do ar: mantém a sessão guardada em vez de deslogar
        if (savedUser) scheduleRefresh(get().session?.access_token);
        else expireSession();
        set({ isLoading: false });
      }
    },

    signIn: async (email: string, password: string) => {
      applySession(await api.login(email, password));
    },

    signUp: async (email: string, password: string, username?: string) => {
      const res = await api.register(email, password, username);
      if (res.access_token && res.user) applySession(res);
    },

    signOut: async () => {
      await api.logout();
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = null;
      clearStorage();
      set({ session: null, user: null, username: null, isLoading: false, sessionExpired: false });
    },

    setUsername: (username: string) => {
      set((state) => {
        if (!state.session || !state.user) return state;
        const updatedUser = { ...state.user, user_metadata: { ...state.user.user_metadata, username } };
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify({ id: updatedUser.id, email: updatedUser.email, username }));
        return { ...state, session: { ...state.session, user: updatedUser }, user: updatedUser, username };
      });
    },
  };
});

/** Token válido para conectar/reconectar o WebSocket; cai no token informado se não houver sessão */
export async function freshToken(fallback: string): Promise<string> {
  return (await useAuthStore.getState().getValidToken()) || fallback;
}

// Chamadas autenticadas da API usam a mesma renovação
setTokenProvider({
  getValidToken: () => useAuthStore.getState().getValidToken(),
  forceRefresh: () => useAuthStore.getState().refreshSession(),
});

if (typeof window !== 'undefined') {
  // Abas em segundo plano e computador suspenso atrasam os timers: confere ao voltar
  const checkOnWake = () => {
    const { session, refreshSession } = useAuthStore.getState();
    if (session && msUntilExpiry(session.access_token) <= REFRESH_AHEAD_MS) void refreshSession();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkOnWake();
  });
  window.addEventListener('focus', checkOnWake);
  window.addEventListener('online', checkOnWake);

  // Outra aba renovou ou saiu: acompanha sem pedir nada ao servidor
  window.addEventListener('storage', (e) => {
    const state = useAuthStore.getState();
    if (e.key === STORAGE_REFRESH_KEY) {
      if (state.session && e.newValue && e.newValue !== state.session.refresh_token) {
        useAuthStore.setState({ session: { ...state.session, refresh_token: e.newValue } });
      }
      return;
    }
    if (e.key !== STORAGE_TOKEN_KEY) return;
    if (!e.newValue) {
      if (state.session) {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = null;
        useAuthStore.setState({ session: null, user: null, username: null });
      }
      return;
    }
    if (!state.session || e.newValue === state.session.access_token) return;
    const user = readStoredUser();
    if (!user) return;
    const session = sessionFrom(e.newValue, localStorage.getItem(STORAGE_REFRESH_KEY) || undefined, user);
    useAuthStore.setState({ session, user: session.user, username: user.username, sessionExpired: false });
    if (refreshTimer) clearTimeout(refreshTimer);
    const delay = Math.max(0, msUntilExpiry(e.newValue) - REFRESH_AHEAD_MS);
    refreshTimer = setTimeout(() => void useAuthStore.getState().refreshSession(), delay);
  });
}
