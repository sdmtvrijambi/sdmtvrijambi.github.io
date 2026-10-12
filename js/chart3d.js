/**
 * Visualisasi Status - Pie Chart 3D Interaktif (vanilla canvas, tanpa library)
 *
 * - Pie 3D extruded dengan pencahayaan gradient, irisan exploded,
 *   bayangan lantai lembut, dan label persen di permukaan
 * - Entrance sweep, rotasi idle pelan, drag untuk memutar (dengan inersia),
 *   hover/tap irisan → terangkat + tooltip, legend tersinkron dua arah
 * - Data live dari window.skpStats; ikut ter-update saat polling berjalan
 * - Delta-time normalized, DPR-aware, hormati prefers-reduced-motion
 */

(function () {
    'use strict';

    const btn = document.getElementById('btn-visual-status');
    const modal = document.getElementById('chart-modal');
    const canvas = document.getElementById('chart3d-canvas');
    if (!btn || !modal || !canvas) return;

    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('chart3d-tooltip');
    const subtitle = document.getElementById('chart3d-subtitle');
    const backdrop = document.getElementById('chart-backdrop');
    const btnClose = document.getElementById('chart-close');
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const TAU = Math.PI * 2;
    const Y_SCALE = 0.55;          // kemiringan perspektif
    const DEPTH_K = 0.16;          // tebal extrusi relatif radius
    const EXPLODE_K = 0.045;       // jarak pisah irisan relatif radius

    const SLICES = [
        { label: 'Eviden Selesai', c0: '#3fd6a0', c1: '#0eaf74', wall: '#0a8a5c', dark: '#076b48' },
        { label: 'Eviden On Proses', c0: '#fccf4d', c1: '#f59e0b', wall: '#c47e08', dark: '#9c6406' },
        { label: 'Belum Selesai', c0: '#f98a8a', c1: '#ef4444', wall: '#c33538', dark: '#9c2a2c' }
    ];

    /* ─────────── state ─────────── */

    let open = false;
    let rafId = null;
    let last = 0;
    let clock = 0;

    let counts = [0, 0, 0];
    let total = 0;
    let dispFrac = [1 / 3, 1 / 3, 1 / 3];   // fraksi tampil (dianimasikan)
    let targetFrac = [1 / 3, 1 / 3, 1 / 3];

    let sweep = 0;                  // 0..1 entrance
    let rot = -0.5;                 // rotasi global
    let rotVel = 0;
    let hoverIdx = -1;
    const lifts = [0, 0, 0];        // 0..1 per irisan

    let dragging = false;
    let dragMoved = 0;
    let lastPointerX = 0;

    let Wc = 0, Hc = 0;             // ukuran canvas (CSS px)

    /* ─────────── util ─────────── */

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function computeData() {
        const s = window.skpStats || {};
        counts = [s.evidenSelesai || 0, s.evidenProses || 0, s.belumSelesai || 0];
        total = counts[0] + counts[1] + counts[2];
        targetFrac = total > 0 ? counts.map((c) => c / total) : [1 / 3, 1 / 3, 1 / 3];
    }

    function pctText(i) {
        if (total <= 0) return '0%';
        return ((counts[i] / total) * 100).toFixed(1) + '%';
    }

    function updateLegend() {
        for (let i = 0; i < 3; i++) {
            const cEl = document.getElementById('leg-count-' + i);
            const pEl = document.getElementById('leg-pct-' + i);
            if (cEl) cEl.textContent = counts[i] + ' pegawai';
            if (pEl) pEl.textContent = pctText(i);
        }
        const tEl = document.getElementById('leg-total');
        if (tEl) tEl.textContent = String(total);
        if (subtitle) subtitle.textContent = `Total ${total} Pegawai · Status Pengerjaan Eviden SKP`;
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        Wc = rect.width;
        Hc = Math.round(clamp(rect.width * 0.66, 220, 380));
        canvas.style.height = Hc + 'px';
        canvas.width = Math.round(Wc * dpr);
        canvas.height = Math.round(Hc * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ─────────── geometri irisan ─────────── */

    function sliceAngles() {
        // sudut awal/akhir tiap irisan (dengan sweep entrance)
        const sw = REDUCED ? 1 : easeOutCubic(sweep);
        const out = [];
        let a = rot - Math.PI / 2;
        for (let i = 0; i < 3; i++) {
            const span = dispFrac[i] * TAU * sw;
            out.push({ a0: a, a1: a + span, mid: a + span / 2, span });
            a += span;
        }
        return out;
    }

    function shade(hex, k) {
        // gelapkan/terangkan warna hex sederhana
        const n = parseInt(hex.slice(1), 16);
        const r = clamp(Math.round(((n >> 16) & 255) * k), 0, 255);
        const g = clamp(Math.round(((n >> 8) & 255) * k), 0, 255);
        const b = clamp(Math.round((n & 255) * k), 0, 255);
        return `rgb(${r},${g},${b})`;
    }

    /* ─────────── render ─────────── */

    function draw() {
        ctx.clearRect(0, 0, Wc, Hc);

        const R = clamp(Math.min(Wc * 0.34, Hc * 0.62), 70, 190);
        const DEPTH = R * DEPTH_K + 12;
        const EXPLODE = R * EXPLODE_K + 3;
        const cx = Wc / 2;
        const float = REDUCED ? 0 : Math.sin(clock * 0.0011) * 4;
        const cy = Hc / 2 - DEPTH * 0.4 + float;

        // glow lembut di belakang chart
        const glow = ctx.createRadialGradient(cx, cy + 8, 0, cx, cy + 8, R * 1.7);
        glow.addColorStop(0, 'rgba(0, 122, 255, 0.07)');
        glow.addColorStop(1, 'rgba(0, 122, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy + 8, R * 1.7, 0, TAU);
        ctx.fill();

        // bayangan lantai
        ctx.save();
        ctx.translate(cx, cy + DEPTH + R * Y_SCALE * 0.55 + 10);
        ctx.scale(1, 0.32);
        const sh = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.12);
        sh.addColorStop(0, 'rgba(20, 40, 80, 0.20)');
        sh.addColorStop(1, 'rgba(20, 40, 80, 0)');
        ctx.fillStyle = sh;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.12, 0, TAU);
        ctx.fill();
        ctx.restore();

        const angles = sliceAngles();

        // urutan lukis: belakang → depan (sin(mid) menaik); irisan hover paling akhir
        const order = [0, 1, 2].sort((a, b) => Math.sin(angles[a].mid) - Math.sin(angles[b].mid));
        if (hoverIdx >= 0) {
            const k = order.indexOf(hoverIdx);
            if (k >= 0) { order.splice(k, 1); order.push(hoverIdx); }
        }

        for (const i of order) {
            const A = angles[i];
            if (A.span <= 0.0001) continue;
            drawSlice(i, A, cx, cy, R, DEPTH, EXPLODE);
        }

        // label persen di permukaan (billboard)
        for (let i = 0; i < 3; i++) {
            const A = angles[i];
            if (A.span < 0.35 || total <= 0 || counts[i] <= 0) continue;
            const liftY = lifts[i] * 12;
            const ex = Math.cos(A.mid) * (EXPLODE + lifts[i] * 6);
            const ey = Math.sin(A.mid) * (EXPLODE + lifts[i] * 6) * Y_SCALE;
            const lx = cx + ex + Math.cos(A.mid) * R * 0.62;
            const ly = cy + ey - liftY + Math.sin(A.mid) * R * 0.62 * Y_SCALE;
            ctx.font = `700 ${Math.max(11, R * 0.105)}px Poppins, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowColor = 'rgba(10, 25, 60, 0.45)';
            ctx.shadowBlur = 5;
            ctx.fillText(pctText(i), lx, ly);
            ctx.shadowBlur = 0;
        }
    }

    function drawSlice(i, A, cx, cy, R, DEPTH, EXPLODE) {
        const pal = SLICES[i];
        const lift = lifts[i];
        const liftY = lift * 12;
        const ox = cx + Math.cos(A.mid) * (EXPLODE + lift * 6);
        const oy = cy + Math.sin(A.mid) * (EXPLODE + lift * 6) * Y_SCALE - liftY;

        const N = Math.max(6, Math.ceil((A.span / TAU) * 64));
        const pts = [];
        for (let k = 0; k <= N; k++) {
            const a = A.a0 + (A.span * k) / N;
            pts.push({ a, x: ox + Math.cos(a) * R, y: oy + Math.sin(a) * R * Y_SCALE });
        }

        /* - sisi potong (cut faces) - */
        ctx.fillStyle = shade(pal.c1, 0.72);
        for (const edgeA of [A.a0, A.a1]) {
            const exx = ox + Math.cos(edgeA) * R;
            const eyy = oy + Math.sin(edgeA) * R * Y_SCALE;
            ctx.beginPath();
            ctx.moveTo(ox, oy);
            ctx.lineTo(exx, eyy);
            ctx.lineTo(exx, eyy + DEPTH);
            ctx.lineTo(ox, oy + DEPTH);
            ctx.closePath();
            ctx.fill();
        }

        /* - dinding luar (hanya busur sisi depan, sin(a) > 0) - */
        let run = [];
        const flushRun = () => {
            if (run.length < 2) { run = []; return; }
            const wg = ctx.createLinearGradient(0, oy, 0, oy + DEPTH + R * Y_SCALE);
            wg.addColorStop(0, pal.wall);
            wg.addColorStop(1, pal.dark);
            ctx.fillStyle = wg;
            ctx.beginPath();
            ctx.moveTo(run[0].x, run[0].y);
            for (const p of run) ctx.lineTo(p.x, p.y);
            for (let k = run.length - 1; k >= 0; k--) ctx.lineTo(run[k].x, run[k].y + DEPTH);
            ctx.closePath();
            ctx.fill();
            run = [];
        };
        for (const p of pts) {
            if (Math.sin(p.a) > -0.02) run.push(p);
            else flushRun();
        }
        flushRun();

        /* - permukaan atas - */
        const tg = ctx.createLinearGradient(ox - R, oy - R * Y_SCALE, ox + R * 0.6, oy + R * Y_SCALE);
        tg.addColorStop(0, pal.c0);
        tg.addColorStop(1, pal.c1);
        ctx.fillStyle = tg;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        for (const p of pts) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.fill();

        // tepi highlight halus
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /* ─────────── loop ─────────── */

    function frame(ts) {
        if (!open) return;
        if (!last) last = ts;
        let dt = ts - last;
        last = ts;
        dt = clamp(dt, 4, 48);
        const f = dt / 16.667;
        clock += dt;

        if (sweep < 1) sweep = Math.min(1, sweep + dt / 1100);

        // fraksi menuju target (data live)
        for (let i = 0; i < 3; i++) {
            dispFrac[i] += (targetFrac[i] - dispFrac[i]) * 0.1 * f;
            const want = hoverIdx === i ? 1 : 0;
            lifts[i] += (want - lifts[i]) * 0.18 * f;
        }

        // rotasi: inersia drag + spin idle pelan
        if (!dragging) {
            rot += rotVel * f;
            rotVel *= Math.pow(0.94, f);
            if (!REDUCED && Math.abs(rotVel) < 0.0005 && hoverIdx < 0) rot += 0.0022 * f;
        }

        draw();
        rafId = requestAnimationFrame(frame);
    }

    /* ─────────── buka / tutup ─────────── */

    function openModal() {
        if (open) return;
        open = true;
        computeData();
        updateLegend();
        sweep = REDUCED ? 1 : 0;
        rot = -0.5;
        rotVel = 0;
        hoverIdx = -1;
        dispFrac = targetFrac.slice();

        modal.classList.add('show');
        document.body.classList.add('chart-open');

        requestAnimationFrame(() => {
            resizeCanvas();
            last = 0;
            rafId = requestAnimationFrame(frame);
        });

        document.addEventListener('keydown', onKey);
    }

    function closeModal() {
        if (!open) return;
        open = false;
        modal.classList.remove('show');
        document.body.classList.remove('chart-open');
        if (tooltip) tooltip.hidden = true;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
        if (e.key === 'Escape') closeModal();
    }

    btn.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // data live: perbarui saat polling berjalan / saat modal dibuka lagi
    document.addEventListener('skpDataUpdated', () => {
        if (!open) return;
        computeData();
        updateLegend();
    });

    window.addEventListener('resize', () => {
        if (open) resizeCanvas();
    }, { passive: true });

    /* ─────────── interaksi canvas ─────────── */

    function sliceAtPoint(mx, my) {
        const rect = canvas.getBoundingClientRect();
        const x = mx - rect.left;
        const y = my - rect.top;
        const R = clamp(Math.min(Wc * 0.34, Hc * 0.62), 70, 190);
        const DEPTH = R * DEPTH_K + 12;
        const float = REDUCED ? 0 : Math.sin(clock * 0.0011) * 4;
        const cx = Wc / 2;
        const cy = Hc / 2 - DEPTH * 0.4 + float;

        const ux = x - cx;
        const uy = (y - cy) / Y_SCALE;
        const r = Math.hypot(ux, uy);
        if (r > R * 1.12) return -1;

        let ang = Math.atan2(uy, ux) - (rot - Math.PI / 2);
        ang = ((ang % TAU) + TAU) % TAU;
        let acc = 0;
        for (let i = 0; i < 3; i++) {
            acc += dispFrac[i] * TAU;
            if (ang <= acc) return counts[i] > 0 ? i : -1;
        }
        return -1;
    }

    function setHover(idx, clientX, clientY) {
        hoverIdx = idx;
        document.querySelectorAll('.leg-item').forEach((el) => {
            el.classList.toggle('active', Number(el.dataset.idx) === idx);
        });
        if (!tooltip) return;
        if (idx < 0) {
            tooltip.hidden = true;
            return;
        }
        const rect = canvas.getBoundingClientRect();
        tooltip.innerHTML = `<strong>${SLICES[idx].label}</strong> - ${counts[idx]} pegawai (${pctText(idx)})`;
        tooltip.style.left = (clientX - rect.left) + 'px';
        tooltip.style.top = (clientY - rect.top) + 'px';
        tooltip.hidden = false;
    }

    canvas.addEventListener('pointerdown', (e) => {
        dragging = true;
        dragMoved = 0;
        lastPointerX = e.clientX;
        canvas.classList.add('dragging');
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (dragging) {
            const dx = e.clientX - lastPointerX;
            lastPointerX = e.clientX;
            dragMoved += Math.abs(dx);
            rot += dx * 0.008;
            rotVel = dx * 0.008;
        } else {
            setHover(sliceAtPoint(e.clientX, e.clientY), e.clientX, e.clientY);
        }
    });

    canvas.addEventListener('pointerup', (e) => {
        dragging = false;
        canvas.classList.remove('dragging');
        // tap (bukan drag) di mobile → toggle sorot irisan
        if (dragMoved < 6) {
            const idx = sliceAtPoint(e.clientX, e.clientY);
            setHover(idx === hoverIdx ? -1 : idx, e.clientX, e.clientY);
        }
    });

    canvas.addEventListener('pointerleave', () => {
        if (!dragging) setHover(-1);
    });

    // legend ↔ chart dua arah
    document.querySelectorAll('.leg-item').forEach((el) => {
        const idx = Number(el.dataset.idx);
        el.addEventListener('mouseenter', () => { hoverIdx = idx; el.classList.add('active'); });
        el.addEventListener('mouseleave', () => {
            if (hoverIdx === idx) hoverIdx = -1;
            el.classList.remove('active');
        });
        el.addEventListener('click', () => {
            const on = hoverIdx === idx;
            setHover(on ? -1 : idx, 0, 0);
            if (tooltip) tooltip.hidden = true;
        });
    });
})();
