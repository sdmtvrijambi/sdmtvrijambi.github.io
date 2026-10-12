/**
 * Background FX: Kucing-Kucing Mengejar Tikus
 * (nama file dipertahankan agar referensi script tidak berubah)
 *
 * - BEBERAPA pasangan kucing vs tikus (3 di desktop, 2 di layar sedang),
 *   tiap kucing punya warna bulu, ukuran & kecepatan sedikit berbeda
 *   dan mengejar tikusnya masing-masing; antar kucing saling menghindar
 * - Kucing chibi top-down: steering halus, ekor berfisika, kaki melangkah,
 *   mata melirik mangsa; jejak kaki memudar; puff + respawn saat tertangkap
 * - PERF: Mobile-aware (dinonaktifkan otomatis di layar ponsel / layar sentuh
 *   agar hemat baterai dan bebas lag 60fps), delta-time normalized,
 *   pause saat tab tersembunyi, nonaktif penuh saat prefers-reduced-motion,
 *   obstacle rects di-cache untuk mencegah synchronous reflow saat scrolling.
 */

(function () {
    'use strict';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const bgCanvas = document.getElementById('fx-canvas');
    if (!bgCanvas) return;
    const bg = bgCanvas.getContext('2d');

    const TAU = Math.PI * 2;

    let W = 0, H = 0, S = 1;
    let rafId = null;
    let running = false;
    let last = 0;
    let clock = 0;

    /* Cache obstacle rects untuk mencegah forced reflow layout thrashing */
    let cachedObstacles = [];
    function updateObstaclesCache() {
        cachedObstacles = [];
        document.querySelectorAll('.stats-grid, .table-container').forEach((el) => {
            const r = el.getBoundingClientRect();
            if (r.width && r.height) cachedObstacles.push(r);
        });
    }

    /* util */

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const rand = (a, b) => a + Math.random() * (b - a);

    function normAngle(a) {
        while (a > Math.PI) a -= TAU;
        while (a < -Math.PI) a += TAU;
        return a;
    }

    function openWaypoint() {
        if (!cachedObstacles.length) updateObstaclesCache();
        for (let i = 0; i < 14; i++) {
            const x = rand(60, W - 60);
            const y = rand(60, H - 60);
            let covered = false;
            for (const r of cachedObstacles) {
                if (x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24) {
                    covered = true;
                    break;
                }
            }
            if (!covered) return { x, y };
        }
        return { x: rand(60, W - 60), y: rand(60, H - 60) };
    }

    function wallPush(x, y, margin, force) {
        let px = 0, py = 0;
        if (x < margin) px += (1 - x / margin) * force;
        if (x > W - margin) px -= (1 - (W - x) / margin) * force;
        if (y < margin) py += (1 - y / margin) * force;
        if (y > H - margin) py -= (1 - (H - y) / margin) * force;
        return { x: px, y: py };
    }

    function softShadow(x, y, rx, ry, alpha) {
        bg.save();
        bg.translate(x, y + ry * 0.55);
        bg.scale(rx, ry * 0.45);
        const g = bg.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(30, 50, 90, ${alpha})`);
        g.addColorStop(1, 'rgba(30, 50, 90, 0)');
        bg.fillStyle = g;
        bg.beginPath();
        bg.arc(0, 0, 1, 0, TAU);
        bg.fill();
        bg.restore();
    }

    /* ═══════════ palet ═══════════ */

    const CAT_PALETTES = [
        {   // biru-keabu (tabby biru)
            body0: '#a6b6d6', body1: '#7186ae', head0: '#b3c2e2', head1: '#7d92ba',
            ear: '#7d92ba', tabby: 'rgba(74, 92, 130, 0.5)',
            tail: '#8195bb', tailTip: '#5d7096'
        },
        {   // oranye krem (tabby oranye)
            body0: '#f4cda6', body1: '#dfa26c', head0: '#f6d8b4', head1: '#e2a973',
            ear: '#e2a973', tabby: 'rgba(191, 121, 58, 0.5)',
            tail: '#eab88c', tailTip: '#c98d55'
        },
        {   // abu tua (slate)
            body0: '#aab4c6', body1: '#79839a', head0: '#b4bed0', head1: '#828ca3',
            ear: '#828ca3', tabby: 'rgba(64, 74, 96, 0.5)',
            tail: '#929cb0', tailTip: '#666f85'
        }
    ];

    const MOUSE_PALETTES = [
        { body0: '#c7bdb8', body1: '#9d928c', ear: '#a89d97' },   // abu klasik
        { body0: '#cdb69d', body1: '#a2876a', ear: '#ad9276' },   // cokelat
        { body0: '#e4dbca', body1: '#c0b39c', ear: '#cabfa8' }    // krem
    ];

    /* ═══════════ jejak kaki ═══════════ */

    const pawPrints = [];
    const PAW_LIFE = 2600;

    function stampPaw(x, y, angle, side, sz) {
        pawPrints.push({ x, y, angle, side, sz, t: clock });
        if (pawPrints.length > 60) pawPrints.shift();
    }

    function drawPawPrints() {
        for (const p of pawPrints) {
            const k = (clock - p.t) / PAW_LIFE;
            if (k >= 1) continue;
            const a = (1 - k) * 0.16;
            bg.save();
            bg.translate(p.x, p.y);
            bg.rotate(p.angle);
            bg.translate(0, p.side * 7 * p.sz);
            bg.fillStyle = `rgba(85, 110, 160, ${a.toFixed(3)})`;
            bg.beginPath();
            bg.ellipse(0, 0, 2.6 * p.sz, 2.1 * p.sz, 0, 0, TAU);
            bg.fill();
            for (let i = -1; i <= 1; i++) {
                bg.beginPath();
                bg.arc(3.4 * p.sz, i * 2.1 * p.sz, 1.05 * p.sz, 0, TAU);
                bg.fill();
            }
            bg.restore();
        }
        while (pawPrints.length && clock - pawPrints[0].t >= PAW_LIFE) pawPrints.shift();
    }

    /* ═══════════ puff ═══════════ */

    const puffs = [];
    const PUFF_LIFE = 620;

    function spawnPuff(x, y, sz) {
        const parts = [];
        for (let i = 0; i < 8; i++) {
            const a = rand(0, TAU);
            const d = rand(2, 14) * sz;
            parts.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: rand(4, 9) * sz });
        }
        puffs.push({ x, y, t: clock, parts });
    }

    function drawPuffs() {
        for (let i = puffs.length - 1; i >= 0; i--) {
            const p = puffs[i];
            const k = (clock - p.t) / PUFF_LIFE;
            if (k >= 1) { puffs.splice(i, 1); continue; }
            const ease = 1 - Math.pow(1 - k, 2);
            for (const q of p.parts) {
                bg.fillStyle = `rgba(219, 230, 245, ${(0.55 * (1 - k)).toFixed(3)})`;
                bg.beginPath();
                bg.arc(p.x + q.dx * (0.4 + ease), p.y + q.dy * (0.4 + ease), q.r * (0.5 + ease * 0.9), 0, TAU);
                bg.fill();
            }
        }
    }

    /* ═══════════ TIKUS (factory) ═══════════ */

    function makeMouse(pal, variant) {
        return {
            pal,
            sz: 1,
            speedMul: variant.speed,
            variant,
            x: 0, y: 0, angle: 0, speed: 0, phase: 0,
            state: 'wander',
            waypoint: { x: 0, y: 0 },
            stateUntil: 0,
            scareFrom: null,
            hunter: null,     // kucing pengejar (di-set saat pairing)
            tail: [],

            init(x, y) {
                this.sz = S * this.variant.scale;
                this.x = x; this.y = y;
                this.angle = rand(0, TAU);
                this.tail = [];
                for (let i = 0; i < 10; i++) {
                    this.tail.push({ x: x - (i + 1) * 3.5 * this.sz, y });
                }
                this.pickWaypoint();
            },

            pickWaypoint() {
                this.waypoint = openWaypoint();
                this.stateUntil = clock + rand(2500, 6000);
            },

            scare(px, py) {
                const d = Math.hypot(this.x - px, this.y - py);
                if (d < 190) {
                    this.scareFrom = { x: px, y: py, until: clock + 750 };
                    this.state = 'flee';
                }
            },

            respawn(awayFrom) {
                for (let tries = 0; tries < 24; tries++) {
                    const p = openWaypoint();
                    if (Math.hypot(p.x - awayFrom.x, p.y - awayFrom.y) > Math.min(W, H) * 0.42) {
                        this.init(p.x, p.y);
                        spawnPuff(p.x, p.y, this.sz);
                        return;
                    }
                }
                this.init(rand(60, W - 60), rand(60, H - 60));
            },

            update(f) {
                const cat = this.hunter;
                const catDist = cat ? Math.hypot(cat.x - this.x, cat.y - this.y) : 9999;

                if (this.scareFrom && clock > this.scareFrom.until) this.scareFrom = null;

                if (catDist < 235 || this.scareFrom) {
                    this.state = 'flee';
                } else if (this.state === 'flee') {
                    this.state = 'wander';
                    this.pickWaypoint();
                } else if (this.state === 'wander' && catDist > 430 && clock > this.stateUntil && Math.random() < 0.008 * f) {
                    this.state = 'rest';
                    this.stateUntil = clock + rand(1100, 2400);
                } else if (this.state === 'rest' && (clock > this.stateUntil || catDist < 330)) {
                    this.state = 'wander';
                    this.pickWaypoint();
                }

                let desired = 0, dirX = 0, dirY = 0;

                if (this.state === 'flee') {
                    const src = this.scareFrom || cat;
                    const d = Math.max(1, Math.hypot(this.x - src.x, this.y - src.y));
                    dirX = (this.x - src.x) / d;
                    dirY = (this.y - src.y) / d;
                    desired = 2.85 * this.sz * this.speedMul;
                    this.phase += 0.34 * f;
                } else if (this.state === 'wander') {
                    const d = Math.hypot(this.waypoint.x - this.x, this.waypoint.y - this.y);
                    if (d < 26 || clock > this.stateUntil) this.pickWaypoint();
                    dirX = (this.waypoint.x - this.x) / Math.max(1, d);
                    dirY = (this.waypoint.y - this.y) / Math.max(1, d);
                    desired = 1.15 * this.sz * this.speedMul;
                    this.phase += 0.2 * f;
                } else {
                    desired = 0;
                    this.phase += 0.09 * f;
                }

                const push = wallPush(this.x, this.y, 85, 2.2);
                dirX += push.x; dirY += push.y;

                if (dirX || dirY) {
                    let target = Math.atan2(dirY, dirX);
                    if (this.state !== 'rest') target += Math.sin(this.phase * 1.7) * 0.14;
                    const diff = normAngle(target - this.angle);
                    this.angle += clamp(diff, -0.16 * f, 0.16 * f);
                }

                this.speed += (desired - this.speed) * 0.12 * f;
                this.x += Math.cos(this.angle) * this.speed * f;
                this.y += Math.sin(this.angle) * this.speed * f;
                this.x = clamp(this.x, 26, W - 26);
                this.y = clamp(this.y, 26, H - 26);

                const spacing = 3.5 * this.sz;
                let px = this.x - Math.cos(this.angle) * 9 * this.sz;
                let py = this.y - Math.sin(this.angle) * 9 * this.sz;
                for (const seg of this.tail) {
                    const dx = seg.x - px, dy = seg.y - py;
                    const d = Math.hypot(dx, dy) || 1;
                    if (d > spacing) {
                        seg.x = px + (dx / d) * spacing;
                        seg.y = py + (dy / d) * spacing;
                    }
                    px = seg.x; py = seg.y;
                }
            },

            draw() {
                const s = this.sz;
                const pal = this.pal;
                const bob = this.state === 'rest' ? Math.sin(this.phase * 2) * 0.06 : 0;

                softShadow(this.x, this.y, 13 * s, 8 * s, 0.10);

                // ekor pink
                bg.strokeStyle = 'rgba(226, 155, 175, 0.85)';
                bg.lineCap = 'round';
                for (let i = 0; i < this.tail.length - 1; i++) {
                    bg.lineWidth = Math.max(0.7, (1.7 - i * 0.14) * s);
                    bg.beginPath();
                    bg.moveTo(this.tail[i].x, this.tail[i].y);
                    bg.lineTo(this.tail[i + 1].x, this.tail[i + 1].y);
                    bg.stroke();
                }

                bg.save();
                bg.translate(this.x, this.y);
                bg.rotate(this.angle);
                bg.scale(1 + bob, 1 - bob);

                const grad = bg.createLinearGradient(-9 * s, -6 * s, 6 * s, 6 * s);
                grad.addColorStop(0, pal.body0);
                grad.addColorStop(1, pal.body1);
                bg.fillStyle = grad;
                bg.beginPath();
                bg.ellipse(-1 * s, 0, 9.5 * s, 6 * s, 0, 0, TAU);
                bg.fill();
                bg.beginPath();
                bg.moveTo(5 * s, -3.4 * s);
                bg.quadraticCurveTo(12.5 * s, 0, 5 * s, 3.4 * s);
                bg.closePath();
                bg.fill();

                for (const side of [-1, 1]) {
                    bg.fillStyle = pal.ear;
                    bg.beginPath();
                    bg.arc(1.5 * s, side * 5 * s, 3.4 * s, 0, TAU);
                    bg.fill();
                    bg.fillStyle = '#eeb7c4';
                    bg.beginPath();
                    bg.arc(1.5 * s, side * 5 * s, 1.7 * s, 0, TAU);
                    bg.fill();
                }

                bg.fillStyle = '#2b2320';
                bg.beginPath(); bg.arc(6.5 * s, -2 * s, 1.1 * s, 0, TAU); bg.fill();
                bg.beginPath(); bg.arc(6.5 * s, 2 * s, 1.1 * s, 0, TAU); bg.fill();
                bg.fillStyle = '#e78fa5';
                bg.beginPath(); bg.arc(11.6 * s, 0, 1.15 * s, 0, TAU); bg.fill();

                bg.strokeStyle = 'rgba(90, 80, 75, 0.4)';
                bg.lineWidth = 0.7;
                for (const side of [-1, 1]) {
                    for (let i = 0; i < 2; i++) {
                        bg.beginPath();
                        bg.moveTo(9.5 * s, side * 1.2 * s);
                        bg.lineTo(14.5 * s, side * (2.5 + i * 2.2) * s);
                        bg.stroke();
                    }
                }

                bg.restore();
            }
        };
    }

    /* ═══════════ KUCING (factory) ═══════════ */

    function makeCat(pal, variant, prey) {
        return {
            pal,
            sz: 1,
            speedMul: variant.speed,
            variant,
            prey,
            x: 0, y: 0, angle: 0, speed: 0, phase: 0,
            travel: 0, pawSide: 1,
            tail: [],

            init(x, y) {
                this.sz = S * this.variant.scale;
                this.x = x; this.y = y;
                this.angle = 0;
                this.tail = [];
                for (let i = 0; i < 9; i++) {
                    this.tail.push({ x: x - 22 * this.sz - i * 5 * this.sz, y });
                }
            },

            update(f) {
                const s = this.sz;
                const prey = this.prey;
                const dx = prey.x - this.x;
                const dy = prey.y - this.y;
                const dist = Math.hypot(dx, dy);

                let dirX = dx / Math.max(1, dist);
                let dirY = dy / Math.max(1, dist);
                const push = wallPush(this.x, this.y, 70, 1.4);
                dirX += push.x; dirY += push.y;

                const target = Math.atan2(dirY, dirX) + Math.sin(this.phase * 0.55) * 0.05;
                const diff = normAngle(target - this.angle);
                this.angle += clamp(diff, -0.052 * f, 0.052 * f);

                let desired = 2.25 * s * this.speedMul;
                if (dist < 110) desired = 2.55 * s * this.speedMul;
                else if (dist > W * 0.55) desired = 1.9 * s * this.speedMul;
                this.speed += (desired - this.speed) * 0.06 * f;

                this.x += Math.cos(this.angle) * this.speed * f;
                this.y += Math.sin(this.angle) * this.speed * f;
                this.x = clamp(this.x, 30, W - 30);
                this.y = clamp(this.y, 30, H - 30);

                this.phase += (0.1 + this.speed * 0.045) * f;

                this.travel += this.speed * f;
                if (this.travel > 34 * s) {
                    this.travel = 0;
                    this.pawSide *= -1;
                    stampPaw(this.x - Math.cos(this.angle) * 14 * s, this.y - Math.sin(this.angle) * 14 * s, this.angle, this.pawSide, s);
                }

                const wag = Math.sin(clock * 0.006 + this.variant.wagOff) * 3 * s;
                const perpX = -Math.sin(this.angle), perpY = Math.cos(this.angle);
                let px = this.x - Math.cos(this.angle) * 22 * s + perpX * wag;
                let py = this.y - Math.sin(this.angle) * 22 * s + perpY * wag;
                const spacing = 5 * s;
                for (const seg of this.tail) {
                    const ddx = seg.x - px, ddy = seg.y - py;
                    const d = Math.hypot(ddx, ddy) || 1;
                    if (d > spacing) {
                        seg.x = px + (ddx / d) * spacing;
                        seg.y = py + (ddy / d) * spacing;
                    }
                    px = seg.x; py = seg.y;
                }

                // tangkap!
                if (dist < 26 * s) {
                    spawnPuff(prey.x, prey.y, s);
                    prey.respawn(this);
                }
            },

            draw() {
                const s = this.sz;
                const pal = this.pal;
                const speedK = clamp(this.speed / (2.3 * s), 0.25, 1);
                const stride = Math.sin(this.phase * 2) * speedK;

                softShadow(this.x, this.y, 26 * s, 15 * s, 0.12);

                bg.lineCap = 'round';
                for (let i = 0; i < this.tail.length - 1; i++) {
                    const w = Math.max(1.6, (6.8 - i * 0.62) * s);
                    bg.strokeStyle = i > this.tail.length - 4 ? pal.tailTip : pal.tail;
                    bg.lineWidth = w;
                    bg.beginPath();
                    bg.moveTo(this.tail[i].x, this.tail[i].y);
                    bg.lineTo(this.tail[i + 1].x, this.tail[i + 1].y);
                    bg.stroke();
                }

                bg.save();
                bg.translate(this.x, this.y);
                bg.rotate(this.angle);

                // kaki
                bg.fillStyle = '#eef2fa';
                bg.strokeStyle = 'rgba(90, 110, 155, 0.35)';
                bg.lineWidth = 0.8;
                const legs = [
                    { bx: 10, by: -12.5, ph: 0 },
                    { bx: 10, by: 12.5, ph: Math.PI },
                    { bx: -11, by: -12.5, ph: Math.PI },
                    { bx: -11, by: 12.5, ph: 0 }
                ];
                for (const L of legs) {
                    const step = Math.sin(this.phase * 2 + L.ph) * 6.5 * s * speedK;
                    bg.beginPath();
                    bg.ellipse(L.bx * s + step, L.by * s, 4 * s, 3.2 * s, 0, 0, TAU);
                    bg.fill();
                    bg.stroke();
                }

                // badan
                const bob = 1 + stride * 0.035;
                const bodyGrad = bg.createLinearGradient(-18 * s, -11 * s, 14 * s, 11 * s);
                bodyGrad.addColorStop(0, pal.body0);
                bodyGrad.addColorStop(1, pal.body1);
                bg.fillStyle = bodyGrad;
                bg.beginPath();
                bg.ellipse(-4 * s, 0, 18.5 * s * bob, 11.5 * s * (2 - bob), 0, 0, TAU);
                bg.fill();

                // corak tabby
                bg.strokeStyle = pal.tabby;
                bg.lineWidth = 2.4 * s;
                bg.lineCap = 'round';
                for (let i = -1; i <= 1; i++) {
                    bg.beginPath();
                    bg.moveTo((i * 6 - 6) * s, -6 * s);
                    bg.quadraticCurveTo((i * 6 - 3.5) * s, 0, (i * 6 - 6) * s, 6 * s);
                    bg.stroke();
                }

                // kepala chibi
                const hx = 17 * s;
                for (const side of [-1, 1]) {
                    bg.fillStyle = pal.ear;
                    bg.beginPath();
                    bg.moveTo(hx - 6 * s, side * 8 * s);
                    bg.lineTo(hx - 1 * s, side * 19.5 * s);
                    bg.lineTo(hx + 7 * s, side * 9.5 * s);
                    bg.closePath();
                    bg.fill();
                    bg.fillStyle = '#f3bfcb';
                    bg.beginPath();
                    bg.moveTo(hx - 2.5 * s, side * 9.5 * s);
                    bg.lineTo(hx - 0.5 * s, side * 16 * s);
                    bg.lineTo(hx + 3.8 * s, side * 10 * s);
                    bg.closePath();
                    bg.fill();
                }

                const headGrad = bg.createRadialGradient(hx + 3 * s, -3 * s, 2 * s, hx, 0, 15 * s);
                headGrad.addColorStop(0, pal.head0);
                headGrad.addColorStop(1, pal.head1);
                bg.fillStyle = headGrad;
                bg.beginPath();
                bg.arc(hx, 0, 13 * s, 0, TAU);
                bg.fill();

                // garis dahi
                bg.strokeStyle = pal.tabby;
                bg.lineWidth = 1.4 * s;
                for (let i = -1; i <= 1; i++) {
                    bg.beginPath();
                    bg.moveTo(hx - 9 * s, i * 2.6 * s);
                    bg.lineTo(hx - 4.5 * s, i * 2.2 * s);
                    bg.stroke();
                }

                // moncong putih
                bg.fillStyle = 'rgba(240, 245, 252, 0.92)';
                bg.beginPath();
                bg.ellipse(hx + 8.5 * s, 0, 5.5 * s, 6.5 * s, 0, 0, TAU);
                bg.fill();

                // mata melirik mangsa
                const lookLocal = normAngle(Math.atan2(this.prey.y - this.y, this.prey.x - this.x) - this.angle);
                const lx = Math.cos(lookLocal) * 1.7 * s;
                const ly = Math.sin(lookLocal) * 1.7 * s;
                for (const side of [-1, 1]) {
                    bg.fillStyle = '#ffffff';
                    bg.beginPath();
                    bg.ellipse(hx + 3.5 * s, side * 5.6 * s, 3.5 * s, 4 * s, 0, 0, TAU);
                    bg.fill();
                    bg.strokeStyle = 'rgba(90, 110, 155, 0.4)';
                    bg.lineWidth = 0.7;
                    bg.stroke();
                    bg.fillStyle = '#233150';
                    bg.beginPath();
                    bg.arc(hx + 3.5 * s + lx, side * 5.6 * s + ly, 1.9 * s, 0, TAU);
                    bg.fill();
                    bg.fillStyle = 'rgba(255,255,255,0.95)';
                    bg.beginPath();
                    bg.arc(hx + 2.8 * s + lx, side * 5.6 * s + ly - 0.8 * s, 0.6 * s, 0, TAU);
                    bg.fill();
                }

                // hidung + mulut
                bg.fillStyle = '#e78fa5';
                bg.beginPath();
                bg.moveTo(hx + 10.8 * s, -1.2 * s);
                bg.lineTo(hx + 12.8 * s, 0);
                bg.lineTo(hx + 10.8 * s, 1.2 * s);
                bg.closePath();
                bg.fill();
                bg.strokeStyle = 'rgba(120, 90, 100, 0.5)';
                bg.lineWidth = 0.8;
                for (const side of [-1, 1]) {
                    bg.beginPath();
                    bg.moveTo(hx + 11 * s, side * 0.8 * s);
                    bg.quadraticCurveTo(hx + 9.5 * s, side * 2.6 * s, hx + 7.5 * s, side * 2.2 * s);
                    bg.stroke();
                }

                // kumis
                bg.strokeStyle = 'rgba(50, 65, 100, 0.42)';
                bg.lineWidth = 0.9;
                for (const side of [-1, 1]) {
                    for (let i = 0; i < 3; i++) {
                        bg.beginPath();
                        bg.moveTo(hx + 8 * s, side * 3.2 * s);
                        bg.lineTo(hx + (15 + i * 1.6) * s, side * (5.5 + i * 3.2) * s);
                        bg.stroke();
                    }
                }

                bg.restore();
            }
        };
    }

    /* ═══════════ pasangan-pasangan ═══════════ */

    const VARIANTS = [
        { scale: 1.0, speed: 1.0, wagOff: 0 },
        { scale: 0.86, speed: 1.09, wagOff: 2.1 },
        { scale: 1.1, speed: 0.93, wagOff: 4.2 }
    ];

    let pairs = [];

    function desiredPairCount() {
        if (W < 760) return 2;          // ponsel/tablet kecil: 2 pasangan mungil
        if (W < 1180) return 2;
        return 3;                        // desktop lega: 3 pasangan
    }

    function buildPairs() {
        pairs = [];
        const n = desiredPairCount();
        for (let i = 0; i < n; i++) {
            const v = VARIANTS[i % VARIANTS.length];
            const m = makeMouse(MOUSE_PALETTES[i % MOUSE_PALETTES.length], v);
            const c = makeCat(CAT_PALETTES[i % CAT_PALETTES.length], v, m);
            m.hunter = c;
            // sebar posisi awal
            const t = (i + 0.5) / n;
            c.init(W * (0.1 + t * 0.5), H * (0.22 + (i % 2) * 0.5));
            m.init(W * (0.45 + t * 0.45), H * (0.15 + ((i + 1) % 2) * 0.55));
            pairs.push({ cat: c, mouse: m });
        }
    }

    /** antar kucing saling menghindar agar tidak bertumpuk */
    function separateCats(f) {
        for (let i = 0; i < pairs.length; i++) {
            for (let j = i + 1; j < pairs.length; j++) {
                const a = pairs[i].cat, b = pairs[j].cat;
                const dx = b.x - a.x, dy = b.y - a.y;
                const d = Math.hypot(dx, dy);
                const minD = 95 * S;
                if (d > 0.001 && d < minD) {
                    const push = ((minD - d) / minD) * 0.8 * f;
                    const ux = dx / d, uy = dy / d;
                    a.x -= ux * push; a.y -= uy * push;
                    b.x += ux * push; b.y += uy * push;
                }
            }
        }
    }

    /* ═══════════ resize & mobile optimization ═══════════ */

    function isMobile() {
        return window.innerWidth <= 768 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    }

    function resize() {
        if (isMobile()) {
            bgCanvas.style.display = 'none';
            stop();
            return;
        }

        bgCanvas.style.display = 'block';
        const dprRaw = window.devicePixelRatio || 1;
        const dprBg = Math.min(dprRaw, 1.35);

        W = window.innerWidth;
        H = window.innerHeight;
        S = clamp(Math.min(W, H) / 800, 0.72, 1);

        bgCanvas.width = Math.round(W * dprBg);
        bgCanvas.height = Math.round(H * dprBg);
        bg.setTransform(dprBg, 0, 0, dprBg, 0, 0);

        updateObstaclesCache();

        if (!pairs.length || pairs.length !== desiredPairCount()) {
            buildPairs();
        } else {
            for (const p of pairs) {
                p.cat.x = clamp(p.cat.x, 40, W - 40);
                p.cat.y = clamp(p.cat.y, 40, H - 40);
                p.mouse.x = clamp(p.mouse.x, 40, W - 40);
                p.mouse.y = clamp(p.mouse.y, 40, H - 40);
            }
        }

        if (!running && !document.hidden) {
            start();
        }
    }

    /* ═══════════ loop utama ═══════════ */

    function frame(ts) {
        if (!running) return;
        if (!last) last = ts;
        let dt = ts - last;
        last = ts;
        dt = clamp(dt, 4, 48);
        const f = dt / 16.667;
        clock += dt;

        for (const p of pairs) {
            p.mouse.update(f);
            p.cat.update(f);
        }
        separateCats(f);

        bg.clearRect(0, 0, W, H);
        drawPawPrints();
        drawPuffs();
        for (const p of pairs) p.mouse.draw();
        for (const p of pairs) p.cat.draw();

        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running || isMobile()) return;
        running = true;
        last = 0;
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
    }

    /* ═══════════ input & lifecycle ═══════════ */

    window.addEventListener('pointerdown', (e) => {
        if (!running) return;
        for (const p of pairs) p.mouse.scare(e.clientX, e.clientY);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else if (!isMobile()) start();
    });

    document.addEventListener('skpDataUpdated', updateObstaclesCache);
    window.addEventListener('resize', resize, { passive: true });

    resize();
    window.__fx = {
        get pairs() { return pairs; },
        get cat() { return pairs[0] && pairs[0].cat; },
        get mouse() { return pairs[0] && pairs[0].mouse; }
    };
    if (!isMobile()) {
        start();
    }
})();
