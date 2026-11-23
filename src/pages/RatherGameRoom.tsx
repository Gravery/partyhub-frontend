import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  useRatherStore,
  RATHER_CATEGORIES,
  RATHER_ROUND_OPTIONS,
  type Dilemma,
  type RatherCategory,
  type RatherOption,
  type RatherState,
} from '../store/useRatherStore';
import { useAuthStore } from '../store/useAuthStore';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { type TabOption } from '../components/game/SideDrawer';
import { GameLobby, type LobbyPlayer } from '../components/game/GameLobby';
import { lobbyBlockReason } from '../lib/gameUi';
import { playAction } from '../lib/actionLayer';
import {
  StatusPill,
  GameNotice,
  ConnectionNotices,
  GameLoading,
  Avatar,
  PlayerRow,
  RulesList,
  EmptyState,
  ResultModal,
} from '../components/game/ui';
import {
  Users,
  BookOpen,
  History as HistoryIcon,
  Check,
  X,
  Shuffle,
  ArrowRight,
  Trophy,
  Home,
  RotateCcw,
  CircleStop,
  Eye,
  EyeOff,
} from 'lucide-react';

type SideTab = 'players' | 'history' | 'rules';

// Identidade do jogo: A sempre lima, B sempre violeta
const OPTION_STYLE: Record<RatherOption, { card: string; picked: string; letter: string; badge: string; bar: string }> = {
  A: {
    card: 'border-lime-400/40 bg-lime-400/5 hover:bg-lime-400/10',
    picked: 'border-lime-300 bg-lime-400/20 ring-4 ring-lime-300/40',
    letter: 'bg-lime-300 text-lime-950',
    badge: 'bg-lime-300 text-lime-950 border-lime-300',
    bar: 'bg-lime-400',
  },
  B: {
    card: 'border-violet-400/40 bg-violet-400/5 hover:bg-violet-400/10',
    picked: 'border-violet-300 bg-violet-400/20 ring-4 ring-violet-300/40',
    letter: 'bg-violet-300 text-violet-950',
    badge: 'bg-violet-300 text-violet-950 border-violet-300',
    bar: 'bg-violet-400',
  },
};

function OptionLetter({ option, size = 'md' }: { option: RatherOption; size?: 'sm' | 'md' | 'lg' }) {
  const dims = size === 'lg' ? 'w-12 h-12 text-2xl' : size === 'sm' ? 'w-7 h-7 text-sm' : 'w-9 h-9 text-lg';
  return (
    <span className={`${dims} ${OPTION_STYLE[option].letter} rounded-xl font-display font-bold inline-flex items-center justify-center shrink-0`} aria-hidden="true">
      {option}
    </span>
  );
}

/** Cartões grandes do dilema; clicáveis na fase de escolha */
function DilemmaCards({
  dilemma,
  picked,
  onPick,
  disabled,
}: {
  dilemma: Dilemma;
  picked?: RatherOption | '';
  onPick?: (o: RatherOption) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const card = (o: RatherOption, text: string) => {
    const isPicked = picked === o;
    return (
      <button
        type="button"
        onClick={() => onPick?.(o)}
        disabled={disabled || !onPick}
        aria-pressed={isPicked}
        className={`relative flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-3 md:gap-5 p-5 md:p-8 rounded-3xl border-2 text-center transition-all ${
          isPicked ? OPTION_STYLE[o].picked : OPTION_STYLE[o].card
        } ${onPick && !disabled ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
      >
        <OptionLetter option={o} size="lg" />
        <span className="font-display font-bold text-xl md:text-3xl xl:text-4xl text-ink leading-tight text-balance">{text}</span>
        {isPicked && (
          <span className="absolute top-3 right-3 chip chip-success">
            <Check size={14} strokeWidth={3} />
            {t('rather.your_choice')}
          </span>
        )}
      </button>
    );
  };
  return (
    <div className="w-full h-full flex flex-col md:flex-row items-stretch gap-3 md:gap-0 min-h-0">
      {card('A', dilemma.a)}
      <div className="relative flex items-center justify-center shrink-0 md:w-0 z-10" aria-hidden="true">
        <span className="md:absolute w-14 h-14 md:w-20 md:h-20 rounded-full bg-ground border-4 border-accent font-display font-bold text-lg md:text-2xl text-ink inline-flex items-center justify-center">
          {t('rather.or')}
        </span>
      </div>
      {card('B', dilemma.b)}
    </div>
  );
}

/** Versão compacta do dilema, para as fases de palpite e revelação */
function DilemmaStrip({ dilemma }: { dilemma: Dilemma }) {
  return (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
      {(['A', 'B'] as RatherOption[]).map((o) => (
        <div key={o} className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${OPTION_STYLE[o].card}`}>
          <OptionLetter option={o} size="sm" />
          <span className="font-bold text-ink text-sm md:text-base leading-snug">{o === 'A' ? dilemma.a : dilemma.b}</span>
        </div>
      ))}
    </div>
  );
}

