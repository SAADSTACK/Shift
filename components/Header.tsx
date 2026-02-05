
import React, { useMemo } from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode }) => {
  const sessionId = useMemo(() => {
    return `CX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }, []);

  return (
    <header className="px-6 py-4 border-b border-white/5 glass flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 shift-gradient rounded-lg flex items-center justify-center shadow-lg">
          <i className="fa-solid fa-bolt-lightning text-white text-sm"></i>
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tighter text-white uppercase mono leading-none">SHIFT</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="hidden md:inline px-1 py-0.5 rounded text-[8px] bg-neutral-800 text-neutral-500 font-bold tracking-widest uppercase">
              COGNITIVE CO-PILOT
            </span>
            <span className="text-[8px] text-blue-500 font-bold mono bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              {sessionId}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex bg-neutral-900/50 p-1 rounded-xl border border-white/5 shadow-inner">
          <button
            onClick={() => setMode(AppMode.TEXT)}
            className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-lg text-sm transition-all duration-300 ${
              mode === AppMode.TEXT ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <i className="fa-solid fa-message-dots text-xs"></i>
            <span className="hidden sm:inline font-medium">Text</span>
          </button>
          <button
            onClick={() => setMode(AppMode.VOICE)}
            className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-lg text-sm transition-all duration-300 ${
              mode === AppMode.VOICE ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <i className="fa-solid fa-microphone text-xs"></i>
            <span className="hidden sm:inline font-medium">Voice</span>
          </button>
        </div>
        <div className="flex items-center gap-2 pl-3 md:pl-6 border-l border-white/10">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-neutral-500 font-medium">AUTHORIZED</span>
            <span className="text-[10px] text-emerald-500 font-bold mono">ACTIVE</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer transition-all hover:bg-neutral-700">
            <i className="fa-solid fa-fingerprint text-sm"></i>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
