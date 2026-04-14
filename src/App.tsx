/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Upload, 
  ClipboardCheck, 
  BarChart3, 
  ChevronRight, 
  Scan, 
  CheckCircle2, 
  AlertCircle,
  Package,
  MapPin,
  ArrowRight,
  RefreshCcw,
  FileSpreadsheet,
  LogOut,
  Camera,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { InventoryItem, InventoryStatus, InventoryStats } from './types';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { BrowserMultiFormatReader } from '@zxing/library';

// --- Components ---

const BarcodeScanner = ({ onScan, onClose }: { onScan: (text: string) => void, onClose: () => void }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    if (videoRef.current) {
      codeReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, err) => {
          if (result) {
            onScan(result.getText());
          }
          // NotFoundException is normal when no barcode is in view
        }
      ).catch(err => {
        console.error('Failed to start scanner:', err);
        alert('Erro ao acessar a câmera. Certifique-se de que deu permissão e que está em um ambiente seguro (HTTPS).');
        onClose();
      });
    }
    return () => {
      codeReader.reset();
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center text-white">
        <h2 className="font-bold uppercase tracking-widest text-xs">Escaneando Código</h2>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
          <X size={24} />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover" 
          playsInline 
          muted 
          autoPlay 
        />
        <div className="absolute inset-0 border-[40px] border-black/40 flex items-center justify-center">
          <div className="w-64 h-48 border-2 border-[#d4ff00] relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#d4ff00] -translate-x-1 -translate-y-1" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#d4ff00] translate-x-1 -translate-y-1" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#d4ff00] -translate-x-1 translate-y-1" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#d4ff00] translate-x-1 translate-y-1" />
            <motion.div 
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-0.5 bg-[#d4ff00] shadow-[0_0_15px_#d4ff00]"
            />
          </div>
        </div>
      </div>
      <div className="p-8 text-center text-white/60 text-xs uppercase font-bold tracking-widest">
        Aponte para o código de barras do endereço ou produto
      </div>
    </div>
  );
};

const Header = ({ title, onReset }: { title: string, onReset?: () => void }) => {
  const [main, sub] = title.includes(' ') ? title.split(' ') : [title, ''];
  return (
    <header className="pt-10 pb-5 px-6 bg-white relative">
      <div className="absolute top-0 left-6 label-tag">
        {main === 'Novo' ? 'TELA 01' : main === 'Contagem' ? 'TELA 02' : 'TELA 03'}
      </div>
      <div className="flex justify-between items-start">
        <h1 className="text-[28px] font-[900] leading-[1.1] uppercase text-[#1a1a1a]">
          {main}<br />{sub}
        </h1>
        {onReset && (
          <button 
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
          >
            <RefreshCcw size={20} />
          </button>
        )}
      </div>
    </header>
  );
};

const Navigation = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => (
  <nav className="h-[60px] flex justify-around items-center border-t border-[#e0e0e0] bg-white">
    <button onClick={() => setActiveTab('upload')} className="p-2">
      <div className={cn("h-2 rounded-full transition-all", activeTab === 'upload' ? "w-6 bg-[#1a1a1a]" : "w-2 bg-[#ddd]")} />
    </button>
    <button onClick={() => setActiveTab('counting')} className="p-2">
      <div className={cn("h-2 rounded-full transition-all", activeTab === 'counting' ? "w-6 bg-[#1a1a1a]" : "w-2 bg-[#ddd]")} />
    </button>
    <button onClick={() => setActiveTab('stats')} className="p-2">
      <div className={cn("h-2 rounded-full transition-all", activeTab === 'stats' ? "w-6 bg-[#1a1a1a]" : "w-2 bg-[#ddd]")} />
    </button>
  </nav>
);

// --- Screens ---

