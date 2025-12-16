import React, { useState, useEffect } from 'react';
import { 
  getRooms, getBookings, getDailyMetrics, getMetricsForRange,
  checkInGuest, checkOutGuest, approveBooking, processPayment, generateInvoice, getPastOccupancyStats
} from './services/hotelService';
import { getCurrentUser, logout } from './services/authService';
import { User, Room, Booking, Invoice, PaymentCategory, PaymentMode } from './types';

// Components
import { Dashboard } from './components/Dashboard';
import { RoomGrid } from './components/RoomGrid';
import { BookingWizard } from './components/BookingWizard';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { ChatWidget } from './components/ChatWidget';
import { RiskMonitor } from './components/RiskMonitor';
import { ServiceRequestPanel } from './components/ServiceRequestPanel';
import { BookingList } from './components/BookingList';
import { FinancePanel } from './components/FinancePanel';
import { VoiceRecorder } from './components/VoiceRecorder';

// Icons
import { LayoutDashboard, CalendarDays, ConciergeBell, Plus, LogOut, CheckCircle, XCircle, DollarSign, MessageSquare, Edit, FileText, Smartphone, Menu, ChevronLeft, ShieldAlert, Clock, BellRing, PieChart, TrendingDown, MessageCircle } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | undefined>(undefined);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  // Date Range State for Dashboard
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ start: todayStr, end: todayStr });
  
  const [metrics, setMetrics] = useState(getDailyMetrics());
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBookingForChat, setSelectedBookingForChat] = useState<Booking | null>(null);
  const [checkoutInvoice, setCheckoutInvoice] = useState<{invoice: Invoice, booking: Booking} | null>(null);
  const [collectPaymentModal, setCollectPaymentModal] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>('Room Settlement');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  
  // Mobile Nav State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Notifications
  const [occupancyAlert, setOccupancyAlert] = useState<{show: boolean, value: number}>({show: false, value: 0});

  useEffect(() => {
    setRooms(getRooms());
    setBookings(getBookings().sort((a, b) => b.createdAt - a.createdAt));
    
    // Fetch metrics based on selected date range
    setMetrics(getMetricsForRange(dateRange.start, dateRange.end));

    // Check Occupancy Trend (Always checks past 3 days regardless of filter)
    const stats = getPastOccupancyStats();
    if (stats.averageOccupancy < 50 && user?.role !== 'Guest') {
       setOccupancyAlert({ show: true, value: stats.averageOccupancy });
    } else {
       setOccupancyAlert({ show: false, value: 0 });
    }

  }, [refreshKey, user, dateRange]);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  if (!user) return <Login onLogin={(u) => { setUser(u); handleRefresh(); }} />;

  const handleLogout = () => { logout(); setUser(null); };

  const handleCheckoutAttempt = (booking: Booking) => {
    try {
      checkOutGuest(booking.id);
      handleRefresh();
    } catch (e: any) {
      // Revenue Leakage caught! Show invoice to resolve.
      setCheckoutInvoice({ invoice: generateInvoice(booking), booking });
      setPaymentCategory('Final Settlement'); // Default to settlement for checkout
      setPaymentMode(booking.paymentMode);
    }
  };

  const handlePayBalance = () => {
    if (!checkoutInvoice) return;
    processPayment(checkoutInvoice.booking.id, checkoutInvoice.invoice.balanceDue, paymentMode, paymentCategory);
    setCheckoutInvoice(null);
    checkOutGuest(checkoutInvoice.booking.id); // Retry checkout
    handleRefresh();
  };

  const handleQuickPayment = () => {
    if (!collectPaymentModal || !paymentAmount) return;
    processPayment(collectPaymentModal.id, Number(paymentAmount), paymentMode, paymentCategory);
    setCollectPaymentModal(null);
    setPaymentAmount('');
    handleRefresh();
  };

  const openBookingModal = (booking?: Booking) => {
    setBookingToEdit(booking);
    setShowBookingModal(true);
  };

  const handleNav = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const openConciergeChat = () => {
      // Find the most recent active booking for this guest
      if (user.role === 'Guest') {
         const activeBooking = bookings.find(b => b.guest.email === user.username && ['Confirmed', 'Checked-In'].includes(b.status));
         if (activeBooking) {
             setSelectedBookingForChat(activeBooking);
         } else {
             alert("You don't have an active booking to chat about. Please create a booking first.");
         }
      }
  };

  // Helper for role checks
  const isAdminOrManager = ['Admin', 'Manager'].includes(user.role);
  const isHousekeeping = user.role === 'Housekeeping';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white p-4 flex justify-between items-center z-20 shadow-md">
        <div className="flex items-center">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-3">
             <Menu size={24} />
           </button>
           <span className="font-bold">SRS Grand</span>
        </div>
        {activeTab !== 'dashboard' && user.role !== 'Guest' && (
           <button onClick={() => setActiveTab('dashboard')} className="flex items-center text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">
             <ChevronLeft size={14} className="mr-1"/> Back
           </button>
        )}
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 left-0 z-40 shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-indigo-500 p-2 rounded-lg">
             <ConciergeBell className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight">SRS Grand</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50">{user.role}</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {user.role !== 'Guest' && !isHousekeeping && (
            <button onClick={() => handleNav('dashboard')} className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <LayoutDashboard size={18} /> <span className="ml-3 font-medium">Dashboard</span>
            </button>
          )}
          
          <button onClick={() => handleNav('bookings')} className={`nav-btn ${activeTab === 'bookings' ? 'active' : ''}`}>
             <CalendarDays size={18} /> <span className="ml-3 font-medium">{user.role === 'Guest' ? 'My Bookings' : 'Reservations'}</span>
          </button>

          {user.role !== 'Guest' && (
             <button onClick={() => handleNav('services')} className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`}>
              <BellRing size={18} /> 
              <span className="ml-3 font-medium">Services</span>
              {metrics.pendingServiceRequests > 0 && <span className="ml-auto bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full">{metrics.pendingServiceRequests}</span>}
            </button>
          )}

          {isAdminOrManager && (
            <button onClick={() => handleNav('finance')} className={`nav-btn ${activeTab === 'finance' ? 'active' : ''}`}>
              <PieChart size={18} /> <span className="ml-3 font-medium">Reports & Finance</span>
            </button>
          )}

          {isAdminOrManager && (
            <button onClick={() => handleNav('risk')} className={`nav-btn ${activeTab === 'risk' ? 'active' : ''}`}>
              <ShieldAlert size={18} /> <span className="ml-3 font-medium">Risk Monitor</span>
            </button>
          )}

          {user.role === 'Admin' && (
            <button onClick={() => handleNav('admin')} className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}>
              <CheckCircle size={18} /> 
              <span className="ml-3 font-medium">Admin & Audit</span>
              {metrics.pendingDeletionRequests > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{metrics.pendingDeletionRequests}</span>}
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-sm font-medium text-white">{user.fullName}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 md:ml-64 mt-16 md:mt-0 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
           <div className="flex flex-col gap-2 w-full md:w-auto">
              <div className="flex items-center">
                 {activeTab !== 'dashboard' && user.role !== 'Guest' && (
                   <button 
                     onClick={() => setActiveTab('dashboard')} 
                     className="hidden md:flex mr-4 p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                     title="Back to Dashboard"
                   >
                     <ChevronLeft size={20} />
                   </button>
                 )}
                 <h2 className="text-2xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Overview' : activeTab === 'finance' ? 'Financial Reports' : activeTab}</h2>
              </div>
              
              {/* Date Filters for Dashboard */}
              {activeTab === 'dashboard' && user.role !== 'Guest' && (
                <div className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
                    <span className="text-slate-500 font-medium px-1">Filters:</span>
                    <input 
                      type="date" 
                      value={dateRange.start} 
                      onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                      className="border rounded px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                    <span className="text-slate-400">to</span>
                    <input 
                      type="date" 
                      value={dateRange.end} 
                      onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                      className="border rounded px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500" 
                    />
                </div>
              )}
           </div>
           
           <div className="flex gap-2 w-full md:w-auto">
               {(user.role !== 'Guest' && !isHousekeeping) && (
                 <button onClick={() => openBookingModal()} className="flex-1 md:flex-initial bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-indigo-700 shadow-md shadow-indigo-200">
                   <Plus size={18} className="mr-2" /> New Booking
                 </button>
               )}
               {user.role === 'Guest' && activeTab === 'bookings' && (
                 <button onClick={() => openBookingModal()} className="flex-1 md:flex-initial bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center hover:bg-emerald-700 shadow-md shadow-emerald-200">
                   <Plus size={18} className="mr-2" /> Request Room
                 </button>
               )}
           </div>
        </div>

        {/* ALERTS */}
        {occupancyAlert.show && (
           <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center shadow-sm animate-fadeIn">
              <div className="bg-orange-100 p-2 rounded-full mr-3">
                 <TrendingDown className="text-orange-600" size={20} />
              </div>
              <div className="flex-1">
                 <h4 className="font-bold text-orange-800 text-sm">Low Occupancy Alert</h4>
                 <p className="text-xs text-orange-700">Average occupancy over the past 3 days is low ({occupancyAlert.value.toFixed(1)}%). Consider running a promotion.</p>
              </div>
              <button onClick={() => setOccupancyAlert({...occupancyAlert, show: false})} className="text-orange-400 hover:text-orange-600"><XCircle size={18}/></button>
           </div>
        )}

        {activeTab === 'dashboard' && user.role !== 'Guest' && (
          <div className="space-y-8 animate-fadeIn">
            <Dashboard metrics={metrics} />
            <RoomGrid rooms={rooms} onRefresh={handleRefresh} />
          </div>
        )}

        {activeTab === 'admin' && user.role === 'Admin' && <AdminPanel />}
        
        {activeTab === 'risk' && isAdminOrManager && <RiskMonitor />}

        {activeTab === 'services' && user.role !== 'Guest' && <ServiceRequestPanel />}

        {activeTab === 'finance' && isAdminOrManager && <FinancePanel />}

        {activeTab === 'bookings' && (
          <BookingList 
            bookings={bookings.filter(b => user.role !== 'Guest' || b.guest.email === user.username)}
            rooms={rooms}
            userRole={user.role}
            onRefresh={handleRefresh}
            onEdit={openBookingModal}
            onChat={setSelectedBookingForChat}
            onPayment={(b) => { 
                setCollectPaymentModal(b); 
                setPaymentCategory('Room Settlement');
                setPaymentMode(b.paymentMode); 
            }}
            onApprove={(id) => { approveBooking(id); handleRefresh(); }}
            onCheckIn={(id) => { checkInGuest(id); handleRefresh(); }}
            onCheckOut={(b) => handleCheckoutAttempt(b)}
          />
        )}
      </main>

      {/* Voice Recorder for Staff */}
      {user.role !== 'Guest' && <VoiceRecorder />}

      {/* Floating Chat Button for Guests */}
      {user.role === 'Guest' && (
         <button 
            onClick={openConciergeChat}
            className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 transition-all z-40 animate-bounce-in"
            title="Concierge Chat"
         >
            <MessageCircle size={28} />
         </button>
      )}

      {/* Payment Collection Modal */}
      {collectPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full shadow-2xl animate-slideUp">
             <h3 className="font-bold text-lg mb-4">Collect Payment</h3>
             <p className="text-sm text-slate-500 mb-4">
               Total Due: <span className="font-bold text-slate-800">₹{generateInvoice(collectPaymentModal).balanceDue.toFixed(2)}</span>
             </p>
             <div className="space-y-3 mb-4">
               <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Category</label>
                  <select 
                    value={paymentCategory} 
                    onChange={e => setPaymentCategory(e.target.value as PaymentCategory)}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="Room Settlement">Room Settlement</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Services">Services</option>
                    <option value="Damage Fee">Damage Fee</option>
                    <option value="Advance">Advance</option>
                    <option value="Other">Other</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Mode</label>
                  <select 
                    value={paymentMode} 
                    onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full p-2 border rounded-lg bg-slate-50"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
                  <input 
                    type="number" 
                    className="w-full p-3 border rounded-lg"
                    placeholder="Enter Amount"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    autoFocus
                  />
               </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setCollectPaymentModal(null)} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={handleQuickPayment} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">Confirm</button>
             </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Checkout (Revenue Leakage Prevention) */}
      {checkoutInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white p-8 rounded-xl max-w-md w-full shadow-2xl animate-slideUp">
             <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-slate-800">Invoice Pending</h3>
                <DollarSign className="text-red-500" size={24} />
             </div>
             <p className="text-sm text-slate-600 mb-4">You cannot check out with an outstanding balance. Please collect payment to proceed.</p>
             
             <div className="bg-slate-50 p-4 rounded-lg mb-6 space-y-2">
                {checkoutInvoice.invoice.lineItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.description}</span>
                    <span className={item.amount < 0 ? 'text-green-600' : ''}>₹{item.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold text-slate-800 mt-2">
                  <span>Balance Due</span>
                  <span className="text-red-600">₹{checkoutInvoice.invoice.balanceDue.toFixed(2)}</span>
                </div>
             </div>

             <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tag Payment As</label>
                    <select 
                        value={paymentCategory} 
                        onChange={e => setPaymentCategory(e.target.value as PaymentCategory)}
                        className="w-full p-2 border rounded-lg bg-slate-50"
                    >
                        <option value="Final Settlement">Final Settlement</option>
                        <option value="Room Settlement">Room Settlement</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Services">Services</option>
                        <option value="Damage Fee">Damage Fee</option>
                        <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Mode</label>
                    <select 
                        value={paymentMode} 
                        onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                        className="w-full p-2 border rounded-lg bg-slate-50"
                    >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>
             </div>

             <div className="flex gap-3">
               <button onClick={() => setCheckoutInvoice(null)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
               <button onClick={handlePayBalance} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold">Collect & Check Out</button>
             </div>
           </div>
        </div>
      )}

      {/* Chat Drawer */}
      {selectedBookingForChat && (
        <div className="fixed inset-y-0 right-0 w-full md:w-80 bg-white shadow-2xl z-50 transform transition-transform animate-slideInRight flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-700">Booking Chat</h3>
            <button onClick={() => setSelectedBookingForChat(null)}><XCircle className="text-slate-400" /></button>
          </div>
          <div className="flex-1 p-2 bg-slate-100">
             <ChatWidget 
               bookingId={selectedBookingForChat.id} 
               isStaff={user.role !== 'Guest'} 
               userName={user.fullName} 
             />
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingWizard 
          rooms={rooms} 
          currentBookings={bookings}
          initialBooking={bookingToEdit}
          currentUser={user}
          onSuccess={() => { setShowBookingModal(false); setBookingToEdit(undefined); handleRefresh(); }} 
          onCancel={() => { setShowBookingModal(false); setBookingToEdit(undefined); }} 
        />
      )}

      <style>{`
        .nav-btn { @apply w-full flex items-center px-4 py-3 rounded-lg transition-colors text-slate-400 hover:bg-slate-800 hover:text-white; }
        .nav-btn.active { @apply bg-indigo-600 text-white; }
      `}</style>
    </div>
  );
}

export default App;