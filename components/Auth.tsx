import React, { useState, useEffect } from 'react';
import { User, Board, ClassLevel, Stream, SystemSettings, RecoveryRequest } from '../types';
import { ADMIN_EMAIL } from '../constants';
import { saveUserToLive, auth, getUserByEmail, getUserByMobileOrId, rtdb, getUserData, updateUserUID } from '../firebase';
import { ref, set } from "firebase/database";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { UserPlus, LogIn, Lock, User as UserIcon, Phone, Mail, ShieldCheck, ArrowRight, School, GraduationCap, Layers, KeyRound, Copy, Check, AlertTriangle, XCircle, MessageCircle, Send, RefreshCcw, ShieldAlert, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { LoginGuide } from './LoginGuide';
import { CustomAlert } from './CustomDialogs';
import { SpeakButton } from './SpeakButton';

interface Props {
  onLogin: (user: User) => void;
  logActivity: (action: string, details: string, user?: User) => void;
  appSettings?: SystemSettings;
}

type AuthView = 'HOME' | 'LOGIN' | 'SIGNUP' | 'ADMIN' | 'RECOVERY' | 'SUCCESS_ID';

const BLOCKED_DOMAINS = [
    'tempmail.com', 'throwawaymail.com', 'mailinator.com', 'yopmail.com', 
    '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'getairmail.com',
    'dispostable.com', 'grr.la', 'mailnesia.com', 'temp-mail.org', 'fake-email.com'
];

export const Auth: React.FC<Props> = ({ onLogin, logActivity, appSettings }) => {
  const [view, setView] = useState<AuthView>('HOME');
  const [generatedId, setGeneratedId] = useState<string>('');
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    mobile: '',
    email: '',
    board: '',
    classLevel: '',
    stream: '',
    recoveryCode: '',
    teacherCode: ''
  });
  const [isTeacherSignup, setIsTeacherSignup] = useState(false);
  
  // ADMIN VERIFICATION STATE
  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [adminAuthCode, setAdminAuthCode] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [pendingLoginUser, setPendingLoginUser] = useState<User | null>(null);

  // LOGIN REQUEST TIMER STATE
  const [requestTimestamp, setRequestTimestamp] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [welcomeUser, setWelcomeUser] = useState<any>(null);
  const [welcomeFading, setWelcomeFading] = useState(false);

  const triggerWelcome = (user: any) => {
    setWelcomeUser(user);
    setTimeout(() => setWelcomeFading(true), 2200);
    setTimeout(() => { setWelcomeUser(null); setWelcomeFading(false); onLogin(user); }, 2700);
  };

  useEffect(() => {
      const s = localStorage.getItem('nst_system_settings');
      if (s) setSettings(JSON.parse(s));
  }, []);

  // Timer Effect
  useEffect(() => {
      let interval: any;
      if (requestTimestamp) {
          interval = setInterval(() => {
              const elapsed = Date.now() - requestTimestamp;
              const remaining = Math.max(0, 10 * 60 * 1000 - elapsed); // 10 minutes in ms
              setTimeLeft(remaining);
              if (remaining === 0) {
                  clearInterval(interval);
              }
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [requestTimestamp]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const generateUserId = () => {
      // Generate an 8 to 12 digit numerical ID (using 10 digits as a solid standard)
      const timestampPart = Date.now().toString().slice(-4); // Last 4 digits of timestamp
      const randomPart = Math.floor(100000 + Math.random() * 900000); // 6 random digits
      return `${timestampPart}${randomPart}`; // e.g. 8432104598
  };

  const handleCopyId = () => {
      navigator.clipboard.writeText(generatedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return false;
      const domain = email.split('@')[1].toLowerCase();
      if (BLOCKED_DOMAINS.includes(domain)) return false;
      return true;
  };

  const handleGoogleAuth = async () => {
      try {
          const provider = new GoogleAuthProvider();
          await setPersistence(auth, browserLocalPersistence);
          const result = await signInWithPopup(auth, provider);
          const firebaseUser = result.user;

          // STRICT FIREBASE ONLY FETCH (Prevent localStorage overriding/breaking flow)
          // Try fetching by ID first
          let appUser: any = await getUserData(firebaseUser.uid);

          // Fallback: Try by Email
          if (!appUser && firebaseUser.email) {
              appUser = await getUserByEmail(firebaseUser.email);
          }

          if (appUser) {
              // User account exists, log them in directly

              // SECURITY & DATA LOSS FIX:
              // If the user's Google UID doesn't match their existing (manual) account UID,
              // Firestore Security Rules will block all future writes to their account.
              // We must migrate their old data to their new Google UID to preserve their history and allow writes.
              if (appUser.id !== firebaseUser.uid) {
                  const oldId = appUser.id;
                  appUser = { ...appUser, id: firebaseUser.uid, provider: 'google' };

                  // Call migration utility
                  await updateUserUID(oldId, firebaseUser.uid, appUser);
              }

              logActivity("LOGIN", "Student Logged In via Google Auth", appUser);
              triggerWelcome(appUser);
              return;
          } else {
              const newId = generateUserId();
              appUser = {
                  id: firebaseUser.uid,
                  displayId: newId,
                  name: firebaseUser.displayName || 'Student',
                  email: firebaseUser.email || '',
                  password: '', // Passwordless for Google Auth, will be set in Onboarding
                  mobile: firebaseUser.phoneNumber || '',
                  role: 'STUDENT',
                  createdAt: new Date().toISOString(),
                  credits: settings?.signupBonus || 2,
                  streak: 0,
                  lastLoginDate: new Date().toISOString(),
                  board: '', // Left empty to trigger onboarding
                  classLevel: '', // Left empty to trigger onboarding
                  provider: 'google',
                  profileCompleted: true,
                  progress: {},
                  redeemedCodes: [],
                  subscriptionTier: 'FREE',
                  isPremium: false
              } as User;

              await saveUserToLive(appUser);
              logActivity("SIGNUP_GOOGLE", "New Student Registered via Google", appUser);
              triggerWelcome(appUser);
          }

      } catch (err: any) {
          console.error("Google Auth Error:", err);
          setError(err.message || "Google Login Failed. Try again.");
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Completely remove `nst_users` local dependency.
    // Fetch directly from Firebase only.

    if (view === 'SIGNUP') {
        if (!validateEmail(formData.email)) {
            setError("Please enter a valid email address.");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const firebaseUser = userCredential.user;

            const newId = generateUserId();
            let appUser = {
                id: firebaseUser.uid,
                displayId: newId,
                name: 'Student',
                email: formData.email,
                password: formData.password,
                mobile: '',
                role: 'STUDENT',
                createdAt: new Date().toISOString(),
                credits: settings?.signupBonus || 2,
                streak: 0,
                lastLoginDate: new Date().toISOString(),
                board: '',
                classLevel: '',
                provider: 'email',
                profileCompleted: true,
                progress: {},
                redeemedCodes: [],
                subscriptionTier: 'FREE',
                isPremium: false
            };

            await saveUserToLive(appUser);
            logActivity("SIGNUP_EMAIL", "New Student Registered via Email", appUser);
            setGeneratedId(newId);
            setPendingLoginUser(appUser);
            setView('SUCCESS_ID');
        } catch (err) {
            console.error("Signup Error:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError("Email is already in use. Please log in.");
            } else {
                setError(err.message || "Signup Failed. Try again.");
            }
        }
    } else if (view === 'LOGIN') {
        try {
            await setPersistence(auth, browserLocalPersistence);
            const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            const firebaseUser = userCredential.user;

            let appUser = await getUserData(firebaseUser.uid);

            if (!appUser && firebaseUser.email) {
                appUser = await getUserByEmail(firebaseUser.email);
            }

            if (appUser) {
                if (appUser.id !== firebaseUser.uid) {
                    const oldId = appUser.id;
                    appUser = { ...appUser, id: firebaseUser.uid, provider: 'email' };
                    await updateUserUID(oldId, firebaseUser.uid, appUser);
                }
                logActivity("LOGIN", "Student Logged In via Email", appUser);
                triggerWelcome(appUser);
            } else {
                setError("User data not found in system.");
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError("Invalid Email or Password.");
        }
    } else if (view === 'RECOVERY') {
        const input = formData.id.trim();
        const pass = formData.password.trim();

        try {
            // STEP 1: QUERY FIRESTORE
            let appUser: any = await getUserByMobileOrId(input);

            // STEP 2: VERIFY CREDENTIALS LOCALLY IF USER EXISTS
            if (appUser) {
                // Verify Password against our DB
                if (appUser.password !== pass && pass !== settings?.adminCode) {
                    setError("Invalid Password.");
                    return;
                }

                if (appUser.isArchived) { setError('Account Deleted.'); return; }

                // SUCCESS: Fetch fresh bulky data before logging them in instantly
                let freshUser = await getUserData(appUser.id);
                if (freshUser) {
                     appUser = { ...appUser, ...freshUser };
                }
                logActivity("LOGIN", "Student Logged In (Custom DB Auth)", appUser);
                triggerWelcome(appUser);

                // FIREBASE SYNC (Run in background so UI is fast)
                try {
                    await setPersistence(auth, browserLocalPersistence);
                    if (appUser.email) {
                        await signInWithEmailAndPassword(auth, appUser.email, pass).catch(async (e) => {
                            // If Firebase Email Auth fails (e.g. wiped by Google Link),
                            // fallback to Anonymous Auth just to keep Firebase SDK happy.
                            console.warn("Background Firebase Auth fallback triggered.");
                            await signInAnonymously(auth);
                        });
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (e) {
                    console.error("Background auth sync failed, but user is logged in locally.", e);
                }

                return;
            }

            // STEP 3: FALLBACK TO FIREBASE DIRECTLY (If they are somehow in Firebase but not our DB)
            if (input.includes('@')) {
                await setPersistence(auth, browserLocalPersistence);
                const userCredential = await signInWithEmailAndPassword(auth, input, pass);
                const firebaseUser = userCredential.user;

                // Create profile since they don't exist in our DB
                appUser = {
                    id: firebaseUser.uid,
                  displayId: generateUserId(),
                    name: firebaseUser.displayName || 'Student',
                    email: input,
                    password: pass,
                    mobile: '',
                    role: 'STUDENT',
                    createdAt: new Date().toISOString(),
                    credits: 0,
                    streak: 0,
                    lastLoginDate: new Date().toISOString(),
                    board: '',
                    classLevel: '',
                    provider: 'manual',
                    profileCompleted: true,
                    progress: {},
                    redeemedCodes: []
                } as User;
                await saveUserToLive(appUser);
                logActivity("LOGIN", "Student Logged In (Firebase)", appUser);
                triggerWelcome(appUser);
            } else {
                // They entered a mobile/ID that doesn't exist in our DB
                setError("User not found. Please verify your Mobile/ID or try using your Email to login.");
            }

        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
                setError("Invalid Email/ID or Password.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Invalid Email format.");
            } else {
                setError(err.message || "Login Failed. Try again.");
            }
        }

    } else if (view === 'ADMIN') {
        if (!showAdminVerify) {
            if (formData.email === settings?.adminEmail) {
                setShowAdminVerify(true);
                setError(null);
            } else {
                setError("Email not authorized.");
            }
        } else {
            if (adminAuthCode === settings?.adminCode) {
                try {
                    await setPersistence(auth, browserLocalPersistence);
                    const cred = await signInAnonymously(auth);
                    let adminUser: any = await getUserByEmail(formData.email);
                    if (adminUser && adminUser.role === 'ADMIN') {
                        adminUser = { ...adminUser, id: cred.user.uid, lastLoginDate: new Date().toISOString(), isPremium: true, subscriptionTier: 'LIFETIME', subscriptionLevel: 'ULTRA' };
                    } else {
                        adminUser = {
                            id: cred.user.uid, displayId: 'IIC-ADMIN', name: 'Administrator', email: formData.email, password: '', mobile: 'ADMIN', role: 'ADMIN',
                            createdAt: new Date().toISOString(), credits: 99999, streak: 999, lastLoginDate: new Date().toISOString(),
                            board: 'CBSE', classLevel: '12', progress: {}, redeemedCodes: [], isPremium: true, subscriptionTier: 'LIFETIME', subscriptionLevel: 'ULTRA'
                        };
                    }
                    await saveUserToLive(adminUser);
                    logActivity("ADMIN_LOGIN", "Admin Access Granted", adminUser);
                    onLogin(adminUser);
                } catch (e: any) { setError("Login Error: " + e.message); }
            } else {
                setError("Invalid Verification Code.");
            }
        }
    }
  };

  /* ── PREMIUM WELCOME OVERLAY ── */
  if (welcomeUser) {
    const name = (welcomeUser.name || 'Student').split(' ')[0];
    const particles = [
      { left:'15%', delay:'0s',   dur:'1.8s', size:6,  color:'#fbbf24' },
      { left:'30%', delay:'0.3s', dur:'2.2s', size:4,  color:'#a78bfa' },
      { left:'50%', delay:'0.1s', dur:'1.6s', size:8,  color:'#f472b6' },
      { left:'65%', delay:'0.5s', dur:'2s',   size:5,  color:'#34d399' },
      { left:'80%', delay:'0.2s', dur:'1.9s', size:4,  color:'#60a5fa' },
      { left:'45%', delay:'0.7s', dur:'2.4s', size:6,  color:'#fbbf24' },
      { left:'22%', delay:'0.4s', dur:'1.7s', size:3,  color:'#f9a8d4' },
      { left:'72%', delay:'0.6s', dur:'2.1s', size:5,  color:'#818cf8' },
    ];
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden',
        background: 'linear-gradient(135deg, #07050f 0%, #160830 45%, #07050f 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: welcomeFading ? 'welcome-fade-out 0.5s ease forwards' : 'welcome-fade-in 0.5s ease forwards'
      }}>
        {/* Floating particles */}
        {particles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: '12%', left: p.left,
            width: p.size, height: p.size, borderRadius: '50%', background: p.color,
            animation: `welcome-particle ${p.dur} ease-out ${p.delay} infinite`,
            filter: 'blur(0.5px)'
          }} />
        ))}

        {/* Outer ring glow */}
        <div style={{
          position: 'absolute', width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Main card */}
        <div style={{
          position: 'relative', textAlign: 'center', padding: '0 32px',
          animation: 'welcome-badge-pop 0.6s cubic-bezier(.34,1.56,.64,1) 0.1s both'
        }}>
          {/* Crown / star badge */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
            boxShadow: '0 0 32px rgba(251,191,36,0.5), 0 0 64px rgba(251,191,36,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34
          }}>✦</div>

          {/* Welcome text with gold shimmer */}
          <h1 style={{
            fontSize: 52, fontWeight: 900, letterSpacing: '-1px', lineHeight: 1,
            background: 'linear-gradient(90deg, #fbbf24, #f9fafb, #fbbf24, #fde68a, #fbbf24)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'welcome-shimmer-gold 2s linear infinite'
          }}>Welcome</h1>

          {/* Student name */}
          <p style={{
            marginTop: 10, fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em'
          }}>{name}</p>

          {/* Tagline */}
          <p style={{
            marginTop: 8, fontSize: 11, fontWeight: 600, color: '#6366f1',
            letterSpacing: '0.18em', textTransform: 'uppercase'
          }}>Your Learning Journey Begins</p>

          {/* Thin gold divider */}
          <div style={{
            margin: '20px auto 0', width: 60, height: 2, borderRadius: 2,
            background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)'
          }} />
        </div>

        {/* Progress bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: 'rgba(255,255,255,0.08)'
        }}>
          <div style={{
            height: '100%', background: 'linear-gradient(90deg, #a78bfa, #fbbf24, #f472b6)',
            animation: 'welcome-progress 2.5s linear forwards'
          }} />
        </div>
      </div>
    );
  }

  if (view === 'SUCCESS_ID') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full border border-slate-200 text-center animate-in zoom-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Account Created!</h2>
                <p className="text-slate-600 text-sm mb-6">Here is your unique Login ID.</p>
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-6 flex items-center justify-between">
                    <span className="text-2xl font-mono font-bold text-slate-800 tracking-wider">{generatedId}</span>
                    <button onClick={handleCopyId} className="text-slate-500 hover:text-blue-600">
                        {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                </div>
                <button 
                    onClick={() => {
                        if (pendingLoginUser) triggerWelcome(pendingLoginUser);
                        else setView('LOGIN'); 
                    }} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl"
                >
                    Start Learning Now
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans py-10">
      <CustomAlert 
          isOpen={alertConfig.isOpen} 
          message={alertConfig.message} 
          onClose={() => {
              setAlertConfig({...alertConfig, isOpen: false});
              if (pendingLoginUser) onLogin(pendingLoginUser);
          }} 
      />
      {showGuide && <LoginGuide onClose={() => setShowGuide(false)} />}
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
        
        <button onClick={() => setShowGuide(true)} className="absolute top-4 left-4 z-20 text-slate-500 hover:text-blue-600">
            <HelpCircle size={24} />
        </button>

        <div className="text-center mb-8 relative z-10 mt-6">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(59,130,246,0.15)] ring-4 ring-slate-50 p-1 overflow-hidden">
              {settings?.appLogo ? (
                  <img src={settings.appLogo} alt="App Logo" className="w-full h-full object-cover rounded-full" />
              ) : (
                  <h1 className="text-5xl font-black text-blue-600">{settings?.appShortName || 'NSTA'}</h1>
              )}
          </div>
          <h1 className="text-[2.5rem] font-black text-[#111827] mb-1 tracking-tight leading-none mx-auto mt-6">
              {settings?.appShortName || 'NSTA'}
          </h1>
          <p className="text-[#64748b] font-bold tracking-[0.15em] text-[10px] uppercase mt-3">The Future of Learning</p>
        </div>

        {view !== 'HOME' && (
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 relative z-10">
              {view === 'LOGIN' && <LogIn className="text-blue-600" />}
              {view === 'SIGNUP' && <UserPlus className="text-blue-600" />}
              {view === 'RECOVERY' && <KeyRound className="text-orange-500" />}

              <span className="flex-1">
                {view === 'LOGIN' && 'Log in'}
                {view === 'SIGNUP' && 'Create Account'}
                {view === 'RECOVERY' && 'Recovery Login'}
                {view === 'ADMIN' && (showAdminVerify ? 'Admin Verification' : 'Admin Login')}
              </span>

              {view === 'LOGIN' && <SpeakButton text="Welcome! Enter your Email and password to login." className="text-blue-600 hover:bg-blue-50" />}
              {view === 'SIGNUP' && <SpeakButton text="Welcome! Enter your Email and password to create an account." className="text-blue-600 hover:bg-blue-50" />}
              {view === 'RECOVERY' && <SpeakButton text="Enter your Mobile Number and Recovery Password to login." className="text-orange-500 hover:bg-orange-50" />}
            </h2>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl mb-6 border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
            <XCircle size={18} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {view === 'HOME' && (
            <div className="space-y-6 relative z-10 animate-in fade-in mt-10">
                 <button type="button" onClick={() => setView('SIGNUP')} className="w-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold py-4 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95">
                     Create Account
                 </button>

                 <button type="button" onClick={() => setView('LOGIN')} className="w-full bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#1e293b] font-bold py-4 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95">
                     Log in
                 </button>

            </div>
        )}

        {view !== 'HOME' && (
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                            {(view === 'LOGIN' || view === 'SIGNUP') && (
                  <>
                     <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
                         <input name="email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                     </div>
                     <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase">Password</label>
                         <div className="relative">
                             <input name="password" type={showPassword ? "text" : "password"} placeholder={view === 'SIGNUP' ? "Create a password" : "Enter your password"} value={formData.password} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-10" required />
                             <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                             </button>
                         </div>
                     </div>
                     <button type="submit" className="w-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold py-3.5 rounded-xl mt-4 shadow-lg transition-all active:scale-95">
                         {view === 'LOGIN' ? 'Log In' : 'Create Account'}
                     </button>

                     <div className="text-center mt-6">
                         <div className="relative">
                             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                             <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500 font-bold">Or continue with</span></div>
                         </div>

                         <button type="button" onClick={handleGoogleAuth} className="w-full mt-6 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm active:scale-95">
                             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                             Google
                         </button>
                     </div>
                  </>
              )}

              {view === 'RECOVERY' && (
                  <>
                     <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase">Mobile Number / Email / UID</label><input name="id" type="text" placeholder="Enter Mobile Number" value={formData.id} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold" /></div>
                     <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-600 uppercase">Password</label>
                         <div className="relative">
                             <input name="password" type={showPassword ? "text" : "password"} placeholder="Enter Password" value={formData.password} onChange={handleChange} className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold pr-10" />
                             <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
                                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                             </button>
                         </div>
                     </div>
                     <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-lg hover:bg-blue-700">Login</button>

                     <div className="text-center mt-6">
                         <div className="relative">
                             <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                             <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500 font-bold">Or</span></div>
                         </div>

                         <button type="button" onClick={handleGoogleAuth} className="w-full mt-6 bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-slate-700 font-bold py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm">
                             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                             Login with Google
                         </button>
                     </div>
                  </>
              )}
              
              {view === 'ADMIN' && (
                  <>
                    <div className="space-y-1.5"><label className="text-xs font-bold text-slate-600 uppercase">Admin Email</label><input name="email" type="email" placeholder="Authorized Email" value={formData.email} onChange={handleChange} disabled={showAdminVerify} className={`w-full px-4 py-3 border rounded-xl ${showAdminVerify ? 'bg-slate-100 border-slate-200 text-slate-600' : 'border-slate-200'}`} /></div>
                    {showAdminVerify && (<div className="space-y-1.5 animate-in fade-in slide-in-from-top-2"><label className="text-xs font-bold text-purple-600 uppercase flex items-center gap-1"><ShieldAlert size={12} /> Verification Code</label><input name="adminAuthCode" type="password" placeholder="Enter Secret Code" value={adminAuthCode} onChange={(e) => setAdminAuthCode(e.target.value)} className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" autoFocus /></div>)}
                    <button type="submit" className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl mt-4 flex items-center justify-center gap-2">{showAdminVerify ? <><Lock size={18} /> Access Dashboard</> : 'Verify Email'}</button>
                  </>
              )}
            </form>
        )}

        {(view === 'SIGNUP' || view === 'ADMIN' || view === 'RECOVERY' || view === 'LOGIN') && (
            <div className="mt-8 text-center pb-4">
                <button onClick={() => setView('HOME')} className="text-slate-600 font-bold text-sm hover:text-slate-800 transition-colors">Go Back</button>
            </div>
        )}
      </div>
    </div>
  );
};
