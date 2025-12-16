import React, { useState, useEffect } from 'react';
import { Booking, Room } from '../types';
import { getBookings, getRooms } from '../services/hotelService';
import { ShieldAlert, AlertTriangle, Check, X, Search } from 'lucide-react';

export const RiskMonitor: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    setBookings(getBookings());
    setRooms(getRooms());
  }, []);

  // Filter for bookings with fraud score > 50 (Warning level)
  const riskyBookings = bookings
    .filter(b => b.aiFraudScore && b.aiFraudScore > 50)
    .sort((a, b) => (b.aiFraudScore || 0) - (a.aiFraudScore || 0));

  const getRiskLevel = (score: number) => {
    if (score >= 80) return { label: 'CRITICAL', color: 'bg-red-100 text-red-700 border-red-200' };
    return { label: 'WARNING', color: 'bg-amber-100 text-amber-700 border-amber-200' };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center">
             <ShieldAlert className="mr-3 text-red-600" size={32} />
             Risk Monitor
           </h2>
           <p className="text-slate-500 mt-1">AI-flagged bookings requiring staff attention.</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-slate-800">{riskyBookings.length}</span>
          <span className="block text-xs text-slate-400">Flagged Bookings</span>
        </div>
      </div>

      {riskyBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <Check className="text-emerald-600" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Risks Detected</h3>
          <p className="text-slate-500">All current bookings appear safe based on AI analysis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {riskyBookings.map(booking => {
            const risk = getRiskLevel(booking.aiFraudScore || 0);
            const roomNumber = rooms.find(r => r.id === booking.roomId)?.number || 'N/A';
            
            return (
              <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${booking.aiFraudScore! >= 80 ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                
                <div className="pl-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${risk.color}`}>
                       {risk.label}: {booking.aiFraudScore}% Score
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {booking.id.slice(0,8)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs border ${booking.status === 'Checked-Out' ? 'bg-slate-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {booking.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-800">{booking.guest.firstName} {booking.guest.lastName}</h3>
                  <div className="text-sm text-slate-600 mt-1 flex gap-4">
                    <span>Phone: {booking.guest.phone}</span>
                    <span>Room: {roomNumber}</span>
                  </div>
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                    <span className="font-semibold text-slate-700">AI Reason:</span> <span className="text-slate-600">{booking.aiFraudReason}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-end pl-4 border-l border-slate-100 ml-4">
                   <div className="text-right mb-2">
                     <span className="block text-xs text-slate-400">Stay Dates</span>
                     <span className="font-medium text-slate-700">{booking.checkInDate} <br/> to {booking.checkOutDate}</span>
                   </div>
                   <div className="text-right">
                     <span className="block text-xs text-slate-400">Total Value</span>
                     <span className="font-bold text-slate-800">₹{booking.totalAmount}</span>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};