// ==========================================
// DY라이크 - 디와이산업개발 환경정화 시뮬레이터
// Phaser.js 버전
// ==========================================

// ========== 프로시저럴 사운드 매니저 (Web Audio API) ==========
class GameSoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeSounds = [];
        this.lastPlayTime = {};
        this.MAX_CONCURRENT = 5;
        this.enabled = localStorage.getItem('dy_sound') !== 'off';
        this.unlocked = false;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.enabled ? 0.5 : 0;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) { /* Web Audio API 미지원 */ }
    }

    unlock() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.unlocked = true;
    }

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('dy_sound', this.enabled ? 'on' : 'off');
        if (this.masterGain) {
            this.masterGain.gain.value = this.enabled ? 0.5 : 0;
        }
        return this.enabled;
    }

    play(name, volumeScale) {
        if (!this.ctx || !this.enabled || !this.unlocked) return;
        const now = performance.now();
        const minInterval = (name === 'shoot' || name === 'enemyHit' || name === 'expPickup') ? 100 : 50;
        if (now - (this.lastPlayTime[name] || 0) < minInterval) return;
        this.lastPlayTime[name] = now;

        // 동시 재생 제한
        this.activeSounds = this.activeSounds.filter(s => s.endTime > now);
        if (this.activeSounds.length >= this.MAX_CONCURRENT) {
            const oldest = this.activeSounds.shift();
            try { oldest.osc.stop(); } catch(e) {}
        }

        try {
            const vol = volumeScale || 0.3;
            const g = this.ctx.createGain();
            g.gain.value = vol;
            g.connect(this.masterGain);
            const t = this.ctx.currentTime;
            let duration = 0.1;

            switch (name) {
                case 'shoot': {
                    const o = this.ctx.createOscillator();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(800, t);
                    o.frequency.exponentialRampToValueAtTime(200, t + 0.08);
                    g.gain.setValueAtTime(0.2, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                    o.connect(g); o.start(t); o.stop(t + 0.08);
                    duration = 0.08;
                    this.activeSounds.push({ osc: o, endTime: now + 80 });
                    break;
                }
                case 'enemyHit': {
                    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                    const src = this.ctx.createBufferSource();
                    src.buffer = buf;
                    g.gain.value = 0.15;
                    src.connect(g); src.start(t);
                    duration = 0.05;
                    this.activeSounds.push({ osc: src, endTime: now + 50 });
                    break;
                }
                case 'enemyDeath': {
                    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
                    const src = this.ctx.createBufferSource();
                    src.buffer = buf;
                    const o = this.ctx.createOscillator();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(300, t);
                    o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
                    const g2 = this.ctx.createGain();
                    g2.gain.setValueAtTime(0.3, t);
                    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
                    o.connect(g2); g2.connect(g);
                    g.gain.value = 0.3;
                    src.connect(g); src.start(t); o.start(t); o.stop(t + 0.12);
                    duration = 0.12;
                    this.activeSounds.push({ osc: o, endTime: now + 120 });
                    break;
                }
                case 'playerHit': {
                    const o = this.ctx.createOscillator();
                    o.type = 'square';
                    o.frequency.setValueAtTime(200, t);
                    o.frequency.exponentialRampToValueAtTime(80, t + 0.15);
                    g.gain.setValueAtTime(0.5, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
                    o.connect(g); o.start(t); o.stop(t + 0.15);
                    duration = 0.15;
                    this.activeSounds.push({ osc: o, endTime: now + 150 });
                    break;
                }
                case 'expPickup': {
                    const o = this.ctx.createOscillator();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(600, t);
                    o.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
                    g.gain.setValueAtTime(0.1, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
                    o.connect(g); o.start(t); o.stop(t + 0.08);
                    duration = 0.08;
                    this.activeSounds.push({ osc: o, endTime: now + 80 });
                    break;
                }
                case 'levelUp': {
                    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
                    notes.forEach((freq, i) => {
                        const o = this.ctx.createOscillator();
                        o.type = 'sine';
                        o.frequency.value = freq;
                        const ng = this.ctx.createGain();
                        ng.gain.setValueAtTime(0.6, t + i * 0.1);
                        ng.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.15);
                        o.connect(ng); ng.connect(g);
                        g.gain.value = 0.6;
                        o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.15);
                    });
                    duration = 0.45;
                    this.activeSounds.push({ osc: { stop(){} }, endTime: now + 450 });
                    break;
                }
                case 'fireBomb': {
                    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
                    const src = this.ctx.createBufferSource();
                    src.buffer = buf;
                    const o = this.ctx.createOscillator();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(150, t);
                    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
                    const g2 = this.ctx.createGain();
                    g2.gain.setValueAtTime(0.35, t);
                    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
                    o.connect(g2); g2.connect(g);
                    g.gain.value = 0.35;
                    src.connect(g); src.start(t); o.start(t); o.stop(t + 0.2);
                    duration = 0.2;
                    this.activeSounds.push({ osc: o, endTime: now + 200 });
                    break;
                }
                case 'shockwave': {
                    const o = this.ctx.createOscillator();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(100, t);
                    o.frequency.exponentialRampToValueAtTime(25, t + 0.3);
                    g.gain.setValueAtTime(0.35, t);
                    g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
                    o.connect(g); o.start(t); o.stop(t + 0.3);
                    duration = 0.3;
                    this.activeSounds.push({ osc: o, endTime: now + 300 });
                    break;
                }
                case 'lightning': {
                    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < data.length; i++) {
                        const env = i < data.length * 0.1 ? i / (data.length * 0.1) : Math.pow(1 - i / data.length, 3);
                        data[i] = (Math.random() * 2 - 1) * env;
                    }
                    const src = this.ctx.createBufferSource();
                    src.buffer = buf;
                    g.gain.value = 0.35;
                    src.connect(g); src.start(t);
                    duration = 0.1;
                    this.activeSounds.push({ osc: src, endTime: now + 100 });
                    break;
                }
                case 'bossWarning': {
                    for (let i = 0; i < 3; i++) {
                        const o = this.ctx.createOscillator();
                        o.type = 'square';
                        o.frequency.value = 440;
                        const ng = this.ctx.createGain();
                        ng.gain.setValueAtTime(0.7, t + i * 0.18);
                        ng.gain.exponentialRampToValueAtTime(0.01, t + i * 0.18 + 0.12);
                        o.connect(ng); ng.connect(g);
                        g.gain.value = 0.7;
                        o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.12);
                    }
                    duration = 0.5;
                    this.activeSounds.push({ osc: { stop(){} }, endTime: now + 500 });
                    break;
                }
            }
        } catch (e) { /* 사운드 에러 무시 */ }
    }
}

const gameSoundManager = new GameSoundManager();

// ========== 게임 설정 ==========
const CONFIG = {
    WIDTH: 960,
    HEIGHT: 540,
    MAX_ENEMIES: 300,    // 몹 수 증가
    MAX_BULLETS: 100,
    MAX_EXP_ORBS: 500,   // ★ 200 → 500 (경험치 오브 부족 방지)
    PLAYER_SPEED: 300,
    PLAYER_MAX_HP: 100,
    BULLET_SPEED: 500,
    FIRE_RATE: 400,
    ENEMY_SPEED: 80,
    SPAWN_RATE: 400,     // 800 → 400 (더 빠르게 스폰)
    GAME_DURATION: 15 * 60 * 1000,
    EXP_MAGNET_RANGE: 100
};

// ========== ★ 난이도 설정 ==========
const DIFFICULTY = {
    easy: {
        name: '쉬움',
        color: 0x4caf50,
        enemyHpMult: 0.7,
        enemyDmgMult: 0.6,
        enemySpeedMult: 0.8,
        expMult: 1.3,
        desc: '입문자용'
    },
    normal: {
        name: '보통',
        color: 0x2196f3,
        enemyHpMult: 1.0,
        enemyDmgMult: 1.0,
        enemySpeedMult: 1.0,
        expMult: 1.0,
        desc: '기본 난이도'
    },
    hard: {
        name: '어려움',
        color: 0xff9800,
        enemyHpMult: 1.4,
        enemyDmgMult: 1.3,
        enemySpeedMult: 1.2,
        expMult: 0.9,
        desc: '숙련자용'
    },
    hell: {
        name: '헬모드',
        color: 0xf44336,
        enemyHpMult: 2.0,
        enemyDmgMult: 1.8,
        enemySpeedMult: 1.4,
        expMult: 0.7,
        desc: '지옥체험'
    }
};

// ========== 색상 정의 ==========
const COLORS = {
    PLAYER: 0x00a8e8,
    PLAYER_GLOW: 0x5dc8f7,
    BULLET: 0x5dc8f7,
    SLUDGE: 0x4a3728,
    TOXIC: 0x7cb342,
    WASTE: 0xff8f00,
    GAS: 0x9c27b0,
    EXP: 0xaed581,
    HP_BAR: 0xe53935,
    HP_BG: 0x4a1a1a,
    EXP_BAR: 0x7cb342,
    EXP_BG: 0x2a3a1a,
    BG: 0x1a1a2e,
    GRID: 0xffffff
};

// ========== 적 타입 정의 (고퀄리티 텍스처 크기에 맞게 조정) ==========
// ★ 난이도 15% 하향 조정: 속도/데미지 감소, 경험치 소폭 증가
const ENEMY_TYPES = {
    // 기본 적 (밸런스 너프 2026-02-07: HP/데미지 하향)
    sludge: { name: '슬러지', color: 0x4a3728, radius: 18, hp: 12, speed: 42, damage: 5, exp: 1 },       // 기존 hp:15 dmg:8
    toxic: { name: '폐수', color: 0x7cb342, radius: 16, hp: 6, speed: 85, damage: 4, exp: 1 },           // 기존 hp:8 dmg:6
    waste: { name: '폐기물', color: 0xff8f00, radius: 24, hp: 35, speed: 30, damage: 8, exp: 6 },        // 기존 hp:45 dmg:12
    gas: { name: '유해가스', color: 0x9c27b0, radius: 20, hp: 14, speed: 50, damage: 3, exp: 2 },        // 기존 hp:18 dmg:4

    // ★ 신규 몬스터 (너프)
    pollutedWater: { name: '오염수', color: 0x1565c0, radius: 12, hp: 6, speed: 75, damage: 3, exp: 1 },  // 기존 hp:8 dmg:4
    grease: { name: '기름때', color: 0x37474f, radius: 22, hp: 28, speed: 30, damage: 10, exp: 4 },       // 기존 hp:35 dmg:15
    oilDrum: { name: '폐유통', color: 0xd84315, radius: 20, hp: 22, speed: 38, damage: 10, exp: 5 },      // 기존 hp:28 dmg:16
    sludgeGiant: { name: '슬러지 거인', color: 0x3e2723, radius: 35, hp: 100, speed: 25, damage: 18, exp: 18 } // 기존 hp:130 dmg:25
};

// ========== 웨이브 설정 (뱀서라이크 스타일) ==========
const WAVE_CONFIG = [
    // { 시작시간(ms), 스폰간격(ms), 가능한적들, 동시스폰수, 웨이브몹수 }
    { time: 0,      spawnRate: 350, enemies: ['sludge', 'pollutedWater'],                    spawnCount: 3, waveSize: 20 },
    { time: 60000,  spawnRate: 300, enemies: ['sludge', 'pollutedWater', 'toxic'],           spawnCount: 4, waveSize: 25 },  // 1분
    { time: 120000, spawnRate: 260, enemies: ['sludge', 'toxic', 'grease'],                  spawnCount: 5, waveSize: 30 },  // 2분
    { time: 180000, spawnRate: 220, enemies: ['sludge', 'toxic', 'grease', 'waste'],         spawnCount: 6, waveSize: 40 },  // 3분
    { time: 300000, spawnRate: 180, enemies: ['sludge', 'toxic', 'waste', 'gas', 'oilDrum'], spawnCount: 7, waveSize: 50 },  // 5분
    { time: 420000, spawnRate: 150, enemies: ['toxic', 'waste', 'gas', 'oilDrum', 'grease'], spawnCount: 8, waveSize: 60 },  // 7분
    { time: 540000, spawnRate: 120, enemies: ['waste', 'gas', 'oilDrum', 'sludgeGiant'],     spawnCount: 9, waveSize: 80 },  // 9분
    { time: 720000, spawnRate: 80,  enemies: ['waste', 'gas', 'oilDrum', 'sludgeGiant'],     spawnCount: 12, waveSize: 100 },// 12분
];

// ========== 보스 타입 정의 (고퀄리티 텍스처 크기에 맞게 조정) ==========
// ★ 보스 난이도 15% 하향: 속도/데미지 감소
const BOSS_TYPES = {
    sludge_king: {
        name: '서민영',        // ★ 1층 보스
        color: 0x3d2817,
        radius: 55,           // 120x120 텍스처
        hp: 450,
        speed: 25,
        damage: 20,
        exp: 60,
        spawnTime: 180000     // 3분
    },
    drum_giant: {
        name: '강빛나',        // ★ 2층 보스
        color: 0xd84315,
        radius: 65,           // 140x140 텍스처
        hp: 850,
        speed: 22,
        damage: 28,
        exp: 120,
        spawnTime: 360000     // 6분
    },
    toxic_reaper: {
        name: '오염의 사신',
        color: 0x4a148c,
        radius: 75,           // 160x160 텍스처
        hp: 1700,
        speed: 35,
        damage: 40,
        exp: 250,
        spawnTime: 540000     // 9분
    }
};

// ========== 아이템 정의 ==========
const ITEM_TYPES = {
    health: { name: '체력팩', color: 0xe53935, effect: 30, dropRate: 0.15 },
    magnet: { name: '자석', color: 0x9c27b0, effect: 'magnet', dropRate: 0.10 },
    // bomb: { name: '폭탄', color: 0xff5722, effect: 'bomb', dropRate: 0.05 },  // ★ 폭탄 제거
    invincible: { name: '무적', color: 0xffd600, effect: 'invincible', dropRate: 0.05 },
    chest: { name: '보물상자', color: 0xffc107, effect: 'chest', dropRate: 0 }  // 보스 전용
};

// ========== 무기 정의 (12종) - 무제한 스케일링 ==========
const WEAPONS = {
    // 기존 4종 (maxLevel 99로 증가)
    waterGun: { name: '고압 세척기', icon: '💧', desc: '가장 가까운 적에게 물줄기 발사', baseDamage: 10, baseCooldown: 400, projectileSpeed: 500, maxLevel: 99 },
    circleField: { name: '정화 필드', icon: '🔵', desc: '캐릭터 주변을 도는 정화 오브', baseDamage: 5, baseRadius: 80, orbCount: 3, maxLevel: 99 },
    homingMissile: { name: '중화제 탄', icon: '🎯', desc: '적을 추적하는 유도 미사일', baseDamage: 25, baseCooldown: 2000, projectileSpeed: 250, maxLevel: 99 },
    // dredgeHose: { name: '준설호스', icon: '🌊', desc: '흡입 범위 공격', baseDamage: 8, baseCooldown: 100, range: 300, angle: 60, maxLevel: 99 },  // 기존
    dredgeHose: { name: '준설호스', icon: '🌊', desc: '전방 부채꼴로 오염물 흡입', baseDamage: 5, baseCooldown: 300, range: 200, angle: 50, maxLevel: 99 },  // 너프

    // ★ 신규 8종 (maxLevel 99)
    blower: { name: '산업용 송풍기', icon: '💨', desc: '강풍으로 전방 적을 밀쳐냄', baseDamage: 8, baseCooldown: 800, range: 180, angle: 60, knockback: 300, maxLevel: 99 },
    detector: { name: '오염측정기', icon: '📡', desc: '적 사이를 연쇄하는 번개', baseDamage: 15, baseCooldown: 1200, chainCount: 3, chainRange: 150, maxLevel: 99 },
    gloves: { name: '보호장갑', icon: '🧤', desc: '근접 적에게 빠른 연타', baseDamage: 12, baseCooldown: 200, range: 60, angle: 120, maxLevel: 99 },
    spray: { name: '소독스프레이', icon: '🧴', desc: '바닥에 지속 데미지 영역 생성', baseDamage: 3, baseCooldown: 3000, radius: 80, duration: 5000, maxLevel: 99 },
    // cone: { name: '안전콘 터렛', icon: '🔶', desc: '터렛 설치, 미사일 발사', baseDamage: 40, baseCooldown: 4000, absorbHits: 5, explosionRadius: 100, maxLevel: 99 },  // 기존 (소환 방식)
    cone: { name: '화염탄', icon: '🔶', desc: '적에게 폭발탄, 주변 적도 피해', baseDamage: 40, baseCooldown: 4000, absorbHits: 5, explosionRadius: 100, maxLevel: 99 },
    // truck: { name: '미니탱크', icon: '🚛', desc: '탱크 소환, 포격 공격', baseDamage: 30, baseCooldown: 8000, dashDistance: 300, dashSpeed: 800, maxLevel: 99 },  // 기존 (소환 방식)
    truck: { name: '충격파', icon: '🚛', desc: '주변 모든 적을 밀쳐내는 충격파', baseDamage: 30, baseCooldown: 8000, dashDistance: 300, dashSpeed: 800, maxLevel: 99 },
    // drone: { name: '공격드론', icon: '🚁', desc: '드론 소환, 유도탄 발사', baseDamage: 6, baseCooldown: 500, orbitRadius: 150, maxLevel: 99 },  // 기존 (소환 방식)
    drone: { name: '공습', icon: '🚁', desc: '여러 적 위치에 낙뢰 투하', baseDamage: 25, baseCooldown: 3000, orbitRadius: 150, maxLevel: 99 },
    pipe: { name: '폐수파이프', icon: '🔧', desc: '적을 관통하는 강력한 투사체', baseDamage: 18, baseCooldown: 1500, projectileSpeed: 400, pierce: 999, maxLevel: 99 }
};

// ========== 패시브 스킬 (16종) - 밸런스 너프 (2026-02-07) ==========
const PASSIVES = {
    // 기존 5종 (효과 축소)
    damage: { name: '정화력', icon: '⚔️', desc: '공격력 6% 증가', maxLevel: 99, effect: 0.06 },       // 기존 0.1 → 0.06
    speed: { name: '이동속도', icon: '👟', desc: '이동속도 5% 증가', maxLevel: 99, effect: 0.05 },          // 기존 0.08 → 0.05
    maxHp: { name: '체력', icon: '🛡️', desc: '최대 HP 15 증가', maxLevel: 99, effect: 15 },                  // 기존 25 → 15
    magnet: { name: '자석', icon: '🧲', desc: '경험치 수집 범위 25% 증가', maxLevel: 99, effect: 0.25 },        // 기존 0.3 → 0.25
    regen: { name: '재생', icon: '💚', desc: '매초 HP 1 회복', maxLevel: 99, effect: 1 },               // 유지

    // ★ 신규 11종 (효과 축소)
    cooldown: { name: '효율성', icon: '⚡', desc: '공격 쿨다운 3% 감소', maxLevel: 99, effect: 0.03 },       // 기존 0.05 → 0.03
    projectile: { name: '투사체', icon: '✨', desc: '투사체 1개 추가 발사', maxLevel: 99, effect: 1 },          // 유지
    area: { name: '범위', icon: '🎆', desc: '공격 범위 7% 확대', maxLevel: 99, effect: 0.07 },           // 기존 0.1 → 0.07
    growth: { name: '숙련도', icon: '📈', desc: '획득 경험치 8% 증가', maxLevel: 99, effect: 0.08 },         // 유지
    armor: { name: '방어력', icon: '🔒', desc: '받는 피해 1 감소', maxLevel: 99, effect: 1 },         // 유지
    critChance: { name: '크리티컬', icon: '💥', desc: '치명타 확률 2% 증가', maxLevel: 99, effect: 0.02 },  // 기존 0.03 → 0.02
    critDamage: { name: '치명타력', icon: '🔥', desc: '치명타 피해 10% 증가', maxLevel: 99, effect: 0.10 }, // 기존 0.15 → 0.10
    duration: { name: '지속시간', icon: '⏱️', desc: '스킬 지속시간 10% 증가', maxLevel: 99, effect: 0.1 },  // 유지
    luck: { name: '행운', icon: '🍀', desc: '아이템 드롭률 5% 증가', maxLevel: 99, effect: 0.05 },     // 유지
    pierce: { name: '관통', icon: '🗡️', desc: '투사체가 적 1명 더 관통', maxLevel: 99, effect: 1 },         // 유지
    lifesteal: { name: '흡혈', icon: '🩸', desc: '준 피해의 0.5% HP 회복', maxLevel: 99, effect: 0.005 } // 기존 0.01 → 0.005
};

// ========== ★ 스킬 시너지 시스템 ★ ==========
// 특정 스킬 조합 시 보너스 효과 발생
const SYNERGIES = [
    // 물 계열 시너지
    {
        name: '완벽한 정화',
        icon: '💎',
        requires: ['waterGun', 'dredgeHose'],  // 고압 세척기 + 준설호스
        bonus: { damage: 0.25, desc: '물 공격 데미지 +25%' }
    },
    {
        name: '정화의 영역',
        icon: '🌀',
        requires: ['circleField', 'spray'],  // 정화 필드 + 소독스프레이
        bonus: { area: 0.30, desc: '범위 공격 +30%' }
    },
    // 기술 계열 시너지
    {
        name: '스마트 환경관리',
        icon: '🤖',
        requires: ['detector', 'drone'],  // 오염측정기 + 환경드론
        bonus: { damage: 0.20, cooldown: 0.15, desc: '데미지 +20%, 쿨다운 -15%' }
    },
    {
        name: '관통의 달인',
        icon: '⚡',
        requires: ['pipe', 'pierce'],  // 폐수파이프 + 관통 패시브
        bonus: { damage: 0.30, desc: '관통 데미지 +30%' }
    },
    // 근접 계열 시너지
    {
        name: '근접 전문가',
        icon: '👊',
        requires: ['gloves', 'blower'],  // 보호장갑 + 송풍기
        bonus: { damage: 0.20, speed: 0.10, desc: '근접 데미지 +20%, 이동속도 +10%' }
    },
    // 방어 계열 시너지
    {
        name: '철벽 방어',
        icon: '🛡️',
        requires: ['armor', 'maxHp'],  // 방어력 + 체력 패시브
        bonus: { armor: 2, regen: 1, desc: '방어력 +2, 초당 HP +1' }
    },
    // 공격 계열 시너지
    {
        name: '치명적 일격',
        icon: '💀',
        requires: ['critChance', 'critDamage'],  // 크리티컬 + 치명타력
        bonus: { critDamage: 0.50, desc: '치명타 데미지 +50%' }
    },
    // 설치물 시너지
    {
        name: '폭발의 대가',
        icon: '💥',
        requires: ['cone', 'truck'],  // 안전콘 + 청소차
        bonus: { damage: 0.35, desc: '폭발/돌진 데미지 +35%' }
    },
    // 유도 계열 시너지
    {
        name: '추적의 달인',
        icon: '🎯',
        requires: ['homingMissile', 'detector'],  // 중화제탄 + 오염측정기
        bonus: { damage: 0.25, projectile: 1, desc: '유도 공격 +25%, 투사체 +1' }
    },
    // 흡수 계열 시너지
    {
        name: '생명력 착취',
        icon: '❤️',
        requires: ['lifesteal', 'damage'],  // 흡혈 + 정화력
        bonus: { lifesteal: 0.01, desc: '추가 흡혈 +1%' }
    }
];

// ========== ★ 클래스 시스템 (바벨탑 스타일) ★ ==========
const CLASS_TYPES = {
    washer: {
        name: '준설공',
        icon: '🚿',
        desc: 'HP +20%, 물 공격 데미지 +30%',
        color: 0x00bcd4,
        bonus: { hpBonus: 0.20, waterDamage: 0.30 },
        startWeapon: 'dredgeHose'  // 기존 waterGun → 준설호스로 변경
    },
    purifier: {
        name: '세정공',
        icon: '🔫',
        desc: '범위 +25%, 쿨다운 -15%',
        color: 0xff6d00,
        bonus: { areaBonus: 0.25, cooldownBonus: 0.15 },
        startWeapon: 'circleField'
    },
    technician: {
        name: '신호수',
        icon: '🚩',
        desc: '크리티컬 +10%, 이동속도 +15%',
        color: 0xd32f2f,
        bonus: { critBonus: 0.10, speedBonus: 0.15 },
        startWeapon: 'detector'
    }
};

// ========== ★ 층 시스템 (바벨탑 스타일) ★ ==========
const FLOOR_CONFIG = [
    { floor: 1,  name: '1층: 오염된 로비',      bossType: 'sludge_king',    time: 120000, difficultyMult: 1.0, bossHpMult: 1.0 },
    { floor: 2,  name: '2층: 폐기물 창고',       bossType: 'drum_giant',     time: 120000, difficultyMult: 1.3, bossHpMult: 1.5 },
    { floor: 3,  name: '3층: 독성 연구실',       bossType: 'toxic_reaper',   time: 120000, difficultyMult: 1.6, bossHpMult: 2.0 },
    { floor: 4,  name: '4층: 오염된 공장',       bossType: 'sludge_king',    time: 120000, difficultyMult: 2.0, bossHpMult: 3.0 },
    { floor: 5,  name: '5층: 유해가스 구역',     bossType: 'drum_giant',     time: 120000, difficultyMult: 2.5, bossHpMult: 4.0 },
    { floor: 6,  name: '6층: 폐수 처리장',       bossType: 'toxic_reaper',   time: 120000, difficultyMult: 3.0, bossHpMult: 5.0 },
    { floor: 7,  name: '7층: 슬러지 심연',       bossType: 'sludge_king',    time: 120000, difficultyMult: 3.5, bossHpMult: 6.0 },
    { floor: 8,  name: '8층: 드럼통 지옥',       bossType: 'drum_giant',     time: 120000, difficultyMult: 4.0, bossHpMult: 8.0 },
    { floor: 9,  name: '9층: 오염의 정점',       bossType: 'toxic_reaper',   time: 150000, difficultyMult: 4.5, bossHpMult: 10.0 },
    { floor: 10, name: '10층: 최종 정화',        bossType: 'toxic_reaper',   time: 180000, difficultyMult: 5.0, bossHpMult: 15.0 }
];

// ========== ★ 장비 시스템 (바벨탑 스타일) ★ ==========
const EQUIPMENT_GRADES = {
    common:    { name: '일반', color: 0xffffff, dropRate: 0.70, statMult: 1.0 },
    uncommon:  { name: '고급', color: 0x4caf50, dropRate: 0.20, statMult: 1.3 },
    rare:      { name: '희귀', color: 0x2196f3, dropRate: 0.08, statMult: 1.6 },
    legendary: { name: '전설', color: 0xff9800, dropRate: 0.02, statMult: 2.0 }
};

const EQUIPMENT_SLOTS = {
    weapon:    { name: '무기',     icon: '⚔️', statType: 'damage',     baseValue: 5,  desc: '데미지 +%' },
    armor:     { name: '방어구',   icon: '🛡️', statType: 'maxHp',      baseValue: 20, desc: 'HP +' },
    gloves:    { name: '장갑',     icon: '🧤', statType: 'attackSpeed', baseValue: 5,  desc: '공격속도 +%' },
    boots:     { name: '신발',     icon: '👢', statType: 'moveSpeed',   baseValue: 5,  desc: '이동속도 +%' },
    accessory: { name: '악세서리', icon: '💎', statType: 'special',     baseValue: 3,  desc: '특수 효과' }
};

// 악세서리 특수 효과
const ACCESSORY_EFFECTS = [
    { name: '크리티컬 반지', effect: 'critChance', value: 0.05, desc: '치명타 +5%' },
    { name: '흡혈의 목걸이', effect: 'lifesteal', value: 0.02, desc: '흡혈 +2%' },
    { name: '경험치 귀걸이', effect: 'expBonus', value: 0.10, desc: '경험치 +10%' },
    { name: '자석 팔찌',     effect: 'magnetBonus', value: 0.20, desc: '수집범위 +20%' }
];

