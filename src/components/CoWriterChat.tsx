/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RefreshCw, MessageSquare, BookOpen, User } from "lucide-react";
import { ChatMessage } from "../types";

interface CoWriterChatProps {
  storyTitle: string;
  storySummary: string;
}

export default function CoWriterChat({ storyTitle, storySummary }: CoWriterChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: `Hello! I am your Gemini Literary Co-writer. I am listening to your creative progress on **"${storyTitle}"**. Ask me to brainstorm a dynamic plot twist, critique your pacing, design some sensory symbolism, or debate character choices anytime.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const targetMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const resp = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: targetMessages,
          storyContext: { title: storyTitle, summary: storySummary },
        }),
      });

      if (!resp.ok) {
        throw new Error("Co-writer went silent.");
      }

      const data = await resp.json();
      const assistantMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        content: data.text || "I apologize, my creative flow stalled temporarily.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: "I seem to be disconnected from our shared universe. Let's try that brainstorm prompt again when the line is clear.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="bg-[#fcfcf9] rounded-2xl border border-[#e5e5df] p-4 flex flex-col h-[600px] shadow-sm">
      {/* Dynamic Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[#efeee8] shrink-0 mb-3 ml-1">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
        <div>
          <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">
            Gemini Intuition Chat
          </h4>
          <p className="text-[10px] text-[#88887e] font-sans truncate max-w-[210px]">
            Synthesizing arcs for: {storyTitle}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-1 pb-2">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  isUser
                    ? "bg-[#5A5A40] text-white rounded-br-none"
                    : "bg-[#f5f5f0] text-[#33332d] rounded-bl-none border border-[#ecece4]"
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold text-[#5A5A40] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Co-writer
                  </div>
                )}
                <p className="whitespace-pre-line font-sans">{m.content}</p>
              </div>
              <span className="text-[9px] text-[#a1a19a] font-sans mt-1 px-1">{m.timestamp}</span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start">
            <div className="bg-[#f5f5f0] border border-[#ecece4] rounded-2xl rounded-bl-none p-3 max-w-[85%] animate-pulse">
              <div className="flex items-center gap-1.5 mb-1.5 text-[9px] font-bold text-[#5A5A40] uppercase tracking-wider">
                <RefreshCw className="w-3 h-3 animate-spin" /> Co-writer drafting...
              </div>
              <div className="h-2 w-32 bg-[#dcdcd4] rounded mb-1"></div>
              <div className="h-2 w-20 bg-[#dcdcd4] rounded"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="pt-3 border-t border-[#efeee8] flex items-center gap-1.5 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask about character arcs, twists..."
          className="flex-1 text-xs font-sans rounded-xl border border-[#d5d5cd] bg-white p-2.5 text-[#33332d] placeholder-[#a1a19a] focus:outline-none focus:border-[#5A5A40] transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2.5 bg-[#5A5A40] text-white disabled:bg-[#a1a19a] rounded-xl hover:bg-[#4a4a35] transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
