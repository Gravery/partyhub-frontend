// Acessando por outro host (túnel, IP da rede), "localhost" seria a máquina de quem abriu o site:
// usa o mesmo domínio e deixa o proxy do Vite repassar /api para o backend
const envApi: string | undefined = import.meta.env.VITE_API_URL;
const isExternalHost =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = !envApi || (isExternalHost && envApi.includes('localhost')) ? (isExternalHost ? '' : 'http://localhost:3333') : envApi;

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  /** Unix (segundos) em que o access token expira */
  expires_at?: number;
  user?: AuthUser;
  message?: string;
  error?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string | null;
  tier: string;
  created_at: string;
}

export interface UserGameStat {
  game_slug: string;
  matches_played: number;
  matches_won: number;
  total_score: number;
  high_score: number;
  last_played_at: string;
}

export interface MatchHistoryItem {
  id: number;
  game_slug: string;
  room_id: string;
  won: boolean;
  score: number;
  summary: string;
  created_at: string;
}

export interface FullStatsResponse {
  total_matches: number;
  total_wins: number;
  win_rate: number;
  total_score: number;
  favorite_game: string;
  by_game: UserGameStat[];
  recent_matches: MatchHistoryItem[];
}

/** Erro de API com o status HTTP, para distinguir sessão inválida (401) de falha de rede/servidor */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Quem fornece tokens válidos para as chamadas autenticadas (registrado pelo useAuthStore) */
interface TokenProvider {
  getValidToken: () => Promise<string | null>;
  forceRefresh: () => Promise<string | null>;
}
let tokenProvider: TokenProvider | null = null;
export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  // O middleware responde 401 em texto puro ("Invalid token")
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Requisição autenticada: usa sempre um token válido e, se o servidor ainda responder 401
 * (token revogado ou relógio adiantado), renova a sessão e tenta mais uma vez.
 */
async function authedRequest<T>(path: string, fallbackToken: string, init: RequestInit, fallbackError: string): Promise<T> {
  const doFetch = (token: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Authorization: `Bearer ${token}` },
    });

  let token = (await tokenProvider?.getValidToken()) || fallbackToken;
  let res = await doFetch(token);
  if (res.status === 401 && tokenProvider) {
    const renewed = await tokenProvider.forceRefresh();
    if (renewed && renewed !== token) {
      token = renewed;
      res = await doFetch(token);
    }
  }
  const data = await readJson(res);
  if (!res.ok) {
    throw new ApiError((data.error as string) || fallbackError, res.status);
  }
  return data as T;
}

export const api = {
  async register(email: string, password: string, username?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha no cadastro');
    }
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Credenciais inválidas');
    }
    return data;
  },

  async getMe(token: string): Promise<AuthResponse> {
    // Sem renovação automática: quem chama (initialize) decide o que fazer com o 401
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readJson(res);
    if (!res.ok) {
      throw new ApiError((data.error as string) || 'Sessão expirada', res.status);
    }
    return data as AuthResponse;
  },

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await readJson(res);
    if (!res.ok) {
      throw new ApiError((data.error as string) || 'Sessão expirada', res.status);
    }
    return data as AuthResponse;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: 'POST' });
    } catch {
      // Falha silenciosa no logout do servidor
    }
  },

  async getProfile(token: string): Promise<UserProfile> {
    return authedRequest<UserProfile>('/api/v1/profile', token, {}, 'Falha ao buscar perfil');
  },

  async updateProfile(token: string, username: string, avatarUrl?: string | null): Promise<void> {
    await authedRequest<unknown>(
      '/api/v1/profile',
      token,
      { method: 'PUT', body: JSON.stringify({ username, avatar_url: avatarUrl }) },
      'Falha ao atualizar perfil'
    );
  },

  async getStats(token: string): Promise<FullStatsResponse> {
    return authedRequest<FullStatsResponse>('/api/v1/profile/stats', token, {}, 'Falha ao carregar estatísticas');
  },

  async getRoomInfo(code: string): Promise<{ exists: boolean; roomId?: string; gameSlug?: string; playerCount?: number; error?: string }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/rooms/${encodeURIComponent(code)}`);
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { exists: false, error: err.message || 'Erro ao conectar ao servidor' };
    }
  },
};