// ==========================================
// BootScene
// ==========================================
class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    preload() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this.add.text(w/2, h/2, 'Loading...', { fontSize: '24px', fill: '#00a8e8' }).setOrigin(0.5);
        this.createTextures();
    }

    // ========== 고퀄리티 색상 팔레트 ==========
    getColorPalette() {
        return {
            // 피부 (3단계)
            skin: { light: 0xffe0bd, mid: 0xffccbc, dark: 0xd4a574 },
            // 안전모 (3단계)
            helmet: { light: 0xffeb3b, mid: 0xfdd835, dark: 0xf9a825 },
            // 작업복 (3단계)
            uniform: { light: 0xff8f00, mid: 0xff6f00, dark: 0xe65100 },
            // 바지 (3단계)
            pants: { light: 0x1e88e5, mid: 0x1565c0, dark: 0x0d47a1 },
            // 장갑 (3단계)
            glove: { light: 0xfff59d, mid: 0xffee58, dark: 0xfbc02d },
            // 반사띠
            reflect: { light: 0xffff8d, mid: 0xffff00, dark: 0xffd600 },
            // 고압세척기 (3단계)
            gun: { light: 0x64b5f6, mid: 0x1976d2, dark: 0x0d47a1 },
            // 금속 (3단계)
            metal: { light: 0x9e9e9e, mid: 0x616161, dark: 0x424242 },
            // 아웃라인
            outline: { skin: 0x8d6e63, helmet: 0xf57f17, uniform: 0xbf360c, pants: 0x0d47a1 }
        };
    }

    // 플레이어 프레임 하나 생성 (고퀄리티 버전)
    createPlayerFrame(key, direction, frame) {
        const g = this.make.graphics({ add: false });
        const size = 64;  // 더 큰 스프라이트
        const cx = 32, cy = 32;
        const p = this.getColorPalette();

        // 걷기 애니메이션
        const walkCycle = [0, -3, 0, 3];
        const legOffset = walkCycle[frame];
        const bodyBob = Math.abs(walkCycle[frame]) * 0.3;

        // ========== 그림자 ==========
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(cx, cy + 24, 14);

        if (direction === 'down') {
            this.drawPlayerFront(g, cx, cy - bodyBob, legOffset, p);
        } else if (direction === 'up') {
            this.drawPlayerBack(g, cx, cy - bodyBob, legOffset, p);
        } else {
            const flip = direction === 'left' ? -1 : 1;
            this.drawPlayerSide(g, cx, cy - bodyBob, legOffset, flip, p);
        }

        g.generateTexture(key, size, size);
    }

    // 정면 그리기
    drawPlayerFront(g, cx, cy, legOffset, p) {
        // ===== 다리 (뒤쪽) =====
        // 왼다리 아웃라인
        g.fillStyle(p.outline.pants, 1);
        g.fillRect(cx - 9 + legOffset, cy + 6, 8, 18);
        // 왼다리
        g.fillStyle(p.pants.dark, 1);
        g.fillRect(cx - 8 + legOffset, cy + 7, 6, 16);
        g.fillStyle(p.pants.mid, 1);
        g.fillRect(cx - 7 + legOffset, cy + 7, 4, 16);
        g.fillStyle(p.pants.light, 1);
        g.fillRect(cx - 6 + legOffset, cy + 8, 2, 14);

        // 오른다리 아웃라인
        g.fillStyle(p.outline.pants, 1);
        g.fillRect(cx + 1 - legOffset, cy + 6, 8, 18);
        // 오른다리
        g.fillStyle(p.pants.dark, 1);
        g.fillRect(cx + 2 - legOffset, cy + 7, 6, 16);
        g.fillStyle(p.pants.mid, 1);
        g.fillRect(cx + 3 - legOffset, cy + 7, 4, 16);
        g.fillStyle(p.pants.light, 1);
        g.fillRect(cx + 4 - legOffset, cy + 8, 2, 14);

        // ===== 신발 =====
        g.fillStyle(p.metal.dark, 1);
        g.fillRect(cx - 9 + legOffset, cy + 22, 8, 4);
        g.fillRect(cx + 1 - legOffset, cy + 22, 8, 4);
        g.fillStyle(p.metal.mid, 1);
        g.fillRect(cx - 8 + legOffset, cy + 22, 6, 3);
        g.fillRect(cx + 2 - legOffset, cy + 22, 6, 3);

        // ===== 몸통 아웃라인 =====
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx - 12, cy - 8, 24, 18);

        // ===== 몸통 =====
        g.fillStyle(p.uniform.dark, 1);
        g.fillRect(cx - 11, cy - 7, 22, 16);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx - 10, cy - 6, 20, 14);
        // 하이라이트 (왼쪽 밝게)
        g.fillStyle(p.uniform.light, 1);
        g.fillRect(cx - 9, cy - 5, 6, 12);

        // ===== 반사띠 (X자) =====
        g.fillStyle(p.reflect.dark, 1);
        g.fillRect(cx - 9, cy - 3, 18, 4);
        g.fillStyle(p.reflect.mid, 1);
        g.fillRect(cx - 8, cy - 2, 16, 2);
        g.fillStyle(p.reflect.light, 1);
        g.fillRect(cx - 6, cy - 2, 4, 2);
        // 세로 반사띠
        g.fillStyle(p.reflect.mid, 1);
        g.fillRect(cx - 2, cy - 5, 4, 12);

        // ★★★ DY 로고 (작업복 가슴) - 단순하고 명확하게 ★★★
        // 노란색 배경 (눈에 잘 띄게)
        g.fillStyle(0xffeb3b, 1);
        g.fillRect(cx - 6, cy - 5, 12, 8);
        // 검정 테두리 (얇게)
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 6, cy - 5, 12, 1);
        g.fillRect(cx - 6, cy + 2, 12, 1);
        g.fillRect(cx - 6, cy - 5, 1, 8);
        g.fillRect(cx + 5, cy - 5, 1, 8);
        // DY 글자 (진한 파란색)
        g.fillStyle(0x0d47a1, 1);
        // D
        g.fillRect(cx - 4, cy - 3, 2, 5);
        g.fillRect(cx - 2, cy - 3, 1, 1);
        g.fillRect(cx - 2, cy + 1, 1, 1);
        g.fillRect(cx - 1, cy - 2, 1, 3);
        // Y
        g.fillRect(cx + 1, cy - 3, 1, 2);
        g.fillRect(cx + 3, cy - 3, 1, 2);
        g.fillRect(cx + 2, cy - 1, 1, 3);

        // ===== 왼팔 =====
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx - 17, cy - 5, 7, 14);
        g.fillStyle(p.uniform.dark, 1);
        g.fillRect(cx - 16, cy - 4, 5, 12);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx - 15, cy - 3, 4, 10);

        // 왼손 (장갑)
        g.fillStyle(p.glove.dark, 1);
        g.fillCircle(cx - 14, cy + 10, 4);
        g.fillStyle(p.glove.mid, 1);
        g.fillCircle(cx - 14, cy + 10, 3);
        g.fillStyle(p.glove.light, 1);
        g.fillCircle(cx - 15, cy + 9, 1.5);

        // ===== 오른팔 + 고압세척기 =====
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx + 10, cy - 5, 7, 12);
        g.fillStyle(p.uniform.dark, 1);
        g.fillRect(cx + 11, cy - 4, 5, 10);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx + 12, cy - 3, 4, 8);

        // 오른손 (장갑)
        g.fillStyle(p.glove.dark, 1);
        g.fillCircle(cx + 18, cy + 4, 4);
        g.fillStyle(p.glove.mid, 1);
        g.fillCircle(cx + 18, cy + 4, 3);

        // ★ 고압 세척기
        // 본체 아웃라인
        g.fillStyle(p.gun.dark, 1);
        g.fillRect(cx + 14, cy - 2, 16, 10);
        // 본체
        g.fillStyle(p.gun.mid, 1);
        g.fillRect(cx + 15, cy - 1, 14, 8);
        g.fillStyle(p.gun.light, 1);
        g.fillRect(cx + 16, cy, 4, 6);
        // 노즐
        g.fillStyle(p.metal.mid, 1);
        g.fillRect(cx + 28, cy + 1, 8, 5);
        g.fillStyle(p.metal.light, 1);
        g.fillRect(cx + 29, cy + 2, 6, 3);
        // 노즐 끝 (물방울)
        g.fillStyle(0x81d4fa, 1);
        g.fillCircle(cx + 38, cy + 3, 3);
        g.fillStyle(0xb3e5fc, 1);
        g.fillCircle(cx + 37, cy + 2, 1.5);
        // 손잡이
        g.fillStyle(p.metal.dark, 1);
        g.fillRect(cx + 18, cy + 6, 5, 8);
        // 호스
        g.fillStyle(p.gun.dark, 1);
        g.fillRect(cx + 10, cy + 2, 6, 4);

        // ===== 목 =====
        g.fillStyle(p.skin.dark, 1);
        g.fillRect(cx - 3, cy - 12, 6, 6);
        g.fillStyle(p.skin.mid, 1);
        g.fillRect(cx - 2, cy - 11, 4, 4);

        // ===== 얼굴 아웃라인 =====
        g.fillStyle(p.outline.skin, 1);
        g.fillCircle(cx, cy - 18, 11);

        // ===== 얼굴 =====
        g.fillStyle(p.skin.mid, 1);
        g.fillCircle(cx, cy - 18, 10);
        g.fillStyle(p.skin.light, 1);
        g.fillCircle(cx - 2, cy - 20, 6);
        // 볼터치
        g.fillStyle(0xffab91, 0.5);
        g.fillCircle(cx - 6, cy - 16, 3);
        g.fillCircle(cx + 6, cy - 16, 3);

        // 눈
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 4, cy - 18, 3);
        g.fillCircle(cx + 4, cy - 18, 3);
        g.fillStyle(0x3e2723, 1);
        g.fillCircle(cx - 4, cy - 18, 2);
        g.fillCircle(cx + 4, cy - 18, 2);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 5, cy - 19, 1);
        g.fillCircle(cx + 3, cy - 19, 1);

        // 눈썹
        g.fillStyle(0x5d4037, 1);
        g.fillRect(cx - 6, cy - 22, 5, 2);
        g.fillRect(cx + 1, cy - 22, 5, 2);

        // 입 (미소)
        g.fillStyle(0xbf360c, 1);
        g.fillRect(cx - 2, cy - 14, 4, 1);

        // ===== 안전모 아웃라인 =====
        g.fillStyle(p.outline.helmet, 1);
        g.fillRect(cx - 12, cy - 32, 24, 10);
        g.fillCircle(cx, cy - 26, 12);

        // ===== 안전모 =====
        g.fillStyle(p.helmet.dark, 1);
        g.fillRect(cx - 11, cy - 31, 22, 8);
        g.fillCircle(cx, cy - 26, 11);
        g.fillStyle(p.helmet.mid, 1);
        g.fillRect(cx - 10, cy - 30, 20, 6);
        g.fillCircle(cx, cy - 26, 10);
        // 하이라이트
        g.fillStyle(p.helmet.light, 1);
        g.fillCircle(cx - 4, cy - 28, 6);
        g.fillRect(cx - 8, cy - 30, 8, 3);

        // 안전모 챙
        g.fillStyle(p.outline.helmet, 1);
        g.fillRect(cx - 13, cy - 24, 26, 5);
        g.fillStyle(p.helmet.dark, 1);
        g.fillRect(cx - 12, cy - 23, 24, 3);
        g.fillStyle(p.helmet.mid, 1);
        g.fillRect(cx - 10, cy - 23, 8, 2);

        // ★★★ DY 로고 (안전모 정면) ★★★
        // 흰색 배경
        g.fillStyle(0xffffff, 1);
        g.fillRect(cx - 5, cy - 30, 10, 6);
        // 검정 테두리
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 5, cy - 30, 10, 1);
        g.fillRect(cx - 5, cy - 25, 10, 1);
        g.fillRect(cx - 5, cy - 30, 1, 6);
        g.fillRect(cx + 4, cy - 30, 1, 6);
        // DY 글자 (파란색)
        g.fillStyle(0x0d47a1, 1);
        // D
        g.fillRect(cx - 3, cy - 28, 1, 3);
        g.fillRect(cx - 2, cy - 28, 1, 1);
        g.fillRect(cx - 2, cy - 26, 1, 1);
        g.fillRect(cx - 1, cy - 27, 1, 1);
        // Y
        g.fillRect(cx + 1, cy - 28, 1, 1);
        g.fillRect(cx + 3, cy - 28, 1, 1);
        g.fillRect(cx + 2, cy - 27, 1, 2);
    }

    // 후면 그리기
    drawPlayerBack(g, cx, cy, legOffset, p) {
        // ===== 다리 =====
        g.fillStyle(p.outline.pants, 1);
        g.fillRect(cx - 9 + legOffset, cy + 6, 8, 18);
        g.fillRect(cx + 1 - legOffset, cy + 6, 8, 18);
        g.fillStyle(p.pants.mid, 1);
        g.fillRect(cx - 8 + legOffset, cy + 7, 6, 16);
        g.fillRect(cx + 2 - legOffset, cy + 7, 6, 16);
        g.fillStyle(p.pants.dark, 1);
        g.fillRect(cx - 6 + legOffset, cy + 8, 3, 14);
        g.fillRect(cx + 4 - legOffset, cy + 8, 3, 14);

        // 신발
        g.fillStyle(p.metal.dark, 1);
        g.fillRect(cx - 9 + legOffset, cy + 22, 8, 4);
        g.fillRect(cx + 1 - legOffset, cy + 22, 8, 4);

        // ===== 몸통 =====
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx - 12, cy - 8, 24, 18);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx - 11, cy - 7, 22, 16);
        g.fillStyle(p.uniform.dark, 1);
        g.fillRect(cx - 5, cy - 5, 10, 12);

        // 반사띠 (뒷면 X자)
        g.fillStyle(p.reflect.mid, 1);
        g.fillRect(cx - 9, cy - 3, 18, 3);
        g.fillRect(cx - 2, cy - 5, 4, 12);

        // ===== 등에 물탱크 =====
        g.fillStyle(p.gun.dark, 1);
        g.fillRect(cx - 8, cy - 6, 16, 14);
        g.fillStyle(p.gun.mid, 1);
        g.fillRect(cx - 7, cy - 5, 14, 12);
        g.fillStyle(p.gun.light, 1);
        g.fillRect(cx - 6, cy - 4, 4, 10);
        // 탱크 밴드
        g.fillStyle(p.metal.dark, 1);
        g.fillRect(cx - 9, cy - 2, 18, 3);
        g.fillRect(cx - 9, cy + 4, 18, 3);

        // ★★★ DY 로고 (물탱크) ★★★
        // 노란색 배경 (눈에 잘 띄게)
        g.fillStyle(0xffeb3b, 1);
        g.fillRect(cx - 5, cy - 3, 10, 6);
        // 검정 테두리
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 5, cy - 3, 10, 1);
        g.fillRect(cx - 5, cy + 2, 10, 1);
        g.fillRect(cx - 5, cy - 3, 1, 6);
        g.fillRect(cx + 4, cy - 3, 1, 6);
        // DY 글자 (파란색)
        g.fillStyle(0x0d47a1, 1);
        // D
        g.fillRect(cx - 3, cy - 1, 1, 3);
        g.fillRect(cx - 2, cy - 1, 1, 1);
        g.fillRect(cx - 2, cy + 1, 1, 1);
        g.fillRect(cx - 1, cy, 1, 1);
        // Y
        g.fillRect(cx + 1, cy - 1, 1, 1);
        g.fillRect(cx + 3, cy - 1, 1, 1);
        g.fillRect(cx + 2, cy, 1, 2);

        // 양팔
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx - 17, cy - 5, 7, 14);
        g.fillRect(cx + 10, cy - 5, 7, 14);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx - 16, cy - 4, 5, 12);
        g.fillRect(cx + 11, cy - 4, 5, 12);

        // 손
        g.fillStyle(p.glove.mid, 1);
        g.fillCircle(cx - 14, cy + 10, 3);
        g.fillCircle(cx + 14, cy + 10, 3);

        // ===== 뒷머리 =====
        g.fillStyle(p.outline.skin, 1);
        g.fillCircle(cx, cy - 18, 11);
        g.fillStyle(0x5d4037, 1);  // 머리카락 색
        g.fillCircle(cx, cy - 18, 10);
        g.fillStyle(0x4e342e, 1);
        g.fillCircle(cx + 2, cy - 16, 6);

        // ===== 안전모 =====
        g.fillStyle(p.outline.helmet, 1);
        g.fillCircle(cx, cy - 26, 12);
        g.fillStyle(p.helmet.mid, 1);
        g.fillCircle(cx, cy - 26, 11);
        g.fillStyle(p.helmet.dark, 1);
        g.fillCircle(cx + 2, cy - 24, 6);
    }

    // 옆면 그리기
    drawPlayerSide(g, cx, cy, legOffset, flip, p) {
        // ===== 뒷다리 =====
        g.fillStyle(p.outline.pants, 1);
        g.fillRect(cx - 4 - legOffset, cy + 6, 7, 18);
        g.fillStyle(p.pants.dark, 1);
        g.fillRect(cx - 3 - legOffset, cy + 7, 5, 16);

        // ===== 몸통 =====
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx - 8, cy - 8, 16, 18);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx - 7, cy - 7, 14, 16);
        g.fillStyle(flip > 0 ? p.uniform.light : p.uniform.dark, 1);
        g.fillRect(cx - 5, cy - 5, 5, 12);

        // 반사띠
        g.fillStyle(p.reflect.mid, 1);
        g.fillRect(cx - 6, cy - 2, 12, 3);

        // ★★★ DY 로고 (옆면 작업복) ★★★
        // 노란색 배경
        g.fillStyle(0xffeb3b, 1);
        g.fillRect(cx - 4, cy - 6, 8, 5);
        // 검정 테두리
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 4, cy - 6, 8, 1);
        g.fillRect(cx - 4, cy - 2, 8, 1);
        g.fillRect(cx - 4, cy - 6, 1, 5);
        g.fillRect(cx + 3, cy - 6, 1, 5);
        // DY 글자 (파란색)
        g.fillStyle(0x0d47a1, 1);
        // D
        g.fillRect(cx - 2, cy - 4, 1, 2);
        g.fillRect(cx - 1, cy - 4, 1, 1);
        g.fillRect(cx - 1, cy - 3, 1, 1);
        // Y
        g.fillRect(cx + 1, cy - 4, 1, 1);
        g.fillRect(cx + 2, cy - 4, 1, 1);
        g.fillRect(cx + 1, cy - 3, 1, 1);

        // ===== 앞다리 =====
        g.fillStyle(p.outline.pants, 1);
        g.fillRect(cx - 2 + legOffset, cy + 6, 7, 18);
        g.fillStyle(p.pants.mid, 1);
        g.fillRect(cx - 1 + legOffset, cy + 7, 5, 16);
        g.fillStyle(p.pants.light, 1);
        g.fillRect(cx + legOffset, cy + 8, 2, 14);

        // 신발
        g.fillStyle(p.metal.dark, 1);
        g.fillRect(cx - 4 - legOffset, cy + 22, 7, 4);
        g.fillRect(cx - 2 + legOffset, cy + 22, 7, 4);

        // ===== 뒷팔 =====
        g.fillStyle(p.uniform.dark, 1);
        g.fillRect(cx - flip * 6, cy - 4, 5, 10);

        // ===== 고압 세척기 (측면) =====
        // 호스 연결
        g.fillStyle(p.gun.dark, 1);
        g.fillRect(cx + flip * 2, cy - 2, 6, 5);

        // 본체
        g.fillStyle(p.gun.dark, 1);
        g.fillRect(cx + flip * 6, cy - 6, 18, 10);
        g.fillStyle(p.gun.mid, 1);
        g.fillRect(cx + flip * 7, cy - 5, 16, 8);
        g.fillStyle(p.gun.light, 1);
        g.fillRect(cx + flip * 8, cy - 4, 5, 6);

        // 노즐
        g.fillStyle(p.metal.mid, 1);
        g.fillRect(cx + flip * 22, cy - 4, 12, 6);
        g.fillStyle(p.metal.light, 1);
        g.fillRect(cx + flip * 23, cy - 3, 10, 4);

        // 노즐 끝 물방울
        g.fillStyle(0x4fc3f7, 1);
        g.fillCircle(cx + flip * 36, cy - 1, 4);
        g.fillStyle(0xb3e5fc, 1);
        g.fillCircle(cx + flip * 35, cy - 3, 2);

        // 손잡이
        g.fillStyle(p.metal.dark, 1);
        g.fillRect(cx + flip * 10, cy + 2, 6, 8);
        g.fillStyle(p.metal.mid, 1);
        g.fillRect(cx + flip * 11, cy + 3, 4, 6);

        // ===== 앞팔 (총 잡고) =====
        g.fillStyle(p.outline.uniform, 1);
        g.fillRect(cx + flip * 4, cy - 5, 8, 12);
        g.fillStyle(p.uniform.mid, 1);
        g.fillRect(cx + flip * 5, cy - 4, 6, 10);
        g.fillStyle(p.uniform.light, 1);
        g.fillRect(cx + flip * 6, cy - 3, 3, 8);

        // 앞손 (장갑)
        g.fillStyle(p.glove.dark, 1);
        g.fillCircle(cx + flip * 12, cy + 5, 4);
        g.fillStyle(p.glove.mid, 1);
        g.fillCircle(cx + flip * 12, cy + 5, 3);
        g.fillStyle(p.glove.light, 1);
        g.fillCircle(cx + flip * 11, cy + 4, 1.5);

        // ===== 목 =====
        g.fillStyle(p.skin.dark, 1);
        g.fillRect(cx + flip * 1, cy - 12, 5, 5);

        // ===== 얼굴 =====
        g.fillStyle(p.outline.skin, 1);
        g.fillCircle(cx + flip * 3, cy - 18, 11);
        g.fillStyle(p.skin.mid, 1);
        g.fillCircle(cx + flip * 3, cy - 18, 10);
        g.fillStyle(p.skin.light, 1);
        g.fillCircle(cx + flip * 1, cy - 20, 6);
        // 볼터치
        g.fillStyle(0xffab91, 0.5);
        g.fillCircle(cx + flip * 8, cy - 16, 3);

        // 눈
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx + flip * 7, cy - 18, 3);
        g.fillStyle(0x3e2723, 1);
        g.fillCircle(cx + flip * 7, cy - 18, 2);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx + flip * 6, cy - 19, 1);

        // 눈썹
        g.fillStyle(0x5d4037, 1);
        g.fillRect(cx + flip * 5, cy - 22, 5, 2);

        // ===== 안전모 =====
        g.fillStyle(p.outline.helmet, 1);
        g.fillCircle(cx + flip * 3, cy - 26, 12);
        g.fillStyle(p.helmet.mid, 1);
        g.fillCircle(cx + flip * 3, cy - 26, 11);
        g.fillStyle(p.helmet.light, 1);
        g.fillCircle(cx + flip * 1, cy - 28, 6);

        // 안전모 챙
        g.fillStyle(p.outline.helmet, 1);
        g.fillRect(cx + flip * 8, cy - 24, 8, 5);
        g.fillStyle(p.helmet.dark, 1);
        g.fillRect(cx + flip * 9, cy - 23, 6, 3);
    }

    // 모든 플레이어 애니메이션 프레임 생성
    createPlayerAnimationFrames() {
        const directions = ['down', 'left', 'right', 'up'];
        directions.forEach(dir => {
            for (let f = 0; f < 4; f++) {
                this.createPlayerFrame(`player_${dir}_${f}`, dir, f);
            }
        });
    }

    // ========== 고퀄리티 몬스터 텍스처 생성 ==========
    createEnemyTextures() {
        this.createSludgeTexture();         // 슬러지 (진흙)
        this.createToxicTexture();          // 폐수 (독)
        this.createWasteTexture();          // 폐기물 (드럼통)
        this.createGasTexture();            // 유해가스 (유령)
        // ★ 신규 몬스터
        this.createPollutedWaterTexture();  // 오염수
        this.createGreaseTexture();         // 기름때
        this.createOilDrumTexture();        // 폐유통
        this.createSludgeGiantTexture();    // 슬러지 거인
    }

    // 슬러지 (진흙 몬스터) - 48x48
    createSludgeTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 24, cy = 26;

        // 색상 팔레트
        const c = {
            outline: 0x1a0f0a,
            dark: 0x2d1f15,
            mid: 0x4a3728,
            light: 0x6d5344,
            highlight: 0x8b7355
        };

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.2);
        g.fillCircle(cx, cy + 14, 16);

        // ===== 본체 아웃라인 =====
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy, 18);
        g.fillCircle(cx - 10, cy + 8, 12);
        g.fillCircle(cx + 10, cy + 8, 12);
        g.fillCircle(cx, cy + 12, 10);

        // ===== 본체 메인 =====
        g.fillStyle(c.mid, 1);
        g.fillCircle(cx, cy, 16);
        g.fillCircle(cx - 10, cy + 8, 10);
        g.fillCircle(cx + 10, cy + 8, 10);
        g.fillCircle(cx, cy + 12, 8);

        // ===== 셰이딩 (어두운 부분) =====
        g.fillStyle(c.dark, 1);
        g.fillCircle(cx + 4, cy + 4, 10);
        g.fillCircle(cx + 8, cy + 10, 6);

        // ===== 하이라이트 =====
        g.fillStyle(c.light, 1);
        g.fillCircle(cx - 6, cy - 6, 8);
        g.fillCircle(cx - 12, cy + 4, 5);

        g.fillStyle(c.highlight, 0.6);
        g.fillCircle(cx - 8, cy - 8, 4);

        // ===== 진흙 방울 (디테일) =====
        g.fillStyle(c.mid, 1);
        g.fillCircle(cx - 16, cy + 2, 4);
        g.fillCircle(cx + 16, cy + 4, 3);
        g.fillCircle(cx - 6, cy + 16, 3);
        g.fillCircle(cx + 8, cy + 14, 4);

        // ===== 눈 (흰자) =====
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 6, cy - 4, 6);
        g.fillCircle(cx + 6, cy - 4, 6);

        // 눈 (눈동자) - 무서운 빨간 눈
        g.fillStyle(0xb71c1c, 1);
        g.fillCircle(cx - 5, cy - 3, 4);
        g.fillCircle(cx + 7, cy - 3, 4);

        // 눈 (동공)
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 4, cy - 2, 2);
        g.fillCircle(cx + 8, cy - 2, 2);

        // 눈 하이라이트
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 7, cy - 5, 2);
        g.fillCircle(cx + 5, cy - 5, 2);

        // ===== 입 (찡그린 표정) =====
        g.fillStyle(0x1a0f0a, 1);
        g.fillRect(cx - 6, cy + 6, 12, 4);
        g.fillStyle(0x8b0000, 0.8);
        g.fillRect(cx - 5, cy + 7, 10, 2);

        g.generateTexture('enemy_sludge', 48, 48);
    }

    // 폐수 (독 슬라임) - 44x44
    createToxicTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 22, cy = 24;

        // 색상 팔레트
        const c = {
            outline: 0x33691e,
            dark: 0x558b2f,
            mid: 0x7cb342,
            light: 0x9ccc65,
            highlight: 0xc5e1a5,
            glow: 0xdce775
        };

        // ===== 글로우 효과 =====
        g.fillStyle(c.glow, 0.2);
        g.fillCircle(cx, cy, 22);

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.15);
        g.fillCircle(cx, cy + 12, 14);

        // ===== 본체 아웃라인 =====
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy + 2, 16);
        g.fillCircle(cx, cy - 8, 10);

        // ===== 본체 메인 =====
        g.fillStyle(c.mid, 1);
        g.fillCircle(cx, cy + 2, 14);
        g.fillCircle(cx, cy - 8, 8);

        // ===== 셰이딩 =====
        g.fillStyle(c.dark, 1);
        g.fillCircle(cx + 4, cy + 6, 8);

        // ===== 하이라이트 =====
        g.fillStyle(c.light, 1);
        g.fillCircle(cx - 4, cy - 2, 8);
        g.fillCircle(cx - 2, cy - 10, 5);

        g.fillStyle(c.highlight, 0.8);
        g.fillCircle(cx - 6, cy - 4, 4);

        // ===== 독 방울 (위로 올라가는) =====
        g.fillStyle(c.light, 0.7);
        g.fillCircle(cx - 10, cy - 14, 3);
        g.fillCircle(cx + 8, cy - 16, 2);
        g.fillCircle(cx + 12, cy - 10, 2);

        // ===== 눈 (큰 눈) =====
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 5, cy - 2, 5);
        g.fillCircle(cx + 5, cy - 2, 5);

        // 눈동자 (독 녹색)
        g.fillStyle(0x1b5e20, 1);
        g.fillCircle(cx - 4, cy - 1, 3);
        g.fillCircle(cx + 6, cy - 1, 3);

        // 동공
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 3, cy, 1.5);
        g.fillCircle(cx + 7, cy, 1.5);

        // 눈 하이라이트
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 6, cy - 3, 1.5);
        g.fillCircle(cx + 4, cy - 3, 1.5);

        // ===== 입 (O 모양) =====
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy + 8, 4);
        g.fillStyle(0x1b5e20, 0.8);
        g.fillCircle(cx, cy + 8, 3);

        g.generateTexture('enemy_toxic', 44, 44);
    }

    // 폐기물 (드럼통 몬스터) - 56x56
    createWasteTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 28, cy = 30;

        // 색상 팔레트
        const c = {
            outline: 0xbf360c,
            dark: 0xe65100,
            mid: 0xff8f00,
            light: 0xffa726,
            highlight: 0xffcc80,
            rust: 0x8d6e63
        };

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(cx, cy + 20, 18);

        // ===== 드럼통 본체 아웃라인 =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 16, cy - 18, 32, 44);

        // ===== 드럼통 본체 =====
        g.fillStyle(c.mid, 1);
        g.fillRect(cx - 14, cy - 16, 28, 40);

        // ===== 3D 효과 (왼쪽 밝게) =====
        g.fillStyle(c.light, 1);
        g.fillRect(cx - 14, cy - 16, 10, 40);
        g.fillStyle(c.highlight, 0.5);
        g.fillRect(cx - 12, cy - 14, 4, 36);

        // ===== 3D 효과 (오른쪽 어둡게) =====
        g.fillStyle(c.dark, 1);
        g.fillRect(cx + 6, cy - 16, 8, 40);

        // ===== 테두리 줄 =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 16, cy - 18, 32, 5);
        g.fillRect(cx - 16, cy - 4, 32, 4);
        g.fillRect(cx - 16, cy + 10, 32, 4);
        g.fillRect(cx - 16, cy + 21, 32, 5);

        // 테두리 하이라이트
        g.fillStyle(c.light, 0.5);
        g.fillRect(cx - 14, cy - 17, 10, 3);
        g.fillRect(cx - 14, cy - 3, 10, 2);
        g.fillRect(cx - 14, cy + 11, 10, 2);

        // ===== 녹슨 부분 =====
        g.fillStyle(c.rust, 0.6);
        g.fillCircle(cx + 8, cy + 16, 5);
        g.fillCircle(cx - 10, cy + 18, 4);
        g.fillRect(cx + 6, cy - 10, 6, 8);

        // ===== 위험 표시판 =====
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 10, cy - 2, 20, 14);
        g.fillStyle(0xffeb3b, 1);
        g.fillRect(cx - 9, cy - 1, 18, 12);

        // 위험 삼각형
        g.fillStyle(0x000000, 1);
        g.fillTriangle(cx, cy, cx - 7, cy + 9, cx + 7, cy + 9);
        g.fillStyle(0xffeb3b, 1);
        g.fillTriangle(cx, cy + 2, cx - 5, cy + 8, cx + 5, cy + 8);

        // 느낌표
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 1, cy + 3, 2, 3);
        g.fillCircle(cx, cy + 8, 1);

        // ===== 분노의 눈 =====
        // 눈구멍 (어두운 배경)
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 12, cy - 14, 10, 8);
        g.fillRect(cx + 2, cy - 14, 10, 8);

        // 눈 (빨간 빛)
        g.fillStyle(0xd32f2f, 1);
        g.fillCircle(cx - 7, cy - 10, 4);
        g.fillCircle(cx + 7, cy - 10, 4);

        // 눈동자
        g.fillStyle(0xffeb3b, 1);
        g.fillCircle(cx - 6, cy - 10, 2);
        g.fillCircle(cx + 8, cy - 10, 2);

        // 눈 하이라이트
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 8, cy - 11, 1);
        g.fillCircle(cx + 6, cy - 11, 1);

        // ===== 분노 눈썹 =====
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 13, cy - 16, 11, 3);
        g.fillRect(cx + 2, cy - 16, 11, 3);

        // ===== 팔 (옆으로 튀어나옴) =====
        // 왼팔
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 24, cy, 10, 16);
        g.fillStyle(c.mid, 1);
        g.fillRect(cx - 22, cy + 2, 6, 12);
        g.fillStyle(c.light, 1);
        g.fillRect(cx - 22, cy + 2, 3, 12);

        // 오른팔
        g.fillStyle(c.outline, 1);
        g.fillRect(cx + 14, cy, 10, 16);
        g.fillStyle(c.mid, 1);
        g.fillRect(cx + 16, cy + 2, 6, 12);
        g.fillStyle(c.dark, 1);
        g.fillRect(cx + 19, cy + 2, 3, 12);

        g.generateTexture('enemy_waste', 56, 56);
    }

    // 유해가스 (유령) - 52x52
    createGasTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 26, cy = 24;

        // 색상 팔레트
        const c = {
            outline: 0x4a148c,
            dark: 0x6a1b9a,
            mid: 0x9c27b0,
            light: 0xba68c8,
            highlight: 0xe1bee7,
            glow: 0xce93d8
        };

        // ===== 글로우 효과 =====
        g.fillStyle(c.glow, 0.15);
        g.fillCircle(cx, cy + 4, 28);

        // ===== 꼬리 부분 (아래 흩어지는 연기) =====
        g.fillStyle(c.mid, 0.4);
        g.fillCircle(cx - 12, cy + 22, 8);
        g.fillCircle(cx + 12, cy + 22, 8);
        g.fillCircle(cx - 6, cy + 26, 6);
        g.fillCircle(cx + 6, cy + 26, 6);
        g.fillCircle(cx, cy + 24, 7);

        g.fillStyle(c.light, 0.3);
        g.fillCircle(cx - 14, cy + 20, 5);
        g.fillCircle(cx + 14, cy + 20, 5);

        // ===== 본체 아웃라인 =====
        g.fillStyle(c.outline, 0.9);
        g.fillCircle(cx, cy, 18);
        g.fillCircle(cx - 12, cy + 10, 10);
        g.fillCircle(cx + 12, cy + 10, 10);

        // ===== 본체 메인 =====
        g.fillStyle(c.mid, 0.85);
        g.fillCircle(cx, cy, 16);
        g.fillCircle(cx - 12, cy + 10, 8);
        g.fillCircle(cx + 12, cy + 10, 8);

        // ===== 셰이딩 =====
        g.fillStyle(c.dark, 0.6);
        g.fillCircle(cx + 4, cy + 6, 10);
        g.fillCircle(cx + 10, cy + 12, 5);

        // ===== 하이라이트 =====
        g.fillStyle(c.light, 0.7);
        g.fillCircle(cx - 6, cy - 6, 10);
        g.fillCircle(cx - 14, cy + 6, 5);

        g.fillStyle(c.highlight, 0.5);
        g.fillCircle(cx - 8, cy - 8, 5);

        // ===== 빛나는 입자 =====
        g.fillStyle(0xffffff, 0.4);
        g.fillCircle(cx - 10, cy - 10, 2);
        g.fillCircle(cx + 8, cy - 12, 1.5);
        g.fillCircle(cx - 16, cy + 4, 1.5);

        // ===== 눈 (무서운 빈 눈) =====
        // 눈 외곽 (검은 그림자)
        g.fillStyle(0x000000, 0.8);
        g.fillCircle(cx - 6, cy - 2, 7);
        g.fillCircle(cx + 6, cy - 2, 7);

        // 눈 구멍 (어두운 보라)
        g.fillStyle(0x1a0033, 1);
        g.fillCircle(cx - 6, cy - 2, 6);
        g.fillCircle(cx + 6, cy - 2, 6);

        // 눈동자 (빛나는 보라)
        g.fillStyle(c.glow, 1);
        g.fillCircle(cx - 6, cy - 2, 3);
        g.fillCircle(cx + 6, cy - 2, 3);

        // 눈 하이라이트
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(cx - 8, cy - 4, 2);
        g.fillCircle(cx + 4, cy - 4, 2);

        // ===== 입 (오 모양, 무서운) =====
        g.fillStyle(0x000000, 0.9);
        g.fillCircle(cx, cy + 10, 6);
        g.fillStyle(0x1a0033, 1);
        g.fillCircle(cx, cy + 10, 5);
        g.fillStyle(c.dark, 0.5);
        g.fillCircle(cx, cy + 11, 3);

        // ===== 뿔 (머리 위) =====
        g.fillStyle(c.outline, 0.8);
        g.fillTriangle(cx - 10, cy - 10, cx - 14, cy - 22, cx - 6, cy - 14);
        g.fillTriangle(cx + 10, cy - 10, cx + 14, cy - 22, cx + 6, cy - 14);

        g.fillStyle(c.mid, 0.7);
        g.fillTriangle(cx - 10, cy - 12, cx - 12, cy - 20, cx - 8, cy - 14);
        g.fillTriangle(cx + 10, cy - 12, cx + 12, cy - 20, cx + 8, cy - 14);

        g.generateTexture('enemy_gas', 52, 52);
    }

    // ★ 오염수 (작고 빠른 물방울) - 36x36
    createPollutedWaterTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 18, cy = 20;
        const c = { outline: 0x0d47a1, dark: 0x1565c0, mid: 0x1976d2, light: 0x42a5f5, highlight: 0x90caf9 };

        // 그림자
        g.fillStyle(0x000000, 0.2);
        g.fillEllipse(cx, cy + 10, 14, 6);

        // 본체 (물방울 형태)
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy, 12);
        g.fillTriangle(cx - 8, cy - 6, cx + 8, cy - 6, cx, cy - 18);

        g.fillStyle(c.mid, 1);
        g.fillCircle(cx, cy, 10);
        g.fillTriangle(cx - 6, cy - 5, cx + 6, cy - 5, cx, cy - 15);

        // 하이라이트
        g.fillStyle(c.light, 0.7);
        g.fillCircle(cx - 3, cy - 3, 5);
        g.fillStyle(c.highlight, 0.6);
        g.fillCircle(cx - 4, cy - 10, 3);
        g.fillStyle(0xffffff, 0.5);
        g.fillCircle(cx - 5, cy - 5, 2);

        // 눈
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 4, cy + 2, 2);
        g.fillCircle(cx + 4, cy + 2, 2);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 5, cy + 1, 1);
        g.fillCircle(cx + 3, cy + 1, 1);

        g.generateTexture('enemy_pollutedWater', 36, 36);
    }

    // ★ 기름때 (끈적한 검은 덩어리) - 56x56
    createGreaseTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 28, cy = 30;
        const c = { outline: 0x1a1a1a, dark: 0x263238, mid: 0x37474f, light: 0x546e7a, highlight: 0x78909c };

        // 그림자
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx, cy + 16, 22, 8);

        // 끈적한 본체
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy, 22);
        g.fillCircle(cx - 15, cy + 8, 10);
        g.fillCircle(cx + 15, cy + 8, 10);
        g.fillCircle(cx, cy + 15, 12);

        g.fillStyle(c.mid, 1);
        g.fillCircle(cx, cy, 19);
        g.fillCircle(cx - 14, cy + 8, 8);
        g.fillCircle(cx + 14, cy + 8, 8);

        // 기름 광택
        g.fillStyle(c.light, 0.6);
        g.fillCircle(cx - 6, cy - 8, 10);
        g.fillStyle(c.highlight, 0.4);
        g.fillCircle(cx - 8, cy - 10, 5);
        g.fillStyle(0xffffff, 0.3);
        g.fillCircle(cx - 10, cy - 10, 3);

        // 눈 (무서운 흰 눈)
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 7, cy - 2, 5);
        g.fillCircle(cx + 7, cy - 2, 5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 6, cy - 1, 3);
        g.fillCircle(cx + 8, cy - 1, 3);

        g.generateTexture('enemy_grease', 56, 56);
    }

    // ★ 폐유통 (폭발하는 드럼통) - 48x48
    createOilDrumTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 24, cy = 26;
        const c = { outline: 0xbf360c, dark: 0xd84315, mid: 0xf4511e, light: 0xff7043, warn: 0xffeb3b };

        // 그림자
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx, cy + 14, 16, 6);

        // 드럼통 본체
        g.fillStyle(c.outline, 1);
        g.fillRoundedRect(cx - 14, cy - 14, 28, 30, 4);

        g.fillStyle(c.dark, 1);
        g.fillRoundedRect(cx - 12, cy - 12, 24, 26, 3);

        // 경고 줄무늬
        g.fillStyle(c.warn, 1);
        g.fillRect(cx - 10, cy - 8, 20, 4);
        g.fillRect(cx - 10, cy + 4, 20, 4);

        // 하이라이트
        g.fillStyle(c.light, 0.5);
        g.fillRect(cx - 10, cy - 10, 6, 22);

        // 위험 마크
        g.fillStyle(0x000000, 1);
        g.fillTriangle(cx, cy - 4, cx - 5, cy + 5, cx + 5, cy + 5);
        g.fillStyle(c.warn, 1);
        g.fillCircle(cx, cy + 2, 2);

        // 눈 (분노)
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 5, cy - 2, 3);
        g.fillCircle(cx + 5, cy - 2, 3);
        g.fillStyle(0xff0000, 1);
        g.fillCircle(cx - 5, cy - 2, 2);
        g.fillCircle(cx + 5, cy - 2, 2);

        g.generateTexture('enemy_oilDrum', 48, 48);
    }

    // ★ 슬러지 거인 (미니보스급) - 80x80
    createSludgeGiantTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 40, cy = 44;
        const c = { outline: 0x1a0f0a, dark: 0x2d1f15, mid: 0x3e2723, light: 0x5d4037, highlight: 0x795548 };

        // 큰 그림자
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(cx, cy + 25, 35, 12);

        // 거대한 본체
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy, 35);
        g.fillCircle(cx - 25, cy + 15, 18);
        g.fillCircle(cx + 25, cy + 15, 18);

        g.fillStyle(c.mid, 1);
        g.fillCircle(cx, cy, 32);
        g.fillCircle(cx - 24, cy + 15, 15);
        g.fillCircle(cx + 24, cy + 15, 15);

        // 질감
        g.fillStyle(c.dark, 0.6);
        g.fillCircle(cx + 10, cy + 10, 20);
        g.fillCircle(cx + 20, cy + 18, 10);

        g.fillStyle(c.light, 0.5);
        g.fillCircle(cx - 12, cy - 12, 18);
        g.fillStyle(c.highlight, 0.3);
        g.fillCircle(cx - 15, cy - 15, 10);

        // 무서운 눈 (3개)
        g.fillStyle(0xff0000, 0.8);
        g.fillCircle(cx - 12, cy - 5, 6);
        g.fillCircle(cx + 12, cy - 5, 6);
        g.fillCircle(cx, cy - 15, 5);

        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 12, cy - 4, 4);
        g.fillCircle(cx + 12, cy - 4, 4);
        g.fillCircle(cx, cy - 14, 3);

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 14, cy - 7, 2);
        g.fillCircle(cx + 10, cy - 7, 2);

        // 이빨
        g.fillStyle(0x000000, 1);
        g.fillRoundedRect(cx - 15, cy + 12, 30, 12, 3);
        g.fillStyle(0xffecb3, 1);
        for (let i = 0; i < 5; i++) {
            g.fillTriangle(cx - 12 + i * 6, cy + 14, cx - 9 + i * 6, cy + 22, cx - 6 + i * 6, cy + 14);
        }

        g.generateTexture('enemy_sludgeGiant', 80, 80);
    }

    // ========== 고퀄리티 보스 텍스처 생성 ==========
    createBossTextures() {
        this.createSludgeKingTexture();
        this.createDrumGiantTexture();
        this.createToxicReaperTexture();
    }

    // 슬러지 킹 (3분 보스) - 120x120
    createSludgeKingTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 60, cy = 65;

        const c = {
            outline: 0x1a0f0a,
            dark: 0x2d1f15,
            mid: 0x4a3728,
            light: 0x6d5344,
            highlight: 0x8b7355,
            crown: { dark: 0xc6930a, mid: 0xffd700, light: 0xffeb3b }
        };

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.3);
        g.fillCircle(cx, cy + 35, 45);

        // ===== 본체 아웃라인 =====
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx, cy, 48);
        g.fillCircle(cx - 28, cy + 20, 28);
        g.fillCircle(cx + 28, cy + 20, 28);
        g.fillCircle(cx, cy + 35, 25);
        g.fillCircle(cx - 15, cy + 40, 18);
        g.fillCircle(cx + 15, cy + 40, 18);

        // ===== 본체 메인 =====
        g.fillStyle(c.mid, 1);
        g.fillCircle(cx, cy, 45);
        g.fillCircle(cx - 28, cy + 20, 25);
        g.fillCircle(cx + 28, cy + 20, 25);
        g.fillCircle(cx, cy + 35, 22);
        g.fillCircle(cx - 15, cy + 40, 15);
        g.fillCircle(cx + 15, cy + 40, 15);

        // ===== 셰이딩 =====
        g.fillStyle(c.dark, 1);
        g.fillCircle(cx + 15, cy + 15, 25);
        g.fillCircle(cx + 25, cy + 25, 15);

        // ===== 하이라이트 =====
        g.fillStyle(c.light, 1);
        g.fillCircle(cx - 15, cy - 15, 25);
        g.fillCircle(cx - 30, cy + 10, 15);

        g.fillStyle(c.highlight, 0.6);
        g.fillCircle(cx - 20, cy - 20, 12);

        // ===== 왕관 아웃라인 =====
        g.fillStyle(c.crown.dark, 1);
        g.fillRect(cx - 28, cy - 48, 56, 20);
        g.fillTriangle(cx - 28, cy - 48, cx - 20, cy - 65, cx - 12, cy - 48);
        g.fillTriangle(cx - 8, cy - 48, cx, cy - 70, cx + 8, cy - 48);
        g.fillTriangle(cx + 12, cy - 48, cx + 20, cy - 65, cx + 28, cy - 48);

        // ===== 왕관 메인 =====
        g.fillStyle(c.crown.mid, 1);
        g.fillRect(cx - 26, cy - 46, 52, 16);
        g.fillTriangle(cx - 26, cy - 46, cx - 20, cy - 60, cx - 14, cy - 46);
        g.fillTriangle(cx - 6, cy - 46, cx, cy - 65, cx + 6, cy - 46);
        g.fillTriangle(cx + 14, cy - 46, cx + 20, cy - 60, cx + 26, cy - 46);

        // 왕관 하이라이트
        g.fillStyle(c.crown.light, 0.8);
        g.fillRect(cx - 24, cy - 44, 20, 10);
        g.fillCircle(cx - 20, cy - 55, 4);
        g.fillCircle(cx, cy - 58, 5);

        // 왕관 보석
        g.fillStyle(0xe53935, 1);
        g.fillCircle(cx, cy - 40, 6);
        g.fillStyle(0xef5350, 1);
        g.fillCircle(cx - 2, cy - 42, 3);

        // ===== 눈 (악마의 눈) =====
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 15, cy - 5, 12);
        g.fillCircle(cx + 15, cy - 5, 12);

        g.fillStyle(0xb71c1c, 1);
        g.fillCircle(cx - 15, cy - 5, 10);
        g.fillCircle(cx + 15, cy - 5, 10);

        g.fillStyle(0xf44336, 1);
        g.fillCircle(cx - 15, cy - 5, 7);
        g.fillCircle(cx + 15, cy - 5, 7);

        g.fillStyle(0xffeb3b, 1);
        g.fillCircle(cx - 13, cy - 5, 4);
        g.fillCircle(cx + 17, cy - 5, 4);

        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 12, cy - 4, 2);
        g.fillCircle(cx + 18, cy - 4, 2);

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 18, cy - 8, 3);
        g.fillCircle(cx + 12, cy - 8, 3);

        // ===== 분노 눈썹 =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 28, cy - 20, 24, 6);
        g.fillRect(cx + 4, cy - 20, 24, 6);

        // ===== 입 (위협적) =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 18, cy + 12, 36, 14);
        g.fillStyle(0x4a0000, 1);
        g.fillRect(cx - 16, cy + 14, 32, 10);

        // 이빨
        g.fillStyle(0xe0e0e0, 1);
        for (let i = 0; i < 5; i++) {
            g.fillTriangle(cx - 14 + i * 8, cy + 14, cx - 10 + i * 8, cy + 22, cx - 6 + i * 8, cy + 14);
        }

        g.generateTexture('boss_sludge_king', 120, 120);
    }

    // 드럼통 거인 (6분 보스) - 140x140
    createDrumGiantTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 70, cy = 75;

        const c = {
            outline: 0x8b0000,
            dark: 0xbf360c,
            mid: 0xe65100,
            light: 0xff8f00,
            highlight: 0xffb74d,
            rust: 0x795548
        };

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.3);
        g.fillCircle(cx, cy + 50, 50);

        // ===== 다리 =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 30, cy + 35, 18, 35);
        g.fillRect(cx + 12, cy + 35, 18, 35);
        g.fillStyle(c.mid, 1);
        g.fillRect(cx - 28, cy + 37, 14, 31);
        g.fillRect(cx + 14, cy + 37, 14, 31);
        g.fillStyle(c.light, 1);
        g.fillRect(cx - 26, cy + 39, 6, 27);
        g.fillRect(cx + 16, cy + 39, 6, 27);

        // ===== 본체 아웃라인 =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 40, cy - 45, 80, 85);

        // ===== 본체 메인 =====
        g.fillStyle(c.mid, 1);
        g.fillRect(cx - 38, cy - 43, 76, 81);

        // 3D 효과
        g.fillStyle(c.light, 1);
        g.fillRect(cx - 38, cy - 43, 25, 81);
        g.fillStyle(c.highlight, 0.5);
        g.fillRect(cx - 35, cy - 40, 10, 75);

        g.fillStyle(c.dark, 1);
        g.fillRect(cx + 15, cy - 43, 23, 81);

        // ===== 테두리 줄 =====
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 42, cy - 48, 84, 10);
        g.fillRect(cx - 42, cy - 15, 84, 8);
        g.fillRect(cx - 42, cy + 15, 84, 8);
        g.fillRect(cx - 42, cy + 35, 84, 10);

        g.fillStyle(c.light, 0.4);
        g.fillRect(cx - 38, cy - 46, 25, 6);
        g.fillRect(cx - 38, cy - 13, 25, 4);

        // ===== 녹슨 부분 =====
        g.fillStyle(c.rust, 0.7);
        g.fillCircle(cx + 20, cy + 25, 10);
        g.fillCircle(cx - 25, cy + 28, 8);
        g.fillCircle(cx + 28, cy - 5, 6);

        // ===== 위험 표시판 =====
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 20, cy - 10, 40, 30);
        g.fillStyle(0xffeb3b, 1);
        g.fillRect(cx - 18, cy - 8, 36, 26);

        g.fillStyle(0x000000, 1);
        g.fillTriangle(cx, cy - 5, cx - 14, cy + 14, cx + 14, cy + 14);
        g.fillStyle(0xffeb3b, 1);
        g.fillTriangle(cx, cy - 2, cx - 11, cy + 12, cx + 11, cy + 12);

        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 2, cy + 1, 4, 6);
        g.fillCircle(cx, cy + 10, 2);

        // ===== 분노의 눈 =====
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 32, cy - 40, 22, 18);
        g.fillRect(cx + 10, cy - 40, 22, 18);

        g.fillStyle(0xd32f2f, 1);
        g.fillCircle(cx - 21, cy - 31, 8);
        g.fillCircle(cx + 21, cy - 31, 8);

        g.fillStyle(0xf44336, 1);
        g.fillCircle(cx - 21, cy - 31, 6);
        g.fillCircle(cx + 21, cy - 31, 6);

        g.fillStyle(0xffeb3b, 1);
        g.fillCircle(cx - 19, cy - 31, 3);
        g.fillCircle(cx + 23, cy - 31, 3);

        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 18, cy - 30, 2);
        g.fillCircle(cx + 24, cy - 30, 2);

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 24, cy - 34, 2);
        g.fillCircle(cx + 18, cy - 34, 2);

        // ===== 분노 눈썹 =====
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 34, cy - 45, 24, 6);
        g.fillRect(cx + 10, cy - 45, 24, 6);

        // ===== 팔 =====
        // 왼팔
        g.fillStyle(c.outline, 1);
        g.fillRect(cx - 62, cy - 10, 24, 40);
        g.fillStyle(c.mid, 1);
        g.fillRect(cx - 60, cy - 8, 20, 36);
        g.fillStyle(c.light, 1);
        g.fillRect(cx - 58, cy - 6, 8, 32);

        // 오른팔
        g.fillStyle(c.outline, 1);
        g.fillRect(cx + 38, cy - 10, 24, 40);
        g.fillStyle(c.mid, 1);
        g.fillRect(cx + 40, cy - 8, 20, 36);
        g.fillStyle(c.dark, 1);
        g.fillRect(cx + 52, cy - 6, 8, 32);

        // 주먹
        g.fillStyle(c.outline, 1);
        g.fillCircle(cx - 50, cy + 32, 14);
        g.fillCircle(cx + 50, cy + 32, 14);
        g.fillStyle(c.mid, 1);
        g.fillCircle(cx - 50, cy + 32, 12);
        g.fillCircle(cx + 50, cy + 32, 12);

        g.generateTexture('boss_drum_giant', 140, 140);
    }

    // 오염의 사신 (9분 최종 보스) - 160x160
    createToxicReaperTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 80, cy = 80;

        const c = {
            cloak: { dark: 0x1a0033, mid: 0x4a148c, light: 0x7b1fa2 },
            bone: { dark: 0x9e9e9e, mid: 0xe0e0e0, light: 0xfafafa },
            scythe: { handle: 0x5d4037, blade: 0x78909c, edge: 0xeceff1 },
            glow: 0xce93d8
        };

        // ===== 글로우 효과 =====
        g.fillStyle(c.glow, 0.15);
        g.fillCircle(cx, cy, 75);

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.3);
        g.fillCircle(cx, cy + 60, 50);

        // ===== 망토 아웃라인 =====
        g.fillStyle(c.cloak.dark, 1);
        g.fillTriangle(cx, cy - 25, cx - 55, cy + 70, cx + 55, cy + 70);
        g.fillCircle(cx, cy - 10, 40);

        // ===== 망토 메인 =====
        g.fillStyle(c.cloak.mid, 0.95);
        g.fillTriangle(cx, cy - 20, cx - 50, cy + 65, cx + 50, cy + 65);
        g.fillCircle(cx, cy - 10, 37);

        // 망토 셰이딩
        g.fillStyle(c.cloak.dark, 0.6);
        g.fillTriangle(cx + 10, cy, cx + 45, cy + 60, cx + 10, cy + 60);

        g.fillStyle(c.cloak.light, 0.4);
        g.fillTriangle(cx - 10, cy - 10, cx - 40, cy + 50, cx - 15, cy + 50);

        // 망토 흩날림
        g.fillStyle(c.cloak.mid, 0.7);
        g.fillCircle(cx - 48, cy + 55, 12);
        g.fillCircle(cx + 48, cy + 55, 12);
        g.fillCircle(cx - 35, cy + 68, 10);
        g.fillCircle(cx + 35, cy + 68, 10);

        // ===== 두건 =====
        g.fillStyle(c.cloak.dark, 1);
        g.fillCircle(cx, cy - 25, 35);
        g.fillTriangle(cx, cy - 70, cx - 25, cy - 25, cx + 25, cy - 25);

        g.fillStyle(c.cloak.mid, 0.9);
        g.fillCircle(cx, cy - 25, 32);
        g.fillTriangle(cx, cy - 65, cx - 22, cy - 25, cx + 22, cy - 25);

        // ===== 해골 얼굴 =====
        g.fillStyle(c.bone.dark, 1);
        g.fillCircle(cx, cy - 15, 26);
        g.fillRect(cx - 15, cy - 5, 30, 25);

        g.fillStyle(c.bone.mid, 1);
        g.fillCircle(cx, cy - 15, 24);
        g.fillRect(cx - 13, cy - 3, 26, 22);

        g.fillStyle(c.bone.light, 0.6);
        g.fillCircle(cx - 8, cy - 22, 12);

        // 눈구멍
        g.fillStyle(0x000000, 1);
        g.fillCircle(cx - 10, cy - 18, 10);
        g.fillCircle(cx + 10, cy - 18, 10);

        // 눈의 빛 (보라색 불꽃)
        g.fillStyle(c.cloak.light, 1);
        g.fillCircle(cx - 10, cy - 18, 6);
        g.fillCircle(cx + 10, cy - 18, 6);

        g.fillStyle(c.glow, 1);
        g.fillCircle(cx - 10, cy - 18, 4);
        g.fillCircle(cx + 10, cy - 18, 4);

        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 12, cy - 20, 2);
        g.fillCircle(cx + 8, cy - 20, 2);

        // 코
        g.fillStyle(c.bone.dark, 1);
        g.fillTriangle(cx, cy - 8, cx - 4, cy - 2, cx + 4, cy - 2);

        // 입 (이빨)
        g.fillStyle(0x000000, 1);
        g.fillRect(cx - 12, cy + 2, 24, 12);
        g.fillStyle(c.bone.mid, 1);
        for (let i = 0; i < 6; i++) {
            g.fillRect(cx - 11 + i * 4, cy + 3, 3, 10);
        }

        // ===== 낫 손잡이 =====
        g.fillStyle(0x3e2723, 1);
        g.fillRect(cx + 40, cy - 55, 12, 120);
        g.fillStyle(c.scythe.handle, 1);
        g.fillRect(cx + 42, cy - 53, 8, 116);
        g.fillStyle(0x6d4c41, 0.5);
        g.fillRect(cx + 44, cy - 51, 3, 112);

        // 손잡이 장식
        g.fillStyle(0xffd700, 1);
        g.fillCircle(cx + 46, cy - 50, 6);
        g.fillRect(cx + 40, cy + 10, 12, 6);
        g.fillRect(cx + 40, cy + 40, 12, 6);

        // ===== 낫 날 =====
        g.fillStyle(c.scythe.blade, 1);
        g.fillTriangle(cx + 52, cy - 55, cx + 100, cy - 70, cx + 52, cy + 5);

        g.fillStyle(c.scythe.edge, 1);
        g.fillTriangle(cx + 54, cy - 50, cx + 90, cy - 62, cx + 54, cy - 5);

        // 날 하이라이트
        g.fillStyle(0xffffff, 0.6);
        g.fillTriangle(cx + 56, cy - 45, cx + 75, cy - 55, cx + 56, cy - 20);

        // ===== 손 (뼈) =====
        g.fillStyle(c.bone.dark, 1);
        g.fillCircle(cx + 46, cy + 15, 10);
        g.fillStyle(c.bone.mid, 1);
        g.fillCircle(cx + 46, cy + 15, 8);

        // 손가락
        for (let i = 0; i < 4; i++) {
            g.fillStyle(c.bone.mid, 1);
            g.fillRect(cx + 38 + i * 5, cy + 20, 4, 12);
        }

        g.generateTexture('boss_toxic_reaper', 160, 160);
    }

    // ========== 고퀄리티 아이템 텍스처 생성 ==========
    createItemTextures() {
        this.createHealthPackTexture();
        this.createMagnetTexture();
        this.createBombTexture();
        this.createInvincibleTexture();
        this.createChestTexture();
    }

    // 체력팩 (응급 키트) - 44x44
    createHealthPackTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 22, cy = 22;

        const c = {
            case: { dark: 0xc62828, mid: 0xe53935, light: 0xef5350 },
            cross: { dark: 0xbdbdbd, mid: 0xffffff, light: 0xffffff },
            metal: { dark: 0x757575, mid: 0x9e9e9e, light: 0xbdbdbd }
        };

        // ===== 글로우 =====
        g.fillStyle(0xff8a80, 0.3);
        g.fillCircle(cx, cy, 22);

        // ===== 케이스 그림자 =====
        g.fillStyle(0x000000, 0.2);
        g.fillRect(cx - 15, cy - 10 + 3, 30, 22);

        // ===== 케이스 본체 =====
        // 아웃라인
        g.fillStyle(c.case.dark, 1);
        g.fillRect(cx - 16, cy - 11, 32, 24);

        // 메인
        g.fillStyle(c.case.mid, 1);
        g.fillRect(cx - 14, cy - 9, 28, 20);

        // 하이라이트
        g.fillStyle(c.case.light, 0.6);
        g.fillRect(cx - 12, cy - 7, 10, 16);

        // ===== 금속 테두리 =====
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 16, cy - 11, 32, 3);
        g.fillRect(cx - 16, cy + 10, 32, 3);

        g.fillStyle(c.metal.mid, 1);
        g.fillRect(cx - 14, cy - 10, 28, 2);
        g.fillRect(cx - 14, cy + 11, 28, 2);

        // ===== 십자가 마크 =====
        // 아웃라인
        g.fillStyle(c.cross.dark, 0.5);
        g.fillRect(cx - 4, cy - 8, 8, 18);
        g.fillRect(cx - 9, cy - 3, 18, 8);

        // 십자가
        g.fillStyle(c.cross.mid, 1);
        g.fillRect(cx - 3, cy - 7, 6, 16);
        g.fillRect(cx - 8, cy - 2, 16, 6);

        // ===== 손잡이 =====
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 4, cy - 14, 8, 4);
        g.fillStyle(c.metal.mid, 1);
        g.fillRect(cx - 3, cy - 13, 6, 2);

        // ===== 잠금장치 =====
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 2, cy + 8, 4, 4);
        g.fillStyle(c.metal.light, 1);
        g.fillCircle(cx, cy + 10, 1);

        g.generateTexture('item_health', 44, 44);
    }

    // 자석 - 44x44
    createMagnetTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 22, cy = 22;

        const c = {
            red: { dark: 0xb71c1c, mid: 0xe53935, light: 0xef5350 },
            blue: { dark: 0x0d47a1, mid: 0x1976d2, light: 0x42a5f5 },
            metal: { dark: 0x424242, mid: 0x757575, light: 0x9e9e9e }
        };

        // ===== 자기장 글로우 =====
        g.fillStyle(0xce93d8, 0.25);
        g.fillCircle(cx, cy, 22);

        // ===== N극 (빨강) =====
        // 아웃라인
        g.fillStyle(c.red.dark, 1);
        g.fillRect(cx - 16, cy - 14, 10, 22);
        g.fillRect(cx - 16, cy - 14, 16, 8);

        // 메인
        g.fillStyle(c.red.mid, 1);
        g.fillRect(cx - 14, cy - 12, 7, 18);
        g.fillRect(cx - 14, cy - 12, 12, 5);

        // 하이라이트
        g.fillStyle(c.red.light, 0.6);
        g.fillRect(cx - 13, cy - 10, 3, 14);

        // N 표시
        g.fillStyle(0xffffff, 1);
        g.fillRect(cx - 13, cy - 2, 2, 6);
        g.fillRect(cx - 13, cy - 2, 4, 2);
        g.fillRect(cx - 9, cy - 2, 2, 6);

        // ===== S극 (파랑) =====
        // 아웃라인
        g.fillStyle(c.blue.dark, 1);
        g.fillRect(cx + 6, cy - 14, 10, 22);
        g.fillRect(cx, cy - 14, 16, 8);

        // 메인
        g.fillStyle(c.blue.mid, 1);
        g.fillRect(cx + 7, cy - 12, 7, 18);
        g.fillRect(cx + 2, cy - 12, 12, 5);

        // 하이라이트
        g.fillStyle(c.blue.light, 0.6);
        g.fillRect(cx + 8, cy - 10, 3, 14);

        // S 표시
        g.fillStyle(0xffffff, 1);
        g.fillRect(cx + 8, cy - 2, 4, 2);
        g.fillRect(cx + 8, cy, 2, 2);
        g.fillRect(cx + 8, cy + 2, 4, 2);
        g.fillRect(cx + 10, cy + 2, 2, 2);

        // ===== 연결부 (금속) =====
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 6, cy + 6, 12, 10);

        g.fillStyle(c.metal.mid, 1);
        g.fillRect(cx - 5, cy + 7, 10, 8);

        g.fillStyle(c.metal.light, 0.5);
        g.fillRect(cx - 4, cy + 8, 4, 6);

        // ===== 자기장 입자 =====
        g.fillStyle(0xce93d8, 0.6);
        g.fillCircle(cx - 18, cy - 6, 2);
        g.fillCircle(cx + 18, cy - 6, 2);
        g.fillCircle(cx - 16, cy + 2, 1.5);
        g.fillCircle(cx + 16, cy + 2, 1.5);

        g.generateTexture('item_magnet', 44, 44);
    }

    // 폭탄 - 48x48
    createBombTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 24, cy = 26;

        const c = {
            body: { dark: 0x1a1a1a, mid: 0x333333, light: 0x4a4a4a },
            fuse: { dark: 0x5d4037, mid: 0x8d6e63, light: 0xa1887f },
            flame: { dark: 0xff5722, mid: 0xff9800, light: 0xffeb3b, white: 0xffffff }
        };

        // ===== 폭발 글로우 =====
        g.fillStyle(0xff6e40, 0.25);
        g.fillCircle(cx, cy, 24);

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.3);
        g.fillCircle(cx + 2, cy + 18, 14);

        // ===== 몸체 아웃라인 =====
        g.fillStyle(c.body.dark, 1);
        g.fillCircle(cx, cy, 17);

        // ===== 몸체 메인 =====
        g.fillStyle(c.body.mid, 1);
        g.fillCircle(cx, cy, 15);

        // ===== 몸체 셰이딩 =====
        g.fillStyle(c.body.light, 1);
        g.fillCircle(cx - 5, cy - 5, 10);

        // 하이라이트
        g.fillStyle(0x666666, 0.8);
        g.fillCircle(cx - 8, cy - 8, 5);

        g.fillStyle(0xffffff, 0.4);
        g.fillCircle(cx - 9, cy - 9, 2);

        // ===== 금속 띠 =====
        g.fillStyle(c.body.dark, 1);
        g.fillRect(cx - 15, cy - 2, 30, 6);
        g.fillStyle(0x5a5a5a, 1);
        g.fillRect(cx - 14, cy - 1, 28, 4);
        g.fillStyle(0x6a6a6a, 0.5);
        g.fillRect(cx - 12, cy, 10, 2);

        // ===== 심지 소켓 =====
        g.fillStyle(c.body.dark, 1);
        g.fillRect(cx - 4, cy - 18, 8, 6);
        g.fillStyle(c.body.mid, 1);
        g.fillRect(cx - 3, cy - 17, 6, 4);

        // ===== 심지 =====
        g.fillStyle(c.fuse.dark, 1);
        g.fillRect(cx - 2, cy - 24, 4, 10);
        g.fillStyle(c.fuse.mid, 1);
        g.fillRect(cx - 1, cy - 23, 2, 8);

        // 심지 꼬임
        g.fillStyle(c.fuse.light, 0.5);
        g.fillRect(cx - 1, cy - 22, 1, 2);
        g.fillRect(cx, cy - 18, 1, 2);

        // ===== 불꽃 =====
        // 외곽 불꽃
        g.fillStyle(c.flame.dark, 0.8);
        g.fillCircle(cx, cy - 26, 8);
        g.fillCircle(cx - 4, cy - 28, 5);
        g.fillCircle(cx + 4, cy - 28, 5);

        // 중간 불꽃
        g.fillStyle(c.flame.mid, 1);
        g.fillCircle(cx, cy - 26, 6);
        g.fillCircle(cx - 3, cy - 28, 4);
        g.fillCircle(cx + 3, cy - 28, 4);

        // 밝은 불꽃
        g.fillStyle(c.flame.light, 1);
        g.fillCircle(cx, cy - 26, 4);
        g.fillCircle(cx - 2, cy - 28, 2);
        g.fillCircle(cx + 2, cy - 28, 2);

        // 흰색 중심
        g.fillStyle(c.flame.white, 1);
        g.fillCircle(cx, cy - 25, 2);

        // ===== 스파크 =====
        g.fillStyle(c.flame.light, 0.8);
        g.fillCircle(cx - 6, cy - 30, 1.5);
        g.fillCircle(cx + 6, cy - 30, 1.5);
        g.fillCircle(cx, cy - 32, 1);

        g.generateTexture('item_bomb', 48, 48);
    }

    // 무적 (방패/별) - 48x48
    createInvincibleTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 24, cy = 24;

        const c = {
            gold: { dark: 0xf9a825, mid: 0xfdd835, light: 0xffee58, white: 0xfffde7 },
            glow: 0xfff59d
        };

        // ===== 빛 글로우 =====
        g.fillStyle(c.glow, 0.3);
        g.fillCircle(cx, cy, 24);

        g.fillStyle(c.glow, 0.2);
        g.fillCircle(cx, cy, 20);

        // ===== 별 외곽 광선 =====
        g.fillStyle(c.gold.mid, 0.4);
        // 8방향 광선
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI / 4) - Math.PI / 2;
            const x1 = cx + Math.cos(angle) * 8;
            const y1 = cy + Math.sin(angle) * 8;
            const x2 = cx + Math.cos(angle) * 22;
            const y2 = cy + Math.sin(angle) * 22;
            g.fillCircle(x2, y2, 3);
        }

        // ===== 별 본체 아웃라인 =====
        g.fillStyle(c.gold.dark, 1);
        // 위
        g.fillTriangle(cx, cy - 18, cx - 6, cy - 4, cx + 6, cy - 4);
        // 아래
        g.fillTriangle(cx, cy + 18, cx - 6, cy + 4, cx + 6, cy + 4);
        // 왼쪽
        g.fillTriangle(cx - 18, cy, cx - 4, cy - 6, cx - 4, cy + 6);
        // 오른쪽
        g.fillTriangle(cx + 18, cy, cx + 4, cy - 6, cx + 4, cy + 6);

        // ===== 별 본체 메인 =====
        g.fillStyle(c.gold.mid, 1);
        g.fillTriangle(cx, cy - 16, cx - 5, cy - 4, cx + 5, cy - 4);
        g.fillTriangle(cx, cy + 16, cx - 5, cy + 4, cx + 5, cy + 4);
        g.fillTriangle(cx - 16, cy, cx - 4, cy - 5, cx - 4, cy + 5);
        g.fillTriangle(cx + 16, cy, cx + 4, cy - 5, cx + 4, cy + 5);

        // ===== 별 하이라이트 =====
        g.fillStyle(c.gold.light, 0.8);
        g.fillTriangle(cx, cy - 14, cx - 4, cy - 5, cx + 2, cy - 5);
        g.fillTriangle(cx - 14, cy, cx - 5, cy - 4, cx - 5, cy + 2);

        // ===== 중심 원 =====
        g.fillStyle(c.gold.dark, 1);
        g.fillCircle(cx, cy, 9);

        g.fillStyle(c.gold.mid, 1);
        g.fillCircle(cx, cy, 8);

        g.fillStyle(c.gold.light, 1);
        g.fillCircle(cx - 2, cy - 2, 5);

        g.fillStyle(c.gold.white, 1);
        g.fillCircle(cx - 3, cy - 3, 2);

        // ===== 반짝임 입자 =====
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx - 10, cy - 12, 2);
        g.fillCircle(cx + 12, cy - 8, 1.5);
        g.fillCircle(cx + 8, cy + 10, 1.5);
        g.fillCircle(cx - 12, cy + 6, 1);

        g.generateTexture('item_invincible', 48, 48);
    }

    // 보물상자 - 52x52
    createChestTexture() {
        const g = this.make.graphics({ add: false });
        const cx = 26, cy = 28;

        const c = {
            wood: { dark: 0x5d4037, mid: 0x795548, light: 0x8d6e63 },
            metal: { dark: 0xc6930a, mid: 0xffc107, light: 0xffd54f },
            gem: { dark: 0x0097a7, mid: 0x00bcd4, light: 0x4dd0e1 }
        };

        // ===== 보물 글로우 =====
        g.fillStyle(0xffe082, 0.3);
        g.fillCircle(cx, cy, 26);

        // ===== 그림자 =====
        g.fillStyle(0x000000, 0.25);
        g.fillRect(cx - 18, cy + 16, 36, 6);

        // ===== 상자 몸체 아웃라인 =====
        g.fillStyle(c.wood.dark, 1);
        g.fillRect(cx - 20, cy - 2, 40, 24);

        // ===== 상자 몸체 =====
        g.fillStyle(c.wood.mid, 1);
        g.fillRect(cx - 18, cy, 36, 20);

        // 나무 결
        g.fillStyle(c.wood.light, 0.4);
        g.fillRect(cx - 16, cy + 2, 4, 16);
        g.fillRect(cx - 8, cy + 2, 4, 16);
        g.fillRect(cx + 4, cy + 2, 4, 16);
        g.fillRect(cx + 12, cy + 2, 4, 16);

        // 어두운 부분
        g.fillStyle(c.wood.dark, 0.3);
        g.fillRect(cx + 8, cy, 10, 20);

        // ===== 뚜껑 아웃라인 =====
        g.fillStyle(c.wood.dark, 1);
        g.fillRect(cx - 22, cy - 14, 44, 16);

        // ===== 뚜껑 본체 =====
        g.fillStyle(c.wood.mid, 1);
        g.fillRect(cx - 20, cy - 12, 40, 12);

        // 뚜껑 하이라이트
        g.fillStyle(c.wood.light, 0.5);
        g.fillRect(cx - 18, cy - 10, 15, 8);

        // ===== 금속 테두리 =====
        // 가로 줄
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 22, cy - 14, 44, 4);
        g.fillRect(cx - 22, cy - 2, 44, 4);

        g.fillStyle(c.metal.mid, 1);
        g.fillRect(cx - 20, cy - 13, 40, 2);
        g.fillRect(cx - 20, cy - 1, 40, 2);

        g.fillStyle(c.metal.light, 0.5);
        g.fillRect(cx - 18, cy - 13, 15, 1);

        // 세로 줄
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 4, cy - 12, 8, 30);

        g.fillStyle(c.metal.mid, 1);
        g.fillRect(cx - 3, cy - 11, 6, 28);

        g.fillStyle(c.metal.light, 0.4);
        g.fillRect(cx - 2, cy - 10, 2, 26);

        // ===== 잠금장치 =====
        g.fillStyle(c.metal.dark, 1);
        g.fillRect(cx - 6, cy + 4, 12, 10);

        g.fillStyle(c.metal.mid, 1);
        g.fillRect(cx - 5, cy + 5, 10, 8);

        // 열쇠구멍
        g.fillStyle(c.wood.dark, 1);
        g.fillCircle(cx, cy + 8, 3);
        g.fillRect(cx - 1, cy + 9, 2, 4);

        // ===== 보석 장식 =====
        // 중앙 보석
        g.fillStyle(c.gem.dark, 1);
        g.fillCircle(cx, cy - 7, 5);
        g.fillStyle(c.gem.mid, 1);
        g.fillCircle(cx, cy - 7, 4);
        g.fillStyle(c.gem.light, 0.8);
        g.fillCircle(cx - 1, cy - 8, 2);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx - 2, cy - 9, 1);

        // 코너 리벳
        g.fillStyle(c.metal.mid, 1);
        g.fillCircle(cx - 18, cy - 10, 3);
        g.fillCircle(cx + 18, cy - 10, 3);
        g.fillCircle(cx - 18, cy + 16, 3);
        g.fillCircle(cx + 18, cy + 16, 3);

        g.fillStyle(c.metal.light, 1);
        g.fillCircle(cx - 19, cy - 11, 1);
        g.fillCircle(cx + 17, cy - 11, 1);

        // ===== 빛나는 입자 =====
        g.fillStyle(0xffffff, 0.7);
        g.fillCircle(cx - 14, cy - 18, 2);
        g.fillCircle(cx + 16, cy - 16, 1.5);
        g.fillCircle(cx + 20, cy + 4, 1.5);

        g.generateTexture('item_chest', 52, 52);
    }

    createTextures() {
        // ========== 플레이어 애니메이션 (4방향 x 4프레임) ==========
        this.createPlayerAnimationFrames();

        // 정지 상태 텍스처 (하단 방향 0프레임)
        this.createPlayerFrame('player_idle', 'down', 0);

        // ========== 고퀄리티 몬스터 텍스처 ==========
        this.createEnemyTextures();

        // 탄환
        const b = this.make.graphics({ add: false });
        b.fillStyle(COLORS.BULLET, 0.3);
        b.fillCircle(10, 10, 9);
        b.fillStyle(0x29b6f6, 1);
        b.fillCircle(10, 10, 6);
        b.fillStyle(0xffffff, 0.8);
        b.fillCircle(8, 8, 2);
        b.generateTexture('bullet', 20, 20);

        // 경험치
        const e = this.make.graphics({ add: false });
        e.fillStyle(COLORS.EXP, 0.4);
        e.fillCircle(10, 10, 9);
        e.fillStyle(0x8bc34a, 1);
        e.fillCircle(10, 10, 6);
        e.fillStyle(0xffffff, 0.6);
        e.fillCircle(8, 8, 2);
        e.generateTexture('exp', 20, 20);

        // 정화 오브
        const o = this.make.graphics({ add: false });
        o.fillStyle(0x00a8e8, 0.3);
        o.fillCircle(12, 12, 11);
        o.fillStyle(0x03a9f4, 1);
        o.fillCircle(12, 12, 8);
        o.fillStyle(0xffffff, 0.5);
        o.fillCircle(10, 10, 3);
        o.generateTexture('orb', 24, 24);

        // 파티클
        const pt = this.make.graphics({ add: false });
        pt.fillStyle(0xffffff, 1);
        pt.fillCircle(6, 6, 5);
        pt.generateTexture('particle', 12, 12);

        // ========== 고퀄리티 보스 텍스처 ==========
        this.createBossTextures();

        // ========== 고퀄리티 아이템 텍스처 ==========
        this.createItemTextures();

        // 경고 효과 텍스처
        const warn = this.make.graphics({ add: false });
        warn.lineStyle(4, 0xff0000, 1);
        warn.strokeCircle(40, 40, 35);
        warn.strokeCircle(40, 40, 25);
        warn.fillStyle(0xff0000, 0.3);
        warn.fillCircle(40, 40, 35);
        warn.generateTexture('warning', 80, 80);

        // 총구 섬광 (Muzzle Flash)
        const mf = this.make.graphics({ add: false });
        // 외곽 글로우
        mf.fillStyle(0x00d4ff, 0.3);
        mf.fillCircle(16, 16, 14);
        // 중간 밝기
        mf.fillStyle(0x80eaff, 0.6);
        mf.fillCircle(16, 16, 10);
        // 중심 (흰색)
        mf.fillStyle(0xffffff, 1);
        mf.fillCircle(16, 16, 5);
        mf.generateTexture('muzzle_flash', 32, 32);

        // 발사 팔 프레임 (각 방향)
        this.createShootingFrames();
    }

    // 발사 중인 플레이어 프레임 생성
    createShootingFrames() {
        const directions = ['down', 'left', 'right', 'up'];
        directions.forEach(dir => {
            this.createShootingFrame(`player_shoot_${dir}`, dir);
        });
    }

    createShootingFrame(key, direction) {
        const g = this.make.graphics({ add: false });
        const cx = 24, cy = 24;

        // 그림자
        g.fillStyle(0x000000, 0.2);
        g.fillCircle(cx, cy + 16, 10);

        if (direction === 'down' || direction === 'up') {
            // 다리
            g.fillStyle(0x1565c0, 1);
            g.fillRect(cx - 6, cy + 4, 4, 12);
            g.fillRect(cx + 2, cy + 4, 4, 12);

            // 몸통
            g.fillStyle(0xff6f00, 1);
            g.fillRect(cx - 8, cy - 6, 16, 12);

            // 반사띠
            g.fillStyle(0xffff00, 0.9);
            g.fillRect(cx - 7, cy - 2, 14, 2);

            // 팔 (발사 자세 - 앞으로 뻗음)
            g.fillStyle(0xff6f00, 1);
            if (direction === 'down') {
                // 정면 발사: 양팔 앞으로
                g.fillRect(cx - 14, cy - 2, 7, 6);
                g.fillRect(cx + 7, cy - 2, 7, 6);
            } else {
                // 후면 발사
                g.fillRect(cx - 12, cy - 4, 5, 10);
                g.fillRect(cx + 7, cy - 4, 5, 10);
            }

            // 손 (밝은 장갑)
            g.fillStyle(0xffeb3b, 1);
            if (direction === 'down') {
                g.fillCircle(cx - 16, cy + 1, 3);
                g.fillCircle(cx + 16, cy + 1, 3);
            } else {
                g.fillCircle(cx - 10, cy + 7, 3);
                g.fillCircle(cx + 10, cy + 7, 3);
            }

            // 얼굴
            g.fillStyle(0xffccbc, 1);
            g.fillCircle(cx, cy - 10, 8);

            if (direction === 'down') {
                // 눈 (발사 시 집중 표정)
                g.fillStyle(0x000000, 1);
                g.fillRect(cx - 4, cy - 11, 3, 2);
                g.fillRect(cx + 1, cy - 11, 3, 2);
            }

            // 안전모
            g.fillStyle(0xffd600, 1);
            g.fillRect(cx - 8, cy - 20, 16, 6);
            g.fillCircle(cx, cy - 16, 8);
            g.fillStyle(0xffab00, 1);
            if (direction === 'down') {
                g.fillRect(cx - 9, cy - 14, 18, 3);
            }

        } else {
            // 좌우 발사
            const flip = direction === 'left' ? -1 : 1;

            // 다리
            g.fillStyle(0x1565c0, 1);
            g.fillRect(cx - 3, cy + 4, 4, 12);
            g.fillRect(cx - 1, cy + 4, 4, 12);

            // 몸통
            g.fillStyle(0xff6f00, 1);
            g.fillRect(cx - 6, cy - 6, 12, 12);

            // 반사띠
            g.fillStyle(0xffff00, 0.9);
            g.fillRect(cx - 5, cy - 2, 10, 2);

            // 팔 (발사 방향으로 뻗음)
            g.fillStyle(0xff6f00, 1);
            g.fillRect(cx + flip * 4, cy - 4, 12 * flip, 6);

            // 손
            g.fillStyle(0xffeb3b, 1);
            g.fillCircle(cx + flip * 18, cy - 1, 4);

            // 얼굴
            g.fillStyle(0xffccbc, 1);
            g.fillCircle(cx + flip * 2, cy - 10, 8);

            // 눈 (집중)
            g.fillStyle(0x000000, 1);
            g.fillRect(cx + flip * 4, cy - 11, 3, 2);

            // 안전모
            g.fillStyle(0xffd600, 1);
            g.fillRect(cx - 6, cy - 20, 12, 6);
            g.fillCircle(cx + flip * 2, cy - 16, 8);
            g.fillStyle(0xffab00, 1);
            g.fillRect(cx + flip * 4, cy - 14, 6, 3);
        }

        g.generateTexture(key, 48, 48);
    }

    create() {
        this.time.delayedCall(300, () => this.scene.start('TitleScene'));
    }
}

