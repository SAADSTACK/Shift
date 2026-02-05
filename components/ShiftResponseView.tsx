
import React, { useState } from 'react';
import { ShiftResponse } from '../types';
import { generateSpeech } from '../geminiService';

interface ShiftResponseViewProps {
  response: ShiftResponse;
}

const ShiftResponseView: React.FC<ShiftResponseViewProps> = ({ response }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleSpeak = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const summary = `What you might be missing: ${response.missing}. Alternative view: ${response.differentWay}.`;
      const buffer = await generateSpeech(summary);
      if (buffer) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlaying(false);
        source.start();
      } else {
        setIsPlaying(false);
      }
    } catch (e) {
      console.error(e);
      setIsPlaying(false);
    }
  };

  const isExtractionFailed = (text: string) => 
    text.includes("Review raw output") || text.includes("Information extraction failed");

  return (
    <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-700">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.3em] mono">Cognitive Breakdown</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowRaw(!showRaw)}
            className="px-3 py-1 rounded-full text-[10px] mono font-bold border text-neutral-500 border-white/10 hover:border-white/20 transition-all"
          >
            {showRaw ? 'HIDE RAW' : 'VIEW RAW'}
          </button>
          <button 
            onClick={handleSpeak}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] mono font-bold border transition-all ${
              isPlaying ? 'bg-blue-500 text-white border-blue-500 animate-pulse' : 'text-neutral-500 border-white/10 hover:border-white/20'
            }`}
          >
            <i className={`fa-solid ${isPlaying ? 'fa-volume-high' : 'fa-play'}`}></i>
            {isPlaying ? 'READING...' : 'SPEAK ANALYSIS'}
          </button>
        </div>
      </div>

      {showRaw ? (
        <div className="glass p-6 rounded-3xl border border-white/10 text-neutral-300 text-sm mono whitespace-pre-wrap leading-relaxed">
          {response.rawText}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Missing Piece */}
          <div className={`glass p-6 rounded-3xl border-l-4 border-blue-500 hover:bg-white/5 transition-colors ${isExtractionFailed(response.missing) ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🧠</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mono">What you might be missing</h3>
            </div>
            <p className="text-neutral-200 leading-relaxed font-medium">
              {response.missing}
            </p>
          </div>

          {/* Reframing */}
          <div className={`glass p-6 rounded-3xl border-l-4 border-purple-500 hover:bg-white/5 transition-colors ${isExtractionFailed(response.differentWay) ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🔍</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mono">A different way to see this</h3>
            </div>
            <p className="text-neutral-200 leading-relaxed italic">
              {response.differentWay}
            </p>
          </div>

          {/* Long Term */}
          <div className={`glass p-6 rounded-3xl border-l-4 border-orange-500 hover:bg-white/5 transition-colors ${isExtractionFailed(response.longTerm) ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">⏳</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-orange-400 mono">Long-term consequence</h3>
            </div>
            <p className="text-neutral-200 leading-relaxed">
              {response.longTerm}
            </p>
          </div>

          {/* Next Step */}
          <div className={`glass p-6 rounded-3xl border-l-4 border-emerald-500 hover:bg-white/5 transition-colors ${isExtractionFailed(response.nextStep) ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">✅</span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 mono">Smart next step</h3>
            </div>
            <p className="text-neutral-200 leading-relaxed">
              {response.nextStep}
            </p>
          </div>
        </div>
      )}

      {response.groundingUrls && response.groundingUrls.length > 0 && (
        <div className="glass p-4 rounded-2xl border border-white/10 space-y-3">
          <h4 className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mono">Grounding Sources</h4>
          <div className="flex flex-wrap gap-2">
            {response.groundingUrls.map((url, i) => (
              <a 
                key={i} 
                href={url.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/30 text-xs text-neutral-400 hover:text-white transition-all"
              >
                <i className="fa-solid fa-link text-[10px]"></i>
                <span className="truncate max-w-[150px]">{url.title || "Source"}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftResponseView;
