/**
 * Core Application UI Logic
 * - orkestrasi loader -> circular wipe -> entrance cascade
 * - jam real-time, back-to-top, toast, animasi angka
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Loading Screen: dismiss saat data siap ATAU setelah timeout maksimum
    const loadingScreen = document.getElementById('loading-screen');
    let loadingDismissed = false;

    function revealApp() {
        document.body.classList.add('is-loaded');
        document.dispatchEvent(new CustomEvent('appReveal'));
    }

    function dismissLoading() {
        if (loadingDismissed || !loadingScreen) return;
        loadingDismissed = true;

        if (window.LoaderFX && typeof window.LoaderFX.finish === 'function') {
            // Loader menyelesaikan progress ke 100% → circular wipe → reveal
            window.LoaderFX.finish(() => {
                loadingScreen.classList.add('done');
                revealApp();
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 1000);
            });
        } else {
            // Fallback: fade sederhana
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transition = 'opacity 0.5s ease';
            revealApp();
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    // Dismiss saat data benar-benar termuat
    document.addEventListener('skpDataReady', dismissLoading);

    // Safety timeout: maksimal 8 detik (jika fetch menggantung)
    setTimeout(dismissLoading, 8000);

    // 2. Jam real-time pada header tabel
    function updateClock() {
        const now = new Date();

        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const dateString = now.toLocaleDateString('id-ID', options);
        const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

        const timeDisplay = document.getElementById('current-time-display');
        if (timeDisplay) {
            timeDisplay.textContent = `Data diperbarui: ${dateString} ${timeString} WIB`;
        }
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 3. Back to top
    const backToTopBtn = document.getElementById('back-to-top');

    if (backToTopBtn) {
        let bttVisible = false;   // guard: sentuh DOM hanya saat status berubah
        window.addEventListener('scroll', () => {
            const shouldShow = window.scrollY > 300;
            if (shouldShow !== bttVisible) {
                bttVisible = shouldShow;
                backToTopBtn.classList.toggle('visible', shouldShow);
            }
        }, { passive: true });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

/**
 * Toast Notification System (XSS-safe menggunakan textContent)
 * @param {string} message - Pesan yang ditampilkan
 * @param {string} type - 'success', 'error', 'info'
 */
window.showToast = function (message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-triangle';

    const icon = document.createElement('i');
    icon.className = `fa-solid ${iconClass}`;

    const span = document.createElement('span');
    span.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(span);
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
};

/**
 * Animated Number Counter: easing easeOutExpo + pulse glow saat berubah
 * @param {string} elementId - ID elemen
 * @param {number} start - Angka awal
 * @param {number} end - Angka akhir
 * @param {number} duration - Durasi animasi (ms)
 */
window.animateValue = function (elementId, start, end, duration) {
    const obj = document.getElementById(elementId);
    if (!obj) return;

    if (start !== end) {
        obj.classList.remove('pop');
        void obj.offsetWidth; // restart animasi pulse
        obj.classList.add('pop');
    }

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = Math.round(easeProgress * (end - start) + start);
        obj.textContent = currentVal;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};
