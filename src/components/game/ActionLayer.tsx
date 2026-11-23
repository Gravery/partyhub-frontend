import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useActionLayerStore, ACTION_TIMING, type ActionTone, type QueuedAction } from '../../lib/actionLayer';
import { Avatar } from './ui';

interface Box {
  cx: number;
  cy: number;
  top: number;
  bottom: number;
}

interface Flight {
  id: number;
  token: React.ReactNode;
  revealToken?: React.ReactNode;
  revealed: boolean;
  w: number;
  h: number;
  from: Box;
  to: Box;
}

interface CaptionView {
  id: number;
  text: string;
  actorName?: string;
  actorSeed?: string;
  tone: ActionTone;
  x: number;
  y: number;
  below: boolean;
}

const TONE_STYLE: Record<ActionTone, string> = {
  success: 'bg-emerald-950 border-emerald-500 text-emerald-100',
  danger: 'bg-rose-950 border-rose-500 text-rose-100',
  info: 'bg-surface border-line-strong text-ink',
  accent: 'bg-ground border-accent text-ink',
};

// Curvas da proposta de motion: chegada e pouso com mola
const EASE_ARRIVE = 'cubic-bezier(.16,1,.3,1)';
const EASE_SPRING = 'cubic-bezier(.34,1.56,.64,1)';

function findAnchor(root: HTMLElement | null, name?: string): HTMLElement | null {
  if (!root || !name) return null;
  const nodes = root.querySelectorAll<HTMLElement>(`[data-anchor="${CSS.escape(name)}"]`);
  // A mesma âncora pode existir no trilho e na gaveta, ou no cabeçalho de desktop e de celular:
  // fica com a que está visível
  for (const el of Array.from(nodes)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function boxOf(el: HTMLElement | null): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, top: r.top, bottom: r.bottom };
}

function canAnimate(el: Element | null): el is HTMLElement {
  return Boolean(el && typeof (el as HTMLElement).animate === 'function');
}

function landingEffect(el: HTMLElement, effect: 'pulse' | 'shake', accent: string) {
  if (!canAnimate(el)) return;
  if (effect === 'shake') {
    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(7px)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 320, easing: 'ease-out', composite: 'add' }
    );
    return;
  }
  el.animate(
    [
      { transform: 'scale(1)', boxShadow: `0 0 0 0 ${accent}` },
      { transform: 'scale(1.08)', boxShadow: '0 0 0 10px transparent', offset: 0.45 },
      { transform: 'scale(1)', boxShadow: '0 0 0 0 transparent' },
    ],
    { duration: ACTION_TIMING.land + 140, easing: EASE_SPRING, composite: 'add' }
  );
}

/** Objeto em voo: arco da origem ao destino com leve giro (Web Animations, segue o relógio mesmo com a aba em segundo plano) */
function FlyingToken({ flight }: { flight: Flight }) {
  const ref = useRef<HTMLDivElement>(null);
  const dx = flight.to.cx - flight.from.cx;
  const dy = flight.to.cy - flight.from.cy;
  // Sobe acima do ponto mais alto do trajeto
  const arcY = Math.min(0, dy) - 60;

  useEffect(() => {
    const el = ref.current;
    if (!canAnimate(el)) return;
    el.animate(
      [
        { transform: 'translate(0px, 0px) rotate(0deg) scale(0.92)', opacity: 0.4 },
        { transform: `translate(0px, -6px) rotate(-3deg) scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${dx * 0.5}px, ${arcY}px) rotate(-6deg) scale(1.06)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(1)`, opacity: 1 },
      ],
      { duration: ACTION_TIMING.travel, easing: EASE_ARRIVE, fill: 'forwards' }
    );
  }, [dx, dy, arcY]);

  return (
    <div
      ref={ref}
      className="absolute"
      style={{ left: flight.from.cx - flight.w / 2, top: flight.from.cy - flight.h / 2, width: flight.w, height: flight.h }}
    >
      {flight.revealed && flight.revealToken ? <FlipIn>{flight.revealToken}</FlipIn> : flight.token}
    </div>
  );
}

/** A face revelada entra girando: a carta vira no ar */
function FlipIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!canAnimate(el)) return;
    el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 140, easing: 'ease-out' });
  }, []);
  return (
    <div ref={ref} className="w-full h-full">
      {children}
    </div>
  );
}

