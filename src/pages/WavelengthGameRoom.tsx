import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useWavelengthStore } from '../store/useWavelengthStore';
import { useAuthStore } from '../store/useAuthStore';
import { GameShell } from '../components/game/GameShell';
import { GameHeader } from '../components/game/GameHeader';
import { SideDrawer, type TabOption } from '../components/game/SideDrawer';
import { Users, BookOpen, History as HistoryIcon, AlertTriangle, Sparkles } from 'lucide-react';
import { CustomThemeModal } from '../components/game/CustomThemeModal';

// Geometria do mostrador (arco semicircular)
const CX = 250;
const CY = 245;
const R_OUTER = 205;
const R_INNER = 130;

function pctToRad(pct: number): number {
  const clamped = Math.max(0, Math.min(100, pct));
  return Math.PI * (1 - clamped / 100);
}

function polarToCartesian(r: number, rad: number): { x: number; y: number } {
  return {
    x: CX + r * Math.cos(rad),
    y: CY - r * Math.sin(rad),
  };
}

function makeArcSector(p1: number, p2: number, rIn: number, rOut: number): string {
  const startPct = Math.max(0, Math.min(100, p1));
  const endPct = Math.max(0, Math.min(100, p2));
  if (startPct >= endPct) return '';

  const rad1 = pctToRad(startPct);
  const rad2 = pctToRad(endPct);

  const pOut1 = polarToCartesian(rOut, rad1);
  const pOut2 = polarToCartesian(rOut, rad2);
  const pIn2 = polarToCartesian(rIn, rad2);
  const pIn1 = polarToCartesian(rIn, rad1);

  return `M ${pIn1.x} ${pIn1.y} L ${pOut1.x} ${pOut1.y} A ${rOut} ${rOut} 0 0 1 ${pOut2.x} ${pOut2.y} L ${pIn2.x} ${pIn2.y} A ${rIn} ${rIn} 0 0 0 ${pIn1.x} ${pIn1.y} Z`;
}