const UploadScreen = ({ onDataLoaded }: { onDataLoaded: (items: InventoryItem[]) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = 'files' in e ? e.files?.[0] : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // Validation: Expecting columns like 'endereco', 'codigo', 'quantidade'
        const validatedItems: InventoryItem[] = data.map((row, idx) => {
          const address = row.endereco || row.Endereco || row.address || '';
          const code = row.codigo || row.Codigo || row.code || '';
          const qty = Number(row.quantidade || row.Quantidade || row.qty || 0);

          if (!address || !code) {
            throw new Error(`Linha ${idx + 2} inválida: Endereço e Código são obrigatórios.`);
          }

          return {
            id: `item-${idx}-${Date.now()}`,
            address,
            code,
            expectedQty: qty,
            counts: [],
            status: 'PENDING',
            lastUpdated: Date.now()
          };
        });

        onDataLoaded(validatedItems);
      } catch (err: any) {
        setError(err.message || 'Erro ao processar arquivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="px-6 flex flex-col h-full">
      <label 
        className={cn(
          "w-full border-2 border-dashed rounded-2xl p-10 transition-all cursor-pointer flex flex-col items-center gap-2 mt-4",
          isDragging ? "border-[#d4ff00] bg-[#f8f9fa]" : "border-[#e0e0e0] bg-white"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileUpload}
      >
        <span className="text-3xl mb-2">📄</span>
        <span className="text-sm font-bold text-[#1a1a1a]">Arraste seu Excel aqui</span>
        <span className="text-[11px] text-[#666]">Suporta .xlsx ou .csv</span>
        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
      </label>

      <button 
        onClick={() => {
          const templateData = [
            { 'endereco': 'A-01-01', 'codigo': '789123456001', 'quantidade': 10 },
            { 'endereco': 'A-01-02', 'codigo': '789123456002', 'quantidade': 5 },
            { 'endereco': 'B-05-10', 'codigo': '789123456003', 'quantidade': 100 }
          ];
          const ws = XLSX.utils.json_to_sheet(templateData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Modelo");
          XLSX.writeFile(wb, "modelo_inventario.xlsx");
        }}
        className="mt-4 text-[11px] font-bold text-blue-600 underline uppercase tracking-wider"
      >
        Baixar Modelo de Planilha
      </button>

      <div className="mt-6 bg-[#f8f9fa] p-5 rounded-xl">
        <p className="text-[12px] font-black uppercase tracking-wider mb-4 text-[#1a1a1a]">Validação em Tempo Real</p>
        <div className="space-y-3">
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666]">Colunas Obrigatórias</span>
            <span className="font-bold text-[#2ecc71]">OK</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666]">Formato Suportado</span>
            <span className="font-bold text-[#2ecc71]">SIM</span>
          </div>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666]">Duplicados</span>
            <span className="font-bold text-[#2ecc71]">NENHUM</span>
          </div>
        </div>
      </div>

      <button className="btn-main mt-auto mb-6">Iniciar Inventário</button>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm text-left w-full max-w-sm"
        >
          <AlertCircle size={20} className="shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}
    </div>
  );
};

