import React, { useState, useEffect } from 'react';

// Impor library Firebase untuk menghubungkan ke database dan storage
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
// Impor library untuk kompresi gambar dinonaktifkan sementara untuk perbaikan
// import imageCompression from 'browser-image-compression';


// --- KONFIGURASI FIREBASE ---
// Ganti dengan konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyAEsaCV7nSC7rIbKFhUvGrjJBPxL0_Glkw",
  authDomain: "diamond-grooming.firebaseapp.com",
  projectId: "diamond-grooming",
  storageBucket: "diamond-grooming.appspot.com",
  messagingSenderId: "126112552950",
  appId: "1:126112552950:web:303c4f6d55160a028f99d7"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
// --------------------------

// Data Layanan
const SERVICES = [
  { id: 'basic_s_short', name: 'Kecil Bulu Pendek', price: 50000, slotWeight: 1, duration: 1, category: 'Grooming Basic - Anjing Kecil (max 6kg)' },
  { id: 'basic_s_long', name: 'Kecil Bulu Panjang', price: 70000, slotWeight: 1, duration: 1, category: 'Grooming Basic - Anjing Kecil (max 6kg)' },
  { id: 'basic_m_short', name: 'Medium Bulu Pendek', price: 80000, slotWeight: 1, duration: 1, category: 'Grooming Basic - Anjing Medium (6.5kg - 12kg)' },
  { id: 'basic_m_long', name: 'Medium Bulu Panjang', price: 100000, slotWeight: 1, duration: 1, category: 'Grooming Basic - Anjing Medium (6.5kg - 12kg)' },
  { id: 'basic_l_short', name: 'Besar Bulu Pendek', price: 120000, slotWeight: 1, duration: 2, category: 'Grooming Basic - Anjing Besar (12.5kg+)' },
  { id: 'basic_l_long', name: 'Besar Bulu Panjang', price: 150000, slotWeight: 1, duration: 2, category: 'Grooming Basic - Anjing Besar (12.5kg+)' },
  { id: 'haircut_s', name: 'Anjing Kecil (max 6kg)', price: 120000, slotWeight: 2, duration: 2, category: 'Grooming Haircut' },
  { id: 'haircut_m', name: 'Anjing Medium (6.5kg - 12kg)', price: 170000, slotWeight: 2, duration: 2, category: 'Grooming Haircut' },
  { id: 'haircut_l', name: 'Anjing Besar (12.5kg+)', price: 230000, slotWeight: 2, duration: 2, category: 'Grooming Haircut' },
];

