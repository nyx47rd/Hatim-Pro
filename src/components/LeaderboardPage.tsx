import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Trophy, Flame, Star, Medal } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardPageProps {
  onBack: () => void;
  playClick: () => void;
}

export const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ onBack, playClick }) => {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        // We need an index for 'stats.xp' descending
        const q = query(
          collection(db, 'users'), 
          orderBy('stats.xp', 'desc'), 
          limit(50)
        );
        const snap = await getDocs(q);
        const fetchedLeaders = snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile));
        setLeaders(fetchedLeaders);
      } catch (error: any) {
        console.error("Error fetching leaderboard:", error);
        if (error.message?.includes('index')) {
          setError("Liderlik tablosu henüz hazır değil (İndeks oluşturuluyor). Lütfen daha sonra tekrar deneyin.");
        } else {
          setError("Liderlik tablosu yüklenirken bir hata oluştu.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLeaders();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold tracking-tight">Liderlik Tablosu</h2>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-yellow-500/20 rounded-full mb-4">
            <Trophy size={48} className="text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">En İyiler</h1>
          <p className="text-white/60">HatimPro topluluğunun en aktif okuyucuları.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 px-6">
            <p className="text-white/60 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-white text-black px-6 py-2 rounded-xl font-bold"
            >
              Yeniden Dene
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((leader, index) => {
              const isCurrentUser = leader.uid === user?.uid;
              let rankColor = "text-white/60";
              let rankIcon = null;

              if (index === 0) {
                rankColor = "text-yellow-500";
                rankIcon = <Medal size={24} className="text-yellow-500" />;
              } else if (index === 1) {
                rankColor = "text-gray-400";
                rankIcon = <Medal size={24} className="text-gray-400" />;
              } else if (index === 2) {
                rankColor = "text-amber-700";
                rankIcon = <Medal size={24} className="text-amber-700" />;
              }

              return (
                <motion.div
                  key={leader.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${
                    isCurrentUser 
                      ? "bg-white/10 border-white/30" 
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className={`w-8 font-bold text-center flex justify-center ${rankColor}`}>
                    {rankIcon || index + 1}
                  </div>
                  
                  <img 
                    src={leader.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.uid}`} 
                    className="w-12 h-12 rounded-full object-cover border border-white/10"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold truncate ${isCurrentUser ? "text-white" : "text-white/90"}`}>
                      {leader.displayName}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-white/50">
                      <div className="flex items-center gap-1">
                        <Flame size={12} className="text-orange-500" />
                        <span>{leader.stats?.streak || 0} Gün</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500" />
                        <span>{leader.stats?.xp || 0} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-yellow-500">{leader.stats?.xp || 0}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">XP</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
