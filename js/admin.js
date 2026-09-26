// ============================================================
// admin.js - Sistem Absensi SMP Al-Miftah
// Logic halaman Admin Panel
// ============================================================

let rekapData = [];
let deleteId = null;

// ============================================================
// 1. Tab Navigation
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Hapus active dari semua tab dan pane
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        // Aktifkan tab yang diklik
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const pane = document.getElementById('tab-' + tabId);
        if (pane) pane.classList.add('active');

        // Load data sesuai tab
        if (tabId === 'dashboard') loadDashboardStats();
        if (tabId === 'guru') loadGuru();
        if (tabId === 'siswa') loadSiswa();
    });
});

// ============================================================
// Helper Functions
// ============================================================
function formatRole(role) {
    return role === 'guru' ? 'Guru' : 'Siswa';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
}

// ============================================================
// 8. Toast Notifications (custom, tanpa Bootstrap)
// ============================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    // Auto remove setelah 3 detik
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================================
// 2. Dashboard Tab
// ============================================================
let dashboardUnsubscribe = null;

function loadDashboardStats() {
    const today = getTodayString();

    // Total users terdaftar
    db.collection('users').get().then(snap => {
        const el = document.getElementById('statTotal');
        if (el) el.textContent = snap.size;

        // Hitung belum absen setelah attendance dimuat
        updateBelumAbsen(snap.size);
    }).catch(err => console.error('Error load total users:', err));

    // Absensi hari ini (real-time)
    if (dashboardUnsubscribe) dashboardUnsubscribe();

    dashboardUnsubscribe = db.collection('attendance')
        .where('date', '==', today)
        .onSnapshot(snap => {
            let hadir = 0;
            let lambat = 0;
            const tbody = document.getElementById('todayBody');
            if (tbody) tbody.innerHTML = '';

            let no = 1;
            snap.forEach(doc => {
                const data = doc.data();
                if (data.statusMasuk === 'hadir') hadir++;
                if (data.statusMasuk === 'lambat') lambat++;

                if (tbody) {
                    const statusClass = data.statusMasuk === 'hadir' ? 'badge-hadir' : 'badge-lambat';
                    const statusText = data.statusMasuk === 'hadir' ? 'Hadir' : 'Lambat';
                    const roleBadgeClass = data.userRole === 'guru' ? 'badge-guru' : 'badge-siswa';

                    tbody.innerHTML += `
                        <tr>
                            <td>${no++}</td>
                            <td>${data.userName}</td>
                            <td><span class="badge ${roleBadgeClass}">${formatRole(data.userRole)}</span></td>
                            <td>${data.userKelas || '-'}</td>
                            <td>${data.checkIn || '-'}</td>
                            <td>${data.checkOut || '-'}</td>
                            <td><span class="badge ${statusClass}">${statusText}</span></td>
                        </tr>
                    `;
                }
            });

            const elHadir = document.getElementById('statHadir');
            const elLambat = document.getElementById('statLambat');
            if (elHadir) elHadir.textContent = hadir;
            if (elLambat) elLambat.textContent = lambat;

            // Update belum absen
            db.collection('users').get().then(usersSnap => {
                updateBelumAbsen(usersSnap.size, hadir + lambat);
            });

            if (snap.empty && tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-secondary); padding: 2rem;">Belum ada data absensi hari ini</td></tr>';
            }
        }, err => console.error('Error load dashboard:', err));
}

function updateBelumAbsen(totalUsers, totalAbsen = 0) {
    const el = document.getElementById('statBelum');
    if (el) el.textContent = Math.max(0, totalUsers - totalAbsen);
}

// ============================================================
// 3. Guru Tab
// ============================================================
let guruUnsubscribe = null;
let allGuruData = [];

