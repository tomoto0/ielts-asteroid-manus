// Game state
let gameRunning = false;
let gamePaused = false;
let score = 0;
let asteroids = [];
let currentTypingTarget = null;
let selectedLanguage = 'ja';

// Canvas and context - will be initialized later
let canvas = null;
let ctx = null;

// TTS Language Codes
const ttsLanguageCodes = {
    'ja': 'ja-JP',
    'es': 'es-ES',
    'zh': 'zh-CN',
    'fr': 'fr-FR',
    'it': 'it-IT',
    'ko': 'ko-KR',
    'ar': 'ar-SA',
    'hi': 'hi-IN',
    'ru': 'ru-RU',
    'id': 'id-ID',
    'pt': 'pt-PT'
};

// Audio Control State
let soundEnabled = true;
let bgmEnabled = true;
let bgmAudioContext = null;
let bgmOscillator = null;
let bgmGainNode = null;

// Use IELTS words if available, otherwise fallback
let gameWords = [];

// Track words destroyed in the current game session
let wordsDestroyedCount = 0;

// Asteroid class - will be defined after canvas is initialized
let Asteroid = null;

// Sound effects
function playSound(frequency, duration) {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Sound not available:', e);
    }
}

// BGM
function startBGM() {
    if (!bgmEnabled) return;
    
    try {
        bgmAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        bgmOscillator = bgmAudioContext.createOscillator();
        bgmGainNode = bgmAudioContext.createGain();
        
        bgmOscillator.connect(bgmGainNode);
        bgmGainNode.connect(bgmAudioContext.destination);
        
        bgmOscillator.frequency.value = 200;
        bgmOscillator.type = 'sine';
        
        bgmGainNode.gain.setValueAtTime(0.1, bgmAudioContext.currentTime);
        
        bgmOscillator.start(bgmAudioContext.currentTime);
    } catch (e) {
        console.log('BGM not available:', e);
    }
}

function stopBGM() {
    if (bgmOscillator) {
        bgmOscillator.stop();
        bgmOscillator = null;
    }
}

// Initialize Asteroid class after canvas is available
function initializeAsteroidClass() {
    if (!canvas || !ctx) {
        console.error('Canvas not initialized');
        return;
    }

    Asteroid = class {
        constructor() {
            this.word = gameWords[Math.floor(Math.random() * gameWords.length)];
            this.x = Math.random() * (canvas.width - 100);
            this.y = -50;
            this.speed = 0.5 + Math.random() * 1.5;
            this.size = 90 + Math.random() * 60;
            this.rotation = 0;
            this.rotationSpeed = (Math.random() - 0.5) * 0.1;
            this.typedChars = 0;
            this.isTargeted = false;
            this.color = '#ffffff';
        }

        update() {
            this.y += this.speed;
            this.rotation += this.rotationSpeed;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x + this.size/2, this.y + this.size/2);
            ctx.rotate(this.rotation);
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const sides = 8;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const radius = this.size/2 + Math.sin(angle * 3) * 5;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.restore();
            
            ctx.fillStyle = this.color;
            ctx.font = '48px monospace';
            ctx.textAlign = 'center';
            
            const typedPart = this.word.substring(0, this.typedChars);
            const remainingPart = this.word.substring(this.typedChars);

            ctx.textAlign = 'center';
            const textY = this.y + this.size + 40;

            const typedWidth = ctx.measureText(typedPart).width;
            const remainingWidth = ctx.measureText(remainingPart).width;
            const totalWidth = typedWidth + remainingWidth;

            const startX = this.x + this.size / 2 - totalWidth / 2;

            if (this.typedChars > 0) {
                ctx.fillStyle = '#ffff00';
                ctx.fillText(typedPart, startX + typedWidth / 2, textY);
            }

            ctx.fillStyle = this.color;
            ctx.fillText(remainingPart, startX + typedWidth + remainingWidth / 2, textY);
        }

        isOffScreen() {
            return this.y > canvas.height + 50;
        }
    };
}

