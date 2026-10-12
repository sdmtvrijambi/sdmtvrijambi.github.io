/**
 * Interactive Effects Engine
 * - entrance cascade kartu, scramble text judul, 3D tilt + spotlight,
 *   magnetic button, ripple klik, scroll progress, progress ring statistik,
 *   skeleton -> tabel reveal
 */

(function () {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

    /* ════════════════════════════════════════
       1. ENTRANCE CASCADE (dipicu event appReveal dari app.js)
       ════════════════════════════════════════ */
    function revealCards() {
        document.querySelectorAll('.stat-card').forEach((card) => {
            const i = parseFloat(card.style.getPropertyValue('--card-i')) || 0;
            setTimeout(() => {
                card.classList.add('in');
                setTimeout(() => card.classList.add('entered'), 780);
            }, 150 + i * 95);
        });
    }

    /* ════════════════════════════════════════
       2. SCRAMBLE / DECODE TEXT pada judul
       ════════════════════════════════════════ */
    const GLYPHS = '█▓▒░<>/|#01+*ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function scrambleTitle() {
        const el = document.getElementById('page-title');
        if (!el || REDUCED) return;

        const finalText = el.dataset.text || el.textContent;
        const duration = 1200;
        const start = performance.now();

        function frame(now) {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const settled = Math.floor(finalText.length * eased);

            let out = finalText.slice(0, settled);
            for (let i = settled; i < finalText.length; i++) {
                const ch = finalText[i];
                out += (ch === ' ') ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
            }
            el.textContent = out;

            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                el.textContent = finalText;
            }
        }
        requestAnimationFrame(frame);
    }

    document.addEventListener('appReveal', () => {
        revealCards();
        scrambleTitle();
    });

    /* ════════════════════════════════════════
       3. 3D TILT + CURSOR SPOTLIGHT pada kartu
       ════════════════════════════════════════ */
    function initTilt() {
        if (!FINE_POINTER || REDUCED) return;

        const MAX_DEG = 9;

        document.querySelectorAll('.tilt-card').forEach((card) => {
            let raf = null;
            let lastEvent = null;

            card.addEventListener('pointermove', (e) => {
                lastEvent = e;
                if (raf) return;
                raf = requestAnimationFrame(() => {
                    raf = null;
                    if (!lastEvent) return;
                    const r = card.getBoundingClientRect();
                    const px = (lastEvent.clientX - r.left) / r.width;
                    const py = (lastEvent.clientY - r.top) / r.height;

                    card.style.setProperty('--ry', ((px - 0.5) * MAX_DEG).toFixed(2) + 'deg');
                    card.style.setProperty('--rx', ((0.5 - py) * MAX_DEG).toFixed(2) + 'deg');
                    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
                    card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
                });
            });

            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--rx', '0deg');
                card.style.setProperty('--ry', '0deg');
            });
        });
    }

    /* ════════════════════════════════════════
       4. MAGNETIC BUTTONS
       ════════════════════════════════════════ */
    function initMagnetic() {
        if (!FINE_POINTER || REDUCED) return;

        document.querySelectorAll('.btn-magnetic').forEach((btn) => {
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                const tx = (e.clientX - r.left - r.width / 2) * 0.24;
                const ty = (e.clientY - r.top - r.height / 2) * 0.38;
                btn.style.setProperty('--tx', tx.toFixed(1) + 'px');
                btn.style.setProperty('--ty', ty.toFixed(1) + 'px');
            });

            btn.addEventListener('pointerleave', () => {
                btn.style.setProperty('--tx', '0px');
                btn.style.setProperty('--ty', '0px');
            });
        });
    }

    /* ════════════════════════════════════════
       5. RIPPLE KLIK (delegated: juga bekerja
          pada tombol paginasi DataTables yang dinamis)
       ════════════════════════════════════════ */
    function initRipple() {
        if (REDUCED) return;

        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.glass-btn, .paginate_button, .back-to-top');
            if (!btn) return;

            const r = btn.getBoundingClientRect();
            const span = document.createElement('span');
            span.className = 'ripple';
            const size = Math.max(r.width, r.height) * 2.3;
            span.style.width = span.style.height = size + 'px';
            span.style.left = (e.clientX - r.left) + 'px';
            span.style.top = (e.clientY - r.top) + 'px';
            btn.appendChild(span);
            setTimeout(() => span.remove(), 700);
        });
    }

    /* ════════════════════════════════════════
       6. SCROLL PROGRESS (bar atas + ring back-to-top)
       PERF: tulis style langsung ke 2 elemen target:
       mengubah CSS var di :root memaksa recalc style seluruh dokumen.
       ════════════════════════════════════════ */
    function initScrollProgress() {
        const root = document.documentElement;
        const fill = document.getElementById('scroll-progress-fill');
        const ring = document.getElementById('btt-progress');
        const RING_C = 125.66;
        let ticking = false;

        function update() {
            ticking = false;
            const max = root.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
            if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;
            if (ring) ring.style.strokeDashoffset = (RING_C * (1 - p)).toFixed(2);
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });

        window.addEventListener('resize', update, { passive: true });
        update();
    }

    /* ════════════════════════════════════════
       7. PROGRESS RING STATISTIK + SKELETON REVEAL
          (bereaksi terhadap event data dari sheet.js)
       ════════════════════════════════════════ */
    function initDataBindings() {
        document.addEventListener('skpDataUpdated', () => {
            const s = window.skpStats || {};
            const total = s.total > 0 ? s.total : 1;
            const map = {
                selesai: s.evidenSelesai || 0,
                proses: s.evidenProses || 0,
                belum: s.belumSelesai || 0
            };

            document.querySelectorAll('.stat-visual[data-ring]').forEach((el) => {
                const key = el.getAttribute('data-ring');
                const p = Math.max(0, Math.min(1, (map[key] || 0) / total));
                el.style.setProperty('--ring-p', p.toFixed(3));
            });

            // Skeleton → tampilkan tabel (sekali saja, saat data pertama tiba)
            const sk = document.getElementById('table-skeleton');
            const wrap = document.querySelector('.table-responsive');
            if (sk && !sk.classList.contains('hidden')) {
                sk.classList.add('hidden');
                if (wrap) wrap.classList.remove('waiting');
                try {
                    if (window.dataTableInstance) window.dataTableInstance.columns.adjust();
                } catch (_) { /* noop */ }
            }
        });
    }

    /* ════════════════════════════════════════
       7. ENCHANTED VINES INTERACTION (Akar Bergerak)
       ════════════════════════════════════════ */
    function initVines() {
        const btn = document.getElementById('btn-kumpul-skp');
        if (!btn || REDUCED) return;

        let nudgeTimer = null;

        // Disenggol: respon gerak kinetik akar saat kursor mendekati / menyentuh tombol
        btn.addEventListener('pointerenter', () => {
            btn.classList.add('root-nudged');
            clearTimeout(nudgeTimer);
            nudgeTimer = setTimeout(() => {
                btn.classList.remove('root-nudged');
            }, 1400);
        });

        btn.addEventListener('pointermove', () => {
            if (!btn.classList.contains('root-nudged')) {
                btn.classList.add('root-nudged');
            }
            clearTimeout(nudgeTimer);
            nudgeTimer = setTimeout(() => {
                btn.classList.remove('root-nudged');
            }, 1200);
        });

        btn.addEventListener('pointerleave', () => {
            btn.classList.remove('root-nudged');
            clearTimeout(nudgeTimer);
        });

        // Di klik: akar mengencang melilit tombol lebih erat, lalu mengembang kembali
        btn.addEventListener('pointerdown', () => {
            btn.classList.add('root-constricting');
        });

        const releaseConstriction = () => {
            if (btn.classList.contains('root-constricting')) {
                setTimeout(() => {
                    btn.classList.remove('root-constricting');
                }, 260);
            }
        };

        window.addEventListener('pointerup', releaseConstriction);
        btn.addEventListener('click', () => {
            btn.classList.add('root-constricting');
            setTimeout(() => {
                btn.classList.remove('root-constricting');
                btn.classList.add('root-nudged');
                setTimeout(() => btn.classList.remove('root-nudged'), 1000);
            }, 260);
        });
    }

    /* ════════════════════════════════════════
       INIT
       ════════════════════════════════════════ */
    document.addEventListener('DOMContentLoaded', () => {
        // Tabel disembunyikan di balik skeleton sampai data pertama masuk
        const wrap = document.querySelector('.table-responsive');
        if (wrap) wrap.classList.add('waiting');

        initTilt();
        initMagnetic();
        initRipple();
        initScrollProgress();
        initDataBindings();
        initVines();

        // Safety: jika reveal sudah terjadi sebelum listener terpasang
        if (document.body.classList.contains('is-loaded')) {
            revealCards();
        }
    });
})();
