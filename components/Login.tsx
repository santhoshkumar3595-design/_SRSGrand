import React, { useState } from 'react';
import { login, createUser } from '../services/authService';
import { User, UserRole } from '../types';
import { ShieldCheck, UserPlus, LogIn, Hotel, Briefcase, User as UserIcon, Lock, Mail, CheckCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [roleSelection, setRoleSelection] = useState<'staff' | 'customer' | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [formData, setFormData] = useState({ username: '', password: '', fullName: '', role: 'Guest' as UserRole });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (view === 'register') {
        // Register flow
        const newUser = createUser({
          username: formData.username,
          passwordHash: formData.password, 
          role: 'Guest', 
          fullName: formData.fullName,
          isActive: true
        });
        onLogin(newUser);
      } else {
        // Login flow
        const user = login(formData.username, formData.password);
        if (user) {
          // Check role enforcement
          if (roleSelection === 'staff' && user.role === 'Guest') {
             throw new Error("Access Denied: This account does not have staff privileges.");
          }
          if (roleSelection === 'customer' && user.role !== 'Guest') {
             // Optional: Allow staff to login as customers
          }
          onLogin(user);
        } else {
          setError('Invalid credentials or account inactive.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
        setRecoverySent(true);
    }, 1000);
  };

  // 1. Role Selection Screen
  if (!roleSelection) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[500px]">
          <div className="md:w-1/2 bg-indigo-600 p-8 flex flex-col justify-center items-center text-center">
             <div className="bg-white/20 p-4 rounded-2xl mb-6 backdrop-blur-sm">
               <Hotel size={48} className="text-white" />
             </div>
             <h1 className="text-3xl font-bold text-white mb-2">SRS Grand</h1>
             <p className="text-indigo-200">Hyderabad, India</p>
          </div>
          <div className="md:w-1/2 p-8 flex flex-col justify-center space-y-6 bg-white">
             <h2 className="text-xl font-bold text-slate-800 text-center">Select Login Type</h2>
             
             <button 
               onClick={() => { setRoleSelection('staff'); setView('login'); }}
               className="group flex flex-col items-center p-6 border-2 border-slate-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all"
             >
                <div className="bg-indigo-100 p-3 rounded-full mb-3 group-hover:bg-indigo-200">
                  <Briefcase className="text-indigo-600" size={24} />
                </div>
                <span className="font-semibold text-slate-700 group-hover:text-indigo-700">SRS Grand Staff</span>
                <span className="text-xs text-slate-400 mt-1">Admin & Reception</span>
             </button>

             <button 
               onClick={() => { setRoleSelection('customer'); setView('login'); }}
               className="group flex flex-col items-center p-6 border-2 border-slate-100 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50 transition-all"
             >
                <div className="bg-emerald-100 p-3 rounded-full mb-3 group-hover:bg-emerald-200">
                  <UserIcon className="text-emerald-600" size={24} />
                </div>
                <span className="font-semibold text-slate-700 group-hover:text-emerald-700">SRS Grand Customer</span>
                <span className="text-xs text-slate-400 mt-1">Bookings & Loyalty</span>
             </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Auth Container
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        <button 
          onClick={() => { setRoleSelection(null); setView('login'); setRecoverySent(false); }}
          className="absolute top-4 left-4 text-white/80 hover:text-white z-10 text-xs font-semibold"
        >
          ← Back
        </button>

        <div className={`p-8 text-center ${roleSelection === 'staff' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
            {roleSelection === 'staff' ? <Briefcase className="text-white" size={32} /> : <UserIcon className="text-white" size={32} />}
          </div>
          <h1 className="text-2xl font-bold text-white">SRS Grand</h1>
          <p className="text-white/80 text-sm mt-1">
            {roleSelection === 'staff' ? 'Staff Portal Access' : 'Guest Services Login'}
          </p>
        </div>
        
        {/* Forgot Password View */}
        {view === 'forgot' ? (
           <div className="p-8 space-y-6">
               <h2 className="text-xl font-semibold text-slate-800 text-center">Account Recovery</h2>
               
               {recoverySent ? (
                   <div className="text-center space-y-4 animate-fadeIn">
                       <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                          <CheckCircle size={32} />
                       </div>
                       <div>
                          <p className="text-slate-800 font-bold">Recovery Link Sent!</p>
                          <p className="text-sm text-slate-500 mt-1">Check your email {recoveryEmail} for instructions to reset your password.</p>
                       </div>
                       <button 
                         onClick={() => { setView('login'); setRecoverySent(false); }}
                         className="text-sm text-indigo-600 hover:underline font-bold"
                       >
                         Back to Login
                       </button>
                   </div>
               ) : (
                   <form onSubmit={handleForgotSubmit} className="space-y-4 animate-fadeIn">
                       <p className="text-sm text-slate-500 text-center">Enter your email address and we'll send you a link to reset your password.</p>
                       <div>
                         <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Email Address</label>
                         <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input 
                              type="email" 
                              required
                              className="w-full pl-10 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="you@example.com"
                              value={recoveryEmail}
                              onChange={e => setRecoveryEmail(e.target.value)}
                            />
                         </div>
                       </div>
                       <button 
                         type="submit"
                         className={`w-full text-white py-3 rounded-lg font-semibold transition-colors ${roleSelection === 'staff' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                         Send Recovery Link
                       </button>
                       <button 
                         type="button"
                         onClick={() => setView('login')}
                         className="w-full py-2 text-sm text-slate-500 hover:text-slate-800"
                       >
                         Cancel
                       </button>
                   </form>
               )}
           </div>
        ) : (
          /* Login/Register Form */
          <form onSubmit={handleSubmit} className="p-8 space-y-6 animate-slideUp">
            <h2 className="text-xl font-semibold text-slate-800 text-center">
              {view === 'register' ? 'Create Guest Account' : 'Secure Login'}
            </h2>

            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

            <div className="space-y-4">
              {view === 'register' && (
                <input 
                  type="text" 
                  placeholder="Full Name"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.fullName}
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              )}
              <input 
                type="text" 
                placeholder="Username / Email"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                required
              />
              <div>
                  <input 
                    type="password" 
                    placeholder="Password"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                  />
                  {view === 'login' && (
                     <div className="text-right mt-1">
                        <button type="button" onClick={() => setView('forgot')} className="text-xs text-indigo-500 hover:underline">Forgot password?</button>
                     </div>
                  )}
              </div>
            </div>

            <button 
              type="submit" 
              className={`w-full text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center ${roleSelection === 'staff' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {view === 'register' ? <UserPlus size={18} className="mr-2"/> : <LogIn size={18} className="mr-2"/>}
              {view === 'register' ? 'Sign Up' : 'Access System'}
            </button>

            {roleSelection === 'customer' && (
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setView(view === 'login' ? 'register' : 'login')}
                  className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  {view === 'login' ? 'New guest? Create account' : 'Already have an account? Login'}
                </button>
              </div>
            )}
          </form>
        )}
        
        {view === 'login' && (
           <div className="p-4 bg-slate-50 text-xs text-center text-slate-400 border-t border-slate-100">
             Demo: admin/admin123 or frontdesk/hotel123
           </div>
        )}
      </div>
    </div>
  );
};