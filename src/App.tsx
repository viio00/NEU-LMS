"use client";


/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import {
 User,
 ShieldCheck,
 Clock,
 Calendar,
 QrCode,
 LogOut,
 ChevronRight,
 CheckCircle2,
 AlertCircle,
 Users,
 History,
 Search,
 ArrowLeft,
 X,
 Sun,
 Moon,
 Loader2,
 Download,
 Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isThisWeek, isThisMonth, isThisYear, differenceInMinutes } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { db } from './firebase'; // Removed auth import
import {
 collection,
 getDocs,
 doc,
 getDoc,
 setDoc,
 query,
 where,
 addDoc,
 updateDoc,
 Timestamp,
 orderBy,
 limit,
 onSnapshot,
 writeBatch
} from 'firebase/firestore';


// --- Utility ---
function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs));
}


// --- Types ---
type VisitorType = 'student' | 'faculty' | 'outsider';


interface Visitor {
 id: string;
 name: string;
 type: VisitorType;
 identifier?: string;
 department?: string;
 university?: string;
 occupation?: string;
 address?: string;
 contact?: string;
 purpose: string;
 check_in: string | Timestamp;
 check_out?: string | Timestamp;
 is_blocked?: number;
 details?: string;
}


interface Member {
   id: string;
   name: string;
   type: VisitorType;
   identifier: string;
   department?: string;
   details?: string;
}


// --- Constants ---
const PURPOSES = [
 'Research/thesis',
 'Study',
 'Use of Computer',
 'Boardgames/pass time',
 'Others'
];


const INITIAL_MEMBERS: Omit<Member, 'id'>[] = [
    { identifier: "00-00000-000", name: "Lastname1, Firstname I.", type: "student", details: "2nd Year BS Information Technology" },
    { identifier: "11-11111-111", name: "Lastname2, Firstname II.", type: "student", details: "4th Year BS Computer Science" },
    { identifier: "22-22222-222", name: "Lastname3, Firstname III", type: "student", details: "1st Year BS Medical Technology" },
    { identifier: "99-99999-999", name: "Employee 1", type: "faculty", department: "CICS Department" },
    { identifier: "77-77777-777", name: "Employee 2", type: "faculty", department: "CAS Department" },
];


const ADMIN_ACCOUNTS: Record<string, string> = {
   "admin1@neu.edu.ph": "passW@rd",
   "admin2@neu.edu.ph": "passW@rd",
   "admin3@neu.edu.ph": "passW@rd",
};


const CAMPUS_IMAGE = "https://media.licdn.com/dms/image/v2/C561BAQGUxB_pssZkJA/company-background_10000/company-background_10000/0/1591598531597/new_era_university_official_cover?e=2147483647&v=beta&t=F_JgSz6bKmQ4QdmSivXkthtoQ-7j0KNvpoWiwut8y8A";
const LOGO_IMAGE = "https://static.wikia.nocookie.net/tv-philippines/images/a/a1/New_Era_University_logo.png/revision/latest?cb=20240918153548";


// --- Components ---


