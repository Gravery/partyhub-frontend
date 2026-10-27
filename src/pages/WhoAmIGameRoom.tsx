import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence } from 'framer-motion';
import {
  useWhoAmIStore,
  type LogEntry,
  type TurnKind,
  type WhoAmICategory,
  type WhoAmIState,
} from '../store/useWhoAmIStore';
import { useAuthStore } from '../store/useAuthStore';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { type TabOption } from '../components/game/SideDrawer';
import { GameLobby, type LobbyPlayer } from '../components/game/GameLobby';
import { lobbyBlockReason } from '../lib/gameUi';
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
  ScrollText,
  UserRound,
  MapPin,
  Package,
  PawPrint,
  Shapes,
  HelpCircle,
  Target,
  Flag,
  Send,
  Check,
  X,
  Pencil,
  Trophy,
  Home,
  RotateCcw,
  CircleStop,
  PartyPopper,
} from 'lucide-react';

type SideTab = 'players' | 'logs' | 'rules';

const CATEGORIES: { id: WhoAmICategory; icon: React.ReactNode }[] = [
  { id: 'character', icon: <UserRound size={16} /> },
  { id: 'place', icon: <MapPin size={16} /> },
  { id: 'object', icon: <Package size={16} /> },
  { id: 'animal', icon: <PawPrint size={16} /> },
  { id: 'free', icon: <Shapes size={16} /> },
];

function categoryIcon(cat: WhoAmICategory | null, size = 14) {
  const found = CATEGORIES.find((c) => c.id === cat);
  return found ? React.cloneElement(found.icon as React.ReactElement<{ size: number }>, { size }) : null;
}

/* ---------- Peças ---------- */

function ResultChip({ entry }: { entry: LogEntry }) {
  const { t } = useTranslation();
  const votes = entry.kind !== 'give_up' && !entry.auto ? ` ${entry.yes}–${entry.no}` : '';
  switch (entry.result) {
    case 'yes':
      return <span className="chip chip-success shrink-0">{t('whoami.result_yes')}{votes}</span>;
    case 'no':
      return <span className="chip chip-danger shrink-0">{t('whoami.result_no')}{votes}</span>;
    case 'split':
      return <span className="chip chip-warning shrink-0">{t('whoami.result_split')}{votes}</span>;
    case 'correct':
      return <span className="chip chip-success shrink-0">{t('whoami.result_correct')}</span>;
    case 'wrong':
      return <span className="chip chip-danger shrink-0">{t('whoami.result_wrong')}{votes}</span>;
    default:
      return <span className="chip shrink-0">{t('whoami.result_gave_up')}</span>;
  }
}

