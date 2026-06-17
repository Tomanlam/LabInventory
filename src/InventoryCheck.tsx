import React from 'react';
import { InventoryItem } from './types';
import { Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  items: InventoryItem[];
}

export function InventoryCheck({ items }: Props) {
  const lowStockItems = items.filter(i => i.quantity <= (i.minThreshold || 0));

  const exportCSV = () => {
    const rows = [
      ['Item Name', 'Location', 'Stock Level', 'Min Threshold', 'Units']
    ];
    lowStockItems.forEach(item => {
      rows.push([
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`,
        item.quantity.toString(),
        (item.minThreshold || 0).toString(),
        item.units || ''
      ]);
    });
    const csvStr = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `low_stock_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Low Stock Restock Report", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Item Name', 'Location', 'Stock Level', 'Min Threshold', 'Units']],
      body: lowStockItems.map(item => [
        item.name, 
        item.location || '-', 
        item.quantity.toString(), 
        (item.minThreshold || 0).toString(), 
        item.units || '-'
      ]),
      headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    });
    doc.save(`low_stock_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg font-bold text-slate-800">Inventory Check</h2>
        <div className="flex gap-2">
          <button 
            onClick={exportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button 
            onClick={exportPDF}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800">Low Stock Items</h3>
          <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{lowStockItems.length} items to address</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
              <p className="font-medium">All items are sufficiently stocked.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm relative border-collapse">
              <thead className="bg-white border-b border-slate-100 text-slate-500 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Item</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Location</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Current Stock</th>
                  <th className="px-5 py-3 font-semibold uppercase tracking-wider text-[10px]">Min. Allowed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800">{item.name}</td>
                    <td className="px-5 py-3 text-slate-600">{item.location || '—'}</td>
                    <td className="px-5 py-3 font-mono font-bold text-rose-600">{item.quantity} <span className="text-slate-400 font-sans text-xs font-normal ml-1">{item.units}</span></td>
                    <td className="px-5 py-3 font-mono text-slate-500">{item.minThreshold || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
