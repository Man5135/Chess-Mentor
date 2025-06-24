document.addEventListener('DOMContentLoaded', function() {
    const board = Chessboard('board', {
        draggable: false,
        position: 'start',
        pieceTheme: './wikipedia/{piece}.png'
    });
    
    const game = new Chess();
    let currentMoveIndex = 0;
    let moves = [];
    let currentHighlights = [];
    
    // DOM elements
    const pgnInput = document.getElementById('pgnInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const prevMoveBtn = document.getElementById('prevMoveBtn');
    const nextMoveBtn = document.getElementById('nextMoveBtn');
    const firstMoveBtn = document.getElementById('firstMoveBtn');
    const lastMoveBtn = document.getElementById('lastMoveBtn');
    const gameStatus = document.getElementById('gameStatus');
    const moveHistory = document.getElementById('moveHistory');
    const analysisText = document.getElementById('analysisText');
    const moveCounter = document.getElementById('moveCounter');
    
    // Initialize
    updateButtons();
    
    // Event listeners
    analyzeBtn.addEventListener('click', analyzeGame);
    clearBtn.addEventListener('click', clearAnalysis);
    prevMoveBtn.addEventListener('click', prevMove);
    nextMoveBtn.addEventListener('click', nextMove);
    firstMoveBtn.addEventListener('click', firstMove);
    lastMoveBtn.addEventListener('click', lastMove);
    
    // Analyze PGN game
    function analyzeGame() {
        const pgn = pgnInput.value.trim();
        if (!pgn) return;
        
        try {
            game.load_pgn(pgn);
            moves = game.history({verbose: true});
            currentMoveIndex = 0;
            
            game.reset();
            board.position('start');
            
            updateGameInfo();
            updateMoveCounter();
            updateButtons();
            analyzeCurrentPosition();
        } catch (e) {
            alert("Invalid PGN format. Please check your game notation.");
            console.error(e);
        }
    }
    
    function clearAnalysis() {
        pgnInput.value = '';
        game.reset();
        board.position('start');
        moves = [];
        currentMoveIndex = 0;
        
        gameStatus.textContent = 'Load a game to analyze';
        moveHistory.innerHTML = '';
        analysisText.innerHTML = '';
        moveCounter.textContent = '';
        clearHighlights();
        updateButtons();
    }
    
    function prevMove() {
        if (currentMoveIndex <= 0) return;
        
        game.undo();
        currentMoveIndex--;
        
        updateBoard();
        analyzeCurrentPosition();
        updateButtons();
    }
    
    function nextMove() {
        if (currentMoveIndex >= moves.length) return;
        
        game.move(moves[currentMoveIndex]);
        currentMoveIndex++;
        
        updateBoard();
        analyzeCurrentPosition();
        updateButtons();
    }
    
    function firstMove() {
        if (moves.length === 0) return;
        
        game.reset();
        board.position('start');
        currentMoveIndex = 0;
        
        updateBoard();
        analyzeCurrentPosition();
        updateButtons();
    }
    
    function lastMove() {
        if (moves.length === 0) return;
        
        game.reset();
        currentMoveIndex = 0;
        
        while (currentMoveIndex < moves.length) {
            game.move(moves[currentMoveIndex]);
            currentMoveIndex++;
        }
        
        updateBoard();
        analyzeCurrentPosition();
        updateButtons();
    }
    
    function updateBoard() {
        board.position(game.fen());
        updateGameInfo();
        updateMoveCounter();
    }
    
    function updateGameInfo() {
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
        }
        
        gameStatus.textContent = status;
        updateMoveHistory();
    }
    
    function updateMoveCounter() {
        if (moves.length > 0) {
            moveCounter.textContent = `Move ${currentMoveIndex} of ${moves.length}`;
        } else {
            moveCounter.textContent = '';
        }
    }
    
    function updateMoveHistory() {
        moveHistory.innerHTML = '';
        
        const movePairs = [];
        for (let i = 0; i < moves.length; i += 2) {
            const whiteMove = moves[i];
            const blackMove = i + 1 < moves.length ? moves[i + 1] : null;
            movePairs.push({white: whiteMove, black: blackMove});
        }
        
        movePairs.forEach((pair, index) => {
            const moveEntry = document.createElement('div');
            moveEntry.className = 'move-entry';
            
            let moveText = `${index + 1}. ${formatMove(pair.white)}`;
            if (pair.black) {
                moveText += ` ${formatMove(pair.black)}`;
            }
            
            if (currentMoveIndex > index * 2 || 
                (pair.black && currentMoveIndex > index * 2 + 1)) {
                moveEntry.classList.add('played-move');
            }
            
            if (currentMoveIndex === index * 2 || 
                (pair.black && currentMoveIndex === index * 2 + 1)) {
                moveEntry.classList.add('current-move');
            }
            
            moveEntry.textContent = moveText;
            moveHistory.appendChild(moveEntry);
        });
        
        moveHistory.scrollTop = moveHistory.scrollHeight;
    }
    
    function formatMove(move) {
        let moveText = `${move.piece.toUpperCase()}${move.from}-${move.to}`;
        if (move.promotion) moveText += `=${move.promotion}`;
        if (move.captured) moveText += ` (x${move.captured})`;
        return moveText;
    }
    
    function analyzeCurrentPosition() {
        clearHighlights();
        analysisText.innerHTML = '';
        
        if (moves.length === 0) {
            analysisText.innerHTML = 'No moves to analyze. Load a game first.';
            return;
        }
        
        if (currentMoveIndex >= moves.length) {
            analyzeGameEnd();
            return;
        }
        
        const currentMove = moves[currentMoveIndex];
        const bestMove = findBestMove(game, 3); // Depth 3 for quick analysis
        
        highlightSquare(currentMove.from, 'from');
        highlightSquare(currentMove.to, 'to');
        
        if (bestMove) {
            highlightSquare(bestMove.from, 'best-from');
            highlightSquare(bestMove.to, 'best-to');
        }
        
        const moveAnalysis = getMoveAnalysis(currentMove, bestMove);
        displayAnalysis(currentMove, bestMove, moveAnalysis);
    }
    
    function analyzeGameEnd() {
        if (game.in_checkmate()) {
            analysisText.innerHTML = `
                <div class="game-result">Checkmate! ${game.turn() === 'w' ? 'Black wins' : 'White wins'}</div>
                <div class="analysis-detail">Analyze the moves leading to this position.</div>
            `;
        } else if (game.in_draw()) {
            analysisText.innerHTML = `
                <div class="game-result">Draw!</div>
                <div class="analysis-detail">Possible reasons: stalemate, threefold repetition, or insufficient material.</div>
            `;
        } else {
            analysisText.innerHTML = 'Game end reached.';
        }
    }
    
    function getMoveAnalysis(move, bestMove) {
        const analysis = {
            moveQuality: '',
            bestMove: bestMove,
            mistakes: [],
            improvements: []
        };
        
        // Evaluate the played move
        const tempGame = new Chess(game.fen());
        tempGame.move(move);
        const moveScore = evaluateBoard(tempGame);
        
        // Evaluate the best move
        let bestScore = -Infinity;
        if (bestMove) {
            tempGame.undo();
            tempGame.move(bestMove);
            bestScore = evaluateBoard(tempGame);
        }
        
        const scoreDiff = bestScore - moveScore;
        
        // Determine move quality
        if (scoreDiff > 200) {
            analysis.moveQuality = 'Blunder';
            analysis.mistakes.push(`Lost advantage (${Math.round(scoreDiff/100)} pawns)`);
        } else if (scoreDiff > 100) {
            analysis.moveQuality = 'Mistake';
            analysis.mistakes.push(`Missed opportunity (${Math.round(scoreDiff/100)} pawns)`);
        } else if (scoreDiff > 50) {
            analysis.moveQuality = 'Inaccuracy';
            analysis.mistakes.push(`Suboptimal move (${Math.round(scoreDiff/100)} pawns)`);
        } else if (scoreDiff > 10) {
            analysis.moveQuality = 'Good move';
        } else {
            analysis.moveQuality = 'Excellent move';
        }
        
        // Specific move analysis
        if (move.captured) {
            analysis.improvements.push(`Captured ${move.captured}`);
        } else if (move.promotion) {
            analysis.improvements.push(`Promoted to ${move.promotion}`);
        } else if (move.san.includes('O-O')) {
            analysis.improvements.push('Castled for king safety');
        }
        
        // Check for missed opportunities
        if (bestMove) {
            if (bestMove.captured && !move.captured) {
                analysis.mistakes.push(`Missed chance to capture ${bestMove.captured}`);
            }
            
            if (bestMove.san.includes('O-O') && !move.san.includes('O-O')) {
                analysis.mistakes.push('Missed better castling opportunity');
            }
        }
        
        return analysis;
    }
    
    function displayAnalysis(move, bestMove, analysis) {
        const moveColor = currentMoveIndex % 2 === 0 ? 'White' : 'Black';
        const moveNotation = `${Math.floor(currentMoveIndex/2) + 1}. ${moveColor === 'White' ? '' : '...'} ${formatMove(move)}`;
        
        let html = `
            <div class="move-header">
                <span class="move-notation">${moveNotation}</span>
                <span class="move-quality ${analysis.moveQuality.toLowerCase().replace(' ', '-')}">
                    ${analysis.moveQuality}
                </span>
            </div>
        `;
        
        if (analysis.mistakes.length > 0) {
            html += `
                <div class="analysis-section mistakes">
                    <div class="section-title">Mistakes:</div>
                    <ul>
                        ${analysis.mistakes.map(m => `<li>${m}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (analysis.improvements.length > 0) {
            html += `
                <div class="analysis-section improvements">
                    <div class="section-title">Good aspects:</div>
                    <ul>
                        ${analysis.improvements.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (bestMove) {
            const bestMoveNotation = formatMove(bestMove);
            html += `
                <div class="analysis-section best-move">
                    <div class="section-title">Best move:</div>
                    <div class="best-move-notation">${bestMoveNotation}</div>
                    ${getMoveExplanation(bestMove)}
                </div>
            `;
        }
        
        analysisText.innerHTML = html;
    }
    
    function getMoveExplanation(move) {
        let explanation = '';
        
        if (move.captured) {
            explanation = `Capturing the ${move.captured} is the best option. `;
        } else if (move.promotion) {
            explanation = `Promoting to ${move.promotion} gives the best advantage. `;
        } else if (move.san.includes('O-O')) {
            explanation = `Castling improves king safety and connects rooks. `;
        } else {
            explanation = `This move improves piece activity and position. `;
        }
        
        return `<div class="best-move-explanation">${explanation}</div>`;
    }
    
    // Chess AI functions
    function findBestMove(game, depth) {
        const moves = game.moves({verbose: true});
        if (moves.length === 0) return null;
        
        let bestMove = moves[0];
        let bestValue = -Infinity;
        
        for (let i = 0; i < moves.length; i++) {
            game.move(moves[i]);
            const value = minimax(game, depth - 1, -Infinity, Infinity, false);
            game.undo();
            
            if (value > bestValue) {
                bestValue = value;
                bestMove = moves[i];
            }
        }
        
        return bestMove;
    }
    
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
    
    function evaluateBoard(game) {
        if (game.in_checkmate()) {
            return game.turn() === 'w' ? -10000 : 10000;
        }
        
        if (game.in_draw()) {
            return 0;
        }
        
        const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        let score = 0;
        const boardState = game.board();
        
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (boardState[i][j]) {
                    const piece = boardState[i][j];
                    score += pieceValues[piece.type.toLowerCase()] * (piece.color === 'w' ? 1 : -1);
                }
            }
        }
        
        // Add mobility bonus
        score += game.moves().length * (game.turn() === 'w' ? 1 : -1);
        
        // Add center control bonus
        const centerSquares = ['e4', 'd4', 'e5', 'd5'];
        for (const square of centerSquares) {
            if (game.moves({square: square, verbose: true}).length > 0) {
                score += game.turn() === 'w' ? 10 : -10;
            }
        }
        
        return score;
    }
    
    function highlightSquare(square, type) {
        const $square = $(`#board .square-${square}`);
        const highlight = document.createElement('div');
        highlight.className = `board-highlight ${type}-highlight`;
        highlight.style.left = $square.position().left + 5 + 'px';
        highlight.style.top = $square.position().top + 5 + 'px';
        document.getElementById('board').appendChild(highlight);
        currentHighlights.push(highlight);
    }
    
    function clearHighlights() {
        currentHighlights.forEach(highlight => {
            highlight.remove();
        });
        currentHighlights = [];
    }
    
    function updateButtons() {
        prevMoveBtn.disabled = currentMoveIndex <= 0;
        nextMoveBtn.disabled = currentMoveIndex >= moves.length;
        firstMoveBtn.disabled = moves.length === 0 || currentMoveIndex <= 0;
        lastMoveBtn.disabled = moves.length === 0 || currentMoveIndex >= moves.length;
    }
});