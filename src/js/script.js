document.addEventListener('DOMContentLoaded', function() {
    // Инициализация игры
    const game = new Chess();
    const board = Chessboard('board', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: './wikipedia/{piece}.png'
    });

    // Настройки игры
    const moveHistory = [game.fen()];
    let aiThinking = false;
    let playerColor = 'white';
    let aiColor = 'black';
    let hintActive = false;
    let currentHighlights = [];
    let gameHeaders = {
        Event: "Chess with AI",
        Site: "localhost",
        Date: new Date().toISOString().split('T')[0],
        Round: "1",
        White: "Player",
        Black: "AI",
        Result: "*"
    };

    // Инициализация звуков
    const sounds = {
        move: document.getElementById('moveSound'),
        capture: document.getElementById('captureSound'),
        check: document.getElementById('checkSound'),
        win: document.getElementById('winSound'),
        lose: document.getElementById('loseSound')
    };

    // Функция для копирования PGN в буфер обмена
    function copyPgnToClipboard() {
        updateGameHeaders();
        
        let pgn = '';
        
        // Добавляем заголовки
        for (const [key, value] of Object.entries(gameHeaders)) {
            pgn += `[${key} "${value}"]\n`;
        }
        
        // Добавляем ходы
        pgn += '\n' + game.pgn() + '\n';
        
        // Копируем в буфер обмена
        navigator.clipboard.writeText(pgn)
            .then(() => {
                showNotification('PGN скопировано в буфер обмена!');
            })
            .catch(err => {
                console.error('Ошибка копирования: ', err);
                showNotification('Ошибка копирования', true);
            });
    }

    // Показать уведомление
    function showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `copy-notification ${isError ? 'error' : ''}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 2000);
    }

    // Обновляем заголовки игры
    function updateGameHeaders() {
        gameHeaders.White = playerColor === 'white' ? "Player" : "AI";
        gameHeaders.Black = playerColor === 'black' ? "Player" : "AI";
        gameHeaders.Date = new Date().toISOString().split('T')[0];
        
        if (game.in_checkmate()) {
            gameHeaders.Result = game.turn() === 'w' ? "0-1" : "1-0";
        } else if (game.in_draw()) {
            gameHeaders.Result = "1/2-1/2";
        } else {
            gameHeaders.Result = "*";
        }
    }

    // Проверка наличия сохраненной игры в Local Storage
    function loadGameFromStorage() {
        const savedGame = localStorage.getItem('chessGame');
        if (savedGame) {
            try {
                const gameData = JSON.parse(savedGame);
                game.load(gameData.fen);
                board.position(gameData.fen);
                playerColor = gameData.playerColor;
                aiColor = gameData.aiColor;
                document.getElementById('colorSelect').value = playerColor;
                document.getElementById('aiLevel').value = gameData.aiLevel;
                moveHistory.length = 0;
                moveHistory.push(game.fen());
                
                if (gameData.history) {
                    game.load_pgn(gameData.pgn);
                    updateMoveHistory();
                }
                
                updateGameStatus();
                return true;
            } catch (e) {
                console.error("Ошибка загрузки игры из хранилища:", e);
                localStorage.removeItem('chessGame');
            }
        }
        return false;
    }

    // Сохранение игры в Local Storage
    function saveGameToStorage() {
        updateGameHeaders();
        const gameData = {
            fen: game.fen(),
            pgn: game.pgn(),
            playerColor: playerColor,
            aiColor: aiColor,
            aiLevel: parseInt(document.getElementById('aiLevel').value),
            history: game.history({verbose: true})
        };
        localStorage.setItem('chessGame', JSON.stringify(gameData));
    }

    // Инициализация игры
    function initGame(forceNew = false) {
        if (!forceNew && loadGameFromStorage()) {
            return;
        }
        
        playerColor = document.getElementById('colorSelect').value;
        aiColor = playerColor === 'white' ? 'black' : 'white';
        updateGameHeaders();
        
        game.reset();
        board.start();
        moveHistory.length = 0;
        moveHistory.push(game.fen());
        
        updateGameStatus();
        document.getElementById('moveHistory').innerHTML = '';
        document.getElementById('hintText').innerHTML = '';
        clearHighlights();
        hintActive = false;
        
        saveGameToStorage();
        
        if (playerColor === 'black') {
            aiThinking = true;
            setTimeout(makeAiMove, 100);
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
        clearHighlights();
        hintActive = false;
        document.getElementById('hintText').innerHTML = '';
        
        if (aiThinking) return 'snapback';

        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        if (move.captured) {
            playSound('capture');
        } else {
            playSound('move');
        }

        moveHistory.push(game.fen());
        updateGameStatus();
        updateMoveHistory();
        saveGameToStorage();
        
        if (!game.game_over()) {
            aiThinking = true;
            setTimeout(makeAiMove, 200);
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
            
            if (move.captured) {
                playSound('capture');
            } else {
                playSound('move');
            }
            
            moveHistory.push(game.fen());
            board.position(game.fen());
            updateGameStatus();
            updateMoveHistory();
            saveGameToStorage();
        }
        
        aiThinking = false;
    }

    // Поиск лучшего хода
    function findBestMove(game, depth) {
        const moves = game.moves({verbose: true});
        if (moves.length === 0) return null;

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

    const bishopTable = [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ];

    const rookTable = [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0
    ];

    const queenTable = [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ];

    const kingMidgameTable = [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
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
                    
                    switch (piece.type.toLowerCase()) {
                        case 'p': score += pawnTable[idx] * sign; break;
                        case 'n': score += knightTable[idx] * sign; break;
                        case 'b': score += bishopTable[idx] * sign; break;
                        case 'r': score += rookTable[idx] * sign; break;
                        case 'q': score += queenTable[idx] * sign; break;
                        case 'k': score += kingMidgameTable[idx] * sign; break;
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
        
        clearHighlights();
        hintActive = false;
        document.getElementById('hintText').innerHTML = '';
        
        moveHistory.pop();
        const prevFen = moveHistory.pop();
        
        game.load(prevFen);
        board.position(prevFen);
        moveHistory.push(prevFen);
        updateGameStatus();
        updateMoveHistory();
        saveGameToStorage();
    }

    // Обновление статуса игры
    function updateGameStatus() {
        let status = '';
        const moveColor = game.turn() === 'w' ? 'White' : 'Black';

        if (game.in_checkmate()) {
            status = `Игра закончена, ${moveColor} поставлен шах и мат!`;
            if (moveColor === playerColor) {
                playSound('lose');
            } else {
                playSound('win');
            }
        } else if (game.in_draw()) {
            status = 'Игра закончена, ничья!';
        } else {
            status = `${moveColor} ходят`;
            if (game.in_check()) {
                status += ` (${moveColor} is in check)`;
                playSound('check');
            }
            if (aiThinking) {
                status += ' - Соперник думает...';
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

    // Получение подсказки от AI-тренера
    function getBestHint() {
        const tempGame = new Chess(game.fen());
        const moves = tempGame.moves({verbose: true});
        
        if (moves.length === 0) {
            return {
                bestMove: null,
                explanation: "No legal moves available."
            };
        }
        
        const evaluatedMoves = moves.map(move => {
            tempGame.move(move);
            const score = evaluateBoard(tempGame);
            tempGame.undo();
            return {move, score};
        });
        
        evaluatedMoves.sort((a, b) => {
            return game.turn() === aiColor[0] ? b.score - a.score : a.score - b.score;
        });
        
        const bestMove = evaluatedMoves[0].move;
        const scoreDiff = evaluatedMoves[0].score - evaluateBoard(game);
        
        let explanation = "";
        if (bestMove.captured) {
            explanation = `Захват ${bestMove.captured} - лучший ход. `;
        } else if (bestMove.promotion) {
            explanation = `Рекомендуется превращение в ${bestMove.promotion}. `;
        } else if (bestMove.san.includes('O-O')) {
            explanation = `Рокировка - хорошая идея для улучшения безопасности короля. `;
        } else {
            explanation = `Этот ход улучшает вашу позицию. `;
        }

        if (scoreDiff > 150) {
            explanation += "Это дает вам решающее преимущество!";
        } else if (scoreDiff > 50) {
            explanation += "Это отличный ход, значительно улучшающий вашу позицию.";
        } else if (scoreDiff > 10) {
            explanation += "Это хороший ход, дающий вам преимущество.";
        } else if (scoreDiff > -10) {
            explanation += "Это надежный ход, сохраняющий равновесие.";
        } else {
            explanation += "Это лучший возможный ход в сложной позиции.";
        }
        
        return {
            bestMove,
            explanation,
            scoreDiff
        };
    }

    // Показ подсказки
    function showHint(hint) {
        const hintTextElement = document.getElementById('hintText');
        
        if (!hint.bestMove) {
            hintTextElement.innerHTML = hint.explanation;
            return;
        }
        
        clearHighlights();
        highlightSquare(hint.bestMove.from, 'from');
        highlightSquare(hint.bestMove.to, 'to');
        
        const moveNotation = game.turn() === 'w' ? 
            `${game.history().length / 2 + 1}. ${hint.bestMove.piece.toUpperCase()}${hint.bestMove.from}-${hint.bestMove.to}` :
            `${Math.ceil(game.history().length / 2)}... ${hint.bestMove.piece.toUpperCase()}${hint.bestMove.from}-${hint.bestMove.to}`;
        
        hintTextElement.innerHTML = `
            <div class="hint-move">Рекомендованный ход: ${moveNotation}</div>
            <div class="hint-explanation">${hint.explanation}</div>
        `;
    }

    // Подсветка квадратов
    function highlightSquare(square, type) {
        const $square = $(`#board .square-${square}`);
        const highlight = document.createElement('div');
        highlight.className = `board-highlight ${type}-highlight`;
        highlight.style.left = $square.position().left + 5 + 'px';
        highlight.style.top = $square.position().top + 5 + 'px';
        document.getElementById('board').appendChild(highlight);
        currentHighlights.push(highlight);
    }

    // Очистка подсветки
    function clearHighlights() {
        currentHighlights.forEach(highlight => {
            highlight.remove();
        });
        currentHighlights = [];
    }

    // Функция для воспроизведения звука
    function playSound(sound) {
        if (sounds[sound]) {
            sounds[sound].currentTime = 0;
            sounds[sound].play().catch(e => console.log("Sound play error:", e));
        }
    }

    // Event listeners
    document.getElementById('newGameBtn').addEventListener('click', function() {
        initGame(true);
    });
    
    document.getElementById('flipBoardBtn').addEventListener('click', function() {
        board.flip();
    });
    
    document.getElementById('undoBtn').addEventListener('click', undoMove);
    
    document.getElementById('hintBtn').addEventListener('click', function() {
        if (aiThinking || game.game_over()) return;
        
        if (hintActive) {
            clearHighlights();
            hintActive = false;
            document.getElementById('hintText').innerHTML = '';
            return;
        }
        
        const hint = getBestHint();
        showHint(hint);
        hintActive = true;
    });
    
    document.getElementById('colorSelect').addEventListener('change', function() {
        if (!aiThinking && moveHistory.length <= 1) {
            initGame(true);
        }
    });
    
    document.getElementById('aiLevel').addEventListener('change', function() {
        if (!aiThinking && moveHistory.length <= 1) {
            initGame(true);
        }
    });

    document.getElementById('savePgnBtn').addEventListener('click', copyPgnToClipboard);

    initGame();
});

// Экспортируем функции для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        evaluateBoard,
        findBestMove,
        minimax,
        countCenterControl,
    };
}