import React, { useState } from 'react';
import { Database, Copy, Check, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  SQL_SCHEMA_SINGLE_PROJECT,
  EXISTING_PROJECT_URL,
  EXISTING_PROJECT_KEY
} from '../services/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const DatabaseSettingsModal: React.FC<Props> = ({ isOpen, onClose, onConfigSaved }) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [tableName, setTableName] = useState(currentConfig.tableName || 'comments_soe_haru');
  const [copiedSql, setCopiedSql] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMsg({ type: 'error', text: 'URL dan Anon Key wajib diisi.' });
      return;
    }

    if (!url.startsWith('https://')) {
      setStatusMsg({ type: 'error', text: 'URL Supabase harus diawali dengan https://' });
      return;
    }

    saveSupabaseConfig(url, anonKey, tableName);
    setStatusMsg({ type: 'success', text: 'Pengaturan database berhasil disimpan!' });
    setTimeout(() => {
      onConfigSaved?.();
      onClose();
    }, 1200);
  };

  const handleUseExistingProject = () => {
    setUrl(EXISTING_PROJECT_URL);
    setAnonKey(EXISTING_PROJECT_KEY);
    setTableName('comments_soe_haru');
    saveSupabaseConfig(EXISTING_PROJECT_URL, EXISTING_PROJECT_KEY, 'comments_soe_haru');
    setStatusMsg({
      type: 'success',
      text: 'Menggunakan 1 project Supabase dengan tabel terpisah (comments_soe_haru)!'
    });
    setTimeout(() => {
      onConfigSaved?.();
    }, 1200);
  };

  const handleReset = () => {
    saveSupabaseConfig('', '', 'comments_soe_haru');
    setUrl('');
    setAnonKey('');
    setTableName('comments_soe_haru');
    setStatusMsg({ type: 'success', text: 'Database direset ke mode offline lokal.' });
    setTimeout(() => {
      onConfigSaved?.();
    }, 1000);
  };

  const handleCopySql = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(SQL_SCHEMA_SINGLE_PROJECT);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#0f141f] border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-100 tracking-tight">
              Koneksi 1 Project Supabase
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 1-Click Setup for 1 Project */}
        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/50 space-y-2">
          <div className="flex items-center gap-1.5 text-blue-300 font-medium text-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Pakai 1 Project yang Sudah Ada</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            Kamu tidak perlu buat project baru. Di project yang sama, kita buatkan tabel terpisah khusus (<strong>comments_soe_haru</strong>) agar chat Soe &amp; Haru tidak bercampur dengan Peafowl.
          </p>
          <button
            type="button"
            onClick={handleUseExistingProject}
            className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            Terapkan Project Ini Otomatis
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">
              Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://xyzabcdefg.supabase.co"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">
              Anon Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1Ni..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-xs text-slate-200 placeholder-slate-600 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-medium text-slate-400 mb-1">
              Nama Tabel (Untuk 1 Project)
            </label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="comments_soe_haru"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-blue-500 text-xs text-slate-200 outline-none font-mono text-[11px]"
            />
          </div>

          {statusMsg && (
            <div
              className={`p-2 rounded-lg text-[11px] ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer border border-slate-700"
            >
              Simpan Pengaturan
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs transition-colors cursor-pointer border border-slate-800"
            >
              Reset
            </button>
          </div>
        </form>

        {/* Copy SQL Schema */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <p className="text-[11px] font-medium text-slate-300">
            Jalankan Skrip Tabel di SQL Editor Supabase:
          </p>
          <button
            type="button"
            onClick={handleCopySql}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSql ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Skrip SQL Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Salin Skrip SQL 1-Project</span>
              </>
            )}
          </button>
          <p className="text-[9px] text-slate-500 text-center leading-relaxed">
            Buka SQL Editor di dashboard Supabase kamu, paste skrip di atas, lalu klik <strong>Run</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
