"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCompanyData } from "@/hooks/use-company-data";

type Source = { id: number; source: string; chunk_index: number; content: string };

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
};

export default function RagChat() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { companyProfile } = useCompanyData();
  const companyId = companyProfile?.id;

  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function refreshData() {
    if (!companyId) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      const result = await res.json();
      alert(`Data refreshed successfully! ${result.message || ''}`);
    } catch (err: any) {
      alert(`Refresh failed: ${err?.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function sendQuery() {
    if (!query.trim()) return;
    const userMessage: Message = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    const currentQuery = query;
    setQuery("");

    try {
      const response = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: currentQuery, 
          topK: 7, 
          companyId,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessage: Message = { role: 'assistant', content: '', sources: [] };

      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.sources) {
              assistantMessage.sources = data.sources;
            }
            if (data.answer !== undefined) {
              assistantMessage.content = data.answer;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
              });
            }
            if (data.done) {
              break;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
      const errorMessage: Message = { role: 'assistant', content: `Error: ${err?.message ?? "Unknown error"}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-2xl font-semibold">AI Assistant</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMessages([])}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            Clear Chat
          </button>
          <button
            onClick={refreshData}
            disabled={refreshing || !companyId}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="h-[60vh] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                <h3 className="text-lg font-semibold mb-2">💬 Your AI Business Assistant</h3>
                <p className="text-sm mb-4">I have full access to your company data and can have natural conversations with you!</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                <div className="border rounded p-3 bg-muted/50">
                  <div className="font-medium text-sm mb-1">📦 Inventory & Products</div>
                  <div className="text-xs text-muted-foreground">Stock levels, product details, categories, pricing</div>
                </div>
                <div className="border rounded p-3 bg-muted/50">
                  <div className="font-medium text-sm mb-1">🏢 Company Info</div>
                  <div className="text-xs text-muted-foreground">Profile, locations, warehouses, business details</div>
                </div>
                <div className="border rounded p-3 bg-muted/50">
                  <div className="font-medium text-sm mb-1">👥 Suppliers & Customers</div>
                  <div className="text-xs text-muted-foreground">Contacts, relationships, ratings, payment terms</div>
                </div>
                <div className="border rounded p-3 bg-muted/50">
                  <div className="font-medium text-sm mb-1">📊 Orders & Analytics</div>
                  <div className="text-xs text-muted-foreground">Sales data, revenue, trends, order status</div>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">✨ I can remember our conversation and provide insights!</p>
                <p className="text-xs text-muted-foreground">
                  Click "Refresh Data" to sync the latest information from your database
                </p>
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg break-words ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                {message.sources && message.sources.length > 0 && (
                  <details className="mt-2 pt-2 border-t border-muted-foreground/20">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Sources ({message.sources.length})
                    </summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {message.sources.map((s) => (
                        <div key={s.id} className="text-xs bg-background/50 p-2 rounded border">
                          <div className="font-medium">{s.source} — chunk {s.chunk_index}</div>
                          <div className="mt-1 opacity-75 line-clamp-3">{s.content}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded border p-3 bg-input text-foreground resize-none"
            placeholder="Ask me anything - I remember our conversation! Try: 'What products are low on stock?' or 'Tell me about our suppliers'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
            onClick={sendQuery}
            disabled={loading || !query.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
