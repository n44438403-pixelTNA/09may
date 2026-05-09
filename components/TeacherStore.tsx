import React, { useState } from 'react';
import { User, SystemSettings, TeacherStorePlan } from '../types';
import { Store, CheckCircle, Shield, Gift, Zap, HelpCircle, AlertTriangle } from 'lucide-react';

interface TeacherStoreProps {
    user: User;
    settings: SystemSettings | null;
    onRedeemSuccess: (user: User) => void;
}

const TeacherStore: React.FC<TeacherStoreProps> = ({ user, settings, onRedeemSuccess }) => {
    const [teacherUnlockCode, setTeacherUnlockCode] = useState('');
    const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, type: 'SUCCESS'|'ERROR'|'INFO', message: string}>({isOpen: false, type: 'INFO', message: ''});

    const plans = settings?.teacherStorePlans || [];
    const isActive = user.teacherExpiryDate ? new Date(user.teacherExpiryDate).getTime() > Date.now() : true;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in">
            {/* Header */}
            <div className="bg-indigo-600 px-4 py-8 rounded-b-[2rem] text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                    <Store size={200} />
                </div>
                <div className="relative z-10 text-center">
                    <h1 className="text-3xl font-black mb-2 flex justify-center items-center gap-2">
                        <Store size={28}/> Teacher Store
                    </h1>
                    <p className="text-indigo-200">Exclusive plans and tools for educators</p>
                </div>
            </div>

            <div className="p-4 mt-2 max-w-4xl mx-auto">
                {alertConfig.isOpen && (
                    <div className={`p-4 rounded-xl mb-6 flex items-center justify-between ${alertConfig.type === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <div className="flex items-center gap-2">
                            {alertConfig.type === 'SUCCESS' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                            <span className="font-bold">{alertConfig.message}</span>
                        </div>
                        <button onClick={() => setAlertConfig({...alertConfig, isOpen: false})} className="font-bold">&times;</button>
                    </div>
                )}

                {/* Status Bar */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">Access Status</p>
                        <div className="flex items-center gap-2">
                            {isActive ? (
                                <><CheckCircle size={18} className="text-green-500" /><span className="font-bold text-slate-800">Active</span></>
                            ) : (
                                <><Shield size={18} className="text-red-500" /><span className="font-bold text-slate-800">Expired</span></>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">Valid Until</p>
                        <p className="font-black text-slate-800">
                            {user.teacherExpiryDate ? new Date(user.teacherExpiryDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Redeem Code Section */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 mb-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-indigo-100 p-2 rounded-xl">
                            <Gift size={24} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="font-black text-slate-800">Have a Renewal Code?</h2>
                            <p className="text-sm text-slate-600">Enter your access code to extend your validity.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={teacherUnlockCode}
                            onChange={(e) => setTeacherUnlockCode(e.target.value)}
                            placeholder="e.g. TCH1234"
                            className="flex-1 px-4 py-3 bg-white border border-indigo-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-mono"
                        />
                        <button
                            onClick={() => {
                                const codes = settings?.teacherCodes || [];
                                const validCode = codes.find(c => c.code === teacherUnlockCode && c.isActive);
                                if (validCode) {
                                    const durationDays = validCode.durationDays || 365;
                                    const baseDate = isActive && user.teacherExpiryDate ? new Date(user.teacherExpiryDate) : new Date();
                                    baseDate.setDate(baseDate.getDate() + durationDays);

                                    onRedeemSuccess({
                                        ...user,
                                        role: 'TEACHER',
                                        teacherCode: validCode.code,
                                        isPremium: true,
                                        subscriptionTier: 'ULTRA',
                                        subscriptionEndDate: baseDate.toISOString(),
                                        teacherExpiryDate: baseDate.toISOString()
                                    });
                                    setTeacherUnlockCode('');
                                    setAlertConfig({isOpen: true, type: "SUCCESS", message: `Success! You are now a Teacher for ${durationDays} days.`});
                                } else {
                                    setAlertConfig({isOpen: true, type: "ERROR", message: "Invalid or inactive code."});
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-md"
                        >
                            Apply
                        </button>
                    </div>
                </div>

                {/* Plans Grid */}
                <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><Zap size={24} className="text-yellow-500"/> Subscription Plans</h2>

                {plans.filter(p => p.isActive).length === 0 ? (
                    <div className="bg-slate-100 p-8 rounded-2xl text-center text-slate-600 border border-slate-200 border-dashed">
                        No plans available at the moment. Please contact the administrator.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plans.filter(p => p.isActive).map((plan) => (
                            <div key={plan.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col hover:border-indigo-300 transition-colors">
                                <h3 className="text-xl font-black text-slate-800 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1 mb-4">
                                    <span className="text-3xl font-black text-indigo-600">₹{plan.price}</span>
                                    <span className="text-slate-600 font-medium">/ {plan.durationDays} days</span>
                                </div>
                                <div className="flex-1">
                                    <ul className="space-y-3 mb-6">
                                        {(plan.benefits || []).map((benefit, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-slate-700">
                                                <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm font-medium">{typeof benefit === 'string' ? benefit : ''}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {settings?.paymentNumbers && settings.paymentNumbers.length > 0 ? (
                                    <div className="flex flex-col gap-2 mt-auto">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-1">Select an Admin to Purchase</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {settings.paymentNumbers.map((num) => (
                                                <button
                                                    key={num.id}
                                                    onClick={() => {
                                                        const phone = num.number;
                                                        const msg = encodeURIComponent(`Hi ${num.name}, I am interested in purchasing the Teacher Plan: ${plan.name} for ₹${plan.price}. My account ID is ${user.displayId || user.id}`);
                                                        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                                                    }}
                                                    className="w-full bg-slate-900 text-white py-2 rounded-xl font-bold hover:bg-slate-800 transition-colors text-xs flex flex-col items-center justify-center"
                                                >
                                                    <span className="truncate w-full px-1">{num.name}</span>
                                                    <span className="text-[9px] text-slate-500 font-mono mt-0.5">{num.number}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const msg = encodeURIComponent(`Hi, I am interested in purchasing the Teacher Plan: ${plan.name} for ₹${plan.price}. My account ID is ${user.displayId || user.id}`);
                                            window.open(`https://wa.me/918227070298?text=${msg}`, '_blank');
                                        }}
                                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors mt-auto"
                                    >
                                        Purchase via WhatsApp
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherStore;
