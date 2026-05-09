const fs = require('fs');

let content = fs.readFileSync('components/Auth.tsx', 'utf8');

content = content.replace(/if \(view === 'RECOVERY'\) \{/, `if (view === 'SIGNUP') {
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
                onLogin(appUser);
            } else {
                setError("User data not found in system.");
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError("Invalid Email or Password.");
        }
    } else if (view === 'RECOVERY') {`);


content = content.replace(
    /\{view === 'LOGIN' && <LogIn className="text-blue-600" \/>\}/,
    `{view === 'LOGIN' && <LogIn className="text-blue-600" />}\n              {view === 'SIGNUP' && <UserPlus className="text-blue-600" />}`
);

content = content.replace(
    /<span className="flex-1">\s*\{view === 'LOGIN' && 'Student Login'\}\s*\{view === 'RECOVERY' && 'Recovery Login'\}/,
    `<span className="flex-1">\n                {view === 'LOGIN' && 'Log in'}\n                {view === 'SIGNUP' && 'Create Account'}\n                {view === 'RECOVERY' && 'Recovery Login'}`
);

content = content.replace(
    /\{view === 'LOGIN' && <SpeakButton text="Welcome! Enter your Mobile Number, Email or UID, and password to login." className="text-blue-600 hover:bg-blue-50" \/>\}/,
    `{view === 'LOGIN' && <SpeakButton text="Welcome! Enter your Email and password to login." className="text-blue-600 hover:bg-blue-50" />}\n              {view === 'SIGNUP' && <SpeakButton text="Welcome! Enter your Email and password to create an account." className="text-blue-600 hover:bg-blue-50" />}`
);

content = content.replace(
    /\{view === 'HOME' && \(\s*<div className="space-y-6 relative z-10 animate-in fade-in mt-10">\s*<button type="button" onClick=\{handleGoogleAuth\} className="w-full bg-\[#e2e8f0\] hover:bg-\[#cbd5e1\] text-\[#1e293b\] font-bold py-4 rounded-\[2rem\] flex items-center justify-center gap-3 transition-all active:scale-95">\s*Create Account\s*<\/button>\s*<button type="button" onClick=\{handleGoogleAuth\} className="w-full bg-\[#e2e8f0\] hover:bg-\[#cbd5e1\] text-\[#1e293b\] font-bold py-4 rounded-\[2rem\] flex items-center justify-center gap-3 transition-all active:scale-95">\s*Log in\s*<\/button>/,
    `{view === 'HOME' && (
            <div className="space-y-6 relative z-10 animate-in fade-in mt-10">
                 <button type="button" onClick={() => setView('SIGNUP')} className="w-full bg-[#111827] hover:bg-[#1f2937] text-white font-bold py-4 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95">
                     Create Account
                 </button>

                 <button type="button" onClick={() => setView('LOGIN')} className="w-full bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#1e293b] font-bold py-4 rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95">
                     Log in
                 </button>`
);

content = content.replace(
    /\{view === 'RECOVERY' && \(\s*<>/,
    `{(view === 'LOGIN' || view === 'SIGNUP') && (
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
                  <>`
);


fs.writeFileSync('components/Auth.tsx', content);
