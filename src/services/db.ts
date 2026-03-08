import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HatimData } from '../types';

export const syncDataToFirebase = async (userId: string, data: HatimData) => {
  if (!userId) return;
  try {
    const docRef = doc(db, 'users', userId);
    
    // Calculate stats
    const totalHatim = data.tasks.filter(t => t.isCompleted).length;
    const totalReadPages = data.logs.reduce((sum, log) => sum + log.pagesRead, 0);
    
    // Calculate streak
    const uniqueDates = Array.from(new Set(data.logs.map(log => log.date.split('T')[0]))).sort().reverse();
    let streak = 0;
    
    if (uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
        streak = 1;
        let currentDate = new Date(uniqueDates[0]);
        
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i]);
          // Calculate difference in days
          const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
          
          if (diffDays === 1) {
            streak++;
            currentDate = prevDate;
          } else {
            break;
          }
        }
      }
    }

    const xp = totalReadPages * 10 + (streak * 5);

    await setDoc(docRef, { 
      data, 
      updatedAt: new Date().toISOString(),
      stats: {
        totalHatim,
        totalReadPages,
        streak,
        xp,
        lastReadingDate: uniqueDates[0] || null
      }
    }, { merge: true });
  } catch (error) {
    console.error("Error syncing to Firebase:", error);
  }
};

export const loadDataFromFirebase = async (userId: string): Promise<HatimData | null> => {
  if (!userId) return null;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().data as HatimData;
    }
  } catch (error) {
    console.error("Error loading from Firebase:", error);
  }
  return null;
};

export const listenToFirebaseData = (userId: string, onUpdate: (data: HatimData | null) => void) => {
  if (!userId) return () => {};
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data().data as HatimData;
      if (data) onUpdate(data);
    } else {
      onUpdate(null);
    }
  });
};
