/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Loader2, DatabaseIcon, Edit2, Check, X, AlertTriangle, UploadCloud, Trash2, ArrowRight, LogIn, LogOut } from 'lucide-react';
import { getInventoryItems, seedInitialData, updateInventoryItem, deleteAllInventory } from './lib/db';
import { InventoryItem } from './types';
import rawInventoryCsv from './data/inventory.csv?raw';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { InventoryCheck } from './InventoryCheck';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'check'>('inventory');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const adminEmails = [
    'sophia.lin@hanacademy.edu.hk',
    'joseph.yeung@hanacademy.edu.hk',
    'tomanlam@gmail.com'
  ];

  const isAdmin = user?.email && adminEmails.includes(user.email);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) loadItems();
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
      alert('Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setItems([]);
  };

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

  const handleBackup = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lab_inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          if (!window.confirm("This will replace all existing inventory with the backup. Proceed?")) return;
          await deleteAllInventory();
          const batch = parsed.map(async (item: any) => {
             const { id, ...rest } = item;
             if (rest.name) {
               await import('./lib/db').then(m => m.addInventoryItem(rest as any));
             }
          });
          await Promise.all(batch);
        } else {
          alert('Invalid backup file format.');
        }
        await loadItems();
      } catch (err) {
        console.error('Restore failed', err);
        alert('Failed to restore from backup.');
      } finally {
        setLoading(false);
        if (restoreInputRef.current) restoreInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
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
      if (editingId === 'new') {
        if (!editForm.name) {
          alert("Item name is required.");
          return;
        }
        await import('./lib/db').then(m => m.addInventoryItem(editForm as any));
      } else {
        await updateInventoryItem(editForm as InventoryItem);
      }
      await loadItems();
      setEditingId(null);
    } catch (e) {
      console.error('Update failed', e);
      alert('Failed to save item.');
    }
  };

  const deleteCurrentItem = async () => {
    if (editingId && editingId !== 'new') {
      if (window.confirm(`Are you sure you want to delete "${selectedItem?.name}"?`)) {
        try {
          await import('./lib/db').then(m => m.deleteInventoryItem(editingId));
          await loadItems();
          setSelectedItem(null);
          setEditingId(null);
        } catch (e) {
          console.error('Delete failed', e);
          alert('Failed to delete item.');
        }
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  if (authLoading) {
    return (
      <div className="flex bg-slate-50 items-center justify-center h-screen w-full">
         <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex bg-slate-50 items-center justify-center h-screen w-full">
         <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-sm w-full text-center border border-slate-100">
           <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 text-indigo-600">
             <DatabaseIcon className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-slate-800 mb-2">LabInventory</h1>
           <p className="text-slate-500 text-sm mb-8">Sign in to manage and view science lab inventory records securely.</p>
           
           <button 
             onClick={handleLogin}
             className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md shadow-indigo-200"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
         </div>
      </div>
    );
  }

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
            {isAdmin && (
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
                <div className="h-4 w-px bg-slate-200 mx-1"></div>
                <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                <button 
                  onClick={handleBackup}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                  title="Backup to JSON"
                >
                  Backup
                </button>
                <button 
                  onClick={() => restoreInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                  title="Restore from JSON backup"
                >
                  Restore
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
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right mr-2 hidden md:block">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{isAdmin ? 'Administrator' : 'Teacher'}</p>
            <p className="text-sm font-medium">{user.displayName || user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden shrink-0">
               {user.photoURL ? (
                  <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
               )}
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors" title="Log Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col p-4 shrink-0 hidden md:flex">
          <div className="space-y-1">
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}>
              <DatabaseIcon className="w-5 h-5 opacity-70" />
              Inventory Grid
            </button>
            <button onClick={() => setActiveTab('check')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'check' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}>
              <Search className="w-5 h-5 opacity-70" />
              Inventory Check
            </button>
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
          {activeTab === 'check' ? (
            <div className="col-span-12 flex h-full overflow-hidden">
              <InventoryCheck items={items} />
            </div>
          ) : (
            <>
              <div className={`${selectedItem ? 'col-span-8' : 'col-span-12'} flex flex-col gap-4 overflow-hidden transition-all duration-300`}>
                <div className="flex items-center justify-between shrink-0">
                  <h2 className="text-lg font-bold text-slate-800">Master Stock List</h2>
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setSelectedItem({ id: 'new', name: 'New Item', quantity: 0, minThreshold: 0, location: '' } as any);
                        setEditForm({ name: '', quantity: 0, minThreshold: 0, hazards: [] });
                        setEditingId('new');
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-2"
                    >
                      + Add New Item
                    </button>
                  )}
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
              <h2 className="text-lg font-bold text-slate-800 shrink-0">{editingId === 'new' ? 'Add New Item' : (isAdmin ? 'Quick Editor' : 'Item Details')}</h2>
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-5 flex flex-col gap-5 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 shrink-0">
                      <Edit2 className="w-6 h-6" />
                    </div>
                    <div>
                      {editingId === 'new' ? (
                         <h3 className="font-bold text-slate-900">New Item Entry</h3>
                      ) : (
                        <>
                          <h3 className="font-bold text-slate-900">{selectedItem.name}</h3>
                          <p className="text-xs text-slate-500 tracking-wide font-mono mt-0.5">ID: {selectedItem.itemCode || `#SYS-${selectedItem.id.substring(0, 6)}`}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedItem(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"><X className="w-5 h-5"/></button>
                </div>

                <div className="space-y-4">
                  {editingId === 'new' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Item Name *</label>
                      <input 
                        value={editForm.name || ''} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
                        placeholder="e.g. Copper Sulfate"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Storage Location</label>
                    <input 
                      value={editForm.location || ''} 
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      readOnly={!isAdmin}
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
                        readOnly={!isAdmin}
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Unit</label>
                      <input 
                        type="text" 
                        value={editForm.units || ''} 
                        onChange={(e) => setEditForm({...editForm, units: e.target.value})}
                        readOnly={!isAdmin}
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
                      readOnly={!isAdmin}
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
                                if (!isAdmin) return;
                                const newHazards = hasHazard 
                                  ? (editForm.hazards || []).filter(h => h !== hazard)
                                  : [...(editForm.hazards || []), hazard];
                                setEditForm({...editForm, hazards: newHazards});
                              }}
                              disabled={!isAdmin}
                              className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase transition-colors ${hasHazard ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} ${!isAdmin ? 'cursor-default opacity-90' : ''}`}
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
                      placeholder={isAdmin ? "Add storage instructions or safety remarks..." : "No notes attached."}
                      value={editForm.remark || ''}
                      readOnly={!isAdmin}
                      onChange={(e) => setEditForm({...editForm, remark: e.target.value})}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-auto flex flex-col gap-3 pt-4 shrink-0">
                    <div className="flex gap-2">
                       <button onClick={() => {setSelectedItem(null); cancelEdit();}} className="flex-1 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200">Discard</button>
                       <button onClick={() => {saveEdit();}} className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-shadow">Save Changes</button>
                    </div>
                    {editingId !== 'new' && (
                       <button 
                         onClick={deleteCurrentItem} 
                         className="w-full py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                         <Trash2 className="w-4 h-4" />
                         Remove Item
                       </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          </>
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

