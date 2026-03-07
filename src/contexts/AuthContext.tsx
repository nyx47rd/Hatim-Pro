import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  stats?: {
    totalHatim?: number;
    totalZikir?: number;
    totalReadPages?: number;
    streak?: number;
  };
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen to profile changes
        const profileRef = doc(db, 'users', user.uid);
        
        // Ensure profile exists
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          const baseName = user.displayName 
            ? user.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') 
            : (user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'user');
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const generatedUsername = `${baseName}${randomSuffix}`.substring(0, 20);

          const newProfile: UserProfile = {
            uid: user.uid,
            username: generatedUsername,
            displayName: user.displayName || 'İsimsiz Kullanıcı',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            following: [],
            followers: [],
            stats: { totalHatim: 0, totalZikir: 0, streak: 0 }
          };
          await setDoc(profileRef, newProfile);
        }

        const unsubProfile = onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            setProfile({ ...doc.data(), uid: doc.id } as UserProfile);
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
        });
        
        setLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
