// ============================================
// JUNGLE ESCAPE - Complete Game Engine
// ============================================
//part 1
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

// part 2
// ---------- LEVEL LOADING ----------
function loadLevel(levelNum) {
    currentLevel = levelNum;
    activeLevel = levels[levelNum];
    
    if (!activeLevel) {
        console.error('Level not found!');
        return;
    }
    
    levelNameSpan.textContent = activeLevel.name;
    document.body.style.backgroundColor = activeLevel.themeColor;
    
    // Reset game state
    lives = 3;
    bananas = 0;
    gameRunning = true;
    levelComplete = false;
    currentSegmentIndex = 0;
    segmentProgress = 0;
    worldOffset = 0;
    obstacles = [];
    bananas_list = [];
    invincibleFrames = 0;
    inTunnel = false;
    climbingTree = false;
    
    // Load first segment
    currentSegment = activeLevel.segments[0];
    updateUI();
    showMessage(`🌴 ${activeLevel.name} - Get ready! 🌴`);
    
    // Generate initial obstacles based on first segment
    generateSegmentContent();
}

function generateSegmentContent() {
    obstacles = [];
    bananas_list = [];
    
    if (!currentSegment) return;
    
    if (currentSegment.type === 'ground') {
        // Place obstacles along the ground segment
        let totalLength = currentSegment.length;
        let obstacleList = currentSegment.obstacles || [];
        
        for (let i = 0; i < obstacleList.length; i++) {
            let pos = (i + 1) * (totalLength / (obstacleList.length + 1));
            let obsType = obstacleList[i];
            
            if (obsType === 'banana') {
                bananas_list.push({ x: pos, collected: false });
            } else {
                obstacles.push({ 
                    x: pos, 
                    type: obsType, 
                    required: (obsType === 'snake' || obsType === 'crocodile' || obsType === 'log') ? 'jump' : 'slide'
                });
            }
        }
    } else if (currentSegment.type === 'rope') {
        // Rope segment - no ground obstacles
        ropeIndex = 0;
        ropeSwingProgress = 0;
    } else if (currentSegment.type === 'tree') {
        climbingTree = true;
        treeClimbProgress = 0;
    } else if (currentSegment.type === 'tunnel') {
        inTunnel = true;
        tunnelProgress = 0;
        // Tunnel obstacles
        let obstacleList = currentSegment.obstacles || [];
        for (let i = 0; i < obstacleList.length; i++) {
            let pos = (i + 1) * (currentSegment.length / (obstacleList.length + 1));
            obstacles.push({ x: pos, type: obstacleList[i], required: (obstacleList[i] === 'bat') ? 'jump' : 'slide' });
        }
    }
}

function nextSegment() {
    currentSegmentIndex++;
    
    if (currentSegmentIndex >= activeLevel.segments.length) {
        // Level complete!
        levelComplete = true;
        gameRunning = false;
        showMessage(`🎉 LEVEL COMPLETE! +1 life 🎉`, false);
        lives++;
        updateUI();
        // Unlock next level
        if (currentLevel < 5) {
            const nextTab = document.querySelector(`.level-tab[data-level="${currentLevel + 1}"]`);
            if (nextTab) nextTab.classList.remove('locked');
        }
        return;
    }
    
    currentSegment = activeLevel.segments[currentSegmentIndex];
    segmentProgress = 0;
    generateSegmentContent();
    
    // Handle special segment start messages
    if (currentSegment.type === 'rope') {
        showMessage('🪢 Swing on ropes! Press JUMP at the peak to grab next rope! 🪢');
    } else if (currentSegment.type === 'tree') {
        showMessage('🌳 Climb the tree! Press JUMP to climb up! 🌳');
    } else if (currentSegment.type === 'tunnel') {
        showMessage('🕳️ Secret tunnel! Avoid bats with JUMP! 🕳️');
    }    
}

