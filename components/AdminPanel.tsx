import React, { useState, useEffect } from 'react';
import { getUsers, toggleUserAccess, createUser } from '../services/authService';
import { getAuditLogs, getRooms, saveRooms, getDeletionRequests, handleDeletionRequest, seedDatabase, getVoiceLogs, analyzeVoiceLog } from '../services/hotelService';
import { User, AuditLog, Room, RoomType, DeletionRequest, UserRole, VoiceLog } from '../types';
import { Shield, Lock, Unlock, AlertOctagon, Info, Bed, Plus, Trash2, Save, X, Wind, Snowflake, Edit, Check, UserPlus, RefreshCw, Mic, Play, Pause, AlertTriangle, FileAudio } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const [logs] = useState<AuditLog[]>(getAuditLogs());
  const [rooms, setRooms] = useState<Room[]>(getRooms());
  const [requests, setRequests] = useState<DeletionRequest[]>(getDeletionRequests());
  const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
  const [tab, setTab] = useState<'users' | 'logs' | 'rooms' | 'requests' | 'voice'>('users');
  
  // Room Edit State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editRoomData, setEditRoomData] = useState<Partial<Room>>({});
  const [isAdding, setIsAdding] = useState(false);

  // User Add State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ fullName: '', username: '', password: '', role: 'Receptionist' as UserRole });

  useEffect(() => {
    setRooms(getRooms());
    setRequests(getDeletionRequests());
    if (tab === 'voice') {
        const vLogs = getVoiceLogs();
        setVoiceLogs(vLogs);
        
        // Check for unprocessed logs and retry processing
        vLogs.forEach(log => {
            if (!log.isProcessed) analyzeVoiceLog(log.id).then(() => setVoiceLogs(getVoiceLogs()));
        });
    }
  }, [tab]);

  const handleToggleUser = (id: string) => {
    toggleUserAccess(id);
    setUsers(getUsers());
  };

  const handleCreateUser = () => {
    try {
        if (!newUserData.username || !newUserData.password || !newUserData.fullName) {
           alert("All fields are required");
           return;
        }
        createUser({
            username: newUserData.username,
            passwordHash: newUserData.password,
            fullName: newUserData.fullName,
            role: newUserData.role,
            isActive: true
        });
        setUsers(getUsers());
        setIsAddingUser(false);
        setNewUserData({ fullName: '', username: '', password: '', role: 'Receptionist' });
        alert("User created successfully!");
    } catch (e: any) {
        alert(e.message);
    }
  };

  const processRequest = (id: string, approve: boolean) => {
    handleDeletionRequest(id, approve);
    setRequests(getDeletionRequests());
  };

  const handleSaveRoom = () => {
    if (!editRoomData.number || !editRoomData.price) return alert("Number and Base Price are required");

    const newRoomData: Room = {
      id: isEditing || uuidv4(),
      number: editRoomData.number!,
      type: editRoomData.type || 'Standard',
      price: Number(editRoomData.price),
      acPrice: editRoomData.acPrice ? Number(editRoomData.acPrice) : undefined,
      status: editRoomData.status || 'Vacant',
      amenities: editRoomData.amenities || ['Wifi']
    };

    let updatedRooms;
    if (isAdding) {
      updatedRooms = [...rooms, newRoomData];
    } else {
      updatedRooms = rooms.map(r => r.id === isEditing ? newRoomData : r);
    }

    saveRooms(updatedRooms);
    setRooms(updatedRooms);
    setIsAdding(false);
    setIsEditing(null);
    setEditRoomData({});
  };

  const handleDeleteRoom = (id: string) => {
    if (confirm('Are you sure you want to delete this room?')) {
      const updatedRooms = rooms.filter(r => r.id !== id);
      saveRooms(updatedRooms);
      setRooms(updatedRooms);
    }
  };

  const startEdit = (room: Room) => {
    setIsEditing(room.id);
    setEditRoomData(room);
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditRoomData({ type: 'Standard', price: 2500, amenities: ['Wifi', 'TV'] });
    setIsEditing(null);
  };

  const pendingRequests = requests.filter(r => r.status === 'Pending');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
            <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>User Management</button>
            <button onClick={() => setTab('rooms')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'rooms' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>Room Config</button>
            <button onClick={() => setTab('requests')} className={`px-4 py-2 rounded-lg font-medium relative ${tab === 'requests' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
            Deletion Requests
            {pendingRequests.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center">{pendingRequests.length}</span>}
            </button>
            <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>Audit Logs</button>
            <button onClick={() => setTab('voice')} className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${tab === 'voice' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                <Mic size={16} /> Surveillance
            </button>
        </div>
        
        <button 
           onClick={() => { if(confirm("This will RESET all data (Rooms, Bookings, Finance) to a clean state with sample data. Continue?")) seedDatabase(); }}
           className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center hover:bg-red-100"
        >
           <RefreshCw size={14} className="mr-2" /> Reset & Seed Data
        </button>
      </div>

      {tab === 'voice' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                     <FileAudio size={20} className="text-indigo-600"/> Voice Logs & Fraud Analysis
                 </h3>
                 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Admin Access Only</span>
             </div>
             <div className="divide-y divide-slate-100">
                 {voiceLogs.length === 0 && <div className="p-10 text-center text-slate-400">No voice logs recorded.</div>}
                 {voiceLogs.map(log => (
                     <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
                         <div className="flex justify-between items-start mb-4">
                             <div>
                                 <div className="flex items-center gap-2">
                                     <span className="font-bold text-slate-800">{new Date(log.timestamp).toLocaleString()}</span>
                                     <span className="text-xs text-slate-500">Recorded by: {log.recordedByName}</span>
                                 </div>
                                 <div className="mt-1 flex items-center gap-2">
                                     <audio controls src={log.audioData} className="h-8 w-64" />
                                     <span className="text-xs text-slate-400">Duration: {log.durationSeconds.toFixed(1)}s</span>
                                 </div>
                             </div>
                             
                             {log.analysis ? (
                                 <div className="text-right">
                                     <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                         log.analysis.riskScore > 70 ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' :
                                         log.analysis.riskScore > 40 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                         'bg-emerald-100 text-emerald-700 border-emerald-200'
                                     }`}>
                                         Risk Score: {log.analysis.riskScore}/100
                                     </div>
                                     <div className="mt-1 text-xs font-medium text-slate-600">Sentiment: {log.analysis.sentiment}</div>
                                 </div>
                             ) : (
                                 <span className="text-xs text-slate-400 italic">Processing forensic analysis...</span>
                             )}
                         </div>

                         {log.analysis && (
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                                 <p className="text-slate-700 mb-2"><span className="font-bold">AI Summary:</span> {log.analysis.summary}</p>
                                 {log.analysis.fraudFlags && log.analysis.fraudFlags.length > 0 ? (
                                     <div className="mt-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Detected Fraud Indicators:</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {log.analysis.fraudFlags.map((flag, idx) => (
                                                <span key={idx} className="flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200 font-bold">
                                                    <AlertTriangle size={12} className="mr-1" /> {flag}
                                                </span>
                                            ))}
                                        </div>
                                     </div>
                                 ) : (
                                     <div className="mt-2 text-xs text-emerald-600 flex items-center">
                                         <Check size={14} className="mr-1" /> No specific fraud flags detected.
                                     </div>
                                 )}
                             </div>
                         )}
                     </div>
                 ))}
             </div>
        </div>
      )}

      {tab === 'requests' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <h3 className="p-4 bg-slate-50 font-bold text-slate-700 border-b">Pending Deletion Requests</h3>
            {pendingRequests.length === 0 ? <div className="p-8 text-center text-slate-400">No pending requests.</div> : (
              <div className="divide-y divide-slate-100">
                 {pendingRequests.map(req => (
                    <div key={req.id} className="p-4 flex justify-between items-center">
                        <div>
                           <div className="font-bold text-slate-800">Booking ID: {req.bookingId.slice(0,8)}...</div>
                           <div className="text-sm text-slate-600">Requested by: {req.requestedBy}</div>
                           <div className="text-xs text-red-500 mt-1">Reason: {req.reason}</div>
                           <div className="text-xs text-slate-400 mt-1">{new Date(req.requestedAt).toLocaleString()}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => processRequest(req.id, true)} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Approve Delete</button>
                            <button onClick={() => processRequest(req.id, false)} className="px-3 py-1 bg-slate-200 text-slate-700 rounded text-sm hover:bg-slate-300">Reject</button>
                        </div>
                    </div>
                 ))}
              </div>
            )}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h3 className="font-bold text-slate-700">Staff Accounts</h3>
             <button onClick={() => setIsAddingUser(true)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm flex items-center hover:bg-indigo-700">
                <UserPlus size={16} className="mr-2" /> Add Staff
             </button>
          </div>

          {isAddingUser && (
             <div className="p-6 bg-indigo-50 border-b border-indigo-100 animate-fadeIn">
                <h4 className="font-bold text-sm text-indigo-800 mb-4">Create New Account</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                       <input 
                         className="w-full p-2 border rounded" 
                         value={newUserData.fullName}
                         onChange={e => setNewUserData({...newUserData, fullName: e.target.value})}
                         placeholder="e.g. John Doe"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Username</label>
                       <input 
                         className="w-full p-2 border rounded" 
                         value={newUserData.username}
                         onChange={e => setNewUserData({...newUserData, username: e.target.value})}
                         placeholder="e.g. jdoe"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                       <input 
                         className="w-full p-2 border rounded" 
                         value={newUserData.password}
                         onChange={e => setNewUserData({...newUserData, password: e.target.value})}
                         placeholder="******"
                         type="password"
                       />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                       <select 
                         className="w-full p-2 border rounded"
                         value={newUserData.role}
                         onChange={e => setNewUserData({...newUserData, role: e.target.value as UserRole})}
                       >
                         <option value="Manager">Manager</option>
                         <option value="Receptionist">Receptionist</option>
                         <option value="Staff">Staff</option>
                         <option value="Housekeeping">Housekeeping</option>
                         <option value="Admin">Admin</option>
                       </select>
                    </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                   <button onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded text-sm">Cancel</button>
                   <button onClick={handleCreateUser} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm font-bold hover:bg-indigo-700">Create Account</button>
                </div>
             </div>
          )}

          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4">Username</th>
                <th className="p-4">Full Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4 font-mono">{u.username}</td>
                  <td className="p-4">{u.fullName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs border ${
                        u.role === 'Admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        u.role === 'Manager' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        u.role === 'Housekeeping' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        u.role === 'Guest' ? 'bg-slate-100 text-slate-600' :
                        'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                        {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.isActive ? <span className="text-emerald-600 font-bold flex items-center"><Check size={14} className="mr-1"/> Active</span> : <span className="text-red-500 font-bold flex items-center"><X size={14} className="mr-1"/> Suspended</span>}
                  </td>
                  <td className="p-4">
                    {u.role !== 'Admin' && (
                      <button onClick={() => handleToggleUser(u.id)} className="text-indigo-600 hover:underline">
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Room and Logs tabs logic remains similar... omitted for brevity if unchanged, but included for complete update */}
      {tab === 'rooms' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Hotel Inventory Configuration</h3>
            <button onClick={startAdd} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm flex items-center hover:bg-emerald-700">
              <Plus size={16} className="mr-2" /> Add Room
            </button>
          </div>

          {(isAdding || isEditing) && (
            <div className="bg-slate-50 p-6 rounded-xl border border-indigo-100 mb-6 animate-fadeIn shadow-inner">
              <h4 className="font-bold text-sm mb-4 text-indigo-700 flex items-center">
                 {isAdding ? <Plus size={16} className="mr-2"/> : <Info size={16} className="mr-2"/>}
                 {isAdding ? 'Add New Room' : 'Edit Room Details'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Room No.</label>
                  <input className="w-full p-2 border rounded bg-white" value={editRoomData.number || ''} onChange={e => setEditRoomData({...editRoomData, number: e.target.value})} placeholder="e.g. 101" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Type</label>
                  <select className="w-full p-2 border rounded bg-white" value={editRoomData.type} onChange={e => setEditRoomData({...editRoomData, type: e.target.value as RoomType})}>
                    <option value="Standard">Standard</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Suite">Suite</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Base Price (Non-AC)</label>
                  <input type="number" className="w-full p-2 border rounded bg-white" value={editRoomData.price || ''} onChange={e => setEditRoomData({...editRoomData, price: Number(e.target.value)})} placeholder="₹" />
                </div>
                 <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">AC Price (Optional)</label>
                  <input type="number" className="w-full p-2 border rounded bg-white" value={editRoomData.acPrice || ''} onChange={e => setEditRoomData({...editRoomData, acPrice: Number(e.target.value)})} placeholder="Leave empty if Non-AC" />
                </div>
                 <div className="col-span-2 flex gap-2">
                  <button onClick={handleSaveRoom} className="flex-1 bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 flex items-center justify-center font-medium"><Save size={16} className="mr-2" /> Save</button>
                  <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="flex-1 bg-white border border-slate-300 text-slate-600 p-2 rounded hover:bg-slate-50 flex items-center justify-center"><X size={16} className="mr-2" /> Cancel</button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">* If AC Price is set, the room will be considered "AC Capable" and allow AC allocation during booking.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {rooms.sort((a,b) => Number(a.number) - Number(b.number)).map(room => (
               <div key={room.id} className="border p-3 rounded-lg flex justify-between items-center bg-white hover:shadow-md transition-shadow relative overflow-hidden">
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${room.acPrice ? 'bg-cyan-400' : 'bg-slate-300'}`}></div>
                 <div className="pl-3">
                   <div className="font-bold text-slate-800 flex items-center">
                     <span className="text-lg">#{room.number}</span>
                     <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{room.type}</span>
                   </div>
                   <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <div className="flex items-center"><Wind size={10} className="mr-1"/> Non-AC: ₹{room.price}</div>
                      {room.acPrice ? (
                        <div className="flex items-center text-cyan-600 font-medium"><Snowflake size={10} className="mr-1"/> AC: ₹{room.acPrice}</div>
                      ) : (
                        <div className="text-slate-300 italic">No AC Option</div>
                      )}
                   </div>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => startEdit(room)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"><Edit size={16} /></button>
                   <button onClick={() => handleDeleteRoom(room.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className={`p-4 rounded-lg border-l-4 bg-white shadow-sm flex justify-between items-center ${
              log.severity === 'critical' ? 'border-red-500' : log.severity === 'warning' ? 'border-amber-500' : 'border-indigo-500'
            }`}>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">{log.action}</span>
                  <span className="text-xs text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-600 text-sm mt-1">{log.details}</p>
              </div>
              {log.severity === 'critical' && <AlertOctagon className="text-red-500" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};