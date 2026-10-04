import React, { useState } from 'react';
import { UserIdentity, AppVersion } from './types/chat';
import { DesktopGuard } from './components/DesktopGuard';
import { PinGate } from './components/PinGate';
import { ChatRoom } from './components/ChatRoom';
import { usePrivacyShield } from './hooks/usePrivacyShield';
import { PrivacyShieldOverlay } from './components/PrivacyShieldOverlay';
import { VersiOriginalAnandaPeafowl } from './components/VersiOriginalAnandaPeafowl';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  const [appVersion, setAppVersion] = useState<AppVersion>('soe_haru');
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(() => {
    return (sessionStorage.getItem('soe_haru_active_user') as UserIdentity) || null;
  });
  const [dbModalOpen, setDbModalOpen] = useState(false);

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

  const handleSwitchUser = (newUser: UserIdentity) => {
    setCurrentUser(newUser);
    sessionStorage.setItem('soe_haru_active_user', newUser);
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

        {/* Database Configuration Modal (accessible before or after login) */}
        <DatabaseSettingsModal
          isOpen={dbModalOpen}
          onClose={() => setDbModalOpen(false)}
        />

        {/* Version Switch Logic */}
        {appVersion === 'ananda_peafowl' ? (
          <VersiOriginalAnandaPeafowl
            onBackToSoeHaru={() => setAppVersion('soe_haru')}
          />
        ) : (
          /* Versi 2: SOE DAN HARU */
          currentUser ? (
            <ChatRoom
              currentUser={currentUser}
              onSwitchUser={handleSwitchUser}
              onLock={handleLock}
              triggerPrivacyAlert={triggerPrivacyAlert}
              onOpenVersionSwitcher={() => setAppVersion('ananda_peafowl')}
            />
          ) : (
            <PinGate
              onUnlock={handleUnlock}
              onOpenDbSettings={() => setDbModalOpen(true)}
            />
          )
        )}
      </div>
    </DesktopGuard>
  );
}