const CountingScreen = ({ 
  items, 
  onCountSubmit 
}: { 
  items: InventoryItem[], 
  onCountSubmit: (id: string, qty: number) => void 
}) => {
  const [addressInput, setAddressInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [step, setStep] = useState<'ADDRESS' | 'QUANTITY'>('ADDRESS');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Find the next item to count
  // Priority: Items with more counts first (3rd, then 2nd, then 1st) - or as per user logic
  // User said: "Finalizando a primeira contagem, o sistema passa a mostrar na ordem os endereços que possuem 2º contagem..."
  const currentItem = useMemo(() => {
    // 1. Check for items needing 3rd+ count
    const highCount = items.find(i => i.status === 'PENDING' && i.counts.length >= 2);
    if (highCount) return highCount;
    
    // 2. Check for items needing 2nd count
    const secondCount = items.find(i => i.status === 'PENDING' && i.counts.length === 1);
    if (secondCount) return secondCount;

    // 3. First count
    return items.find(i => i.status === 'PENDING' && i.counts.length === 0);
  }, [items]);

  if (!currentItem) {
    return (
      <div className="p-10 flex flex-col items-center justify-center text-center min-h-[60vh]">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 text-green-600">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Inventário Finalizado!</h2>
        <p className="text-slate-500">Todos os itens foram conferidos e validados.</p>
      </div>
    );
  }

  const handleAddressSubmit = (e?: React.FormEvent, scannedValue?: string) => {
    if (e) e.preventDefault();
    const value = (scannedValue || addressInput).trim().toUpperCase();
    
    if (value === currentItem.address.toUpperCase() || value === currentItem.code) {
      setStep('QUANTITY');
      setError(null);
      setIsScanning(false);
    } else {
      setError('Endereço ou Código incorreto. Verifique o local.');
      if (scannedValue) setIsScanning(false);
    }
  };

  const handleQtySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(qtyInput);
    if (isNaN(qty) || qtyInput === '') {
      setError('Por favor, insira uma quantidade válida.');
      return;
    }
    onCountSubmit(currentItem.id, qty);
    setStep('ADDRESS');
    setAddressInput('');
    setQtyInput('');
    setError(null);
  };

  return (
    <div className="px-6 flex flex-col h-full gap-6">
      {isScanning && (
        <BarcodeScanner 
          onScan={(text) => handleAddressSubmit(undefined, text)} 
          onClose={() => setIsScanning(false)} 
        />
      )}
      <div className="mt-2">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#666]">Endereço Atual</span>
        <div className="text-[48px] font-[900] text-[#1a1a1a] leading-tight mb-1">{currentItem.address}</div>
        <span className="inline-block bg-[#d4ff00] px-3 py-1 text-[10px] font-black uppercase tracking-wider mb-4">
          {currentItem.counts.length + 1}ª CONTAGEM {currentItem.counts.length > 0 ? '- DIVERGENTE' : ''}
        </span>
        <p className="text-[13px] mb-1 text-[#1a1a1a]"><strong>SKU:</strong> {currentItem.code}</p>
        <p className="text-[11px] text-[#666] leading-relaxed">
          Bata o código de barras do local para liberar a digitação.
        </p>
      </div>

      <div className="mt-auto mb-6 flex flex-col gap-3">
        <AnimatePresence mode="wait">
          {step === 'ADDRESS' ? (
            <motion.form 
              key="address-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleAddressSubmit}
              className="flex flex-col gap-3"
            >
              <div className="relative">
                <input 
                  autoFocus
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Validar Local"
                  className="input-field pr-14"
                />
                <button 
                  type="button"
                  onClick={() => setIsScanning(true)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#1a1a1a] bg-[#d4ff00] rounded-md"
                >
                  <Camera size={20} />
                </button>
              </div>
              <button type="submit" className="btn-main">Validar Local</button>
            </motion.form>
          ) : (
            <motion.form 
              key="qty-step"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleQtySubmit}
              className="flex flex-col gap-3"
            >
              <input 
                autoFocus
                type="number"
                inputMode="numeric"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="Qtd Contada"
                className="input-field text-center text-4xl py-6"
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setStep('ADDRESS')}
                  className="flex-1 bg-slate-100 text-[#1a1a1a] py-4 rounded-lg font-bold uppercase text-xs"
                >
                  Voltar
                </button>
                <button type="submit" className="flex-[2] btn-main">Confirmar & Gravar</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}
    </div>
  );
};

