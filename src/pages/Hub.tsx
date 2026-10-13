import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageSelector } from '../components/LanguageSelector';
import { api } from '../lib/api';
import { ArrowRight, Users, Sparkles, AlertCircle, PlusCircle, LogIn, Gamepad2 } from 'lucide-react';

import ittoCover from '../assets/games/itto.jpg';
import hanabiCover from '../assets/games/hanabi.jpg';
import cahCover from '../assets/games/cah.jpg';
import ludoCover from '../assets/games/ludo.jpg';
import wavelengthCover from '../assets/games/wavelength.jpg';

interface GameConfig {
  id: string;
  slug: string;
  titleKey: string;
  tagKey: string;
  descKey: string;
  createKey: string;
  playerCount: string;
  cover: string;
  accentColor: string;
  borderHover: string;
  btnGradient: string;
  category: string;
}

const GAMES: GameConfig[] = [
  {
    id: 'wavelength',
    slug: 'wavelength',
    titleKey: 'hub.wavelength_title',
    tagKey: 'hub.wavelength_tag',
    descKey: 'hub.wavelength_desc',
    createKey: 'hub.wavelength_create',
    playerCount: '2+ Jogadores',
    cover: wavelengthCover,
    accentColor: 'text-cyan-400',
    borderHover: 'hover:border-cyan-400/60 hover:shadow-[0_0_35px_rgba(6,182,212,0.25)]',
    btnGradient: 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    category: 'Sintonia & Telepatia',
  },
  {
    id: 'cah',
    slug: 'cah',
    titleKey: 'hub.cah_title',
    tagKey: 'hub.cah_tag',
    descKey: 'hub.cah_desc',
    createKey: 'hub.cah_create',
    playerCount: '3-12 Jogadores',
    cover: cahCover,
    accentColor: 'text-zinc-200',
    borderHover: 'hover:border-zinc-300 hover:shadow-[0_0_35px_rgba(244,244,245,0.18)]',
    btnGradient: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-500/80 shadow-[0_0_20px_rgba(255,255,255,0.15)]',
    category: 'Humor Ácido',
  },
  {
    id: 'ludo',
    slug: 'ludo',
    titleKey: 'hub.ludo_title',
    tagKey: 'hub.ludo_tag',
    descKey: 'hub.ludo_desc',
    createKey: 'hub.ludo_create',
    playerCount: '1-4 Jogadores',
    cover: ludoCover,
    accentColor: 'text-amber-400',
    borderHover: 'hover:border-amber-400/60 hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]',
    btnGradient: 'bg-gradient-to-r from-red-600 via-amber-600 to-emerald-600 hover:brightness-110 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    category: 'Competitivo Clássico',
  },
  {
    id: 'hanabi',
    slug: 'hanabi',
    titleKey: 'hub.hanabi_title',
    tagKey: 'hub.hanabi_tag',
    descKey: 'hub.hanabi_desc',
    createKey: 'hub.hanabi_create',
    playerCount: '2-5 Jogadores',
    cover: hanabiCover,
    accentColor: 'text-sky-400',
    borderHover: 'hover:border-sky-400/60 hover:shadow-[0_0_35px_rgba(56,189,248,0.25)]',
    btnGradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.35)]',
    category: 'Cooperativo',
  },
  {
    id: 'itto',
    slug: 'itto',
    titleKey: 'hub.itto_title',
    tagKey: 'hub.itto_tag',
    descKey: 'hub.itto_desc',
    createKey: 'hub.itto_create',
    playerCount: '2-8 Jogadores',
    cover: ittoCover,
    accentColor: 'text-purple-400',
    borderHover: 'hover:border-purple-400/60 hover:shadow-[0_0_35px_rgba(168,85,247,0.25)]',
    btnGradient: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    category: 'Sincronia Mental',
  },
];

