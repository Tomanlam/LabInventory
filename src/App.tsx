/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Loader2, DatabaseIcon, Edit2, Check, X, AlertTriangle, UploadCloud, Trash2, ArrowRight } from 'lucide-react';
import { getInventoryItems, seedInitialData, updateInventoryItem, deleteAllInventory } from './lib/db';
import { InventoryItem } from './types';
import rawInventoryCsv from './data/inventory.csv?raw';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getInventoryItems();
      setItems(data);
    } catch (e) {
      console.error('Failed to load items', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!window.confirm("This will seed demo inventory data. Continue?")) return;
    setSeeding(true);
    try {
      await seedInitialData(rawInventoryCsv);
      await loadItems();
    } catch (e) {
      console.error(e);
      alert('Failed to seed data. Refer to console.');
    } finally {
      setSeeding(false);
    }
  };

  const handleNuke = async () => {
    if (!window.confirm("ADMIN ONLY: Are you sure you want to delete all inventory items? This cannot be undone.")) return;
    setLoading(true);
    try {
      await deleteAllInventory();
      await loadItems();
      setSelectedItem(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSeeding(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await seedInitialData(text);
        await loadItems();
      } catch (err) {
        console.error('Failed to parse and upload CSV', err);
        alert('Failed to process CSV file.');
      } finally {
        setSeeding(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term) ||
      item.itemCode.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    try {
      await updateInventoryItem(editForm as InventoryItem);
      setItems(items.map(it => it.id === editingId ? (editForm as InventoryItem) : it));
      setEditingId(null);
    } catch (e) {
      console.error('Update failed', e);
      alert('Failed to update item.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <DatabaseIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">LabInventory <span className="text-slate-400 font-medium tracking-normal">v2.4</span></h1>
        </div>
        <div className="flex-1 max-w-xl mx-12">
          <div className="relative flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search items, locations, or SKUs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={seeding}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                Upload CSV
              </button>
              {items.length === 0 && !loading && (
                <button 
                  onClick={handleSeed}
                  disabled={seeding}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseIcon className="w-4 h-4" />}
                  Seed Data
                </button>
              )}
              {items.length > 0 && !loading && (
                 <button 
                  onClick={handleNuke}
                  disabled={loading}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold rounded shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0"
                  title="Admin Only: Clear Database"
                >
                  <Trash2 className="w-4 h-4" />
                  Nuke Data
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2 hidden md:block">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Session</p>
            <p className="text-sm font-medium">Administrator</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-4 shrink-0 hidden md:flex">
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-lg">
              <DatabaseIcon className="w-5 h-5 opacity-70" />
              Inventory Grid
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg">
              <Search className="w-5 h-5 opacity-70" />
              Usage History
            </a>
          </div>
          <div className="mt-auto p-4 bg-slate-800/50 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Storage Cap</span>
              <span className="text-xs text-indigo-400">78%</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full">
              <div className="bg-indigo-500 h-1.5 rounded-full w-[78%]"></div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden bg-slate-50">
          <div className={`${selectedItem ? 'col-span-8' : 'col-span-12'} flex flex-col gap-4 overflow-hidden`}>
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Master Stock List</h2>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
              {loading ? (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p className="text-sm">Loading inventory...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-500">
                  <DatabaseIcon className="w-12 h-12 mb-4 opacity-20 text-slate-400" />
                  <p className="font-medium text-slate-800">No inventory items found</p>
                  <p className="text-sm mt-1">Click "Seed Data" in the top bar to generate demo inventory.</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 h-full">
                  <table className="w-full text-left text-sm relative border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Item Details</th>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Location</th>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Stock Level</th>
                        <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map(item => (
                        <tr key={item.id} onClick={() => { setSelectedItem(item); setEditForm({...item}); setEditingId(item.id); }} className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedItem?.id === item.id ? 'bg-slate-50/50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}>
                          <td className="px-6 py-3 font-bold text-slate-800">
                            {item.name}
                            {item.itemCode && (
                              <p className="text-xs text-slate-500 font-mono mt-0.5 font-normal">SKU: {item.itemCode}</p>
                            )}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-600">
                            {item.location || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`font-mono font-bold ${item.quantity === 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {item.quantity}
                            </span>
                            <span className="text-slate-400 text-xs ml-1">{item.units}</span>
                          </td>
                          <td className="px-6 py-3 text-slate-500">
                            {item.quantity === 0 ? (
                               <span className="px-2 py-1 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase">Critical  </span>
                            ) : item.minThreshold !== undefined && item.quantity <= item.minThreshold ? (
                               <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase">Low Stock</span>
                            ) : (
                               <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Normal</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredItems.length === 0 && items.length > 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                            No items found matching "{searchTerm}"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {selectedItem && (
            <div className="col-span-4 flex flex-col gap-4 overflow-hidden">
              <h2 className="text-lg font-bold text-slate-800 shrink-0">Quick Editor</h2>
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 shrink-0">
                      <Edit2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{selectedItem.name}</h3>
                      <p className="text-xs text-slate-500 tracking-wide font-mono mt-0.5">ID: {selectedItem.itemCode || `#SYS-${selectedItem.id.substring(0, 6)}`}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"><X className="w-5 h-5"/></button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Storage Location</label>
                    <input 
                      value={editForm.location || ''} 
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quantity</label>
                      <input 
                        type="number"
                        value={editForm.quantity ?? ''} 
                        onChange={(e) => setEditForm({...editForm, quantity: parseFloat(e.target.value) || 0})}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Unit</label>
                      <input 
                        type="text" 
                        value={editForm.units || ''} 
                        onChange={(e) => setEditForm({...editForm, units: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Minimum Threshold</label>
                    <input 
                      type="number" 
                      value={editForm.minThreshold ?? 0} 
                      onChange={(e) => setEditForm({...editForm, minThreshold: parseFloat(e.target.value) || 0})}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                    <p className="text-[10px] text-slate-400">System alerts when stock falls below this value.</p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Hazards</label>
                    <div className="flex flex-wrap gap-2">
                       {['Flammable', 'Corrosive', 'Toxic', 'Irritant', 'Oxidizing'].map(hazard => {
                          const hasHazard = editForm.hazards?.includes(hazard);
                          return (
                            <button 
                              key={hazard}
                              onClick={() => {
                                const newHazards = hasHazard 
                                  ? (editForm.hazards || []).filter(h => h !== hazard)
                                  : [...(editForm.hazards || []), hazard];
                                setEditForm({...editForm, hazards: newHazards});
                              }}
                              className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase transition-colors ${hasHazard ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                              {hazard}
                            </button>
                          );
                       })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Internal Notes</label>
                    <textarea 
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm h-20 resize-none focus:ring-2 focus:ring-indigo-500 outline-none" 
                      placeholder="Add storage instructions or safety remarks..."
                      value={editForm.remark || ''}
                      onChange={(e) => setEditForm({...editForm, remark: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-auto flex gap-2 pt-4 shrink-0">
                  <button onClick={() => {setSelectedItem(null); cancelEdit();}} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">Discard</button>
                  <button onClick={() => {saveEdit(); setSelectedItem(null);}} className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-shadow">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="h-8 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Database Connected
          </span>
        </div>
        <div className="flex gap-4">
          <span>Cloud persistence: Active</span>
          <span className="text-slate-300 italic uppercase tracking-widest hidden sm:inline">Internal Laboratory Use Only</span>
        </div>
      </footer>
    </div>
  );
}