function loadGuru() {
    if (guruUnsubscribe) guruUnsubscribe();

    guruUnsubscribe = db.collection('users').where('role', '==', 'guru').onSnapshot(snap => {
        allGuruData = [];
        snap.forEach(doc => {
            allGuruData.push({ id: doc.id, ...doc.data() });
        });
        renderGuru(allGuruData);
    }, err => console.error('Error load guru:', err));
}

function renderGuru(data) {
    const tbody = document.getElementById('guruBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 2rem;">Belum ada data guru</td></tr>';
        return;
    }

    data.forEach((guru, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${guru.name}</td>
                <td>${guru.nip || '-'}</td>
                <td><code style="color: var(--accent);">${guru.rfidTag}</code></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete('${guru.id}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    });
}

// Search guru
document.getElementById('searchGuru')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allGuruData.filter(g =>
        g.name.toLowerCase().includes(query) ||
        (g.nip && g.nip.toLowerCase().includes(query))
    );
    renderGuru(filtered);
});

// ============================================================
// 4. Siswa Tab
// ============================================================
let siswaUnsubscribe = null;
let allSiswaData = [];

function loadSiswa() {
    if (siswaUnsubscribe) siswaUnsubscribe();

    siswaUnsubscribe = db.collection('users').where('role', '==', 'siswa').onSnapshot(snap => {
        allSiswaData = [];
        const kelasSet = new Set();

        snap.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            allSiswaData.push(data);
            if (data.kelas) kelasSet.add(data.kelas);
        });

        // Populate filter kelas
        const filter = document.getElementById('filterKelas');
        if (filter) {
            const currentVal = filter.value;
            filter.innerHTML = '<option value="">Semua Kelas</option>';
            Array.from(kelasSet).sort().forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = k;
                filter.appendChild(opt);
            });
            filter.value = currentVal;
        }

        renderSiswa(allSiswaData);
    }, err => console.error('Error load siswa:', err));
}

function renderSiswa(data) {
    const tbody = document.getElementById('siswaBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-secondary); padding: 2rem;">Belum ada data siswa</td></tr>';
        return;
    }

    data.forEach((siswa, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${siswa.name}</td>
                <td>${siswa.nis || '-'}</td>
                <td>${siswa.kelas || '-'}</td>
                <td><code style="color: var(--accent);">${siswa.rfidTag}</code></td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="confirmDelete('${siswa.id}')">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
    });
}

// Search siswa
document.getElementById('searchSiswa')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterAndRenderSiswa(query);
});

// Filter kelas
document.getElementById('filterKelas')?.addEventListener('change', () => {
    const query = document.getElementById('searchSiswa')?.value.toLowerCase() || '';
    filterAndRenderSiswa(query);
});

function filterAndRenderSiswa(searchQuery) {
    const kelasFilter = document.getElementById('filterKelas')?.value || '';
    const filtered = allSiswaData.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchQuery) ||
            (s.nis && s.nis.toLowerCase().includes(searchQuery));
        const matchKelas = !kelasFilter || s.kelas === kelasFilter;
        return matchSearch && matchKelas;
    });
    renderSiswa(filtered);
}

// ============================================================
// 5. Register Tab
// ============================================================
const regRole = document.getElementById('regRole');
const nipGroup = document.getElementById('nipGroup');
const nisGroup = document.getElementById('nisGroup');
const kelasGroup = document.getElementById('kelasGroup');

if (regRole) {
    regRole.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'guru') {
            if (nipGroup) nipGroup.style.display = 'block';
            if (nisGroup) nisGroup.style.display = 'none';
            if (kelasGroup) kelasGroup.style.display = 'none';
        } else if (val === 'siswa') {
            if (nipGroup) nipGroup.style.display = 'none';
            if (nisGroup) nisGroup.style.display = 'block';
            if (kelasGroup) kelasGroup.style.display = 'block';
        } else {
            if (nipGroup) nipGroup.style.display = 'none';
            if (nisGroup) nisGroup.style.display = 'none';
            if (kelasGroup) kelasGroup.style.display = 'none';
        }
    });
}

