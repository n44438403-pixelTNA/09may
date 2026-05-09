import React, { useState, useEffect } from 'react';
import { User, CreditPackage, SystemSettings } from '../types';
import { Crown, Sparkles, Check, X, Zap, MessageSquare, Lock, Timer } from 'lucide-react';

interface Props {
  user: User;
  settings?: SystemSettings;
  onUserUpdate: (user: User) => void;
}

const DEFAULT_PACKAGES: CreditPackage[] = [
  { id: 'pkg-1', name: '100 Credits', credits: 100, price: 10 },
  { id: 'pkg-2', name: '200 Credits', credits: 200, price: 20 },
  { id: 'pkg-3', name: '500 Credits', credits: 500, price: 50 },
  { id: 'pkg-4', name: '1000 Credits', credits: 1000, price: 100 },
  { id: 'pkg-5', name: '2000 Credits', credits: 2000, price: 200 },
  { id: 'pkg-6', name: '5000 Credits', credits: 5000, price: 500 },
  { id: 'pkg-7', name: '10000 Credits', credits: 10000, price: 1000 }
];

export const Store: React.FC<Props> = ({ user, settings }) => {
  // "BASIC" maps to "PRO", "ULTRA" maps to "MAX"
  const [tierType, setTierType] = useState<'BASIC' | 'ULTRA'>('BASIC'); 
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  const packages = settings?.packages || DEFAULT_PACKAGES;
  const subscriptionPlans = settings?.subscriptionPlans || [];
  
  // Set default selected plan
  useEffect(() => {
    if (subscriptionPlans.length > 0 && !selectedPlanId) {
      // Try to find "Monthly" or first
      const defaultPlan = subscriptionPlans.find(p => p.name.includes('Monthly')) || subscriptionPlans[0];
      setSelectedPlanId(defaultPlan.id);
    }
  }, [subscriptionPlans]);

  const selectedPlan = subscriptionPlans.find(p => p.id === selectedPlanId);

  // NEW: Support Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<any>(null); // Plan or CreditPackage

  // Special Discount Event Logic
  const event = settings?.specialDiscountEvent;
  const isSubscribed = user.isPremium && user.subscriptionEndDate && new Date(user.subscriptionEndDate) > new Date();
  
  // FIXED: Discount applies ONLY when cooldown is over (now >= startsAt && now < endsAt).
  // During cooldown phase, store prices stay unchanged and the discount does NOT apply.
  const isEventActive = () => {
    if (!event?.enabled) return false;
    const now = Date.now();
    // If enabled but no dates provided, assume always active
    if (!event.startsAt && !event.endsAt) return true;

    // Strict date checking — discount is locked until cooldown ends.
    const startsAt = event.startsAt ? new Date(event.startsAt).getTime() : 0;
    const endsAt = event.endsAt ? new Date(event.endsAt).getTime() : Infinity;

    if (startsAt === endsAt) {
        return now >= startsAt;
    }

    return now >= startsAt && now < endsAt;
  };

  // Cooldown phase: discount enabled but startsAt is still in the future.
  const isCooldownPhase = () => {
    if (!event?.enabled || !event.startsAt) return false;
    return Date.now() < new Date(event.startsAt).getTime();
  };

  const activeEvent = isEventActive(); // No longer force-true on enable; cooldown is respected.
  const inCooldown = isCooldownPhase();
  const showEventBanner = (activeEvent || inCooldown) && ((isSubscribed && event?.showToPremiumUsers) || (!isSubscribed && event?.showToFreeUsers));

  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    if (!event?.enabled || (!event?.startsAt && !event?.endsAt)) {
        setTimeLeft(null);
        return;
    }

    const calculateTime = () => {
        const now = new Date().getTime();
        const start = event.startsAt ? new Date(event.startsAt).getTime() : 0;
        const end = event.endsAt ? new Date(event.endsAt).getTime() : 0;
        
        let diff = 0;
        if (now < start) {
            // Cooldown Phase
            diff = start - now;
        } else if (start === end && now >= start) {
            // Active Indefinitely
            setTimeLeft(null);
            return;
        } else if (now < end) {
            // Active Phase
            diff = end - now;
        }

        if (diff <= 0) {
            setTimeLeft(null);
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft({ days, hours, minutes, seconds });
        }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [event]);

  const handleSupportClick = (numEntry: any) => {
      if (!purchaseItem) return;
      
      const isSub = purchaseItem.duration !== undefined; // Detect if Sub Plan
      const itemName = purchaseItem.name;
      
      // FIX: Use the discounted price that was passed to purchaseItem (e.g. from initiatePurchase)
      // purchaseItem already contains the modified 'price' if it was a CreditPackage.
      // For plans, we need to pass the *final* calculated price.
      // If purchaseItem has a 'finalPrice' prop (custom), use it. Otherwise fallback to standard logic.

      let price = 0;
      let features = '';

      if (isSub) {
          // If it's a plan, we expect 'purchaseItem' to have the correct discounted price attached
          // OR we re-calculate it here using the same logic.
          // Better: We will modify initiatePurchase to attach 'finalPrice' for plans.
          // Assuming 'purchaseItem' now has 'finalPrice' if we passed it correctly.
          // Let's rely on 'purchaseItem.price' if set, otherwise calculate.

          if (purchaseItem.finalPrice !== undefined) {
              price = purchaseItem.finalPrice;
          } else {
              // Fallback (Should be avoided by updating initiatePurchase call)
              price = tierType === 'BASIC' ? purchaseItem.basicPrice : purchaseItem.ultraPrice;
          }
          features = tierType === 'BASIC' ? 'MCQ + Notes (Pro)' : 'PDF + Videos + AI Studio (Max)';
      } else {
          // Credits
          price = purchaseItem.price;
          features = `${purchaseItem.credits} Credits`;
      }

      // Record Activity
      if (typeof (window as any).recordActivity === 'function') {
          (window as any).recordActivity('PURCHASE', `Initiated Purchase: ${itemName}`, price, { 
              itemId: purchaseItem.id,
              subject: isSub ? 'Subscription' : 'Credits'
          });
      }

      const message = `Hello Admin, I want to buy:\n\nItem: ${itemName} ${isSub ? `(${tierType === 'BASIC' ? 'PRO' : 'MAX'})` : ''}\nPrice: ₹${price}\nUser ID: ${user.id}\nDetails: ${features}\n\nPlease share payment details.`;
      
      window.open(`https://wa.me/91${numEntry.number}?text=${encodeURIComponent(message)}`, '_blank');
      setShowSupportModal(false);
  };

  const initiatePurchase = (item: any) => {
      setPurchaseItem(item);
      setShowSupportModal(true);
  };

  if (settings?.isPaymentEnabled === false) {
    return (
      <div className="animate-in fade-in zoom-in duration-300 pb-4">
        <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 text-center shadow-2xl">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
            <Lock size={40} className="text-slate-600" />
          </div>
          <h3 className="text-2xl font-black text-slate-200 mb-2">Store Locked</h3>
          <p className="text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
            {settings.paymentDisabledMessage || "Purchases are currently disabled by the Admin. Please check back later."}
          </p>
        </div>
      </div>
    );
  }

  // Derived Data
  const defaultBasicFeatures = [
        'Daily Login Bonus: 10 Credits/Day',
        'Full MCQs Unlocked',
        'Premium Notes (Standard)',
        'Audio Library (Standard)',
        'AI Videos (2D Basic)',
        'Team Support',
        'Spin Wheel (5 Spins/Day)'
  ];

  const defaultUltraFeatures = [
        'Daily Login Bonus: 20 Credits/Day',
        'Everything in Basic Unlocked',
        'Premium Notes (Deep Dive)',
        'Ultra Podcast (Studio HD)',
        'AI Videos (2D + 3D Deep Dive)',
        'Competitive Mode Unlocked 🏆',
        'Spin Wheel (10 Spins/Day)'
  ];

  const featuresList = tierType === 'BASIC'
    ? (settings?.storeFeatures?.basic?.filter(f => f.trim()) || defaultBasicFeatures)
    : (settings?.storeFeatures?.ultra?.filter(f => f.trim()) || defaultUltraFeatures);

  const currentPrice = selectedPlan 
    ? (tierType === 'BASIC' ? selectedPlan.basicPrice : selectedPlan.ultraPrice)
    : 0;

  const originalPrice = selectedPlan
    ? (tierType === 'BASIC' ? selectedPlan.basicOriginalPrice : selectedPlan.ultraOriginalPrice)
    : 0;

  // Calculate monthly price equivalent if duration is yearly
  const getPerMonthPrice = (plan: any, price: number) => {
      if (plan.duration.toLowerCase().includes('year') || plan.duration.includes('365')) {
          return Math.round(price / 12);
      }
      return null;
  };
  
  const saveAmount = originalPrice - currentPrice;

  // Calculate days remaining for subscription
  const getDaysRemaining = () => {
    if (!user.subscriptionEndDate) return null;
    const end = new Date(user.subscriptionEndDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    if (diffTime <= 0) return null;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 relative min-h-screen bg-black text-white font-sans">
      
      {/* SUBSCRIPTION STATUS */}
      {user.isPremium && (
          <div className="w-full mx-auto pt-6 px-4">
              <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
                  <div>
                      <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Active Subscription</p>
                      <h4 className="text-white font-black">{user.subscriptionLevel === 'ULTRA' ? 'ULTRA MAX' : 'BASIC PRO'}</h4>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] text-indigo-300 font-medium">Remaining Time</p>
                      <p className="text-lg font-black text-yellow-400">{daysRemaining || 0} Days</p>
                  </div>
              </div>
          </div>
      )}

      {/* SUPPORT CHANNEL SELECTOR MODAL */}
      {showSupportModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
              <div className="bg-slate-900 rounded-3xl w-full shadow-2xl overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 text-white text-center">
                      <h3 className="font-black text-lg flex items-center justify-center gap-2">
                          <MessageSquare size={20} /> Select Support Channel
                      </h3>
                      <p className="text-xs text-cyan-100 mt-1">Choose a number to proceed with payment</p>
                  </div>
                  <div className="p-4 space-y-3">
                      {(settings?.paymentNumbers || [{id: 'def', name: 'Main Support', number: '8227070298', dailyClicks: 0}]).map((num) => {
                          const totalClicks = settings?.paymentNumbers?.reduce((acc, curr) => acc + (curr.dailyClicks || 0), 0) || 1;
                          const traffic = Math.round(((num.dailyClicks || 0) / totalClicks) * 100);
                          const isGreen = traffic < 30;

                          return (
                              <button 
                                  key={num.id}
                                  onClick={() => handleSupportClick(num)}
                                  className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center hover:bg-slate-700 hover:border-cyan-500/50 transition-all group"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isGreen ? 'bg-green-600' : 'bg-orange-500'}`}>
                                          {num.name.charAt(0)}
                                      </div>
                                      <div className="text-left">
                                          <p className="font-bold text-slate-200 text-sm group-hover:text-cyan-400">{num.name}</p>
                                          <p className="text-[10px] text-slate-600">{isGreen ? '✅ Fast Response' : '⚠️ High Traffic'}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <span className={`text-xs font-black ${isGreen ? 'text-green-500' : 'text-orange-500'}`}>{traffic}% Busy</span>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
                  <div className="p-4 bg-slate-800 border-t border-slate-700 text-center">
                      <button onClick={() => setShowSupportModal(false)} className="text-slate-500 font-bold text-sm hover:text-white">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- PERPLEXITY STYLE STORE --- */}
      <div className="w-full mx-auto pt-8 px-4">
          
          {/* HEADER ICON */}
          <div className="flex justify-center mb-4">
              <Sparkles size={40} className="text-slate-500 opacity-80" strokeWidth={1.5} />
          </div>

          {/* TITLE & SUBTITLE */}
          <div className="text-center mb-8">
              <h2 className="text-4xl font-serif text-white tracking-tight mb-2">Select your plan</h2>
              <p className="text-slate-500 text-sm font-medium">Unlock your full potential today</p>
              
              {showEventBanner && (
                  <div className={`mt-6 p-6 rounded-3xl relative overflow-hidden shadow-2xl border-2 animate-in zoom-in duration-300 ${
                      activeEvent
                          ? 'bg-gradient-to-br from-sky-500 via-cyan-400 to-sky-600 border-sky-300'
                          : 'bg-gradient-to-br from-slate-800 to-slate-900 border-sky-500/50'
                  }`}>
                      {/* Premium Effects */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/25 rounded-full blur-3xl -mt-10 -mr-10 animate-pulse"></div>
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-200/20 rounded-full blur-2xl -mb-10 -ml-10"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-16 bg-white/10 rounded-full blur-2xl rotate-12"></div>
                      
                      <div className="relative z-10 flex flex-col gap-4">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="text-center md:text-left flex-1">
                                  <div className="inline-flex items-center gap-2 mb-3 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 shadow-inner">
                                      <Sparkles size={14} className={!activeEvent ? "text-amber-400" : "text-white"} />
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                                          !activeEvent ? 'text-amber-400 animate-pulse' : 'text-white'
                                      }`}>
                                          {!activeEvent ? 'PREMIUM ACCESS COMING SOON' : 'EXCLUSIVE PREMIUM OFFER'}
                                      </span>
                                  </div>
                                  <h3 className="text-3xl font-black text-white leading-tight mb-2 drop-shadow-md">
                                      {!activeEvent
                                          ? "Special Discount Event"
                                          : `Get ${event?.discountPercent}% OFF Today`}
                                  </h3>
                                  <p className="text-sm text-white/90 font-medium">
                                      {!activeEvent
                                          ? "Prepare for the best deals on our premium features."
                                          : `Upgrade your learning experience instantly.${isSubscribed ? ' (+5% Extra Bonus for You!)' : ''}`}
                                  </p>
                              </div>

                              {timeLeft && (
                                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 shrink-0 shadow-xl flex flex-col items-center min-w-[140px]">
                                      <p className="text-[10px] font-black text-amber-100 uppercase mb-2 tracking-[0.2em] flex items-center gap-1">
                                          <Timer size={12} /> {!activeEvent ? 'Starts In' : 'Offer Ends In'}
                                      </p>
                                      <div className="flex items-center gap-2 font-mono text-2xl font-black text-white drop-shadow-md tabular-nums">
                                          {timeLeft.days > 0 && <div className="flex flex-col items-center"><span className="text-3xl">{timeLeft.days}</span><span className="text-[8px] text-white/70 uppercase">Days</span></div>}
                                          {timeLeft.days > 0 && <span className="text-white/50 pb-3">:</span>}
                                          <div className="flex flex-col items-center"><span className="text-3xl">{String(timeLeft.hours).padStart(2, '0')}</span><span className="text-[8px] text-white/70 uppercase">Hrs</span></div>
                                          <span className="text-white/50 pb-3">:</span>
                                          <div className="flex flex-col items-center"><span className="text-3xl">{String(timeLeft.minutes).padStart(2, '0')}</span><span className="text-[8px] text-white/70 uppercase">Min</span></div>
                                          <span className="text-white/50 pb-3">:</span>
                                          <div className="flex flex-col items-center"><span className="text-3xl">{String(timeLeft.seconds).padStart(2, '0')}</span><span className="text-[8px] text-white/70 uppercase">Sec</span></div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* TOGGLE: PRO vs MAX */}
          <div className="flex justify-center mb-8">
              <div className="bg-slate-900/50 p-1 rounded-full border border-slate-800 flex relative w-64 h-12">
                  <button 
                      onClick={() => setTierType('BASIC')}
                      className={`flex-1 rounded-full text-sm font-bold transition-all z-10 font-serif tracking-wide ${
                          tierType === 'BASIC' 
                          ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                          : 'text-slate-500 hover:text-white'
                      }`}
                  >
                      Basic
                  </button>
                  <button 
                      onClick={() => setTierType('ULTRA')}
                      className={`flex-1 rounded-full text-sm font-bold transition-all z-10 font-serif tracking-wide flex items-center justify-center gap-2 ${
                          tierType === 'ULTRA' 
                          ? 'bg-white text-black shadow-lg' 
                          : 'text-slate-500 hover:text-white'
                      }`}
                  >
                      Ultra
                  </button>
              </div>
          </div>

          {/* FEATURES LIST */}
          <div className="mb-10 pl-2">
             <ul className="space-y-4">
                 {featuresList.map((feat, i) => (
                     <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                         <Check size={18} className="text-slate-600 shrink-0 mt-0.5" strokeWidth={3} />
                         <span className="leading-snug">{feat}</span>
                     </li>
                 ))}
                 <li className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                      <Check size={18} className="text-slate-600 shrink-0 mt-0.5" strokeWidth={3} />
                      <span className="leading-snug">
                          Get the best learning experience with our premium plans.
                      </span>
                 </li>
             </ul>
          </div>

          {/* PRICING CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {subscriptionPlans.map(plan => {
                  const isSelected = selectedPlanId === plan.id;
                  const original = tierType === 'BASIC' ? plan.basicOriginalPrice : plan.ultraOriginalPrice;
                  let price = tierType === 'BASIC' ? plan.basicPrice : plan.ultraPrice;

                  // Apply Event Discount + Renewal Logic
                  let discountPercentVal = 0;

                  // 1. Base Event Discount (if active)
                  if (activeEvent) {
                      if ((isSubscribed && event?.showToPremiumUsers) || (!isSubscribed && event?.showToFreeUsers)) {
                          discountPercentVal += (event?.discountPercent || 0);
                      }
                  }

                  // 2. Renewal Bonus (5% Extra for active Premium users)
                  if (user.isPremium) {
                      discountPercentVal += 5;
                  }

                  // 3. PERSONAL STORE DISCOUNT (Coupon)
                  if (user.storeDiscount) {
                      discountPercentVal += user.storeDiscount;
                  }

                  // Apply Total Discount
                  if (discountPercentVal > 0) {
                      if (discountPercentVal > 100) discountPercentVal = 100;
                      price = Math.round(price * (1 - discountPercentVal / 100));
                  }

                  const isYearly = plan.name.includes('Yearly');

                  // Check if renewal bonus is active for this user (Used for UI Badge only)
                  const hasRenewalBonus = user.isPremium;

                  return (
                      <button
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`p-5 rounded-2xl border text-left transition-all relative group flex flex-col justify-between h-32 ${
                              isSelected 
                                ? 'bg-[#18181b] border-cyan-500 shadow-[0_0_0_1px_rgba(6,182,212,1)]' 
                                : 'bg-[#0f0f11] border-slate-800 hover:border-slate-700'
                          }`}
                      >
                          {isSelected && (
                              <div className="absolute -top-2 -right-2 bg-cyan-500 text-black rounded-full p-1 shadow-lg">
                                  <Check size={12} strokeWidth={4} />
                              </div>
                          )}
                          
                          {/* Top Part */}
                          <div className="w-full flex justify-between items-start">
                              <span className={`font-bold text-sm ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                                  {plan.name}
                              </span>
                              {discountPercentVal > 0 && (
                                  <div className="flex flex-col items-end">
                                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                                          {discountPercentVal}% OFF
                                      </span>
                                      {hasRenewalBonus && discountPercentVal >= 5 && (
                                          <span className="text-[8px] text-cyan-300 font-bold mt-0.5">
                                              (+5% Premium Bonus)
                                          </span>
                                      )}
                                  </div>
                              )}
                          </div>

                          {/* Bottom Part */}
                          <div>
                              <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-600 line-through mb-0.5">₹{original.toLocaleString('en-IN')}</span>
                                  <span className="text-xl font-serif text-white">₹{price.toLocaleString('en-IN')}.00</span>
                              </div>
                          </div>
                      </button>
                  );
              })}
              
          </div>

          {/* ACTION BUTTON */}
          <button
                 onClick={() => {
                     if (!selectedPlan) return;
                     // Calculate Final Price again to pass to Modal
                     let finalPrice = tierType === 'BASIC' ? selectedPlan.basicPrice : selectedPlan.ultraPrice;
                     let discountPercentVal = 0;
                     if (activeEvent) {
                         if ((isSubscribed && event?.showToPremiumUsers) || (!isSubscribed && event?.showToFreeUsers)) {
                             discountPercentVal += (event?.discountPercent || 0);
                         }
                     }
                     if (user.isPremium) {
                         discountPercentVal += 5;
                     }
                     if (user.storeDiscount) {
                         discountPercentVal += user.storeDiscount;
                     }
                     if (discountPercentVal > 0) {
                         if (discountPercentVal > 100) discountPercentVal = 100;
                         finalPrice = Math.round(finalPrice * (1 - discountPercentVal / 100));
                     }

                     if (settings?.creditFreeEvent?.enabled) {
                         finalPrice = 0;
                     }

                     // Pass 'finalPrice' explicitly
                     initiatePurchase({ ...selectedPlan, finalPrice: finalPrice });
                 }}
                 className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group ${
                     tierType === 'BASIC' 
                        ? 'bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500 text-white shadow-cyan-500/30' 
                        : 'bg-gradient-to-r from-slate-100 via-white to-slate-100 text-black shadow-white/10'
                 }`}
             >
                 <span className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12 pointer-events-none"></span>
                 <span className="relative flex items-center justify-center gap-2">
                     <Sparkles size={14} className={tierType === 'BASIC' ? 'text-white' : 'text-sky-500'} />
                     Get {tierType === 'BASIC' ? 'Pro' : 'Max'} — Unlock Now
                 </span>
          </button>


          {/* COIN STORE (Minimalist) */}
          <div className="mt-16 border-t border-slate-900 pt-8">
              <div className="flex items-center justify-between mb-6">
                  <span className="text-slate-500 font-serif text-lg">Top-up Coins</span>
                  <Zap size={20} className="text-amber-500" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                  {packages.slice(0, 6).map(pkg => {
                      let finalPrice = pkg.price;
                      // Apply Discount Logic to Credits too if applicable
                      let creditDiscount = 0;
                      if (activeEvent) {
                          if ((isSubscribed && event?.showToPremiumUsers) || (!isSubscribed && event?.showToFreeUsers)) {
                              creditDiscount += (event?.discountPercent || 0);
                          }
                      }
                      // Renewal Bonus for Credits too? (Usually implies Subscription, but let's keep consistent if they are "Subscription User")
                      if (user.isPremium || (user.subscriptionHistory && user.subscriptionHistory.length > 0)) {
                          creditDiscount += 5;
                      }

                      if (user.storeDiscount) {
                          creditDiscount += user.storeDiscount;
                      }

                      if (creditDiscount > 0) {
                          if (creditDiscount > 100) creditDiscount = 100;
                          finalPrice = Math.round(pkg.price * (1 - creditDiscount / 100));
                      }

                      // --- EXTRA CREDIT BONUS LOGIC ---
                      let extraCredits = 0;
                      // Check for "coinPurchaseBonus" setting
                      // We need to access a new setting field. Assuming settings object has it or we inject it via types.
                      // Since I can't change types.ts right now without a restart, I'll check 'settings.coinPurchaseBonus' loosely
                      const bonusConfig = (settings as any)?.coinPurchaseBonus;
                      if (bonusConfig?.active && pkg.price >= (bonusConfig.minAmount || 0)) {
                          extraCredits = Math.floor(pkg.credits * (bonusConfig.percent / 100));
                      }

                      return (
                          <button
                              key={pkg.id}
                              onClick={() => initiatePurchase({...pkg, price: finalPrice, credits: pkg.credits + extraCredits})} // Pass total credits
                              className="bg-slate-900 border border-slate-800 p-3 rounded-xl hover:bg-slate-800 hover:border-slate-700 transition-all text-center group relative overflow-hidden"
                          >
                              {extraCredits > 0 && (
                                  <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg">
                                      +{extraCredits} BONUS
                                  </div>
                              )}
                              <p className="text-white font-bold text-md mb-1">{pkg.credits + extraCredits}</p>
                              <p className="text-slate-600 text-[10px] uppercase font-bold">
                                  {finalPrice < pkg.price ? (
                                      <>
                                          <span className="line-through mr-1 opacity-50">₹{pkg.price}</span>
                                          <span className="text-green-400">₹{finalPrice}</span>
                                      </>
                                  ) : `₹${pkg.price}`}
                              </p>
                          </button>
                      );
                  })}
              </div>
          </div>

      </div>
    </div>
  );
};
