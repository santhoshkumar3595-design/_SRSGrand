import React, { useState } from 'react';
import { Room } from '../types';
import { updateRoomStatus } from '../services/hotelService';
import { CheckCircle2, XCircle, AlertCircle, Sparkles, Snowflake, Wind, Filter } from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  onRefresh: () => void;
}

export const RoomGrid: React.FC<RoomGridProps> = ({ rooms, onRefresh }) => {
  const [filter, setFilter] = useState<'ALL' | 'AC_CAPABLE'>('ALL');

  const handleClean = (roomId: string) => {
    updateRoomStatus(roomId, 'Vacant');
    onRefresh();
  };

  const handleMaintenance = (roomId: string) => {
    updateRoomStatus(roomId, 'Maintenance');
    onRefresh();
  };

  const filteredRooms = rooms.filter(room => {
    if (filter === 'AC_CAPABLE') return !!room.acPrice;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
        <h3 className="font-semibold text-slate-800">Room Status Grid ({rooms.length})</h3>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'ALL' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('AC_CAPABLE')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'AC_CAPABLE' ? 'bg-cyan-100 text-cyan-700' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              AC Capable
            </button>
          </div>
        </div>

        <div className="flex gap-4 text-xs">
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></div> Vacant</span>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div> Occupied</span>
          <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-400 mr-1"></div> Cleaning</span>
        </div>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {filteredRooms.map(room => (
          <div 
            key={room.id}
            className={`relative p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all min-h-[140px] ${
              room.status === 'Vacant' ? 'border-emerald-100 bg-emerald-50/50 hover:border-emerald-300' :
              room.status === 'Occupied' ? 'border-red-100 bg-red-50/50' :
              room.status === 'Cleaning' ? 'border-amber-100 bg-amber-50/50' :
              'border-slate-200 bg-slate-100 grayscale'
            }`}
          >
            <div className="absolute top-2 right-2 text-slate-400">
              {room.acPrice ? <Snowflake size={14} className="text-cyan-500" /> : <Wind size={14} className="text-slate-400" />}
            </div>
            
            <span className="text-2xl font-bold text-slate-700 font-mono mb-1">{room.number}</span>
            <span className={`text-xs uppercase tracking-wider font-semibold ${
              room.status === 'Vacant' ? 'text-emerald-600' :
              room.status === 'Occupied' ? 'text-red-600' :
              room.status === 'Cleaning' ? 'text-amber-600' : 'text-slate-500'
            }`}>{room.status}</span>
            <span className="text-[10px] text-slate-400 mt-1">{room.type} • {room.acPrice ? 'AC Opt' : 'Non-AC'}</span>

            {/* Quick Actions Overlay */}
            <div className="absolute inset-0 bg-white/90 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-xl backdrop-blur-sm z-10">
              {room.status === 'Cleaning' && (
                <button 
                  onClick={() => handleClean(room.id)}
                  className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-full flex items-center shadow-lg hover:bg-emerald-700"
                >
                  <Sparkles size={12} className="mr-1" /> Clean
                </button>
              )}
              {room.status === 'Vacant' && (
                <button 
                  onClick={() => handleMaintenance(room.id)}
                  className="px-3 py-1 bg-slate-600 text-white text-xs rounded-full flex items-center shadow-lg hover:bg-slate-700"
                >
                  <AlertCircle size={12} className="mr-1" /> Block
                </button>
              )}
               {room.status === 'Maintenance' && (
                <button 
                  onClick={() => handleClean(room.id)}
                  className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-full flex items-center shadow-lg hover:bg-emerald-700"
                >
                  <CheckCircle2 size={12} className="mr-1" /> Ready
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};