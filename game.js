// ==========================================
// DY라이크 - 디와이산업개발 환경정화 시뮬레이터
// Phaser.js 버전
// ==========================================

// ========== 게임 설정 ==========
const CONFIG = {
    WIDTH: 960,
    HEIGHT: 540,
    MAX_ENEMIES: 300,    // 몹 수 증가
    MAX_BULLETS: 100,
    MAX_EXP_ORBS: 200,
    PLAYER_SPEED: 300,
    PLAYER_MAX_HP: 100,
    BULLET_SPEED: 500,
    FIRE_RATE: 400,
    ENEMY_SPEED: 80,
    SPAWN_RATE: 400,     // 800 → 400 (더 빠르게 스폰)
    GAME_DURATION: 15 * 60 * 1000,
    EXP_MAGNET_RANGE: 100
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
const ENEMY_TYPES = {
    // 기본 적
    sludge: { name: '슬러지', color: 0x4a3728, radius: 18, hp: 15, speed: 50, damage: 10, exp: 1 },
    toxic: { name: '폐수', color: 0x7cb342, radius: 16, hp: 8, speed: 100, damage: 8, exp: 1 },
    waste: { name: '폐기물', color: 0xff8f00, radius: 24, hp: 50, speed: 35, damage: 15, exp: 5 },
    gas: { name: '유해가스', color: 0x9c27b0, radius: 20, hp: 20, speed: 60, damage: 5, exp: 2 },

    // ★ 신규 몬스터
    pollutedWater: { name: '오염수', color: 0x1565c0, radius: 12, hp: 8, speed: 90, damage: 5, exp: 1 },      // 작고 빠름
    grease: { name: '기름때', color: 0x37474f, radius: 22, hp: 40, speed: 35, damage: 18, exp: 3 },           // 느리고 강함
    oilDrum: { name: '폐유통', color: 0xd84315, radius: 20, hp: 30, speed: 45, damage: 20, exp: 4 },          // 폭발
    sludgeGiant: { name: '슬러지 거인', color: 0x3e2723, radius: 35, hp: 150, speed: 30, damage: 30, exp: 15 } // 미니보스급
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
const BOSS_TYPES = {
    sludge_king: {
        name: '슬러지 킹',
        color: 0x3d2817,
        radius: 55,           // 120x120 텍스처
        hp: 500,
        speed: 30,
        damage: 25,
        exp: 50,
        spawnTime: 180000     // 3분
    },
    drum_giant: {
        name: '드럼통 거인',
        color: 0xd84315,
        radius: 65,           // 140x140 텍스처
        hp: 1000,
        speed: 25,
        damage: 35,
        exp: 100,
        spawnTime: 360000     // 6분
    },
    toxic_reaper: {
        name: '오염의 사신',
        color: 0x4a148c,
        radius: 75,           // 160x160 텍스처
        hp: 2000,
        speed: 40,
        damage: 50,
        exp: 200,
        spawnTime: 540000     // 9분
    }
};

// ========== 아이템 정의 ==========
const ITEM_TYPES = {
    health: { name: '체력팩', color: 0xe53935, effect: 30, dropRate: 0.15 },
    magnet: { name: '자석', color: 0x9c27b0, effect: 'magnet', dropRate: 0.10 },
    bomb: { name: '폭탄', color: 0xff5722, effect: 'bomb', dropRate: 0.05 },
    invincible: { name: '무적', color: 0xffd600, effect: 'invincible', dropRate: 0.05 },
    chest: { name: '보물상자', color: 0xffc107, effect: 'chest', dropRate: 0 }  // 보스 전용
};

// ========== 무기 정의 ==========
const WEAPONS = {
    waterGun: { name: '고압 세척기', icon: '💧', desc: '물 발사', baseDamage: 10, baseCooldown: 400, projectileSpeed: 500, maxLevel: 8 },
    circleField: { name: '정화 필드', icon: '🔵', desc: '주변 정화', baseDamage: 5, baseRadius: 80, orbCount: 3, maxLevel: 8 },
    homingMissile: { name: '중화제 탄', icon: '🎯', desc: '유도탄', baseDamage: 25, baseCooldown: 2000, projectileSpeed: 250, maxLevel: 8 },
    dredgeHose: { name: '준설호스', icon: '🌊', desc: '전방 범위 공격', baseDamage: 8, baseCooldown: 100, range: 150, angle: 60, maxLevel: 8 }
};

// ========== 패시브 스킬 ==========
const PASSIVES = {
    damage: { name: '정화력', icon: '⚔️', desc: '데미지 +10%', maxLevel: 5, effect: 0.1 },
    speed: { name: '이동속도', icon: '👟', desc: '속도 +12%', maxLevel: 5, effect: 0.12 },
    maxHp: { name: '체력', icon: '🛡️', desc: 'HP +20', maxLevel: 5, effect: 20 },
    magnet: { name: '자석', icon: '🧲', desc: '수집범위 +40%', maxLevel: 5, effect: 0.4 },
    regen: { name: '재생', icon: '💚', desc: '초당 HP 2회복', maxLevel: 3, effect: 2 }
};

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

        // DY 로고
        g.fillStyle(0x1565c0, 1);
        g.fillRect(cx - 4, cy - 29, 8, 4);
        g.fillStyle(0xffffff, 1);
        g.fillRect(cx - 2, cy - 28, 4, 2);
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
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.add.rectangle(w/2, h/2, w, h, COLORS.BG);
        this.add.text(w/2, h/2-100, 'DY라이크', { fontSize: '64px', fontStyle: 'bold', fill: '#00a8e8' }).setOrigin(0.5);
        this.add.text(w/2, h/2-40, '디와이산업개발 환경정화 시뮬레이터', { fontSize: '18px', fill: '#aaa' }).setOrigin(0.5);

        const btn = this.add.rectangle(w/2, h/2+80, 200, 50, 0x00a8e8).setInteractive({ useHandCursor: true });
        this.add.text(w/2, h/2+80, '게임 시작', { fontSize: '24px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
        btn.on('pointerdown', () => this.scene.start('GameScene'));

        this.add.text(w/2, h-40, 'WASD/방향키로 이동', { fontSize: '14px', fill: '#666' }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => this.scene.start('GameScene'));
    }
}

// ==========================================
// GameScene
// ==========================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    create() {
        this.gameTime = 0;
        this.isPaused = false;
        this.hitStopActive = false;  // ★ 히트 스톱 상태
        this.invincibleAura = null;  // ★ 무적 오라 참조
        this.lastSkillUIUpdate = -1; // ★ 스킬 UI 업데이트 타이머

        this.playerState = {
            hp: CONFIG.PLAYER_MAX_HP,
            maxHp: CONFIG.PLAYER_MAX_HP,
            level: 1,
            exp: 0,
            expToNext: 10,
            kills: 0,
            speed: CONFIG.PLAYER_SPEED,
            invincibleTime: 0,
            weapons: { waterGun: 1 },
            passives: {}
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

        const zone = this.add.rectangle(CONFIG.WIDTH/4, CONFIG.HEIGHT/2, CONFIG.WIDTH/2, CONFIG.HEIGHT, 0, 0).setScrollFactor(0).setDepth(98).setInteractive();

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

        this.hpBarBg = this.add.rectangle(120, 20, 200, 20, COLORS.HP_BG);
        this.hpBar = this.add.rectangle(22, 20, 196, 16, COLORS.HP_BAR).setOrigin(0, 0.5);
        this.hpText = this.add.text(120, 20, '100/100', { fontSize: '12px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
        this.levelText = this.add.text(240, 20, 'Lv.1', { fontSize: '16px', fontStyle: 'bold', fill: '#00a8e8' }).setOrigin(0, 0.5);
        this.timeText = this.add.text(CONFIG.WIDTH-20, 20, '00:00', { fontSize: '16px', fontStyle: 'bold', fill: '#fff' }).setOrigin(1, 0.5);
        this.expBarBg = this.add.rectangle(CONFIG.WIDTH/2, 45, CONFIG.WIDTH-40, 8, COLORS.EXP_BG);
        this.expBar = this.add.rectangle(20, 45, 0, 6, COLORS.EXP_BAR).setOrigin(0, 0.5);
        this.killText = this.add.text(CONFIG.WIDTH-20, 45, '정화: 0', { fontSize: '12px', fill: '#aaa' }).setOrigin(1, 0.5);
        this.fpsText = this.add.text(CONFIG.WIDTH-20, CONFIG.HEIGHT-20, 'FPS: 60', { fontSize: '12px', fill: '#0f0' }).setOrigin(1, 0.5);

        this.hud.add([this.hpBarBg, this.hpBar, this.hpText, this.levelText, this.timeText, this.expBarBg, this.expBar, this.killText, this.fpsText]);

        // ★ 미니맵 생성
        this.createMinimap();

        // ★ 스킬 UI 생성
        this.createSkillUI();
    }

    // ★ 스킬 UI (왼쪽 아이콘 목록)
    createSkillUI() {
        this.skillUI = this.add.container(10, 70).setScrollFactor(0).setDepth(100);
        this.skillIcons = [];  // 아이콘 저장용

        // 배경 패널
        const panelBg = this.add.rectangle(0, 0, 50, 280, 0x000000, 0.5)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x00a8e8, 0.5);
        this.skillUI.add(panelBg);

        // "스킬" 라벨
        const label = this.add.text(25, 8, '스킬', {
            fontSize: '10px',
            fontStyle: 'bold',
            fill: '#00a8e8'
        }).setOrigin(0.5);
        this.skillUI.add(label);

        // 구분선 (무기/패시브)
        const divider = this.add.rectangle(25, 145, 40, 1, 0x00a8e8, 0.5);
        this.skillUI.add(divider);
    }

    // ★ 스킬 UI 업데이트
    updateSkillUI() {
        // 기존 아이콘 제거
        this.skillIcons.forEach(icon => icon.destroy());
        this.skillIcons = [];

        const startY = 25;
        const iconSize = 28;
        const gap = 32;
        let idx = 0;

        // 무기 표시 (상단)
        for (const [key, level] of Object.entries(this.playerState.weapons)) {
            if (level > 0 && WEAPONS[key]) {
                const y = startY + idx * gap;

                // 아이콘 배경
                const bg = this.add.rectangle(25, y, iconSize, iconSize, 0x1a1a2e, 0.8)
                    .setStrokeStyle(2, 0x00a8e8);
                this.skillUI.add(bg);
                this.skillIcons.push(bg);

                // 아이콘 (이모지)
                const icon = this.add.text(25, y, WEAPONS[key].icon, {
                    fontSize: '16px'
                }).setOrigin(0.5);
                this.skillUI.add(icon);
                this.skillIcons.push(icon);

                // 레벨 표시
                const lvText = this.add.text(40, y + 8, level.toString(), {
                    fontSize: '10px',
                    fontStyle: 'bold',
                    fill: '#ffd700'
                }).setOrigin(0.5);
                this.skillUI.add(lvText);
                this.skillIcons.push(lvText);

                idx++;
                if (idx >= 4) break;  // 최대 4개 무기
            }
        }

        // 패시브 표시 (하단, 구분선 아래)
        idx = 0;
        for (const [key, level] of Object.entries(this.playerState.passives)) {
            if (level > 0 && PASSIVES[key]) {
                const y = 160 + idx * gap;

                // 아이콘 배경
                const bg = this.add.rectangle(25, y, iconSize, iconSize, 0x1a1a2e, 0.8)
                    .setStrokeStyle(2, 0x7cb342);
                this.skillUI.add(bg);
                this.skillIcons.push(bg);

                // 아이콘 (이모지)
                const icon = this.add.text(25, y, PASSIVES[key].icon, {
                    fontSize: '16px'
                }).setOrigin(0.5);
                this.skillUI.add(icon);
                this.skillIcons.push(icon);

                // 레벨 표시
                const lvText = this.add.text(40, y + 8, level.toString(), {
                    fontSize: '10px',
                    fontStyle: 'bold',
                    fill: '#7cb342'
                }).setOrigin(0.5);
                this.skillUI.add(lvText);
                this.skillIcons.push(lvText);

                idx++;
                if (idx >= 4) break;  // 최대 4개 패시브
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
        this.hpBar.width = 196 * hpPct;
        this.hpText.setText(`${Math.ceil(this.playerState.hp)}/${this.playerState.maxHp}`);
        this.levelText.setText(`Lv.${this.playerState.level}`);

        const sec = Math.floor(this.gameTime/1000);
        this.timeText.setText(`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`);

        this.expBar.width = (CONFIG.WIDTH-40) * (this.playerState.exp / this.playerState.expToNext);
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
        const dmgBonus = 1 + (this.playerState.passives.damage || 0) * PASSIVES.damage.effect;

        // 고압 세척기
        const wgLv = this.playerState.weapons.waterGun || 0;
        if (wgLv > 0) {
            const cd = WEAPONS.waterGun.baseCooldown * (1 - wgLv * 0.05);
            if (time > this.weaponTimers.waterGun + cd) {
                this.fireWaterGun(wgLv, dmgBonus);
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

        // ★ 준설호스 (부채꼴 범위 공격)
        const dhLv = this.playerState.weapons.dredgeHose || 0;
        if (dhLv > 0) {
            const cd = WEAPONS.dredgeHose.baseCooldown;
            if (time > this.weaponTimers.dredgeHose + cd) {
                this.fireDredgeHose(dhLv, dmgBonus);
                this.weaponTimers.dredgeHose = time;
            }
        }
    }

    fireWaterGun(lv, dmgBonus) {
        const target = this.findClosestEnemy();
        if (!target) return;

        const dmg = WEAPONS.waterGun.baseDamage * (1 + lv*0.2) * dmgBonus;
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

    // ★ 준설호스 (부채꼴 범위 공격)
    fireDredgeHose(lv, dmgBonus) {
        const dmg = WEAPONS.dredgeHose.baseDamage * (1 + lv * 0.15) * dmgBonus;
        const range = WEAPONS.dredgeHose.range + lv * 15;  // 레벨당 사거리 증가
        const angleWidth = (WEAPONS.dredgeHose.angle + lv * 5) * Math.PI / 180;  // 레벨당 각도 증가

        // 플레이어가 바라보는 방향 (가장 가까운 적 방향 우선, 없으면 이동 방향)
        const target = this.findClosestEnemy();
        let baseAngle;
        if (target) {
            baseAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        } else {
            baseAngle = this.playerFacingAngle || 0;
        }

        // 부채꼴 이펙트 그리기
        const graphics = this.add.graphics().setDepth(15);
        graphics.fillStyle(0x00bcd4, 0.3);
        graphics.beginPath();
        graphics.moveTo(this.player.x, this.player.y);
        graphics.arc(this.player.x, this.player.y, range, baseAngle - angleWidth/2, baseAngle + angleWidth/2);
        graphics.closePath();
        graphics.fill();

        // 테두리
        graphics.lineStyle(3, 0x00e5ff, 0.7);
        graphics.beginPath();
        graphics.arc(this.player.x, this.player.y, range, baseAngle - angleWidth/2, baseAngle + angleWidth/2);
        graphics.stroke();

        // 이펙트 페이드아웃
        this.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 150,
            onComplete: () => graphics.destroy()
        });

        // 범위 내 적에게 데미지
        const px = this.player.x;
        const py = this.player.y;

        this.enemies.children.each(e => {
            if (!e.active) return;

            const dx = e.x - px;
            const dy = e.y - py;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= range) {
                const angle = Math.atan2(dy, dx);
                let angleDiff = angle - baseAngle;

                // 각도 정규화 (-PI ~ PI)
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) <= angleWidth / 2) {
                    e.hp -= dmg;
                }
            }
        });

        // 보스에게도 적용
        this.bosses.children.each(b => {
            if (!b.active) return;

            const dx = b.x - px;
            const dy = b.y - py;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist <= range) {
                const angle = Math.atan2(dy, dx);
                let angleDiff = angle - baseAngle;

                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                if (Math.abs(angleDiff) <= angleWidth / 2) {
                    b.hp -= dmg;
                }
            }
        });
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
        const baseDist = Math.max(300, 500 - minutes * 15);  // 500 → 최소 300
        const dist = baseDist + Math.random() * 100;

        const x = this.player.x + Math.cos(angle) * dist;
        const y = this.player.y + Math.sin(angle) * dist;

        const enemy = this.enemies.get(x, y, `enemy_${typeKey}`);
        if (enemy) {
            enemy.setTexture(`enemy_${typeKey}`);
            enemy.setActive(true).setVisible(true);

            // ★ 강화된 스케일링 시스템
            const timeScale = {
                hp: 1 + minutes * 0.25,        // 분당 25% HP 증가
                speed: Math.min(1 + minutes * 0.10, 2.0),  // 분당 10%, 최대 2배
                damage: 1 + minutes * 0.15     // 분당 15% 데미지 증가
            };

            const levelScale = {
                hp: 1 + this.playerState.level * 0.04,     // 레벨당 4%
                damage: 1 + this.playerState.level * 0.02  // 레벨당 2%
            };

            // 엘리트 배율
            const eliteMultiplier = isElite ? { hp: 4, speed: 1.3, damage: 2, exp: 8 } : { hp: 1, speed: 1, damage: 1, exp: 1 };

            enemy.hp = Math.floor(type.hp * timeScale.hp * levelScale.hp * eliteMultiplier.hp);
            enemy.maxHp = enemy.hp;
            enemy.enemySpeed = Math.floor(type.speed * timeScale.speed * eliteMultiplier.speed);
            enemy.enemyDamage = Math.floor(type.damage * timeScale.damage * levelScale.damage * eliteMultiplier.damage);
            enemy.enemyExp = type.exp * eliteMultiplier.exp;
            enemy.enemyRadius = type.radius * (isElite ? 1.4 : 1);
            enemy.enemyType = typeKey;
            enemy.isElite = isElite;

            // 충돌 영역 재설정
            const radius = enemy.enemyRadius;
            enemy.body.setCircle(radius);
            enemy.body.setOffset(
                (enemy.width - radius * 2) / 2,
                (enemy.height - radius * 2) / 2
            );

            // ★ 엘리트 외형 (크기 + 빨간 틴트)
            if (isElite) {
                enemy.setScale(1.4);
                enemy.setTint(0xff6666);
            } else {
                enemy.setScale(1);
                enemy.clearTint();
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
                this.playerState.kills++;

                // 일반 적은 히트스톱/쉐이크 없음 (성능 최적화)

                // 파티클
                this.deathEmitter.setPosition(e.x, e.y);
                this.deathEmitter.setParticleTint(ENEMY_TYPES[e.enemyType]?.color || 0xffffff);
                this.deathEmitter.explode(8);

                // 경험치 생성
                const expCount = e.enemyExp;
                for (let i = 0; i < expCount; i++) {
                    const exp = this.expOrbs.get(e.x + Phaser.Math.Between(-10, 10), e.y + Phaser.Math.Between(-10, 10), 'exp');
                    if (exp) {
                        exp.setActive(true).setVisible(true);
                        exp.expValue = 1;
                    }
                }

                // 아이템 드롭 확률 체크
                this.tryDropItem(e.x, e.y);

                e.setActive(false).setVisible(false).setVelocity(0, 0);
            }
        });
    }

    // ========== 보스 시스템 ==========
    updateBossSpawning() {
        // 각 보스 스폰 시간 체크
        Object.keys(BOSS_TYPES).forEach(bossKey => {
            const boss = BOSS_TYPES[bossKey];
            // 스폰 시간 도달 && 아직 스폰 안됨
            if (this.gameTime >= boss.spawnTime && !this.spawnedBosses[bossKey]) {
                this.showBossWarning(bossKey);
                this.spawnedBosses[bossKey] = true;
            }
        });
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

            // 보스 데이터 설정
            boss.hp = type.hp;
            boss.maxHp = type.hp;
            boss.bossSpeed = type.speed;
            boss.bossDamage = type.damage;
            boss.bossExp = type.exp;
            boss.bossRadius = type.radius;
            boss.bossType = bossKey;
            boss.bossName = type.name;

            // 충돌 영역
            boss.body.setCircle(type.radius);
            boss.body.setOffset(
                (boss.width - type.radius * 2) / 2,
                (boss.height - type.radius * 2) / 2
            );

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

            // HP바 위치 업데이트
            if (boss.hpBarBg && boss.hpBarFill) {
                boss.hpBarBg.setPosition(boss.x, boss.y - boss.bossRadius - 15);
                boss.hpBarFill.setPosition(boss.x, boss.y - boss.bossRadius - 15);

                // HP 비율에 따른 바 크기
                const hpRatio = boss.hp / boss.maxHp;
                boss.hpBarFill.width = 78 * hpRatio;
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

        // HP바 제거
        if (boss.hpBarBg) boss.hpBarBg.destroy();
        if (boss.hpBarFill) boss.hpBarFill.destroy();

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
        const dropableItems = ['health', 'magnet', 'bomb', 'invincible'];

        for (const itemKey of dropableItems) {
            if (Math.random() < ITEM_TYPES[itemKey].dropRate) {
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
        const magnetRange = 80;
        const px = this.player.x, py = this.player.y;

        this.items.children.each(item => {
            if (!item.active) return;

            const dx = px - item.x;
            const dy = py - item.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < magnetRange * magnetRange) {
                const invDist = 1 / Math.sqrt(distSq);
                item.setVelocity(dx * invDist * 200, dy * invDist * 200);
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
        // 화면 플래시
        this.cameras.main.flash(200, 255, 100, 0);

        // 모든 일반 적에게 대미지 (너프: 100 → 30)
        this.enemies.children.each(e => {
            if (e.active) {
                e.hp -= 30;
            }
        });

        // 보스에게도 데미지 (최대HP의 5%)
        this.bosses.children.each(b => {
            if (b.active) {
                b.hp -= Math.floor(b.maxHp * 0.05);
            }
        });
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
        this.playerState.hp -= boss.bossDamage;
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
        this.playerState.exp += exp.expValue || 1;
        exp.setActive(false).setVisible(false).setVelocity(0,0);
        if (this.playerState.exp >= this.playerState.expToNext) this.levelUp();
    }

    onPlayerHit(player, enemy) {
        if (!enemy.active || this.playerState.invincibleTime > 0) return;
        this.playerState.hp -= enemy.enemyDamage;
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
        this.playerState.exp -= this.playerState.expToNext;
        this.playerState.level++;
        this.playerState.expToNext = Math.floor(10 * Math.pow(1.2, this.playerState.level - 1));

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
            }
        });
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
    init(data) { this.data = data; }

    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.8);
        this.add.text(w/2, 60, 'LEVEL UP!', { fontSize: '48px', fontStyle: 'bold', fill: '#7cb342' }).setOrigin(0.5);
        this.add.text(w/2, 100, `Lv.${this.data.level}`, { fontSize: '24px', fill: '#aaa' }).setOrigin(0.5);

        const choices = this.generateChoices();
        const cw = 180, gap = 30;
        const startX = w/2 - ((choices.length-1) * (cw+gap)) / 2;

        choices.forEach((c, i) => {
            const x = startX + i*(cw+gap);
            const card = this.add.rectangle(x, 280, cw, 200, 0x2a2a4a).setStrokeStyle(3, 0x00a8e8).setInteractive({ useHandCursor: true });

            const info = c.type === 'weapon' ? WEAPONS[c.key] : PASSIVES[c.key];
            const lvl = c.type === 'weapon' ? (this.data.weapons[c.key] || 0) : (this.data.passives[c.key] || 0);

            this.add.text(x, 220, info.icon, { fontSize: '40px' }).setOrigin(0.5);
            this.add.text(x, 270, info.name, { fontSize: '16px', fontStyle: 'bold', fill: '#fff' }).setOrigin(0.5);
            this.add.text(x, 295, c.isNew ? 'NEW!' : `Lv.${lvl+1}`, { fontSize: '14px', fill: c.isNew ? '#ff0' : '#00a8e8' }).setOrigin(0.5);
            this.add.text(x, 330, info.desc, { fontSize: '11px', fill: '#aaa', wordWrap: { width: 160 }, align: 'center' }).setOrigin(0.5);

            card.on('pointerover', () => card.setFillStyle(0x3a3a5a));
            card.on('pointerout', () => card.setFillStyle(0x2a2a4a));
            card.on('pointerdown', () => { this.data.callback(c); this.scene.stop(); });
        });
    }

    generateChoices() {
        const choices = [];
        Object.keys(this.data.weapons).forEach(k => { if (this.data.weapons[k] < WEAPONS[k].maxLevel) choices.push({ type: 'weapon', key: k }); });
        Object.keys(WEAPONS).forEach(k => { if (!this.data.weapons[k]) choices.push({ type: 'weapon', key: k, isNew: true }); });
        Object.keys(PASSIVES).forEach(k => { if ((this.data.passives[k] || 0) < PASSIVES[k].maxLevel) choices.push({ type: 'passive', key: k }); });
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
        btn.on('pointerdown', () => this.scene.start('GameScene'));
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
    physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
    scene: [BootScene, TitleScene, GameScene, LevelUpScene, GameOverScene],
    render: { antialias: false, pixelArt: true, roundPixels: true },
    fps: { target: 60, forceSetTimeOut: false },
    input: { activePointers: 3 }
};

const game = new Phaser.Game(config);
console.log('DY라이크 로드 완료!');
