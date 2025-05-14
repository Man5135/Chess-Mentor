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

    // Функция инициализации новой игры
    function initGame() {
        playerColor = document.getElementById('colorSelect').value;
        aiColor = playerColor === 'white' ? 'black' : 'white';
        
        game.reset();
        board.start();
        moveHistory.length = 0;
        moveHistory.push(game.fen());
        
        updateGameStatus();
        document.getElementById('moveHistory').innerHTML = '';
        
        // Если играем черными, ИИ ходит первым
        if (playerColor === 'black') {
            aiThinking = true;
            setTimeout(makeAiMove, 500);
        }
    }

    // Проверка перед началом перемещения фигуры
    function onDragStart(source, piece) {
        return !aiThinking && 
               !game.game_over() && 
               ((playerColor === 'white' && piece[0] === 'w') || 
                (playerColor === 'black' && piece[0] === 'b'));
    }

    // Обработка хода игрока
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
        
        // Ход ИИ после задержки
        if (!game.game_over()) {
            aiThinking = true;
            setTimeout(makeAiMove, 300);
        }
    }

    // После завершения анимации перемещения
    function onSnapEnd() {
        board.position(game.fen());
    }

    // Ход ИИ
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

    // Поиск лучшего хода (Minimax с альфа-бета отсечением)
    function findBestMove(game, depth) {
        const moves = game.moves({verbose: true});
        if (moves.length === 0) return null;

        // Сортировка ходов для лучшего альфа-бета отсечения
        moves.sort((a, b) => {
            game.move(a);
            const aScore = evaluateBoard(game);
            game.undo();
            
            game.move(b);
            const bScore = evaluateBoard(game);
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

    // Алгоритм Minimax
    function minimax(game, depth, alpha, beta, isMaximizing) {
        if (depth === 0 || game.game_over()) {
            return evaluateBoard(game);
        }

        const moves = game.moves({verbose: true});
        if (moves.length === 0) return evaluateBoard(game);

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

    // Позиционные таблицы для оценки
    const pawnTable = [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    ];

    const knightTable = [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ];

    // Оценка позиции
    function evaluateBoard(game) {
        if (game.in_checkmate()) {
            return game.turn() === aiColor[0] ? -10000 : 10000;
        }
        
        if (game.in_draw()) {
            return 0;
        }

        const pieceValues = {
            p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000
        };

        let score = 0;
        const boardState = game.board();
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (boardState[i][j]) {
                    const piece = boardState[i][j];
                    const value = pieceValues[piece.type.toLowerCase()];
                    const sign = piece.color === aiColor[0] ? 1 : -1;
                    
                    score += value * sign;
                    
                    const idx = piece.color === 'w' ? i * 8 + j : (7 - i) * 8 + j;
                    
                    if (piece.type === 'p') {
                        score += pawnTable[idx] * sign;
                    }
                    else if (piece.type === 'n') {
                        score += knightTable[idx] * sign;
                    }
                }
            }
        }

        if (game.in_check()) {
            score += game.turn() === aiColor[0] ? -50 : 50;
        }
        
        const mobility = game.moves().length;
        score += game.turn() === aiColor[0] ? mobility : -mobility;
        
        score += countCenterControl(game) * 10;

        return score;
    }

    // Контроль центра
    function countCenterControl(game) {
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

    // Отмена хода
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

    // Обновление статуса игры
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

    // Обновление истории ходов
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
