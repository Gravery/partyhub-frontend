import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageSelector } from '../components/LanguageSelector';
import { Avatar } from '../components/game/ui';
import { api } from '../lib/api';
import { AlertCircle, Gamepad2, Users, Plus, Loader2 } from 'lucide-react';

import ittoCover from '../assets/games/itto.jpg';
import hanabiCover from '../assets/games/hanabi.jpg';
import cahCover from '../assets/games/cah.jpg';
import ludoCover from '../assets/games/ludo.jpg';
import wavelengthCover from '../assets/games/wavelength.jpg';

type Filter = 'all' | 'coop' | 'competitive' | 'large';

interface GameConfig {
  slug: string;
  name: string;
  accent: 'cyan' | 'sky' | 'violet' | 'amber' | 'zinc';
  cover: string;
  players: string;
  categoryKey: string;
  tags: Filter[];
}

// Ordem do catálogo; o primeiro visível vira o destaque no desktop
const GAMES: GameConfig[] = [
  { slug: 'wavelength', name: 'Wavelength', accent: 'cyan', cover: wavelengthCover, players: '2+', categoryKey: 'hub.cat_tuning', tags: ['coop', 'large'] },
  { slug: 'hanabi', name: 'Hanabi', accent: 'sky', cover: hanabiCover, players: '2–5', categoryKey: 'hub.cat_coop', tags: ['coop'] },
  { slug: 'itto', name: 'Itto', accent: 'violet', cover: ittoCover, players: '2–8', categoryKey: 'hub.cat_sync', tags: ['coop', 'large'] },
  { slug: 'ludo', name: 'Ludo', accent: 'amber', cover: ludoCover, players: '1–4', categoryKey: 'hub.cat_classic', tags: ['competitive'] },
  { slug: 'cah', name: '', accent: 'zinc', cover: cahCover, players: '3–12', categoryKey: 'hub.cat_humor', tags: ['competitive', 'large'] },
];

const FILTERS: Filter[] = ['all', 'coop', 'competitive', 'large'];

