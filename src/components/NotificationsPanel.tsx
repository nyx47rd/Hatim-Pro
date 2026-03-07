import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Bell } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AppNotification } from '../types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSession: (sessionId: string) => void;
  playClick: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, onJoinSession, playClick }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      // Sort by createdAt desc
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);
    }, (error) => {
      console.error("Notifications panel snapshot error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAccept = async (notification: AppNotification) => {
    playClick();
    if (!user) return;

    try {
      // Add user to session participants
      const sessionRef = doc(db, 'zikir_sessions', notification.sessionId);
      await updateDoc(sessionRef, {
        participants: arrayUnion(user.uid)
      });

      // Update notification status
      await updateDoc(doc(db, 'notifications', notification.id), {
        status: 'accepted',
        read: true
      });

      onJoinSession(notification.sessionId);
      onClose();
    } catch (error) {
      console.error("Error accepting invite:", error);
      alert("Odaya katılırken bir hata oluştu.");
    }
  };

  const handleDecline = async (notification: AppNotification) => {
    playClick();
    try {
      await updateDoc(doc(db, 'notifications', notification.id), {
        status: 'declined',
        read: true
      });
    } catch (error) {
      console.error("Error declining invite:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-neutral-900 border-l border-sage-200 dark:border-neutral-800 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-sage-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Bell className="text-sage-600 dark:text-sage-400" size={20} />
                <h2 className="text-lg font-bold text-sage-800 dark:text-white">Bildirimler</h2>
              </div>
              <button onClick={onClose} className="p-2 text-sage-500 hover:bg-sage-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center text-sage-500 dark:text-sage-400 mt-10">
                  <p>Henüz bildiriminiz yok.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 rounded-2xl border ${notif.read ? 'bg-sage-50 dark:bg-neutral-800/50 border-sage-100 dark:border-neutral-800' : 'bg-white dark:bg-neutral-800 border-sage-300 dark:border-sage-700 shadow-sm'}`}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm text-sage-800 dark:text-white">
                        <span className="font-bold">{notif.senderName}</span> sizi <span className="font-bold">{notif.sessionName}</span> zikrine davet etti.
                      </p>
                    </div>
                    <p className="text-xs text-sage-500 dark:text-sage-400 mb-3">
                      {new Date(notif.createdAt).toLocaleString('tr-TR')}
                    </p>
                    
                    {notif.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAccept(notif); }}
                          className="flex-1 bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 transition-colors"
                        >
                          <Check size={14} /> Kabul Et
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDecline(notif); }}
                          className="flex-1 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 transition-colors"
                        >
                          <X size={14} /> Reddet
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-sage-500 dark:text-sage-400">
                        {notif.status === 'accepted' ? 'Kabul edildi' : 'Reddedildi'}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
