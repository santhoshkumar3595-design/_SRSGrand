import { Room, Booking, Guest, DailyMetrics, RoomStatus, AuditLog, ChatMessage, Invoice, Feedback, User, ServiceRequest, ServiceStatus, ServiceType, Payment, LedgerEntry, DeletionRequest, PaymentCategory, PaymentMode, VoiceLog, VoiceAnalysis } from '../types';
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './authService';

// --- DATABASE KEYS ---
const KEYS = {
  ROOMS: 'nexus_rooms',
  BOOKINGS: 'nexus_bookings',
  PAYMENTS: 'nexus_payments',
  LEDGER: 'nexus_ledger',
  LOGS: 'nexus_audit_logs',
  CHATS: 'nexus_chats',
  INVOICES: 'nexus_invoices',
  FEEDBACK: 'nexus_feedback',
  REQUESTS: 'nexus_service_requests',
  DELETION_REQUESTS: 'nexus_deletion_requests',
  VOICE_LOGS: 'nexus_voice_logs'
};

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- INITIALIZATION ---
// Generating Rooms with Full Flexibility (AC and Non-AC for all)
const generateRooms = (): Room[] => {
  const rooms: Room[] = [];
  
  // Floor 1: 101-110 (10 Rooms) - Standard
  for (let i = 1; i <= 10; i++) {
    const num = 100 + i;
    rooms.push({
      id: num.toString(),
      number: num.toString(),
      type: 'Standard',
      price: 2500,        // Non-AC Rate
      acPrice: 3500,      // AC Rate
      status: 'Vacant',
      amenities: ['Wifi', 'TV', 'AC Option']
    });
  }

  // Floor 2: 201-210 (10 Rooms) - Deluxe
  for (let i = 1; i <= 10; i++) {
    const num = 200 + i;
    rooms.push({
      id: num.toString(),
      number: num.toString(),
      type: 'Deluxe',
      price: 4000,        // Non-AC Rate (if requested)
      acPrice: 5000,      // AC Rate
      status: 'Vacant',
      amenities: ['Wifi', 'TV', 'AC Option', 'Mini Bar', 'Balcony']
    });
  }

  // Floor 3: 301-305 (5 Rooms) - Suite
  for (let i = 1; i <= 5; i++) {
    const num = 300 + i;
    rooms.push({
      id: num.toString(),
      number: num.toString(),
      type: 'Suite',
      price: 7000,       // Non-AC Rate
      acPrice: 8500,     // AC Rate
      status: 'Vacant',
      amenities: ['Wifi', 'TV', 'AC Option', 'Mini Bar', 'Jacuzzi', 'Balcony', 'Lounge Access']
    });
  }
  
  return rooms;
};

// Only initialize if not already present to prevent data loss on reload
if (!localStorage.getItem(KEYS.ROOMS)) {
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(generateRooms()));
}

// --- HELPERS ---
const currentUser = () => getCurrentUser() || { id: 'system', fullName: 'System', role: 'Admin' };

export const logAction = (action: string, details: string, severity: 'info' | 'warning' | 'critical' = 'info') => {
  const logs: AuditLog[] = JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]');
  const newLog: AuditLog = {
    id: uuidv4(),
    timestamp: Date.now(),
    userId: currentUser().id,
    action,
    details,
    severity
  };
  localStorage.setItem(KEYS.LOGS, JSON.stringify([newLog, ...logs]));
};

