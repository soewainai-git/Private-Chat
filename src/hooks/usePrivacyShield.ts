import { useState, useEffect, useCallback } from 'react';

export interface PrivacyShieldState {
  isVeiled: boolean;
  warningMessage: string | null;
  privacyShieldEnabled: boolean;
  setPrivacyShieldEnabled: (enabled: boolean) => void;
  triggerPrivacyAlert: (msg: string) => void;
}

export function usePrivacyShield(autoVeilOnBlur: boolean = true): PrivacyShieldState {
  const [isVeiled, setIsVeiled] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [privacyShieldEnabled, setPrivacyShieldEnabled] = useState(true);

  const triggerPrivacyAlert = useCallback((msg: string) => {
    setWarningMessage(msg);
    setIsVeiled(true);
    setTimeout(() => {
      setIsVeiled(false);
      setWarningMessage(null);
    }, 2500);
  }, []);

  useEffect(() => {
    if (!privacyShieldEnabled) return;

    // 1. Intercept shortcut keys for screenshots and printing
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch {}
        triggerPrivacyAlert('Tangkapan layar diblokir demi keamanan & privasi.');
        return;
      }

      // Windows Snipping Tool (Meta + Shift + S) or Mac Screenshot (Meta + Shift + 3/4/5)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        triggerPrivacyAlert('Tangkapan layar dinonaktifkan.');
        return;
      }

      // Prevent Print (Ctrl + P / Meta + P)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        triggerPrivacyAlert('Mencetak halaman dinonaktifkan.');
        return;
      }

      // Prevent Save Page (Ctrl + S / Meta + S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
        e.preventDefault();
        return;
      }
    };

    // 2. Prevent right click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. Screen veil when window loses focus (e.g. app switcher, screen capture tools)
    const handleVisibilityChange = () => {
      if (document.hidden && autoVeilOnBlur) {
        setIsVeiled(true);
      } else {
        // slight delay on return so snapshot isn't taken
        setTimeout(() => setIsVeiled(false), 300);
      }
    };

    const handleWindowBlur = () => {
      if (autoVeilOnBlur) {
        setIsVeiled(true);
      }
    };

    const handleWindowFocus = () => {
      setTimeout(() => setIsVeiled(false), 200);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [privacyShieldEnabled, autoVeilOnBlur, triggerPrivacyAlert]);

  return {
    isVeiled,
    warningMessage,
    privacyShieldEnabled,
    setPrivacyShieldEnabled,
    triggerPrivacyAlert,
  };
}
