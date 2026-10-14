import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { avatarColor } from '../../lib/gameUi';
import { AlertTriangle, CheckCircle2, Crown, Info, Loader2, WifiOff, X } from 'lucide-react';

/* ---------- Status: de quem é a vez e o que fazer agora ---------- */

export type StatusTone = 'turn' | 'wait' | 'info' | 'success' | 'danger';

const STATUS_STYLES: Record<StatusTone, { box: string; dot: string }> = {
  turn: { box: 'bg-accent-soft border-accent-line text-ink', dot: 'bg-accent shadow-[0_0_0_4px_var(--accent-soft)] animate-pulse' },
  wait: { box: 'bg-raised border-line-strong text-body', dot: 'bg-muted' },
  info: { box: 'bg-raised border-line-strong text-body', dot: 'bg-accent' },
  success: { box: 'bg-emerald-950 border-emerald-700 text-emerald-100', dot: 'bg-emerald-400' },
  danger: { box: 'bg-rose-950 border-rose-700 text-rose-100', dot: 'bg-rose-400' },
};

export function StatusPill({ tone, title, detail }: { tone: StatusTone; title: string; detail?: string }) {
  const s = STATUS_STYLES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2.5 min-h-10 px-4 rounded-full border text-sm min-w-0 shrink ${s.box}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} aria-hidden="true" />
      <span className="font-extrabold whitespace-nowrap">{title}</span>
      {detail && <span className="opacity-80 truncate">· {detail}</span>}
    </div>
  );
}

/* ---------- Avisos flutuantes ---------- */

export type NoticeTone = 'error' | 'success' | 'info' | 'warning';

const NOTICE_STYLES: Record<NoticeTone, { box: string; icon: React.ReactNode }> = {
  error: { box: 'bg-rose-950 border-rose-600 text-rose-100', icon: <AlertTriangle size={18} className="text-rose-300 shrink-0" /> },
  warning: { box: 'bg-amber-950 border-amber-600 text-amber-100', icon: <WifiOff size={18} className="text-amber-300 shrink-0" /> },
  success: { box: 'bg-emerald-950 border-emerald-600 text-emerald-100', icon: <CheckCircle2 size={18} className="text-emerald-300 shrink-0" /> },
  info: { box: 'bg-surface border-line-strong text-body', icon: <Info size={18} className="text-accent shrink-0" /> },
};

export function GameNotice({
  tone,
  title,
  detail,
  onClose,
  action,
}: {
  tone: NoticeTone;
  title: string;
  detail?: string;
  onClose?: () => void;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const s = NOTICE_STYLES[tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto w-full max-w-md flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-2xl ${s.box}`}
    >
      {s.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-snug">{title}</p>
        {detail && <p className="text-sm opacity-85 mt-0.5 leading-snug">{detail}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="-m-2 w-11 h-11 inline-flex items-center justify-center rounded-xl opacity-80 hover:opacity-100 cursor-pointer shrink-0"
          aria-label={t('game.close')}
        >
          <X size={18} />
        </button>
      )}
    </motion.div>
  );
}

/** Avisos de conexão iguais em todos os jogos. */
export function ConnectionNotices({
  isReconnecting,
  reconnectAttempt,
  onReconnect,
  disconnectedName,
}: {
  isReconnecting?: boolean;
  reconnectAttempt?: number;
  onReconnect?: () => void;
  disconnectedName?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <>
      {isReconnecting && (
        <GameNotice
          key="reconnecting"
          tone="warning"
          title={t('common.reconnecting', { attempt: reconnectAttempt ?? 1 })}
          action={
            onReconnect && (
              <button type="button" onClick={onReconnect} className="btn btn-sm btn-secondary">
                {t('common.reconnect_now')}
              </button>
            )
          }
        />
      )}
      {disconnectedName && (
        <GameNotice
          key="player-disconnected"
          tone="warning"
          title={t('common.player_disconnected_wait', { name: disconnectedName })}
          detail={t('common.match_paused')}
        />
      )}
    </>
  );
}

/* ---------- Tela de carregamento comum ---------- */

export function GameLoading({
  accent,
  message,
  onRetry,
}: {
  accent: string;
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`accent-${accent} h-[100dvh] bg-ground flex flex-col items-center justify-center gap-5 p-6 text-center`}>
      <Loader2 size={40} className="text-accent animate-spin" aria-hidden="true" />
      <p className="text-base font-semibold text-body max-w-sm" role="status">
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-primary">
          {t('common.reconnect_now')}
        </button>
      )}
    </div>
  );
}

/* ---------- Avatar e linha de jogador ---------- */

export function Avatar({ name, seed, size = 40 }: { name: string; seed?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="rounded-full inline-flex items-center justify-center font-extrabold text-white shrink-0"
      style={{ width: size, height: size, background: avatarColor(seed || name), fontSize: size * 0.4 }}
    >
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function PlayerRow({
  id,
  name,
  isMe,
  isHost,
  isOnline = true,
  highlight,
  subtitle,
  right,
}: {
  id: string;
  name: string;
  isMe?: boolean;
  isHost?: boolean;
  isOnline?: boolean;
  highlight?: boolean;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-center gap-3 min-h-15 px-3 py-2 rounded-2xl border ${
        highlight ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
      } ${isOnline ? '' : 'opacity-70'}`}
    >
      <Avatar name={name} seed={id} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-ink truncate">{name}</span>
          {isMe && <span className="text-xs font-semibold text-muted shrink-0">({t('game.you')})</span>}
          {isHost && <Crown size={14} className="text-amber-300 shrink-0" aria-label={t('lobby.host')} />}
        </div>
        <span className={`text-xs ${isOnline ? 'text-muted' : 'text-rose-300'}`}>
          {isOnline ? subtitle : t('lobby.offline')}
        </span>
      </div>
      {right}
    </div>
  );
}

/* ---------- Regras ---------- */

export function RulesList({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="font-display font-bold text-lg text-accent w-5 shrink-0 leading-6">{i + 1}</span>
          <div className="space-y-1">
            <h3 className="font-bold text-ink text-sm">{item.title}</h3>
            <div className="text-sm text-body leading-relaxed">{item.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted text-center py-6">{children}</p>;
}

/* ---------- Modal de resultado ---------- */

export function ResultModal({
  tone = 'neutral',
  icon,
  eyebrow,
  title,
  children,
  actions,
}: {
  tone?: 'win' | 'lose' | 'neutral';
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const border = tone === 'win' ? 'border-emerald-500' : tone === 'lose' ? 'border-rose-600' : 'border-accent-line';
  const iconBox = tone === 'win' ? 'bg-emerald-950 text-emerald-300' : tone === 'lose' ? 'bg-rose-950 text-rose-300' : 'bg-accent-soft text-accent';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`w-full max-w-lg max-h-[90dvh] overflow-y-auto bg-surface border-2 ${border} rounded-3xl p-6 md:p-8 shadow-2xl text-center flex flex-col items-center gap-4`}
      >
        {icon && <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${iconBox}`}>{icon}</div>}
        <div className="space-y-1">
          {eyebrow && <p className="label-caps">{eyebrow}</p>}
          <h2 className="font-display font-bold text-2xl md:text-3xl text-ink">{title}</h2>
        </div>
        {children}
        {actions && <div className="w-full flex flex-col-reverse sm:flex-row gap-3 pt-2">{actions}</div>}
      </motion.div>
    </div>
  );
}
