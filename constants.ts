
import { LKS, PenerimaManfaat, UserAccount } from './types';

export const KECAMATAN_BLORA = [
  'Blora', 'Banjarejo', 'Bogorejo', 'Cepu', 'Japah', 'Jati', 'Jepon', 'Jiken', 'Kradenan', 
  'Kedungtuban', 'Kunduran', 'Ngawen', 'Randublatung', 'Sambong', 'Todanan', 'Tunjungan'
];

export const JENIS_BANTUAN_LIST = [
  'Anak & Yatim Piatu', 'Lansia', 'Disabilitas', 'Keluarga Harapan', 'Sembako', 'Hibah Bangunan', 'Lainnya'
];

export const MOCK_USERS: UserAccount[] = [
  {
    id: 'u1',
    username: 'admin',
    password: 'admin1234',
    nama: 'Administrator Dinsos',
    role: 'Admin',
    createdAt: '2024-01-01'
  },
  {
    id: 'u2',
    username: 'user1',
    password: '123',
    nama: 'Staff LKS Blora',
    role: 'User',
    createdAt: '2024-02-15'
  }
];

export const MOCK_LKS: LKS[] = [
  {
    id: '1',
    nama: 'LKS Bina Sejahtera Blora',
    alamat: 'Jl. Pemuda No. 45',
    desa: 'Tempelan',
    kecamatan: 'Blora',
    telpKetua: '081234567890',
    tempatPendirian: 'Blora',
    tanggalPendirian: '2010-05-12',
    pengurus: {
      ketua: { nama: 'H. Sudarsono', telp: '081234567890' },
      sekretaris: { nama: 'Indah Permata', telp: '081234567891' },
      bendahara: { nama: 'Ahmad Faisal', telp: '081234567892' },
    },
    akteNotaris: { nomor: '12/AN/2010', tanggal: '2010-06-01' },
    namaKemenkumham: 'Yayasan Bina Sejahtera Blora',
    nomorSKKemenkumham: 'AHU-0012345.AH.01.04.2010',
    nomorTandaDaftar: '460/001/2023',
    masaBerlakuTandaDaftar: '2026-01-01',
    nomorIjinOperasional: '503/LKS/012/2023',
    masaBerlakuIjinOperasional: '2026-01-01',
    posisiLKS: 'Pusat',
    lingkupKerja: 'Kabupaten',
    npwp: '01.234.567.8-504.000',
    statusAkreditasi: 'A',
    tahunAkreditasi: '2023',
    statusAktif: 'Aktif',
    jenisBantuan: 'Anak & Yatim Piatu',
    riwayatBantuan: [
      { id: 'b1', tahun: '2023', jenis: 'Sembako', sumber: 'APBD Blora', nominal: 50000000, keterangan: 'Paket ramadhan' },
      { id: 'b2', tahun: '2023', jenis: 'Anak & Yatim Piatu', sumber: 'Kemensos', nominal: 120000000, keterangan: 'Bantuan nutrisi' }
    ],
    jumlahPM: 45,
    koordinat: { lat: -6.968, lng: 111.417 },
    dokumen: {},
    kegiatanSosial: 'Pemberian santunan anak yatim rutin setiap bulan, bimbingan belajar gratis bagi anak panti, dan distribusi paket sembako untuk warga terdampak kemiskinan di sekitar panti.'
  }
];

export const MOCK_PM: PenerimaManfaat[] = [
  {
    id: 'p1',
    lksId: '1',
    nama: 'Andi Saputra',
    nik: '3316010101900001',
    jenisKelamin: 'L',
    alamat: 'Tempelan RT 01 RW 02',
    jenisBantuan: 'Anak & Yatim Piatu',
    kategori: 'Dalam',
    keterangan: 'Aktif Sekolah'
  }
];
