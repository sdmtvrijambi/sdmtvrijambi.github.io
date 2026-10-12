/**
 * DataTables Configuration and Updates
 * - dengan animasi stagger reveal per baris pada setiap draw
 */

let dataTableInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    initTable();

    // Hubungkan kotak pencarian custom ke pencarian DataTables
    const searchInput = document.getElementById('custom-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', function () {
            if (dataTableInstance) {
                dataTableInstance.search(this.value).draw();
            }
        });
    }

    // Tombol Export custom
    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            if (dataTableInstance) {
                dataTableInstance.button('.buttons-excel').trigger();
            }
        });
    }

    // Tombol Columns custom
    const btnColumns = document.getElementById('btn-columns');
    if (btnColumns) {
        btnColumns.addEventListener('click', () => {
            if (dataTableInstance) {
                dataTableInstance.button('.buttons-colvis').trigger();
            }
        });
    }
});

function initTable() {
    dataTableInstance = $('#skpTable').DataTable({
        dom: '<"top"B>rt<"bottom"lip><"clear">',
        pageLength: 25,
        buttons: [
            {
                extend: 'excelHtml5',
                className: 'hidden-btn',
                title: 'Data Monitoring SKP TVRI Jambi'
            },
            {
                extend: 'colvis',
                className: 'hidden-btn'
            }
        ],
        language: {
            search: "Cari:",
            lengthMenu: "_MENU_ / halaman",
            info: "Menampilkan _START_ - _END_ dari _TOTAL_ data",
            infoEmpty: "Menampilkan 0 - 0 dari 0 data",
            infoFiltered: "(disaring dari _MAX_ data)",
            paginate: {
                first: "«",
                last: "»",
                next: "›",
                previous: "‹"
            },
            emptyTable: "Tidak ada data tersedia di tabel",
            zeroRecords: "Tidak ditemukan data yang cocok"
        },
        columns: [
            { data: 'no', className: 'col-no' },
            { data: 'nama', className: 'col-nama' },
            { data: 'tm_kerja', className: 'col-tmkerja' },
            { data: 'jabatan', className: 'col-jabatan' },
            {
                data: 'status',
                className: 'col-status',
                render: function (data, type, row) {
                    let badgeClass = '';
                    let dotColor = '';
                    const statusLow = (data || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    // 'tidak sesuai', 'kurang', 'proses', 'persetujuan', 'revisi', 'dinilai' (Belum Dinilai KPP) -> warning (badge kuning)
                    if (statusLow.includes('tidak') || statusLow.includes('kurang') || statusLow.includes('proses') || statusLow.includes('persetujuan') || statusLow.includes('revisi') || statusLow.includes('dinilai')) {
                        badgeClass = 'status-belum-lengkap';
                        dotColor = 'dot-warning';
                    } else if (statusLow.includes('sesuai')) {
                        badgeClass = 'status-sesuai';
                        dotColor = 'dot-success';
                    } else {
                        badgeClass = 'status-belum-upload';
                        dotColor = 'dot-danger';
                    }

                    return `<span class="status-badge ${badgeClass}"><span class="status-dot ${dotColor}"></span>${data}</span>`;
                }
            },
            { data: 'keterangan', className: 'col-keterangan' }
        ],
        // Stagger reveal setiap baris pada tiap draw (search / paginasi / update data)
        drawCallback: function () {
            const rows = this.api().rows({ page: 'current' }).nodes().toArray();
            rows.forEach(function (row, i) {
                row.classList.remove('row-in');
                row.style.setProperty('--row-i', Math.min(i, 16));
            });
            // force reflow sekali agar animasi bisa restart, lalu animasikan seluruh baris
            if (rows.length) void rows[0].offsetWidth;
            rows.forEach(function (row) {
                row.classList.add('row-in');
            });
        }
    });

    // Ekspos untuk modul lain (effects.js melakukan columns.adjust saat reveal)
    window.dataTableInstance = dataTableInstance;

    // Sembunyikan container tombol default (dipicu lewat tombol custom)
    $('.dt-buttons').hide();
}

// Dengarkan pembaruan data
document.addEventListener('skpDataUpdated', (e) => {
    const data = e.detail.data;
    updateTable(data);
});

function updateTable(data) {
    if (!dataTableInstance) return;

    // Bersihkan dan gambar ulang dengan data baru secara mulus
    dataTableInstance.clear();
    dataTableInstance.rows.add(data);

    // Draw tanpa mereset paginasi
    dataTableInstance.draw(false);
}
