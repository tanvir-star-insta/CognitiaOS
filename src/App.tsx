/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronRight,
  BarChart3,
  Search,
  FileText,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Globe,
  History,
  Download,
  LogOut,
  User as UserIcon,
  Clock,
  Printer,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface KeyMetric {
  name: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
}

interface Insight {
  title: string;
  description: string;
  data_evidence: string;
  impact_level: 'Low' | 'Medium' | 'High';
}

interface Anomaly {
  type: string;
  location: string;
  reasoning: string;
  severity: 'Low' | 'Medium' | 'High';
}

interface Risk {
  risk_type: string;
  probability: string;
  business_impact: string;
  evidence: string;
}

interface Recommendation {
  action: string;
  justification: string;
  expected_outcome: string;
  confidence_score: number;
}

interface SystemHealth {
  status: string;
  firebase: boolean;
  appUrl: string;
  googleClientId: boolean;
  geminiKeyConfigured: boolean;
  geminiKeyName: string;
  redirectUri: string;
  origin: string;
}

interface Visualization {
  type: 'pie' | 'bar' | 'line' | 'area';
  title: string;
  data: { name: string; value: number }[];
  description: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

interface ReportHistory {
  id: string;
  query: string;
  context: string;
  result: AnalysisResult;
  created_at: string;
}

interface AnalysisResult {
  data_summary: {
    detected_entities: string[];
    key_metrics: KeyMetric[];
    relationships: string[];
  };
  visualizations: Visualization[];
  insights: Insight[];
  anomalies: Anomaly[];
  forecast: {
    time_horizon: string;
    predicted_trend: string;
    confidence_level: string;
    projection_data?: { period: string; value: number }[];
  };
  strategic_growth?: {
    title: string;
    data: { label: string; current: number; projected: number }[];
  };
  market_expansion?: {
    title: string;
    data: { segment: string; opportunity_score: number; risk_factor: number }[];
  };
  geographic_matrix?: {
    title: string;
    data: { city: string; score: number; risk: number }[];
  };
  risk_heatmap?: {
    title: string;
    data: { category: string; risk_score: number; impact: number }[];
  };
  operational_efficiency?: {
    title: string;
    metrics: { label: string; score: number }[];
  };
  risk_analysis: Risk[];
  recommendations: Recommendation[];
}

// --- Components ---

const ImpactBadge = ({ level }: { level: 'Low' | 'Medium' | 'High' }) => {
  const styles = {
    High: "bg-red-50 text-red-700 border-red-100",
    Medium: "bg-amber-50 text-amber-700 border-amber-100",
    Low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", styles[level])}>
      {level}
    </span>
  );
};

const CHART_COLORS = ['#1C1917', '#44403C', '#78716C', '#A8A29E', '#D6D3D1', '#E7E5E4'];

const VisualCard = ({ viz }: { viz: Visualization }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-4">
        <h4 className="text-sm font-bold text-stone-900">{viz.title}</h4>
        <p className="text-[10px] text-stone-500">{viz.description}</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {viz.type === 'pie' ? (
            <PieChart>
              <Pie
                data={viz.data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {viz.data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            </PieChart>
          ) : viz.type === 'bar' ? (
            <BarChart data={viz.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F4" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F5F5F4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" fill="#1C1917" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={viz.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F4" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="value" stroke="#1C1917" strokeWidth={2} dot={{ r: 4, fill: '#1C1917' }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
const MetricCard = ({ metric }: { metric: KeyMetric }) => {
  const TrendIcon = metric.trend === 'up' ? ArrowUpRight : metric.trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = metric.trend === 'up' ? 'text-emerald-600' : metric.trend === 'down' ? 'text-red-600' : 'text-stone-400';

  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-stone-500 text-xs font-medium uppercase tracking-tight">{metric.name}</span>
        <TrendIcon size={16} className={trendColor} />
      </div>
      <div className="text-2xl font-semibold tracking-tight text-stone-900">{metric.value}</div>
    </motion.div>
  );
};

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [query, setQuery] = useState('');
  const [context, setContext] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<ReportHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentView, setCurrentView] = useState<'app' | 'terms' | 'privacy' | 'docs' | 'security'>('app');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [showHealthDebug, setShowHealthDebug] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const savedUser = localStorage.getItem('cognitia_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      fetchHistory(u.id);
    }

    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const u = event.data.user;
        setUser(u);
        localStorage.setItem('cognitia_user', JSON.stringify(u));
        fetchHistory(u.id);
      }
    };
    window.addEventListener('message', handleMessage);

    // Fetch health status
    fetch('/api/health')
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        }
        throw new Error("Invalid response from health check");
      })
      .then(data => setHealth(data))
      .catch(err => console.error("Health check failed", err));

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchHistory = async (userId: string) => {
    try {
      const res = await fetch(`/api/reports?userId=${userId}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setHistory(data);
        }
      }
    } catch (e) {
      console.error("Fetch history failed", e);
    }
  };

  const handleSignIn = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();

      const authWindow = window.open(
        url,
        'google_oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (e) {
      console.error("Sign in failed", e);
      setError("Failed to initiate Google Sign-In.");
    }
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('cognitia_user');
    setHistory([]);
    setShowHistory(false);
    setData([]);
    setResult(null);
    setQuery('');
    setContext('');
    setError(null);
  };

  const handleExport = () => {
    window.print();
  };

  const loadFromHistory = (h: ReportHistory) => {
    setResult(h.result);
    setQuery(h.query);
    setContext(h.context);
    setShowHistory(false);
  };

  const loadSampleData = () => {
    const sample = [
      { Date: '2025-01-01', Region: 'North', Product: 'Alpha', Sales: 12500, Growth: 0.12, Risk: 'Low' },
      { Date: '2025-01-02', Region: 'South', Product: 'Alpha', Sales: 14200, Growth: 0.15, Risk: 'Low' },
      { Date: '2025-01-03', Region: 'East', Product: 'Beta', Sales: 9800, Growth: -0.05, Risk: 'Medium' },
      { Date: '2025-01-04', Region: 'West', Product: 'Alpha', Sales: 15600, Growth: 0.22, Risk: 'Low' },
      { Date: '2025-01-05', Region: 'North', Product: 'Gamma', Sales: 21000, Growth: 0.35, Risk: 'High' },
      { Date: '2025-01-06', Region: 'South', Product: 'Beta', Sales: 11000, Growth: 0.08, Risk: 'Low' },
      { Date: '2025-01-07', Region: 'East', Product: 'Alpha', Sales: 13400, Growth: 0.10, Risk: 'Low' },
    ];
    setData(sample);
    setHeaders(Object.keys(sample[0]));
    setContext("Enterprise Sales Performance Q1");
    setQuery("Analyze growth trends and identify high-risk segments.");
  };

  const processFile = (file: File) => {
    console.log("Processing file:", file.name, file.size);
    const fileName = file.name.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setError("Invalid file type. Please upload a CSV or Excel file.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        worker: false,
        complete: (results) => {
          console.log("Parse complete. Rows:", results.data.length);
          setIsAnalyzing(false);
          if (results.errors.length > 0) {
            console.error("PapaParse Errors:", results.errors);
            setError("Failed to parse CSV file. Some rows may be malformed.");
            if (results.data.length > 0) {
              setData(results.data);
              if (results.meta.fields) setHeaders(results.meta.fields);
            }
            return;
          }
          if (!results.data || results.data.length === 0) {
            setError("The uploaded CSV file contains no data.");
            return;
          }
          setData(results.data);
          if (results.meta.fields) {
            setHeaders(results.meta.fields);
          }
        },
        error: (err) => {
          console.error("PapaParse Global Error:", err);
          setIsAnalyzing(false);
          setError("Error reading file: " + err.message);
        }
      });
    } else if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          console.log("Excel Parse complete. Rows:", json.length);
          setIsAnalyzing(false);
          
          if (!json || json.length === 0) {
            setError("The uploaded Excel file contains no data.");
            return;
          }
          
          setData(json);
          setHeaders(Object.keys(json[0] as object));
        } catch (err: any) {
          console.error("Excel Parse Error:", err);
          setIsAnalyzing(false);
          setError("Error reading Excel file: " + err.message);
        }
      };
      reader.onerror = (err) => {
        console.error("FileReader Error:", err);
        setIsAnalyzing(false);
        setError("Error reading file.");
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
      if (e.target) e.target.value = ''; // Reset to allow re-upload of same file
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const runAnalysis = async () => {
    if (data.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send a representative sample to the server to avoid payload size limits
        // The server only needs a sample to understand the schema and provide insights
        body: JSON.stringify({ 
          dataset: data.slice(0, 500), 
          query, 
          context,
          totalRows: data.length 
        }),
      });
      
      let json: any = {};
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("application/json")) {
        json = await response.json();
      } else {
        const text = await response.text();
        json = { error: text || "An unexpected error occurred." };
      }
      
      if (!response.ok) {
        if (response.status === 429 || json.error?.toLowerCase().includes("rate exceeded")) {
          throw new Error("The Intelligence Engine is currently experiencing high demand. Please wait 30-60 seconds and try again.");
        }
        throw new Error(json.error || "Intelligence Engine failed to process data.");
      }
      
      setResult(json);
      
      if (user) {
        try {
          await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: 'rep_' + Date.now(),
              userId: user.id,
              query,
              context,
              result: json
            })
          });
          fetchHistory(user.id);
        } catch (e) {
          console.error("Failed to save report", e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setData([]);
    setResult(null);
    setQuery('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Status Bar */}
      <div className="bg-stone-900 text-white py-1.5 px-6 flex justify-between items-center">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Core: Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">API: Connected</span>
          </div>
        </div>
        <div className="text-[9px] font-mono opacity-40 uppercase tracking-tighter">
          Secure Enterprise Tunnel • {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setCurrentView('app')}
          >
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Database className="text-white" size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">Cognitia<span className="text-stone-400">OS</span></h1>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowHistory(true)}
                  className="p-2 text-stone-500 hover:text-stone-900 transition-colors relative"
                  title="Recent Reports"
                >
                  <History size={20} />
                  {history.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-stone-900 rounded-full border border-white" />
                  )}
                </button>
                <div className="h-4 w-px bg-stone-200" />
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-stone-200" />
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold text-stone-900 leading-none mb-0.5">{user.name}</div>
                    <button onClick={handleSignOut} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-red-600 transition-colors flex items-center gap-1">
                      <LogOut size={10} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-sm"
              >
                <UserIcon size={14} />
                Sign In
              </button>
            )}
            <div className="h-4 w-px bg-stone-200" />
            <div className="hidden md:flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">System Ready</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 print:p-0 print:max-w-none">
        {/* Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            header, footer, aside, .no-print, button { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; max-width: none !important; }
            .print-break-inside-avoid { break-inside: avoid; }
            body { background: white !important; }
            .bg-stone-900 { background-color: #1c1917 !important; color: white !important; -webkit-print-color-adjust: exact; }
          }
        `}} />

        {currentView === 'terms' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto prose prose-stone">
            <button onClick={() => setCurrentView('app')} className="mb-8 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-2">
              <ChevronRight className="rotate-180" size={14} /> Back to App
            </button>
            <h2 className="text-4xl font-serif italic mb-8">Terms of Service</h2>
            <p className="text-stone-500">Last updated: February 22, 2026</p>
            <div className="space-y-8 text-stone-700">
              <section>
                <h3 className="text-xl font-bold text-stone-900">1. Acceptance of Terms</h3>
                <p>By accessing or using CognitiaOS, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the service.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">2. Description of Service</h3>
                <p>CognitiaOS provides an autonomous intelligence platform that processes user-uploaded datasets to generate strategic insights, forecasts, and risk analysis using advanced AI models.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">3. Data Ownership & Privacy</h3>
                <p>You retain all rights, title, and interest in and to the data you upload to CognitiaOS. We do not claim ownership of your data. Your use of the service is also governed by our Privacy Policy.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">4. Enterprise Use</h3>
                <p>CognitiaOS is designed for enterprise-grade intelligence. You are responsible for ensuring that you have the necessary rights and permissions to upload and process the data you provide.</p>
              </section>
            </div>
          </motion.div>
        )}

