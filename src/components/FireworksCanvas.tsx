import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
  gravity: number;
  sparkle?: boolean;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  isBonus?: boolean;
  trailColor?: string;
}

interface FireworksCanvasProps {
  isVictory?: boolean;
  burst?: {
    color: string;
    isBonus?: boolean;
    timestamp: number;
  } | null;
  className?: string;
}

const COLOR_PALETTES: Record<string, string[]> = {
  red: ['#ef4444', '#f87171', '#fca5a5', '#dc2626', '#ffffff'],
  yellow: ['#f59e0b', '#fbbf24', '#fde68a', '#d97706', '#ffffff'],
  green: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#ffffff'],
  blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#ffffff'],
  white: ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#fef08a'],
  multicolor: [
    '#ef4444',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#a855f7',
    '#ec4899',
    '#fbbf24',
    '#ffffff',
  ],
  gold: ['#fbbf24', '#fef08a', '#f59e0b', '#ffffff', '#fef3c7'],
};

// Limite generoso para um visual rico e exuberante, mas totalmente seguro para a GPU (sem shadowBlur)
const MAX_PARTICLES = 650;

export function FireworksCanvas({ isVictory = false, burst, className = '' }: FireworksCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rocketsRef = useRef<Rocket[]>([]);
  const animFrameId = useRef<number | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const lastBurstTimestamp = useRef<number>(0);
  const victoryTimerRef = useRef<number>(0);

  const startLoop = () => {
    if (isRunningRef.current) return;
    // Movimento reduzido: sem partículas
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      particlesRef.current = [];
      rocketsRef.current = [];
      return;
    }
    isRunningRef.current = true;
    animFrameId.current = requestAnimationFrame(loop);
  };

  // Cria a explosão de partículas com suporte a três escalas visuais distintas
  const createBurst = (
    centerX: number,
    centerY: number,
    colorKey: string,
    isBonus: boolean = false
  ) => {
    const palette = COLOR_PALETTES[colorKey] || COLOR_PALETTES.multicolor;

    if (isBonus) {
      // --- ESCALA 2: CONJUNTO COMPLETO (FOGUETE DO 5) ---
      // Dupla explosão: Anel de choque externo + núcleo de faíscas douradas e da cor do foguete
      const count = 90;
      if (particlesRef.current.length + count > MAX_PARTICLES) {
        particlesRef.current.splice(0, count);
      }

      // 1. Faíscas externas amplas e velozes
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        const speed = Math.random() * 6.5 + 4.5;
        const isGold = Math.random() > 0.4;
        const color = isGold
          ? COLOR_PALETTES.gold[Math.floor(Math.random() * COLOR_PALETTES.gold.length)]
          : palette[Math.floor(Math.random() * palette.length)];

        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          size: Math.random() * 2 + 2.4,
          decay: Math.random() * 0.014 + 0.012, // Duração maior (~2s)
          gravity: 0.07,
          sparkle: Math.random() > 0.5,
        });
      }

      // 2. Anel concêntrico extra de estrelas brancas/douradas
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2;
        const speed = 7.5 + Math.random() * 1.5;
        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: '#ffffff',
          size: 3.2,
          decay: 0.018,
          gravity: 0.05,
          sparkle: true,
        });
      }
    } else {
      // --- ESCALA 1: JOGADA CORRETA SIMPLES ---
      // Estouro nítido e satisfatório com boa dispersão e faíscas visíveis
      const count = 52;
      if (particlesRef.current.length + count > MAX_PARTICLES) {
        particlesRef.current.splice(0, count);
      }

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const speed = Math.random() * 5.5 + 3.2; // Boa expansão (raio de 200px+)
        const color = palette[Math.floor(Math.random() * palette.length)];

        particlesRef.current.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          size: Math.random() * 1.8 + 2.0, // Faíscas perceptíveis (2.0 a 3.8px)
          decay: Math.random() * 0.018 + 0.014,
          gravity: 0.07,
          sparkle: Math.random() > 0.6,
        });
      }
    }

    startLoop();
  };

  // Observa gatilho de burst (ao jogar carta certa)
  useEffect(() => {
    if (burst && burst.timestamp !== lastBurstTimestamp.current && canvasRef.current) {
      lastBurstTimestamp.current = burst.timestamp;
      const canvas = canvasRef.current;
      const targetX = canvas.width / 2 + (Math.random() - 0.5) * 160;
      const targetY = canvas.height * 0.35 + (Math.random() - 0.5) * 80;

      // Adiciona o foguete de subida
      rocketsRef.current.push({
        x: targetX,
        y: canvas.height * 0.9,
        targetY,
        vy: burst.isBonus ? -17 : -15,
        color: burst.color,
        isBonus: burst.isBonus,
        trailColor: burst.isBonus ? '#fbbf24' : '#fef08a',
      });

      startLoop();
    }
  }, [burst]);

  // Observa modo vitória
  useEffect(() => {
    if (isVictory) {
      victoryTimerRef.current = 0;
      startLoop();
    }
  }, [isVictory]);

  const loop = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      isRunningRef.current = false;
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isRunningRef.current = false;
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // --- ESCALA 3: SHOW DE VITÓRIA GRANDIOSO EM TELA CHEIA ---
    if (isVictory) {
      victoryTimerRef.current++;

      // Dispara foguetes frequentes e variados (a cada ~16 a 24 frames, mantendo até 5 simultâneos)
      if (victoryTimerRef.current % 18 === 0 && rocketsRef.current.length < 5) {
        const keys = ['red', 'yellow', 'green', 'blue', 'white', 'multicolor'];
        const randomColor = keys[Math.floor(Math.random() * keys.length)];
        const isGrand = Math.random() < 0.35; // 35% de chance de ser um estouro bônus gigante

        rocketsRef.current.push({
          x: Math.random() * (width * 0.75) + width * 0.12,
          y: height,
          targetY: Math.random() * (height * 0.45) + height * 0.12,
          vy: -(Math.random() * 4 + 13),
          color: randomColor,
          isBonus: isGrand,
          trailColor: isGrand ? '#fbbf24' : '#fef08a',
        });
      }
    }

    // 1. Atualiza e desenha foguetes que sobem
    for (let i = rocketsRef.current.length - 1; i >= 0; i--) {
      const r = rocketsRef.current[i];
      r.y += r.vy;

      // Rastro brilhante do foguete subindo
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x, r.y - r.vy * 2.2);
      ctx.strokeStyle = r.trailColor || '#fde68a';
      ctx.lineWidth = r.isBonus ? 3.5 : 2.5;
      ctx.globalAlpha = 0.85;
      ctx.stroke();

      // Ponto de luz da ponta
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.isBonus ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1;
      ctx.fill();

      // Chegou ao ápice: detona a explosão!
      if (r.y <= r.targetY || r.vy >= 0) {
        createBurst(r.x, r.y, r.color, r.isBonus);
        rocketsRef.current.splice(i, 1);
      }
    }

    // 2. Atualiza e desenha partículas em modo aditivo de alto brilho (sem shadowBlur)
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.975;
      p.vy *= 0.975;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      const currentAlpha = p.sparkle && Math.random() < 0.25 ? p.alpha * 0.4 : p.alpha;

      // Rastro de faísca (linhas com fade)
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.globalAlpha = currentAlpha * 0.75;
      ctx.stroke();

      // Halo exterior colorido
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = currentAlpha * 0.35;
      ctx.fill();

      // Núcleo branco cintilante
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.9, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = currentAlpha;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Se não há nada ativo e não está no modo de vitória, encerra o loop para 0% de CPU/GPU
    if (!isVictory && rocketsRef.current.length === 0 && particlesRef.current.length === 0) {
      ctx.clearRect(0, 0, width, height);
      isRunningRef.current = false;
      return;
    }

    animFrameId.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      isRunningRef.current = false;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-30 ${className}`}
    />
  );
}