// part 3
// ---------- GAME UPDATE LOOP ----------
function updateGame() {
    if (!gameRunning || levelComplete) return;
    
    // Decrease invincibility frames
    if (invincibleFrames > 0) invincibleFrames--;
    
    // Decrease action cooldown
    if (actionCooldown > 0) actionCooldown--;
    
    // Move forward (auto-run)
    let speed = activeLevel.speed;
    if (inTunnel) speed *= 1.2;  // Tunnel is slightly faster
    
    segmentProgress += speed;
    worldOffset += speed;
    
    // Check for secret tunnels (ground segments only)
    if (currentSegment.type === 'ground' && activeLevel.secretTunnels) {
        for (let tunnel of activeLevel.secretTunnels) {
            if (!tunnel.used && Math.abs(segmentProgress - tunnel.position) < 10 && currentAction === 'slide') {
                // Found secret tunnel!
                tunnel.used = true;
                inTunnel = true;
                currentSegmentIndex = tunnel.leadsToSegment;
                currentSegment = activeLevel.segments[currentSegmentIndex];
                segmentProgress = 0;
                generateSegmentContent();
                showMessage('🕳️ You found a secret tunnel! 🕳️');
                return;
            }
        }
    }
    
    // Handle different segment types
    if (currentSegment.type === 'ground') {
        updateGroundSegment();
    } else if (currentSegment.type === 'rope') {
        updateRopeSegment();
    } else if (currentSegment.type === 'tree') {
        updateTreeSegment();
    } else if (currentSegment.type === 'tunnel') {
        updateTunnelSegment();
    } else if (currentSegment.type === 'goal') {
        nextSegment();
    }
    
    // Check if segment finished
    if (segmentProgress >= currentSegment.length) {
        nextSegment();
    }
}

function updateGroundSegment() {
    // Check collisions with obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        let obsScreenX = obs.x - worldOffset;
        
        // If obstacle is near monkey (within 20 pixels)
        if (Math.abs(obsScreenX - 100) < 25 && !obs.cleared) {
            // Check if kid pressed correct button
            let correct = false;
            if (obs.required === 'jump' && currentAction === 'jump') correct = true;
            if (obs.required === 'slide' && currentAction === 'slide') correct = true;
            
            if (correct) {
                obs.cleared = true;
                showMessage('✓ Good job! ✓');
            } else {
                loseLife();
                obs.cleared = true;
            }
        }
    }
    
    // Check banana collection
    for (let i = 0; i < bananas_list.length; i++) {
        let ban = bananas_list[i];
        let banScreenX = ban.x - worldOffset;
        
        if (!ban.collected && Math.abs(banScreenX - 100) < 25) {
            ban.collected = true;
            addBanana();
        }
    }
    
    // Clear action after use
    if (actionCooldown === 0) currentAction = null;
}

function updateRopeSegment() {
    // Simplified rope logic: each rope is a "checkpoint"
    let ropesInSegment = currentSegment.ropeCount || 3;
    let ropeSpacing = currentSegment.length / ropesInSegment;
    let currentRopePos = ropeIndex * ropeSpacing;
    
    if (segmentProgress >= currentRopePos + ropeSpacing/2 && ropeIndex < ropesInSegment) {
        // At rope swing point
        if (!ropeReleased) {
            // Kid must press jump to release
            if (currentAction === 'jump') {
                ropeReleased = true;
                showMessage('🪢 Release! Grab next rope! 🪢');
            }
        } else {
            // Flying to next rope - auto-grab after short delay
            if (segmentProgress > currentRopePos + ropeSpacing * 0.7) {
                ropeIndex++;
                ropeReleased = false;
                if (ropeIndex < ropesInSegment) {
                    showMessage('🪢 Grabbed! Keep swinging! 🪢');
                }
            }
        }
    }
    
    // Missed rope = lose life
    if (ropeIndex < ropesInSegment - 1 && segmentProgress > currentRopePos + ropeSpacing * 0.9 && !ropeReleased && ropeIndex > 0) {
        loseLife();
        ropeIndex++;  // Move to next to avoid multiple penalties
    }
    
    currentAction = null;
}

function updateTreeSegment() {
    if (currentAction === 'jump' && !climbingTree) {
        climbingTree = true;
    }
    
    if (climbingTree) {
        treeClimbProgress += activeLevel.speed * 2;
        if (treeClimbProgress >= currentSegment.climbHeight) {
            // Fall to next side
            climbingTree = false;
            segmentProgress = currentSegment.length;  // Finish tree segment
            showMessage('🌿 You climbed and fell to the other side! 🌿');
        }
    }
    
    currentAction = null;
}

function updateTunnelSegment() {
    // Similar to ground but darker (handled in draw)
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        let obsScreenX = obs.x - worldOffset;
        
        if (Math.abs(obsScreenX - 100) < 25 && !obs.cleared) {
            let correct = (obs.required === 'jump' && currentAction === 'jump');
            
            if (correct) {
                obs.cleared = true;
            } else {
                loseLife();
                obs.cleared = true;
            }
        }
    }
    
    if (actionCooldown === 0) currentAction = null;
}

