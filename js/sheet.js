/**
 * Google Sheets CSV Data Fetching and Polling
 */

// Menggunakan format CSV export dari Google Sheets
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1a4C_Ch47hZ2ZJwbwG0Qp599K79s5a7sp8Fk3ps_ApTY/export?format=csv"; 

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

/**
 * Fetch CSV data from Google Sheets
 */
async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        window.showToast("Gagal mengambil data terbaru. Menggunakan data lokal.", "error");
        return window.skpData.length ? window.skpData : generateMockData();
    }
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

        const status = row.status.toLowerCase().trim();
        // Check 'tidak sesuai' and 'kurang' BEFORE 'sesuai' since 'tidak sesuai' contains 'sesuai'
        if (status.includes('tidak sesuai') || status.includes('kurang')) window.skpStats.evidenProses++;
        else if (status.includes('sesuai')) window.skpStats.evidenSelesai++;
        else if (status.includes('proses') || status.includes('persetujuan')) window.skpStats.evidenProses++;
        else window.skpStats.belumSelesai++;
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
    
    if (!isInitial) {
        window.showToast("Data berhasil diperbarui.", "success");
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
