const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
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
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Sessão expirada');
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, { method: 'POST' });
    } catch {
      // Falha silenciosa no logout do servidor
    }
  },

  async getProfile(token: string): Promise<UserProfile> {
    const res = await fetch(`${API_BASE_URL}/api/v1/profile`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao buscar perfil');
    }
    return data;
  },

  async updateProfile(token: string, username: string, avatarUrl?: string | null): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, avatar_url: avatarUrl }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao atualizar perfil');
    }
  },

  async getStats(token: string): Promise<FullStatsResponse> {
    const res = await fetch(`${API_BASE_URL}/api/v1/profile/stats`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao carregar estatísticas');
    }
    return data;
  },
};
