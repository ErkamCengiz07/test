// Tetris oyunu için JavaScript kodu
document.addEventListener('DOMContentLoaded', () => {
    // Canvas ve context tanımlamaları
    const canvas = document.getElementById('tetris');
    const context = canvas.getContext('2d');
    const nextPieceCanvas = document.createElement('canvas');
    nextPieceCanvas.width = 80;
    nextPieceCanvas.height = 80;
    const nextPieceContext = nextPieceCanvas.getContext('2d');
    document.getElementById('next-piece').appendChild(nextPieceCanvas);
    
    // Oyun değişkenleri
    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 20;
    const COLORS = [
        null,
        '#FF0D72', // I
        '#0DC2FF', // J
        '#0DFF72', // L
        '#F538FF', // O
        '#FF8E0D', // S
        '#FFE138', // T
        '#3877FF'  // Z
    ];
    
    // Tetris parçaları
    const PIECES = [
        [0], // Boş parça (index 0)
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
        [[2, 0, 0], [2, 2, 2], [0, 0, 0]],                         // J
        [[0, 0, 3], [3, 3, 3], [0, 0, 0]],                         // L
        [[0, 4, 4], [0, 4, 4], [0, 0, 0]],                         // O
        [[0, 5, 5], [5, 5, 0], [0, 0, 0]],                         // S
        [[0, 6, 0], [6, 6, 6], [0, 0, 0]],                         // T
        [[7, 7, 0], [0, 7, 7], [0, 0, 0]]                          // Z
    ];
    
    // Oyun durumu
    let board = createBoard();
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let requestId = null;
    let dropCounter = 0;
    let dropInterval = 1000; // Başlangıç hızı (ms)
    let lastTime = 0;
    
    // Aktif parça ve sonraki parça
    let piece = null;
    let nextPiece = null;
    
    // Skor elementleri
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const startButton = document.getElementById('start-button');
    
    // Oyun tahtasını oluştur
    function createBoard() {
        return Array.from({length: ROWS}, () => Array(COLS).fill(0));
    }
    
    // Rastgele parça oluştur
    function createPiece() {
        const pieceType = Math.floor(Math.random() * 7) + 1;
        return {
            type: pieceType,
            matrix: PIECES[pieceType],
            pos: {x: Math.floor(COLS / 2) - Math.floor(PIECES[pieceType][0].length / 2), y: 0}
        };
    }
    
    // Parçayı çiz
    function drawPiece(ctx, matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect(
                        (offset.x + x) * BLOCK_SIZE,
                        (offset.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(
                        (offset.x + x) * BLOCK_SIZE,
                        (offset.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE,
                        BLOCK_SIZE
                    );
                }
            });
        });
    }
    
    // Tahtayı çiz
    function drawBoard() {
        board.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = COLORS[value];
                    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    context.strokeStyle = '#000';
                    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
    
    // Ekranı temizle
    function clearCanvas() {
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        nextPieceContext.fillStyle = '#fff';
        nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    }
    
    // Çarpışma kontrolü
    function collide(board, piece) {
        const matrix = piece.matrix;
        const pos = piece.pos;
        
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0 &&
                    (board[y + pos.y] === undefined ||
                     board[y + pos.y][x + pos.x] === undefined ||
                     board[y + pos.y][x + pos.x] !== 0)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    // Parçayı tahtaya yerleştir
    function merge(board, piece) {
        piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + piece.pos.y][x + piece.pos.x] = value;
                }
            });
        });
    }
    
    // Parçayı döndür
    function rotate(matrix, dir) {
        // Matrisin transpozunu al
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < y; x++) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }
        
        // Satırları ters çevir (saat yönünde döndürmek için)
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            // Sütunları ters çevir (saat yönünün tersine döndürmek için)
            matrix.reverse();
        }
    }
    
    // Parçayı hareket ettir
    function playerMove(dir) {
        if (gameOver || paused) return;
        
        piece.pos.x += dir;
        if (collide(board, piece)) {
            piece.pos.x -= dir;
        }
    }
    
    // Parçayı döndür
    function playerRotate() {
        if (gameOver || paused) return;
        
        const pos = piece.pos.x;
        let offset = 1;
        rotate(piece.matrix, 1);
        
        // Döndürme sonrası çarpışma kontrolü ve düzeltme
        while (collide(board, piece)) {
            piece.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > piece.matrix[0].length) {
                rotate(piece.matrix, -1);
                piece.pos.x = pos;
                return;
            }
        }
    }
    
    // Parçayı aşağı düşür
    function playerDrop() {
        if (gameOver || paused) return;
        
        piece.pos.y++;
        if (collide(board, piece)) {
            piece.pos.y--;
            merge(board, piece);
            resetPiece();
            removeLines();
        }
        dropCounter = 0;
    }
    
    // Parçayı direkt en aşağıya düşür
    function playerHardDrop() {
        if (gameOver || paused) return;
        
        while (!collide(board, piece)) {
            piece.pos.y++;
        }
        piece.pos.y--;
        merge(board, piece);
        resetPiece();
        removeLines();
        dropCounter = 0;
    }
    
    // Tamamlanan satırları kaldır
    function removeLines() {
        let linesCleared = 0;
        
        outer: for (let y = board.length - 1; y >= 0; y--) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Satırı kaldır ve üstten yeni satır ekle
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++;
            linesCleared++;
        }
        
        // Puan hesapla
        if (linesCleared > 0) {
            lines += linesCleared;
            linesElement.textContent = lines;
            
            // Seviye kontrolü
            const newLevel = Math.floor(lines / 10) + 1;
            if (newLevel > level) {
                level = newLevel;
                levelElement.textContent = level;
                // Hızı artır
                dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            }
            
            // Puan hesapla
            switch (linesCleared) {
                case 1:
                    score += 100 * level;
                    break;
                case 2:
                    score += 300 * level;
                    break;
                case 3:
                    score += 500 * level;
                    break;
                case 4:
                    score += 800 * level;
                    break;
            }
            
            scoreElement.textContent = score;
        }
    }
    
    // Yeni parça oluştur
    function resetPiece() {
        piece = nextPiece || createPiece();
        nextPiece = createPiece();
        
        // Sonraki parçayı göster
        nextPieceContext.fillStyle = '#fff';
        nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
        drawPiece(
            nextPieceContext,
            nextPiece.matrix,
            {x: Math.floor(nextPieceCanvas.width / BLOCK_SIZE / 2) - Math.floor(nextPiece.matrix[0].length / 2),
             y: Math.floor(nextPieceCanvas.height / BLOCK_SIZE / 2) - Math.floor(nextPiece.matrix.length / 2)}
        );
        
        // Oyun sonu kontrolü
        if (collide(board, piece)) {
            gameOver = true;
            cancelAnimationFrame(requestId);
            requestId = null;
            startButton.textContent = 'Tekrar Oyna';
        }
    }
    
    // Oyun döngüsü
    function update(time = 0) {
        if (gameOver || paused) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
        
        draw();
        requestId = requestAnimationFrame(update);
    }
    
    // Çizim fonksiyonu
    function draw() {
        clearCanvas();
        drawBoard();
        drawPiece(context, piece.matrix, piece.pos);
    }
    
    // Oyunu başlat
    function startGame() {
        if (requestId) {
            cancelAnimationFrame(requestId);
            requestId = null;
        }
        
        // Oyun değişkenlerini sıfırla
        board = createBoard();
        score = 0;
        lines = 0;
        level = 1;
        dropInterval = 1000;
        gameOver = false;
        paused = false;
        
        // Skor göstergelerini güncelle
        scoreElement.textContent = score;
        levelElement.textContent = level;
        linesElement.textContent = lines;
        
        // İlk parçaları oluştur
        resetPiece();
        
        // Oyun döngüsünü başlat
        update();
        startButton.textContent = 'Yeniden Başlat';
    }
    
    // Oyunu duraklat/devam ettir
    function togglePause() {
        if (gameOver) return;
        
        paused = !paused;
        if (paused) {
            cancelAnimationFrame(requestId);
            requestId = null;
            
            // Duraklama mesajı göster
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = '16px Arial';
            context.fillStyle = '#fff';
            context.textAlign = 'center';
            context.fillText('OYUN DURAKLATILDI', canvas.width / 2, canvas.height / 2);
        } else {
            lastTime = performance.now();
            requestId = requestAnimationFrame(update);
        }
    }
    
    // Klavye kontrolleri
    document.addEventListener('keydown', event => {
        if (event.keyCode === 37) { // Sol ok
            playerMove(-1);
        } else if (event.keyCode === 39) { // Sağ ok
            playerMove(1);
        } else if (event.keyCode === 40) { // Aşağı ok
            playerDrop();
        } else if (event.keyCode === 38) { // Yukarı ok
            playerRotate();
        } else if (event.keyCode === 32) { // Boşluk
            playerHardDrop();
        } else if (event.keyCode === 80) { // P tuşu
            togglePause();
        }
    });
    
    // Başlat butonu
    startButton.addEventListener('click', startGame);
});