// --- READERS ---
export const getRooms = (): Room[] => JSON.parse(localStorage.getItem(KEYS.ROOMS) || '[]');
export const getBookings = (): Booking[] => JSON.parse(localStorage.getItem(KEYS.BOOKINGS) || '[]');
export const getPayments = (): Payment[] => JSON.parse(localStorage.getItem(KEYS.PAYMENTS) || '[]');
export const getLedger = (): LedgerEntry[] => JSON.parse(localStorage.getItem(KEYS.LEDGER) || '[]');
export const getServiceRequests = (): ServiceRequest[] => JSON.parse(localStorage.getItem(KEYS.REQUESTS) || '[]');
export const getDeletionRequests = (): DeletionRequest[] => JSON.parse(localStorage.getItem(KEYS.DELETION_REQUESTS) || '[]');
export const getAuditLogs = (): AuditLog[] => JSON.parse(localStorage.getItem(KEYS.LOGS) || '[]').sort((a: AuditLog, b: AuditLog) => b.timestamp - a.timestamp);
export const getVoiceLogs = (): VoiceLog[] => JSON.parse(localStorage.getItem(KEYS.VOICE_LOGS) || '[]').sort((a: VoiceLog, b: VoiceLog) => b.timestamp - a.timestamp);

// --- WRITERS ---

// Strict Admin Check for App Configuration Changes
export const saveRooms = (rooms: Room[]) => {
  const user = currentUser();
  if (user.role !== 'Admin') {
     logAction('UNAUTHORIZED_CONFIG_CHANGE', `User ${user.fullName} attempted to modify room inventory.`, 'critical');
     throw new Error("Access Denied: Only Admins can modify Hotel Configuration.");
  }
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
  logAction('ROOM_CONFIG_UPDATE', `Room inventory updated. Total rooms: ${rooms.length}`, 'warning');
};

export const saveBookings = (bookings: Booking[]) => localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));

// --- CORE LOGIC ---

export const findGuestByPhone = (phone: string): { guest: Guest, lastVisit: string } | null => {
  const bookings = getBookings();
  const pastBooking = bookings
    .sort((a, b) => b.createdAt - a.createdAt)
    .find(b => b.guest.phone === phone);

  if (pastBooking) {
    return {
      guest: pastBooking.guest,
      lastVisit: pastBooking.checkOutDate
    };
  }
  return null;
};

