const { Chess } = require('chess.js');
const { evaluateBoard, findBestMove, minimax, countCenterControl } = require('./script');

jest.mock('chess.js', () => {
  const originalModule = jest.requireActual('chess.js');
  return {
    ...originalModule,
    Chess: jest.fn().mockImplementation(() => ({
      move: jest.fn(),
      undo: jest.fn(),
      in_checkmate: jest.fn(),
      in_draw: jest.fn(),
      in_check: jest.fn(),
      turn: jest.fn(),
      moves: jest.fn(),
      board: jest.fn(),
      fen: jest.fn(),
      game_over: jest.fn(),
      history: jest.fn(),
      load: jest.fn(),
      load_pgn: jest.fn(),
      pgn: jest.fn(),
    })),
  };
});

describe('Chess AI Functions', () => {
  let mockGame;

  beforeEach(() => {
    mockGame = new Chess();
    mockGame.turn.mockReturnValue('w');
    mockGame.moves.mockReturnValue([]);
    mockGame.board.mockReturnValue(Array(8).fill().map(() => Array(8).fill(null)));
  });

  describe('evaluateBoard', () => {
    it('should return high positive value for AI checkmate', () => {
      mockGame.in_checkmate.mockReturnValue(true);
      mockGame.turn.mockReturnValue('b');
      const score = evaluateBoard(mockGame, 'w', 'b');
      expect(score).toBe(10000);
    });

    it('should return high negative value for player checkmate', () => {
      mockGame.in_checkmate.mockReturnValue(true);
      mockGame.turn.mockReturnValue('w');
      const score = evaluateBoard(mockGame, 'w', 'b');
      expect(score).toBe(-10000);
    });

    it('should return 0 for draw', () => {
      mockGame.in_draw.mockReturnValue(true);
      const score = evaluateBoard(mockGame, 'w', 'b');
      expect(score).toBe(0);
    });

    it('should evaluate piece values correctly', () => {
      mockGame.board.mockReturnValue([
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, { type: 'p', color: 'w' }, null, null, null, null, null],
        [null, null, null, { type: 'q', color: 'b' }, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null]
      ]);
      const score = evaluateBoard(mockGame, 'w', 'b');
      expect(score).toBeLessThan(0); // У черных ферзь, должно быть преимущество
    });
  });

  describe('minimax', () => {
    it('should return evaluation when depth is 0', () => {
      mockGame.board.mockReturnValue([
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, { type: 'p', color: 'w' }, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null]
      ]);
      const score = minimax(mockGame, 0, -Infinity, Infinity, true, 'w', 'b');
      expect(typeof score).toBe('number');
    });
  });

  describe('findBestMove', () => {
    it('should return a move when moves are available', () => {
      mockGame.moves.mockReturnValue([{ from: 'e2', to: 'e4' }]);
      const move = findBestMove(mockGame, 1, 'w', 'b');
      expect(move).toHaveProperty('from');
      expect(move).toHaveProperty('to');
    });

    it('should return null when no moves are available', () => {
      mockGame.moves.mockReturnValue([]);
      const move = findBestMove(mockGame, 1, 'w', 'b');
      expect(move).toBeNull();
    });
  });

  describe('countCenterControl', () => {
    it('should count center control correctly', () => {
      mockGame.moves.mockImplementation(({ square }) => {
        if (square === 'e4') return [{ color: 'w' }];
        if (square === 'd4') return [{ color: 'b' }];
        return [];
      });
      const control = countCenterControl(mockGame, 'w', 'b');
      expect(control).toBe(0); // w контролирует e4, b контролирует d4 => разница 0
    });
  });
});

describe('Performance Tests', () => {
  let mockGame;

  beforeEach(() => {
    mockGame = new Chess();
    mockGame.turn.mockReturnValue('w');
    mockGame.moves.mockReturnValue([
      { from: 'e2', to: 'e4' },
      { from: 'g1', to: 'f3' },
      { from: 'f1', to: 'b5' }
    ]);
    mockGame.board.mockReturnValue(Array(8).fill().map(() => Array(8).fill(null)));
  });

  test('evaluateBoard performance', () => {
    const start = performance.now();
    evaluateBoard(mockGame, 'w', 'b');
    const end = performance.now();
    expect(end - start).toBeLessThan(10); // Ожидаем выполнение менее чем за 10 мс
  });

  test('minimax with depth 2 performance', () => {
    const start = performance.now();
    minimax(mockGame, 2, -Infinity, Infinity, true, 'w', 'b');
    const end = performance.now();
    expect(end - start).toBeLessThan(100); // Ожидаем выполнение менее чем за 100 мс
  });

  test('findBestMove with depth 2 performance', () => {
    const start = performance.now();
    findBestMove(mockGame, 2, 'w', 'b');
    const end = performance.now();
    expect(end - start).toBeLessThan(150); // Ожидаем выполнение менее чем за 150 мс
  });
});