function Backlog({ entries, emptyText }: { entries: LogEntry[]; emptyText: string }) {
  const { t } = useTranslation();
  if (entries.length === 0) return <EmptyState>{emptyText}</EmptyState>;
  return (
    <ol className="flex flex-col gap-2">
      {[...entries].reverse().map((e, i) => (
        <li
          key={`${e.round}-${i}`}
          className={`flex items-start gap-3 p-3 rounded-2xl border ${i === 0 ? 'border-accent-line bg-accent-soft' : 'border-line bg-ground'}`}
        >
          <span className="mt-0.5 text-muted shrink-0" aria-hidden="true">
            {e.kind === 'guess' ? <Target size={16} /> : e.kind === 'give_up' ? <Flag size={16} /> : <HelpCircle size={16} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-semibold break-words">
              {e.kind === 'give_up' ? t('whoami.log_gave_up') : e.kind === 'guess' ? t('whoami.log_guess', { text: e.text }) : e.text}
            </p>
            <span className="text-xs text-muted">
              {t('common.round')} {e.round}
              {e.auto ? ` · ${t('whoami.auto_correct')}` : ''}
            </span>
          </div>
          {e.kind !== 'give_up' && <ResultChip entry={e} />}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Tela ---------- */

export function WhoAmIGameRoom() {
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
    startGame,
    submitSecret,
    submitTurn,
    retractTurn,
    answer,
    giveUp,
    endGame,
    restartGame,
    toggleSound,
    clearError,
  } = useWhoAmIStore();

  const [sideTab, setSideTab] = useState<SideTab>('players');
  const [sideOpen, setSideOpen] = useState(false);
  const [logPlayer, setLogPlayer] = useState<string>('');
  const [category, setCategory] = useState<WhoAmICategory>('character');
  const [secretInput, setSecretInput] = useState('');
  const [editingSecret, setEditingSecret] = useState(false);
  const [turnKind, setTurnKind] = useState<TurnKind>('question');
  const [turnInput, setTurnInput] = useState('');
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);

  useEffect(() => {
    if (!roomId || !token) return;
    connect(roomId, token);
    return () => disconnect();
  // Depende só de quem está logado: renovar o token não pode derrubar a conexão
  }, [roomId, myId]);

  // Nova rodada: limpa o campo e volta para "pergunta" (ajuste durante o render, sem efeito)
  const round = gameState?.round;
  const [seenRound, setSeenRound] = useState(round);
  if (round !== seenRound) {
    setSeenRound(round);
    setTurnInput('');
    setTurnKind('question');
    setConfirmGiveUp(false);
  }
  // Fim de jogo fecha a gaveta para o resultado ficar à vista
  const overNow = gameState?.state === 'GAME_OVER';
  const [seenOver, setSeenOver] = useState(overNow);
  if (overNow !== seenOver) {
    setSeenOver(overNow);
    if (overNow) setSideOpen(false);
  }

  if (!gameState) {
    return (
      <GameLoading
        accent="pink"
        message={isReconnecting ? t('whoami.reconnecting') : t('whoami.connecting')}
        onRetry={isReconnecting ? manualReconnect : undefined}
      />
    );
  }

  const gs: WhoAmIState = gameState;
  const phase = gs.state;
  const isLobby = phase === 'LOBBY';
  const isOver = phase === 'GAME_OVER';
  const isLeader = gs.leaderId === myId;
  const name = (pid: string) => gs.playerNames[pid] || pid.substring(0, 6);
  const online = (pid: string) => gs.playerConnected[pid] !== false;
  const myStatus = gs.status[myId] || 'active';
  const myTurn = gs.turns[myId];
  const myTurnSent = Boolean(myTurn);
  const totalPlayers = gs.players.length;
  const solvedCount = gs.players.filter((p) => gs.status[p] === 'solved').length;

  // Escrita
  const target = gs.writingFor;
  const mySecretForTarget = target ? gs.secrets[target] : undefined;
  const wroteAlready = Boolean(mySecretForTarget?.submitted);
  const writtenCount = gs.players.filter((p) => gs.secrets[p]?.submitted).length;

  // Perguntas
  const waitingAsk = gs.players.filter((p) => gs.status[p] === 'active' && online(p) && !gs.turns[p]);

  // Respostas
  const askers = gs.players.filter((p) => gs.turns[p]?.kind);
  const toAnswer = askers.filter((a) => a !== myId && !gs.turns[a]?.auto);
  const pendingForMe = toAnswer.filter((a) => !gs.answers[a]?.[myId]);
  const waitingAnswer = gs.players.filter(
    (p) => online(p) && askers.some((a) => a !== p && !gs.turns[a]?.auto && !gs.answers[a]?.[p])
  );

  const openSide = (tab: SideTab) => {
    setSideTab(tab);
    setSideOpen(true);
  };

  /* ---------- Status no cabeçalho ---------- */
  let status: React.ReactNode = null;
  if (isLobby) {
    const ready = gs.players.filter((p) => gs.playerReady[p]).length;
    status = <StatusPill tone="wait" title={t('status.waiting_room')} detail={t('lobby.ready_count', { ready, total: totalPlayers })} />;
  } else if (phase === 'WRITING') {
    status = !wroteAlready ? (
      <StatusPill tone="turn" title={t('whoami.status_write', { name: name(target) })} detail={t('whoami.status_write_detail')} />
    ) : (
      <StatusPill tone="wait" title={t('whoami.status_waiting_writers')} detail={`${writtenCount}/${totalPlayers}`} />
    );
  } else if (phase === 'ASKING') {
    if (myStatus === 'solved') status = <StatusPill tone="success" title={t('whoami.status_you_solved')} detail={t('whoami.status_keep_answering')} />;
    else if (myStatus === 'gave_up') status = <StatusPill tone="info" title={t('whoami.status_you_gave_up')} detail={t('whoami.status_keep_answering')} />;
    else if (!myTurnSent) status = <StatusPill tone="turn" title={t('whoami.status_ask')} detail={t('whoami.status_ask_detail')} />;
    else status = <StatusPill tone="wait" title={t('whoami.status_waiting_questions')} detail={waitingAsk.map(name).join(', ')} />;
  } else if (phase === 'ANSWERING') {
    status =
      pendingForMe.length > 0 ? (
        <StatusPill tone="turn" title={t('whoami.status_answer')} detail={t('whoami.status_answer_detail', { count: pendingForMe.length })} />
      ) : (
        <StatusPill tone="wait" title={t('whoami.status_waiting_answers')} detail={waitingAnswer.map(name).join(', ')} />
      );
  }

  const stats =
    !isLobby && phase !== 'WRITING' ? (
      <>
        <span className="chip shrink-0">
          {t('common.round')} {gs.round}
        </span>
        <span className="chip chip-accent shrink-0">{t('whoami.solved_count', { solved: solvedCount, total: totalPlayers })}</span>
      </>
    ) : null;

  /* ---------- Painel lateral ---------- */
  const playerSubtitle = (pid: string) => {
    if (gs.status[pid] === 'solved') return t('whoami.solved_in_round', { round: gs.solvedRound[pid] });
    if (gs.status[pid] === 'gave_up') return t('whoami.gave_up');
    if (phase === 'WRITING') return gs.secrets[gs.players.find((p) => gs.secrets[p]?.writerId === pid) || '']?.submitted ? t('whoami.wrote') : t('whoami.writing');
    if (phase === 'ASKING') return gs.turns[pid] ? t('whoami.sent') : t('whoami.thinking');
    return t('lobby.online');
  };

  const sideTabs: TabOption[] = [
    { id: 'players', label: t('game.players_count', { count: totalPlayers }), icon: <Users size={16} /> },
    { id: 'logs', label: t('whoami.tab_logs'), icon: <ScrollText size={16} /> },
    { id: 'rules', label: t('game.rules'), icon: <BookOpen size={16} /> },
  ];
  const selectedLogPlayer = logPlayer && gs.players.includes(logPlayer) ? logPlayer : myId;

  const sideContent =
    sideTab === 'players' ? (
      <div className="flex flex-col gap-2">
        {gs.players.map((pid) => (
          <PlayerRow
            key={pid}
            id={pid}
            name={name(pid)}
            isMe={pid === myId}
            isHost={pid === gs.leaderId}
            isOnline={online(pid)}
            highlight={gs.status[pid] === 'solved'}
            subtitle={isLobby ? t('lobby.online') : playerSubtitle(pid)}
            right={gs.status[pid] === 'solved' ? <Trophy size={16} className="text-amber-300 shrink-0" aria-hidden="true" /> : null}
          />
        ))}
        {isLeader && !isLobby && !isOver && (
          <button type="button" onClick={endGame} className="btn btn-ghost btn-sm mt-2 self-start text-rose-300">
            <CircleStop size={16} />
            {t('whoami.end_game')}
          </button>
        )}
      </div>
    ) : sideTab === 'logs' ? (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('whoami.tab_logs')}>
          {gs.players.map((pid) => (
            <button key={pid} type="button" className="chip-btn" aria-pressed={selectedLogPlayer === pid} onClick={() => setLogPlayer(pid)}>
              {pid === myId ? t('game.you') : name(pid)}
            </button>
          ))}
        </div>
        <Backlog entries={gs.logs[selectedLogPlayer] || []} emptyText={t('whoami.no_logs')} />
      </div>
    ) : (
      <RulesList
        items={[
          { title: t('whoami.rule1_title'), body: t('whoami.rule1_body') },
          { title: t('whoami.rule2_title'), body: t('whoami.rule2_body') },
          { title: t('whoami.rule3_title'), body: t('whoami.rule3_body') },
          { title: t('whoami.rule4_title'), body: t('whoami.rule4_body') },
        ]}
      />
    );

  /* ---------- Rodapé (ação do jogador) ---------- */
  const handleTurn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnInput.trim()) return;
    submitTurn(turnKind, turnInput.trim());
  };

  let footer: React.ReactNode = null;
  if (phase === 'ASKING') {
    footer = (
      <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          {myStatus !== 'active' ? (
            <p className="text-center text-sm text-muted py-2">
              {t('whoami.waiting_others_ask', { names: waitingAsk.map(name).join(', ') || '…' })}
            </p>
          ) : myTurnSent ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="label-caps block">{myTurn?.kind === 'guess' ? t('whoami.your_guess') : t('whoami.your_question')}</span>
                <span className="font-bold text-ink block truncate">“{myTurn?.text}”</span>
              </div>
              <button type="button" onClick={retractTurn} className="btn btn-secondary shrink-0">
                <Pencil size={16} />
                {t('whoami.edit')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleTurn} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2" role="group" aria-label={t('whoami.turn_kind')}>
                  <button type="button" className="chip-btn" aria-pressed={turnKind === 'question'} onClick={() => setTurnKind('question')}>
                    <HelpCircle size={14} />
                    {t('whoami.kind_question')}
                  </button>
                  <button type="button" className="chip-btn" aria-pressed={turnKind === 'guess'} onClick={() => setTurnKind('guess')}>
                    <Target size={14} />
                    {t('whoami.kind_guess')}
                  </button>
                </div>
                {confirmGiveUp ? (
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={giveUp} className="btn btn-danger btn-sm">
                      {t('whoami.confirm_give_up')}
                    </button>
                    <button type="button" onClick={() => setConfirmGiveUp(false)} className="btn btn-ghost btn-sm" aria-label={t('common.cancel')}>
                      <X size={16} />
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmGiveUp(true)} className="btn btn-ghost btn-sm">
                    <Flag size={16} />
                    {t('whoami.give_up')}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <label htmlFor="wa-turn" className="sr-only">
                  {turnKind === 'guess' ? t('whoami.kind_guess') : t('whoami.kind_question')}
                </label>
                <input
                  id="wa-turn"
                  type="text"
                  maxLength={140}
                  autoComplete="off"
                  value={turnInput}
                  onChange={(e) => setTurnInput(e.target.value)}
                  placeholder={turnKind === 'guess' ? t('whoami.guess_placeholder') : t('whoami.question_placeholder')}
                  className="field flex-1 min-w-0 font-semibold"
                />
                <button type="submit" disabled={!turnInput.trim()} className="btn btn-primary shrink-0">
                  <Send size={16} />
                  <span className="hidden sm:inline">{t('whoami.send')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  } else if (phase === 'ANSWERING') {
    footer = (
      <div className="w-full bg-surface border-t border-line px-3 md:px-6 py-3">
        <p className="max-w-3xl mx-auto text-center text-sm text-muted">
          {pendingForMe.length > 0
            ? t('whoami.answers_left', { count: pendingForMe.length })
            : t('whoami.waiting_answers_from', { names: waitingAnswer.map(name).join(', ') || '…' })}
        </p>
      </div>
    );
  }

  /* ---------- Palco ---------- */
  const lobbyPlayers: LobbyPlayer[] = gs.players.map((pid) => ({
    id: pid,
    name: name(pid),
    isMe: pid === myId,
    isHost: pid === gs.leaderId,
    isOnline: online(pid),
    isReady: Boolean(gs.playerReady[pid]),
  }));

  const writingStage = (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-xl mx-auto flex flex-col gap-4 py-2">
        <section className="surface p-5 md:p-6 flex flex-col gap-5" aria-labelledby="wa-write-title">
          <div className="flex items-center gap-3">
            <Avatar name={name(target)} seed={target} size={48} />
            <div className="min-w-0">
              <span className="label-caps block">{t('whoami.write_for_label')}</span>
              <h2 id="wa-write-title" className="font-display font-bold text-2xl text-ink truncate">
                {name(target)}
              </h2>
            </div>
          </div>

          {wroteAlready && !editingSecret ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent-soft border border-accent-line">
              <Check size={20} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="chip chip-accent">
                  {categoryIcon(mySecretForTarget?.category || null)}
                  {t(`whoami.cat_${mySecretForTarget?.category}`)}
                </span>
                <p className="font-display font-bold text-xl text-ink mt-1 break-words">{mySecretForTarget?.text}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm shrink-0"
                onClick={() => {
                  setCategory(mySecretForTarget?.category || 'character');
                  setSecretInput(mySecretForTarget?.text || '');
                  setEditingSecret(true);
                }}
              >
                <Pencil size={16} />
                {t('whoami.edit')}
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!secretInput.trim()) return;
                submitSecret(category, secretInput.trim());
                setEditingSecret(false);
              }}
            >
              <fieldset className="flex flex-col gap-2">
                <legend className="label-caps mb-2">{t('whoami.category_label')}</legend>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button key={c.id} type="button" className="chip-btn" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                      {c.icon}
                      {t(`whoami.cat_${c.id}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-2">
                <span className="label-caps">{t('whoami.secret_label', { name: name(target) })}</span>
                <input
                  type="text"
                  maxLength={60}
                  autoComplete="off"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder={t(`whoami.ph_${category}`)}
                  className="field font-semibold text-lg"
                />
              </label>
              <p className="text-sm text-muted">{t('whoami.secret_hint')}</p>
              <button type="submit" disabled={!secretInput.trim()} className="btn btn-primary btn-lg">
                <Send size={18} />
                {t('whoami.send_secret')}
              </button>
            </form>
          )}
        </section>

        <section className="surface p-5 flex flex-col gap-3" aria-label={t('whoami.writing_progress')}>
          <div className="flex items-center justify-between">
            <h3 className="label-caps">{t('whoami.writing_progress')}</h3>
            <span className="font-mono font-bold text-sm text-accent">
              {writtenCount}/{totalPlayers}
            </span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {gs.players.map((writer) => {
              const done = gs.players.some((p) => gs.secrets[p]?.writerId === writer && gs.secrets[p]?.submitted);
              return (
                <li key={writer} className={`chip ${done ? 'chip-success' : ''}`}>
                  {done ? <Check size={14} /> : null}
                  {writer === myId ? t('game.you') : name(writer)}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );

  const tableTile = (pid: string) => {
    const s = gs.secrets[pid];
    const isMe = pid === myId;
    const st = gs.status[pid];
    return (
      <li
        key={pid}
        className={`shrink-0 w-44 lg:w-auto flex flex-col gap-2 p-3 md:p-4 rounded-2xl border ${
          isMe ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
        } ${online(pid) ? '' : 'opacity-60'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={name(pid)} seed={pid} size={30} />
          <span className="font-bold text-ink truncate flex-1">{isMe ? t('game.you') : name(pid)}</span>
          {st === 'solved' && <Trophy size={16} className="text-amber-300 shrink-0" aria-label={t('whoami.solved')} />}
          {st === 'gave_up' && <Flag size={16} className="text-muted shrink-0" aria-label={t('whoami.gave_up')} />}
        </div>
        {s?.category && (
          <span className="chip self-start">
            {categoryIcon(s.category)}
            {t(`whoami.cat_${s.category}`)}
          </span>
        )}
        <p className={`font-display font-bold text-lg md:text-xl break-words leading-tight ${s?.text ? 'text-ink' : 'text-accent'}`}>
          {s?.text ?? '???'}
        </p>
        <p className={`text-xs ${st === 'solved' ? 'text-emerald-300' : 'text-muted'}`}>
          {playerSubtitle(pid)}
          {s?.text && s.writerId && !isMe ? ` · ${t('whoami.by', { name: s.writerId === myId ? t('game.you') : name(s.writerId) })}` : ''}
        </p>
      </li>
    );
  };

  const answerCards = (
    <ul className="flex flex-col gap-3">
      {askers.map((asker) => {
        const turn = gs.turns[asker];
        const s = gs.secrets[asker];
        const isMine = asker === myId;
        const myAnswer = gs.answers[asker]?.[myId];
        const answered = Object.keys(gs.answers[asker] || {}).length;
        const needed = gs.players.filter((p) => p !== asker && online(p)).length;
        return (
          <li
            key={asker}
            className={`p-4 rounded-2xl border flex flex-col gap-3 ${
              !isMine && !turn.auto && !myAnswer ? 'border-accent-line bg-surface' : 'border-line bg-surface'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={name(asker)} seed={asker} size={36} />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-ink block truncate">{isMine ? t('game.you') : name(asker)}</span>
                {!isMine && s?.text && (
                  <span className="text-sm text-muted block truncate">
                    {t('whoami.is_secret')} <strong className="text-accent">{s.text}</strong>
                  </span>
                )}
              </div>
              <span className="chip shrink-0">
                {turn.kind === 'guess' ? <Target size={14} /> : <HelpCircle size={14} />}
                {turn.kind === 'guess' ? t('whoami.kind_guess') : t('whoami.kind_question')}
              </span>
            </div>
            <p className="font-display font-bold text-xl md:text-2xl text-ink break-words">
              {turn.kind === 'guess' ? t('whoami.log_guess', { text: turn.text }) : `“${turn.text}”`}
            </p>
            {turn.auto ? (
              <span className="chip chip-success self-start">
                <PartyPopper size={14} />
                {t('whoami.auto_correct')}
              </span>
            ) : isMine ? (
              <p className="text-sm text-muted">{t('whoami.your_turn_waiting', { answered, needed })}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => answer(asker, 'yes')}
                  aria-pressed={myAnswer === 'yes'}
                  className={`btn btn-lg ${myAnswer === 'yes' ? 'btn-success ring-2 ring-emerald-400' : 'btn-secondary'}`}
                >
                  <Check size={18} strokeWidth={3} />
                  {t('whoami.answer_yes')}
                </button>
                <button
                  type="button"
                  onClick={() => answer(asker, 'no')}
                  aria-pressed={myAnswer === 'no'}
                  className={`btn btn-lg ${myAnswer === 'no' ? 'btn-danger ring-2 ring-rose-400' : 'btn-secondary'}`}
                >
                  <X size={18} strokeWidth={3} />
                  {t('whoami.answer_no')}
                </button>
              </div>
            )}
          </li>
        );
      })}
      {toAnswer.length === 0 && <EmptyState>{t('whoami.nothing_to_answer')}</EmptyState>}
    </ul>
  );

  const playStage = (
    <div className="w-full h-full max-w-6xl flex flex-col lg:flex-row gap-4 min-h-0">
      <section className="flex flex-col gap-3 min-h-0 lg:flex-1" aria-labelledby="wa-main-title">
        <h2 id="wa-main-title" className="label-caps shrink-0">
          {phase === 'ANSWERING' ? t('whoami.answer_title') : t('whoami.table_title')}
        </h2>
        {phase === 'ANSWERING' ? (
          <div className="min-h-0 overflow-y-auto pr-1">{answerCards}</div>
        ) : (
          <ul className="flex lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-3 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto min-h-0 pb-1 lg:content-start">
            {[myId, ...gs.players.filter((p) => p !== myId)].filter((p) => gs.players.includes(p)).map(tableTile)}
          </ul>
        )}
      </section>

      <section
        className={`surface p-4 flex-col gap-3 min-h-0 flex-1 lg:flex-none lg:w-[380px] ${phase === 'ANSWERING' ? 'hidden lg:flex' : 'flex'}`}
        aria-labelledby="wa-log-title"
      >
        <div className="flex items-center justify-between gap-2 shrink-0">
          <h2 id="wa-log-title" className="label-caps">
            {t('whoami.your_log')}
          </h2>
          {gs.secrets[myId]?.category && (
            <span className="chip chip-accent">
              {categoryIcon(gs.secrets[myId].category)}
              {t(`whoami.cat_${gs.secrets[myId].category}`)}
            </span>
          )}
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">
          <Backlog entries={gs.logs[myId] || []} emptyText={t('whoami.no_logs_yet')} />
        </div>
      </section>
    </div>
  );

  /* ---------- Fim de jogo ---------- */
  const ranking = [
    ...gs.players.filter((p) => gs.status[p] === 'solved').sort((a, b) => gs.solvedRound[a] - gs.solvedRound[b]),
    ...gs.players.filter((p) => gs.status[p] !== 'solved'),
  ];
  const firstRound = ranking.length && gs.status[ranking[0]] === 'solved' ? gs.solvedRound[ranking[0]] : 0;
  const winners = gs.players.filter((p) => gs.status[p] === 'solved' && gs.solvedRound[p] === firstRound);
  const iWon = winners.includes(myId);

  return (
    <GameShell
      accent="pink"
      phaseKey={phase === 'ANSWERING' ? 'answering' : isLobby ? 'lobby' : phase === 'WRITING' ? 'writing' : 'table'}
      showRail={!isLobby}
      side={{
        title: t('whoami.title'),
        tabs: sideTabs,
        activeTab: sideTab,
        onTabChange: (id) => setSideTab(id as SideTab),
        content: sideContent,
      }}
      sideOpen={sideOpen}
      onSideClose={() => setSideOpen(false)}
      header={
        <GameHeader
          gameTitle={t('whoami.title')}
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => openSide('players')}
          onToggleLog={() => openSide('logs')}
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
              tone={iWon ? 'win' : winners.length ? 'neutral' : 'lose'}
              icon={<Trophy size={32} />}
              eyebrow={t('whoami.over_eyebrow')}
              title={
                iWon
                  ? t('whoami.over_you_won')
                  : winners.length
                  ? t('whoami.over_winner', { names: winners.map(name).join(', ') })
                  : t('whoami.over_nobody')
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
              <ol className="flex flex-col gap-2 text-left max-h-[45dvh] overflow-y-auto">
                {ranking.map((pid, i) => (
                  <li key={pid} className="flex items-center gap-3 p-3 rounded-2xl bg-raised border border-line">
                    <span className="font-display font-bold text-lg text-accent w-6 shrink-0">
                      {gs.status[pid] === 'solved' ? i + 1 : '–'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-ink block truncate">{pid === myId ? t('game.you') : name(pid)}</span>
                      <span className="text-sm text-body block truncate">{gs.secrets[pid]?.text}</span>
                    </div>
                    <span className={`chip shrink-0 ${gs.status[pid] === 'solved' ? 'chip-success' : ''}`}>
                      {gs.status[pid] === 'solved'
                        ? t('whoami.solved_in_round', { round: gs.solvedRound[pid] })
                        : gs.status[pid] === 'gave_up'
                        ? t('whoami.gave_up')
                        : t('whoami.not_solved')}
                    </span>
                  </li>
                ))}
              </ol>
            </ResultModal>
          )}
        </AnimatePresence>
      }
    >
      {isLobby && (
        <GameLobby
          description={t('whoami.lobby_desc')}
          players={lobbyPlayers}
          minPlayers={2}
          maxPlayers={12}
          isHost={isLeader}
          isReadyMe={Boolean(gs.playerReady[myId])}
          onToggleReady={toggleReady}
          onStart={startGame}
          startBlockedReason={lobbyBlockReason(t, lobbyPlayers, 2)}
          howTo={[t('whoami.howto_1'), t('whoami.howto_2'), t('whoami.howto_3')]}
        />
      )}
      {phase === 'WRITING' && writingStage}
      {(phase === 'ASKING' || phase === 'ANSWERING' || isOver) && playStage}
    </GameShell>
  );
}
