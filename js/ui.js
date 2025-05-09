class ChessUI {
    constructor(game, boardElement) {
        this.game = game;
        this.boardElement = boardElement;
        this.selectedSquare = null;
        this.pieceElements = {};
        this.initBoard();
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
        
        // Используем эмодзи как фолбэк
        const emojiMap = {
            king: { white: '♔', black: '♚' },
            queen: { white: '♕', black: '♛' },
            rook: { white: '♖', black: '♜' },
            bishop: { white: '♗', black: '♝' },
            knight: { white: '♘', black: '♞' },
            pawn: { white: '♙', black: '♟' }
        };
        
        pieceElement.textContent = emojiMap[piece.type][piece.color];
        
        // Пытаемся загрузить изображение
        const img = new Image();
        img.src = `images/pieces/${piece.color}_${piece.type}.png`;
        img.onload = () => {
            pieceElement.textContent = '';
            pieceElement.style.backgroundImage = `url(${img.src})`;
        };
        
        return pieceElement;
    }

    handleSquareClick(row, col) {
        // Если игра окончена или ход ИИ, игнорируем клики
        if (this.game.gameOver || this.game.currentPlayer === 'black') return;
        
        const position = [row, col];
        
        // Если фигура уже выбрана, пытаемся сделать ход
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            if (this.game.makeMove([selectedRow, selectedCol], position)) {
                this.updateBoard();
                
                // Если игра не окончена, делаем ход ИИ
                if (!this.game.gameOver && this.game.currentPlayer === 'black') {
                    setTimeout(() => this.makeAIMove(), 500);
                }
            }
            
            this.clearSelection();
            return;
        }
        
        // Выбираем фигуру, если она принадлежит текущему игроку
        const piece = this.game.getPieceAt(position);
        if (piece && piece.color === this.game.currentPlayer) {
            this.selectedSquare = position;
            this.highlightValidMoves(position);
        }
    }

    highlightValidMoves(position) {
        const validMoves = this.game.getValidMoves(position);
        
        // Снимаем предыдущие подсветки
        this.clearHighlights();
        
        // Подсвечиваем выбранную фигуру
        const [row, col] = position;
        const square = this.getSquareElement(row, col);
        if (square) square.classList.add('highlight');
        
        // Подсвечиваем допустимые ходы
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
        // Обновляем только изменившиеся клетки
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.game.getPieceAt([row, col]);
                const key = `${row},${col}`;
                const square = this.getSquareElement(row, col);
                
                // Очищаем клетку
                if (this.pieceElements[key]) {
                    square.removeChild(this.pieceElements[key]);
                    delete this.pieceElements[key];
                }
                
                // Добавляем новую фигуру если есть
                if (piece) {
                    const pieceElement = this.createPieceElement(piece, row, col);
                    square.appendChild(pieceElement);
                    this.pieceElements[key] = pieceElement;
                }
            }
        }
        
        // Обновляем статус игры
        this.updateGameStatus();
    }

    updateGameStatus() {
        const statusElement = document.getElementById('game-status');
        if (this.game.gameOver) {
            statusElement.textContent = `Игра окончена! ${this.game.currentPlayer === 'white' ? 'Черные' : 'Белые'} победили!`;
        } else {
            statusElement.textContent = `Сейчас ходят: ${this.game.currentPlayer === 'white' ? 'белые' : 'черные'}`;
        }
    }

    makeAIMove() {
        const move = this.game.makeAIMove();
        if (move) {
            this.game.makeMove(move.from, move.to);
            this.updateBoard();
        }
    }

    showHint() {
        if (this.game.currentPlayer !== 'white' || !this.selectedSquare) {
            this.showModal('Выберите свою фигуру, чтобы получить подсказку');
            return;
        }
        
        const [row, col] = this.selectedSquare;
        const validMoves = this.game.getValidMoves([row, col]);
        
        if (validMoves.length === 0) {
            this.showModal('У этой фигуры нет допустимых ходов');
            return;
        }
        
        // Находим самый "ценный" ход (если есть взятие)
        let bestMove = null;
        let bestValue = -1;
        
        validMoves.forEach(([r, c]) => {
            const targetPiece = this.game.getPieceAt([r, c]);
            if (targetPiece) {
                const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
                const value = pieceValues[targetPiece.type];
                if (value > bestValue) {
                    bestValue = value;
                    bestMove = [r, c];
                }
            }
        });
        
        if (bestMove) {
            this.showModal(`Рекомендуемый ход: взятие фигуры противника на ${String.fromCharCode(97 + bestMove[1])}${8 - bestMove[0]}`);
        } else {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            this.showModal(`Рекомендуемый ход: ${String.fromCharCode(97 + randomMove[1])}${8 - randomMove[0]}`);
        }
    }

    showModal(message) {
        const modal = document.getElementById('hint-modal');
        const hintText = document.getElementById('hint-text');
        hintText.textContent = message;
        modal.style.display = 'flex';
        
        document.querySelector('.close-modal').onclick = () => {
            modal.style.display = 'none';
        };
    }
}