# 🏫 Sistem Absensi SMP Al-Miftah

Modern school attendance system using RFID USB reader, Firebase Firestore, and hosted on GitHub Pages.

## ✨ Fitur
- Absensi RFID otomatis via USB
- Absensi masuk & pulang (07:00-09:00 masuk, 10:55-12:00 pulang)
- Deteksi otomatis mode masuk/pulang
- Cegah absen ganda
- Status hadir/terlambat
- Dashboard admin real-time
- Manajemen data guru & siswa
- Rekap absensi dengan filter tanggal
- Download rekap ke Excel (.xlsx)
- Export ke Google Sheets
- Tampilan modern dark theme
- Responsive (desktop & mobile)

## 🛠️ Teknologi
- HTML5, CSS3, JavaScript (Vanilla)
- Firebase Firestore (database)
- SheetJS (export Excel)
- GitHub Pages (hosting)
- USB RFID Reader (HID keyboard mode)

## 📋 Cara Setup

### 1. Buat Project Firebase
1. Buka https://console.firebase.google.com
2. Klik "Add Project" / "Tambah Project"
3. Beri nama project (contoh: absensi-smp-almiftah)
4. Disable Google Analytics (opsional)
5. Klik "Create Project"

### 2. Aktifkan Firestore
1. Di Firebase Console, klik "Build" > "Firestore Database"
2. Klik "Create Database"
3. Pilih "Start in test mode" (untuk development)
4. Pilih region terdekat (asia-southeast1)
5. Klik "Enable"

### 3. Daftarkan Web App
1. Di Firebase Console, klik ikon gear > "Project Settings"
2. Scroll ke bawah, klik ikon "</>"
3. Beri nama app (contoh: absensi-web)
4. Centang "Firebase Hosting" (opsional)
5. Klik "Register App"
6. Copy konfigurasi Firebase

### 4. Update Konfigurasi
1. Buka file `js/firebase-config.js`
2. Replace semua nilai YOUR_xxx dengan konfigurasi dari step 3

### 5. Deploy ke GitHub Pages
1. Buat repository baru di GitHub
2. Push folder `web/` ke repository
3. Buka Settings > Pages
4. Pilih branch "main" dan folder "/ (root)"
5. Klik Save
6. Tunggu beberapa menit, site akan live di https://username.github.io/repo-name

### 6. Setup RFID Reader
1. Colokkan RFID reader USB ke komputer
2. Reader akan terdeteksi sebagai keyboard (HID device)
3. Buka halaman absensi di browser
4. Tempelkan kartu RFID - nomor kartu akan otomatis terbaca
5. PENTING: Pastikan kursor fokus di halaman absensi

## 📱 Cara Penggunaan

### Registrasi Guru/Siswa
1. Buka halaman Admin Panel
2. Klik tab "Registrasi"
3. Pilih role (Guru/Siswa)
4. Isi data lengkap
5. Scan kartu RFID atau ketik manual
6. Klik "Simpan"

### Absensi Harian
1. Buka halaman Absensi
2. Sistem otomatis mendeteksi mode (Masuk/Pulang)
3. Tempelkan kartu RFID
4. Sistem akan menampilkan hasil absensi

### Download Rekap
1. Buka Admin Panel > tab "Rekap Absensi"
2. Pilih rentang tanggal
3. Filter berdasarkan role (opsional)
4. Klik "Tampilkan"
5. Klik "Download Excel" untuk file .xlsx
6. Klik "Buka di Google Sheets" untuk format Google Sheets

## ⏰ Aturan Waktu Absensi
| Jenis | Waktu | Keterangan |
|-------|-------|------------|
| Masuk (Hadir) | 07:00 - 09:00 | Status: Hadir |
| Masuk (Lambat) | Setelah 09:00 | Status: Terlambat |
| Pulang | 10:55 - 12:00 | Absen pulang |

## 🔒 Keamanan Firebase
Untuk production, update Firestore Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true; // Sesuaikan dengan kebutuhan
    }
    match /attendance/{docId} {
      allow read, write: if true; // Sesuaikan dengan kebutuhan
    }
  }
}
```

## 📁 Struktur File
```
web/
├── index.html          # Halaman scanner absensi
├── admin.html          # Panel admin
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── firebase-config.js  # Konfigurasi Firebase
│   ├── app.js              # Logic scanner
│   └── admin.js            # Logic admin panel
└── README.md           # Dokumentasi
```

## 📞 Dukungan
Jika ada pertanyaan atau masalah, silakan buat Issue di repository GitHub.

---
Dibuat dengan ❤️ untuk SMP Al-Miftah
