// Game Canvas & Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Resize Canvas dynamically
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game State Variables
let gameState = 'START'; // START, PLAYING, GAMEOVER
let score = 0;
let coins = 0;
let wave = 1;
let particles = [];
let projectiles = [];
let floatingTexts = [];

// Upgrades State
let upgrades = {
    atkLevel: 1,
    hpLevel: 1,
    speedLevel: 1
};

// Keys state
const keys = {
    left: false,
    right: false,
    jump: false,
    attack: false,
    dash: false,
    skill: false
};

// Audio System using Web Audio API
class SoundSystem {
    constructor() {
        this.ctx = null;
    }
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    playSlash() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }
    playHit() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }
    playExplosion() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }
}
const audio = new SoundSystem();

// Stickman Base Class
class Stickman {
    constructor(x, y, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.facingRight = true;
        
        // Ground Physics
        this.isGrounded = false;
        this.width = 30;
        this.height = 70;

        // Health & Stats
        this.maxHp = 100;
        this.hp = 100;
        this.isDead = false;

        // State flags
        this.isAttacking = false;
        this.attackFrame = 0;
        this.isDashing = false;
        this.dashCooldown = 0;
        
        // Animation pose angles
        this.animTime = 0;
    }

    updatePhysics(floorY) {
        // Gravity
        this.vy += 0.6;
        this.x += this.vx;
        this.y += this.vy;

        // Friction
        this.vx *= 0.85;

        // Floor collision
        if (this.y + this.height / 2 >= floorY) {
            this.y = floorY - this.height / 2;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        this.animTime += 0.15;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (!this.facingRight) ctx.scale(-1, 1);

        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Head
        ctx.beginPath();
        ctx.arc(0, -35, 12, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(4, -37, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.color;

        // Body Trunk
        ctx.beginPath();
        ctx.moveTo(0, -23);
        ctx.lineTo(0, 10);
        ctx.stroke();

        // Dynamic Pose Angles
        let legAngle1 = Math.sin(this.animTime) * 0.6;
        let legAngle2 = -Math.sin(this.animTime) * 0.6;
        let armAngle1 = Math.cos(this.animTime) * 0.5;
        let armAngle2 = -Math.cos(this.animTime) * 0.5;

        if (!this.isGrounded) {
            legAngle1 = 0.5;
            legAngle2 = -0.8;
        } else if (Math.abs(this.vx) < 0.5) {
            legAngle1 = 0.1;
            legAngle2 = -0.1;
            armAngle1 = 0.1;
            armAngle2 = -0.1;
        }

        // Legs
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(Math.sin(legAngle1) * 15, 10 + Math.cos(legAngle1) * 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(Math.sin(legAngle2) * 15, 10 + Math.cos(legAngle2) * 20);
        ctx.stroke();

        // Arms & Weapon Rendering
        if (this.isAttacking) {
            let swing = (this.attackFrame / 15) * Math.PI;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(Math.cos(swing) * 25, -15 + Math.sin(swing) * 20);
            ctx.stroke();

            // Sword Trail & Blade
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(Math.cos(swing) * 45, -25 + Math.sin(swing) * 30);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(Math.sin(armAngle1) * 15, -15 + Math.cos(armAngle1) * 15);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(Math.sin(armAngle2) * 15, -15 + Math.cos(armAngle2) * 15);
            ctx.stroke();

            // Default Sword
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(5, -10);
            ctx.lineTo(25, -25);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class Player extends Stickman {
    constructor(x, y) {
        super(x, y, '#ffffff');
        this.speed = 5;
        this.attackDamage = 25;
        this.energy = 100;
        this.maxEnergy = 100;
        this.skillCooldown = 0;
    }

    update(floorY) {
        this.attackDamage = 20 + (upgrades.atkLevel * 8);
        this.maxHp = 75 + (upgrades.hpLevel * 25);
        this.speed = 4.5 + (upgrades.speedLevel * 0.5);

        if (keys.left) {
            this.vx = -this.speed;
            this.facingRight = false;
        }
        if (keys.right) {
            this.vx = this.speed;
            this.facingRight = true;
        }
        if (keys.jump && this.isGrounded) {
            this.vy = -13;
            this.isGrounded = false;
        }

        if (keys.dash && this.dashCooldown <= 0) {
            this.vx = this.facingRight ? 18 : -18;
            this.dashCooldown = 40;
            this.isDashing = true;
            createDashTrail(this.x, this.y, this.facingRight);
        }

        if (this.dashCooldown > 0) this.dashCooldown--;
        if (Math.abs(this.vx) < 8) this.isDashing = false;

        if (keys.attack && !this.isAttacking) {
            this.isAttacking = true;
            this.attackFrame = 0;
            audio.playSlash();
            checkPlayerAttackHit();
        }

        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackFrame > 15) {
                this.isAttacking = false;
            }
        }

        if (keys.skill && this.skillCooldown <= 0 && this.energy >= 40) {
            this.energy -= 40;
            this.skillCooldown = 120;
            triggerSpecialSkill(this.x, this.y, this.facingRight);
        }

        if (this.skillCooldown > 0) this.skillCooldown--;
        if (this.energy < this.maxEnergy) this.energy += 0.2;

        this.updatePhysics(floorY);

        if (this.x < 30) this.x = 30;
        if (this.x > canvas.width - 30) this.x = canvas.width - 30;
    }
}

class Enemy extends Stickman {
    constructor(x, y, type = 'BASIC') {
        let color = '#ff3344';
        if (type === 'NINJA') color = '#9933ff';
        if (type === 'BERSERKER') color = '#ff9900';
        if (type === 'BOSS') color = '#ff0033';

        super(x, y, color);
        this.type = type;

        if (type === 'BASIC') {
            this.hp = 50;
            this.maxHp = 50;
            this.speed = 2;
            this.damage = 8;
        } else if (type === 'NINJA') {
            this.hp = 35;
            this.maxHp = 35;
            this.speed = 4;
            this.damage = 12;
        } else if (type === 'BERSERKER') {
            this.hp = 120;
            this.maxHp = 120;
            this.speed = 1.2;
            this.damage = 22;
            this.height = 85;
        } else if (type === 'BOSS') {
            this.hp = 500 + (wave * 100);
            this.maxHp = this.hp;
            this.speed = 2.2;
            this.damage = 25;
            this.height = 95;
        }

        this.attackCooldown = 0;
    }

    update(player, floorY) {
        if (this.isDead) return;

        let dist = player.x - this.x;
        this.facingRight = dist > 0;

        if (Math.abs(dist) > 40 && this.attackCooldown <= 0) {
            this.vx = this.facingRight ? this.speed : -this.speed;
        } else {
            this.vx = 0;
            if (this.attackCooldown <= 0 && Math.abs(dist) <= 50) {
                this.isAttacking = true;
                this.attackFrame = 0;
                this.attackCooldown = 60;
                
                if (Math.abs(player.y - this.y) < 40) {
                    damagePlayer(this.damage);
                }
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;

        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackFrame > 15) this.isAttacking = false;
        }

        this.updatePhysics(floorY);
    }
}

let player = new Player(100, canvas.height - 100);
let enemies = [];

function spawnWaveEnemies() {
    enemies = [];
    let count = 3 + wave * 2;
    let isBossWave = wave % 5 === 0;

    if (isBossWave) {
        enemies.push(new Enemy(canvas.width - 150, canvas.height - 100, 'BOSS'));
        document.getElementById('bossHpContainer').classList.remove('hidden');
    } else {
        document.getElementById('bossHpContainer').classList.add('hidden');
        for (let i = 0; i < count; i++) {
            let spawnX = (i % 2 === 0) ? -50 - (i * 40) : canvas.width + 50 + (i * 40);
            let randType = Math.random();
            let type = 'BASIC';
            if (randType > 0.6) type = 'NINJA';
            if (randType > 0.85) type = 'BERSERKER';

            enemies.push(new Enemy(spawnX, canvas.height - 100, type));
        }
    }

    document.getElementById('waveText').innerText = `GELOMBANG ${wave}`;
}

function createDashTrail(x, y, facingRight) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x + (Math.random() * 20 - 10),
            y: y + (Math.random() * 40 - 20),
            vx: facingRight ? -Math.random() * 4 : Math.random() * 4,
            vy: (Math.random() - 0.5) * 2,
            radius: Math.random() * 4 + 2,
            color: '#00f0ff',
            alpha: 0.8,
            life: 20
        });
    }
}

function createHitParticles(x, y, color = '#ff0055') {
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            radius: Math.random() * 3 + 1,
            color: color,
            alpha: 1,
            life: 25
        });
    }
}

