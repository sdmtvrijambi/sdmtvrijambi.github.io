/**
 * Google Sheets CSV Data Fetching and Polling
 * Robust version with retry, caching, and fallback
 */

// Primary: CSV export URL (works for publicly-shared sheets)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1a4C_Ch47hZ2ZJwbwG0Qp599K79s5a7sp8Fk3ps_ApTY/export?format=csv";

// Fallback: Google Sheets published CSV URL
// To get this URL: File > Share > Publish to web > CSV format
// Replace with your actual published URL if available
const SHEET_URL_FALLBACK = "https://docs.google.com/spreadsheets/d/1a4C_Ch47hZ2ZJwbwG0Qp599K79s5a7sp8Fk3ps_ApTY/gviz/tq?tqx=out:csv";

// LocalStorage cache keys
const CACHE_KEY = 'skp_dashboard_data';
const CACHE_TIME_KEY = 'skp_dashboard_data_time';

// State for holding current data
window.skpData = [];
window.skpStats = {
    total: 0,
    tmKerja: 0,
    evidenSelesai: 0,
    evidenProses: 0,
    belumSelesai: 0
};

// Poll interval in milliseconds (60 seconds)
const POLL_INTERVAL = 60000;

// Signal that data has finished loading (used by loading screen)
window.skpDataLoaded = false;

/**
 * Fetch with retry and exponential backoff
 * @param {string} url - URL to fetch
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms (doubles each retry)
 * @returns {Promise<string|null>} CSV text or null on failure
 */
async function fetchWithRetry(url, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow'
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();

            // Validate that we got actual CSV data (not an HTML error page)
            if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
                throw new Error('Received HTML instead of CSV — sheet mungkin belum dipublish');
            }

            return text;
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            console.warn(`[Sheet] Fetch attempt ${attempt}/${maxRetries} failed:`, error.message);

            if (!isLastAttempt) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`[Sheet] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return null;
}

/**
 * Fetch CSV data from Google Sheets with multiple fallback strategies
 */
async function fetchSheetData() {
    // Strategy 1: Try primary export URL
    let csvText = await fetchWithRetry(SHEET_URL, 3, 1000);

    // Strategy 2: Try fallback URL (gviz/tq format)
    if (!csvText) {
        console.log('[Sheet] Primary URL failed. Trying fallback URL...');
        csvText = await fetchWithRetry(SHEET_URL_FALLBACK, 2, 1500);
    }

    // If we got CSV data, parse and cache it
    if (csvText) {
        const data = parseCSV(csvText);

        if (data.length > 0) {
            // Cache to localStorage for offline resilience
            saveToCache(data);
            return data;
        }
    }

    // Strategy 3: Load from localStorage cache
    console.warn('[Sheet] All fetch attempts failed. Trying cache...');
    const cachedData = loadFromCache();

    if (cachedData && cachedData.length > 0) {
        const cacheAge = getCacheAge();
        const ageText = formatCacheAge(cacheAge);
        window.showToast(
            `Koneksi ke Google Sheets gagal. Menggunakan data cache (${ageText}).`,
            'error'
        );
        return cachedData;
    }

    // Strategy 4: Generate mock data as last resort
    console.warn('[Sheet] No cache available. Using mock data.');
    window.showToast('Gagal mengambil data. Menggunakan data contoh.', 'error');
    return generateMockData();
}

/**
 * Save data to localStorage cache
 */
function saveToCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
        console.warn('[Cache] Failed to save to localStorage:', e.message);
    }
}

/**
 * Load data from localStorage cache
 */
function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('[Cache] Failed to load from localStorage:', e.message);
    }
    return null;
}

/**
 * Get cache age in milliseconds
 */
function getCacheAge() {
    try {
        const timeStr = localStorage.getItem(CACHE_TIME_KEY);
        if (timeStr) {
            return Date.now() - parseInt(timeStr);
        }
    } catch (e) {}
    return 0;
}

/**
 * Format cache age into human-readable Indonesian string
 */
function formatCacheAge(ms) {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari lalu`;
}

/**
 * Basic CSV Parser for Google Sheets export
 */
function parseCSV(csvText) {
    const rows = csvText.split('\n');
    const data = [];

    // As observed, headers start at row 4 (index 3).
    // Data starts at row 5 (index 4).
    for (let i = 4; i < rows.length; i++) {
        let line = rows[i].trim();
        if (!line) continue;

        // Handle quotes in CSV
        const cols = [];
        let inQuotes = false;
        let col = '';
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"' && line[j+1] === '"') {
                col += '"'; j++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(col);
                col = '';
            } else {
                col += char;
            }
        }
        cols.push(col);

        // Make sure it's a valid data row (has NO.)
        if (cols[0] && !isNaN(parseInt(cols[0]))) {
            data.push({
                no: cols[0],
                nama: cols[1] || '-',
                jabatan: cols[7] || '-',
                tm_kerja: cols[8] || '-',
                status: cols[11] || 'Belum Selesai',
                keterangan: cols[12] || '-'
            });
        }
    }
    return data;
}

