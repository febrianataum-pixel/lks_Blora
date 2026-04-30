
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Users, MapPin, Printer, Download, 
  ChevronRight, Calendar, User, Home, Globe, Hash,
  AlertCircle, CheckCircle2, X, RefreshCw, Loader2, Landmark
} from 'lucide-react';
import { LKS, PenerimaManfaat as PMType, PMKategori } from '../types';
import { KECAMATAN_BLORA } from '../constants';

declare const html2pdf: any;

interface AdvancedSearchPageProps {
  lksData: LKS[];
  pmData: PMType[];
}

const AdvancedSearchPage: React.FC<AdvancedSearchPageProps> = ({ lksData, pmData }) => {
  const [filters, setFilters] = useState({
    query: '',
    minAge: '',
    maxAge: '',
    kecamatan: 'Semua',
    kategori: 'Semua',
    jenisKelamin: 'Semua'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredResults = useMemo(() => {
    return pmData.filter(pm => {
      const matchesQuery = pm.nama.toLowerCase().includes(filters.query.toLowerCase()) || 
                          pm.nik.includes(filters.query);
      
      const age = pm.umur || 0;
      const minAge = filters.minAge === '' ? 0 : parseInt(filters.minAge);
      const maxAge = filters.maxAge === '' ? 200 : parseInt(filters.maxAge);
      const matchesAge = age >= minAge && age <= maxAge;
      
      const matchesKec = filters.kecamatan === 'Semua' || pm.asalKecamatan === filters.kecamatan;
      const matchesKat = filters.kategori === 'Semua' || pm.kategori === filters.kategori;
      const matchesJK = filters.jenisKelamin === 'Semua' || pm.jenisKelamin === filters.jenisKelamin;

      return matchesQuery && matchesAge && matchesKec && matchesKat && matchesJK;
    });
  }, [pmData, filters]);

  const handlePrintPDF = async () => {
    const element = document.getElementById('printable-search-results');
    if (!element) return;
    setIsGenerating(true);
    
    const options = {
      margin: 10,
      filename: `Laporan_Pencarian_PM_Blora_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
      element.classList.remove('hidden');
      await html2pdf().set(options).from(element).save();
      element.classList.add('hidden');
    } catch (err) {
      alert('Gagal mencetak PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      query: '',
      minAge: '',
      maxAge: '',
      kecamatan: 'Semua',
      kategori: 'Semua',
      jenisKelamin: 'Semua'
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Header Halaman */}
      <div className="bg-slate-900 rounded-[2.5rem] lg:rounded-[3rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div className="relative z-10">
          <h2 className="text-2xl lg:text-3xl font-black mb-2 uppercase tracking-tighter">Pencarian Tingkat Lanjut</h2>
          <p className="text-slate-400 text-xs lg:text-sm font-bold uppercase tracking-widest">Pusat Filter Data Global Penerima Manfaat Kabupaten Blora</p>
        </div>
        <div className="flex gap-3 relative z-10">
           <button onClick={handlePrintPDF} disabled={isGenerating || filteredResults.length === 0} className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50">
             {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} 
             CETAK HASIL (PDF)
           </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
      </div>

      {/* Panel Filter */}
      <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-sm space-y-8 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
           {/* Pencarian Nama/NIK */}
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><User size={14}/> Nama atau NIK</label>
              <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                 <input 
                    type="text" 
                    placeholder="Contoh: Andi Saputra..." 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={filters.query}
                    onChange={e => setFilters({...filters, query: e.target.value})}
                 />
              </div>
           </div>

           {/* Rentang Usia */}
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Calendar size={14}/> Rentang Usia (Tahun)</label>
              <div className="flex items-center gap-2">
                 <input 
                    type="number" 
                    placeholder="Min" 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                    value={filters.minAge}
                    onChange={e => setFilters({...filters, minAge: e.target.value})}
                 />
                 <span className="text-slate-300 font-bold">s/d</span>
                 <input 
                    type="number" 
                    placeholder="Max" 
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                    value={filters.maxAge}
                    onChange={e => setFilters({...filters, maxAge: e.target.value})}
                 />
              </div>
           </div>

           {/* Wilayah / Kecamatan */}
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><MapPin size={14}/> Wilayah (Kecamatan)</label>
              <select 
                 className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                 value={filters.kecamatan}
                 onChange={e => setFilters({...filters, kecamatan: e.target.value})}
              >
                 <option value="Semua">-- Semua Kecamatan --</option>
                 {KECAMATAN_BLORA.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
           </div>

           {/* Status Keberadaan */}
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Home size={14}/> Status Keberadaan</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                 {['Semua', 'Dalam', 'Luar'].map(cat => (
                   <button 
                      key={cat} 
                      onClick={() => setFilters({...filters, kategori: cat})}
                      className={`py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filters.kategori === cat ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {cat}
                   </button>
                 ))}
              </div>
           </div>

           {/* Jenis Kelamin */}
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Users size={14}/> Jenis Kelamin</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                 {['Semua', 'L', 'P'].map(jk => (
                   <button 
                      key={jk} 
                      onClick={() => setFilters({...filters, jenisKelamin: jk})}
                      className={`py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filters.jenisKelamin === jk ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                     {jk === 'Semua' ? 'SEMUA' : jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}
                   </button>
                 ))}
              </div>
           </div>

           {/* Aksi */}
           <div className="flex items-end">
              <button 
                onClick={resetFilters} 
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                <RefreshCw size={14} /> RESET FILTER
              </button>
           </div>
        </div>
      </div>

      {/* Ringkasan & Hasil */}
      <div className="bg-white rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden no-print">
        <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
           <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hasil Pencarian</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ditemukan {filteredResults.length} data PM yang sesuai</p>
           </div>
           <div className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2">
              <CheckCircle2 size={16} /> Data Terverifikasi
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Penerima Manfaat</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Usia / JK</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Lembaga (LKS)</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Wilayah</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map(pm => {
                const lks = lksData.find(l => l.id === pm.lksId);
                return (
                  <tr key={pm.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-8 py-6">
                       <p className="font-black text-slate-800 text-sm uppercase">{pm.nama}</p>
                       <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-tighter">NIK: {pm.nik}</p>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-sm font-black text-slate-700">{pm.umur || '-'} Thn</p>
                       <span className={`text-[9px] font-black uppercase ${pm.jenisKelamin === 'L' ? 'text-blue-500' : 'text-rose-500'}`}>{pm.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <Landmark size={14} className="text-slate-300" />
                          <p className="text-xs font-bold text-slate-600 uppercase truncate max-w-[200px]">{lks?.nama || 'Unknown'}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                          <MapPin size={12} className="text-rose-500" /> {pm.asalDesa}, {pm.asalKecamatan}
                       </p>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${pm.kategori === 'Dalam' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {pm.kategori === 'Dalam' ? 'Dalam Panti' : 'Luar Panti'}
                       </span>
                    </td>
                  </tr>
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-slate-300 italic font-medium">Tidak ada data yang cocok dengan kriteria filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT AREA (Hidden by default) */}
      <div id="printable-search-results" className="hidden p-12 bg-white text-black arial-force">
         <div className="text-center mb-8 border-b-4 border-double border-black pb-4">
            <h1 className="text-xl font-bold uppercase arial-force">PEMERINTAH KABUPATEN BLORA</h1>
            <h2 className="text-2xl font-black uppercase arial-force">DINAS SOSIAL PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK</h2>
            <div className="mt-6 pt-4 border-t border-black">
               <h3 className="text-lg font-bold underline uppercase arial-force">LAPORAN REKAPITULASI PENERIMA MANFAAT (HASIL PENCARIAN)</h3>
               <p className="text-[10pt] font-medium mt-2">Kriteria: Usia {filters.minAge || '0'}-{filters.maxAge || '100'} Thn | Wilayah: {filters.kecamatan} | Status: {filters.kategori}</p>
            </div>
         </div>
         <table className="w-full text-[9pt] border-collapse border border-black">
            <thead>
               <tr className="bg-slate-100">
                  <th className="border border-black p-2">No</th>
                  <th className="border border-black p-2">Nama Lengkap</th>
                  <th className="border border-black p-2">NIK</th>
                  <th className="border border-black p-2">JK</th>
                  <th className="border border-black p-2">Usia</th>
                  <th className="border border-black p-2">Lembaga (LKS)</th>
                  <th className="border border-black p-2">Alamat Asal</th>
                  <th className="border border-black p-2">Keberadaan</th>
               </tr>
            </thead>
            <tbody>
               {filteredResults.map((pm, idx) => (
                  <tr key={pm.id}>
                     <td className="border border-black p-2 text-center">{idx + 1}</td>
                     <td className="border border-black p-2 font-bold uppercase">{pm.nama}</td>
                     <td className="border border-black p-2">{pm.nik}</td>
                     <td className="border border-black p-2 text-center">{pm.jenisKelamin}</td>
                     <td className="border border-black p-2 text-center">{pm.umur} Thn</td>
                     <td className="border border-black p-2 text-[8pt]">{lksData.find(l => l.id === pm.lksId)?.nama}</td>
                     <td className="border border-black p-2 text-[8pt] uppercase">{pm.asalDesa}, {pm.asalKecamatan}</td>
                     <td className="border border-black p-2 text-center uppercase font-bold">{pm.kategori}</td>
                  </tr>
               ))}
            </tbody>
         </table>
         <div className="mt-8 flex justify-end">
            <div className="text-center w-64 arial-force">
               <p>Blora, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
               <p>Mengetahui,</p>
               <p className="mt-20 font-bold underline">Petugas Administrator</p>
               <p className="text-[8pt]">SI-LKS Kabupaten Blora</p>
            </div>
         </div>
      </div>

      <style>{`
        .arial-force { font-family: Arial, sans-serif !important; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default AdvancedSearchPage;
