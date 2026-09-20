import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { api, type FullStatsResponse } from '../lib/api';
import { LanguageSelector } from '../components/LanguageSelector';

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, user, username, setUsername, signOut } = useAuthStore();

  const [newUsername, setNewUsername] = useState(username || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [stats, setStats] = useState<FullStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (username) {
      setNewUsername(username);
    }
  }, [username]);

  useEffect(() => {
    if (!session?.access_token) return;

    let isMounted = true;
    setStatsLoading(true);

    api
      .getStats(session.access_token)
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setStatsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar estatísticas:', err);
        if (isMounted) setStatsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session?.access_token]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      await api.updateProfile(session.access_token, newUsername.trim());
      setUsername(newUsername.trim());
      setMsg({ text: t('profile.username_updated'), type: 'success' });
    } catch (error: any) {
      setMsg({ text: error.message || 'Error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const gameInfoMap: Record<string, { name: string; icon: string; color: string }> = {
    itto: { name: 'ITTO', icon: '🧠', color: 'from-purple-500 to-indigo-600' },
    hanabi: { name: 'Hanabi', icon: '🎆', color: 'from-amber-500 to-rose-600' },
    cah: { name: t('hub.cah_title'), icon: '🃏', color: 'from-zinc-700 to-zinc-900' },
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden p-4 md:p-8">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="crt-overlay" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 gap-4 flex-wrap">
          <button
            onClick={() => navigate('/hub')}
            className="text-purple-400 hover:text-purple-300 font-mono text-sm tracking-wider uppercase flex items-center gap-2 transition-all hover:-translate-x-1 cursor-pointer"
          >
            <span>&larr;</span> {t('profile.back_to_hub')}
          </button>

          <div className="flex items-center gap-4">
            <LanguageSelector />

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-950/40 text-red-400 font-mono text-xs uppercase tracking-wider rounded-lg border border-red-900/50 hover:bg-red-900/50 hover:text-red-200 transition-colors cursor-pointer"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Perfil do Jogador & Edição de Nome */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/50 backdrop-blur-xl rounded-3xl border-2 border-white/10 p-6 shadow-2xl flex flex-col justify-between"
          >
            <div>
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 p-0.5 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-4xl">
                  👾
                </div>
              </div>

              <h1 className="text-2xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mb-1 tracking-wider uppercase">
                {username || 'Jogador'}
              </h1>
              <p className="text-center text-slate-400 font-mono text-xs mb-6 truncate">{user?.email}</p>

              {msg.text && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-6 p-3.5 border-l-4 rounded-xl text-xs font-medium ${
                    msg.type === 'error'
                      ? 'bg-red-950/60 border-red-500 text-red-200'
                      : 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                  }`}
                >
                  {msg.text}
                </motion.div>
              )}

              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="group">
                  <label className="block text-purple-200/80 text-[11px] font-bold mb-1.5 uppercase tracking-wider font-mono">
                    {t('profile.change_username')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full p-3 bg-black/60 border-2 border-white/10 text-white rounded-xl focus:border-fuchsia-400 focus:outline-none transition-all placeholder:text-gray-600 font-medium text-sm"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || newUsername.trim() === username}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black tracking-wider uppercase rounded-xl disabled:opacity-50 border border-fuchsia-400/50 hover:shadow-[0_0_20px_rgba(192,38,211,0.4)] transition-all text-xs cursor-pointer"
                >
                  {loading ? t('profile.saving') : t('profile.save_username')}
                </motion.button>
              </form>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 text-center">
              <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider">
                {t('profile.operator_id')}: <span className="text-gray-400">{user?.id?.substring(0, 8)}...</span>
              </span>
            </div>
          </motion.div>

          {/* Coluna 2 e 3: Estatísticas Globais & por Jogo */}
          <div className="lg:col-span-2 space-y-6">
            {/* CARDS DE RESUMO GLOBAL */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center">
                <span className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">
                  {t('profile.summary_matches')}
                </span>
                <span className="text-3xl font-black text-white">
                  {statsLoading ? '...' : stats?.total_matches || 0}
                </span>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center">
                <span className="block text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1">
                  {t('profile.summary_wins')}
                </span>
                <span className="text-3xl font-black text-emerald-400">
                  {statsLoading ? '...' : stats?.total_wins || 0}
                </span>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center">
                <span className="block text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1">
                  {t('profile.summary_win_rate')}
                </span>
                <span className="text-3xl font-black text-amber-400">
                  {statsLoading ? '...' : `${(stats?.win_rate || 0).toFixed(0)}%`}
                </span>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center">
                <span className="block text-[11px] font-mono text-cyan-400 uppercase tracking-wider mb-1">
                  {t('profile.summary_total_score')}
                </span>
                <span className="text-3xl font-black text-cyan-400">
                  {statsLoading ? '...' : stats?.total_score || 0}
                </span>
              </div>
            </motion.div>

            {/* ESTATÍSTICAS POR JOGO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-xl"
            >
              <h2 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>🏆</span> {t('profile.game_performance')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['itto', 'hanabi', 'cah'].map((slug) => {
                  const stat = stats?.by_game?.find((s) => s.game_slug === slug);
                  const info = gameInfoMap[slug] || {
                    name: slug.toUpperCase(),
                    icon: '🎮',
                    color: 'from-gray-600 to-gray-800',
                  };

                  return (
                    <div
                      key={slug}
                      className="bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="text-2xl">{info.icon}</span>
                        <div>
                          <h3 className="font-bold text-sm text-white">{info.name}</h3>
                          <span className="text-[10px] font-mono text-gray-400">
                            {stat
                              ? t('profile.matches_count', { count: stat.matches_played })
                              : t('profile.no_matches_count')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-white/5 text-xs font-mono">
                        {slug === 'itto' ? (
                          <>
                            <div className="flex justify-between text-gray-300">
                              <span>{t('profile.mode_cooperative')}:</span>
                              <span className="text-purple-400 font-bold">✓</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>{t('profile.highest_level')}:</span>
                              <span className="text-amber-400 font-bold">{t('common.level')} {stat?.high_score || 0}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>{t('profile.total_levels')}:</span>
                              <span className="text-purple-300 font-bold">{stat?.total_score || 0}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between text-gray-300">
                              <span>{t('profile.summary_wins')}:</span>
                              <span className="text-emerald-400 font-bold">{stat?.matches_won || 0}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>{t('profile.high_score')}:</span>
                              <span className="text-amber-400 font-bold">{stat?.high_score || 0} {t('common.pts')}</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                              <span>{t('profile.summary_total_score')}:</span>
                              <span className="text-purple-300 font-bold">{stat?.total_score || 0}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* HISTÓRICO DE PARTIDAS RECENTES */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/40 border border-white/10 rounded-3xl p-6 shadow-xl"
            >
              <h2 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>📜</span> {t('profile.recent_matches')}
              </h2>

              {statsLoading ? (
                <p className="text-gray-500 font-mono text-xs text-center py-6">{t('common.loading')}</p>
              ) : !stats?.recent_matches || stats.recent_matches.length === 0 ? (
                <div className="text-center py-8 text-gray-500 font-mono text-xs">
                  {t('profile.no_matches')}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {stats.recent_matches.map((match) => {
                    const info = gameInfoMap[match.game_slug] || {
                      name: match.game_slug.toUpperCase(),
                      icon: '🎮',
                    };
                    const formattedDate = new Date(match.created_at).toLocaleDateString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={match.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-black/60 border border-white/5 text-xs font-mono"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{info.icon}</span>
                          <div>
                            <span className="font-bold text-white block">{info.name}</span>
                            <span className="text-[10px] text-gray-500">{formattedDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-gray-400 text-right hidden sm:inline text-[11px]">
                            {match.summary || `${t('common.points')}: ${match.score}`}
                          </span>
                          {match.game_slug === 'itto' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              {t('common.level')} {match.score}
                            </span>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                match.won
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              {match.won ? t('profile.victory') : t('profile.defeat')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
