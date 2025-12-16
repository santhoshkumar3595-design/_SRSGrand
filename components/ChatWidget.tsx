import React, { useState, useEffect } from 'react';
import { ChatMessage, ServiceType } from '../types';
import { getBookingChats, sendChatMessage, createServiceRequest } from '../services/hotelService';
import { Send, MessageCircle, BellRing, ChevronDown } from 'lucide-react';

interface ChatWidgetProps {
  bookingId: string;
  isStaff: boolean;
  userName: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ bookingId, isStaff, userName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showServiceMenu, setShowServiceMenu] = useState(false);

  useEffect(() => {
    setMessages(getBookingChats(bookingId));
    const interval = setInterval(() => {
       setMessages(getBookingChats(bookingId));
    }, 2000); // Poll for updates
    return () => clearInterval(interval);
  }, [bookingId]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChatMessage(bookingId, input, isStaff, userName);
    setMessages(getBookingChats(bookingId));
    setInput('');
  };

  const handleQuickRequest = (type: ServiceType) => {
    createServiceRequest(bookingId, type, `Request created from Chat by ${userName}`);
    sendChatMessage(bookingId, `[System] Created a ${type} request.`, isStaff, 'System');
    setShowServiceMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl overflow-hidden border border-slate-200 relative">
      <div className="bg-indigo-600 p-3 text-white flex items-center justify-between">
        <div className="flex items-center">
          <MessageCircle size={18} className="mr-2" />
          <span className="font-semibold text-sm">Concierge Chat</span>
        </div>
        <button 
          onClick={() => setShowServiceMenu(!showServiceMenu)} 
          className="bg-indigo-500 p-1 rounded hover:bg-indigo-400 text-xs flex items-center"
        >
          <BellRing size={12} className="mr-1"/> Request Service
        </button>
      </div>

      {showServiceMenu && (
        <div className="absolute top-12 left-0 right-0 bg-white shadow-lg border-b border-slate-200 z-10 p-2 grid grid-cols-2 gap-2 animate-fadeIn">
           {['Housekeeping', 'Room Service', 'Maintenance', 'Reception'].map((type) => (
             <button 
               key={type}
               onClick={() => handleQuickRequest(type as ServiceType)}
               className="text-xs p-2 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded border border-slate-200 text-left"
             >
               {type}
             </button>
           ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <div className="text-center text-slate-400 text-xs mt-4">Start a conversation...</div>}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.senderName === userName ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[80%] p-2 rounded-lg text-sm ${
              msg.senderName === userName ? 'bg-indigo-600 text-white rounded-tr-none' : 
              msg.senderName === 'System' ? 'bg-slate-200 text-slate-600 italic text-xs' :
              'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{msg.senderName}, {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
        ))}
      </div>
      <div className="p-2 bg-white border-t border-slate-200 flex">
        <input 
          className="flex-1 px-3 py-2 text-sm bg-slate-100 rounded-l-lg outline-none"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="bg-indigo-600 text-white px-3 rounded-r-lg hover:bg-indigo-700">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};