const TOTAL_CAPACITY_PER_SLOT = 3;
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const formatCurrency = (amount) => `Rp ${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

// Komponen untuk Alert
const CustomAlert = ({ title, message, onClose }) => {
    if (!title) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-slate-600 mt-2 mb-4">{message}</p>
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    );
};

// Komponen Halaman Utama (Home)
const HomeScreen = ({ appointments, onNavigate }) => {
    const getTomorrowDateString = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };
    const upcomingAppointments = appointments.filter(app => app.date === getTomorrowDateString());

    return (
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-2">🐾 DIAMOND GROOMING 🐾</h1>
        <p className="text-base sm:text-lg text-slate-600 mb-8">Solusi perawatan terbaik untuk sahabat bulu Anda.</p>
        
        {upcomingAppointments.length > 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg mb-8 text-left shadow-md">
            <p className="font-bold text-lg">🔔 Pengingat Jadwal</p>
            {upcomingAppointments.map(app => (
              <p key={app.id} className="mt-1">
                Jangan lupa, besok adalah jadwal grooming untuk {app.petName} ({app.petType}) pada pukul {app.time}.
              </p>
            ))}
          </div>
        )}

        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 sm:py-4 px-5 rounded-xl text-lg shadow-lg transition-transform transform hover:scale-105 mb-4" onClick={() => onNavigate('booking')}>
          Booking Jadwal Grooming
        </button>
        <button className="w-full bg-gray-200 hover:bg-gray-300 text-slate-800 font-bold py-3 sm:py-4 px-5 rounded-xl text-lg shadow-lg transition-transform transform hover:scale-105" onClick={() => onNavigate('todays_schedule')}>
          Jadwal Hari Ini (Admin)
        </button>
      </div>
    );
};

// Komponen Halaman Booking
const BookingScreen = ({ appointments, onBookingSuccess, onNavigate }) => {
    const [bookingDetails, setBookingDetails] = useState({
        service: null, date: null, time: null, petName: '', petType: 'Anjing', customerPhone: '',
        customerAddress: '', numberOfPets: 1, transportFee: 0, notes: ''
    });
    const [bookingStep, setBookingStep] = useState(1);
    const [petImageFile, setPetImageFile] = useState(null);
    const [houseImageFile, setHouseImageFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [alertInfo, setAlertInfo] = useState({ title: '', message: '' });

    const groupedServices = SERVICES.reduce((acc, service) => {
        (acc[service.category] = acc[service.category] || []).push(service);
        return acc;
    }, {});

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const mapLink = `https://maps.google.com/?q=${latitude},${longitude}`;
                    const addressText = `Lokasi dari GPS: ${latitude}, ${longitude}\nLink Google Maps: ${mapLink}\n\n(Mohon tambahkan detail alamat seperti nomor rumah/patokan di bawah ini)`;
                    setBookingDetails(prev => ({ ...prev, customerAddress: addressText }));
                },
                () => setAlertInfo({ title: 'Akses Lokasi Gagal', message: 'Tidak dapat mengambil lokasi. Pastikan Anda telah memberikan izin akses lokasi pada browser.' })
            );
        } else {
            setAlertInfo({ title: 'Browser Tidak Mendukung', message: 'Maaf, browser Anda tidak mendukung fitur geolokasi.' });
        }
    };

    const handleCalculateFee = async () => {
        if (!bookingDetails.customerAddress) {
            setAlertInfo({ title: 'Alamat Kosong', message: 'Mohon isi alamat customer terlebih dahulu.' });
            return;
        }
        setIsCalculating(true);
        
        const originCoordinates = "-7.543240049482117, 110.8144302252995"; // Ganti dengan KOORDINAT LOKASI ANDA
        const apiKey = "AIzaSyBPn3p1ZkywKB7DWxkZo0oPBHaCyoIS9X0"; // Ganti dengan API Key Anda
        
        const destinationAddress = bookingDetails.customerAddress;
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const apiUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originCoordinates}&destinations=${encodeURIComponent(destinationAddress)}&key=${apiKey}`;

        try {
            const response = await fetch(proxyUrl + apiUrl);
            const data = await response.json();

            if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
                const distanceInMeters = data.rows[0].elements[0].distance.value;
                const distanceInKm = distanceInMeters / 1000;

                let fee = 0;
                if (distanceInKm > 25 && distanceInKm <= 55) fee = 50000;
                else if (distanceInKm > 12 && distanceInKm <= 25) fee = 35000;
                else if (distanceInKm > 6 && distanceInKm <= 12) fee = 25000;
                else if (distanceInKm >= 2 && distanceInKm <= 6) fee = 20000;

                setBookingDetails(prev => ({ ...prev, transportFee: fee }));
                setAlertInfo({ title: 'Kalkulasi Selesai', message: `Estimasi jarak adalah ${distanceInKm.toFixed(1)} km. Biaya kunjungan sebesar ${formatCurrency(fee)} telah ditambahkan.` });
            } else {
                throw new Error(data.error_message || 'Tidak dapat menghitung jarak. Pastikan alamat valid.');
            }
        } catch (error) {
            setAlertInfo({ title: 'Kalkulasi Gagal', message: `Terjadi kesalahan: ${error.message}. Silakan coba lagi.` });
        } finally {
            setIsCalculating(false);
        }
    };

    const handlePetDetailsSubmit = () => {
        if (!bookingDetails.petName || !bookingDetails.petType || !bookingDetails.customerPhone || !bookingDetails.customerAddress) {
            setAlertInfo({ title: 'Data Tidak Lengkap', message: 'Mohon isi semua data yang diperlukan, termasuk alamat.' });
            return;
        }
        setBookingStep(4);
    };
    
    const confirmBooking = async () => {
        setIsUploading(true);
        
        // Fungsi upload sederhana tanpa kompresi
        const uploadFile = async (file, path) => {
            if (!file) return '';
            const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
            try {
                const snapshot = await uploadBytes(storageRef, file);
                return await getDownloadURL(snapshot.ref);
            } catch (error) {
                console.error(`Error uploading ${path}: `, error);
                throw new Error(`Gagal mengunggah foto ${path}.`);
            }
        };

        try {
            const [petImageUrl, houseImageUrl] = await Promise.all([
                uploadFile(petImageFile, 'pets'),
                uploadFile(houseImageFile, 'houses')
            ]);
            await addDoc(collection(db, "appointments"), { ...bookingDetails, petImageUrl, houseImageUrl });
            onBookingSuccess();
        } catch (error) {
            setAlertInfo({ title: 'Booking Gagal', message: error.message || 'Terjadi kesalahan saat menyimpan jadwal.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full">
            <CustomAlert title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo({ title: '', message: '' })} />
            <h1 className="text-3xl font-bold text-slate-800 text-center mb-8">Buat Jadwal Baru</h1>
            
            {bookingStep === 1 && (
                <div>
                  <h2 className="text-2xl font-semibold text-slate-700 mb-4">Langkah 1: Pilih Layanan</h2>
                  {Object.entries(groupedServices).map(([category, services]) => (
                      <div key={category} className="mb-6">
                          <h3 className="text-xl font-bold text-slate-600 mb-3 border-b-2 pb-2">{category}</h3>
                          {services.map(service => (
                            <button key={service.id} className="w-full bg-white p-4 rounded-lg mb-3 border-2 border-gray-200 hover:border-blue-500 text-left transition-all shadow-sm" onClick={() => { setBookingDetails(prev => ({ ...prev, service })); setBookingStep(2); }}>
                              <p className="text-base sm:text-lg font-bold text-slate-800">{service.name}</p>
                              <p className="text-xs sm:text-sm text-slate-500 mt-1">Durasi: ~{service.duration} jam, Beban: {service.slotWeight} slot/hewan</p>
                              <p className="text-sm sm:text-md text-blue-600 font-semibold mt-1">{formatCurrency(service.price)}</p>
                            </button>
                          ))}
                      </div>
                  ))}
                </div>
            )}

            {bookingStep === 2 && (
                <div>
                  <h2 className="text-2xl font-semibold text-slate-700 mb-4">Langkah 2: Pilih Tanggal & Waktu</h2>
                  <label className="block text-md font-medium text-slate-600 mb-2">Pilih Tanggal (7 Hari ke Depan)</label>
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {[...Array(7)].map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i + 1);
                      const dateString = date.toISOString().split('T')[0];
                      const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
                      const dayNumber = date.getDate();
                      const isSelected = bookingDetails.date === dateString;
                      return (
                        <button key={i} className={`p-2 rounded-lg border text-center ${isSelected ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-700 border-gray-300'}`} onClick={() => setBookingDetails(prev => ({...prev, date: dateString}))}>
                          <span className="block text-sm">{dayName}</span>
                          <span className="block font-bold text-lg">{dayNumber}</span>
                        </button>
                      );
                    })}
                  </div>

                  {bookingDetails.date && (
                    <>
                      <label className="block text-md font-medium text-slate-600 mb-2">Pilih Waktu Tersedia</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {TIME_SLOTS.map((time, index) => {
                          const { service } = bookingDetails;
                          let isAvailable = true;
                          let minRemainingSlots = TOTAL_CAPACITY_PER_SLOT;

                          for (let i = 0; i < service.duration; i++) {
                            const slotIndex = index + i;
                            if (slotIndex >= TIME_SLOTS.length) { isAvailable = false; break; }
                            const currentTimeSlot = TIME_SLOTS[slotIndex];
                            const bookingsAtTime = appointments.filter(app => app.date === bookingDetails.date && app.time === currentTimeSlot);
                            const slotsUsed = bookingsAtTime.reduce((acc, app) => acc + (SERVICES.find(s => s.id === app.service.id)?.slotWeight * app.numberOfPets || 0), 0);
                            const remainingSlots = TOTAL_CAPACITY_PER_SLOT - slotsUsed;
                            if (remainingSlots < service.slotWeight) isAvailable = false;
                            if (i === 0) minRemainingSlots = remainingSlots;
                          }

                          return (
                            <button key={index} className={`font-bold py-3 px-4 rounded-lg shadow-md transition-all text-center ${isAvailable ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} onClick={() => isAvailable && (() => { setBookingDetails(prev => ({ ...prev, time })); setBookingStep(3); })()} disabled={!isAvailable}>
                              <span className="block">{time}</span>
                              <span className="block text-xs font-normal">{isAvailable ? `(Sisa ${minRemainingSlots} slot)` : '(Penuh/Waktu tidak cukup)'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <button className="w-full mt-6 text-slate-600 font-semibold py-2" onClick={() => setBookingStep(1)}>Kembali</button>
                </div>
            )}

            {bookingStep === 3 && (
                <div>
                  <h2 className="text-2xl font-semibold text-slate-700 mb-4">Langkah 3: Detail Customer & Peliharaan</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Nomor HP Customer</label>
                          <input type="tel" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Contoh: 081234567890" value={bookingDetails.customerPhone} onChange={(e) => setBookingDetails(prev => ({ ...prev, customerPhone: e.target.value }))} />
                      </div>
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Alamat Lengkap (Untuk Grooming Visit)</label>
                          <textarea className="w-full p-3 border border-gray-300 rounded-lg mb-2 h-28" placeholder="Masukkan alamat lengkap..." value={bookingDetails.customerAddress} onChange={(e) => setBookingDetails(prev => ({ ...prev, customerAddress: e.target.value }))} />
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm" onClick={handleGetLocation}>📍 Gunakan Lokasi GPS</button>
                            <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:bg-orange-300" onClick={handleCalculateFee} disabled={isCalculating}>
                                {isCalculating ? 'Menghitung...' : '🚗 Hitung Biaya Kunjungan'}
                            </button>
                          </div>
                          {bookingDetails.transportFee > 0 && <p className="text-center font-semibold text-green-700 mt-2">Biaya Kunjungan: {formatCurrency(bookingDetails.transportFee)}</p>}
                      </div>
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Foto Rumah (Patokan)</label>
                          <input type="file" accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setHouseImageFile(e.target.files[0])} />
                      </div>
                       <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Jumlah Hewan</label>
                          <input type="number" min="1" className="w-full p-3 border border-gray-300 rounded-lg" value={bookingDetails.numberOfPets} onChange={(e) => setBookingDetails(prev => ({ ...prev, numberOfPets: Math.max(1, parseInt(e.target.value) || 1) }))} />
                      </div>
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Nama Hewan</label>
                          <input type="text" className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Contoh: Mochi, Brownie (jika > 1)" value={bookingDetails.petName} onChange={(e) => setBookingDetails(prev => ({ ...prev, petName: e.target.value }))} />
                      </div>
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Foto Hewan (Opsional)</label>
                          <input type="file" accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setPetImageFile(e.target.files[0])} />
                      </div>
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Jenis Hewan</label>
                          <div className="flex gap-4">
                            <button className={`flex-1 p-3 rounded-lg border-2 text-lg ${bookingDetails.petType === 'Anjing' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-700 border-gray-300'}`} onClick={() => setBookingDetails(prev => ({ ...prev, petType: 'Anjing' }))}>🐶 Anjing</button>
                            <button className={`flex-1 p-3 rounded-lg border-2 text-lg ${bookingDetails.petType === 'Kucing' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-700 border-gray-300'}`} onClick={() => setBookingDetails(prev => ({ ...prev, petType: 'Kucing' }))}>🐱 Kucing</button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-md font-medium text-slate-600 mb-2">Catatan Khusus (Opsional)</label>
                          <textarea className="w-full p-3 border border-gray-300 rounded-lg h-24" placeholder="Contoh: Alergi shampoo tertentu" value={bookingDetails.notes} onChange={(e) => setBookingDetails(prev => ({ ...prev, notes: e.target.value }))} />
                      </div>
                  </div>
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-5 rounded-lg shadow-md mt-6" onClick={handlePetDetailsSubmit}>Lanjutkan</button>
                  <button className="w-full mt-3 text-slate-600 font-semibold py-2" onClick={() => setBookingStep(2)}>Kembali</button>
                </div>
            )}

            {bookingStep === 4 && (
                <div>
                  <h2 className="text-2xl font-semibold text-slate-700 mb-4">Langkah 4: Konfirmasi Booking</h2>
                  <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Ringkasan Pesanan</h3>
                    <div className="space-y-2 text-slate-600 text-sm sm:text-base">
                      <p><strong>Nama Hewan:</strong> {bookingDetails.petName} ({bookingDetails.petType})</p>
                      <p><strong>Jumlah Hewan:</strong> {bookingDetails.numberOfPets}</p>
                      <p><strong>Nomor HP:</strong> {bookingDetails.customerPhone}</p>
                      <p><strong>Alamat:</strong> <span className="whitespace-pre-wrap">{bookingDetails.customerAddress}</span></p>
                      <p><strong>Layanan:</strong> {bookingDetails.service.name}</p>
                      <p><strong>Biaya Layanan:</strong> {formatCurrency(bookingDetails.service.price * bookingDetails.numberOfPets)}</p>
                      <p><strong>Biaya Kunjungan:</strong> {formatCurrency(bookingDetails.transportFee)}</p>
                      <p><strong>Jadwal:</strong> {new Date(bookingDetails.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p><strong>Waktu:</strong> {bookingDetails.time}</p>
                      {bookingDetails.notes && <p><strong>Catatan:</strong> {bookingDetails.notes}</p>}
                    </div>
                    <hr className="my-4" />
                    <p className="text-right text-lg sm:text-xl font-bold text-slate-800">Total Biaya: {formatCurrency((bookingDetails.service.price * bookingDetails.numberOfPets) + bookingDetails.transportFee)}</p>
                  </div>
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-5 rounded-lg shadow-md disabled:bg-blue-300" onClick={confirmBooking} disabled={isUploading}>
                    {isUploading ? 'Menyimpan...' : 'Konfirmasi & Buat Jadwal'}
                  </button>
                  <button className="w-full mt-3 text-slate-600 font-semibold py-2" onClick={() => setBookingStep(3)}>Kembali</button>
                </div>
            )}
        </div>
    );
};

// Komponen Halaman Jadwal Admin
const TodaysScheduleScreen = ({ appointments, onNavigate }) => {
    const todayString = new Date().toISOString().split('T')[0];
    const todaysAppointments = appointments.filter(app => app.date === todayString).sort((a, b) => a.time.localeCompare(b.time));

    const getEndTime = (startTime, duration) => {
        const [hour] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hour, 0, 0, 0);
        startDate.setHours(startDate.getHours() + duration);
        return startDate.toTimeString().slice(0, 5);
    };

    const renderAddress = (address) => {
        if (!address) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return address.split(urlRegex).map((part, i) => 
            part.match(urlRegex) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Buka di Peta</a> : part
        );
    };

    return (
        <div>
          <h1 className="text-3xl font-bold text-slate-800 text-center mb-8">Jadwal Grooming Hari Ini</h1>
          {appointments.length === 0 ? (
            <p className="text-lg text-slate-600 text-center">Tidak ada jadwal untuk hari ini.</p>
          ) : (
            <div className="space-y-4">
            {todaysAppointments.map((app) => {
                const service = SERVICES.find(s => s.id === app.service.id);
                const endTime = service ? getEndTime(app.time, service.duration * app.numberOfPets) : '';
                return (
                <div key={app.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xl font-bold text-slate-800">{app.petName} ({app.numberOfPets} ekor) - {app.petType}</p>
                                    <p className="text-md text-slate-600 my-1">Kontak: {app.customerPhone}</p>
                                    <p className="text-md text-slate-600 my-1">{service?.name || app.service.id}</p>
                                    {app.transportFee > 0 && <p className="text-md text-slate-600 my-1">Biaya Kunjungan: {formatCurrency(app.transportFee)}</p>}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-bold text-blue-600">{app.time} - {endTime}</p>
                                </div>
                            </div>
                            {app.notes && <p className="text-sm text-slate-500 mt-2 pt-2 border-t">Catatan: {app.notes}</p>}
                        </div>
                    </div>
                    {(app.petImageUrl || app.houseImageUrl) && (
                        <div className="mt-3 pt-3 border-t flex gap-4">
                            {app.petImageUrl && (
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm mb-1">Foto Hewan:</p>
                                    <img src={app.petImageUrl} alt={app.petName} className="w-24 h-24 object-cover rounded-md bg-gray-200" />
                                </div>
                            )}
                            {app.houseImageUrl && (
                                <div>
                                    <p className="font-semibold text-slate-700 text-sm mb-1">Foto Rumah:</p>
                                    <img src={app.houseImageUrl} alt="Patokan Rumah" className="w-24 h-24 object-cover rounded-md bg-gray-200" />
                                </div>
                            )}
                        </div>
                    )}
                    {app.customerAddress && (
                        <div className="mt-3 pt-3 border-t">
                            <p className="font-semibold text-slate-700">Alamat Kunjungan:</p>
                            <p className="text-slate-600 whitespace-pre-wrap">{renderAddress(app.customerAddress)}</p>
                        </div>
                    )}
                </div>
                )
            })}
            </div>
          )}
          <button className="w-full bg-gray-200 hover:bg-gray-300 text-slate-800 font-bold py-3 px-5 rounded-lg mt-8 shadow-md" onClick={() => onNavigate('home')}>
            Kembali ke Home
          </button>
        </div>
    );
};

// Komponen Utama Aplikasi
const App = () => {
    const [screen, setScreen] = useState('home');
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [alertInfo, setAlertInfo] = useState({ title: '', message: '' });

    useEffect(() => {
        const q = query(collection(db, "appointments"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const appointmentsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            appointmentsData.sort((a, b) => new Date(a.date) - new Date(b.date));
            setAppointments(appointmentsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Gagal mengambil data dari Firestore: ", error);
            setIsLoading(false);
            setAlertInfo({ title: "Error", message: "Gagal memuat data jadwal." });
        });
        return () => unsubscribe();
    }, []);

    const handleBookingSuccess = () => {
        setScreen('home');
        setAlertInfo({ title: 'Booking Berhasil!', message: 'Jadwal grooming Anda telah berhasil disimpan.' });
    };

    const renderScreen = () => {
        if (isLoading) {
            return <div className="text-center text-slate-600">Memuat aplikasi...</div>;
        }
        switch (screen) {
            case 'booking':
                return <BookingScreen appointments={appointments} onBookingSuccess={handleBookingSuccess} onNavigate={setScreen} />;
            case 'todays_schedule':
                return <TodaysScheduleScreen appointments={appointments} onNavigate={setScreen} />;
            default:
                return <HomeScreen appointments={appointments} onNavigate={setScreen} />;
        }
    };

    return (
        <main className="bg-gray-100 min-h-screen font-sans">
            <div className="p-4 sm:p-5 max-w-2xl mx-auto">
                <CustomAlert title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo({ title: '', message: '' })} />
                {renderScreen()}
            </div>
        </main>
    );
};

export default App;
