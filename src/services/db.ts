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
    
    await setDoc(docRef, { 
      data, 
      updatedAt: new Date().toISOString(),
      stats: {
        totalHatim,
        totalReadPages
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