const regForm = document.getElementById('registerForm');
if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const role = document.getElementById('regRole').value;
        const name = document.getElementById('regName').value.trim();
        const rfidTag = document.getElementById('regRfid').value.trim();

        if (!role || !name || !rfidTag) {
            showToast('Mohon lengkapi semua field yang wajib', 'warning');
            return;
        }

        let nip = '', nis = '', kelas = '';
        if (role === 'guru') {
            nip = document.getElementById('regNip')?.value.trim() || '';
        } else {
            nis = document.getElementById('regNis')?.value.trim() || '';
            kelas = document.getElementById('regKelas')?.value.trim() || '';
        }

        try {
            // Cek duplikat RFID
            const check = await db.collection('users').where('rfidTag', '==', rfidTag).get();
            if (!check.empty) {
                showToast('RFID Tag sudah terdaftar! Gunakan kartu lain.', 'error');
                return;
            }

            // Simpan user baru
            await db.collection('users').add({
                name, role, rfidTag, nip, nis, kelas,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast(`${formatRole(role)} "${name}" berhasil didaftarkan!`, 'success');
            regForm.reset();

            // Reset visibility
            if (nipGroup) nipGroup.style.display = 'none';
            if (nisGroup) nisGroup.style.display = 'none';
            if (kelasGroup) kelasGroup.style.display = 'none';

        } catch (err) {
            console.error('Error register:', err);
            showToast('Terjadi kesalahan saat menyimpan data', 'error');
        }
    });
}

// Tangkap RFID scan pada field registrasi
const regRfid = document.getElementById('regRfid');
if (regRfid) {
    regRfid.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Jangan auto-submit, biarkan user klik Simpan
        }
    });
}

