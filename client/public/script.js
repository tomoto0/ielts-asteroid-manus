// ============================================================
// IELTS Vocabulary Asteroid Game — Enhanced Visual Edition
// Game logic preserved; visuals upgraded with:
//   • Procedural starfield with parallax layers
//   • Neon-glow asteroid rendering with rocky silhouettes
//   • Particle explosion system on word destroy
//   • Floating score pop-ups
//   • Nebula background gradient
//   • Targeting laser beam
//   • Screen-edge danger flash
//   • TTS: English word readout + translated word after destruction
//   • Survival HP gauge: recovers on asteroid destroy, game over at 0
//   • Typing-based targeting: asteroid whose word starts with typed chars
//   • BGM: Holst Jupiter (public domain, Karajan / Internet Archive)
// ============================================================

let gameRunning = false;
let gamePaused = false;
let score = 0;
let asteroids = [];
let currentTypingTarget = null;
let selectedLanguage = 'ja';
let typedBuffer = '';
let keyboardHandlersBound = false;

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
// BGM is now an HTML5 Audio element (Jupiter MP3)
let bgmAudio = null;

// Use IELTS words if available, otherwise fallback
let gameWords = [];

// Track words destroyed in the current game session
let wordsDestroyedCount = 0;

// ── Survival HP Gauge ─────────────────────────────────────────
const HP_MAX = 100;
const HP_DAMAGE = 10;   // lost per missed asteroid
const HP_RECOVER = 15;  // gained per destroyed asteroid
let playerHP = HP_MAX;

// Asteroid class - will be defined after canvas is initialized
let Asteroid = null;

// ── Visual Systems ──────────────────────────────────────────

// Starfield
let stars = [];
const STAR_LAYERS = 3;

function initStars() {
    stars = [];
    const counts = [120, 70, 30];
    const speeds = [0.15, 0.35, 0.65];
    const sizes  = [0.8,  1.4,  2.2];
    for (let layer = 0; layer < STAR_LAYERS; layer++) {
        for (let i = 0; i < counts[layer]; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: sizes[layer] * (0.6 + Math.random() * 0.8),
                speed: speeds[layer] * (0.7 + Math.random() * 0.6),
                alpha: 0.3 + Math.random() * 0.7,
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.02 + Math.random() * 0.04,
                layer,
            });
        }
    }
}

function updateStars() {
    for (const s of stars) {
        s.y += s.speed;
        s.twinkle += s.twinkleSpeed;
        if (s.y > canvas.height + 4) {
            s.y = -4;
            s.x = Math.random() * canvas.width;
        }
    }
}

function drawStars() {
    for (const s of stars) {
        const a = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.layer === 2) {
            ctx.fillStyle = `rgba(200,230,255,${a})`;
            ctx.shadowColor = 'rgba(150,210,255,0.8)';
            ctx.shadowBlur = 6;
        } else {
            ctx.fillStyle = `rgba(180,210,255,${a})`;
            ctx.shadowBlur = 0;
        }
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawNebula() {
    const t = Date.now() * 0.0002;
    const blobs = [
        { x: canvas.width * 0.2,  y: canvas.height * 0.3, r: canvas.width * 0.35, c: `rgba(30,0,80,0.18)` },
        { x: canvas.width * 0.75, y: canvas.height * 0.6, r: canvas.width * 0.28, c: `rgba(0,40,80,0.15)` },
        { x: canvas.width * 0.5,  y: canvas.height * 0.15, r: canvas.width * 0.22, c: `rgba(0,60,40,0.10)` },
    ];
    for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, b.c);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.r, b.r * 0.6, t, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Particle system
let particles = [];

function spawnExplosion(x, y, color) {
    const count = 28 + Math.floor(Math.random() * 14);
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 1.5 + Math.random() * 5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 1.5 + Math.random() * 3.5,
            alpha: 1,
            decay: 0.02 + Math.random() * 0.025,
            color,
            type: Math.random() < 0.3 ? 'spark' : 'dot',
        });
    }
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.5;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: 4 + Math.random() * 6,
            alpha: 0.9,
            decay: 0.012 + Math.random() * 0.015,
            color: '#ffffff',
            type: 'chunk',
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.vx *= 0.98;
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        if (p.type === 'spark') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.r * 0.5;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
            ctx.stroke();
        } else if (p.type === 'chunk') {
            ctx.fillStyle = p.color;
            ctx.shadowColor = 'rgba(255,255,255,0.5)';
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * p.alpha, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// Floating score pop-ups
let scorePopups = [];

function spawnScorePopup(x, y, points) {
    scorePopups.push({ x, y, vy: -1.8, alpha: 1, text: `+${points}`, age: 0 });
}

function updateScorePopups() {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.y += p.vy;
        p.age++;
        p.alpha = Math.max(0, 1 - p.age / 55);
        if (p.alpha <= 0) scorePopups.splice(i, 1);
    }
}

