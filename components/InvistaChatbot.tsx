"use client";

import React, { useState, useRef, useEffect } from "react";
import { useCompanyData } from "@/hooks/use-company-data";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Database, 
  Navigation, 
  Package,
  RefreshCw,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Sparkles,
  StopCircle
} from "lucide-react";

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
        
        console.log("[InvistaChatbot] Received data:", JSON.stringify(data, null, 2).substring(0, 1000));
        console.log("[InvistaChatbot] Answer field:", data.answer);
        console.log("[InvistaChatbot] Answer length:", data.answer?.length);
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer || "No response",
          sources: data.sources || [],
          intent: data.intent,
          action: data.action,
        };

        console.log("[InvistaChatbot] Created message with content length:", assistantMessage.content?.length);

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
    console.log("[renderMessageContent] Rendering content:", content.substring(0, 200));
    console.log("[renderMessageContent] Contains __PRODUCT_CARDS__:", content.includes('__PRODUCT_CARDS__'));
    
    // Check if content contains warehouse cards data
    if (content.includes('__WAREHOUSE_CARDS__')) {
      const match = content.match(/__WAREHOUSE_CARDS__(.+?)__END_WAREHOUSE_CARDS__/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3 pb-2 border-b">
                <Package className="w-4 h-4 text-primary" />
                <span>Warehouses: {data.showing} of {data.total}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {data.warehouses.map((warehouse: {
                  name: string;
                  code: string;
                  type: string;
                  address: string;
                  status: string;
                  itemCount: number;
                }, warehouseIndex: number) => {
                  const getStatusConfig = (status: string) => {
                    return status === "ACTIVE"
                      ? { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100 dark:bg-green-950" }
                      : { icon: XCircle, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800" };
                  };
                  
                  const statusConfig = getStatusConfig(warehouse.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div key={`warehouse-${warehouseIndex}`} className="border border-border rounded-xl p-4 bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{warehouse.name}</h4>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.bg}`}>
                              <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>Code:</span>
                            <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{warehouse.code}</code>
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <span className="font-medium min-w-[60px]">Type:</span>
                          <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-medium">
                            {warehouse.type}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="font-medium min-w-[60px]">Location:</span>
                          <span className="flex-1">{warehouse.address}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="font-medium">{warehouse.itemCount}</span>
                          <span className="text-muted-foreground">inventory items</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.total > 15 && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>{data.total - 15} more warehouses available.</span>
                </div>
              )}
            </div>
          );
        } catch (e) {
          return content.replace(/__WAREHOUSE_CARDS__.+?__END_WAREHOUSE_CARDS__/, '');
        }
      }
    }
    
    // Check if content contains product cards data
    if (content.includes('__PRODUCT_CARDS__')) {
      const match = content.match(/__PRODUCT_CARDS__(.+?)__END_PRODUCT_CARDS__/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold mb-3 pb-2 border-b">
                <Package className="w-4 h-4 text-primary" />
                <span>Products: {data.showing} of {data.total}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {data.products.map((product: {
                  name: string;
                  sku: string;
                  price: number;
                  stock: number;
                  reorderPoint: number;
                  status: string;
                  category?: string;
                  brand?: string;
                }, productIndex: number) => {
                  const getStatusConfig = (status: string) => {
                    switch(status) {
                      case "ACTIVE":
                        return { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100 dark:bg-green-950" };
                      case "INACTIVE":
                        return { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800" };
                      case "DISCONTINUED":
                        return { icon: XCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-950" };
                      default:
                        return { icon: AlertCircle, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800" };
                    }
                  };
                  
                  const statusConfig = getStatusConfig(product.status);
                  const StatusIcon = statusConfig.icon;
                  
                  const getStockStatus = () => {
                    if (product.stock === 0) {
                      return { text: "Out of Stock", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", icon: XCircle };
                    }
                    if (product.stock < product.reorderPoint) {
                      return { text: `Low Stock (${product.stock})`, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", icon: AlertTriangle };
                    }
                    return { text: `In Stock (${product.stock})`, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", icon: CheckCircle };
                  };
                  
                  const stockStatus = getStockStatus();
                  const StockIcon = stockStatus.icon;
                  
                  return (
                    <div key={`product-${productIndex}`} className="border border-border rounded-xl p-4 bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{product.name}</h4>
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig.bg}`}>
                              <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span>SKU:</span>
                            <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{product.sku}</code>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                        <div>
                          <div className="text-xl font-bold text-primary">${product.price.toFixed(2)}</div>
                          {(product.category || product.brand) && (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {product.category}{product.brand && ` • ${product.brand}`}
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${stockStatus.bg} ${stockStatus.color}`}>
                          <StockIcon className="w-3.5 h-3.5" />
                          <span>{stockStatus.text}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.total > 15 && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>{data.total - 15} more products available. Try refining your search for better results.</span>
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
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Invista AI Assistant
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your intelligent business companion for data insights and navigation
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-sm"
            title="Clear conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
          <button
            type="button"
            onClick={refreshData}
            disabled={refreshing || !companyId}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200 text-xs font-medium hover:shadow-md"
            title="Sync latest data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? "Syncing..." : "Sync Data"}</span>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-4xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-8 mt-6">
              <h2 className="text-2xl font-bold mb-2">Welcome to Your AI Assistant</h2>
              <p className="text-muted-foreground text-sm">
                I can help you access data, understand processes, and navigate your workspace
              </p>
            </div>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Knowledge Card */}
              <div className="group p-4 border border-border rounded-lg bg-card hover:shadow-lg hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold">Knowledge Base</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Learn about processes, workflows, and system features
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>&quot;How do I create a purchase order?&quot;</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>&quot;Explain the audit workflow&quot;</span>
                  </div>
                </div>
              </div>

              {/* Live Data Card */}
              <div className="group p-4 border border-border rounded-lg bg-card hover:shadow-lg hover:border-green-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                    <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-base font-semibold">Live Data Access</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Query real-time inventory, orders, and business metrics
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>&quot;Show low stock items&quot;</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>&quot;What&apos;s the status of order #123?&quot;</span>
                  </div>
                </div>
              </div>

              {/* Navigation Card */}
              <div className="group p-4 border border-border rounded-lg bg-card hover:shadow-lg hover:border-purple-500/50 transition-all duration-300 cursor-pointer">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
                    <Navigation className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold">Smart Navigation</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Navigate quickly to any page or feature you need
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>&quot;Open inventory page&quot;</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>&quot;Go to reports dashboard&quot;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm mb-2">Pro Tips</h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>I remember our conversation context for more natural interactions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Click &quot;Sync Data&quot; to refresh with the latest database information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">→</span>
                      <span>Ask follow-up questions to dive deeper into any topic</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
          
        {/* Messages */}
        {messages.map((message, index) => (
          <div 
            key={`msg-${index}`} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div className={`max-w-[85%] rounded-xl break-words ${
              message.role === 'user'
                ? 'bg-primary text-primary-foreground shadow-md px-4 py-2.5'
                : 'bg-card border border-border shadow-sm px-4 py-3'
            }`}>
              {/* Intent Badge for Assistant */}
              {message.role === 'assistant' && message.intent && (
                <div className="mb-2 flex items-center gap-2">
                  {getIntentBadge(message.intent)}
                </div>
              )}
              
              {/* Message Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                {renderMessageContent(message.content)}
              </div>
              
              {/* Navigation Action */}
              {message.action?.type === 'navigate' && (
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs">
                  <Navigation className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">Navigating to:</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">{message.action.url}</code>
                </div>
              )}

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <details className="mt-2 pt-2 border-t border-border group">
                  <summary className="text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    <span>View {message.sources.length} Source{message.sources.length > 1 ? 's' : ''}</span>
                  </summary>
                  <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-2">
                    {message.sources.map((s) => (
                      <div key={s.id} className="text-[10px] bg-muted/50 p-2 rounded border border-border hover:bg-muted transition-colors">
                        <div className="font-medium flex items-center justify-between mb-1">
                          <span className="text-foreground text-xs">{s.source}</span>
                          <div className="flex items-center gap-1.5">
                            {s.metadata?.category && (
                              <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium">
                                {s.metadata.category}
                              </span>
                            )}
                            <span className="text-muted-foreground">#{s.chunk_index}</span>
                          </div>
                        </div>
                        <div className="text-muted-foreground leading-relaxed line-clamp-2">{s.content}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-card border border-border shadow-sm rounded-xl px-4 py-2.5 flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-muted-foreground">Processing...</span>
              <button
                type="button"
                onClick={stopGeneration}
                className="ml-1 flex items-center gap-1 px-2 py-1 text-[10px] bg-background hover:bg-muted border border-border rounded transition-all duration-200 font-medium"
              >
                <StopCircle className="w-3 h-3" />
                Stop
              </button>
            </div>
          </div>
        )}
          
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section */}
      <div className="p-4 border-t bg-background/95 backdrop-blur-sm sticky bottom-0 shadow-lg">
        {!companyId && (
          <div className="mb-3 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Company Profile Not Loaded</p>
              <p className="text-[10px] text-amber-800 dark:text-amber-200 mt-0.5">Some features may be limited until your company profile is loaded.</p>
            </div>
          </div>
        )}
        <div className="flex gap-2 max-w-5xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              className="w-full rounded-lg border border-border focus:border-primary px-3 py-2.5 pr-10 bg-background text-foreground text-sm resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:outline-none"
              placeholder="Ask about processes, check inventory, or navigate to any page..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            {query.trim() && (
              <div className="absolute right-2.5 bottom-2.5 text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
                Enter ↵
              </div>
            )}
          </div>
          <button
            type="button"
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200 font-medium flex items-center gap-2 self-end"
            onClick={sendQuery}
            disabled={loading || !query.trim() || !companyId}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Thinking</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
        
        {/* Status Bar */}
        <div className="flex items-center justify-center gap-3 mt-2.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            {companyId ? (
              <>
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span>Connected</span>
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 text-red-500" />
                <span>Not connected</span>
              </>
            )}
          </div>
          <span className="text-muted-foreground/50">•</span>
          <span>Powered by AI</span>
        </div>
      </div>
    </div>
  );
}
