import React, { useState, useEffect } from 'react';
import { getLedger, getPayments, getBookings } from '../services/hotelService';
import { LedgerEntry, Payment, Booking } from '../types';
import { Download, FileText, TrendingUp, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

export const FinancePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ledger' | 'payments' | 'receivables'>('ledger');
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    setLedger(getLedger().sort((a,b) => b.date - a.date));
    setPayments(getPayments().sort((a,b) => b.date - a.date));
    setBookings(getBookings());
  }, []);

  const totalDebit = ledger.filter(l => l.type === 'Debit').reduce((s, l) => s + l.amount, 0);
  const totalCredit = ledger.filter(l => l.type === 'Credit').reduce((s, l) => s + l.amount, 0);

  const pendingBookings = bookings.filter(b => (b.totalAmount - b.paidAmount) > 1);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 text-xs font-bold uppercase">Total Invoiced</span>
            <div className="text-2xl font-bold text-slate-800 mt-1">₹{totalDebit.toLocaleString()}</div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 text-xs font-bold uppercase">Total Collected</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">₹{totalCredit.toLocaleString()}</div>
         </div>
         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-slate-500 text-xs font-bold uppercase">Outstanding Balance</span>
            <div className="text-2xl font-bold text-orange-600 mt-1">₹{(totalDebit - totalCredit).toLocaleString()}</div>
         </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
         <div className="flex gap-2">
            <button onClick={() => setActiveTab('ledger')} className={`px-4 py-2 rounded-lg font-medium text-sm ${activeTab === 'ledger' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>General Ledger</button>
            <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-lg font-medium text-sm ${activeTab === 'payments' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>Payment History</button>
            <button onClick={() => setActiveTab('receivables')} className={`px-4 py-2 rounded-lg font-medium text-sm ${activeTab === 'receivables' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>Accounts Receivable</button>
         </div>
         <button className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-700">
            <Download size={16} /> Export Report
         </button>
      </div>

      {/* Ledger Table */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b">
                <tr>
                   <th className="p-4">Date</th>
                   <th className="p-4">Description</th>
                   <th className="p-4 text-right">Debit (Inv)</th>
                   <th className="p-4 text-right">Credit (Pay)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {ledger.map(entry => (
                   <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-500">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="p-4">
                         <div className="font-medium text-slate-800">{entry.description}</div>
                         <div className="text-xs text-slate-400 font-mono">Ref: {entry.referenceId.slice(0,8)}</div>
                      </td>
                      <td className="p-4 text-right font-mono">{entry.type === 'Debit' ? `₹${entry.amount.toFixed(2)}` : '-'}</td>
                      <td className="p-4 text-right font-mono text-emerald-600">{entry.type === 'Credit' ? `₹${entry.amount.toFixed(2)}` : '-'}</td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      )}

      {/* Payments Table */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b">
                <tr>
                   <th className="p-4">Date</th>
                   <th className="p-4">Booking Ref</th>
                   <th className="p-4">Category</th>
                   <th className="p-4">Mode</th>
                   <th className="p-4">Staff</th>
                   <th className="p-4 text-right">Amount</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                   <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4 text-slate-500">{new Date(p.date).toLocaleString()}</td>
                      <td className="p-4 font-mono text-indigo-600">{p.bookingId.slice(0,8)}</td>
                      <td className="p-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs border">{p.category}</span></td>
                      <td className="p-4 text-slate-600">{p.mode}</td>
                      <td className="p-4 text-slate-600">{p.recordedBy}</td>
                      <td className="p-4 text-right font-bold text-slate-800">₹{p.amount.toFixed(2)}</td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      )}

      {/* Receivables Table */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-orange-50 text-orange-800 text-sm border-b border-orange-100 flex items-center">
             <AlertTriangle size={16} className="mr-2" />
             Showing all bookings with pending balances.
          </div>
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 border-b">
                <tr>
                   <th className="p-4">Guest</th>
                   <th className="p-4">Booking Status</th>
                   <th className="p-4 text-right">Total Invoiced</th>
                   <th className="p-4 text-right">Paid So Far</th>
                   <th className="p-4 text-right">Balance Due</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {pendingBookings.map(b => (
                   <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-700">{b.guest.firstName} {b.guest.lastName}</td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-xs ${b.status === 'Checked-Out' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{b.status}</span>
                      </td>
                      <td className="p-4 text-right">₹{b.totalAmount.toFixed(2)}</td>
                      <td className="p-4 text-right text-emerald-600">₹{b.paidAmount.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-red-600">₹{(b.totalAmount - b.paidAmount).toFixed(2)}</td>
                   </tr>
                ))}
             </tbody>
          </table>
          {pendingBookings.length === 0 && <div className="p-8 text-center text-slate-400">No outstanding payments found. Excellent!</div>}
        </div>
      )}
    </div>
  );
};