// ==========================================
// TitleScene
// ==========================================
class TitleScene extends Phaser.Scene {
    constructor() { super({ key: 'TitleScene' }); }

    create() {
        // ★ 사운드 초기화
        gameSoundManager.init();
        this.input.once('pointerdown', () => gameSoundManager.unlock());

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.add.rectangle(w/2, h/2, w, h, COLORS.BG);
        this.add.text(w/2, h/2-100, 'DY라이크', { fontSize: '64px', fontStyle: 'bold', fill: '#00a8e8' }).setOrigin(0.5);
        this.add.text(w/2, h/2-40, '디와이산업개발 환경정화 시뮬레이터', { fontSize: '18px', fill: '#aaa' }).setOrigin(0.5);

        const btn = this.add.rectangle(w/2, h/2+80, 200, 50, 0x00a8e8).setInteractive({ useHandCursor: true });
        this.add.text(w/2, h/2+80, '게임 시작', { fontSize: '24px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
        // btn.on('pointerdown', () => this.scene.start('GameScene'));  // ★ 기존 코드 (ClassSelectScene으로 변경)
        btn.on('pointerdown', () => { gameSoundManager.unlock(); this.scene.start('ClassSelectScene'); });

        // ★ 사운드 토글 버튼
        const soundBtn = this.add.rectangle(w - 50, 40, 80, 36, 0x4a4a6a)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x00a8e8);
        const soundText = this.add.text(w - 50, 40, gameSoundManager.enabled ? '🔊 ON' : '🔇 OFF', { fontSize: '14px', fill: '#fff' }).setOrigin(0.5);
        soundBtn.on('pointerdown', () => {
            const on = gameSoundManager.toggle();
            soundText.setText(on ? '🔊 ON' : '🔇 OFF');
        });
        soundBtn.on('pointerover', () => soundBtn.setFillStyle(0x5a5a7a));
        soundBtn.on('pointerout', () => soundBtn.setFillStyle(0x4a4a6a));

        // ★ 전체화면 버튼 추가 (가운데 위쪽으로 이동)
        const fullscreenBtn = this.add.rectangle(w/2, 40, 120, 40, 0x4a4a6a)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, 0x00a8e8);
        const fullscreenText = this.add.text(w/2, 40, '⛶ 전체화면', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);

        fullscreenBtn.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
                fullscreenText.setText('⛶ 전체화면');
            } else {
                this.scale.startFullscreen();
                fullscreenText.setText('⛶ 창모드');
            }
        });
        fullscreenBtn.on('pointerover', () => fullscreenBtn.setFillStyle(0x5a5a7a));
        fullscreenBtn.on('pointerout', () => fullscreenBtn.setFillStyle(0x4a4a6a));

        this.add.text(w/2, h-40, 'WASD/방향키로 이동', { fontSize: '14px', fill: '#666' }).setOrigin(0.5);

        // this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));  // ★ 기존 코드
        this.input.keyboard.once('keydown-SPACE', () => this.scene.start('ClassSelectScene'));
    }
}

