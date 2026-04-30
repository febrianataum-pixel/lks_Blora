
import React, { useState, useRef, useEffect } from 'react';
import { Plus, FileText, Printer, Save, Trash2, Calendar, Upload, ArrowLeft, Bold, Italic, AlignLeft, AlignCenter, Search, Mail, MapPin, User, Hash, X, ImageIcon, RefreshCw, HelpCircle, Loader2, List, Type, Underline, Copy, Edit3, AlertTriangle, FileJson, CheckCircle, Camera, RotateCcw } from 'lucide-react';
import { LKS, LetterRecord } from '../types';

declare const html2pdf: any;

interface RekomendasiPageProps {
  lksData: LKS[];
  letters: LetterRecord[];
  setLetters: React.Dispatch<React.SetStateAction<LetterRecord[]>>;
  onNotify?: (action: string, target: string) => void;
  appLogo?: string | null;
}

const RekomendasiPage: React.FC<RekomendasiPageProps> = ({ lksData, letters, setLetters, onNotify, appLogo }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSavingConcept, setIsSavingConcept] = useState(false);
  
  const defaultLogo = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Coat_of_arms_of_Blora_Regency.svg/1200px-Coat_of_arms_of_Blora_Regency.svg.png";

  const initialFormData = {
    nomorSurat: '400.9/         /2025',
    tanggalSurat: new Date().toISOString().split('T')[0],
    lksId: '',
    perihal: 'Rekomendasi',
    lampiran: 'Proposal',
    recipientName: 'Kepala Dinas Sosial Provinsi Jawa Tengah',
    recipientLocation: 'Semarang',
    penandatanganJabatan: 'Kepala Dinas Sosial Pemberdayaan Perempuan dan Perlindungan Anak Kabupaten Blora',
    namaPenandatangan: 'LULUK KUSUMA AGUNG ARIADI, AP',
    pangkatPenandatangan: 'Pembina Utama Muda',
    nipPenandatangan: '19760817 199511 1 003',
    letterLogo: appLogo || defaultLogo
  };

  const [formData, setFormData] = useState(initialFormData);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedConcept = localStorage.getItem('si-lks-letter-concept');
    if (savedConcept && !editingLetterId && isCreating) {
      const concept = JSON.parse(savedConcept);
      setFormData(prev => ({ 
        ...prev, 
        ...concept, 
        lksId: prev.lksId, 
        nomorSurat: prev.nomorSurat, 
        tanggalSurat: prev.tanggalSurat 
      }));
      if (editorRef.current) editorRef.current.innerHTML = concept.konten;
    }
  }, [isCreating, editingLetterId]);

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const compressImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
      };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file, 300);
      setFormData(prev => ({ ...prev, letterLogo: base64 }));
    }
  };

  const handleSaveConcept = () => {
    setIsSavingConcept(true);
    const conceptData = {
      ...formData,
      konten: editorRef.current?.innerHTML || ''
    };
    localStorage.setItem('si-lks-letter-concept', JSON.stringify(conceptData));
    setTimeout(() => {
      setIsSavingConcept(false);
      alert('Konsep surat berhasil disimpan sebagai template.');
      if (onNotify) onNotify('Simpan Konsep', 'Template Surat');
    }, 800);
  };

  const handleResetConcept = () => {
    if (confirm('Hapus template yang tersimpan dan kembali ke pengaturan awal?')) {
      localStorage.removeItem('si-lks-letter-concept');
      setFormData(initialFormData);
      if (editorRef.current) {
        editorRef.current.innerHTML = '<p>Ketik isi surat di sini...</p>';
      }
      alert('Template telah direset.');
    }
  };

  useEffect(() => {
    if (formData.lksId && editorRef.current && !editingLetterId) {
      const selectedLks = lksData.find(l => l.id === formData.lksId);
      const savedConcept = localStorage.getItem('si-lks-letter-concept');
      
      if (!savedConcept && selectedLks) {
        editorRef.current.innerHTML = `
          <div style="margin-bottom: 12px;"><p>Yth.: ${formData.recipientName}</p><p>di</p><p style="text-indent: 40px;"><u>${formData.recipientLocation}</u></p></div><br/>
          <p style="text-indent: 40px; text-align: justify;">Berdasarkan surat dari "${selectedLks.nama}" Nomor : [Nomor_LKS] perihal Permohonan Rekomendasi Bantuan, kami sampaikan hal-hal sebagai berikut :</p>
          <ol style="margin-left: 40px; text-align: justify;"><li>Bahwa "${selectedLks.nama}" merupakan LKS terdaftar di Dinas Sosial P3A Kabupaten Blora.</li><li>Kegiatan sosial bergerak dalam bidang ${selectedLks.jenisBantuan}.</li></ol>
          <p style="text-align: justify;">Demikian rekomendasi ini kami buat untuk digunakan sebagaimana mestinya.</p>
        `;
      }
    }
  }, [formData.lksId, lksData, editingLetterId]);

  const handleSave = () => {
    if (!formData.lksId) return alert('Pilih LKS dahulu');
    const letterToSave = { 
      ...formData, 
      id: editingLetterId || Math.random().toString(36).substr(2, 9), 
      tanggal: new Date(formData.tanggalSurat).toISOString(), 
      konten: editorRef.current?.innerHTML || '' 
    };
    if (editingLetterId) { 
      setLetters(prev => prev.map(l => l.id === editingLetterId ? (letterToSave as any) : l)); 
      if (onNotify) onNotify('Update Surat', formData.nomorSurat); 
    }
    else { 
      setLetters(prev => [letterToSave as any, ...prev]); 
      if (onNotify) onNotify('Buat Surat', formData.nomorSurat); 
    }
    setIsCreating(false); setEditingLetterId(null); setFormData(initialFormData);
  };

  const handleEdit = (letter: LetterRecord) => {
    setFormData({ ...initialFormData, ...letter, tanggalSurat: new Date(letter.tanggal).toISOString().split('T')[0] });
    setEditingLetterId(letter.id); setIsCreating(true);
    setTimeout(() => { if (editorRef.current) editorRef.current.innerHTML = letter.konten; }, 100);
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('print-letter-surface');
    if (!element) return;
    setIsGenerating(true);
    const options = { 
      margin: 5, 
      filename: `Rekomendasi_${formData.nomorSurat.replace(/\//g, '-')}.pdf`, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try { await html2pdf().set(options).from(element).save(); } catch (err) { alert('Gagal.'); } finally { setIsGenerating(false); }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!isCreating ? (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 no-print">
            <div className="relative z-10"><h2 className="text-3xl font-black mb-3">Arsip Rekomendasi</h2><p className="text-slate-400 text-lg font-medium">Manajemen pembuatan surat rekomendasi resmi.</p></div>
            <button onClick={() => { setFormData(initialFormData); setEditingLetterId(null); setIsCreating(true); }} className="relative z-10 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all flex items-center gap-2"><Plus size={20} /> BUAT SURAT BARU</button>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
            {letters.map(l => (
              <div key={l.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><FileText size={24} /></div><div className="flex gap-1"><button onClick={() => handleEdit(l)} className="p-2 text-slate-300 hover:text-blue-600 transition-all"><Edit3 size={18} /></button><button onClick={() => { setLetters(prev => [ { ...l, id: Math.random().toString(36).substr(2, 9), nomorSurat: l.nomorSurat + ' (Copy)' }, ...prev ]); }} className="p-2 text-slate-300 hover:text-emerald-600 transition-all"><Copy size={18} /></button><button onClick={() => setDeleteConfirmId(l.id)} className="p-2 text-slate-300 hover:text-red-600 transition-all"><Trash2 size={18} /></button></div></div>
                <h3 className="font-black text-slate-800 mb-2 truncate">{l.nomorSurat}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-4"><Calendar size={14} className="text-blue-500" /> {formatDate(l.tanggal)}</p>
                <div className="pt-4 border-t flex items-center justify-between"><p className="text-[10px] font-black text-slate-600 truncate uppercase">LKS: {lksData.find(item => item.id === l.lksId)?.nama}</p><button onClick={() => handleEdit(l)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Buka Surat</button></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between no-print">
            <button onClick={() => { setIsCreating(false); setEditingLetterId(null); }} className="flex items-center gap-3 px-5 py-2.5 bg-white border rounded-2xl text-slate-500 font-black text-xs uppercase hover:text-blue-600 transition-all"><ArrowLeft size={18} /> Kembali</button>
            <div className="flex gap-3">
              <button onClick={handleResetConcept} className="p-3 bg-white border border-rose-100 text-rose-500 rounded-2xl hover:bg-rose-50 transition-all" title="Reset Template">
                <RotateCcw size={20} />
              </button>
              <button onClick={handleSaveConcept} disabled={isSavingConcept} className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                {isSavingConcept ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16} />} SIMPAN KONSEP
              </button>
              <button onClick={handleDownloadPDF} disabled={isGenerating} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl disabled:opacity-50 flex items-center gap-2">{isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />} UNDUH PDF</button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl">SIMPAN ARSIP</button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-4 no-print h-fit sticky top-24 overflow-y-auto max-h-[85vh] no-scrollbar pr-2">
               <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase border-b pb-2 tracking-widest">I. Data Lembaga & Surat</h4>
                    <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs" value={formData.lksId} onChange={e=>setFormData({...formData, lksId: e.target.value})}><option value="">-- Pilih Lembaga --</option>{lksData.map(l => <option key={l.id} value={l.id}>{l.nama}</option>)}</select>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nomor Surat</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={formData.nomorSurat} onChange={e=>setFormData({...formData, nomorSurat: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tujuan (Yth.)</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={formData.recipientName} onChange={e=>setFormData({...formData, recipientName: e.target.value})} /></div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase border-b pb-2 tracking-widest">II. Kop & Penandatangan</h4>
                    <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                       <div className="w-16 h-16 bg-white rounded-xl shadow-sm overflow-hidden flex items-center justify-center border">
                          <img src={formData.letterLogo} className="w-full h-full object-contain" alt="Logo" />
                       </div>
                       <label className="cursor-pointer px-4 py-2 bg-white border rounded-xl text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                          UNGGAH LOGO KOP
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                       </label>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Kepala Dinas</label>
                       <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={formData.namaPenandatangan} onChange={e=>setFormData({...formData, namaPenandatangan: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-1">NIP Pejabat</label>
                       <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold" value={formData.nipPenandatangan} onChange={e=>setFormData({...formData, nipPenandatangan: e.target.value})} />
                    </div>
                  </div>
               </div>
            </div>
            <div className="lg:col-span-3">
              <div id="print-letter-surface" className="bg-white min-h-[1100px] shadow-2xl p-[1cm_1.5cm] arial-force relative text-black">
                 <div className="flex items-center gap-8 border-b-4 border-double border-black pb-2 mb-4 text-center justify-center arial-force">
                    <img src={formData.letterLogo} className="max-h-24 max-w-[100px] object-contain" alt="Logo" />
                    <div className="flex-1 arial-force">
                      <h1 className="text-lg font-bold uppercase leading-tight arial-force">PEMERINTAH KABUPATEN BLORA</h1>
                      <h2 className="text-xl font-black uppercase leading-tight arial-force">DINAS SOSIAL PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK</h2>
                      <p className="text-[8.5pt] font-medium mt-0.5 arial-force">Jl. Pemuda No.16 A Blora 58215, No. Tlp: (0296) 5298541</p>
                    </div>
                 </div>
                 <div className="text-[11.5pt] leading-tight text-black arial-force">
                    <div className="flex justify-between items-start mb-4 relative">
                      <div className="grid grid-cols-[80px_10px_1fr] gap-x-1 arial-force">
                        <span>Nomor</span><span>:</span><span>{formData.nomorSurat}</span><span>Lampiran</span><span>:</span><span>{formData.lampiran}</span><span>Hal</span><span>:</span><span className="font-bold underline uppercase">{formData.perihal}</span>
                      </div>
                      <div className="text-right whitespace-nowrap"><span>Blora, {formatDate(formData.tanggalSurat)}</span></div>
                    </div>
                    <div ref={editorRef} contentEditable className="min-h-[600px] outline-none text-justify whitespace-pre-wrap leading-relaxed letter-body arial-force" />
                    <div className="flex justify-end pt-4 arial-force">
                      <div className="text-left w-[350px]">
                        <p className="font-normal leading-tight arial-force">{formData.penandatanganJabatan}</p>
                        <div className="h-20"></div>
                        <p className="font-bold border-b border-black inline-block uppercase">{formData.namaPenandatangan}</p>
                        <p className="text-[11pt]">NIP. {formData.nipPenandatangan}</p>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .arial-force { font-family: Arial, Helvetica, sans-serif !important; }
        .letter-body p { margin-bottom: 0.5rem; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default RekomendasiPage;
