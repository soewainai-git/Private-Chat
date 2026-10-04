import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Heart, Mail, Smile, Image as ImageIcon, Check } from 'lucide-react';

interface Props {
  onBackToSoeHaru: () => void;
}

export const VersiOriginalAnandaPeafowl: React.FC<Props> = ({ onBackToSoeHaru }) => {
  const [userIdentity, setUserIdentity] = useState<string | null>(() => sessionStorage.getItem('peafowl_userIdentity'));
  const [pinInput, setPinInput] = useState('');
  const [pinStatus, setPinStatus] = useState('');
  const [currentView, setCurrentView] = useState<'welcome' | 'chat'>('welcome');

  // Time of day mode
  const [timeMode, setTimeMode] = useState<'pagi' | 'siang' | 'sore' | 'malam'>('pagi');
  const [weatherTemp, setWeatherTemp] = useState<number>(31);
  const [weatherDesc, setWeatherDesc] = useState<string>('Sunny');

  // Chat comments
  const [comments, setComments] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [presenceText, setPresenceText] = useState('Connecting...');
  const [isBothOnline, setIsBothOnline] = useState(false);

  // Letter overlay states
  const [composeLetterOpen, setComposeLetterOpen] = useState(false);
  const [readLetterOpen, setReadLetterOpen] = useState(false);
  const [letterText, setLetterText] = useState('');
  const [activeLetter, setActiveLetter] = useState<any>(null);

  // Time mode calculation
  useEffect(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) setTimeMode('pagi');
    else if (h >= 11 && h < 15) setTimeMode('siang');
    else if (h >= 15 && h < 18) setTimeMode('sore');
    else setTimeMode('malam');

    // Weather simulation/fetch
    fetch('https://api.open-meteo.com/v1/forecast?latitude=18.9433&longitude=96.4297&current=temperature_2m,weather_code')
      .then(res => res.json())
      .then(data => {
        if (data?.current?.temperature_2m) {
          setWeatherTemp(Math.round(data.current.temperature_2m));
        }
      })
      .catch(() => {});
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '123456' || pinInput === '112233' || pinInput.length === 6) {
      const identity = pinInput.endsWith('1') || pinInput.endsWith('3') ? 'Ananda' : 'Peafowl';
      setUserIdentity(identity);
      sessionStorage.setItem('peafowl_userIdentity', identity);
      setPinStatus('');
    } else {
      setPinStatus('PIN salah. Coba 123456.');
    }
  };

  const greetings = {
    pagi: { greeting: 'Good Morning, Peafowl', subtitle: 'I hope you doing great today! ☁️', icon: '☀️' },
    siang: { greeting: 'Good Afternoon, Peafowl', subtitle: 'Dont forget take rest for a while ya, and drink lot water!', icon: '🌸' },
    sore: { greeting: 'Good Evening, Peafowl', subtitle: 'Time for relax, you almost finish your day! YAAAY!', icon: '🌇' },
    malam: { greeting: 'Good Night, Peafowl', subtitle: 'How is your day? You are doing really great today! Lets chat with me ya ♡', icon: '🌙' },
  };

  return (
    <div className={`w-full h-full flex flex-col font-sans relative overflow-hidden select-none transition-colors duration-1000 ${
      timeMode === 'malam' ? 'bg-[#5c2740] text-[#fff0f4]' : 'bg-gradient-to-b from-[#fff5f8] via-[#ffd0dd] to-[#ffb3cb] text-[#4b2b3a]'
    }`}>
      {/* Top Bar Switcher to go back to Soe & Haru */}
      <div className="flex-none p-3 flex items-center justify-between border-b border-pink-300/30 bg-white/20 backdrop-blur z-30">
        <button
          onClick={onBackToSoeHaru}
          className="text-xs px-3 py-1.5 rounded-full bg-white/70 hover:bg-white text-pink-900 font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Versi 2 (Soe &amp; Haru)</span>
        </button>
        <span className="text-[11px] font-medium opacity-80">
          Versi 1: Original Peafowl
        </span>
      </div>

      {/* Pin Gate if not authenticated */}
      {!userIdentity ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h2 className="text-xl font-serif font-bold mb-1">Enter Pin</h2>
          <p className="text-xs opacity-75 mb-6">Private Chat</p>

          <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-4">
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••••"
              className="w-full text-center text-xl tracking-[0.5em] py-3 px-4 rounded-2xl bg-white/90 text-[#4b2b3a] outline-none border border-pink-300 shadow-inner"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-gradient-to-r from-[#f27a99] to-[#d95a7d] text-white font-semibold text-sm shadow-lg shadow-pink-500/30 transition-transform active:scale-95 cursor-pointer"
            >
              Log In
            </button>
            {pinStatus && <p className="text-xs text-pink-700">{pinStatus}</p>}
            <p className="text-[11px] text-pink-800/70">
              Uji Coba Cepat: Masukkan 6 digit angka apa saja (misal: 123456)
            </p>
          </form>
        </div>
      ) : currentView === 'welcome' ? (
        /* Welcome View */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-4xl mb-3">{greetings[timeMode].icon}</div>
          <h1 className="text-2xl font-serif font-bold mb-2">
            {greetings[timeMode].greeting}
          </h1>
          <p className="text-xs opacity-85 max-w-xs mb-4 leading-relaxed">
            {greetings[timeMode].subtitle}
          </p>

          <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur px-4 py-1.5 rounded-full text-xs font-medium mb-6">
            <span>☀️ Taungoo, Myanmar {weatherTemp}°C</span>
          </div>

          <div className="space-y-3 w-full max-w-xs">
            <button
              onClick={() => setCurrentView('chat')}
              className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#f27a99] to-[#d95a7d] text-white font-semibold text-sm shadow-xl shadow-pink-500/30 transition-transform active:scale-95 cursor-pointer"
            >
              Start Chat ♥
            </button>

            {userIdentity === 'Ananda' && (
              <button
                onClick={() => setComposeLetterOpen(true)}
                className="w-full py-2.5 px-6 rounded-full border border-pink-400 bg-white/40 text-pink-800 font-semibold text-xs transition-colors hover:bg-white/60 cursor-pointer"
              >
                Send Letter ✉️
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Chat View */
        <div className="flex-1 flex flex-col overflow-hidden bg-white/30 backdrop-blur-sm">
          {/* Header */}
          <div className="flex-none p-3 border-b border-pink-200/50 flex items-center justify-between bg-white/50">
            <button
              onClick={() => setCurrentView('welcome')}
              className="text-xs px-2.5 py-1 rounded-full bg-white/80 text-pink-900 font-medium"
            >
              ‹ Kembali
            </button>
            <div className="text-center">
              <p className="text-xs font-bold text-pink-900">{userIdentity} &amp; Peafowl</p>
              <p className="text-[10px] text-pink-700">Both of you online</p>
            </div>
            <span className="text-lg">{greetings[timeMode].icon}</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <div className="text-center text-xs text-pink-800/70 py-2">
              Be first here. Peafowl and Ananda 💌
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-pink-600 mb-0.5">Ananda</span>
              <div className="bg-white/95 text-pink-900 px-3.5 py-2 rounded-2xl rounded-tr-sm shadow-sm text-xs max-w-[80%]">
                Hello beautiful, hope you are having a wonderful day! 💕
              </div>
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-pink-200/50 bg-white/80 flex items-center gap-2">
            <span className="text-pink-500">☺</span>
            <input
              type="text"
              placeholder="reply here"
              className="flex-1 bg-white/90 border border-pink-200 rounded-full px-4 py-2 text-xs text-pink-900 outline-none"
            />
            <button className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-500 text-white flex items-center justify-center text-xs shadow">
              ♥
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
