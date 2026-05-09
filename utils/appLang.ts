/**
 * Tiny global app-language store.
 *
 * Earlier each screen kept its own `lang` useState (e.g. RulesPage), so the
 * student had to flip the toggle separately on every screen. We now persist a
 * single `nst_app_lang` key in localStorage and expose:
 *   - `getAppLang()` / `setAppLang(lang)` for imperative reads/writes
 *   - `subscribeAppLang(cb)` so any component can re-render on change
 *   - `useAppLang()` React hook returning [lang, setLang]
 *   - `tApp(lang, key)` translator over a small built-in dictionary that
 *     covers settings sheet, warnings and rules surfaces.
 *
 * We deliberately DO NOT pull in a full i18n library — the translated surface
 * area is small (settings labels + rules + warnings) and a tiny dict keeps the
 * bundle small and avoids breaking existing copy.
 */

import { useEffect, useState, useCallback } from 'react';

export type AppLang = 'EN' | 'HI';

const KEY = 'nst_app_lang';

const listeners = new Set<(lang: AppLang) => void>();

export const getAppLang = (): AppLang => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'EN' ? 'EN' : 'HI'; // default Hindi
  } catch { return 'HI'; }
};

export const setAppLang = (lang: AppLang): void => {
  try { localStorage.setItem(KEY, lang); } catch {}
  listeners.forEach(cb => { try { cb(lang); } catch {} });
};

export const subscribeAppLang = (cb: (lang: AppLang) => void): (() => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

export const useAppLang = (): [AppLang, (l: AppLang) => void] => {
  const [lang, setLang] = useState<AppLang>(getAppLang);
  useEffect(() => subscribeAppLang(setLang), []);
  const update = useCallback((l: AppLang) => setAppLang(l), []);
  return [lang, update];
};

/* ─────────────────────────  DICTIONARY  ───────────────────────── */

type Dict = Record<string, { EN: string; HI: string }>;

const DICT: Dict = {
  // Settings sheet
  settings:            { EN: 'Settings',                   HI: 'सेटिंग्स' },
  language:            { EN: 'Language',                   HI: 'भाषा' },
  language_hint:       { EN: 'Switch app text & rules',    HI: 'ऐप का text और नियम बदलें' },
  english:             { EN: 'English',                    HI: 'अंग्रेज़ी' },
  hindi:               { EN: 'Hindi',                      HI: 'हिंदी' },
  light_mode_active:   { EN: 'Light Mode Active',          HI: 'लाइट मोड चालू है' },
  black_mode_active:   { EN: 'Black Mode Active',          HI: 'ब्लैक मोड चालू है' },
  blue_mode_active:    { EN: 'Blue Mode Active',           HI: 'ब्लू मोड चालू है' },
  setup_recovery:      { EN: 'Setup Recovery',             HI: 'रिकवरी सेट करें' },
  desktop_mode:        { EN: 'Desktop Mode',                HI: 'डेस्कटॉप मोड' },
  desktop_mode_hint:   { EN: 'Show wider laptop layout',    HI: 'चौड़ा laptop layout दिखाएँ' },
  rotate_screen:       { EN: 'Rotate Screen',               HI: 'स्क्रीन घुमाएँ' },
  rotate_screen_hint:  { EN: 'Switch portrait ↔ landscape', HI: 'Portrait ↔ Landscape बदलें' },
  rotate_unsupported:  { EN: 'Rotation not supported on this browser. Use your device’s rotate button.', HI: 'इस browser में rotation supported नहीं है। अपने device के rotate बटन का use करें।' },
  close:               { EN: 'Close',                      HI: 'बंद करें' },
  reading_color:       { EN: 'Reading Text Color',         HI: 'पढ़ने का text रंग' },
  recommended:         { EN: 'Recommended',                HI: 'सुझाव' },
  font_size:           { EN: 'Font Size',                  HI: 'Font साइज़' },
  // Common warnings
  warn_offline:        { EN: 'You are offline.',           HI: 'आप offline हैं।' },
  warn_low_credits:    { EN: 'Low credits. Top up to continue.', HI: 'कम क्रेडिट हैं। जारी रखने के लिए recharge करें।' },
  warn_locked:         { EN: 'Locked! Upgrade your plan or wait for Admin access.', HI: 'लॉक्ड! अपना प्लान upgrade करें या एडमिन से access maangein।' },
};

export const tApp = (lang: AppLang, key: keyof typeof DICT | string): string => {
  const entry = DICT[key as string];
  if (!entry) return key as string;
  return entry[lang] || entry.EN;
};