export default function App() {
 const [showSplash, setShowSplash] = useState(true);
 const [mode, setMode] = useState<'visitor' | 'admin'>('visitor');
 const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
 const [currentTime, setCurrentTime] = useState(new Date());
 const [isDarkMode, setIsDarkMode] = useState(false);


 useEffect(() => {
   const savedTheme = localStorage.getItem('theme');
   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
   const initialIsDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  
   setIsDarkMode(initialIsDark);
   if (initialIsDark) {
     document.documentElement.classList.add('dark');
   } else {
     document.documentElement.classList.remove('dark');
   }


   const timer = setTimeout(() => setShowSplash(false), 2000);
   return () => clearTimeout(timer);
 }, []);


 useEffect(() => {
   const timer = setInterval(() => setCurrentTime(new Date()), 1000);
   return () => clearInterval(timer);
 }, []);


 const toggleTheme = () => {
   const nextIsDark = !isDarkMode;
   setIsDarkMode(nextIsDark);
   localStorage.setItem('theme', nextIsDark ? 'dark' : 'light');
   if (nextIsDark) {
     document.documentElement.classList.add('dark');
   } else {
     document.documentElement.classList.remove('dark');
   }
 };


 if (showSplash) {
   return <SplashScreen />;
 }


 return (
   <div className={cn(
     "min-h-screen font-sans transition-colors duration-500 relative overflow-hidden",
     isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
   )}>
     <div className="fixed inset-0 z-0">
       <img
         src={CAMPUS_IMAGE}
         alt="Campus Background"
         className="object-cover w-full h-full"
       />
       <div className={cn(
         "absolute inset-0 transition-colors duration-500",
         isDarkMode ? "bg-black/75 backdrop-blur-[8px]" : "bg-black/45 backdrop-blur-[4px]"
       )} />
     </div>


     <header className={cn(
       "fixed top-0 left-0 right-0 z-50 h-32 flex items-center justify-between px-10 transition-all duration-700",
       "bg-black/20 backdrop-blur-3xl border-b border-white/10"
     )}>
       <div className="flex items-center gap-8">
         <div className="relative group cursor-pointer" onClick={() => setMode('visitor')}>
           <div className="absolute -inset-2 bg-white/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
           <img
             src={LOGO_IMAGE}
             alt="NEU Logo"
             width={64}
             height={64}
             className="object-contain relative drop-shadow-lg"
           />
         </div>
         <div className="h-12 w-[1px] bg-white/10" />
         <div className="text-left">
           <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1 uppercase">NEU Library</h1>
           <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Library Management System</p>
         </div>
       </div>


       <div className="flex flex-col items-end gap-3">
         <div className="flex items-center gap-4">
           <button
             onClick={toggleTheme}
             className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all duration-300 backdrop-blur-md"
           >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>


           <div className="flex items-center gap-2 p-1 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
             <button
               onClick={() => setMode('visitor')}
               className={cn(
                 "px-5 py-2 rounded-lg text-[11px] font-black transition-all flex items-center gap-2 uppercase tracking-widest",
                 mode === 'visitor'
                   ? "bg-white text-[#0038A8] shadow-lg"
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
                   ? "bg-white text-[#0038A8] shadow-xl"
                   : "text-white/60 hover:text-white"
               )}
             >
               <ShieldCheck size={14} />
               Admin
             </button>
           </div>
         </div>


         <div className="flex items-center gap-4 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
           <span className="flex items-center gap-2"><Calendar size={12} /> {format(currentTime, 'MMMM dd, yyyy')}</span>
           <span className="w-1 h-1 bg-white/20 rounded-full"></span>
           <span className="flex items-center gap-2 font-mono"><Clock size={12} /> {format(currentTime, 'HH:mm:ss')}</span>
         </div>
       </div>
     </header>


     <main className="relative z-10 pt-48 pb-12 container mx-auto px-6 min-h-screen flex items-center justify-center">
       <AnimatePresence mode="wait">
         {mode === 'visitor' ? (
           <motion.div key="visitor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full flex justify-center">
             <VisitorFlow isDarkMode={isDarkMode} />
           </motion.div>
         ) : (
           <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full flex justify-center">
             <AdminFlow
               isLoggedIn={isAdminLoggedIn}
               onLoginSuccess={() => setIsAdminLoggedIn(true)}
               onLogout={() => {
                 setIsAdminLoggedIn(false);
                 setMode('visitor');
               }}
               isDarkMode={isDarkMode}
             />
           </motion.div>
         )}
       </AnimatePresence>
     </main>
   </div>
 );
}


const SplashScreen: React.FC = () => {
 return (
   <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden">
     <div className="absolute inset-0">
       <img
         src={CAMPUS_IMAGE}
         alt="Campus"
         className="object-cover opacity-60 w-full h-full"
       />
       <div className="absolute inset-0 bg-black/40" />
     </div>
      <motion.div
       initial={{ opacity: 0, scale: 0.8 }}
       animate={{ opacity: 1, scale: 1 }}
       transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.2 }}
       className="relative z-10 flex flex-col items-center"
     >
       <img src={LOGO_IMAGE} alt="NEU Logo" width={160} height={160} className="object-contain drop-shadow-2xl" />
       <Loader2 className="absolute -bottom-12 text-white/50 animate-spin" />
     </motion.div>
   </div>
 );
}


type VisitorFlowProps = {
 isDarkMode: boolean;
};


