export type RoomStatus = 'Vacant' | 'Occupied' | 'Cleaning' | 'Maintenance';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Checked-In' | 'Checked-Out' | 'Cancelled' | 'Rejected';
export type PaymentMode = 'UPI' | 'Card' | 'Cash' | 'Bank';
export type PaymentCategory = 'Room Settlement' | 'Food & Beverage' | 'Services' | 'Damage Fee' | 'Advance' | 'Other' | 'Final Settlement';
export type RoomType = 'Standard' | 'Deluxe' | 'Suite';
export type UserRole = 'Admin' | 'Manager' | 'Receptionist' | 'Staff' | 'Housekeeping' | 'Guest';
export type ServiceType = 'Housekeeping' | 'Room Service' | 'Maintenance' | 'Reception' | 'Other';
export type ServiceStatus = 'Pending' | 'In Progress' | 'Resolved';

export interface User {
  id: string;
  username: string; // email for guests
  passwordHash: string; // Simulated hash
  role: UserRole;
  fullName: string;
  isActive: boolean;
}

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  price: number; // Base Price (Non-AC)
  acPrice?: number; // Price with AC (If defined, room is AC capable)
  status: RoomStatus;
  amenities: string[];
}

export interface Guest {
  id: string; // Linked to User ID if registered
  firstName: string;
  lastName: string;
  email?: string; // Optional
  phone: string;
  idProof: string; // ID Number
  idProofImage?: string; // Base64 string of the uploaded ID
}

export interface Booking {
  id: string;
  roomId: string;
  guest: Guest;
  checkInDate: string;
  checkOutDate: string;
  status: BookingStatus;
  paymentMode: PaymentMode;
  totalAmount: number;
  paidAmount: number;
  createdAt: number;
  bookedAsAc: boolean; // Tracks if the guest chose AC for this booking
  gstIncluded: boolean; // Tracks if GST was applied
  discount: number; // Flat discount amount
  remarks?: string; // Special requests or staff notes
  aiFraudScore?: number; // 0-100
  aiFraudReason?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  date: number;
  mode: PaymentMode;
  category: PaymentCategory;
  recordedBy: string;
}

export interface LedgerEntry {
  id: string;
  date: number;
  description: string;
  type: 'Debit' | 'Credit'; // Debit = Money Owed by Guest (Invoice), Credit = Money Paid by Guest
  amount: number;
  bookingId: string;
  referenceId: string; // Invoice ID or Payment ID
}

export interface DeletionRequest {
  id: string;
  bookingId: string;
  requestedBy: string;
  reason: string;
  requestedAt: number;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ServiceRequest {
  id: string;
  bookingId: string;
  roomNumber: string;
  type: ServiceType;
  description: string;
  status: ServiceStatus;
  priority: 'Low' | 'Medium' | 'High';
  isEscalated: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Invoice {
  id: string;
  bookingId: string;
  generatedAt: number;
  lineItems: { description: string; amount: number }[];
  total: number;
  discount: number;
  tax: number;
  grandTotal: number;
  balanceDue: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ChatMessage {
  id: string;
  bookingId: string; // Chat linked to a booking/context
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isStaff: boolean;
}

export interface Feedback {
  id: string;
  bookingId: string;
  rating: number;
  comment: string;
  submittedAt: number;
}

export interface DailyMetrics {
  occupancyRate: number;
  adr: number;
  revPar: number;
  totalRevenue: number;
  activeBookings: number;
  checkInsToday: number;
  checkOutsToday: number;
  pendingApprovals: number;
  pendingServiceRequests: number;
  pendingDeletionRequests: number;
  outstandingBalance: number;
}

export interface VoiceAnalysis {
  summary: string;
  riskScore: number;
  fraudFlags: string[];
  sentiment: 'Neutral' | 'Aggressive' | 'Suspicious' | 'Distressed' | 'Positive';
}

export interface VoiceLog {
  id: string;
  timestamp: number;
  recordedBy: string; // Staff ID
  recordedByName: string;
  audioData: string; // Base64
  durationSeconds: number;
  analysis?: VoiceAnalysis;
  isProcessed: boolean;
}