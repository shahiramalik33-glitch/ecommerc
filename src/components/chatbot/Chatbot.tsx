"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { integralCF } from "@/styles/fonts";
import { cn } from "@/lib/utils";

interface ExcelProduct {
  name: string;
  category: string;
  price: number | string;
  stockStatus: string;
  description: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ExcelProduct[];
  time: string;
}

const QUICK_PROMPTS = [
  "What products are in stock?",
  "Show me T-shirts & prices",
  "Do you have skinny fit jeans?",
  "Recommend an outfit for casual wear",
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      content:
        "Hello! 👋 I'm **Shopco AI**, your personal shopping assistant. I have live access to our store's inventory and catalog from `ecomerce.xlsx`. Ask me about available styles, sizes, prices, or stock status!",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages]);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I didn't catch that. Could you try asking again?",
        products: data.suggestedProducts || [],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Chatbot error:", err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an issue connecting to the AI service. Please make sure the server is running and try again.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-2.5 bg-black hover:bg-neutral-800 text-white px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 border border-neutral-700 group"
          aria-label="Open Shopco AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full" />
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            Shopco AI
          </span>
        </motion.button>
      </div>

      {/* Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[94vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-neutral-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-sm font-bold tracking-wide", integralCF.className)}>
                      SHOPCO AI
                    </h3>
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
                      Gemini
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                    <span>Live Catalog Connected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors"
                  aria-label="Minimize Chat"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-colors"
                  aria-label="Close Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Data Badge */}
            <div className="bg-neutral-100 text-neutral-600 px-3.5 py-1.5 text-[11px] flex items-center justify-between border-b border-neutral-200">
              <div className="flex items-center gap-1.5 truncate">
                <ShoppingBag className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span className="truncate">Source: <strong className="font-semibold text-neutral-800">ecomerce.xlsx</strong></span>
              </div>
              <span className="text-[10px] bg-green-100 text-green-700 font-medium px-1.5 py-0.5 rounded">
                Active
              </span>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-end gap-2 max-w-[85%]">
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 mb-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-black text-white rounded-br-none"
                          : "bg-white text-neutral-800 border border-neutral-200 rounded-bl-none"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>

                      {/* Render Suggested Product Cards if present */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-200 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                            Referenced Products:
                          </p>
                          {msg.products.map((p, i) => (
                            <div
                              key={i}
                              className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-black transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs text-neutral-900">
                                  {p.name}
                                </span>
                                <span className="font-bold text-xs text-neutral-900">
                                  ${p.price}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-500">
                                <span>{p.category}</span>
                                <span
                                  className={`inline-flex items-center gap-1 font-medium ${
                                    p.stockStatus.toLowerCase().includes("in stock")
                                      ? "text-green-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {p.stockStatus.toLowerCase().includes("in stock") ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                  {p.stockStatus}
                                </span>
                              </div>
                              {p.description && (
                                <p className="text-[10px] text-neutral-400 mt-1 italic">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-400 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              ))}

              {loading && (
                <div className="flex items-end gap-2 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 mb-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            {messages.length <= 2 && (
              <div className="px-3 py-2 bg-white border-t border-neutral-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    disabled={loading}
                    className="shrink-0 text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded-full transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <div className="p-3 bg-white border-t border-neutral-200">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about inventory, clothes, prices..."
                  disabled={loading}
                  className="w-full bg-neutral-100 text-neutral-900 placeholder-neutral-400 text-xs sm:text-sm pl-4 pr-11 py-2.5 rounded-full outline-none focus:ring-2 focus:ring-black transition-all"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="absolute right-1.5 w-8 h-8 rounded-full bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white flex items-center justify-center transition-all disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-center text-neutral-400 mt-2">
                Powered by Gemini • Live inventory from <code>ecomerce.xlsx</code>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

