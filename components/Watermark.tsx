import React from 'react';
import { User, SystemSettings } from '../types';

interface Props {
  user: User | null;
  settings?: SystemSettings;
}

export const Watermark: React.FC<Props> = ({ user, settings }) => {
  if (!settings) return null;
  if (settings.isWatermarkEnabled === false) return null; // Global Toggle

  const opacity = 0.05;
  const size = settings.watermarkSize ?? 150;
  const angle = settings.watermarkAngle ?? -10;
  const logo = settings.appLogo || 'https://via.placeholder.com/150?text=App+Logo';
  const showUser = settings.showUserWatermark ?? true;
  const position = settings.watermarkPosition || { top: '50%', left: '50%' };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none" style={{ zIndex: 0 }}>
      {/* 1. CENTRAL LOGO WATERMARK */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
        style={{
            top: position.top,
            left: position.left,
            opacity: opacity,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`
        }}
      >
        <img
            src={logo}
            alt=""
            style={{ width: `${size}px`, height: 'auto' }}
            className="grayscale contrast-50"
        />

        {/* PREMIUM USER WATERMARK */}
        {showUser && user && (
            <div className="mt-4 text-center">
                <p className="font-black uppercase tracking-widest text-slate-900" style={{ fontSize: `${Math.max(12, size/10)}px` }}>
                    {user.name}
                </p>
                <p className="font-mono text-slate-700" style={{ fontSize: `${Math.max(10, size/12)}px` }}>
                    {user.displayId || user.id}
                </p>
            </div>
        )}
      </div>

      {/* 2. TILED BACKGROUND PATTERN (OPTIONAL - FOR PREMIUM FEEL) */}
      {user?.isPremium && (
          <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `url(${logo})`,
              backgroundSize: '100px',
              backgroundRepeat: 'repeat',
              filter: 'grayscale(100%)'
          }}></div>
      )}
    </div>
  );
};
