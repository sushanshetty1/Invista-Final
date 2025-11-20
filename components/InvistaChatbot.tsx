"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCompanyData } from "@/hooks/use-company-data";
import { useRouter } from "next/navigation";

type Source = { 
  id: number; 
  source: string; 
  chunk_index: number; 
  content: string;
  metadata?: any;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  intent?: string;
  action?: {
    type: 'navigate';
    url: string;
  };
};

export default function InvistaChatbot() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { companyProfile } = useCompanyData();
  const companyId = companyProfile?.id;
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    if (!query.trim() || !companyId) return;
    
    const userMessage: Message = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);
    const currentQuery = query;
    setQuery("");

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: currentQuery, 
          companyId,
          history: messages.slice(-10), // Send recent conversation history
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Status ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      // Handle streaming responses (for knowledge queries)
      if (contentType?.includes("text/event-stream")) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantMessage: Message = { role: 'assistant', content: '', sources: [], intent: '' };

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
              if (data.intent) {
                assistantMessage.intent = data.intent;
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
      } else {
        // Handle non-streaming responses (for live data queries and navigation)
        const data = await response.json();
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer || "No response",
          sources: data.sources || [],
          intent: data.intent,
          action: data.action,
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Handle navigation action
        if (data.action?.type === 'navigate' && data.action?.url) {
          setTimeout(() => {
            router.push(data.action.url);
          }, 1000);
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted, add a message
        const abortMessage: Message = { 
          role: 'assistant', 
          content: 'Response generation stopped.' 
        };
        setMessages(prev => [...prev, abortMessage]);
      } else {
        setError(err?.message ?? "Unknown error");
        const errorMessage: Message = { 
          role: 'assistant', 
          content: `Sorry, I encountered an error: ${err?.message ?? "Unknown error"}` 
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }

  function stopGeneration() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }

  const renderMessageContent = (content: string) => {
    // Check if content contains product cards data
    if (content.includes('__PRODUCT_CARDS__')) {
      const match = content.match(/__PRODUCT_CARDS__(.+?)__END_PRODUCT_CARDS__/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          return (
            <div className="space-y-3">
              <div className="text-sm font-medium mb-3">
                📦 Products ({data.showing} of {data.total})
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {data.products.map((product: any, index: number) => {
                  const statusEmoji = product.status === "ACTIVE" ? "✅" : 
                                     product.status === "INACTIVE" ? "⏸️" : 
                                     product.status === "DISCONTINUED" ? "🚫" : "❓";
                  
                  const stockStatus = product.stock === 0 ? { text: "Out of Stock", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" } : 
                                     product.stock < product.reorderPoint ? { text: `Low Stock (${product.stock})`, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" } : 
                                     { text: `In Stock (${product.stock})`, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" };
                  
                  return (
                    <div key={index} className="border rounded-lg p-3 bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            {product.name}
                            <span className="text-xs">{statusEmoji}</span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            SKU: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{product.sku}</code>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t">
                        <div>
                          <div className="text-lg font-bold text-primary">${product.price}</div>
                          {(product.category || product.brand) && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {product.category}{product.brand && ` • ${product.brand}`}
                            </div>
                          )}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                          {stockStatus.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.total > 15 && (
                <div className="text-xs text-muted-foreground mt-3 text-center">
                  💡 {data.total - 15} more products available. Try refining your search.
                </div>
              )}
            </div>
          );
        } catch (e) {
          return content.replace(/__PRODUCT_CARDS__.+?__END_PRODUCT_CARDS__/, '');
        }
      }
    }
    
    // Format markdown-like text to JSX
    const lines = content.split('\n');
    const formattedLines = lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-lg font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-xl font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-2xl font-bold mt-4 mb-2">{line.replace('# ', '')}</h1>;
      }
      
      // Bold text **text**
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={`${idx}-${match.index}`}>{match[1]}</strong>);
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      if (parts.length > 0) {
        return <div key={idx}>{parts}</div>;
      }
      
      return line ? <div key={idx}>{line}</div> : <br key={idx} />;
    });
    
    return <>{formattedLines}</>;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const getIntentBadge = (intent?: string) => {
    if (!intent) return null;

    const intentColors: Record<string, string> = {
      // Knowledge
      'knowledge.explainer': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      
      // Inventory
      'inventory.lookup': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'inventory.lowstock': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'inventory.movements': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'inventory.alerts': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      
      // Products
      'products.list': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'products.search': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'products.details': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      'products.count': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      
      // Orders
      'orders.status': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'orders.recent': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'orders.details': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'orders.count': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      
      // Purchase Orders
      'purchaseorders.list': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      'purchaseorders.status': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      'purchaseorders.stats': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      'purchaseorders.reorder': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      
      // Audits
      'audits.recent': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'audits.status': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'audits.stats': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'audits.discrepancies': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      
      // Suppliers
      'suppliers.list': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      'suppliers.details': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      'suppliers.count': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      
      // Warehouses
      'warehouses.list': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
      'warehouses.details': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
      'warehouses.stock': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
      
      // Customers
      'customers.list': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'customers.details': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'customers.count': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      
      // Categories & Brands
      'categories.list': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
      'brands.list': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
      
      // Analytics
      'analytics.overview': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'analytics.revenue': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'analytics.customers': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'analytics.products': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'analytics.orders': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'analytics.inventory': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      
      // Navigation & Fallback
      'navigation.page': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'fallback': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };

    const color = intentColors[intent] || 'bg-gray-100 text-gray-800';
    const displayName = intent.split('.')[1] || intent;

    return (
      <span className={`text-xs px-2 py-1 rounded font-medium ${color}`}>
        {displayName}
      </span>
    );
  };

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-2xl font-semibold">Invista AI Assistant</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ask about processes, check inventory, or navigate to pages
          </p>
        </div>
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
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 text-sm"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className="h-[calc(100vh-240px)] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <div className="text-lg font-medium mb-4">👋 Hello! I can help you with:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mt-6">
                <div className="p-4 border rounded-lg text-left">
                  <div className="text-blue-600 font-medium mb-2">📚 Knowledge</div>
                  <div className="text-sm text-muted-foreground">
                    &quot;How do I create a purchase order?&quot;<br/>
                    &quot;Explain the audit workflow&quot;
                  </div>
                </div>
                <div className="p-4 border rounded-lg text-left">
                  <div className="text-green-600 font-medium mb-2">📊 Live Data</div>
                  <div className="text-sm text-muted-foreground">
                    &quot;Show low stock items&quot;<br/>
                    &quot;What&apos;s the status of order #123?&quot;
                  </div>
                </div>
                <div className="p-4 border rounded-lg text-left">
                  <div className="text-indigo-600 font-medium mb-2">🧭 Navigation</div>
                  <div className="text-sm text-muted-foreground">
                    &quot;Open inventory page&quot;<br/>
                    &quot;Go to reports&quot;
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-lg break-words ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}>
                {message.role === 'assistant' && message.intent && (
                  <div className="mb-2">
                    {getIntentBadge(message.intent)}
                  </div>
                )}
                
                <div>{renderMessageContent(message.content)}</div>
                
                {message.action?.type === 'navigate' && (
                  <div className="mt-2 pt-2 border-t border-muted-foreground/20 text-sm">
                    🔗 Navigating to: <code className="bg-background/50 px-1 py-0.5 rounded">{message.action.url}</code>
                  </div>
                )}

                {message.sources && message.sources.length > 0 && (
                  <details className="mt-2 pt-2 border-t border-muted-foreground/20">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      📄 Sources ({message.sources.length})
                    </summary>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {message.sources.map((s) => (
                        <div key={s.id} className="text-xs bg-background/50 p-2 rounded border">
                          <div className="font-medium flex items-center justify-between">
                            <span>{s.source} — chunk {s.chunk_index}</span>
                            {s.metadata?.category && (
                              <span className="text-[10px] px-1 py-0.5 bg-primary/10 rounded">
                                {s.metadata.category}
                              </span>
                            )}
                          </div>
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
              <div className="bg-muted p-3 rounded-lg flex items-center gap-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <button
                  onClick={stopGeneration}
                  className="px-2 py-1 text-xs bg-background hover:bg-background/80 border rounded transition-colors"
                >
                  ⏹ Stop
                </button>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        {!companyId && (
          <div className="mb-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
            ⚠️ Company profile not loaded. Some features may be limited.
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            className="flex-1 rounded border p-3 bg-input text-foreground resize-none"
            placeholder="Ask about processes, check inventory, or navigate..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            style={{ minHeight: '60px', maxHeight: '120px' }}
          />
          <button
            className="px-6 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
            onClick={sendQuery}
            disabled={loading || !query.trim() || !companyId}
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          💡 Tip: Ask &quot;How do I...&quot; for processes, or &quot;Show me...&quot; for data
        </div>
      </div>
    </div>
  );
}