// Game loop
function gameLoop() {
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0b0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gamePaused && gameRunning) {
        // Update asteroids
        for (let i = asteroids.length - 1; i >= 0; i--) {
            asteroids[i].update();

            if (asteroids[i].isOffScreen()) {
                asteroids.splice(i, 1);
                // Game over
                endGame();
                return;
            }
        }
    }

    // Draw asteroids
    for (let asteroid of asteroids) {
        asteroid.draw();
    }

    // Draw score
    ctx.fillStyle = '#00ff00';
    ctx.font = '24px monospace';
    ctx.fillText('Score: ' + score, 20, 30);

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    console.log('startGame called');
    if (!canvas || !ctx) {
        console.error('Canvas not initialized');
        return;
    }

    const gameOverlay = document.getElementById('gameOverlay');
    const typingInput = document.getElementById('typingInput');
    const textInput = document.getElementById('textInput');
    const aiPanel = document.getElementById('aiPanel');

    gameRunning = true;
    gamePaused = false;
    score = 0;
    asteroids = [];
    currentTypingTarget = null;
    wordsDestroyedCount = 0;
    
    gameOverlay.style.display = 'none';
    aiPanel.style.display = 'block';
    typingInput.style.display = 'block';
    
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    if (pauseButton) pauseButton.style.display = 'inline-block';
    if (menuButton) menuButton.style.display = 'inline-block';
    
    setTimeout(() => {
        if (textInput) {
            textInput.focus();
        }
    }, 100);
    
    if (bgmEnabled) {
        startBGM();
    }
    
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            if (Asteroid && gameRunning) {
                asteroids.push(new Asteroid());
            }
        }, i * 1000);
    }
    
    gameLoop();
}

function endGame() {
    gameRunning = false;
    stopBGM();
    const gameOverlay = document.getElementById('gameOverlay');
    gameOverlay.style.display = 'flex';
    gameOverlay.querySelector('h1').textContent = 'Game Over!';
    gameOverlay.querySelector('p').textContent = 'Final Score: ' + score;

    // Save score to leaderboard via tRPC
    saveScoreToLeaderboard(score, wordsDestroyedCount, selectedLanguage);
}

// Save score to the server leaderboard
async function saveScoreToLeaderboard(finalScore, wordsDestroyed, language) {
    if (finalScore <= 0) return; // Don't save zero scores
    try {
        // Prompt for player name
        const playerName = window.prompt('Enter your name for the leaderboard:', 'Player') || 'Anonymous';
        const trimmedName = playerName.trim().slice(0, 64) || 'Anonymous';

        // tRPC HTTP mutation: POST /api/trpc/scores.save with superjson body
        const response = await fetch('/api/trpc/scores.save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                json: {
                    playerName: trimmedName,
                    score: finalScore,
                    wordsDestroyed: wordsDestroyed,
                    language: language || 'ja',
                }
            }),
        });
        if (response.ok) {
            console.log('[Score] Saved to leaderboard');
            // Trigger leaderboard refresh in React
            if (typeof window.__refreshLeaderboard === 'function') {
                window.__refreshLeaderboard();
            }
        } else {
            const errText = await response.text();
            console.warn('[Score] Server error:', errText);
        }
    } catch (err) {
        console.warn('[Score] Failed to save score:', err);
    }
}

function pauseGame() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    const pauseButton = document.getElementById('pauseButton');
    if (gamePaused) {
        pauseButton.textContent = '▶ Resume';
        pauseButton.style.backgroundColor = '#ffa500';
    } else {
        pauseButton.textContent = '⏸ Pause';
        pauseButton.style.backgroundColor = '#007bff';
        gameLoop();
    }
}

function returnToMenu() {
    gameRunning = false;
    gamePaused = false;
    stopBGM();
    asteroids = [];
    const gameOverlay = document.getElementById('gameOverlay');
    const typingInput = document.getElementById('typingInput');
    const aiPanel = document.getElementById('aiPanel');
    gameOverlay.style.display = 'flex';
    gameOverlay.querySelector('h1').textContent = 'IELTS Vocabulary Asteroid Game';
    gameOverlay.querySelector('p').textContent = 'Type the words on the asteroids to destroy them!';
    typingInput.style.display = 'none';
    aiPanel.style.display = 'none';
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    if (pauseButton) pauseButton.style.display = 'none';
    if (menuButton) menuButton.style.display = 'none';
}