/**
 * Process the raw data into application state
 * @param {Array} rawData
 */
function processData(rawData) {
    window.skpData = rawData;

    const uniqueTmKerja = new Set();

    window.skpStats = {
        total: rawData.length,
        tmKerja: 0,
        evidenSelesai: 0,
        evidenProses: 0,
        belumSelesai: 0
    };

    // Calculate stats
    rawData.forEach(row => {
        if (row.tm_kerja && row.tm_kerja !== '-') {
            uniqueTmKerja.add(row.tm_kerja);
        }

        const status = row.status.toLowerCase().replace(/\s+/g, ' ').trim();
        // Categorize 'tidak sesuai', 'kurang', 'proses', 'persetujuan', 'revisi' as Eviden Proses
        if (status.includes('tidak') || status.includes('kurang') || status.includes('proses') || status.includes('persetujuan') || status.includes('revisi')) {
            window.skpStats.evidenProses++;
        } else if (status.includes('sesuai')) {
            window.skpStats.evidenSelesai++;
        } else {
            window.skpStats.belumSelesai++;
        }
    });

    window.skpStats.tmKerja = uniqueTmKerja.size;

    updateUI();

    // Dispatch event for tables to update
    document.dispatchEvent(new CustomEvent('skpDataUpdated', { detail: { data: window.skpData } }));
}

/**
 * Update UI Stats elements
 */
function updateUI() {
    const prevTotal = parseInt(document.getElementById('stat-total-pegawai').innerText) || 0;
    const prevTmKerja = parseInt(document.getElementById('stat-tm-kerja').innerText) || 0;
    const prevSelesai = parseInt(document.getElementById('stat-eviden-selesai').innerText) || 0;
    const prevProses = parseInt(document.getElementById('stat-eviden-proses').innerText) || 0;
    const prevBelum = parseInt(document.getElementById('stat-belum-selesai').innerText) || 0;

    window.animateValue('stat-total-pegawai', prevTotal, window.skpStats.total, 1000);
    window.animateValue('stat-tm-kerja', prevTmKerja, window.skpStats.tmKerja, 1000);
    window.animateValue('stat-eviden-selesai', prevSelesai, window.skpStats.evidenSelesai, 1000);
    window.animateValue('stat-eviden-proses', prevProses, window.skpStats.evidenProses, 1000);
    window.animateValue('stat-belum-selesai', prevBelum, window.skpStats.belumSelesai, 1000);

    const total = window.skpStats.total > 0 ? window.skpStats.total : 1; // avoid division by zero

    const pctSelesai = ((window.skpStats.evidenSelesai / total) * 100).toFixed(1);
    const pctProses = ((window.skpStats.evidenProses / total) * 100).toFixed(1);
    const pctBelum = ((window.skpStats.belumSelesai / total) * 100).toFixed(1);

    document.getElementById('stat-eviden-selesai-pct').textContent = `(${pctSelesai}%)`;
    document.getElementById('stat-eviden-proses-pct').textContent = `(${pctProses}%)`;
    document.getElementById('stat-belum-selesai-pct').textContent = `(${pctBelum}%)`;
}

/**
 * Main polling function
 */
async function pollData(isInitial = false) {
    const newData = await fetchSheetData();
    processData(newData);

    // Signal that initial data load is complete
    if (isInitial) {
        window.skpDataLoaded = true;
        document.dispatchEvent(new CustomEvent('skpDataReady'));
    }

    if (!isInitial) {
        window.showToast('Data berhasil diperbarui.', 'success');
    }
}

// Start polling on load
document.addEventListener('DOMContentLoaded', () => {
    pollData(true);
    setInterval(() => pollData(false), POLL_INTERVAL);
});


// ==========================================
// MOCK DATA GENERATOR (FOR FALLBACK)
// ==========================================
function generateMockData() {
    const names = ["Ahmad Fauzi", "Budi Santoso", "Citra Kirana", "Dewi Lestari", "Eko Prasetyo"];
    const tms = ["Kepala Subbag Tata Usaha", "Berita", "Program", "Teknik"];
    const jabatans = ["Staff", "Supervisor", "Manager"];
    const statuses = ["Eviden Sesuai", "Eviden Sesuai", "Eviden Proses", "Belum Selesai"];

    let mockData = [];

    for (let i = 0; i < 72; i++) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        mockData.push({
            no: i + 1,
            nama: names[i % names.length] + (i > 4 ? ` ${i}` : ''),
            tm_kerja: tms[Math.floor(Math.random() * tms.length)],
            jabatan: jabatans[Math.floor(Math.random() * jabatans.length)],
            status: status,
            keterangan: "-"
        });
    }

    return mockData;
}