function spawnFloatingText(text, x, y, color = '#ffffff') {
    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        vy: -1.5,
        alpha: 1,
        color: color
    });
}

function triggerSpecialSkill(px, py, facingRight) {
    audio.playExplosion();
    let direction = facingRight ? 1 : -1;
    
    projectiles.push({
        x: px,
        y: py - 20,
        vx: direction * 14,
        radius: 40,
        damage: player.attackDamage * 2.5,
        life: 60
    });

    for (let i = 0; i < 20; i++) {
        particles.push({
            x: px,
            y: py,
            vx: direction * (Math.random() * 12 + 4),
            vy: (Math.random() - 0.5) * 6,
            radius: Math.random() * 6 + 2,
            color: '#a855f7',
            alpha: 1,
            life: 30
        });
    }
}

function checkPlayerAttackHit() {
    let reach = 60;
    enemies.forEach(enemy => {
        if (enemy.isDead) return;
        let hitBoxX = player.facingRight ? player.x + reach : player.x - reach;
        let dist = Math.abs(enemy.x - hitBoxX);

        if (dist < 45 && Math.abs(enemy.y - player.y) < 50) {
            let dmg = player.attackDamage;
            if (Math.random() > 0.7) {
                dmg *= 1.5;
                spawnFloatingText(`CRIT! ${Math.round(dmg)}`, enemy.x, enemy.y - 40, '#facc15');
            } else {
                spawnFloatingText(`${Math.round(dmg)}`, enemy.x, enemy.y - 40, '#ffffff');
            }

            enemy.hp -= dmg;
            enemy.vx = player.facingRight ? 8 : -8;
            createHitParticles(enemy.x, enemy.y - 20, enemy.color);
            audio.playHit();

            if (enemy.hp <= 0) {
                enemy.isDead = true;
                score += enemy.type === 'BOSS' ? 500 : 100;
                coins += enemy.type === 'BOSS' ? 50 : 10;
                updateHUD();
            }
        }
    });
}

