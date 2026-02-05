
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { LIVE_MODEL, SYSTEM_INSTRUCTION } from '../constants';
import { decodeAudioData, encode, decode } from '../geminiService';

interface VoiceInterfaceProps {
  onTranscription: (text: string) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onTranscription }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const aiRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
  }, []);

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startVoice = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      aiRef.current = ai;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const analyzer = inputAudioContext.createAnalyser();
            analyzer.fftSize = 256;
            analyzerRef.current = analyzer;
            source.connect(analyzer);

            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);

            const updateVolume = () => {
              const dataArray = new Uint8Array(analyzer.frequencyBinCount);
              analyzer.getByteFrequencyData(dataArray);
              const sum = dataArray.reduce((a, b) => a + b, 0);
              const avg = sum / dataArray.length;
              setVolume(avg);
              animationFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.inputTranscription) {
              // We could show live transcription if needed
            }

            if (message.serverContent?.turnComplete) {
              // Optionally handle turn completion
            }
          },
          onerror: (e) => {
            console.error("Live Error:", e);
            cleanup();
          },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Voice initialization failed:", err);
      cleanup();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-4 space-y-4">
      <div className="relative">
        {isActive && (
          <div 
            className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" 
            style={{ transform: `scale(${1 + volume / 100})`, opacity: volume / 150 }}
          />
        )}
        <button
          onClick={isActive ? cleanup : startVoice}
          disabled={isConnecting}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl z-10 relative ${
            isActive ? 'bg-red-500/20 text-red-500 border-2 border-red-500/50' : 'shift-gradient text-white glow'
          }`}
        >
          {isConnecting ? (
            <i className="fa-solid fa-spinner-third animate-spin text-2xl"></i>
          ) : isActive ? (
            <i className="fa-solid fa-square text-2xl"></i>
          ) : (
            <i className="fa-solid fa-microphone text-2xl"></i>
          )}
        </button>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-neutral-400 mono">
          {isConnecting ? 'ESTABLISHING LINK...' : isActive ? 'SHIFT IS LISTENING' : 'VOICE CO-PILOT'}
        </p>
        <p className="text-xs text-neutral-600 mt-1 italic">
          {isActive ? 'Speak naturally. SHIFT will interrupt to challenge you.' : 'Tap to start real-time cognitive reasoning.'}
        </p>
      </div>
    </div>
  );
};

export default VoiceInterface;