export function Hub() {
  const { t } = useTranslation();
  const { user, username } = useAuthStore();
  const navigate = useNavigate();

  // Unified global room code input
  const [globalCode, setGlobalCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Individual card code drawer toggle
  const [activeCodeDrawer, setActiveCodeDrawer] = useState<string | null>(null);
  const [cardCode, setCardCode] = useState('');

  // Handle Global Join Room with auto-lookup
  const handleGlobalJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = globalCode.trim().toUpperCase();
    if (!cleanCode) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const roomInfo = await api.getRoomInfo(cleanCode);
      if (roomInfo.exists && roomInfo.gameSlug) {
        navigate(`/game/${roomInfo.gameSlug}/${roomInfo.roomId || cleanCode}`);
      } else {
        setSearchError('Sala não encontrada. Verifique o código e tente novamente.');
      }
    } catch {
      setSearchError('Não foi possível verificar a sala. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const createRoom = (gameSlug: string) => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/game/${gameSlug}/${code}`);
  };

  const joinSpecificGame = (gameSlug: string, e: React.FormEvent) => {
    e.preventDefault();
    if (cardCode.trim()) {
      navigate(`/game/${gameSlug}/${cardCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-white p-4 sm:p-6 md:p-8 font-sans overflow-x-hidden bg-grid-pattern selection:bg-purple-500 selection:text-white">
      <div className="crt-overlay" />

      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 max-w-5xl h-[450px] bg-gradient-to-b from-purple-900/25 via-indigo-900/15 to-transparent blur-[140px] rounded-full pointer-events-none" />

      {/* Top Console Bar */}
      <header className="relative z-10 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center mb-8 md:mb-12 border-b border-white/10 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Gamepad2 size={28} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              PARTY HUB
            </h1>
            <p className="text-xs text-gray-400 tracking-wide">
              {t('hub.subtitle')}
            </p>
          </div>
        </div>

        {/* User Badge & Language Selector */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <LanguageSelector />

          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 bg-slate-900/80 hover:bg-slate-800/90 px-4 py-2.5 border border-white/10 rounded-xl transition-all cursor-pointer shadow-lg group active:scale-95"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-xs shadow-md">
              {(username || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                {t('hub.profile_btn')}
              </span>
              <span className="text-xs font-bold text-gray-200 group-hover:text-purple-300 transition-colors truncate max-w-[120px]">
                {username || user?.email}
              </span>
            </div>
            <ArrowRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto space-y-10 md:space-y-14">
        {/* Global Join Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
              <Sparkles size={14} />
              <span>Multiplayer Rápido</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tem um código de convite?
            </h2>
            <p className="text-sm text-gray-300">
              Digite o código da sala de qualquer jogo para entrar instantaneamente na partida.
            </p>

            <form onSubmit={handleGlobalJoin} className="pt-2 max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="EX: A1B2"
                  maxLength={6}
                  value={globalCode}
                  onChange={(e) => {
                    setGlobalCode(e.target.value.toUpperCase());
                    setSearchError(null);
                  }}
                  className="w-full bg-black/60 border-2 border-white/20 focus:border-purple-400 text-center uppercase text-xl font-bold tracking-widest rounded-xl py-3 px-4 outline-none font-mono transition-all text-white placeholder:text-gray-600 shadow-inner"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !globalCode.trim()}
                className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer active:scale-95 shrink-0"
              >
                {isSearching ? (
                  <span>Buscando...</span>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Entrar na Sala</span>
                  </>
                )}
              </button>
            </form>

            <AnimatePresence>
              {searchError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-medium"
                >
                  <AlertCircle size={14} />
                  <span>{searchError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Games Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xl font-bold tracking-tight text-gray-200">
              Catálogo de Jogos
            </h3>
            <span className="text-xs text-gray-400">
              5 jogos disponíveis
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {GAMES.map((game) => {
              const isDrawerOpen = activeCodeDrawer === game.id;

              return (
                <motion.article
                  key={game.id}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`group relative bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ${game.borderHover}`}
                >
                  {/* Game Cover Art */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/40 border-b border-white/10">
                    <img
                      src={game.cover}
                      alt={t(game.titleKey)}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20" />

                    {/* Top Badges */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-black/60 backdrop-blur-md border border-white/10 text-gray-200 shadow-md">
                        {game.category}
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-black/60 backdrop-blur-md border border-white/10 text-gray-200 shadow-md">
                        <Users size={12} className="text-gray-400" />
                        <span>{t(game.tagKey)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className={`text-2xl font-bold tracking-tight ${game.accentColor}`}>
                        {t(game.titleKey)}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed line-clamp-3">
                        {t(game.descKey)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2.5 pt-2">
                      <button
                        onClick={() => createRoom(game.slug)}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${game.btnGradient}`}
                      >
                        <PlusCircle size={16} />
                        <span>{t(game.createKey)}</span>
                      </button>

                      {/* Direct Room Code Accordion */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCodeDrawer(isDrawerOpen ? null : game.id);
                          setCardCode('');
                        }}
                        className="w-full text-center py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors font-medium cursor-pointer"
                      >
                        {isDrawerOpen ? 'Fechar entrada direta' : 'Ou entrar com código desta sala'}
                      </button>

                      <AnimatePresence>
                        {isDrawerOpen && (
                          <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={(e) => joinSpecificGame(game.slug, e)}
                            className="flex gap-2 pt-1"
                          >
                            <input
                              type="text"
                              placeholder="CÓDIGO"
                              maxLength={6}
                              value={cardCode}
                              onChange={(e) => setCardCode(e.target.value.toUpperCase())}
                              className="flex-1 bg-black/60 border border-white/20 text-center uppercase text-sm font-bold tracking-widest rounded-lg py-2 px-3 outline-none font-mono focus:border-white/50 text-white"
                            />
                            <button
                              type="submit"
                              disabled={!cardCode.trim()}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold uppercase disabled:opacity-40 cursor-pointer transition-colors"
                            >
                              Entrar
                            </button>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}