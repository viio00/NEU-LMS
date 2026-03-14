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
  Moon,
  Contact
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
import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
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
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

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
  id: string | number;
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

const COLORS = ['#3b82f6', '#1e40af', '#64748b', '#94a3b8', '#0f172a', '#334155'];

// --- Components ---

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'visitor' | 'admin'>('visitor');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isDarkMode = true;
  const [isAuthReady, setIsAuthReady] = useState(false);

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
      isDarkMode ? "bg-brand-dark-bg text-brand-dark-primary" : "bg-brand-light-bg text-brand-light-primary"
    )}>
      {/* Test Panel */}
      <TestPanel 
        setMode={setMode} 
        currentMode={mode} 
        isAdminLoggedIn={isAdminLoggedIn} 
      />

      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://media.licdn.com/dms/image/v2/C561BAQGUxB_pssZkJA/company-background_10000/company-background_10000/0/1591598531597/new_era_university_official_cover?e=2147483647&v=beta&t=F_JgSz6bKmQ4QdmSivXkthtoQ-7j0KNvpoWiwut8y8A" 
          alt="Campus Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[8px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 transition-all duration-700 bg-[#111827]/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-10 h-32 flex items-center justify-between">
          {/* Left Side: Logo & Title */}
          <div className="flex items-center gap-6">
            <img 
              src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
              alt="NEU Logo" 
              className="w-16 h-16 object-contain relative drop-shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight leading-none mb-1 text-white">
                NEU Library System
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">
                {format(currentTime, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Right Side: Actions & Time/Date Below */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 p-1 rounded-xl transition-all duration-300 border bg-white/5 border-white/10">
                <button
                  onClick={() => setMode('visitor')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                    mode === 'visitor' 
                      ? "bg-white text-black shadow-lg"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <User size={14} />
                  Visitor
                </button>
                <button
                  onClick={() => setMode('admin')}
                  className={cn(
                    "px-6 py-2 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                    mode === 'admin' 
                      ? "bg-white text-black shadow-xl"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <ShieldCheck size={14} />
                  Admin
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
              <span className="flex items-center gap-2 font-mono"><Clock size={12} /> {format(currentTime, 'HH:mm:ss')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        "max-w-7xl mx-auto px-4 py-12 relative z-10 min-h-[calc(100vh-6rem)] flex items-center justify-center"
      )}>
        <AnimatePresence mode="wait">
          {mode === 'visitor' ? (
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
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
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
        className="relative z-10 flex flex-col items-center gap-8"
      >
        <img 
          src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
          alt="NEU Logo" 
          className="w-48 h-48 object-contain drop-shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
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
          visitorName={visitorData.name || 'Guest'}
          onNext={handlePurposeSubmit} 
          onBack={() => setStep('id')} 
          isProcessing={isProcessing}
          isDarkMode={isDarkMode}
        />
      )}
      {step === 'success' && (
        <SuccessStep data={visitorData as Visitor} onReset={() => setStep('id')} isDarkMode={isDarkMode} />
      )}
      {step === 'error' && (
        <ErrorStep message={errorMessage} onReset={() => setStep('id')} isDarkMode={isDarkMode} />
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
            if (data.name === 'Guest 1' || data.name === 'Guest 2') {
              onNext(data.name, 'outsider', data);
            } else {
              setOutsiderForm(data);
              setIsOutsider(true);
            }
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
      className="w-full max-w-3xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[40px] shadow-2xl border p-12 flex flex-col items-center transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        <div className="flex items-center justify-start gap-8 mb-12 w-full px-8">
          <img 
            src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
            alt="NEU Logo" 
            className="w-20 h-20 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="text-left">
            <h2 className={cn(
              "text-4xl font-black tracking-tighter leading-none mb-1",
              isDarkMode ? "text-white" : "text-brand-light-primary"
            )}>LIBRARY VISITOR</h2>
            <p className={cn(
              "font-black uppercase tracking-[0.3em] text-[10px]",
              isDarkMode ? "text-white/50" : "text-brand-light-secondary"
            )}>New Era University</p>
          </div>
        </div>

        <div className={cn("w-full h-[1px] mb-12", isDarkMode ? "bg-white/10" : "bg-black/5")} />

        {!isOutsider ? (
          <div className="w-full space-y-12">
            <div className="space-y-4">
              <label className={cn(
                "text-[11px] font-black uppercase tracking-[0.2em] ml-2",
                isDarkMode ? "text-white/80" : "text-brand-light-primary"
              )}>Student/Faculty ID</label>
              <input
                type="text"
                placeholder="00-00000-000"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                className={cn(
                  "w-full px-8 py-8 rounded-3xl text-4xl font-mono tracking-[0.2em] text-center transition-all duration-500 focus:outline-none focus:ring-4",
                  isDarkMode 
                    ? "bg-[#333] border border-white/10 text-white placeholder:text-white/20 focus:ring-white/10 focus:border-white/20" 
                    : "bg-[#e2e8f0] border border-black/5 text-brand-light-primary placeholder:text-black/20 focus:ring-black/10 focus:border-black/20"
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <button
                disabled={!validateId(idInput) || isProcessing}
                onClick={() => onNext(idInput, 'student')}
                className={cn(
                  "py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all duration-500",
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    : "bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
                )}
              >
                {isProcessing ? "..." : "Check In"}
              </button>
              <button
                disabled={!validateId(idInput) || isProcessing}
                onClick={() => onCheckOut(idInput)}
                className={cn(
                  "py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all duration-500",
                  isDarkMode
                    ? "bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-50"
                    : "bg-slate-500 text-white hover:bg-slate-400 disabled:opacity-50"
                )}
              >
                {isProcessing ? "..." : "Check Out"}
              </button>
            </div>

            <div className="relative py-6 flex items-center justify-center">
              <div className={cn("absolute w-full h-[1px]", isDarkMode ? "bg-white/10" : "bg-black/10")} />
              <div className={cn(
                "relative px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                isDarkMode 
                  ? "bg-[#2a2a2a] border-white/10 text-white/60" 
                  : "bg-white border-black/10 text-brand-light-secondary"
              )}>
                Or continue with
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleScanClick}
                className={cn(
                  "py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all duration-300 border",
                  isDarkMode
                    ? "bg-transparent border-white/10 text-white/80 hover:bg-white/5"
                    : "bg-transparent border-black/10 text-brand-light-primary hover:bg-black/5"
                )}
              >
                <Contact size={16} />
                Tap/Scan ID
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="relative group">
                <button
                  className={cn(
                    "w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all duration-300 border",
                    isDarkMode
                      ? "bg-transparent border-white/10 text-white/80 hover:bg-white/5"
                      : "bg-transparent border-black/10 text-brand-light-primary hover:bg-black/5"
                  )}
                >
                  <QrCode size={16} />
                  Scan QR - Outsider
                </button>
                <div className="absolute top-full left-0 w-full mt-2 rounded-xl border bg-[#1A1C1E] border-white/10 shadow-xl z-50 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 text-left text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5 transition-colors"
                  >
                    Scan QR
                  </button>
                  <button
                    onClick={() => setIsOutsider(true)}
                    className="w-full py-3 px-4 text-left text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5 transition-colors"
                  >
                    Proceed to Form
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => setIsOutsider(false)} 
                className={cn(
                  "p-3 rounded-full transition-all duration-300",
                  isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-brand-light-bg text-brand-light-primary hover:bg-black/5"
                )}
              >
                <ArrowLeft size={24} />
              </button>
              <h3 className={cn(
                "text-3xl font-black uppercase tracking-tight",
                isDarkMode ? "text-white" : "text-[#0038A8]"
              )}>Outsider Form</h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <label className={cn(
                  "text-xs font-black uppercase tracking-[0.3em] ml-6",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Full Name</label>
                <input 
                  type="text" 
                  value={outsiderForm.name}
                  onChange={e => setOutsiderForm({...outsiderForm, name: e.target.value})}
                  className={cn(
                    "w-full px-10 py-6 rounded-[32px] text-lg transition-all duration-500 focus:outline-none focus:ring-8",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className={cn(
                    "text-xs font-black uppercase tracking-[0.3em] ml-6",
                    isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                  )}>University</label>
                  <input 
                    type="text" 
                    value={outsiderForm.university}
                    onChange={e => setOutsiderForm({...outsiderForm, university: e.target.value})}
                    className={cn(
                      "w-full px-10 py-6 rounded-[32px] text-lg transition-all duration-500 focus:outline-none focus:ring-8",
                      isDarkMode 
                        ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                        : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                    )}
                    placeholder="School/Org"
                  />
                </div>
                <div className="space-y-4">
                  <label className={cn(
                    "text-xs font-black uppercase tracking-[0.3em] ml-6",
                    isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                  )}>Occupation</label>
                  <input 
                    type="text" 
                    value={outsiderForm.occupation}
                    onChange={e => setOutsiderForm({...outsiderForm, occupation: e.target.value})}
                    className={cn(
                      "w-full px-10 py-6 rounded-[32px] text-lg transition-all duration-500 focus:outline-none focus:ring-8",
                      isDarkMode 
                        ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                        : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                    )}
                    placeholder="Job Title"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className={cn(
                  "text-xs font-black uppercase tracking-[0.3em] ml-6",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Address</label>
                <input 
                  type="text" 
                  value={outsiderForm.address}
                  onChange={e => setOutsiderForm({...outsiderForm, address: e.target.value})}
                  className={cn(
                    "w-full px-10 py-6 rounded-[32px] text-lg transition-all duration-500 focus:outline-none focus:ring-8",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                  placeholder="City, Province"
                />
              </div>

              <div className="space-y-4">
                <label className={cn(
                  "text-xs font-black uppercase tracking-[0.3em] ml-6",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Contact Number</label>
                <input 
                  type="text" 
                  value={outsiderForm.contact}
                  onChange={e => setOutsiderForm({...outsiderForm, contact: e.target.value})}
                  className={cn(
                    "w-full px-10 py-6 rounded-[32px] text-lg transition-all duration-500 focus:outline-none focus:ring-8",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                  placeholder="09XX XXX XXXX"
                />
              </div>

              <button
                disabled={!outsiderForm.name || !outsiderForm.contact || isProcessing}
                onClick={() => onNext(outsiderForm.name, 'outsider', outsiderForm)}
                className={cn(
                  "w-full py-10 mt-6 rounded-[32px] font-black uppercase tracking-widest text-base shadow-2xl transition-all duration-500",
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    : "bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
                )}
              >
                {isProcessing ? "..." : "Check In"}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PurposeStep({ visitorName, onNext, onBack, isProcessing, isDarkMode }: { 
  visitorName: string,
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
      className="w-full max-w-3xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[60px] shadow-2xl border p-16 flex flex-col transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        <div className="flex items-center gap-8 mb-12">
          <button 
            onClick={onBack} 
            className={cn(
              "p-5 rounded-full transition-all duration-500 shadow-xl",
              isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/5 text-brand-light-primary hover:bg-black/10"
            )}
          >
            <ArrowLeft size={32} />
          </button>
          <div>
            <h2 className={cn(
              "text-5xl font-black uppercase tracking-tighter leading-none mb-2",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Purpose of Visit</h2>
            <p className={cn(
              "font-black uppercase tracking-[0.4em] text-xs",
              isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
            )}>Visitor: {visitorName}</p>
          </div>
        </div>

        <div className={cn("w-full h-[1px] mb-12", isDarkMode ? "bg-white/10" : "bg-black/5")} />

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {PURPOSES.map((p) => (
              <button
                key={p}
                onClick={() => setSelected(p)}
                className={cn(
                  "w-full p-10 rounded-[32px] border-2 text-left font-black transition-all duration-500 flex items-center justify-between group uppercase tracking-widest text-sm shadow-xl",
                  selected === p 
                    ? (isDarkMode ? "border-white bg-white/20 text-white" : "border-brand-light-primary bg-brand-light-primary/5 text-brand-light-primary")
                    : (isDarkMode ? "border-white/10 text-brand-dark-secondary hover:border-white/20 hover:bg-white/10" : "border-black/5 text-brand-light-primary/60 hover:border-black/10 hover:bg-black/5")
                )}
              >
                {p}
                <div className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                  selected === p 
                    ? (isDarkMode ? "border-white bg-white text-black" : "border-brand-light-primary bg-brand-light-primary text-white")
                    : (isDarkMode ? "border-white/10" : "border-black/10")
                )}>
                  {selected === p && <CheckCircle2 size={24} />}
                </div>
              </button>
            ))}
          </div>

          <button
            disabled={!selected || isProcessing}
            onClick={() => onNext(selected)}
            className={cn(
              "w-full mt-10 py-10 rounded-[32px] font-black uppercase tracking-widest text-base shadow-2xl transition-all duration-500 flex items-center justify-center gap-4",
              isDarkMode
                ? "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                : "bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
            )}
          >
            {isProcessing ? "Processing..." : "Submit Check-in"}
            {!isProcessing && <ChevronRight size={28} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SuccessStep({ data, onReset, isDarkMode }: { data: Visitor, onReset: () => void, isDarkMode: boolean }) {
  const isCheckOut = !!data.check_out;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[60px] shadow-2xl border p-20 flex flex-col items-center text-center transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
          className={cn(
            "w-40 h-40 rounded-full flex items-center justify-center mb-12 shadow-2xl",
            isCheckOut ? "bg-orange-500" : "bg-green-500"
          )}
        >
          <CheckCircle2 size={80} className="text-white" />
        </motion.div>
        
        <h2 className={cn(
          "text-6xl font-black mb-6 tracking-tighter uppercase leading-none",
          isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
        )}>
          {isCheckOut ? "CHECKED OUT!" : "CHECKED IN!"}
        </h2>
        <p className={cn(
          "font-black uppercase tracking-[0.4em] text-xs mb-16",
          isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
        )}>
          {isCheckOut ? "Thank you for visiting the NEU Library!" : "Welcome! Please observe library protocols."}
        </p>

        <div className={cn(
          "w-full rounded-[40px] p-12 mb-16 text-left space-y-8 border shadow-2xl backdrop-blur-xl",
          isDarkMode ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
        )}>
          <div className={cn("flex justify-between items-center border-b pb-8", isDarkMode ? "border-white/10" : "border-black/5")}>
            <span className={cn("text-xs font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>Visitor</span>
            <span className={cn("text-3xl font-black", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>{data.name}</span>
          </div>
          <div className={cn("flex justify-between items-center border-b pb-8", isDarkMode ? "border-white/10" : "border-black/5")}>
            <span className={cn("text-xs font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>ID Number</span>
            <span className={cn("text-3xl font-mono font-black tracking-[0.2em]", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>{data.identifier}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={cn("text-xs font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>Time</span>
            <span className={cn("text-3xl font-black", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>
              {format(new Date(isCheckOut ? data.check_out! : data.check_in!), 'HH:mm:ss')}
            </span>
          </div>
        </div>

        <button
          onClick={onReset}
          className={cn(
            "w-full py-10 rounded-[32px] font-black uppercase tracking-widest text-base shadow-2xl transition-all duration-500",
            isDarkMode
              ? "bg-white text-black hover:bg-brand-dark-secondary"
              : "bg-brand-light-primary text-white hover:bg-opacity-90"
          )}
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

function ErrorStep({ message, onReset, isDarkMode }: { message: string, onReset: () => void, isDarkMode: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[60px] shadow-2xl border p-16 flex flex-col items-center text-center transition-all duration-500",
        isDarkMode 
          ? "bg-black/40 border-white/10" 
          : "bg-white/40 border-white/20"
      )}>
        <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mb-10 shadow-2xl shadow-red-500/30">
          <AlertCircle size={64} className="text-white" />
        </div>
        <h2 className={cn(
          "text-5xl font-black mb-4 tracking-tight uppercase",
          isDarkMode ? "text-white" : "text-brand-light-primary"
        )}>Access Denied</h2>
        <p className="text-red-500 font-black mb-12 px-12 text-lg">{message}</p>

        <button
          onClick={onReset}
          className={cn(
            "w-full py-8 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl transition-all duration-300",
            isDarkMode
              ? "bg-white text-black hover:bg-slate-200"
              : "bg-brand-light-primary text-white hover:bg-brand-light-secondary"
          )}
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
  const [logFilter, setLogFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [outsiderQrs, setOutsiderQrs] = useState<{qr: string, info: any}[]>([]);

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
            const duration = (new Date(v.check_out).getTime() - new Date(v.check_in).getTime()) / (1000 * 60 * 60);
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
      
      generateOutsiderQrs();
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  const generateOutsiderQrs = async () => {
    const mockOutsiders = [
      { name: 'Guest 1', address: 'Addr 1', university: 'A. University', occupation: 'Visitor', contact: '09123456789' },
      { name: 'Guest 2', address: '123 Random St', university: 'Random University', occupation: 'Guest', contact: '09987654321' }
    ];
    const qrs = await Promise.all(mockOutsiders.map(async (o) => {
      const qr = await QRCode.toDataURL(JSON.stringify(o));
      return { qr, info: o };
    }));
    setOutsiderQrs(qrs);
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === 'chynna.cardona@neu.edu.ph') {
        onLogin();
      } else {
        await signOut(auth);
        setLoginError("Access denied. Only authorized administrators can log in.");
      }
    } catch (err: any) {
      setLoginError("Failed to sign in with Google. Please try again.");
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
    doc.setFontSize(18);
    doc.text("NEU Library System", 14, 20);
    doc.setFontSize(10);
    doc.text(format(new Date(), 'MMMM d, yyyy'), 14, 28);
    
    // Statistics Table
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: [
        ['Total Visitors', stats?.totalVisitors || 0],
        ['Average Stay', `${(stats?.avgDuration || 0).toFixed(1)} hrs`],
        ['Active Sessions', visitors.filter(v => !v.check_out).length],
        ...((stats?.purposeStats || []).map(p => [`Purpose: ${p.purpose}`, p.count]))
      ],
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [17, 24, 39] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 30;

    const tableData = filteredVisitors.map(v => [
      v.name,
      v.type,
      v.identifier,
      v.purpose,
      format(new Date(v.check_in), 'yyyy-MM-dd HH:mm'),
      v.check_out ? format(new Date(v.check_out), 'yyyy-MM-dd HH:mm') : 'Active'
    ]);

    autoTable(doc, {
      head: [['Name', 'Type', 'ID', 'Purpose', 'Check In', 'Check Out']],
      body: tableData,
      startY: finalY + 15,
      theme: 'striped',
      headStyles: { fillColor: [17, 24, 39] }
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
        <div className={cn(
          "w-full max-w-2xl backdrop-blur-3xl rounded-[60px] shadow-2xl border p-16 flex flex-col items-center transition-all duration-500",
          isDarkMode 
            ? "bg-black/40 border-white/10" 
            : "bg-white/40 border-white/20"
        )}>
          <div className="flex items-center gap-6 mb-12 w-full">
            <img 
              src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
              alt="NEU Logo" 
              className="w-24 h-24 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <h2 className={cn(
                "text-5xl font-black tracking-tight leading-tight",
                isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
              )}>ADMIN PORTAL</h2>
              <p className={cn(
                "font-bold uppercase tracking-[0.3em] text-[11px]",
                isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-primary/60"
              )}>Authorized Only</p>
            </div>
          </div>

          <div className="w-full h-[1px] bg-black/5 dark:bg-white/5 mb-12" />
          
          <div className="w-full space-y-8">
            <div className="text-center space-y-6">
              <p className={cn(
                "text-sm font-bold uppercase tracking-widest",
                isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
              )}>
                Authorized Access Only
              </p>
              
              <button
                onClick={handleGoogleLogin}
                className={cn(
                  "w-full py-8 rounded-[32px] font-black uppercase tracking-widest text-sm shadow-2xl transition-all duration-500 flex items-center justify-center gap-4 group",
                  isDarkMode
                    ? "bg-white text-black hover:bg-brand-dark-secondary"
                    : "bg-brand-light-primary text-white hover:bg-opacity-90"
                )}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Sign In with Google
              </button>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black flex items-center gap-4"
              >
                <AlertCircle size={20} />
                {loginError}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.identifier.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (logFilter === 'all') return true;
    
    const checkInDate = new Date(v.check_in);
    const now = new Date();
    
    if (logFilter === 'today') {
      return format(checkInDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    } else if (logFilter === 'week') {
      return checkInDate >= subDays(now, 7);
    } else if (logFilter === 'month') {
      return checkInDate >= subDays(now, 30);
    } else if (logFilter === 'year') {
      return checkInDate >= subDays(now, 365);
    }
    
    return true;
  });

  return (
    <div className="space-y-12">
      {/* Admin Nav */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
        <div className={cn(
          "backdrop-blur-3xl p-3 rounded-[32px] shadow-2xl border flex gap-3 transition-all duration-500",
          isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
        )}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-10 py-4 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all duration-500",
              activeTab === 'dashboard' 
                ? (isDarkMode ? "bg-white text-black shadow-2xl" : "bg-brand-light-primary text-white shadow-2xl")
                : (isDarkMode ? "text-brand-dark-secondary hover:text-brand-dark-primary hover:bg-white/5" : "text-brand-light-secondary hover:text-brand-light-primary hover:bg-black/5")
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-10 py-4 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all duration-500",
              activeTab === 'logs' 
                ? (isDarkMode ? "bg-white text-black shadow-2xl" : "bg-brand-light-primary text-white shadow-2xl")
                : (isDarkMode ? "text-brand-dark-secondary hover:text-brand-dark-primary hover:bg-white/5" : "text-brand-light-secondary hover:text-brand-light-primary hover:bg-black/5")
            )}
          >
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('qrs')}
            className={cn(
              "px-10 py-4 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all duration-500",
              activeTab === 'qrs' 
                ? (isDarkMode ? "bg-white text-black shadow-2xl" : "bg-brand-light-primary text-white shadow-2xl")
                : (isDarkMode ? "text-brand-dark-secondary hover:text-brand-dark-primary hover:bg-white/5" : "text-brand-light-secondary hover:text-brand-light-primary hover:bg-black/5")
            )}
          >
            Outsider QRs
          </button>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={generatePDF}
            className={cn(
              "flex items-center gap-4 px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all duration-500 backdrop-blur-3xl border shadow-2xl hover:scale-105 group",
              isDarkMode 
                ? "bg-white/5 border-white/10 text-brand-dark-primary hover:bg-white/10" 
                : "bg-white border-black/5 text-brand-light-primary hover:bg-black/5"
            )}
          >
            <Download size={20} className="group-hover:translate-y-1 transition-transform" />
            Export PDF
          </button>
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-4 px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-[11px] transition-all duration-500 border shadow-2xl hover:scale-105 group",
              isDarkMode
                ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                : "bg-red-50 border border-red-100 text-red-600 hover:bg-red-100"
            )}
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatCard icon={<Users />} label="Total Visitors" value={stats?.totalVisitors || 0} isDarkMode={isDarkMode} />
            <StatCard icon={<Clock />} label="Avg. Stay" value={`${(stats?.avgDuration || 0).toFixed(1)} hrs`} isDarkMode={isDarkMode} />
            <StatCard icon={<Calendar />} label="Today's Count" value={stats?.dailyStats[0]?.count || 0} isDarkMode={isDarkMode} />
            <StatCard icon={<History />} label="Active Sessions" value={visitors.filter(v => !v.check_out).length} isDarkMode={isDarkMode} />
          </div>

          {/* Charts */}
          <div className={cn(
            "lg:col-span-2 p-12 backdrop-blur-3xl rounded-[60px] border shadow-2xl transition-all duration-500",
            isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
          )}>
            <h3 className={cn(
              "text-2xl font-black mb-10 uppercase tracking-tighter",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Visitor Trends</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.dailyStats.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900'}} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900'}} 
                  />
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '32px', 
                      border: 'none', 
                      boxShadow: '0 40px 80px -12px rgba(0,0,0,0.25)',
                      backgroundColor: '#1A1C1E',
                      color: '#ffffff',
                      padding: '24px'
                    }}
                    cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[16, 16, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(
            "p-12 backdrop-blur-3xl rounded-[60px] border shadow-2xl transition-all duration-500",
            isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
          )}>
            <h3 className={cn(
              "text-2xl font-black mb-10 uppercase tracking-tighter",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Distribution</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.purposeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={10}
                    dataKey="count"
                    nameKey="purpose"
                  >
                    {stats?.purposeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      borderRadius: '32px', 
                      border: 'none', 
                      boxShadow: '0 40px 80px -12px rgba(0,0,0,0.25)',
                      backgroundColor: '#1A1C1E',
                      color: '#ffffff',
                      padding: '24px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
              {stats?.purposeStats.map((p, i) => (
                <div key={p.purpose} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                    <span className={cn(
                      "font-black uppercase tracking-widest",
                      "text-brand-dark-secondary"
                    )}>{p.purpose}</span>
                  </div>
                  <span className={cn(
                    "font-black",
                    "text-brand-dark-primary"
                  )}>{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'logs' ? (
        <div className={cn(
          "backdrop-blur-3xl rounded-[60px] border shadow-2xl overflow-hidden transition-all duration-500",
          isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
        )}>
          <div className={cn(
            "p-12 border-b flex flex-col md:flex-row items-center justify-between gap-10",
            isDarkMode ? "border-white/5" : "border-black/5"
          )}>
            <div className="relative flex-1 w-full flex gap-4">
              <div className="relative flex-1">
                <Search className={cn(
                  "absolute left-10 top-1/2 -translate-y-1/2",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )} size={24} />
                <input
                  type="text"
                  placeholder="Search by name or ID number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-20 pr-10 py-7 rounded-[32px] text-lg font-black transition-all duration-500 focus:outline-none focus:ring-8",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-white border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                />
              </div>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as any)}
                className={cn(
                  "px-8 py-7 rounded-[32px] text-sm font-black uppercase tracking-widest transition-all duration-500 focus:outline-none focus:ring-8 appearance-none cursor-pointer",
                  isDarkMode 
                    ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary focus:ring-white/5 focus:border-white/20" 
                    : "bg-white border-2 border-black/5 text-brand-light-primary focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                )}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="year">Past Year</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={cn(
                "text-[11px] font-black uppercase tracking-[0.3em] border-b",
                isDarkMode ? "text-brand-dark-secondary border-white/5" : "text-brand-light-secondary border-black/5"
              )}>
                <tr>
                  <th className="px-12 py-10">Visitor Profile</th>
                  <th className="px-12 py-10">Category</th>
                  <th className="px-12 py-10">Purpose</th>
                  <th className="px-12 py-10">Check In</th>
                  <th className="px-12 py-10">Current Status</th>
                  <th className="px-12 py-10">Actions</th>
                </tr>
              </thead>
              <tbody className={cn(
                "divide-y",
                isDarkMode ? "divide-white/5" : "divide-black/5"
              )}>
                {filteredVisitors.map((v) => (
                  <tr 
                    key={v.id} 
                    className={cn(
                      "transition-all group cursor-pointer",
                      isDarkMode ? "hover:bg-white/5" : "hover:bg-brand-light-secondary/5"
                    )} 
                    onClick={() => setSelectedVisitor(v)}
                  >
                    <td className="px-12 py-8">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-[20px] flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform",
                          isDarkMode 
                            ? "bg-brand-dark-secondary/10 border border-brand-dark-secondary/20 text-brand-dark-primary" 
                            : "bg-brand-light-secondary/10 border border-brand-light-secondary/20 text-brand-light-primary"
                        )}>
                          {v.name.charAt(0)}
                        </div>
                        <div>
                          <p className={cn(
                            "text-lg font-black tracking-tight",
                            isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
                          )}>{v.name}</p>
                          <p className={cn(
                            "text-[11px] font-black tracking-[0.2em] uppercase",
                            isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                          )}>{v.identifier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-12 py-8">
                      <span className={cn(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        v.type === 'student' 
                          ? (isDarkMode ? "bg-brand-dark-secondary/10 text-brand-dark-secondary border-brand-dark-secondary/20" : "bg-brand-light-secondary/10 text-brand-light-primary border-brand-light-secondary/20") : 
                        v.type === 'faculty' 
                          ? (isDarkMode ? "bg-brand-dark-accent/10 text-brand-dark-accent border-brand-dark-accent/20" : "bg-brand-light-accent/10 text-brand-light-accent border-brand-light-accent/20") : 
                          (isDarkMode ? "bg-brand-dark-secondary/10 text-brand-dark-secondary border-brand-dark-secondary/20" : "bg-brand-light-secondary/10 text-brand-light-primary border-brand-light-secondary/20")
                      )}>
                        {v.type}
                      </span>
                    </td>
                    <td className={cn(
                      "px-12 py-8 text-[11px] font-black uppercase tracking-widest",
                      isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-primary/60"
                    )}>{v.purpose}</td>
                    <td className={cn(
                      "px-12 py-8 text-[11px] font-black",
                      isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-primary/60"
                    )}>{format(new Date(v.check_in), 'MMM dd, HH:mm')}</td>
                    <td className="px-12 py-8">
                      {v.check_out ? (
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          isDarkMode ? "text-white/20" : "text-slate-300"
                        )}>Logged Out</span>
                      ) : (
                        <span className="flex items-center gap-3 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                          In Library
                        </span>
                      )}
                    </td>
                    <td className="px-12 py-8">
                      <div className={cn(
                        "p-3 rounded-xl transition-all group-hover:translate-x-2",
                        isDarkMode ? "text-white/20 group-hover:text-white group-hover:bg-white/5" : "text-brand-light-secondary/40 group-hover:text-brand-light-primary group-hover:bg-brand-light-secondary/10"
                      )}>
                        <ChevronRight size={24} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'qrs' ? (
        <div className={cn(
          "backdrop-blur-3xl rounded-[60px] border shadow-2xl p-16 transition-all duration-500",
          isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
        )}>
          <div className="flex items-center justify-between mb-12">
            <h3 className={cn(
              "text-3xl font-black uppercase tracking-tight",
              isDarkMode ? "text-white" : "text-slate-900"
            )}>Outsider QR Codes</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {outsiderQrs.map((item, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedVisitor({
                  id: `guest-${i}`,
                  name: item.info.name,
                  type: 'outsider',
                  identifier: 'N/A',
                  purpose: 'N/A',
                  check_in: new Date().toISOString(),
                  is_blocked: 0,
                  address: item.info.address,
                  university: item.info.university,
                  occupation: item.info.occupation,
                  contact: item.info.contact
                })}
                className={cn(
                "p-8 rounded-[40px] border flex flex-col items-center gap-6 group hover:scale-105 transition-all duration-500 cursor-pointer",
                isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
              )}>
                <div className="p-4 bg-white rounded-[24px] shadow-lg">
                  <img src={item.qr} alt="QR" className="w-full h-full" />
                </div>
                <p className={cn(
                  "text-[11px] font-black uppercase tracking-widest text-center",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>{item.info.name}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Visitor Detail Modal */}
      <AnimatePresence>
        {selectedVisitor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVisitor(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className={cn(
                "relative z-10 w-full max-w-2xl backdrop-blur-3xl rounded-[60px] shadow-2xl border p-16 overflow-hidden transition-all duration-500",
                isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
              )}
            >
              <div className={cn(
                "pb-12 border-b flex items-center justify-between mb-12",
                isDarkMode ? "border-white/5" : "border-black/5"
              )}>
                <div className="flex items-center gap-8">
                  <div className={cn(
                    "w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-4xl shadow-xl",
                    isDarkMode 
                      ? "bg-brand-dark-secondary/10 border border-brand-dark-secondary/20 text-brand-dark-primary" 
                      : "bg-brand-light-secondary/10 border border-brand-light-secondary/20 text-brand-light-primary"
                  )}>
                    {selectedVisitor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className={cn(
                      "text-4xl font-black tracking-tight mb-2",
                      isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
                    )}>{selectedVisitor.name}</h3>
                    <p className={cn(
                      "text-[11px] font-black uppercase tracking-widest",
                      isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                    )}>{selectedVisitor.type} • {selectedVisitor.identifier}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVisitor(null)} 
                  className={cn(
                    "p-5 rounded-full transition-all",
                    isDarkMode ? "bg-white/5 text-brand-dark-secondary hover:text-brand-dark-primary" : "bg-brand-light-bg text-brand-light-secondary hover:text-brand-light-primary"
                  )}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-10">
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

                <div className={cn(
                  "pt-10 border-t flex gap-6",
                  isDarkMode ? "border-white/5" : "border-slate-100"
                )}>
                  <button
                    onClick={() => handleBlock(selectedVisitor.identifier, selectedVisitor.is_blocked === 1)}
                    className={cn(
                      "flex-1 py-6 rounded-[24px] font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-4 transition-all duration-300 shadow-xl",
                      selectedVisitor.is_blocked === 1 
                        ? (isDarkMode ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100")
                        : (isDarkMode ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100")
                    )}
                  >
                    <Ban size={20} />
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
    <div className={cn(
      "p-8 backdrop-blur-3xl rounded-[40px] border shadow-xl flex items-center gap-8 group hover:scale-[1.02] transition-all duration-500",
      isDarkMode 
        ? "bg-[#2a2a2a]/40 border-white/10" 
        : "bg-white/40 border-black/5"
    )}>
      <div className={cn(
        "w-20 h-20 rounded-[24px] flex items-center justify-center transition-all shadow-sm group-hover:rotate-6",
        isDarkMode ? "bg-brand-dark-secondary/10 border border-brand-dark-secondary/20" : "bg-brand-light-secondary/10 border border-brand-light-secondary/20"
      )}>
        {React.cloneElement(icon as React.ReactElement, { 
          size: 32, 
          className: cn(
            "transition-colors duration-700",
            isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
          ) 
        })}
      </div>
      <div>
        <p className={cn(
          "text-[11px] font-black uppercase tracking-widest mb-1.5",
          isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
        )}>{label}</p>
        <p className={cn(
          "text-4xl font-black tracking-tight",
          isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
        )}>{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value, isDarkMode }: { label: string, value: string, isDarkMode: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className={cn(
        "text-[11px] font-black uppercase tracking-widest",
        isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
      )}>{label}</p>
      <p className={cn(
        "text-xl font-black tracking-tight",
        isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
      )}>{value}</p>
    </div>
  );
}

function TestPanel({ setMode, currentMode, isAdminLoggedIn }: { 
  setMode: (m: 'visitor' | 'admin') => void, 
  currentMode: string,
  isAdminLoggedIn: boolean
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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quick Switch</p>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => { setMode('visitor'); setIsOpen(false); }}
                  className={cn(
                    "py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all",
                    currentMode === 'visitor' ? "bg-brand-light-secondary/10 border-brand-light-secondary/20 text-brand-light-primary" : "bg-brand-light-bg border-black/5 text-brand-light-secondary"
                  )}
                >
                  Visitor
                </button>
                <button 
                  onClick={() => { setMode('admin'); setIsOpen(false); }}
                  className={cn(
                    "py-3 rounded-xl text-[9px] font-bold uppercase tracking-widest border transition-all",
                    currentMode === 'admin' ? "bg-brand-light-secondary/10 border-brand-light-secondary/20 text-brand-light-primary" : "bg-brand-light-bg border-black/5 text-brand-light-secondary"
                  )}
                >
                  Admin
                </button>
              </div>
            </div>

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