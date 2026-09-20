export type LudoColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export interface Position {
  row: number;
  col: number;
}

export const AllColors: LudoColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

// 52 casas do circuito principal em ordem horária a partir da saída do Vermelho (Row 6, Col 1)
export const MainTrackCoordinates: Position[] = [
  { row: 6, col: 1 },  // 0: Saída Vermelho
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4
  { row: 5, col: 6 },  // 5
  { row: 4, col: 6 },  // 6
  { row: 3, col: 6 },  // 7
  { row: 2, col: 6 },  // 8: Estrela Segura (Vermelho)
  { row: 1, col: 6 },  // 9
  { row: 0, col: 6 },  // 10
  { row: 0, col: 7 },  // 11
  { row: 0, col: 8 },  // 12
  { row: 1, col: 8 },  // 13: Saída Verde
  { row: 2, col: 8 },  // 14
  { row: 3, col: 8 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 5, col: 8 },  // 17
  { row: 6, col: 9 },  // 18
  { row: 6, col: 10 }, // 19
  { row: 6, col: 11 }, // 20
  { row: 6, col: 12 }, // 21: Estrela Segura (Verde)
  { row: 6, col: 13 }, // 22
  { row: 6, col: 14 }, // 23
  { row: 7, col: 14 }, // 24
  { row: 8, col: 14 }, // 25
  { row: 8, col: 13 }, // 26: Saída Amarelo
  { row: 8, col: 12 }, // 27
  { row: 8, col: 11 }, // 28
  { row: 8, col: 10 }, // 29
  { row: 8, col: 9 },  // 30
  { row: 9, col: 8 },  // 31
  { row: 10, col: 8 }, // 32
  { row: 11, col: 8 }, // 33
  { row: 12, col: 8 }, // 34: Estrela Segura (Amarelo)
  { row: 13, col: 8 }, // 35
  { row: 14, col: 8 }, // 36
  { row: 14, col: 7 }, // 37
  { row: 14, col: 6 }, // 38
  { row: 13, col: 6 }, // 39: Saída Azul
  { row: 12, col: 6 }, // 40
  { row: 11, col: 6 }, // 41
  { row: 10, col: 6 }, // 42
  { row: 9, col: 6 },  // 43
  { row: 8, col: 5 },  // 44
  { row: 8, col: 4 },  // 45
  { row: 8, col: 3 },  // 46
  { row: 8, col: 2 },  // 47: Estrela Segura (Azul)
  { row: 8, col: 1 },  // 48
  { row: 8, col: 0 },  // 49
  { row: 7, col: 0 },  // 50
  { row: 6, col: 0 },  // 51
];

// Retas finais exclusivas de cada cor (passos 51 a 55)
export const HomeStretchCoordinates: Record<LudoColor, Position[]> = {
  RED: [
    { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 },
  ],
  GREEN: [
    { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 3, col: 7 }, { row: 4, col: 7 }, { row: 5, col: 7 },
  ],
  YELLOW: [
    { row: 7, col: 13 }, { row: 7, col: 12 }, { row: 7, col: 11 }, { row: 7, col: 10 }, { row: 7, col: 9 },
  ],
  BLUE: [
    { row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, { row: 10, col: 7 }, { row: 9, col: 7 },
  ],
};

// Posições dos 4 berços na garagem para cada cor (step -1)
export const YardCoordinates: Record<LudoColor, Position[]> = {
  RED: [
    { row: 1, col: 1 }, { row: 1, col: 4 }, { row: 4, col: 1 }, { row: 4, col: 4 },
  ],
  GREEN: [
    { row: 1, col: 10 }, { row: 1, col: 13 }, { row: 4, col: 10 }, { row: 4, col: 13 },
  ],
  YELLOW: [
    { row: 10, col: 10 }, { row: 10, col: 13 }, { row: 13, col: 10 }, { row: 13, col: 13 },
  ],
  BLUE: [
    { row: 10, col: 1 }, { row: 10, col: 4 }, { row: 13, col: 1 }, { row: 13, col: 4 },
  ],
};

// Ponto central da meta para cada cor (passo 56)
export const GoalCoordinates: Record<LudoColor, Position> = {
  RED:    { row: 7, col: 6 },
  GREEN:  { row: 6, col: 7 },
  YELLOW: { row: 7, col: 8 },
  BLUE:   { row: 8, col: 7 },
};

// Ponto de largada no circuito para cada cor
export const StartIndex: Record<LudoColor, number> = {
  RED:    0,
  GREEN:  13,
  YELLOW: 26,
  BLUE:   39,
};

// Índices das casas seguras no circuito principal
export const SafeTrackIndices = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export function isSafeSquare(trackIndex: number): boolean {
  return SafeTrackIndices.has(trackIndex);
}

export function getGlobalTrackIndex(color: LudoColor, step: number): number {
  if (step < 0 || step > 50) return -1;
  return (StartIndex[color] + step) % 52;
}

export function getPawnPosition(color: LudoColor, pawnIndex: number, step: number): Position {
  if (step < 0) {
    return YardCoordinates[color][pawnIndex] || { row: 0, col: 0 };
  }
  if (step <= 50) {
    const trackIdx = getGlobalTrackIndex(color, step);
    return MainTrackCoordinates[trackIdx];
  }
  if (step <= 55) {
    return HomeStretchCoordinates[color][step - 51];
  }
  return GoalCoordinates[color];
}
