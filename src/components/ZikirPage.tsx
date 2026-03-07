import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Users, Share2, Copy, Check, X, Plus, ChevronLeft, Target, Trash2 } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, increment, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface ZikirPageProps {
  onBack: () => void;
  playClick: () => void;
  joinSessionId?: string | null;
}

interface ZikirTask {
  id: string;
  name: string;
  target: number | null;
  count: number;
  participants: string[];
  host: string;
  createdAt: string;
}

export const ZikirPage: React.FC<ZikirPageProps> = ({ onBack, playClick, joinSessionId }) => {
  const { user, profile } = useAuth();
  
  // Task Management State
  const [tasks, setTasks] = useState<ZikirTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(joinSessionId || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Active Task State
  const [activeTask, setActiveTask] = useState<ZikirTask | null>(null);
  const [mutualFollowers, setMutualFollowers] = useState<{uid: string, displayName: string, photoURL: string}[]>([]);
  
  // Create Task Form State
  const [newTaskName, setNewTaskName] = useState('Subhanallah');
  const [newTaskTarget, setNewTaskTarget] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  // Local Guest State
  const [localTasks, setLocalTasks] = useState<ZikirTask[]>(() => {
    const saved = localStorage.getItem('local_zikir_tasks');
    if (saved) return JSON.parse(saved);
    return [{
      id: 'local_1',
      name: 'Misafir Zikri',
      target: null,
      count: 0,
      participants: ['guest'],
      host: 'guest',
      createdAt: new Date().toISOString()
    }];
  });

  const [alertConfig, setAlertConfig] = useState<{ show: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);
  const [copied, setCopied] = useState(false);

  const sessionZikirCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (sessionZikirCountRef.current > 0 && user) {
        updateDoc(doc(db, 'users', user.uid), {
          'stats.totalZikir': increment(sessionZikirCountRef.current)
        }).catch(console.error);
      }
    };
  }, [user]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // Fetch Tasks for Logged in User
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'zikir_sessions'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: ZikirTask[] = [];
      snapshot.forEach(doc => {
        fetchedTasks.push({ id: doc.id, ...doc.data() } as ZikirTask);
      });
      fetchedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTasks(fetchedTasks);
    }, (error) => {
      console.error("Zikir sessions snapshot error:", error);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Local Tasks
  useEffect(() => {
    if (!user) {
      localStorage.setItem('local_zikir_tasks', JSON.stringify(localTasks));
    }
  }, [localTasks, user]);

  // Listen to Active Task
  useEffect(() => {
    if (!activeTaskId) {
      setActiveTask(null);
      return;
    }

    if (!user) {
      const task = localTasks.find(t => t.id === activeTaskId);
      setActiveTask(task || null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'zikir_sessions', activeTaskId), (doc) => {
      if (doc.exists()) {
        setActiveTask({ id: doc.id, ...doc.data() } as ZikirTask);
      } else {
        setActiveTask(null);
        setActiveTaskId(null);
      }
    }, (error) => {
      console.error("Active zikir session snapshot error:", error);
    });

    return () => unsubscribe();
  }, [activeTaskId, user, localTasks]);

  // Fetch Mutual Followers
  useEffect(() => {
    if (!user || !profile || !showInviteModal) return;

    const fetchMutuals = async () => {
      const following = profile.following || [];
      
      if (following.length === 0) {
        setMutualFollowers([]);
        return;
      }

      const mutualsData = [];
      for (const uid of following) {
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          if (userData.following?.includes(user.uid)) {
            mutualsData.push({
              uid: userData.uid,
              displayName: userData.displayName || 'İsimsiz',
              photoURL: userData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.uid}`
            });
          }
        }
      }
      setMutualFollowers(mutualsData);
    };

    fetchMutuals();
  }, [user, profile, showInviteModal]);

  const handleIncrement = async () => {
    playSound();
    if (!activeTask) return;

    if (user) {
      // Optimistic update for UI feel
      setActiveTask(prev => prev ? { ...prev, count: prev.count + 1 } : null);
      await updateDoc(doc(db, 'zikir_sessions', activeTask.id), {
        count: increment(1)
      });

      sessionZikirCountRef.current += 1;
      if (sessionZikirCountRef.current >= 10) {
        const countToSave = sessionZikirCountRef.current;
        sessionZikirCountRef.current = 0;
        updateDoc(doc(db, 'users', user.uid), {
          'stats.totalZikir': increment(countToSave)
        }).catch(console.error);
      }
    } else {
      setLocalTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, count: t.count + 1 } : t));
    }
  };

  const handleReset = async () => {
    playClick();
    if (!activeTask) return;
    
    setAlertConfig({
      show: true,
      title: 'Sıfırla',
      message: 'Sayacı sıfırlamak istediğinize emin misiniz?',
      type: 'confirm',
      onConfirm: async () => {
        if (user) {
          await updateDoc(doc(db, 'zikir_sessions', activeTask.id), { count: 0 });
        } else {
          setLocalTasks(prev => prev.map(t => t.id === activeTask.id ? { ...t, count: 0 } : t));
        }
        setAlertConfig(null);
      }
    });
  };

  const handleCreateTask = async () => {
    playClick();
    if (!newTaskName.trim()) return;

    const targetNum = newTaskTarget ? parseInt(newTaskTarget) : null;

    if (user) {
      setIsCreating(true);
      try {
        const newSessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(doc(db, 'zikir_sessions', newSessionId), {
          host: user.uid,
          count: 0,
          name: newTaskName,
          target: targetNum,
          participants: [user.uid],
          createdAt: new Date().toISOString()
        });
        setActiveTaskId(newSessionId);
        setShowCreateModal(false);
        setNewTaskName('Subhanallah');
        setNewTaskTarget('');
      } catch (error) {
        console.error("Error creating task:", error);
      } finally {
        setIsCreating(false);
      }
    } else {
      const newLocalTask: ZikirTask = {
        id: 'local_' + Date.now(),
        name: newTaskName,
        target: targetNum,
        count: 0,
        participants: ['guest'],
        host: 'guest',
        createdAt: new Date().toISOString()
      };
      setLocalTasks(prev => [newLocalTask, ...prev]);
      setActiveTaskId(newLocalTask.id);
      setShowCreateModal(false);
      setNewTaskName('Subhanallah');
      setNewTaskTarget('');
    }
  };

  const handleInvite = async (inviteeUid: string) => {
    playClick();
    if (!user || !activeTask || !profile) return;

    try {
      const notificationId = `${activeTask.id}_${inviteeUid}_${Date.now()}`;
      await setDoc(doc(db, 'notifications', notificationId), {
        userId: inviteeUid,
        type: 'zikir_invite',
        senderId: user.uid,
        senderName: profile.displayName || 'Bir kullanıcı',
        sessionId: activeTask.id,
        sessionName: activeTask.name,
        createdAt: new Date().toISOString(),
        read: false,
        status: 'pending'
      });
      alert('Davet gönderildi!');
    } catch (error) {
      console.error("Error sending invite:", error);
      alert('Davet gönderilirken hata oluştu.');
    }
  };

  const handleDeleteTask = (taskId: string) => {
    playClick();
    setAlertConfig({
      show: true,
      title: 'Görevi Sil',
      message: 'Bu zikir görevini silmek istediğinize emin misiniz?',
      type: 'confirm',
      onConfirm: async () => {
        if (user) {
          await deleteDoc(doc(db, 'zikir_sessions', taskId));
        } else {
          setLocalTasks(prev => prev.filter(t => t.id !== taskId));
        }
        setAlertConfig(null);
      }
    });
  };

  const copySessionId = () => {
    if (activeTask) {
      navigator.clipboard.writeText(activeTask.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderTaskList = () => {
    const displayTasks = user ? tasks : localTasks;

    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex-1 flex flex-col p-6 overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Görevlerim</h2>
          <button 
            onClick={() => { playClick(); setShowCreateModal(true); }}
            className="bg-white text-black p-2 rounded-full hover:bg-neutral-200 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {displayTasks.length === 0 ? (
            <div className="text-center text-neutral-500 mt-10">
              <p>Henüz bir zikir göreviniz yok.</p>
              <p className="text-sm mt-2">Yeni bir görev oluşturmak için + butonuna tıklayın.</p>
            </div>
          ) : (
            displayTasks.map(task => {
              const progress = task.target ? Math.min(100, (task.count / task.target) * 100) : 0;
              
              return (
                <motion.div
                  key={task.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { playClick(); setActiveTaskId(task.id); }}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 cursor-pointer relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <h3 className="text-lg font-bold text-white">{task.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {task.participants.length}
                        </span>
                        {task.target && (
                          <span className="flex items-center gap-1">
                            <Target size={12} /> Hedef: {task.target}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-mono font-bold text-white">{task.count}</span>
                    </div>
                  </div>

                  {task.target && (
                    <div className="w-full bg-black rounded-full h-1.5 mt-4 relative z-10">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 z-20"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    );
  };

  const renderActiveTask = () => {
    if (!activeTask) return null;
    const progress = activeTask.target ? Math.min(100, (activeTask.count / activeTask.target) * 100) : 0;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 flex flex-col items-center justify-center p-6 space-y-8"
      >
        {/* Session Info */}
        {activeTask.participants.length > 1 && (
          <div className="bg-neutral-800/80 backdrop-blur-md rounded-2xl p-4 w-full max-w-sm border border-neutral-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider">Oda Kodu</span>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold">{activeTask.participants.length} Kişi</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-black/50 rounded-xl p-3 border border-neutral-700">
              <span className="text-xl font-mono font-bold text-white tracking-widest">{activeTask.id}</span>
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
                {activeTask.count}
              </span>
              <span className="text-neutral-500 text-sm font-medium mt-2 block uppercase tracking-widest">
                {activeTask.name}
              </span>
              {activeTask.target && (
                <span className="text-emerald-500/80 text-xs font-bold mt-1 block">
                  Hedef: {activeTask.target}
                </span>
              )}
            </div>
          </div>
          
          {/* Progress Ring */}
          {activeTask.target && (
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-neutral-800"
              />
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progress * 3.01} 301`}
                className="text-emerald-500 transition-all duration-300"
              />
            </svg>
          )}
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
          
          {user && (
            <button
              onClick={() => { playClick(); setShowInviteModal(true); }}
              className="flex-1 bg-neutral-900 border border-neutral-800 text-white py-4 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-neutral-800 transition-colors"
            >
              <Share2 size={20} className="text-blue-400" />
              <span className="text-xs font-bold">Davet Et</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full relative bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-900">
        <button 
          onClick={() => {
            playClick();
            if (activeTaskId) {
              setActiveTaskId(null);
            } else {
              onBack();
            }
          }}
          className="bg-neutral-900 text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
        >
          {activeTaskId ? <ChevronLeft size={24} /> : <X size={24} />}
        </button>
        <h1 className="text-xl font-bold text-white">Zikirmatik</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTaskId ? renderActiveTask() : renderTaskList()}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-6">Yeni Zikir Görevi</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Zikir Adı</label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Örn: Subhanallah"
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Hedef Sayı (Opsiyonel)</label>
                  <input
                    type="number"
                    value={newTaskTarget}
                    onChange={(e) => setNewTaskTarget(e.target.value)}
                    placeholder="Örn: 99"
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <button
                  onClick={handleCreateTask}
                  disabled={isCreating || !newTaskName.trim()}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-50 mt-4"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Oluştur'
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full mt-4 text-neutral-500 font-medium text-sm hover:text-white transition-colors py-2"
              >
                İptal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Arkadaş Davet Et</h3>
                <button onClick={() => setShowInviteModal(false)} className="text-neutral-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {mutualFollowers.length === 0 ? (
                  <div className="text-center text-neutral-500 py-8">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Davet edebileceğiniz karşılıklı takip ettiğiniz bir arkadaşınız bulunmuyor.</p>
                  </div>
                ) : (
                  mutualFollowers.map(friend => (
                    <div key={friend.uid} className="flex items-center justify-between bg-black/50 p-3 rounded-2xl border border-neutral-800">
                      <div className="flex items-center gap-3">
                        <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                        <span className="font-bold text-white text-sm">{friend.displayName}</span>
                      </div>
                      <button
                        onClick={() => handleInvite(friend.uid)}
                        className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors"
                      >
                        Davet Et
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-neutral-800">
                <p className="text-xs text-neutral-500 text-center mb-3">Veya bağlantı ile davet et</p>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Hatim Pro Zikir',
                        text: `Hatim Pro'da birlikte zikir çekelim! Oda kodu: ${activeTask?.id}`,
                        url: window.location.origin
                      }).catch(console.error);
                    } else {
                      copySessionId();
                      alert('Oda kodu kopyalandı. Arkadaşlarına gönderebilirsin.');
                    }
                  }}
                  className="w-full bg-neutral-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
                >
                  <Share2 size={16} />
                  Bağlantıyı Paylaş
                </button>
              </div>
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
