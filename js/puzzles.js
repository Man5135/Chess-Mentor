document.addEventListener('DOMContentLoaded', function() {
    const board = Chessboard('board', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: './wikipedia/{piece}.png'
    });

    const game = new Chess();
    let allPuzzles = [];
    let currentPuzzleIndex = 0;
    let currentPuzzle = null;
    let solutionSteps = [];
    let currentStep = 0;
    let isShowingSolution = false;
    let currentHighlights = [];
    let playerColor = 'white';
    let isPlayerTurn = true;

    // DOM elements
    const puzzleTitle = document.getElementById('puzzleTitle');
    const puzzlePlayers = document.getElementById('puzzlePlayers');
    const puzzleDescription = document.getElementById('puzzleDescription');
    const solutionText = document.getElementById('solutionText');
    const solutionMoves = document.getElementById('solutionMoves');
    const prevPuzzleBtn = document.getElementById('prevPuzzleBtn');
    const nextPuzzleBtn = document.getElementById('nextPuzzleBtn');
    const showSolutionBtn = document.getElementById('showSolutionBtn');
    const resetPuzzleBtn = document.getElementById('resetPuzzleBtn');

    // Функция для предотвращения скроллинга на мобильных устройствах
    function preventScroll(e) {
        e.preventDefault();
    }

    // Обработчик начала перемещения фигуры
function onDragStart(source, piece) {
    // Предотвращаем скроллинг при перемещении фигур на мобильных устройствах
    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return !isShowingSolution && 
           currentPuzzle && 
           isPlayerTurn &&
           ((playerColor === 'white' && piece[0] === 'w') || 
           (playerColor === 'black' && piece[0] === 'b'));
}

    // Обработчик завершения перемещения
    function onSnapEnd() {
        document.removeEventListener('touchmove', preventScroll);
    }

    // Load puzzles from JSON file
    function loadPuzzles() {
        fetch('./data/puzzles.json')
            .then(response => response.json())
            .then(data => {
                allPuzzles = data.puzzles;
                loadCurrentPuzzle();
                updateButtons();
            })
            .catch(error => {
                console.error('Error loading puzzles:', error);
                puzzleTitle.textContent = 'Error loading puzzles. Please try again later.';
            });
    }

    // Load current puzzle
    function loadCurrentPuzzle() {
        if (allPuzzles.length === 0) {
            puzzleTitle.textContent = 'No puzzles available';
            puzzlePlayers.textContent = '';
            puzzleDescription.textContent = '';
            board.position('start');
            currentPuzzle = null;
            return;
        }

        currentPuzzle = allPuzzles[currentPuzzleIndex];
        game.load(currentPuzzle.fen);
        board.position(currentPuzzle.fen);
        
        playerColor = game.turn() === 'w' ? 'white' : 'black';
        isPlayerTurn = true;
        
        puzzleTitle.textContent = currentPuzzle.description || 'Chess Puzzle';
        puzzlePlayers.textContent = currentPuzzle.players || '';
        puzzleDescription.textContent = currentPuzzle.theme ? `Theme: ${currentPuzzle.theme}` : '';
        
        solutionMoves.innerHTML = '';
        solutionText.innerHTML = '';
        currentStep = 0;
        isShowingSolution = false;
        solutionSteps = [...currentPuzzle.solution] || [];
        
        clearHighlights();
        updateButtons();
    }

    // Handle piece drop
    function onDrop(source, target) {
        if (isShowingSolution || !currentPuzzle || !isPlayerTurn) return 'snapback';

        const piece = game.get(source);
        if (!piece || (piece.color === 'w' && playerColor !== 'white') || (piece.color === 'b' && playerColor !== 'black')) {
            return 'snapback';
        }

        const move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        if (move === null) return 'snapback';

        board.position(game.fen());
        
        // Check if the move is correct
        if (solutionSteps.length > 0) {
            const correctMove = solutionSteps[0];
            
            if (move.from === correctMove.from && move.to === correctMove.to) {
                // Correct move - make AI response
                solutionSteps.shift();
                isPlayerTurn = false;
                
                if (solutionSteps.length > 0) {
                    setTimeout(() => {
                        const aiMove = solutionSteps[0];
                        const aiMoveObj = game.move({
                            from: aiMove.from,
                            to: aiMove.to,
                            promotion: 'q'
                        });
                        
                        if (aiMoveObj) {
                            board.position(game.fen());
                            solutionSteps.shift();
                            isPlayerTurn = solutionSteps.length > 0 && 
                                         (solutionSteps[0].piece === 'p' ? 
                                          game.turn() === (playerColor === 'white' ? 'w' : 'b') : 
                                          true);
                            
                            if (solutionSteps.length === 0) {
                                solutionText.innerHTML = '<div class="success">Puzzle solved!</div>';
                            }
                        }
                    }, 500);
                } else {
                    solutionText.innerHTML = '<div class="success">Puzzle solved!</div>';
                    isPlayerTurn = true;
                }
            } else {
                // Incorrect move - revert immediately
                solutionText.innerHTML = '<div class="error">Incorrect move. Try again.</div>';
                setTimeout(() => {
                    game.undo();
                    board.position(game.fen());
                }, 100);
                return 'snapback';
            }
        }
        
        return true;
    }

    // Show solution step by step
    function showSolution() {
        if (!currentPuzzle) return;
        
        if (isShowingSolution) {
            nextSolutionStep();
            return;
        }
        
        isShowingSolution = true;
        currentStep = 0;
        isPlayerTurn = false;
        
        // Reset to initial position
        game.load(currentPuzzle.fen);
        board.position(currentPuzzle.fen);
        
        solutionText.innerHTML = '<div class="info">Showing solution...</div>';
        solutionMoves.innerHTML = '';
        solutionSteps = [...currentPuzzle.solution];
        
        nextSolutionStep();
    }

    function nextSolutionStep() {
        if (!currentPuzzle || currentStep >= currentPuzzle.solution.length) {
            solutionText.innerHTML = '<div class="info">Solution complete.</div>';
            isShowingSolution = false;
            isPlayerTurn = true;
            return;
        }
        
        clearHighlights();
        
        const move = currentPuzzle.solution[currentStep];
        const moveObj = game.move({
            from: move.from,
            to: move.to,
            promotion: 'q'
        });
        
        if (!moveObj) {
            console.error('Invalid move in solution:', move);
            return;
        }
        
        board.position(game.fen());
        
        highlightSquare(move.from, 'from');
        highlightSquare(move.to, 'to');
        
        const moveElement = document.createElement('div');
        moveElement.className = 'solution-move';
        moveElement.textContent = `${currentStep + 1}. ${move.piece.toUpperCase()} ${move.from}-${move.to}`;
        solutionMoves.appendChild(moveElement);
        
        currentStep++;
        solutionMoves.scrollTop = solutionMoves.scrollHeight;
        
        // Auto-advance for solution
        if (isShowingSolution) {
            setTimeout(nextSolutionStep, 1000);
        }
    }

    // Navigation functions
    function prevPuzzle() {
        if (allPuzzles.length === 0) return;
        currentPuzzleIndex = (currentPuzzleIndex - 1 + allPuzzles.length) % allPuzzles.length;
        loadCurrentPuzzle();
    }

    function nextPuzzle() {
        if (allPuzzles.length === 0) return;
        currentPuzzleIndex = (currentPuzzleIndex + 1) % allPuzzles.length;
        loadCurrentPuzzle();
    }

    function resetPuzzle() {
        loadCurrentPuzzle();
    }

    // Highlight squares
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

    // Update button states
    function updateButtons() {
        prevPuzzleBtn.disabled = allPuzzles.length === 0 || currentPuzzleIndex <= 0;
        nextPuzzleBtn.disabled = allPuzzles.length === 0;
        resetPuzzleBtn.disabled = allPuzzles.length === 0;
        showSolutionBtn.disabled = allPuzzles.length === 0;
    }

    // Event listeners
    prevPuzzleBtn.addEventListener('click', prevPuzzle);
    nextPuzzleBtn.addEventListener('click', nextPuzzle);
    showSolutionBtn.addEventListener('click', showSolution);
    resetPuzzleBtn.addEventListener('click', resetPuzzle);

    // Initialize
    loadPuzzles();
});