const VisitorFlow: React.FC<VisitorFlowProps> = ({ isDarkMode }) => {
 const [step, setStep] = useState<'id' | 'purpose' | 'success' | 'error'>('id');
 const [visitorData, setVisitorData] = useState<Partial<Visitor>>({});
 const [errorMessage, setErrorMessage] = useState('');
 const [isProcessing, setIsProcessing] = useState(false);
  const handleIdSubmit = async (id: string, type: VisitorType, extraData?: any) => {
   setIsProcessing(true);
   setErrorMessage('');


   if (type === 'outsider') {
       setVisitorData({ ...extraData, type });
       setStep('purpose');
       setIsProcessing(false);
       return;
   }
  
   const visitorsQuery = query(
     collection(db, "visitors"),
     where("identifier", "==", id),
     where("check_out", "==", null)
   );
   const activeVisitorsSnapshot = await getDocs(visitorsQuery);


   if (!activeVisitorsSnapshot.empty) {
     setErrorMessage("This ID is already checked in. Please check out first.");
     setStep('error');
     setIsProcessing(false);
     return;
   }


   const membersCollection = collection(db, "members");
   const q = query(membersCollection, where("identifier", "==", id));
   const querySnapshot = await getDocs(q);


   if (querySnapshot.empty) {
       setErrorMessage("ID not found in the database.");
       setStep('error');
   } else {
       const memberDoc = querySnapshot.docs[0];
       const memberData = { id: memberDoc.id, ...memberDoc.data()} as Member;
       setVisitorData({
           identifier: memberData.identifier,
           type: memberData.type,
           name: memberData.name,
           department: memberData.department,
           details: memberData.details
       });
       setStep('purpose');
   }
   setIsProcessing(false);
 };


 const handlePurposeSubmit = async (purpose: string) => {
   setIsProcessing(true);
   try {
     const visitorRecord = {
       ...visitorData,
       purpose,
       check_in: Timestamp.now(),
       check_out: null,
     };
     const docRef = await addDoc(collection(db, "visitors"), visitorRecord);
     setVisitorData({ ...visitorRecord, id: docRef.id });
     setStep('success');
   } catch (error) {
     console.error(error);
     setErrorMessage("Failed to check in. Please try again.");
     setStep('error');
   } finally {
     setIsProcessing(false);
   }
 };


 const handleCheckOut = async (id: string) => {
   setIsProcessing(true);
   setErrorMessage('');
   const visitorsCollection = collection(db, "visitors");
   const q = query(
     visitorsCollection,
     where("identifier", "==", id),
     where("check_out", "==", null),
     orderBy("check_in", "desc"),
     limit(1)
   );
   const querySnapshot = await getDocs(q);


   if (querySnapshot.empty) {
     setErrorMessage("No active check-in found for this ID.");
     setStep('error');
   } else {
     const visitorDocRef = querySnapshot.docs[0].ref;
     const checkOutTime = Timestamp.now();
     await updateDoc(visitorDocRef, {
       check_out: checkOutTime,
     });
     const data = querySnapshot.docs[0].data();
     setVisitorData({ ...data, id: querySnapshot.docs[0].id, check_out: checkOutTime });
     setStep('success');
   }
   setIsProcessing(false);
 };


 const resetFlow = () => {
   setVisitorData({});
   setStep('id');
   setErrorMessage('');
 }


 return (
   <div className="w-full max-w-2xl">
     <AnimatePresence mode="wait">
       {step === 'id' && (
         <IdEntryStep key="id" onNext={handleIdSubmit} onCheckOut={handleCheckOut} isDarkMode={isDarkMode} isProcessing={isProcessing} />
       )}
       {step === 'purpose' && (
         <PurposeStep
           key="purpose"
           onNext={handlePurposeSubmit}
           onBack={resetFlow}
           isProcessing={isProcessing}
           isDarkMode={isDarkMode}
         />
       )}
       {step === 'success' && (
         <SuccessStep key="success" data={visitorData as Visitor} onReset={resetFlow} />
       )}
       {step === 'error' && (
         <ErrorStep key="error" message={errorMessage} onReset={resetFlow} />
       )}
     </AnimatePresence>
   </div>
 );
}


type IdEntryStepProps = {
 onNext: (id: string, type: VisitorType, extraData?: any) => Promise<void>;
 onCheckOut: (id: string) => Promise<void>;
 isDarkMode: boolean;
 isProcessing: boolean;
};


