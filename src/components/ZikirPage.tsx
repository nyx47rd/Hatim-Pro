import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Users, Share2, Copy, Check, X } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface ZikirPageProps {
  onBack: () => void;
  playClick: () => void;
}

export const ZikirPage: React.FC<ZikirPageProps> = ({ onBack, playClick }) => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinId, setJoinId] = useState('');
  const [participants, setParticipants] = useState<number>(1);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zikirName, setZikirName] = useState('Subhanallah');
  const [isCreating, setIsCreating] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ show: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);

  // Sound effect for click (simple beep or click)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Listen to session if active
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onSnapshot(doc(db, 'zikir_sessions', sessionId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCount(data.count);
        setParticipants(data.participants?.length || 1);
        setZikirName(data.name || 'Zikir');
        setTarget(data.target || null);
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  const handleIncrement = async () => {
    playSound();
    if (sessionId) {
      // Optimistic update
      setCount(prev => prev + 1);
      const sessionRef = doc(db, 'zikir_sessions', sessionId);
      await updateDoc(sessionRef, {
        count: increment(1)
      });
    } else {
      setCount(prev => prev + 1);
    }
  };

  const handleReset = async () => {
    playClick();
    setAlertConfig({
      show: true,
      title: 'Sıfırla',
      message: 'Sayacı sıfırlamak istediğinize emin misiniz?',
      type: 'confirm',
      onConfirm: async () => {
        if (sessionId) {
          await updateDoc(doc(db, 'zikir_sessions', sessionId), { count: 0 });
        } else {
          setCount(0);
        }
        setAlertConfig(null);
      }
    });
  };

  const createSession = async () => {
    playClick();
    if (!user) {
      setAlertConfig({
        show: true,
        title: 'Giriş Gerekli',
        message: 'Çoklu zikir için giriş yapmalısınız.',
        type: 'alert'
      });
      return;
    }
    
    setIsCreating(true);
    try {
      const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
      await setDoc(doc(db, 'zikir_sessions', newSessionId), {
        host: user.uid,
        count: count,
        name: zikirName,
        target: target,
        participants: [user.uid],
        createdAt: new Date().toISOString()
      });
      
      setSessionId(newSessionId);
      setIsMultiplayer(true);
      setShowJoinModal(false); // Close modal after creation
    } catch (error) {
      console.error("Error creating session:", error);
      setAlertConfig({
        show: true,
        title: 'Hata',
        message: 'Oda oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.',
        type: 'alert'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinSession = async () => {
    playClick();
    if (!user) {
      setAlertConfig({
        show: true,
        title: 'Giriş Gerekli',
        message: 'Çoklu zikir için giriş yapmalısınız.',
        type: 'alert'
      });
      return;
    }
    if (!joinId) return;

    try {
      const sessionRef = doc(db, 'zikir_sessions', joinId);
      await updateDoc(sessionRef, {
        participants: arrayUnion(user.uid)
      });
      
      setSessionId(joinId);
      setIsMultiplayer(true);
      setShowJoinModal(false);
    } catch (error) {
      console.error("Error joining session:", error);
      setAlertConfig({
        show: true,
        title: 'Hata',
        message: 'Odaya katılırken bir hata oluştu. Kodun doğru olduğundan emin olun.',
        type: 'alert'
      });
    }
  };

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button 
          onClick={onBack}
          className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
        >
          <X size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Zikirmatik</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Counter Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        
        {/* Session Info */}
        {isMultiplayer && (
          <div className="bg-neutral-800/80 backdrop-blur-md rounded-2xl p-4 w-full max-w-sm border border-neutral-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Oda Kodu</span>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold">{participants} Kişi</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-black/50 rounded-xl p-3 border border-neutral-700">
              <span className="text-xl font-mono font-bold text-white tracking-widest">{sessionId}</span>
              <button onClick={copySessionId} className="text-neutral-400 hover:text-white transition-colors">
                {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        )}

        {/* Counter Display */}
        <div className="relative">
          <div className="w-64 h-64 rounded-full bg-black border-4 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/20 to-transparent pointer-events-none" />
            <div className="text-center z-10">
              <span className="block text-7xl font-mono font-bold text-white tracking-tighter tabular-nums">
                {count}
              </span>
              <span className="text-neutral-500 text-sm font-medium mt-2 block uppercase tracking-widest">
                {zikirName}
              </span>
            </div>
          </div>
          
          {/* Progress Ring (Visual Only for now) */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-neutral-800"
            />
          </svg>
        </div>

        {/* Main Button */}
        <button
          onClick={handleIncrement}
          className="w-full max-w-xs bg-white text-black font-bold text-xl py-6 rounded-full shadow-lg active:scale-95 transition-transform hover:bg-neutral-200"
        >
          Zikir Çek
        </button>

        {/* Controls */}
        <div className="flex gap-4 w-full max-w-xs">
          <button
            onClick={handleReset}
            className="flex-1 bg-neutral-900 border border-neutral-800 text-white py-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition-colors"
          >
            <RotateCcw size={20} className="text-neutral-400" />
            <span className="text-xs font-bold">Sıfırla</span>
          </button>
          
          {!isMultiplayer && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex-1 bg-neutral-900 border border-neutral-800 text-white py-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition-colors"
            >
              <Users size={20} className="text-emerald-400" />
              <span className="text-xs font-bold">Birlikte Çek</span>
            </button>
          )}
          
          {isMultiplayer && (
            <button
              onClick={() => {
                setAlertConfig({
                  show: true,
                  title: 'Ayrıl',
                  message: 'Odadan ayrılmak istiyor musunuz?',
                  type: 'confirm',
                  onConfirm: () => {
                    setSessionId(null);
                    setIsMultiplayer(false);
                    setCount(0);
                    setAlertConfig(null);
                  }
                });
              }}
              className="flex-1 bg-red-900/20 border border-red-900/50 text-red-500 py-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-red-900/30 transition-colors"
            >
              <X size={20} />
              <span className="text-xs font-bold">Ayrıl</span>
            </button>
          )}
        </div>
      </div>

      {/* Join/Create Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm"
            >
              <h3 className="text-xl font-bold text-white mb-4">Birlikte Zikir</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Zikir Adı</label>
                  <input
                    type="text"
                    value={zikirName}
                    onChange={(e) => setZikirName(e.target.value)}
                    placeholder="Örn: Subhanallah"
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <button
                  onClick={createSession}
                  disabled={isCreating}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Users size={20} />
                      Yeni Oda Oluştur
                    </>
                  )}
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-neutral-800"></div>
                  <span className="flex-shrink-0 mx-4 text-neutral-500 text-sm">veya</span>
                  <div className="flex-grow border-t border-neutral-800"></div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Oda Kodu ile Katıl</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinId}
                      onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                      placeholder="KOD"
                      className="flex-1 bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono text-center tracking-widest focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      onClick={joinSession}
                      disabled={!joinId}
                      className="bg-neutral-800 text-white px-6 rounded-xl font-bold disabled:opacity-50 hover:bg-neutral-700 transition-colors"
                    >
                      Katıl
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowJoinModal(false)}
                className="w-full mt-6 text-neutral-500 font-medium text-sm hover:text-white transition-colors"
              >
                İptal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Alert/Confirm Modal */}
      <AnimatePresence>
        {alertConfig?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">{alertConfig.title}</h3>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                {alertConfig.message}
              </p>
              
              <div className="space-y-3">
                {alertConfig.type === 'confirm' ? (
                  <>
                    <button
                      onClick={() => alertConfig.onConfirm?.()}
                      className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-colors active:scale-95"
                    >
                      Evet
                    </button>
                    <button
                      onClick={() => setAlertConfig(null)}
                      className="w-full bg-neutral-800 text-white font-bold py-4 rounded-2xl hover:bg-neutral-700 transition-colors"
                    >
                      Vazgeç
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAlertConfig(null)}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-neutral-200 transition-colors active:scale-95"
                  >
                    Tamam
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
