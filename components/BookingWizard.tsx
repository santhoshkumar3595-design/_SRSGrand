import React, { useState, useEffect } from 'react';
import { Room, Guest, PaymentMode, Booking, User } from '../types';
import { isRoomAvailable, createBooking, updateBooking, findGuestByPhone } from '../services/hotelService';
import { Calendar, User as UserIcon, CreditCard, Check, Search, AlertTriangle, Edit, Snowflake, Wind, ToggleLeft, ToggleRight, Upload, FileText, History, Banknote, Percent, MessageCircle, X, ShieldAlert, Lock } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

interface BookingWizardProps {
  rooms: Room[];
  currentBookings: Booking[];
  onSuccess: () => void;
  onCancel: () => void;
  initialBooking?: Booking; // Added for edit mode
  currentUser: User | null;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({ rooms, currentBookings, onSuccess, onCancel, initialBooking, currentUser }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [guest, setGuest] = useState<Guest>({ id: '', firstName: '', lastName: '', email: '', phone: '', idProof: '' });
  const [remarks, setRemarks] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'AC_CAPABLE'>('ALL');
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
  
  // New state
  const [allocateAsAc, setAllocateAsAc] = useState(false);
  const [includeGst, setIncludeGst] = useState(true);
  const [discount, setDiscount] = useState(0);

  // Chat Support State
  const [showSupportChat, setShowSupportChat] = useState(false);
  const supportChatId = currentUser?.role === 'Guest' ? `support-${currentUser.username}` : 'general-inquiry';

  // --- PERMISSION CHECKS ---
  const userRole = currentUser?.role || 'Guest';
  const isManagement = ['Admin', 'Manager'].includes(userRole);
  
  // 1. Lock Check-In Date: Only Admin/Manager can change it for existing bookings.
  const isCheckInLocked = initialBooking && !isManagement;

  // 2. Lock Check-Out Date: Only Admin can change it IF booking is already settled.
  const isSettled = initialBooking && ['Confirmed', 'Checked-In', 'Checked-Out'].includes(initialBooking.status);
  const isCheckOutLocked = initialBooking && isSettled && userRole !== 'Admin';

  // Pre-fill if editing or if Guest User
  useEffect(() => {
    if (initialBooking) {
      setDates({ checkIn: initialBooking.checkInDate, checkOut: initialBooking.checkOutDate });
      const room = rooms.find(r => r.id === initialBooking.roomId);
      if (room) {
         setSelectedRoom(room);
         setAllocateAsAc(initialBooking.bookedAsAc);
      }
      setGuest(initialBooking.guest);
      setRemarks(initialBooking.remarks || '');
      setPaymentMode(initialBooking.paymentMode);
      setIncludeGst(initialBooking.gstIncluded);
      setDiscount(initialBooking.discount || 0);
    } else if (currentUser && currentUser.role === 'Guest') {
        // Auto-fill for guest booking their own room
        // Extract names roughly from full name
        const names = currentUser.fullName.split(' ');
        const firstName = names[0];
        const lastName = names.slice(1).join(' ') || '';
        
        setGuest(prev => ({
            ...prev,
            firstName: firstName,
            lastName: lastName,
            email: currentUser.username // LOCK THIS to ensure they see the booking
        }));
    }
  }, [initialBooking, rooms, currentUser]);

  const availableRooms = rooms.filter(room => {
    const isAvail = room.status !== 'Maintenance' && 
      (dates.checkIn && dates.checkOut ? isRoomAvailable(room.id, dates.checkIn, dates.checkOut, currentBookings, initialBooking?.id) : true);
    
    if (!isAvail) return false;
    
    if (roomFilter === 'AC_CAPABLE' && !room.acPrice) return false;
    return true;
  });

  const totalNights = dates.checkIn && dates.checkOut 
    ? Math.max(1, Math.floor((new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate Rate
  const currentRate = selectedRoom ? (allocateAsAc && selectedRoom.acPrice ? selectedRoom.acPrice : selectedRoom.price) : 0;
  const totalAmount = currentRate * totalNights;
  const taxableAmount = Math.max(0, totalAmount - discount);
  const taxAmount = includeGst ? (taxableAmount * 0.12) : 0;
  const grandTotal = taxableAmount + taxAmount;

  const handleRoomSelection = (room: Room) => {
    setSelectedRoom(room);
    setAllocateAsAc(!!room.acPrice); 
  };

  const handlePhoneBlur = () => {
    if (guest.phone && !initialBooking) {
       const result = findGuestByPhone(guest.phone);
       if (result) {
         setGuest(prev => ({ ...prev, ...result.guest })); // Preserve ID but update details
         setIsReturningGuest(true);
         setLastVisitDate(result.lastVisit);
         
         // If current user is guest, ensure we revert email to their login just in case
         if (currentUser?.role === 'Guest') {
             setGuest(prev => ({ ...prev, email: currentUser.username }));
         }
       } else {
         setIsReturningGuest(false);
         setLastVisitDate(null);
       }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB Limit
        alert("File size too large. Please upload an image under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuest(prev => ({ ...prev, idProofImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBooking = async () => {
    if (!selectedRoom) return;
    setLoading(true);
    setError('');
    
    try {
      if (initialBooking) {
        // Edit Mode
        await updateBooking(
          initialBooking.id,
          selectedRoom.id,
          guest,
          dates.checkIn,
          dates.checkOut,
          paymentMode,
          totalAmount,
          allocateAsAc,
          includeGst,
          discount,
          remarks
        );
      } else {
        // Create Mode
        await createBooking(
          selectedRoom.id,
          guest,
          dates.checkIn,
          dates.checkOut,
          paymentMode,
          totalAmount,
          allocateAsAc,
          includeGst,
          discount,
          remarks
        );
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Booking failed");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[650px] flex overflow-hidden shadow-2xl relative">
        
        {/* Support Chat Overlay */}
        {showSupportChat && (
           <div className="absolute right-4 bottom-4 w-80 h-96 bg-white shadow-2xl rounded-xl z-50 border border-slate-200 flex flex-col">
              <div className="flex justify-between items-center p-2 bg-indigo-600 text-white rounded-t-xl">
                 <span className="text-sm font-bold ml-2">Reservation Support</span>
                 <button onClick={() => setShowSupportChat(false)}><X size={16} /></button>
              </div>
              <div className="flex-1 bg-slate-50 overflow-hidden">
                <ChatWidget 
                   bookingId={supportChatId} 
                   isStaff={currentUser?.role !== 'Guest'} 
                   userName={currentUser?.fullName || 'Guest'} 
                />
              </div>
           </div>
        )}

        {/* Sidebar Steps */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold">
                {initialBooking ? 'E' : 'N'}
              </div>
              <span className="font-bold text-slate-700">{initialBooking ? 'Modify Booking' : 'New Booking'}</span>
            </div>
            
            <div className={`flex items-center space-x-3 ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>
                <Calendar size={16} />
              </div>
              <span className="font-medium text-sm">Dates & Room</span>
            </div>
            
            <div className={`flex items-center space-x-3 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>
                <UserIcon size={16} />
              </div>
              <span className="font-medium text-sm">Guest Details</span>
            </div>

            <div className={`flex items-center space-x-3 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'}`}>
                <CreditCard size={16} />
              </div>
              <span className="font-medium text-sm">Payment</span>
            </div>
          </div>
          
          <div>
            <button 
              onClick={() => setShowSupportChat(!showSupportChat)}
              className="w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium flex items-center justify-center hover:bg-indigo-200 mb-4"
            >
              <MessageCircle size={16} className="mr-2" /> Need Help?
            </button>
            <div className="text-xs text-slate-400 text-center">
              SRS Grand v2.5 (Hyd)
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>

          {step === 1 && (
            <div className="space-y-6 animate-slideUp">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                 {initialBooking && <Edit className="mr-2 text-indigo-500"/>}
                 {initialBooking ? 'Modify Dates & Room' : 'Select Dates & Room'}
              </h2>
              {initialBooking && (
                <div className="bg-amber-50 p-3 rounded-lg text-amber-700 text-sm border border-amber-100 flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  Modifying this booking will record an audit log and may change the total price.
                </div>
              )}
              
              {/* Permission Warnings */}
              {(isCheckInLocked || isCheckOutLocked) && (
                <div className="bg-red-50 p-3 rounded-lg text-red-700 text-sm border border-red-200 flex items-start">
                   <ShieldAlert size={16} className="mr-2 mt-0.5" />
                   <div>
                       <span className="font-bold block">Action Restricted</span>
                       {isCheckInLocked && "Check-In dates are locked for non-management staff. "}
                       {isCheckOutLocked && "Settled bookings can only be modified by Admins."}
                   </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center">
                      CHECK-IN
                      {isCheckInLocked && <Lock size={12} className="ml-1 text-slate-400" />}
                  </label>
                  <input 
                    type="date" 
                    className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isCheckInLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                    value={dates.checkIn}
                    onChange={(e) => setDates({...dates, checkIn: e.target.value})}
                    readOnly={isCheckInLocked}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center">
                      CHECK-OUT
                      {isCheckOutLocked && <Lock size={12} className="ml-1 text-slate-400" />}
                  </label>
                  <input 
                    type="date" 
                    className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isCheckOutLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                    value={dates.checkOut}
                    min={dates.checkIn}
                    onChange={(e) => setDates({...dates, checkOut: e.target.value})}
                    readOnly={isCheckOutLocked}
                  />
                </div>
              </div>

              {dates.checkIn && dates.checkOut ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-600 flex items-center">
                      <Search size={16} className="mr-2" />
                      Available Rooms ({availableRooms.length})
                    </h3>
                    <div className="flex text-xs border rounded-lg overflow-hidden">
                      <button onClick={() => setRoomFilter('ALL')} className={`px-3 py-1 ${roomFilter === 'ALL' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-500'}`}>All</button>
                      <button onClick={() => setRoomFilter('AC_CAPABLE')} className={`px-3 py-1 ${roomFilter === 'AC_CAPABLE' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-50 text-slate-500'}`}>AC Capable</button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-48 overflow-y-auto pr-2">
                    {availableRooms.map(room => (
                      <div 
                        key={room.id}
                        onClick={() => handleRoomSelection(room)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedRoom?.id === room.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 hover:border-indigo-200'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-lg text-slate-800 flex items-center">
                               #{room.number}
                               {room.acPrice && <Snowflake size={14} className="ml-2 text-cyan-500"/>}
                            </span>
                            <span className="block text-xs text-slate-500">{room.type}</span>
                          </div>
                          <div className="text-right">
                             {room.acPrice ? (
                               <>
                                <span className="block font-bold text-cyan-600 text-sm">₹{room.acPrice} <span className="text-[10px] font-normal text-slate-400">/w AC</span></span>
                                <span className="block text-xs text-slate-500">₹{room.price} <span className="text-[10px] font-normal text-slate-400">/Base</span></span>
                               </>
                             ) : (
                                <span className="font-bold text-slate-600">₹{room.price}</span>
                             )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {availableRooms.length === 0 && (
                      <div className="col-span-2 text-center py-10 text-slate-400">
                        No rooms available for selected dates.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg text-indigo-800 text-sm flex items-center">
                  <Calendar size={16} className="mr-2" />
                  Please select travel dates to view availability.
                </div>
              )}

              {/* Room Configurator (Allocation) */}
              {selectedRoom && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4 animate-slideUp">
                  <h4 className="font-bold text-sm text-slate-700 mb-3">Room Allocation Configuration</h4>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center">
                       <div className={`p-2 rounded-lg mr-3 ${allocateAsAc ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                         {allocateAsAc ? <Snowflake size={20}/> : <Wind size={20}/>}
                       </div>
                       <div>
                         <span className="font-bold text-sm block">{allocateAsAc ? 'Air Conditioning Enabled' : 'Non-AC Allocation'}</span>
                         <span className="text-xs text-slate-400">
                           {selectedRoom.acPrice 
                             ? (allocateAsAc ? `Applied rate: ₹${selectedRoom.acPrice}/night` : `Applied rate: ₹${selectedRoom.price}/night`) 
                             : 'AC not available for this room'
                           }
                         </span>
                       </div>
                    </div>
                    {selectedRoom.acPrice ? (
                       <button 
                         onClick={() => setAllocateAsAc(!allocateAsAc)}
                         className={`relative w-12 h-6 rounded-full transition-colors ${allocateAsAc ? 'bg-cyan-500' : 'bg-slate-300'}`}
                       >
                         <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${allocateAsAc ? 'translate-x-6' : 'translate-x-0'}`}></div>
                       </button>
                    ) : (
                       <span className="text-xs text-slate-400 italic">N/A</span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  disabled={!selectedRoom || !dates.checkIn || !dates.checkOut}
                  onClick={() => setStep(2)}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slideUp">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Guest Information</h2>
                {isReturningGuest && (
                   <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center">
                     <History size={14} className="mr-1" /> Returning Guest
                   </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">PHONE NUMBER <span className="text-red-500">*</span></label>
                   <input 
                    placeholder="Enter Phone Number" 
                    value={guest.phone} 
                    onChange={e => setGuest({...guest, phone: e.target.value})} 
                    onBlur={handlePhoneBlur}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50" 
                    autoFocus
                   />
                </div>
                <div className="col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">EMAIL <span className="text-slate-400 font-normal">(Optional)</span></label>
                   <input 
                     placeholder="Email Address" 
                     type="email" 
                     value={guest.email || ''} 
                     onChange={e => setGuest({...guest, email: e.target.value})} 
                     className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${currentUser?.role === 'Guest' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                     readOnly={currentUser?.role === 'Guest'}
                     title={currentUser?.role === 'Guest' ? 'Email is locked to your account username' : ''}
                   />
                </div>
                <div className="col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">FIRST NAME <span className="text-red-500">*</span></label>
                   <input placeholder="First Name" value={guest.firstName} onChange={e => setGuest({...guest, firstName: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="col-span-1">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">LAST NAME <span className="text-red-500">*</span></label>
                   <input placeholder="Last Name" value={guest.lastName} onChange={e => setGuest({...guest, lastName: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                   <h3 className="text-sm font-bold text-slate-700 mb-2">Identification & Docs</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <input placeholder="ID Number (Passport/Aadhaar)" value={guest.idProof} onChange={e => setGuest({...guest, idProof: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                     </div>
                     <div className="relative">
                        <input type="file" id="id-upload" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <label htmlFor="id-upload" className={`w-full p-3 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors ${guest.idProofImage ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-indigo-500'}`}>
                           {guest.idProofImage ? (
                             <span className="text-emerald-700 flex items-center text-sm font-medium"><Check size={16} className="mr-2"/> ID Uploaded</span>
                           ) : (
                             <span className="text-slate-500 flex items-center text-sm"><Upload size={16} className="mr-2"/> Upload ID Image</span>
                           )}
                        </label>
                     </div>
                   </div>
                   {guest.idProofImage && (
                     <div className="mt-2">
                        <img src={guest.idProofImage} alt="ID Preview" className="h-20 rounded border shadow-sm" />
                     </div>
                   )}
                </div>

                <div className="col-span-2">
                   <label className="block text-xs font-semibold text-slate-500 mb-1">REMARKS / NOTES</label>
                   <textarea 
                     placeholder="Special requests, allergies, or staff notes..." 
                     value={remarks} 
                     onChange={e => setRemarks(e.target.value)} 
                     className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none text-sm" 
                   />
                </div>
              </div>

              {lastVisitDate && (
                <div className="bg-indigo-50 text-indigo-700 p-3 rounded-lg text-xs flex items-center">
                  <History size={14} className="mr-2" />
                  Last stayed on {lastVisitDate}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button onClick={() => setStep(1)} className="text-slate-500 font-medium hover:text-slate-800">Back</button>
                <button 
                  disabled={!guest.firstName || !guest.lastName || !guest.phone}
                  onClick={() => setStep(3)}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && selectedRoom && (
            <div className="space-y-6 animate-slideUp">
              <h2 className="text-2xl font-bold text-slate-800">{initialBooking ? 'Confirm Changes' : 'Payment & Confirm'}</h2>
              
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-500">Room Rate ({totalNights} nights)</span>
                  <span className="font-medium">₹{totalAmount}</span>
                </div>
                
                {currentUser?.role !== 'Guest' && (
                  <div className="flex justify-between mb-2 items-center animate-fadeIn">
                    <span className="text-slate-500 flex items-center">
                      <Percent size={14} className="mr-1"/> Discount (Flat)
                    </span>
                    <div className="w-32">
                      <input 
                        type="number" 
                        value={discount} 
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-full p-1 text-right border rounded text-sm bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between mb-2 items-center">
                  <span className="text-slate-500 flex items-center">
                    <Banknote size={14} className="mr-1"/> GST (12%)
                    <span className="ml-2 text-[10px] bg-slate-200 px-1 rounded text-slate-600">{includeGst ? 'Applied' : 'Exempt'}</span>
                  </span>
                  <div className="flex items-center">
                     <button 
                       onClick={() => setIncludeGst(!includeGst)}
                       className={`relative w-8 h-4 rounded-full mr-3 transition-colors ${includeGst ? 'bg-indigo-500' : 'bg-slate-300'}`}
                     >
                       <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${includeGst ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </button>
                     <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-200 mt-4">
                  <span className="font-bold text-lg text-slate-800">Total Due</span>
                  <span className="font-bold text-xl text-indigo-600">₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="mt-4 flex gap-2">
                   <span className="px-2 py-1 bg-white border rounded text-xs text-slate-500">{selectedRoom.type}</span>
                   <span className={`px-2 py-1 border rounded text-xs font-bold ${allocateAsAc ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {allocateAsAc ? 'AC Enabled' : 'Non-AC Allocation'}
                   </span>
                </div>
              </div>
              
              {remarks && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-sm text-yellow-800 flex items-start">
                   <FileText size={16} className="mr-2 mt-0.5 shrink-0" />
                   <p><span className="font-bold">Remarks:</span> {remarks}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">PAYMENT MODE</label>
                <div className="grid grid-cols-4 gap-3">
                  {['Card', 'UPI', 'Cash', 'Bank'].map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setPaymentMode(mode as PaymentMode)}
                      className={`py-3 rounded-lg border text-sm font-medium transition-all ${paymentMode === mode ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  {error}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <button onClick={() => setStep(2)} className="text-slate-500 font-medium hover:text-slate-800">Back</button>
                <button 
                  onClick={handleBooking}
                  disabled={loading}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-70 shadow-lg shadow-emerald-200 flex items-center"
                >
                  {loading ? 'Processing...' : (initialBooking ? 'Update Booking' : 'Confirm Booking')}
                  {!loading && <Check size={18} className="ml-2" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};