const IdEntryStep: React.FC<IdEntryStepProps> = ({ onNext, onCheckOut, isDarkMode, isProcessing }) => {
 const [idInput, setIdInput] = useState('');
 const [isOutsider, setIsOutsider] = useState(false);
 const [outsiderForm, setOutsiderForm] = useState({
   name: '',
   university: '',
   occupation: '',
   address: '',
   contact: ''
 });


 const validateId = (id: string) => {
   const regex = /^(\d{2}-\d{5}-\d{3}|\d{2}-\d{5})$/;
   return regex.test(id);
 };
  const handleOutsiderSubmit = () => {
   if (outsiderForm.name && outsiderForm.university && outsiderForm.address) {
       onNext('', 'outsider', outsiderForm);
   }
 }
  const isOutsiderFormInvalid = !outsiderForm.name || !outsiderForm.university || !outsiderForm.address;


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     exit={{ opacity: 0, y: -20 }}
     className="w-full bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[40px] p-12 flex flex-col items-center border border-white/20 shadow-2xl"
   >
     <div className="flex items-center gap-6 mb-10 w-full border-b border-black/10 dark:border-white/10 pb-8">
       <img
         src={LOGO_IMAGE}
         alt="NEU"
         width={80}
         height={80}
         className="object-contain"
       />
       <div className="text-left">
         <h2 className="text-3xl font-bold text-[#0038A8] dark:text-white tracking-tight uppercase">Library Visitor</h2>
         <p className="text-slate-500 dark:text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">New Era University</p>
       </div>
     </div>


     {!isOutsider ? (
       <div className="w-full space-y-8">
         <div className="space-y-2">
           <label className="text-[10px] font-bold text-[#0038A8] dark:text-white uppercase tracking-widest ml-4">Student/Faculty ID</label>
           <input
             type="text"
             placeholder="00-00000-000"
             value={idInput}
             onChange={(e) => setIdInput(e.target.value)}
             className="w-full px-8 py-6 rounded-3xl text-3xl font-mono tracking-widest text-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/20 text-[#0038A8] dark:text-white placeholder:text-[#0038A8]/20 dark:placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
           />
         </div>


         <div className="grid grid-cols-2 gap-4">
           <button
             disabled={!validateId(idInput) || isProcessing}
             onClick={() => onNext(idInput, 'student')}
             className="py-6 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] disabled:opacity-50 transition-all flex justify-center items-center"
           >
             {isProcessing ? <Loader2 className="animate-spin" /> : 'Check In'}
           </button>
           <button
             disabled={!validateId(idInput) || isProcessing}
             onClick={() => onCheckOut(idInput)}
             className="py-6 rounded-2xl font-bold uppercase tracking-widest text-sm bg-slate-900 text-white shadow-lg hover:bg-black disabled:opacity-50 transition-all flex justify-center items-center"
           >
              {isProcessing ? <Loader2 className="animate-spin" /> : 'Check Out'}
           </button>
         </div>


         <div className="relative py-4 flex items-center justify-center">
           <div className="absolute inset-0 flex items-center">
             <div className="w-full border-t border-black/10 dark:border-white/20"></div>
           </div>
           <div className="relative px-6 bg-slate-50 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/20 rounded-full">
             <span className="text-[10px] uppercase font-bold text-[#0038A8] dark:text-white tracking-[0.4em] py-2 block">
               Or continue with
             </span>
           </div>
         </div>


         <div className="grid grid-cols-2 gap-4">
           <button
             onClick={() => alert('This requires hardware integration for tapping/scanning an ID.')}
             className="flex items-center justify-center gap-3 py-5 rounded-2xl border border-black/10 dark:border-white/10 text-[#0038A8] dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[10px]"
           >
             <User size={18} />
             Tap/Scan ID
           </button>
           <button
             onClick={() => setIsOutsider(true)}
             className="flex items-center justify-center gap-3 py-5 rounded-2xl border border-black/10 dark:border-white/10 text-[#0038A8] dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[10px]"
           >
             <Users size={18} />
             Register as Outsider
           </button>
         </div>
       </div>
     ) : (
       <div className="w-full space-y-6">
         <div className="flex items-center justify-between mb-4">
           <h3 className="text-xl font-bold text-[#0038A8] dark:text-white uppercase tracking-tight">Outsider Form</h3>
           <button onClick={() => setIsOutsider(false)} className="p-2 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all"><X size={20} /></button>
         </div>


         <div className="space-y-4">
            <InputField label="Full Name" value={outsiderForm.name} onChange={v => setOutsiderForm({...outsiderForm, name: v})} placeholder="John Doe" />
           <div className="grid grid-cols-2 gap-4">
             <InputField label="University" value={outsiderForm.university} onChange={v => setOutsiderForm({...outsiderForm, university: v})} placeholder="School" />
             <InputField label="Occupation" value={outsiderForm.occupation} onChange={v => setOutsiderForm({...outsiderForm, occupation: v})} placeholder="Job" />
           </div>
            <InputField label="Address" value={outsiderForm.address} onChange={v => setOutsiderForm({...outsiderForm, address: v})} placeholder="City, Province" />
            <InputField label="Contact No." value={outsiderForm.contact} onChange={v => setOutsiderForm({...outsiderForm, contact: v})} placeholder="09XXXXXXXXX" />


           <button
             onClick={handleOutsiderSubmit}
             disabled={isProcessing || isOutsiderFormInvalid}
             className="w-full py-5 mt-4 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] transition-all flex justify-center items-center disabled:opacity-50"
           >
              {isProcessing ? <Loader2 className="animate-spin" /> : 'Submit Form'}
           </button>
         </div>
       </div>
     )}
   </motion.div>
 );
}