// ==========================================
// ★ ClassSelectScene (클래스 + 난이도 선택)
// ==========================================
class ClassSelectScene extends Phaser.Scene {
    constructor() { super({ key: 'ClassSelectScene' }); }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.selectedDifficulty = 'normal';  // 기본 난이도

        this.add.rectangle(w/2, h/2, w, h, COLORS.BG);
        this.add.text(w/2, 35, '클래스 & 난이도 선택', { fontSize: '36px', fontStyle: 'bold', fill: '#00a8e8' }).setOrigin(0.5);

        // ★★★ 난이도 선택 UI ★★★
        this.add.text(w/2, 70, '난이도', { fontSize: '16px', fill: '#aaa' }).setOrigin(0.5);

        const diffKeys = Object.keys(DIFFICULTY);
        const diffBtnWidth = 100;
        const diffGap = 15;
        const diffStartX = w/2 - ((diffKeys.length - 1) * (diffBtnWidth + diffGap)) / 2;

        this.diffButtons = [];
        this.diffTexts = [];

        diffKeys.forEach((key, i) => {
            const diff = DIFFICULTY[key];
            const x = diffStartX + i * (diffBtnWidth + diffGap);
            const y = 105;

            const btn = this.add.rectangle(x, y, diffBtnWidth, 32, key === 'normal' ? diff.color : 0x3a3a4a)
                .setStrokeStyle(2, diff.color)
                .setInteractive({ useHandCursor: true });

            const txt = this.add.text(x, y, diff.name, {
                fontSize: '14px', fontStyle: 'bold', fill: '#fff'
            }).setOrigin(0.5);

            btn.diffKey = key;
            this.diffButtons.push(btn);
            this.diffTexts.push(txt);

            btn.on('pointerdown', () => {
                this.selectedDifficulty = key;
                this.updateDifficultyUI();
            });
            btn.on('pointerover', () => btn.setStrokeStyle(3, diff.color));
            btn.on('pointerout', () => btn.setStrokeStyle(2, diff.color));
        });

        // 난이도 설명 텍스트
        this.diffDescText = this.add.text(w/2, 135, DIFFICULTY.normal.desc, {
            fontSize: '12px', fill: '#888'
        }).setOrigin(0.5);

        // ★★★ 클래스 선택 UI ★★★
        const classKeys = Object.keys(CLASS_TYPES);
        const cardWidth = 200;
        const gap = 25;
        const startX = w/2 - ((classKeys.length - 1) * (cardWidth + gap)) / 2;

        classKeys.forEach((key, i) => {
            const classInfo = CLASS_TYPES[key];
            const x = startX + i * (cardWidth + gap);
            const y = h/2 + 60;

            // 카드 배경
            const card = this.add.rectangle(x, y, cardWidth, 260, 0x2a2a4a)
                .setStrokeStyle(3, classInfo.color)
                .setInteractive({ useHandCursor: true });

            // ★ Canvas 미니 일러스트 (캐릭터 + 무기를 들고 있는 모습)
            this.drawClassPreview(x, y - 70, key, classInfo);

            // 클래스 이름
            this.add.text(x, y + 5, classInfo.name, {
                fontSize: '22px', fontStyle: 'bold', fill: '#fff'
            }).setOrigin(0.5);

            // 설명
            this.add.text(x, y + 35, classInfo.desc, {
                fontSize: '11px', fill: '#aaa',
                wordWrap: { width: cardWidth - 20 },
                align: 'center'
            }).setOrigin(0.5);

            // 시작 무기 (더 크게 + 아이콘 강조)
            const startWeapon = WEAPONS[classInfo.startWeapon];
            this.add.text(x, y + 70, `시작 무기`, {
                fontSize: '9px', fill: '#888'
            }).setOrigin(0.5);
            const weaponBg = this.add.rectangle(x, y + 95, cardWidth - 30, 28, 0x1a1a2e)
                .setStrokeStyle(1, 0x7cb342, 0.6);
            this.add.text(x, y + 95, `${startWeapon.icon} ${startWeapon.name}`, {
                fontSize: '14px', fontStyle: 'bold', fill: '#7cb342'
            }).setOrigin(0.5);

            // 호버 효과
            card.on('pointerover', () => {
                card.setFillStyle(0x3a3a5a);
                card.setStrokeStyle(4, classInfo.color);
            });
            card.on('pointerout', () => {
                card.setFillStyle(0x2a2a4a);
                card.setStrokeStyle(3, classInfo.color);
            });

            // 클릭 시 게임 시작 (난이도 포함)
            card.on('pointerdown', () => {
                this.scene.start('GameScene', {
                    selectedClass: key,
                    difficulty: this.selectedDifficulty
                });
            });
        });

        // 하단 안내
        this.add.text(w/2, h - 25, '1, 2, 3 키로 클래스 선택 | Q, W, E, R 키로 난이도 선택', { fontSize: '12px', fill: '#666' }).setOrigin(0.5);

        // 키보드 단축키 - 클래스
        this.input.keyboard.on('keydown-ONE', () => this.startGame('washer'));
        this.input.keyboard.on('keydown-TWO', () => this.startGame('purifier'));
        this.input.keyboard.on('keydown-THREE', () => this.startGame('technician'));

        // 키보드 단축키 - 난이도
        this.input.keyboard.on('keydown-Q', () => { this.selectedDifficulty = 'easy'; this.updateDifficultyUI(); });
        this.input.keyboard.on('keydown-W', () => { this.selectedDifficulty = 'normal'; this.updateDifficultyUI(); });
        this.input.keyboard.on('keydown-E', () => { this.selectedDifficulty = 'hard'; this.updateDifficultyUI(); });
        this.input.keyboard.on('keydown-R', () => { this.selectedDifficulty = 'hell'; this.updateDifficultyUI(); });
    }

    // ★ 캐릭터 + 무기 미니 일러스트 렌더링
    drawClassPreview(cx, cy, classKey, classInfo) {
        const g = this.add.graphics();
        const color = classInfo.color;
        const r = (color >> 16) & 0xff, gr = (color >> 8) & 0xff, b = color & 0xff;

        if (classKey === 'washer') {
            // 준설공: 둥근 방수복 실루엣 + 오른손에 준설호스
            // 몸체 (넓은 사다리꼴)
            g.fillStyle(0x00838f, 1);
            g.fillRoundedRect(cx - 20, cy - 15, 40, 45, 6);
            // 안전모 (시안)
            g.fillStyle(color, 1);
            g.fillCircle(cx, cy - 22, 14);
            // 안전모 챙
            g.fillStyle(0x006064, 1);
            g.fillRect(cx - 16, cy - 18, 32, 4);
            // 바이저 (검정)
            g.fillStyle(0x1a1a2e, 1);
            g.fillRect(cx - 8, cy - 14, 16, 6);
            // 오른손 호스 (🌊 효과)
            g.lineStyle(4, 0x4dd0e1, 1);
            g.beginPath();
            g.moveTo(cx + 20, cy - 5);
            g.lineTo(cx + 35, cy - 15);
            g.lineTo(cx + 42, cy - 25);
            g.strokePath();
            // 호스 노즐
            g.fillStyle(0x78909c, 1);
            g.fillRect(cx + 38, cy - 30, 8, 10);
            // 물줄기 파티클
            g.fillStyle(0x4dd0e1, 0.7);
            g.fillCircle(cx + 48, cy - 32, 3);
            g.fillCircle(cx + 52, cy - 36, 2);
            g.fillCircle(cx + 46, cy - 38, 2);
            g.fillStyle(0x80deea, 0.5);
            g.fillCircle(cx + 55, cy - 30, 2);
            g.fillCircle(cx + 50, cy - 40, 1.5);
            // 장화
            g.fillStyle(0x00695c, 1);
            g.fillRoundedRect(cx - 16, cy + 28, 14, 10, 3);
            g.fillRoundedRect(cx + 2, cy + 28, 14, 10, 3);
        } else if (classKey === 'purifier') {
            // 세정공: 날카로운 전투복 + 주위에 정화 오브
            // 몸체 (날카로운 역오각형)
            g.fillStyle(0xe65100, 1);
            g.beginPath();
            g.moveTo(cx, cy - 20);
            g.lineTo(cx + 22, cy + 5);
            g.lineTo(cx + 16, cy + 30);
            g.lineTo(cx - 16, cy + 30);
            g.lineTo(cx - 22, cy + 5);
            g.closePath();
            g.fillPath();
            // 안전모 (오렌지)
            g.fillStyle(color, 1);
            g.fillCircle(cx, cy - 24, 13);
            // 바이저 (직사각형)
            g.fillStyle(0x1a1a2e, 1);
            g.fillRect(cx - 10, cy - 20, 20, 7);
            g.fillStyle(0xffab40, 0.6);
            g.fillRect(cx - 9, cy - 19, 18, 5);
            // 정화 오브 3개 (회전 느낌)
            const orbDist = 30;
            for (let oi = 0; oi < 3; oi++) {
                const angle = (oi * Math.PI * 2 / 3) - Math.PI / 2;
                const ox = cx + Math.cos(angle) * orbDist;
                const oy = cy + 5 + Math.sin(angle) * orbDist;
                g.fillStyle(0x2196f3, 0.8);
                g.fillCircle(ox, oy, 5);
                g.fillStyle(0x64b5f6, 0.4);
                g.fillCircle(ox, oy, 8);
            }
            // 안전화
            g.fillStyle(0xbf360c, 1);
            g.fillRoundedRect(cx - 14, cy + 28, 12, 8, 2);
            g.fillRoundedRect(cx + 2, cy + 28, 12, 8, 2);
        } else if (classKey === 'technician') {
            // 신호수: 날씬한 실루엣 + 깃발 + 빨간 안전모
            // 몸체 (날씬한 삼각형 + 형광 조끼 라인)
            g.fillStyle(0xb71c1c, 1);
            g.beginPath();
            g.moveTo(cx, cy - 18);
            g.lineTo(cx + 16, cy + 30);
            g.lineTo(cx - 16, cy + 30);
            g.closePath();
            g.fillPath();
            // 형광 조끼 X 라인
            g.lineStyle(2, 0xffeb3b, 0.8);
            g.beginPath();
            g.moveTo(cx - 10, cy);
            g.lineTo(cx + 10, cy + 20);
            g.moveTo(cx + 10, cy);
            g.lineTo(cx - 10, cy + 20);
            g.strokePath();
            // 빨간 안전모
            g.fillStyle(color, 1);
            g.fillCircle(cx, cy - 22, 12);
            // 안전모 빛 반사
            g.fillStyle(0xef5350, 0.7);
            g.fillCircle(cx - 3, cy - 25, 4);
            // 바이저
            g.fillStyle(0x1a1a2e, 1);
            g.fillRect(cx - 7, cy - 17, 14, 5);
            // 왼손 깃발
            g.lineStyle(2, 0x795548, 1);
            g.beginPath();
            g.moveTo(cx - 18, cy - 5);
            g.lineTo(cx - 30, cy - 35);
            g.strokePath();
            // 깃발 천 (빨강)
            g.fillStyle(0xf44336, 0.9);
            g.beginPath();
            g.moveTo(cx - 30, cy - 35);
            g.lineTo(cx - 15, cy - 30);
            g.lineTo(cx - 18, cy - 22);
            g.lineTo(cx - 32, cy - 27);
            g.closePath();
            g.fillPath();
            // 오른쪽 번개 이펙트 (📡 측정기)
            g.lineStyle(2, 0xffd600, 0.8);
            g.beginPath();
            g.moveTo(cx + 18, cy - 10);
            g.lineTo(cx + 24, cy - 20);
            g.lineTo(cx + 20, cy - 20);
            g.lineTo(cx + 26, cy - 30);
            g.strokePath();
            g.fillStyle(0xffd600, 0.5);
            g.fillCircle(cx + 24, cy - 22, 4);
            // 안전화
            g.fillStyle(0x880e4f, 1);
            g.fillRoundedRect(cx - 12, cy + 28, 10, 8, 2);
            g.fillRoundedRect(cx + 2, cy + 28, 10, 8, 2);
        }
    }

    updateDifficultyUI() {
        const diffKeys = Object.keys(DIFFICULTY);
        diffKeys.forEach((key, i) => {
            const diff = DIFFICULTY[key];
            if (key === this.selectedDifficulty) {
                this.diffButtons[i].setFillStyle(diff.color);
            } else {
                this.diffButtons[i].setFillStyle(0x3a3a4a);
            }
        });
        this.diffDescText.setText(DIFFICULTY[this.selectedDifficulty].desc);
    }

    startGame(classKey) {
        this.scene.start('GameScene', {
            selectedClass: classKey,
            difficulty: this.selectedDifficulty
        });
    }
}

