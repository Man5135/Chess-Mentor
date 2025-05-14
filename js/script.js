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
        const moves = game.moves({verbose: true});
        if (moves.length === 0) return null;

        // Специальная обработка для экспертного уровня
        if (depth === 4) {
            const quickMate = findQuickMate(game);
            if (quickMate) return quickMate;

            const materialWin = findMaterialWin(game);
            if (materialWin) return materialWin;

            return deepQuiescenceSearch(game, 4);
        }

        // Стандартный алгоритм для других уровней
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

    function findQuickMate(game) {
        const moves = game.moves({verbose: true});
        for (const move of moves) {
            game.move(move);
            if (game.in_checkmate()) {
                game.undo();
                return move;
            }
            game.undo();
        }
        return null;
    }

    function findMaterialWin(game) {
        const moves = game.moves({verbose: true});
        let bestCapture = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            if (move.captured) {
                const capturedValue = getPieceValue(move.captured);
                game.move(move);
                
                if (!isPositionDangerous(game)) {
                    if (capturedValue > bestScore) {
                        bestScore = capturedValue;
                        bestCapture = move;
                    }
                }
                
                game.undo();
            }
        }
        
        return bestCapture;
    }

    function deepQuiescenceSearch(game, depth) {
        const moves = game.moves({verbose: true});
        if (moves.length === 0) return null;

        moves.sort((a, b) => {
            const aScore = evaluateMovePotential(game, a);
            const bScore = evaluateMovePotential(game, b);
            return bScore - aScore;
        });

        let bestMove = moves[0];
        let bestValue = -Infinity;
        
        const topMoves = moves.slice(0, 5);
        
        for (const move of topMoves) {
            game.move(move);
            const value = -quiesce(game, -Infinity, Infinity, depth - 1);
            game.undo();
            
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        
        return bestMove;
    }

    function quiesce(game, alpha, beta, depth) {
        const standPat = evaluateBoard(game, depth);
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
        
        if (depth <= 0) return standPat;
        
        const captures = game.moves({
            verbose: true,
            filter: m => m.captured || m.promotion
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

    function evaluateMovePotential(game, move) {
        let score = 0;
        
        if (move.captured) score += getPieceValue(move.captured) * 2;
        if (move.promotion) score += 800;
        if (game.in_check()) score += 50;
        
        game.move(move);
        score += evaluateBoard(game, 0) / 10;
        game.undo();
        
        return score;
    }

    function isPositionDangerous(game) {
        const opponentMoves = game.moves({verbose: true});
        for (const move of opponentMoves) {
            game.move(move);
            if (game.in_checkmate()) {
                game.undo();
                return true;
            }
            game.undo();
        }
        
        const currentEval = evaluateBoard(game, 0);
        if (currentEval < -500) return true;
        
        return false;
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

    function evaluateBoard(game, depth) {
        if (game.in_checkmate()) {
            return game.turn() === aiColor[0] ? -100000 : 100000;
        }
        
        if (game.in_draw()) {
            return 0;
        }

        const pieceValues = {
            p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
        };

        let score = 0;
        const boardState = game.board();
        
        // Материальная оценка
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (boardState[i][j]) {
                    const piece = boardState[i][j];
                    const value = pieceValues[piece.type.toLowerCase()];
                    const sign = piece.color === aiColor[0] ? 1 : -1;
                    score += value * sign;
                }
            }
        }

        // Дополнительные критерии для экспертного уровня
        if (depth === 4) {
            // Безопасность короля
            score += evaluateKingSafety(game);
            
            // Активность фигур
            score += evaluatePieceActivity(game);
            
            // Контроль центра
            score += evaluateCenterControl(game) * 15;
        }

        // Общие критерии для всех уровней
        if (game.in_check()) {
            score += game.turn() === aiColor[0] ? -50 : 50;
        }
        
        // Мобильность
        const mobility = game.moves().length;
        score += game.turn() === aiColor[0] ? mobility * 0.5 : -mobility * 0.5;

        return score;
    }

    function evaluateKingSafety(game) {
        const kingSquare = game.board().flat().find(sq => sq && sq.type === 'k' && sq.color === game.turn());
        if (!kingSquare) return 0;
        
        let safety = 0;
        const square = Object.keys(game.board()).find(key => 
            game.board()[key] === kingSquare
        );
        
        if (isOpenFile(game, square[0])) safety -= 30;
        
        safety += countPawnShield(game, square) * 15;
        
        return game.turn() === aiColor[0] ? safety : -safety;
    }

    function evaluatePieceActivity(game) {
        let activity = 0;
        const board = game.board();
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const piece = board[i][j];
                if (piece && piece.color === game.turn()) {
                    const moves = game.moves({
                        square: String.fromCharCode(97 + j) + (8 - i),
                        verbose: true
                    }).length;
                    activity += moves * 2;
                }
            }
        }
        
        return game.turn() === aiColor[0] ? activity : -activity;
    }

    function evaluateCenterControl(game) {
        const centerSquares = ['e4', 'd4', 'e5', 'd5'];
        let control = 0;
        
        for (const square of centerSquares) {
            const attackedByAI = game.moves({square: square, verbose: true})
                .some(move => move.color === aiColor[0]);
            const attackedByPlayer = game.moves({square: square, verbose: true})
                .some(move => move.color === playerColor[0]);
                
            if (attackedByAI) control++;
            if (attackedByPlayer) control--;
        }
        
        return control;
    }

    function isOpenFile(game, file) {
        for (let rank = 0; rank < 8; rank++) {
            const piece = game.get(String.fromCharCode(97 + file) + (rank + 1));
            if (piece && piece.type === 'p') {
                return false;
            }
        }
        return true;
    }

    function countPawnShield(game, square) {
        const file = square.charCodeAt(0) - 97;
        const rank = parseInt(square[1]);
        let count = 0;
        
        for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
            for (let r = Math.max(1, rank - 1); r <= Math.min(7, rank + 1); r++) {
                const piece = game.get(String.fromCharCode(97 + f) + r);
                if (piece && piece.type === 'p' && piece.color === game.turn()) {
                    count++;
                }
            }
        }
        
        return count;
    }

    function getPieceValue(pieceType) {
        const values = {
            'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 0
        };
        return values[pieceType.toLowerCase()] || 0;
    }

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
});