export function WavelengthGameRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const myId = user?.id || '';
  const token = session?.access_token || '';

  const {
    gameState,
    isReconnecting,
    errorMsg,
    soundEnabled,
    connect,
    disconnect,
    manualReconnect,
    toggleReady,
    startGame,
    giveClue,
    updateDial,
    confirmGuess,
    nextRound,
    restartGame,
    toggleSound,
    clearError,
    sendMessage,
  } = useWavelengthStore();

  const [clueInput, setClueInput] = useState('');
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'players' | 'history' | 'rules' | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!roomId || !token) return;
    connect(roomId, token);

    return () => {
      disconnect();
    };
  }, [roomId, token]);

  // Interação tátil/pointer com o mostrador
  const handlePointerInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current || !gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) {
        return;
      }
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = 500 / rect.width;
      const scaleY = 280 / rect.height;

      const px = (clientX - rect.left) * scaleX;
      const py = (clientY - rect.top) * scaleY;

      const dx = px - CX;
      const dy = CY - py;

      let angleRad = Math.atan2(dy, dx);
      if (angleRad < 0) {
        angleRad = dx < 0 ? Math.PI : 0;
      }

      const rawPct = (1 - angleRad / Math.PI) * 100;
      const clampedPct = Math.max(0, Math.min(100, Math.round(rawPct * 10) / 10));
      updateDial(clampedPct);
    },
    [gameState, updateDial]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) return;
    setIsDraggingDial(true);
    handlePointerInteraction(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isDraggingDial) return;
      handlePointerInteraction(e.clientX, e.clientY);
    };

    const handleGlobalPointerUp = () => {
      if (isDraggingDial) {
        setIsDraggingDial(false);
      }
    };

    if (isDraggingDial) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isDraggingDial, handlePointerInteraction]);

  // Submissão de dica pelo Médium
  const handleSubmitClue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clueInput.trim()) return;
    giveClue(clueInput.trim());
    setClueInput('');
  };

  // Ajuste fino do dial (+/- passos)
  const adjustDial = (delta: number) => {
    if (!gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) return;
    const current = gameState.dialValue;
    const next = Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10));
    updateDial(next);
  };

  // Avaliação do desempenho no Game Over
  const getScoreRating = (score: number) => {
    if (score >= 22) {
      return {
        title: t('wavelength.rating_telepath_title', 'Mentes Conectadas! ✨'),
        desc: t('wavelength.rating_telepath_desc', 'Conexão mental de outro planeta! Sintonia e telepatia lendárias.'),
        color: 'text-amber-400',
        badge: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      };
    }
    if (score >= 15) {
      return {
        title: t('wavelength.rating_great_title', 'Sintonia Afiada! 🔮'),
        desc: t('wavelength.rating_great_desc', 'A equipe demonstrou excelente química e ótima comunicação conceitual.'),
        color: 'text-cyan-400',
        badge: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
      };
    }
    if (score >= 8) {
      return {
        title: t('wavelength.rating_good_title', 'Boa Frequência! 📡'),
        desc: t('wavelength.rating_good_desc', 'Algumas oscilações no sinal, mas conseguiram pontuações sólidas.'),
        color: 'text-emerald-400',
        badge: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      };
    }
    return {
      title: t('wavelength.rating_low_title', 'Sinal com Ruído 📻'),
      desc: t('wavelength.rating_low_desc', 'As ondas se cruzaram em frequências bem diferentes. Vale a pena tentar de novo!'),
      color: 'text-rose-400',
      badge: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
    };
  };

  if (!gameState) {
    return (
      <div className="h-[100dvh] bg-[#020617] text-white flex flex-col items-center justify-center p-6 bg-grid-pattern">
        <div className="crt-overlay" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full mb-6 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
        />
        <h2 className="text-lg font-bold tracking-widest text-cyan-300 uppercase">
          {isReconnecting
            ? t('wavelength.reconnecting', 'Reconectando à Sala de Wavelength...')
            : t('wavelength.connecting', 'Conectando à Sala de Wavelength...')}
        </h2>
        {isReconnecting && (
          <button
            onClick={manualReconnect}
            className="mt-6 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg"
          >
            {t('wavelength.manual_reconnect_btn', 'Tentar Reconectar Agora')}
          </button>
        )}
      </div>
    );
  }

  const isLeader = gameState.leaderId === myId;
  const isPsychic = gameState.isPsychic;
  const target = gameState.targetValue;
  const showTargetWedge = gameState.isTargetVisible && target !== null;
  const dial = gameState.dialValue;
  const needleRad = pctToRad(dial);
  const needleTip = polarToCartesian(R_OUTER + 16, needleRad);

  const totalPlayers = gameState.players.length;
  const readyCount = gameState.players.filter((p) => gameState.playerReady[p]).length;
  const allPlayersReady = totalPlayers >= 2 && readyCount === totalPlayers;

  const drawerTabs: TabOption[] = [
    { id: 'players', label: `Jogadores (${totalPlayers})`, icon: <Users size={14} /> },
    { id: 'history', label: 'Histórico', icon: <HistoryIcon size={14} /> },
    { id: 'rules', label: 'Regras', icon: <BookOpen size={14} /> },
  ];

  return (
    <GameShell
      themeClass="bg-slate-950 text-white"
      header={
        <GameHeader
          gameTitle="WAVELENGTH"
          gameBadge="SINTONIA"
          roomCode={roomId || ''}
          playerCount={totalPlayers}
          accentColor="text-cyan-400"
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => navigate('/hub')}
          onTogglePlayers={() => setDrawerTab('players')}
          onToggleLog={() => setDrawerTab('history')}
          onToggleRules={() => setDrawerTab('rules')}
          centerContent={
            gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' ? (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
                  {t('wavelength.round_label', 'RODADA')} {gameState.round}/{gameState.totalRounds}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  {gameState.teamScore} {t('wavelength.points_suffix', 'PTS')}
                </span>
              </div>
            ) : null
          }
        />
      }
      footer={
        /* Bottom Control Dock */
        gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' ? (
          <div className="w-full bg-slate-900/90 border-t border-white/10 px-3 py-2 md:py-3 backdrop-blur-md">
            <div className="max-w-xl mx-auto">
              {/* PSYCHIC PHASE FOOTER */}
              {gameState.state === 'PSYCHIC_PHASE' && (
                <div>
                  {isPsychic ? (
                    <form onSubmit={handleSubmitClue} className="flex gap-2">
                      <input
                        type="text"
                        maxLength={70}
                        placeholder={t('wavelength.clue_placeholder', 'Dê uma pista para a posição no espectro...')}
                        value={clueInput}
                        onChange={(e) => setClueInput(e.target.value)}
                        className="flex-1 bg-black/60 border border-amber-500/50 rounded-xl px-3 py-2 text-sm text-amber-200 font-bold placeholder:text-gray-500 focus:outline-none focus:border-amber-400 font-mono"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!clueInput.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        Transmitir 📡
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-1 text-xs text-cyan-300 font-medium animate-pulse">
                      <span>🔮</span>
                      <span>{t('wavelength.waiting_psychic_clue', 'Aguardando o Médium')} ({gameState.psychicName}) {t('wavelength.psychic_tuning', 'dar a pista mental...')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* GUESSING PHASE FOOTER */}
              {gameState.state === 'GUESSING_PHASE' && (
                <div>
                  {!isPsychic ? (
                    <div className="flex flex-col gap-2">
                      {/* Fine tune bar */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex gap-1">
                          <button
                            onClick={() => adjustDial(-5)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-mono font-bold cursor-pointer"
                          >
                            -5%
                          </button>
                          <button
                            onClick={() => adjustDial(-1)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-mono font-bold cursor-pointer"
                          >
                            -1%
                          </button>
                        </div>

                        <span className="font-mono text-xs font-black text-cyan-300">
                          {dial.toFixed(1)}%
                        </span>

                        <div className="flex gap-1">
                          <button
                            onClick={() => adjustDial(1)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-mono font-bold cursor-pointer"
                          >
                            +1%
                          </button>
                          <button
                            onClick={() => adjustDial(5)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-xs font-mono font-bold cursor-pointer"
                          >
                            +5%
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={confirmGuess}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer active:scale-95"
                      >
                        ✓ {t('wavelength.confirm_guess_btn', 'Confirmar Palpite')} ({dial.toFixed(1)}%)
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-1 text-xs font-mono text-amber-300">
                      🤫 {t('wavelength.psychic_silence', 'Silêncio absoluto! A equipe está calibrando a agulha.')}
                    </div>
                  )}
                </div>
              )}

              {/* REVEAL PHASE FOOTER */}
              {gameState.state === 'REVEAL_PHASE' && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-left">
                    <span className="text-base font-black font-mono text-amber-300 block">
                      +{gameState.roundPoints} {t('wavelength.points_suffix', 'PTS')}
                    </span>
                    <span className="text-[11px] text-gray-300 truncate block">
                      Alvo: {target?.toFixed(1)}% | Palpite: {dial.toFixed(1)}%
                    </span>
                  </div>
                  <button
                    onClick={nextRound}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
                  >
                    {gameState.round >= gameState.totalRounds
                      ? t('wavelength.finish_game_btn', 'Resultado Final 🏆')
                      : t('wavelength.next_round_btn', 'Próxima Rodada &rarr;')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null
      }
      overlay={
        <>
          {/* Error Banner */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border border-rose-500/80 text-rose-200 px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold backdrop-blur-md"
              >
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
                <button
                  onClick={clearError}
                  className="px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800 rounded text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Off-canvas Side Drawer */}
          <SideDrawer
            isOpen={drawerTab !== null}
            onClose={() => setDrawerTab(null)}
            title="Wavelength"
            tabs={drawerTabs}
            activeTab={drawerTab || 'players'}
            onTabChange={(tab) => setDrawerTab(tab as any)}
          >
            {drawerTab === 'players' && (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>Jogadores ({totalPlayers})</span>
                  <span>{readyCount}/{totalPlayers} Prontos</span>
                </div>
                <div className="space-y-2">
                  {gameState.players.map((pid) => {
                    const pName = gameState.playerNames[pid] || pid;
                    const isReady = gameState.playerReady[pid];
                    const isRoomLeader = gameState.leaderId === pid;
                    const isMe = pid === myId;

                    return (
                      <div
                        key={pid}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isReady
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                            : 'bg-white/5 border-white/10 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              gameState.playerConnected[pid] ? 'bg-emerald-400' : 'bg-gray-600'
                            }`}
                          />
                          <span className="font-bold truncate">
                            {pName} {isMe && <span className="text-cyan-400 text-[10px]">(Você)</span>}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isRoomLeader && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold">
                              👑 LÍDER
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isReady
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-white/10 text-gray-400'
                            }`}
                          >
                            {isReady ? 'PRONTO' : 'AGUARDANDO'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {drawerTab === 'history' && (
              <div className="space-y-2">
                <span className="text-xs text-gray-400 block mb-2">Histórico de Rodadas</span>
                {gameState.history.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">Nenhuma rodada finalizada ainda.</p>
                ) : (
                  gameState.history.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 text-xs"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-300">"{h.clue}"</span>
                        <span className="font-mono font-bold text-emerald-400">+{h.points} pts</span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {h.theme.left} ↔ {h.theme.right} ({h.psychicName})
                      </div>
                      <div className="text-[10px] font-mono text-gray-500">
                        Alvo: {h.targetValue.toFixed(1)}% | Palpite: {h.guessValue.toFixed(1)}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {drawerTab === 'rules' && (
              <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
                <div>
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">1. O Médium dá a Dica</h4>
                  <p>Um jogador se torna o Médium e visualiza um alvo secreto de 0% a 100% no espectro. Ele transmite uma dica (uma palavra ou frase) proporcional à localização do alvo.</p>
                </div>
                <div>
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">2. A Equipe Calibra o Mostrador</h4>
                  <p>Todos os outros debatem a dica e giram a agulha até o ponto exato onde acreditam que o alvo está.</p>
                </div>
                <div>
                  <h4 className="font-bold text-cyan-300 text-sm mb-1">3. Pontuação</h4>
                  <p>O mostrador é revelado: centro exato (4 pts), faixa média (3 pts), faixa externa (2 pts). Quanto mais perto, maior a sintonia!</p>
                </div>
              </div>
            )}
          </SideDrawer>

          <CustomThemeModal
            isOpen={showCustomModal}
            onClose={() => setShowCustomModal(false)}
            gameType="wavelength"
            existingCustomCount={gameState.customThemesCount || 0}
            onSaveThemes={(payload) => sendMessage(payload.type, payload)}
          />
        </>
      }
    >
      {/* LOBBY VIEW */}
      {gameState.state === 'LOBBY' && (
        <div className="w-full max-w-lg bg-black/60 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)]">
            🔮
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300 uppercase">
              {t('wavelength.lobby_title', 'Sintonize a Sua Equipe')}
            </h2>
            <p className="text-gray-400 text-xs mt-1 max-w-sm">
              {t('wavelength.lobby_desc', 'O Médium vê um alvo secreto em um espectro conceitual e transmite uma dica telepática. A equipe debate e calibra o ponteiro na frequência exata!')}
            </p>
          </div>

          {/* Jogadores Conectados e Prontos */}
          <div className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Jogadores Conectados ({totalPlayers})
              </span>
              <span className={`font-mono text-xs font-bold ${allPlayersReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                {readyCount}/{totalPlayers} Prontos
              </span>
            </div>

            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {gameState.players.map((pid) => {
                const pName = gameState.playerNames[pid] || pid;
                const isReady = gameState.playerReady[pid];
                const isRoomLeader = gameState.leaderId === pid;
                const isMe = pid === myId;

                return (
                  <div
                    key={pid}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-black/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="font-bold truncate text-white">
                        {pName} {isMe && '(Você)'} {isRoomLeader && '👑'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        isReady
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                      }`}
                    >
                      {isReady ? '✓ Pronto' : 'Aguardando'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão de Temas Personalizados */}
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Temas / Espectros Personalizados</span>
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-[10px] font-mono">
              {gameState.customThemesCount || 0}
            </span>
          </button>

          <div className="w-full flex flex-col sm:flex-row gap-3">
            <button
              onClick={toggleReady}
              className={`flex-1 py-3 font-bold uppercase rounded-xl border text-xs tracking-wider transition-all cursor-pointer ${
                gameState.playerReady[myId]
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              {gameState.playerReady[myId]
                ? t('wavelength.ready_cancel_btn', 'Cancelar Pronto')
                : t('wavelength.ready_btn', 'Estou Pronto!')}
            </button>

            {isLeader && (
              <button
                onClick={startGame}
                disabled={!allPlayersReady}
                className={`flex-1 py-3 font-bold uppercase rounded-xl border text-xs tracking-wider transition-all ${
                  allPlayersReady
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer'
                    : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed'
                }`}
              >
                {totalPlayers < 2
                  ? t('wavelength.waiting_min_players', 'Mínimo 2 Jogadores')
                  : !allPlayersReady
                  ? `Aguardando (${readyCount}/${totalPlayers})`
                  : t('wavelength.start_game_btn', 'Iniciar Partida 🚀')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE GAMEPLAY (PSYCHIC, GUESSING, REVEAL) */}
      {gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' && (
        <div className="w-full max-w-3xl flex flex-col items-center justify-between h-full py-1">
          {/* Top Spectrum Banner (Compact, zero overflow) */}
          <div className="w-full space-y-1.5 shrink-0">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-md">
              {/* Left Extreme */}
              <div className="flex-1 text-left min-w-0">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-black block">
                  0% EXTREMO
                </span>
                <span className="font-extrabold text-sm md:text-base text-cyan-100 truncate block">
                  {gameState.currentTheme.left}
                </span>
              </div>

              {/* Middle badge */}
              <div className="shrink-0 px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-[10px] font-mono font-bold text-gray-300">
                {gameState.currentTheme.category || '50% NEUTRO'}
              </div>

              {/* Right Extreme */}
              <div className="flex-1 text-right min-w-0">
                <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest font-black block">
                  EXTREMO 100%
                </span>
                <span className="font-extrabold text-sm md:text-base text-pink-100 truncate block">
                  {gameState.currentTheme.right}
                </span>
              </div>
            </div>

            {/* Revealed Clue (If Guessing or Reveal) */}
            {gameState.currentClue && (
              <div className="text-center py-1 px-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center gap-2">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">PISTA:</span>
                <span className="font-bold text-amber-200 text-sm md:text-base">"{gameState.currentClue}"</span>
              </div>
            )}
          </div>

          {/* Central Physical Dial Device (Sized to clamp inside available viewport) */}
          <div className="relative flex-1 w-full flex items-center justify-center min-h-0 my-1">
            <div className="relative w-full max-w-[460px] max-h-[38dvh] md:max-h-[44dvh] aspect-[500/280] flex items-center justify-center">
              <svg
                ref={svgRef}
                viewBox="0 0 500 280"
                style={{ touchAction: 'none' }}
                className={`w-full h-full select-none ${
                  gameState.state === 'GUESSING_PHASE' && !isPsychic ? 'cursor-grab active:cursor-grabbing' : ''
                }`}
                onPointerDown={handlePointerDown}
              >
                <defs>
                  <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>

                  <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity="0.8" />
                  </filter>
                  <filter id="bullseyeGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#eab308" floodOpacity="0.9" />
                  </filter>
                </defs>

                {/* Dial Casing / Backplate */}
                <path
                  d={makeArcSector(0, 100, R_INNER - 8, R_OUTER + 8)}
                  fill="#0b0f19"
                  stroke="#1e293b"
                  strokeWidth="3"
                />

                {/* Rainbow Spectrum Track */}
                <path
                  d={makeArcSector(0, 100, R_INNER, R_OUTER)}
                  fill="url(#spectrumGradient)"
                  opacity="0.3"
                />

                {/* Graduation ticks */}
                {Array.from({ length: 21 }).map((_, i) => {
                  const stepPct = i * 5;
                  const r = pctToRad(stepPct);
                  const isMajor = stepPct % 25 === 0;
                  const isMid = stepPct % 10 === 0;
                  const p1 = polarToCartesian(R_OUTER + 2, r);
                  const p2 = polarToCartesian(R_OUTER + (isMajor ? 10 : isMid ? 6 : 3), r);
                  return (
                    <line
                      key={i}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isMajor ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                      strokeWidth={isMajor ? 2 : 1}
                    />
                  );
                })}

                {/* Percentage Labels */}
                {[0, 25, 50, 75, 100].map((labelPct) => {
                  const r = pctToRad(labelPct);
                  const textPos = polarToCartesian(R_OUTER + 18, r);
                  return (
                    <text
                      key={labelPct}
                      x={textPos.x}
                      y={textPos.y + 4}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.7)"
                      fontSize="10"
                      fontWeight="800"
                      fontFamily="monospace"
                    >
                      {labelPct}%
                    </text>
                  );
                })}

                {/* Target Wedge (Psychic or Reveal) */}
                {showTargetWedge && (
                  <g className="transition-all duration-500">
                    <path
                      d={makeArcSector(target - 12.5, target - 7.5, R_INNER, R_OUTER)}
                      fill="#06b6d4"
                      opacity="0.9"
                    />
                    <path
                      d={makeArcSector(target + 7.5, target + 12.5, R_INNER, R_OUTER)}
                      fill="#06b6d4"
                      opacity="0.9"
                    />
                    <path
                      d={makeArcSector(target - 7.5, target - 2.5, R_INNER, R_OUTER)}
                      fill="#f97316"
                      opacity="0.95"
                    />
                    <path
                      d={makeArcSector(target + 2.5, target + 7.5, R_INNER, R_OUTER)}
                      fill="#f97316"
                      opacity="0.95"
                    />
                    <path
                      d={makeArcSector(target - 2.5, target + 2.5, R_INNER, R_OUTER)}
                      fill="#eab308"
                      filter="url(#bullseyeGlow)"
                    />
                    {(() => {
                      const labelPos = polarToCartesian((R_INNER + R_OUTER) / 2, pctToRad(target));
                      return (
                        <text
                          x={labelPos.x}
                          y={labelPos.y + 4}
                          textAnchor="middle"
                          fill="#000"
                          fontSize="12"
                          fontWeight="900"
                          fontFamily="monospace"
                        >
                          4
                        </text>
                      );
                    })()}
                  </g>
                )}

                {/* Mechanical shutter when hidden */}
                {!showTargetWedge && (
                  <path
                    d={makeArcSector(0, 100, R_INNER + 2, R_OUTER - 2)}
                    fill="#050811"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1.5"
                  />
                )}

                {/* Needle pointer */}
                <g filter="url(#needleGlow)">
                  <line
                    x1={CX}
                    y1={CY}
                    x2={needleTip.x}
                    y2={needleTip.y}
                    stroke="#ef4444"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={needleTip.x}
                    cy={needleTip.y}
                    r={isDraggingDial ? 8 : 6}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>

                {/* Center Hub Pivot */}
                <circle cx={CX} cy={CY} r="24" fill="#0f172a" stroke="#ef4444" strokeWidth="2.5" />
                <circle cx={CX} cy={CY} r="12" fill="#ef4444" />
                <circle cx={CX} cy={CY} r="4" fill="#ffffff" />
              </svg>

              {/* Float percentage chip */}
              <div className="absolute bottom-1 px-2.5 py-0.5 bg-black/80 border border-white/20 rounded-full font-mono text-[11px] font-bold text-gray-200">
                {dial.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER VIEW */}
      {gameState.state === 'GAME_OVER' && (
        <div className="w-full max-w-md bg-black/80 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4 my-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-3xl shadow-lg">
            🏆
          </div>
          {(() => {
            const rating = getScoreRating(gameState.teamScore);
            return (
              <div className="space-y-1">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${rating.badge}`}>
                  {rating.title}
                </span>
                <h2 className="text-3xl font-black text-white font-mono mt-2">
                  {gameState.teamScore} <span className="text-white/40 text-base">/ {gameState.totalRounds * 4} PTS</span>
                </h2>
                <p className="text-gray-300 text-xs max-w-xs">{rating.desc}</p>
              </div>
            );
          })()}

          <div className="w-full flex gap-3 pt-2">
            <button
              onClick={restartGame}
              className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
            >
              Jogar Novamente
            </button>
            <button
              onClick={() => navigate('/hub')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase rounded-xl transition-all cursor-pointer"
            >
              Hub
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
