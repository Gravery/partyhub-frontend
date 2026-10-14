import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { api, type FullStatsResponse } from '../lib/api';
import { LanguageSelector } from '../components/LanguageSelector';
import { Avatar } from '../components/game/ui';
import { ChevronLeft, LogOut, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import ittoCover from '../assets/games/itto.jpg';
import hanabiCover from '../assets/games/hanabi.jpg';
import cahCover from '../assets/games/cah.jpg';
import ludoCover from '../assets/games/ludo.jpg';
import wavelengthCover from '../assets/games/wavelength.jpg';

const GAME_INFO: Record<string, { name?: string; cover: string; accent: string }> = {
  itto: { name: 'Itto', cover: ittoCover, accent: 'violet' },
  hanabi: { name: 'Hanabi', cover: hanabiCover, accent: 'sky' },
  cah: { cover: cahCover, accent: 'zinc' },
  ludo: { name: 'Ludo', cover: ludoCover, accent: 'amber' },
  wavelength: { name: 'Wavelength', cover: wavelengthCover, accent: 'cyan' },
};

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, user, username, setUsername, signOut } = useAuthStore();

  const [newUsername, setNewUsername] = useState(username || '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [stats, setStats] = useState<FullStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (username) setNewUsername(username);
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
    setMsg(null);
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

  const gameName = (slug: string) => GAME_INFO[slug]?.name || t(`hub.${slug}_title`, { defaultValue: slug.toUpperCase() });
  const playedSlugs = Array.from(new Set([...Object.keys(GAME_INFO), ...(stats?.by_game?.map((s) => s.game_slug) || [])]));
  const value = (v: string | number) => (statsLoading ? '…' : v);

  const summary = [
    { label: t('profile.summary_matches'), value: value(stats?.total_matches || 0) },
    { label: t('profile.summary_wins'), value: value(stats?.total_wins || 0) },
    { label: t('profile.summary_win_rate'), value: value(`${(stats?.win_rate || 0).toFixed(0)}%`) },
    { label: t('profile.summary_total_score'), value: value(stats?.total_score || 0) },
  ];

  return (
    <div className="accent-brand min-h-[100dvh] bg-ground text-body">
      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 md:h-19 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/hub')} className="btn btn-ghost pl-2">
            <ChevronLeft size={20} />
            {t('profile.back_to_hub')}
          </button>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button type="button" onClick={handleLogout} className="btn btn-secondary btn-sm">
              <LogOut size={16} />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="surface p-6 flex flex-col gap-6 h-fit">
          <div className="flex flex-col items-center gap-3 text-center">
            <Avatar name={username || user?.email || '?'} seed={user?.id} size={88} />
            <div>
              <h1 className="font-display font-bold text-2xl text-ink">{username || t('common.player')}</h1>
              <p className="text-sm text-muted truncate max-w-[260px]">{user?.email}</p>
            </div>
          </div>

          <AnimatePresence>
            {msg && (
              <motion.p
                role={msg.type === 'error' ? 'alert' : 'status'}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
                  msg.type === 'error' ? 'bg-rose-950 border-rose-700 text-rose-100' : 'bg-emerald-950 border-emerald-700 text-emerald-100'
                }`}
              >
                {msg.type === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
                {msg.text}
              </motion.p>
            )}
          </AnimatePresence>

          <form onSubmit={handleUpdate} className="flex flex-col gap-3">
            <label htmlFor="profile-username" className="text-sm font-bold text-ink">
              {t('profile.change_username')}
            </label>
            <input id="profile-username" type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="field" required />
            <button type="submit" disabled={loading || newUsername.trim() === username} className="btn btn-primary btn-block">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? t('profile.saving') : t('profile.save_username')}
            </button>
          </form>
        </motion.section>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Resumo */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summary.map((s) => (
              <div key={s.label} className="surface p-4 flex flex-col gap-1">
                <span className="label-caps">{s.label}</span>
                <span className="font-display font-bold text-3xl text-ink">{s.value}</span>
              </div>
            ))}
          </motion.section>

          {/* Por jogo */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="surface p-5 md:p-6 flex flex-col gap-4">
            <h2 className="font-display font-bold text-xl text-ink">{t('profile.game_performance')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {playedSlugs.map((slug) => {
                const stat = stats?.by_game?.find((s) => s.game_slug === slug);
                const info = GAME_INFO[slug];
                const rows =
                  slug === 'itto'
                    ? [
                        [t('profile.highest_level'), `${t('common.level')} ${stat?.high_score || 0}`],
                        [t('profile.total_levels'), stat?.total_score || 0],
                      ]
                    : [
                        [t('profile.summary_wins'), stat?.matches_won || 0],
                        [t('profile.high_score'), `${stat?.high_score || 0} ${t('common.pts')}`],
                        [t('profile.summary_total_score'), stat?.total_score || 0],
                      ];
                return (
                  <div key={slug} className={`accent-${info?.accent || 'brand'} rounded-2xl border border-line bg-ground p-4 flex flex-col gap-3`}>
                    <div className="flex items-center gap-3">
                      {info && <img src={info.cover} alt="" className="w-11 h-11 rounded-xl object-cover" loading="lazy" />}
                      <div className="min-w-0">
                        <h3 className="font-bold text-accent truncate">{gameName(slug)}</h3>
                        <span className="text-xs text-muted">
                          {stat ? t('profile.matches_count', { count: stat.matches_played }) : t('profile.no_matches_count')}
                        </span>
                      </div>
                    </div>
                    <dl className="flex flex-col gap-1.5 pt-3 border-t border-line text-sm">
                      {rows.map(([k, v]) => (
                        <div key={String(k)} className="flex justify-between gap-2">
                          <dt className="text-muted">{k}</dt>
                          <dd className="font-bold text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* Histórico */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="surface p-5 md:p-6 flex flex-col gap-4">
            <h2 className="font-display font-bold text-xl text-ink">{t('profile.recent_matches')}</h2>
            {statsLoading ? (
              <p className="text-sm text-muted text-center py-6">{t('common.loading')}</p>
            ) : !stats?.recent_matches?.length ? (
              <p className="text-sm text-muted text-center py-6">{t('profile.no_matches')}</p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                {stats.recent_matches.map((match) => {
                  const info = GAME_INFO[match.game_slug];
                  const date = new Date(match.created_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                  return (
                    <li key={match.id} className="flex items-center gap-3 p-3 rounded-xl bg-ground border border-line">
                      {info && <img src={info.cover} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-ink block truncate">{gameName(match.game_slug)}</span>
                        <span className="text-xs text-muted">{date}</span>
                      </div>
                      <span className="hidden sm:inline text-sm text-muted text-right truncate max-w-[40%]">
                        {match.summary || `${t('common.points')}: ${match.score}`}
                      </span>
                      {match.game_slug === 'itto' ? (
                        <span className="chip">{t('common.level')} {match.score}</span>
                      ) : (
                        <span className={`chip ${match.won ? 'chip-success' : 'chip-danger'}`}>{match.won ? t('profile.victory') : t('profile.defeat')}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
