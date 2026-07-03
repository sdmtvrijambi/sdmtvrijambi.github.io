/**
 * Core Application UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Loading Screen
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        if(loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.visibility = 'hidden';
            }, 500);
        }
    }, 1500);

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

    // 3. Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});

/**
 * Toast Notification System
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

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
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
        obj.innerHTML = currentVal;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
};
