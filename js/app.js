/**
 * Live Google Sheets Monitoring Application
 * Spreadsheet Target: https://docs.google.com/spreadsheets/d/1jskUmNR3FIrNY2q116v1ndSqWN2a88T1u9F74fgrPS4/edit?gid=0#gid=0
 * Columns: Nama Lengkap, Status Operasional, Link Foto Datang (Ceklis / X), Link Foto Pulang (Ceklis / X)
 */

// SPREADSHEET CONFIGURATION
const SPREADSHEET_ID = '1jskUmNR3FIrNY2q116v1ndSqWN2a88T1u9F74fgrPS4';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=0`;
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

// Fallback initial demo data matching the live spreadsheet
const INITIAL_FALLBACK_DATA = [
  {
    timestamp: '14/08/2026 08:08:00',
    nama: 'M Fachrezy',
    nip: '199507212025041002',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Tidak ada',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:10:31',
    nama: 'Nabilah Putri',
    nip: '200606202025042001',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:10:43',
    nama: 'Nadiatul Husna',
    nip: '200406202025042001',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:11:03',
    nama: 'Sherina Nofitri',
    nip: '200110162025042002',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:33:02',
    nama: 'Mohammad dani putra',
    nip: '199607052025211040',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:33:05',
    nama: 'Aisyiah Anggraini',
    nip: '200109062025042002',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:38:44',
    nama: 'Seira Seila',
    nip: '200408252025042001',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  },
  {
    timestamp: '14/08/2026 08:47:58',
    nama: 'Aktavia Putri Irena',
    nip: '200505122025042001',
    statusOperasional: 'Operasional',
    fotoDatang: 'Ada Foto',
    fotoPulang: 'Ada Foto',
    keterangan: ''
  }
];

class DataReaderApp {
  constructor() {
    const cachedData = localStorage.getItem('presensi_monitoring_data');
    let initialRecords = INITIAL_FALLBACK_DATA;
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed)) {
          initialRecords = parsed.map(r => ({
            ...r,
            fotoDatang: this.hasPhoto(r.fotoDatang) ? 'Ada Foto' : 'Tidak ada',
            fotoPulang: this.hasPhoto(r.fotoPulang) ? 'Ada Foto' : 'Tidak ada'
          }));
        }
      } catch (e) {
        initialRecords = INITIAL_FALLBACK_DATA;
      }
    }
    this.records = initialRecords;
    this.searchQuery = '';
    this.autoRefreshInterval = null;
    this.isFetching = false;

    this.initElements();
    this.bindEvents();
    this.renderDashboard();
    this.loadData();
    this.startAutoSync3Min();
  }

  initElements() {
    this.tableBody = document.getElementById('table-records-body');
    this.emptyState = document.getElementById('table-empty-state');
    this.inputSearch = document.getElementById('input-search');
    this.statTotalCount = document.getElementById('stat-total-count');
    this.statDatangCount = document.getElementById('stat-datang-count');
    this.statPulangCount = document.getElementById('stat-pulang-count');
    this.lastSyncTime = document.getElementById('last-sync-time');
    this.apiStatusBadge = document.getElementById('api-status-badge');
    this.btnRefresh = document.getElementById('btn-manual-refresh');
  }

  bindEvents() {
    if (this.inputSearch) {
      this.inputSearch.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTable();
      });
    }

    if (this.btnRefresh) {
      this.btnRefresh.addEventListener('click', () => {
        this.loadData(true);
      });
    }
  }

  startAutoSync3Min() {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    this.autoRefreshInterval = setInterval(() => {
      this.loadData(false);
    }, 3 * 60 * 1000); // 3 menit
  }

  /**
   * Cek apakah status kehadiran foto ada
   * Mengembalikan true jika foto ada (URL/Ada Foto), false jika tidak ada
   */
  hasPhoto(linkStr) {
    if (!linkStr) return false;
    if (typeof linkStr === 'boolean') return linkStr;
    const str = String(linkStr).trim();
    if (str === '' || str === '-' || str.toLowerCase() === 'tidak ada' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'x' || str.toLowerCase() === 'false') {
      return false;
    }
    if (str.toLowerCase() === 'ada' || str.toLowerCase() === 'ada foto' || str.toLowerCase() === 'true' || str.startsWith('http://') || str.startsWith('https://') || str.length > 3) {
      return true;
    }
    return false;
  }

  async loadData(isUserAction = false) {
    if (this.isFetching) return;
    this.isFetching = true;

    if (this.btnRefresh) {
      this.btnRefresh.classList.add('is-spinning');
    }

    if (isUserAction) {
      this.showToast('Menyinkronkan data langsung dari Google Sheets...', 'info');
    }

    let fetchedRecords = null;

    // 1. Coba lewat JSONP (100% Berhasil di file:/// lokal & web hosting tanpa CORS error)
    try {
      fetchedRecords = await this.fetchViaJSONP();
    } catch (errJSONP) {
      console.warn('JSONP fetch gagal, mencoba via fetch API...', errJSONP);
      // 2. Coba lewat GViz JSON API biasa
      try {
        fetchedRecords = await this.fetchViaGViz();
      } catch (errGViz) {
        console.warn('GViz fetch failed, mencoba via CSV Export...', errGViz);
        // 3. Fallback ke CSV Export
        try {
          fetchedRecords = await this.fetchViaCSV();
        } catch (errCSV) {
          console.warn('CSV export fetch juga gagal:', errCSV);
        }
      }
    }

    if (fetchedRecords && fetchedRecords.length > 0) {
      this.records = fetchedRecords;
      localStorage.setItem('presensi_monitoring_data', JSON.stringify(this.records));
      this.updateApiStatusUI(true);
      this.renderDashboard();
      this.updateSyncTime();
      if (isUserAction) {
        this.showToast(`Berhasil menyinkronkan ${this.records.length} data pegawai!`, 'success');
      }
    } else {
      // Jika offline atau jaringan gagal, tetap gunakan cache/default
      this.renderDashboard();
      this.updateSyncTime();
      if (isUserAction) {
        this.showToast('Gagal terhubung ke Google Sheets, menggunakan data tersimpan.', 'warning');
      }
    }

    this.isFetching = false;
    if (this.btnRefresh) {
      setTimeout(() => {
        this.btnRefresh.classList.remove('is-spinning');
      }, 500);
    }
  }

  fetchViaJSONP() {
    return new Promise((resolve, reject) => {
      const callbackName = 'gvizCallback_' + Math.floor(Math.random() * 1000000);
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, 10000);

      function cleanup() {
        clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        delete window[callbackName];
      }

      window[callbackName] = (json) => {
        cleanup();
        if (!json || !json.table || !json.table.rows) {
          reject(new Error('Format GViz JSONP tidak valid'));
          return;
        }
        try {
          const rows = json.table.rows;
          const records = [];
          rows.forEach(r => {
            const cells = r.c || [];
            const getVal = (idx) => {
              if (!cells[idx]) return '';
              if (cells[idx].f !== undefined && cells[idx].f !== null) return String(cells[idx].f).trim();
              if (cells[idx].v !== undefined && cells[idx].v !== null) return String(cells[idx].v).trim();
              return '';
            };

            const timestamp = getVal(0);
            const nama = getVal(1);
            const nip = getVal(2);
            const statusOperasional = getVal(3) || 'Operasional';
            const rawFotoDatang = getVal(4);
            const rawFotoPulang = getVal(5);
            const fotoDatang = this.hasPhoto(rawFotoDatang) ? 'Ada Foto' : 'Tidak ada';
            const fotoPulang = this.hasPhoto(rawFotoPulang) ? 'Ada Foto' : 'Tidak ada';
            const keterangan = getVal(6);

            if (nama) {
              records.push({
                timestamp,
                nama,
                nip,
                statusOperasional,
                fotoDatang,
                fotoPulang,
                keterangan
              });
            }
          });
          resolve(records);
        } catch (err) {
          reject(err);
        }
      };

      script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=responseHandler:${callbackName}&gid=0&_t=${Date.now()}`;
      script.onerror = (err) => {
        cleanup();
        reject(err);
      };
      document.body.appendChild(script);
    });
  }

  async fetchViaGViz() {
    const timestampQuery = new Date().getTime();
    const url = `${GVIZ_URL}&_t=${timestampQuery}`;
    const response = await fetch(url);
    const text = await response.text();

    // GViz mengembalikan: /*O_o*/ google.visualization.Query.setResponse({...});
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
    if (!match || !match[1]) {
      throw new Error('Format GViz tidak valid');
    }

    const json = JSON.parse(match[1]);
    if (!json.table || !json.table.rows) {
      throw new Error('Struktur tabel GViz kosong');
    }

    const rows = json.table.rows;
    const records = [];

    rows.forEach(r => {
      const cells = r.c || [];
      const getVal = (idx) => {
        if (!cells[idx]) return '';
        if (cells[idx].f !== undefined && cells[idx].f !== null) return String(cells[idx].f).trim();
        if (cells[idx].v !== undefined && cells[idx].v !== null) return String(cells[idx].v).trim();
        return '';
      };

      const timestamp = getVal(0);
      const nama = getVal(1);
      const nip = getVal(2);
      const statusOperasional = getVal(3) || 'Operasional';
      const rawFotoDatang = getVal(4);
      const rawFotoPulang = getVal(5);
      const fotoDatang = this.hasPhoto(rawFotoDatang) ? 'Ada Foto' : 'Tidak ada';
      const fotoPulang = this.hasPhoto(rawFotoPulang) ? 'Ada Foto' : 'Tidak ada';
      const keterangan = getVal(6);

      // Hanya masukkan jika ada nama
      if (nama) {
        records.push({
          timestamp,
          nama,
          nip,
          statusOperasional,
          fotoDatang,
          fotoPulang,
          keterangan
        });
      }
    });

    return records;
  }

  async fetchViaCSV() {
    const timestampQuery = new Date().getTime();
    const url = `${CSV_URL}&_t=${timestampQuery}`;
    const response = await fetch(url);
    const text = await response.text();

    const lines = this.parseCSV(text);
    if (lines.length < 2) return [];

    // Header ada di baris pertama
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row || row.length === 0 || !row[1]) continue;

      records.push({
        timestamp: row[0] || '',
        nama: row[1] || '',
        nip: row[2] || '',
        statusOperasional: row[3] || 'Operasional',
        fotoDatang: this.hasPhoto(row[4]) ? 'Ada Foto' : 'Tidak ada',
        fotoPulang: this.hasPhoto(row[5]) ? 'Ada Foto' : 'Tidak ada',
        keterangan: row[6] || ''
      });
    }

    return records;
  }

  parseCSV(text) {
    const lines = [];
    let row = [];
    let insideQuotes = false;
    let entry = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          entry += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(entry.trim());
        entry = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(entry.trim());
        if (row.some(field => field.length > 0)) {
          lines.push(row);
        }
        row = [];
        entry = '';
      } else {
        entry += char;
      }
    }

    if (entry || row.length > 0) {
      row.push(entry.trim());
      if (row.some(field => field.length > 0)) {
        lines.push(row);
      }
    }

    return lines;
  }

  updateApiStatusUI(isConnected = true) {
    if (!this.apiStatusBadge) return;
    if (isConnected) {
      this.apiStatusBadge.className = 'stat-pill-badge bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 sm:px-5 py-2 rounded-full font-extrabold text-xs tracking-wider flex items-center gap-2.5 shadow-md shadow-emerald-500/25 select-none uppercase whitespace-nowrap';
      this.apiStatusBadge.innerHTML = `
        <span class="w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center text-[11px] shadow-sm shrink-0">
          <i class="fas fa-plug"></i>
        </span>
        <span>TERKONEKSI GOOGLE SHEETS</span>
      `;
    }
  }

  updateSyncTime() {
    if (!this.lastSyncTime) return;
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');
    this.lastSyncTime.textContent = timeStr;
  }

  animateValue(element, start, end, duration = 400) {
    if (!element) return;
    if (start === end) {
      element.textContent = end;
      return;
    }
    const startTime = performance.now();
    const step = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);
      element.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        element.textContent = end;
      }
    };
    requestAnimationFrame(step);
  }

  renderDashboard() {
    this.renderTable();
    
    // Update summary counters
    const totalCount = this.records.length;
    const datangCount = this.records.filter(r => this.hasPhoto(r.fotoDatang)).length;
    const pulangCount = this.records.filter(r => this.hasPhoto(r.fotoPulang)).length;

    if (this.statTotalCount) {
      const cur = parseInt(this.statTotalCount.textContent, 10) || 0;
      this.animateValue(this.statTotalCount, cur, totalCount, 450);
    }
    if (this.statDatangCount) {
      const cur = parseInt(this.statDatangCount.textContent, 10) || 0;
      this.animateValue(this.statDatangCount, cur, datangCount, 450);
    }
    if (this.statPulangCount) {
      const cur = parseInt(this.statPulangCount.textContent, 10) || 0;
      this.animateValue(this.statPulangCount, cur, pulangCount, 450);
    }
  }

  getFilteredRecords() {
    return this.records.filter(r => {
      if (!this.searchQuery) return true;
      const nama = (r.nama || '').toLowerCase();
      const status = (r.statusOperasional || '').toLowerCase();
      const ket = (r.keterangan || '').toLowerCase();
      const time = (r.timestamp || '').toLowerCase();
      return nama.includes(this.searchQuery) || status.includes(this.searchQuery) || ket.includes(this.searchQuery) || time.includes(this.searchQuery);
    });
  }

  renderTable() {
    if (!this.tableBody) return;

    const filtered = this.getFilteredRecords();

    if (filtered.length === 0) {
      this.tableBody.innerHTML = '';
      if (this.emptyState) this.emptyState.classList.remove('hidden');
      return;
    }

    if (this.emptyState) this.emptyState.classList.add('hidden');
    let html = '';

    filtered.forEach((r, idx) => {
      const delayMs = Math.min(idx * 40, 400);

      // Foto Datang Indicator (Ada Foto / x) - Confidential / Non-clickable
      const isDatangAda = this.hasPhoto(r.fotoDatang);
      const fotoDatangHtml = isDatangAda
        ? `<span class="photo-status-badge has-photo" title="Ada Foto">
             <span class="badge-icon"><i class="fas fa-check"></i></span>
             <span>Ada Foto</span>
           </span>`
        : `<span class="photo-status-badge no-photo" title="Tidak Ada Foto">
             <span class="badge-icon"><i class="fas fa-xmark"></i></span>
             <span>x</span>
           </span>`;

      // Foto Pulang Indicator (Ada Foto / x) - Confidential / Non-clickable
      const isPulangAda = this.hasPhoto(r.fotoPulang);
      const fotoPulangHtml = isPulangAda
        ? `<span class="photo-status-badge has-photo" title="Ada Foto">
             <span class="badge-icon"><i class="fas fa-check"></i></span>
             <span>Ada Foto</span>
           </span>`
        : `<span class="photo-status-badge no-photo" title="Tidak Ada Foto">
             <span class="badge-icon"><i class="fas fa-xmark"></i></span>
             <span>x</span>
           </span>`;

      // Status Operasional Badge
      const statusText = r.statusOperasional || 'Operasional';
      const statusHtml = `
        <span class="status-operasional-pill">
          <span class="status-dot"></span>
          <span>${this.escapeHtml(statusText)}</span>
        </span>
      `;

      // Waktu & Catatan
      const timeStr = r.timestamp ? `<span class="font-mono-code text-[11px] font-semibold text-slate-500 block">${this.escapeHtml(r.timestamp)}</span>` : '';
      const ketStr = r.keterangan ? `<span class="text-xs text-slate-700 font-medium block mt-0.5">${this.escapeHtml(r.keterangan)}</span>` : '<span class="text-xs text-slate-400 italic">-</span>';

      html += `
        <tr class="table-row-item border-b border-[var(--border-subtle)]" style="animation-delay: ${delayMs}ms;">
          
          <!-- Nomor Urut -->
          <td class="w-12 px-2 sm:px-4 py-3 sm:py-4 text-center">
            <span class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg font-mono-code text-[11px] sm:text-xs font-bold border" style="background: var(--surface-secondary); color: var(--text-tertiary); border-color: var(--border-subtle);">${idx + 1}</span>
          </td>

          <!-- KOLOM 1: NAMA LENGKAP -->
          <td class="w-1/3 min-w-[180px] sm:min-w-[220px] px-3 sm:px-6 py-3 sm:py-4">
            <div class="flex items-center gap-2.5 sm:gap-3">
              <span class="row-avatar-icon inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-blue-500/25 shrink-0 transition-all duration-300">
                <i class="fas fa-user"></i>
              </span>
              <div>
                <span class="font-bold text-xs sm:text-sm tracking-tight block" style="color: var(--text-primary);">${this.escapeHtml(r.nama || '-')}</span>
              </div>
            </div>
          </td>

          <!-- KOLOM 2: STATUS OPERASIONAL -->
          <td class="w-36 sm:w-44 min-w-[140px] sm:min-w-[170px] px-3 sm:px-5 py-3 sm:py-4">
            ${statusHtml}
          </td>

          <!-- KOLOM 3: FOTO DATANG (CEKLIS / X) -->
          <td class="w-32 sm:w-40 min-w-[120px] sm:min-w-[150px] px-2 sm:px-5 py-3 sm:py-4 text-center">
            ${fotoDatangHtml}
          </td>

          <!-- KOLOM 4: FOTO PULANG (CEKLIS / X) -->
          <td class="w-32 sm:w-40 min-w-[120px] sm:min-w-[150px] px-2 sm:px-5 py-3 sm:py-4 text-center">
            ${fotoPulangHtml}
          </td>

          <!-- KOLOM 5: WAKTU & CATATAN -->
          <td class="min-w-[160px] sm:min-w-[200px] px-3 sm:px-6 py-3 sm:py-4">
            <div class="space-y-0.5">
              ${timeStr}
              ${ketStr}
            </div>
          </td>

        </tr>
      `;
    });

    this.tableBody.innerHTML = html;
  }

  showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    let bgColors = 'bg-white border-blue-200 text-slate-800';
    let icon = '<i class="fas fa-info-circle text-blue-500"></i>';

    if (type === 'success') {
      bgColors = 'bg-emerald-50 border-emerald-200 text-emerald-900';
      icon = '<i class="fas fa-check-circle text-emerald-600"></i>';
    } else if (type === 'error') {
      bgColors = 'bg-rose-50 border-rose-200 text-rose-900';
      icon = '<i class="fas fa-exclamation-triangle text-rose-600"></i>';
    } else if (type === 'warning') {
      bgColors = 'bg-amber-50 border-amber-200 text-amber-900';
      icon = '<i class="fas fa-exclamation-circle text-amber-600"></i>';
    }

    toast.className = `p-3.5 rounded-xl shadow-xl flex items-center gap-3 border ${bgColors} transition-all duration-300 transform translate-y-2 opacity-0 max-w-md pointer-events-auto`;
    toast.innerHTML = `
      ${icon}
      <span class="text-xs font-medium">${this.escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new DataReaderApp();
});