        {currentView === 'privacy' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto prose prose-stone">
            <button onClick={() => setCurrentView('app')} className="mb-8 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-2">
              <ChevronRight className="rotate-180" size={14} /> Back to App
            </button>
            <h2 className="text-4xl font-serif italic mb-8">Privacy Policy</h2>
            <p className="text-stone-500">Last updated: February 22, 2026</p>
            <div className="space-y-8 text-stone-700">
              <section>
                <h3 className="text-xl font-bold text-stone-900">1. Information We Collect</h3>
                <p>We collect information you provide directly to us, such as when you sign in via Google OAuth (email, name, avatar) and the datasets you upload for analysis.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">2. How We Use Your Information</h3>
                <p>We use the information we collect to provide, maintain, and improve our services, including processing your data through AI models to generate intelligence reports.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">3. Data Security</h3>
                <p>We implement enterprise-grade security measures to protect your data. Uploaded datasets are processed securely and stored in an isolated environment associated with your authenticated account.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">4. Third-Party Services</h3>
                <p>We use Google OAuth for authentication and Google Gemini API for data processing. These services have their own privacy policies which you should review.</p>
              </section>
            </div>
          </motion.div>
        )}

        {currentView === 'docs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto prose prose-stone">
            <button onClick={() => setCurrentView('app')} className="mb-8 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-2">
              <ChevronRight className="rotate-180" size={14} /> Back to App
            </button>
            <h2 className="text-4xl font-serif italic mb-8">Documentation</h2>
            <div className="space-y-8 text-stone-700">
              <section>
                <h3 className="text-xl font-bold text-stone-900">Getting Started</h3>
                <p>To begin using CognitiaOS, sign in with your Google account. Once authenticated, you can upload datasets in CSV or Excel format.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">Supported Formats</h3>
                <p>We currently support <strong>.csv</strong>, <strong>.xlsx</strong>, and <strong>.xls</strong> files. For best results, ensure your data has clear headers and consistent formatting.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">Understanding Reports</h3>
                <p>Each report includes autonomous reasoning, strategic insights, trend forecasting, and risk analysis. You can export these reports as PDFs for executive presentations.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">History & Persistence</h3>
                <p>Your reports are automatically saved to your account. You can access them anytime via the "Recent Reports" history sidebar.</p>
              </section>
            </div>
          </motion.div>
        )}

        {currentView === 'security' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto prose prose-stone">
            <button onClick={() => setCurrentView('app')} className="mb-8 text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-2">
              <ChevronRight className="rotate-180" size={14} /> Back to App
            </button>
            <h2 className="text-4xl font-serif italic mb-8">Security Audit</h2>
            <div className="space-y-8 text-stone-700">
              <section>
                <h3 className="text-xl font-bold text-stone-900">Encryption</h3>
                <p>All data in transit is encrypted using TLS 1.3. Data at rest is stored using AES-256 encryption standards.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">Authentication</h3>
                <p>We utilize Google OAuth 2.0 for secure, enterprise-grade authentication, ensuring that only authorized users can access their intelligence data.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">Data Isolation</h3>
                <p>Each user's data and generated reports are logically isolated in our database, preventing any cross-contamination of enterprise intelligence.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-stone-900">Compliance</h3>
                <p>CognitiaOS is designed with SOC2 and GDPR principles in mind, focusing on data minimization, purpose limitation, and robust access controls.</p>
              </section>
            </div>
          </motion.div>
        )}

        {currentView === 'app' && (
          <>
            {!user ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center py-12">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl w-full text-center"
            >
              <div className="inline-block px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 mb-8">
                Enterprise Intelligence OS
              </div>
              <h2 className="text-7xl md:text-8xl font-serif italic mb-8 text-stone-900 leading-[0.9] tracking-tight">
                Data is raw.<br />
                <span className="text-stone-400">Intelligence is crafted.</span>
              </h2>
              <p className="text-stone-500 mb-12 text-xl max-w-2xl mx-auto leading-relaxed">
                CognitiaOS transforms your static datasets into autonomous strategic reports, 
                risk forecasts, and operational intelligence. 
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={handleSignIn}
                  className="px-10 py-5 bg-stone-900 text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3"
                >
                  <UserIcon size={18} />
                  Get Started with Google
                </button>
                <button 
                  className="px-10 py-5 bg-white border border-stone-200 text-stone-900 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-stone-50 transition-all"
                >
                  View Case Studies
                </button>
              </div>

              <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                    <Zap className="text-stone-900" size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-stone-900">Autonomous Reasoning</h4>
                  <p className="text-sm text-stone-500 leading-relaxed">Our engine automatically detects schemas, correlations, and anomalies without manual configuration.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-stone-900" size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-stone-900">Predictive Forecasting</h4>
                  <p className="text-sm text-stone-500 leading-relaxed">Identify future trends and market shifts before they happen with built-in time-series intelligence.</p>
                </div>
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                    <ShieldAlert className="text-stone-900" size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-stone-900">Risk Mitigation</h4>
                  <p className="text-sm text-stone-500 leading-relaxed">Comprehensive risk heatmaps and severity analysis to protect your enterprise assets.</p>
                </div>
              </div>

              {/* System Configuration Debug Section */}
              <div className="mt-24 pt-12 border-t border-stone-100 text-left">
                <button 
                  onClick={() => setShowHealthDebug(!showHealthDebug)}
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-2 mb-6"
                >
                  <ChevronDown className={cn("transition-transform", showHealthDebug && "rotate-180")} size={12} />
                  System Configuration & OAuth Debug
                </button>
                
                <AnimatePresence>
                  {showHealthDebug && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-stone-50 rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <h5 className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-4">OAuth Whitelist Requirements</h5>
                            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
                              Google OAuth is strict. You must add the following exact values to your <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-stone-900 underline">Google Cloud Console</a>.
                            </p>
                            <div className="space-y-3">
                              <div className="p-3 bg-white border border-stone-200 rounded-xl">
                                <div className="text-[9px] font-bold text-stone-400 uppercase mb-1">Authorized JavaScript Origin</div>
                                <div className="text-xs font-mono text-stone-900 break-all">{health?.origin || "Loading..."}</div>
                              </div>
                              <div className="p-3 bg-white border border-stone-200 rounded-xl">
                                <div className="text-[9px] font-bold text-stone-400 uppercase mb-1">Authorized Redirect URI</div>
                                <div className="text-xs font-mono text-stone-900 break-all">{health?.redirectUri || "Loading..."}</div>
                              </div>
                              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="text-[9px] font-bold text-amber-600 uppercase mb-1">Important Note</div>
                                <p className="text-[10px] text-amber-800 leading-tight">
                                  Do NOT use the Firebase Auth handler URL (e.g. cognitia2.firebaseapp.com/__/auth/handler). 
                                  You must use the <strong>Authorized Redirect URI</strong> shown above for CognitiaOS to function correctly.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <h5 className="text-xs font-bold text-stone-900 uppercase tracking-widest mb-4">System Integration Status</h5>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col gap-2">
                                <div className="text-[9px] font-bold text-stone-400 uppercase">Firebase Admin</div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", health?.firebase ? "bg-emerald-500" : "bg-red-500")} />
                                  <span className="text-xs font-bold text-stone-900">{health?.firebase ? "Connected" : "Disconnected"}</span>
                                </div>
                              </div>
                              <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col gap-2">
                                <div className="text-[9px] font-bold text-stone-400 uppercase">Google Client ID</div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", health?.googleClientId ? "bg-emerald-500" : "bg-red-500")} />
                                  <span className="text-xs font-bold text-stone-900">{health?.googleClientId ? "Configured" : "Missing"}</span>
                                </div>
                              </div>
                              <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col gap-2">
                                <div className="text-[9px] font-bold text-stone-400 uppercase">Gemini API Key</div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", health?.geminiKeyConfigured ? "bg-emerald-500" : "bg-red-500")} />
                                  <span className="text-xs font-bold text-stone-900">
                                    {health?.geminiKeyConfigured ? `Configured (${health.geminiKeyName})` : "Missing"}
                                  </span>
                                </div>
                              </div>
                              <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col gap-2">
                                <div className="text-[9px] font-bold text-stone-400 uppercase">Environment URL</div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", health?.appUrl !== "NOT_SET" ? "bg-emerald-500" : "bg-red-500")} />
                                  <span className="text-xs font-bold text-stone-900">{health?.appUrl !== "NOT_SET" ? "Set" : "Not Set"}</span>
                                </div>
                              </div>
                              <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col gap-2">
                                <div className="text-[9px] font-bold text-stone-400 uppercase">System Status</div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-xs font-bold text-stone-900">Operational</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        ) : !data.length ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl w-full text-center"
            >
              <h2 className="text-5xl font-serif italic mb-6 text-stone-900">Intelligence starts with data.</h2>
              <p className="text-stone-500 mb-10 text-lg">
                Upload your dataset to begin autonomous reasoning, trend forecasting, and risk analysis.
              </p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".csv, .xlsx, .xls" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "group relative block w-full aspect-video border-2 border-dashed rounded-3xl transition-all cursor-pointer bg-white overflow-hidden",
                  isDragging ? "border-stone-900 bg-stone-50 scale-[0.99]" : "border-stone-300 hover:border-stone-900",
                  isAnalyzing && "pointer-events-none opacity-50"
                )}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className={cn(
                    "w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center transition-transform",
                    isDragging ? "scale-110 bg-stone-100" : "group-hover:scale-110"
                  )}>
                    {isAnalyzing ? (
                      <Loader2 className="text-stone-900 animate-spin" size={32} />
                    ) : (
                      <Upload className={cn("text-stone-400", isDragging ? "text-stone-900" : "group-hover:text-stone-900")} size={32} />
                    )}
                  </div>
                  <div className="text-sm font-medium text-stone-600">
                    {isAnalyzing ? "Parsing Intelligence..." : isDragging ? "Release to Analyze" : "Drop CSV or Excel file or click to browse"}
                  </div>
                  <div className="text-xs text-stone-400">Supports up to 50MB datasets</div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-stone-200" />
                <button 
                  onClick={loadSampleData}
                  className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors"
                >
                  Load Enterprise Sample Data
                </button>
                <div className="h-px w-12 bg-stone-200" />
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Controls */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Dataset Summary</label>
                  <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <FileText className="text-stone-400" size={20} />
                    <div>
                      <div className="text-sm font-semibold text-stone-900">{data.length} Rows Detected</div>
                      <div className="text-[10px] text-stone-500 uppercase tracking-tight">{headers.length} Columns</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Analysis Context</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q4 Sales Performance"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Intelligence Query</label>
                  <textarea 
                    rows={4}
                    placeholder="What specific insights are you looking for?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/5 focus:border-stone-900 transition-all resize-none"
                  />
                </div>

                <button 
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="w-full py-4 bg-stone-900 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-900/10"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Reasoning...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Execute Intelligence Engine
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="text-red-600 shrink-0" size={18} />
                    <div className="text-xs text-red-700 font-medium">{error}</div>
                  </div>
                )}
              </div>

              {/* Data Preview Mini */}
              <div className="bg-stone-900 text-white p-6 rounded-2xl shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Database size={120} />
                </div>
                <div className="relative z-10">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">Schema & Data Preview</div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {headers.slice(0, 6).map(h => (
                        <div key={h} className="flex items-center gap-2 text-[10px] font-mono opacity-80 truncate">
                          <div className="w-1 h-1 bg-stone-500 rounded-full shrink-0" />
                          {h}
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-white/10 pt-4">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-2">Sample Rows</div>
                      <div className="space-y-1.5">
                        {data.slice(0, 3).map((row, i) => (
                          <div key={i} className="text-[9px] font-mono opacity-60 truncate bg-white/5 p-1.5 rounded border border-white/5">
                            {JSON.stringify(row)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-8">
              {!result && !isAnalyzing && (
                <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-stone-300" size={32} />
                  </div>
                  <h3 className="text-2xl font-serif italic text-stone-900 mb-2">Engine Ready.</h3>
                  <p className="text-stone-500 max-w-sm">Configure your query and context, then execute to generate autonomous insights.</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-6 animate-pulse">
                  <div className="h-32 bg-stone-200 rounded-2xl" />
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-stone-200 rounded-2xl" />
                    <div className="h-24 bg-stone-200 rounded-2xl" />
                    <div className="h-24 bg-stone-200 rounded-2xl" />
                  </div>
                  <div className="h-64 bg-stone-200 rounded-2xl" />
                </div>
              )}

              {result && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8"
                >
                  {/* High Risk Alert Banner */}
                  <div className="flex justify-between items-center no-print">
                    <div className="flex gap-4">
                      {data.length > 0 && (
                        <button 
                          onClick={reset}
                          className="text-stone-500 hover:text-stone-900 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                          <Database size={14} />
                          New Analysis
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={handleExport}
                      className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-stone-200 transition-all"
                    >
                      <Printer size={14} />
                      Export Report
                    </button>
                  </div>

                  {result.risk_analysis?.some(r => r.probability.toLowerCase().includes('high')) && (
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-red-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <AlertTriangle size={24} />
                        </div>
                        <div>
                          <div className="text-sm font-bold uppercase tracking-widest">Critical Risks Detected</div>
                          <p className="text-[10px] text-red-100">Immediate strategic intervention recommended for high-probability threats.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => document.getElementById('risk-analysis')?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-3 py-1 bg-white text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        Action Required
                      </button>
                    </motion.div>
                  )}

                  {/* Key Metrics Row */}
                  {result.data_summary?.key_metrics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-break-inside-avoid">
                      {result.data_summary.key_metrics.map((m, i) => (
                        <MetricCard key={i} metric={m} />
                      ))}
                    </div>
                  )}

                  {/* Visualizations Section */}
                  {result.visualizations && result.visualizations.length > 0 && (
                    <section className="print-break-inside-avoid">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 mb-4">
                        <BarChart3 size={16} />
                        Intelligence Visualizations
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {result.visualizations.map((viz, i) => (
                          <VisualCard key={i} viz={viz} />
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Insights Section */}
                  {result.insights && result.insights.length > 0 && (
                    <section className="print-break-inside-avoid">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                          <TrendingUp size={16} />
                          Strategic Insights
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {result.insights.map((insight, i) => (
                          <div key={i} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:border-stone-400 transition-colors group">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-lg font-bold text-stone-900 group-hover:text-stone-700 transition-colors">{insight.title}</h4>
                              <ImpactBadge level={insight.impact_level} />
                            </div>
                            <p className="text-stone-600 text-sm leading-relaxed mb-4">{insight.description}</p>
                            <div className="flex items-start gap-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                              <CheckCircle2 className="text-stone-400 shrink-0 mt-0.5" size={14} />
                              <div className="text-[11px] font-mono text-stone-500">
                                <span className="font-bold text-stone-700 uppercase tracking-tighter mr-2">Evidence:</span>
                                {insight.data_evidence}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Anomalies & Risks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print-break-inside-avoid">
                    {result.anomalies && result.anomalies.length > 0 && (
                      <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 mb-4">
                          <AlertTriangle size={16} />
                          Anomalies Detected
                        </h3>
                        <div className="space-y-3">
                          {result.anomalies.map((anomaly, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-stone-900">{anomaly.type}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                                  anomaly.severity === 'High' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-600'
                                )}>
                                  {anomaly.severity}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500 mb-1">Location: {anomaly.location}</div>
                              <p className="text-xs text-stone-600 italic">"{anomaly.reasoning}"</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {result.risk_analysis && result.risk_analysis.length > 0 && (
                      <section id="risk-analysis">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 mb-4">
                          <ShieldAlert size={16} />
                          Risk Analysis
                        </h3>
                        <div className="space-y-3">
                          {result.risk_analysis.map((risk, i) => {
                            const isHighRisk = risk.probability.toLowerCase().includes('high');
                            return (
                              <motion.div 
                                key={i} 
                                whileHover={{ scale: 1.02 }}
                                className={cn(
                                  "p-6 rounded-2xl border transition-all relative overflow-hidden",
                                  isHighRisk 
                                    ? "bg-red-50 border-red-200 shadow-lg shadow-red-100/50" 
                                    : "bg-white border-stone-200 shadow-sm"
                                )}
                              >
                                {isHighRisk && (
                                  <div className="absolute top-0 right-0 p-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                  </div>
                                )}
                                <div className="flex justify-between items-start mb-4">
                                  <h4 className={cn(
                                    "text-sm font-bold max-w-[70%]",
                                    isHighRisk ? "text-red-900" : "text-stone-900"
                                  )}>{risk.risk_type}</h4>
                                  <div className={cn(
                                    "text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border",
                                    isHighRisk 
                                      ? "bg-red-600 text-white border-red-700" 
                                      : "bg-stone-50 text-stone-600 border-stone-100"
                                  )}>
                                    {risk.probability}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-[9px] font-bold uppercase tracking-widest mb-1",
                                      isHighRisk ? "text-red-400" : "text-stone-400"
                                    )}>Probability</span>
                                    <span className={cn(
                                      "text-xs font-bold uppercase",
                                      isHighRisk ? "text-red-700" : "text-stone-600"
                                    )}>{risk.probability}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={cn(
                                      "text-[9px] font-bold uppercase tracking-widest mb-1",
                                      isHighRisk ? "text-red-400" : "text-stone-400"
                                    )}>Impact Level</span>
                                    <span className={cn(
                                      "text-xs font-bold",
                                      isHighRisk ? "text-red-900" : "text-stone-900"
                                    )}>{risk.business_impact}</span>
                                  </div>
                                </div>

                                <div className={cn(
                                  "p-4 rounded-xl border",
                                  isHighRisk ? "bg-red-100/50 border-red-200" : "bg-stone-50 border-stone-100"
                                )}>
                                  <p className={cn(
                                    "text-xs leading-relaxed italic",
                                    isHighRisk ? "text-red-800" : "text-stone-600"
                                  )}>
                                    "{risk.evidence}"
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Risk Heatmap & Operational Efficiency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print-break-inside-avoid">
                    {result.risk_heatmap && result.risk_heatmap.data.length > 0 && (
                      <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-lg font-bold text-stone-900">{result.risk_heatmap.title}</h3>
                            <p className="text-xs text-stone-500">Risk Score vs Business Impact distribution.</p>
                          </div>
                          <AlertTriangle className="text-red-500" size={24} />
                        </div>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" />
                              <XAxis type="number" dataKey="risk_score" name="Risk Score" unit="" fontSize={10} axisLine={false} tickLine={false} />
                              <YAxis type="number" dataKey="impact" name="Impact" unit="" fontSize={10} axisLine={false} tickLine={false} />
                              <ZAxis type="number" range={[100, 1000]} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                              <Legend verticalAlign="top" height={36}/>
                              <Scatter name="Risk Categories" data={result.risk_heatmap.data} fill="#EF4444" />
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                    )}

                    {result.operational_efficiency && result.operational_efficiency.metrics.length > 0 && (
                      <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-lg font-bold text-stone-900">{result.operational_efficiency.title}</h3>
                            <p className="text-xs text-stone-500">Operational performance across key dimensions.</p>
                          </div>
                          <Zap className="text-amber-500" size={24} />
                        </div>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={result.operational_efficiency.metrics}>
                              <PolarGrid stroke="#F5F5F4" />
                              <PolarAngleAxis dataKey="label" fontSize={10} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={8} />
                              <Radar name="Efficiency" dataKey="score" stroke="#1C1917" fill="#1C1917" fillOpacity={0.6} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Forecast Section */}
                  {result.forecast && (
                    <section className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden print-break-inside-avoid">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <TrendingUp size={160} />
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 mb-6">
                          <BarChart3 size={16} />
                          Predictive Forecast
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                          <div>
                            <div className="text-4xl font-serif italic mb-4">{result.forecast.predicted_trend}</div>
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Horizon</div>
                                <div className="text-sm font-medium">{result.forecast.time_horizon}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Confidence</div>
                                <div className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold">{result.forecast.confidence_level}</div>
                              </div>
                            </div>
                          </div>
                          <div className="h-64 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 p-6">
                             {result.forecast.projection_data ? (
                               <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={result.forecast.projection_data}>
                                   <defs>
                                     <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                                     </linearGradient>
                                   </defs>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                   <XAxis 
                                     dataKey="period" 
                                     fontSize={10} 
                                     axisLine={false} 
                                     tickLine={false} 
                                     stroke="rgba(255,255,255,0.4)" 
                                     dy={10}
                                   />
                                   <YAxis 
                                     fontSize={10} 
                                     axisLine={false} 
                                     tickLine={false} 
                                     stroke="rgba(255,255,255,0.4)"
                                     tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                                   />
                                   <Tooltip 
                                     contentStyle={{ backgroundColor: '#1C1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                                     itemStyle={{ color: '#FFFFFF' }}
                                     cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                   />
                                   <Area 
                                     type="monotone" 
                                     dataKey="value" 
                                     stroke="#FFFFFF" 
                                     fillOpacity={1} 
                                     fill="url(#colorValue)" 
                                     strokeWidth={3}
                                     animationDuration={1500}
                                   />
                                 </AreaChart>
                               </ResponsiveContainer>
                             ) : (
                               <div className="text-stone-500 text-xs italic">Visual projection generated from intelligence core</div>
                             )}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <section className="print-break-inside-avoid">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2 mb-4">
                        <CheckCircle2 size={16} />
                        Decision Intelligence
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {result.recommendations.map((rec, i) => (
                          <div key={i} className="bg-white p-6 rounded-2xl border-l-4 border-l-stone-900 border border-stone-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="text-lg font-bold text-stone-900">{rec.action}</h4>
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Confidence</span>
                                <div className="text-xl font-mono font-bold text-stone-900">{(rec.confidence_score * 100).toFixed(0)}%</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Justification</div>
                                <p className="text-sm text-stone-600">{rec.justification}</p>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">Expected Outcome</div>
                                <p className="text-sm text-stone-600">{rec.expected_outcome}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Strategic Growth Projection */}
                  {result.strategic_growth && (
                    <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm print-break-inside-avoid">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-lg font-bold text-stone-900">{result.strategic_growth.title}</h3>
                          <p className="text-xs text-stone-500">Comparative analysis of current vs projected performance benchmarks.</p>
                        </div>
                        <TrendingUp className="text-stone-900" size={24} />
                      </div>
                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.strategic_growth.data} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F5F5F4" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="label" type="category" fontSize={10} axisLine={false} tickLine={false} width={100} />
                            <Tooltip 
                              cursor={{ fill: '#F5F5F4' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                            <Bar dataKey="current" name="Current Performance" fill="#D6D3D1" radius={[0, 4, 4, 0]} barSize={12} />
                            <Bar dataKey="projected" name="Projected Growth" fill="#1C1917" radius={[0, 4, 4, 0]} barSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  )}

                  {/* Geographic Opportunity Matrix */}
                  {result.geographic_matrix && result.geographic_matrix.data.length > 0 && (
                    <section className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm print-break-inside-avoid">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-lg font-bold text-stone-900">{result.geographic_matrix.title}</h3>
                          <p className="text-xs text-stone-500">Comprehensive opportunity vs risk analysis across all identified cities.</p>
                        </div>
                        <Globe className="text-stone-900" size={24} />
                      </div>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={result.geographic_matrix.data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F4" />
                            <XAxis 
                              dataKey="city" 
                              fontSize={10} 
                              axisLine={false} 
                              tickLine={false} 
                              angle={-45} 
                              textAnchor="end" 
                              interval={0}
                            />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                            <Bar dataKey="score" name="Opportunity Score" fill="#1C1917" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="risk" name="Risk Level" fill="#EF4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  )}

                  {/* Market Expansion Intelligence */}
                  {result.market_expansion && (
                    <section className="bg-stone-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden print-break-inside-avoid">
                      <div className="absolute top-0 left-0 p-8 opacity-5">
                        <Globe size={160} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h3 className="text-lg font-bold">{result.market_expansion.title}</h3>
                            <p className="text-xs text-stone-400">Opportunity vs Risk analysis across key market segments.</p>
                          </div>
                          <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest">Expansion Intelligence</div>
                        </div>
                        <div className="h-80 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={result.market_expansion.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="segment" fontSize={10} axisLine={false} tickLine={false} stroke="rgba(255,255,255,0.5)" />
                              <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="rgba(255,255,255,0.5)" />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1C1917', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                itemStyle={{ color: '#FFFFFF' }}
                              />
                              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }} />
                              <Bar dataKey="opportunity_score" name="Opportunity Score" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="risk_factor" name="Risk Factor" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </section>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </main>

      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-[60]"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] border-l border-stone-200 overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
                    <History className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">Recent Reports</h3>
                    <p className="text-xs text-stone-500">Access your previously generated intelligence.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                >
                  <ChevronRight size={24} className="text-stone-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                    <Clock size={48} className="mb-4" />
                    <p className="text-sm font-medium">No reports generated yet.</p>
                  </div>
                ) : (
                  history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => loadFromHistory(h)}
                      className="w-full text-left p-4 rounded-2xl border border-stone-100 hover:border-stone-300 hover:bg-stone-50 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          {new Date(h.created_at).toLocaleDateString()} • {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <ChevronRight size={14} className="text-stone-300 group-hover:text-stone-900 transition-colors" />
                      </div>
                      <div className="text-sm font-bold text-stone-900 mb-1 line-clamp-1">{h.query || "General Analysis"}</div>
                      <div className="text-[11px] text-stone-500 line-clamp-2 italic">"{h.context || "No context provided"}"</div>
                    </button>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
            © 2026 Cognitia Intelligence Systems • Enterprise Grade
          </div>
          <div className="flex gap-6">
            <button onClick={() => setCurrentView('terms')} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Terms of Service</button>
            <button onClick={() => setCurrentView('privacy')} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Privacy Policy</button>
            <button onClick={() => setCurrentView('docs')} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Documentation</button>
            <button onClick={() => setCurrentView('security')} className="text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors">Security Audit</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
