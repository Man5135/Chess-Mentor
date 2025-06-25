const { Chess } = require('chess.js');
const { evaluateBoard, findBestMove, minimax, countCenterControl } = require('./script');

describe('Chess AI Functions', () => {
  let game;

  beforeEach(() => {
    game = new Chess();
  });

  describe('evaluateBoard', () => {
    it('should return high positive value for AI checkmate', () => {
      game.load('8/8/8/8/8/8/6k1/5r1K b - - 0 1'); // Черные ставят мат
      const score = evaluateBoard(game);
      expect(score).toBe(10000);
    });

    it('should return high negative value for player checkmate', () => {
      game.load('8/8/8/8/8/8/6K1/5R1k w - - 0 1'); // Белые ставят мат
      const score = evaluateBoard(game);
      expect(score).toBe(-10000);
    });

    it('should return 0 for draw', () => {
      game.load('8/8/8/8/8/8/8/4k3 b - - 0 1'); // Ничья (пат)
      const score = evaluateBoard(game);
      expect(score).toBe(0);
    });

    it('should evaluate piece values correctly', () => {
      game.load('8/8/8/3p4/4P3/8/8/8 w - - 0 1'); // Белая пешка против черной
      const score = evaluateBoard(game);
      expect(score).toBeLessThan(0); // Черные имеют преимущество
    });

    it('should add check bonus', () => {
      game.load('8/8/8/8/8/5q2/6K1/8 b - - 0 1'); // Шах
      const score = evaluateBoard(game);
      expect(score).toBeGreaterThan(0); // Черные имеют преимущество
    });
  });

  describe('minimax', () => {
    it('should return evaluation when depth is 0', () => {
      game.load('8/8/8/8/8/8/8/4k3 b - - 0 1');
      const score = minimax(game, 0, -Infinity, Infinity, true);
      expect(typeof score).toBe('number');
    });

    it('should return higher score for maximizing player', () => {
      game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const score = minimax(game, 1, -Infinity, Infinity, true);
      expect(typeof score).toBe('number');
    });
  });

  describe('findBestMove', () => {
    it('should return a move when moves are available', () => {
      game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      const move = findBestMove(game, 1);
      expect(move).toHaveProperty('from');
      expect(move).toHaveProperty('to');
    });

    it('should return null when no moves are available', () => {
      game.load('8/8/8/8/8/8/6k1/5r1K b - - 0 1'); // Мат
      const move = findBestMove(game, 1);
      expect(move).toBeNull();
    });
  });

  describe('countCenterControl', () => {
    it('should count center control correctly', () => {
      game.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      const control = countCenterControl(game);
      expect(control).toBeGreaterThan(0); // Белые контролируют центр
    });

    it('should return 0 when no center control', () => {
      game.load('8/8/8/8/8/8/8/4k3 b - - 0 1');
      const control = countCenterControl(game);
      expect(control).toBe(0);
    });
  });
});

describe('Performance Tests', () => {
  let game;

  beforeEach(() => {
    game = new Chess();
    game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  test('evaluateBoard performance', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      evaluateBoard(game);
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(50);
  });

  test('minimax with depth 2 performance', () => {
    const start = performance.now();
    minimax(game, 2, -Infinity, Infinity, true);
    const end = performance.now();
    expect(end - start).toBeLessThan(100);
  });

  test('findBestMove with depth 2 performance', () => {
    const start = performance.now();
    findBestMove(game, 2);
    const end = performance.now();
    expect(end - start).toBeLessThan(150);
  });
});