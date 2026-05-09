import React, { useState } from 'react';
import { User, Board, ClassLevel, Stream } from '../types';
import { saveUserToLive } from '../firebase';
import { BookOpen, Target, LogOut, Loader2, Sparkles, Zap, Award } from 'lucide-react';

interface Props {
  user: User;
  onComplete: (user: User) => void;
  onLogout: () => void;
}

export const Onboarding: React.FC<Props> = ({ user, onComplete, onLogout }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name || '');
  const [mobile, setMobile] = useState(user.mobile || '');
  const [password, setPassword] = useState('');
  const [board, setBoard] = useState<Board | ''>('');
  const [classLevel, setClassLevel] = useState<ClassLevel | ''>('');
  const [stream, setStream] = useState<Stream | ''>('');
  const [isSaving, setIsSaving] = useState(false);

  const isGoogleUser = user.provider === 'google' && !user.password;

  const handleNext = () => {
      if (step === 1 && !name.trim()) {
          alert('Please enter your name.');
          return;
      }
      if (step === 1 && isGoogleUser && mobile.length !== 10) {
          alert('Please enter a valid 10-digit mobile number.');
          return;
      }
      if (step === 1 && isGoogleUser && password.length < 8) {
          alert('Please set a password (min 8 characters).');
          return;
      }
      if (step === 1 && !board) {
          alert('Please select a board.');
          return;
      }
      if (step === 2 && !classLevel) {
          alert('Please select a class.');
          return;
      }
      if (step === 2 && ['11', '12'].includes(classLevel) && !stream) {
          alert('Please select a stream.');
          return;
      }

      if (step < 2) {
          setStep(step + 1);
      } else {
          finishOnboarding();
      }
  };

  const finishOnboarding = async () => {
      setIsSaving(true);
      try {
          const updatedUser: User = {
              ...user,
              name: name.trim(),
              board: board as Board,
              classLevel: classLevel as ClassLevel,
              stream: stream ? (stream as Stream) : undefined,
              profileCompleted: true
          };

          if (isGoogleUser) {
              updatedUser.mobile = mobile;
              updatedUser.password = password;
          }

          await saveUserToLive(updatedUser);

          // Removing reliance on nst_users
          localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));

          onComplete(updatedUser);
      } catch (error) {
          console.error('Onboarding save failed:', error);
          alert('Failed to save profile. Please try again.');
          setIsSaving(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">

      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50 translate-x-1/3 translate-y-1/3"></div>

      <div className="w-full bg-white rounded-[2rem] shadow-xl border border-slate-100 relative z-10 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="p-8 pb-6 text-center border-b border-slate-50 relative">
              <button onClick={onLogout} className="absolute top-6 right-6 text-slate-500 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-full">
                  <LogOut size={16} />
              </button>

              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-200 rotate-3">
                  <Sparkles size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Complete Your Profile</h1>
              <p className="text-slate-600 text-sm mt-2 font-medium">Step {step} of 2</p>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                  <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(step / 2) * 100}%` }}
                  ></div>
              </div>
          </div>

          <div className="p-8 pt-6 flex-1 min-h-[300px]">
              {step === 1 && (
                  <div className="animate-in slide-in-from-right fade-in duration-300">
                      <div className="mb-6 space-y-4">
                          <div>
                              <label className="text-sm font-bold text-slate-700 block mb-2">Full Name</label>
                              <input
                                  type="text"
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  placeholder="Enter your full name"
                                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                              />
                          </div>

                          {isGoogleUser && (
                              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-4">
                                  <p className="text-xs text-orange-800 font-bold flex items-center gap-2">
                                      <span>Account Setup Required</span>
                                  </p>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Mobile Number</label>
                                      <input
                                          type="tel"
                                          value={mobile}
                                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0,10))}
                                          placeholder="10-digit mobile number"
                                          className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none font-bold"
                                      />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-bold text-slate-600 block mb-1 uppercase">Set Password</label>
                                      <input
                                          type="password"
                                          value={password}
                                          onChange={(e) => setPassword(e.target.value)}
                                          placeholder="Minimum 8 characters"
                                          className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none font-bold"
                                      />
                                  </div>
                              </div>
                          )}
                      </div>
                      <div className="flex items-center gap-3 mb-6 mt-6 pt-4 border-t border-slate-100">
                          <Target className="text-blue-500" size={24} />
                          <h2 className="text-lg font-bold text-slate-800">Select Your Board</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                          {['CBSE', 'BSEB'].map(b => (
                              <button
                                  key={b}
                                  onClick={() => setBoard(b as Board)}
                                  className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${board === b ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                              >
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${board === b ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                          {b.charAt(0)}
                                      </div>
                                      <div className="text-left">
                                          <div className={`font-bold text-lg ${board === b ? 'text-blue-900' : 'text-slate-700'}`}>{b}</div>
                                          <div className="text-xs text-slate-500 font-medium">{b === 'CBSE' ? 'Central Board (English)' : 'Bihar Board (Hindi)'}</div>
                                      </div>
                                  </div>
                                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${board === b ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                                      {board === b && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {step === 2 && (
                  <div className="animate-in slide-in-from-right fade-in duration-300">
                       <div className="flex items-center gap-3 mb-6">
                          <BookOpen className="text-purple-500" size={24} />
                          <h2 className="text-lg font-bold text-slate-800">Select Your Class</h2>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-6">
                          {['6','7','8','9','10','11','12'].map(c => (
                              <button
                                  key={c}
                                  onClick={() => setClassLevel(c as ClassLevel)}
                                  className={`py-3 rounded-xl border-2 font-black transition-all ${classLevel === c ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm scale-105' : 'border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'}`}
                              >
                                  {c}
                              </button>
                          ))}
                          <button
                                  onClick={() => setClassLevel('COMPETITION')}
                                  className={`py-3 col-span-2 rounded-xl border-2 font-black transition-all flex items-center justify-center gap-2 ${classLevel === 'COMPETITION' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm scale-[1.02]' : 'border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-slate-50'}`}
                              >
                                  <Award size={16} /> COMPETITION
                          </button>
                      </div>

                      {(['11', '12'].includes(classLevel) || classLevel === 'COMPETITION') && (
                          <div className="animate-in fade-in slide-in-from-bottom-2">
                              <h3 className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wider flex items-center gap-2">
                                  <Zap size={14} className="text-orange-500"/> Select Stream
                              </h3>
                              <div className="grid grid-cols-1 gap-2">
                                  {['Science', 'Commerce', 'Arts'].map(s => (
                                      <button
                                          key={s}
                                          onClick={() => setStream(s as Stream)}
                                          className={`p-3 rounded-xl border-2 font-bold text-left transition-all ${stream === s ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-slate-50'}`}
                                      >
                                          {s}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              {step > 1 && (
                  <button
                      onClick={() => setStep(step - 1)}
                      className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                      Back
                  </button>
              )}
              <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                  {isSaving ? (
                      <><Loader2 className="animate-spin" size={20} /> Saving...</>
                  ) : (
                      <>{step === 2 ? 'Continue to Dashboard' : 'Continue'}</>
                  )}
              </button>
          </div>
      </div>

      <div className="mt-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10">
          Powered by NST AI
      </div>
    </div>
  );
};
