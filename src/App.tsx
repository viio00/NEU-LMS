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
import { format, subDays, isSameDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
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
  type: string; // Changed from VisitorType to string to support more roles
  identifier: string;
  email?: string;
  photoURL?: string;
  department?: string;
  university?: string;
  occupation?: string;
  address?: string;
  contact?: string;
  purpose: string;
  check_in: string;
  is_blocked: number;
}

interface Stats {
  totalVisitors: number;
  purposeStats: { purpose: string; count: number }[];
  dailyStats: { date: string; count: number }[];
  avgVisitsPerDay: number;
  peakHour: string;
}

// --- Constants ---
const ADMINS = [
  'chynna.cardona@neu.edu.ph',
  'jcesperanza@neu.edu.ph'
];
const OWNERS = [
  'chynna.cardona@neu.edu.ph',
  'jcesperanza@neu.edu.ph'
];
const ADMIN_PASSWORD = 'passW@rd';

const COLLEGES = [
  'Not Applicable / Outsider',
  'College of Accountancy',
  'College of Business Administration',
  'College of Criminology',
  'College of Education',
  'College of Engineering and Architecture',
  'College of Law',
  'College of Medical Technology',
  'College of Midwifery',
  'College of Arts and Sciences',
  'College of Nursing',
  'College of Informatics and Computing Studies',
  'College of Respiratory Therapy',
  'College of Physical Therapy',
  'School of International Relations',
  'Graduate Studies',
  'Integrated School'
];

const ROLES = [
  'Student',
  'Faculty',
  'Employee',
  'Outsider'
];

const PURPOSES = [
  'Research/thesis',
  'Study',
  'Use of Computer',
  'Boardgames/pass time',
  'Seminar/Meeting',
  'Others'
];

const COLORS = ['#3b82f6', '#1e40af', '#64748b', '#94a3b8', '#0f172a', '#334155'];

