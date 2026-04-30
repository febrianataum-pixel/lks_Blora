
export type Role = 'Admin' | 'User';
export type Accreditation = 'A' | 'B' | 'C' | 'Belum';
export type LKSStatus = 'Aktif' | 'Tidak Aktif';
export type PMKategori = 'Dalam' | 'Luar';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  nama: string;
  role: Role;
  createdAt: string;
  avatar?: string;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
}

export interface BantuanLKS {
  id: string;
  tahun: string;
  jenis: string;
  sumber: string;
  nominal: number;
  keterangan: string;
}

export interface LKSDocuments {
  ktpKetua?: string;
  skKemenkumham?: string;
  tandaDaftar?: string;
  sertifikatAkreditasi?: string;
}

export interface LKS {
  id: string;
  nama: string;
  alamat: string;
  desa: string;
  kecamatan: string;
  telpKetua: string;
  tempatPendirian: string;
  tanggalPendirian: string;
  pengurus: {
    ketua: { nama: string; telp: string };
    sekretaris: { nama: string; telp: string };
    bendahara: { nama: string; telp: string };
  };
  akteNotaris: { nomor: string; tanggal: string };
  namaKemenkumham: string;
  nomorSKKemenkumham: string;
  nomorTandaDaftar: string;
  masaBerlakuTandaDaftar: string;
  nomorIjinOperasional: string;
  masaBerlakuIjinOperasional: string;
  posisiLKS: string;
  lingkupKerja: string;
  npwp: string;
  statusAkreditasi: Accreditation;
  tahunAkreditasi?: string;
  statusAktif: LKSStatus;
  jenisBantuan: string; 
  riwayatBantuan: BantuanLKS[];
  jumlahPM: number;
  koordinat: { lat: number; lng: number };
  dokumen: LKSDocuments;
  kegiatanSosial: string;
}

export interface PenerimaManfaat {
  id: string;
  lksId: string;
  nama: string;
  nik: string;
  noKK?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  umur?: number;
  jenisKelamin: 'L' | 'P';
  alamat: string;
  asalDesa?: string;
  asalKecamatan?: string;
  asalKabKota?: string;
  jenisBantuan: string;
  kategori: PMKategori;
  keterangan: string;
}

export interface LetterRecord {
  id: string;
  nomorSurat: string;
  lksId: string;
  tanggal: string;
  perihal: string;
  konten: string;
  penandatangan: string;
}
