
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Plus, X, Trash2, Building2, MapPin, Printer, FileSpreadsheet, 
  ChevronRight, Award, Users, Save, Edit3, Info, UploadCloud, Download, 
  FileCheck, AlertTriangle, FileBarChart, Map as MapIcon, Landmark, 
  Calendar, Phone, CheckCircle2, Loader2, DollarSign, FileType, 
  Activity, Compass, Upload, PenLine, Layout, ShieldCheck, Mail, Globe, User, Navigation,
  Hash, MessageCircle, FileUp, Briefcase, FileOutput, FileInput, Cloud
} from 'lucide-react';
import { LKS, LKSDocuments, BantuanLKS } from '../types';
import { KECAMATAN_BLORA, JENIS_BANTUAN_LIST } from '../constants';
import { uploadFile, storage } from '../firebase';

declare const L: any;
declare const html2pdf: any;

interface LKSListProps {
  data: LKS[];
  setData: React.Dispatch<React.SetStateAction<LKS[]>>;
  initialSelectedId?: string;
  onNotify?: (action: string, target: string) => void;
  appLogo?: string | null;
  isGoogleConnected?: boolean;
}

const LKSList: React.FC<LKSListProps> = ({ data, setData, initialSelectedId, onNotify, appLogo, isGoogleConnected }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLks, setSelectedLks] = useState<LKS | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reportLks, setReportLks] = useState<LKS | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (initialSelectedId) {
      const target = data.find(l => l.id === initialSelectedId);
      if (target) { setSelectedLks(target); setIsEditing(true); }
    }
  }, [initialSelectedId, data]);

  // Map Handler
  useEffect(() => {
    if (isEditing && selectedLks && mapContainerRef.current) {
      const timer = setTimeout(() => {
        if (mapRef.current) { mapRef.current.remove(); }
        const { lat, lng } = selectedLks.koordinat || { lat: -6.968, lng: 111.417 };
        
        mapRef.current = L.map(mapContainerRef.current).setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
        
        const marker = L.marker([lat, lng], { draggable: true }).addTo(mapRef.current);
        marker.on('dragend', (e: any) => { 
          const pos = e.target.getLatLng(); 
          handleChange('koordinat.lat', pos.lat); 
          handleChange('koordinat.lng', pos.lng); 
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEditing, selectedLks?.id]);

  const filteredData = useMemo(() => {
    return data.filter(item => 
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pengurus.ketua.nama.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const handleChange = (field: string, value: any) => {
    if (!selectedLks) return;
    const keys = field.split('.');
    setSelectedLks(prev => {
      if (!prev) return null;
      let newData = JSON.parse(JSON.stringify(prev));
      let current: any = newData;
      for (let i = 0; i < keys.length - 1; i++) { 
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]]; 
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const handleFileUpload = async (field: keyof LKSDocuments, file: File) => {
    // Check file size (limit to 10MB as requested)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      alert(`Berkas terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maksimal ukuran berkas adalah 10MB. Silakan kompres PDF Anda terlebih dahulu jika terlalu besar.`);
      return;
    }

    setIsUploading(field);
    
    try {
      // Priority: 1. Firebase Storage, 2. Google Drive, 3. Local
      if (storage && selectedLks) {
        try {
          const path = `dokumen/${selectedLks.id}/${field}_${Date.now()}_${file.name}`;
          const downloadUrl = await uploadFile(file, path);
          
          handleChange(`dokumen.${field}`, downloadUrl);
          if (onNotify) onNotify('Upload Berkas', `${field} (Firebase)`);
          setIsUploading(null);
          return;
        } catch (error: any) {
          console.error("Firebase Upload Error:", error);
          // Only fallback if it's not a configuration error
          if (error.message.includes("belum dikonfigurasi")) {
            // continue to next method
          } else {
            // If Firebase is configured but fails, notify user
            alert(error.message || "Gagal upload ke Firebase Storage.");
            // continue to fallback
          }
        }
      }

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = isGoogleConnected ? '/api/upload/google-drive' : '/api/upload/local';

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const uploadData = await response.json();
        
        if (!response.ok) {
          if (response.status === 401) {
            alert("Silakan hubungkan Google Drive Anda terlebih dahulu di menu Profil.");
          } else {
            throw new Error(uploadData.error || "Gagal upload ke Google Drive");
          }
          return;
        }

        // Store the view link in the document field
        handleChange(`dokumen.${field}`, uploadData.viewLink);
        if (onNotify) onNotify('Upload Berkas', `${field} Berhasil`);
        alert(`Berkas berhasil diunggah ke ${isGoogleConnected ? 'Google Drive' : 'Penyimpanan Lokal'}.`);
      } else {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text);
        
        if (text.includes("Cookie check") || text.includes("Authenticate in new window")) {
          throw new Error("Sesi berakhir atau cookie diblokir. Silakan buka menu Profil dan klik 'VERIFIKASI SESI' atau buka aplikasi di tab baru.");
        }
        
        const snippet = text.substring(0, 100);
        throw new Error(`Server error (Bukan JSON): ${response.status} ${response.statusText}. Pesan: ${snippet}...`);
      }
    } catch (error: any) {
      console.error("Upload Error:", error);
      alert(error.message || `Gagal mengunggah berkas.`);
    } finally {
      setIsUploading(null);
    }
  };

  const addRiwayatBantuan = () => {
    if (!selectedLks) return;
    const newBantuan: BantuanLKS = {
      id: Math.random().toString(36).substr(2, 9),
      tahun: new Date().getFullYear().toString(),
      jenis: '',
      sumber: '',
      nominal: 0,
      keterangan: ''
    };
    handleChange('riwayatBantuan', [...(selectedLks.riwayatBantuan || []), newBantuan]);
  };

  const updateRiwayatBantuan = (id: string, field: keyof BantuanLKS, value: any) => {
    if (!selectedLks) return;
    const updated = (selectedLks.riwayatBantuan || []).map(b => b.id === id ? { ...b, [field]: value } : b);
    handleChange('riwayatBantuan', updated);
  };

  const removeRiwayatBantuan = (id: string) => {
    if (!selectedLks) return;
    handleChange('riwayatBantuan', selectedLks.riwayatBantuan.filter(b => b.id !== id));
  };

  const handleSave = () => {
    if (selectedLks) {
      const isNew = !data.some(i => i.id === selectedLks.id);
      setData(prev => {
        const index = prev.findIndex(i => i.id === selectedLks.id);
        if (index > -1) { 
          const updated = [...prev]; 
          updated[index] = selectedLks; 
          return updated; 
        }
        return [selectedLks, ...prev];
      });
      if (onNotify) onNotify(isNew ? 'Menambah LKS' : 'Mengupdate LKS', selectedLks.nama);
      setIsEditing(false); setSelectedLks(null);
    }
  };

  // --- CSV LOGIC ---
  const handleExportCSV = () => {
    const headers = [
      "Nama LKS", "Alamat", "Desa", "Kecamatan", "Telp Ketua", 
      "Tempat Pendirian", "Tanggal Pendirian", "Nama Ketua", "Nama Sekretaris", "Nama Bendahara", 
      "SK Kemenkumham", "NPWP", "Nomor Tanda Daftar", "Masa Berlaku Tanda Daftar", "Posisi LKS", 
      "Lingkup Kerja", "Akreditasi", "Tahun Akreditasi", "Kegiatan Sosial"
    ];
    
    const rows = data.map(l => [
      `"${l.nama}"`, `"${l.alamat}"`, `"${l.desa}"`, `"${l.kecamatan}"`, `"${l.telpKetua}"`,
      `"${l.tempatPendirian}"`, `"${l.tanggalPendirian}"`, `"${l.pengurus.ketua.nama}"`, `"${l.pengurus.sekretaris.nama}"`, `"${l.pengurus.bendahara.nama}"`,
      `"${l.nomorSKKemenkumham}"`, `"${l.npwp}"`, `"${l.nomorTandaDaftar}"`, `"${l.masaBerlakuTandaDaftar}"`, `"${l.posisiLKS}"`,
      `"${l.lingkupKerja}"`, `"${l.statusAkreditasi}"`, `"${l.tahunAkreditasi || ''}"`, `"${(l.kegiatanSosial || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_LKS_Blora_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotify) onNotify('Export Data', 'File CSV Berhasil Dibuat');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newEntries: LKS[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 5) continue;

        newEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          nama: cols[0],
          alamat: cols[1],
          desa: cols[2],
          kecamatan: cols[3],
          telpKetua: cols[4],
          tempatPendirian: cols[5],
          tanggalPendirian: cols[6],
          pengurus: {
            ketua: { nama: cols[7], telp: cols[4] },
            sekretaris: { nama: cols[8], telp: '' },
            bendahara: { nama: cols[9], telp: '' }
          },
          nomorSKKemenkumham: cols[10],
          npwp: cols[11],
          nomorTandaDaftar: cols[12],
          masaBerlakuTandaDaftar: cols[13],
          posisiLKS: cols[14] || 'Pusat',
          lingkupKerja: cols[15] || 'Kabupaten',
          statusAkreditasi: (cols[16] as any) || 'Belum',
          tahunAkreditasi: cols[17] || '',
          kegiatanSosial: cols[18] || '',
          akteNotaris: { nomor: '', tanggal: '' },
          namaKemenkumham: cols[0],
          nomorIjinOperasional: '',
          masaBerlakuIjinOperasional: '',
          statusAktif: 'Aktif',
          jenisBantuan: JENIS_BANTUAN_LIST[0],
          riwayatBantuan: [],
          jumlahPM: 0,
          koordinat: { lat: -6.968, lng: 111.417 },
          dokumen: {}
        });
      }

      setData(prev => [...newEntries, ...prev]);
      setIsImporting(false);
      if (onNotify) onNotify('Import Data', `${newEntries.length} LKS Berhasil Ditambahkan`);
      alert(`Berhasil mengimpor ${newEntries.length} data LKS.`);
    };
    reader.readAsText(file);
  };

  const handleDownloadRaportPDF = async () => {
    const element = document.getElementById('printable-raport');
    if (!element || !reportLks) return;
    setIsGenerating(true);
    const options = {
      margin: 0,
      filename: `Profil_LKS_${reportLks.nama.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
      await html2pdf().set(options).from(element).save();
    } catch (err) {
      alert('Gagal mengunduh profil PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-4 lg:space-y-6 pb-20 lg:pb-0">
      {/* Header Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 no-print">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari LKS atau Nama Ketua..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm font-medium text-sm lg:text-base" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV BUTTONS */}
          <button 
            onClick={handleExportCSV}
            className="hidden lg:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
          >
            <FileOutput size={16} /> EXPORT CSV
          </button>
          <label className="hidden lg:flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 cursor-pointer">
            <FileInput size={16} /> IMPORT CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button onClick={() => {
            const newId = Math.random().toString(36).substr(2, 9);
            setSelectedLks({
              id: newId, nama: '', alamat: '', desa: '', kecamatan: KECAMATAN_BLORA[0], telpKetua: '', tempatPendirian: '', tanggalPendirian: '',
              pengurus: { ketua: { nama: '', telp: '' }, sekretaris: { nama: '', telp: '' }, bendahara: { nama: '', telp: '' } },
              akteNotaris: { nomor: '', tanggal: '' }, namaKemenkumham: '', nomorSKKemenkumham: '', nomorTandaDaftar: '', masaBerlakuTandaDaftar: '', nomorIjinOperasional: '', masaBerlakuIjinOperasional: '',
              posisiLKS: 'Pusat', lingkupKerja: 'Kabupaten', npwp: '', statusAkreditasi: 'Belum', tahunAkreditasi: '', statusAktif: 'Aktif',
              jenisBantuan: JENIS_BANTUAN_LIST[0], riwayatBantuan: [], jumlahPM: 0, koordinat: { lat: -6.968, lng: 111.417 }, dokumen: {}, kegiatanSosial: ''
            }); setIsEditing(true);
          }} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs lg:text-sm shadow-xl active:scale-95 transition-all">
            <Plus size={16} /> TAMBAH LKS
          </button>
        </div>
      </div>

      {/* TAMPILAN MOBILE: Card View */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
        {filteredData.map((item) => (
          <div key={item.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group" onClick={() => { setSelectedLks(item); setIsEditing(true); }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><Building2 size={24}/></div>
              <div className="text-right">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.statusAkreditasi === 'Belum' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                  {item.statusAkreditasi === 'Belum' ? 'Bukan Akred' : `Grade ${item.statusAkreditasi}`}
                </div>
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase leading-tight line-clamp-2 mb-2">{item.nama}</h3>
            <div className="space-y-1.5 mb-6">
               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><MapPin size={12} className="text-rose-500" /> {item.desa}, {item.kecamatan}</div>
               <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest"><User size={12} className="text-indigo-500" /> {item.pengurus.ketua.nama || '-'}</div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 gap-2">
               <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(item.telpKetua); }} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl active:scale-90 transition-all"><MessageCircle size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleNavigate(item.koordinat.lat, item.koordinat.lng); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-90 transition-all"><Compass size={18} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setReportLks(item); }} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl active:scale-90 transition-all"><FileBarChart size={18} /></button>
               </div>
               <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id); }} className="p-2.5 text-slate-200 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {filteredData.length === 0 && (
          <div className="py-20 text-center text-slate-300 italic font-medium">Data LKS tidak ditemukan.</div>
        )}
      </div>

      {/* Tabel Utama Desktop */}
      <div id="printable-table-area" className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Lembaga & Wilayah</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400">Ketua & Kontak</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 text-center">Akreditasi</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/40 transition-colors cursor-pointer group" onClick={() => { setSelectedLks(item); setIsEditing(true); }}>
                  <td className="px-8 py-6">
                    <p className="text-base font-black text-slate-800 uppercase leading-tight">{item.nama}</p>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase mt-1"><MapPin size={12} className="text-rose-500" /> {item.desa}, {item.kecamatan}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-700 uppercase">{item.pengurus.ketua.nama || '-'}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsApp(item.telpKetua); }}
                      className="text-[10px] font-black text-emerald-600 flex items-center gap-1 hover:underline mt-1"
                    >
                      <MessageCircle size={14} /> {item.telpKetua}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-flex flex-col items-center justify-center min-w-[50px] min-h-[50px] p-2 rounded-xl font-black text-sm border-2 bg-slate-50">
                      <span>{item.statusAkreditasi === 'Belum' ? '-' : item.statusAkreditasi}</span>
                      {item.tahunAkreditasi && <span className="text-[8px] opacity-70 mt-0.5">{item.tahunAkreditasi}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleNavigate(item.koordinat.lat, item.koordinat.lng)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Buka Lokasi">
                        <Compass size={20} />
                      </button>
                      <button onClick={() => setReportLks(item)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                        <FileBarChart size={20} />
                      </button>
                      <button onClick={() => setDeleteConfirmId(item.id)} className="p-2.5 text-slate-300 hover:text-red-600 transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal - Semua Indikator Terkunci */}
      {isEditing && selectedLks && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 lg:p-4">
          <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md" onClick={() => { setIsEditing(false); setSelectedLks(null); }}></div>
          <div className="relative bg-white w-full max-w-6xl h-full lg:h-[95vh] lg:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 lg:px-10 py-6 lg:py-8 border-b flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-14 lg:h-14 bg-blue-600 text-white rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg"><Building2 size={24}/></div>
                <div className="min-w-0">
                  <h3 className="text-base lg:text-2xl font-black text-slate-800 uppercase truncate max-w-[200px] lg:max-w-[500px] leading-tight">{selectedLks.nama || 'LKS Baru'}</h3>
                  <p className="text-[8px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Pengelolaan Profil Lengkap</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <button onClick={handleSave} className="px-6 lg:px-10 py-2.5 lg:py-4 bg-blue-600 text-white rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"><Save size={16} /> <span className="hidden lg:inline">Simpan</span></button>
                <button onClick={() => { setIsEditing(false); setSelectedLks(null); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={20} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 lg:space-y-16 pb-24 no-scrollbar">
              {/* Seksi I: Identitas */}
              <section className="space-y-6">
                <h4 className="text-[10px] lg:text-sm font-black text-blue-600 uppercase flex items-center gap-2 border-b-2 border-blue-100 pb-2"><Info size={16} /> I. Identitas & Domisili</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <div className="lg:col-span-2 space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Nama LKS</label><input type="text" value={selectedLks.nama} onChange={e => handleChange('nama', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl font-black text-slate-800 text-sm outline-none" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Kecamatan</label><select value={selectedLks.kecamatan} onChange={e => handleChange('kecamatan', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl font-bold text-sm outline-none">{KECAMATAN_BLORA.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Desa/Kelurahan</label><input type="text" value={selectedLks.desa} onChange={e => handleChange('desa', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl font-bold text-sm outline-none" /></div>
                  <div className="lg:col-span-2 space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Alamat Lengkap</label><input type="text" value={selectedLks.alamat} onChange={e => handleChange('alamat', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-sm outline-none" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Tanggal Berdiri</label><input type="date" value={selectedLks.tanggalPendirian} onChange={e => handleChange('tanggalPendirian', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl font-bold text-sm outline-none text-blue-600" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">WhatsApp Ketua</label><input type="text" value={selectedLks.telpKetua} onChange={e => handleChange('telpKetua', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl font-black text-blue-600 text-sm outline-none" /></div>
                </div>
              </section>

              {/* Seksi II: Pengurus (Ketua, Sekretaris, Bendahara) */}
              <section className="space-y-6">
                <h4 className="text-[10px] lg:text-sm font-black text-indigo-600 uppercase flex items-center gap-2 border-b-2 border-indigo-100 pb-2"><Briefcase size={16} /> II. Manajemen Pengurus</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <div className="space-y-1">
                    <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Nama Ketua</label>
                    <input type="text" value={selectedLks.pengurus.ketua.nama} onChange={e => handleChange('pengurus.ketua.nama', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-black outline-none" placeholder="Nama Ketua" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Nama Sekretaris</label>
                    <input type="text" value={selectedLks.pengurus.sekretaris.nama} onChange={e => handleChange('pengurus.sekretaris.nama', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-black outline-none" placeholder="Nama Sekretaris" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Nama Bendahara</label>
                    <input type="text" value={selectedLks.pengurus.bendahara.nama} onChange={e => handleChange('pengurus.bendahara.nama', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-black outline-none" placeholder="Nama Bendahara" />
                  </div>
                </div>
              </section>

              {/* Seksi III: Legalitas & Klasifikasi */}
              <section className="space-y-6">
                <h4 className="text-[10px] lg:text-sm font-black text-emerald-600 uppercase flex items-center gap-2 border-b-2 border-emerald-100 pb-2"><ShieldCheck size={16} /> III. Legalitas & Klasifikasi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">SK Kemenkumham</label><input type="text" value={selectedLks.nomorSKKemenkumham} onChange={e => handleChange('nomorSKKemenkumham', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">NPWP Lembaga</label><input type="text" value={selectedLks.npwp} onChange={e => handleChange('npwp', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">No. Tanda Daftar</label><input type="text" value={selectedLks.nomorTandaDaftar} onChange={e => handleChange('nomorTandaDaftar', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Berlaku S/D</label><input type="date" value={selectedLks.masaBerlakuTandaDaftar} onChange={e => handleChange('masaBerlakuTandaDaftar', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-black text-red-600 outline-none" /></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Posisi LKS</label><select value={selectedLks.posisiLKS} onChange={e => handleChange('posisiLKS', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none"><option value="Pusat">Pusat</option><option value="Cabang">Cabang</option></select></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Lingkup Kerja</label><select value={selectedLks.lingkupKerja} onChange={e => handleChange('lingkupKerja', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none"><option value="Kabupaten">Kabupaten</option><option value="Provinsi">Provinsi</option><option value="Nasional">Nasional</option></select></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Status Akreditasi</label><select value={selectedLks.statusAkreditasi} onChange={e => handleChange('statusAkreditasi', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none"><option value="Belum">Belum Terakreditasi</option><option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option></select></div>
                  <div className="space-y-1"><label className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase ml-1">Tahun Akreditasi</label><input type="text" value={selectedLks.tahunAkreditasi} onChange={e => handleChange('tahunAkreditasi', e.target.value)} className="w-full px-4 lg:px-5 py-3 lg:py-4 bg-slate-50 border rounded-xl lg:rounded-2xl text-xs font-bold outline-none" /></div>
                </div>
              </section>

              {/* Seksi IV: Berkas Digital */}
              <section className="space-y-6">
                <h4 className="text-[10px] lg:text-sm font-black text-blue-600 uppercase flex items-center gap-2 border-b-2 border-blue-100 pb-2"><FileUp size={16} /> IV. Berkas Administrasi Digital</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'ktpKetua', label: 'KTP Ketua' },
                    { id: 'skKemenkumham', label: 'SK Kemenkumham' },
                    { id: 'tandaDaftar', label: 'Tanda Daftar' },
                    { id: 'sertifikatAkreditasi', label: 'Sertifikat Akreditasi' }
                  ].map((doc) => (
                    <div key={doc.id} className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center text-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedLks.dokumen[doc.id as keyof LKSDocuments] ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-300 shadow-sm'}`}>
                        {selectedLks.dokumen[doc.id as keyof LKSDocuments] ? <FileCheck size={24} /> : <FileType size={24} />}
                      </div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-tight">{doc.label}</p>
                      <label className="cursor-pointer bg-white px-4 py-2 rounded-xl border text-[8px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                        {isUploading === doc.id ? 'Loading...' : 'Pilih Berkas'}
                        <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.id as keyof LKSDocuments, e.target.files[0])} />
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              {/* Seksi V: Riwayat Bantuan */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-amber-100 pb-2">
                   <h4 className="text-[10px] lg:text-sm font-black text-amber-600 uppercase flex items-center gap-2"><DollarSign size={16} /> V. Riwayat Penerimaan Bantuan</h4>
                   <button onClick={addRiwayatBantuan} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center gap-2"><Plus size={14} /> Tambah Data</button>
                </div>
                <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden shadow-inner p-6 overflow-x-auto">
                   <table className="w-full text-left min-w-[500px]">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">
                        <tr>
                          <th className="px-4 py-3">Tahun</th>
                          <th className="px-4 py-3">Sumber / Jenis Bantuan</th>
                          <th className="px-4 py-3 text-right">Nominal (Rp)</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedLks.riwayatBantuan || []).map((b) => (
                          <tr key={b.id} className="group">
                            <td className="px-2 py-3"><input type="text" value={b.tahun} onChange={e => updateRiwayatBantuan(b.id, 'tahun', e.target.value)} className="w-20 p-2 bg-white border rounded-lg font-bold text-sm" placeholder="2024" /></td>
                            <td className="px-2 py-3"><input type="text" value={b.sumber} onChange={e => updateRiwayatBantuan(b.id, 'sumber', e.target.value)} className="w-full p-2 bg-white border rounded-lg font-bold text-sm" placeholder="APBD / Kemensos / Hibah" /></td>
                            <td className="px-2 py-3 text-right"><input type="number" value={b.nominal} onChange={e => updateRiwayatBantuan(b.id, 'nominal', parseInt(e.target.value) || 0)} className="w-32 p-2 bg-white border rounded-lg font-bold text-sm text-right" /></td>
                            <td className="px-2 py-3 text-center"><button onClick={() => removeRiwayatBantuan(b.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                   {(!selectedLks.riwayatBantuan || selectedLks.riwayatBantuan.length === 0) && <p className="text-center text-slate-400 italic text-xs py-8">Belum ada riwayat bantuan yang tercatat.</p>}
                </div>
              </section>

              {/* Seksi VI: Deskripsi Kegiatan */}
              <section className="space-y-6">
                <h4 className="text-[10px] lg:text-sm font-black text-slate-800 uppercase flex items-center gap-2 border-b-2 border-slate-100 pb-2"><PenLine size={16} /> VI. Deskripsi Kegiatan & Fokus Pelayanan</h4>
                <textarea 
                  value={selectedLks.kegiatanSosial} 
                  onChange={e => handleChange('kegiatanSosial', e.target.value)} 
                  className="w-full h-40 px-6 py-5 bg-slate-50 border rounded-[2.5rem] text-sm leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" 
                  placeholder="Jelaskan secara singkat visi, misi, dan kegiatan rutin lembaga di bidang kesejahteraan sosial..."
                ></textarea>
              </section>

              {/* Seksi VII: Peta Lokasi */}
              <section className="space-y-6 bg-slate-900 p-8 lg:p-12 rounded-[3.5rem] text-white overflow-hidden shadow-2xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><MapIcon size={20} className="text-blue-500" /> VII. Lokasi Geografis (Klik/Geser Pin Peta)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" step="any" value={selectedLks.koordinat.lat} onChange={e => handleChange('koordinat.lat', parseFloat(e.target.value) || 0)} className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black outline-none focus:border-blue-500" placeholder="Latitude" />
                    <input type="number" step="any" value={selectedLks.koordinat.lng} onChange={e => handleChange('koordinat.lng', parseFloat(e.target.value) || 0)} className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-black outline-none focus:border-blue-500" placeholder="Longitude" />
                  </div>
                </div>
                <div className="relative h-[300px] lg:h-[450px] rounded-[2.5rem] overflow-hidden mt-8 border-2 border-white/5 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full z-10"></div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Raport Profesional - CV Putih Bersih */}
      {reportLks && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-0 lg:p-4">
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-2xl" onClick={() => setReportLks(null)}></div>
          <div className="relative bg-white w-full max-w-5xl h-full lg:h-[95vh] lg:rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
             <div className="px-8 lg:px-12 py-8 border-b flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 no-print">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center"><Layout size={28}/></div>
                  <div className="hidden md:block">
                    <h3 className="font-black text-xl lg:text-3xl text-slate-900 uppercase tracking-tighter">Profil Profesional</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Dokumen Resmi Terpadu (A4)</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={handleDownloadRaportPDF} disabled={isGenerating} className="flex items-center gap-3 bg-slate-900 text-white px-5 lg:px-10 py-3 lg:py-5 rounded-2xl lg:rounded-[1.8rem] font-black text-[10px] lg:text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                    {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />} <span className="hidden lg:inline">UNDUH PROFIL PDF</span><span className="lg:hidden">PDF</span>
                  </button>
                  <button onClick={() => setReportLks(null)} className="p-3 lg:p-4 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-[1.5rem] text-slate-400 hover:bg-slate-100 transition-all"><X size={20}/></button>
                </div>
             </div>
             
             <div id="printable-raport" className="flex-1 bg-white text-slate-900 arial-force selection:bg-slate-100 overflow-y-auto flex flex-col md:flex-row no-scrollbar">
                {/* Sidebar CV */}
                <div className="w-full md:w-[30%] bg-white border-b-2 md:border-b-0 md:border-r-2 border-slate-900 p-8 lg:p-10 flex flex-col arial-force">
                   <div className="mb-10 lg:mb-14 arial-force text-center">
                      <p className="text-[9pt] font-black text-slate-400 uppercase tracking-[0.3em] mb-3 arial-force">Akreditasi Terdaftar</p>
                      <div className="inline-block px-8 lg:px-12 py-6 lg:py-10 border-4 border-slate-900 rounded-[2.5rem] arial-force">
                         <span className="text-6xl lg:text-8xl font-black text-slate-900 arial-force">{reportLks.statusAkreditasi}</span>
                         <p className="text-[9pt] font-black text-slate-900 uppercase mt-2 arial-force">Tahun {reportLks.tahunAkreditasi || 'N/A'}</p>
                      </div>
                   </div>
                   
                   <div className="w-full space-y-8 lg:space-y-10 arial-force">
                      <div className="space-y-3 arial-force">
                         <h4 className="text-[8pt] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1">Domisili Lembaga</h4>
                         <p className="text-[10pt] font-black uppercase arial-force leading-tight">{reportLks.kecamatan}</p>
                         <p className="text-[7pt] font-bold text-slate-400 uppercase arial-force">Kecamatan Wilayah</p>
                         <p className="text-[10pt] font-black uppercase arial-force leading-tight mt-3">{reportLks.desa}</p>
                         <p className="text-[7pt] font-bold text-slate-400 uppercase arial-force">Desa / Kelurahan</p>
                      </div>

                      <div className="space-y-3 arial-force">
                         <h4 className="text-[8pt] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1">Klasifikasi LKS</h4>
                         <p className="text-[10pt] font-black uppercase arial-force leading-tight">{reportLks.posisiLKS}</p>
                         <p className="text-[7pt] font-bold text-slate-400 uppercase arial-force">Status Posisi</p>
                         <p className="text-[10pt] font-black uppercase arial-force leading-tight mt-3">{reportLks.lingkupKerja}</p>
                         <p className="text-[7pt] font-bold text-slate-400 uppercase arial-force">Lingkup Kerja Wilayah</p>
                      </div>

                      <div className="space-y-3 arial-force">
                         <h4 className="text-[8pt] font-black text-slate-900 uppercase tracking-widest border-b-2 border-slate-900 pb-1">Kontak Person</h4>
                         <div className="flex items-center gap-2 mt-3 arial-force">
                            <Phone size={12} className="text-slate-900" />
                            <span className="text-[9pt] font-black arial-force">{reportLks.telpKetua}</span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Main Content CV */}
                <div className="w-full md:w-[70%] p-8 lg:p-14 flex flex-col arial-force bg-white">
                   <div className="mb-10 lg:mb-12 arial-force">
                      <p className="text-[10pt] font-black text-slate-900 uppercase tracking-[0.3em] mb-2 arial-force border-l-4 border-slate-900 pl-3">PROFIL LEMBAGA SOSIAL</p>
                      <h1 className="text-2xl lg:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none arial-force mt-4">{reportLks.nama}</h1>
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6 mt-6 arial-force pt-4 border-t border-slate-100">
                         <p className="text-[8pt] font-black text-slate-400 uppercase flex items-center gap-1 arial-force"><Calendar size={12}/> BERDIRI: {formatDate(reportLks.tanggalPendirian)}</p>
                         <p className="text-[8pt] font-black text-slate-400 uppercase flex items-center gap-1 arial-force"><Hash size={12}/> Tanda Daftar: {reportLks.nomorTandaDaftar || '-'}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 arial-force">
                      <div className="space-y-10 arial-force">
                         <div className="space-y-4 arial-force">
                            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2 arial-force">
                               <ShieldCheck className="text-slate-900" size={16} />
                               <h4 className="text-[9pt] font-black uppercase tracking-widest arial-force">Legalitas Formal</h4>
                            </div>
                            <ModernItem label="NPWP Lembaga" value={reportLks.npwp} />
                            <ModernItem label="SK Kemenkumham" value={reportLks.nomorSKKemenkumham} />
                            <ModernItem label="Masa Berlaku" value={formatDate(reportLks.masaBerlakuTandaDaftar)} color="text-rose-600" />
                         </div>

                         <div className="space-y-4 arial-force">
                            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2 arial-force">
                               <Users className="text-slate-900" size={16} />
                               <h4 className="text-[9pt] font-black uppercase tracking-widest arial-force">Manajemen Lembaga</h4>
                            </div>
                            <ModernItem label="Ketua" value={reportLks.pengurus.ketua.nama} />
                            <ModernItem label="Sekretaris" value={reportLks.pengurus.sekretaris.nama} />
                            <ModernItem label="Bendahara" value={reportLks.pengurus.bendahara.nama} />
                         </div>
                      </div>

                      <div className="space-y-10 arial-force">
                         <div className="space-y-4 arial-force">
                            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2 arial-force">
                               <Activity className="text-slate-900" size={16} />
                               <h4 className="text-[9pt] font-black uppercase tracking-widest arial-force">Fokus Aktivitas</h4>
                            </div>
                            <div className="p-6 bg-white rounded-2xl border-2 border-slate-100 arial-force text-[9pt] leading-relaxed text-slate-600 italic">
                               "{reportLks.kegiatanSosial || 'Lembaga ini berfokus pada upaya pelayanan dan pemberdayaan kesejahteraan sosial bagi masyarakat di wilayah Kabupaten Blora.'}"
                            </div>
                         </div>
                         <div className="space-y-4 arial-force">
                            <div className="flex items-center gap-3 border-b-2 border-slate-900 pb-2 arial-force">
                               <DollarSign className="text-slate-900" size={16} />
                               <h4 className="text-[9pt] font-black uppercase tracking-widest arial-force">Riwayat Bantuan</h4>
                            </div>
                            <div className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden arial-force">
                               <table className="w-full text-left arial-force">
                                  <thead className="bg-slate-900 text-white arial-force">
                                     <tr>
                                        <th className="p-2 text-[7pt] uppercase arial-force">Thn</th>
                                        <th className="p-2 text-[7pt] uppercase arial-force">Sumber</th>
                                        <th className="p-2 text-[7pt] uppercase text-right arial-force">Nominal</th>
                                     </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 arial-force">
                                     {reportLks.riwayatBantuan && reportLks.riwayatBantuan.length > 0 ? reportLks.riwayatBantuan.slice(0, 4).map(b => (
                                       <tr key={b.id} className="arial-force">
                                          <td className="p-2 text-[8pt] font-black text-slate-400 arial-force">{b.tahun}</td>
                                          <td className="p-2 text-[8pt] font-black uppercase truncate arial-force">{b.sumber}</td>
                                          <td className="p-2 text-[8pt] font-black text-right text-slate-900 arial-force">{formatRupiah(b.nominal)}</td>
                                       </tr>
                                     )) : (
                                       <tr className="arial-force"><td colSpan={3} className="p-4 text-center text-[7pt] italic arial-force">BELUM ADA RIWAYAT</td></tr>
                                     )}
                                  </tbody>
                               </table>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] p-12 text-center shadow-2xl animate-in zoom-in-95">
             <div className="w-20 h-20 mx-auto bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner"><AlertTriangle size={40} /></div>
             <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase">Hapus Lembaga?</h3>
             <div className="flex gap-4 mt-10">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Batal</button>
                <button onClick={() => { setData(prev => prev.filter(l => l.id !== deleteConfirmId)); setDeleteConfirmId(null); }} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase shadow-2xl shadow-red-600/30">Hapus</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .arial-force { font-family: 'Inter', Arial, sans-serif !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const ModernItem = ({ label, value, color = "text-slate-900" }: { label: string, value: string, color?: string }) => (
  <div className="space-y-1.5 arial-force">
     <p className="text-[7.5pt] font-black text-slate-400 uppercase tracking-[0.2em] arial-force">{label}</p>
     <p className={`text-[10pt] font-black ${color} leading-tight arial-force uppercase tracking-tight`}>{value || '-'}</p>
  </div>
);

export default LKSList;
