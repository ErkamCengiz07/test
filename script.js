document.addEventListener('DOMContentLoaded', () => {
    // Satranç tahtası ve oyun durumu
    const board = document.getElementById('board');
    const playerTurn = document.getElementById('player-turn');
    const gameStatus = document.getElementById('game-status');
    const whiteCapturedPieces = document.getElementById('white-captured-pieces');
    const blackCapturedPieces = document.getElementById('black-captured-pieces');
    
    // Butonlar
    const newGameBtn = document.getElementById('new-game');
    const playAsWhiteBtn = document.getElementById('play-as-white');
    const playAsBlackBtn = document.getElementById('play-as-black');
    const undoMoveBtn = document.getElementById('undo-move');
    const difficultySelect = document.getElementById('difficulty');
    
    // Oyun değişkenleri
    let game = new Chess();
    let selectedSquare = null;
    let playerColor = 'w'; // Varsayılan olarak beyaz
    let isPlayerTurn = true;
    let capturedPieces = { w: [], b: [] };
    let moveHistory = [];
    
    // Taş Unicode karakterleri
    const pieceUnicode = {
        'wP': '♙', 'wR': '♖', 'wN': '♘', 'wB': '♗', 'wQ': '♕', 'wK': '♔',
        'bP': '♟', 'bR': '♜', 'bN': '♞', 'bB': '♝', 'bQ': '♛', 'bK': '♚'
    };
    
    // Tahtayı oluştur
    function createBoard() {
        board.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.classList.add((row + col) % 2 === 0 ? 'white' : 'black');
                
                // Kare koordinatları (a8, b8, ..., h1)
                const file = String.fromCharCode(97 + col); // a, b, c, ..., h
                const rank = 8 - row; // 8, 7, ..., 1
                const squareId = file + rank;
                square.setAttribute('data-square', squareId);
                
                square.addEventListener('click', () => handleSquareClick(squareId));
                
                board.appendChild(square);
            }
        }
        
        updateBoard();
    }
    
    // Tahtayı güncelle
    function updateBoard() {
        // Tüm kareleri temizle
        document.querySelectorAll('.square').forEach(square => {
            square.innerHTML = '';
            square.classList.remove('selected', 'valid-move');
        });
        
        // Taşları yerleştir
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                const squareId = file + rank;
                
                const piece = game.get(squareId);
                if (piece) {
                    const squareElement = document.querySelector(`[data-square="${squareId}"]`);
                    const pieceElement = document.createElement('div');
                    pieceElement.classList.add('piece');
                    
                    // Taş tipini belirle (örn: wP, bK)
                    const pieceType = piece.color + piece.type.toUpperCase();
                    pieceElement.textContent = pieceUnicode[pieceType];
                    
                    squareElement.appendChild(pieceElement);
                }
            }
        }
        
        // Seçili kareyi işaretle
        if (selectedSquare) {
            const selectedElement = document.querySelector(`[data-square="${selectedSquare}"]`);
            selectedElement.classList.add('selected');
            
            // Geçerli hamleleri göster
            const moves = game.moves({ square: selectedSquare, verbose: true });
            moves.forEach(move => {
                const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
                targetSquare.classList.add('valid-move');
            });
        }
        
        // Oyun durumunu güncelle
        updateGameStatus();
        
        // Oyuncu sırasını güncelle
        playerTurn.textContent = game.turn() === 'w' ? 'Beyaz Oynar' : 'Siyah Oynar';
        playerTurn.className = 'turn-indicator ' + (game.turn() === 'w' ? 'white' : 'black');
        
        // Oyuncu sırası kontrolü
        isPlayerTurn = game.turn() === playerColor;
        
        // Bot hamlesi
        if (!isPlayerTurn && !game.game_over()) {
            setTimeout(makeBotMove, 500);
        }
    }
    
    // Kare tıklama işleyicisi
    function handleSquareClick(squareId) {
        // Oyun bittiyse veya oyuncu sırası değilse işlem yapma
        if (game.game_over() || !isPlayerTurn) return;
        
        const piece = game.get(squareId);
        
        // Eğer oyuncunun kendi taşına tıkladıysa, o kareyi seç
        if (piece && piece.color === playerColor) {
            selectedSquare = squareId;
            updateBoard();
            return;
        }
        
        // Eğer bir kare seçiliyse ve geçerli bir hamle yapılıyorsa
        if (selectedSquare) {
            const moves = game.moves({ square: selectedSquare, verbose: true });
            const validMove = moves.find(move => move.to === squareId);
            
            if (validMove) {
                // Eğer taş alınıyorsa, alınan taşı kaydet
                const capturedPiece = game.get(squareId);
                if (capturedPiece) {
                    capturedPieces[capturedPiece.color].push(capturedPiece.type);
                    updateCapturedPieces();
                }
                
                // Hamleyi yap
                const move = game.move({
                    from: selectedSquare,
                    to: squareId,
                    promotion: 'q' // Otomatik olarak vezir terfi et
                });
                
                moveHistory.push(move);
                selectedSquare = null;
                updateBoard();
            } else {
                // Geçersiz hamle, seçimi temizle
                selectedSquare = null;
                updateBoard();
            }
        }
    }
    
    // Bot hamlesi yap
    function makeBotMove() {
        const difficulty = parseInt(difficultySelect.value);
        let move;
        
        if (difficulty === 1) {
            // Kolay: Rastgele hamle
            const moves = game.moves({ verbose: true });
            move = moves[Math.floor(Math.random() * moves.length)];
        } else if (difficulty === 2) {
            // Orta: Basit değerlendirme ile hamle
            move = findBestMove(2);
        } else {
            // Zor: Daha derin değerlendirme ile hamle
            move = findBestMove(3);
        }
        
        if (move) {
            // Eğer taş alınıyorsa, alınan taşı kaydet
            const capturedPiece = game.get(move.to);
            if (capturedPiece) {
                capturedPieces[capturedPiece.color].push(capturedPiece.type);
                updateCapturedPieces();
            }
            
            // Hamleyi yap
            const madeMove = game.move(move);
            moveHistory.push(madeMove);
            updateBoard();
        }
    }
    
    // Basit minimax algoritması ile en iyi hamleyi bul
    function findBestMove(depth) {
        const botColor = playerColor === 'w' ? 'b' : 'w';
        let bestMove = null;
        let bestValue = botColor === 'w' ? -Infinity : Infinity;
        
        const moves = game.moves({ verbose: true });
        
        for (const move of moves) {
            game.move(move);
            const value = minimax(depth - 1, -Infinity, Infinity, botColor === 'w' ? false : true);
            game.undo();
            
            if (botColor === 'w' && value > bestValue) {
                bestValue = value;
                bestMove = move;
            } else if (botColor === 'b' && value < bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }
        
        return bestMove;
    }
    
    // Minimax algoritması
    function minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0 || game.game_over()) {
            return evaluateBoard();
        }
        
        if (isMaximizing) {
            let maxEval = -Infinity;
            const moves = game.moves();
            
            for (const move of moves) {
                game.move(move);
                const eval = minimax(depth - 1, alpha, beta, false);
                game.undo();
                maxEval = Math.max(maxEval, eval);
                alpha = Math.max(alpha, eval);
                if (beta <= alpha) break;
            }
            
            return maxEval;
        } else {
            let minEval = Infinity;
            const moves = game.moves();
            
            for (const move of moves) {
                game.move(move);
                const eval = minimax(depth - 1, alpha, beta, true);
                game.undo();
                minEval = Math.min(minEval, eval);
                beta = Math.min(beta, eval);
                if (beta <= alpha) break;
            }
            
            return minEval;
        }
    }
    
    // Tahtayı değerlendir
    function evaluateBoard() {
        let value = 0;
        
        // Materyal değeri
        const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
        
        // Tahtadaki her kareyi kontrol et
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                const square = file + rank;
                
                const piece = game.get(square);
                if (piece) {
                    // Taşın değerini hesapla
                    const pieceValue = pieceValues[piece.type];
                    if (piece.color === 'w') {
                        value += pieceValue;
                    } else {
                        value -= pieceValue;
                    }
                    
                    // Merkez kontrolü için bonus
                    if ((col === 3 || col === 4) && (row === 3 || row === 4)) {
                        if (piece.color === 'w') {
                            value += 5;
                        } else {
                            value -= 5;
                        }
                    }
                }
            }
        }
        
        return value;
    }
    
    // Alınan taşları güncelle
    function updateCapturedPieces() {
        whiteCapturedPieces.innerHTML = '';
        blackCapturedPieces.innerHTML = '';
        
        capturedPieces.b.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.classList.add('captured-piece');
            pieceElement.textContent = pieceUnicode['b' + piece.toUpperCase()];
            whiteCapturedPieces.appendChild(pieceElement);
        });
        
        capturedPieces.w.forEach(piece => {
            const pieceElement = document.createElement('div');
            pieceElement.classList.add('captured-piece');
            pieceElement.textContent = pieceUnicode['w' + piece.toUpperCase()];
            blackCapturedPieces.appendChild(pieceElement);
        });
    }
    
    // Oyun durumunu güncelle
    function updateGameStatus() {
        gameStatus.textContent = '';
        gameStatus.className = 'game-status';
        
        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Siyah' : 'Beyaz';
            gameStatus.textContent = `Şah Mat! ${winner} kazandı.`;
            gameStatus.classList.add('checkmate');
        } else if (game.in_draw()) {
            gameStatus.textContent = 'Berabere!';
            gameStatus.classList.add('draw');
            
            if (game.in_stalemate()) {
                gameStatus.textContent += ' (Pat)';
            } else if (game.in_threefold_repetition()) {
                gameStatus.textContent += ' (Üç kez tekrar)';
            } else if (game.insufficient_material()) {
                gameStatus.textContent += ' (Yetersiz materyal)';
            }
        } else if (game.in_check()) {
            gameStatus.textContent = 'Şah!';
            gameStatus.classList.add('check');
        }
    }
    
    // Yeni oyun başlat
    function startNewGame() {
        game = new Chess();
        selectedSquare = null;
        isPlayerTurn = playerColor === 'w';
        capturedPieces = { w: [], b: [] };
        moveHistory = [];
        
        updateCapturedPieces();
        createBoard();
        
        // Eğer oyuncu siyahsa, bot (beyaz) ilk hamleyi yapar
        if (playerColor === 'b') {
            setTimeout(makeBotMove, 500);
        }
    }
    
    // Hamleyi geri al
    function undoMove() {
        if (moveHistory.length >= 2) {
            // Oyuncu ve bot hamlesini geri al
            game.undo(); // Bot hamlesi
            game.undo(); // Oyuncu hamlesi
            
            // Alınan taşları güncelle
            const botMove = moveHistory.pop();
            const playerMove = moveHistory.pop();
            
            if (botMove.captured) {
                const index = capturedPieces[botMove.color === 'w' ? 'b' : 'w'].indexOf(botMove.captured);
                if (index !== -1) {
                    capturedPieces[botMove.color === 'w' ? 'b' : 'w'].splice(index, 1);
                }
            }
            
            if (playerMove.captured) {
                const index = capturedPieces[playerMove.color === 'w' ? 'b' : 'w'].indexOf(playerMove.captured);
                if (index !== -1) {
                    capturedPieces[playerMove.color === 'w' ? 'b' : 'w'].splice(index, 1);
                }
            }
            
            updateCapturedPieces();
            updateBoard();
        } else if (moveHistory.length === 1) {
            // Sadece bir hamle varsa (oyun başında)
            game.undo();
            const move = moveHistory.pop();
            
            if (move.captured) {
                const index = capturedPieces[move.color === 'w' ? 'b' : 'w'].indexOf(move.captured);
                if (index !== -1) {
                    capturedPieces[move.color === 'w' ? 'b' : 'w'].splice(index, 1);
                }
            }
            
            updateCapturedPieces();
            updateBoard();
        }
    }
    
    // Buton olay dinleyicileri
    newGameBtn.addEventListener('click', startNewGame);
    
    playAsWhiteBtn.addEventListener('click', () => {
        playerColor = 'w';
        startNewGame();
    });
    
    playAsBlackBtn.addEventListener('click', () => {
        playerColor = 'b';
        startNewGame();
    });
    
    undoMoveBtn.addEventListener('click', undoMove);
    
    // Oyunu başlat
    createBoard();
});