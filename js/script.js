document.addEventListener('DOMContentLoaded', function() {
    // Инициализация игры
    const game = new Chess();
    const board = Chessboard('board', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'img/chesspieces/wikipedia/{piece}.png'
    });

    // Настройки игры
    const moveHistory = [game.fen()];
    let aiThinking = false;
    let playerColor = 'white';
    let aiColor = 'black';
    let searchTimeout =  3000; // Ограничение по времени мышления для ии

    // Инициализация игры
    initGame();

    function initGame() {
        playerColor = document.getElementById('colorSelect').value;
        aiColor = playerColor === 'white' ? 'black' : 'white';
        
        game.reset();
        board.start();
        moveHistory.length = 0;
        moveHistory.push(game.fen());
        
        updateGameStatus();
        document.getElementById('moveHistory').innerHTML = '';
        
        if (playerColor === 'black') {
            aiThinking = true;
            setTimeout(makeAiMove, 500);
        }
    }

    function onDragStart(source, piece) {
        return !aiThinking && 
               !game.game_over() && 
               ((playerColor === 'white' && piece[0] === 'w') || 
                (playerColor === 'black' && piece[0] === 'b'));
    }

    function onDrop(source, target) {
        if (aiThinking) return 'snapback';

        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        moveHistory.push(game.fen());
        updateGameStatus();
        updateMoveHistory();
        
        if (!game.game_over()) {
            aiThinking = true;
            setTimeout(makeAiMove, 300);
        }
    }

    function onSnapEnd() {
        board.position(game.fen());
    }

    function makeAiMove() {
        const level = parseInt(document.getElementById('aiLevel').value);
        const move = findBestMove(game, level);
        
        if (move) {
            game.move(move);
            moveHistory.push(game.fen());
            board.position(game.fen());
            updateGameStatus();
            updateMoveHistory();
        }
        
        aiThinking = false;
    }

    function findBestMove(game, depth) {
        // Для Expert (4) - новый мощный алгоритм
        if (depth === 4) {
            return findExpertMove(game);
        }
        
        // Оригинальный код для Medium (2) и Hard (3)
        const moves = game.moves({verbose: true});
        if (moves.length === 0) return null;

        moves.sort((a, b) => {
            game.move(a);
            const aScore = evaluateBoard(game, depth);
            game.undo();
            
            game.move(b);
            const bScore = evaluateBoard(game, depth);
            game.undo();
            
            return bScore - aScore;
        });

        let bestMove = moves[0];
        let bestValue = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;

        for (let i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            const value = minimax(game, depth - 1, alpha, beta, false);
            game.undo();

            if (value > bestValue) {
                bestValue = value;
                bestMove = moves[i];
            }
            alpha = Math.max(alpha, value);
        }

        return bestMove;
    }

    // Новый мощный алгоритм для Expert
    function findExpertMove(game) {
        // 1. Поиск быстрого мата
        const quickMate = findMateInTwo(game);
        if (quickMate) return quickMate;

        // 2. Итеративное углубление с ограничением времени
        let bestMove = null;
        let bestScore = -Infinity;
        const startTime = Date.now();
        
        for (let depth = 1; depth <= 6; depth++) {
            if (Date.now() - startTime > searchTimeout) break;
            
            const result = alphaBetaSearch(game, depth, -Infinity, Infinity, false);
            if (result.score > bestScore) {
                bestScore = result.score;
                bestMove = result.move;
            }
        }
        
        return bestMove || game.moves()[0]; // Запасной вариант
    }

    function alphaBetaSearch(game, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || game.game_over()) {
            return {
                score: quiesce(game, alpha, beta, 3),
                move: null
            };
        }

        const moves = game.moves({verbose: true});
        if (moves.length === 0) {
            return {
                score: evaluateAdvancedPosition(game),
                move: null
            };
        }

        // Сортировка ходов для лучшего отсечения
        moves.sort((a, b) => {
            return evaluateMovePotential(game, b) - evaluateMovePotential(game, a);
        });

        let bestMove = moves[0];
        let bestValue = -Infinity;

        for (const move of moves.slice(0, 7)) { // Анализ топ-7 ходов
            game.move(move);
            const result = alphaBetaSearch(game, depth - 1, -beta, -alpha, !isMaximizing);
            const value = -result.score;
            game.undo();

            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
                if (value > alpha) alpha = value;
                if (alpha >= beta) break;
            }
        }

        return {
            score: bestValue,
            move: bestMove
        };
    }

    function quiesce(game, alpha, beta, depth) {
        const standPat = evaluateAdvancedPosition(game);
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
        
        if (depth <= 0) return standPat;
        
        const captures = game.moves({
            verbose: true,
            filter: m => m.captured || m.promotion || game.in_check()
        });
        
        for (const move of captures) {
            game.move(move);
            const score = -quiesce(game, -beta, -alpha, depth - 1);
            game.undo();
            
            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }
        
        return alpha;
    }

    // Поиск мата в 1-2 хода
    function findMateInTwo(game) {
        // Проверка мата в 1 ход
        const moves = game.moves({verbose: true});
        for (const move of moves) {
            game.move(move);
            if (game.in_checkmate()) {
                game.undo();
                return move;
            }
            game.undo();
        }

        // Поиск форсированного мата в 2 хода
        for (const ourMove of moves) {
            game.move(ourMove);
            let isForcedMate = true;
            const opponentMoves = game.moves({verbose: true});
            
            for (const opponentMove of opponentMoves) {
                game.move(opponentMove);
                const canEscape = game.moves().some(() => true);
                game.undo();
                
                if (canEscape) {
                    isForcedMate = false;
                    break;
                }
            }
            
            game.undo();
            if (isForcedMate && opponentMoves.length > 0) {
                return ourMove;
            }
        }
        
        return null;
    }

    // Улучшенная оценка позиции для Expert
    function evaluateAdvancedPosition(game) {
        if (game.in_checkmate()) {
            return game.turn() === aiColor[0] ? -100000 : 100000;
        }
        
        if (game.in_draw()) {
            return 0;
        }

        // Материальный баланс
        let score = evaluateMaterial(game);
        
        // Позиционные факторы
        score += evaluateKingSafety(game) * 1.5;
        score += evaluatePawnStructure(game);
        score += evaluatePieceActivity(game) * 0.7;
        score += evaluateSpaceControl(game);
        score += evaluateThreats(game);
        
        return game.turn() === aiColor[0] ? score : -score;
    }

    function evaluateMaterial(game) {
        const pieceValues = {
            p: 100, n: 320, b: 330, r: 500, q: 900, k: 0
        };
        let score = 0;
        const board = game.board();
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (board[i][j]) {
                    const piece = board[i][j];
                    const value = pieceValues[piece.type.toLowerCase()];
                    score += piece.color === aiColor[0] ? value : -value;
                }
            }
        }
        
        return score;
    }

    function evaluateKingSafety(game) {
        const kingSquare = findKingSquare(game, game.turn());
        if (!kingSquare) return 0;
        
        let safety = 0;
        
        // Штраф за открытого короля
        if (isOpenFile(game, kingSquare.file)) safety -= 30;
        
        // Бонус за пешечное прикрытие
        safety += countPawnShield(game, kingSquare) * 15;
        
        // Штраф за атаки на короля
        safety -= countAttacksOnSquare(game, kingSquare) * 20;
        
        return safety;
    }

    function evaluatePawnStructure(game) {
        let score = 0;
        const board = game.board();
        
        // Изолированные пешки
        for (let file = 0; file < 8; file++) {
            for (let rank = 0; rank < 8; rank++) {
                const piece = board[rank][file];
                if (piece && piece.type === 'p') {
                    if (isIsolatedPawn(game, piece.color, file)) {
                        score += piece.color === aiColor[0] ? -15 : 15;
                    }
                }
            }
        }
        
        return score;
    }

    function evaluatePieceActivity(game) {
        let activity = 0;
        const moves = game.moves({verbose: true});
        activity += moves.length * 0.5;
        
        // Бонус за фигуры в центре
        const centerSquares = ['d4', 'e4', 'd5', 'e5'];
        for (const square of centerSquares) {
            const piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                activity += 10;
            }
        }
        
        return activity;
    }

    function evaluateSpaceControl(game) {
        let control = 0;
        const board = game.board();
        
        for (let i = 2; i < 6; i++) { // Центральные ряды
            for (let j = 2; j < 6; j++) { // Центральные файлы
                if (board[i][j]) {
                    const piece = board[i][j];
                    control += piece.color === aiColor[0] ? 1 : -1;
                }
            }
        }
        
        return control * 5;
    }

    function evaluateThreats(game) {
        let threats = 0;
        const moves = game.moves({verbose: true});
        
        for (const move of moves) {
            if (move.captured) threats += 10;
            if (move.promotion) threats += 30;
            if (game.in_check()) threats += 15;
        }
        
        return threats;
    }

    // Вспомогательные функции
    function findKingSquare(game, color) {
        const board = game.board();
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return {
                        rank: 8 - i,
                        file: String.fromCharCode(97 + j),
                        square: String.fromCharCode(97 + j) + (8 - i)
                    };
                }
            }
        }
        return null;
    }

    function isOpenFile(game, file) {
        for (let rank = 1; rank <= 8; rank++) {
            const square = file + rank;
            const piece = game.get(square);
            if (piece && piece.type === 'p') {
                return false;
            }
        }
        return true;
    }

    function countPawnShield(game, kingSquare) {
        let count = 0;
        const fileIndex = kingSquare.file.charCodeAt(0) - 97;
        
        for (let f = Math.max(0, fileIndex - 1); f <= Math.min(7, fileIndex + 1); f++) {
            for (let r = Math.max(1, kingSquare.rank - 1); r <= Math.min(8, kingSquare.rank + 1); r++) {
                const piece = game.get(String.fromCharCode(97 + f) + r);
                if (piece && piece.type === 'p' && piece.color === game.turn()) {
                    count++;
                }
            }
        }
        
        return count;
    }

    function countAttacksOnSquare(game, square) {
        const opponentColor = game.turn() === 'w' ? 'b' : 'w';
        let attackCount = 0;
        
        const moves = game.moves({
            verbose: true,
            legal: false // Чтобы увидеть все возможные атаки
        });
        
        for (const move of moves) {
            if (move.to === square.square && 
                game.get(move.from).color === opponentColor) {
                attackCount++;
            }
        }
        
        return attackCount;
    }

    function isIsolatedPawn(game, color, file) {
        for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
            if (f === file) continue;
            
            for (let r = 0; r < 8; r++) {
                const piece = game.board()[r][f];
                if (piece && piece.type === 'p' && piece.color === color) {
                    return false;
                }
            }
        }
        return true;
    }

    function evaluateMovePotential(game, move) {
        let score = 0;
        
        if (move.captured) score += getPieceValue(move.captured) * 2;
        if (move.promotion) score += 800;
        if (game.in_check()) score += 50;
        
        game.move(move);
        score += evaluateAdvancedPosition(game) / 10;
        game.undo();
        
        return score;
    }

    function getPieceValue(pieceType) {
        const values = {
            'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 0
        };
        return values[pieceType.toLowerCase()] || 0;
    }

    // Остальные функции (undoMove, updateGameStatus и т.д.) остаются без изменений
    function undoMove() {
        if (moveHistory.length < 2 || aiThinking) return;
        
        moveHistory.pop();
        const prevFen = moveHistory.pop();
        
        game.load(prevFen);
        board.position(prevFen);
        moveHistory.push(prevFen);
        updateGameStatus();
        updateMoveHistory();
    }

    function updateGameStatus() {
        let status = '';
        const moveColor = game.turn() === 'w' ? 'White' : 'Black';

        if (game.in_checkmate()) {
            status = `Game over, ${moveColor} is checkmated!`;
        } else if (game.in_draw()) {
            status = 'Game over, drawn position';
        } else {
            status = `${moveColor} to move`;
            if (game.in_check()) {
                status += ` (${moveColor} is in check)`;
            }
            if (aiThinking) {
                status += ' - AI thinking...';
            }
        }

        document.getElementById('gameStatus').textContent = status;
    }

    function updateMoveHistory() {
        const historyElement = document.getElementById('moveHistory');
        historyElement.innerHTML = '';

        game.history({verbose: true}).forEach((move, i) => {
            const moveEntry = document.createElement('div');
            moveEntry.className = 'move-entry';
            
            let moveText = `${Math.floor(i/2) + 1}. ${move.from}-${move.to}`;
            if (move.promotion) moveText += `=${move.promotion}`;
            if (move.captured) moveText += ` (x${move.captured})`;
            
            moveEntry.textContent = moveText;
            historyElement.appendChild(moveEntry);
        });

        historyElement.scrollTop = historyElement.scrollHeight;
    }

    // Обработчики событий
    document.getElementById('newGameBtn').addEventListener('click', initGame);
    document.getElementById('flipBoardBtn').addEventListener('click', function() {
        board.flip();
    });
    document.getElementById('undoBtn').addEventListener('click', undoMove);
    document.getElementById('colorSelect').addEventListener('change', function() {
        if (!aiThinking && moveHistory.length <= 1) {
            initGame();
        }
    });
    document.getElementById('aiLevel').addEventListener('change', function() {
        if (!aiThinking && moveHistory.length <= 1) {
            initGame();
        }
    });

    // Функция оценки для Medium/Hard (осталась без изменений)
    function evaluateBoard(game, depth) {
        if (game.in_checkmate()) {
            return game.turn() === aiColor[0] ? -10000 : 10000;
        }
        if (game.in_draw()) {
            return 0;
        }

        const pieceValues = {
            p: 100, n: 320, b: 330, r: 500, q: 900, k: 0
        };

        let score = 0;
        const boardState = game.board();
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (boardState[i][j]) {
                    const piece = boardState[i][j];
                    const value = pieceValues[piece.type.toLowerCase()];
                    score += piece.color === aiColor[0] ? value : -value;
                }
            }
        }

        if (game.in_check()) {
            score += game.turn() === aiColor[0] ? -50 : 50;
        }
        
        return score;
    }

    function minimax(game, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || game.game_over()) {
            return evaluateBoard(game, depth);
        }

        const moves = game.moves({verbose: true});
        if (moves.length === 0) return evaluateBoard(game, depth);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let i = 0; i < moves.length; i++) {
                game.move(moves[i]);
                const eval = minimax(game, depth - 1, alpha, beta, false);
                game.undo();
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let i = 0; i < moves.length; i++) {
                game.move(moves[i]);
                const eval = minimax(game, depth - 1, alpha, beta, true);
                game.undo();
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }
});
