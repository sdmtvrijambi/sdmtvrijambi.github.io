/**
 * Loading Screen Engine - Harry Potter vs Lord Voldemort Spell Clash
 *
 * Real-time procedural VFX Canvas:
 * - Harry's Expelliarmus beam: multi-strand crimson/gold plasma lightning
 * - Voldemort's Avada Kedavra beam: electric emerald/lime jagged lightning
 * - Priori Incantatem clash node: radiant core, wavering beam struggle,
 *   chaotic branching lightning tendrils, and expanding shockwave rings
 * - Volumetric particle system: red/orange sparks, emerald electric sparks,
 *   dan floating embers/ash Hogwarts
 * - Ornate gothic progress bar matching reference image
 * - Delta-time normalized, DPR-aware, respects prefers-reduced-motion
 */

(function () {
    'use strict';

    const canvas   = document.getElementById('duel-canvas');
    const pctEl    = document.getElementById('loader-pct');
    const barEl    = document.getElementById('loader-bar-fill');
    const statusEl = document.getElementById('duel-status-text');
    const flashEl  = document.getElementById('duel-flash');
    const burstEl  = document.getElementById('duel-finish-burst');
    const stageEl  = document.getElementById('duel-scene-wrap');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Progress State
    let progress = 0;
    let target = 15;
    let finished = false;
    let finishCb = null;
    let animId = null;

    // Status Texts per milestones
    function getStatusText(pct) {
        if (pct < 28) return 'CONNECTING TO DATA SOURCE...';
        if (pct < 58) return 'MEMUAT DATA SKP TRIWULAN III...';
        if (pct < 85) return 'SINKRONISASI 154 DATA PEGAWAI...';
        if (pct < 99) return 'MENYIAPKAN MONITORING TVRI JAMBI...';
        return 'SIHIR SELESAI - MEMBUKA DASHBOARD...';
    }

    function updateUI() {
        if (pctEl) pctEl.textContent = String(Math.round(progress));
        if (barEl) barEl.style.width = progress.toFixed(1) + '%';
        if (statusEl) statusEl.textContent = getStatusText(progress);
    }

    // ══════════════════════════════════════════════════════════════
    // VFX CANVAS SIMULATION ENGINE
    // ══════════════════════════════════════════════════════════════
    if (!canvas || reduced) {
        // Fallback sederhana jika prefers-reduced-motion aktif atau canvas absen
        function fallbackTick() {
            if (!finished && target < 90) target += 0.35;
            progress += (target - progress) * (finished ? 0.2 : 0.04);
            if (finished && progress > 99.2) {
                progress = 100;
                updateUI();
                if (finishCb) setTimeout(finishCb, 200);
                return;
            }
            updateUI();
            requestAnimationFrame(fallbackTick);
        }
        window.LoaderFX = {
            finish(cb) {
                finished = true;
                target = 100;
                finishCb = cb;
            }
        };
        requestAnimationFrame(fallbackTick);
        return;
    }

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Koordinat gambar asli (1024 x 1024)
    // Harry wand: (382, 452) -> 37.3%, 44.1%
    // Voldemort wand: (638, 402) -> 62.3%, 39.3%
    // Clash node: (502, 420) -> 49.0%, 41.0%
    const IMG_W = 1024;
    const IMG_H = 1024;

    function resize() {
        if (!stageEl) return;
        const rect = stageEl.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();

    // Hitung posisi absolut titik di atas layar sesuai object-fit: cover
    function getScreenPoint(normX, normY) {
        const stageRatio = width / height;
        const imgRatio = IMG_W / IMG_H; // 1.0

        let renderW, renderH, offsetX, offsetY;
        if (stageRatio > imgRatio) {
            renderW = width;
            renderH = width / imgRatio;
            offsetX = 0;
            // object-position: center 38%
            offsetY = (height - renderH) * 0.38;
        } else {
            renderH = height;
            renderW = height * imgRatio;
            offsetX = (width - renderW) * 0.5;
            offsetY = (height - renderH) * 0.38;
        }

        return {
            x: offsetX + normX * renderW,
            y: offsetY + normY * renderH
        };
    }

    // ══════════════ Procedural Lightning Algorithm ══════════════
    function generateLightningPath(x1, y1, x2, y2, displacement, iterations) {
        let pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        for (let iter = 0; iter < iterations; iter++) {
            const next = [];
            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                const mx = (p1.x + p2.x) * 0.5;
                const my = (p1.y + p2.y) * 0.5;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy) || 1;
                const nx = -dy / dist;
                const ny = dx / dist;
                const d = (Math.random() - 0.5) * displacement * Math.pow(0.55, iter);
                next.push(p1);
                next.push({ x: mx + nx * d, y: my + ny * d });
            }
            next.push(pts[pts.length - 1]);
            pts = next;
        }
        return pts;
    }

    function renderLightningPath(pts, strokeStyle, lineWidth) {
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    // ══════════════ Particle System: Sparks & Hogwarts Embers ══════════════
    const particles = [];
    const MAX_PARTICLES = 160;

    function spawnClashSpark(cx, cy) {
        if (particles.length >= MAX_PARTICLES) return;
        const isHarry = Math.random() < 0.52;
        const angle = isHarry
            ? Math.PI * 0.5 + (Math.random() * 1.1 - 0.55) * Math.PI // condong ke kiri
            : -Math.PI * 0.5 + (Math.random() * 1.1 - 0.55) * Math.PI; // condong ke kanan
        const speed = 1.5 + Math.random() * 4.2;

        particles.push({
            type: 'clash',
            x: cx + (Math.random() - 0.5) * 8,
            y: cy + (Math.random() - 0.5) * 8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.8,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.035,
            size: 1.2 + Math.random() * 2.2,
            color: isHarry
                ? (Math.random() < 0.6 ? '#f59e0b' : '#ef4444')
                : (Math.random() < 0.6 ? '#10b981' : '#4ade80')
        });
    }

    function spawnAmbientEmber() {
        if (particles.length >= MAX_PARTICLES) return;
        particles.push({
            type: 'ember',
            x: Math.random() * width,
            y: height + 10,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -(0.5 + Math.random() * 1.2),
            life: 1.0,
            decay: 0.005 + Math.random() * 0.008,
            size: 1.0 + Math.random() * 2.0,
            seed: Math.random() * 10,
            color: Math.random() < 0.7 ? '#f59e0b' : '#ef4444'
        });
    }

    // Initial ambient embers
    for (let i = 0; i < 40; i++) {
        particles.push({
            type: 'ember',
            x: Math.random() * 800,
            y: Math.random() * 600,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.4 + Math.random() * 1.0),
            life: Math.random(),
            decay: 0.006 + Math.random() * 0.008,
            size: 1.0 + Math.random() * 1.8,
            seed: Math.random() * 10,
            color: '#f59e0b'
        });
    }

    // ══════════════ Shockwave Rings ══════════════
    const shockwaves = [];

    function triggerShockwave(cx, cy, intensity) {
        shockwaves.push({
            cx, cy,
            r: 8,
            maxR: 90 + intensity * 70,
            opacity: 0.85,
            color: intensity > 0.5 ? '#ffd700' : '#86efac'
        });
    }

    let shockwaveCooldown = 0;

    // ══════════════ MAIN RENDER LOOP ══════════════
    let lastTime = performance.now();

    function renderFrame(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        // Progress logic: merayap menuju 90% saat menunggu data
        if (!finished && target < 90) target += dt * 9;
        progress += (target - progress) * (finished ? 0.15 : 0.038);

        if (finished && progress > 99.2) {
            progress = 100;
            updateUI();
            finishDuelSequence();
            return;
        }

        updateUI();

        // Bersihkan canvas
        ctx.clearRect(0, 0, width, height);

        // Ambil koordinat titik duel terkini
        const harryWand = getScreenPoint(0.373, 0.441);
        const voldyWand = getScreenPoint(0.623, 0.393);

        // Tug of war: titik adu bergetar dan sedikit terdorong oleh progres
        const timeFactor = now * 0.004;
        const progressPush = (progress / 100) * 0.045; // Harry mendorong ke kanan
        const clashNormX = 0.490 + progressPush + Math.sin(timeFactor * 2.8) * 0.008;
        const clashNormY = 0.410 + Math.cos(timeFactor * 3.4) * 0.005;
        const clashPoint = getScreenPoint(clashNormX, clashNormY);

        const cx = clashPoint.x + (Math.random() - 0.5) * 4;
        const cy = clashPoint.y + (Math.random() - 0.5) * 3;

        // 1. Gambar Shockwave Rings
        shockwaveCooldown -= dt;
        if (shockwaveCooldown <= 0) {
            triggerShockwave(cx, cy, Math.random());
            shockwaveCooldown = 1.1 + Math.random() * 0.6;
        }

        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.r += dt * 140;
            sw.opacity -= dt * 0.85;
            if (sw.opacity <= 0 || sw.r >= sw.maxR) {
                shockwaves.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.beginPath();
            ctx.arc(sw.cx, sw.cy, sw.r, 0, Math.PI * 2);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = 2.2 * sw.opacity;
            ctx.globalAlpha = sw.opacity;
            ctx.stroke();
            ctx.restore();
        }

        // 2. Harry Potter Expelliarmus Beam (Merah - Emas Api)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Semburan cahaya luar Harry
        const gradHarry = ctx.createLinearGradient(harryWand.x, harryWand.y, cx, cy);
        gradHarry.addColorStop(0, 'rgba(255, 60, 20, 0.3)');
        gradHarry.addColorStop(0.5, 'rgba(245, 158, 11, 0.7)');
        gradHarry.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

        // Batang utama
        const harryCore = generateLightningPath(harryWand.x, harryWand.y, cx, cy, 26, 4);
        renderLightningPath(harryCore, 'rgba(239, 68, 68, 0.45)', 16);
        renderLightningPath(harryCore, 'rgba(245, 158, 11, 0.85)', 7);
        renderLightningPath(harryCore, '#ffffff', 2.8);

        // Serat listrik sekunder Harry yang melingkar
        const harrySub1 = generateLightningPath(harryWand.x, harryWand.y, cx, cy, 38, 3);
        renderLightningPath(harrySub1, 'rgba(255, 120, 20, 0.75)', 2.2);

        const harrySub2 = generateLightningPath(harryWand.x, harryWand.y + 4, cx, cy - 2, 32, 3);
        renderLightningPath(harrySub2, 'rgba(251, 191, 36, 0.8)', 1.8);

        // 3. Voldemort Avada Kedavra Beam (Hijau Zamrud - Listrik Beracun)
        const voldyCore = generateLightningPath(voldyWand.x, voldyWand.y, cx, cy, 26, 4);
        renderLightningPath(voldyCore, 'rgba(5, 150, 105, 0.45)', 16);
        renderLightningPath(voldyCore, 'rgba(34, 197, 94, 0.85)', 7);
        renderLightningPath(voldyCore, '#ffffff', 2.8);

        // Serat listrik sekunder Voldemort
        const voldySub1 = generateLightningPath(voldyWand.x, voldyWand.y, cx, cy, 40, 3);
        renderLightningPath(voldySub1, 'rgba(74, 222, 128, 0.75)', 2.2);

        const voldySub2 = generateLightningPath(voldyWand.x, voldyWand.y - 4, cx, cy + 2, 30, 3);
        renderLightningPath(voldySub2, 'rgba(16, 185, 129, 0.8)', 1.8);

        // 4. Cabang-Cabang Kilat Acak (Fork Lightning Erupting from Clash)
        const numForks = 5;
        for (let f = 0; f < numForks; f++) {
            const isHarrySide = f % 2 === 0;
            const spreadAngle = isHarrySide
                ? -Math.PI * 0.5 - (Math.random() * 0.9 + 0.1)
                : -Math.PI * 0.5 + (Math.random() * 0.9 + 0.1);
            const forkLen = 40 + Math.random() * 75;
            const fx2 = cx + Math.cos(spreadAngle) * forkLen;
            const fy2 = cy + Math.sin(spreadAngle) * forkLen;

            const forkPts = generateLightningPath(cx, cy, fx2, fy2, 22, 3);
            const forkColor = isHarrySide ? 'rgba(245, 158, 11, 0.85)' : 'rgba(74, 222, 128, 0.85)';
            renderLightningPath(forkPts, forkColor, 1.4);
        }

        // 5. Bola Tabrakan Mantra Utama (Priori Incantatem Clash Dome)
        const flareRadius = 55 + Math.random() * 25;
        const clashGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, flareRadius);
        clashGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
        clashGlow.addColorStop(0.22, 'rgba(255, 245, 180, 0.95)');
        clashGlow.addColorStop(0.55, 'rgba(245, 158, 11, 0.5)');
        clashGlow.addColorStop(0.82, 'rgba(16, 185, 129, 0.35)');
        clashGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = clashGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, flareRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inti putih cemerlang di tengah
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, 14 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();

        // 6. Update Partikel Sparks & Embers
        // Spawn percikan baru dari titik benturan
        for (let s = 0; s < 4; s++) spawnClashSpark(cx, cy);
        if (Math.random() < 0.3) spawnAmbientEmber();

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            if (p.type === 'clash') {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.08; // gravitasi halus
            } else {
                p.x += p.vx + Math.sin(timeFactor + p.seed) * 0.35;
                p.y += p.vy;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
        }

        ctx.restore();

        // 7. Ambient Flashing Kilatan Cahaya di Ruangan
        if (flashEl && Math.random() < 0.28) {
            flashEl.style.opacity = (0.08 + Math.random() * 0.22).toFixed(2);
            setTimeout(() => {
                if (flashEl) flashEl.style.opacity = '0';
            }, 60);
        }

        animId = requestAnimationFrame(renderFrame);
    }

    // ══════════════ FINISH DUEL SEQUENCE ══════════════
    function finishDuelSequence() {
        // Hentikan frame biasa
        if (animId) cancelAnimationFrame(animId);
        animId = null;

        // Kilatan ledakan kemenangan Harry
        if (burstEl) {
            burstEl.classList.add('active');
        }

        setTimeout(() => {
            if (finishCb) {
                const cb = finishCb;
                finishCb = null;
                cb();
            }
        }, 420);
    }

    // ══════════════ PUBLIC API LOADER ══════════════
    window.LoaderFX = {
        finish(cb) {
            if (finished) return;
            finished = true;
            finishCb = cb || null;
            target = 100;

            if (reduced) {
                progress = 100;
                updateUI();
                if (finishCb) setTimeout(finishCb, 150);
            }
        }
    };

    // Jalankan loop VFX
    animId = requestAnimationFrame(renderFrame);
})();
