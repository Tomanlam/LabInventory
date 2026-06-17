/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, DatabaseIcon, Edit2, Check, X } from 'lucide-react';
import { getInventoryItems, seedInitialData, updateInventoryItem } from './lib/db';
import { InventoryItem } from './types';
import rawInventoryCsv from './data/inventory.csv?raw';

export default function App() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<InventoryItem>>({});

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
          <h1 className="text-xl font-bold tracking-tight text-slate-800">LabLogic <span className="text-slate-400 font-medium tracking-normal">v2.4</span></h1>
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
        <main className="flex-1 p-6 flex flex-col gap-4 overflow-hidden bg-slate-50">
          <div className="flex items-center justify-between">
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
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Units</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => (
                      <tr key={item.id} className={`hover:bg-slate-50 cursor-pointer transition-colors ${editingId === item.id ? 'bg-slate-50/50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}>
                        <td className="px-6 py-3">
                          {editingId === item.id ? (
                            <input 
                              value={editForm.name || ''} 
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                            />
                          ) : (
                            <>
                              <p className="font-bold text-slate-800">{item.name}</p>
                              {item.itemCode && (
                                <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {item.itemCode}</p>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-600">
                          {editingId === item.id ? (
                            <input 
                              value={editForm.location || ''} 
                              onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                            />
                          ) : (
                            item.location || <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {editingId === item.id ? (
                            <input 
                              type="number"
                              value={editForm.quantity ?? ''} 
                              onChange={(e) => setEditForm({...editForm, quantity: parseFloat(e.target.value) || 0})}
                              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                            />
                          ) : (
                            <span className={`font-mono font-bold ${item.quantity === 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              {item.quantity}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-slate-500">
                          {editingId === item.id ? (
                            <input 
                              value={editForm.units || ''} 
                              onChange={(e) => setEditForm({...editForm, units: e.target.value})}
                              className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white shadow-sm"
                            />
                          ) : (
                            item.units || <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={saveEdit} className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors" title="Save">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={cancelEdit} className="p-1.5 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-md transition-colors" title="Cancel">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => startEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Edit Item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
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

