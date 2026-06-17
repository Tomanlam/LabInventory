import React, { useState } from 'react';
import { FileText, Search, Plus, ArrowUpAZ, ArrowDownZA } from 'lucide-react';
import orientalData from './data/oriental-catalogue.json';

interface CatalogueItem {
  code: string;
  name: string;
  description: string;
  page: number;
}

export function CatalogueView() {
  const pdfUrl = 'https://hqspcu4l9whrfeej.public.blob.vercel-storage.com/Oriental%20Catalogue.pdf';
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [isAdding, setIsAdding] = useState<string | null>(null);

  const handleAdd = async (item: CatalogueItem) => {
    setIsAdding(item.code);
    try {
      const { addInventoryItem } = await import('./lib/db');
      await addInventoryItem({
        name: item.name,
        quantity: 0,
        minThreshold: 0,
        location: '',
        units: 'pcs',
        itemCode: item.code,
        remark: item.description,
        hazards: []
      } as any);
      alert(`Added ${item.name} to inventory!`);
    } catch (e) {
      console.error(e);
      alert('Failed to add item to inventory.');
    } finally {
      setIsAdding(null);
    }
  };

  let filteredItems = orientalData.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (sortOrder) {
    filteredItems.sort((a, b) => {
      const val = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? val : -val;
    });
  }

  return (
    <div className="flex h-full w-full gap-6">
      {/* Left Panel: PDF Viewer */}
      <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Oriental Catalogue PDF
          </h3>
        </div>
        <div className="flex-1 bg-slate-100 relative">
           <iframe src={pdfUrl} className="w-full h-full border-none" title="Catalogue PDF" />
        </div>
      </div>

      {/* Right Panel: Parsed Catalogue Items */}
      <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Parsed Catalogue Items</h3>
            <span className="text-xs font-medium text-slate-500">{orientalData.length} items parsed</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search code or name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center ${sortOrder ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                title="Sort A-Z / Z-A"
              >
                {sortOrder === 'desc' ? <ArrowDownZA className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.map(item => (
            <div key={item.code} className="p-3 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group">
               <div className="flex justify-between items-start mb-1">
                 <div>
                   <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded mb-1">Page {item.page}</span>
                   <h4 className="font-bold text-sm text-slate-800 leading-snug">{item.name}</h4>
                 </div>
                 <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{item.code}</span>
               </div>
               <p className="text-xs text-slate-500">{item.description}</p>
               <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleAdd(item)} disabled={isAdding === item.code} className="text-[10px] font-bold text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50">
                    <Plus className="w-3 h-3" /> {isAdding === item.code ? 'Adding...' : 'Add to Inventory'}
                  </button>
               </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
             <div className="text-center py-8 text-slate-400">
                No items found matching "{searchTerm}"
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
