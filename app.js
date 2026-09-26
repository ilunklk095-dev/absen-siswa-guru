// ============================================================
// app.js - Sistem Absensi SMP Al-Miftah
// Logic utama halaman scanner absensi RFID
// ============================================================

let currentMode = 'masuk'; // 'masuk' atau 'pulang'
let manualMode = false;

// ============================================================
// 1. Update Jam & Tanggal
// ============================================================
function updateClock() {
    const now = new Date();

    // Update waktu
    document.getElementById('clockTime').textContent = getCurrentTimeString();

    // Update tanggal dalam Bahasa Indonesia
    const dayName = HARI[now.getDay()];
    const date = now.getDate();
    const monthName = BULAN[now.getMonth()];
    const year = now.getFullYear();
    document.getElementById('clockDate').textContent = `${dayName}, ${date} ${monthName} ${year}`;

    // 2. Deteksi mode otomatis berdasarkan waktu
    if (!manualMode) {
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Sebelum 10:55 = mode masuk, setelahnya = mode pulang
        if (hour < 10 || (hour === 10 && minute < 55)) {
            setMode('masuk');
        } else {
            setMode('pulang');
        }
    }
}

// Set mode masuk/pulang
function setMode(mode) {
    if (currentMode === mode) return; // Hindari update berulang
    currentMode = mode;
    const modeBadge = document.getElementById('modeBadge');
    const modeText = document.getElementById('modeText');
    const modeIcon = modeBadge.querySelector('i');

    if (mode === 'masuk') {
        modeBadge.className = 'mode-badge mode-masuk';
        modeText.textContent = 'MODE MASUK';
        modeIcon.className = 'fas fa-sign-in-alt';
    } else {
        modeBadge.className = 'mode-badge mode-pulang';
        modeText.textContent = 'MODE PULANG';
        modeIcon.className = 'fas fa-sign-out-alt';
    }
}

// Toggle mode secara manual dengan klik badge
document.getElementById('modeBadge').addEventListener('click', () => {
    manualMode = true;
    const newMode = currentMode === 'masuk' ? 'pulang' : 'masuk';
    currentMode = ''; // Reset agar setMode bisa update
    setMode(newMode);
});

// Mulai jam
setInterval(updateClock, 1000);
// Inisialisasi pertama
currentMode = ''; // Reset agar setMode pertama bisa set
updateClock();

// ============================================================
// 3. RFID Input Handler
// ============================================================
const rfidInput = document.getElementById('rfidInput');

// Selalu fokuskan input RFID
function refocus() {
    if (rfidInput) {
        setTimeout(() => rfidInput.focus(), 100);
    }
}
document.addEventListener('click', refocus);
if (rfidInput) rfidInput.addEventListener('blur', () => setTimeout(refocus, 200));
refocus();

// Tangkap input dari RFID reader (mengirim karakter + Enter)
if (rfidInput) {
    rfidInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = rfidInput.value.trim();
            rfidInput.value = '';
            if (tag) {
                processRFID(tag);
            }
        }
    });
}

