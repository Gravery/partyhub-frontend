import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useWavelengthStore } from '../store/useWavelengthStore';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageSelector } from '../components/LanguageSelector';

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
    isConnected,
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
  } = useWavelengthStore();

  const [clueInput, setClueInput] = useState('');
  const [isDraggingDial, setIsDraggingDial] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!roomId || !token) return;
    connect(roomId, token);

    return () => {
      disconnect();
    };
  }, [roomId, token]);

  // Cópia de código e link da sala
  const handleCopyCode = () => {
    if (!roomId) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Conversão de ponteiro (mouse/touch) para porcentagem do dial (0 a 100)
  const handlePointerInteraction = useCallback(
    (e: React.PointerEvent<SVGSVGElement> | PointerEvent) => {
      if (!svgRef.current || !gameState) return;
      if (gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) return;

      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = 500 / rect.width;
      const scaleY = 280 / rect.height;

      const x = (e.clientX - rect.left) * scaleX - CX;
      const y = CY - (e.clientY - rect.top) * scaleY;

      let rad = Math.atan2(y, x);
      if (rad < 0) {
        rad = x < 0 ? Math.PI : 0;
      }

      let pct = (1 - rad / Math.PI) * 100;
      pct = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));

      updateDial(pct);
    },
    [gameState, updateDial]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!gameState || gameState.state !== 'GUESSING_PHASE' || gameState.isPsychic) return;
    setIsDraggingDial(true);
    handlePointerInteraction(e);
  };

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isDraggingDial) {
        handlePointerInteraction(e);
      }
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
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 bg-grid-pattern">
        <div className="crt-overlay" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full mb-6 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
        />
        <h2 className="text-xl font-bold tracking-widest text-cyan-300 uppercase">
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

  // Status de prontidão do lobby
  const totalPlayers = gameState.players.length;
  const readyCount = gameState.players.filter((p) => gameState.playerReady[p]).length;
  const allPlayersReady = totalPlayers >= 2 && readyCount === totalPlayers;

  return (
    <div className="relative min-h-screen bg-[#020617] text-white p-4 md:p-8 font-sans overflow-x-hidden bg-grid-pattern flex flex-col justify-between">
      <div className="crt-overlay" />

      {/* Luz ambiente cyberpunk */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-[450px] bg-gradient-to-b from-cyan-600/15 via-purple-600/10 to-transparent blur-[140px] rounded-full pointer-events-none" />

      {/* Alerta de Erro */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-rose-950/95 border-2 border-rose-500/80 text-rose-200 px-6 py-3 rounded-2xl shadow-[0_0_30px_rgba(244,63,94,0.4)] flex items-center gap-4 text-sm font-bold backdrop-blur-md"
          >
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={clearError}
              className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-xs cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HUD */}
      <header className="relative z-20 flex flex-wrap justify-between items-center gap-4 border-b border-white/10 pb-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/hub')}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono tracking-wider uppercase transition-all cursor-pointer hover:border-cyan-400"
          >
            &larr; {t('wavelength.back_hub', 'HUB')}
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              WAVELENGTH
            </h1>
            {/* Pill do Código da Sala com Cópia Direta */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-cyan-400/80 tracking-widest uppercase">
                {t('wavelength.room_code', 'SALA')}:
              </span>
              <button
                onClick={handleCopyCode}
                title={t('wavelength.copy_code_btn', 'Copiar Código')}
                className="select-text px-2 py-0.5 bg-black/60 hover:bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-white font-mono font-black text-xs tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{roomId}</span>
                <span className="text-[10px] text-cyan-400">{copiedCode ? '✓' : '📋'}</span>
              </button>
              <button
                onClick={handleCopyLink}
                title={t('wavelength.copy_link_btn', 'Copiar Link')}
                className="px-2 py-0.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-[10px] font-mono font-bold text-gray-300 transition-all cursor-pointer"
              >
                {copiedLink ? '✓ ' + t('wavelength.copied_link', 'Link Copiado!') : '🔗 ' + t('wavelength.copy_link_btn', 'Link')}
              </button>
            </div>
          </div>
        </div>

        {/* Status de Turno / Rodada / Placar */}
        {gameState.state !== 'LOBBY' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-4 py-2 bg-black/60 border border-cyan-500/30 rounded-2xl flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
                {t('wavelength.round_label', 'RODADA')}
              </span>
              <span className="text-lg font-black text-white font-mono">
                {gameState.round} <span className="text-white/40 text-xs">/ {gameState.totalRounds}</span>
              </span>
            </div>

            <div className="px-5 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border border-amber-500/40 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <span className="text-xs font-mono text-amber-300 uppercase tracking-widest">
                {t('wavelength.team_score_label', 'PONTOS')}
              </span>
              <span className="text-2xl font-black text-amber-400 font-mono tracking-wider">
                {gameState.teamScore}
              </span>
            </div>
          </div>
        )}

        {/* Ferramentas e Idioma */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer text-sm ${
              soundEnabled
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-white/5 border-white/10 text-gray-500'
            }`}
            title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          <LanguageSelector />
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="relative z-10 max-w-6xl mx-auto w-full my-6 flex flex-col items-center">
        {/* FASE 1: LOBBY */}
        {gameState.state === 'LOBBY' && (
          <div className="w-full max-w-2xl bg-black/60 backdrop-blur-2xl border-2 border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(6,182,212,0.4)] mb-6">
              🔮
            </div>
            <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-300 uppercase mb-2">
              {t('wavelength.lobby_title', 'Sintonize a Sua Equipe')}
            </h2>
            <p className="text-gray-400 text-sm max-w-md mb-6 leading-relaxed">
              {t(
                'wavelength.lobby_desc',
                'O Médium vê um alvo secreto em um espectro conceitual e transmite uma dica telepática. A equipe debate e calibra o ponteiro na frequência exata!'
              )}
            </p>

            {/* Banner de Compartilhamento da Sala */}
            <div className="w-full mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                  {t('wavelength.room_code', 'CÓDIGO DE ENTRADA')}
                </span>
                <span className="select-text text-2xl font-black font-mono tracking-widest text-white">
                  {roomId}
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-none px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 rounded-xl text-xs font-mono font-bold text-cyan-200 transition-all cursor-pointer"
                >
                  {copiedCode ? '✓ ' + t('wavelength.copied_code', 'Copiado!') : '📋 ' + t('wavelength.copy_code_btn', 'Copiar Código')}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-mono font-bold text-white transition-all cursor-pointer"
                >
                  {copiedLink ? '✓ ' + t('wavelength.copied_link', 'Link Copiado!') : '🔗 ' + t('wavelength.copy_link_btn', 'Copiar Link')}
                </button>
              </div>
            </div>

            {/* Lista de Jogadores Conectados com Status de Prontidão */}
            <div className="w-full space-y-3 mb-8">
              <div className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-2 flex justify-between px-2">
                <span>{t('wavelength.connected_players', 'Jogadores na Sala')} ({gameState.players.length})</span>
                <span className={allPlayersReady ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {readyCount}/{totalPlayers} {t('wavelength.ready_btn', 'Prontos')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gameState.players.map((pid) => {
                  const pName = gameState.playerNames[pid] || pid;
                  const isReady = gameState.playerReady[pid];
                  const isRoomLeader = gameState.leaderId === pid;
                  const isMe = pid === myId;

                  return (
                    <div
                      key={pid}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isReady
                          ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            gameState.playerConnected[pid] ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-gray-600'
                          }`}
                        />
                        <span className="font-bold text-sm truncate text-white">
                          {pName} {isMe && <span className="text-cyan-400 text-xs font-mono">({t('wavelength.you', 'Você')})</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isRoomLeader && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-mono font-bold">
                            👑 LÍDER
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {isReady ? '✓ PRONTO' : 'AGUARDANDO'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ações do Lobby com Bloqueio de Início se nem todos estiverem prontos */}
            <div className="w-full flex flex-col sm:flex-row gap-4">
              <button
                onClick={toggleReady}
                className={`flex-1 py-4 font-black tracking-widest uppercase rounded-2xl border transition-all cursor-pointer text-sm ${
                  gameState.playerReady[myId]
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
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
                  className={`flex-1 py-4 font-black tracking-widest uppercase rounded-2xl border transition-all text-sm ${
                    allPlayersReady
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.5)] cursor-pointer animate-pulse'
                      : 'bg-gray-900 text-gray-500 border-gray-800 cursor-not-allowed opacity-80'
                  }`}
                >
                  {totalPlayers < 2
                    ? t('wavelength.waiting_min_players', 'Mínimo de 2 Jogadores')
                    : !allPlayersReady
                    ? t('wavelength.waiting_players_ready', {
                        ready: readyCount,
                        total: totalPlayers,
                        defaultValue: `Aguardando Prontos (${readyCount}/${totalPlayers})`,
                      })
                    : t('wavelength.start_game_btn', 'Iniciar Partida 🚀')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* FASES EM PARTIDA (PSYCHIC, GUESSING, REVEAL) */}
        {gameState.state !== 'LOBBY' && gameState.state !== 'GAME_OVER' && (
          <div className="w-full flex flex-col items-center space-y-6">
            {/* Banner de Função e Instrução */}
            <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    isPsychic
                      ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                      : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  {isPsychic ? '🔮' : '👥'}
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-widest uppercase text-white/50 block">
                    {t('wavelength.role_label', 'SEU PAPEL NESTA RODADA')}
                  </span>
                  <span
                    className={`font-black text-sm uppercase tracking-wider ${
                      isPsychic ? 'text-amber-300' : 'text-cyan-300'
                    }`}
                  >
                    {isPsychic
                      ? t('wavelength.role_psychic', 'VOCÊ É O MÉDIUM DA RODADA')
                      : t('wavelength.role_guesser', 'VOCÊ É UM ADIVINHADOR DA EQUIPE')}
                  </span>
                </div>
              </div>

              {!isPsychic && (
                <div className="text-right">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-white/40 block">
                    {t('wavelength.current_psychic', 'MÉDIUM ATIVO')}
                  </span>
                  <span className="font-bold text-xs text-amber-300 font-mono">
                    {gameState.psychicName}
                  </span>
                </div>
              )}
            </div>

            {/* CARTAS DO ESPECTRO CONCEITUAL (EXTREMO ESQUERDO 0% ↔ PONTO MÉDIO 50% ↔ EXTREMO DIREITO 100%) */}
            <div className="w-full max-w-4xl flex flex-col space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Extremo Esquerdo (0%) */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-cyan-950/70 to-black/70 border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 rounded-full text-xs font-mono font-black tracking-widest uppercase">
                      0% • {t('wavelength.extreme_left', 'EXTREMO ESQUERDO')}
                    </span>
                    {gameState.currentTheme.category && (
                      <span className="text-[11px] font-mono text-cyan-400/60 uppercase">
                        {gameState.currentTheme.category}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-cyan-100 tracking-wide mt-2">
                    {gameState.currentTheme.left}
                  </h3>
                </div>

                {/* Extremo Direito (100%) */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-bl from-indigo-950/70 to-black/70 border-2 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.15)] flex flex-col justify-between text-right">
                  <div className="flex items-center justify-between mb-2">
                    {gameState.currentTheme.category && (
                      <span className="text-[11px] font-mono text-indigo-400/60 uppercase">
                        {gameState.currentTheme.category}
                      </span>
                    )}
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 rounded-full text-xs font-mono font-black tracking-widest uppercase">
                      {t('wavelength.extreme_right', 'EXTREMO DIREITO')} • 100%
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-indigo-100 tracking-wide mt-2">
                    {gameState.currentTheme.right}
                  </h3>
                </div>
              </div>

              {/* Barra de Conexão Central com Marcador de Ponto Médio (50%) */}
              <div className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span className="text-cyan-400 font-bold">0% {gameState.currentTheme.left}</span>
                <span className="px-2.5 py-0.5 bg-white/10 text-white rounded-md font-bold tracking-wider">
                  50% • {t('wavelength.middle_neutral', 'Ponto Médio')}
                </span>
                <span className="text-indigo-400 font-bold">{gameState.currentTheme.right} 100%</span>
              </div>
            </div>

            {/* GUIA DIRECIONAL PARA O MÉDIUM (PSYCHIC_PHASE) */}
            {gameState.state === 'PSYCHIC_PHASE' && isPsychic && target !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-yellow-950/30 to-amber-950/50 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-center space-y-1"
              >
                <div className="text-xs font-mono text-amber-300 font-black uppercase tracking-wider">
                  {t('wavelength.psychic_target_guide', { target: target.toFixed(1) })}
                </div>
                <div className="text-sm font-bold text-amber-100">
                  {target < 40
                    ? t('wavelength.psychic_hint_left', { concept: gameState.currentTheme.left })
                    : target > 60
                    ? t('wavelength.psychic_hint_right', { concept: gameState.currentTheme.right })
                    : t('wavelength.psychic_hint_mid', '⚖️ Ponto de equilíbrio neutro (50%)')}
                </div>
                <p className="text-xs text-amber-200/70 font-mono">
                  {t('wavelength.psychic_tip', '💡 Pense em algo que fique exatamente nesta proporção entre os dois extremos!')}
                </p>
              </motion.div>
            )}

            {/* MOSTRADOR ANALÓGICO / DIAL COM RÓTULOS DE % E AGULHA TÁTIL */}
            <div className="relative w-full max-w-2xl bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col items-center">
              {/* SVG do Dial */}
              <div className="relative w-full max-w-[500px] aspect-[500/280] flex items-center justify-center">
                <svg
                  ref={svgRef}
                  viewBox="0 0 500 280"
                  style={{ touchAction: 'none' }}
                  className={`w-full h-full overflow-visible select-none ${
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

                  {/* Arco de fundo (trilho do espectro) */}
                  <path
                    d={makeArcSector(0, 100, R_INNER, R_OUTER)}
                    fill="url(#spectrumGradient)"
                    opacity="0.25"
                  />

                  {/* Marcas de graduação em passos de 10% com maiores em 0%, 25%, 50%, 75%, 100% */}
                  {Array.from({ length: 21 }).map((_, i) => {
                    const stepPct = i * 5;
                    const r = pctToRad(stepPct);
                    const isMajor = stepPct % 25 === 0;
                    const isMid = stepPct % 10 === 0;
                    const p1 = polarToCartesian(R_OUTER + 2, r);
                    const p2 = polarToCartesian(R_OUTER + (isMajor ? 12 : isMid ? 8 : 4), r);
                    return (
                      <line
                        key={i}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isMajor ? '#ffffff' : 'rgba(255,255,255,0.4)'}
                        strokeWidth={isMajor ? 2.5 : isMid ? 1.5 : 1}
                      />
                    );
                  })}

                  {/* Rótulos de Porcentagem ao Redor do Arco */}
                  {[0, 25, 50, 75, 100].map((labelPct) => {
                    const r = pctToRad(labelPct);
                    const textPos = polarToCartesian(R_OUTER + 24, r);
                    return (
                      <text
                        key={labelPct}
                        x={textPos.x}
                        y={textPos.y + 4}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.7)"
                        fontSize="11"
                        fontWeight="800"
                        fontFamily="monospace"
                      >
                        {labelPct}%
                      </text>
                    );
                  })}

                  {/* FATIA DO ALVO SECRETO (Visível para o Médium ou durante REVELAÇÃO) */}
                  {showTargetWedge && (
                    <g className="transition-all duration-700 ease-out">
                      {/* Faixa Externa: 2 Pontos (±12.5% a ±7.5%) */}
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

                      {/* Faixa Média: 3 Pontos (±7.5% a ±2.5%) */}
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

                      {/* Bullseye / Centro: 4 Pontos (±2.5%) */}
                      <path
                        d={makeArcSector(target - 2.5, target + 2.5, R_INNER, R_OUTER)}
                        fill="#eab308"
                        filter="url(#bullseyeGlow)"
                      />

                      {/* Rótulo de 4 Pontos no Centro */}
                      {(() => {
                        const labelPos = polarToCartesian((R_INNER + R_OUTER) / 2, pctToRad(target));
                        return (
                          <text
                            x={labelPos.x}
                            y={labelPos.y + 4}
                            textAnchor="middle"
                            fill="#000"
                            fontSize="13"
                            fontWeight="900"
                            fontFamily="monospace"
                          >
                            4
                          </text>
                        );
                      })()}
                    </g>
                  )}

                  {/* CORTINA / ESCOTILHA MECÂNICA (Quando o alvo está oculto) */}
                  {!showTargetWedge && (
                    <path
                      d={makeArcSector(0, 100, R_INNER + 2, R_OUTER - 2)}
                      fill="#070b14"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2"
                    />
                  )}

                  {/* AGULHA / PONTEIRO VERMELHO DO DIAL */}
                  <g filter="url(#needleGlow)">
                    {/* Linha da agulha */}
                    <line
                      x1={CX}
                      y1={CY}
                      x2={needleTip.x}
                      y2={needleTip.y}
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />

                    {/* Seta e manípulo de arrasto na ponta */}
                    <circle
                      cx={needleTip.x}
                      cy={needleTip.y}
                      r={isDraggingDial ? 8 : 6.5}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                  </g>

                  {/* Pivô Central (Cubo metálico da agulha) */}
                  <circle cx={CX} cy={CY} r="28" fill="#0f172a" stroke="#ef4444" strokeWidth="3" />
                  <circle cx={CX} cy={CY} r="14" fill="#ef4444" />
                  <circle cx={CX} cy={CY} r="5" fill="#ffffff" />
                </svg>

                {/* Badge Flutuante do Indicador de Porcentagem Atual da Agulha */}
                <div className="absolute bottom-2 px-3 py-1 bg-black/80 border border-white/20 rounded-full font-mono text-xs font-bold text-gray-200 shadow-md">
                  {dial.toFixed(1)}%
                </div>
              </div>

              {/* CONTROLES DE AJUSTE DA AGULHA (Disponíveis apenas na fase de adivinhação para adivinhadores) */}
              {gameState.state === 'GUESSING_PHASE' && !isPsychic && (
                <div className="w-full mt-4 flex flex-col items-center space-y-3">
                  {/* Slider scrub bar */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={dial}
                    onChange={(e) => updateDial(parseFloat(e.target.value))}
                    className="w-full max-w-md accent-rose-500 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none"
                  />

                  {/* Botões de Ajuste Fino */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustDial(-5)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl font-mono text-xs font-bold cursor-pointer transition-all active:scale-95"
                    >
                      -5%
                    </button>
                    <button
                      onClick={() => adjustDial(-1)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl font-mono text-xs font-bold cursor-pointer transition-all active:scale-95"
                    >
                      -1%
                    </button>
                    <span className="px-3 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                      {t('wavelength.fine_tune', 'Ajuste')}
                    </span>
                    <button
                      onClick={() => adjustDial(1)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl font-mono text-xs font-bold cursor-pointer transition-all active:scale-95"
                    >
                      +1%
                    </button>
                    <button
                      onClick={() => adjustDial(5)}
                      className="px-3 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl font-mono text-xs font-bold cursor-pointer transition-all active:scale-95"
                    >
                      +5%
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO INFERIOR POR FASE */}

            {/* FASE DO MÉDIUM (PSYCHIC_PHASE) */}
            {gameState.state === 'PSYCHIC_PHASE' && (
              <div className="w-full max-w-xl">
                {isPsychic ? (
                  <form
                    onSubmit={handleSubmitClue}
                    className="bg-gradient-to-b from-amber-950/40 to-black/60 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4"
                  >
                    <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-black">
                      🔮 {t('wavelength.psychic_instructions_title', 'Você vê o alvo secreto no mostrador!')}
                    </span>
                    <p className="text-gray-300 text-sm max-w-md">
                      {t(
                        'wavelength.psychic_instructions_desc',
                        'Dê uma pista (uma palavra ou frase curta) que indique exatamente essa posição no espectro entre os dois conceitos.'
                      )}
                    </p>

                    <div className="w-full flex gap-2">
                      <input
                        type="text"
                        maxLength={70}
                        placeholder={t('wavelength.clue_placeholder', 'Ex: Café morno, O Poderoso Chefão, Uno...')}
                        value={clueInput}
                        onChange={(e) => setClueInput(e.target.value)}
                        className="flex-1 bg-black/80 border-2 border-amber-500/50 rounded-2xl px-4 py-3.5 text-amber-200 font-bold placeholder:text-gray-600 focus:outline-none focus:border-amber-400 transition-all font-mono"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!clueInput.trim()}
                        className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-600 text-black font-black uppercase tracking-wider rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer text-sm"
                      >
                        {t('wavelength.submit_clue_btn', 'Transmitir Dica 📡')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-black/60 border border-white/10 rounded-3xl p-8 text-center flex flex-col items-center space-y-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-3xl"
                    >
                      🔮
                    </motion.div>
                    <h4 className="text-lg font-bold text-cyan-300 uppercase tracking-wider">
                      {t('wavelength.waiting_psychic_clue', 'Aguardando o Médium dar a dica...')}
                    </h4>
                    <p className="text-gray-400 text-sm max-w-md">
                      {gameState.psychicName} {t('wavelength.psychic_tuning', 'está analisando o alvo secreto e sintonizando a mente.')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* FASE DE ADIVINHAÇÃO (GUESSING_PHASE) */}
            {gameState.state === 'GUESSING_PHASE' && (
              <div className="w-full max-w-xl flex flex-col items-center space-y-5">
                {/* Cartão de Dica Revelada */}
                <div className="w-full bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-2 border-amber-400/50 rounded-3xl p-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  <span className="text-[11px] font-mono text-amber-300 uppercase tracking-widest block mb-2">
                    💡 {t('wavelength.clue_title', 'PISTA DO MÉDIUM')} ({gameState.psychicName})
                  </span>
                  <div className="text-2xl md:text-3xl font-black text-amber-200 tracking-wide font-mono">
                    "{gameState.currentClue}"
                  </div>
                </div>

                {/* Botão de Confirmação para Adivinhadores */}
                {!isPsychic ? (
                  <button
                    onClick={confirmGuess}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-300 transition-all cursor-pointer text-sm"
                  >
                    ✓ {t('wavelength.confirm_guess_btn', 'Confirmar Palpite da Equipe')}
                  </button>
                ) : (
                  <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl text-center text-xs font-mono text-amber-300">
                    🤫 {t('wavelength.psychic_silence', 'Silêncio absoluto! Deixe sua equipe debater e posicionar a agulha.')}
                  </div>
                )}
              </div>
            )}

            {/* FASE DE REVELAÇÃO (REVEAL_PHASE) */}
            {gameState.state === 'REVEAL_PHASE' && (
              <div className="w-full max-w-xl flex flex-col items-center space-y-5">
                {/* Banner de Pontuação da Rodada Animado */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                  className={`w-full p-6 rounded-3xl border-2 text-center shadow-2xl flex flex-col items-center space-y-2 ${
                    gameState.roundPoints === 4
                      ? 'bg-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_35px_rgba(234,179,8,0.5)]'
                      : gameState.roundPoints >= 2
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
                      : 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                  }`}
                >
                  <span className="text-4xl md:text-5xl font-black font-mono">
                    +{gameState.roundPoints} {t('wavelength.points_suffix', 'PTS')}
                  </span>
                  <span className="text-sm font-black uppercase tracking-wider">
                    {gameState.roundPoints === 4
                      ? t('wavelength.result_bullseye', '🎯 NA MOSCA! PONTUAÇÃO MÁXIMA!')
                      : gameState.roundPoints === 3
                      ? t('wavelength.result_close', '✨ MUITO PERTO! ÓTIMA SINTONIA!')
                      : gameState.roundPoints === 2
                      ? t('wavelength.result_good', '👍 BOA TENTATIVA! PONTUOU NA FAIXA EXTERNA.')
                      : t('wavelength.result_miss', '❌ FORA DO ALVO! ZERO PONTOS NESTA RODADA.')}
                  </span>
                  <div className="text-xs font-mono text-white/70 flex gap-4 mt-2">
                    <span>{t('wavelength.target_label', 'Alvo')}: <strong>{target?.toFixed(1)}%</strong></span>
                    <span>{t('wavelength.guess_label', 'Palpite')}: <strong>{dial.toFixed(1)}%</strong></span>
                  </div>
                </motion.div>

                {/* Botão de Avanço de Rodada */}
                <button
                  onClick={nextRound}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-300 transition-all cursor-pointer text-sm"
                >
                  {gameState.round >= gameState.totalRounds
                    ? t('wavelength.finish_game_btn', 'Ver Resultado Final 🏆')
                    : t('wavelength.next_round_btn', 'Próxima Rodada &rarr;')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* FASE 5: FIM DE JOGO (GAME_OVER) */}
        {gameState.state === 'GAME_OVER' && (
          <div className="w-full max-w-3xl bg-black/80 backdrop-blur-2xl border-2 border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center text-4xl shadow-[0_0_35px_rgba(245,158,11,0.5)]">
              🏆
            </div>

            {/* Avaliação de Desempenho */}
            {(() => {
              const rating = getScoreRating(gameState.teamScore);
              return (
                <div className="space-y-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-mono font-black uppercase border ${rating.badge}`}>
                    {rating.title}
                  </span>
                  <h2 className="text-4xl font-black text-white font-mono tracking-wider mt-3">
                    {gameState.teamScore} <span className="text-white/40 text-xl">/ {gameState.totalRounds * 4} PTS</span>
                  </h2>
                  <p className="text-gray-300 text-sm max-w-md mx-auto">{rating.desc}</p>
                </div>
              );
            })()}

            {/* Tabela de Histórico das Rodadas */}
            <div className="w-full space-y-2 text-left">
              <span className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest px-1 block">
                {t('wavelength.round_history_title', 'Histórico das Rodadas')}
              </span>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {gameState.history.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-white/50 w-6">#{h.round}</span>
                      <div>
                        <div className="font-bold text-white">"{h.clue}"</div>
                        <div className="text-[11px] text-gray-400">
                          {h.theme.left} ↔ {h.theme.right} <span className="text-cyan-400 font-mono">({h.psychicName})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-gray-400">
                        {h.guessValue.toFixed(1)}% / {h.targetValue.toFixed(1)}%
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg font-black ${
                          h.points === 4
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : h.points >= 2
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        +{h.points}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botão de Jogar Novamente */}
            <div className="w-full flex gap-4">
              <button
                onClick={restartGame}
                className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black tracking-widest uppercase rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-300 transition-all cursor-pointer text-sm"
              >
                🔄 {t('wavelength.play_again_btn', 'Jogar Novamente')}
              </button>
              <button
                onClick={() => navigate('/hub')}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-black tracking-widest uppercase rounded-2xl border border-white/20 transition-all cursor-pointer text-sm"
              >
                {t('wavelength.exit_hub_btn', 'Sair para o Hub')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER HUD */}
      <footer className="relative z-10 max-w-6xl mx-auto w-full pt-4 border-t border-white/5 flex flex-wrap justify-between items-center text-xs font-mono text-gray-500 gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span>{isConnected ? t('wavelength.connected_status', 'Sincronizado') : t('wavelength.disconnected_status', 'Desconectado')}</span>
        </div>
        <span>PARTYHUB • WAVELENGTH (COMPRIMENTO DE ONDA)</span>
      </footer>
    </div>
  );
}