type InputFieldProps = {
 label: string;
 value: string;
 onChange: (value: string) => void;
 placeholder: string;
};


const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, placeholder }) => {
   return (
       <div className="space-y-1.5">
           <label className="text-[10px] font-bold text-[#0038A8] dark:text-white/60 uppercase tracking-widest ml-4">{label}</label>
           <input
               type="text"
               value={value}
               onChange={e => onChange(e.target.value)}
               className="w-full px-6 py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/20 rounded-2xl text-[#0038A8] dark:text-white focus:outline-none focus:border-blue-500 transition-all"
               placeholder={placeholder}
           />
       </div>
   );
}


type PurposeStepProps = {
 onNext: (purpose: string) => Promise<void>;
 onBack: () => void;
 isProcessing: boolean;
 isDarkMode: boolean;
};


const PurposeStep: React.FC<PurposeStepProps> = ({ onNext, onBack, isProcessing, isDarkMode }) => {
 const [selected, setSelected] = useState('');


 return (
   <motion.div
     initial={{ opacity: 0, scale: 0.95 }}
     animate={{ opacity: 1, scale: 1 }}
     exit={{ opacity: 0, scale: 0.95 }}
     className="w-full bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[40px] overflow-hidden border border-white/20 shadow-2xl"
   >
     <div className="p-10 border-b border-black/10 dark:border-white/10 flex items-center gap-6">
       <button onClick={onBack} className="p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={24} /></button>
       <div>
         <h2 className="text-3xl font-bold text-[#0038A8] dark:text-white tracking-tight uppercase">Purpose of Visit</h2>
         <p className="text-slate-400 dark:text-white/40 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">What brings you to the library today?</p>
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
                 ? "border-blue-500 bg-blue-500/10 text-[#0038A8] dark:text-white shadow-lg"
                 : "border-black/10 dark:border-white/10 text-slate-400 dark:text-white/40 hover:text-[#0038A8] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
             )}
           >
             {p}
             <div className={cn(
               "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
               selected === p
                 ? "border-blue-500 bg-blue-500 text-white"
                 : "border-black/20 dark:border-white/20 group-hover:border-slate-400 dark:group-hover:border-white/40"
             )}>
               {selected === p && <CheckCircle2 size={14} />}
             </div>
           </button>
         ))}
       </div>


       <button
         disabled={!selected || isProcessing}
         onClick={() => onNext(selected)}
         className="w-full mt-6 py-6 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] disabled:opacity-30 transition-all flex items-center justify-center gap-3"
       >
         {isProcessing ? <Loader2 className="animate-spin" /> : "Submit Check-in"}
         {!isProcessing && <ChevronRight size={20} />}
       </button>
     </div>
   </motion.div>
 );
}


const toDate = (timestamp: string | Timestamp | undefined): Date | null => {
   if (!timestamp) return null;
   if (timestamp instanceof Timestamp) {
       return timestamp.toDate();
   }
   return new Date(timestamp);
}


type SuccessStepProps = {
 data: Visitor;
 onReset: () => void;
};


const SuccessStep: React.FC<SuccessStepProps> = ({ data, onReset }) => {
 const isCheckOut = !!data.check_out;
 const timeToShow = toDate(isCheckOut ? data.check_out : data.check_in);


 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     className="w-full bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[40px] p-12 flex flex-col items-center text-center border border-white/20 shadow-2xl"
   >
     <motion.div
       initial={{ scale: 0 }}
       animate={{ scale: 1 }}
       transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
       className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-green-500/30"
     >
       <CheckCircle2 size={48} className="text-white" />
     </motion.div>
    
     <h2 className="text-4xl font-bold text-[#0038A8] dark:text-white mb-2 tracking-tight uppercase">
       {isCheckOut ? "Checked Out!" : "Checked In!"}
     </h2>
     <p className="text-slate-500 dark:text-white/60 font-bold uppercase tracking-[0.2em] text-[10px] mb-10">
       {isCheckOut ? "Thank you for visiting the NEU Library!" : "Welcome! Please observe library protocols."}
     </p>


     <div className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-8 mb-10 text-left space-y-4">
       <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-4">
         <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Visitor</span>
         <span className="text-lg font-bold text-[#0038A8] dark:text-white">{data.name}</span>
       </div>
       {data.identifier && <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-4">
         <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">ID Number</span>
         <span className="text-lg font-mono font-bold text-[#0038A8] dark:text-white tracking-widest">{data.identifier}</span>
       </div>}
       <div className="flex justify-between items-center">
         <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Time</span>
         <span className="text-lg font-bold text-[#0038A8] dark:text-white">
           {timeToShow ? format(timeToShow, 'HH:mm:ss') : 'N/A'}
         </span>
       </div>
     </div>


     <button
       onClick={onReset}
       className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm bg-white text-[#0038A8] shadow-lg hover:bg-white/90 transition-all"
     >
       Done
     </button>
   </motion.div>
 );
}


