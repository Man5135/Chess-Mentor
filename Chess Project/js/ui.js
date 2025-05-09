class ChessUI {
    constructor(game, boardElement) {
        this.game = game;
        this.boardElement = boardElement;
        this.selectedSquare = null;
        this.pieceElements = {};
        this.playerColor = 'white';
        this.initBoard();
        this.initColorSelector();
        this.initModalCloseHandlers();
    }

    initBoard() {
        this.boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                
                square.addEventListener('click', () => this.handleSquareClick(row, col));
                
                const piece = this.game.getPieceAt([row, col]);
                if (piece) {
                    const pieceElement = this.createPieceElement(piece, row, col);
                    square.appendChild(pieceElement);
                    this.pieceElements[`${row},${col}`] = pieceElement;
                }
                
                this.boardElement.appendChild(square);
            }
        }
    }

    createPieceElement(piece, row, col) {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'piece';
        pieceElement.dataset.row = row;
        pieceElement.dataset.col = col;
        
        const emojiMap = {
            king: { white: '♔', black: '♚' },
            queen: { white: '♕', black: '♛' },
            rook: { white: '♖', black: '♜' },
            bishop: { white: '♗', black: '♝' },
            knight: { white: '♘', black: '♞' },
            pawn: { white: '♙', black: '♟' }
        };
        
        pieceElement.textContent = emojiMap[piece.type][piece.color];
        
        const img = new Image();
        img.src = `images/pieces/${piece.color}_${piece.type}.png`;
        img.onload = () => {
            pieceElement.textContent = '';
            pieceElement.style.backgroundImage = `url(${img.src})`;
        };
        
        return pieceElement;
    }

    initColorSelector() {
        const selector = document.getElementById('color-select');
        selector.addEventListener('change', (e) => {
            this.playerColor = e.target.value === 'random' ? 
                Math.random() > 0.5 ? 'white' : 'black' : 
                e.target.value;
            
            if (this.playerColor === 'black') {
                setTimeout(() => this.makeAIMove(), 500);
            }
        });
    }

    initModalCloseHandlers() {
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(modal => {
                    modal.style.display = 'none';
                });
            });
        });
    }

    handleSquareClick(row, col) {
        if (this.game.gameOver || 
            this.game.currentPlayer !== this.playerColor) return;
        
        const position = [row, col];
        
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            if (this.game.makeMove([selectedRow, selectedCol], position)) {
                this.updateBoard();
                
                if (!this.game.gameOver && this.game.currentPlayer !== this.playerColor) {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }
            
            this.clearSelection();
            return;
        }
        
        const piece = this.game.getPieceAt(position);
        if (piece && piece.color === this.playerColor) {
            this.selectedSquare = position;
            this.highlightValidMoves(position);
        }
    }

    highlightValidMoves(position) {
        const validMoves = this.game.getValidMoves(position);
        this.clearHighlights();
        
        const [row, col] = position;
        const square = this.getSquareElement(row, col);
        if (square) square.classList.add('highlight');
        
        validMoves.forEach(([r, c]) => {
            const moveSquare = this.getSquareElement(r, c);
            if (moveSquare) moveSquare.classList.add('highlight');
        });
    }

    clearHighlights() {
        document.querySelectorAll('.square.highlight').forEach(square => {
            square.classList.remove('highlight');
        });
    }

    clearSelection() {
        this.selectedSquare = null;
        this.clearHighlights();
    }

    getSquareElement(row, col) {
        return document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    }

    updateBoard() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.game.getPieceAt([row, col]);
                const key = `${row},${col}`;
                const square = this.getSquareElement(row, col);
                
                if (this.pieceElements[key]) {
                    square.removeChild(this.pieceElements[key]);
                    delete this.pieceElements[key];
                }
                
                if (piece) {
                    const pieceElement = this.createPieceElement(piece, row, col);
                    square.appendChild(pieceElement);
                    this.pieceElements[key] = pieceElement;
                }
            }
        }
        
        this.updateGameStatus();
        this.updateMoveHistory();
    }

    updateGameStatus() {
        const statusElement = document.getElementById('game-status');
        if (this.game.gameOver) {
            statusElement.textContent = `Игра окончена! ${this.game.currentPlayer === 'white' ? 'Черные' : 'Белые'} победили!`;
        } else {
            statusElement.textContent = `Сейчас ходят: ${this.game.currentPlayer === 'white' ? 'белые' : 'черные'}`;
            
            if (this.game.currentPlayer === this.playerColor) {
                statusElement.textContent += ' (Ваш ход)';
            } else {
                statusElement.textContent += ' (Ход ИИ)';
            }
        }
    }

    updateMoveHistory() {
        const historyElement = document.getElementById('move-history');
        historyElement.innerHTML = this.game.moveHistory
            .map((move, i) => `<div>${i + 1}. ${move}</div>`)
            .join('');
        historyElement.scrollTop = historyElement.scrollHeight;
    }

    makeAIMove() {
        if (this.game.currentPlayer !== (this.playerColor === 'white' ? 'black' : 'white')) return;
        
        const move = this.game.makeAIMove();
        if (move) {
            this.game.makeMove(move.from, move.to);
            this.updateBoard();
        }
    }

    showHint() {
        if (this.game.currentPlayer !== this.playerColor || !this.selectedSquare) {
            this.showModal('Выберите свою фигуру, чтобы получить подсказку', 'hint-modal');
            return;
        }
        
        const [row, col] = this.selectedSquare;
        const validMoves = this.game.getValidMoves([row, col]);
        
        if (validMoves.length === 0) {
            this.showModal('У этой фигуры нет допустимых ходов', 'hint-modal');
            return;
        }
        
        const bestMove = this.game.analyzePosition().bestMove;
        if (bestMove && bestMove.from[0] === row && bestMove.from[1] === col) {
            const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const toCol = columns[bestMove.to[1]];
            const toRow = 8 - bestMove.to[0];
            
            let hint = `Рекомендуемый ход: ${toCol}${toRow}`;
            if (bestMove.target) {
                hint += ` (взятие ${bestMove.target.type})`;
            }
            
            this.showModal(hint, 'hint-modal');
        } else {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            this.showModal(
                `Возможный ход: ${columns[randomMove[1]]}${8 - randomMove[0]}`,
                'hint-modal'
            );
        }
    }

    analyzePosition() {
        const analysis = this.game.analyzePosition();
        let resultHTML = `
            <p><strong>Материал:</strong> 
            Белые: ${analysis.material.white}, 
            Чёрные: ${analysis.material.black}</p>
            <p><strong>Активность фигур:</strong>
            Белые: ${analysis.activity.white.toFixed(1)}, 
            Чёрные: ${analysis.activity.black.toFixed(1)}</p>
            <p><strong>Общее преимущество:</strong> `;
        
        if (analysis.advantage > 1) {
            resultHTML += `Белые (+${analysis.advantage.toFixed(1)})`;
        } else if (analysis.advantage < -1) {
            resultHTML += `Чёрные (+${Math.abs(analysis.advantage).toFixed(1)})`;
        } else {
            resultHTML += "Равная позиция";
        }
        
        if (analysis.bestMove) {
            const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const fromCol = columns[analysis.bestMove.from[1]];
            const fromRow = 8 - analysis.bestMove.from[0];
            const toCol = columns[analysis.bestMove.to[1]];
            const toRow = 8 - analysis.bestMove.to[0];
            
            resultHTML += `<p><strong>Лучший ход для ${this.game.currentPlayer === 'white' ? 'белых' : 'чёрных'}:</strong> `;
            resultHTML += `${fromCol}${fromRow} → ${toCol}${toRow}`;
            
            if (analysis.bestMove.target) {
                resultHTML += ` (взятие ${analysis.bestMove.target.type})`;
            }
            resultHTML += `</p>`;
        }
        
        document.getElementById('analysis-result').innerHTML = resultHTML;
        this.showModal(null, 'analysis-modal');
    }

    showModal(message, modalId) {
        if (message) {
            document.getElementById('hint-text').textContent = message;
        }
        document.getElementById(modalId).style.display = 'flex';
    }
}