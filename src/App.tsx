/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Library, 
  User, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  QrCode, 
  LogOut, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Users,
  History,
  Ban,
  Download,
  Search,
  ArrowLeft,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { format, subDays } from 'date-fns';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy,
  getDocFromServer,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from 'firebase/auth';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
type VisitorType = 'student' | 'faculty' | 'outsider';

interface Visitor {
  id: number;
  name: string;
  type: VisitorType;
  identifier: string;
  department?: string;
  university?: string;
  occupation?: string;
  address?: string;
  contact?: string;
  purpose: string;
  check_in: string;
  check_out?: string;
  is_blocked: number;
}

interface Stats {
  totalVisitors: number;
  purposeStats: { purpose: string; count: number }[];
  dailyStats: { date: string; count: number }[];
  avgDuration: number;
}

// --- Constants ---
const ADMINS = [
  'admin1@neu.edu.ph',
  'admin2@neu.edu.ph',
  'admin3@neu.edu.ph'
];
const ADMIN_PASSWORD = 'passW@rd';

const PURPOSES = [
  'Research/thesis',
  'Study',
  'Use of Computer',
  'Boardgames/pass time',
  'Others'
];

const COLORS = ['#0038A8', '#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'];

// --- Components ---

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'visitor' | 'admin'>('visitor');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdminLoggedIn(!!user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    async function seedFirestore() {
      const membersRef = collection(db, 'members');
      const snap = await getDocs(membersRef);
      if (snap.empty) {
        const members = [
          { identifier: '00-00000-000', name: 'Lastname1, Firstname I.', type: 'student', department: '2nd Year BS Information Technology' },
          { identifier: '11-11111-111', name: 'Lastname2, Firstname II.', type: 'student', department: '4th Year BS Computer Science' },
          { identifier: '22-22222-222', name: 'Lastname3, Firstname III', type: 'student', department: '1st Year BS Medical Technology' },
          { identifier: '99-99999-999', name: 'Employee 1', type: 'faculty', department: 'CICS Department' },
          { identifier: '77-77777-777', name: 'Employee 2', type: 'faculty', department: 'CAS Department' },
        ];
        for (const m of members) {
          await setDoc(doc(db, 'members', m.identifier), m);
        }
      }
    }
    seedFirestore();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className={cn(
      "min-h-screen font-sans transition-colors duration-300 relative overflow-hidden",
      isDarkMode ? "bg-brand-dark-bg text-slate-100" : "bg-brand-light-bg text-slate-900"
    )}>
      {/* Test Panel */}
      <TestPanel 
        setMode={setMode} 
        currentMode={mode} 
        isAdminLoggedIn={isAdminLoggedIn} 
        isSplitView={isSplitView}
        setIsSplitView={setIsSplitView}
      />

      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://media.licdn.com/dms/image/v2/C561BAQGUxB_pssZkJA/company-background_10000/company-background_10000/0/1591598531597/new_era_university_official_cover?e=2147483647&v=beta&t=F_JgSz6bKmQ4QdmSivXkthtoQ-7j0KNvpoWiwut8y8A" 
          alt="Campus Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px]" />
      </div>

      {/* Header */}
      <header className={cn(
        "border-b sticky top-0 z-50 transition-all duration-700 relative",
        "bg-black/20 backdrop-blur-3xl border-white/10"
      )}>
        <div className="max-w-7xl mx-auto px-10 h-32 flex items-center justify-between">
          {/* Left Side: Logo & Title */}
          <div className="flex items-center gap-8">
            <div className="relative group">
              <div className="absolute -inset-2 bg-white/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <img 
                src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
                alt="NEU Logo" 
                className="w-16 h-16 object-contain relative drop-shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="h-12 w-[1px] bg-white/10" />
            <div className="text-left">
              <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">NEU LIBRARY</h1>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Library Management System</p>
            </div>
          </div>

          {/* Right Side: Actions & Time/Date Below */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 backdrop-blur-md border",
                  isDarkMode ? "bg-white/5 text-white border-white/10 hover:bg-white/10" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                )}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <div className={cn(
                "flex items-center gap-2 p-1 rounded-xl transition-all duration-300 backdrop-blur-md border",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-white/10 border-white/20"
              )}>
                <button
                  onClick={() => setMode('visitor')}
                  className={cn(
                    "px-5 py-2 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                    mode === 'visitor' 
                      ? (isDarkMode ? "bg-white text-slate-900 shadow-lg" : "bg-white text-[#0038A8] shadow-lg") 
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <User size={14} />
                  Visitor
                </button>
                <button
                  onClick={() => setMode('admin')}
                  className={cn(
                    "px-5 py-2 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                    mode === 'admin' 
                      ? (isDarkMode ? "bg-white text-slate-900 shadow-xl" : "bg-white text-[#0038A8] shadow-xl") 
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <ShieldCheck size={14} />
                  Admin
                </button>
              </div>

              <button
                onClick={() => setIsSplitView(!isSplitView)}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center gap-3 uppercase tracking-[0.2em] border shadow-xl",
                  isSplitView 
                    ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20" 
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                )}
              >
                <BarChart3 size={16} />
                {isSplitView ? "Exit Workspace" : "Open Workspace"}
              </button>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
              <span className="flex items-center gap-2"><Calendar size={12} /> {format(currentTime, 'MMMM dd, yyyy')}</span>
              <span className="w-1 h-1 bg-white/20 rounded-full"></span>
              <span className="flex items-center gap-2 font-mono"><Clock size={12} /> {format(currentTime, 'HH:mm:ss')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        "max-w-7xl mx-auto px-4 py-12 relative z-10 min-h-[calc(100vh-6rem)] flex items-center justify-center",
        isSplitView && "max-w-none px-0 py-0 h-[calc(100vh-8rem)]"
      )}>
        <AnimatePresence mode="wait">
          {isSplitView ? (
            <div className="flex w-full h-full gap-4 p-4">
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[40px] border border-white/10 overflow-auto p-8">
                <div className="mb-6 text-center">
                  <span className="px-4 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Visitor Kiosk</span>
                </div>
                <VisitorFlow isDarkMode={isDarkMode} />
              </div>
              <div className="flex-1 bg-white/10 backdrop-blur-md rounded-[40px] border border-white/10 overflow-auto p-8">
                <div className="mb-6 text-center">
                  <span className="px-4 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Admin Dashboard</span>
                </div>
                <AdminFlow 
                  isLoggedIn={isAdminLoggedIn} 
                  onLogin={() => setIsAdminLoggedIn(true)} 
                  onLogout={() => setIsAdminLoggedIn(false)}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          ) : (
            mode === 'visitor' ? (
              <motion.div key="visitor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <VisitorFlow isDarkMode={isDarkMode} />
              </motion.div>
            ) : (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AdminFlow 
                  isLoggedIn={isAdminLoggedIn} 
                  onLogin={() => setIsAdminLoggedIn(true)} 
                  onLogout={() => setIsAdminLoggedIn(false)}
                  isDarkMode={isDarkMode}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden">
      <div className="absolute inset-0">
        <img 
          src="https://media.licdn.com/dms/image/v2/C561BAQGUxB_pssZkJA/company-background_10000/company-background_10000/0/1591598531597/new_era_university_official_cover?e=2147483647&v=beta&t=F_JgSz6bKmQ4QdmSivXkthtoQ-7j0KNvpoWiwut8y8A" 
          alt="Campus Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 bg-white/90 backdrop-blur-md p-16 rounded-[40px] shadow-2xl flex flex-col items-center gap-8 border border-white/20"
      >
        <img 
          src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
          alt="NEU Logo" 
          className="w-56 h-56 object-contain"
          referrerPolicy="no-referrer"
        />
      </motion.div>
    </div>
  );
}

function VisitorFlow({ isDarkMode }: { isDarkMode: boolean }) {
  const [step, setStep] = useState<'id' | 'purpose' | 'success' | 'error'>('id');
  const [visitorData, setVisitorData] = useState<Partial<Visitor>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleIdSubmit = async (id: string, type: VisitorType, extraData?: any) => {
    setIsProcessing(true);
    try {
      // Check if blocked
      const blockedRef = doc(db, 'blocked', id);
      const blockedSnap = await getDoc(blockedRef);
      if (blockedSnap.exists()) {
        throw new Error("This ID is blocked.");
      }

      let finalExtra = extraData || {};
      if (type !== 'outsider') {
        const memberRef = doc(db, 'members', id);
        const memberSnap = await getDoc(memberRef);
        if (memberSnap.exists()) {
          finalExtra = memberSnap.data();
        } else {
          throw new Error("Member not found. Please check your ID.");
        }
      }

      setVisitorData({ ...finalExtra, identifier: id, type });
      setStep('purpose');
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurposeSubmit = async (purpose: string) => {
    setIsProcessing(true);
    try {
      const finalData = { 
        ...visitorData, 
        purpose,
        check_in: new Date().toISOString(),
        is_blocked: 0
      };
      
      const docRef = await addDoc(collection(db, 'visitors'), finalData);
      setVisitorData({ ...finalData, id: docRef.id as any });
      setStep('success');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'visitors');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async (id: string) => {
    setIsProcessing(true);
    try {
      const q = query(
        collection(db, 'visitors'), 
        where('identifier', '==', id), 
        where('check_out', '==', null)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Try with undefined check if null doesn't work (Firestore sometimes behaves differently)
        const q2 = query(
          collection(db, 'visitors'), 
          where('identifier', '==', id)
        );
        const snap2 = await getDocs(q2);
        const active = snap2.docs.find(d => !d.data().check_out);
        if (!active) throw new Error('No active session found.');
        
        await updateDoc(doc(db, 'visitors', active.id), {
          check_out: new Date().toISOString()
        });
      } else {
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, 'visitors', docId), {
          check_out: new Date().toISOString()
        });
      }

      setStep('success');
      setVisitorData({ ...visitorData, check_out: new Date().toISOString() });
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      {step === 'id' && (
        <IdEntryStep 
          onNext={handleIdSubmit} 
          onCheckOut={handleCheckOut} 
          isDarkMode={isDarkMode} 
          isProcessing={isProcessing}
        />
      )}
      {step === 'purpose' && (
        <PurposeStep 
          onNext={handlePurposeSubmit} 
          onBack={() => setStep('id')} 
          isProcessing={isProcessing}
          isDarkMode={isDarkMode}
        />
      )}
      {step === 'success' && (
        <SuccessStep data={visitorData as Visitor} onReset={() => setStep('id')} />
      )}
      {step === 'error' && (
        <ErrorStep message={errorMessage} onReset={() => setStep('id')} />
      )}
    </div>
  );
}

function IdEntryStep({ onNext, onCheckOut, isDarkMode, isProcessing }: { 
  onNext: (id: string, type: VisitorType, extra?: any) => void,
  onCheckOut: (id: string) => void,
  isDarkMode: boolean,
  isProcessing: boolean
}) {
  const [idInput, setIdInput] = useState('');
  const [isOutsider, setIsOutsider] = useState(false);
  const [outsiderForm, setOutsiderForm] = useState({
    name: '',
    university: '',
    occupation: '',
    address: '',
    contact: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateId = (id: string) => {
    const regex = /^\d{2}-\d{5}-\d{3}$/;
    return regex.test(id);
  };

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          try {
            const data = JSON.parse(code.data);
            setOutsiderForm(data);
            setIsOutsider(true);
          } catch {
            alert("Invalid QR Code format. Please use the outsider form or a valid NEU QR.");
          }
        } else {
          alert("No QR code found in image.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-white/70 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 p-12 flex flex-col items-center">
        <div className="flex items-center gap-6 mb-10 w-full border-b border-slate-100 pb-8">
          <img 
            src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
            alt="NEU Logo" 
            className="w-20 h-20 object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="text-left">
            <h2 className="text-3xl font-bold text-[#0038A8] tracking-tight">LIBRARY VISITOR</h2>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">New Era University</p>
          </div>
        </div>

        {!isOutsider ? (
          <div className="w-full space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Student/Faculty ID</label>
              <input
                type="text"
                placeholder="00-00000-000"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                className="w-full px-8 py-6 rounded-3xl text-3xl font-mono tracking-widest text-center bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-[#0038A8]/10 focus:border-[#0038A8] transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={!validateId(idInput) || isProcessing}
                onClick={() => onNext(idInput, 'student')}
                className="py-6 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] disabled:opacity-80 disabled:shadow-none transition-all"
              >
                {isProcessing ? "..." : "Check In"}
              </button>
              <button
                disabled={!validateId(idInput) || isProcessing}
                onClick={() => onCheckOut(idInput)}
                className="py-6 rounded-2xl font-bold uppercase tracking-widest text-sm bg-slate-900 text-white shadow-lg shadow-slate-900/30 hover:bg-black disabled:opacity-80 disabled:shadow-none transition-all"
              >
                {isProcessing ? "..." : "Check Out"}
              </button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-3/10 border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-300 tracking-[0.4em]">
              <div className="absolute inset-0 flex items-center justify-end"><div className="w-3/10 border-t border-slate-100"></div></div>
                <span className="px-4 ">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleScanClick}
                className="flex items-center justify-center gap-3 py-5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold uppercase tracking-widest text-[10px]"
              >
                <QrCode size={18} />
                Scan QR
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              </button>

              <button
                onClick={() => setIsOutsider(true)}
                className="flex items-center justify-center gap-3 py-5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold uppercase tracking-widest text-[10px]"
              >
                <User size={18} />
                tap/scan ID
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Outsider Form</h3>
              <button onClick={() => setIsOutsider(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Full Name</label>
                <input 
                  type="text" 
                  value={outsiderForm.name}
                  onChange={e => setOutsiderForm({...outsiderForm, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="John Doe"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">University</label>
                  <input 
                    type="text" 
                    value={outsiderForm.university}
                    onChange={e => setOutsiderForm({...outsiderForm, university: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="School"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Occupation</label>
                  <input 
                    type="text" 
                    value={outsiderForm.occupation}
                    onChange={e => setOutsiderForm({...outsiderForm, occupation: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Job"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Address</label>
                <input 
                  type="text" 
                  value={outsiderForm.address}
                  onChange={e => setOutsiderForm({...outsiderForm, address: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="City, Province"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Contact No.</label>
                <input 
                  type="text" 
                  value={outsiderForm.contact}
                  onChange={e => setOutsiderForm({...outsiderForm, contact: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="09XXXXXXXXX"
                />
              </div>

              <button
                onClick={() => onNext('', 'outsider', outsiderForm)}
                className="w-full py-5 mt-4 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] transition-all"
              >
                Submit Form
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PurposeStep({ onNext, onBack, isProcessing, isDarkMode }: { 
  onNext: (purpose: string) => void, 
  onBack: () => void,
  isProcessing: boolean,
  isDarkMode: boolean
}) {
  const [selected, setSelected] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 overflow-hidden">
        <div className="p-10 border-b border-slate-100 flex items-center gap-6">
          <button onClick={onBack} className="p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-600"><ArrowLeft size={24} /></button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Purpose of Visit</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">What brings you to the library today?</p>
          </div>
        </div>

        <div className="p-10 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {PURPOSES.map((p) => (
              <button
                key={p}
                onClick={() => setSelected(p)}
                className={cn(
                  "w-full p-6 rounded-2xl border-2 text-left font-bold transition-all flex items-center justify-between group uppercase tracking-widest text-xs",
                  selected === p 
                    ? "border-blue-500 bg-blue-50 text-blue-600 shadow-lg shadow-blue-500/10"
                    : "border-slate-100 hover:border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {p}
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  selected === p 
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-slate-200 group-hover:border-slate-300"
                )}>
                  {selected === p && <CheckCircle2 size={14} />}
                </div>
              </button>
            ))}
          </div>

          <button
            disabled={!selected || isProcessing}
            onClick={() => onNext(selected)}
            className="w-full mt-6 py-6 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center gap-3"
          >
            {isProcessing ? "Processing..." : "Submit Check-in"}
            {!isProcessing && <ChevronRight size={20} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SuccessStep({ data, onReset }: { data: Visitor, onReset: () => void }) {
  const isCheckOut = !!data.check_out;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 p-12 flex flex-col items-center text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-green-500/30"
        >
          <CheckCircle2 size={48} className="text-white" />
        </motion.div>
        
        <h2 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight uppercase">
          {isCheckOut ? "CHECKED OUT!" : "CHECKED IN!"}
        </h2>
        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mb-10">
          {isCheckOut ? "Thank you for visiting the NEU Library!" : "Welcome! Please observe library protocols."}
        </p>

        <div className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-8 mb-10 text-left space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visitor</span>
            <span className="text-lg font-bold text-slate-900">{data.name}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Number</span>
            <span className="text-lg font-mono font-bold text-slate-900 tracking-widest">{data.identifier}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</span>
            <span className="text-lg font-bold text-slate-900">
              {format(new Date(isCheckOut ? data.check_out! : data.check_in!), 'HH:mm:ss')}
            </span>
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm bg-slate-900 text-white shadow-lg shadow-slate-900/30 hover:bg-black transition-all"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

function ErrorStep({ message, onReset }: { message: string, onReset: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 p-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight uppercase">Access Denied</h2>
        <p className="text-red-500 font-bold mb-10 px-8 text-sm">{message}</p>

        <button
          onClick={onReset}
          className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm bg-slate-900 text-white shadow-lg shadow-slate-900/30 hover:bg-black transition-all"
        >
          Back to Homepage
        </button>
      </div>
    </motion.div>
  );
}

function AdminFlow({ isLoggedIn, onLogin, onLogout, isDarkMode }: { 
  isLoggedIn: boolean, 
  onLogin: () => void, 
  onLogout: () => void,
  isDarkMode: boolean
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'qrs'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [outsiderQrs, setOutsiderQrs] = useState<string[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      const q = query(collection(db, 'visitors'), orderBy('check_in', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const visitorData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as any[];
        setVisitors(visitorData);
        
        // Calculate Stats
        const total = visitorData.length;
        const purposes: Record<string, number> = {};
        const daily: Record<string, number> = {};
        let totalDuration = 0;
        let checkoutCount = 0;

        visitorData.forEach(v => {
          purposes[v.purpose] = (purposes[v.purpose] || 0) + 1;
          const date = format(new Date(v.check_in), 'yyyy-MM-dd');
          daily[date] = (daily[date] || 0) + 1;
          
          if (v.check_out) {
            const duration = (new Date(v.check_out).getTime() - new Date(v.check_in).getTime()) / (1000 * 60);
            totalDuration += duration;
            checkoutCount++;
          }
        });

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
          return { date: d, count: daily[d] || 0 };
        });

        setStats({
          totalVisitors: total,
          purposeStats: Object.entries(purposes).map(([purpose, count]) => ({ purpose, count })),
          dailyStats: last7Days,
          avgDuration: checkoutCount > 0 ? totalDuration / checkoutCount : 0
        });
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'visitors');
      });
      
      fetchQrs();
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  const fetchQrs = async () => {
    // In a real app, these would be in storage or a collection
    // For now, we'll generate them on the fly for the UI
    const mockOutsiders = [
      { name: 'Guest 1', identifier: 'OUT-001' },
      { name: 'Guest 2', identifier: 'OUT-002' }
    ];
    const qrs = await Promise.all(mockOutsiders.map(o => QRCode.toDataURL(JSON.stringify(o))));
    setOutsiderQrs(qrs);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    onLogout();
  };

  const handleBlock = async (id: string, currentlyBlocked: boolean) => {
    try {
      // Find all visitor records for this identifier and update them
      const q = query(collection(db, 'visitors'), where('identifier', '==', id));
      const snap = await getDocs(q);
      const batchPromises = snap.docs.map(d => updateDoc(doc(db, 'visitors', d.id), { is_blocked: currentlyBlocked ? 0 : 1 }));
      await Promise.all(batchPromises);
      
      if (selectedVisitor) setSelectedVisitor({ ...selectedVisitor, is_blocked: currentlyBlocked ? 0 : 1 });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'visitors');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text("NEU Library Visitor Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 22);
    
    const tableData = visitors.map(v => [
      v.name,
      v.type,
      v.identifier,
      v.purpose,
      format(new Date(v.check_in), 'yyyy-MM-dd HH:mm'),
      v.check_out ? format(new Date(v.check_out), 'yyyy-MM-dd HH:mm') : 'Active'
    ]);

    (doc as any).autoTable({
      head: [['Name', 'Type', 'ID', 'Purpose', 'Check In', 'Check Out']],
      body: tableData,
      startY: 30,
    });

    doc.save(`NEU_Library_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex items-center justify-center p-6 w-full"
      >
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 p-12 flex flex-col items-center">
          <div className="flex items-center gap-6 mb-10 w-full border-b border-slate-100 pb-8">
            <img 
              src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
              alt="NEU Logo" 
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <h2 className="text-2xl font-bold text-[#0038A8] tracking-tight">ADMIN PORTAL</h2>
              <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Authorized Only</p>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="w-full space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-[#0038A8] transition-all"
                placeholder="admin@neu.edu.ph"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-[#0038A8] transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3"
              >
                <AlertCircle size={16} />
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] transition-all"
            >
              Sign In
            </button>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    alert("Admin account created successfully! You can now sign in.");
                  } catch (err: any) {
                    setLoginError(err.message);
                  }
                }}
                className="text-[10px] font-bold text-[#0038A8] uppercase tracking-widest hover:underline"
              >
                First time? Create Admin Account
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  const filteredVisitors = visitors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.identifier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Admin Nav */}
      <div className="flex items-center justify-between mb-12">
        <div className="bg-white/90 backdrop-blur-xl p-2 rounded-full shadow-xl border border-white/20 flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all",
              activeTab === 'dashboard' 
                ? "bg-[#0038A8] text-white shadow-lg shadow-blue-900/30" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all",
              activeTab === 'logs' 
                ? "bg-[#0038A8] text-white shadow-lg shadow-blue-900/30" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('qrs')}
            className={cn(
              "px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all",
              activeTab === 'qrs' 
                ? "bg-[#0038A8] text-white shadow-lg shadow-blue-900/30" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            Outsider QRs
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all bg-white/90 backdrop-blur-xl border border-white/20 text-slate-600 shadow-xl hover:bg-white hover:scale-105"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all bg-red-50 border border-red-100 text-red-600 shadow-xl hover:bg-red-100 hover:scale-105"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={<Users className="text-[#0038A8]" />} label="Total Visitors" value={stats?.totalVisitors || 0} isDarkMode={isDarkMode} />
            <StatCard icon={<Clock className="text-[#0038A8]" />} label="Avg. Stay" value={`${Math.round(stats?.avgDuration || 0)} min`} isDarkMode={isDarkMode} />
            <StatCard icon={<Calendar className="text-[#0038A8]" />} label="Today's Count" value={stats?.dailyStats[0]?.count || 0} isDarkMode={isDarkMode} />
            <StatCard icon={<History className="text-[#0038A8]" />} label="Active Sessions" value={visitors.filter(v => !v.check_out).length} isDarkMode={isDarkMode} />
          </div>

          {/* Charts */}
          <div className="lg:col-span-2 p-10 bg-white/90 backdrop-blur-xl rounded-[40px] border border-white/20 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-8 uppercase tracking-tight">Visitor Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.dailyStats.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                      backgroundColor: '#ffffff',
                      color: '#0f172a'
                    }}
                    cursor={{fill: 'rgba(0,0,0,0.02)'}}
                  />
                  <Bar dataKey="count" fill="#0038A8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-10 bg-white/90 backdrop-blur-xl rounded-[40px] border border-white/20 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-8 uppercase tracking-tight">Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.purposeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="count"
                    nameKey="purpose"
                  >
                    {stats?.purposeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '20px', 
                      border: 'none', 
                      boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
                      backgroundColor: '#ffffff',
                      color: '#0f172a'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 space-y-3">
              {stats?.purposeStats.map((p, i) => (
                <div key={p.purpose} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                    <span className="text-slate-500 font-bold">{p.purpose}</span>
                  </div>
                  <span className="font-bold text-slate-900">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-[40px] border border-white/20 shadow-2xl overflow-hidden">
          <div className="p-10 border-b border-slate-100 flex items-center justify-between gap-8">
            <div className="relative flex-1">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search by name or ID number..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-[#0038A8]/10 focus:border-[#0038A8]/30 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-10 py-6">Visitor Profile</th>
                  <th className="px-10 py-6">Category</th>
                  <th className="px-10 py-6">Purpose</th>
                  <th className="px-10 py-6">Check In</th>
                  <th className="px-10 py-6">Current Status</th>
                  <th className="px-10 py-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredVisitors.map((v) => (
                  <tr key={v.id} className="transition-all hover:bg-slate-50 group cursor-pointer" onClick={() => setSelectedVisitor(v)}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                          {v.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{v.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{v.identifier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                        v.type === 'student' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                        v.type === 'faculty' ? "bg-purple-50 text-purple-600 border-purple-100" : 
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {v.type}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{v.purpose}</td>
                    <td className="px-10 py-6 text-[10px] font-bold text-slate-500">{format(new Date(v.check_in), 'MMM dd, HH:mm')}</td>
                    <td className="px-10 py-6">
                      {v.check_out ? (
                        <span className="text-slate-300 text-[9px] font-bold uppercase tracking-widest">Logged Out</span>
                      ) : (
                        <span className="flex items-center gap-2 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                          In Library
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      <div className="p-2 rounded-lg transition-all text-slate-300 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:translate-x-1">
                        <ChevronRight size={20} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {outsiderQrs.map((qr, i) => (
            <div key={i} className="bg-white/90 backdrop-blur-xl rounded-[40px] border border-white/20 shadow-2xl p-10 flex flex-col items-center">
              <h3 className="text-xl font-bold text-slate-900 mb-6 uppercase tracking-tight">Outsider QR {i + 1}</h3>
              <div className="bg-white p-6 rounded-3xl shadow-inner mb-6">
                <img src={qr} alt={`Outsider QR ${i + 1}`} className="w-48 h-48" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Right-click to save image</p>
              <a 
                href={qr} 
                download={`outsider_qr_${i + 1}.png`}
                className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] transition-all text-center"
              >
                Download QR
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Visitor Detail Modal */}
      <AnimatePresence>
        {selectedVisitor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVisitor(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="relative z-10 w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/30">
                    {selectedVisitor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-2">{selectedVisitor.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedVisitor.type} • {selectedVisitor.identifier}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedVisitor(null)} className="p-3 hover:bg-slate-50 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <DetailItem label="Purpose of Visit" value={selectedVisitor.purpose} isDarkMode={isDarkMode} />
                  <DetailItem label="Check In Time" value={format(new Date(selectedVisitor.check_in), 'MMM dd, HH:mm:ss')} isDarkMode={isDarkMode} />
                  <DetailItem label="Check Out Time" value={selectedVisitor.check_out ? format(new Date(selectedVisitor.check_out), 'MMM dd, HH:mm:ss') : 'Currently Active'} isDarkMode={isDarkMode} />
                  {selectedVisitor.type !== 'outsider' ? (
                    <DetailItem label="Program / Department" value={selectedVisitor.department || 'N/A'} isDarkMode={isDarkMode} />
                  ) : (
                    <>
                      <DetailItem label="University" value={selectedVisitor.university || 'N/A'} isDarkMode={isDarkMode} />
                      <DetailItem label="Occupation" value={selectedVisitor.occupation || 'N/A'} isDarkMode={isDarkMode} />
                      <DetailItem label="Contact Number" value={selectedVisitor.contact || 'N/A'} isDarkMode={isDarkMode} />
                      <DetailItem label="Home Address" value={selectedVisitor.address || 'N/A'} isDarkMode={isDarkMode} />
                    </>
                  )}
                </div>

                <div className="pt-8 border-t border-slate-100 flex gap-4">
                  <button
                    onClick={() => handleBlock(selectedVisitor.identifier, selectedVisitor.is_blocked === 1)}
                    className={cn(
                      "flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all",
                      selectedVisitor.is_blocked === 1 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100" 
                        : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                    )}
                  >
                    <Ban size={16} />
                    {selectedVisitor.is_blocked === 1 ? "Unblock Visitor" : "Block Visitor"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, isDarkMode }: { icon: React.ReactNode, label: string, value: string | number, isDarkMode: boolean }) {
  return (
    <div className="p-8 bg-white/90 backdrop-blur-xl rounded-[32px] border border-white/20 shadow-xl flex items-center gap-6 group hover:scale-[1.02] transition-all">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center transition-all shadow-sm group-hover:rotate-6">
        {React.cloneElement(icon as React.ReactElement, { size: 24, className: "transition-colors duration-700" })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value, isDarkMode }: { label: string, value: string, isDarkMode: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function TestPanel({ setMode, currentMode, isAdminLoggedIn, isSplitView, setIsSplitView }: { 
  setMode: (m: 'visitor' | 'admin') => void, 
  currentMode: string,
  isAdminLoggedIn: boolean,
  isSplitView: boolean,
  setIsSplitView: (v: boolean) => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAutoLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, 'chynna.cardona@neu.edu.ph', 'passW@rd');
    } catch (err) {
      // If user doesn't exist, we might need to create it or just show error
      // But for testing, we assume the user exists or they can use the normal login
      alert("Auto-login failed. Please use the admin login form with chynna.cardona@neu.edu.ph / passW@rd");
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border border-white/20 relative"
      >
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-slate-900 animate-ping opacity-20" />
        )}
        {isOpen ? <X size={24} /> : <ShieldCheck size={24} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-80 bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-slate-200 p-6 space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Testing Workspace</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Developer Tools</p>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Workspace Layout</p>
              <button 
                onClick={() => { setIsSplitView(!isSplitView); setIsOpen(false); }}
                className={cn(
                  "w-full py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2",
                  isSplitView ? "bg-blue-500 border-blue-600 text-white" : "bg-slate-50 border-slate-100 text-slate-600"
                )}
              >
                {isSplitView ? "Disable Split View" : "Enable Split View (Workspace)"}
              </button>
            </div>

            {!isSplitView && (
              <div className="space-y-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quick Switch</p>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setMode('visitor'); setIsOpen(false); }}
                    className={cn(
                      "py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all",
                      currentMode === 'visitor' ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-400"
                    )}
                  >
                    Visitor
                  </button>
                  <button 
                    onClick={() => { setMode('admin'); setIsOpen(false); }}
                    className={cn(
                      "py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all",
                      currentMode === 'admin' ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-50 border-slate-100 text-slate-400"
                    )}
                  >
                    Admin
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Admin Actions</p>
              <button 
                onClick={handleAutoLogin}
                disabled={isAdminLoggedIn}
                className="w-full py-3 rounded-xl bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
              >
                {isAdminLoggedIn ? "Admin Logged In" : "Auto-Login as Admin"}
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Test IDs (Seeded)</p>
              <div className="grid grid-cols-1 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[8px] font-mono text-slate-500">00-00000-000 (Student)</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[8px] font-mono text-slate-500">99-99999-999 (Faculty)</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a 
                href="https://console.firebase.google.com/project/gen-lang-client-0207280977/firestore/databases/(default)/data"
                target="_blank"
                rel="noreferrer"
                className="block w-full py-4 rounded-xl bg-slate-900 text-white text-[9px] font-bold uppercase tracking-widest text-center hover:bg-black transition-all"
              >
                Open Firebase Console
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
