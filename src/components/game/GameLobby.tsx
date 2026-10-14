import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Crown, Play, UserPlus, Bot } from 'lucide-react';
import { Avatar } from './ui';

export interface LobbyPlayer {
  id: string;
  name: string;
  isMe?: boolean;
  isHost?: boolean;
  isOnline?: boolean;
  /** undefined = o jogo não usa "pronto" (ex.: Ludo). */
  isReady?: boolean;
  isBot?: boolean;
  /** Marcador extra do jogo (ex.: cor do Ludo). */
  badge?: React.ReactNode;
}

interface GameLobbyProps {
  description: string;
  players: LobbyPlayer[];
  minPlayers: number;
  maxPlayers: number;
  /** Bloco específico do jogo: variantes, cores, metas, temas. */
  settings?: React.ReactNode;
  howTo: string[];
  isHost: boolean;
  /** Só existe se o jogo usa "pronto". */
  isReadyMe?: boolean;
  onToggleReady?: () => void;
  onStart: () => void;
  /** Motivo de não poder começar; null = pode começar. */
  startBlockedReason: string | null;
  startLabel?: string;
}

/** Lobby único para os cinco jogos. Só o bloco de configuração muda de um jogo para outro. */
export function GameLobby({
  description,
  players,
  minPlayers,
  maxPlayers,
  settings,
  howTo,
  isHost,
  isReadyMe,
  onToggleReady,
  onStart,
  startBlockedReason,
  startLabel,
}: GameLobbyProps) {
  const { t } = useTranslation();
  const [inviteCopied, setInviteCopied] = useState(false);
  const usesReady = players.some((p) => p.isReady !== undefined);
  const openSlots = Math.max(0, Math.min(maxPlayers, 8) - players.length);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // Sem área de transferência: o código continua no cabeçalho
    }
  };

  return (
    <div className="w-full h-full max-w-6xl flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 lg:gap-6">
          {/* Jogadores */}
          <section className="flex flex-col gap-4 min-w-0" aria-labelledby="lobby-players">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 id="lobby-players" className="font-display font-bold text-2xl md:text-3xl text-ink">
                  {t('lobby.players_title')}
                </h2>
                <p className="text-sm md:text-base text-muted">{description}</p>
              </div>
              <span className="font-mono font-bold text-sm text-accent shrink-0">
                {players.length} / {maxPlayers}
              </span>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((p) => (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 min-h-18 px-4 rounded-2xl border bg-surface ${
                    p.isMe ? 'border-accent-line' : 'border-line'
                  } ${p.isOnline === false ? 'opacity-70' : ''}`}
                >
                  {p.isBot ? (
                    <span className="w-11 h-11 rounded-full bg-raised text-muted inline-flex items-center justify-center shrink-0" aria-hidden="true">
                      <Bot size={20} />
                    </span>
                  ) : (
                    <Avatar name={p.name} seed={p.id} size={44} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-ink truncate">{p.name}</span>
                      {p.isMe && <span className="text-xs font-semibold text-muted shrink-0">({t('game.you')})</span>}
                    </div>
                    <span className={`text-xs ${p.isOnline === false ? 'text-rose-300' : 'text-muted'}`}>
                      {p.isOnline === false
                        ? t('lobby.offline')
                        : p.isHost
                        ? t('lobby.host')
                        : p.isBot
                        ? t('lobby.bot')
                        : t('lobby.online')}
                    </span>
                  </div>
                  {p.badge}
                  {p.isHost && <Crown size={16} className="text-amber-300 shrink-0" aria-hidden="true" />}
                  {p.isReady !== undefined &&
                    (p.isReady ? (
                      <span className="chip chip-success">
                        <Check size={14} strokeWidth={3} />
                        {t('lobby.ready')}
                      </span>
                    ) : (
                      <span className="chip chip-warning">
                        <Clock size={14} strokeWidth={2.5} />
                        {t('lobby.waiting')}
                      </span>
                    ))}
                </li>
              ))}

              {openSlots > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={copyInvite}
                    className="w-full min-h-18 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong text-muted hover:text-ink hover:border-accent-line font-bold text-sm transition-colors cursor-pointer"
                  >
                    {inviteCopied ? <Check size={18} /> : <UserPlus size={18} />}
                    {inviteCopied ? t('lobby.invite_copied') : t('lobby.invite')}
                  </button>
                </li>
              )}
            </ul>
          </section>

          {/* Configuração + como jogar */}
          <aside className="flex flex-col gap-4 min-w-0">
            {settings && (
              <section className="surface p-5 flex flex-col gap-4" aria-labelledby="lobby-settings">
                <div className="flex items-center justify-between gap-2">
                  <h3 id="lobby-settings" className="label-caps">
                    {t('lobby.settings')}
                  </h3>
                  {!isHost && <span className="text-xs text-muted">{t('lobby.host_only')}</span>}
                </div>
                {settings}
              </section>
            )}

            <section className="surface p-5 flex flex-col gap-4" aria-labelledby="lobby-howto">
              <h3 id="lobby-howto" className="label-caps">
                {t('lobby.how_to')}
              </h3>
              <ol className="space-y-3">
                {howTo.map((step, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="font-display font-bold text-xl text-accent w-5 shrink-0 leading-6">{i + 1}</span>
                    <span className="text-[15px] leading-relaxed text-body">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>

      {/* Barra de ação */}
      <div className="shrink-0 surface px-4 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {usesReady && onToggleReady ? (
          <button
            type="button"
            onClick={onToggleReady}
            aria-pressed={isReadyMe}
            className={`btn btn-lg ${isReadyMe ? 'btn-success' : 'btn-secondary'}`}
          >
            <Check size={18} strokeWidth={3} />
            {isReadyMe ? t('lobby.ready_cancel') : t('lobby.im_ready')}
          </button>
        ) : (
          <span className="text-sm text-muted">{isHost ? '' : t('lobby.waiting_host')}</span>
        )}

        {isHost ? (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 sm:gap-4">
            {startBlockedReason && <span className="text-sm text-amber-300 text-center sm:text-right">{startBlockedReason}</span>}
            <button type="button" onClick={onStart} disabled={Boolean(startBlockedReason)} className="btn btn-primary btn-lg">
              <Play size={18} fill="currentColor" />
              {startLabel || t('lobby.start')}
            </button>
          </div>
        ) : (
          usesReady && <span className="text-sm text-muted">{t('lobby.waiting_host')}</span>
        )}
      </div>
      {minPlayers > players.length && <span className="sr-only">{t('lobby.need_players', { min: minPlayers })}</span>}
    </div>
  );
}
