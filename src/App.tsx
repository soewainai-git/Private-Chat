import React, { useState } from 'react';
import { UserIdentity } from './types/chat';
import { DesktopGuard } from './components/DesktopGuard';
import { PinGate } from './components/PinGate';
import { ChatRoom } from './components/ChatRoom';
import { usePrivacyShield } from './hooks/usePrivacyShield';
import { PrivacyShieldOverlay } from './components/PrivacyShieldOverlay';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(() => {
    return (sessionStorage.getItem('soe_haru_active_user') as UserIdentity) || null;
  });

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
      <div className="w-full h-dvh bg-[#0b0f17] text-slate-100 flex flex-col overflow-hidden relative select-none">
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