/** Pontos da rodada voando dos seus palpites até o seu placar */
function PointsToken({ points }: { points: number }) {
  return (
    <div className="w-full h-full rounded-full bg-lime-300 text-lime-950 font-display font-bold text-lg flex items-center justify-center shadow-lg shadow-black/50">
      +{points}
    </div>
  );
}

export function RatherGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const myId = user?.id || '';
  const token = session?.access_token || '';

  const {
    gameState,
    isReconnecting,
    reconnectAttempt,
    errorMsg,
    disconnectNotice,
    soundEnabled,
    connect,
    disconnect,
    manualReconnect,
    toggleReady,
    setOptions,
    startGame,
    choose,
    guess,
    skipDilemma,
    nextRound,
    endGame,
    restartGame,
    toggleSound,
    clearError,
  } = useRatherStore();

  const [sideTab, setSideTab] = useState<SideTab>('players');
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => {
    if (!roomId || !token) return;
    connect(roomId, token);
    return () => disconnect();
    // Depende só de quem está logado: renovar o token não pode derrubar a conexão
  }, [roomId, myId]);

  // Fim de jogo fecha a gaveta para o resultado ficar à vista
  const overNow = gameState?.state === 'GAME_OVER';
  const [seenOver, setSeenOver] = useState(overNow);
  if (overNow !== seenOver) {
    setSeenOver(overNow);
    if (overNow) setSideOpen(false);
  }

  // Revelação: as colunas pulsam com a divisão do grupo e seus acertos voam para o seu placar
  const hasState = Boolean(gameState);
  const phaseNow = gameState?.state;
  const roundNow = gameState?.round;
  const prevPhase = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!gameState) return;
    const prev = prevPhase.current;
    prevPhase.current = gameState.state;
    if (prev === undefined || prev === gameState.state || gameState.state !== 'REVEAL') return;
    const pts = gameState.history[gameState.history.length - 1]?.points?.[myId] || 0;
    const asked = gameState.guessNeeded?.[myId] || 0;
    // A tela da revelação entra com transição; espera ela montar
    playAction({ to: 'wr-col-A', alsoPulse: ['wr-col-B'], effect: 'pulse', delayMs: 700 });
    if (asked > 0) {
      playAction({
        from: 'wr-myguesses',
        to: pts > 0 ? 'wr-score' : 'wr-myguesses',
        token: pts > 0 ? <PointsToken points={pts} /> : undefined,
        size: { w: 64, h: 36 },
        effect: pts > 0 ? 'pulse' : 'shake',
        caption: {
          text: pts > 0 ? t('rather.action_points', { count: pts, total: asked }) : t('rather.action_no_points', { total: asked }),
          tone: pts > 0 ? 'success' : 'info',
        },
      });
    }
  }, [phaseNow, roundNow, hasState]);

  if (!gameState) {
    return (
      <GameLoading
        accent="lime"
        message={isReconnecting ? t('rather.reconnecting') : t('rather.connecting')}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const gs: RatherState = gameState;
  const phase = gs.state;
  const isLobby = phase === 'LOBBY';
  const isOver = phase === 'GAME_OVER';
  const isLeader = gs.leaderId === myId;
  const name = (pid: string) => gs.playerNames[pid] || pid.substring(0, 6);
  const online = (pid: string) => gs.playerConnected[pid] !== false;
  const totalPlayers = gs.players.length;
  const lastRound = gs.history[gs.history.length - 1];

  // Escolha
  const chosenCount = gs.players.filter((p) => gs.chosen[p]).length;
  const waitingChoice = gs.players.filter((p) => online(p) && !gs.chosen[p]);

  // Palpites
  const targets = gs.players.filter((p) => p !== myId && gs.chosen[p]);
  const myGuesses = gs.myGuesses || {};
  const missingGuesses = targets.filter((p) => !myGuesses[p]).length;
  const waitingGuess = gs.players.filter((p) => online(p) && gs.chosen[p] && (gs.guessDone[p] || 0) < (gs.guessNeeded[p] || 0));

  const openSide = (tab: SideTab) => {
    setSideTab(tab);
    setSideOpen(true);
  };

  /* ---------- Cabeçalho ---------- */
  let status: React.ReactNode = null;
  if (isLobby) {
    const ready = gs.players.filter((p) => gs.playerReady[p]).length;
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('lobby.ready_count', { ready, total: totalPlayers })} />;
  } else if (phase === 'CHOOSING') {
    status = !gs.myChoice ? (
      <StatusPill tone="turn" title={t('rather.status_choose')} detail={t('rather.status_choose_detail')} />
    ) : (
      <StatusPill tone="wait" title={t('rather.status_waiting_choices')} detail={`${chosenCount}/${totalPlayers}`} />
    );
  } else if (phase === 'GUESSING') {
    status =
      missingGuesses > 0 ? (
        <StatusPill tone="turn" title={t('rather.status_guess')} detail={t('rather.status_guess_detail', { count: missingGuesses })} />
      ) : (
        <StatusPill tone="wait" title={t('rather.status_waiting_guesses')} detail={waitingGuess.map(name).join(', ')} />
      );
  } else if (phase === 'REVEAL') {
    const mine = lastRound?.points?.[myId] || 0;
    status = <StatusPill tone={mine > 0 ? 'success' : 'info'} title={t('rather.status_reveal', { count: mine })} detail={t('rather.status_reveal_detail', { count: gs.guessNeeded[myId] || 0 })} />;
  }

  const stats = !isLobby ? (
    <>
      <span className="chip shrink-0">
        {t('common.round')} {Math.max(gs.round, 1)}/{gs.totalRounds}
      </span>
      <span className="chip chip-accent shrink-0" data-anchor="wr-score">
        {gs.scores[myId] || 0} {t('common.pts')}
      </span>
    </>
  ) : null;

  /* ---------- Painel lateral ---------- */
  const ranking = [...gs.players].sort((a, b) => (gs.scores[b] || 0) - (gs.scores[a] || 0));
  const playerSubtitle = (pid: string) => {
    if (phase === 'CHOOSING') return gs.chosen[pid] ? t('rather.chose') : t('rather.choosing');
    if (phase === 'GUESSING') return `${t('rather.guessed')} ${gs.guessDone[pid] || 0}/${gs.guessNeeded[pid] || 0}`;
    return t('rather.points_n', { count: gs.scores[pid] || 0 });
  };

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('rather.tab_scores'), icon: <Users size={16} /> },
    { id: 'history', label: t('game.history'), icon: <HistoryIcon size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];

  const sideContent =
    sideTab === 'players' ? (
      <div className="flex flex-col gap-2">
        {(isLobby ? gs.players : ranking).map((pid) => (
          <PlayerRow
            key={pid}
            id={pid}
            name={name(pid)}
            isMe={pid === myId}
            isHost={pid === gs.leaderId}
            isOnline={online(pid)}
            subtitle={isLobby ? t('lobby.online') : playerSubtitle(pid)}
            right={!isLobby ? <span className="font-mono font-bold text-accent shrink-0">{gs.scores[pid] || 0}</span> : null}
          />
        ))}
        {isLeader && !isLobby && !isOver && (
          <button type="button" onClick={endGame} className="btn btn-ghost btn-sm mt-2 self-start text-rose-300">
            <CircleStop size={16} />
            {t('rather.end_game')}
          </button>
        )}
      </div>
    ) : sideTab === 'history' ? (
      gs.history.length === 0 ? (
        <EmptyState>{t('rather.no_history')}</EmptyState>
      ) : (
        <ol className="flex flex-col gap-3">
          {[...gs.history].reverse().map((h) => (
            <li key={h.round} className="p-3 rounded-2xl bg-ground border border-line flex flex-col gap-2">
              <span className="label-caps">
                {t('common.round')} {h.round} · {t(`rather.cat_${h.dilemma.category}`)}
              </span>
              {(['A', 'B'] as RatherOption[]).map((o) => {
                const who = gs.players.filter((p) => h.choices[p] === o);
                return (
                  <div key={o} className="flex items-start gap-2">
                    <OptionLetter option={o} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm text-ink font-semibold leading-snug">{o === 'A' ? h.dilemma.a : h.dilemma.b}</p>
                      <p className="text-xs text-muted">{who.length ? who.map((p) => (p === myId ? t('game.you') : name(p))).join(', ') : '—'}</p>
                    </div>
                  </div>
                );
              })}
            </li>
          ))}
        </ol>
      )
    ) : (
      <RulesList
        items={[
          { title: t('rather.rule1_title'), body: t('rather.rule1_body') },
          { title: t('rather.rule2_title'), body: t('rather.rule2_body') },
          { title: t('rather.rule3_title'), body: t('rather.rule3_body') },
        ]}
      />
    );

  /* ---------- Lobby ---------- */
  const lobbyPlayers: LobbyPlayer[] = gs.players.map((pid) => ({
    id: pid,
    name: name(pid),
    isMe: pid === myId,
    isHost: pid === gs.leaderId,
    isOnline: online(pid),
    isReady: Boolean(gs.playerReady[pid]),
  }));
  const selected = gs.categories.length ? gs.categories : RATHER_CATEGORIES;
  const toggleCategory = (c: RatherCategory) => {
    const next = selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c];
    if (next.length === 0) return; // pelo menos uma categoria
    setOptions(gs.totalRounds, next);
  };
  const lobbySettings = (
    <div className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2" disabled={!isLeader}>
        <legend className="text-sm font-bold text-ink mb-2">{t('rather.rounds_label')}</legend>
        <div className="flex flex-wrap gap-2">
          {RATHER_ROUND_OPTIONS.map((r) => (
            <button key={r} type="button" className="chip-btn" aria-pressed={gs.totalRounds === r} onClick={() => setOptions(r, gs.categories)}>
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2" disabled={!isLeader}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <legend className="text-sm font-bold text-ink">{t('rather.categories_label')}</legend>
          {isLeader && gs.categories.length > 0 && (
            <button type="button" className="text-xs font-bold text-accent hover:underline" onClick={() => setOptions(gs.totalRounds, [])}>
              {t('rather.all_categories')}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {RATHER_CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip-btn" aria-pressed={selected.includes(c)} onClick={() => toggleCategory(c)}>
              {t(`rather.cat_${c}`)}
              <span className="opacity-60 font-mono">{gs.categoryCounts[c] || 0}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );

  /* ---------- Palco ---------- */
  const roundHeader = gs.dilemma && (
    <div className="w-full flex items-center justify-between gap-3 shrink-0">
      <span className="chip chip-accent">{t(`rather.cat_${gs.dilemma.category}`)}</span>
      <span className="label-caps">{t('rather.would_you_rather')}</span>
    </div>
  );

  const choosingStage = gs.dilemma && (
    <div className="w-full h-full max-w-6xl flex flex-col gap-3 md:gap-4 min-h-0">
      {roundHeader}
      <div className="flex-1 min-h-0">
        <DilemmaCards dilemma={gs.dilemma} picked={gs.myChoice} onPick={choose} />
      </div>
    </div>
  );

  const guessingStage = gs.dilemma && (
    <div className="w-full h-full max-w-4xl flex flex-col gap-3 md:gap-4 min-h-0">
      {roundHeader}
      <DilemmaStrip dilemma={gs.dilemma} />
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="label-caps">{t('rather.guess_title')}</h2>
        {gs.myChoice && (
          <span className="chip">
            {t('rather.you_chose')} <OptionLetter option={gs.myChoice} size="sm" />
          </span>
        )}
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
        {targets.map((pid) => (
          <li
            key={pid}
            className={`flex items-center gap-3 p-3 rounded-2xl border ${myGuesses[pid] ? 'border-line bg-surface' : 'border-accent-line bg-surface'}`}
          >
            <Avatar name={name(pid)} seed={pid} size={40} />
            <span className="flex-1 min-w-0 font-bold text-ink truncate">{name(pid)}</span>
            <div className="flex gap-2 shrink-0" role="group" aria-label={t('rather.guess_for', { name: name(pid) })}>
              {(['A', 'B'] as RatherOption[]).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => guess(pid, o)}
                  aria-pressed={myGuesses[pid] === o}
                  aria-label={t('rather.guess_option', { name: name(pid), option: o })}
                  className={`w-14 h-12 rounded-xl border-2 font-display font-bold text-xl transition-all ${
                    myGuesses[pid] === o ? OPTION_STYLE[o].badge : 'border-line-strong bg-raised text-muted hover:text-ink'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </li>
        ))}
        {targets.length === 0 && <EmptyState>{t('rather.nobody_to_guess')}</EmptyState>}
      </ul>
    </div>
  );

  const choices = gs.choices || {};
  const allGuesses = gs.guesses || {};
  const revealStage = gs.dilemma && (
    <div className="w-full h-full max-w-5xl flex flex-col gap-3 md:gap-4 min-h-0 overflow-y-auto pr-1">
      {roundHeader}
      {(() => {
        const countA = gs.players.filter((p) => choices[p] === 'A').length;
        const countB = gs.players.filter((p) => choices[p] === 'B').length;
        const total = countA + countB || 1;
        return (
          <>
            {/* Como o grupo se dividiu */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-raised shrink-0" aria-hidden="true">
              <motion.div className={OPTION_STYLE.A.bar} initial={{ width: '50%' }} animate={{ width: `${(countA / total) * 100}%` }} transition={{ duration: 0.6 }} />
              <motion.div className={OPTION_STYLE.B.bar} initial={{ width: '50%' }} animate={{ width: `${(countB / total) * 100}%` }} transition={{ duration: 0.6 }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
              {(['A', 'B'] as RatherOption[]).map((o) => {
                const who = gs.players.filter((p) => choices[p] === o);
                return (
                  <section key={o} data-anchor={`wr-col-${o}`} className={`p-4 rounded-2xl border-2 flex flex-col gap-3 ${OPTION_STYLE[o].card}`}>
                    <div className="flex items-start gap-3">
                      <OptionLetter option={o} />
                      <p className="flex-1 font-display font-bold text-lg text-ink leading-snug">{o === 'A' ? gs.dilemma!.a : gs.dilemma!.b}</p>
                      <span className="font-mono font-bold text-2xl text-ink shrink-0">{Math.round((who.length / total) * 100)}%</span>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {who.map((p) => (
                        <li key={p} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-ground border border-line">
                          <Avatar name={name(p)} seed={p} size={24} />
                          <span className="text-sm font-bold text-ink">{p === myId ? t('game.you') : name(p)}</span>
                        </li>
                      ))}
                      {who.length === 0 && <li className="text-sm text-muted">{t('rather.nobody')}</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* Meus palpites e quem me leu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
        <section className="surface p-4 flex flex-col gap-2" data-anchor="wr-myguesses">
          <h3 className="label-caps">{t('rather.my_guesses')}</h3>
          <ul className="flex flex-col gap-1.5">
            {gs.players
              .filter((p) => p !== myId && allGuesses[myId]?.[p])
              .map((p) => {
                const right = allGuesses[myId][p] === choices[p];
                return (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    {right ? <Check size={16} className="text-emerald-300 shrink-0" strokeWidth={3} /> : <X size={16} className="text-rose-300 shrink-0" strokeWidth={3} />}
                    <span className="flex-1 min-w-0 truncate text-ink font-semibold">{name(p)}</span>
                    <span className="text-muted text-xs">{t('rather.guess_vs_choice', { guess: allGuesses[myId][p], choice: choices[p] })}</span>
                  </li>
                );
              })}
            {!allGuesses[myId] && <li className="text-sm text-muted">{t('rather.no_guesses')}</li>}
          </ul>
        </section>
        <section className="surface p-4 flex flex-col gap-2">
          <h3 className="label-caps">{t('rather.who_read_me')}</h3>
          <ul className="flex flex-col gap-1.5">
            {gs.players
              .filter((p) => p !== myId && allGuesses[p]?.[myId])
              .map((p) => {
                const right = allGuesses[p][myId] === choices[myId];
                return (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    {right ? <Eye size={16} className="text-emerald-300 shrink-0" /> : <EyeOff size={16} className="text-muted shrink-0" />}
                    <span className="flex-1 min-w-0 truncate text-ink font-semibold">{name(p)}</span>
                    <span className="text-muted text-xs">{right ? t('rather.read_you') : t('rather.missed_you')}</span>
                  </li>
                );
              })}
          </ul>
        </section>
      </div>
    </div>
  );

  /* ---------- Rodapé ---------- */
  let footer: React.ReactNode = null;
  if (phase === 'CHOOSING') {
    footer = (
      <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {gs.myChoice
              ? t('rather.waiting_choices_from', { names: waitingChoice.map(name).join(', ') || '…' })
              : t('rather.choose_hint')}
          </p>
          {isLeader && chosenCount === 0 && (
            <button type="button" onClick={skipDilemma} className="btn btn-ghost btn-sm shrink-0">
              <Shuffle size={16} />
              {t('rather.skip_dilemma')}
            </button>
          )}
        </div>
      </div>
    );
  } else if (phase === 'GUESSING') {
    footer = (
      <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
        <p className="max-w-3xl mx-auto text-center text-sm text-muted">
          {missingGuesses > 0
            ? t('rather.guesses_left', { count: missingGuesses })
            : t('rather.waiting_guesses_from', { names: waitingGuess.map(name).join(', ') || '…' })}
        </p>
      </div>
    );
  } else if (phase === 'REVEAL') {
    const isLast = gs.round >= gs.totalRounds;
    footer = (
      <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="font-display font-bold text-2xl text-accent block">
              +{lastRound?.points?.[myId] || 0} {t('common.pts')}
            </span>
            <span className="text-sm text-muted block truncate">{t('rather.total_points', { count: gs.scores[myId] || 0 })}</span>
          </div>
          <button type="button" onClick={nextRound} className="btn btn-primary btn-lg shrink-0">
            {isLast ? t('rather.see_result') : t('rather.next_round')}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Fim de jogo ---------- */
  const best = Math.max(0, ...gs.players.map((p) => gs.scores[p] || 0));
  const winners = gs.players.filter((p) => best > 0 && (gs.scores[p] || 0) === best);
  const ratio = (p: string) => (gs.received[p] ? (gs.predicted[p] || 0) / gs.received[p] : -1);
  const rated = gs.players.filter((p) => (gs.received[p] || 0) > 0);
  // Destaques só fazem sentido quando há diferença entre os jogadores
  const spread = rated.length > 1 && Math.max(...rated.map(ratio)) !== Math.min(...rated.map(ratio));
  const mostPredictable = spread ? rated.reduce((a, b) => (ratio(b) > ratio(a) ? b : a)) : null;
  const mostMysterious = spread ? rated.reduce((a, b) => (ratio(b) < ratio(a) ? b : a)) : null;
  // Posição com empate: mesma pontuação, mesma posição
  const position = (pid: string) => 1 + gs.players.filter((p) => (gs.scores[p] || 0) > (gs.scores[pid] || 0)).length;
  const winnerNames = winners.map((p) => (p === myId ? t('game.you') : name(p))).join(', ');

  return (
    <GameShell
      accent="lime"
      phaseKey={isLobby ? 'lobby' : `${phase}-${gs.round}`}
      showRail={!isLobby}
      side={{
        title: t('rather.title'),
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as SideTab),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle={t('rather.title')}
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => openSide('players')}
          onToggleLog={() => openSide('history')}
          onToggleRules={() => openSide('rules')}
          railVisible={!isLobby}
          status={status}
          stats={stats}
        />
      }
      notices={
        <AnimatePresence>
          <ConnectionNotices
            key="conn"
            isReconnecting={isReconnecting}
            reconnectAttempt={reconnectAttempt}
            onReconnect={manualReconnect}
            disconnectedName={disconnectNotice}
          />
          {errorMsg && <GameNotice key="err" tone="error" title={errorMsg} onClose={clearError} />}
        </AnimatePresence>
      }
      footer={footer}
      overlay={
        <AnimatePresence>
          {isOver && (
            <ResultModal
              key="over"
              tone={winners.includes(myId) ? 'win' : 'neutral'}
              icon={<Trophy size={32} />}
              eyebrow={t('rather.over_eyebrow')}
              title={
                winners.length > 1
                  ? t('rather.over_tie', { names: winnerNames })
                  : winners.includes(myId)
                  ? t('rather.over_you_won')
                  : winners.length
                  ? t('rather.over_winner', { names: winnerNames })
                  : t('rather.over_nobody')
              }
              actions={
                <>
                  <button type="button" onClick={() => navigate('/hub')} className="btn btn-secondary btn-lg sm:flex-1">
                    <Home size={18} />
                    {t('common.back_to_hub')}
                  </button>
                  <button type="button" onClick={restartGame} className="btn btn-primary btn-lg sm:flex-1">
                    <RotateCcw size={18} />
                    {t('common.play_again')}
                  </button>
                </>
              }
            >
              <div className="flex flex-col gap-3 text-left">
                <ol className="flex flex-col gap-2 max-h-[34dvh] overflow-y-auto">
                  {ranking.map((pid) => (
                    <li key={pid} className="flex items-center gap-3 p-3 rounded-2xl bg-raised border border-line">
                      <span className="font-display font-bold text-lg text-accent w-6 shrink-0">{position(pid)}</span>
                      <Avatar name={name(pid)} seed={pid} size={30} />
                      <span className="flex-1 min-w-0 font-bold text-ink truncate">{pid === myId ? t('game.you') : name(pid)}</span>
                      <span className="font-mono font-bold text-ink">{gs.scores[pid] || 0}</span>
                    </li>
                  ))}
                </ol>
                {(mostPredictable || mostMysterious) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mostPredictable && (
                      <div className="p-3 rounded-2xl bg-ground border border-line">
                        <span className="label-caps block">{t('rather.award_predictable')}</span>
                        <span className="font-bold text-ink">{mostPredictable === myId ? t('game.you') : name(mostPredictable)}</span>
                        <span className="text-xs text-muted block">
                          {t('rather.award_ratio', { hit: gs.predicted[mostPredictable] || 0, total: gs.received[mostPredictable] || 0 })}
                        </span>
                      </div>
                    )}
                    {mostMysterious && mostMysterious !== mostPredictable && (
                      <div className="p-3 rounded-2xl bg-ground border border-line">
                        <span className="label-caps block">{t('rather.award_mysterious')}</span>
                        <span className="font-bold text-ink">{mostMysterious === myId ? t('game.you') : name(mostMysterious)}</span>
                        <span className="text-xs text-muted block">
                          {t('rather.award_ratio', { hit: gs.predicted[mostMysterious] || 0, total: gs.received[mostMysterious] || 0 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ResultModal>
          )}
        </AnimatePresence>
      }
    >
      {isLobby && (
        <GameLobby
          description={t('rather.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={2}
          maxPlayers={12}
          isHost={isLeader}
          isReadyMe={Boolean(gs.playerReady[myId])}
          onToggleReady={toggleReady}
          onStart={startGame}
          startBlockedReason={lobbyBlockReason(t, lobbyPlayers, 2)}
          howTo={[t('rather.howto_1'), t('rather.howto_2'), t('rather.howto_3')]}
          settings={lobbySettings}
        />
      )}
      {phase === 'CHOOSING' && choosingStage}
      {phase === 'GUESSING' && guessingStage}
      {(phase === 'REVEAL' || isOver) && revealStage}
    </GameShell>
  );
}
