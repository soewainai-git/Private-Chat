import React, { useState, useRef } from 'react';
import { X, Camera, Check, Upload, User, Sparkles } from 'lucide-react';
import { UserIdentity } from '../types/chat';
import { uploadAvatar } from '../services/chatService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserIdentity;
  partnerName: UserIdentity;
  partnerIsOnline: boolean;
  partnerLastSeen: string | null;
  soeAvatarUrl: string;
  haruAvatarUrl: string;
  onAvatarUpdated: (identity: UserIdentity, newUrl: string) => void;
  formatTime: (iso: string) => string;
}

export const ProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  partnerName,
  partnerIsOnline,
  partnerLastSeen,
  soeAvatarUrl,
  haruAvatarUrl,
  onAvatarUpdated,
  formatTime,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<UserIdentity>(partnerName);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentDisplayedUrl = selectedTarget === 'Soe' ? soeAvatarUrl : haruAvatarUrl;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploading(true);
    setUploadSuccess(false);
    setErrorMessage('');

    try {
      // Compress image client-side to ensure smooth performance (< 800px)
      const compressedBlob = await compressImage(file, 800, 800, 0.85);
      const uploadedUrl = await uploadAvatar(selectedTarget, compressedBlob);

      if (uploadedUrl) {
        onAvatarUpdated(selectedTarget, uploadedUrl);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setErrorMessage('Gagal mengunggah foto. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error processing photo:', err);
      setErrorMessage('Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center relative text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold tracking-wide text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Profil & Foto Asli</span>
        </div>

        {/* Target Switcher (Soe / Haru) */}
        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800 mb-5 w-full max-w-[260px]">
          <button
            type="button"
            onClick={() => {
              setSelectedTarget('Soe');
              setUploadSuccess(false);
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              selectedTarget === 'Soe'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Foto Soe {currentUser === 'Soe' ? '(Saya)' : '(Partner)'}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedTarget('Haru');
              setUploadSuccess(false);
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              selectedTarget === 'Haru'
                ? 'bg-rose-400 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Foto Haru {currentUser === 'Haru' ? '(Saya)' : '(Partner)'}
          </button>
        </div>

        {/* Large Profile Picture View */}
        <div className="relative mb-4 group">
          <div className="w-32 h-32 rounded-3xl overflow-hidden border-3 border-slate-700/80 shadow-lg bg-slate-950 flex items-center justify-center">
            {currentDisplayedUrl ? (
              <img
                src={currentDisplayedUrl}
                alt={selectedTarget}
                className="w-full h-full object-cover"
                onError={e => {
                  // Fallback to initials if image link 404s
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}

            {/* Cute Soft Initial Avatar fallback if no image */}
            <div
              className={`w-full h-full flex flex-col items-center justify-center font-bold text-3xl select-none ${
                selectedTarget === 'Soe'
                  ? 'bg-linear-to-br from-sky-500 to-indigo-600 text-white'
                  : 'bg-linear-to-br from-rose-400 to-amber-300 text-white'
              }`}
              style={{ display: currentDisplayedUrl ? 'none' : 'flex' }}
            >
              <span>{selectedTarget[0]}</span>
              <span className="text-[10px] font-normal tracking-wide opacity-80 mt-1">
                {selectedTarget}
              </span>
            </div>
          </div>

          {/* Quick Upload Button on photo */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-white shadow-md flex items-center justify-center cursor-pointer transition-all border-2 border-slate-900"
            title="Pilih foto asli dari galeri HP"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Name and Status */}
        <div className="text-center mb-4">
          <h3 className="text-base font-bold text-white tracking-tight">
            {selectedTarget}
          </h3>
          {selectedTarget === partnerName ? (
            <p className="text-xs text-slate-400 mt-0.5">
              {partnerIsOnline ? (
                <span className="text-emerald-400 font-medium">Sedang Online</span>
              ) : partnerLastSeen ? (
                <span>Terakhir dilihat {formatTime(partnerLastSeen)}</span>
              ) : (
                <span>Offline</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">Akun Anda</p>
          )}
        </div>

        {/* Upload Status / Error feedback */}
        {uploadSuccess && (
          <div className="w-full mb-3 py-1.5 px-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs text-center flex items-center justify-center gap-1.5 animate-fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Foto profil asli berhasil diperbarui!</span>
          </div>
        )}

        {errorMessage && (
          <div className="w-full mb-3 py-1.5 px-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs text-center animate-fade-in">
            {errorMessage}
          </div>
        )}

        {/* Action Button: Upload Real Photo from Phone */}
        <div className="w-full flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-2.5 px-4 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-98 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>
              {isUploading
                ? 'Mengunggah foto asli...'
                : `Unggah Foto Asli ${selectedTarget} dari Galeri`}
            </span>
          </button>

          <p className="text-[10px] text-slate-500 text-center px-2 mt-1">
            Foto disimpan aman dan privat di server penyimpanan pribadi kalian.
          </p>
        </div>
      </div>
    </div>
  );
};

// Client-side lightweight image compressor
function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
