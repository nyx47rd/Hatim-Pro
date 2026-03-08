import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  TrendingUp, 
  Calendar, 
  BookOpen, 
  Clock, 
  Award, 
  Zap,
  BarChart2,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { HatimData } from '../types';

interface StatsPageProps {
  data: HatimData;
  onBack: () => void;
  playClick: () => void;
}

export const StatsPage: React.FC<StatsPageProps> = ({ data, onBack, playClick }) => {
  const stats = useMemo(() => {
    const logs = data.logs || [];
    const totalPages = logs.reduce((sum, log) => sum + log.pagesRead, 0);
    const totalSessions = logs.length;
    const avgPagesPerSession = totalSessions > 0 ? (totalPages / totalSessions).toFixed(1) : 0;
    
    // Group by day of week
    const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const dayStats = [0, 0, 0, 0, 0, 0, 0];
    logs.forEach(log => {
      const day = new Date(log.date).getDay();
      dayStats[day] += log.pagesRead;
    });

    const dayData = dayNames.map((name, i) => ({ name, pages: dayStats[i] }));

    // Group by month for long term trend
    const monthData: { [key: string]: number } = {};
    logs.forEach(log => {
      const month = new Date(log.date).toLocaleString('tr-TR', { month: 'short' });
      monthData[month] = (monthData[month] || 0) + log.pagesRead;
    });
    const trendData = Object.entries(monthData).map(([name, pages]) => ({ name, pages }));

    // Completion stats
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter(t => t.isCompleted).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalPages,
      totalSessions,
      avgPagesPerSession,
      dayData,
      trendData,
      completionRate,
      completedTasks
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <button onClick={() => { playClick(); onBack(); }} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold tracking-tight">Gelişmiş İstatistikler</h2>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-3xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4 text-sage-500">
              <BookOpen size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Toplam Sayfa</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalPages}</p>
            <p className="text-xs text-white/40 mt-1">Tüm zamanlar</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 rounded-3xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4 text-blue-500">
              <Activity size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Oturum</span>
            </div>
            <p className="text-3xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-white/40 mt-1">Okuma kaydı</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 rounded-3xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4 text-yellow-500">
              <Award size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Tamamlanan</span>
            </div>
            <p className="text-3xl font-bold">{stats.completedTasks}</p>
            <p className="text-xs text-white/40 mt-1">Hatim/Cüz</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 rounded-3xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-4 text-purple-500">
              <Zap size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Ortalama</span>
            </div>
            <p className="text-3xl font-bold">{stats.avgPagesPerSession}</p>
            <p className="text-xs text-white/40 mt-1">Sayfa / Oturum</p>
          </motion.div>
        </div>

        {/* Weekly Distribution */}
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BarChart2 size={20} className="text-sage-500" />
            Haftalık Dağılım
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dayData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="pages" radius={[6, 6, 0, 0]}>
                  {stats.dayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pages > 0 ? '#4ade80' : '#333'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Long Term Trend */}
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            Okuma Trendi
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData}>
                <defs>
                  <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#666', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="pages" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorPages)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Progress */}
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-purple-500" />
            Genel İlerleme
          </h3>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-purple-500"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${stats.completionRate}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">{stats.completionRate}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/60 mb-2">Toplam görevlerin %{stats.completionRate} kadarı tamamlandı.</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-xs font-bold uppercase tracking-wider">Başarı Oranı</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
