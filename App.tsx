
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, AppMode, ShiftResponse } from './types';
import { sendTextMessage, editImage } from './geminiService';
import Header from './components/Header';
import ChatInput from './components/ChatInput';
import ShiftResponseView from './components/ShiftResponseView';
import VoiceInterface from './components/VoiceInterface';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.TEXT);
  const [isTyping, setIsTyping] = useState(false);
  const [groundingMode, setGroundingMode] = useState<'none' | 'search' | 'maps'>('none');
  const [selectedImage, setSelectedImage] = useState<{ base64: string; mimeType: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() && !selectedImage) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      imageUrl: selectedImage?.base64 ? `data:${selectedImage.mimeType};base64,${selectedImage.base64}` : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY_MISSING");
      }

      if (selectedImage && text.trim()) {
        const editedUrl = await editImage(text, selectedImage.base64, selectedImage.mimeType);
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "Image manipulation protocol complete. Here is the reframed reality.",
          timestamp: Date.now(),
          editedImageUrl: editedUrl || undefined
        };
        setMessages(prev => [...prev, assistantMsg]);
        setSelectedImage(null);
      } else {
        const result = await sendTextMessage(text, groundingMode === 'search', groundingMode === 'maps');
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.rawText,
          timestamp: Date.now(),
          parsedResponse: result,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error: any) {
      console.error("SHIFT Failure:", error);
      let errorText = "I encountered a cognitive blockage. Verify your connection and grounding parameters.";
      
      if (error.message === "API_KEY_MISSING") {
        errorText = "SYSTEM ERROR: API Key is not configured in the environment. Please add it to your project settings.";
      } else if (error.message?.includes("403") || error.message?.includes("permission")) {
        errorText = "ACCESS DENIED: The API key provided does not have permissions for this model or task.";
      } else if (error.message?.includes("404") || error.message?.includes("not found")) {
        errorText = "MODEL UNAVAILABLE: The requested cognitive engine is not available in this region.";
      }

      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorText,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageSelect = (base64: string, mimeType: string) => {
    setSelectedImage({ base64, mimeType });
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-black text-neutral-200">
      <Header mode={mode} setMode={setMode} />
      
      <main className="flex-1 overflow-y-auto px-4 py-8 max-w-4xl mx-auto w-full scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full space-y-12 py-10">
            <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-top-8 duration-1000">
              <div className="w-24 h-24 shift-gradient rounded-[2rem] flex items-center justify-center glow rotate-12 hover:rotate-0 transition-transform duration-500 shadow-2xl">
                <i className="fa-solid fa-brain-circuit text-5xl text-white"></i>
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
                  Initiate <span className="text-blue-500">Shift</span>
                </h2>
                <p className="text-neutral-400 max-w-xl text-lg leading-relaxed">
                  I am your cognitive co-pilot. I use search, mapping, and visual manipulation to interrupt your biases.
                </p>
              </div>
            </div>

            <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              <div className="glass p-8 rounded-[2.5rem] border border-blue-500/20 shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] text-center space-y-6">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-400 mono">Start Reasoning</p>
                <p className="text-white text-xl font-medium leading-relaxed">
                  Try asking: <span className="italic text-blue-200">"What is the consensus on EV adoption in London vs Paris?"</span>
                </p>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => { setGroundingMode('search'); handleSendMessage("What is the current consensus on EV adoption in London vs Paris?"); }}
                    className="px-6 py-2 glass rounded-full text-xs text-blue-400 hover:text-white border border-blue-500/30 transition-all font-bold tracking-widest uppercase"
                  >
                    Search Grounding
                  </button>
                  <button 
                    onClick={() => { setGroundingMode('maps'); handleSendMessage("Find high-rated coffee shops near me that are quiet for working."); }}
                    className="px-6 py-2 glass rounded-full text-xs text-emerald-400 hover:text-white border border-emerald-500/30 transition-all font-bold tracking-widest uppercase"
                  >
                    Maps Grounding
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 pb-10">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'w-auto' : 'w-full'}`}>
                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end gap-3">
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="User input" className="w-64 h-auto rounded-3xl border border-white/10 shadow-2xl" />
                      )}
                      {msg.content && (
                        <div className="glass px-6 py-4 rounded-3xl rounded-tr-none text-neutral-100 border-white/10 shadow-lg">
                          <p className="leading-relaxed">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {msg.editedImageUrl && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-neutral-500 mono uppercase tracking-widest">Edited Output</p>
                          <img src={msg.editedImageUrl} alt="Edited result" className="w-full h-auto rounded-3xl border border-blue-500/20 shadow-2xl" />
                        </div>
                      )}
                      {msg.parsedResponse ? (
                        <ShiftResponseView response={msg.parsedResponse} />
                      ) : (
                        <div className="glass px-6 py-4 rounded-3xl rounded-tl-none border-blue-500/20 text-blue-100">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-pulse">
                <div className="glass px-6 py-4 rounded-3xl rounded-tl-none text-neutral-400 italic flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                  <span className="text-sm mono tracking-tight uppercase">SHIFT IS ANALYZING COGNITIVE PATTERNS...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <footer className="p-4 glass border-t border-white/5 space-y-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
           {/* Grounding Selector */}
           <div className="flex gap-2 text-[10px] mono uppercase font-bold tracking-widest">
            <button 
              onClick={() => setGroundingMode('none')}
              className={`px-3 py-1 rounded-md transition-all ${groundingMode === 'none' ? 'bg-white/10 text-white' : 'text-neutral-500'}`}
            >Logic Only</button>
            <button 
              onClick={() => setGroundingMode('search')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${groundingMode === 'search' ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500'}`}
            ><i className="fa-brands fa-google text-[8px]"></i> Search</button>
            <button 
              onClick={() => setGroundingMode('maps')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${groundingMode === 'maps' ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-500'}`}
            ><i className="fa-solid fa-location-dot text-[8px]"></i> Maps</button>
          </div>

          <div className="flex items-center gap-4">
            {mode === AppMode.TEXT ? (
              <div className="flex-1 flex items-center gap-2">
                <label className="cursor-pointer w-14 h-14 glass border border-white/10 rounded-2xl flex items-center justify-center text-neutral-500 hover:text-blue-400 transition-colors">
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const base64 = (reader.result as string).split(',')[1];
                          handleImageSelect(base64, file.type);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <i className={`fa-solid ${selectedImage ? 'fa-image text-blue-500' : 'fa-plus'}`}></i>
                </label>
                <ChatInput onSend={handleSendMessage} disabled={isTyping} />
              </div>
            ) : (
              <VoiceInterface onTranscription={(t) => {
                if (t.trim()) handleSendMessage(t);
              }} />
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