export function Hub() {
  const { t } = useTranslation();
  const { user, username } = useAuthStore();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const displayName = username || user?.email || '';
  const gameName = (g: GameConfig) => g.name || t(`hub.${g.slug}_title`);
  const visible = GAMES.filter((g) => filter === 'all' || g.tags.includes(filter));

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const roomInfo = await api.getRoomInfo(cleanCode);
      if (roomInfo.exists && roomInfo.gameSlug) {
        navigate(`/game/${roomInfo.gameSlug}/${roomInfo.roomId || cleanCode}`);
      } else {
        setSearchError(t('hub.room_not_found'));
      }
    } catch {
      setSearchError(t('hub.room_check_failed'));
    } finally {
      setIsSearching(false);
    }
  };

  const createRoom = (slug: string) => {
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/game/${slug}/${roomCode}`);
  };

  const joinForm = (idSuffix: string) => (
    <form onSubmit={handleJoin} className="flex items-center gap-2 bg-surface border border-line-strong rounded-2xl p-1.5 pl-4 w-full focus-within:border-accent">
      <label htmlFor={`room-code-${idSuffix}`} className="text-sm font-bold text-muted whitespace-nowrap">
        {t('hub.have_code')}
      </label>
      <input
        id={`room-code-${idSuffix}`}
        type="text"
        inputMode="text"
        autoComplete="off"
        placeholder="A1B2"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setSearchError(null);
        }}
        aria-invalid={Boolean(searchError)}
        aria-describedby={searchError ? 'room-code-error' : undefined}
        className="flex-1 min-w-0 h-10 bg-transparent text-ink font-mono font-bold text-lg tracking-[0.3em] uppercase outline-none placeholder:text-slate-600"
      />
      <button type="submit" disabled={isSearching || !code.trim()} className="btn btn-primary btn-sm">
        {isSearching ? <Loader2 size={16} className="animate-spin" /> : null}
        {isSearching ? t('hub.searching') : t('hub.join_btn')}
      </button>
    </form>
  );

  return (
    <div className="accent-brand min-h-[100dvh] bg-ground text-body">
      {/* Cabeçalho: marca, código da sala e perfil numa linha só */}
      <header className="sticky top-0 z-20 bg-ground/95 backdrop-blur border-b border-line">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-19 flex items-center justify-between gap-4 md:gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-10 h-10 rounded-xl bg-[#2E1065] text-violet-300 flex items-center justify-center" aria-hidden="true">
              <Gamepad2 size={22} />
            </span>
            <span className="font-display font-bold text-xl md:text-2xl tracking-wide text-ink">PARTY HUB</span>
          </div>

          <div className="hidden md:block flex-1 max-w-md">{joinForm('desktop')}</div>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="btn btn-secondary pl-1.5 pr-3 md:pr-4"
              aria-label={t('hub.profile_btn')}
            >
              <Avatar name={displayName || '?'} seed={user?.id} size={32} />
              <span className="hidden md:inline max-w-[140px] truncate">{displayName}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-5 md:py-6 flex flex-col gap-5">
        <div className="md:hidden">{joinForm('mobile')}</div>

        <AnimatePresence>
          {searchError && (
            <motion.p
              id="room-code-error"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="self-start md:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950 border border-rose-700 text-rose-100 text-sm font-medium"
            >
              <AlertCircle size={16} />
              {searchError}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="font-display font-bold text-2xl md:text-3xl text-ink">{t('hub.choose_game')}</h1>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0" role="group" aria-label={t('hub.filter_label')}>
            {FILTERS.map((f) => (
              <button key={f} type="button" className="chip-btn" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {t(`hub.filter_${f}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: lista compacta, os 5 jogos cabem numa tela */}
        <ul className="md:hidden flex flex-col gap-2.5">
          {visible.map((g) => (
            <li key={g.slug} className={`accent-${g.accent} flex items-center gap-3 p-2 bg-surface border border-line rounded-2xl`}>
              <img src={g.cover} alt="" className="w-19 h-19 rounded-xl object-cover shrink-0" loading="lazy" />
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-lg text-accent truncate">{gameName(g)}</h2>
                <p className="text-sm text-muted">
                  {t(g.categoryKey)} · {g.players}
                </p>
              </div>
              <button type="button" onClick={() => createRoom(g.slug)} className="btn btn-primary btn-sm shrink-0" aria-label={t('hub.create_room_for', { game: gameName(g) })}>
                {t('hub.create_short')}
              </button>
            </li>
          ))}
        </ul>

        {/* Desktop: destaque + grade */}
        <ul className="hidden md:grid grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr] auto-rows-fr lg:grid-rows-2 lg:h-[max(620px,calc(100dvh-190px))] gap-5">
          {visible.map((g, i) => {
            const featured = i === 0 && visible.length > 2;
            return (
              <motion.li
                layout
                key={g.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                className={`accent-${g.accent} group relative flex flex-col bg-surface border border-line hover:border-accent-line rounded-3xl overflow-hidden transition-colors ${
                  featured ? 'lg:row-span-2' : ''
                }`}
              >
                <div className={`relative overflow-hidden ${featured ? 'flex-1 min-h-56' : 'h-36 lg:h-auto lg:flex-1 lg:min-h-24'}`}>
                  <img
                    src={g.cover}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className={`flex flex-col ${featured ? 'gap-3 p-6' : 'gap-2.5 p-4 flex-1 lg:flex-none'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip chip-accent">{t(g.categoryKey)}</span>
                    <span className="chip">
                      <Users size={12} aria-hidden="true" />
                      {t('hub.players_n', { n: g.players })}
                    </span>
                  </div>
                  <h2 className={`font-display font-bold text-accent ${featured ? 'text-4xl' : 'text-2xl'}`}>{gameName(g)}</h2>
                  <p className={`text-body leading-relaxed ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}>{t(`hub.${g.slug}_desc`)}</p>
                  <button
                    type="button"
                    onClick={() => createRoom(g.slug)}
                    className={`btn btn-primary mt-auto ${featured ? 'self-start btn-lg' : 'w-full'}`}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    {t('hub.create_room')}
                  </button>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
