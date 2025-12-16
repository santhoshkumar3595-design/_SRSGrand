import React, { useState, useEffect } from 'react';
import { ServiceRequest, ServiceStatus } from '../types';
import { getServiceRequests, updateServiceRequestStatus, escalateServiceRequest } from '../services/hotelService';
import { BellRing, CheckCircle, Clock, AlertTriangle, ArrowUpCircle } from 'lucide-react';

export const ServiceRequestPanel: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [filter, setFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Resolved'>('All');

  useEffect(() => {
    setRequests(getServiceRequests());
    const interval = setInterval(() => setRequests(getServiceRequests()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = (id: string, status: ServiceStatus) => {
    updateServiceRequestStatus(id, status);
    setRequests(getServiceRequests());
  };

  const handleEscalate = (id: string) => {
    escalateServiceRequest(id);
    setRequests(getServiceRequests());
  };

  const filteredRequests = requests
    .filter(r => filter === 'All' || r.status === filter)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center">
          <BellRing className="mr-3 text-indigo-600" />
          Service Requests
        </h3>
        <div className="flex gap-2">
           {['All', 'Pending', 'In Progress', 'Resolved'].map((f) => (
             <button
               key={f}
               onClick={() => setFilter(f as any)}
               className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRequests.length === 0 && <div className="text-center text-slate-400 py-10">No service requests found.</div>}
        
        {filteredRequests.map(req => (
          <div key={req.id} className={`p-4 rounded-lg border-l-4 flex justify-between items-start ${
            req.isEscalated ? 'border-red-500 bg-red-50' : 
            req.status === 'Resolved' ? 'border-emerald-500 bg-emerald-50' : 
            req.status === 'In Progress' ? 'border-blue-500 bg-blue-50' : 
            'border-amber-500 bg-white shadow-sm'
          }`}>
            <div>
               <div className="flex items-center space-x-2 mb-1">
                 <span className="font-bold text-slate-800 text-sm">{req.type}</span>
                 <span className="text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600">Room {req.roomNumber}</span>
                 {req.isEscalated && <span className="flex items-center text-[10px] font-bold text-red-600 uppercase"><AlertTriangle size={10} className="mr-1"/> Escalated</span>}
               </div>
               <p className="text-sm text-slate-600">{req.description}</p>
               <span className="text-[10px] text-slate-400 mt-2 block">{new Date(req.createdAt).toLocaleString()}</span>
            </div>
            
            <div className="flex flex-col gap-2 items-end">
               <div className="flex items-center text-xs font-medium gap-2">
                 {req.status === 'Pending' && <span className="text-amber-600 flex items-center"><Clock size={12} className="mr-1"/> Pending</span>}
                 {req.status === 'In Progress' && <span className="text-blue-600 flex items-center"><Clock size={12} className="mr-1"/> Working</span>}
                 {req.status === 'Resolved' && <span className="text-emerald-600 flex items-center"><CheckCircle size={12} className="mr-1"/> Done</span>}
               </div>

               {req.status !== 'Resolved' && (
                 <div className="flex gap-2 mt-1">
                    {req.status === 'Pending' && (
                      <button onClick={() => handleStatusUpdate(req.id, 'In Progress')} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">Start</button>
                    )}
                    {req.status === 'In Progress' && (
                      <button onClick={() => handleStatusUpdate(req.id, 'Resolved')} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">Resolve</button>
                    )}
                    {!req.isEscalated && (
                      <button onClick={() => handleEscalate(req.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Escalate">
                        <ArrowUpCircle size={16} />
                      </button>
                    )}
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};