// ============================================================
// 6. Rekap Tab
// ============================================================
document.getElementById('btnLoadRekap')?.addEventListener('click', async () => {
    const from = document.getElementById('rekapFrom')?.value;
    const to = document.getElementById('rekapTo')?.value;
    const role = document.getElementById('rekapRole')?.value;

    if (!from || !to) {
        showToast('Pilih rentang tanggal terlebih dahulu', 'warning');
        return;
    }

    if (from > to) {
        showToast('Tanggal awal harus sebelum tanggal akhir', 'warning');
        return;
    }

    try {
        let query = db.collection('attendance')
            .where('date', '>=', from)
            .where('date', '<=', to)
            .orderBy('date', 'desc');

        const snap = await query.get();
        rekapData = [];

        const tbody = document.getElementById('rekapBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        let no = 1;
        snap.forEach(doc => {
            const data = doc.data();
            // Filter berdasarkan role jika dipilih
            if (role && data.userRole !== role) return;

            rekapData.push(data);
            const statusClass = data.statusMasuk === 'hadir' ? 'badge-hadir' : 'badge-lambat';
            const statusText = data.statusMasuk === 'hadir' ? 'Hadir' : 'Lambat';
            const roleBadgeClass = data.userRole === 'guru' ? 'badge-guru' : 'badge-siswa';

            tbody.innerHTML += `
                <tr>
                    <td>${no++}</td>
                    <td>${formatDate(data.date)}</td>
                    <td>${data.userName}</td>
                    <td><span class="badge ${roleBadgeClass}">${formatRole(data.userRole)}</span></td>
                    <td>${data.userKelas || '-'}</td>
                    <td>${data.checkIn || '-'}</td>
                    <td>${data.checkOut || '-'}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        });

        if (rekapData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--text-secondary); padding: 2rem;">Data tidak ditemukan untuk periode ini</td></tr>';
        } else {
            showToast(`Ditemukan ${rekapData.length} data absensi`, 'info');
        }
    } catch (err) {
        console.error('Error load rekap:', err);
        showToast('Gagal memuat data rekap. Pastikan index Firestore sudah dibuat.', 'error');
    }
});

// ============================================================
// Export ke Excel (.xlsx)
// ============================================================
document.getElementById('btnExportXlsx')?.addEventListener('click', () => {
    if (rekapData.length === 0) {
        showToast('Tidak ada data untuk diekspor. Tampilkan rekap terlebih dahulu.', 'warning');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showToast('Library SheetJS belum dimuat. Periksa koneksi internet.', 'error');
        return;
    }

    // Header
    const wsData = [
        ['REKAP ABSENSI SMP AL-MIFTAH'],
        [`Periode: ${document.getElementById('rekapFrom')?.value || ''} s/d ${document.getElementById('rekapTo')?.value || ''}`],
        [],
        ['No', 'Tanggal', 'Nama', 'Role', 'Kelas/NIP', 'Jam Masuk', 'Jam Pulang', 'Status']
    ];

    rekapData.forEach((d, i) => {
        wsData.push([
            i + 1,
            formatDate(d.date),
            d.userName,
            formatRole(d.userRole),
            d.userKelas || '-',
            d.checkIn || '-',
            d.checkOut || '-',
            d.statusMasuk === 'hadir' ? 'Hadir' : 'Lambat'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge header title
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];

    // Auto width kolom
    ws['!cols'] = [
        { wch: 5 }, { wch: 14 }, { wch: 28 }, { wch: 10 },
        { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absensi');

    const dateStr = getTodayString();
    XLSX.writeFile(wb, `Rekap_Absensi_SMP_AlMiftah_${dateStr}.xlsx`);

    showToast('File Excel berhasil didownload!', 'success');
});

// ============================================================
// Export ke CSV (untuk Google Sheets)
// ============================================================
document.getElementById('btnExportGsheet')?.addEventListener('click', () => {
    if (rekapData.length === 0) {
        showToast('Tidak ada data untuk diekspor. Tampilkan rekap terlebih dahulu.', 'warning');
        return;
    }

    // Buat CSV content
    let csvContent = '\uFEFF'; // BOM untuk UTF-8
    csvContent += 'No,Tanggal,Nama,Role,Kelas/NIP,Jam Masuk,Jam Pulang,Status\n';

    rekapData.forEach((d, i) => {
        const row = [
            i + 1,
            formatDate(d.date),
            `"${d.userName}"`, // Quote untuk handle koma dalam nama
            formatRole(d.userRole),
            `"${d.userKelas || '-'}"`,
            d.checkIn || '-',
            d.checkOut || '-',
            d.statusMasuk === 'hadir' ? 'Hadir' : 'Lambat'
        ];
        csvContent += row.join(',') + '\n';
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_Absensi_SMP_AlMiftah_${getTodayString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('File CSV berhasil didownload! Buka dengan Google Sheets.', 'success');
});

// ============================================================
// 7. Delete Functionality (Custom Modal)
// ============================================================
window.confirmDelete = function (id) {
    deleteId = id;
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.style.display = 'flex';
    }
};

// Konfirmasi hapus
document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
    if (!deleteId) return;

    try {
        await db.collection('users').doc(deleteId).delete();
        showToast('Data berhasil dihapus', 'success');
        closeDeleteModal();
        deleteId = null;
    } catch (err) {
        console.error('Error delete:', err);
        showToast('Gagal menghapus data', 'error');
    }
});

// Batal hapus
document.getElementById('btnCancelDelete')?.addEventListener('click', () => {
    closeDeleteModal();
});

// Tutup modal dengan klik overlay
document.getElementById('deleteModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'deleteModal') {
        closeDeleteModal();
    }
});

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.style.display = 'none';
    deleteId = null;
}

// ============================================================
// Inisialisasi saat DOM ready
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Set default tanggal rekap
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const rekapFrom = document.getElementById('rekapFrom');
    const rekapTo = document.getElementById('rekapTo');

    if (rekapFrom) rekapFrom.value = firstDay.toISOString().split('T')[0];
    if (rekapTo) rekapTo.value = getTodayString();

    // Load dashboard (tab default)
    loadDashboardStats();
});
