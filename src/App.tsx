import { useState, useEffect, useMemo, FormEvent, useRef } from 'react';
import useSound from 'use-sound';
import { 
  BookOpen, 
  Plus, 
  History as HistoryIcon, 
  ChevronRight, 
  Trash2, 
  Calendar,
  X,
  CheckCircle2,
  TrendingUp,
  LayoutGrid,
  Info,
  Home,
  ListTodo,
  Clock,
  ArrowRight,
  RotateCcw,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Star,
  CheckSquare,
  Square,
  Key,
  Lock,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HatimData, ReadingLog, HatimTask } from './types';
import { useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { syncDataToFirebase, listenToFirebaseData } from './services/db';
import { auth } from './lib/firebase';
import { signOut, deleteUser, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { QRCodeSVG } from 'qrcode.react';
import { getFirebaseErrorMessage } from './lib/firebaseErrors';
import * as OTPAuth from 'otpauth';

const STORAGE_KEY = 'hatim_tracker_data_v3';
const QURAN_TOTAL_PAGES = 604;

const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 
  202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582, 605
];

const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  delete: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  open: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
};

const recalculateTaskLogs = (logs: ReadingLog[], task: HatimTask) => {
  const taskLogs = logs.filter(l => l.taskId === task.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  let basePage = task.startPage - 1;
  const recalculatedTaskLogs = taskLogs.map(log => {
    const absolutePage = Math.min(task.endPage, basePage + log.pagesRead);
    const actualPagesRead = absolutePage - basePage;
    basePage = absolutePage;
    return {
      ...log,
      absolutePage: absolutePage,
      pagesRead: actualPagesRead
    };
  }).filter(log => log.pagesRead > 0);

  const otherLogs = logs.filter(l => l.taskId !== task.id);
  
  return {
    logs: [...recalculatedTaskLogs, ...otherLogs],
    latestAbsolutePage: basePage
  };
};

type View = 'home' | 'tasks' | 'history' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('home');
  const [data, setData] = useState<HatimData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved data", e);
      }
    }
    
    // Default initial task
    const initialTaskId = crypto.randomUUID();
    const initialTask: HatimTask = {
      id: initialTaskId,
      name: "Tam Hatim",
      startPage: 1,
      endPage: QURAN_TOTAL_PAGES,
      currentPage: 0,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    return {
      activeTaskId: initialTaskId,
      tasks: [initialTask],
      logs: [],
    };
  });

  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isJuzPickerOpen, setIsJuzPickerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isDeleteAccountConfirmOpen, setIsDeleteAccountConfirmOpen] = useState(false);
  
  // 2FA States
  const [isEnrolling2FA, setIsEnrolling2FA] = useState(false);
  const [totpSecret, setTotpSecret] = useState<any>(null);
  const [totpCode, setTotpCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);
  const [isMfaEnrolled, setIsMfaEnrolled] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordChangeTotp, setPasswordChangeTotp] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState<string | null>(null);

  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordResetTotp, setPasswordResetTotp] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBulkDeleteLogs = () => {
    if (selectedLogs.length === 0) return;
    playDelete();
    setData(prev => {
      const filteredLogs = prev.logs.filter(log => !selectedLogs.includes(log.id));
      let updatedLogs = filteredLogs;
      
      const updatedTasks = prev.tasks.map(task => {
        const { logs: newLogs, latestAbsolutePage } = recalculateTaskLogs(updatedLogs, task);
        updatedLogs = newLogs;
        return {
          ...task,
          currentPage: latestAbsolutePage,
          isCompleted: latestAbsolutePage >= task.endPage
        };
      });
      return { ...prev, logs: updatedLogs, tasks: updatedTasks };
    });
    setSelectedLogs([]);
  };

  const handleBulkDeleteTasks = () => {
    if (selectedTasks.length === 0) return;
    if (data.tasks.length - selectedTasks.length < 1) {
      setErrorMessage("En az bir görev kalmalıdır.");
      return;
    }
    playDelete();
    setData(prev => {
      const remainingTasks = prev.tasks.filter(t => !selectedTasks.includes(t.id));
      const remainingLogs = prev.logs.filter(l => !selectedTasks.includes(l.taskId));
      const newActiveId = selectedTasks.includes(prev.activeTaskId) ? remainingTasks[0].id : prev.activeTaskId;
      return { ...prev, tasks: remainingTasks, logs: remainingLogs, activeTaskId: newActiveId };
    });
    setSelectedTasks([]);
  };

  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('hatim_sound_enabled');
    return saved === null ? true : saved === 'true';
  });

  const [isSplashEnabled, setIsSplashEnabled] = useState(() => {
    const saved = localStorage.getItem('hatim_splash_enabled');
    return saved === null ? true : saved === 'true';
  });

  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash if it's enabled and it's a fresh load (not handled by state persistence across views)
    return isSplashEnabled;
  });

  // Sounds
  const [playClick] = useSound(SOUNDS.click, { soundEnabled: isSoundEnabled, volume: 0.5 });
  const [playSuccess] = useSound(SOUNDS.success, { soundEnabled: isSoundEnabled, volume: 0.5 });
  const [playDelete] = useSound(SOUNDS.delete, { soundEnabled: isSoundEnabled, volume: 0.5 });
  const [playOpen] = useSound(SOUNDS.open, { soundEnabled: isSoundEnabled, volume: 0.5 });
  
  // Form States
  const [newPageInput, setNewPageInput] = useState<string>('');
  const [newLogDate, setNewLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startJuzSelection, setStartJuzSelection] = useState<number | null>(null);
  const [customStartPage, setCustomStartPage] = useState<string>('1');
  const [customEndPage, setCustomEndPage] = useState<string>('604');
  const [customTaskName, setCustomTaskName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  
  const isFirebaseSyncing = useRef(false);
  const isInitialLoad = useRef(true);

  // Check 2FA Enrollment status
  useEffect(() => {
    if (user && data.mfaEnabled) {
      setIsMfaEnrolled(true);
    } else {
      setIsMfaEnrolled(false);
    }
  }, [user, data.mfaEnabled]);

  // Listen to Firebase data
  useEffect(() => {
    if (user && !authLoading) {
      isInitialLoad.current = true;
      const unsubscribe = listenToFirebaseData(user.uid, (firebaseData) => {
        if (firebaseData) {
          setData(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(firebaseData)) {
              isFirebaseSyncing.current = true;
              return firebaseData;
            }
            return prev;
          });
        } else {
          // Firebase has no data, push local data
          if (isInitialLoad.current) {
            syncDataToFirebase(user.uid, data);
          }
        }
        isInitialLoad.current = false;
      });
      return () => unsubscribe();
    }
  }, [user, authLoading]);

  // Sync to Firebase when local data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    if (isFirebaseSyncing.current) {
      isFirebaseSyncing.current = false;
      return;
    }

    if (user && !authLoading && !isInitialLoad.current) {
      syncDataToFirebase(user.uid, data);
    }
  }, [data, user, authLoading]);

  useEffect(() => {
    localStorage.setItem('hatim_sound_enabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);

  useEffect(() => {
    localStorage.setItem('hatim_splash_enabled', isSplashEnabled.toString());
  }, [isSplashEnabled]);

  useEffect(() => {
    if (!isSplashEnabled) {
      setShowSplash(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [isSplashEnabled]);

  const activeTask = useMemo(() => {
    return data.tasks.find(t => t.id === data.activeTaskId) || data.tasks[0];
  }, [data.activeTaskId, data.tasks]);

  const activeTaskLogs = useMemo(() => {
    return data.logs
      .filter(l => l.taskId === activeTask.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.logs, activeTask.id]);

  const totalPagesInRange = useMemo(() => {
    return activeTask.endPage - activeTask.startPage + 1;
  }, [activeTask]);

  const pagesReadInRange = useMemo(() => {
    return activeTaskLogs.reduce((sum, log) => sum + log.pagesRead, 0);
  }, [activeTaskLogs]);

  const progress = useMemo(() => {
    if (totalPagesInRange <= 0) return 0;
    return Math.min(100, Math.max(0, (pagesReadInRange / totalPagesInRange) * 100));
  }, [pagesReadInRange, totalPagesInRange]);

  const handleAddLog = (e: FormEvent) => {
    e.preventDefault();
    const pagesReadInput = parseInt(newPageInput);
    if (isNaN(pagesReadInput) || pagesReadInput <= 0) return;

    // Check if adding these pages exceeds the task's end page
    const totalPagesRead = activeTaskLogs.reduce((sum, log) => sum + log.pagesRead, 0);
    const remainingPages = (activeTask.endPage - activeTask.startPage + 1) - totalPagesRead;
    
    if (remainingPages <= 0) {
      playDelete();
      setErrorMessage("Bu görev zaten tamamlanmış.");
      return;
    }

    const actualPagesRead = Math.min(pagesReadInput, remainingPages);

    playSuccess();

    // To handle multiple logs on the same day correctly, we append the current time to the selected date
    const now = new Date();
    const selectedDate = new Date(newLogDate);
    selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

    const newLog: ReadingLog = {
      id: crypto.randomUUID(),
      taskId: activeTask.id,
      date: selectedDate.toISOString(),
      pagesRead: actualPagesRead,
      absolutePage: 0, // Will be recalculated
    };

    setData(prev => {
      const allLogs = [newLog, ...prev.logs];
      const { logs: newLogs, latestAbsolutePage } = recalculateTaskLogs(allLogs, activeTask);
      
      return {
        ...prev,
        logs: newLogs,
        tasks: prev.tasks.map(t => t.id === activeTask.id ? {
          ...t,
          currentPage: latestAbsolutePage,
          isCompleted: latestAbsolutePage >= t.endPage
        } : t)
      };
    });

    setNewPageInput('');
    setIsAddLogOpen(false);
  };

  const handleDeleteLog = (id: string) => {
    playDelete();
    setData(prev => {
      const filteredLogs = prev.logs.filter(log => log.id !== id);
      const { logs: newLogs, latestAbsolutePage } = recalculateTaskLogs(filteredLogs, activeTask);
      
      return {
        ...prev,
        logs: newLogs,
        tasks: prev.tasks.map(t => t.id === activeTask.id ? {
          ...t,
          currentPage: latestAbsolutePage,
          isCompleted: latestAbsolutePage >= t.endPage
        } : t)
      };
    });
  };

  const createNewTask = (name: string, start: number, end: number) => {
    const newId = crypto.randomUUID();
    const newTask: HatimTask = {
      id: newId,
      name: name,
      startPage: start,
      endPage: end,
      currentPage: 0,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      tasks: [newTask, ...prev.tasks],
      activeTaskId: newId
    }));
    
    playSuccess();
    setIsAddTaskOpen(false);
    setIsJuzPickerOpen(false);
    setActiveView('home');
  };

  const handleJuzClick = (juz: number) => {
    playClick();
    if (startJuzSelection === null) {
      setStartJuzSelection(juz);
    } else {
      const startJuz = Math.min(startJuzSelection, juz);
      const endJuz = Math.max(startJuzSelection, juz);
      const start = JUZ_START_PAGES[startJuz - 1];
      const end = JUZ_START_PAGES[endJuz] - 1;
      createNewTask(`${startJuz}-${endJuz}. Cüzler`, start, end);
      setStartJuzSelection(null);
    }
  };

  const handleCustomTaskSubmit = (e: FormEvent) => {
    e.preventDefault();
    const start = parseInt(customStartPage);
    const end = parseInt(customEndPage);
    if (isNaN(start) || isNaN(end) || start <= 0 || end < start || end > QURAN_TOTAL_PAGES) return;
    createNewTask(customTaskName || `${start}-${end}. Sayfalar`, start, end);
  };

  const deleteTask = (id: string) => {
    if (data.tasks.length <= 1) {
      playDelete();
      setErrorMessage("En az bir görev bulunmalıdır.");
      return;
    }
    playClick();
    setTaskToDelete(id);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    playDelete();
    const id = taskToDelete;
    setData(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== id),
      logs: prev.logs.filter(l => l.taskId !== id),
      activeTaskId: prev.activeTaskId === id ? prev.tasks.find(t => t.id !== id)!.id : prev.activeTaskId
    }));
    setTaskToDelete(null);
  };

  const resetData = () => {
    playDelete();
    const initialTaskId = crypto.randomUUID();
    const initialTask: HatimTask = {
      id: initialTaskId,
      name: "Tam Hatim",
      startPage: 1,
      endPage: QURAN_TOTAL_PAGES,
      currentPage: 0,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    
    setData({
      activeTaskId: initialTaskId,
      tasks: [initialTask],
      logs: [],
    });
    setIsResetConfirmOpen(false);
    setActiveView('home');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setPasswordChangeError(null);
    setPasswordChangeSuccess(null);

    if (newPassword !== newPasswordConfirm) {
      setPasswordChangeError("Yeni şifreler eşleşmiyor.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeError("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }

    if (isMfaEnrolled) {
      if (!passwordChangeTotp) {
        setPasswordChangeError("Lütfen 2FA kodunu girin.");
        return;
      }
      try {
        const totp = new OTPAuth.TOTP({
          issuer: "Hatim Pro",
          label: user.email,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(data.totpSecret!),
        });
        const delta = totp.validate({ token: passwordChangeTotp, window: 1 });
        if (delta === null) {
          setPasswordChangeError("Girdiğiniz 2FA kodu hatalı veya süresi dolmuş.");
          return;
        }
      } catch (err) {
        setPasswordChangeError("2FA doğrulaması sırasında bir hata oluştu.");
        return;
      }
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setPasswordChangeSuccess("Şifreniz başarıyla değiştirildi.");
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setPasswordChangeTotp('');
      setTimeout(() => setIsChangingPassword(false), 3000);
    } catch (error: any) {
      setPasswordChangeError(getFirebaseErrorMessage(error));
    }
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setPasswordResetError(null);
    setPasswordResetSuccess(null);

    if (isMfaEnrolled) {
      if (!passwordResetTotp) {
        setPasswordResetError("Lütfen 2FA kodunu girin.");
        return;
      }
      try {
        const totp = new OTPAuth.TOTP({
          issuer: "Hatim Pro",
          label: user.email,
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(data.totpSecret!),
        });
        const delta = totp.validate({ token: passwordResetTotp, window: 1 });
        if (delta === null) {
          setPasswordResetError("Girdiğiniz 2FA kodu hatalı veya süresi dolmuş.");
          return;
        }
      } catch (err) {
        setPasswordResetError("2FA doğrulaması sırasında bir hata oluştu.");
        return;
      }
    }

    try {
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, user.email, actionCodeSettings);
      setPasswordResetSuccess("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
      setPasswordResetTotp('');
      setTimeout(() => setIsResettingPassword(false), 3000);
    } catch (error: any) {
      setPasswordResetError(getFirebaseErrorMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      playDelete();
      // First delete data from Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      // Then delete user account
      await deleteUser(user);
      
      // Reset local data
      resetData();
      setIsDeleteAccountConfirmOpen(false);
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        setErrorMessage("Hesabınızı silmek için güvenlik nedeniyle yeniden giriş yapmanız gerekmektedir. Lütfen çıkış yapıp tekrar giriş yapın ve tekrar deneyin.");
      } else {
        setErrorMessage("Hesap silinirken bir hata oluştu: " + getFirebaseErrorMessage(error));
      }
      setIsDeleteAccountConfirmOpen(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!user) return;
    setMfaError(null);
    setMfaSuccess(null);
    try {
      const secret = new OTPAuth.Secret({ size: 20 });
      setTotpSecret(secret.base32);
      setIsEnrolling2FA(true);
    } catch (error: any) {
      setMfaError("2FA başlatılırken hata oluştu.");
    }
  };

  const handleConfirm2FA = async () => {
    if (!user || !totpSecret || !totpCode) return;
    setMfaError(null);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: "Hatim Pro",
        label: user.email || "Kullanıcı",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(totpSecret),
      });

      const delta = totp.validate({ token: totpCode, window: 1 });
      
      if (delta !== null) {
        setIsEnrolling2FA(false);
        setTotpSecret(null);
        setTotpCode('');
        setMfaSuccess('İki faktörlü doğrulama başarıyla etkinleştirildi.');
        setIsMfaEnrolled(true);
        setData(prev => ({ ...prev, mfaEnabled: true, totpSecret: totpSecret }));
      } else {
        setMfaError("Girdiğiniz kod hatalı veya süresi dolmuş.");
      }
    } catch (error: any) {
      setMfaError("Doğrulama sırasında bir hata oluştu.");
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;
    setMfaError(null);
    setMfaSuccess(null);
    try {
      setMfaSuccess('İki faktörlü doğrulama devre dışı bırakıldı.');
      setIsMfaEnrolled(false);
      setData(prev => ({ ...prev, mfaEnabled: false, totpSecret: undefined }));
    } catch (error: any) {
      setMfaError("Devre dışı bırakılırken hata oluştu.");
    }
  };

  // Views
  const renderHome = () => (
    <div className="space-y-8 pb-24">
      {/* Range Info Badge */}
      <div className="flex justify-center">
        <div className="bg-sage-100/50 border border-sage-200 rounded-full px-4 py-1.5 flex items-center gap-2 text-sage-700 text-sm font-medium">
          <Info size={14} />
          <span>{activeTask.name}: {activeTask.startPage} - {activeTask.endPage}</span>
        </div>
      </div>

      {/* Progress Card */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-sage-100 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <BookOpen size={120} />
        </div>
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-sage-500">İlerleme</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl font-bold text-sage-800">{progress.toFixed(1)}%</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold uppercase tracking-wider text-sage-500">Mevcut Sayfa</span>
            <div className="text-2xl font-bold text-sage-700">
              {activeTask.currentPage || activeTask.startPage} <span className="text-sage-300 font-normal">/</span> {activeTask.endPage}
            </div>
          </div>
        </div>

        <div className="h-4 bg-sage-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-sage-500 rounded-full"
          />
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-sage-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg text-sage-600 shadow-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-sage-500 font-semibold uppercase tracking-tighter">Kalan</p>
              <p className="text-lg font-bold text-sage-800">{Math.max(0, totalPagesInRange - pagesReadInRange)}</p>
            </div>
          </div>
          <div className="bg-sage-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg text-sage-600 shadow-sm">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs text-sage-500 font-semibold uppercase tracking-tighter">Okunan</p>
              <p className="text-lg font-bold text-sage-800">{pagesReadInRange}</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button 
          onClick={() => { playOpen(); setIsAddLogOpen(true); }}
          className="flex-1 bg-sage-600 hover:bg-sage-700 text-white rounded-2xl py-4 px-6 font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-sage-200 active:scale-95"
        >
          <Plus size={20} />
          İlerleme Kaydet
        </button>
      </div>

      {/* Recent History for Active Task */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <HistoryIcon size={18} className="text-sage-500" />
            <h2 className="text-lg font-bold text-sage-800">Son Okumalar</h2>
          </div>
          <button onClick={() => { playClick(); setActiveView('history'); }} className="text-sage-500 text-sm font-semibold hover:underline">Tümü</button>
        </div>

        <div className="space-y-3">
          {activeTaskLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="bg-white rounded-2xl p-4 border border-sage-100 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="bg-sage-50 p-3 rounded-xl text-sage-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-sage-800">
                    {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-xs text-sage-500">
                    {log.pagesRead} sayfa • <span className="font-semibold text-sage-600">Sayfa {log.absolutePage}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteLog(log.id)}
                className="p-2 text-sage-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {activeTaskLogs.length === 0 && (
            <div className="bg-white/50 border border-dashed border-sage-300 rounded-2xl p-12 text-center">
              <p className="text-sage-500 italic">Henüz bir kayıt bulunmuyor.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-bold text-sage-800">Görevlerim</h2>
        <div className="flex items-center gap-2">
          {selectedTasks.length > 0 && (
            <button 
              onClick={handleBulkDeleteTasks}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={16} />
              Sil ({selectedTasks.length})
            </button>
          )}
          <button 
            onClick={() => { playOpen(); setIsAddTaskOpen(true); }}
            className="bg-sage-100 text-sage-600 p-2 rounded-full hover:bg-sage-200 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {data.tasks.map((task) => {
          const isCurrent = task.id === data.activeTaskId;
          const taskLogs = data.logs.filter(l => l.taskId === task.id);
          const taskPagesRead = taskLogs.reduce((sum, log) => sum + log.pagesRead, 0);
          const taskTotalPages = task.endPage - task.startPage + 1;
          const taskProgress = Math.min(100, (taskPagesRead / taskTotalPages) * 100);
          
          return (
            <motion.div 
              key={task.id}
              layout
              className={`bg-white rounded-3xl p-6 border-2 transition-all flex items-start gap-4 ${isCurrent ? 'border-sage-500 shadow-md' : 'border-transparent shadow-sm'}`}
            >
              <button 
                onClick={() => {
                  playClick();
                  setSelectedTasks(prev => 
                    prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                  );
                }}
                className={`mt-1 transition-colors ${selectedTasks.includes(task.id) ? 'text-sage-600' : 'text-sage-200'}`}
              >
                {selectedTasks.includes(task.id) ? <CheckSquare size={22} /> : <Square size={22} />}
              </button>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div onClick={() => { playClick(); setData(prev => ({ ...prev, activeTaskId: task.id })); setActiveView('home'); }} className="cursor-pointer flex-1">
                    <h3 className="text-lg font-bold text-sage-800 flex items-center gap-2">
                      {task.name}
                      {task.isCompleted && <CheckCircle2 size={18} className="text-emerald-500" />}
                    </h3>
                    <p className="text-sm text-sage-500">{task.startPage} - {task.endPage}. Sayfalar</p>
                  </div>
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="text-sage-200 hover:text-red-500 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-sage-500">
                    <span>{taskProgress.toFixed(1)}%</span>
                    <span>{taskPagesRead} / {taskTotalPages} Sayfa</span>
                  </div>
                  <div className="h-2 bg-sage-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sage-500 rounded-full transition-all duration-1000"
                      style={{ width: `${taskProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-bold text-sage-800">Tüm Geçmiş</h2>
        {selectedLogs.length > 0 && (
          <button 
            onClick={handleBulkDeleteLogs}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
            Sil ({selectedLogs.length})
          </button>
        )}
      </div>

      <div className="space-y-3">
        {data.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((log) => {
          const task = data.tasks.find(t => t.id === log.taskId);
          const isSelected = selectedLogs.includes(log.id);

          return (
            <div key={log.id} className={`bg-white rounded-2xl p-4 border transition-all flex items-center gap-4 ${isSelected ? 'border-sage-500 bg-sage-50/30' : 'border-sage-100 shadow-sm'}`}>
              <button 
                onClick={() => {
                  playClick();
                  setSelectedLogs(prev => 
                    prev.includes(log.id) ? prev.filter(id => id !== log.id) : [...prev, log.id]
                  );
                }}
                className={`transition-colors ${isSelected ? 'text-sage-600' : 'text-sage-200'}`}
              >
                {isSelected ? <CheckSquare size={22} /> : <Square size={22} />}
              </button>

              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-sage-50 p-3 rounded-xl text-sage-600">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sage-800">
                      {new Date(log.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-sage-500">
                      {task?.name || 'Silinmiş Görev'} • {log.pagesRead} sayfa • <span className="font-semibold text-sage-600">Sayfa {log.absolutePage}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDeleteLog(log.id)} className="text-sage-200 hover:text-red-500 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {data.logs.length === 0 && (
          <div className="bg-white/50 border border-dashed border-sage-300 rounded-2xl p-12 text-center">
            <p className="text-sage-500 italic">Henüz bir kayıt bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8 pb-24">
      <h2 className="text-2xl font-bold text-sage-800 px-2">Ayarlar</h2>
      
      <div className="space-y-4">
        <section className="bg-white rounded-3xl p-6 border border-sage-100 shadow-sm">
          <h3 className="text-sm font-bold text-sage-500 uppercase tracking-widest mb-4">Hesap & Eşitleme</h3>
          
          <div className="space-y-4">
            {user ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sage-800">Giriş Yapıldı</p>
                    <p className="text-xs text-sage-500">{user.email}</p>
                  </div>
                </div>

                {/* 2FA Section */}
                <div className="mt-4 p-4 bg-sage-50 rounded-2xl border border-sage-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Key size={18} className="text-sage-600" />
                      <span className="font-bold text-sage-800 text-sm">İki Faktörlü Doğrulama (2FA)</span>
                    </div>
                    {isMfaEnrolled ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">Aktif</span>
                    ) : (
                      <span className="text-xs font-bold text-sage-500 bg-sage-200 px-2 py-1 rounded-md">Pasif</span>
                    )}
                  </div>
                  
                  {mfaError && <p className="text-xs text-red-600 mb-2">{mfaError}</p>}
                  {mfaSuccess && <p className="text-xs text-emerald-600 mb-2">{mfaSuccess}</p>}

                  {isEnrolling2FA && totpSecret ? (
                    <div className="mt-4 space-y-4">
                      <p className="text-xs text-sage-600">
                        1. Authenticator uygulamanızı (Google Authenticator, Authy vb.) açın ve aşağıdaki QR kodu okutun:
                      </p>
                      <div className="bg-white p-4 rounded-xl flex justify-center">
                        <QRCodeSVG 
                          value={`otpauth://totp/Hatim%20Pro:${user.email || 'Kullanıcı'}?secret=${totpSecret}&issuer=Hatim%20Pro`} 
                          size={150} 
                        />
                      </div>
                      <p className="text-xs text-sage-600 text-center font-mono bg-white p-2 rounded-lg border border-sage-100">
                        {totpSecret}
                      </p>
                      <p className="text-xs text-sage-600">
                        2. Uygulamada görünen 6 haneli kodu aşağıya girin:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={totpCode}
                          onChange={(e) => setTotpCode(e.target.value)}
                          maxLength={6}
                          placeholder="000000"
                          className="flex-1 px-3 py-2 border border-sage-200 rounded-lg text-center tracking-widest font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sage-500"
                        />
                        <button
                          onClick={handleConfirm2FA}
                          className="bg-sage-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-sage-700 transition-colors"
                        >
                          Onayla
                        </button>
                      </div>
                      <button
                        onClick={() => { setIsEnrolling2FA(false); setTotpSecret(null); setMfaError(null); }}
                        className="w-full text-xs text-sage-500 hover:text-sage-700 font-medium mt-2"
                      >
                        İptal Et
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={isMfaEnrolled ? handleDisable2FA : handleEnable2FA}
                      className={`w-full py-2 mt-2 rounded-xl text-sm font-bold transition-colors ${
                        isMfaEnrolled 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                          : 'bg-sage-600 text-white hover:bg-sage-700'
                      }`}
                    >
                      {isMfaEnrolled ? '2FA\'yı Devre Dışı Bırak' : '2FA\'yı Etkinleştir'}
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => { playClick(); signOut(auth); }}
                  className="w-full py-3 text-sage-600 font-bold bg-sage-50 rounded-xl hover:bg-sage-100 transition-colors mt-2"
                >
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-sage-600">
                  Cihazlar arası veri eşitlemesi için giriş yapın veya kayıt olun.
                </p>
                <button 
                  onClick={() => { playClick(); setIsAuthModalOpen(true); }}
                  className="w-full py-3 text-white font-bold bg-sage-600 rounded-xl hover:bg-sage-700 transition-colors"
                >
                  Giriş Yap / Kayıt Ol
                </button>
              </div>
            )}
          </div>
        </section>

        {user && (
          <section className="bg-white rounded-3xl p-6 border border-sage-100 shadow-sm">
            <h3 className="text-sm font-bold text-sage-500 uppercase tracking-widest mb-4">Şifre İşlemleri</h3>
            
            <div className="space-y-4">
              {/* Change Password */}
              <div className="border border-sage-100 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="w-full flex items-center justify-between p-4 bg-sage-50 hover:bg-sage-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-sage-600 shadow-sm">
                      <Lock size={20} />
                    </div>
                    <span className="font-bold text-sage-800">Şifre Değiştir</span>
                  </div>
                  <ChevronRight size={20} className={`text-sage-400 transition-transform ${isChangingPassword ? 'rotate-90' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isChangingPassword && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleChangePassword} className="p-4 bg-white space-y-4 border-t border-sage-100">
                        {passwordChangeError && <p className="text-xs text-red-600">{passwordChangeError}</p>}
                        {passwordChangeSuccess && <p className="text-xs text-emerald-600">{passwordChangeSuccess}</p>}
                        
                        <div>
                          <label className="block text-xs font-bold text-sage-600 mb-1">Mevcut Şifre</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-sage-600 mb-1">Yeni Şifre</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-sage-600 mb-1">Yeni Şifre (Tekrar)</label>
                          <input
                            type="password"
                            value={newPasswordConfirm}
                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm"
                          />
                        </div>
                        {isMfaEnrolled && (
                          <div>
                            <label className="block text-xs font-bold text-sage-600 mb-1">2FA Kodu</label>
                            <input
                              type="text"
                              value={passwordChangeTotp}
                              onChange={(e) => setPasswordChangeTotp(e.target.value)}
                              required
                              maxLength={6}
                              placeholder="000000"
                              className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm font-mono tracking-widest"
                            />
                          </div>
                        )}
                        <button
                          type="submit"
                          className="w-full bg-sage-600 hover:bg-sage-700 text-white font-bold py-2 rounded-xl transition-colors text-sm"
                        >
                          Şifreyi Güncelle
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset Password */}
              <div className="border border-sage-100 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setIsResettingPassword(!isResettingPassword)}
                  className="w-full flex items-center justify-between p-4 bg-sage-50 hover:bg-sage-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-sage-600 shadow-sm">
                      <Mail size={20} />
                    </div>
                    <span className="font-bold text-sage-800">Şifre Sıfırlama Bağlantısı Gönder</span>
                  </div>
                  <ChevronRight size={20} className={`text-sage-400 transition-transform ${isResettingPassword ? 'rotate-90' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isResettingPassword && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleSendPasswordReset} className="p-4 bg-white space-y-4 border-t border-sage-100">
                        {passwordResetError && <p className="text-xs text-red-600">{passwordResetError}</p>}
                        {passwordResetSuccess && <p className="text-xs text-emerald-600">{passwordResetSuccess}</p>}
                        
                        <p className="text-sm text-sage-600">
                          Kayıtlı e-posta adresinize ({user.email}) bir şifre sıfırlama bağlantısı gönderilecektir.
                        </p>

                        {isMfaEnrolled && (
                          <div>
                            <label className="block text-xs font-bold text-sage-600 mb-1">2FA Kodu</label>
                            <input
                              type="text"
                              value={passwordResetTotp}
                              onChange={(e) => setPasswordResetTotp(e.target.value)}
                              required
                              maxLength={6}
                              placeholder="000000"
                              className="w-full px-3 py-2 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm font-mono tracking-widest"
                            />
                          </div>
                        )}
                        <button
                          type="submit"
                          className="w-full bg-sage-600 hover:bg-sage-700 text-white font-bold py-2 rounded-xl transition-colors text-sm"
                        >
                          Bağlantıyı Gönder
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white rounded-3xl p-6 border border-sage-100 shadow-sm">
          <h3 className="text-sm font-bold text-sage-500 uppercase tracking-widest mb-4">Uygulama Ayarları</h3>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-sage-50 p-2 rounded-lg text-sage-600">
                  {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </div>
                <div>
                  <p className="font-bold text-sage-800">Ses Efektleri</p>
                  <p className="text-xs text-sage-500">Etkileşimlerde ses çal</p>
                </div>
              </div>
              <button 
                onClick={() => { playClick(); setIsSoundEnabled(!isSoundEnabled); }}
                className={`w-12 h-6 rounded-full transition-colors relative ${isSoundEnabled ? 'bg-sage-500' : 'bg-sage-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSoundEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-sage-50 p-2 rounded-lg text-sage-600">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <p className="font-bold text-sage-800">Açılış Ekranı</p>
                  <p className="text-xs text-sage-500">Uygulama açılırken splash göster</p>
                </div>
              </div>
              <button 
                onClick={() => { playClick(); setIsSplashEnabled(!isSplashEnabled); }}
                className={`w-12 h-6 rounded-full transition-colors relative ${isSplashEnabled ? 'bg-sage-500' : 'bg-sage-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSplashEnabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-6 border border-sage-100 shadow-sm">
          <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest mb-4">Tehlikeli Bölge</h3>
          <p className="text-sm text-sage-600 mb-6">
            Tüm verilerinizi (görevler, okuma geçmişi ve ayarlar) kalıcı olarak silmek için aşağıdaki butonu kullanın.
          </p>
          <button 
            onClick={() => { playClick(); setIsResetConfirmOpen(true); }}
            className="w-full py-4 text-red-600 font-bold bg-red-50 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <RotateCcw size={18} />
            Tüm Verileri Sıfırla
          </button>
          
          {user && (
            <button 
              onClick={() => { playClick(); setIsDeleteAccountConfirmOpen(true); }}
              className="w-full py-4 text-white font-bold bg-red-600 rounded-2xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              Hesabı Sil
            </button>
          )}
        </section>
      </div>

      <div className="text-center">
        <p className="text-xs text-sage-400">⭐ Hatim Pro v3.2.0</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sage-50">
      <AnimatePresence mode="wait">
        {showSplash || authLoading ? (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.1,
              filter: "blur(10px)",
              transition: { duration: 0.8, ease: "easeInOut" }
            }}
            className="fixed inset-0 z-[100] bg-sage-800 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Decorative Elements */}
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 180, 270, 360],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute w-[150%] h-[150%] border-[40px] border-white/5 rounded-full"
            />
            
            <div className="relative">
              {/* Multiple Star Glows for depth */}
              <motion.div
                animate={{ 
                  scale: [1, 1.8, 1],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-sage-400 blur-3xl rounded-full"
              />
              <motion.div
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute inset-0 bg-white blur-2xl rounded-full"
              />
              
              {/* Rotating Star with pulse */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: [1, 1.1, 1], 
                  rotate: 360,
                }}
                transition={{ 
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  rotate: { duration: 15, repeat: Infinity, ease: "linear" },
                  default: { duration: 1, ease: "backOut" }
                }}
                className="relative text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
              >
                <Star size={140} fill="currentColor" strokeWidth={0.5} />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="mt-8 text-center"
            >
              <h1 className="text-3xl font-bold text-white tracking-widest uppercase">⭐ Hatim Pro</h1>
              <p className="text-sage-300 mt-2 text-sm font-medium tracking-tighter">Modern Kur'an Takipçisi</p>
            </motion.div>

            <div className="mt-12 flex gap-2 justify-center">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3] 
                  }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                  className="w-2 h-2 bg-sage-300 rounded-full shadow-[0_0_8px_rgba(167,183,171,0.5)]"
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="min-h-screen"
          >
            {/* Header */}
            <header className="bg-white border-b border-sage-200 px-6 py-6 sticky top-0 z-30">
              <div className="max-w-2xl mx-auto flex justify-between items-center">
                <h1 className="display text-2xl font-bold text-sage-800 tracking-tight flex items-center gap-2">
                  <img src="/favicon.svg" alt="Hatim Pro Logo" className="w-8 h-8" referrerPolicy="no-referrer" />
                  Hatim Pro
                </h1>
              </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 pt-8">
              {activeView === 'home' && renderHome()}
              {activeView === 'tasks' && renderTasks()}
              {activeView === 'history' && renderHistory()}
              {activeView === 'settings' && renderSettings()}
            </main>

            {/* Bottom Navbar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-sage-200 px-6 py-3 pb-8 md:pb-3 z-40">
              <div className="max-w-2xl mx-auto flex justify-around items-center">
                <button 
                  onClick={() => { playClick(); setActiveView('home'); }}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'home' ? 'text-sage-600' : 'text-sage-400'}`}
                >
                  <Home size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ana Sayfa</span>
                </button>
                <button 
                  onClick={() => { playClick(); setActiveView('tasks'); }}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'tasks' ? 'text-sage-600' : 'text-sage-400'}`}
                >
                  <ListTodo size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Görevler</span>
                </button>
                <button 
                  onClick={() => { playClick(); setActiveView('history'); }}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'history' ? 'text-sage-600' : 'text-sage-400'}`}
                >
                  <Clock size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Geçmiş</span>
                </button>
                <button 
                  onClick={() => { playClick(); setActiveView('settings'); }}
                  className={`flex flex-col items-center gap-1 transition-colors ${activeView === 'settings' ? 'text-sage-600' : 'text-sage-400'}`}
                >
                  <SettingsIcon size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Ayarlar</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Add Log Modal */}
      <AnimatePresence>
        {isAddLogOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddLogOpen(false)}
              className="absolute inset-0 bg-sage-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-sage-800">İlerleme Kaydet</h3>
                <button onClick={() => { playClick(); setIsAddLogOpen(false); }} className="text-sage-400 hover:text-sage-600">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddLog} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-sage-500 mb-2 uppercase tracking-wider">Okuma Tarihi</label>
                    <input 
                      type="date" 
                      value={newLogDate}
                      onChange={(e) => setNewLogDate(e.target.value)}
                      className="w-full bg-sage-50 border-2 border-sage-100 rounded-2xl px-6 py-3 font-bold text-sage-800 focus:border-sage-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-sage-500 mb-2 uppercase tracking-wider">
                      Kaç sayfa okudunuz?
                    </label>
                    <input 
                      type="number" 
                      value={newPageInput}
                      onChange={(e) => setNewPageInput(e.target.value)}
                      placeholder="Örn: 5"
                      autoFocus
                      min={1}
                      className="w-full bg-sage-50 border-2 border-sage-100 rounded-2xl px-6 py-4 text-xl font-bold text-sage-800 focus:border-sage-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-sage-600 text-white rounded-2xl py-4 font-bold text-lg shadow-lg shadow-sage-200 hover:bg-sage-700 transition-all active:scale-95"
                >
                  Kaydet
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAddTaskOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTaskOpen(false)}
              className="absolute inset-0 bg-sage-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl p-8 relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-sage-800">Yeni Görev</h3>
                <button onClick={() => { playClick(); setIsAddTaskOpen(false); }} className="text-sage-400 hover:text-sage-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-8">
                {/* Juz Picker */}
                <div className="bg-sage-50 p-4 rounded-2xl border border-sage-100">
                  <button 
                    onClick={() => setIsJuzPickerOpen(!isJuzPickerOpen)}
                    className="w-full flex items-center justify-between font-bold text-sage-800"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={18} className="text-sage-600" />
                      <span>Cüz Aralığı Seç</span>
                    </div>
                    <ChevronRight size={18} className={isJuzPickerOpen ? 'rotate-90' : ''} />
                  </button>
                  
                  <AnimatePresence>
                    {isJuzPickerOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 mb-4 p-3 bg-white rounded-xl border border-sage-200 text-xs text-sage-600 flex items-center gap-2">
                          <Info size={14} className="shrink-0" />
                          <p>
                            {startJuzSelection === null 
                              ? "Başlangıç cüzünü seçin." 
                              : `${startJuzSelection}. Cüz seçildi. Bitiş cüzünü seçin.`}
                          </p>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {Array.from({ length: 30 }).map((_, i) => {
                            const juzNum = i + 1;
                            const isSelected = startJuzSelection === juzNum;
                            return (
                              <button
                                key={i}
                                onClick={() => handleJuzClick(juzNum)}
                                className={`rounded-lg py-2 text-sm font-bold transition-all ${
                                  isSelected 
                                    ? "bg-sage-700 text-white scale-110 shadow-md" 
                                    : "bg-white border border-sage-200 text-sage-700 hover:bg-sage-50"
                                }`}
                              >
                                {juzNum}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <form onSubmit={handleCustomTaskSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-sage-500 mb-2 uppercase tracking-wider">Görev Adı</label>
                      <input 
                        type="text" 
                        value={customTaskName}
                        onChange={(e) => setCustomTaskName(e.target.value)}
                        placeholder="Örn: Ramazan Mukabelesi"
                        className="w-full bg-sage-50 border-2 border-sage-100 rounded-2xl px-4 py-3 font-bold text-sage-800 focus:border-sage-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-sage-500 mb-2 uppercase tracking-wider">Başlangıç Sayfası</label>
                        <input 
                          type="number" 
                          value={customStartPage}
                          onChange={(e) => setCustomStartPage(e.target.value)}
                          className="w-full bg-sage-50 border-2 border-sage-100 rounded-2xl px-4 py-3 font-bold text-sage-800 focus:border-sage-500 focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-sage-500 mb-2 uppercase tracking-wider">Bitiş Sayfası</label>
                        <input 
                          type="number" 
                          value={customEndPage}
                          onChange={(e) => setCustomEndPage(e.target.value)}
                          className="w-full bg-sage-50 border-2 border-sage-100 rounded-2xl px-4 py-3 font-bold text-sage-800 focus:border-sage-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    className="w-full bg-sage-600 text-white rounded-2xl py-4 font-bold hover:bg-sage-700 transition-all"
                  >
                    Özel Görev Oluştur
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Task Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClick(); setTaskToDelete(null); }}
              className="absolute inset-0 bg-sage-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-sage-800 mb-2">Görevi Sil?</h3>
              <p className="text-sage-500 text-sm mb-8">
                Bu görevi ve tüm kayıtlarını silmek istediğinize emin misiniz?
              </p>
              <div className="space-y-3">
                <button 
                  onClick={confirmDeleteTask}
                  className="w-full bg-red-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                >
                  Evet, Sil
                </button>
                <button 
                  onClick={() => { playClick(); setTaskToDelete(null); }}
                  className="w-full bg-sage-50 text-sage-600 rounded-2xl py-4 font-bold hover:bg-sage-100 transition-all"
                >
                  Vazgeç
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Alert Modal */}
      <AnimatePresence>
        {errorMessage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClick(); setErrorMessage(null); }}
              className="absolute inset-0 bg-sage-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-sage-800 mb-2">Bilgi</h3>
              <p className="text-sage-500 text-sm mb-8">
                {errorMessage}
              </p>
              <button 
                onClick={() => { playClick(); setErrorMessage(null); }}
                className="w-full bg-sage-600 text-white rounded-2xl py-4 font-bold hover:bg-sage-700 transition-all"
              >
                Tamam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Account Confirm Modal */}
      <AnimatePresence>
        {isDeleteAccountConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClick(); setIsDeleteAccountConfirmOpen(false); }}
              className="absolute inset-0 bg-sage-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-sage-800 mb-2">Hesabı Sil?</h3>
              <p className="text-sage-500 text-sm mb-8">
                Hesabınızı ve buluttaki tüm verilerinizi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full bg-red-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                >
                  Evet, Hesabı Sil
                </button>
                <button 
                  onClick={() => { playClick(); setIsDeleteAccountConfirmOpen(false); }}
                  className="w-full bg-sage-50 text-sage-600 rounded-2xl py-4 font-bold hover:bg-sage-100 transition-all"
                >
                  Vazgeç
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { playClick(); setIsResetConfirmOpen(false); }}
              className="absolute inset-0 bg-sage-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <RotateCcw size={32} />
              </div>
              <h3 className="text-xl font-bold text-sage-800 mb-2">Verileri Sıfırla?</h3>
              <p className="text-sage-500 text-sm mb-8">
                Tüm görevleriniz ve okuma geçmişiniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={resetData}
                  className="w-full bg-red-600 text-white rounded-2xl py-4 font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all active:scale-95"
                >
                  Evet, Her Şeyi Sil
                </button>
                <button 
                  onClick={() => { playClick(); setIsResetConfirmOpen(false); }}
                  className="w-full bg-sage-50 text-sage-600 rounded-2xl py-4 font-bold hover:bg-sage-100 transition-all"
                >
                  Vazgeç
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
