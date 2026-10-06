import React, { useState } from 'react';
import { UserIdentity } from './types/chat';
import { DesktopGuard } from './components/DesktopGuard';
import { PinGate } from './components/PinGate';
import { ChatRoom } from './components/ChatRoom';
import { usePrivacyShield } from './hooks/usePrivacyShield';
import { PrivacyShieldOverlay } from './components/PrivacyShieldOverlay';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { SkyBackground, SkyTheme } from './components/SkyBackground';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(() => {
    return (sessionStorage.getItem('soe_haru_active_user') as UserIdentity) || null;
  });

  const [skyTheme, setSkyTheme] = useState<SkyTheme>(() => {
    return (localStorage.getItem('soe_haru_sky_theme') as SkyTheme) || 'auto';
  });

  const handleSkyThemeChange = (newTheme: SkyTheme) => {
    setSkyTheme(newTheme);
    localStorage.setItem('soe_haru_sky_theme', newTheme);
  };

  // Anti-Screenshot & Privacy Shield Hook
  const {
    isVeiled,
    warningMessage,
    triggerPrivacyAlert,
  } = usePrivacyShield(true);

  const handleUnlock = (identity: UserIdentity) => {
    setCurrentUser(identity);
    sessionStorage.setItem('soe_haru_active_user', identity);
  };

  const handleLock = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('soe_haru_active_user');
  };

  return (
    <DesktopGuard>
      <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] text-slate-100 flex flex-col overflow-hidden select-none bg-transparent">
        {/* Dynamic Day/Night Living Sky Atmosphere */}
        <SkyBackground currentTheme={skyTheme} />

        {/* Anti-Screenshot Privacy Overlay */}
        <PrivacyShieldOverlay
          isVeiled={isVeiled}
          warningMessage={warningMessage}
        />

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {currentUser ? (
          <ChatRoom
            currentUser={currentUser}
            onLock={handleLock}
            triggerPrivacyAlert={triggerPrivacyAlert}
            skyTheme={skyTheme}
            onSkyThemeChange={handleSkyThemeChange}
          />
        ) : (
          <PinGate
            onUnlock={handleUnlock}
          />
        )}
      </div>
    </DesktopGuard>
  );
}