function drawScorePopups() {
    for (const p of scorePopups) {
        ctx.globalAlpha = p.alpha;
        ctx.font = 'bold 22px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 12;
        ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

// Danger flash when asteroid reaches bottom
let dangerFlash = 0;

function triggerDangerFlash() {
    dangerFlash = 1.0;
}

function drawDangerFlash() {
    if (dangerFlash <= 0) return;
    ctx.fillStyle = `rgba(255,30,30,${dangerFlash * 0.18})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const bw = 6;
    ctx.strokeStyle = `rgba(255,30,30,${dangerFlash * 0.7})`;
    ctx.lineWidth = bw * 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    dangerFlash = Math.max(0, dangerFlash - 0.04);
}

// ── HP Bar HUD ────────────────────────────────────────────────
function drawHPBar() {
    const barW = 180;
    const barH = 14;
    const barX = canvas.width - barW - 20;
    const barY = 20;
    const ratio = Math.max(0, playerHP / HP_MAX);

    // Background track
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    if (ratio > 0) {
        // Gradient fill: green at full, red at empty
        const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        grad.addColorStop(0, '#ff3366');
        grad.addColorStop(0.4, '#ffe600');
        grad.addColorStop(1, '#00ff88');
        ctx.fillStyle = grad;
        ctx.shadowColor = ratio > 0.6 ? '#00ff88' : ratio > 0.3 ? '#ffe600' : '#ff3366';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * ratio, barH, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.stroke();

    // Label
    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(200,240,255,0.7)';
    ctx.fillText('HP  ' + Math.ceil(playerHP) + '%', barX - 6, barY + barH - 1);
}

function getTypingDisplay() {
    return document.getElementById('textInput');
}

function getCurrentTargetLabel() {
    return document.getElementById('currentTarget');
}

function getTargetBottom(target) {
    return target.y + target.size;
}

// ── Typing-based target selection ────────────────────────────
// Returns the asteroid whose word starts with `prefix` (case-insensitive).
// If multiple match, prefer the one closest to the bottom.
function findMatchingAsteroid(prefix) {
    if (!prefix || asteroids.length === 0) return null;
    const lower = prefix.toLowerCase();
    let best = null;
    for (const a of asteroids) {
        if (a.wordKey.startsWith(lower)) {
            if (!best || getTargetBottom(a) > getTargetBottom(best)) {
                best = a;
            }
        }
    }
    return best;
}

function syncTypingUi() {
    const displayInput = getTypingDisplay();
    if (displayInput) {
        displayInput.textContent = currentTypingTarget
            ? currentTypingTarget.word.substring(0, typedBuffer.length)
            : typedBuffer;
    }

    const currentTargetLabel = getCurrentTargetLabel();
    if (currentTargetLabel) {
        currentTargetLabel.textContent = currentTypingTarget
            ? 'Target: ' + currentTypingTarget.word
            : (typedBuffer ? 'Target: ?' : 'Target: None');
    }
}

// Track the last word spoken so we don't repeat on every syncTypingState call
let lastSpokenWord = '';

function syncTypingState() {
    // If current target was removed (destroyed / fell off), clear it
    if (currentTypingTarget && !asteroids.includes(currentTypingTarget)) {
        currentTypingTarget = null;
        // Keep typedBuffer so user can re-match another asteroid
    }

    // Re-evaluate target based on current typedBuffer
    if (typedBuffer.length > 0) {
        const match = findMatchingAsteroid(typedBuffer);
        if (match && match !== currentTypingTarget) {
            currentTypingTarget = match;
            // Speak the new target word if it changed
            if (currentTypingTarget.word !== lastSpokenWord) {
                lastSpokenWord = currentTypingTarget.word;
                speakEnglish(currentTypingTarget.word);
            }
        } else if (!match) {
            // No asteroid matches the current buffer — keep target as-is
            // (user typed a wrong char; handleGameKeydown will reset buffer)
        }
    } else {
        // Buffer is empty: no active target
        currentTypingTarget = null;
        lastSpokenWord = '';
    }

    for (const asteroid of asteroids) {
        const isTarget = asteroid === currentTypingTarget;
        asteroid.isTargeted = isTarget;
        asteroid.typedChars = isTarget ? typedBuffer.length : 0;
    }

    syncTypingUi();
    return currentTypingTarget;
}

function clearTypingState() {
    typedBuffer = '';
    currentTypingTarget = null;
    lastSpokenWord = '';
    syncTypingState();
}

function resetTypedBuffer() {
    typedBuffer = '';
    currentTypingTarget = null;
    lastSpokenWord = '';
    syncTypingState();
}

function getTypedCharacter(event) {
    if (event.key && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        return event.key.toLowerCase();
    }

    if (typeof event.code === 'string' && /^Key[A-Z]$/.test(event.code)) {
        return event.code.slice(3).toLowerCase();
    }

    return null;
}

function shouldIgnoreGameKeydown() {
    const active = document.activeElement;

    if (!active) return false;
    if (active.isContentEditable) return true;
    if (active instanceof HTMLTextAreaElement) return true;
    if (active instanceof HTMLSelectElement) {
        const overlay = document.getElementById('gameOverlay');
        const overlayVisible = overlay && overlay.style.display !== 'none';
        return !!overlayVisible;
    }
    if (active instanceof HTMLInputElement) {
        return !active.readOnly;
    }

    return false;
}

function spawnAsteroid() {
    if (!Asteroid || !gameRunning) return;

    asteroids.push(new Asteroid());
    syncTypingState();
}

function completeCurrentTypingTarget() {
    if (!currentTypingTarget) return;

    const completedTarget = currentTypingTarget;
    score += 10;
    wordsDestroyedCount++;
    playSound(1200, 0.2);

    // Recover HP on successful destroy (capped at HP_MAX)
    playerHP = Math.min(HP_MAX, playerHP + HP_RECOVER);

    const ex = completedTarget.x + completedTarget.size / 2;
    const ey = completedTarget.y + completedTarget.size / 2;
    spawnExplosion(ex, ey, completedTarget.colorScheme.glow);
    spawnScorePopup(ex, ey - completedTarget.size / 2, 10);

    // Speak the translation of the destroyed word in the selected language
    speakTranslation(completedTarget.word, selectedLanguage);

    asteroids = asteroids.filter((asteroid) => asteroid !== completedTarget);
    typedBuffer = '';
    currentTypingTarget = null;
    lastSpokenWord = '';
    syncTypingState();

    if (gameRunning) {
        spawnAsteroid();
    }
}

function handleGameKeydown(e) {
    // Tab -> AI help (works in all states)
    if (e.key === 'Tab' && gameRunning) {
        e.preventDefault();
        const helpButton = document.getElementById('helpButton');
        if (helpButton) helpButton.click();
        return;
    }

    if (!gameRunning || gamePaused) return;
    if (e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (shouldIgnoreGameKeydown()) return;

    if (e.key === 'Backspace') {
        e.preventDefault();
        if (typedBuffer.length > 0) {
            typedBuffer = typedBuffer.slice(0, -1);
            // Re-evaluate target with the shorter buffer
            syncTypingState();
        }
        return;
    }

    const char = getTypedCharacter(e);
    if (!char) return;
    e.preventDefault();

    // Try extending the buffer with this character
    const newBuffer = typedBuffer + char;

    // Check if any asteroid matches the new buffer
    const match = findMatchingAsteroid(newBuffer);
    if (!match) {
        // No match: wrong key — reset buffer and clear target
        playSound(300, 0.1);
        resetTypedBuffer();
        return;
    }

    // Valid character: accept it
    typedBuffer = newBuffer;
    playSound(800, 0.1);

    // Update target to the matching asteroid
    if (currentTypingTarget !== match) {
        currentTypingTarget = match;
        if (currentTypingTarget.word !== lastSpokenWord) {
            lastSpokenWord = currentTypingTarget.word;
            speakEnglish(currentTypingTarget.word);
        }
    }

    // Sync visual state
    for (const asteroid of asteroids) {
        const isTarget = asteroid === currentTypingTarget;
        asteroid.isTargeted = isTarget;
        asteroid.typedChars = isTarget ? typedBuffer.length : 0;
    }
    syncTypingUi();

    // Check if word is complete
    if (typedBuffer.toLowerCase() === currentTypingTarget.wordKey) {
        completeCurrentTypingTarget();
    }
}

function bindKeyboardHandlers() {
    if (keyboardHandlersBound) return;

    window.addEventListener('keydown', handleGameKeydown, true);

    keyboardHandlersBound = true;
}

// Targeting laser beam from bottom-center to current target
function drawTargetingLaser() {
    if (!currentTypingTarget) return;
    const tx = currentTypingTarget.x + currentTypingTarget.size / 2;
    const ty = currentTypingTarget.y + currentTypingTarget.size / 2;
    const bx = canvas.width / 2;
    const by = canvas.height - 30;

    const grad = ctx.createLinearGradient(bx, by, tx, ty);
    grad.addColorStop(0, 'rgba(0,255,136,0)');
    grad.addColorStop(0.3, 'rgba(0,255,136,0.25)');
    grad.addColorStop(1, 'rgba(0,229,255,0.55)');

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
}

// ── TTS Functions ─────────────────────────────────────────────

function speakEnglish(word) {
    if (!soundEnabled) return;
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
    } catch (e) {
        console.warn('[TTS] speakEnglish error:', e);
    }
}

async function speakTranslation(word, lang) {
    if (!soundEnabled) return;
    if (!('speechSynthesis' in window)) return;
    if (lang === 'en') return;
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word, targetLang: lang }),
        });
        if (!response.ok) return;
        const data = await response.json();
        const translation = data.translation;
        if (!translation) return;

        const ttsLang = ttsLanguageCodes[lang] || 'ja-JP';
        setTimeout(() => {
            try {
                const utterance = new SpeechSynthesisUtterance(translation);
                utterance.lang = ttsLang;
                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                utterance.volume = 0.9;
                window.speechSynthesis.speak(utterance);
            } catch (e) {
                console.warn('[TTS] speakTranslation utterance error:', e);
            }
        }, 600);
    } catch (e) {
        console.warn('[TTS] speakTranslation fetch error:', e);
    }
}

// ── Sound Effects ────────────────────────────────────────────

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

// ── BGM: Jupiter (Holst) ─────────────────────────────────────

function initBGM() {
    if (bgmAudio) return; // already created
    bgmAudio = new Audio('/manus-storage/jupiter_2ce0daed.mp3');
    bgmAudio.loop = true;
    bgmAudio.volume = 0.35;
    bgmAudio.preload = 'auto';
}

function startBGM() {
    if (!bgmEnabled) return;
    initBGM();
    // Resume AudioContext if needed (browser autoplay policy)
    bgmAudio.play().catch((e) => {
        console.warn('[BGM] Autoplay blocked, will play on next interaction:', e);
    });
}

function stopBGM() {
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
}

// ── Asteroid Class ────────────────────────────────────────────

const ASTEROID_COLORS = [
    { stroke: '#00e5ff', glow: '#00e5ff', fill: 'rgba(0,100,180,0.15)' },
    { stroke: '#bf00ff', glow: '#bf00ff', fill: 'rgba(80,0,140,0.15)' },
    { stroke: '#ff3366', glow: '#ff3366', fill: 'rgba(140,0,60,0.15)' },
    { stroke: '#ff8800', glow: '#ff8800', fill: 'rgba(140,60,0,0.15)' },
    { stroke: '#00ff88', glow: '#00ff88', fill: 'rgba(0,120,60,0.15)' },
];

function initializeAsteroidClass() {
    if (!canvas || !ctx) {
        console.error('Canvas not initialized');
        return;
    }

    Asteroid = class {
        constructor() {
            this.word = gameWords[Math.floor(Math.random() * gameWords.length)];
            this.wordKey = this.word.toLowerCase();
            this.x = Math.random() * (canvas.width - 120) + 10;
            this.y = -70;
            this.speed = 0.5 + Math.random() * 1.5;
            this.size = 90 + Math.random() * 60;
            this.rotation = 0;
            this.rotationSpeed = (Math.random() - 0.5) * 0.012;
            this.typedChars = 0;
            this.isTargeted = false;
            this.colorScheme = ASTEROID_COLORS[Math.floor(Math.random() * ASTEROID_COLORS.length)];
            this.points = this._generatePoints();
            this.pulsePhase = Math.random() * Math.PI * 2;
        }

        _generatePoints() {
            const pts = [];
            const sides = 11;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const r = (this.size / 2) * (0.72 + Math.random() * 0.38);
                pts.push({ angle, r });
            }
            return pts;
        }

        update() {
            this.y += this.speed;
            this.rotation += this.rotationSpeed;
            this.pulsePhase += 0.04;
        }

        draw() {
            const cx = this.x + this.size / 2;
            const cy = this.y + this.size / 2;
            const pulse = 0.7 + 0.3 * Math.sin(this.pulsePhase);
            const scheme = this.isTargeted
                ? { stroke: '#ffe600', glow: '#ffe600', fill: 'rgba(80,60,0,0.2)' }
                : this.colorScheme;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.rotation);

            const glowRadius = this.size / 2 + 18;
            const halo = ctx.createRadialGradient(0, 0, this.size / 2 * 0.6, 0, 0, glowRadius);
            halo.addColorStop(0, scheme.fill);
            halo.addColorStop(0.6, scheme.fill.replace('0.15', `${0.08 * pulse}`));
            halo.addColorStop(1, 'transparent');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            for (let i = 0; i < this.points.length; i++) {
                const p = this.points[i];
                const x = Math.cos(p.angle) * p.r;
                const y = Math.sin(p.angle) * p.r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();

            const bodyGrad = ctx.createRadialGradient(-this.size * 0.15, -this.size * 0.15, 0, 0, 0, this.size / 2);
            bodyGrad.addColorStop(0, scheme.fill.replace('0.15', '0.35'));
            bodyGrad.addColorStop(1, scheme.fill.replace('0.15', '0.08'));
            ctx.fillStyle = bodyGrad;
            ctx.fill();

            ctx.strokeStyle = scheme.stroke;
            ctx.lineWidth = this.isTargeted ? 2.5 : 1.8;
            ctx.shadowColor = scheme.glow;
            ctx.shadowBlur = 14 * pulse;
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = scheme.stroke.replace(')', ',0.2)').replace('rgb', 'rgba');
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 3; i++) {
                const cr = (this.size * 0.08) + i * (this.size * 0.06);
                const cx2 = (Math.random() - 0.5) * this.size * 0.3;
                const cy2 = (Math.random() - 0.5) * this.size * 0.3;
                ctx.beginPath();
                ctx.arc(cx2, cy2, cr, 0, Math.PI * 1.4);
                ctx.stroke();
            }

            ctx.restore();

            // Word label below asteroid
            const textY = this.y + this.size + 52;
            const fontSize = Math.min(22, Math.max(14, this.size * 0.22));
            ctx.font = `bold ${fontSize}px "Orbitron", "Share Tech Mono", monospace`;
            ctx.textAlign = 'center';

            const typedPart = this.word.substring(0, this.typedChars);
            const remainingPart = this.word.substring(this.typedChars);

            const typedWidth = ctx.measureText(typedPart).width;
            const remainingWidth = ctx.measureText(remainingPart).width;
            const totalWidth = typedWidth + remainingWidth;
            const startX = cx - totalWidth / 2;

            const padX = 10, padY = 6;
            ctx.fillStyle = 'rgba(5,10,25,0.7)';
            ctx.beginPath();
            ctx.roundRect(startX - padX, textY - fontSize - padY, totalWidth + padX * 2, fontSize + padY * 2, 4);
            ctx.fill();

            if (this.typedChars > 0) {
                ctx.fillStyle = '#ffe600';
                ctx.shadowColor = '#ffe600';
                ctx.shadowBlur = 10;
                ctx.fillText(typedPart, startX + typedWidth / 2, textY);
            }

            const remainColor = this.isTargeted ? scheme.stroke : '#e0f4ff';
            ctx.fillStyle = remainColor;
            ctx.shadowColor = this.isTargeted ? scheme.glow : 'rgba(200,240,255,0.5)';
            ctx.shadowBlur = this.isTargeted ? 10 : 4;
            ctx.fillText(remainingPart, startX + typedWidth + remainingWidth / 2, textY);

            ctx.shadowBlur = 0;
        }

        isOffScreen() {
            return this.y > canvas.height + 50;
        }
    };
}

// ── Game Loop ─────────────────────────────────────────────────

function gameLoop() {
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#050a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNebula();
    drawStars();

    if (!gamePaused && gameRunning) {
        updateStars();
        updateParticles();
        updateScorePopups();

        for (let i = asteroids.length - 1; i >= 0; i--) {
            asteroids[i].update();
            if (asteroids[i].isOffScreen()) {
                triggerDangerFlash();
                if (currentTypingTarget === asteroids[i]) {
                    currentTypingTarget = null;
                    typedBuffer = '';
                    lastSpokenWord = '';
                }
                asteroids.splice(i, 1);
                playerHP -= HP_DAMAGE;
                if (playerHP <= 0) {
                    playerHP = 0;
                    endGame();
                    return;
                }
                spawnAsteroid();
            }
        }
    }

    drawTargetingLaser();

    for (const asteroid of asteroids) {
        asteroid.draw();
    }

    drawParticles();
    drawScorePopups();
    drawDangerFlash();

    // HUD: Score
    ctx.font = 'bold 20px "Orbitron", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 12;
    ctx.fillText('SCORE  ' + score, 20, 36);

    // HUD: Words destroyed
    ctx.font = '13px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(0,229,255,0.7)';
    ctx.shadowColor = 'rgba(0,229,255,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText('WORDS  ' + wordsDestroyedCount, 20, 58);

    ctx.shadowBlur = 0;

    drawHPBar();

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

// ── Game State Functions ──────────────────────────────────────

function startGame() {
    console.log('startGame called');
    if (!canvas || !ctx) {
        console.error('Canvas not initialized');
        return;
    }

    const gameOverlay = document.getElementById('gameOverlay');
    const typingInput = document.getElementById('typingInput');
    const aiPanel = document.getElementById('aiPanel');

    gameRunning = true;
    gamePaused = false;
    score = 0;
    asteroids = [];
    particles = [];
    scorePopups = [];
    currentTypingTarget = null;
    typedBuffer = '';
    wordsDestroyedCount = 0;
    playerHP = HP_MAX;
    lastSpokenWord = '';

    gameOverlay.style.display = 'none';
    aiPanel.style.display = 'block';
    typingInput.style.display = 'flex';

    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    document.body.focus();

    syncTypingState();

    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    if (pauseButton) {
        pauseButton.textContent = '⏸ Pause';
        pauseButton.style.display = 'inline-block';
    }
    if (menuButton) menuButton.style.display = 'inline-block';

    if (bgmEnabled) startBGM();

    spawnAsteroid();

    for (let i = 1; i < 3; i++) {
        setTimeout(() => {
            spawnAsteroid();
        }, i * 1000);
    }

    gameLoop();
}

function endGame() {
    gameRunning = false;
    stopBGM();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    clearTypingState();
    const gameOverlay = document.getElementById('gameOverlay');
    gameOverlay.style.display = 'flex';
    gameOverlay.querySelector('h1').textContent = 'Game Over!';
    gameOverlay.querySelector('p').textContent = 'Final Score: ' + score;

    saveScoreToLeaderboard(score, wordsDestroyedCount, selectedLanguage);
}

async function saveScoreToLeaderboard(finalScore, wordsDestroyed, language) {
    if (finalScore <= 0) return;
    try {
        const playerName = window.prompt('Enter your name for the leaderboard:', 'Player') || 'Anonymous';
        const trimmedName = playerName.trim().slice(0, 64) || 'Anonymous';

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
        if (bgmAudio) bgmAudio.pause();
    } else {
        pauseButton.textContent = '⏸ Pause';
        if (bgmEnabled && bgmAudio) bgmAudio.play().catch(() => {});
        gameLoop();
    }
}

function returnToMenu() {
    gameRunning = false;
    gamePaused = false;
    stopBGM();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    asteroids = [];
    particles = [];
    scorePopups = [];
    clearTypingState();
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

// ── Initialization ────────────────────────────────────────────

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

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initStars();
    }
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    console.log('[script.js] Canvas initialized:', canvas.width, 'x', canvas.height);

    initStars();
    initializeAsteroidClass();
    initBGM(); // Pre-load Jupiter audio

    if (typeof ieltsWords !== 'undefined' && ieltsWords.length > 0) {
        gameWords = ieltsWords.map((word) => String(word));
        console.log('[script.js] Loaded', gameWords.length, 'IELTS words');
    } else {
        console.warn('[script.js] IELTS words not loaded, using fallback');
        gameWords = ['Active', 'Antique', 'Benefit', 'Culture', 'Journey'];
    }

    const startButton = document.getElementById('startButton');
    const translationLanguageSelect = document.getElementById('translationLanguage');
    const pauseButton = document.getElementById('pauseButton');
    const menuButton = document.getElementById('menuButton');
    const soundToggle = document.getElementById('soundToggle');
    const bgmToggle = document.getElementById('bgmToggle');

    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    if (translationLanguageSelect) {
        translationLanguageSelect.addEventListener('change', (e) => {
            selectedLanguage = e.target.value;
        });
    }

    bindKeyboardHandlers();
    syncTypingState();

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
            if (!soundEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        });
    }

    if (bgmToggle) {
        bgmToggle.addEventListener('click', () => {
            bgmEnabled = !bgmEnabled;
            bgmToggle.textContent = bgmEnabled ? '🎵 BGM: ON' : '🎵 BGM: OFF';
            if (bgmEnabled && gameRunning) {
                startBGM();
            } else {
                if (bgmAudio) bgmAudio.pause();
            }
        });
    }

    function idleLoop() {
        if (gameRunning) return;
        ctx.fillStyle = '#050a14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawNebula();
        updateStars();
        drawStars();
        requestAnimationFrame(idleLoop);
    }
    idleLoop();

    console.log('[script.js] Game initialized successfully');
}

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

function getHelpTip() {
    const aiMessage = document.getElementById('aiMessage');
    aiMessage.textContent = 'Getting advice...';
}
