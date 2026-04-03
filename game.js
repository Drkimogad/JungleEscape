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
let monkeyY = 270;  // Ground Y position (adjusted for better monkey drawing)
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
// ---------- DRAWING (WITH REAL MONKEY!) ----------
function draw() {
    ctx.clearRect(0, 0, 800, 400);
    
    // Background based on level/segment
    if (inTunnel) {
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(0, 350, 800, 50);
        // Torch effect
        ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
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
        // Grass details
        ctx.fillStyle = '#228B22';
        for(let i = 0; i < 20; i++) {
            ctx.fillRect(i * 40, 295, 3, 10);
        }
    }
    
    // Draw obstacles
    for (let obs of obstacles) {
        let x = obs.x - worldOffset;
        if (x > -50 && x < 850) {
            if (obs.type === 'snake') {
                ctx.fillStyle = '#228B22';
                ctx.fillRect(x, 295, 35, 12);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(x + 25, 292, 8, 6);
                // Snake tongue
                ctx.beginPath();
                ctx.moveTo(x + 33, 298);
                ctx.lineTo(x + 40, 295);
                ctx.lineTo(x + 38, 301);
                ctx.fillStyle = '#FF4444';
                ctx.fill();
            } 
            else if (obs.type === 'crocodile') {
                ctx.fillStyle = '#2E8B57';
                ctx.fillRect(x, 290, 45, 18);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(x + 5, 292, 6, 6);
                ctx.fillRect(x + 30, 292, 6, 6);
                ctx.fillStyle = '#000000';
                ctx.fillRect(x + 7, 294, 3, 3);
                ctx.fillRect(x + 32, 294, 3, 3);
            }
            else if (obs.type === 'branch') {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x, 260, 50, 8);
                ctx.fillStyle = '#654321';
                ctx.fillRect(x + 20, 250, 8, 15);
            }
            else if (obs.type === 'bat') {
                ctx.fillStyle = '#3a3a3a';
                ctx.beginPath();
                ctx.ellipse(x + 15, 260, 12, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#1a1a1a';
                ctx.beginPath();
                ctx.ellipse(x + 10, 258, 3, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(x + 20, 258, 3, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            else if (obs.type === 'log') {
                ctx.fillStyle = '#CD853F';
                ctx.fillRect(x, 295, 45, 12);
                ctx.fillStyle = '#8B4513';
                for(let i = 0; i < 3; i++) {
                    ctx.fillRect(x + 5 + i*12, 298, 5, 6);
                }
            }
            else if (obs.type === 'lava') {
                ctx.fillStyle = '#FF4500';
                ctx.fillRect(x, 300, 40, 10);
                ctx.fillStyle = '#FF6600';
                for(let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.arc(x + 5 + i*10, 305, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'stalactite') {
                ctx.fillStyle = '#8B8682';
                ctx.beginPath();
                ctx.moveTo(x + 5, 260);
                ctx.lineTo(x + 15, 290);
                ctx.lineTo(x + 25, 260);
                ctx.fill();
            }
            else if (obs.type === 'mushroom') {
                ctx.fillStyle = '#FF6347';
                ctx.beginPath();
                ctx.arc(x + 10, 295, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                for(let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(x + 6 + i*3, 293, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            else if (obs.type === 'rock') {
                ctx.fillStyle = '#696969';
                ctx.beginPath();
                ctx.ellipse(x + 15, 300, 12, 8, 0, 0, Math.PI * 2);
                ctx.fill();
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
                ctx.ellipse(x + 10, 295, 7, 9, -0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#DAA520';
                ctx.beginPath();
                ctx.ellipse(x + 8, 293, 2, 4, -0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    // ============================================
    // 🐒 DRAW THE REAL MONKEY! 🐒
    // ============================================
    let invincibleBlink = (invincibleFrames > 0 && Math.floor(Date.now() / 100) % 2 === 0);
    if (!invincibleBlink) {
        
        let monkeyBaseY = monkeyY;
        
        // Monkey body (brown)
        ctx.fillStyle = '#8B5A2B';
        ctx.beginPath();
        ctx.ellipse(100, monkeyBaseY + 5, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Belly (lighter)
        ctx.fillStyle = '#D2B48C';
        ctx.beginPath();
        ctx.ellipse(100, monkeyBaseY + 8, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#8B5A2B';
        ctx.beginPath();
        ctx.ellipse(100, monkeyBaseY - 8, 16, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Face (tan)
        ctx.fillStyle = '#FFE4B5';
        ctx.beginPath();
        ctx.ellipse(100, monkeyBaseY - 6, 12, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Ears
        ctx.fillStyle = '#8B5A2B';
        ctx.beginPath();
        ctx.ellipse(83, monkeyBaseY - 12, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(117, monkeyBaseY - 12, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner ears
        ctx.fillStyle = '#D2B48C';
        ctx.beginPath();
        ctx.ellipse(83, monkeyBaseY - 12, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(117, monkeyBaseY - 12, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(92, monkeyBaseY - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(108, monkeyBaseY - 10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(93, monkeyBaseY - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(109, monkeyBaseY - 10, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye shine
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(91, monkeyBaseY - 12, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(107, monkeyBaseY - 12, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Nose
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(100, monkeyBaseY - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth (happy!)
        ctx.beginPath();
        ctx.arc(100, monkeyBaseY - 2, 6, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Cheeks
        ctx.fillStyle = '#FFB6C1';
        ctx.beginPath();
        ctx.arc(87, monkeyBaseY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(113, monkeyBaseY - 6, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Arms
        ctx.beginPath();
        ctx.moveTo(82, monkeyBaseY + 2);
        ctx.lineTo(65, monkeyBaseY + 10);
        ctx.lineTo(78, monkeyBaseY + 8);
        ctx.fillStyle = '#8B5A2B';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(118, monkeyBaseY + 2);
        ctx.lineTo(135, monkeyBaseY + 10);
        ctx.lineTo(122, monkeyBaseY + 8);
        ctx.fill();
        
        // Hands
        ctx.fillStyle = '#D2B48C';
        ctx.beginPath();
        ctx.ellipse(63, monkeyBaseY + 10, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(137, monkeyBaseY + 10, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(88, monkeyBaseY + 18, 8, 12);
        ctx.fillRect(104, monkeyBaseY + 18, 8, 12);
        
        // Feet
        ctx.fillStyle = '#D2B48C';
        ctx.beginPath();
        ctx.ellipse(90, monkeyBaseY + 30, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(110, monkeyBaseY + 30, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail (curly!)
        ctx.beginPath();
        ctx.moveTo(118, monkeyBaseY + 15);
        ctx.quadraticCurveTo(140, monkeyBaseY + 10, 135, monkeyBaseY + 25);
        ctx.quadraticCurveTo(130, monkeyBaseY + 35, 125, monkeyBaseY + 28);
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Hat if in jungle level (cute)
        if (currentLevel === 1) {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(88, monkeyBaseY - 22, 24, 8);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(96, monkeyBaseY - 24, 8, 6);
        }
        
        // Banana in hand if score > 5
        if (bananas > 5) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.ellipse(62, monkeyBaseY + 6, 6, 8, -0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw ropes if in rope segment
    if (currentSegment && currentSegment.type === 'rope') {
        for (let i = 0; i < (currentSegment.ropeCount || 3); i++) {
            let ropeX = 150 + i * 200 - (worldOffset % 600);
            if (ropeX > -100 && ropeX < 900) {
                ctx.strokeStyle = '#8B5A2B';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(ropeX + 15, 100);
                ctx.lineTo(ropeX + 15, 290);
                ctx.stroke();
                ctx.fillStyle = '#D2691E';
                ctx.beginPath();
                ctx.ellipse(ropeX + 15, 95, 12, 15, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8B4513';
                ctx.beginPath();
                ctx.rect(ropeX + 10, 100, 10, 20);
                ctx.fill();
            }
        }
    }
    
    // Draw tunnel entrance hint if available
    if (currentSegment && currentSegment.type === 'ground' && activeLevel.secretTunnels) {
        for (let tunnel of activeLevel.secretTunnels) {
            let tunnelX = tunnel.position - worldOffset;
            if (Math.abs(tunnelX - 100) < 80 && !tunnel.used) {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(tunnelX, 315, 25, 8);
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 14px monospace';
                ctx.shadowBlur = 0;
                ctx.fillText('⬇️ SECRET', tunnelX + 2, 312);
            }
        }
    }
    
    // Draw instructions overlay for first few seconds
    if (gameRunning && !levelComplete && bananas < 3) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(250, 50, 300, 80);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('🐒 Press JUMP over snakes!', 270, 85);
        ctx.fillText('🍌 Collect bananas for lives!', 270, 115);
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


