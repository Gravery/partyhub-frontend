import type React from 'react';
import { create } from 'zustand';

/**
 * Camada de ações: em vez de um aviso de texto, cada jogada vira um movimento visível.
 * O objeto sai de quem agiu (`from`), viaja até onde importa (`to`), o destino reage
 * (pulso, tremor) e uma legenda curta nasce ali.
 *
 * Âncoras são elementos marcados com `data-anchor="nome"` dentro do GameShell.
 */
export type ActionTone = 'success' | 'danger' | 'info' | 'accent';
export type LandingEffect = 'pulse' | 'shake' | 'none';

export interface ActionCaption {
  text: string;
  /** Nome e semente do avatar de quem agiu */
  actorName?: string;
  actorSeed?: string;
  tone?: ActionTone;
}

export interface ActionSpec {
  /** Âncora de origem; se não existir mais na tela, tenta `fallbackFrom` */
  from?: string;
  fallbackFrom?: string;
  /** Âncora de destino (onde a legenda nasce e o efeito acontece) */
  to: string;
  /** O que voa (carta, ficha, voto). Sem `token`, só efeito e legenda. */
  token?: React.ReactNode;
  /** Face revelada no meio do caminho (carta que vira no ar) */
  revealToken?: React.ReactNode;
  /** Tamanho do objeto em voo, em px */
  size?: { w: number; h: number };
  effect?: LandingEffect;
  /** Outras âncoras que pulsam junto no pouso (ex.: cartas apontadas por uma dica) */
  alsoPulse?: string[];
  caption?: ActionCaption;
  /** Espera antes de começar (ex.: deixar o peão terminar de andar) */
  delayMs?: number;
}

export interface QueuedAction extends ActionSpec {
  id: number;
}

interface ActionLayerState {
  queue: QueuedAction[];
  enqueue: (spec: ActionSpec) => void;
  shift: () => void;
  clear: () => void;
}

/** Fila curta: eventos acumulados além disso são descartados (os mais antigos primeiro) */
const MAX_PENDING = 3;
let nextId = 1;

export const useActionLayerStore = create<ActionLayerState>((set) => ({
  queue: [],
  enqueue: (spec) =>
    set((s) => {
      const queue = [...s.queue, { ...spec, id: nextId++ }];
      // Mantém a ação em andamento (índice 0) e as mais recentes
      if (queue.length > MAX_PENDING + 1) queue.splice(1, queue.length - MAX_PENDING - 1);
      return { queue };
    }),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));

/** Dispara uma ação na camada do jogo atual */
export function playAction(spec: ActionSpec) {
  useActionLayerStore.getState().enqueue(spec);
}

/** Tempos da coreografia (ms), os mesmos da proposta de motion */
export const ACTION_TIMING = {
  travel: 420,
  land: 220,
  caption: 2400,
  reducedFade: 120,
} as const;