type ErrorStepProps = {
 message: string;
 onReset: () => void;
};


const ErrorStep: React.FC<ErrorStepProps> = ({ message, onReset }) => {
 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     className="w-full bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[40px] p-12 flex flex-col items-center text-center border border-white/20 shadow-2xl"
   >
     <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-8">
       <AlertCircle size={48} />
     </div>
     <h2 className="text-3xl font-bold text-[#0038A8] dark:text-white mb-2 tracking-tight uppercase">Error</h2>
     <p className="text-red-500 font-bold mb-10 px-8 text-sm">{message}</p>


     <button
       onClick={onReset}
       className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm bg-white text-slate-900 shadow-lg hover:bg-white/90 transition-all"
     >
       Back to Homepage
     </button>
   </motion.div>
 );
}


type AdminFlowProps = {
 isLoggedIn: boolean;
 onLoginSuccess: () => void;
 onLogout: () => void;
 isDarkMode: boolean;
};


const AdminFlow: React.FC<AdminFlowProps> = ({ isLoggedIn, onLoginSuccess, onLogout, isDarkMode }) => {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [loginError, setLoginError] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [visitors, setVisitors] = useState<Visitor[]>([]);
 const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  useEffect(() => {
   if (isLoggedIn) {
     const seedDatabase = async () => {
       const membersCollection = collection(db, "members");
       const snapshot = await getDocs(query(membersCollection, limit(1)));
       if (snapshot.empty) {
         console.log("Seeding database with initial members...");
         const batch = writeBatch(db);
         INITIAL_MEMBERS.forEach(member => {
           const docRef = doc(membersCollection);
           batch.set(docRef, member);
         });
         await batch.commit();
         console.log("Database seeded successfully!");
       }
     };


     seedDatabase();


     const visitorsQuery = query(collection(db, "visitors"), orderBy("check_in", "desc"));
     const unsubscribe = onSnapshot(visitorsQuery, (querySnapshot) => {
       const visitorList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visitor));
       setVisitors(visitorList);
     }, (error) => {
         console.error("Error fetching visitors:", error);
     });
      return () => unsubscribe();
   }
 }, [isLoggedIn]);


 const handleLogin = (e: React.FormEvent) => {
   e.preventDefault();
   setIsLoading(true);
   setLoginError('');


   setTimeout(() => {
     if (ADMIN_ACCOUNTS[email] && ADMIN_ACCOUNTS[email] === password) {
       onLoginSuccess();
     } else {
       setLoginError("Authentication failed. Please check your credentials.");
     }
     setIsLoading(false);
   }, 1000);
 };


 const downloadReport = () => {
   const doc = new jsPDF();
   doc.text("Library Usage Report", 20, 10);
   autoTable(doc, {
       head: [['Name', 'Type', 'Check In', 'Check Out', 'Purpose']],
       body: visitors.map(v => [
           v.name,
           v.type,
           v.check_in ? format(toDate(v.check_in)!, 'MMM dd, yyyy HH:mm') : 'N/A',
           v.check_out ? format(toDate(v.check_out)!, 'HH:mm') : 'Active',
           v.purpose
       ])
   });
   doc.save('library-report.pdf');
 };
  const handleProfileClick = (visitor: Visitor) => {
   setSelectedVisitor(visitor);
 };
  const todayVisitors = visitors.filter(v => toDate(v.check_in) && isToday(toDate(v.check_in)!)).length;
 const activeVisitors = visitors.filter(v => v.check_in && !v.check_out).length;


 const checkedOutVisitors = visitors.filter(v => v.check_in && v.check_out);
 const totalStayMinutes = checkedOutVisitors.reduce((acc, v) => {
     const checkInDate = toDate(v.check_in);
     const checkOutDate = toDate(v.check_out);
     if(checkInDate && checkOutDate) {
         return acc + differenceInMinutes(checkOutDate, checkInDate);
     }
     return acc;
 }, 0);
 const avgStayMinutes = checkedOutVisitors.length > 0 ? Math.round(totalStayMinutes / checkedOutVisitors.length) : 0;




 if (!isLoggedIn) {
   return (
     <div className="flex items-center justify-center w-full min-h-[60vh]">
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="w-full max-w-md bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[40px] p-12 flex flex-col items-center border border-white/20 shadow-2xl"
       >
         <div className="flex items-center gap-6 mb-10 w-full border-b border-black/10 dark:border-white/10 pb-8">
           <img src={LOGO_IMAGE} alt="Logo" width={64} height={64} />
           <div className="text-left">
             <h2 className="text-2xl font-bold text-[#0038A8] dark:text-white uppercase tracking-tight">Admin Portal</h2>
             <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Authorized Only</p>
           </div>
         </div>
         <form onSubmit={handleLogin} className="w-full space-y-6">
           <InputField label="Email Address" value={email} onChange={setEmail} placeholder="admin@neu.edu.ph" />
           <div className="space-y-1.5">
               <label className="text-[10px] font-bold text-[#0038A8] dark:text-white/40 uppercase tracking-widest ml-4">Password</label>
               <input
                   type="password"
                   required
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                   className="w-full px-6 py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/20 rounded-2xl text-[#0038A8] dark:text-white focus:outline-none focus:border-blue-500"
                   placeholder="••••••••"
               />
           </div>
           {loginError && <div className="p-4 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold text-center">{loginError}</div>}
           <button type="submit" disabled={isLoading} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-sm bg-[#0038A8] text-white shadow-lg shadow-blue-900/30 hover:bg-[#002d8a] transition-all flex justify-center items-center">
             {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
           </button>
         </form>
       </motion.div>
     </div>
   );
 }


 return (
   <div className="space-y-8 w-full animate-in fade-in duration-700">
     <div className="flex justify-between items-end">
       <div>
         <h1 className="text-4xl font-black text-[#0038A8] dark:text-white uppercase tracking-tight">Dashboard Overview</h1>
         <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-[0.4em] mt-2">Library Traffic Analytics</p>
       </div>
       <div className="flex gap-4">
         <button onClick={downloadReport} className="px-8 py-3 rounded-2xl bg-green-500 text-white font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-green-600 transition-all flex items-center gap-2">
           <Download size={14} />
           Download Report
         </button>
         <button onClick={onLogout} className="px-8 py-3 rounded-2xl bg-red-500 text-white font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-red-600 transition-all">
           Logout
         </button>
       </div>
     </div>


     <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
       <StatCard icon={<Users className="text-[#0038A8]" />} label="Total Visitors" value={visitors.length} isDarkMode={isDarkMode} />
       <StatCard icon={<Clock className="text-[#0038A8]" />} label="Avg. Stay" value={`${avgStayMinutes} min`} isDarkMode={isDarkMode} />
       <StatCard icon={<Calendar className="text-[#0038A8]" />} label="Today" value={todayVisitors} isDarkMode={isDarkMode} />
       <StatCard icon={<History className="text-[#0038A8]" />} label="Active" value={activeVisitors} isDarkMode={isDarkMode} />
     </div>


     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
       <div className="lg:col-span-3 bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[40px] p-10 border border-white/20 shadow-2xl">
          <ActivityLog visitors={visitors} onProfileClick={handleProfileClick} />
       </div>
     </div>
    
     {selectedVisitor && <ProfileView visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />}
   </div>
 );
}


type StatCardProps = {
 icon: React.ReactNode;
 label: string;
 value: string | number;
 isDarkMode: boolean;
};


const StatCard: React.FC<StatCardProps> = ({ icon, label, value, isDarkMode }) => {
 return (
   <div className="p-8 bg-white/80 dark:bg-white/10 backdrop-blur-2xl rounded-[32px] flex items-center gap-6 group hover:scale-[1.02] transition-all border border-white/20 shadow-xl">
     <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center transition-all shadow-sm group-hover:rotate-6">
       {React.cloneElement(icon as React.ReactElement, { size: 24 })}
     </div>
     <div>
       <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-2xl font-bold text-[#0038A8] dark:text-white tracking-tight">{value}</p>
     </div>
   </div>
 );
}


type ActivityLogProps = {
 visitors: Visitor[];
 onProfileClick: (visitor: Visitor) => void;
};


const ActivityLog: React.FC<ActivityLogProps> = ({ visitors, onProfileClick }) => {
 const [filter, setFilter] = useState('all');


 const filteredVisitors = visitors.filter(visitor => {
   const checkInDate = toDate(visitor.check_in);
   if (!checkInDate) return false;


   if (filter === 'all') return true;
   if (filter === 'year') return isThisYear(checkInDate);
   if (filter === 'month') return isThisMonth(checkInDate);
   if (filter === 'week') return isThisWeek(checkInDate);
   return true;
 });


 return (
   <div className="w-full">
     <div className="flex justify-between items-center mb-8">
       <h3 className="text-xl font-bold text-[#0038A8] dark:text-white uppercase tracking-tight">Activity Log</h3>
       <div className="flex items-center gap-2">
         <Filter size={16} className="text-slate-400" />
         <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-transparent text-slate-400 text-sm focus:outline-none border-none p-2 rounded-lg dark:bg-slate-800">
           <option value="all">All</option>
           <option value="week">This Week</option>
           <option value="month">This Month</option>
           <option value="year">This Year</option>
         </select>
       </div>
     </div>
     <div className="overflow-y-auto max-h-[500px]">
       <table className="w-full text-left">
         <thead className="sticky top-0 bg-white/80 dark:bg-white/10 backdrop-blur-xl z-10">
           <tr className="border-b border-black/10 dark:border-white/10">
             <th className="p-4 text-sm font-bold text-slate-400 dark:text-white/40 uppercase">Name</th>
             <th className="p-4 text-sm font-bold text-slate-400 dark:text-white/40 uppercase">Time In</th>
             <th className="p-4 text-sm font-bold text-slate-400 dark:text-white/40 uppercase">Time Out</th>
             <th className="p-4 text-sm font-bold text-slate-400 dark:text-white/40 uppercase">Date</th>
             <th className="p-4 text-sm font-bold text-slate-400 dark:text-white/40 uppercase">Purpose</th>
           </tr>
         </thead>
         <tbody>
           {filteredVisitors.map(visitor => {
             const checkInDate = toDate(visitor.check_in);
             const checkOutDate = toDate(visitor.check_out);
             return (
             <tr key={visitor.id} onClick={() => onProfileClick(visitor)} className="border-b border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors">
               <td className="p-4 text-sm text-[#0038A8] dark:text-white font-semibold">{visitor.name}</td>
               <td className="p-4 text-sm text-[#0.0038A8] dark:text-white">{checkInDate ? format(checkInDate, 'HH:mm:ss') : 'N/A'}</td>
               <td className="p-4 text-sm text-[#0038A8] dark:text-white">{checkOutDate ? format(checkOutDate, 'HH:mm:ss') : <span className="text-green-500 font-bold text-xs">ACTIVE</span>}</td>
               <td className="p-4 text-sm text-[#0038A8] dark:text-white">{checkInDate ? format(checkInDate, 'MMM dd, yyyy') : 'N/A'}</td>
               <td className="p-4 text-sm text-[#0038A8] dark:text-white">{visitor.purpose}</td>
             </tr>
           )})}
         </tbody>
       </table>
     </div>
   </div>
 );
}


type ProfileViewProps = {
 visitor: Visitor;
 onClose: () => void;
};


const ProfileView: React.FC<ProfileViewProps> = ({ visitor, onClose }) => {
 return (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in">
     <motion.div
       initial={{ opacity: 0, scale: 0.9 }}
       animate={{ opacity: 1, scale: 1 }}
       exit={{ opacity: 0, scale: 0.9 }}
       className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[40px] p-10 border border-white/20 shadow-2xl w-full max-w-md"
     >
       <div className="flex justify-between items-center mb-8">
         <h3 className="text-xl font-bold text-[#0038A8] dark:text-white uppercase tracking-tight">{visitor.name}</h3>
         <button onClick={onClose} className="p-2 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-all"><X size={20} /></button>
       </div>
       <div className="space-y-4">
         {visitor.identifier && <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
           <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">ID:</span>
           <span className="font-mono text-[#0038A8] dark:text-white">{visitor.identifier}</span>
         </div>}
         <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
           <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">Type:</span>
           <span className="font-semibold text-[#0038A8] dark:text-white capitalize">{visitor.type}</span>
         </div>
         {visitor.department && (
           <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
             <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">Department:</span>
             <span className="font-semibold text-[#0038A8] dark:text-white">{visitor.department}</span>
           </div>
         )}
          {visitor.details && (
           <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
             <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">Details:</span>
             <span className="font-semibold text-[#0038A8] dark:text-white">{visitor.details}</span>
           </div>
         )}
         {visitor.university && (
           <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
             <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">University:</span>
             <span className="font-semibold text-[#0038A8] dark:text-white">{visitor.university}</span>
           </div>
         )}
         {visitor.contact && (
            <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
             <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">Contact:</span>
             <span className="font-semibold text-[#0038A8] dark:text-white">{visitor.contact}</span>
           </div>
         )}
          {visitor.address && (
            <div className="flex justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
             <span className="font-bold text-slate-400 dark:text-white/40 text-xs uppercase">Address:</span>
             <span className="font-semibold text-[#0038A8] dark:text-white">{visitor.address}</span>
           </div>
         )}
       </div>
     </motion.div>
   </div>
 );
}
