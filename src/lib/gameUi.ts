const AVATAR_COLORS = ['#6D28D9', '#0E7490', '#B45309', '#BE123C', '#047857', '#1D4ED8', '#A21CAF', '#4D7C0F'];

/** Cor estável de avatar a partir do id do jogador. */
export function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Calcula o motivo de bloqueio padrão (mínimo de jogadores + todos prontos). */
export function lobbyBlockReason(
  t: (k: string, o?: Record<string, unknown>) => string,
  players: { name: string; isReady?: boolean }[],
  minPlayers: number,
): string | null {
  if (players.length < minPlayers) return t('lobby.need_players', { min: minPlayers });
  const notReady = players.filter((p) => p.isReady === false).map((p) => p.name);
  if (notReady.length > 0) return t('lobby.missing_ready', { names: notReady.join(', ') });
  return null;
}