// ==========================================
// GameScene
// ==========================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    // ★ 클래스 + 난이도 선택 데이터 받기
    init(data) {
        this.selectedClass = data?.selectedClass || 'washer';
        this.selectedDifficulty = data?.difficulty || 'normal';
        this.difficultyConfig = DIFFICULTY[this.selectedDifficulty];
    }

    create() {
        // 사운드 해금 (게임 시작 시)
        gameSoundManager.unlock();
        this.gameTime = 0;
        this.isPaused = false;
        this.hitStopActive = false;  // ★ 히트 스톱 상태
        this.invincibleAura = null;  // ★ 무적 오라 참조
        this.lastSkillUIUpdate = -1; // ★ 스킬 UI 업데이트 타이머

        // ★ 클래스 정보 가져오기
        const classInfo = CLASS_TYPES[this.selectedClass];
        const classBonus = classInfo.bonus;

        // ★ 클래스 보너스 적용된 초기 HP
        const baseMaxHp = CONFIG.PLAYER_MAX_HP;
        const hpBonus = classBonus.hpBonus || 0;
        const finalMaxHp = Math.floor(baseMaxHp * (1 + hpBonus));

        // ★ 클래스 보너스 적용된 초기 속도
        const baseSpeed = CONFIG.PLAYER_SPEED;
        const speedBonus = classBonus.speedBonus || 0;
        const finalSpeed = Math.floor(baseSpeed * (1 + speedBonus));

        // ★ 시작 무기 설정
        const startWeapon = classInfo.startWeapon;

        this.playerState = {
            hp: finalMaxHp,
            maxHp: finalMaxHp,
            level: 1,
            exp: 0,
            expToNext: 33,  // ★ 뱀서라이크 스타일 (기존 10 → 33)
            kills: 0,
            speed: finalSpeed,
            invincibleTime: 0,
            // weapons: { waterGun: 1 },  // ★ 기존 코드
            weapons: { [startWeapon]: 1 },  // ★ 클래스별 시작 무기
            passives: {},
            // ★★★ 바벨탑 스타일 신규 시스템 ★★★
            className: this.selectedClass,
            classBonus: classBonus,
            currentFloor: 1,                // 현재 층
            floorTime: 0,                   // 현재 층 진행 시간
            floorBossDefeated: false,       // 현재 층 보스 처치 여부
            equipment: {                     // 장비 슬롯
                weapon: null,
                armor: null,
                gloves: null,
                boots: null,
                accessory: null
            },
            bannedSkills: [],               // 밴된 스킬 목록
            rerollCount: 0                  // 리롤 횟수
        };

        this.spawnTimer = 0;
        this.currentSpawnRate = CONFIG.SPAWN_RATE;

        // 월드
        this.physics.world.setBounds(-5000, -5000, 10000, 10000);
        this.cameras.main.setBounds(-5000, -5000, 10000, 10000);

        // 배경 그리드
        const grid = this.add.graphics();
        grid.lineStyle(1, 0xffffff, 0.05);
        for (let x = -5000; x < 5000; x += 80) {
            grid.moveTo(x, -5000);
            grid.lineTo(x, 5000);
        }
        for (let y = -5000; y < 5000; y += 80) {
            grid.moveTo(-5000, y);
            grid.lineTo(5000, y);
        }
        grid.strokePath();
        grid.setDepth(-1);

        // 플레이어 애니메이션 정의
        this.createPlayerAnimations();

        // 플레이어 (64x64 스프라이트)
        this.player = this.physics.add.sprite(0, 0, 'player_idle');
        this.player.setDepth(10);
        this.player.setCircle(18, 14, 14);  // 64x64에 맞게 조정
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.playerDirection = 'down'; // 현재 방향
        this.playerFacingAngle = Math.PI / 2; // 아래 방향 (준설호스용)

        // 그룹
        this.enemies = this.physics.add.group({ maxSize: CONFIG.MAX_ENEMIES });
        this.bullets = this.physics.add.group({ maxSize: CONFIG.MAX_BULLETS });
        this.expOrbs = this.physics.add.group({ maxSize: CONFIG.MAX_EXP_ORBS });
        this.fieldOrbs = this.add.group();

        // 보스 그룹 (별도 관리)
        this.bosses = this.physics.add.group({ maxSize: 5 });
        this.spawnedBosses = {}; // 이미 스폰된 보스 추적

        // 아이템 그룹
        this.items = this.physics.add.group({ maxSize: 30 });

        // 경고 이펙트 그룹
        this.warnings = this.add.group();

        // 입력
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });

        // 조이스틱
        this.setupJoystick();

        // 충돌
        this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHit, null, this);
        this.physics.add.overlap(this.bullets, this.bosses, this.onBulletHitBoss, null, this);
        this.physics.add.overlap(this.player, this.expOrbs, this.onCollectExp, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.onPlayerHit, null, this);
        this.physics.add.overlap(this.player, this.bosses, this.onPlayerHitBoss, null, this);
        this.physics.add.overlap(this.player, this.items, this.onCollectItem, null, this);

        this.weaponTimers = { waterGun: 0, homingMissile: 0, dredgeHose: 0 };
        this.activeSummons = 0;  // 성능 최적화: 동시 소환 제한 (최대 2)
        this.fieldAngle = 0;

        // 파티클
        this.deathEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 50, max: 150 },
            scale: { start: 1, end: 0 },
            lifespan: 400,
            blendMode: 'ADD',
            emitting: false
        });
        this.deathEmitter.setDepth(15);

        // HUD
        this.createHUD();
    }

    createPlayerAnimations() {
        const directions = ['down', 'left', 'right', 'up'];
        const frameRate = 10;

        directions.forEach(dir => {
            // 각 방향별 걷기 애니메이션
            this.anims.create({
                key: `walk_${dir}`,
                frames: [
                    { key: `player_${dir}_0` },
                    { key: `player_${dir}_1` },
                    { key: `player_${dir}_2` },
                    { key: `player_${dir}_3` }
                ],
                frameRate: frameRate,
                repeat: -1
            });
        });

        // 정지 애니메이션 (각 방향)
        directions.forEach(dir => {
            this.anims.create({
                key: `idle_${dir}`,
                frames: [{ key: `player_${dir}_0` }],
                frameRate: 1,
                repeat: 0
            });
        });
    }

    setupJoystick() {
        this.joystick = { active: false, dx: 0, dy: 0, id: null };

        this.joystickBase = this.add.circle(120, CONFIG.HEIGHT-100, 50, 0xffffff, 0.2).setScrollFactor(0).setDepth(99).setVisible(false);
        this.joystickThumb = this.add.circle(120, CONFIG.HEIGHT-100, 25, 0x00a8e8, 0.8).setScrollFactor(0).setDepth(100).setVisible(false);

        // const zone = this.add.rectangle(CONFIG.WIDTH/4, CONFIG.HEIGHT/2, CONFIG.WIDTH/2, CONFIG.HEIGHT, 0, 0).setScrollFactor(0).setDepth(98).setInteractive();  // 기존: 왼쪽 절반만
        const zone = this.add.rectangle(CONFIG.WIDTH/2, CONFIG.HEIGHT/2, CONFIG.WIDTH, CONFIG.HEIGHT, 0, 0).setScrollFactor(0).setDepth(98).setInteractive();  // 전체 화면 터치

        zone.on('pointerdown', (ptr) => {
            this.joystick.active = true;
            this.joystick.id = ptr.id;
            this.joystick.startX = ptr.x;
            this.joystick.startY = ptr.y;
            this.joystickBase.setPosition(ptr.x, ptr.y).setVisible(true);
            this.joystickThumb.setPosition(ptr.x, ptr.y).setVisible(true);
        });

        this.input.on('pointermove', (ptr) => {
            if (!this.joystick.active || ptr.id !== this.joystick.id) return;
            const dx = ptr.x - this.joystick.startX;
            const dy = ptr.y - this.joystick.startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 0) {
                const clamp = Math.min(dist, 50);
                this.joystick.dx = (dx/dist) * (clamp/50);
                this.joystick.dy = (dy/dist) * (clamp/50);
                this.joystickThumb.setPosition(this.joystick.startX + (dx/dist)*clamp, this.joystick.startY + (dy/dist)*clamp);
            }
        });

        this.input.on('pointerup', (ptr) => {
            if (ptr.id === this.joystick.id) {
                this.joystick.active = false;
                this.joystick.dx = 0;
                this.joystick.dy = 0;
                this.joystickBase.setVisible(false);
                this.joystickThumb.setVisible(false);
            }
        });
    }

    createHUD() {
        this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

        // ★★★ UI 크기 대폭 증가 ★★★
        const topMargin = 12;
        const hpY = topMargin + 5;
        const expY = topMargin + 42;  // HP바 아래 간격 증가

        // HP바 (더 크게)
        this.hpBarBg = this.add.rectangle(160, hpY, 280, 28, COLORS.HP_BG).setStrokeStyle(2, 0x000000);
        this.hpBar = this.add.rectangle(22, hpY, 274, 24, COLORS.HP_BAR).setOrigin(0, 0.5);
        this.hpText = this.add.text(160, hpY, '100/100', { fontSize: '16px', fontStyle: 'bold', fill: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);

        // 레벨 (더 크게)
        this.levelText = this.add.text(320, hpY, 'Lv.1', { fontSize: '22px', fontStyle: 'bold', fill: '#00a8e8', stroke: '#000', strokeThickness: 2 }).setOrigin(0, 0.5);

        // 타이머 (더 크게)
        this.timeText = this.add.text(CONFIG.WIDTH - 70, hpY, '00:00', { fontSize: '22px', fontStyle: 'bold', fill: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0.5);

        // 경험치바 (더 크게)
        this.expBarBg = this.add.rectangle(CONFIG.WIDTH/2, expY, CONFIG.WIDTH - 100, 14, COLORS.EXP_BG).setStrokeStyle(2, 0x000000);
        this.expBar = this.add.rectangle(50, expY, 0, 12, COLORS.EXP_BAR).setOrigin(0, 0.5);

        // 킬 카운트 (더 크게)
        this.killText = this.add.text(CONFIG.WIDTH - 20, expY + 20, '정화: 0', { fontSize: '14px', fontStyle: 'bold', fill: '#aaa' }).setOrigin(1, 0.5);

        // ★★★ 클래스 & 층 표시 (바벨탑 스타일) ★★★
        const classInfo = CLASS_TYPES[this.playerState.className];
        this.classText = this.add.text(380, hpY, `${classInfo.icon} ${classInfo.name}`, {
            fontSize: '16px', fontStyle: 'bold', fill: '#' + classInfo.color.toString(16).padStart(6, '0'),
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0, 0.5);

        const floorInfo = FLOOR_CONFIG[this.playerState.currentFloor - 1];
        this.floorText = this.add.text(500, hpY, `🏢 ${floorInfo.name}`, {
            fontSize: '14px', fontStyle: 'bold', fill: '#ffd700',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0, 0.5);

        // ★ 난이도 표시
        const diffInfo = this.difficultyConfig || DIFFICULTY.normal;
        this.diffText = this.add.text(620, hpY, `[${diffInfo.name}]`, {
            fontSize: '13px', fontStyle: 'bold', fill: '#' + diffInfo.color.toString(16).padStart(6, '0'),
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0, 0.5);

        // FPS
        this.fpsText = this.add.text(CONFIG.WIDTH - 20, CONFIG.HEIGHT - 20, 'FPS: 60', { fontSize: '12px', fill: '#0f0' }).setOrigin(1, 0.5);

        this.hud.add([this.hpBarBg, this.hpBar, this.hpText, this.levelText, this.timeText, this.expBarBg, this.expBar, this.killText, this.classText, this.floorText, this.diffText, this.fpsText]);

        // ★★★ 전체화면 버튼 추가 (게임 중에도 사용 가능) ★★★
        this.fullscreenBtn = this.add.text(CONFIG.WIDTH - 170, hpY, '⛶', {
            fontSize: '20px',
            backgroundColor: '#333',
            padding: { x: 6, y: 4 }
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5).setInteractive();

        this.fullscreenBtn.on('pointerdown', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });
        this.hud.add([this.fullscreenBtn]);

        // ★★★ 사운드 토글 버튼 (게임 중) ★★★
        this.soundBtn = this.add.text(CONFIG.WIDTH - 210, hpY, gameSoundManager.enabled ? '🔊' : '🔇', {
            fontSize: '20px',
            backgroundColor: '#333',
            padding: { x: 6, y: 4 }
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5).setInteractive();
        this.soundBtn.on('pointerdown', () => {
            const on = gameSoundManager.toggle();
            this.soundBtn.setText(on ? '🔊' : '🔇');
        });
        this.hud.add([this.soundBtn]);

        // ★★★ 정지 버튼 추가 ★★★
        this.pauseBtn = this.add.text(CONFIG.WIDTH - 130, hpY, '⏸️', {
            fontSize: '24px',
            backgroundColor: '#333',
            padding: { x: 8, y: 4 }
        }).setScrollFactor(0).setDepth(100).setOrigin(0.5).setInteractive();

        this.pauseBtn.on('pointerdown', () => {
            this.togglePause();
        });

        // ESC 키로도 정지
        this.input.keyboard.on('keydown-ESC', () => {
            this.togglePause();
        });

        this.isPaused = false;

        // ★ 미니맵 생성
        this.createMinimap();

        // ★ 스킬 UI 생성
        this.createSkillUI();
    }

    // ★★★ 정지/재개 토글 ★★★
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.physics.pause();
            this.pauseBtn.setText('▶️');

            // 정지 UI 요소들을 배열로 관리
            this.pauseUI = [];

            // 정지 오버레이
            this.pauseOverlay = this.add.rectangle(CONFIG.WIDTH/2, CONFIG.HEIGHT/2, CONFIG.WIDTH, CONFIG.HEIGHT, 0x000000, 0.8)
                .setScrollFactor(0).setDepth(200);
            this.pauseUI.push(this.pauseOverlay);

            // 일시정지 타이틀
            const pauseTitle = this.add.text(CONFIG.WIDTH/2, 120, '⏸️ 일시정지', {
                fontSize: '36px',
                fontStyle: 'bold',
                fill: '#fff'
            }).setScrollFactor(0).setDepth(201).setOrigin(0.5);
            this.pauseUI.push(pauseTitle);

            // 현재 상태 표시
            const statusText = this.add.text(CONFIG.WIDTH/2, 170,
                `${CLASS_TYPES[this.playerState.className]?.icon || ''} ${CLASS_TYPES[this.playerState.className]?.name || ''} | Lv.${this.playerState.level} | 🏢 ${this.playerState.currentFloor}층`, {
                fontSize: '16px',
                fill: '#aaa'
            }).setScrollFactor(0).setDepth(201).setOrigin(0.5);
            this.pauseUI.push(statusText);

            // ===== 계속하기 버튼 =====
            const continueBtn = this.add.rectangle(CONFIG.WIDTH/2, 240, 220, 50, 0x00a8e8)
                .setStrokeStyle(2, 0x5dc8f7)
                .setScrollFactor(0).setDepth(201)
                .setInteractive({ useHandCursor: true });
            this.pauseUI.push(continueBtn);

            const continueText = this.add.text(CONFIG.WIDTH/2, 240, '▶️ 계속하기', {
                fontSize: '20px', fontStyle: 'bold', fill: '#fff'
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5);
            this.pauseUI.push(continueText);

            continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x1e88e5));
            continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x00a8e8));
            continueBtn.on('pointerdown', () => this.togglePause());

            // ===== 처음부터 다시하기 버튼 =====
            const restartBtn = this.add.rectangle(CONFIG.WIDTH/2, 310, 220, 50, 0x7cb342)
                .setStrokeStyle(2, 0x9ccc65)
                .setScrollFactor(0).setDepth(201)
                .setInteractive({ useHandCursor: true });
            this.pauseUI.push(restartBtn);

            const restartText = this.add.text(CONFIG.WIDTH/2, 310, '🔄 처음부터 다시', {
                fontSize: '18px', fontStyle: 'bold', fill: '#fff'
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5);
            this.pauseUI.push(restartText);

            restartBtn.on('pointerover', () => restartBtn.setFillStyle(0x689f38));
            restartBtn.on('pointerout', () => restartBtn.setFillStyle(0x7cb342));
            restartBtn.on('pointerdown', () => {
                // 같은 클래스로 새 게임 시작
                this.clearPauseUI();
                this.scene.restart({ selectedClass: this.playerState.className });
            });

            // ===== 클래스 선택으로 버튼 =====
            const classBtn = this.add.rectangle(CONFIG.WIDTH/2, 380, 220, 50, 0x9c27b0)
                .setStrokeStyle(2, 0xba68c8)
                .setScrollFactor(0).setDepth(201)
                .setInteractive({ useHandCursor: true });
            this.pauseUI.push(classBtn);

            const classText = this.add.text(CONFIG.WIDTH/2, 380, '👤 클래스 선택', {
                fontSize: '18px', fontStyle: 'bold', fill: '#fff'
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5);
            this.pauseUI.push(classText);

            classBtn.on('pointerover', () => classBtn.setFillStyle(0x7b1fa2));
            classBtn.on('pointerout', () => classBtn.setFillStyle(0x9c27b0));
            classBtn.on('pointerdown', () => {
                this.clearPauseUI();
                this.scene.start('ClassSelectScene');
            });

            // ===== 메인으로 버튼 =====
            const mainBtn = this.add.rectangle(CONFIG.WIDTH/2, 450, 220, 50, 0xe53935)
                .setStrokeStyle(2, 0xef5350)
                .setScrollFactor(0).setDepth(201)
                .setInteractive({ useHandCursor: true });
            this.pauseUI.push(mainBtn);

            const mainText = this.add.text(CONFIG.WIDTH/2, 450, '🏠 메인으로', {
                fontSize: '18px', fontStyle: 'bold', fill: '#fff'
            }).setScrollFactor(0).setDepth(202).setOrigin(0.5);
            this.pauseUI.push(mainText);

            mainBtn.on('pointerover', () => mainBtn.setFillStyle(0xc62828));
            mainBtn.on('pointerout', () => mainBtn.setFillStyle(0xe53935));
            mainBtn.on('pointerdown', () => {
                this.clearPauseUI();
                this.scene.start('TitleScene');
            });

            // ESC 안내
            const escHint = this.add.text(CONFIG.WIDTH/2, CONFIG.HEIGHT - 30, 'ESC: 계속하기', {
                fontSize: '14px', fill: '#666'
            }).setScrollFactor(0).setDepth(201).setOrigin(0.5);
            this.pauseUI.push(escHint);

        } else {
            this.physics.resume();
            this.pauseBtn.setText('⏸️');
            this.clearPauseUI();
        }
    }

    // ★ 일시정지 UI 정리
    clearPauseUI() {
        if (this.pauseUI) {
            this.pauseUI.forEach(obj => {
                if (obj && obj.destroy) obj.destroy();
            });
            this.pauseUI = [];
        }
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
            this.pauseOverlay = null;
        }
    }

    // ★★★ 시너지 체크 시스템 ★★★
    getActiveSynergies() {
        const active = [];
        const allSkills = { ...this.playerState.weapons, ...this.playerState.passives };

        for (const synergy of SYNERGIES) {
            // 모든 필요 스킬이 있는지 확인
            const hasAll = synergy.requires.every(skill => (allSkills[skill] || 0) > 0);
            if (hasAll) {
                active.push(synergy);
            }
        }
        return active;
    }

    // 시너지 보너스 계산 (+ 클래스 보너스 + 장비 보너스)
    getSynergyBonus() {
        const activeSynergies = this.getActiveSynergies();
        const classBonus = this.playerState.classBonus || {};
        const equipBonus = this.getEquipmentBonus ? this.getEquipmentBonus() : {};

        const bonus = {
            damage: 0,
            area: 0,
            cooldown: 0,
            speed: 0,
            armor: 0,
            regen: 0,
            critDamage: 0,
            projectile: 0,
            lifesteal: 0,
            // ★ 클래스 보너스 추가
            waterDamage: classBonus.waterDamage || 0,  // 준설공: 물 공격 데미지
            critBonus: classBonus.critBonus || 0,      // 신호수: 크리티컬 확률
            // ★ 장비 보너스 추가
            attackSpeed: 0,
            expBonus: 0,
            magnetBonus: 0
        };

        // ★ 클래스 보너스 적용
        if (classBonus.areaBonus) bonus.area += classBonus.areaBonus;       // 세정공: 범위
        if (classBonus.cooldownBonus) bonus.cooldown += classBonus.cooldownBonus;  // 세정공: 쿨다운

        // ★ 장비 보너스 적용
        if (equipBonus.damage) bonus.damage += equipBonus.damage;
        if (equipBonus.attackSpeed) bonus.attackSpeed += equipBonus.attackSpeed;
        if (equipBonus.critChance) bonus.critBonus += equipBonus.critChance;
        if (equipBonus.lifesteal) bonus.lifesteal += equipBonus.lifesteal;
        if (equipBonus.expBonus) bonus.expBonus += equipBonus.expBonus;
        if (equipBonus.magnetBonus) bonus.magnetBonus += equipBonus.magnetBonus;

        for (const synergy of activeSynergies) {
            if (synergy.bonus.damage) bonus.damage += synergy.bonus.damage;
            if (synergy.bonus.area) bonus.area += synergy.bonus.area;
            if (synergy.bonus.cooldown) bonus.cooldown += synergy.bonus.cooldown;
            if (synergy.bonus.speed) bonus.speed += synergy.bonus.speed;
            if (synergy.bonus.armor) bonus.armor += synergy.bonus.armor;
            if (synergy.bonus.regen) bonus.regen += synergy.bonus.regen;
            if (synergy.bonus.critDamage) bonus.critDamage += synergy.bonus.critDamage;
            if (synergy.bonus.projectile) bonus.projectile += synergy.bonus.projectile;
            if (synergy.bonus.lifesteal) bonus.lifesteal += synergy.bonus.lifesteal;
        }

        return bonus;
    }

    // ★ 스킬 UI (왼쪽 VS스타일 슬롯 그리드) - 리뉴얼
    createSkillUI() {
        this.skillUI = this.add.container(6, 55).setScrollFactor(0).setDepth(100);
        this.skillIcons = [];

        // 배경 패널 (슬림화: 48px 폭, 반투명)
        const panelBg = this.add.rectangle(0, 0, 48, 340, 0x000000, 0.35)
            .setOrigin(0, 0);
        this.skillUI.add(panelBg);

        // "무기" 라벨 (상단)
        const weaponLabel = this.add.text(24, 6, '⚔ 무기', {
            fontSize: '9px', fontStyle: 'bold', fill: '#00a8e8'
        }).setOrigin(0.5);
        this.skillUI.add(weaponLabel);

        // 무기 빈 슬롯 6개 (2열 x 3행)
        for (let s = 0; s < 6; s++) {
            const col = s % 2;
            const row = Math.floor(s / 2);
            const sx = 12 + col * 24;
            const sy = 22 + row * 28;
            const emptySlot = this.add.rectangle(sx, sy, 22, 22, 0x1a1a2e, 0.4)
                .setStrokeStyle(1, 0x00a8e8, 0.2);
            this.skillUI.add(emptySlot);
        }

        // 구분선
        const divider = this.add.rectangle(24, 110, 40, 1, 0x555555, 0.6);
        this.skillUI.add(divider);

        // "패시브" 라벨
        const passiveLabel = this.add.text(24, 118, '🛡 패시브', {
            fontSize: '9px', fontStyle: 'bold', fill: '#7cb342'
        }).setOrigin(0.5);
        this.skillUI.add(passiveLabel);

        // 패시브 빈 슬롯 6개 (2열 x 3행)
        for (let s = 0; s < 6; s++) {
            const col = s % 2;
            const row = Math.floor(s / 2);
            const sx = 12 + col * 24;
            const sy = 134 + row * 28;
            const emptySlot = this.add.rectangle(sx, sy, 22, 22, 0x1a1a2e, 0.4)
                .setStrokeStyle(1, 0x7cb342, 0.2);
            this.skillUI.add(emptySlot);
        }
    }

    // ★ 스킬 UI 업데이트 - VS스타일 2열 그리드
    updateSkillUI() {
        // 기존 아이콘 제거
        this.skillIcons.forEach(icon => icon.destroy());
        this.skillIcons = [];

        let idx = 0;

        // 무기 표시 (상단 2열 x 3행, 최대 6개)
        for (const [key, level] of Object.entries(this.playerState.weapons)) {
            if (level > 0 && WEAPONS[key]) {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const sx = 12 + col * 24;
                const sy = 22 + row * 28;

                // 아이콘 배경 (채워진 슬롯)
                const bg = this.add.rectangle(sx, sy, 22, 22, 0x1a1a2e, 0.9)
                    .setStrokeStyle(1, 0x00a8e8, 0.8);
                this.skillUI.add(bg);
                this.skillIcons.push(bg);

                // 이모지 아이콘
                const icon = this.add.text(sx, sy - 1, WEAPONS[key].icon, {
                    fontSize: '13px'
                }).setOrigin(0.5);
                this.skillUI.add(icon);
                this.skillIcons.push(icon);

                // VS 스타일 레벨 도트 (하단에 작은 사각형들)
                const maxDots = 5;
                const filledDots = Math.min(Math.ceil(level / 20), maxDots);  // 20레벨 단위로 도트
                for (let d = 0; d < maxDots; d++) {
                    const dotX = sx - 8 + d * 4;
                    const dotY = sy + 13;
                    const dotColor = d < filledDots ? 0xffd700 : 0x333333;
                    const dot = this.add.rectangle(dotX, dotY, 3, 2, dotColor);
                    this.skillUI.add(dot);
                    this.skillIcons.push(dot);
                }

                idx++;
                if (idx >= 6) break;
            }
        }

        // 패시브 표시 (하단 2열 x 3행, 최대 6개)
        idx = 0;
        for (const [key, level] of Object.entries(this.playerState.passives)) {
            if (level > 0 && PASSIVES[key]) {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const sx = 12 + col * 24;
                const sy = 134 + row * 28;

                // 아이콘 배경 (채워진 슬롯)
                const bg = this.add.rectangle(sx, sy, 22, 22, 0x1a1a2e, 0.9)
                    .setStrokeStyle(1, 0x7cb342, 0.8);
                this.skillUI.add(bg);
                this.skillIcons.push(bg);

                // 이모지 아이콘
                const icon = this.add.text(sx, sy - 1, PASSIVES[key].icon, {
                    fontSize: '13px'
                }).setOrigin(0.5);
                this.skillUI.add(icon);
                this.skillIcons.push(icon);

                // VS 스타일 레벨 도트
                const maxDots = 5;
                const filledDots = Math.min(Math.ceil(level / 20), maxDots);
                for (let d = 0; d < maxDots; d++) {
                    const dotX = sx - 8 + d * 4;
                    const dotY = sy + 13;
                    const dotColor = d < filledDots ? 0xffd700 : 0x333333;
                    const dot = this.add.rectangle(dotX, dotY, 3, 2, dotColor);
                    this.skillUI.add(dot);
                    this.skillIcons.push(dot);
                }

                idx++;
                if (idx >= 6) break;
            }
        }

        // ★ 활성화된 시너지 표시 (하단)
        const activeSynergies = this.getActiveSynergies();
        if (activeSynergies.length > 0) {
            const synergyY = 225;
            const synergyLabel = this.add.text(24, synergyY, '⚡시너지', {
                fontSize: '8px', fontStyle: 'bold', fill: '#ff6b6b'
            }).setOrigin(0.5);
            this.skillUI.add(synergyLabel);
            this.skillIcons.push(synergyLabel);

            for (let i = 0; i < Math.min(activeSynergies.length, 3); i++) {
                const synergy = activeSynergies[i];
                const synergyIcon = this.add.text(24, synergyY + 14 + i * 14, synergy.icon, {
                    fontSize: '11px'
                }).setOrigin(0.5);
                this.skillUI.add(synergyIcon);
                this.skillIcons.push(synergyIcon);
            }
        }
    }

    // ★ 미니맵 시스템
    createMinimap() {
        const mapSize = 130;  // 미니맵 크기
        const mapX = CONFIG.WIDTH - mapSize - 15;  // 오른쪽 하단
        const mapY = CONFIG.HEIGHT - mapSize - 35;

        // 미니맵 컨테이너
        this.minimap = this.add.container(mapX, mapY).setScrollFactor(0).setDepth(100);

        // 배경 (반투명)
        this.minimapBg = this.add.rectangle(mapSize/2, mapSize/2, mapSize, mapSize, 0x000000, 0.5);
        this.minimapBg.setStrokeStyle(2, 0x00a8e8);

        // 미니맵 마스크용 그래픽
        this.minimapGraphics = this.add.graphics().setScrollFactor(0).setDepth(101);

        // 플레이어 점 (중앙 고정)
        this.minimapPlayer = this.add.circle(mapSize/2, mapSize/2, 4, 0x00a8e8, 1);

        // 시야 범위 표시
        this.minimapView = this.add.circle(mapSize/2, mapSize/2, 20, 0x00a8e8, 0.15);
        this.minimapView.setStrokeStyle(1, 0x00a8e8, 0.5);

        this.minimap.add([this.minimapBg, this.minimapView, this.minimapPlayer]);

        // 미니맵 설정
        this.minimapConfig = {
            size: mapSize,
            x: mapX,
            y: mapY,
            scale: 25  // 월드 좌표를 미니맵으로 축소하는 비율
        };
    }

    updateMinimap() {
        if (!this.minimapGraphics) return;

        const cfg = this.minimapConfig;
        const centerX = cfg.size / 2;
        const centerY = cfg.size / 2;
        const px = this.player.x;
        const py = this.player.y;

        this.minimapGraphics.clear();

        // 적 표시 (빨간 점)
        this.enemies.children.each(e => {
            if (!e.active) return;
            const relX = (e.x - px) / cfg.scale + centerX;
            const relY = (e.y - py) / cfg.scale + centerY;

            // 미니맵 범위 내에만 표시
            if (relX >= 0 && relX <= cfg.size && relY >= 0 && relY <= cfg.size) {
                this.minimapGraphics.fillStyle(0xff4444, 0.9);
                this.minimapGraphics.fillCircle(cfg.x + relX, cfg.y + relY, 2);
            }
        });

        // 보스 표시 (노란 점, 더 크게)
        this.bosses.children.each(b => {
            if (!b.active) return;
            const relX = (b.x - px) / cfg.scale + centerX;
            const relY = (b.y - py) / cfg.scale + centerY;

            if (relX >= 0 && relX <= cfg.size && relY >= 0 && relY <= cfg.size) {
                this.minimapGraphics.fillStyle(0xffff00, 1);
                this.minimapGraphics.fillCircle(cfg.x + relX, cfg.y + relY, 5);
            }
        });

        // 아이템 표시 (초록 점)
        this.items.children.each(item => {
            if (!item.active) return;
            const relX = (item.x - px) / cfg.scale + centerX;
            const relY = (item.y - py) / cfg.scale + centerY;

            if (relX >= 0 && relX <= cfg.size && relY >= 0 && relY <= cfg.size) {
                this.minimapGraphics.fillStyle(0x44ff44, 1);
                this.minimapGraphics.fillCircle(cfg.x + relX, cfg.y + relY, 3);
            }
        });
    }

    update(time, delta) {
        if (this.isPaused) return;

        this.gameTime += delta;
        this.playerState.floorTime += delta;  // ★ 층 시간도 업데이트
        this.updateHUD();
        this.updateMinimap();       // ★ 미니맵 업데이트
        this.updatePlayer();
        this.updateWeapons(time);
        this.updateSpawning(time);
        this.updateBossSpawning();  // 보스 스폰 체크
        this.updateEnemies();
        this.updateBosses();        // 보스 업데이트
        this.updateItems();         // 아이템 업데이트
        this.updateExpOrbs();
        this.updateBullets();
        this.updateCircleField(delta/1000);

        if (this.playerState.invincibleTime > 0) {
            this.playerState.invincibleTime -= delta;
            this.player.setAlpha(Math.sin(time/50)*0.3+0.7);
        } else {
            this.player.setAlpha(1);
        }

        // 재생
        const regen = this.playerState.passives.regen || 0;
        if (regen > 0 && this.playerState.hp < this.playerState.maxHp) {
            this.playerState.hp = Math.min(this.playerState.maxHp, this.playerState.hp + PASSIVES.regen.effect * regen * delta/1000);
        }

        if (this.gameTime >= CONFIG.GAME_DURATION) this.gameEnd(true);
    }

    updateHUD() {
        const hpPct = this.playerState.hp / this.playerState.maxHp;
        this.hpBar.width = 274 * hpPct;  // ★ 280-6 = 274 (UI 확대)
        this.hpText.setText(`${Math.ceil(this.playerState.hp)}/${this.playerState.maxHp}`);
        this.levelText.setText(`Lv.${this.playerState.level}`);

        const sec = Math.floor(this.gameTime/1000);
        this.timeText.setText(`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`);

        this.expBar.width = (CONFIG.WIDTH - 80) * (this.playerState.exp / this.playerState.expToNext);  // ★ 간격 맞춤
        this.killText.setText(`정화: ${this.playerState.kills}`);
        this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

        // ★ 스킬 UI 업데이트 (1초마다)
        if (Math.floor(this.gameTime / 1000) !== this.lastSkillUIUpdate) {
            this.lastSkillUIUpdate = Math.floor(this.gameTime / 1000);
            this.updateSkillUI();
        }
    }

    updatePlayer() {
        let vx = 0, vy = 0;
        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;

        if (this.joystick.active) {
            vx = this.joystick.dx;
            vy = this.joystick.dy;
        }

        const len = Math.sqrt(vx * vx + vy * vy);

        if (len > 0) {
            // 이동 중
            const speedBonus = 1 + (this.playerState.passives.speed || 0) * PASSIVES.speed.effect;
            const speed = this.playerState.speed * speedBonus;
            const normVx = vx / len;
            const normVy = vy / len;
            vx = normVx * speed;
            vy = normVy * speed;

            // ★ 준설호스용 방향 각도 저장
            this.playerFacingAngle = Math.atan2(normVy, normVx);

            // 방향 결정 (주요 방향)
            let newDir = this.playerDirection;
            if (Math.abs(vx) > Math.abs(vy)) {
                newDir = vx > 0 ? 'right' : 'left';
            } else {
                newDir = vy > 0 ? 'down' : 'up';
            }

            // 방향이 바뀌거나 애니메이션이 재생 중이 아니면 애니메이션 시작
            if (newDir !== this.playerDirection || !this.player.anims.isPlaying) {
                this.playerDirection = newDir;
                this.player.play(`walk_${newDir}`, true);
            }
        } else {
            // 정지
            if (this.player.anims.isPlaying) {
                this.player.stop();
                this.player.setTexture(`player_${this.playerDirection}_0`);
            }
        }

        this.player.setVelocity(vx, vy);
    }

    updateWeapons(time) {
        // ★ 시너지 보너스 적용
        const synergyBonus = this.getSynergyBonus();
        const dmgBonus = 1 + (this.playerState.passives.damage || 0) * PASSIVES.damage.effect + synergyBonus.damage;

        // ★ 클래스 보너스: 물 공격 데미지 (준설공 전용)
        const waterDmgBonus = 1 + (synergyBonus.waterDamage || 0);

        // 고압 세척기 (물 공격 - 준설공 보너스 적용)
        const wgLv = this.playerState.weapons.waterGun || 0;
        if (wgLv > 0) {
            const cd = WEAPONS.waterGun.baseCooldown * (1 - wgLv * 0.05);
            if (time > this.weaponTimers.waterGun + cd) {
                this.fireWaterGun(wgLv, dmgBonus * waterDmgBonus);
                this.weaponTimers.waterGun = time;
            }
        }

        // 유도탄
        const hmLv = this.playerState.weapons.homingMissile || 0;
        if (hmLv > 0) {
            const cd = WEAPONS.homingMissile.baseCooldown * (1 - hmLv * 0.05);
            if (time > this.weaponTimers.homingMissile + cd) {
                this.fireHoming(hmLv, dmgBonus);
                this.weaponTimers.homingMissile = time;
            }
        }

        // ★ 준설호스 (물 공격 - 준설공 보너스 적용)
        const dhLv = this.playerState.weapons.dredgeHose || 0;
        if (dhLv > 0) {
            const cd = WEAPONS.dredgeHose.baseCooldown;
            if (time > this.weaponTimers.dredgeHose + cd) {
                this.fireDredgeHose(dhLv, dmgBonus * waterDmgBonus);
                this.weaponTimers.dredgeHose = time;
            }
        }

        // ★ 신규 무기들 (시너지 보너스 포함)
        const cdBonus = 1 - (this.playerState.passives.cooldown || 0) * PASSIVES.cooldown.effect - synergyBonus.cooldown;
        const areaBonus = 1 + (this.playerState.passives.area || 0) * PASSIVES.area.effect + synergyBonus.area;

        // 산업용 송풍기
        const blowerLv = this.playerState.weapons.blower || 0;
        if (blowerLv > 0) {
            const cd = WEAPONS.blower.baseCooldown * cdBonus * (1 - blowerLv * 0.05);
            if (time > (this.weaponTimers.blower || 0) + cd) {
                this.fireBlower(blowerLv, dmgBonus, areaBonus);
                this.weaponTimers.blower = time;
            }
        }

        // 오염측정기 (체인 번개)
        const detectorLv = this.playerState.weapons.detector || 0;
        if (detectorLv > 0) {
            const cd = WEAPONS.detector.baseCooldown * cdBonus * (1 - detectorLv * 0.05);
            if (time > (this.weaponTimers.detector || 0) + cd) {
                this.fireDetector(detectorLv, dmgBonus);
                this.weaponTimers.detector = time;
            }
        }

        // 보호장갑 (펀치)
        const glovesLv = this.playerState.weapons.gloves || 0;
        if (glovesLv > 0) {
            const cd = WEAPONS.gloves.baseCooldown * cdBonus * (1 - glovesLv * 0.03);
            if (time > (this.weaponTimers.gloves || 0) + cd) {
                this.fireGloves(glovesLv, dmgBonus, areaBonus);
                this.weaponTimers.gloves = time;
            }
        }

        // 소독스프레이 (영역 생성)
        const sprayLv = this.playerState.weapons.spray || 0;
        if (sprayLv > 0) {
            const cd = WEAPONS.spray.baseCooldown * cdBonus * (1 - sprayLv * 0.05);
            if (time > (this.weaponTimers.spray || 0) + cd) {
                this.fireSpray(sprayLv, dmgBonus, areaBonus);
                this.weaponTimers.spray = time;
            }
        }

        // 안전콘 (설치 폭탄)
        const coneLv = this.playerState.weapons.cone || 0;
        if (coneLv > 0) {
            const cd = WEAPONS.cone.baseCooldown * cdBonus * (1 - coneLv * 0.05);
            if (time > (this.weaponTimers.cone || 0) + cd) {
                this.fireCone(coneLv, dmgBonus, areaBonus);
                this.weaponTimers.cone = time;
            }
        }

        // 청소차 (돌진)
        const truckLv = this.playerState.weapons.truck || 0;
        if (truckLv > 0) {
            const cd = WEAPONS.truck.baseCooldown * cdBonus * (1 - truckLv * 0.05);
            if (time > (this.weaponTimers.truck || 0) + cd) {
                this.fireTruck(truckLv, dmgBonus);
                this.weaponTimers.truck = time;
            }
        }

        // 환경드론 (자동 순찰)
        const droneLv = this.playerState.weapons.drone || 0;
        if (droneLv > 0) {
            const cd = WEAPONS.drone.baseCooldown * cdBonus * (1 - droneLv * 0.05);
            if (time > (this.weaponTimers.drone || 0) + cd) {
                this.fireDrone(droneLv, dmgBonus);
                this.weaponTimers.drone = time;
            }
        }

        // 폐수파이프 (관통)
        const pipeLv = this.playerState.weapons.pipe || 0;
        if (pipeLv > 0) {
            const cd = WEAPONS.pipe.baseCooldown * cdBonus * (1 - pipeLv * 0.05);
            if (time > (this.weaponTimers.pipe || 0) + cd) {
                this.firePipe(pipeLv, dmgBonus);
                this.weaponTimers.pipe = time;
            }
        }
    }

    // ========== 데미지 처리 함수 (패시브 적용) ==========
    damageEnemy(enemy, baseDamage) {
        if (!enemy || !enemy.active) return;

        let finalDamage = baseDamage;
        let isCrit = false;

        // 크리티컬 확률 체크 (+ 신호수 클래스 보너스)
        const synergyBonus = this.getSynergyBonus();
        const critChance = (this.playerState.passives.critChance || 0) * PASSIVES.critChance.effect + (synergyBonus.critBonus || 0);
        if (Math.random() < critChance) {
            isCrit = true;
            const critMultiplier = 1.5 + (this.playerState.passives.critDamage || 0) * PASSIVES.critDamage.effect;
            finalDamage *= critMultiplier;
        }

        // 데미지 적용
        enemy.hp -= finalDamage;
        gameSoundManager.play('enemyHit');

        // 크리티컬 이펙트
        if (isCrit) {
            const critText = this.add.text(enemy.x, enemy.y - 20, '★' + Math.floor(finalDamage), {
                fontSize: '16px', fontStyle: 'bold', fill: '#ff5722'
            }).setOrigin(0.5).setDepth(100);

            this.tweens.add({
                targets: critText,
                y: enemy.y - 50,
                alpha: 0,
                duration: 600,
                onComplete: () => critText.destroy()
            });
        }

        // 흡혈 효과
        const lifesteal = (this.playerState.passives.lifesteal || 0) * PASSIVES.lifesteal.effect;
        if (lifesteal > 0) {
            const healAmount = finalDamage * lifesteal;
            this.playerState.hp = Math.min(this.playerState.hp + healAmount, this.playerState.maxHp);

            // 흡혈 파티클 (작은 초록색)
            if (Math.random() < 0.3) { // 30% 확률로 표시
                const healParticle = this.add.circle(enemy.x, enemy.y, 4, 0x7cb342, 0.8).setDepth(50);
                this.tweens.add({
                    targets: healParticle,
                    x: this.player.x,
                    y: this.player.y,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => healParticle.destroy()
                });
            }
        }

        // 적 피격 플래시
        if (enemy.setTint) {
            enemy.setTint(0xff0000);
            this.time.delayedCall(100, () => {
                if (enemy.active && enemy.clearTint) enemy.clearTint();
            });
        }
    }

    fireWaterGun(lv, dmgBonus) {
        const target = this.findClosestEnemy();
        if (!target) return;
        gameSoundManager.play('shoot');

        const dmg = WEAPONS.waterGun.baseDamage * (1 + lv*0.12) * dmgBonus;
        const count = Math.min(lv, 3);
        const baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);

        // ========== 발사 이펙트 (개선) ==========
        // 총구 섬광 강화 (플레이어 tint 제거)
        const flashDist = 30;
        const flashX = this.player.x + Math.cos(baseAngle) * flashDist;
        const flashY = this.player.y + Math.sin(baseAngle) * flashDist;
        const flash = this.add.sprite(flashX, flashY, 'muzzle_flash').setDepth(11);
        flash.setScale(1.2);
        flash.setAlpha(1);
        flash.setRotation(baseAngle);  // 발사 방향으로 회전

        // 섬광 애니메이션 (더 빠르고 강하게)
        this.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 60,
            onComplete: () => flash.destroy()
        });

        // 플레이어 tint 제거 (불편해 보이는 원인)

        // 탄환 발사
        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - (count-1)/2) * 0.15;
            const bullet = this.bullets.get(this.player.x, this.player.y, 'bullet');
            if (bullet) {
                bullet.setActive(true).setVisible(true);
                bullet.setVelocity(Math.cos(angle)*500, Math.sin(angle)*500);
                bullet.damage = dmg;
                bullet.bulletType = 'normal';
            }
        }
    }

    fireHoming(lv, dmgBonus) {
        const dmg = WEAPONS.homingMissile.baseDamage * (1 + lv*0.15) * dmgBonus;
        const count = 1 + Math.floor(lv/2);

        for (let i = 0; i < count; i++) {
            const angle = (Math.PI*2/count)*i + this.gameTime/1000;
            const bullet = this.bullets.get(this.player.x, this.player.y, 'bullet');
            if (bullet) {
                bullet.setActive(true).setVisible(true);
                bullet.setVelocity(Math.cos(angle)*50, Math.sin(angle)*50);
                bullet.damage = dmg;
                bullet.bulletType = 'homing';
                bullet.homingSpeed = 250 + lv*20;
                bullet.life = 3000;
            }
        }
    }

    // ★ 준설호스 (흡입형 범위 공격) - 화면을 채우는 스케일
    fireDredgeHose(lv, dmgBonus) {
        // ★ 너프된 스탯
        const dmg = WEAPONS.dredgeHose.baseDamage * (1 + lv * 0.15) * dmgBonus;  // 데미지 감소
        const range = 150 + lv * 25;  // ★ 사거리 대폭 감소
        const pullStrength = 15 + lv * 5;  // 한 번에 크게 끌어당김

        const px = this.player.x;
        const py = this.player.y;

        // 플레이어가 바라보는 방향
        const target = this.findClosestEnemy();
        let baseAngle;
        if (target) {
            baseAngle = Math.atan2(target.y - py, target.x - px);
        } else {
            baseAngle = this.playerFacingAngle || 0;
        }

        // ========== 뱀처럼 구불구불한 호스 그리기 ==========
        const hoseLength = 80 + lv * 20;  // ★ 길이 감소
        const hoseThickness = 8 + lv;
        const hoseGraphics = this.add.graphics().setDepth(12);
        const time = this.time.now;

        // 호스 경로 계산 (사인파로 구불구불하게)
        const segments = 15;
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const dist = t * hoseLength;
            // 뱀처럼 구불구불 (사인파)
            const wave = Math.sin(t * Math.PI * 3 + time * 0.01) * (15 + lv * 2) * t;
            const perpAngle = baseAngle + Math.PI / 2;
            const x = px + Math.cos(baseAngle) * dist + Math.cos(perpAngle) * wave;
            const y = py + Math.sin(baseAngle) * dist + Math.sin(perpAngle) * wave;
            points.push({ x, y });
        }

        // 호스 외곽 (검정)
        hoseGraphics.lineStyle(hoseThickness + 4, 0x1a1a1a, 1);
        hoseGraphics.beginPath();
        hoseGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            hoseGraphics.lineTo(points[i].x, points[i].y);
        }
        hoseGraphics.stroke();

        // 호스 내부 (주황)
        hoseGraphics.lineStyle(hoseThickness, 0xff6f00, 1);
        hoseGraphics.beginPath();
        hoseGraphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            hoseGraphics.lineTo(points[i].x, points[i].y);
        }
        hoseGraphics.stroke();

        // 호스 줄무늬
        hoseGraphics.lineStyle(2, 0x1a1a1a, 0.5);
        for (let i = 3; i < points.length; i += 3) {
            hoseGraphics.strokeCircle(points[i].x, points[i].y, hoseThickness / 2);
        }

        // 호스 끝 (흡입구)
        const hoseEnd = points[points.length - 1];
        hoseGraphics.fillStyle(0x1a1a1a, 1);
        hoseGraphics.fillCircle(hoseEnd.x, hoseEnd.y, hoseThickness + 2);
        hoseGraphics.fillStyle(0x4a2c00, 0.9);
        hoseGraphics.fillCircle(hoseEnd.x, hoseEnd.y, hoseThickness - 2);

        // 이펙트 페이드아웃
        this.tweens.add({
            targets: hoseGraphics,
            alpha: 0,
            duration: 200,
            delay: 100,
            onComplete: () => hoseGraphics.destroy()
        });

        // ========== 한 마리만 흡입 (가장 가까운 적) ==========
        let closestEnemy = null;
        let closestDist = range;

        this.enemies.children.each(e => {
            if (!e.active) return;
            const dx = e.x - hoseEnd.x;
            const dy = e.y - hoseEnd.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist && dist < 80) {  // 흡입구 근처만
                closestDist = dist;
                closestEnemy = e;
            }
        });

        // 가장 가까운 적 한 마리만 처리
        if (closestEnemy) {
            const e = closestEnemy;
            const dx = e.x - hoseEnd.x;
            const dy = e.y - hoseEnd.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 데미지
            e.hp -= dmg;

            // ★ 빨려들어오는 모션 (호스 끝으로)
            this.tweens.add({
                targets: e,
                x: e.x - dx * 0.6,  // 60%만 끌어당김
                y: e.y - dy * 0.6,
                duration: 150,
                ease: 'Quad.easeIn'
            });

            // 흡입 이펙트
            this.createSuctionParticle(e.x, e.y, hoseEnd.x, hoseEnd.y);

            // 적 깜빡임
            e.setTint(0xff6f00);
            this.time.delayedCall(100, () => {
                if (e.active) e.clearTint();
            });
        }

        // ★ 경험치 자동 흡입 (범위 축소)
        this.suctionExpOrbs(hoseEnd.x, hoseEnd.y, baseAngle, Math.PI, 60);
    }

    // ★ 흡입 파티클 생성 (적에서 플레이어로 빨려옴)
    createSuctionParticle(fromX, fromY, toX, toY) {
        const colors = [0xff6f00, 0xff8f00, 0xffab40, 0x4a2c00];
        const color = Phaser.Math.RND.pick(colors);

        const particle = this.add.circle(fromX, fromY, 3 + Math.random() * 3, color, 0.8)
            .setDepth(14);

        // 곡선 경로로 플레이어에게 빨려옴
        const midX = (fromX + toX) / 2 + (Math.random() - 0.5) * 50;
        const midY = (fromY + toY) / 2 + (Math.random() - 0.5) * 50;

        this.tweens.add({
            targets: particle,
            x: { value: toX, duration: 300 },
            y: { value: toY, duration: 300 },
            scale: { from: 1, to: 0.3 },
            alpha: { from: 0.8, to: 0 },
            ease: 'Quad.easeIn',
            onComplete: () => particle.destroy()
        });
    }

    // ★ 경험치 자동 흡입 (준설호스 범위 내)
    suctionExpOrbs(px, py, baseAngle, angleWidth, range) {
        this.expOrbs.children.each(exp => {
            if (!exp.active) return;

            const dx = exp.x - px;
            const dy = exp.y - py;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= range) {
                const angle = Math.atan2(dy, dx);
                let angleDiff = angle - baseAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) <= angleWidth / 2) {
                    // 경험치를 플레이어에게 빠르게 끌어당김
                    const pullSpeed = 15;
                    exp.x -= dx / dist * pullSpeed;
                    exp.y -= dy / dist * pullSpeed;
                }
            }
        });
    }

    // ========== 신규 무기 발사 함수 (8종) ==========

    // ★ 산업용 송풍기 - 부채꼴 밀치기 + 데미지
    fireBlower(lv, dmgBonus, areaBonus) {
        const px = this.player.x, py = this.player.y;
        const range = (WEAPONS.blower.range + lv * 15) * areaBonus;
        const angleWidth = (WEAPONS.blower.angle + lv * 5) * Math.PI / 180;
        const dmg = WEAPONS.blower.baseDamage * (1 + lv * 0.15) * dmgBonus;
        const knockback = WEAPONS.blower.knockback + lv * 30;

        // 바라보는 방향
        const target = this.findClosestEnemy();
        const baseAngle = target ? Math.atan2(target.y - py, target.x - px) : (this.playerFacingAngle || 0);

        // 바람 이펙트
        const windGraphics = this.add.graphics().setDepth(11);
        windGraphics.fillStyle(0x81d4fa, 0.3);
        windGraphics.beginPath();
        windGraphics.moveTo(px, py);
        windGraphics.arc(px, py, range, baseAngle - angleWidth/2, baseAngle + angleWidth/2);
        windGraphics.closePath();
        windGraphics.fill();

        // 바람 줄무늬
        for (let i = 0; i < 5; i++) {
            const a = baseAngle - angleWidth/2 + (angleWidth / 5) * (i + 0.5);
            windGraphics.lineStyle(3, 0xb3e5fc, 0.6);
            windGraphics.beginPath();
            windGraphics.moveTo(px + Math.cos(a) * 20, py + Math.sin(a) * 20);
            windGraphics.lineTo(px + Math.cos(a) * range, py + Math.sin(a) * range);
            windGraphics.stroke();
        }

        this.tweens.add({
            targets: windGraphics,
            alpha: 0,
            duration: 200,
            onComplete: () => windGraphics.destroy()
        });

        // 적 밀치기 + 데미지
        this.enemies.children.each(e => {
            if (!e.active) return;
            const dx = e.x - px, dy = e.y - py;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > range) return;

            const angle = Math.atan2(dy, dx);
            let angleDiff = angle - baseAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) <= angleWidth / 2) {
                this.damageEnemy(e, dmg);
                // 넉백
                const pushX = Math.cos(angle) * knockback;
                const pushY = Math.sin(angle) * knockback;
                e.x += pushX * 0.1;
                e.y += pushY * 0.1;
            }
        });
    }

    // ★ 오염측정기 - 체인 번개
    fireDetector(lv, dmgBonus) {
        const target = this.findClosestEnemy();
        if (!target) return;

        const chainCount = WEAPONS.detector.chainCount + Math.floor(lv / 2);
        const chainRange = WEAPONS.detector.chainRange + lv * 10;
        const dmg = WEAPONS.detector.baseDamage * (1 + lv * 0.15) * dmgBonus;

        const hitEnemies = [target];
        let current = target;

        // 첫 번째 연결 (플레이어 → 첫 적)
        this.drawChainLightning(this.player.x, this.player.y, target.x, target.y, 0xffeb3b);
        this.damageEnemy(target, dmg);

        // 연쇄
        for (let i = 1; i < chainCount; i++) {
            let nearest = null;
            let nearestDist = chainRange;

            this.enemies.children.each(e => {
                if (!e.active || hitEnemies.includes(e)) return;
                const dx = e.x - current.x, dy = e.y - current.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = e;
                }
            });

            if (nearest) {
                this.drawChainLightning(current.x, current.y, nearest.x, nearest.y, 0xffc107);
                this.damageEnemy(nearest, dmg * (1 - i * 0.1)); // 연쇄마다 10% 감소
                hitEnemies.push(nearest);
                current = nearest;
            } else {
                break;
            }
        }
    }

    drawChainLightning(x1, y1, x2, y2, color) {
        const g = this.add.graphics().setDepth(15);
        g.lineStyle(4, color, 0.9);
        g.beginPath();
        g.moveTo(x1, y1);

        // 지그재그 번개
        const dx = x2 - x1, dy = y2 - y1;
        const segments = 5;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = x1 + dx * t + (i < segments ? (Math.random() - 0.5) * 20 : 0);
            const y = y1 + dy * t + (i < segments ? (Math.random() - 0.5) * 20 : 0);
            g.lineTo(x, y);
        }
        g.stroke();

        // 글로우
        g.lineStyle(8, color, 0.3);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();

        this.tweens.add({
            targets: g,
            alpha: 0,
            duration: 150,
            onComplete: () => g.destroy()
        });
    }

    // ★ 보호장갑 - 빠른 펀치
    fireGloves(lv, dmgBonus, areaBonus) {
        const px = this.player.x, py = this.player.y;
        const range = (WEAPONS.gloves.range + lv * 8) * areaBonus;
        const angleWidth = WEAPONS.gloves.angle * Math.PI / 180;
        const dmg = WEAPONS.gloves.baseDamage * (1 + lv * 0.12) * dmgBonus;

        const target = this.findClosestEnemy();
        const baseAngle = target ? Math.atan2(target.y - py, target.x - px) : (this.playerFacingAngle || 0);

        // 펀치 이펙트 (주먹 모양)
        const fistX = px + Math.cos(baseAngle) * (range * 0.7);
        const fistY = py + Math.sin(baseAngle) * (range * 0.7);

        const fist = this.add.circle(fistX, fistY, 15, 0xffee58, 1).setDepth(12);
        const impact = this.add.circle(fistX, fistY, 25, 0xff8f00, 0.5).setDepth(11);

        this.tweens.add({
            targets: fist,
            scale: 0,
            alpha: 0,
            duration: 150,
            onComplete: () => fist.destroy()
        });
        this.tweens.add({
            targets: impact,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => impact.destroy()
        });

        // 범위 내 적 데미지 + 넉백
        this.enemies.children.each(e => {
            if (!e.active) return;
            const dx = e.x - px, dy = e.y - py;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > range) return;

            const angle = Math.atan2(dy, dx);
            let angleDiff = angle - baseAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) <= angleWidth / 2) {
                this.damageEnemy(e, dmg);
                e.x += Math.cos(angle) * 20;
                e.y += Math.sin(angle) * 20;
            }
        });
    }

    // ★ 소독스프레이 - 영역 생성
    fireSpray(lv, dmgBonus, areaBonus) {
        const px = this.player.x, py = this.player.y;
        const radius = (WEAPONS.spray.radius + lv * 10) * areaBonus;
        const duration = WEAPONS.spray.duration + lv * 500;
        const dps = WEAPONS.spray.baseDamage * (1 + lv * 0.12) * dmgBonus;
        const durationBonus = 1 + (this.playerState.passives.duration || 0) * PASSIVES.duration.effect;

        // 초록 안개 영역
        const zone = this.add.circle(px, py, radius, 0x7cb342, 0.4).setDepth(5);

        // 파티클 효과
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const p = this.add.circle(
                px + Math.cos(angle) * radius * 0.5,
                py + Math.sin(angle) * radius * 0.5,
                5, 0xaed581, 0.6
            ).setDepth(6);

            this.tweens.add({
                targets: p,
                x: px + Math.cos(angle) * radius,
                y: py + Math.sin(angle) * radius,
                alpha: 0,
                duration: duration * durationBonus,
                repeat: -1
            });
        }

        // 지속 데미지
        const damageTimer = this.time.addEvent({
            delay: 500,
            repeat: Math.floor((duration * durationBonus) / 500) - 1,
            callback: () => {
                this.enemies.children.each(e => {
                    if (!e.active) return;
                    const dx = e.x - px, dy = e.y - py;
                    if (Math.sqrt(dx*dx + dy*dy) <= radius) {
                        this.damageEnemy(e, dps);
                    }
                });
            }
        });

        // 영역 소멸
        this.tweens.add({
            targets: zone,
            alpha: 0,
            duration: 500,
            delay: duration * durationBonus - 500,
            onComplete: () => {
                zone.destroy();
                damageTimer.remove();
            }
        });
    }

    // ★★★ 화염탄 - 캐릭터 직접 발사 + 범위 폭발 (A방식) ★★★
    // 기존 터렛 소환 코드 → 성능 문제로 교체 (2026-02-07)
    fireCone(lv, dmgBonus, areaBonus) {
        const target = this.findClosestEnemy();
        if (!target) return;

        const dmg = WEAPONS.cone.baseDamage * (1 + lv * 0.15) * dmgBonus;
        const blastRadius = (50 + lv * 8) * (1 + (areaBonus - 1) * 0.5);
        const px = this.player.x, py = this.player.y;
        const targetX = target.x, targetY = target.y;
        const angle = Math.atan2(targetY - py, targetX - px);
        const count = 1 + Math.floor(lv / 3);  // 레벨 3마다 폭발탄 +1

        for (let i = 0; i < count; i++) {
            const spreadAngle = angle + (i - (count - 1) / 2) * 0.3;
            const dist = Math.sqrt((targetX - px) * (targetX - px) + (targetY - py) * (targetY - py));
            const bx = px + Math.cos(spreadAngle) * dist;
            const by = py + Math.sin(spreadAngle) * dist;

            // 폭발탄 발사
            const bomb = this.add.circle(px, py, 6, 0xff6f00, 0.9).setDepth(11);
            this.tweens.add({
                targets: bomb,
                x: bx, y: by,
                duration: 250,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    const boomX = bomb.x, boomY = bomb.y;
                    gameSoundManager.play('fireBomb');
                    // 폭발 이펙트 (경량)
                    const boom = this.add.circle(boomX, boomY, 15, 0xff5722, 0.7).setDepth(10);
                    this.tweens.add({ targets: boom, scale: blastRadius / 15, alpha: 0, duration: 250, onComplete: () => boom.destroy() });
                    // 범위 데미지
                    const rSq = blastRadius * blastRadius;
                    this.enemies.children.each(e => {
                        if (!e.active) return;
                        const dx = e.x - boomX, dy = e.y - boomY;
                        if (dx * dx + dy * dy <= rSq) {
                            this.damageEnemy(e, dmg);
                        }
                    });
                    bomb.destroy();
                }
            });
        }
        return;  // 아래 기존 코드 실행 방지

        /* ========== 기존 터렛 소환 코드 (성능 문제로 비활성화) ==========

        // 플레이어 주변 위치
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 30;
        const offsetX = Math.cos(angle) * dist;
        const offsetY = Math.sin(angle) * dist;

        // ★ 소환 이펙트
        const summonX = this.player.x + offsetX;
        const summonY = this.player.y + offsetY;
        this.createSummonEffect(summonX, summonY, 0xff6f00);

        // ★ 컨테이너로 터렛 구성 (회전 가능)
        const turretContainer = this.add.container(summonX, summonY).setDepth(12);

        // 그림자
        const shadow = this.add.ellipse(0, 12, 36, 12, 0x000000, 0.3);

        // 베이스 (원형, 그라데이션 효과)
        const base1 = this.add.circle(0, 5, 20, 0x37474f);
        const base2 = this.add.circle(0, 5, 16, 0x546e7a);
        const baseHighlight = this.add.circle(-5, 2, 4, 0x78909c, 0.5);

        // 포탑 본체
        const turretBody = this.add.rectangle(0, -8, 18, 26, 0xff6f00).setStrokeStyle(2, 0xffab00);

        // 포신 (별도 컨테이너로 회전)
        const barrel = this.add.rectangle(0, -28, 8, 20, 0xffcc80).setStrokeStyle(1, 0xff8f00);
        const muzzle = this.add.circle(0, -38, 5, 0xff5722);

        // 에너지 코어 (펄스 애니메이션)
        const core = this.add.circle(0, -5, 5, 0x00e5ff);
        const coreGlow = this.add.circle(0, -5, 8, 0x00e5ff, 0.3);

        // 아이콘 표시
        const icon = this.add.text(0, -55, '🔶', { fontSize: '16px' }).setOrigin(0.5);

        turretContainer.add([shadow, base1, base2, baseHighlight, turretBody, barrel, muzzle, core, coreGlow, icon]);

        // 코어 펄스 애니메이션
        this.tweens.add({
            targets: coreGlow,
            scale: { from: 1, to: 1.5 },
            alpha: { from: 0.3, to: 0 },
            duration: 800,
            repeat: -1
        });

        // ★ 남은시간 바
        const timerBarBg = this.add.rectangle(summonX, summonY + 25, 40, 5, 0x333333).setDepth(12);
        const timerBar = this.add.rectangle(summonX - 19, summonY + 25, 38, 3, 0xff6f00).setOrigin(0, 0.5).setDepth(12);

        // ★ 공격 범위 (점선 스타일)
        const rangeCircle = this.add.circle(summonX, summonY, attackRange, 0xff6f00, 0.05).setDepth(6);
        rangeCircle.setStrokeStyle(1, 0xff6f00, 0.2);

        let elapsed = 0;
        let lastAttack = 0;
        let currentAngle = 0;

        const attackInterval = this.time.addEvent({
            delay: 100,  // 성능 최적화: 50→100ms
            repeat: -1,
            callback: () => {
                elapsed += 100;

                // 플레이어 따라다니기
                turretContainer.x = this.player.x + offsetX;
                turretContainer.y = this.player.y + offsetY;
                rangeCircle.x = turretContainer.x;
                rangeCircle.y = turretContainer.y;
                timerBarBg.x = turretContainer.x;
                timerBarBg.y = turretContainer.y + 25;
                timerBar.x = turretContainer.x - 19;
                timerBar.y = turretContainer.y + 25;

                // 남은시간 바 업데이트
                timerBar.width = 38 * (1 - elapsed / duration);

                // 가장 가까운 적 찾아서 포신 회전
                let target = null;
                let closestDistSq = attackRange * attackRange;  // 성능 최적화: sqrt 제거
                this.enemies.children.each(e => {
                    if (!e.active) return;
                    const dx = e.x - turretContainer.x, dy = e.y - turretContainer.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        target = e;
                    }
                });

                // 포신 회전 (적 방향으로)
                if (target) {
                    const targetAngle = Math.atan2(target.y - turretContainer.y, target.x - turretContainer.x) + Math.PI/2;
                    currentAngle += (targetAngle - currentAngle) * 0.15;  // 부드러운 회전
                    barrel.setRotation(currentAngle);
                    muzzle.setPosition(Math.sin(currentAngle) * 20, -28 - Math.cos(currentAngle) * 20);
                }

                // 미사일 발사
                if (target && elapsed - lastAttack >= attackCooldown) {
                    lastAttack = elapsed;

                    // ★ 머즐 플래시
                    const flash = this.add.circle(muzzle.x + turretContainer.x, muzzle.y + turretContainer.y, 12, 0xffeb3b, 0.9).setDepth(13);
                    this.tweens.add({ targets: flash, scale: 0.3, alpha: 0, duration: 80, onComplete: () => flash.destroy() });

                    // ★ 미사일 (트레일 포함)
                    const missileX = turretContainer.x + muzzle.x;
                    const missileY = turretContainer.y + muzzle.y;
                    const missile = this.add.container(missileX, missileY).setDepth(11);
                    const missileBody = this.add.ellipse(0, 0, 10, 6, 0xff5722);
                    const missileGlow = this.add.ellipse(0, 0, 14, 8, 0xffab00, 0.5);
                    missile.add([missileGlow, missileBody]);
                    missile.rotation = Math.atan2(target.y - missileY, target.x - missileX);

                    const targetX = target.x, targetY = target.y;

                    // 미사일 트레일 (성능 최적화: 7→3개, 30→60ms)
                    const trailTimer = this.time.addEvent({
                        delay: 60,
                        repeat: 2,
                        callback: () => {
                            const trail = this.add.circle(missile.x, missile.y, 4, 0xff8f00, 0.6).setDepth(10);
                            this.tweens.add({ targets: trail, scale: 0, alpha: 0, duration: 150, onComplete: () => trail.destroy() });
                        }
                    });

                    this.tweens.add({
                        targets: missile,
                        x: targetX,
                        y: targetY,
                        duration: 180,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            trailTimer.remove();
                            // ★ 폭발 이펙트 (다중 레이어)
                            const boomX = missile.x, boomY = missile.y;
                            // 성능 최적화: 폭발 3레이어→2레이어
                            const ring = this.add.circle(boomX, boomY, 10, 0xffffff, 0).setStrokeStyle(3, 0xffeb3b).setDepth(10);
                            const boom1 = this.add.circle(boomX, boomY, 15, 0xff5722, 0.8).setDepth(10);
                            // const boom2 = this.add.circle(boomX, boomY, 25, 0xff8f00, 0.4).setDepth(9);

                            this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 200, onComplete: () => ring.destroy() });
                            this.tweens.add({ targets: boom1, scale: 2, alpha: 0, duration: 150, onComplete: () => boom1.destroy() });
                            // this.tweens.add({ targets: boom2, scale: 2.5, alpha: 0, duration: 200, onComplete: () => boom2.destroy() });

                            // 범위 데미지
                            this.enemies.children.each(e => {
                                if (!e.active) return;
                                const dx = e.x - boomX, dy = e.y - boomY;
                                if (dx*dx + dy*dy <= 1225) {  // 성능 최적화: sqrt 제거 (35*35=1225)
                                    this.damageEnemy(e, dmg);
                                }
                            });
                            missile.destroy();
                        }
                    });
                }

                // 지속시간 끝 - 퇴장 이펙트
                if (elapsed >= duration) {
                    attackInterval.remove();
                    this.activeSummons = Math.max(0, this.activeSummons - 1);  // 소환 카운터 감소
                    // 퇴장 파티클
                    for (let i = 0; i < 4; i++) {  // 성능 최적화: 8→4개
                        const p = this.add.circle(turretContainer.x, turretContainer.y, 4, 0xff6f00, 0.8).setDepth(13);
                        const pAngle = (i / 4) * Math.PI * 2;
                        this.tweens.add({
                            targets: p,
                            x: turretContainer.x + Math.cos(pAngle) * 30,
                            y: turretContainer.y + Math.sin(pAngle) * 30 - 20,
                            alpha: 0,
                            duration: 400,
                            onComplete: () => p.destroy()
                        });
                    }
                    this.tweens.add({
                        targets: [turretContainer, rangeCircle, timerBarBg, timerBar],
                        alpha: 0,
                        y: '-=20',
                        duration: 300,
                        onComplete: () => { turretContainer.destroy(); rangeCircle.destroy(); timerBarBg.destroy(); timerBar.destroy(); }
                    });
                }
            }
        });
    ========== 기존 터렛 소환 코드 끝 ========== */
    }

    // ★★★ 충격파 - 캐릭터 중심 원형 폭발 (C방식) ★★★
    // 기존 미니탱크 소환 코드 → 성능 문제로 교체 (2026-02-07)
    fireTruck(lv, dmgBonus) {
        const dmg = WEAPONS.truck.baseDamage * (1 + lv * 0.15) * dmgBonus;
        const shockRadius = 80 + lv * 12;
        const px = this.player.x, py = this.player.y;

        gameSoundManager.play('shockwave');
        // 충격파 이펙트 (원형 확장)
        const wave = this.add.circle(px, py, 20, 0x4caf50, 0).setStrokeStyle(3, 0x76ff03).setDepth(10);
        const innerWave = this.add.circle(px, py, 15, 0x66bb6a, 0.3).setDepth(9);
        this.tweens.add({ targets: wave, scale: shockRadius / 20, alpha: 0, duration: 350, onComplete: () => wave.destroy() });
        this.tweens.add({ targets: innerWave, scale: shockRadius / 15, alpha: 0, duration: 300, onComplete: () => innerWave.destroy() });

        // 범위 데미지 + 넉백
        const rSq = shockRadius * shockRadius;
        this.enemies.children.each(e => {
            if (!e.active) return;
            const dx = e.x - px, dy = e.y - py;
            if (dx * dx + dy * dy <= rSq) {
                this.damageEnemy(e, dmg);
                const knockAngle = Math.atan2(dy, dx);
                e.x += Math.cos(knockAngle) * 25;
                e.y += Math.sin(knockAngle) * 25;
            }
        });
        return;  // 아래 기존 코드 실행 방지

        /* ========== 기존 미니탱크 소환 코드 (성능 문제로 비활성화) ==========

        const angle = Math.random() * Math.PI * 2;
        const dist = 70 + Math.random() * 30;
        const offsetX = Math.cos(angle) * dist;
        const offsetY = Math.sin(angle) * dist;

        const summonX = this.player.x + offsetX;
        const summonY = this.player.y + offsetY;
        this.createSummonEffect(summonX, summonY, 0x4caf50);

        // ★ 컨테이너로 탱크 구성
        const tankContainer = this.add.container(summonX, summonY).setDepth(12);

        // 그림자
        const shadow = this.add.ellipse(0, 15, 50, 14, 0x000000, 0.3);

        // 궤도 (좌우)
        const trackL = this.add.rectangle(-22, 4, 14, 28, 0x37474f).setStrokeStyle(1, 0x263238);
        const trackR = this.add.rectangle(22, 4, 14, 28, 0x37474f).setStrokeStyle(1, 0x263238);

        // 차체
        const body = this.add.rectangle(0, 0, 36, 28, 0x4caf50).setStrokeStyle(2, 0x81c784);
        const bodyTop = this.add.rectangle(0, -2, 28, 20, 0x66bb6a);

        // 포탑 베이스 (회전)
        const turretBase = this.add.circle(0, -4, 14, 0x388e3c).setStrokeStyle(2, 0x4caf50);

        // 포신 (별도 - 회전)
        const barrel = this.add.rectangle(0, -22, 8, 22, 0x2e7d32).setStrokeStyle(1, 0x1b5e20);
        const muzzle = this.add.circle(0, -33, 6, 0x1b5e20);
        const muzzleGlow = this.add.circle(0, -33, 4, 0x76ff03);

        // 아이콘
        const icon = this.add.text(0, -50, '🚛', { fontSize: '16px' }).setOrigin(0.5);

        tankContainer.add([shadow, trackL, trackR, body, bodyTop, turretBase, barrel, muzzle, muzzleGlow, icon]);

        // 남은시간 바
        const timerBarBg = this.add.rectangle(summonX, summonY + 28, 44, 5, 0x333333).setDepth(12);
        const timerBar = this.add.rectangle(summonX - 21, summonY + 28, 42, 3, 0x4caf50).setOrigin(0, 0.5).setDepth(12);

        // 공격 범위
        const rangeCircle = this.add.circle(summonX, summonY, attackRange, 0x4caf50, 0.05).setDepth(6);
        rangeCircle.setStrokeStyle(1, 0x4caf50, 0.2);

        let elapsed = 0;
        let lastAttack = 0;
        let currentAngle = 0;

        const attackInterval = this.time.addEvent({
            delay: 100,  // 성능 최적화: 50→100ms
            repeat: -1,
            callback: () => {
                elapsed += 100;

                tankContainer.x = this.player.x + offsetX;
                tankContainer.y = this.player.y + offsetY;
                rangeCircle.x = tankContainer.x;
                rangeCircle.y = tankContainer.y;
                timerBarBg.x = tankContainer.x;
                timerBarBg.y = tankContainer.y + 28;
                timerBar.x = tankContainer.x - 21;
                timerBar.y = tankContainer.y + 28;
                timerBar.width = 42 * (1 - elapsed / duration);

                let target = null;
                let closestDistSq = attackRange * attackRange;  // 성능 최적화: sqrt 제거
                this.enemies.children.each(e => {
                    if (!e.active) return;
                    const dx = e.x - tankContainer.x, dy = e.y - tankContainer.y;
                    const distSq = dx*dx + dy*dy;
                    if (distSq < closestDistSq) {
                        closestDistSq = distSq;
                        target = e;
                    }
                });

                // 포탑 회전
                if (target) {
                    const targetAngle = Math.atan2(target.y - tankContainer.y, target.x - tankContainer.x) + Math.PI/2;
                    currentAngle += (targetAngle - currentAngle) * 0.12;
                    turretBase.setRotation(currentAngle);
                    barrel.setRotation(currentAngle);
                    muzzle.setPosition(Math.sin(currentAngle) * 22, -22 - Math.cos(currentAngle) * 22);
                    muzzleGlow.setPosition(muzzle.x, muzzle.y);
                }

                if (target && elapsed - lastAttack >= attackCooldown) {
                    lastAttack = elapsed;

                    // 머즐 플래시 + 반동
                    const flashX = tankContainer.x + muzzle.x;
                    const flashY = tankContainer.y + muzzle.y;
                    const flash = this.add.circle(flashX, flashY, 18, 0xffeb3b, 0.9).setDepth(13);
                    const smoke = this.add.circle(flashX, flashY, 12, 0x9e9e9e, 0.6).setDepth(12);
                    this.tweens.add({ targets: flash, scale: 0.2, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
                    this.tweens.add({ targets: smoke, y: flashY - 20, scale: 2, alpha: 0, duration: 300, onComplete: () => smoke.destroy() });

                    // 포탄
                    const shell = this.add.container(flashX, flashY).setDepth(11);
                    const shellBody = this.add.capsule(0, 0, 16, 8, 0xffcc00);
                    const shellGlow = this.add.capsule(0, 0, 20, 10, 0xff8f00, 0.4);
                    shell.add([shellGlow, shellBody]);
                    shell.rotation = currentAngle - Math.PI/2;

                    const targetX = target.x, targetY = target.y;

                    // 포탄 트레일 (성능 최적화: 8→3개, 25→60ms)
                    const trailTimer = this.time.addEvent({
                        delay: 60,
                        repeat: 2,
                        callback: () => {
                            const trail = this.add.circle(shell.x, shell.y, 5, 0xff9800, 0.5).setDepth(10);
                            this.tweens.add({ targets: trail, scale: 0, alpha: 0, duration: 120, onComplete: () => trail.destroy() });
                        }
                    });

                    this.tweens.add({
                        targets: shell,
                        x: targetX,
                        y: targetY,
                        duration: 160,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            trailTimer.remove();
                            const boomX = shell.x, boomY = shell.y;

                            // 대형 폭발 (성능 최적화: 4레이어→2레이어, 카메라 쉐이크 제거)
                            const ring = this.add.circle(boomX, boomY, 15, 0xffffff, 0).setStrokeStyle(4, 0xffeb3b).setDepth(10);
                            const boom1 = this.add.circle(boomX, boomY, 20, 0xff5722, 0.9).setDepth(10);
                            // const boom2 = this.add.circle(boomX, boomY, 35, 0xff8f00, 0.5).setDepth(9);
                            // const boom3 = this.add.circle(boomX, boomY, 50, 0xffcc80, 0.2).setDepth(8);

                            this.tweens.add({ targets: ring, scale: 4, alpha: 0, duration: 250, onComplete: () => ring.destroy() });
                            this.tweens.add({ targets: boom1, scale: 2.5, alpha: 0, duration: 180, onComplete: () => boom1.destroy() });
                            // this.tweens.add({ targets: boom2, scale: 2, alpha: 0, duration: 220, onComplete: () => boom2.destroy() });
                            // this.tweens.add({ targets: boom3, scale: 1.8, alpha: 0, duration: 280, onComplete: () => boom3.destroy() });

                            // this.cameras.main.shake(80, 0.008);  // 성능 최적화: 카메라 쉐이크 제거

                            this.enemies.children.each(e => {
                                if (!e.active) return;
                                const dx = e.x - boomX, dy = e.y - boomY;
                                if (dx*dx + dy*dy <= 2025) {  // 성능 최적화: sqrt 제거 (45*45=2025)
                                    this.damageEnemy(e, dmg);
                                    const knockAngle = Math.atan2(e.y - boomY, e.x - boomX);
                                    e.x += Math.cos(knockAngle) * 20;
                                    e.y += Math.sin(knockAngle) * 20;
                                }
                            });
                            shell.destroy();
                        }
                    });
                }

                if (elapsed >= duration) {
                    attackInterval.remove();
                    this.activeSummons = Math.max(0, this.activeSummons - 1);  // 소환 카운터 감소
                    for (let i = 0; i < 5; i++) {  // 성능 최적화: 10→5개
                        const p = this.add.circle(tankContainer.x, tankContainer.y, 5, 0x4caf50, 0.8).setDepth(13);
                        const pAngle = (i / 5) * Math.PI * 2;
                        this.tweens.add({
                            targets: p,
                            x: tankContainer.x + Math.cos(pAngle) * 35,
                            y: tankContainer.y + Math.sin(pAngle) * 35 - 15,
                            alpha: 0,
                            duration: 450,
                            onComplete: () => p.destroy()
                        });
                    }
                    this.tweens.add({
                        targets: [tankContainer, rangeCircle, timerBarBg, timerBar],
                        alpha: 0,
                        y: '-=25',
                        duration: 350,
                        onComplete: () => { tankContainer.destroy(); rangeCircle.destroy(); timerBarBg.destroy(); timerBar.destroy(); }
                    });
                }
            }
        });
    ========== 기존 미니탱크 소환 코드 끝 ========== */
    }

    // ★★★ 공습 - 적 다수에게 낙뢰 (C방식) ★★★
    // 기존 드론 소환 코드 → 성능 문제로 교체 (2026-02-07)
    fireDrone(lv, dmgBonus) {
        const dmg = WEAPONS.drone.baseDamage * (1 + lv * 0.12) * dmgBonus;
        const targetCount = Math.min(3 + Math.floor(lv / 2), 8);
        const px = this.player.x, py = this.player.y;

        // 범위 내 적들 찾기 (거리순 정렬)
        const targets = [];
        this.enemies.children.each(e => {
            if (!e.active) return;
            const dx = e.x - px, dy = e.y - py;
            const distSq = dx * dx + dy * dy;
            if (distSq <= 250000) {  // 반경 500 이내
                targets.push({ enemy: e, distSq: distSq });
            }
        });
        if (targets.length === 0) return;

        targets.sort((a, b) => a.distSq - b.distSq);
        const selected = targets.slice(0, targetCount);

        // 낙뢰 이펙트 (시간차 발동)
        selected.forEach((t, i) => {
            this.time.delayedCall(i * 60, () => {
                const e = t.enemy;
                if (!e.active) return;
                gameSoundManager.play('lightning');
                // 번개 라인 (위에서 아래로)
                const lightning = this.add.rectangle(e.x, e.y - 80, 3, 160, 0x00e5ff, 0.8).setDepth(11);
                const flash = this.add.circle(e.x, e.y, 12, 0x00e5ff, 0.6).setDepth(10);
                this.tweens.add({ targets: lightning, alpha: 0, scaleX: 0.3, duration: 150, onComplete: () => lightning.destroy() });
                this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
                this.damageEnemy(e, dmg);
            });
        });
        return;  // 아래 기존 코드 실행 방지

        /* ========== 기존 드론 소환 코드 (성능 문제로 비활성화) ==========

        const hoverOffset = { x: Phaser.Math.Between(-40, 40), y: -60 };
        const summonX = this.player.x + hoverOffset.x;
        const summonY = this.player.y + hoverOffset.y;
        this.createSummonEffect(summonX, summonY, 0x00bcd4);

        // ★ 드론 컨테이너
        const droneContainer = this.add.container(summonX, summonY).setDepth(12);

        // 그림자
        const shadow = this.add.ellipse(0, 50, 30, 10, 0x000000, 0.2);

        // 본체
        const body = this.add.rectangle(0, 0, 28, 14, 0x37474f).setStrokeStyle(2, 0x546e7a);
        const bodyInner = this.add.rectangle(0, 0, 20, 10, 0x455a64);

        // 코어 (발광 펄스)
        const coreGlow = this.add.circle(0, 0, 10, 0x00e5ff, 0.3);
        const core = this.add.circle(0, 0, 6, 0x00e5ff);

        // 날개
        const wingL = this.add.triangle(-22, 0, 0, 0, 12, -8, 12, 8, 0x546e7a).setStrokeStyle(1, 0x78909c);
        const wingR = this.add.triangle(22, 0, 0, 0, -12, -8, -12, 8, 0x546e7a).setStrokeStyle(1, 0x78909c);

        // 프로펠러 (회전 애니메이션용)
        const propBL = this.add.ellipse(-18, 10, 14, 4, 0x90a4ae, 0.7);
        const propBR = this.add.ellipse(18, 10, 14, 4, 0x90a4ae, 0.7);
        const propFL = this.add.ellipse(-18, -10, 14, 4, 0x90a4ae, 0.7);
        const propFR = this.add.ellipse(18, -10, 14, 4, 0x90a4ae, 0.7);

        // 미사일 포드
        const podL = this.add.rectangle(-8, 12, 6, 10, 0xf44336).setStrokeStyle(1, 0xd32f2f);
        const podR = this.add.rectangle(8, 12, 6, 10, 0xf44336).setStrokeStyle(1, 0xd32f2f);
        const podGlowL = this.add.circle(-8, 17, 3, 0xffeb3b, 0.8);
        const podGlowR = this.add.circle(8, 17, 3, 0xffeb3b, 0.8);

        // 아이콘
        const icon = this.add.text(0, -25, '🚁', { fontSize: '14px' }).setOrigin(0.5);

        droneContainer.add([shadow, wingL, wingR, body, bodyInner, propBL, propBR, propFL, propFR, podL, podR, podGlowL, podGlowR, coreGlow, core, icon]);

        // 코어 펄스
        this.tweens.add({
            targets: coreGlow,
            scale: { from: 1, to: 1.8 },
            alpha: { from: 0.3, to: 0 },
            duration: 600,
            repeat: -1
        });

        // 프로펠러 회전
        this.tweens.add({
            targets: [propBL, propBR, propFL, propFR],
            scaleX: { from: 1, to: 0.2 },
            duration: 50,
            yoyo: true,
            repeat: -1
        });

        // 남은시간 바
        const timerBarBg = this.add.rectangle(summonX, summonY + 30, 36, 4, 0x333333).setDepth(12);
        const timerBar = this.add.rectangle(summonX - 17, summonY + 30, 34, 2, 0x00bcd4).setOrigin(0, 0.5).setDepth(12);

        // 공격 범위
        const rangeCircle = this.add.circle(summonX, summonY, attackRange, 0x00bcd4, 0.04).setDepth(6);
        rangeCircle.setStrokeStyle(1, 0x00bcd4, 0.15);

        let elapsed = 0;
        let lastAttack = 0;
        let missileToggle = false;

        const attackInterval = this.time.addEvent({
            delay: 100,  // 성능 최적화: 50→100ms
            repeat: -1,
            callback: () => {
                elapsed += 100;

                // 호버링 모션
                const wobbleX = Math.sin(elapsed * 0.003) * 5;
                const wobbleY = Math.cos(elapsed * 0.005) * 3;
                const tilt = Math.sin(elapsed * 0.002) * 0.1;

                droneContainer.x = this.player.x + hoverOffset.x + wobbleX;
                droneContainer.y = this.player.y + hoverOffset.y + wobbleY;
                droneContainer.rotation = tilt;

                rangeCircle.x = droneContainer.x;
                rangeCircle.y = droneContainer.y;
                timerBarBg.x = droneContainer.x;
                timerBarBg.y = droneContainer.y + 30;
                timerBar.x = droneContainer.x - 17;
                timerBar.y = droneContainer.y + 30;
                timerBar.width = 34 * (1 - elapsed / duration);

                // 그림자 위치
                shadow.y = 50 + wobbleY * 2;

                if (elapsed - lastAttack >= attackCooldown) {
                    let target = null;
                    let closestDistSq = attackRange * attackRange;  // 성능 최적화: sqrt 제거
                    this.enemies.children.each(e => {
                        if (!e.active) return;
                        const dx = e.x - droneContainer.x, dy = e.y - droneContainer.y;
                        const distSq = dx*dx + dy*dy;
                        if (distSq < closestDistSq) {
                            closestDistSq = distSq;
                            target = e;
                        }
                    });

                    if (target) {
                        lastAttack = elapsed;
                        missileToggle = !missileToggle;

                        const launchX = droneContainer.x + (missileToggle ? -8 : 8);
                        const launchY = droneContainer.y + 17;

                        // 발사 플래시
                        const flash = this.add.circle(launchX, launchY, 8, 0xffeb3b, 0.9).setDepth(13);
                        this.tweens.add({ targets: flash, scale: 0.3, alpha: 0, duration: 60, onComplete: () => flash.destroy() });

                        // 유도 미사일
                        const missile = this.add.container(launchX, launchY).setDepth(11);
                        const missileBody = this.add.capsule(0, 0, 12, 5, 0x00e5ff);
                        const missileGlow = this.add.capsule(0, 0, 16, 7, 0x00bcd4, 0.5);
                        missile.add([missileGlow, missileBody]);

                        const targetX = target.x, targetY = target.y;
                        missile.rotation = Math.atan2(targetY - launchY, targetX - launchX);

                        // 미사일 트레일 (성능 최적화: 8→3개, 20→60ms)
                        const trailTimer = this.time.addEvent({
                            delay: 60,
                            repeat: 2,
                            callback: () => {
                                const trail = this.add.circle(missile.x, missile.y, 3, 0x00e5ff, 0.6).setDepth(10);
                                this.tweens.add({ targets: trail, scale: 0, alpha: 0, duration: 100, onComplete: () => trail.destroy() });
                            }
                        });

                        this.tweens.add({
                            targets: missile,
                            x: targetX,
                            y: targetY,
                            duration: 140,
                            ease: 'Quad.easeIn',
                            onComplete: () => {
                                trailTimer.remove();
                                const boomX = missile.x, boomY = missile.y;

                                // 폭발 이펙트 (성능 최적화: 3레이어→2레이어)
                                const ring = this.add.circle(boomX, boomY, 8, 0xffffff, 0).setStrokeStyle(2, 0x00e5ff).setDepth(10);
                                const boom1 = this.add.circle(boomX, boomY, 12, 0x00e5ff, 0.8).setDepth(10);
                                // const boom2 = this.add.circle(boomX, boomY, 20, 0x00bcd4, 0.4).setDepth(9);

                                this.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 150, onComplete: () => ring.destroy() });
                                this.tweens.add({ targets: boom1, scale: 2, alpha: 0, duration: 120, onComplete: () => boom1.destroy() });
                                // this.tweens.add({ targets: boom2, scale: 2, alpha: 0, duration: 160, onComplete: () => boom2.destroy() });

                                this.enemies.children.each(e => {
                                    if (!e.active) return;
                                    const dx = e.x - boomX, dy = e.y - boomY;
                                    if (dx*dx + dy*dy <= 784) {  // 성능 최적화: sqrt 제거 (28*28=784)
                                        this.damageEnemy(e, dmg);
                                    }
                                });
                                missile.destroy();
                            }
                        });
                    }
                }

                if (elapsed >= duration) {
                    attackInterval.remove();
                    this.activeSummons = Math.max(0, this.activeSummons - 1);  // 소환 카운터 감소
                    for (let i = 0; i < 3; i++) {  // 성능 최적화: 6→3개
                        const p = this.add.circle(droneContainer.x, droneContainer.y, 4, 0x00bcd4, 0.8).setDepth(13);
                        const pAngle = (i / 3) * Math.PI * 2;
                        this.tweens.add({
                            targets: p,
                            x: droneContainer.x + Math.cos(pAngle) * 25,
                            y: droneContainer.y + Math.sin(pAngle) * 25 - 30,
                            alpha: 0,
                            duration: 400,
                            onComplete: () => p.destroy()
                        });
                    }
                    this.tweens.add({
                        targets: [droneContainer, rangeCircle, timerBarBg, timerBar],
                        alpha: 0,
                        y: '-=40',
                        duration: 400,
                        onComplete: () => { droneContainer.destroy(); rangeCircle.destroy(); timerBarBg.destroy(); timerBar.destroy(); }
                    });
                }
            }
        });
    ========== 기존 드론 소환 코드 끝 ========== */
    }

    // ★ 폐수파이프 - 관통 투사체
    firePipe(lv, dmgBonus) {
        const target = this.findClosestEnemy();
        if (!target) return;

        const px = this.player.x, py = this.player.y;
        const dmg = WEAPONS.pipe.baseDamage * (1 + lv * 0.12) * dmgBonus;
        const speed = WEAPONS.pipe.projectileSpeed + lv * 20;
        const pierceBonus = (this.playerState.passives.pierce || 0) * PASSIVES.pierce.effect;
        const projectileBonus = (this.playerState.passives.projectile || 0);

        const angle = Math.atan2(target.y - py, target.x - px);
        const count = 1 + Math.floor(lv / 3) + projectileBonus;

        for (let i = 0; i < count; i++) {
            const spreadAngle = angle + (i - (count - 1) / 2) * 0.15;

            // 갈색 파이프 투사체
            const bullet = this.bullets.get(px, py, 'bullet');
            if (bullet) {
                bullet.setActive(true).setVisible(true);
                bullet.setTint(0x795548);
                bullet.setScale(1.5);
                bullet.damage = dmg;
                bullet.pierce = WEAPONS.pipe.pierce + pierceBonus;
                bullet.hitEnemies = new Set();

                const vx = Math.cos(spreadAngle) * speed;
                const vy = Math.sin(spreadAngle) * speed;
                bullet.setVelocity(vx, vy);
                bullet.setRotation(spreadAngle);

                // 잔상 효과
                this.time.addEvent({
                    delay: 50,
                    repeat: 5,
                    callback: () => {
                        if (!bullet.active) return;
                        const trail = this.add.circle(bullet.x, bullet.y, 5, 0x795548, 0.3).setDepth(7);
                        this.tweens.add({
                            targets: trail,
                            alpha: 0,
                            scale: 0,
                            duration: 200,
                            onComplete: () => trail.destroy()
                        });
                    }
                });
            }
        }
    }

    updateCircleField(dt) {
        const lv = this.playerState.weapons.circleField || 0;
        if (lv === 0) { this.fieldOrbs.clear(true, true); return; }

        const radius = WEAPONS.circleField.baseRadius + lv*10;
        const count = WEAPONS.circleField.orbCount + Math.floor(lv/2);

        while (this.fieldOrbs.getLength() < count) {
            const orb = this.add.sprite(this.player.x, this.player.y, 'orb').setDepth(9);
            this.fieldOrbs.add(orb);
        }
        while (this.fieldOrbs.getLength() > count) {
            this.fieldOrbs.remove(this.fieldOrbs.getFirst(), true, true);
        }

        this.fieldAngle += dt * 3;
        const dmgBonus = 1 + (this.playerState.passives.damage || 0) * PASSIVES.damage.effect;
        const dmg = WEAPONS.circleField.baseDamage * (1 + lv*0.15) * dmgBonus;

        this.fieldOrbs.getChildren().forEach((orb, idx) => {
            const angle = this.fieldAngle + (Math.PI*2/count)*idx;
            orb.x = this.player.x + Math.cos(angle)*radius;
            orb.y = this.player.y + Math.sin(angle)*radius;

            this.enemies.children.each(e => {
                if (!e.active) return;
                const dx = orb.x - e.x, dy = orb.y - e.y;
                if (dx*dx + dy*dy < (20 + e.enemyRadius)**2) {
                    e.hp -= dmg * 0.05;
                }
            });
        });
    }

    findClosestEnemy() {
        let closest = null, minDist = Infinity;
        this.enemies.children.each(e => {
            if (!e.active) return;
            const d = (e.x-this.player.x)**2 + (e.y-this.player.y)**2;
            if (d < minDist) { minDist = d; closest = e; }
        });
        return closest;
    }

    // ★★★ 소환 이펙트 함수 ★★★
    createSummonEffect(x, y, color) {
        // 소환진 원
        const ring1 = this.add.circle(x, y, 5, color, 0).setStrokeStyle(3, color, 0.9).setDepth(11);
        const ring2 = this.add.circle(x, y, 5, color, 0).setStrokeStyle(2, 0xffffff, 0.7).setDepth(11);

        // 중앙 플래시
        const flash = this.add.circle(x, y, 15, 0xffffff, 0.9).setDepth(12);

        // 파티클
        for (let i = 0; i < 8; i++) {
            const pAngle = (i / 8) * Math.PI * 2;
            const p = this.add.circle(x, y, 4, color, 0.9).setDepth(11);
            this.tweens.add({
                targets: p,
                x: x + Math.cos(pAngle) * 40,
                y: y + Math.sin(pAngle) * 40,
                alpha: 0,
                scale: 0,
                duration: 400,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
            });
        }

        // 애니메이션
        this.tweens.add({
            targets: ring1,
            scale: 4,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeOut',
            onComplete: () => ring1.destroy()
        });
        this.tweens.add({
            targets: ring2,
            scale: 3,
            alpha: 0,
            duration: 400,
            ease: 'Quad.easeOut',
            onComplete: () => ring2.destroy()
        });
        this.tweens.add({
            targets: flash,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy()
        });
    }

    updateSpawning(time) {
        // ★ 웨이브 기반 스폰 시스템
        const currentWave = this.getCurrentWave();
        this.currentSpawnRate = currentWave.spawnRate;
        this.enemyTypes = currentWave.enemies;
        this.currentSpawnCount = currentWave.spawnCount;

        // 일반 스폰
        if (time > this.spawnTimer + this.currentSpawnRate) {
            for (let i = 0; i < this.currentSpawnCount; i++) {
                this.spawnEnemy(false);
            }
            this.spawnTimer = time;
        }

        // ★ 1분마다 대규모 웨이브
        const waveInterval = 60000;  // 1분
        if (this.gameTime > 0 && Math.floor(this.gameTime / waveInterval) > Math.floor((this.gameTime - 16) / waveInterval)) {
            this.triggerWave(currentWave.waveSize);
        }

        // ★ 엘리트 스폰 (3분 이후)
        const minutes = this.gameTime / 60000;
        if (minutes >= 3) {
            // 시간대별 엘리트 스폰 간격
            let eliteInterval;
            if (minutes < 8) {
                eliteInterval = 20000;  // 20초마다
            } else if (minutes < 12) {
                eliteInterval = 15000;  // 15초마다
            } else {
                eliteInterval = 8000;   // 8초마다
            }

            // 엘리트 수
            const eliteCount = minutes >= 12 ? 2 : 1;

            if (time > (this.eliteTimer || 0) + eliteInterval) {
                for (let i = 0; i < eliteCount; i++) {
                    this.spawnEnemy(true);  // 엘리트 스폰
                }
                this.eliteTimer = time;

                // 엘리트 경고
                this.showEliteWarning();
            }
        }
    }

    // ★ 엘리트 경고
    showEliteWarning() {
        const warningText = this.add.text(
            this.cameras.main.centerX,
            100,
            '⚡ 엘리트 출현! ⚡',
            { fontSize: '20px', fontStyle: 'bold', fill: '#ff4444', stroke: '#000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(300).setScrollFactor(0);

        this.tweens.add({
            targets: warningText,
            alpha: 0,
            y: 80,
            duration: 1000,
            onComplete: () => warningText.destroy()
        });
    }

    // 현재 시간에 맞는 웨이브 설정 가져오기
    getCurrentWave() {
        let current = WAVE_CONFIG[0];
        for (const wave of WAVE_CONFIG) {
            if (this.gameTime >= wave.time) {
                current = wave;
            } else {
                break;
            }
        }
        return current;
    }

    // ★ 대규모 웨이브 이벤트
    triggerWave(count) {
        // 웨이브 경고
        const waveNum = Math.floor(this.gameTime / 60000);
        const warningText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 50,
            `⚠️ 웨이브 ${waveNum} ⚠️`,
            { fontSize: '28px', fontStyle: 'bold', fill: '#ff6600', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(300).setScrollFactor(0);

        this.cameras.main.flash(200, 255, 100, 0, true);

        this.tweens.add({
            targets: warningText,
            alpha: 0,
            y: warningText.y - 50,
            duration: 1500,
            onComplete: () => warningText.destroy()
        });

        // 사방에서 몹 스폰
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 50, () => this.spawnEnemy());
        }
    }

    spawnEnemy(isElite = false) {
        if (this.enemies.countActive(true) >= CONFIG.MAX_ENEMIES) return;

        const typeKey = Phaser.Math.RND.pick(this.enemyTypes || ['sludge']);
        const type = ENEMY_TYPES[typeKey];
        const angle = Math.random() * Math.PI * 2;

        // ★ 시간에 따라 스폰 거리 감소 (압박)
        const minutes = this.gameTime / 60000;
        const playerLevel = this.playerState.level;
        const baseDist = Math.max(250, 500 - minutes * 20);
        const dist = baseDist + Math.random() * 100;

        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        const enemy = this.enemies.get(x, y, `enemy_${typeKey}`);
        if (enemy) {
            enemy.setTexture(`enemy_${typeKey}`);
            enemy.setActive(true).setVisible(true);

            // ★★★ 플레이어 전투력 기반 적응형 난이도 ★★★
            // 무기 총 레벨 계산
            let totalWeaponLevel = 0;
            for (const lv of Object.values(this.playerState.weapons)) {
                totalWeaponLevel += lv || 0;
            }
            // 패시브 총 레벨 계산
            let totalPassiveLevel = 0;
            for (const lv of Object.values(this.playerState.passives)) {
                totalPassiveLevel += lv || 0;
            }
            // 플레이어 전투력 지수 (1.0 기준)
            const playerPower = 1 + (totalWeaponLevel * 0.05) + (totalPassiveLevel * 0.03);

            // ★★★ 층별 난이도 배율 (바벨탑 스타일) ★★★
            const currentFloor = this.playerState.currentFloor || 1;
            const floorConfig = FLOOR_CONFIG[currentFloor - 1];
            const floorMult = floorConfig?.difficultyMult || 1.0;

            // ★★★ 적응형 스케일링 시스템 (층 배율 적용) ★★★
            const timeScale = {
                hp: (1 + minutes * 0.25) * floorMult,     // 분당 25% HP 증가 × 층 배율
                speed: Math.min(1 + minutes * 0.06, 1.8) * Math.min(floorMult, 1.5),  // 최대 1.8배
                damage: (1 + minutes * 0.12) * floorMult,  // 분당 12% 데미지 증가 × 층 배율
                size: 1 + minutes * 0.05                   // 분당 5% 크기 증가
            };

            // ★ 플레이어 전투력에 비례한 스케일링 (핵심!)
            const powerScale = {
                hp: playerPower,               // 전투력에 비례해 HP 증가
                damage: 1 + (playerPower - 1) * 0.5,  // 전투력의 50%만 데미지에 반영
                size: 1 + (playerPower - 1) * 0.3     // 전투력의 30%만 크기에 반영
            };

            const levelScale = {
                hp: 1 + playerLevel * 0.05,    // 레벨당 5%
                damage: 1 + playerLevel * 0.03, // 레벨당 3%
                size: 1 + playerLevel * 0.015  // 레벨당 1.5% 크기 증가
            };

            // 엘리트 배율
            const eliteMultiplier = isElite ?
                { hp: 4, speed: 1.3, damage: 2, exp: 8, size: 1.4 } :
                { hp: 1, speed: 1, damage: 1, exp: 1, size: 1 };

            // ★ 몬스터 크기 스케일 계산 (시간+레벨+전투력에 따라 커짐)
            const sizeScale = Math.min(timeScale.size * levelScale.size * powerScale.size * eliteMultiplier.size, 3.0);

            // ★ 플레이어 전투력에 비례한 몬스터 능력치 (난이도 배율 적용)
            const diffMult = this.difficultyConfig || DIFFICULTY.normal;
            enemy.hp = Math.floor(type.hp * timeScale.hp * levelScale.hp * powerScale.hp * eliteMultiplier.hp * diffMult.enemyHpMult);
            enemy.maxHp = enemy.hp;
            enemy.enemySpeed = Math.floor(type.speed * timeScale.speed * eliteMultiplier.speed * diffMult.enemySpeedMult);
            enemy.enemyDamage = Math.floor(type.damage * timeScale.damage * levelScale.damage * powerScale.damage * eliteMultiplier.damage * diffMult.enemyDmgMult);
            enemy.enemyExp = Math.ceil(type.exp * eliteMultiplier.exp * (1 + playerLevel * 0.02) * Math.sqrt(playerPower) * diffMult.expMult);  // 전투력 비례 경험치 + 난이도 배율
            enemy.enemyRadius = type.radius * sizeScale;
            enemy.enemyType = typeKey;
            enemy.isElite = isElite;
            enemy.sizeScale = sizeScale;

            // 충돌 영역 재설정 (크기에 비례)
            const radius = enemy.enemyRadius;
            enemy.body.setCircle(radius);
            enemy.body.setOffset(
                (enemy.width - radius * 2) / 2,
                (enemy.height - radius * 2) / 2
            );

            // ★ 몬스터 크기 적용 (시간+레벨에 따라 몸집 커짐)
            enemy.setScale(sizeScale);

            // ★ 엘리트 외형 (빨간 틴트)
            if (isElite) {
                enemy.setTint(0xff4444);
            }
        }
    }

    updateEnemies() {
        const maxDistSq = 2250000; // 1500^2
        const px = this.player.x, py = this.player.y;

        this.enemies.children.each(e => {
            if (!e.active) return;

            const dx = px - e.x;
            const dy = py - e.y;
            const distSq = dx * dx + dy * dy;

            // 너무 멀면 제거
            if (distSq > maxDistSq) {
                e.setActive(false).setVisible(false).setVelocity(0, 0);
                return;
            }

            // 이동 (역제곱근 근사 사용)
            if (distSq > 1) {
                const invDist = 1 / Math.sqrt(distSq);
                e.setVelocity(dx * invDist * e.enemySpeed, dy * invDist * e.enemySpeed);
            }

            // 사망 처리
            if (e.hp <= 0) {
                gameSoundManager.play('enemyDeath');
                this.playerState.kills++;

                // 일반 적은 히트스톱/쉐이크 없음 (성능 최적화)

                // 파티클
                this.deathEmitter.setPosition(e.x, e.y);
                this.deathEmitter.setParticleTint(ENEMY_TYPES[e.enemyType]?.color || 0xffffff);
                this.deathEmitter.explode(8);

                // 경험치 생성 (레벨에 따라 가치 증가)
                const expCount = Math.min(e.enemyExp, 5);  // ★ 최대 5개로 제한
                const expMultiplier = 1 + Math.floor(this.playerState.level / 5);  // ★ 5레벨마다 경험치 가치 증가
                for (let i = 0; i < expCount; i++) {
                    const exp = this.expOrbs.get(e.x + Phaser.Math.Between(-10, 10), e.y + Phaser.Math.Between(-10, 10), 'exp');
                    if (exp) {
                        exp.setActive(true).setVisible(true);
                        exp.expValue = expMultiplier;  // ★ 레벨에 따른 경험치 가치
                        // ★ 10초 후 자동 소멸
                        this.time.delayedCall(10000, () => {
                            if (exp.active) exp.setActive(false).setVisible(false);
                        });
                    }
                }

                // 아이템 드롭 확률 체크
                this.tryDropItem(e.x, e.y);

                e.setActive(false).setVisible(false).setVelocity(0, 0);
            }
        });
    }

    // ========== 보스 시스템 (바벨탑 스타일: 층별 보스) ==========
    updateBossSpawning() {
        // ★ 현재 층의 보스가 아직 스폰되지 않았고, 층 시간 경과 시 보스 스폰
        const currentFloor = this.playerState.currentFloor || 1;
        const floorConfig = FLOOR_CONFIG[currentFloor - 1];

        if (!floorConfig) return;

        // 층 시간 업데이트
        this.playerState.floorTime = this.playerState.floorTime || 0;

        // 층 제한 시간 경과 시 보스 스폰
        const bossKey = floorConfig.bossType;
        const floorBossKey = `floor_${currentFloor}_${bossKey}`;

        if (this.playerState.floorTime >= floorConfig.time && !this.spawnedBosses[floorBossKey]) {
            this.showBossWarning(bossKey);
            this.spawnedBosses[floorBossKey] = true;
        }

        /* ★ 기존 시간 기반 보스 시스템 (주석 처리)
        Object.keys(BOSS_TYPES).forEach(bossKey => {
            const boss = BOSS_TYPES[bossKey];
            // 스폰 시간 도달 && 아직 스폰 안됨
            if (this.gameTime >= boss.spawnTime && !this.spawnedBosses[bossKey]) {
                this.showBossWarning(bossKey);
                this.spawnedBosses[bossKey] = true;
            }
        });
        */
    }

    showBossWarning(bossKey) {
        const boss = BOSS_TYPES[bossKey];

        // 화면 빨간색 플래시
        this.cameras.main.flash(500, 255, 0, 0, true);

        // 경고 텍스트
        const warningText = this.add.text(
            CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 50,
            `⚠️ ${boss.name} 출현! ⚠️`,
            { fontSize: '32px', fontStyle: 'bold', fill: '#ff0000', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        // 경고 이펙트 애니메이션
        this.tweens.add({
            targets: warningText,
            alpha: { from: 1, to: 0.3 },
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.2 },
            duration: 300,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                warningText.destroy();
                // 경고 후 보스 스폰
                this.spawnBoss(bossKey);
            }
        });

        // 화면 흔들기
        this.cameras.main.shake(500, 0.02);
    }

    spawnBoss(bossKey) {
        const type = BOSS_TYPES[bossKey];
        const textureKey = `boss_${bossKey}`;

        // 플레이어 주변 랜덤 위치에 스폰
        const angle = Math.random() * Math.PI * 2;
        const dist = 400;
        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        const boss = this.bosses.get(x, y, textureKey);
        if (boss) {
            boss.setActive(true).setVisible(true);
            boss.setTexture(textureKey);

            // ★ 층별 보스 HP 배율 적용 (바벨탑 스타일) + 난이도 배율
            const currentFloor = this.playerState.currentFloor || 1;
            const floorConfig = FLOOR_CONFIG[currentFloor - 1];
            const bossHpMult = floorConfig?.bossHpMult || 1.0;
            const diffMult = this.difficultyConfig || DIFFICULTY.normal;

            // 보스 데이터 설정 (층 배율 + 난이도 배율 적용)
            boss.hp = Math.floor(type.hp * bossHpMult * diffMult.enemyHpMult);
            boss.maxHp = boss.hp;
            boss.bossSpeed = Math.floor(type.speed * diffMult.enemySpeedMult);
            boss.bossDamage = Math.floor(type.damage * (1 + (currentFloor - 1) * 0.2) * diffMult.enemyDmgMult);
            boss.bossExp = Math.floor(type.exp * (1 + (currentFloor - 1) * 0.3) * diffMult.expMult);
            boss.bossRadius = type.radius;
            boss.bossType = bossKey;
            boss.bossName = type.name;
            boss.isFloorBoss = true;  // ★ 층 보스 표시

            // ★ 충돌 영역 수정 - 텍스처 크기에 맞게 충돌 영역 확대
            // 슬러지 킹: 120x120 텍스처, radius 55 → 충돌 영역을 텍스처의 80%로 설정
            const collisionRadius = Math.max(type.radius, boss.width * 0.4);
            boss.body.setCircle(collisionRadius);
            boss.body.setOffset(
                (boss.width - collisionRadius * 2) / 2,
                (boss.height - collisionRadius * 2) / 2
            );
            boss.collisionRadius = collisionRadius;  // 충돌 반경 저장

            // 보스 깊이 (적보다 위)
            boss.setDepth(8);

            // HP바 생성
            this.createBossHPBar(boss);

            // ★ Game Juice: 보스 등장 효과
            this.bossAppearEffect(boss, type);
        }
    }

    // ★ 보스 등장 효과
    bossAppearEffect(boss, type) {
        gameSoundManager.play('bossWarning');
        // 1. 화면 경고 플래시
        this.cameras.main.flash(300, 255, 0, 0, true);

        // 2. 화면 흔들림
        this.cameras.main.shake(500, 0.01);

        // 3. 보스 등장 연출 (크기 변화)
        boss.setScale(0);
        this.tweens.add({
            targets: boss,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });

        // 4. 경고 텍스트
        const warningText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            `⚠️ ${type.name} 출현! ⚠️`,
            { fontSize: '32px', fontStyle: 'bold', fill: '#ff0000', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(300).setScrollFactor(0);

        this.tweens.add({
            targets: warningText,
            alpha: { from: 1, to: 0.5 },
            scale: { from: 1, to: 1.1 },
            duration: 200,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                this.tweens.add({
                    targets: warningText,
                    alpha: 0,
                    y: warningText.y - 50,
                    duration: 500,
                    onComplete: () => warningText.destroy()
                });
            }
        });
    }

    createBossHPBar(boss) {
        const barWidth = 80;
        const barHeight = 8;

        // ★ 보스 이름 표시
        boss.nameText = this.add.text(boss.x, boss.y - boss.bossRadius - 30, boss.bossName, {
            fontSize: '14px',
            fontStyle: 'bold',
            fill: '#ffeb3b',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(9);

        boss.hpBarBg = this.add.rectangle(boss.x, boss.y - boss.bossRadius - 15, barWidth, barHeight, 0x333333)
            .setDepth(9);
        boss.hpBarFill = this.add.rectangle(boss.x, boss.y - boss.bossRadius - 15, barWidth - 2, barHeight - 2, 0xff0000)
            .setDepth(9);
    }

    updateBosses() {
        const px = this.player.x, py = this.player.y;

        this.bosses.children.each(boss => {
            if (!boss.active) return;

            const dx = px - boss.x;
            const dy = py - boss.y;
            const distSq = dx * dx + dy * dy;

            // 이동
            if (distSq > 1) {
                const invDist = 1 / Math.sqrt(distSq);
                boss.setVelocity(dx * invDist * boss.bossSpeed, dy * invDist * boss.bossSpeed);
            }

            // HP바 + 이름 위치 업데이트
            if (boss.hpBarBg && boss.hpBarFill) {
                boss.hpBarBg.setPosition(boss.x, boss.y - boss.bossRadius - 15);
                boss.hpBarFill.setPosition(boss.x, boss.y - boss.bossRadius - 15);

                // HP 비율에 따른 바 크기
                const hpRatio = boss.hp / boss.maxHp;
                boss.hpBarFill.width = 78 * hpRatio;
            }
            // ★ 보스 이름 위치 업데이트
            if (boss.nameText) {
                boss.nameText.setPosition(boss.x, boss.y - boss.bossRadius - 30);
            }

            // 사망 처리
            if (boss.hp <= 0) {
                this.onBossDeath(boss);
            }
        });
    }

    onBossDeath(boss) {
        this.playerState.kills += 10; // 보스 처치 보너스

        const bossX = boss.x;
        const bossY = boss.y;
        const bossColor = BOSS_TYPES[boss.bossType]?.color || 0xff0000;

        // HP바 + 이름 제거
        if (boss.hpBarBg) boss.hpBarBg.destroy();
        if (boss.hpBarFill) boss.hpBarFill.destroy();
        if (boss.nameText) boss.nameText.destroy();

        // ★ Game Juice: 강력한 히트 스톱
        if (!this.hitStopActive) {
            this.hitStopActive = true;
            this.time.timeScale = 0.02;
            this.time.delayedCall(40, () => {
                this.time.timeScale = 1;
                this.hitStopActive = false;
            });
        }

        // ★ Game Juice: 강한 스크린 쉐이크 + 플래시
        this.cameras.main.shake(400, 0.02);
        this.cameras.main.flash(300, 255, 215, 0, true);  // 황금빛 플래시

        // 대형 파티클 폭발 (기존)
        this.deathEmitter.setPosition(bossX, bossY);
        this.deathEmitter.setParticleTint(bossColor);
        this.deathEmitter.explode(20);

        // ★ Game Juice: 추가 원형 파티클 폭발
        this.spawnBossDeathParticles(bossX, bossY, bossColor);

        // 경험치 대량 드롭 (시간차로 드롭)
        for (let i = 0; i < boss.bossExp; i++) {
            this.time.delayedCall(i * 30, () => {
                const exp = this.expOrbs.get(
                    bossX + Phaser.Math.Between(-50, 50),
                    bossY + Phaser.Math.Between(-50, 50),
                    'exp'
                );
                if (exp) {
                    exp.setActive(true).setVisible(true);
                    exp.expValue = 1;
                    // 경험치 튀어나오는 효과
                    exp.setVelocity(
                        Phaser.Math.Between(-150, 150),
                        Phaser.Math.Between(-150, 150)
                    );
                }
            });
        }

        // 보물상자 드롭 (100% 확률)
        this.dropItem(bossX, bossY, 'chest');

        // 보스 처치 메시지
        const deathText = this.add.text(
            bossX, bossY - 50,
            `🏆 ${boss.bossName} 처치! 🏆`,
            { fontSize: '28px', fontStyle: 'bold', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: deathText,
            y: bossY - 120,
            scale: { from: 0.5, to: 1.2 },
            alpha: { from: 1, to: 0 },
            duration: 2000,
            ease: 'Quad.easeOut',
            onComplete: () => deathText.destroy()
        });

        // 보스 비활성화
        boss.setActive(false).setVisible(false).setVelocity(0, 0);

        // ★★★ 바벨탑 스타일: 층 보스 처치 시 층 진행 ★★★
        if (boss.isFloorBoss) {
            this.playerState.floorBossDefeated = true;

            // 장비 드롭 생성
            const droppedEquipment = this.generateEquipmentDrop();

            // 층 클리어 씬 호출 (1.5초 후)
            this.time.delayedCall(1500, () => {
                this.scene.pause();
                this.scene.launch('FloorClearScene', {
                    floor: this.playerState.currentFloor,
                    equipment: droppedEquipment,
                    totalTime: this.gameTime,
                    kills: this.playerState.kills,
                    level: this.playerState.level,
                    callback: () => {
                        // ★ 장비 장착
                        this.equipItem(droppedEquipment);
                        // 다음 층 진행
                        this.advanceToNextFloor();
                        this.scene.resume();
                    }
                });
            });
        }
    }

    // ★★★ 장비 드롭 생성 ★★★
    generateEquipmentDrop() {
        // 등급 결정
        const rand = Math.random();
        let grade = 'common';
        let accumulatedRate = 0;

        for (const [gradeKey, gradeInfo] of Object.entries(EQUIPMENT_GRADES)) {
            accumulatedRate += gradeInfo.dropRate;
            if (rand < accumulatedRate) {
                grade = gradeKey;
                break;
            }
        }

        // 슬롯 랜덤 선택
        const slotKeys = Object.keys(EQUIPMENT_SLOTS);
        const slot = Phaser.Math.RND.pick(slotKeys);
        const slotInfo = EQUIPMENT_SLOTS[slot];
        const gradeInfo = EQUIPMENT_GRADES[grade];

        // 스탯 값 계산
        let statValue = Math.floor(slotInfo.baseValue * gradeInfo.statMult);
        let effectName = slotInfo.statType;
        let effectDesc = '';

        // 악세서리는 특수 효과
        if (slot === 'accessory') {
            const accessoryEffect = Phaser.Math.RND.pick(ACCESSORY_EFFECTS);
            effectName = accessoryEffect.effect;
            statValue = accessoryEffect.value * gradeInfo.statMult;
            effectDesc = accessoryEffect.desc;
        } else {
            effectDesc = `${slotInfo.desc.replace('+', '+' + statValue)}`;
        }

        return {
            slot: slot,
            grade: grade,
            name: `${gradeInfo.name} ${slotInfo.name}`,
            statType: effectName,
            statValue: statValue,
            desc: effectDesc
        };
    }

    // ★★★ 다음 층으로 진행 ★★★
    advanceToNextFloor() {
        if (this.playerState.currentFloor >= 10) {
            // 10층 클리어 - 게임 승리!
            return;
        }

        // 층 증가
        this.playerState.currentFloor++;
        this.playerState.floorTime = 0;
        this.playerState.floorBossDefeated = false;

        // 보스 스폰 기록 초기화 (층 보스는 각 층마다 새로)
        this.spawnedBosses = {};

        // HUD 업데이트
        const floorInfo = FLOOR_CONFIG[this.playerState.currentFloor - 1];
        if (this.floorText) {
            this.floorText.setText(`🏢 ${floorInfo.name}`);
        }

        // 층 진입 알림
        const floorAlert = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            `🏢 ${floorInfo.name} 진입! 🏢`,
            { fontSize: '36px', fontStyle: 'bold', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(300).setScrollFactor(0);

        this.tweens.add({
            targets: floorAlert,
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: 1.3 },
            duration: 2000,
            onComplete: () => floorAlert.destroy()
        });
    }

    // ★★★ 장비 장착 ★★★
    equipItem(equipment) {
        if (!equipment) return;

        const slot = equipment.slot;
        const oldEquip = this.playerState.equipment[slot];

        // 기존 장비 효과 제거
        if (oldEquip) {
            this.removeEquipmentBonus(oldEquip);
        }

        // 새 장비 장착
        this.playerState.equipment[slot] = equipment;

        // 새 장비 효과 적용
        this.applyEquipmentBonus(equipment);
    }

    // ★★★ 장비 보너스 적용 ★★★
    applyEquipmentBonus(equipment) {
        if (!equipment) return;

        switch (equipment.statType) {
            case 'damage':
                // 데미지는 getSynergyBonus에서 처리
                break;
            case 'maxHp':
                this.playerState.maxHp += equipment.statValue;
                this.playerState.hp = Math.min(this.playerState.hp + equipment.statValue, this.playerState.maxHp);
                break;
            case 'attackSpeed':
                // 공격속도는 무기 쿨다운에서 처리
                break;
            case 'moveSpeed':
                this.playerState.speed += CONFIG.PLAYER_SPEED * (equipment.statValue / 100);
                break;
            case 'critChance':
            case 'lifesteal':
            case 'expBonus':
            case 'magnetBonus':
                // 특수 효과는 getEquipmentBonus에서 처리
                break;
        }
    }

    // ★★★ 장비 보너스 제거 ★★★
    removeEquipmentBonus(equipment) {
        if (!equipment) return;

        switch (equipment.statType) {
            case 'maxHp':
                const hpReduction = equipment.statValue;
                this.playerState.maxHp -= hpReduction;
                this.playerState.hp = Math.min(this.playerState.hp, this.playerState.maxHp);
                break;
            case 'moveSpeed':
                this.playerState.speed -= CONFIG.PLAYER_SPEED * (equipment.statValue / 100);
                break;
        }
    }

    // ★★★ 장비 보너스 계산 (시너지 보너스와 함께 사용) ★★★
    getEquipmentBonus() {
        const bonus = {
            damage: 0,
            attackSpeed: 0,
            critChance: 0,
            lifesteal: 0,
            expBonus: 0,
            magnetBonus: 0
        };

        for (const [slot, equip] of Object.entries(this.playerState.equipment)) {
            if (!equip) continue;

            switch (equip.statType) {
                case 'damage':
                    bonus.damage += equip.statValue / 100;
                    break;
                case 'attackSpeed':
                    bonus.attackSpeed += equip.statValue / 100;
                    break;
                case 'critChance':
                    bonus.critChance += equip.statValue;
                    break;
                case 'lifesteal':
                    bonus.lifesteal += equip.statValue;
                    break;
                case 'expBonus':
                    bonus.expBonus += equip.statValue;
                    break;
                case 'magnetBonus':
                    bonus.magnetBonus += equip.statValue;
                    break;
            }
        }

        return bonus;
    }

    // ★ 보스 사망 대형 파티클
    spawnBossDeathParticles(x, y, color) {
        const particleCount = 24;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 150 + Math.random() * 150;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const size = 6 + Math.random() * 6;
            const p = this.add.circle(x, y, size, color, 1).setDepth(150);

            this.tweens.add({
                targets: p,
                x: x + vx * 0.5,
                y: y + vy * 0.5,
                alpha: 0,
                scale: 0,
                duration: 600 + Math.random() * 200,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    // ========== 아이템 시스템 ==========
    tryDropItem(x, y) {
        // 보물상자 제외한 아이템들 중에서 드롭 확률 체크
        const dropableItems = ['health', 'magnet', 'invincible'];  // ★ bomb 제거
        // ★ 행운 패시브 적용
        const luckBonus = 1 + (this.playerState.passives.luck || 0) * PASSIVES.luck.effect;

        for (const itemKey of dropableItems) {
            if (Math.random() < ITEM_TYPES[itemKey].dropRate * luckBonus) {
                this.dropItem(x, y, itemKey);
                return; // 하나만 드롭
            }
        }
    }

    dropItem(x, y, itemKey) {
        const textureKey = `item_${itemKey}`;
        const item = this.items.get(x, y, textureKey);

        if (item) {
            item.setActive(true).setVisible(true);
            item.setTexture(textureKey);
            item.itemType = itemKey;
            item.setDepth(5);

            // 약간의 튀어오르는 효과
            this.tweens.add({
                targets: item,
                y: y - 20,
                duration: 200,
                yoyo: true,
                ease: 'Bounce.easeOut'
            });
        }
    }

    updateItems() {
        // 아이템이 플레이어 근처에 있으면 자석처럼 끌려옴
        const magnetRange = 100;
        const collectRange = 25;  // 이 거리 안이면 즉시 수집
        const px = this.player.x, py = this.player.y;

        this.items.children.each(item => {
            if (!item.active) return;

            const dx = px - item.x;
            const dy = py - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 매우 가까우면 즉시 수집
            if (dist < collectRange) {
                this.onCollectItem(this.player, item);
                return;
            }

            if (dist < magnetRange) {
                // 더 빠른 속도로 끌어당김 (200 → 400)
                const speed = 400;
                item.setVelocity((dx / dist) * speed, (dy / dist) * speed);
            } else {
                item.setVelocity(0, 0);
            }
        });
    }

    onCollectItem(player, item) {
        if (!item.active) return;

        const type = ITEM_TYPES[item.itemType];
        const itemX = item.x;
        const itemY = item.y;

        switch (item.itemType) {
            case 'health':
                // 체력 회복
                this.playerState.hp = Math.min(
                    this.playerState.maxHp,
                    this.playerState.hp + type.effect
                );
                this.showItemEffect('💚 +' + type.effect);
                break;

            case 'magnet':
                // 모든 경험치 즉시 수집
                this.expOrbs.children.each(exp => {
                    if (exp.active) {
                        exp.setVelocity(0, 0);
                        exp.setPosition(this.player.x, this.player.y);
                    }
                });
                this.showItemEffect('🧲 자석!');
                break;

            case 'bomb':
                // 화면 내 모든 적 대미지
                this.activateBomb();
                this.showItemEffect('💥 폭탄!');
                break;

            case 'invincible':
                // 5초 무적
                this.playerState.invincibleTime = 5000;
                this.showItemEffect('⭐ 무적 5초!');
                // ★ 무적 이펙트: 플레이어 주변 빛 효과
                this.createInvincibleAura();
                break;

            case 'chest':
                // 보물상자: 즉시 레벨업
                this.playerState.exp += this.playerState.expToNext;
                this.showItemEffect('🎁 보물상자!');
                break;
        }

        // ★ Game Juice: 아이템 획득 파티클
        this.spawnItemParticles(itemX, itemY, type.color);

        item.setActive(false).setVisible(false).setVelocity(0, 0);
    }

    // ★ 아이템 획득 파티클 효과
    spawnItemParticles(x, y, color) {
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            const p = this.add.circle(x, y, 4, color, 1).setDepth(150);
            this.tweens.add({
                targets: p,
                x: x + vx * 0.3,
                y: y + vy * 0.3,
                alpha: 0,
                scale: 0,
                duration: 400,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    // ★ 무적 오라 효과
    createInvincibleAura() {
        if (this.invincibleAura) this.invincibleAura.destroy();

        this.invincibleAura = this.add.circle(this.player.x, this.player.y, 50, 0xffd600, 0.2)
            .setDepth(5).setStrokeStyle(3, 0xffd600, 0.6);

        // 5초 동안 유지하며 펄스
        this.tweens.add({
            targets: this.invincibleAura,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.3, to: 0.1 },
            duration: 500,
            yoyo: true,
            repeat: 9,  // 10번 = 5초
            onUpdate: () => {
                if (this.invincibleAura && this.player) {
                    this.invincibleAura.setPosition(this.player.x, this.player.y);
                }
            },
            onComplete: () => {
                if (this.invincibleAura) {
                    this.invincibleAura.destroy();
                    this.invincibleAura = null;
                }
            }
        });
    }

    activateBomb() {
        const px = this.player.x, py = this.player.y;
        const bombRange = 80;   // ★ 대폭 너프: 150 → 80px (아주 좁은 범위)
        const bombDamage = 15;  // ★ 대폭 너프: 25 → 15
        const maxKills = 5;     // ★ 최대 5마리만 처치 가능

        // 화면 플래시 (약하게)
        this.cameras.main.flash(100, 255, 100, 0);

        // 폭발 범위 시각화 (작게)
        const explosionCircle = this.add.circle(px, py, bombRange, 0xff5722, 0.4).setDepth(100);
        const explosionRing = this.add.circle(px, py, 10, 0xffeb3b, 0.8).setDepth(101);

        this.tweens.add({
            targets: explosionCircle,
            alpha: 0,
            duration: 300,
            onComplete: () => explosionCircle.destroy()
        });

        this.tweens.add({
            targets: explosionRing,
            scale: bombRange / 10,
            alpha: 0,
            duration: 200,
            onComplete: () => explosionRing.destroy()
        });

        // ★ 범위 내 가장 가까운 적 최대 5마리에게만 데미지
        const nearbyEnemies = [];
        this.enemies.children.each(e => {
            if (!e.active) return;
            const dx = e.x - px, dy = e.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= bombRange) {
                nearbyEnemies.push({ enemy: e, dist: dist, dx: dx, dy: dy });
            }
        });

        // 거리순 정렬 후 최대 5마리만 처리
        nearbyEnemies.sort((a, b) => a.dist - b.dist);
        nearbyEnemies.slice(0, maxKills).forEach(({ enemy, dist, dx, dy }) => {
            enemy.hp -= bombDamage;
            // 약한 넉백
            if (dist > 0) {
                enemy.x += (dx / dist) * 15;
                enemy.y += (dy / dist) * 15;
            }
        });

        // ★ 보스에게는 효과 없음 (완전 제거)
    }

    showItemEffect(text) {
        const effectText = this.add.text(
            this.player.x, this.player.y - 40,
            text,
            { fontSize: '20px', fontStyle: 'bold', fill: '#fff', stroke: '#000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: effectText,
            y: this.player.y - 80,
            alpha: 0,
            duration: 1000,
            onComplete: () => effectText.destroy()
        });
    }

    // 보스 탄환 충돌 처리
    onBulletHitBoss(bullet, boss) {
        if (!bullet.active || !boss.active) return;
        boss.hp -= bullet.damage;
        bullet.setActive(false).setVisible(false).setVelocity(0, 0);
    }

    // 보스 플레이어 충돌 처리
    onPlayerHitBoss(player, boss) {
        if (!boss.active || this.playerState.invincibleTime > 0) return;
        gameSoundManager.play('playerHit');
        // ★ 방어력 패시브 적용
        const armorReduction = (this.playerState.passives.armor || 0) * PASSIVES.armor.effect;
        const finalDamage = Math.max(1, boss.bossDamage - armorReduction);
        this.playerState.hp -= finalDamage;
        this.playerState.invincibleTime = 1500; // 보스에게 맞으면 더 긴 무적

        // ★ Game Juice: 보스 피격 효과 (일반보다 강함)
        this.cameras.main.shake(200, 0.025);
        this.cameras.main.flash(150, 255, 0, 0, true);

        // 플레이어 깜빡임 (무적 시각화) - 1.5초
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.2, to: 1 },
            duration: 100,
            repeat: 14,  // 15번 = 1.5초
            yoyo: true,
            onComplete: () => this.player.setAlpha(1)
        });

        // 히트 스톱
        if (!this.hitStopActive) {
            this.hitStopActive = true;
            this.time.timeScale = 0.03;
            this.time.delayedCall(30, () => {
                this.time.timeScale = 1;
                this.hitStopActive = false;
            });
        }

        if (this.playerState.hp <= 0) this.gameEnd(false);
    }

    updateExpOrbs() {
        const magnetBonus = 1 + (this.playerState.passives.magnet || 0) * PASSIVES.magnet.effect;
        const rangeSq = (CONFIG.EXP_MAGNET_RANGE * magnetBonus) ** 2;
        const collectSq = 900; // 30^2
        const px = this.player.x, py = this.player.y;

        this.expOrbs.children.each(exp => {
            if (!exp.active) return;

            const dx = px - exp.x;
            const dy = py - exp.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < rangeSq && distSq > collectSq) {
                // 자석 범위 내: 빠르게 이동
                const invDist = 1 / Math.sqrt(distSq);
                exp.setVelocity(dx * invDist * 400, dy * invDist * 400);
            } else if (distSq >= rangeSq) {
                exp.setVelocity(0, 0);
            }
        });
    }

    updateBullets() {
        const maxDist = 800**2;
        this.bullets.children.each(b => {
            if (!b.active) return;

            if (b.bulletType === 'homing') {
                b.life -= this.game.loop.delta;
                if (b.life <= 0) { b.setActive(false).setVisible(false).setVelocity(0,0); return; }

                const target = this.findClosestEnemy();
                if (target) {
                    const dx = target.x - b.x, dy = target.y - b.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist > 0) {
                        let vx = b.body.velocity.x + (dx/dist)*500*(this.game.loop.delta/1000);
                        let vy = b.body.velocity.y + (dy/dist)*500*(this.game.loop.delta/1000);
                        const spd = Math.sqrt(vx*vx + vy*vy);
                        if (spd > b.homingSpeed) { vx = (vx/spd)*b.homingSpeed; vy = (vy/spd)*b.homingSpeed; }
                        b.setVelocity(vx, vy);
                    }
                }
            }

            const dx = b.x - this.player.x, dy = b.y - this.player.y;
            if (dx*dx + dy*dy > maxDist) b.setActive(false).setVisible(false).setVelocity(0,0);
        });
    }

    onBulletHit(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        enemy.hp -= bullet.damage;
        bullet.setActive(false).setVisible(false).setVelocity(0,0);
    }

    onCollectExp(player, exp) {
        if (!exp.active) return;
        gameSoundManager.play('expPickup');
        // ★ 숙련도 보너스 적용
        const growthBonus = 1 + (this.playerState.passives.growth || 0) * PASSIVES.growth.effect;
        this.playerState.exp += (exp.expValue || 1) * growthBonus;
        exp.setActive(false).setVisible(false).setVelocity(0,0);
        if (this.playerState.exp >= this.playerState.expToNext) this.levelUp();
    }

    onPlayerHit(player, enemy) {
        if (!enemy.active || this.playerState.invincibleTime > 0) return;
        gameSoundManager.play('playerHit');
        // ★ 방어력 패시브 적용
        const armorReduction = (this.playerState.passives.armor || 0) * PASSIVES.armor.effect;
        const finalDamage = Math.max(1, enemy.enemyDamage - armorReduction);
        this.playerState.hp -= finalDamage;
        this.playerState.invincibleTime = 1000;

        // ★ Game Juice: 피격 효과
        this.cameras.main.shake(150, 0.015);  // 더 강한 쉐이크
        this.cameras.main.flash(100, 255, 50, 50, true);  // 빨간 플래시

        // ★ Game Juice: 플레이어 깜빡임 (무적 시각화)
        this.tweens.add({
            targets: this.player,
            alpha: { from: 0.3, to: 1 },
            duration: 100,
            repeat: 9,  // 10번 반복 = 1초
            yoyo: true,
            onComplete: () => {
                this.player.setAlpha(1);
            }
        });

        // ★ Game Juice: 히트 스톱 (짧은 정지)
        if (!this.hitStopActive) {
            this.hitStopActive = true;
            this.time.timeScale = 0.05;
            this.time.delayedCall(20, () => {
                this.time.timeScale = 1;
                this.hitStopActive = false;
            });
        }

        if (this.playerState.hp <= 0) this.gameEnd(false);
    }

    levelUp() {
        gameSoundManager.play('levelUp');
        this.playerState.exp -= this.playerState.expToNext;
        this.playerState.level++;
        // ★★★ 뱀서라이크 스타일 경험치 곡선 (벤치마킹) ★★★
        // 기존: 10 * 1.2^level (너무 빠름)
        // 새로운 공식: 선형 + 지수 혼합 (초반 느림, 중후반 적당)
        // Lv1→2: 35, Lv5→6: 82, Lv10→11: 155, Lv20→21: 345
        // this.playerState.expToNext = Math.floor(10 * Math.pow(1.2, this.playerState.level - 1));  // 기존
        this.playerState.expToNext = this.calculateExpToNext(this.playerState.level);

        // ★ 레벨별 보스 스폰 (20, 40, 60, 80+)
        this.checkLevelBoss();

        // ★ Game Juice: 레벨업 플래시 + 파티클
        this.cameras.main.flash(200, 100, 200, 255, true);  // 파란빛 플래시
        this.spawnLevelUpParticles();

        // 게임 완전 정지
        this.isPaused = true;
        this.physics.world.pause();
        this.time.paused = true;  // 타이머도 정지
        this.tweens.pauseAll();   // 트윈도 정지
        this.player.setVelocity(0, 0);

        // 모든 적 속도 0으로
        this.enemies.children.each(e => { if (e.active) e.setVelocity(0, 0); });
        this.bosses.children.each(b => { if (b.active) b.setVelocity(0, 0); });

        this.scene.launch('LevelUpScene', {
            level: this.playerState.level,
            weapons: this.playerState.weapons,
            passives: this.playerState.passives,
            bannedSkills: this.playerState.bannedSkills || [],  // ★ 밴된 스킬 목록
            rerollCount: this.playerState.rerollCount || 0,     // ★ 리롤 횟수
            exp: this.playerState.exp,  // ★ 현재 경험치 (리롤 비용)
            callback: (choice) => {
                if (choice.type === 'weapon') this.playerState.weapons[choice.key] = (this.playerState.weapons[choice.key] || 0) + 1;
                else {
                    this.playerState.passives[choice.key] = (this.playerState.passives[choice.key] || 0) + 1;
                    if (choice.key === 'maxHp') { this.playerState.maxHp += PASSIVES.maxHp.effect; this.playerState.hp += PASSIVES.maxHp.effect; }
                }
                // 게임 재개
                this.isPaused = false;
                this.physics.world.resume();
                this.time.paused = false;
                this.tweens.resumeAll();
            },
            // ★ 밴 콜백
            banCallback: (skillKey) => {
                if (!this.playerState.bannedSkills) this.playerState.bannedSkills = [];
                if (this.playerState.bannedSkills.length < 3) {
                    this.playerState.bannedSkills.push(skillKey);
                }
            },
            // ★ 리롤 콜백
            rerollCallback: (expCost) => {
                this.playerState.rerollCount = (this.playerState.rerollCount || 0) + 1;
                if (expCost > 0) {
                    this.playerState.exp = Math.max(0, this.playerState.exp - expCost);
                }
            }
        });
    }

    // ★★★ 뱀서라이크 경험치 곡선 계산 ★★★
    // 벤치마킹: Vampire Survivors, HoloCure, 20 Minutes Till Dawn
    // 특징: 초반 느림 → 중반 적당 → 후반 가파름
    calculateExpToNext(level) {
        // 공식: 기본값 + 선형증가 + 제곱증가
        // level 1: 35,  level 5: 82,  level 10: 155
        // level 15: 248, level 20: 360, level 30: 625
        const base = 25;           // 기본값
        const linear = level * 8;  // 레벨당 8씩 증가
        const quadratic = Math.floor(level * level * 0.2);  // 제곱 증가 (0.2 배율)
        return base + linear + quadratic;
    }

    // ★ 레벨업 파티클 효과
    spawnLevelUpParticles() {
        const px = this.player.x;
        const py = this.player.y;
        const colors = [0x64b5f6, 0x42a5f5, 0x2196f3, 0x1e88e5, 0xffd700];
        const particleCount = 20;

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 200 + Math.random() * 100;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 5 + Math.random() * 5;

            const p = this.add.circle(px, py, size, color, 1).setDepth(160);

            this.tweens.add({
                targets: p,
                x: px + vx * 0.4,
                y: py + vy * 0.4,
                alpha: 0,
                scale: 0,
                duration: 500,
                ease: 'Quad.easeOut',
                onComplete: () => p.destroy()
            });
        }
    }

    // ★ 레벨별 보스 스폰 체크
    checkLevelBoss() {
        const lv = this.playerState.level;
        const bossKeys = Object.keys(BOSS_TYPES);

        // 20레벨마다 보스 스폰
        if (lv % 20 === 0) {
            let bossKey;
            if (lv === 20) {
                bossKey = 'sludge_king';
            } else if (lv === 40) {
                bossKey = 'drum_giant';
            } else if (lv === 60) {
                bossKey = 'toxic_reaper';
            } else {
                // 80+ 레벨은 랜덤 보스
                bossKey = Phaser.Math.RND.pick(bossKeys);
            }

            // 레벨업 창 닫힌 후 보스 스폰 (1초 딜레이)
            this.time.delayedCall(1000, () => {
                this.spawnBoss(bossKey);
            });
        }
    }

    gameEnd(victory) {
        this.scene.start('GameOverScene', { time: this.gameTime, kills: this.playerState.kills, level: this.playerState.level, victory });
    }
}

