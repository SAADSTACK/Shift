
import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Challenge your thinking..."
        disabled={disabled}
        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-white transition-all disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="w-14 h-14 shift-gradient rounded-2xl flex items-center justify-center text-white disabled:opacity-30 disabled:grayscale transition-all hover:scale-105 active:scale-95 shadow-xl glow"
      >
        <i className="fa-solid fa-arrow-up text-lg"></i>
      </button>
    </form>
  );
};

export default ChatInput;
