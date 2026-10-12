/**
 * Google Sheets Data Fetching and Polling
 * Menggunakan Google Apps Script Web App Endpoint sebagai API Gateway aman
 */

// Endpoint API Web App Google Apps Script
// Akses spreadsheet diamankan melalui Apps Script tanpa mengekspos ID spreadsheet di frontend
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbys6JqTAYBIMkqrTBaeDyUHeBLUyyn13tAJFJ_ic4JdmxyUMUYEF7SjRdIJ8_igyEEv/exec";

// LocalStorage cache keys
const CACHE_KEY = 'skp_dashboard_data';
const CACHE_TIME_KEY = 'skp_dashboard_data_time';

// State data global
window.skpData = [];
window.skpStats = {
    total: 0,
    tmKerja: 0,
    evidenSelesai: 0,
    evidenProses: 0,
    belumSelesai: 0
};

// Interval polling data (60 detik)
const POLL_INTERVAL = 60000;

// Flag penanda data selesai dimuat pertama kali
window.skpDataLoaded = false;

/**
 * Fetch data JSON dari Google Apps Script Web App dengan retry dan exponential backoff
 */
async function fetchJSONWithRetry(url, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(url, {
                signal: controller.signal,
                redirect: 'follow'
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            if (json) {
                if (Array.isArray(json.data) && json.data.length > 0) {
                    return json.data;
                }
                if (Array.isArray(json) && json.length > 0) {
                    return json;
                }
            }
            throw new Error('Struktur data JSON dari Apps Script kosong atau tidak sesuai');
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            console.warn(`[AppsScript] Percobaan ${attempt}/${maxRetries} gagal:`, error.message);

            if (!isLastAttempt) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`[AppsScript] Mencoba kembali dalam ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return null;
}

/**
 * Mengambil data dari endpoint aman Apps Script dengan fallback ke cache lokal
 */
async function fetchSheetData() {
    // 1. Ambil data dari Google Apps Script Web App
    if (APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== '') {
        const apiData = await fetchJSONWithRetry(APPS_SCRIPT_URL, 3, 1000);
        if (apiData && apiData.length > 0) {
            saveToCache(apiData);
            return apiData;
        }
        console.warn('[Sheet] Gagal mengambil data live dari Apps Script.');
    }

    // 2. Muat dari cache localStorage jika offline atau koneksi terganggu
    console.warn('[Sheet] Mengalihkan ke cache lokal...');
    const cachedData = loadFromCache();
    if (cachedData && cachedData.length > 0) {
        const cacheAge = getCacheAge();
        const ageText = formatCacheAge(cacheAge);
        window.showToast(
            `Koneksi live terganggu. Menggunakan data tersimpan (${ageText}).`,
            'error'
        );
        return cachedData;
    }

    // 3. Mock data cadangan sebagai opsi terakhir
    console.warn('[Sheet] Data cache tidak ditemukan, memuat data contoh.');
    window.showToast('Gagal memuat data live. Menampilkan data contoh.', 'error');
    return generateMockData();
}

/**
 * Simpan data ke localStorage
 */
function saveToCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch (e) {
        console.warn('[Cache] Gagal menyimpan ke localStorage:', e.message);
    }
}

/**
 * Baca data dari localStorage
 */
function loadFromCache() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('[Cache] Gagal membaca dari localStorage:', e.message);
    }
    return null;
}

/**
 * Hitung usia cache dalam milidetik
 */
function getCacheAge() {
    try {
        const timeStr = localStorage.getItem(CACHE_TIME_KEY);
        if (timeStr) {
            return Date.now() - parseInt(timeStr, 10);
        }
    } catch (e) {}
    return 0;
}

/**
 * Format durasi usia cache
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
 * Memproses data mentah ke state aplikasi
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

    rawData.forEach(row => {
        if (row.tm_kerja && row.tm_kerja !== '-') {
            uniqueTmKerja.add(row.tm_kerja);
        }

        const status = (row.status || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (status.includes('tidak') || status.includes('kurang') || status.includes('proses') || status.includes('persetujuan') || status.includes('revisi') || status.includes('dinilai')) {
            window.skpStats.evidenProses++;
        } else if (status.includes('sesuai')) {
            window.skpStats.evidenSelesai++;
        } else {
            window.skpStats.belumSelesai++;
        }
    });

    window.skpStats.tmKerja = uniqueTmKerja.size;

    updateUI();

    document.dispatchEvent(new CustomEvent('skpDataUpdated', { detail: { data: window.skpData } }));
}

/**
 * Memperbarui angka visual pada kartu statistik
 */
function updateUI() {
    const prevTotal = parseInt(document.getElementById('stat-total-pegawai').innerText, 10) || 0;
    const prevTmKerja = parseInt(document.getElementById('stat-tm-kerja').innerText, 10) || 0;
    const prevSelesai = parseInt(document.getElementById('stat-eviden-selesai').innerText, 10) || 0;
    const prevProses = parseInt(document.getElementById('stat-eviden-proses').innerText, 10) || 0;
    const prevBelum = parseInt(document.getElementById('stat-belum-selesai').innerText, 10) || 0;

    window.animateValue('stat-total-pegawai', prevTotal, window.skpStats.total, 1000);
    window.animateValue('stat-tm-kerja', prevTmKerja, window.skpStats.tmKerja, 1000);
    window.animateValue('stat-eviden-selesai', prevSelesai, window.skpStats.evidenSelesai, 1000);
    window.animateValue('stat-eviden-proses', prevProses, window.skpStats.evidenProses, 1000);
    window.animateValue('stat-belum-selesai', prevBelum, window.skpStats.belumSelesai, 1000);

    const total = window.skpStats.total > 0 ? window.skpStats.total : 1;

    const pctSelesai = ((window.skpStats.evidenSelesai / total) * 100).toFixed(1);
    const pctProses = ((window.skpStats.evidenProses / total) * 100).toFixed(1);
    const pctBelum = ((window.skpStats.belumSelesai / total) * 100).toFixed(1);

    const elSelesaiPct = document.getElementById('stat-eviden-selesai-pct');
    const elProsesPct = document.getElementById('stat-eviden-proses-pct');
    const elBelumPct = document.getElementById('stat-belum-selesai-pct');

    if (elSelesaiPct) elSelesaiPct.textContent = `(${pctSelesai}%)`;
    if (elProsesPct) elProsesPct.textContent = `(${pctProses}%)`;
    if (elBelumPct) elBelumPct.textContent = `(${pctBelum}%)`;
}

/**
 * Polling siklik untuk sinkronisasi data
 */
async function pollData(isInitial = false) {
    const newData = await fetchSheetData();
    processData(newData);

    if (isInitial) {
        window.skpDataLoaded = true;
        document.dispatchEvent(new CustomEvent('skpDataReady'));
    }

    if (!isInitial) {
        window.showToast('Data berhasil diperbarui.', 'success');
    }
}

// Mulai polling saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
    pollData(true);
    setInterval(() => pollData(false), POLL_INTERVAL);
});

/**
 * Generator data cadangan jika koneksi gagal total
 */
function generateMockData() {
    const names = ["Ahmad Fauzi", "Budi Santoso", "Citra Kirana", "Dewi Lestari", "Eko Prasetyo"];
    const tms = ["Tata Usaha", "Berita", "Program", "Teknik"];
    const jabatans = ["Staff", "Supervisor", "Manager"];
    const statuses = ["Eviden Sesuai", "Eviden Sesuai", "Belum Mengisi Eviden"];

    const mockData = [];
    for (let i = 0; i < 20; i++) {
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
