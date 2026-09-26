// Firebase Configuration for SMP Al-Miftah Attendance System
// IMPORTANT: Replace these values with your Firebase project configuration
// Go to Firebase Console > Project Settings > Your apps > Web app > Config
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCh77lm2mOxCdIz3vzQmxNZo8lKOeJguN4",
  authDomain: "absen-siswa-guru.firebaseapp.com",
  projectId: "absen-siswa-guru",
  storageBucket: "absen-siswa-guru.firebasestorage.app",
  messagingSenderId: "12579062064",
  appId: "1:12579062064:web:fff986b169caeaddb788f5",
  measurementId: "G-67WD3HFJQC"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Helper function to get today's date string
function getTodayString() {
  const now = new Date();
  return now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0');
}

// Helper function to get current time string
function getCurrentTimeString() {
  const now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + 
    String(now.getMinutes()).padStart(2, '0') + ':' + 
    String(now.getSeconds()).padStart(2, '0');
}

// Indonesian day names
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