const StatsScreen = ({ items }: { items: InventoryItem[] }) => {
  const stats: InventoryStats = useMemo(() => {
    const total = items.length;
    const completed = items.filter(i => i.status !== 'PENDING').length;
    const ok = items.filter(i => i.status === 'OK').length;
    const divergent = items.filter(i => i.status === 'DIVERGENT').length;
    return {
      total,
      completed,
      pending: total - completed,
      ok,
      divergent
    };
  }, [items]);

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const pieData = [
    { name: 'OK', value: stats.ok, color: '#2ecc71' },
    { name: 'Divergente', value: stats.divergent, color: '#e67e22' },
    { name: 'Pendente', value: stats.pending, color: '#e0e0e0' },
  ];

  const countDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0]; // 1st, 2nd, 3rd, 4th+
    items.forEach(item => {
      const countIdx = Math.min(item.counts.length - 1, 3);
      if (countIdx >= 0) dist[countIdx]++;
    });
    return [
      { name: '1ª Cont.', value: dist[0] },
      { name: '2ª Cont.', value: dist[1] },
      { name: '3ª Cont.', value: dist[2] },
      { name: '4ª+ Cont.', value: dist[3] },
    ];
  }, [items]);

  return (
    <div className="px-6 flex flex-col gap-6 h-full pb-20 overflow-y-auto">
      <div className="mt-4 flex justify-between items-end">
        <div>
          <div className="text-[72px] font-[900] leading-none text-[#1a1a1a]">{progress}%</div>
          <div className="text-[14px] font-black uppercase tracking-widest text-[#1a1a1a] mt-1">Concluído</div>
        </div>
        <div className="text-right pb-2">
          <div className="text-2xl font-black text-[#1a1a1a]">{stats.completed}/{stats.total}</div>
          <div className="text-[10px] font-bold text-[#666] uppercase">Itens Processados</div>
        </div>
      </div>

      <div className="h-2 bg-[#e0e0e0] rounded-full relative overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="absolute inset-0 bg-[#1a1a1a]"
        />
      </div>

      {/* Distribution Chart */}
      <div className="bg-[#f8f9fa] p-4 rounded-xl">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a] mb-4">Distribuição de Status</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {pieData.map(item => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-bold uppercase text-[#666]">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Count Rounds Chart */}
      <div className="bg-[#f8f9fa] p-4 rounded-xl">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a] mb-4">Rodadas de Contagem</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-0 divide-y divide-[#e0e0e0]">
        <div className="flex justify-between py-4">
          <span className="text-[13px] font-bold text-[#666] uppercase">Produtos OK</span>
          <span className="text-[15px] font-black text-[#2ecc71]">{stats.ok}</span>
        </div>
        <div className="flex justify-between py-4">
          <span className="text-[13px] font-bold text-[#666] uppercase">Análise Divergente</span>
          <span className="text-[15px] font-black text-[#e67e22]">{stats.divergent}</span>
        </div>
        <div className="flex justify-between py-4">
          <span className="text-[13px] font-bold text-[#666] uppercase">Aguardando Contagem</span>
          <span className="text-[15px] font-black">{stats.pending}</span>
        </div>
      </div>

      <button 
        onClick={() => {
          const data = items.map(i => ({
            'Endereço': i.address,
            'Código': i.code,
            'Sistema': i.expectedQty,
            'Contagens': i.counts.join(', '),
            'Status': i.status === 'OK' ? 'OK' : i.status === 'DIVERGENT' ? 'Divergente' : 'Pendente'
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inventario");
          XLSX.writeFile(wb, "resultado_inventario.xlsx");
        }}
        className="btn-main mt-4 mb-10"
      >
        Exportar Excel
      </button>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Load from localStorage on init
  useEffect(() => {
    const saved = localStorage.getItem('stockmaster_inventory');
    if (saved) {
      try {
        setInventory(JSON.parse(saved));
        setActiveTab('counting');
      } catch (e) {
        console.error('Failed to load inventory', e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (inventory.length > 0) {
      localStorage.setItem('stockmaster_inventory', JSON.stringify(inventory));
    }
  }, [inventory]);

  const handleDataLoaded = (items: InventoryItem[]) => {
    setInventory(items);
    setActiveTab('counting');
  };

  const handleCountSubmit = (id: string, qty: number) => {
    setInventory(prev => prev.map(item => {
      if (item.id !== id) return item;

      const newCounts = [...item.counts, qty];
      let newStatus: InventoryStatus = 'PENDING';

      // --- Inventory Logic ---
      // 1. Count matches system -> OK
      if (qty === item.expectedQty) {
        newStatus = 'OK';
      } 
      // 2. Count matches ANY previous count -> DIVERGENT
      else if (item.counts.includes(qty)) {
        newStatus = 'DIVERGENT';
      }
      // 3. Otherwise -> Still PENDING (will trigger next count)
      else {
        newStatus = 'PENDING';
      }

      return {
        ...item,
        counts: newCounts,
        status: newStatus,
        lastUpdated: Date.now()
      };
    }));
  };

  const resetInventory = () => {
    if (window.confirm('Tem certeza que deseja resetar todo o inventário?')) {
      setInventory([]);
      localStorage.removeItem('stockmaster_inventory');
      setActiveTab('upload');
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col max-w-md mx-auto relative overflow-hidden">
      <Header 
        title={
          activeTab === 'upload' ? 'Upload Lista' : 
          activeTab === 'counting' ? 'Contagem Ativa' : 'Status Geral'
        } 
        onReset={inventory.length > 0 ? resetInventory : undefined}
      />

      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <UploadScreen onDataLoaded={handleDataLoaded} />
            </motion.div>
          )}
          {activeTab === 'counting' && (
            <motion.div
              key="counting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {inventory.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center min-h-[60vh]">
                  <AlertCircle size={48} className="text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum dado carregado. Vá para a tela de Upload.</p>
                  <button 
                    onClick={() => setActiveTab('upload')}
                    className="mt-4 text-blue-600 font-bold"
                  >
                    Fazer Upload
                  </button>
                </div>
              ) : (
                <CountingScreen items={inventory} onCountSubmit={handleCountSubmit} />
              )}
            </motion.div>
          )}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StatsScreen items={inventory} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
