import React, { useState } from 'react';
import { Booking, Room } from '../types';
import { generateInvoice, requestBookingDeletion } from '../services/hotelService';
import { MessageSquare, Edit, DollarSign, Clock, AlertTriangle, Trash2, MoreHorizontal, FileText, X } from 'lucide-react';

interface BookingListProps {
  bookings: Booking[];
  rooms: Room[];
  userRole: string;
  onRefresh: () => void;
  onEdit: (b: Booking) => void;
  onChat: (b: Booking) => void;
  onPayment: (b: Booking) => void;
  onApprove: (id: string) => void;
  onCheckIn: (id: string) => void;
  onCheckOut: (b: Booking) => void;
}

export const BookingList: React.FC<BookingListProps> = ({ 
  bookings, rooms, userRole, onRefresh, onEdit, onChat, onPayment, onApprove, onCheckIn, onCheckOut 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteRequest, setDeleteRequest] = useState<{id: string, reason: string} | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Booking | null>(null);

  const handleRequestDelete = () => {
    if (!deleteRequest) return;
    try {
        requestBookingDeletion(deleteRequest.id, deleteRequest.reason);
        alert("Deletion request sent to Admin for approval.");
        setDeleteRequest(null);
        onRefresh();
    } catch (e: any) {
        alert(e.message);
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.guest.phone.includes(searchTerm) ||
    b.id.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Reservations</h2>
          <p className="text-sm text-slate-400">Manage bookings and invoices</p>
        </div>
        <input 
          type="text" 
          placeholder="Search guest, phone..." 
          className="p-2.5 border border-slate-200 rounded-xl w-full md:w-72 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Booking Cards (Improved Layout) */}
      <div className="grid grid-cols-1 gap-4">
        {filteredBookings.length === 0 && (
           <div className="bg-white rounded-2xl p-10 text-center border border-slate-100">
              <div className="text-slate-300 mb-2 text-5xl">📭</div>
              <h3 className="text-slate-600 font-medium">No bookings found</h3>
              <p className="text-slate-400 text-sm">Try adjusting your search terms.</p>
           </div>
        )}
        
        {filteredBookings.map(b => {
             const room = rooms.find(r => r.id === b.roomId);
             const invoice = generateInvoice(b);
             const isDue = invoice.balanceDue > 1;

             return (
               <div key={b.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col lg:flex-row gap-4 lg:items-center">
                  {/* Guest Info */}
                  <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <span className="font-bold text-slate-800 text-lg">{b.guest.firstName} {b.guest.lastName}</span>
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                          b.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          b.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          b.status === 'Checked-In' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                       }`}>
                         {b.status}
                       </span>
                     </div>
                     <div className="text-sm text-slate-500 flex gap-4">
                        <span>{b.guest.phone}</span>
                        <span className="text-slate-300">|</span>
                        <span>{b.checkInDate} → {b.checkOutDate}</span>
                     </div>
                  </div>

                  {/* Room Info */}
                  <div className="lg:w-48 lg:border-l lg:border-slate-100 lg:pl-4">
                     <div className="text-xs text-slate-400 font-bold uppercase mb-1">Room Assigned</div>
                     <div className="flex items-center gap-2">
                        <span className="text-2xl font-mono font-bold text-slate-700">#{room?.number || 'N/A'}</span>
                        {b.bookedAsAc && <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-bold">AC</span>}
                     </div>
                     <div className="text-xs text-slate-500">{room?.type}</div>
                  </div>

                  {/* Financial Snapshot */}
                  <div className="lg:w-48 lg:border-l lg:border-slate-100 lg:pl-4">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-1">Balance</div>
                      <div className={`text-xl font-bold ${isDue ? 'text-orange-600' : 'text-emerald-600'}`}>
                         {isDue ? `₹${invoice.balanceDue.toFixed(0)}` : 'Paid'}
                      </div>
                      <div className="text-xs text-slate-400">Total Bill: ₹{invoice.grandTotal.toFixed(0)}</div>
                  </div>

                  {/* Actions */}
                  <div className="lg:w-auto lg:border-l lg:border-slate-100 lg:pl-4 flex flex-wrap gap-2 justify-end">
                      <button onClick={() => setViewInvoice(b)} className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center">
                          <FileText size={16} className="mr-2" /> Invoice
                      </button>

                      <button onClick={() => onChat(b)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg"><MessageSquare size={18}/></button>

                      {userRole !== 'Guest' && (
                        <>
                           {b.status === 'Pending' && <button onClick={() => onApprove(b.id)} className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 font-medium">Approve</button>}
                           
                           {b.status === 'Confirmed' && <button onClick={() => onCheckIn(b.id)} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">Check In</button>}
                           
                           {b.status === 'Checked-In' && (
                              <>
                                <button onClick={() => onPayment(b)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Add Payment"><DollarSign size={18}/></button>
                                <button onClick={() => onCheckOut(b)} className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 font-medium">Check Out</button>
                              </>
                           )}

                           <button onClick={() => onEdit(b)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={18}/></button>
                           <button onClick={() => setDeleteRequest({id: b.id, reason: ''})} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </>
                      )}
                  </div>
               </div>
             );
        })}
      </div>

      {/* Delete Request Modal */}
      {deleteRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-scaleIn">
              <h3 className="font-bold text-lg text-slate-800 mb-2">Request Deletion</h3>
              <p className="text-sm text-slate-500 mb-4">You do not have permission to delete bookings directly. Send a request to the admin?</p>
              <textarea 
                className="w-full border rounded-lg p-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="Reason for deletion..."
                value={deleteRequest.reason}
                onChange={e => setDeleteRequest({...deleteRequest, reason: e.target.value})}
              />
              <div className="flex gap-2">
                 <button onClick={() => setDeleteRequest(null)} className="flex-1 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium">Cancel</button>
                 <button onClick={handleRequestDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">Send Request</button>
              </div>
           </div>
        </div>
      )}

      {/* Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
               {/* Invoice Header */}
               <div className="bg-slate-900 text-white p-6 flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">INVOICE</h3>
                    <p className="text-slate-400 text-sm">SRS Grand Hotel</p>
                    <div className="mt-4 text-sm opacity-80">
                       <p>Ref: {viewInvoice.id.slice(0,8).toUpperCase()}</p>
                       <p>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <button onClick={() => setViewInvoice(null)} className="bg-white/10 p-1 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} />
                     </button>
                     <div className="mt-6 text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold">Amount Due</p>
                        <p className="text-2xl font-bold text-emerald-400">
                           ₹{generateInvoice(viewInvoice).balanceDue.toFixed(2)}
                        </p>
                     </div>
                  </div>
               </div>

               {/* Invoice Body */}
               <div className="p-6 overflow-y-auto flex-1">
                  <div className="flex justify-between mb-8 text-sm">
                     <div>
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Bill To</p>
                        <p className="font-bold text-slate-800">{viewInvoice.guest.firstName} {viewInvoice.guest.lastName}</p>
                        <p className="text-slate-500">{viewInvoice.guest.phone}</p>
                        <p className="text-slate-500">{viewInvoice.guest.email}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Stay Details</p>
                        <p className="font-medium text-slate-800">Check In: {viewInvoice.checkInDate}</p>
                        <p className="font-medium text-slate-800">Check Out: {viewInvoice.checkOutDate}</p>
                        <p className="text-slate-500 mt-1">Room #{rooms.find(r => r.id === viewInvoice.roomId)?.number}</p>
                     </div>
                  </div>

                  <table className="w-full text-sm mb-6">
                     <thead>
                        <tr className="border-b border-slate-200 text-left">
                           <th className="py-2 text-slate-500 font-medium">Description</th>
                           <th className="py-2 text-right text-slate-500 font-medium">Amount</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {generateInvoice(viewInvoice).lineItems.map((item, i) => (
                           <tr key={i}>
                              <td className="py-3 text-slate-700">{item.description}</td>
                              <td className={`py-3 text-right font-mono ${item.amount < 0 ? 'text-green-600' : 'text-slate-700'}`}>
                                 {item.amount < 0 ? '-' : ''}₹{Math.abs(item.amount).toFixed(2)}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>

                  <div className="space-y-2 pt-4 border-t border-slate-200">
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-medium">₹{generateInvoice(viewInvoice).total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Taxes</span>
                        <span className="font-medium">₹{generateInvoice(viewInvoice).tax.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t border-slate-100 mt-2">
                        <span>Total</span>
                        <span>₹{generateInvoice(viewInvoice).grandTotal.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-sm text-emerald-600 font-medium">
                        <span>Paid to Date</span>
                        <span>- ₹{viewInvoice.paidAmount.toFixed(2)}</span>
                     </div>
                  </div>
               </div>

               {/* Footer Actions */}
               <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
                     Print
                  </button>
                  <button onClick={() => setViewInvoice(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                     Close
                  </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
};