//part 4
// ---------- DRAWING ----------
function draw() {
    ctx.clearRect(0, 0, 800, 400);
    
    // Background based on level/segment
    if (inTunnel) {
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, 350, 800, 50);
        // Torch effect
        ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
        ctx.fillRect(0, 0, 800, 400);
    } else {
        // Sky
        ctx.fillStyle = activeLevel.skyColor || '#87CEEB';
        ctx.fillRect(0, 0, 800, 300);
        // Ground
        ctx.fillStyle = activeLevel.groundColor || '#6B8E23';
        ctx.fillRect(0, 300, 800, 100);
        // Ground detail line
        ctx.fillStyle = '#556B2F';
        ctx.fillRect(0, 300, 800, 5);
    }
    
    // Draw obstacles
    for (let obs of obstacles) {
        let x = obs.x - worldOffset;
        if (x > -50 && x < 850) {
            if (obs.type === 'snake' || obs.type === 'crocodile') {
                ctx.fillStyle = '#228B22';
                ctx.fillRect(x, 290, 30, 20);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(x + 10, 285, 10, 5);
            } else if (obs.type === 'branch') {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x, 260, 40, 10);
            } else if (obs.type === 'bat') {
                ctx.fillStyle = '#4a4a4a';
                ctx.fillRect(x, 250, 25, 15);
            } else if (obs.type === 'log') {
                ctx.fillStyle = '#CD853F';
                ctx.fillRect(x, 290, 40, 15);
            }
        }
    }
    
    // Draw bananas
    for (let ban of bananas_list) {
        if (!ban.collected) {
            let x = ban.x - worldOffset;
            if (x > -50 && x < 850) {
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(x + 10, 295, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // Draw monkey (with invincibility blink)
    let alpha = (invincibleFrames > 0 && Math.floor(Date.now() / 50) % 2 === 0) ? 0.5 : 1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.arc(100, monkeyY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFE4B5';
    ctx.beginPath();
    ctx.arc(90, monkeyY - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(88, monkeyY - 7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF6600';
    ctx.beginPath();
    ctx.ellipse(105, monkeyY + 5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw ropes if in rope segment
    if (currentSegment && currentSegment.type === 'rope') {
        for (let i = 0; i < (currentSegment.ropeCount || 3); i++) {
            let ropeX = 150 + i * 200 - worldOffset;
            ctx.strokeStyle = '#8B5A2B';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(ropeX, 150);
            ctx.lineTo(ropeX + 20, 300);
            ctx.stroke();
            ctx.fillStyle = '#D2691E';
            ctx.beginPath();
            ctx.arc(ropeX + 10, 150, 10, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw tunnel entrance hint if available
    if (currentSegment && currentSegment.type === 'ground' && activeLevel.secretTunnels) {
        for (let tunnel of activeLevel.secretTunnels) {
            let tunnelX = tunnel.position - worldOffset;
            if (Math.abs(tunnelX - 100) < 50) {
                ctx.fillStyle = '#000000';
                ctx.fillRect(tunnelX, 310, 20, 10);
                ctx.fillStyle = '#FFD700';
                ctx.font = '12px monospace';
                ctx.fillText('⬇️?', tunnelX + 3, 320);
            }
        }
    }
}

// ---------- CONTROLS ----------
function handleAction(action) {
    if (!gameRunning || levelComplete) return;
    if (actionCooldown > 0) return;
    
    currentAction = action;
    actionCooldown = 15;  // Short cooldown between actions
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleAction('jump');
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleAction('slide');
    }
});

// Touch/click buttons
document.getElementById('jumpBtn').addEventListener('click', () => handleAction('jump'));
document.getElementById('slideBtn').addEventListener('click', () => handleAction('slide'));

// Level selection
document.querySelectorAll('.level-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        let levelNum = parseInt(tab.dataset.level);
        if (levelNum === 1 || !tab.classList.contains('locked')) {
            loadLevel(levelNum);
        } else {
            showMessage('🔒 Complete previous level first! 🔒', true);
        }
    });
});

// ---------- GAME LOOP ----------
function gameLoop() {
    updateGame();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
loadLevel(1);
gameLoop();


