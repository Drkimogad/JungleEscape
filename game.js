// ============================================
// JUNGLE ESCAPE - Complete Game Engine
// ============================================

// ---------- GAME STATE ----------
let currentLevel = 1;
let lives = 3;
let bananas = 0;
let gameRunning = true;
let levelComplete = false;
let currentSegmentIndex = 0;
let segmentProgress = 0;
let monkeyX = 100;  // Fixed X position, world moves past him
let monkeyY = 280;  // Ground Y position
let worldOffset = 0;
let currentAction = null;  // 'jump', 'slide', or null
let actionCooldown = 0;
let invincibleFrames = 0;
let messageTimeout = null;

// ---------- SEGMENT TYPE VARIABLES ----------
let currentSegment = null;
let ropeIndex = 0;
let ropeSwingProgress = 0;
let ropeReleased = false;
let ropeGrabWindow = false;
let climbingTree = false;
let treeClimbProgress = 0;
let inTunnel = false;
let tunnelProgress = 0;

// ---------- OBSTACLES ----------
let obstacles = [];
let bananas_list = [];

// ---------- DOM ELEMENTS ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const livesSpan = document.getElementById('lives');
const scoreSpan = document.getElementById('score');
const levelNameSpan = document.getElementById('level-name');
const messageDiv = document.getElementById('game-message');

// ---------- LEVEL DATA (loaded from level files) ----------
const levels = {
    1: level1,
    2: level2,
    3: level3,
    4: level4,
    5: level5
};

let activeLevel = null;

// ---------- HELPER FUNCTIONS ----------
function showMessage(msg, isError = false) {
    messageDiv.textContent = msg;
    messageDiv.style.color = isError ? '#ff8888' : '#ffd966';
    if (messageTimeout) clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
        if (messageDiv.textContent === msg) {
            messageDiv.textContent = '⬆️ JUMP over obstacles  |  ⬇️ SLIDE under branches';
        }
    }, 2000);
}

function updateUI() {
    livesSpan.textContent = lives;
    scoreSpan.textContent = bananas;
}

function loseLife() {
    if (invincibleFrames > 0) return;
    if (!gameRunning) return;
    
    lives--;
    updateUI();
    
    if (lives <= 0) {
        gameRunning = false;
        showMessage('💀 GAME OVER! Click a level to try again 💀', true);
    } else {
        invincibleFrames = 60;  // 1 second invincibility
        showMessage(`💔 Lost a life! ${lives} left 💔`, true);
        // Reset to last checkpoint
        resetToCheckpoint();
    }
}

function addBanana() {
    bananas++;
    updateUI();
    // Every 10 bananas = extra life
    if (bananas % 10 === 0 && bananas > 0) {
        lives++;
        updateUI();
        showMessage('🎉 Extra life! 🎉');
    }
}

function resetToCheckpoint() {
    // Reset world position to beginning of current segment
    worldOffset = 0;
    segmentProgress = 0;
    obstacles = [];
    bananas_list = [];
    ropeIndex = 0;
    ropeSwingProgress = 0;
    ropeReleased = false;
    climbingTree = false;
    inTunnel = false;
    currentAction = null;
}