function CaptionChip({ caption }: { caption: CaptionView }) {
  const ref = useRef<HTMLDivElement>(null);
  const base = caption.below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';

  useEffect(() => {
    const el = ref.current;
    if (!canAnimate(el)) return;
    const shift = caption.below ? -4 : 6;
    el.animate(
      [
        { opacity: 0, transform: `${base} translateY(${shift}px) scale(0.92)` },
        { opacity: 1, transform: `${base} translateY(0) scale(1)` },
      ],
      { duration: 220, easing: EASE_SPRING }
    );
    // Some um pouco antes de sair da lista
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: ACTION_TIMING.caption - 220, fill: 'forwards' });
  }, [base, caption.below]);

  return (
    <div ref={ref} className="absolute" style={{ left: caption.x, top: caption.y, transform: base }}>
      <span
        className={`inline-flex items-center gap-2 max-w-[min(320px,80vw)] pl-1.5 pr-3 py-1.5 rounded-full border text-sm font-extrabold shadow-lg shadow-black/40 ${TONE_STYLE[caption.tone]}`}
      >
        {caption.actorName && <Avatar name={caption.actorName} seed={caption.actorSeed} size={24} />}
        <span className="truncate">{caption.text}</span>
      </span>
    </div>
  );
}

/**
 * Desenha as ações da fila sobre o jogo: voo da origem ao destino, reação no destino
 * e legenda ancorada. Montado uma vez pelo GameShell; os jogos chamam `playAction`.
 */
export function ActionLayer({ rootRef }: { rootRef: React.RefObject<HTMLElement | null> }) {
  const head = useActionLayerStore((s) => s.queue[0]);
  const reduceMotion = useReducedMotion();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [captions, setCaptions] = useState<CaptionView[]>([]);
  const running = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Ao sair do jogo, descarta o que ficou na fila
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      useActionLayerStore.getState().clear();
    };
  }, []);

  useEffect(() => {
    if (!head || running.current === head.id) return;
    running.current = head.id;
    const action: QueuedAction = head;
    const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

    const finish = () => {
      running.current = null;
      useActionLayerStore.getState().shift();
    };

    const land = () => {
      const root = rootRef.current;
      const toEl = findAnchor(root, action.to);
      const accent = root ? getComputedStyle(root).getPropertyValue('--accent').trim() || '#8B5CF6' : '#8B5CF6';
      if (!reduceMotion) {
        if (toEl && action.effect && action.effect !== 'none') landingEffect(toEl, action.effect, accent);
        action.alsoPulse?.forEach((name) => {
          const el = findAnchor(root, name);
          if (el) landingEffect(el, 'pulse', accent);
        });
      }
      const target = boxOf(toEl) || boxOf(findAnchor(root, action.from)) || boxOf(findAnchor(root, action.fallbackFrom));
      if (action.caption && target) {
        // Legenda acima do destino; se não couber, abaixo. Em destinos altos (painéis), nasce dentro, no topo.
        // Presa às bordas da tela.
        const tall = target.bottom - target.top > 240;
        const below = tall || target.top < 96;
        const caption: CaptionView = {
          id: action.id,
          text: action.caption.text,
          actorName: action.caption.actorName,
          actorSeed: action.caption.actorSeed,
          tone: action.caption.tone || 'info',
          x: Math.min(Math.max(target.cx, 140), window.innerWidth - 140),
          y: tall ? target.top + 12 : below ? target.bottom + 10 : target.top - 10,
          below,
        };
        setCaptions((list) => [...list.slice(-2), caption]);
        later(() => setCaptions((list) => list.filter((c) => c.id !== action.id)), ACTION_TIMING.caption);
      }
      later(finish, reduceMotion ? ACTION_TIMING.reducedFade : ACTION_TIMING.land);
    };

    const start = (attempt = 0) => {
      const root = rootRef.current;
      // O destino pode estar entrando na tela (troca de fase, aparelho lento): espera até ~1 s
      if (!findAnchor(root, action.to) && attempt < 10) {
        later(() => start(attempt + 1), 100);
        return;
      }
      const from = boxOf(findAnchor(root, action.from)) || boxOf(findAnchor(root, action.fallbackFrom));
      const to = boxOf(findAnchor(root, action.to));
      if (reduceMotion || !action.token || !from || !to) {
        land();
        return;
      }
      const size = action.size || { w: 56, h: 84 };
      setFlight({ id: action.id, token: action.token, revealToken: action.revealToken, revealed: false, w: size.w, h: size.h, from, to });
      if (action.revealToken) {
        later(() => setFlight((f) => (f && f.id === action.id ? { ...f, revealed: true } : f)), ACTION_TIMING.travel * 0.4);
      }
      later(() => {
        setFlight((f) => (f && f.id === action.id ? null : f));
        land();
      }, ACTION_TIMING.travel);
    };

    later(() => start(), action.delayMs ?? 0);
  }, [head, reduceMotion, rootRef]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[45]">
      {flight && <FlyingToken key={flight.id} flight={flight} />}
      <div aria-live="polite">
        {captions.map((c) => (
          <CaptionChip key={c.id} caption={c} />
        ))}
      </div>
    </div>
  );
}