function damagePlayer(amount) {
    if (player.isDashing) return;
    
    player.hp -= amount;
    createHitParticles(player.x, player.y - 20, '#ff0000');
    audio.playHit();
    spawnFloatingText(`-${Math.round(amount)}`, player.x, player.y - 40, '#ef4444');

    if (player.hp <= 0) {
        player.hp = 0;
        triggerGameOver();
    }
    updateHUD();
}

function updateHUD() {
    document.getElementById('hpBar').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    document.getElementById('energyBar').style.width = `${(player.energy / player.maxEnergy) * 100}%`;
    document.getElementById('coinText').innerText = coins;
    document.getElementById('playerScoreText').innerText = `SKOR: ${score}`;

    let boss = enemies.find(e => e.type === 'BOSS' && !e.isDead);
    if (boss) {
        let bossPct = Math.max(0, (boss.hp / boss.maxHp) * 100);
        document.getElementById('bossHpBar').style.width = `${bossPct}%`;
        document.getElementById('bossHpText').innerText = `${Math.round(bossPct)}%`;
    }
}

function gameLoop() {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const floorY = canvas.height - 80;

    // Render Floor
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(canvas.width, floorY);
    ctx.stroke();

    let bgGrad = ctx.createLinearGradient(0, floorY, 0, canvas.height);
    bgGrad.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
    bgGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);

    // Update Player
    player.update(floorY);
    player.draw(ctx);

    // Update Enemies
    let activeEnemies = 0;
    enemies.forEach(enemy => {
        if (!enemy.isDead) {
            activeEnemies++;
            enemy.update(player, floorY);
            enemy.draw(ctx);

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(enemy.x - 20, enemy.y - 55, 40, 5);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(enemy.x - 20, enemy.y - 55, (enemy.hp / enemy.maxHp) * 40, 5);
        }
    });

    if (activeEnemies === 0) {
        wave++;
        score += 200;
        spawnWaveEnemies();
        updateHUD();
    }

    // Render Skill Projectiles
    projectiles.forEach((proj, idx) => {
        proj.x += proj.vx;
        proj.life--;

        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 15, 0, Math.PI * 2);
        ctx.fill();

        enemies.forEach(enemy => {
            if (!enemy.isDead && Math.abs(enemy.x - proj.x) < 30) {
                enemy.hp -= proj.damage;
                createHitParticles(enemy.x, enemy.y - 20, '#a855f7');
                spawnFloatingText(`${Math.round(proj.damage)}`, enemy.x, enemy.y - 40, '#a855f7');
                if (enemy.hp <= 0) {
                    enemy.isDead = true;
                    coins += 10;
                }
            }
        });

        if (proj.life <= 0) projectiles.splice(idx, 1);
    });

    // Particles
    particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        p.life--;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.life <= 0 || p.alpha <= 0) particles.splice(index, 1);
    });

    // Floating Texts
    floatingTexts.forEach((ft, index) => {
        ft.y += ft.vy;
        ft.alpha -= 0.02;

        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 16px Orbitron';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x - 10, ft.y);
        ctx.restore();

        if (ft.alpha <= 0) floatingTexts.splice(index, 1);
    });

    requestAnimationFrame(gameLoop);
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        audio.init();
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
        if (e.key === 'w' || e.key === 'W' || e.key === ' ' || e.key === 'ArrowUp') keys.jump = true;
        if (e.key === 'j' || e.key === 'J') keys.attack = true;
        if (e.key === 'k' || e.key === 'K') keys.dash = true;
        if (e.key === 'l' || e.key === 'L') keys.skill = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
        if (e.key === 'w' || e.key === 'W' || e.key === ' ' || e.key === 'ArrowUp') keys.jump = false;
        if (e.key === 'j' || e.key === 'J') keys.attack = false;
        if (e.key === 'k' || e.key === 'K') keys.dash = false;
        if (e.key === 'l' || e.key === 'L') keys.skill = false;
    });

    const bindTouchBtn = (id, keyName) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            audio.init();
            keys[keyName] = true;
        });
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[keyName] = false;
        });
    };

    bindTouchBtn('btnLeft', 'left');
    bindTouchBtn('btnRight', 'right');
    bindTouchBtn('btnJump', 'jump');
    bindTouchBtn('btnAttack', 'attack');
    bindTouchBtn('btnDash', 'dash');
    bindTouchBtn('btnSkill', 'skill');
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    wave = 1;
    player = new Player(150, canvas.height - 100);
    
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    spawnWaveEnemies();
    updateHUD();
    gameLoop();
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('finalWave').innerText = wave;
    document.getElementById('finalScore').innerText = score;
    document.getElementById('finalCoins').innerText = coins;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function updateShopUI() {
    document.getElementById('shopCoins').innerText = coins;
    document.getElementById('atkLvlText').innerText = `Tahap ${upgrades.atkLevel} (+${upgrades.atkLevel * 8} Damage)`;
    document.getElementById('hpLvlText').innerText = `Tahap ${upgrades.hpLevel} (+${upgrades.hpLevel * 25} HP)`;
    document.getElementById('speedLvlText').innerText = `Tahap ${upgrades.speedLevel} (+${upgrades.speedLevel * 5}% Kelajuan)`;
}

// UI Event Listeners
document.getElementById('btnStartGame').addEventListener('click', startGame);
document.getElementById('btnRestartGame').addEventListener('click', startGame);

document.getElementById('btnOpenShop').addEventListener('click', () => {
    updateShopUI();
    document.getElementById('shopScreen').classList.remove('hidden');
});

document.getElementById('btnCloseShop').addEventListener('click', () => {
    document.getElementById('shopScreen').classList.add('hidden');
});

document.getElementById('btnBuyAtk').addEventListener('click', () => {
    let cost = upgrades.atkLevel * 100;
    if (coins >= cost) {
        coins -= cost;
        upgrades.atkLevel++;
        updateShopUI();
    }
});

document.getElementById('btnBuyHp').addEventListener('click', () => {
    let cost = upgrades.hpLevel * 100;
    if (coins >= cost) {
        coins -= cost;
        upgrades.hpLevel++;
        updateShopUI();
    }
});

document.getElementById('btnBuySpeed').addEventListener('click', () => {
    let cost = upgrades.speedLevel * 150;
    if (coins >= cost) {
        coins -= cost;
        upgrades.speedLevel++;
        updateShopUI();
    }
});

// Start Setup on Load
window.onload = function() {
    setupControls();
};