// ============================================================
// 4. Proses RFID Tag
// ============================================================
async function processRFID(rfidTag) {
    try {
        // Cari user berdasarkan RFID tag
        const userQuery = await db.collection('users').where('rfidTag', '==', rfidTag).get();

        if (userQuery.empty) {
            showResult('error', 'Kartu Tidak Terdaftar', 'Kartu RFID belum didaftarkan dalam sistem', '', '');
            return;
        }

        const userDoc = userQuery.docs[0];
        const user = userDoc.data();
        const userId = userDoc.id;
        const today = getTodayString();
        const nowTime = getCurrentTimeString();

        // Format info role untuk ditampilkan
        const roleInfo = user.role === 'guru'
            ? `Guru${user.nip ? ' - ' + user.nip : ''}`
            : `Siswa${user.kelas ? ' - Kelas ' + user.kelas : ''}`;
        const roleBadgeClass = user.role === 'guru' ? 'badge-guru' : 'badge-siswa';

        // Cek attendance hari ini
        const attendanceQuery = await db.collection('attendance')
            .where('userId', '==', userId)
            .where('date', '==', today)
            .get();

        if (currentMode === 'masuk') {
            // === MODE MASUK ===
            if (!attendanceQuery.empty) {
                const attData = attendanceQuery.docs[0].data();
                if (attData.checkIn) {
                    // Sudah absen masuk → tolak
                    showResult('warning', user.name, 'Sudah Absen Masuk!', roleInfo, attData.checkIn, roleBadgeClass);
                    return;
                }
            }

            // Tentukan status: hadir jika sebelum 09:00, lambat jika setelahnya
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes();
            let status = 'lambat';
            if (h < 9 || (h === 9 && m === 0)) {
                status = 'hadir';
            }

            // Simpan record absensi masuk
            await db.collection('attendance').add({
                userId: userId,
                rfidTag: rfidTag,
                userName: user.name,
                userRole: user.role,
                userKelas: user.kelas || user.nip || '',
                date: today,
                checkIn: nowTime,
                checkOut: null,
                statusMasuk: status,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            const statusMsg = status === 'lambat' ? 'Terlambat!' : 'Absensi Masuk Berhasil';
            showResult(
                status === 'lambat' ? 'warning' : 'success',
                user.name, statusMsg, roleInfo, nowTime, roleBadgeClass, status
            );

        } else {
            // === MODE PULANG ===
            if (attendanceQuery.empty) {
                showResult('error', user.name, 'Belum Absen Masuk!', roleInfo, '', roleBadgeClass);
                return;
            }

            const attDoc = attendanceQuery.docs[0];
            const attData = attDoc.data();

            if (!attData.checkIn) {
                showResult('error', user.name, 'Belum Absen Masuk!', roleInfo, '', roleBadgeClass);
                return;
            }

            if (attData.checkOut) {
                // Sudah absen pulang → tolak
                showResult('warning', user.name, 'Sudah Absen Pulang!', roleInfo, attData.checkOut, roleBadgeClass);
                return;
            }

            // Update record dengan jam pulang
            await db.collection('attendance').doc(attDoc.id).update({
                checkOut: nowTime
            });

            showResult('success', user.name, 'Absensi Pulang Berhasil', roleInfo, nowTime, roleBadgeClass);
        }
    } catch (error) {
        console.error('Error processing RFID:', error);
        showResult('error', 'Error Sistem', 'Terjadi kesalahan. Periksa koneksi internet.', '', '');
    } finally {
        refocus();
    }
}

// ============================================================
// 5. Tampilkan Hasil Scan
// ============================================================
let hideTimeout;

function showResult(type, name, message, roleInfo, time, roleBadgeClass = '', status = '') {
    const resultSection = document.getElementById('resultSection');
    const resultCard = document.getElementById('resultCard');
    const resultIcon = document.getElementById('resultIcon');

    if (!resultSection) return;

    // Hapus timeout sebelumnya
    if (hideTimeout) clearTimeout(hideTimeout);

    // Tampilkan section
    resultSection.style.display = 'block';

    // Set class card sesuai tipe
    resultCard.className = `result-card glass-card result-${type}`;

    // Set icon sesuai tipe
    const iconMap = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    resultIcon.innerHTML = `<i class="fas ${iconMap[type] || iconMap.error}"></i>`;

    // Update info
    document.getElementById('resultName').textContent = name;
    document.getElementById('resultMessage').textContent = message;
    document.getElementById('resultTime').textContent = time;

    // Set role badge
    const resultRole = document.getElementById('resultRole');
    resultRole.textContent = roleInfo;
    resultRole.className = `result-role-badge ${roleBadgeClass}`;

    // Set status badge
    const resultStatus = document.getElementById('resultStatus');
    if (status) {
        const statusClass = status === 'hadir' ? 'badge-hadir' : 'badge-lambat';
        const statusText = status === 'hadir' ? 'HADIR' : 'TERLAMBAT';
        resultStatus.innerHTML = `<span class="${statusClass}">${statusText}</span>`;
    } else {
        resultStatus.innerHTML = '';
    }

    // Animasi masuk - re-trigger
    resultCard.style.animation = 'none';
    resultCard.offsetHeight; // Force reflow
    resultCard.style.animation = 'slideUp 0.5s ease-out';

    // Auto-hide setelah 5 detik
    hideTimeout = setTimeout(() => {
        resultSection.style.display = 'none';
    }, 5000);
}

// ============================================================
// 6. Load Aktivitas Hari Ini (Real-time)
// ============================================================
function loadTodayActivity() {
    const today = getTodayString();
    const list = document.getElementById('activityList');
    if (!list) return;

    db.collection('attendance')
        .where('date', '==', today)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                list.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>Belum ada aktivitas hari ini</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();

                // Tentukan icon & warna berdasarkan status
                let iconClass = 'icon-masuk';
                let iconName = 'fa-sign-in-alt';
                let typeLabel = 'Masuk';

                if (data.checkOut) {
                    iconClass = 'icon-pulang';
                    iconName = 'fa-sign-out-alt';
                    typeLabel = 'Pulang';
                }
                if (data.statusMasuk === 'lambat' && !data.checkOut) {
                    iconClass = 'icon-lambat';
                    iconName = 'fa-clock';
                }

                const timeDisplay = data.checkOut || data.checkIn || '-';
                const roleBadgeClass = data.userRole === 'guru' ? 'badge-guru' : 'badge-siswa';
                const roleLabel = data.userRole === 'guru' ? 'Guru' : 'Siswa';
                const statusBadge = data.statusMasuk === 'hadir'
                    ? '<span class="badge badge-hadir">Hadir</span>'
                    : '<span class="badge badge-lambat">Lambat</span>';

                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon ${iconClass}">
                        <i class="fas ${iconName}"></i>
                    </div>
                    <div class="activity-info">
                        <div class="activity-name">${data.userName}</div>
                        <div class="activity-detail">
                            <span class="badge ${roleBadgeClass}">${roleLabel}</span>
                            ${statusBadge}
                            <span style="margin-left: 0.5rem;">${typeLabel}</span>
                        </div>
                    </div>
                    <div class="activity-time">${timeDisplay}</div>
                `;
                list.appendChild(item);
            });

            // Update quick stats juga
            loadTodayStats(snapshot);
        }, (error) => {
            console.error('Error loading activity:', error);
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error memuat data. Periksa koneksi & konfigurasi Firebase.</p>
                </div>
            `;
        });
}

// ============================================================
// 7. Load Quick Stats Hari Ini
// ============================================================
function loadTodayStats(attendanceSnapshot) {
    let hadir = 0;
    let lambat = 0;

    if (attendanceSnapshot) {
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.statusMasuk === 'hadir') hadir++;
            if (data.statusMasuk === 'lambat') lambat++;
        });
    }

    const elHadir = document.getElementById('quickStatHadir');
    const elLambat = document.getElementById('quickStatLambat');

    if (elHadir) elHadir.textContent = hadir;
    if (elLambat) elLambat.textContent = lambat;

    // Hitung belum absen: total users - (hadir + lambat)
    db.collection('users').get().then(usersSnap => {
        const total = usersSnap.size;
        const belum = total - hadir - lambat;
        const elBelum = document.getElementById('quickStatBelum');
        if (elBelum) elBelum.textContent = Math.max(0, belum);
    }).catch(err => {
        console.error('Error loading user count:', err);
    });
}

// ============================================================
// Inisialisasi saat DOM ready
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    loadTodayActivity();
});
