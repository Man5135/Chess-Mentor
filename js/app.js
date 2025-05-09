document.addEventListener('DOMContentLoaded', () => {
    const game = new ChessGame();
    const boardElement = document.getElementById('chess-board');
    const ui = new ChessUI(game, boardElement);
    
    // Кнопка новой игры
    document.getElementById('new-game-btn').addEventListener('click', () => {
        game.board = game.createInitialBoard();
        game.currentPlayer = 'white';
        game.gameOver = false;
        game.moveHistory = [];
        ui.initBoard();
    });
    
    // Кнопка подсказки
    document.getElementById('hint-btn').addEventListener('click', () => {
        ui.showHint();
    });
    
    // Кнопка отмены хода
    document.getElementById('undo-btn').addEventListener('click', () => {
        // В этом упрощенном варианте просто перезапускаем игру
        // В полной версии можно реализовать стек ходов для отмены
        ui.showModal('В этой версии отмена хода не реализована. Начните новую игру.');
    });
    
    // Инициализация игры
    ui.updateGameStatus();
});