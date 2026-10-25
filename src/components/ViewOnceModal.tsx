import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { UserIdentity } from '../types/chat';

interface Props {
  photoUrl: string;
  viewerIdentity: UserIdentity;
  onCloseAndBurn: () => void;
  triggerPrivacyAlert?: (msg: string) => void;
}

export const ViewOnceModal: React.FC<Props> = ({
  photoUrl,
  viewerIdentity,
  onCloseAndBurn,
  triggerPrivacyAlert,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Gesture handling refs
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDist = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const panStart = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const lastTapTime = useRef<number>(0);

  // Automatically close and burn photo if window is blurred or screenshot attempted
  useEffect(() => {
    const handleBlur = () => {
      onCloseAndBurn();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        onCloseAndBurn();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S'))
      ) {
        triggerPrivacyAlert?.('Tangkapan layar dicegah. Foto sekali-lihat ditutup demi keamanan.');
        onCloseAndBurn();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onCloseAndBurn, triggerPrivacyAlert]);

  // Pointer event handlers for pinch-to-zoom and drag
  const handlePointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialScale.current = scale;
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && initialPinchDist.current > 0) {
      const pts = Array.from(pointers.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / initialPinchDist.current;
      const nextScale = Math.min(4, Math.max(1, initialScale.current * ratio));
      setScale(nextScale);
      if (nextScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (pointers.current.size === 1 && scale > 1 && panStart.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPosition({
        x: panStart.current.posX + dx,
        y: panStart.current.posY + dy,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      initialPinchDist.current = 0;
    }
    if (pointers.current.size === 0) {
      panStart.current = null;
    }

    // Double tap handling
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (scale > 1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(2.5);
        setPosition({ x: 0, y: 0 });
      }
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center select-none overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Top Header bar with Close Button and Privacy Shield watermark */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
          <span className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold">
            1
          </span>
          <span>Foto Sekali Lihat</span>
        </div>

        <button
          onClick={onCloseAndBurn}
          aria-label="Tutup dan hapus foto"
          className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-100 flex items-center justify-center cursor-pointer transition-colors active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image with Zoom and Pan */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <img
          ref={imgRef}
          src={photoUrl}
          alt="Foto sekali lihat"
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: pointers.current.size === 0 ? 'transform 0.15s ease-out' : 'none',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
          className="select-none"
        />

        {/* Dynamic Security Watermark to discourage external capture */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-around opacity-15 rotate-[-25deg] select-none text-[11px] font-mono text-slate-400">
          <span>RAHASIA • SOE &amp; HARU • SEKALI LIHAT</span>
          <span>DIBUKA OLEH: {viewerIdentity.toUpperCase()} • PRIVASI</span>
          <span>RAHASIA • SOE &amp; HARU • SEKALI LIHAT</span>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-5 left-0 right-0 z-30 text-center pointer-events-none">
        <p className="text-[11px] text-slate-400 bg-black/60 backdrop-blur px-3 py-1 rounded-full inline-block">
          Ketuk dua kali untuk memperbesar • Foto akan langsung terhapus saat ditutup
        </p>
      </div>
    </div>
  );
};