// Initialize game when DOM is ready
function initializeGame() {
    console.log('[script.js] Initializing game...');
    
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('[script.js] Canvas element not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('[script.js] Failed to get canvas context!');
        return;
    }

    console.log('[script.js] Canvas initialized:', canvas.width, 'x', canvas.height);

    // Initialize Asteroid class now that canvas is ready
    initializeAsteroidClass();

    const startButton = document.getElementById('startButton');
    const translationLanguageSelect = document.getElementById('translationLanguage');
    const textInput = document.getElementById('textInput');
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    const soundToggle = document.getElementById('soundToggle');
    const bgmToggle = document.getElementById('bgmToggle');

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Use IELTS words if available
    if (typeof ieltsWords !== 'undefined' && ieltsWords.length > 0) {
        gameWords = ieltsWords;
        console.log('[script.js] Loaded', gameWords.length, 'IELTS words');
    } else {
        console.warn('[script.js] IELTS words not loaded, using fallback');
        gameWords = ['abandon', 'ability', 'able', 'about', 'above'];
    }

    // Event listeners
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    if (translationLanguageSelect) {
        translationLanguageSelect.addEventListener('change', (e) => {
            selectedLanguage = e.target.value;
        });
    }

    if (textInput) {
        textInput.addEventListener('keydown', (e) => {
            if (!gameRunning || gamePaused) return;

            const char = e.key.toLowerCase();
            if (!/^[a-z]$/.test(char)) return;

            e.preventDefault();

            if (asteroids.length === 0) return;

            // Find target asteroid
            if (!currentTypingTarget) {
                currentTypingTarget = asteroids[0];
                currentTypingTarget.isTargeted = true;
            }

            // Check if character matches
            if (char === currentTypingTarget.word[currentTypingTarget.typedChars]) {
                currentTypingTarget.typedChars++;
                playSound(800, 0.1);

                // Word complete
                if (currentTypingTarget.typedChars === currentTypingTarget.word.length) {
                    score += 10;
                    wordsDestroyedCount++;
                    playSound(1200, 0.2);
                    asteroids = asteroids.filter(a => a !== currentTypingTarget);
                    currentTypingTarget = null;

                    // Spawn new asteroid
                    if (gameRunning) {
                        asteroids.push(new Asteroid());
                    }
                }
            } else {
                playSound(300, 0.1);
                currentTypingTarget.typedChars = 0;
            }

            textInput.value = '';
        });
    }

    if (pauseButton) {
        pauseButton.addEventListener('click', pauseGame);
    }

    if (menuButton) {
        menuButton.addEventListener('click', returnToMenu);
    }

    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundToggle.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        });
    }

    if (bgmToggle) {
        bgmToggle.addEventListener('click', () => {
            bgmEnabled = !bgmEnabled;
            bgmToggle.textContent = bgmEnabled ? '🎵 BGM: ON' : '🎵 BGM: OFF';
        });
    }

    console.log('[script.js] Game initialized successfully');
}

// Initialize when DOM is ready
console.log('[script.js] Script loaded, document.readyState:', document.readyState);

function initGameWhenReady() {
    console.log('[script.js] initGameWhenReady called');
    
    const canvas = document.getElementById('gameCanvas');
    const startButton = document.getElementById('startButton');
    
    console.log('[script.js] DOM check - canvas:', !!canvas, 'startButton:', !!startButton);
    
    if (canvas && startButton && typeof initializeGame === 'function') {
        console.log('[script.js] Calling initializeGame()...');
        try {
            initializeGame();
            console.log('[script.js] initializeGame() completed successfully');
        } catch (error) {
            console.error('[script.js] Error in initializeGame():', error);
        }
    } else {
        console.log('[script.js] Not ready yet, retrying...');
        setTimeout(initGameWhenReady, 500);
    }
}

if (document.readyState === 'loading') {
    console.log('[script.js] Document is loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[script.js] DOMContentLoaded fired');
        setTimeout(initGameWhenReady, 500);
    });
} else {
    console.log('[script.js] Document already loaded, calling initGameWhenReady immediately');
    setTimeout(initGameWhenReady, 1000);
}

// Help function
function getHelpTip() {
    const aiMessage = document.getElementById('aiMessage');
    aiMessage.textContent = 'Getting advice...';
}
