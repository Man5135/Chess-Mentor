document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
    const boardElement = document.getElementById('chess-board');
    const ui = new ChessUI(game, boardElement);
    
    document.getElementById('new-game-btn').addEventListener('click', () => {
        game.board = game.createInitialBoard();
        game.currentPlayer = 'white';
        game.gameOver = false;
        game.moveHistory = [];
        game.moveStack = [];
        ui.initBoard();
    });
    
    document.getElementById('hint-btn').addEventListener('click', () => {
        ui.showHint();
    });
    
    document.getElementById('undo-btn').addEventListener('click', () => {
        if (game.undoMove()) {
            ui.updateBoard();
        } else {
            ui.showModal('Нет ходов для отмены', 'hint-modal');
        }
    });
    
    document.getElementById('analyze-btn').addEventListener('click', () => {
        ui.analyzePosition();
    });
    
    ui.updateGameStatus();
});