export const detectFraud = async (booking: Partial<Booking>): Promise<{ score: number, reason: string }> => {
  if (!apiKey) return { score: 0, reason: 'AI disabled' };
  try {
    const prompt = `Act as a Hotel Security Expert. Analyze this booking for behavioral fraud patterns.
    
    Data:
    - Guest: ${booking.guest?.firstName} ${booking.guest?.lastName}
    - Phone: ${booking.guest?.phone}
    - Stay Duration: ${booking.checkInDate} to ${booking.checkOutDate}
    - Total Amount: ₹${booking.totalAmount}
    - Payment Mode: ${booking.paymentMode}

    Risk Factors to check:
    1. Local ID with 1-night stay (Prostitution/Illegal activity risk).
    2. High value stay (> ₹50,000) paid purely in Cash (Money laundering).
    3. Mismatch between name complexity and simple email/phone patterns.
    4. Very short lead time for high-value suites.

    Return JSON only: { "score": number (0-100, >70 is High Risk), "reason": "concise forensic explanation" }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { score: 0, reason: 'Analysis failed' };
  }
};

export const saveVoiceLog = async (audioBlob: Blob, duration: number) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const user = currentUser();
        
        const newLog: VoiceLog = {
            id: uuidv4(),
            timestamp: Date.now(),
            recordedBy: user.id,
            recordedByName: user.fullName,
            audioData: base64Audio,
            durationSeconds: duration,
            isProcessed: false
        };

        const logs = getVoiceLogs();
        localStorage.setItem(KEYS.VOICE_LOGS, JSON.stringify([newLog, ...logs]));
        
        // Trigger AI Analysis asynchronously
        analyzeVoiceLog(newLog.id);
    };
};

export const analyzeVoiceLog = async (logId: string) => {
    const logs = getVoiceLogs();
    const logIndex = logs.findIndex(l => l.id === logId);
    if (logIndex === -1) return;

    const log = logs[logIndex];
    const base64Data = log.audioData.split(',')[1]; // Remove data URL header

    if (!apiKey) return;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: "audio/webm", data: base64Data } },
                    { text: `You are a Forensic Audio Analyst for a hotel. Listen to this front desk interaction.
                    
                    Your Task:
                    1. Detect Social Engineering: Is the guest trying to manipulate staff (e.g., "I know the owner", "My card is in the car")?
                    2. Detect Identity Masking: Refusal to show ID, wearing sunglasses/mask mentioned, or acting nervous.
                    3. Detect Payment Fraud: Insisting on skipping credit card pre-auth, or offering cash to bypass registration.
                    4. Detect Aggression: Shouting, threats, or coercion.

                    Return JSON structure: 
                    { 
                      "summary": "Brief objective summary of the interaction", 
                      "sentiment": "Neutral" | "Aggressive" | "Suspicious" | "Distressed" | "Positive", 
                      "riskScore": number (0-100, where 100 is confirmed fraud intent), 
                      "fraudFlags": string[] (e.g., ["Refused ID", "Name Dropping", "Cash Coercion"])
                    }` }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const analysis: VoiceAnalysis = JSON.parse(response.text || '{}');
        
        logs[logIndex].analysis = analysis;
        logs[logIndex].isProcessed = true;
        localStorage.setItem(KEYS.VOICE_LOGS, JSON.stringify(logs));

        if (analysis.riskScore > 70) {
            logAction('VOICE_FLAG', `Critical Risk Detected in Voice Log: ${analysis.fraudFlags.join(', ')}`, 'critical');
        }

    } catch (error) {
        console.error("AI Voice Analysis Failed", error);
    }
};

export const isRoomAvailable = (roomId: string, startStr: string, endStr: string, currentBookings: Booking[], excludeBookingId?: string): boolean => {
  const requestedStart = new Date(startStr).getTime();
  const requestedEnd = new Date(endStr).getTime();
  
  return !currentBookings.some(b => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.roomId !== roomId || ['Cancelled', 'Rejected'].includes(b.status)) return false;
    
    const existingStart = new Date(b.checkInDate).getTime();
    const existingEnd = new Date(b.checkOutDate).getTime();
    return (requestedStart < existingEnd) && (requestedEnd > existingStart);
  });
};

export const createBooking = async (
  roomId: string, guest: Guest, checkIn: string, checkOut: string, paymentMode: any, amount: number, isAcBooking: boolean, gstIncluded: boolean, discount: number = 0, remarks?: string
): Promise<Booking> => {
  const user = currentUser();
  const isStaff = user ? user.role !== 'Guest' : false;

  const bookings = getBookings();
  
  if (!isRoomAvailable(roomId, checkIn, checkOut, bookings)) {
    throw new Error("Room is no longer available.");
  }

  const fraudAnalysis = await detectFraud({ guest, checkInDate: checkIn, totalAmount: amount, paymentMode });
  
  if (fraudAnalysis.score > 80) {
    logAction('FRAUD_FLAG', `High risk booking flagged. Score: ${fraudAnalysis.score}. Reason: ${fraudAnalysis.reason}`, 'warning');
  }

  const newBooking: Booking = {
    id: uuidv4(),
    roomId,
    guest,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    status: isStaff ? 'Confirmed' : 'Pending', 
    paymentMode,
    totalAmount: amount,
    paidAmount: 0, 
    bookedAsAc: isAcBooking,
    gstIncluded: gstIncluded,
    discount: discount,
    remarks: remarks || '',
    createdAt: Date.now(),
    aiFraudScore: fraudAnalysis.score,
    aiFraudReason: fraudAnalysis.reason
  };

  saveBookings([...bookings, newBooking]);
  
  const invoice = generateInvoice(newBooking);
  recordLedgerEntry(newBooking.id, 'Debit', invoice.grandTotal, 'Room Charges & Tax', newBooking.id);

  logAction('BOOKING_CREATED', `Booking ${newBooking.id} created`, 'info');
  return newBooking;
};

export const updateBooking = async (
  bookingId: string, 
  roomId: string, 
  guest: Guest, 
  checkIn: string, 
  checkOut: string, 
  paymentMode: any, 
  amount: number,
  isAcBooking: boolean,
  gstIncluded: boolean,
  discount: number = 0,
  remarks?: string
): Promise<Booking> => {
  const user = currentUser();
  const bookings = getBookings();
  const existingIndex = bookings.findIndex(b => b.id === bookingId);
  
  if (existingIndex === -1) throw new Error("Booking not found");
  
  const prevBooking = bookings[existingIndex];

  // --- SECURITY CHECK START ---
  const isSettled = ['Confirmed', 'Checked-In', 'Checked-Out'].includes(prevBooking.status);

  // 1. Strict Check-In Date Lock: Only Manager/Admin can change Check-In date for ANY existing booking
  const checkInChanged = prevBooking.checkInDate !== checkIn;
  if (checkInChanged && !['Admin', 'Manager'].includes(user.role)) {
      logAction('UNAUTHORIZED_ATTEMPT', `User ${user.fullName} tried to change Check-In date for Booking ${bookingId}`, 'critical');
      throw new Error("Security Alert: Only Managers or Admins can modify Check-In dates.");
  }

  // 2. Strict Check-Out Lock for Settled Bookings: Only Admin
  const checkOutChanged = prevBooking.checkOutDate !== checkOut;
  if (checkOutChanged && isSettled && user.role !== 'Admin') {
    logAction('UNAUTHORIZED_ATTEMPT', `User ${user.fullName} tried to change Check-Out date for settled Booking ${bookingId}`, 'critical');
    throw new Error("Security Alert: Only Admins can modify Check-Out dates for settled bookings.");
  }
  // --- SECURITY CHECK END ---
  
  if (!isRoomAvailable(roomId, checkIn, checkOut, bookings, bookingId)) {
    throw new Error("Selected room is not available for the new dates.");
  }

  const updatedBooking = {
    ...prevBooking,
    roomId,
    guest,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    paymentMode,
    totalAmount: amount,
    bookedAsAc: isAcBooking,
    gstIncluded: gstIncluded,
    discount: discount,
    remarks: remarks || ''
  };

  bookings[existingIndex] = updatedBooking;
  saveBookings(bookings);
  
  const prevInv = generateInvoice(prevBooking);
  const newInv = generateInvoice(updatedBooking);
  const diff = newInv.grandTotal - prevInv.grandTotal;

  if (Math.abs(diff) > 0) {
      if (diff > 0) {
          recordLedgerEntry(bookingId, 'Debit', diff, 'Booking Update: Additional Charges', bookingId);
      } else {
          recordLedgerEntry(bookingId, 'Credit', Math.abs(diff), 'Booking Update: Reduction Adjustment', bookingId);
      }
  }

  logAction('BOOKING_MODIFIED', `Booking ${bookingId} modified.`, 'warning');
  return updatedBooking;
};

// --- LEDGER & PAYMENTS ---

const recordLedgerEntry = (bookingId: string, type: 'Debit' | 'Credit', amount: number, description: string, referenceId: string) => {
    const ledger = getLedger();
    const newEntry: LedgerEntry = {
        id: uuidv4(),
        date: Date.now(),
        bookingId,
        type,
        amount,
        description,
        referenceId
    };
    localStorage.setItem(KEYS.LEDGER, JSON.stringify([...ledger, newEntry]));
};

export const processPayment = (bookingId: string, amount: number, mode: PaymentMode, category: PaymentCategory = 'Room Settlement') => {
  const bookings = getBookings();
  const b = bookings.find(x => x.id === bookingId);
  if (!b) return;

  b.paidAmount += amount;
  saveBookings(bookings);

  const payments = getPayments();
  const newPayment: Payment = {
      id: uuidv4(),
      bookingId,
      amount,
      date: Date.now(),
      mode: mode, 
      category,
      recordedBy: currentUser().fullName
  };
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify([...payments, newPayment]));

  recordLedgerEntry(bookingId, 'Credit', amount, `Payment Received: ${category} (${mode})`, newPayment.id);

  logAction('PAYMENT_RECEIVED', `Received ₹${amount} [${category}] via ${mode} for booking ${bookingId}`, 'info');
};

export const generateInvoice = (booking: Booking): Invoice => {
  const roomPrice = booking.totalAmount;
  const taxableAmount = Math.max(0, roomPrice - booking.discount);
  const tax = booking.gstIncluded ? taxableAmount * 0.12 : 0; 
  const grandTotal = taxableAmount + tax;
  
  const items = [{ description: `Room Charges (${booking.bookedAsAc ? 'AC' : 'Non-AC'})`, amount: roomPrice }];
  
  if (booking.discount > 0) {
    items.push({ description: `Discount Applied`, amount: -booking.discount });
  }

  if (booking.gstIncluded) {
    items.push({ description: 'GST (12%)', amount: tax });
  }

  return {
    id: booking.id + '_inv', // Simplified ID for demo
    bookingId: booking.id,
    generatedAt: Date.now(),
    lineItems: items,
    total: roomPrice,
    discount: booking.discount,
    tax: tax,
    grandTotal: grandTotal,
    balanceDue: grandTotal - booking.paidAmount
  };
};

export const getAccountSummary = () => {
    const ledger = getLedger();
    const totalDebit = ledger.filter(l => l.type === 'Debit').reduce((sum, l) => sum + l.amount, 0);
    const totalCredit = ledger.filter(l => l.type === 'Credit').reduce((sum, l) => sum + l.amount, 0);
    const outstanding = totalDebit - totalCredit;
    return { totalDebit, totalCredit, outstanding, transactionCount: ledger.length };
};

// --- DELETION WORKFLOW ---

export const requestBookingDeletion = (bookingId: string, reason: string) => {
    const requests = getDeletionRequests();
    if (requests.find(r => r.bookingId === bookingId && r.status === 'Pending')) {
        throw new Error("A deletion request is already pending for this booking.");
    }
    const req: DeletionRequest = {
        id: uuidv4(),
        bookingId,
        requestedBy: currentUser().fullName,
        reason,
        requestedAt: Date.now(),
        status: 'Pending'
    };
    localStorage.setItem(KEYS.DELETION_REQUESTS, JSON.stringify([...requests, req]));
    logAction('DELETION_REQUEST', `Deletion requested for Booking ${bookingId} by ${req.requestedBy}`, 'warning');
};

export const handleDeletionRequest = (requestId: string, approve: boolean) => {
    const user = currentUser();
    // Strict Role Check for Deletion
    if (user.role !== 'Admin') {
        logAction('UNAUTHORIZED_ATTEMPT', `Non-Admin ${user.fullName} attempted to process deletion request`, 'critical');
        throw new Error("Unauthorized: Only Admins can delete data.");
    }

    const requests = getDeletionRequests();
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    if (approve) {
        const bookings = getBookings().filter(b => b.id !== req.bookingId);
        saveBookings(bookings);
        logAction('BOOKING_DELETED', `Booking ${req.bookingId} deleted by Admin`, 'critical');
    }

    req.status = approve ? 'Approved' : 'Rejected';
    localStorage.setItem(KEYS.DELETION_REQUESTS, JSON.stringify(requests));
};

// --- MISC & CHAT ---

export const updateRoomStatus = (roomId: string, status: RoomStatus) => {
  const rooms = getRooms();
  const updated = rooms.map(r => r.id === roomId ? { ...r, status } : r);
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(updated));
};

export const createServiceRequest = (bookingId: string, type: ServiceType, description: string) => {
  const bookings = getBookings();
  const rooms = getRooms();
  const booking = bookings.find(b => b.id === bookingId);
  const room = rooms.find(r => r.id === booking?.roomId);
  
  if (!booking || !room) return;

  const requests = getServiceRequests();
  const newRequest: ServiceRequest = {
    id: uuidv4(),
    bookingId,
    roomNumber: room.number,
    type,
    description,
    status: 'Pending',
    priority: 'Medium',
    isEscalated: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  localStorage.setItem(KEYS.REQUESTS, JSON.stringify([...requests, newRequest]));
  logAction('SERVICE_REQUEST', `New ${type} request for Room ${room.number}: ${description}`, 'info');
};

export const updateServiceRequestStatus = (requestId: string, status: ServiceStatus, isEscalated: boolean = false) => {
  const requests = getServiceRequests();
  const updated = requests.map(r => r.id === requestId ? { ...r, status, isEscalated, updatedAt: Date.now() } : r);
  localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updated));
};

export const escalateServiceRequest = (requestId: string) => {
  const requests = getServiceRequests();
  const updated = requests.map(r => r.id === requestId ? { ...r, isEscalated: true, priority: 'High', updatedAt: Date.now() } : r);
  localStorage.setItem(KEYS.REQUESTS, JSON.stringify(updated));
  logAction('ESCALATION', `Service request ${requestId} escalated to High Priority`, 'warning');
};

export const sendChatMessage = (bookingId: string, text: string, isStaff: boolean, senderName: string) => {
  const chats: ChatMessage[] = JSON.parse(localStorage.getItem(KEYS.CHATS) || '[]');
  const newMsg: ChatMessage = {
    id: uuidv4(),
    bookingId,
    senderId: currentUser().id,
    senderName,
    text,
    timestamp: Date.now(),
    isStaff
  };
  localStorage.setItem(KEYS.CHATS, JSON.stringify([...chats, newMsg]));
};

export const getBookingChats = (bookingId: string): ChatMessage[] => {
  const chats: ChatMessage[] = JSON.parse(localStorage.getItem(KEYS.CHATS) || '[]');
  return chats.filter(c => c.bookingId === bookingId).sort((a,b) => a.timestamp - b.timestamp);
};

// --- ANALYTICS & NOTIFICATIONS ---

export const getPastOccupancyStats = (): { averageOccupancy: number, daysAnalyzed: number } => {
  const rooms = getRooms();
  const bookings = getBookings();
  const totalRooms = rooms.length;
  if (totalRooms === 0) return { averageOccupancy: 0, daysAnalyzed: 0 };

  let totalOccupancyPercent = 0;
  const days = 3;

  for (let i = 1; i <= days; i++) {
     const date = new Date();
     date.setDate(date.getDate() - i);
     const dateStr = date.toISOString().split('T')[0];
     
     const occupiedCount = bookings.filter(b => 
        b.status !== 'Cancelled' && b.status !== 'Rejected' &&
        b.checkInDate <= dateStr && b.checkOutDate > dateStr
     ).length;

     totalOccupancyPercent += (occupiedCount / totalRooms) * 100;
  }

  return { 
      averageOccupancy: totalOccupancyPercent / days,
      daysAnalyzed: days
  };
};

// UPDATED METRICS WITH DATE RANGE SUPPORT
export const getMetricsForRange = (startDateStr: string, endDateStr: string): DailyMetrics => {
  const rooms = getRooms();
  const bookings = getBookings();
  const requests = getServiceRequests();
  const delRequests = getDeletionRequests();
  const summary = getAccountSummary();

  const start = new Date(startDateStr).getTime();
  const end = new Date(endDateStr).getTime(); // Inclusive of start, usually dates are comparable as strings

  // Helper to count days between two dates
  const countOverlapDays = (bStart: string, bEnd: string): number => {
    const rangeStart = new Date(startDateStr).getTime();
    const rangeEnd = new Date(endDateStr).getTime() + (24 * 60 * 60 * 1000); // Add 1 day to include end date fully
    const bookStart = new Date(bStart).getTime();
    const bookEnd = new Date(bEnd).getTime();

    // Intersection
    const maxStart = Math.max(rangeStart, bookStart);
    const minEnd = Math.min(rangeEnd, bookEnd);

    if (maxStart < minEnd) {
       return Math.ceil((minEnd - maxStart) / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const daysInFilter = Math.max(1, Math.ceil((new Date(endDateStr).getTime() - new Date(startDateStr).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const totalAvailableRoomNights = rooms.length * daysInFilter;

  let totalRevenueInRange = 0;
  let totalOccupiedRoomNights = 0;

  bookings.forEach(b => {
     if (['Cancelled', 'Rejected'].includes(b.status)) return;
     
     const overlap = countOverlapDays(b.checkInDate, b.checkOutDate);
     if (overlap > 0) {
        const totalNights = Math.max(1, Math.ceil((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
        const dailyRate = b.totalAmount / totalNights;
        totalRevenueInRange += (dailyRate * overlap);
        totalOccupiedRoomNights += overlap;
     }
  });

  const occupancyRate = totalAvailableRoomNights > 0 ? (totalOccupiedRoomNights / totalAvailableRoomNights) * 100 : 0;
  const adr = totalOccupiedRoomNights > 0 ? totalRevenueInRange / totalOccupiedRoomNights : 0;
  
  // Active bookings are those strictly active TODAY (for the dashboard current snapshot)
  // But since we are using ranges for metrics, activeBookings might be confusing. 
  // Let's keep Active Bookings as "Currently Active (Today)" regardless of filter, 
  // OR strictly those inside the filter? 
  // The UI usually expects "Active" to mean "Right Now".
  const todayStr = new Date().toISOString().split('T')[0];
  const activeBookingsCount = bookings.filter(b => 
    (b.status === 'Checked-In') || 
    (b.status === 'Confirmed' && b.checkInDate <= todayStr && b.checkOutDate > todayStr)
  ).length;

  return {
    occupancyRate,
    adr,
    revPar: totalRevenueInRange / totalAvailableRoomNights, // Revenue per AVAILABLE room (total inventory)
    totalRevenue: totalRevenueInRange,
    activeBookings: activeBookingsCount,
    checkInsToday: bookings.filter(b => b.checkInDate === startDateStr && b.status === 'Confirmed').length, // Filter specific
    checkOutsToday: bookings.filter(b => b.checkOutDate === endDateStr && b.status === 'Checked-In').length, // Filter specific
    pendingApprovals: bookings.filter(b => b.status === 'Pending').length,
    pendingServiceRequests: requests.filter(r => r.status !== 'Resolved').length,
    pendingDeletionRequests: delRequests.filter(r => r.status === 'Pending').length,
    outstandingBalance: summary.outstanding
  };
};

// Wrapper for backward compatibility or direct calls
export const getDailyMetrics = (): DailyMetrics => {
  const today = new Date().toISOString().split('T')[0];
  return getMetricsForRange(today, today);
};

export const approveBooking = (bookingId: string) => {
  const bookings = getBookings();
  const b = bookings.find(x => x.id === bookingId);
  if (b) {
    b.status = 'Confirmed';
    saveBookings(bookings);
    logAction('BOOKING_APPROVED', `Booking ${bookingId} approved`, 'info');
  }
};

export const checkInGuest = (bookingId: string) => {
  const bookings = getBookings();
  const b = bookings.find(x => x.id === bookingId);
  if (b) {
    b.status = 'Checked-In';
    saveBookings(bookings);
    updateRoomStatus(b.roomId, 'Occupied');
    logAction('CHECK_IN', `Guest checked in for booking ${bookingId}`, 'info');
  }
};

export const checkOutGuest = (bookingId: string) => {
  const bookings = getBookings();
  const b = bookings.find(x => x.id === bookingId);
  if (!b) return;

  const invoice = generateInvoice(b);
  if (invoice.balanceDue > 1) {
    logAction('REVENUE_LEAKAGE', `Attempted checkout with balance due: ₹${invoice.balanceDue}`, 'critical');
    throw new Error(`Cannot check out. Balance due: ₹${invoice.balanceDue.toFixed(2)}`);
  }

  b.status = 'Checked-Out';
  saveBookings(bookings);
  updateRoomStatus(b.roomId, 'Cleaning');
  logAction('CHECK_OUT', `Checkout complete for booking ${bookingId}`, 'info');
};

export const seedDatabase = () => {
  localStorage.clear();
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(generateRooms()));
  // We can add more comprehensive seed data here if needed, but for now reset is sufficient 
  // combined with the auth service automatic admin creation.
  window.location.reload();
};