// --- Components ---

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [mode, setMode] = useState<'visitor' | 'admin'>('visitor');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isDarkMode = true;
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = (user.email || '').toLowerCase().trim();
        setUserEmail(email);
        // ONLY THE 2 OWNERS are allowed to be admins
        const isAdminEmail = ADMINS.some(e => e.toLowerCase().trim() === email);
        const isOwnerEmail = OWNERS.some(e => e.toLowerCase().trim() === email);
        
        setIsAdminLoggedIn(isAdminEmail);
        setIsOwner(isOwnerEmail);
      } else {
        setIsAdminLoggedIn(false);
        setIsOwner(false);
        setUserEmail(null);
      }
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
      const members = [
        { identifier: '00-00000-000', name: 'Lastname1, Firstname I.', type: 'student', department: '2nd Year BS Information Technology', university: 'New Era University', occupation: 'Student', address: '--', contact: '--' },
        { identifier: '11-11111-111', name: 'Lastname2, Firstname II.', type: 'student', department: '4th Year BS Computer Science', university: 'New Era University', occupation: 'Student', address: '--', contact: '--' },
        { identifier: '22-22222-222', name: 'Lastname3, Firstname III', type: 'student', department: '1st Year BS Medical Technology', university: 'New Era University', occupation: 'Student', address: '--', contact: '--' },
        { identifier: '99-99999-999', name: 'Employee 1', type: 'faculty', department: 'CICS Department', university: 'New Era University', occupation: 'Faculty', address: '--', contact: '--' },
        { identifier: '77-77777-777', name: 'Employee 2', type: 'faculty', department: 'CAS Department', university: 'New Era University', occupation: 'Faculty', address: '--', contact: '--' },
        { identifier: 'ST-2024-001', name: 'Cardona, Chynna M.', email: 'chynna.cardona@neu.edu.ph', type: 'student', department: 'CICS Department', university: 'New Era University', occupation: 'Student', address: '--', contact: '--' },
        { identifier: 'FC-2024-001', name: 'Esperanza, J.C.', email: 'jcesperanza@neu.edu.ph', type: 'faculty', department: 'CICS Department', university: 'New Era University', occupation: 'Faculty', address: '--', contact: '--' },
      ];
      
      for (const m of members) {
        // Use setDoc to ensure these members always exist with correct data
        await setDoc(doc(db, 'members', m.identifier), m, { merge: true });
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
      {(isAdminLoggedIn || isOwner) && (
        <TestPanel 
          setMode={setMode} 
          currentMode={mode} 
          isAdminLoggedIn={isAdminLoggedIn}
          setIsAdminLoggedIn={setIsAdminLoggedIn}
          isOwner={isOwner}
        />
      )}

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
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Left Side: Logo & Title */}
          <div className="flex items-center gap-4">
            <img 
              src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
              alt="NEU Logo" 
              className="w-10 h-10 object-contain relative drop-shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <h1 className="text-lg font-black tracking-tight leading-none mb-0.5 text-white">
                NEU Library Visitor Management
              </h1>
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white/50">
                {format(currentTime, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Right Side: Actions & Time/Date Below */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-1 rounded-lg transition-all duration-300 border bg-white/5 border-white/10">
              <button
                onClick={() => setMode('visitor')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                  mode === 'visitor' 
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white"
                )}
              >
                <User size={12} />
                Visitor
              </button>
              <button
                onClick={() => setMode('admin')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                  mode === 'admin' 
                    ? "bg-white text-black shadow-xl"
                    : "text-white/60 hover:text-white"
                )}
              >
                <ShieldCheck size={12} />
                Admin
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              <span className="flex items-center gap-2 font-mono"><Clock size={10} /> {format(currentTime, 'HH:mm:ss')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={cn(
        "max-w-6xl mx-auto px-4 py-6 relative z-10 min-h-[calc(100vh-5rem)] flex items-center justify-center"
      )}>
        <AnimatePresence mode="wait">
          {mode === 'visitor' ? (
            <motion.div key="visitor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full flex justify-center">
              <VisitorFlow isDarkMode={isDarkMode} />
            </motion.div>
          ) : (
            <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
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
  const [step, setStep] = useState<'id' | 'details' | 'purpose' | 'success' | 'error'>('id');
  const [visitorData, setVisitorData] = useState<Partial<Visitor>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInstitutional, setIsInstitutional] = useState(false);

  const handleIdSubmit = async (id: string, type: string, extraData?: any, email?: string, photoURL?: string, institutional: boolean = false) => {
    setIsProcessing(true);
    setIsInstitutional(institutional);
    try {
      let finalId = id || email || 'GUEST';
      let finalExtra = extraData || {};
      let searchEmail = email || (id.includes('@') ? id : undefined);

      // If email is provided, try to find the member by email first
      if (searchEmail) {
        const membersRef = collection(db, 'members');
        const qEmail = query(membersRef, where('email', '==', searchEmail));
        const emailSnap = await getDocs(qEmail);
        
        if (!emailSnap.empty) {
          const memberData = emailSnap.docs[0].data();
          finalId = memberData.identifier;
          finalExtra = { ...memberData, ...extraData };
        }
      }

      // Check if blocked
      const blockedRef = doc(db, 'blocked', finalId);
      const blockedSnap = await getDoc(blockedRef);
      if (blockedSnap.exists()) {
        throw new Error("This ID/Account is blocked.");
      }

      const dataToSet: any = { 
        ...finalExtra, 
        identifier: finalId, 
        type: finalExtra.type || type || 'Student',
        name: finalExtra.name || extraData?.name || '',
        department: type === 'outsider' ? 'Not Applicable / Outsider' : (finalExtra.department || '')
      };
      if (email) dataToSet.email = email;
      if (photoURL) dataToSet.photoURL = photoURL;
      setVisitorData(dataToSet);

      if (type === 'outsider') {
        if (dataToSet.purpose) {
          // Handle outsider check-in directly (from form)
          const finalData = { 
            ...dataToSet, 
            check_in: new Date().toISOString(),
            is_blocked: 0
          };
          const docRef = await addDoc(collection(db, 'visitors'), finalData);
          setVisitorData(prev => ({ ...prev, ...finalData, id: docRef.id as any }));
          setStep('success');
        } else {
          // Skip details, go to purpose
          setStep('purpose');
        }
      } else {
        setStep('details');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetailsSubmit = (dept: string, role: string) => {
    setVisitorData(prev => ({ ...prev, department: dept, type: role }));
    setStep('purpose');
  };

  const handlePurposeSubmit = React.useCallback(async (purpose: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const finalData = { 
        ...visitorData, 
        purpose,
        check_in: new Date().toISOString(),
        is_blocked: 0
      };
      
      const docRef = await addDoc(collection(db, 'visitors'), finalData);
      
      // Update local state with the new ID
      setVisitorData(prev => ({ ...prev, ...finalData, id: docRef.id as any }));
      
      // Transition to success step
      setStep('success');
    } catch (err: any) {
      console.error("VisitorFlow: Error in handlePurposeSubmit:", err);
      setErrorMessage(err.message || "Failed to complete check-in. Please try again.");
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [visitorData, isProcessing]);

  const handleReset = React.useCallback(() => {
    setStep('id');
    setVisitorData({});
    setIsInstitutional(false);
  }, []);

  return (
    <div className="w-full max-w-2xl">
      <AnimatePresence mode="wait">
        {step === 'id' && (
          <motion.div
            key="id-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <IdEntryStep 
              onNext={handleIdSubmit} 
              isDarkMode={isDarkMode} 
              isProcessing={isProcessing}
            />
          </motion.div>
        )}
        {step === 'details' && (
          <motion.div
            key="details-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <DetailsStep
              onNext={handleDetailsSubmit}
              onBack={() => setStep('id')}
              isDarkMode={isDarkMode}
              isInstitutional={isInstitutional}
            />
          </motion.div>
        )}
        {step === 'purpose' && (
          <motion.div
            key="purpose-step"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <PurposeStep 
              visitorName={visitorData.name || visitorData.email || 'Guest'}
              onNext={handlePurposeSubmit} 
              onBack={() => setStep('details')} 
              isProcessing={isProcessing}
              isDarkMode={isDarkMode}
            />
          </motion.div>
        )}
        {step === 'success' && (
          <motion.div
            key="success-step"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <SuccessStep data={visitorData as Visitor} onReset={handleReset} isDarkMode={isDarkMode} />
          </motion.div>
        )}
        {step === 'error' && (
          <motion.div
            key="error-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ErrorStep message={errorMessage} onReset={() => setStep('id')} isDarkMode={isDarkMode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IdEntryStep({ onNext, isDarkMode, isProcessing }: { 
  onNext: (id: string, type: string, extra?: any, email?: string, photoURL?: string, institutional?: boolean) => void,
  isDarkMode: boolean,
  isProcessing: boolean
}) {
  const [idInput, setIdInput] = useState('');
  const [isOutsider, setIsOutsider] = useState(false);
  const [qrMode, setQrMode] = useState<'in' | 'out'>('in');
  const qrModeRef = useRef<'in' | 'out'>('in');
  const [outsiderForm, setOutsiderForm] = useState({
    name: '',
    email: '',
    contact: '',
    purpose: ''
  });
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateId = (id: string) => {
    const regex = /^\d{2}-\d{5}-\d{3}$/;
    return regex.test(id) || id.length > 5;
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const email = (result.user.email || '').toLowerCase().trim();
      
      const isInstitutional = email.endsWith('@neu.edu.ph');
      
      if (!isInstitutional) {
        setShowDeniedModal(true);
        setIsOutsider(true);
        await signOut(auth);
        return;
      }

      onNext('', 'Student', { name: result.user.displayName }, email, result.user.photoURL || undefined, true);
    } catch (err) {
      console.error(err);
    }
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
              onNext(data.name, 'outsider', { ...data, identifier: data.name });
            } else if (data.type === 'outsider') {
              onNext(data.identifier || data.name, 'outsider', data);
            } else {
              // If it's a JSON but not an outsider, maybe it's a student with extra data
              onNext(data.identifier || data.id || '', data.type || 'Student', data);
            }
          } catch {
            // Not a JSON, maybe it's just a plain text ID
            if (validateId(code.data.trim())) {
              onNext(code.data.trim(), 'Student');
            } else {
              alert("Invalid QR Code format. Please use the outsider form or a valid NEU QR.");
            }
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
      <div className={cn(
        "backdrop-blur-3xl rounded-[32px] shadow-2xl border p-6 flex flex-col items-center transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        <div className="flex items-center justify-start gap-4 mb-4 w-full px-4">
          <img 
            src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
            alt="NEU Logo" 
            className="w-10 h-10 object-contain drop-shadow-md"
            referrerPolicy="no-referrer"
          />
          <div className="text-left">
            <h2 className={cn(
              "text-xl font-black tracking-tighter leading-none mb-1",
              isDarkMode ? "text-white" : "text-brand-light-primary"
            )}>LIBRARY VISITOR</h2>
            <p className={cn(
              "font-black uppercase tracking-[0.3em] text-[10px]",
              isDarkMode ? "text-white/50" : "text-brand-light-secondary"
            )}>New Era University</p>
          </div>
        </div>

        <div className={cn("w-full h-[1px] mb-6", isDarkMode ? "bg-white/10" : "bg-black/5")} />

        {!isOutsider ? (
          <div className="w-full space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={cn(
                  "text-[9px] font-black uppercase tracking-[0.2em] ml-2",
                  isDarkMode ? "text-white/80" : "text-brand-light-primary"
                )}>Student/Faculty ID</label>
                <input
                  type="text"
                  placeholder="00-00000-000"
                  value={idInput}
                  onChange={(e) => setIdInput(e.target.value)}
                  className={cn(
                    "w-full px-4 py-3 rounded-2xl text-xl font-mono tracking-[0.2em] text-center transition-all duration-500 focus:outline-none focus:ring-4",
                    isDarkMode 
                      ? "bg-[#333] border border-white/10 text-white placeholder:text-white/20 focus:ring-white/10 focus:border-white/20" 
                      : "bg-[#e2e8f0] border border-black/5 text-brand-light-primary placeholder:text-black/20 focus:ring-black/10 focus:border-black/20"
                  )}
                />
              </div>

              <button
                onClick={handleGoogleLogin}
                className={cn(
                  "w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300 border shadow-md",
                  isDarkMode
                    ? "bg-white text-black hover:bg-slate-100 border-white/10"
                    : "bg-brand-light-primary text-white hover:bg-opacity-90 border-black/5"
                )}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                Connect with Institutional Email
              </button>
            </div>

            <div className="flex gap-3 h-14">
              <button
                disabled={!validateId(idInput) || isProcessing}
                onClick={() => onNext(idInput, 'Student')}
                className={cn(
                  "w-full rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all duration-500",
                  isDarkMode
                    ? "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                    : "bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
                )}
              >
                {isProcessing ? "..." : "Check In"}
              </button>
            </div>

            <div className="relative py-4 flex items-center justify-center">
              <div className={cn("absolute w-full h-[1px]", isDarkMode ? "bg-white/10" : "bg-black/10")} />
              <div className={cn(
                "relative px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border",
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
                  "py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all duration-300 border",
                  isDarkMode
                    ? "bg-transparent border-white/10 text-white/80 hover:bg-white/5"
                    : "bg-transparent border-black/10 text-brand-light-primary hover:bg-black/5"
                )}
              >
                <Contact size={14} />
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
              <button
                onClick={() => setIsOutsider(true)}
                className={cn(
                  "w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all duration-300 border",
                  isDarkMode
                    ? "bg-transparent border-white/10 text-white/80 hover:bg-white/5"
                    : "bg-transparent border-black/10 text-brand-light-primary hover:bg-black/5"
                )}
              >
                <Users size={14} />
                Outsider
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={() => setIsOutsider(false)} 
                className={cn(
                  "p-1.5 rounded-full transition-all duration-300",
                  isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-brand-light-bg text-brand-light-primary hover:bg-black/5"
                )}
              >
                <ArrowLeft size={14} />
              </button>
              <h3 className={cn(
                "text-xl font-black uppercase tracking-tight",
                isDarkMode ? "text-white" : "text-[#0038A8]"
              )}>Outsider Form</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em] ml-4",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Full Name</label>
                <input 
                  type="text" 
                  value={outsiderForm.name}
                  onChange={e => setOutsiderForm({...outsiderForm, name: e.target.value})}
                  className={cn(
                    "w-full px-4 py-2 rounded-xl text-sm transition-all duration-500 focus:outline-none focus:ring-4",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-1">
                <label className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em] ml-4",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Email Address</label>
                <input 
                  type="text" 
                  value={outsiderForm.email}
                  onChange={e => setOutsiderForm({...outsiderForm, email: e.target.value})}
                  className={cn(
                    "w-full px-4 py-2 rounded-xl text-sm transition-all duration-500 focus:outline-none focus:ring-4",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-1">
                <label className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em] ml-4",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Contact Number</label>
                <input 
                  type="text" 
                  value={outsiderForm.contact}
                  onChange={e => setOutsiderForm({...outsiderForm, contact: e.target.value})}
                  className={cn(
                    "w-full px-4 py-2 rounded-xl text-sm transition-all duration-500 focus:outline-none focus:ring-4",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary placeholder:text-white/5 focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary placeholder:text-black/5 focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                  placeholder="09XX XXX XXXX"
                />
              </div>

              <div className="space-y-1">
                <label className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em] ml-4",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )}>Purpose of Visit</label>
                <select
                  value={outsiderForm.purpose}
                  onChange={e => setOutsiderForm({...outsiderForm, purpose: e.target.value})}
                  className={cn(
                    "w-full px-4 py-2 rounded-xl text-sm transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
                    isDarkMode 
                      ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary focus:ring-white/5 focus:border-white/20" 
                      : "bg-black/5 border-2 border-black/5 text-brand-light-primary focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                  )}
                >
                  <option value="" className="bg-brand-dark-bg">Select Purpose</option>
                  {PURPOSES.map(p => (
                    <option key={p} value={p} className="bg-brand-dark-bg">{p}</option>
                  ))}
                </select>
              </div>

              <button
                disabled={!outsiderForm.name || !outsiderForm.email || !outsiderForm.contact || !outsiderForm.purpose || isProcessing}
                onClick={() => {
                  onNext('', 'outsider', outsiderForm, outsiderForm.email);
                }}
                className={cn(
                  "w-full py-3 mt-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-2xl transition-all duration-500",
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

      {showDeniedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "w-full max-w-sm p-6 rounded-3xl shadow-2xl border text-center",
              isDarkMode ? "bg-[#1a1a1a] border-white/10" : "bg-white border-black/5"
            )}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
              <AlertCircle size={32} />
            </div>
            <h3 className={cn(
              "text-xl font-black uppercase tracking-tight mb-2",
              isDarkMode ? "text-white" : "text-brand-light-primary"
            )}>Access Denied</h3>
            <p className={cn(
              "text-sm mb-6",
              isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
            )}>
              Only @neu.edu.ph emails are allowed for institutional login. Please fill up the outsider form instead.
            </p>
            <button
              onClick={() => setShowDeniedModal(false)}
              className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              Continue to Outsider Form
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function DetailsStep({ onNext, onBack, isDarkMode, isInstitutional }: { 
  onNext: (dept: string, role: string) => void, 
  onBack: () => void,
  isDarkMode: boolean,
  isInstitutional?: boolean
}) {
  const [dept, setDept] = useState('');
  const [role, setRole] = useState('');

  const filteredRoles = isInstitutional ? ROLES.filter(r => r !== 'Outsider') : ROLES;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[32px] shadow-2xl border p-6 flex flex-col transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack} 
            className={cn(
              "p-2 rounded-full transition-all duration-500 shadow-xl",
              isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/5 text-brand-light-primary hover:bg-black/10"
            )}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className={cn(
              "text-xl font-black uppercase tracking-tighter leading-none mb-1",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Additional Details</h2>
            <p className={cn(
              "font-black uppercase tracking-[0.4em] text-[9px]",
              isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
            )}>Please provide your department and role</p>
          </div>
        </div>

        <div className={cn("w-full h-[1px] mb-6", isDarkMode ? "bg-white/10" : "bg-black/5")} />

        <div className="space-y-6">
          <div className="space-y-2">
            <label className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em] ml-2",
              isDarkMode ? "text-white/80" : "text-brand-light-primary"
            )}>Department / College</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-2xl text-sm font-black transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
                isDarkMode 
                  ? "bg-[#333] border border-white/10 text-white focus:ring-white/10 focus:border-white/20" 
                  : "bg-[#e2e8f0] border border-black/5 text-brand-light-primary focus:ring-black/10 focus:border-black/20"
              )}
            >
              <option value="">Select Department</option>
              {COLLEGES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em] ml-2",
              isDarkMode ? "text-white/80" : "text-brand-light-primary"
            )}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-2xl text-sm font-black transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
                isDarkMode 
                  ? "bg-[#333] border border-white/10 text-white focus:ring-white/10 focus:border-white/20" 
                  : "bg-[#e2e8f0] border border-black/5 text-brand-light-primary focus:ring-black/10 focus:border-black/20"
              )}
            >
              <option value="">Select Role</option>
              {filteredRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <button
            disabled={!dept || !role}
            onClick={() => onNext(dept, role)}
            className={cn(
              "w-full py-4 rounded-[16px] font-black uppercase tracking-widest text-xs shadow-2xl transition-all duration-500 flex items-center justify-center gap-3",
              isDarkMode
                ? "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                : "bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
            )}
          >
            Continue
            <ChevronRight size={16} />
          </button>
        </div>
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
      className="w-full max-w-xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[32px] shadow-2xl border p-6 flex flex-col transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        <div className="flex items-center gap-4 mb-4">
          <button 
            onClick={onBack} 
            className={cn(
              "p-2 rounded-full transition-all duration-500 shadow-xl",
              isDarkMode ? "bg-white/10 text-white hover:bg-white/20" : "bg-black/5 text-brand-light-primary hover:bg-black/10"
            )}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className={cn(
              "text-xl font-black uppercase tracking-tighter leading-none mb-1",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Purpose of Visit</h2>
            <p className={cn(
              "font-black uppercase tracking-[0.4em] text-[9px]",
              isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
            )}>Visitor: {visitorName}</p>
          </div>
        </div>

        <div className={cn("w-full h-[1px] mb-6", isDarkMode ? "bg-white/10" : "bg-black/5")} />

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {PURPOSES.map((p) => (
              <button
                key={p}
                onClick={() => setSelected(p)}
                className={cn(
                  "w-full p-4 rounded-[16px] border-2 text-left font-black transition-all duration-500 flex items-center justify-between group uppercase tracking-widest text-[10px] shadow-xl",
                  selected === p 
                    ? (isDarkMode ? "border-white bg-white/20 text-white" : "border-brand-light-primary bg-brand-light-primary/5 text-brand-light-primary")
                    : (isDarkMode ? "border-white/10 text-brand-dark-secondary hover:border-white/20 hover:bg-white/10" : "border-black/5 text-brand-light-primary/60 hover:border-black/10 hover:bg-black/5")
                )}
              >
                {p}
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                  selected === p 
                    ? (isDarkMode ? "border-white bg-white text-black" : "border-brand-light-primary bg-brand-light-primary text-white")
                    : (isDarkMode ? "border-white/10" : "border-black/10")
                )}>
                  {selected === p && <CheckCircle2 size={14} />}
                </div>
              </button>
            ))}
          </div>

          <button
            disabled={!selected || isProcessing}
            onClick={() => onNext(selected)}
            className={cn(
              "w-full mt-4 py-4 rounded-[16px] font-black uppercase tracking-widest text-xs shadow-2xl transition-all duration-500 flex items-center justify-center gap-3",
              isDarkMode
                ? "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                : "bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50"
            )}
          >
            {isProcessing ? "Processing..." : "Submit Check-in"}
            {!isProcessing && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SuccessStep({ data, onReset, isDarkMode }: { data: Visitor, onReset: () => void, isDarkMode: boolean }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  console.log("SuccessStep: Rendering with data", data);

  useEffect(() => {
    // QR Code generation removed as it was for check-out
  }, [data]);

  // Auto-reset after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onReset();
    }, 10000);
    return () => {
      clearTimeout(timer);
    };
  }, [onReset]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className={cn(
        "backdrop-blur-3xl rounded-[40px] shadow-2xl border p-10 flex flex-col items-center text-center transition-all duration-500",
        isDarkMode 
          ? "bg-[#2a2a2a]/40 border-white/10" 
          : "bg-white/40 border-black/5"
      )}>
        {data.photoURL ? (
          <motion.img 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            src={data.photoURL}
            alt={data.name}
            className="w-24 h-24 rounded-full object-cover mb-8 shadow-2xl border-4 border-white/20"
            referrerPolicy="no-referrer"
          />
        ) : (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center mb-8 shadow-2xl bg-green-500"
            )}
          >
            <CheckCircle2 size={48} className="text-white" />
          </motion.div>
        )}
        
        <h2 className={cn(
          "text-4xl font-black mb-4 tracking-tighter uppercase leading-none",
          isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
        )}>
          WELCOME!
        </h2>
        <p className={cn(
          "font-black uppercase tracking-[0.4em] text-[10px] mb-8",
          isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
        )}>
          Please observe library protocols.
        </p>

        {qrUrl && (
          <div className="mb-8 space-y-4">
            <div className={cn(
              "p-4 rounded-[32px] border shadow-2xl bg-white",
              isDarkMode ? "border-white/10" : "border-black/5"
            )}>
              <img src={qrUrl} alt="Visitor QR" className="w-48 h-48 mx-auto" />
            </div>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
            )}>
              Please take a photo of this QR for Check-out
            </p>
          </div>
        )}

        <div className={cn(
          "w-full rounded-[24px] p-6 mb-8 text-left space-y-4 border shadow-2xl backdrop-blur-xl",
          isDarkMode ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5"
        )}>
          <div className={cn("flex justify-between items-center border-b pb-4", isDarkMode ? "border-white/10" : "border-black/5")}>
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>Visitor</span>
            <span className={cn("text-xl font-black", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>{data.name || data.email}</span>
          </div>
          <div className={cn("flex justify-between items-center border-b pb-4", isDarkMode ? "border-white/10" : "border-black/5")}>
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>Purpose</span>
            <span className={cn("text-xl font-black", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>{data.purpose}</span>
          </div>
          <div className={cn("flex justify-between items-center border-b pb-4", isDarkMode ? "border-white/10" : "border-black/5")}>
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>Email</span>
            <span className={cn("text-xl font-mono font-black tracking-[0.2em]", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>{data.identifier}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary")}>Time In</span>
            <span className={cn("text-xl font-black", isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary")}>
              {data.check_in ? format(new Date(data.check_in), 'HH:mm:ss') : '--:--:--'}
            </span>
          </div>
        </div>

        <button
          onClick={onReset}
          className={cn(
            "w-full py-4 rounded-[20px] font-black uppercase tracking-widest text-sm shadow-2xl transition-all duration-500",
            isDarkMode
              ? "bg-white text-black hover:bg-brand-dark-secondary"
              : "bg-brand-light-primary text-white hover:bg-opacity-90"
          )}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ErrorStep({ message, onReset, isDarkMode }: { message: string, onReset: () => void, isDarkMode: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className={cn(
        "backdrop-blur-3xl rounded-[40px] shadow-2xl border p-8 flex flex-col items-center text-center transition-all duration-500",
        isDarkMode 
          ? "bg-black/40 border-white/10" 
          : "bg-white/40 border-white/20"
      )}>
        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-red-500/30">
          <AlertCircle size={40} className="text-white" />
        </div>
        <h2 className={cn(
          "text-3xl font-black mb-3 tracking-tight uppercase",
          isDarkMode ? "text-white" : "text-brand-light-primary"
        )}>Access Denied</h2>
        <p className="text-red-500 font-black mb-8 px-6 text-base">{message}</p>

        <button
          onClick={onReset}
          className={cn(
            "w-full py-4 rounded-[16px] font-black uppercase tracking-widest text-xs shadow-xl transition-all duration-300",
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  const [deniedEmail, setDeniedEmail] = useState('');

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
        const hourCounts: Record<number, number> = {};

        visitorData.forEach(v => {
          purposes[v.purpose] = (purposes[v.purpose] || 0) + 1;
          const date = format(new Date(v.check_in), 'yyyy-MM-dd');
          daily[date] = (daily[date] || 0) + 1;
          
          const hour = new Date(v.check_in).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const uniqueDays = Object.keys(daily).length;
        const avgVisitsPerDay = uniqueDays > 0 ? (total / uniqueDays).toFixed(1) : 0;
        const peakHourVal = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const peakHour = peakHourVal !== undefined ? format(new Date().setHours(Number(peakHourVal), 0, 0, 0), 'HH:00') : 'N/A';

        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
          return { date: d, count: daily[d] || 0 };
        });

        setStats({
          totalVisitors: total,
          purposeStats: Object.entries(purposes).map(([purpose, count]) => ({ purpose, count })),
          dailyStats: last7Days,
          avgVisitsPerDay: Number(avgVisitsPerDay),
          peakHour
        });
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'visitors');
      });
      
      return () => unsubscribe();
    }
  }, [isLoggedIn]);

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userEmail = (result.user.email || '').toLowerCase().trim();
      
      // ONLY THE 2 OWNERS are allowed to be admins
      const isAdminEmail = ADMINS.some(e => e.toLowerCase().trim() === userEmail) || 
                          OWNERS.some(e => e.toLowerCase().trim() === userEmail);
      
      if (isAdminEmail) {
        // If it's a new admin from the list, ensure they have a record in Firestore
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (!userDoc.exists()) {
          await setDoc(doc(db, 'users', result.user.uid), {
            email: userEmail,
            role: 'admin',
            displayName: result.user.displayName || 'Admin'
          });
        }
        onLogin();
      } else {
        await signOut(auth);
        setDeniedEmail(userEmail);
        setShowDeniedModal(true);
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleClearLogs = async () => {
    setIsProcessing(true);
    try {
      const q = query(collection(db, 'visitors'));
      const snap = await getDocs(q);
      
      // Use writeBatch for more reliable bulk deletion
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      
      setIsConfirmingClear(false);
    } catch (err: any) {
      console.error("AdminFlow: Error clearing logs:", err);
      handleFirestoreError(err, OperationType.DELETE, 'visitors');
    } finally {
      setIsProcessing(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("NEU Library Visitor Management", 14, 20);
    doc.setFontSize(10);
    doc.text(format(new Date(), 'MMMM d, yyyy'), 14, 28);
    
    // Statistics Table
    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: [
        ['Total Visitors', stats?.totalVisitors || 0],
        ['Avg. Visits/Day', stats?.avgVisitsPerDay || 0],
        ['Peak Hour', stats?.peakHour || 'N/A'],
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
      format(new Date(v.check_in), 'yyyy-MM-dd HH:mm')
    ]);

    autoTable(doc, {
      head: [['Name', 'Type', 'ID', 'Purpose', 'Check In']],
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
          "w-full max-w-md backdrop-blur-3xl rounded-[40px] shadow-2xl border p-8 flex flex-col items-center transition-all duration-500",
          isDarkMode 
            ? "bg-black/40 border-white/10" 
            : "bg-white/40 border-white/20"
        )}>
          <div className="flex items-center gap-3 mb-6 w-full">
            <img 
              src="https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548" 
              alt="NEU Logo" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <h2 className={cn(
                "text-2xl font-black tracking-tight leading-tight",
                isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
              )}>ADMIN PORTAL</h2>
              <p className={cn(
                "font-bold uppercase tracking-[0.3em] text-[10px]",
                isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-primary/60"
              )}>Authorized Only</p>
            </div>
          </div>

          <div className="w-full h-[1px] bg-black/5 dark:bg-white/5 mb-6" />
          
          <div className="w-full space-y-6">
            <div className="text-center space-y-4">
              <p className={cn(
                "text-xs font-bold uppercase tracking-widest",
                isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
              )}>
                Authorized Access Only
              </p>
              
              <button
                onClick={handleGoogleLogin}
                className={cn(
                  "w-full py-4 rounded-[20px] font-black uppercase tracking-widest text-xs shadow-2xl transition-all duration-500 flex items-center justify-center gap-3 group",
                  isDarkMode
                    ? "bg-white text-black hover:bg-brand-dark-secondary"
                    : "bg-brand-light-primary text-white hover:bg-opacity-90"
                )}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Connect with Institutional Email
              </button>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-[16px] bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black flex items-center gap-3"
              >
                <AlertCircle size={16} />
                {loginError}
              </motion.div>
            )}
          </div>
        </div>

        {showDeniedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "w-full max-w-sm p-6 rounded-3xl shadow-2xl border text-center",
                isDarkMode ? "bg-[#1a1a1a] border-white/10" : "bg-white border-black/5"
              )}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <AlertCircle size={32} />
              </div>
              <h3 className={cn(
                "text-xl font-black uppercase tracking-tight mb-2",
                isDarkMode ? "text-white" : "text-brand-light-primary"
              )}>Access Denied</h3>
              <p className={cn(
                "text-sm mb-6",
                isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
              )}>
                The email <span className="font-bold">{deniedEmail}</span> is not authorized to access the Admin Portal.
              </p>
              <button
                onClick={() => setShowDeniedModal(false)}
                className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </motion.div>
    );
  }

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = (v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.identifier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (v.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Type Filter
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    
    // Purpose Filter
    if (purposeFilter !== 'all' && v.purpose !== purposeFilter) return false;
    
    // College/Department Filter
    if (deptFilter !== 'all' && v.department !== deptFilter) return false;
    
    if (logFilter === 'all') return true;
    
    const checkInDate = new Date(v.check_in);
    const now = new Date();
    
    if (logFilter === 'today') {
      return isSameDay(checkInDate, now);
    } else if (logFilter === 'week') {
      return checkInDate >= startOfWeek(now);
    } else if (logFilter === 'month') {
      return checkInDate >= startOfMonth(now);
    } else if (logFilter === 'year') {
      return checkInDate >= startOfYear(now);
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Admin Nav */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "backdrop-blur-3xl p-1.5 rounded-xl shadow-xl border flex gap-1.5 transition-all duration-500",
          isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
        )}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-4 py-1.5 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500",
              activeTab === 'dashboard' 
                ? (isDarkMode ? "bg-white text-black shadow-lg" : "bg-brand-light-primary text-white shadow-lg")
                : (isDarkMode ? "text-brand-dark-secondary hover:text-brand-dark-primary hover:bg-white/5" : "text-brand-light-secondary hover:text-brand-light-primary hover:bg-black/5")
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={cn(
              "px-4 py-1.5 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500",
              activeTab === 'logs' 
                ? (isDarkMode ? "bg-white text-black shadow-lg" : "bg-brand-light-primary text-white shadow-lg")
                : (isDarkMode ? "text-brand-dark-secondary hover:text-brand-dark-primary hover:bg-white/5" : "text-brand-light-secondary hover:text-brand-light-primary hover:bg-black/5")
            )}
          >
            Logs
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isConfirmingClear ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleClearLogs}
                disabled={isProcessing}
                className={cn(
                  "px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500 bg-red-600 text-white shadow-lg hover:bg-red-700 disabled:opacity-50"
                )}
              >
                {isProcessing ? "Clearing..." : "Confirm Clear"}
              </button>
              <button 
                onClick={() => setIsConfirmingClear(false)}
                disabled={isProcessing}
                className={cn(
                  "px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500 bg-gray-500 text-white shadow-lg hover:bg-gray-600 disabled:opacity-50"
                )}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsConfirmingClear(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500 backdrop-blur-3xl border shadow-lg hover:scale-105 group",
                isDarkMode 
                  ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20" 
                  : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
              )}
            >
              <X size={14} className="group-hover:rotate-90 transition-transform" />
              Clear Logs
            </button>
          )}
          <button 
            onClick={generatePDF}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500 backdrop-blur-3xl border shadow-lg hover:scale-105 group",
              isDarkMode 
                ? "bg-white/5 border-white/10 text-brand-dark-primary hover:bg-white/10" 
                : "bg-white border-black/5 text-brand-light-primary hover:bg-black/5"
            )}
          >
            <Download size={12} />
            Export
          </button>
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] transition-all duration-500 border shadow-lg hover:scale-105 group",
              isDarkMode
                ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                : "bg-red-50 border border-red-100 text-red-600 hover:bg-red-100"
            )}
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats Cards */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard icon={<Users size={16} />} label="Total Visitors" value={stats?.totalVisitors || 0} isDarkMode={isDarkMode} />
            <StatCard icon={<Calendar size={16} />} label="Avg. Visits/Day" value={stats?.avgVisitsPerDay || 0} isDarkMode={isDarkMode} />
            <StatCard icon={<Clock size={16} />} label="Peak Hour" value={stats?.peakHour || 'N/A'} isDarkMode={isDarkMode} />
            <StatCard icon={<Calendar size={16} />} label="Today's Count" value={stats?.dailyStats[0]?.count || 0} isDarkMode={isDarkMode} />
          </div>

          {/* Charts */}
          <div className={cn(
            "lg:col-span-2 p-6 backdrop-blur-3xl rounded-[32px] border shadow-xl transition-all duration-500",
            isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
          )}>
            <h3 className={cn(
              "text-lg font-black mb-6 uppercase tracking-tighter",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Visitor Trends</h3>
            <div className="h-64">
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
            "p-6 backdrop-blur-3xl rounded-[32px] border shadow-xl transition-all duration-500",
            isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
          )}>
            <h3 className={cn(
              "text-lg font-black mb-6 uppercase tracking-tighter",
              isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
            )}>Distribution</h3>
            <div className="h-64">
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
          "backdrop-blur-3xl rounded-[32px] border shadow-xl overflow-hidden transition-all duration-500",
          isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
        )}>
          <div className={cn(
            "p-6 border-b flex flex-col md:flex-row items-center justify-between gap-6",
            isDarkMode ? "border-white/5" : "border-black/5"
          )}>
            <div className="relative flex-1 w-full flex gap-3">
              <div className="relative flex-1">
                <Search className={cn(
                  "absolute left-6 top-1/2 -translate-y-1/2",
                  isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                )} size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className={cn(
                    "w-full pl-14 pr-6 py-3 rounded-2xl text-sm font-black transition-all duration-500 focus:outline-none focus:ring-4",
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
                  "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
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

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={cn(
                  "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
                  isDarkMode 
                    ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary focus:ring-white/5 focus:border-white/20" 
                    : "bg-white border-2 border-black/5 text-brand-light-primary focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                )}
              >
                <option value="all">All Roles</option>
                {ROLES.map(role => (
                  <option key={role} value={role.toLowerCase()}>{role}</option>
                ))}
              </select>

              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className={cn(
                  "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
                  isDarkMode 
                    ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary focus:ring-white/5 focus:border-white/20" 
                    : "bg-white border-2 border-black/5 text-brand-light-primary focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                )}
              >
                <option value="all">All Purposes</option>
                {Array.from(new Set(visitors.map(v => v.purpose))).filter(Boolean).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className={cn(
                  "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 focus:outline-none focus:ring-4 appearance-none cursor-pointer",
                  isDarkMode 
                    ? "bg-white/5 border-2 border-white/10 text-brand-dark-primary focus:ring-white/5 focus:border-white/20" 
                    : "bg-white border-2 border-black/5 text-brand-light-primary focus:ring-brand-light-primary/5 focus:border-brand-light-primary/20"
                )}
              >
                <option value="all">All Colleges</option>
                {COLLEGES.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left">
              <thead className={cn(
                "text-[11px] font-black uppercase tracking-[0.3em] border-b",
                isDarkMode ? "text-brand-dark-secondary border-white/5" : "text-brand-light-secondary border-black/5"
              )}>
                <tr>
                  <th className="px-6 py-10">Visitor Profile</th>
                  <th className="px-6 py-10">Category</th>
                  <th className="px-6 py-10">Purpose</th>
                  <th className="px-6 py-10">Check In</th>
                  <th className="px-6 py-10 text-right">Actions</th>
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
                  >
                    <td className="px-6 py-8" onClick={() => setSelectedVisitor(v)}>
                      <div className="flex items-center gap-6">
                        {v.photoURL ? (
                          <img 
                            src={v.photoURL} 
                            alt={v.name} 
                            className="w-16 h-16 rounded-[20px] object-cover shadow-sm group-hover:scale-110 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={cn(
                            "w-16 h-16 rounded-[20px] flex items-center justify-center font-black text-xl shadow-sm group-hover:scale-110 transition-transform",
                            isDarkMode 
                              ? "bg-brand-dark-secondary/10 border border-brand-dark-secondary/20 text-brand-dark-primary" 
                              : "bg-brand-light-secondary/10 border border-brand-light-secondary/20 text-brand-light-primary"
                          )}>
                            {(v.name || 'V').charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className={cn(
                            "text-lg font-black tracking-tight",
                            isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
                          )}>{v.name}</p>
                          <p className={cn(
                            "text-[11px] font-black tracking-[0.2em] uppercase",
                            isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                          )}>{v.email || v.identifier}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-8" onClick={() => setSelectedVisitor(v)}>
                      <span className={cn(
                        "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        v.type?.toLowerCase() === 'student' 
                          ? (isDarkMode ? "bg-brand-dark-secondary/10 text-brand-dark-secondary border-brand-dark-secondary/20" : "bg-brand-light-secondary/10 text-brand-light-primary border-brand-light-secondary/20") : 
                        v.type?.toLowerCase() === 'faculty' 
                          ? (isDarkMode ? "bg-brand-dark-accent/10 text-brand-dark-accent border-brand-dark-accent/20" : "bg-brand-light-accent/10 text-brand-light-accent border-brand-light-accent/20") : 
                          (isDarkMode ? "bg-brand-dark-secondary/10 text-brand-dark-secondary border-brand-dark-secondary/20" : "bg-brand-light-secondary/10 text-brand-light-primary border-brand-light-secondary/20")
                      )}>
                        {v.type}
                      </span>
                    </td>
                    <td className={cn(
                      "px-6 py-8 text-[11px] font-black uppercase tracking-widest",
                      isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-primary/60"
                    )} onClick={() => setSelectedVisitor(v)}>{v.purpose}</td>
                    <td className={cn(
                      "px-6 py-8 text-[11px] font-black",
                      isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-primary/60"
                    )} onClick={() => setSelectedVisitor(v)}>{format(new Date(v.check_in), 'MMM dd, HH:mm')}</td>
                    <td className="px-6 py-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBlock(v.identifier, v.is_blocked === 1);
                          }}
                          className={cn(
                            "p-3 rounded-xl transition-all duration-300",
                            v.is_blocked === 1
                              ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                              : isDarkMode ? "bg-white/5 text-brand-dark-secondary hover:bg-red-500/20 hover:text-red-500" : "bg-black/5 text-brand-light-secondary hover:bg-red-50 hover:text-red-600"
                          )}
                          title={v.is_blocked === 1 ? "Unblock Visitor" : "Block Visitor"}
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                "relative z-10 w-full max-w-xl backdrop-blur-3xl rounded-[40px] shadow-2xl border p-10 overflow-hidden transition-all duration-500",
                isDarkMode ? "bg-[#2a2a2a]/40 border-white/10" : "bg-white/40 border-black/5"
              )}
            >
              <div className={cn(
                "pb-8 border-b flex items-center justify-between mb-8",
                isDarkMode ? "border-white/5" : "border-black/5"
              )}>
                <div className="flex items-center gap-6">
                  {selectedVisitor.photoURL ? (
                    <img 
                      src={selectedVisitor.photoURL} 
                      alt={selectedVisitor.name} 
                      className="w-20 h-20 rounded-[24px] object-cover shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={cn(
                      "w-20 h-20 rounded-[24px] flex items-center justify-center font-black text-2xl shadow-xl",
                      isDarkMode 
                        ? "bg-brand-dark-secondary/10 border border-brand-dark-secondary/20 text-brand-dark-primary" 
                        : "bg-brand-light-secondary/10 border border-brand-light-secondary/20 text-brand-light-primary"
                    )}>
                      {(selectedVisitor.name || 'V').charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className={cn(
                      "text-2xl font-black tracking-tight mb-1",
                      isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
                    )}>{selectedVisitor.name}</h3>
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
                    )}>{selectedVisitor.type} • {selectedVisitor.identifier}</p>
                    {selectedVisitor.email && (
                      <p className={cn(
                        "text-[10px] font-black tracking-widest mt-1",
                        isDarkMode ? "text-brand-dark-secondary/60" : "text-brand-light-secondary/60"
                      )}>{selectedVisitor.email}</p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedVisitor(null)} 
                  className={cn(
                    "p-3 rounded-full transition-all",
                    isDarkMode ? "bg-white/5 text-brand-dark-secondary hover:text-brand-dark-primary" : "bg-brand-light-bg text-brand-light-secondary hover:text-brand-light-primary"
                  )}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <DetailItem label="Purpose of Visit" value={selectedVisitor.purpose} isDarkMode={isDarkMode} />
                  <DetailItem label="Check In Time" value={format(new Date(selectedVisitor.check_in), 'MMM dd, HH:mm:ss')} isDarkMode={isDarkMode} />
                  <DetailItem label="Program / Department" value={selectedVisitor.department || 'N/A'} isDarkMode={isDarkMode} />
                  {selectedVisitor.type === 'outsider' && (
                    <>
                      <DetailItem label="University" value={selectedVisitor.university || 'N/A'} isDarkMode={isDarkMode} />
                      <DetailItem label="Occupation" value={selectedVisitor.occupation || 'N/A'} isDarkMode={isDarkMode} />
                      <DetailItem label="Contact Number" value={selectedVisitor.contact || 'N/A'} isDarkMode={isDarkMode} />
                      <DetailItem label="Home Address" value={selectedVisitor.address || 'N/A'} isDarkMode={isDarkMode} />
                    </>
                  )}
                </div>

                <div className={cn(
                  "pt-8 border-t flex gap-4",
                  isDarkMode ? "border-white/5" : "border-slate-100"
                )}>
                  <button
                    onClick={() => handleBlock(selectedVisitor.identifier, selectedVisitor.is_blocked === 1)}
                    className={cn(
                      "flex-1 py-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 transition-all duration-300 shadow-xl",
                      selectedVisitor.is_blocked === 1 
                        ? (isDarkMode ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100")
                        : (isDarkMode ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20" : "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100")
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
    <div className={cn(
      "p-4 backdrop-blur-3xl rounded-[24px] border shadow-xl flex items-center gap-4 group hover:scale-[1.02] transition-all duration-500",
      isDarkMode 
        ? "bg-[#2a2a2a]/40 border-white/10" 
        : "bg-white/40 border-black/5"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-[16px] flex items-center justify-center transition-all shadow-sm group-hover:rotate-6",
        isDarkMode ? "bg-brand-dark-secondary/10 border border-brand-dark-secondary/20" : "bg-brand-light-secondary/10 border border-brand-light-secondary/20"
      )}>
        {React.cloneElement(icon as React.ReactElement, { 
          size: 20, 
          className: cn(
            "transition-colors duration-700",
            isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
          ) 
        })}
      </div>
      <div>
        <p className={cn(
          "text-[9px] font-black uppercase tracking-widest mb-1",
          isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
        )}>{label}</p>
        <p className={cn(
          "text-2xl font-black tracking-tight",
          isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
        )}>{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value, isDarkMode }: { label: string, value: string, isDarkMode: boolean }) {
  return (
    <div className="space-y-1">
      <p className={cn(
        "text-[9px] font-black uppercase tracking-widest",
        isDarkMode ? "text-brand-dark-secondary" : "text-brand-light-secondary"
      )}>{label}</p>
      <p className={cn(
        "text-sm font-black tracking-tight",
        isDarkMode ? "text-brand-dark-primary" : "text-brand-light-primary"
      )}>{value}</p>
    </div>
  );
}function TestPanel({ 
  setMode, 
  currentMode, 
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  isOwner
}: { 
  setMode: (m: 'visitor' | 'admin') => void, 
  currentMode: string,
  isAdminLoggedIn: boolean,
  setIsAdminLoggedIn: (val: boolean) => void,
  isOwner: boolean
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAutoLogin = async (email: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, ADMIN_PASSWORD);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, ADMIN_PASSWORD);
          // After creation, it's automatically logged in
        } catch (createErr: any) {
          alert(`Failed to create/login: ${createErr.message}`);
        }
      } else {
        alert(`Auto-login failed: ${err.message}. Please use the admin login form with ${email} / ${ADMIN_PASSWORD}`);
      }
    }
  };

  const toggleAdminRole = () => {
    setIsAdminLoggedIn(!isAdminLoggedIn);
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

            {isOwner && (
              <div className="space-y-3 p-3 bg-brand-light-secondary/5 rounded-2xl border border-brand-light-secondary/10">
                <p className="text-[9px] font-bold text-brand-light-secondary uppercase tracking-widest">Owner Controls</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-600">Admin Privileges</span>
                  <button 
                    onClick={toggleAdminRole}
                    className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                      isAdminLoggedIn ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {isAdminLoggedIn ? "Active" : "Inactive"}
                  </button>
                </div>
                <p className="text-[8px] text-slate-400 italic">Toggle your admin status for testing purposes.</p>
                <div className="mt-2 space-y-1">
                  <p className="text-[8px] text-brand-light-secondary font-bold">Owner: chynna.cardona@neu.edu.ph</p>
                  <p className="text-[8px] text-brand-light-secondary font-bold">Owner: jcesperanza@neu.edu.ph</p>
                </div>
              </div>
            )}

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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Auto-Login (Admin)</p>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => handleAutoLogin('chynna.cardona@neu.edu.ph')}
                  disabled={isAdminLoggedIn}
                  className="w-full py-2 rounded-xl bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  Login as chynna.cardona
                </button>
              </div>
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