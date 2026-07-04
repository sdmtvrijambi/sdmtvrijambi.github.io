/**
 * DataTables Configuration and Updates
 */

let dataTableInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    initTable();
    
    // Connect custom search box to DataTables search
    const searchInput = document.getElementById('custom-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            if (dataTableInstance) {
                dataTableInstance.search(this.value).draw();
            }
        });
    }

    // Connect custom Export button
    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            if (dataTableInstance) {
                dataTableInstance.button('.buttons-excel').trigger();
            }
        });
    }

    // Connect custom Columns button
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
        // layout: info and pagination at the bottom, no default search/length at top since we built custom ones
        dom: '<"top"B>rt<"bottom"lip><"clear">',
        pageLength: 25,
        buttons: [
            {
                extend: 'excelHtml5',
                className: 'hidden-btn', // We hide the default button and trigger it via custom button
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
                render: function(data, type, row) {
                    let badgeClass = '';
                    let dotColor = '';
                    const statusLow = (data || '').toLowerCase().replace(/\s+/g, ' ').trim();
                    // Categorize 'tidak sesuai', 'kurang', 'proses', 'persetujuan', 'revisi' as warning (yellow badge)
                    if (statusLow.includes('tidak') || statusLow.includes('kurang') || statusLow.includes('proses') || statusLow.includes('persetujuan') || statusLow.includes('revisi')) {
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
        ]
    });

    // Hide default buttons container since we use our custom buttons to trigger them
    $('.dt-buttons').hide();
}

// Listen for data updates
document.addEventListener('skpDataUpdated', (e) => {
    const data = e.detail.data;
    updateTable(data);
});

function updateTable(data) {
    if (!dataTableInstance) return;

    // Save current pagination and sorting state
    const currentPage = dataTableInstance.page();
    
    // Clear and redraw with new data seamlessly
    dataTableInstance.clear();
    dataTableInstance.rows.add(data);
    
    // Draw without resetting pagination
    dataTableInstance.draw(false);
}
