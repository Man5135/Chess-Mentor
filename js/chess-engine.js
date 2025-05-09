class ChessGame {
    constructor() {
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.gameOver = false;
        this.moveHistory = [];
        this.selectedPiece = null;
        this.validMoves = [];
    }

    createInitialBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Расставляем пешки
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black' };
            board[6][i] = { type: 'pawn', color: 'white' };
        }

        // Расставляем остальные фигуры
        const piecesOrder = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: piecesOrder[i], color: 'black' };
            board[7][i] = { type: piecesOrder[i], color: 'white' };
        }

        return board;
    }

    getPieceAt(position) {
        const [row, col] = position;
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    isValidMove(from, to) {
        // Упрощенная проверка ходов (реализуем базовые правила)
        const piece = this.getPieceAt(from);
        if (!piece || piece.color !== this.currentPlayer) return false;

        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        const targetPiece = this.getPieceAt(to);

        // Проверка на свою же фигуру
        if (targetPiece && targetPiece.color === piece.color) return false;

        // Базовые правила движения
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                // Ход на 1 клетку вперед
                if (fromCol === toCol && !targetPiece) {
                    if (toRow === fromRow + direction) return true;
                    // Первый ход на 2 клетки
                    if ((fromRow === 1 && piece.color === 'black') || 
                        (fromRow === 6 && piece.color === 'white')) {
                        if (toRow === fromRow + 2 * direction && 
                            !this.getPieceAt([fromRow + direction, fromCol])) {
                            return true;
                        }
                    }
                }
                // Взятие
                if (Math.abs(toCol - fromCol) === 1 && 
                    toRow === fromRow + direction && 
                    targetPiece && targetPiece.color !== piece.color) {
                    return true;
                }
                break;
                
            case 'rook':
                if (fromRow !== toRow && fromCol !== toCol) return false;
                return this.checkLinearMove(from, to);
                
            case 'knight':
                const rowDiff = Math.abs(toRow - fromRow);
                const colDiff = Math.abs(toCol - fromCol);
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
                
            case 'bishop':
                if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
                return this.checkDiagonalMove(from, to);
                
            case 'queen':
                if (fromRow === toRow || fromCol === toCol) {
                    return this.checkLinearMove(from, to);
                }
                if (Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)) {
                    return this.checkDiagonalMove(from, to);
                }
                return false;
                
            case 'king':
                return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
        }

        return false;
    }

    checkLinearMove(from, to) {
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        
        const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
        const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.getPieceAt([currentRow, currentCol])) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }

    checkDiagonalMove(from, to) {
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        
        const rowStep = toRow > fromRow ? 1 : -1;
        const colStep = toCol > fromCol ? 1 : -1;
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow && currentCol !== toCol) {
            if (this.getPieceAt([currentRow, currentCol])) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }

    makeMove(from, to) {
        if (this.gameOver || !this.isValidMove(from, to)) return false;

        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        const piece = this.board[fromRow][fromCol];
        
        // Проверка на мат (упрощенная)
        const targetPiece = this.board[toRow][toCol];
        if (targetPiece && targetPiece.type === 'king') {
            this.gameOver = true;
        }

        // Выполняем ход
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Записываем ход в историю
        const moveNotation = this.getMoveNotation(from, to, piece, targetPiece);
        this.moveHistory.push(moveNotation);
        
        // Меняем игрока
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        return true;
    }

    getMoveNotation(from, to, piece, targetPiece) {
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        let notation = '';
        if (piece.type !== 'pawn') {
            notation += piece.type === 'knight' ? 'N' : piece.type[0].toUpperCase();
        }
        
        if (targetPiece) {
            if (piece.type === 'pawn') {
                notation += columns[fromCol];
            }
            notation += 'x';
        }
        
        notation += columns[toCol] + (8 - toRow);
        
        return notation;
    }

    getValidMoves(position) {
        const validMoves = [];
        const [row, col] = position;
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove([row, col], [r, c])) {
                    validMoves.push([r, c]);
                }
            }
        }
        
        return validMoves;
    }

    // Упрощенный ИИ для черных
    makeAIMove() {
        if (this.currentPlayer !== 'black' || this.gameOver) return null;
        
        // Находим все возможные ходы
        const allMoves = [];
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.getPieceAt([fromRow, fromCol]);
                if (piece && piece.color === 'black') {
                    const moves = this.getValidMoves([fromRow, fromCol]);
                    moves.forEach(([toRow, toCol]) => {
                        allMoves.push({
                            from: [fromRow, fromCol],
                            to: [toRow, toCol],
                            piece,
                            target: this.getPieceAt([toRow, toCol])
                        });
                    });
                }
            }
        }
        
        if (allMoves.length === 0) return null;
        
        // Приоритет: взятие фигур, особенно ценных
        const captureMoves = allMoves.filter(move => move.target);
        if (captureMoves.length > 0) {
            // Сортируем по ценности фигур
            captureMoves.sort((a, b) => {
                const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
                return pieceValues[b.target.type] - pieceValues[a.target.type];
            });
            return captureMoves[0];
        }
        
        // Случайный ход, если нет взятий
        const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
        return randomMove;
    }
}