// ==========================================
// LevelUpScene
// ==========================================
class LevelUpScene extends Phaser.Scene {
    constructor() { super({ key: 'LevelUpScene' }); }
    init(data) {
        this.data = data;
        this.currentRerollCount = 0;  // 이번 레벨업에서 리롤한 횟수
    }

    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8);
        this.add.text(w/2, 35, 'LEVEL UP!', { fontSize: '38px', fontStyle: 'bold', fill: '#7cb342' }).setOrigin(0.5);
        this.add.text(w/2, 65, `Lv.${this.data.level}`, { fontSize: '18px', fill: '#aaa' }).setOrigin(0.5);

        // ★ 밴된 스킬 표시
        const bannedSkills = this.data.bannedSkills || [];
        if (bannedSkills.length > 0) {
            const bannedText = bannedSkills.map(k => {
                const info = WEAPONS[k] || PASSIVES[k];
                return info ? info.icon : '?';
            }).join(' ');
            this.add.text(w/2, 88, `🚫 밴: ${bannedText}`, { fontSize: '12px', fill: '#ff4444' }).setOrigin(0.5);
        }

        // 선택지 생성
        this.displayChoices();

        // ★★★ 리롤 버튼 (1회 제한) ★★★
        // const rerollCost = this.currentRerollCount === 0 ? 0 : 10;  // 기존: 무제한 리롤
        const canReroll = this.currentRerollCount < 1;  // 1회만 가능 (무료)

        const rerollBtn = this.add.rectangle(w/2 - 100, h - 50, 150, 40, canReroll ? 0x9c27b0 : 0x555555)
            .setStrokeStyle(2, canReroll ? 0xce93d8 : 0x777777)
            .setInteractive({ useHandCursor: canReroll });

        const rerollLabel = canReroll ? '🔄 리롤 (1회)' : '🔄 리롤 불가';
        this.add.text(w/2 - 100, h - 50, rerollLabel, {
            fontSize: '14px', fontStyle: 'bold', fill: canReroll ? '#fff' : '#888'
        }).setOrigin(0.5);

        if (canReroll) {
            rerollBtn.on('pointerover', () => rerollBtn.setFillStyle(0xab47bc));
            rerollBtn.on('pointerout', () => rerollBtn.setFillStyle(0x9c27b0));
            rerollBtn.on('pointerdown', () => this.doReroll(0));
        }

        // ★★★ 밴 안내 ★★★
        this.add.text(w/2 + 100, h - 50, '카드 우클릭: 밴 (최대 3개)', {
            fontSize: '12px', fill: '#aaa'
        }).setOrigin(0.5);
    }

    // ★ 선택지 카드 표시 - 개선 (아이콘 확대, 레벨 변화, 보너스 표시)
    displayChoices() {
        const w = this.cameras.main.width, h = this.cameras.main.height;

        // 기존 카드 제거
        if (this.choiceCards) {
            this.choiceCards.forEach(obj => obj.destroy());
        }
        this.choiceCards = [];

        const choices = this.generateChoices();
        this.currentChoices = choices;

        const cw = 175, gap = 20;
        const startX = w/2 - ((choices.length-1) * (cw+gap)) / 2;

        choices.forEach((c, i) => {
            const x = startX + i*(cw+gap);
            const cardColor = c.type === 'weapon' ? 0x00a8e8 : 0x7cb342;
            const card = this.add.rectangle(x, 255, cw, 250, 0x2a2a4a)
                .setStrokeStyle(3, cardColor)
                .setInteractive({ useHandCursor: true });
            this.choiceCards.push(card);

            const info = c.type === 'weapon' ? WEAPONS[c.key] : PASSIVES[c.key];
            const lvl = c.type === 'weapon' ? (this.data.weapons[c.key] || 0) : (this.data.passives[c.key] || 0);

            // 타입 라벨 (무기/패시브 구분)
            const typeLabel = this.add.text(x, 150, c.type === 'weapon' ? '⚔ 무기' : '🛡 패시브', {
                fontSize: '9px', fill: c.type === 'weapon' ? '#00a8e8' : '#7cb342'
            }).setOrigin(0.5);
            this.choiceCards.push(typeLabel);

            // 아이콘 (확대: 40px)
            const iconText = this.add.text(x, 178, info.icon, { fontSize: '40px' }).setOrigin(0.5);
            this.choiceCards.push(iconText);

            // 이름 (14px)
            const nameText = this.add.text(x, 212, info.name, { fontSize: '14px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
            this.choiceCards.push(nameText);

            // 레벨 표시 (Lv.N → N+1 형식)
            let lvlStr;
            if (c.isNew) {
                lvlStr = '✦ NEW!';
            } else {
                lvlStr = `Lv.${lvl} → ${lvl + 1}`;
            }
            const lvlText = this.add.text(x, 232, lvlStr, {
                fontSize: '11px', fill: c.isNew ? '#ffd700' : '#00a8e8'
            }).setOrigin(0.5);
            this.choiceCards.push(lvlText);

            // 설명 (11px, 더 읽기 좋게)
            const descText = this.add.text(x, 260, info.desc, {
                fontSize: '11px', fill: '#ccc', wordWrap: { width: 155 }, align: 'center'
            }).setOrigin(0.5);
            this.choiceCards.push(descText);

            // ★ 레벨업 보너스 표시 (초록색)
            let bonusStr = '';
            if (c.type === 'weapon' && !c.isNew) {
                bonusStr = '▲ 데미지 +12%';
            } else if (c.type === 'passive' && !c.isNew) {
                // 패시브 효과 구체적 표시
                const effectVal = info.effect;
                if (typeof effectVal === 'number') {
                    if (effectVal < 1) {
                        bonusStr = `▲ 효과 +${Math.round(effectVal * 100)}%`;
                    } else {
                        bonusStr = `▲ 효과 +${effectVal}`;
                    }
                }
            }
            if (bonusStr) {
                const bonusText = this.add.text(x, 290, bonusStr, {
                    fontSize: '10px', fontStyle: 'bold', fill: '#7cb342'
                }).setOrigin(0.5);
                this.choiceCards.push(bonusText);
            }

            // 시너지 힌트
            const synergyHint = this.getSynergyHint(c.key);
            if (synergyHint) {
                const sLabel = this.add.text(x, 310, '💡 시너지', { fontSize: '9px', fill: '#ff6b6b' }).setOrigin(0.5);
                const sPartner = this.add.text(x, 325, synergyHint.partnerName, { fontSize: '8px', fill: '#ffd700' }).setOrigin(0.5);
                const sBonus = this.add.text(x, 338, `+${synergyHint.bonus}`, { fontSize: '8px', fill: '#7cb342' }).setOrigin(0.5);
                this.choiceCards.push(sLabel, sPartner, sBonus);
            }

            // 좌클릭: 선택
            card.on('pointerover', () => card.setFillStyle(0x3a3a5a));
            card.on('pointerout', () => card.setFillStyle(0x2a2a4a));
            card.on('pointerdown', (pointer) => {
                if (pointer.rightButtonDown()) {
                    // 우클릭: 밴
                    this.doBan(c.key);
                } else {
                    // 좌클릭: 선택
                    this.data.callback(c);
                    this.scene.stop();
                }
            });
        });
    }

    // ★ 리롤 실행
    doReroll(expCost) {
        this.currentRerollCount++;
        if (this.data.rerollCallback) {
            this.data.rerollCallback(expCost);
            this.data.exp = Math.max(0, (this.data.exp || 0) - expCost);
        }
        // 화면 다시 그리기
        this.scene.restart(this.data);
    }

    // ★ 밴 실행
    doBan(skillKey) {
        const bannedSkills = this.data.bannedSkills || [];
        if (bannedSkills.length >= 3) {
            // 이미 3개 밴됨
            return;
        }
        if (bannedSkills.includes(skillKey)) {
            // 이미 밴됨
            return;
        }

        // 밴 콜백 호출
        if (this.data.banCallback) {
            this.data.banCallback(skillKey);
            this.data.bannedSkills = [...bannedSkills, skillKey];
        }

        // 선택지 다시 생성
        this.displayChoices();
    }

    // ★ 시너지 힌트 찾기
    getSynergyHint(skillKey) {
        for (const synergy of SYNERGIES) {
            if (synergy.requires.includes(skillKey)) {
                const partnerKey = synergy.requires.find(k => k !== skillKey);
                const partnerInfo = WEAPONS[partnerKey] || PASSIVES[partnerKey];
                if (partnerInfo) {
                    return {
                        partnerName: `${partnerInfo.icon} ${partnerInfo.name}과 조합`,
                        bonus: synergy.bonus.desc
                    };
                }
            }
        }
        return null;
    }

    // ★ 선택지 생성 (밴된 스킬 제외)
    generateChoices() {
        const choices = [];
        const bannedSkills = this.data.bannedSkills || [];

        // 기존 무기 레벨업 (밴되지 않은 것만)
        Object.keys(this.data.weapons).forEach(k => {
            if (this.data.weapons[k] < WEAPONS[k].maxLevel && !bannedSkills.includes(k)) {
                choices.push({ type: 'weapon', key: k });
            }
        });

        // 새 무기 (밴되지 않은 것만)
        Object.keys(WEAPONS).forEach(k => {
            if (!this.data.weapons[k] && !bannedSkills.includes(k)) {
                choices.push({ type: 'weapon', key: k, isNew: true });
            }
        });

        // 패시브 (밴되지 않은 것만)
        Object.keys(PASSIVES).forEach(k => {
            if ((this.data.passives[k] || 0) < PASSIVES[k].maxLevel && !bannedSkills.includes(k)) {
                choices.push({ type: 'passive', key: k });
            }
        });

        Phaser.Utils.Array.Shuffle(choices);
        return choices.slice(0, 3);
    }
}

// ==========================================
// GameOverScene
// ==========================================
class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    init(data) { this.result = data; }

    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(w/2, h/2, w, h, COLORS.BG);

        const title = this.result.victory ? '정화 완료!' : '정화 실패';
        const color = this.result.victory ? '#7cb342' : '#e53935';
        this.add.text(w/2, h/2-120, title, { fontSize: '48px', fontStyle: 'bold', fill: color }).setOrigin(0.5);

        const sec = Math.floor(this.result.time/1000);
        const timeStr = `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
        this.add.text(w/2, h/2-40, `생존: ${timeStr}`, { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(w/2, h/2, `정화: ${this.result.kills}`, { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(w/2, h/2+40, `레벨: ${this.result.level}`, { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);

        const btn = this.add.rectangle(w/2, h/2+120, 180, 45, 0x00a8e8).setInteractive({ useHandCursor: true });
        this.add.text(w/2, h/2+120, '다시 도전', { fontSize: '20px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
        // btn.on('pointerdown', () => this.scene.start('GameScene'));  // ★ 기존 코드
        btn.on('pointerdown', () => this.scene.start('ClassSelectScene'));  // ★ 클래스 선택으로 이동
    }
}

// ==========================================
// ★ FloorClearScene (층 클리어)
// ==========================================
class FloorClearScene extends Phaser.Scene {
    constructor() { super({ key: 'FloorClearScene' }); }
    init(data) { this.data = data; }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // 배경 (반투명)
        this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.85);

        // 층 클리어 축하
        const floorInfo = FLOOR_CONFIG[this.data.floor - 1];
        this.add.text(w/2, h/2 - 100, '🎉 층 클리어! 🎉', {
            fontSize: '48px', fontStyle: 'bold', fill: '#ffd700',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w/2, h/2 - 40, floorInfo.name, {
            fontSize: '24px', fontStyle: 'bold', fill: '#fff'
        }).setOrigin(0.5);

        // 보상 표시
        this.add.text(w/2, h/2 + 20, '보상:', {
            fontSize: '18px', fill: '#aaa'
        }).setOrigin(0.5);

        // 획득 장비 표시
        if (this.data.equipment) {
            const gradeInfo = EQUIPMENT_GRADES[this.data.equipment.grade];
            const slotInfo = EQUIPMENT_SLOTS[this.data.equipment.slot];
            this.add.text(w/2, h/2 + 55, `${slotInfo.icon} ${this.data.equipment.name}`, {
                fontSize: '20px', fontStyle: 'bold',
                fill: '#' + gradeInfo.color.toString(16).padStart(6, '0')
            }).setOrigin(0.5);

            this.add.text(w/2, h/2 + 80, this.data.equipment.desc, {
                fontSize: '14px', fill: '#7cb342'
            }).setOrigin(0.5);
        }

        // 다음 층 버튼
        if (this.data.floor < 10) {
            const nextFloor = FLOOR_CONFIG[this.data.floor];
            const nextBtn = this.add.rectangle(w/2, h/2 + 140, 250, 50, 0x00a8e8)
                .setInteractive({ useHandCursor: true });

            this.add.text(w/2, h/2 + 140, `다음 층: ${nextFloor.name}`, {
                fontSize: '18px', fontStyle: 'bold', fill: '#fff'
            }).setOrigin(0.5);

            nextBtn.on('pointerdown', () => {
                this.scene.stop();
                this.data.callback();
            });
        } else {
            // 최종 클리어!
            this.add.text(w/2, h/2 + 140, '🏆 바벨탑 완전 정화! 🏆', {
                fontSize: '28px', fontStyle: 'bold', fill: '#ff6b6b'
            }).setOrigin(0.5);

            const endBtn = this.add.rectangle(w/2, h/2 + 200, 180, 45, 0x7cb342)
                .setInteractive({ useHandCursor: true });
            this.add.text(w/2, h/2 + 200, '완료', {
                fontSize: '20px', fontStyle: 'bold', fill: '#fff'
            }).setOrigin(0.5);

            endBtn.on('pointerdown', () => {
                this.scene.start('GameOverScene', {
                    victory: true,
                    time: this.data.totalTime,
                    kills: this.data.kills,
                    level: this.data.level,
                    floor: 10
                });
            });
        }
    }
}

// ==========================================
// 게임 시작
// ==========================================
const config = {
    type: Phaser.WEBGL,
    width: CONFIG.WIDTH,
    height: CONFIG.HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    // ★ 모바일 전체화면 대응 - Scale 설정 추가
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        // 최소/최대 크기 설정
        min: {
            width: 480,
            height: 270
        },
        max: {
            width: 1920,
            height: 1080
        }
    },
    physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
    scene: [BootScene, TitleScene, ClassSelectScene, GameScene, LevelUpScene, GameOverScene, FloorClearScene],
    render: { antialias: false, pixelArt: true, roundPixels: true },
    fps: { target: 60, forceSetTimeOut: false },
    input: { activePointers: 3 }
};

const game = new Phaser.Game(config);
console.log('DY라이크 로드 완료!');
