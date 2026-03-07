import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Settings, 
  Search, 
  UserPlus, 
  UserMinus, 
  ChevronLeft, 
  Camera, 
  Check, 
  X,
  TrendingUp,
  Star,
  Clock,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  onSnapshot
} from 'firebase/firestore';

interface ProfilePageProps {
  username?: string;
  onBack: () => void;
  playClick: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ username, onBack, playClick }) => {
  const { user, profile: currentUserProfile } = useAuth();
  const [currentUsername, setCurrentUsername] = useState<string | undefined>(username);
  
  useEffect(() => {
    setCurrentUsername(username);
  }, [username]);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Edit states
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      let currentProfileData = null;
      if (currentUsername) {
        // Fetch by username
        const q = query(collection(db, 'users'), where('username', '==', currentUsername), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          currentProfileData = { ...snap.docs[0].data(), uid: snap.docs[0].id };
          setProfile(currentProfileData);
        } else {
          setProfile(null);
        }
      } else if (user) {
        // Fetch current user
        currentProfileData = currentUserProfile;
        setProfile(currentUserProfile);
        setEditName(currentUserProfile?.displayName || '');
        setEditUsername(currentUserProfile?.username || '');
        setEditBio(currentUserProfile?.bio || '');
        setEditPhoto(currentUserProfile?.photoURL || '');
      }
      
      if (currentProfileData?.uid) {
        // Fetch followers count
        const followersQuery = query(collection(db, 'users'), where('following', 'array-contains', currentProfileData.uid));
        const followersSnap = await getDocs(followersQuery);
        setFollowersCount(followersSnap.size);
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [currentUsername, user, currentUserProfile]);

  const handleFollow = async () => {
    if (!user || !profile || !profile.uid || !currentUserProfile) return;
    playClick();
    
    const isFollowing = currentUserProfile.following?.includes(profile.uid);
    const currentUserRef = doc(db, 'users', user.uid);

    try {
      if (isFollowing) {
        await updateDoc(currentUserRef, { following: arrayRemove(profile.uid) });
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await updateDoc(currentUserRef, { following: arrayUnion(profile.uid) });
        setFollowersCount(prev => prev + 1);
      }
    } catch (e) {
      console.error("Follow error", e);
    }
  };

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      
      const searchStr = searchQuery.trim().toLowerCase();
      const q = query(
        collection(db, 'users'), 
        where('username', '>=', searchStr),
        where('username', '<=', searchStr + '\uf8ff'),
        limit(10)
      );
      
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(doc => doc.data()));
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    playClick();
    setError(null);

    // Check username uniqueness if changed
    if (editUsername !== currentUserProfile?.username) {
      const q = query(collection(db, 'users'), where('username', '==', editUsername.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setError("Bu kullanıcı adı zaten alınmış.");
        return;
      }
    }

    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName,
        username: editUsername.toLowerCase(),
        bio: editBio,
        photoURL: editPhoto
      });
      setIsEditing(false);
    } catch (e) {
      setError("Profil güncellenirken bir hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile && username) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Kullanıcı Bulunamadı</h2>
        <p className="text-white/60 mb-8">Aradığınız kullanıcı mevcut değil veya silinmiş olabilir.</p>
        <button onClick={onBack} className="bg-white text-black px-8 py-3 rounded-2xl font-bold">Geri Dön</button>
      </div>
    );
  }

  const isOwnProfile = user?.uid === profile?.uid;
  const isFollowing = currentUserProfile?.following?.includes(profile?.uid);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-lg font-bold tracking-tight">
            {profile?.username ? `@${profile.username}` : 'Profil'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearching(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Search size={22} />
          </button>
          {isOwnProfile && (
            <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Settings size={22} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        {/* Profile Info */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full border-2 border-white/20 p-1">
              <img 
                src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} 
                alt={profile?.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">{profile?.displayName}</h1>
          <p className="text-white/60 text-sm mb-4">@{profile?.username || 'kullaniciadi'}</p>
          {profile?.bio && <p className="text-sm text-white/80 max-w-sm mb-6">{profile.bio}</p>}
          
          <div className="flex gap-8 mb-8">
            <div className="text-center">
              <p className="text-lg font-bold">{profile?.following?.length || 0}</p>
              <p className="text-xs text-white/40 uppercase tracking-widest">Takip</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{followersCount}</p>
              <p className="text-xs text-white/40 uppercase tracking-widest">Takipçi</p>
            </div>
          </div>

          {!isOwnProfile && user && (
            <button 
              onClick={handleFollow}
              className={`w-full max-w-xs py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                isFollowing 
                  ? "bg-white/10 text-white border border-white/20" 
                  : "bg-white text-black"
              }`}
            >
              {isFollowing ? (
                <>
                  <UserMinus size={18} />
                  Takibi Bırak
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Takip Et
                </>
              )}
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2 text-white/60">
              <BookOpen size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Okunan Sayfa</span>
            </div>
            <p className="text-2xl font-bold">{profile?.stats?.totalReadPages || 0}</p>
          </div>
          <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-2 text-white/60">
              <RotateCcw size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Zikir</span>
            </div>
            <p className="text-2xl font-bold">{profile?.stats?.totalZikir || 0}</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-black border border-white/10 w-full max-w-md rounded-3xl p-8 relative z-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Profili Düzenle</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col items-center mb-4">
                  <div className="relative">
                    <img 
                      src={editPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} 
                      className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                    />
                    <button className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-lg">
                      <Camera size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Profil Fotoğrafı URL</label>
                  <input 
                    type="text" 
                    value={editPhoto}
                    onChange={(e) => setEditPhoto(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:border-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Görünen İsim</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:border-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Kullanıcı Adı</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">@</span>
                    <input 
                      type="text" 
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-8 pr-4 py-3 focus:border-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/40 uppercase mb-2">Hakkımda</label>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:border-white focus:outline-none transition-all resize-none"
                  />
                </div>

                {error && <p className="text-red-500 text-sm font-bold">{error}</p>}

                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-white/90 transition-all"
                >
                  Kaydet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearching && (
          <div className="fixed inset-0 z-[100] bg-black">
            <div className="p-6 border-b border-white/10 flex items-center gap-4">
              <button onClick={() => setIsSearching(false)} className="p-2 -ml-2">
                <ChevronLeft size={24} />
              </button>
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Kullanıcı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:border-white focus:outline-none transition-all"
                />
              </form>
            </div>
            
            <div className="p-6 space-y-4">
              {searchResults.map((res: any) => (
                <button 
                  key={res.uid}
                  onClick={() => {
                    setCurrentUsername(res.username);
                    window.history.pushState({}, '', '/@' + res.username);
                    setIsSearching(false);
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                >
                  <img 
                    src={res.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.uid}`} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="font-bold">{res.displayName}</p>
                    <p className="text-xs text-white/40">@{res.username}</p>
                  </div>
                </button>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-center text-white/40 mt-12">Sonuç bulunamadı.</p>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
