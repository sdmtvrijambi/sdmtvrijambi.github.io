/**
 * Core Application UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Loading Screen — dismiss when data is ready OR after max timeout
    const loadingScreen = document.getElementById('loading-screen');
    let loadingDismissed = false;

    function dismissLoading() {
        if (loadingDismissed || !loadingScreen) return;
        loadingDismissed = true;

        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.pointerEvents = 'none';
        }, 500);
    }

    // Dismiss when data is actually loaded
    document.addEventListener('skpDataReady', dismissLoading);

    // Safety timeout: dismiss after 8 seconds max (in case fetch hangs)
    setTimeout(dismissLoading, 8000);

    // 2. Real-time Clock formatting for Table Header
    function updateClock() {
        const now = new Date();

        // Format: 2 Juli 2026 12:11 WIB
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

    // 3. Back to top button (with null check)
    const backToTopBtn = document.getElementById('back-to-top');

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // 4. Stagger entrance animation for stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
});

/**
 * Toast Notification System (XSS-safe using textContent)
 * @param {string} message - The message to display
 * @param {string} type - 'success', 'error', 'info'
 */
window.showToast = function(message, type = 'info') {
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

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
};

/**
 * Animated Number Counter
 * @param {string} elementId - ID of the element
 * @param {number} start - Starting number
 * @param {number} end - Ending number
 * @param {number} duration - Animation duration in ms
 */
window.animateValue = function(elementId, start, end, duration) {
    const obj = document.getElementById(elementId);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        obj.textContent = currentVal;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};
