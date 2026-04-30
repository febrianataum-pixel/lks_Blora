
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, ChevronRight, User, Users, MapPin, Trash2, 
  Printer, ArrowLeft, Upload, FileSpreadsheet, Download, 
  Info, AlertCircle, CheckCircle2, X, Plus, Loader2, 
  UserPlus, Calendar, Home, Globe, Hash, Landmark, Save, Edit3,
  FileText, Filter, CheckCircle, Building2, FileOutput, FileInput, AlertTriangle, Eye,
  ChevronUp, ChevronDown, ArrowUpDown, RefreshCw, CheckSquare, Square
} from 'lucide-react';
import { LKS, PenerimaManfaat as PMType, PMKategori } from '../types';
import { KECAMATAN_BLORA } from '../constants';

declare const html2pdf: any;

interface PenerimaManfaatPageProps {
  lksData: LKS[];
  pmData: PMType[];
  setPmData: React.Dispatch<React.SetStateAction<PMType[]>>;
  initialSelectedPmId?: string;
  onNotify?: (action: string, target: string) => void;
}

type SortConfig = {
  key: keyof PMType | string;
  direction: 'asc' | 'desc' | null;
};

const PenerimaManfaatPage: React.FC<PenerimaManfaatPageProps> = ({ lksData, pmData, setPmData, initialSelectedPmId, onNotify }) => {
  const [selectedLksId, setSelectedLksId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [searchTermLks, setSearchTermLks] = useState(''); 
  const [categoryFilter, setCategoryFilter] = useState<'Semua' | PMKategori>('Semua');
  const [isImporting, setIsImporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [viewingPm, setViewingPm] = useState<PMType | null>(null);
  const [deleteConfirmPm, setDeleteConfirmPm] = useState<PMType | null>(null);
  
  const [selectedPmIds, setSelectedPmIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [sortPm, setSortPm] = useState<SortConfig>({ key: 'nama', direction: 'asc' });
  const [lksSearchTerm, setLksSearchTerm] = useState('');
  const [showLksDropdown, setShowLksDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<PMType>>({
    nama: '', lksId: '', nik: '', noKK: '', tempatLahir: '', tanggalLahir: '',
    umur: 0, jenisKelamin: 'L', asalKabKota: 'Blora', asalKecamatan: '',
    asalDesa: '', kategori: 'Dalam', keterangan: ''
  });

  // --- HELPER: CALCULATE AGE ---
  const calculateAge = (dateString: string | undefined): number => {
    if (!dateString) return 0;
    const birthDate = new Date(dateString);
    const today = new Date();
    if (isNaN(birthDate.getTime())) return 0;
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  };

  // Auto-calculate age in form
  useEffect(() => {
    if (formData.tanggalLahir) {
      const newAge = calculateAge(formData.tanggalLahir);
      if (newAge !== formData.umur) {
        setFormData(prev => ({ ...prev, umur: newAge }));
      }
    }
  }, [formData.tanggalLahir]);

  useEffect(() => {
    if (initialSelectedPmId) {
      const target = pmData.find(p => p.id === initialSelectedPmId);
      if (target) {
        setSelectedLksId(target.lksId);
        setSearchTerm(target.nama);
      }
    }
  }, [initialSelectedPmId, pmData]);

  const selectedLks = lksData.find(l => l.id === selectedLksId);

  const filteredLksSelection = useMemo(() => {
    return lksData.filter(l => 
      l.nama.toLowerCase().includes(searchTermLks.toLowerCase()) ||
      l.kecamatan.toLowerCase().includes(searchTermLks.toLowerCase())
    ).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [lksData, searchTermLks]);

  const filteredPm = useMemo(() => {
    let result = pmData.filter(p => 
      p.lksId === selectedLksId && 
      (categoryFilter === 'Semua' || p.kategori === categoryFilter) &&
      (p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || p.nik.includes(searchTerm))
    );

    if (sortPm.key && sortPm.direction) {
      result.sort((a: any, b: any) => {
        let valA = a[sortPm.key] || '';
        let valB = b[sortPm.key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortPm.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortPm.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [pmData, selectedLksId, categoryFilter, searchTerm, sortPm]);

  const requestSort = (key: keyof PMType) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortPm.key === key && sortPm.direction === 'asc') direction = 'desc';
    setSortPm({ key, direction });
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLksId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newEntries: PMType[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;

        const tglLahir = cols[4] || '';
        const csvAge = parseInt(cols[5]) || 0;
        const finalAge = csvAge > 0 ? csvAge : calculateAge(tglLahir);

        newEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          lksId: selectedLksId,
          nama: cols[0] || 'Tanpa Nama',
          nik: cols[1] || '',
          noKK: cols[2] || '',
          tempatLahir: cols[3] || '',
          tanggalLahir: tglLahir,
          umur: finalAge,
          jenisKelamin: (cols[6] === 'P' ? 'P' : 'L') as 'L' | 'P',
          asalKabKota: cols[7] || 'Blora',
          asalKecamatan: cols[8] || '',
          asalDesa: cols[9] || '',
          kategori: (cols[10] === 'Luar' ? 'Luar' : 'Dalam') as PMKategori,
          alamat: `${cols[9] || ''}, ${cols[8] || ''}, ${cols[7] || 'Blora'}`,
          jenisBantuan: selectedLks?.jenisBantuan || 'Umum',
          keterangan: cols[11] || ''
        });
      }

      setPmData(prev => [...newEntries, ...prev]);
      setIsImporting(false);
      if (onNotify) onNotify('Import PM', `${newEntries.length} Data Berhasil`);
      alert(`Berhasil mengimpor ${newEntries.length} data PM. Usia telah dihitung otomatis.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleToggleSelectPm = (id: string) => {
    const next = new Set(selectedPmIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPmIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedPmIds.size === filteredPm.length && filteredPm.length > 0) {
      setSelectedPmIds(new Set());
    } else {
      setSelectedPmIds(new Set(filteredPm.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    setPmData(prev => prev.filter(p => !selectedPmIds.has(p.id)));
    if (onNotify) onNotify('Hapus Massal', `${selectedPmIds.size} Data PM`);
    setSelectedPmIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  const handleExportExcelPM = () => {
    if (!selectedLksId || filteredPm.length === 0) return;
    const headers = ["Nama PM", "LKS", "NIK", "No KK", "Tempat Lahir", "Tgl Lahir", "Usia", "JK", "KabKota", "Kecamatan", "Desa", "Kategori"];
    const rows = filteredPm.map(p => {
      const lks = lksData.find(l => l.id === p.lksId)?.nama || '-';
      return [
        `"${p.nama}"`, `"${lks}"`, `"${p.nik}"`, `"${p.noKK || '-'}"`, `"${p.tempatLahir || '-'}"`, 
        `"${p.tanggalLahir || '-'}"`, `"${p.umur}"`, `"${p.jenisKelamin}"`, `"${p.asalKabKota || 'Blora'}"`, 
        `"${p.asalKecamatan || '-'}"`, `"${p.asalDesa || '-'}"`, `"${p.kategori}"`
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_PM_${selectedLks?.nama}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDFPM = async () => {
    const element = document.getElementById('printable-pm-report');
    if (!element || !selectedLks) return;
    setIsGenerating(true);
    const options = {
      margin: 10,
      filename: `Laporan_PM_${selectedLks.nama}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    try {
      element.classList.remove('hidden');
      await html2pdf().set(options).from(element).save();
      element.classList.add('hidden');
      if (onNotify) onNotify('Export PDF', selectedLks.nama);
    } catch (err) {
      alert('Gagal membuat PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenEdit = (pm: PMType) => {
    setFormData({ ...pm, umur: calculateAge(pm.tanggalLahir) });
    const lks = lksData.find(l => l.id === pm.lksId);
    setLksSearchTerm(lks?.nama || '');
    setIsAdding(true);
    setViewingPm(null);
  };

  const handleSavePm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.lksId || !formData.nik) {
      alert('Nama, NIK, dan Lembaga (LKS) wajib diisi.');
      return;
    }
    const finalData = {
      ...formData,
      umur: calculateAge(formData.tanggalLahir),
      asalKabKota: formData.asalKabKota || 'Blora',
      alamat: `${formData.asalDesa || '-'}, ${formData.asalKecamatan || '-'}, ${formData.asalKabKota || 'Blora'}`,
    } as PMType;

    if (formData.id) {
      setPmData(prev => prev.map(p => p.id === formData.id ? finalData : p));
      if (onNotify) onNotify('Update PM', finalData.nama);
    } else {
      const pmToAdd = {
        ...finalData,
        id: Math.random().toString(36).substr(2, 9),
        jenisBantuan: lksData.find(l => l.id === formData.lksId)?.jenisBantuan || 'Umum'
      };
      setPmData(prev => [pmToAdd, ...prev]);
      if (onNotify) onNotify('Tambah PM', pmToAdd.nama);
    }
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      nama: '', lksId: '', nik: '', noKK: '', tempatLahir: '', tanggalLahir: '',
      umur: 0, jenisKelamin: 'L', asalKabKota: 'Blora', asalKecamatan: '',
      asalDesa: '', kategori: 'Dalam', keterangan: ''
    });
    setLksSearchTerm('');
    setShowLksDropdown(false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getSortIcon = (key: keyof PMType) => {
    if (sortPm.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortPm.direction === 'asc' ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} className="text-blue-400" />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 relative">
      <div className="bg-slate-900 rounded-[2.5rem] lg:rounded-[3rem] p-6 lg:p-10 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div className="relative z-10">
          <h2 className="text-xl lg:text-3xl font-black mb-1 lg:mb-3 uppercase tracking-tighter">Warga Binaan (PM)</h2>
          <p className="text-slate-400 max-w-xl text-[10px] lg:text-sm font-bold uppercase tracking-widest">Pendataan By Name By Address Kabupaten Blora.</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:gap-3 relative z-10 justify-center">
          {selectedLksId && (
            <button onClick={() => setIsImporting(true)} className="bg-white/10 text-white border border-white/20 px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all shadow-sm flex items-center gap-2">
              <FileInput size={16} /> IMPORT CSV
            </button>
          )}
          <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-blue-600 text-white px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
            <Plus size={18} /> TAMBAH PM
          </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
      </div>

      {!selectedLksId ? (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
               <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input type="text" placeholder="Cari Nama Lembaga (LKS) atau Wilayah..." className="w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm" value={searchTermLks} onChange={(e) => setSearchTermLks(e.target.value)} />
            </div>
          </div>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white select-none">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Lembaga (LKS)</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Wilayah / Kecamatan</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-center text-slate-400">Total PM</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLksSelection.map((lks) => {
                  const pmCount = pmData.filter(p => p.lksId === lks.id).length;
                  return (
                    <tr key={lks.id} onClick={() => setSelectedLksId(lks.id)} className="transition-colors cursor-pointer group hover:bg-blue-50/50">
                      <td className="px-10 py-6"><p className="font-black text-sm uppercase tracking-tight text-slate-800">{lks.nama}</p></td>
                      <td className="px-10 py-6"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14} className="text-blue-500" /> {lks.kecamatan}</p></td>
                      <td className="px-10 py-6 text-center"><span className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 text-slate-700">{pmCount} PM</span></td>
                      <td className="px-10 py-6 text-right"><div className="flex items-center justify-end font-black text-[10px] uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-all text-blue-600">Buka Daftar <ChevronRight size={16} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-4">
              <button onClick={() => { setSelectedLksId(null); setSearchTerm(''); setSelectedPmIds(new Set()); }} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><ArrowLeft size={20} /></button>
              <div>
                <h3 className="font-black text-slate-800 text-xl leading-tight uppercase tracking-tight">{selectedLks?.nama}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total {filteredPm.length} Penerima Manfaat</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedPmIds.size > 0 ? (
                <button 
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 flex items-center gap-2 animate-in zoom-in-95"
                >
                  <Trash2 size={16} /> Hapus {selectedPmIds.size} Data
                </button>
              ) : (
                <div className="flex gap-2">
                   <button onClick={handleExportExcelPM} className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-2 font-black text-[9px] uppercase"><FileSpreadsheet size={16} /> EXCEL</button>
                   <button onClick={handleExportPDFPM} disabled={isGenerating} className="p-2.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-2 font-black text-[9px] uppercase">
                     {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} PDF
                   </button>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Cari Nama / NIK..." className="pl-10 pr-4 py-2.5 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden no-print">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white select-none">
                  <tr>
                    <th className="px-6 py-6 w-12 text-center">
                      <button onClick={handleToggleSelectAll} className="text-white hover:text-blue-400 transition-colors">
                        {selectedPmIds.size === filteredPm.length && filteredPm.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-800 transition-all" onClick={() => requestSort('nama')}>
                       <div className="flex items-center gap-2">Penerima Manfaat {getSortIcon('nama')}</div>
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-800 transition-all" onClick={() => requestSort('umur')}>
                       <div className="flex items-center gap-2">TTL / Usia {getSortIcon('umur')}</div>
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">JK</th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-800 transition-all" onClick={() => requestSort('asalDesa')}>
                       <div className="flex items-center gap-2">Asal Wilayah {getSortIcon('asalDesa')}</div>
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center cursor-pointer hover:bg-slate-800 transition-all" onClick={() => requestSort('kategori')}>
                       <div className="flex items-center justify-center gap-2">Kategori {getSortIcon('kategori')}</div>
                    </th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-400">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPm.map((pm) => (
                    <tr key={pm.id} className={`transition-colors group ${selectedPmIds.has(pm.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="px-6 py-6 text-center">
                        <button onClick={() => handleToggleSelectPm(pm.id)} className={`${selectedPmIds.has(pm.id) ? 'text-blue-600' : 'text-slate-300'}`}>
                           {selectedPmIds.has(pm.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                      </td>
                      <td className="px-6 py-6">
                        <button onClick={() => setViewingPm(pm)} className="font-black text-slate-800 text-sm uppercase hover:text-blue-600 transition-all text-left block leading-tight">{pm.nama}</button>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter">NIK: {pm.nik}</p>
                        <p className="text-[9px] text-slate-400 font-bold">KK: {pm.noKK || '-'}</p>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-[10px] font-black text-slate-700 uppercase leading-none">{pm.tempatLahir || '-'}, {formatDate(pm.tanggalLahir)}</p>
                        <p className="text-[11px] font-black text-slate-900 mt-1">{pm.umur || '0'} Tahun</p>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`text-[9px] font-black uppercase inline-block px-2 py-1 rounded-lg ${pm.jenisKelamin === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                          {pm.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                         <p className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 truncate max-w-[150px]">
                            <MapPin size={12} className="text-rose-500" /> {pm.asalDesa || '-'}
                         </p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-4">{pm.asalKecamatan || '-'}</p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${pm.kategori === 'Dalam' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {pm.kategori}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setViewingPm(pm)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all" title="Detail"><Eye size={18} /></button>
                          <button onClick={() => handleOpenEdit(pm)} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all" title="Edit"><Edit3 size={18} /></button>
                          <button onClick={() => { setDeleteConfirmPm(pm); setSelectedPmIds(new Set()); }} className="p-2.5 text-slate-300 hover:text-red-600 transition-all" title="Hapus"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPm.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-300 italic font-medium">Data PM tidak ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PDF PRINT SURFACE (HIDDEN) */}
      <div id="printable-pm-report" className="hidden p-12 bg-white text-black arial-force">
         <div className="text-center mb-8 border-b-4 border-double border-black pb-4">
            <h1 className="text-xl font-bold uppercase arial-force">PEMERINTAH KABUPATEN BLORA</h1>
            <h2 className="text-2xl font-black uppercase arial-force">DINAS SOSIAL PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK</h2>
            <div className="mt-6 pt-4 border-t border-black">
               <h3 className="text-lg font-bold underline uppercase arial-force">LAPORAN DATA PENERIMA MANFAAT (WARGA BINAAN)</h3>
               <p className="text-[10pt] font-black uppercase mt-1">LEMBAGA: {selectedLks?.nama}</p>
            </div>
         </div>
         <table className="w-full text-[8pt] border-collapse border border-black">
            <thead>
               <tr className="bg-slate-100 uppercase">
                  <th className="border border-black p-2">No</th>
                  <th className="border border-black p-2">Nama Lengkap</th>
                  <th className="border border-black p-2">NIK / No. KK</th>
                  <th className="border border-black p-2">TTL</th>
                  <th className="border border-black p-2">Usia</th>
                  <th className="border border-black p-2">JK</th>
                  <th className="border border-black p-2">Asal Wilayah</th>
                  <th className="border border-black p-2">Kategori</th>
               </tr>
            </thead>
            <tbody>
               {filteredPm.map((pm, idx) => (
                  <tr key={pm.id}>
                     <td className="border border-black p-2 text-center">{idx + 1}</td>
                     <td className="border border-black p-2 font-bold uppercase">{pm.nama}</td>
                     <td className="border border-black p-2">{pm.nik} / {pm.noKK || '-'}</td>
                     <td className="border border-black p-2 uppercase">{pm.tempatLahir || '-'}, {formatDate(pm.tanggalLahir)}</td>
                     <td className="border border-black p-2 text-center">{pm.umur} Thn</td>
                     <td className="border border-black p-2 text-center">{pm.jenisKelamin}</td>
                     <td className="border border-black p-2 uppercase">{pm.asalDesa}, {pm.asalKecamatan}, {pm.asalKabKota || 'Blora'}</td>
                     <td className="border border-black p-2 text-center uppercase font-bold">{pm.kategori}</td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* MODAL IMPORT */}
      {isImporting && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsImporting(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95">
             <div className="w-20 h-20 mx-auto bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner"><Upload size={36} /></div>
             <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter uppercase">Import Batch PM</h3>
             <p className="text-slate-400 text-[10px] font-bold uppercase mb-4">Pilih file CSV dengan format 12 kolom:</p>
             <div className="text-[8px] bg-slate-50 p-3 rounded-xl text-left mb-6 font-mono text-slate-500 overflow-x-auto whitespace-nowrap">
               Nama, NIK, NoKK, TempatLahir, TglLahir(YYYY-MM-DD), Umur, JK(L/P), Kab, Kec, Desa, Kategori(Dalam/Luar), Ket
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsImporting(false)} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase">Batal</button>
                <label className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg cursor-pointer flex items-center justify-center gap-2">
                   <FileSpreadsheet size={18} /> Pilih File
                   <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
                </label>
             </div>
          </div>
        </div>
      )}

      {/* MODAL VIEW DETAIL PM */}
      {viewingPm && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setViewingPm(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             <div className="p-8 border-b bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><User size={28}/></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl uppercase leading-tight">{viewingPm.nama}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Profil Penerima Manfaat</p>
                  </div>
                </div>
                <button onClick={() => setViewingPm(null)} className="p-2 text-slate-400 hover:bg-white rounded-xl"><X size={24}/></button>
             </div>
             <div className="p-10 space-y-6 overflow-y-auto max-h-[70vh] no-scrollbar">
                <div className="grid grid-cols-2 gap-6">
                   <DetailRow label="NIK" value={viewingPm.nik} />
                   <DetailRow label="No. KK" value={viewingPm.noKK || '-'} />
                   <DetailRow label="Tempat Lahir" value={viewingPm.tempatLahir || '-'} />
                   <DetailRow label="Tgl Lahir" value={formatDate(viewingPm.tanggalLahir)} />
                   <DetailRow label="Usia" value={`${viewingPm.umur || '0'} TAHUN`} />
                   <DetailRow label="Jenis Kelamin" value={viewingPm.jenisKelamin === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'} />
                   <DetailRow label="Kategori" value={viewingPm.kategori === 'Dalam' ? 'DALAM PANTI' : 'LUAR PANTI'} />
                   <DetailRow label="Kabupaten" value={viewingPm.asalKabKota || 'Blora'} />
                </div>
                <div className="pt-6 border-t">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Domisili Asal</p>
                   <p className="text-sm font-bold text-slate-800 uppercase leading-relaxed">
                    Desa {viewingPm.asalDesa || '-'}, Kec. {viewingPm.asalKecamatan || '-'}
                   </p>
                </div>
                <div className="pt-4">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Keterangan</p>
                   <p className="text-xs text-slate-600 italic">{viewingPm.keterangan || 'Tidak ada catatan.'}</p>
                </div>
             </div>
             <div className="p-8 bg-slate-50 border-t flex gap-4">
                <button onClick={() => handleOpenEdit(viewingPm)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Edit3 size={16}/> EDIT</button>
                <button onClick={() => setViewingPm(null)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase">TUTUP</button>
             </div>
          </div>
        </div>
      )}

      {/* FORM TAMBAH / EDIT PM */}
      {isAdding && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-0 lg:p-4">
          <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md" onClick={() => setIsAdding(false)}></div>
          <div className="relative bg-white w-full max-w-4xl h-full lg:h-auto lg:rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-500">
            <form onSubmit={handleSavePm} className="flex flex-col h-full">
              <div className="p-6 lg:p-10 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserPlus size={24}/></div>
                  <h3 className="text-xl lg:text-2xl font-black text-slate-800 uppercase tracking-tighter">{formData.id ? 'Update Data PM' : 'Input PM Baru'}</h3>
                </div>
                <button type="button" onClick={() => setIsAdding(false)} className="p-2 text-slate-400"><X size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 no-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">Identitas Kependudukan</h4>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nama Lengkap</label><input type="text" required value={formData.nama} onChange={e=>setFormData({...formData, nama: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">NIK</label><input type="text" required value={formData.nik} onChange={e=>setFormData({...formData, nik: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" maxLength={16} /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nomor KK</label><input type="text" value={formData.noKK} onChange={e=>setFormData({...formData, noKK: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" maxLength={16} /></div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Lembaga (LKS) Pengampu</label>
                        <div className="relative">
                           <input type="text" autoComplete="off" value={lksSearchTerm} onChange={e => {setLksSearchTerm(e.target.value); setShowLksDropdown(true);}} onFocus={() => setShowLksDropdown(true)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" placeholder="Cari LKS..." />
                           {showLksDropdown && (
                             <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto no-scrollbar py-2">
                                {lksData.filter(l => l.nama.toLowerCase().includes(lksSearchTerm.toLowerCase())).map(l => (
                                  <button key={l.id} type="button" onClick={() => {setFormData({...formData, lksId: l.id}); setLksSearchTerm(l.nama); setShowLksDropdown(false);}} className="w-full px-5 py-3 text-left text-xs font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-colors">{l.nama}</button>
                                ))}
                             </div>
                           )}
                        </div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Jenis Kelamin</label><select value={formData.jenisKelamin} onChange={e=>setFormData({...formData, jenisKelamin: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                   </div>
                   <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest">Kelahiran & Domisili</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tempat Lahir</label><input type="text" value={formData.tempatLahir} onChange={e=>setFormData({...formData, tempatLahir: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tgl Lahir</label><input type="date" value={formData.tanggalLahir} onChange={e=>setFormData({...formData, tanggalLahir: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold text-blue-600" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Usia (Otomatis)</label><div className="w-full px-5 py-4 bg-slate-100 border rounded-2xl font-black text-slate-800">{formData.umur || '0'} Tahun</div></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kabupaten</label><input type="text" value={formData.asalKabKota} onChange={e=>setFormData({...formData, asalKabKota: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border rounded-2xl font-bold" readOnly /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kecamatan Asal</label><select value={formData.asalKecamatan} onChange={e=>setFormData({...formData, asalKecamatan: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold"><option value="">-- Pilih --</option>{KECAMATAN_BLORA.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Desa Asal</label><input type="text" value={formData.asalDesa} onChange={e=>setFormData({...formData, asalDesa: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Status Keberadaan</label><select value={formData.kategori} onChange={e=>setFormData({...formData, kategori: e.target.value as any})} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold"><option value="Dalam">Dalam Panti</option><option value="Luar">Luar Panti</option></select></div>
                   </div>
                </div>
              </div>
              <div className="p-8 bg-slate-50 border-t flex justify-end gap-4">
                 <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Batal</button>
                 <button type="submit" className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2"><Save size={18}/> Simpan Data PM</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS MASSAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsBulkDeleteModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95">
             <div className="w-20 h-20 mx-auto bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner"><AlertTriangle size={40} /></div>
             <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Hapus Massal?</h3>
             <p className="text-xs text-slate-400 font-bold uppercase mb-8">Anda akan menghapus <span className="text-rose-600">{selectedPmIds.size}</span> data Penerima Manfaat secara permanen.</p>
             <div className="flex gap-4">
                <button onClick={() => setIsBulkDeleteModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase">Batal</button>
                <button onClick={handleBulkDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Ya, Hapus Semua</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS SATUAN */}
      {deleteConfirmPm && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setDeleteConfirmPm(null)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 text-center shadow-2xl animate-in zoom-in-95">
             <div className="w-20 h-20 mx-auto bg-slate-50 text-slate-400 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner"><Trash2 size={40} /></div>
             <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Hapus Data?</h3>
             <p className="text-xs text-slate-400 font-bold uppercase mb-8">Data {deleteConfirmPm.nama} akan dihapus.</p>
             <div className="flex gap-4">
                <button onClick={() => setDeleteConfirmPm(null)} className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase">Batal</button>
                <button onClick={() => {
                  setPmData(prev => prev.filter(p => p.id !== deleteConfirmPm.id));
                  if (onNotify) onNotify('Hapus PM', deleteConfirmPm.nama);
                  setDeleteConfirmPm(null);
                }} className="flex-1 py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">Hapus</button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .arial-force { font-family: Arial, sans-serif !important; }
      `}</style>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string | number }) => (
  <div className="space-y-1">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
    <p className="text-sm font-black text-slate-800 uppercase leading-tight">{value}</p>
  </div>
);

export default PenerimaManfaatPage;
