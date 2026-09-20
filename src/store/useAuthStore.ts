import { create } from 'zustand';
import { api, type AuthUser } from '../lib/api';

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
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (username: string) => void;
}

const STORAGE_TOKEN_KEY = 'partyhub_auth_token';
const STORAGE_USER_KEY = 'partyhub_auth_user';

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  username: null,
  isLoading: true,

  initialize: async () => {
    try {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const savedUserStr = localStorage.getItem(STORAGE_USER_KEY);

      if (!savedToken) {
        set({ session: null, user: null, username: null, isLoading: false });
        return;
      }

      let parsedUser: AuthUser | null = null;
      if (savedUserStr) {
        try {
          parsedUser = JSON.parse(savedUserStr);
        } catch {
          // ignora erro de json
        }
      }

      // Valida token com o backend
      const res = await api.getMe(savedToken);
      const userObj = res.user || parsedUser;

      if (userObj) {
        const sessionObj: UserSession = {
          access_token: savedToken,
          user: {
            id: userObj.id,
            email: userObj.email,
            user_metadata: {
              username: userObj.username,
            },
          },
        };

        set({
          session: sessionObj,
          user: sessionObj.user,
          username: userObj.username,
          isLoading: false,
        });

        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userObj));
        return;
      }
    } catch {
      // Token inválido ou expirado
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    }

    set({ session: null, user: null, username: null, isLoading: false });
  },

  signIn: async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (!res.access_token || !res.user) {
      throw new Error('Resposta de login inválida do servidor');
    }

    const sessionObj: UserSession = {
      access_token: res.access_token,
      refresh_token: res.refresh_token,
      user: {
        id: res.user.id,
        email: res.user.email,
        user_metadata: {
          username: res.user.username,
        },
      },
    };

    localStorage.setItem(STORAGE_TOKEN_KEY, res.access_token);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.user));

    set({
      session: sessionObj,
      user: sessionObj.user,
      username: res.user.username,
      isLoading: false,
    });
  },

  signUp: async (email: string, password: string, username?: string) => {
    const res = await api.register(email, password, username);
    if (res.access_token && res.user) {
      const sessionObj: UserSession = {
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        user: {
          id: res.user.id,
          email: res.user.email,
          user_metadata: {
            username: res.user.username,
          },
        },
      };

      localStorage.setItem(STORAGE_TOKEN_KEY, res.access_token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(res.user));

      set({
        session: sessionObj,
        user: sessionObj.user,
        username: res.user.username,
        isLoading: false,
      });
    }
  },

  signOut: async () => {
    await api.logout();
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    set({ session: null, user: null, username: null, isLoading: false });
  },

  setUsername: (username: string) => {
    set((state) => {
      if (!state.session || !state.user) return state;
      const updatedUser = {
        ...state.user,
        user_metadata: {
          ...state.user.user_metadata,
          username,
        },
      };
      const updatedSession = {
        ...state.session,
        user: updatedUser,
      };

      localStorage.setItem(
        STORAGE_USER_KEY,
        JSON.stringify({
          id: updatedUser.id,
          email: updatedUser.email,
          username,
        })
      );

      return {
        ...state,
        session: updatedSession,
        user: updatedUser,
        username,
      };
    });
  },
}));