import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, ChevronRight, ArrowLeft,
  Flame, Trophy, Layout, LogOut, User, Star, BookOpen, Settings, Home
} from 'lucide-react';
import { cachedFetch } from '../../utils/apiCache';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const BATCH_SIZE = 5;

const DailyFeedPage = () => {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState(null);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  const fetchFeed = useCallback(async (farmerId, lang = 'en') => {
    try {
      const data = await cachedFetch(
        `${API_URL}/farmers/${farmerId}/daily-feed?language=${lang}`,
        'farmer'
      );
      setFeed(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('farmer_user');
    if (!stored) { navigate('/farmer/auth'); return; }
    const f = JSON.parse(stored);
    setFarmer(f);
    
    const loadData = async () => {
      try {
        // Fetch stats first (for profile pic)
        const statsData = await cachedFetch(`${API_URL}/farmers/${f.id}/stats`, 'farmer');
        setStats(statsData);
        
        // Then fetch feed
        fetchFeed(f.id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [navigate, fetchFeed]);

  const handleLogout = () => {
    localStorage.removeItem('farmer_user');
    navigate('/');
  };

  const completedInBatch = feed?.batch_lessons?.filter(l => l.completed).length ?? 0;
  const batchProgress = feed?.batch_lessons?.length
    ? Math.round((completedInBatch / feed.batch_lessons.length) * 100)
    : 0;
  const moduleProgress = feed?.module_total
    ? Math.round((feed.module_completed / feed.module_total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-outfit">
      {/* Desktop Sidebar - Dark Theme Unified */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#012d1d] flex flex-col py-8 shadow-xl hidden lg:flex z-50 overflow-y-auto custom-scrollbar">
        <div className="px-8 mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
              <Layout className="w-6 h-6" />
            </div>
            <span className="font-manrope font-black text-2xl text-white tracking-tight">Care4Animals</span>
          </div>
          <p className="text-[#A7C0A4] text-[10px] font-black uppercase tracking-[0.2em] ml-1">Farmer Feed</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          <SidebarItem 
            icon="dashboard" 
            label="Daily Feed" 
            active={true} 
            onClick={() => navigate('/farmer/feed')} 
          />
          <SidebarItem 
            icon="menu_book" 
            label="All Modules" 
            active={false} 
            onClick={() => navigate('/farmer/dashboard')} 
          />
          <SidebarItem 
            icon="person" 
            label="My Profile" 
            onClick={() => navigate('/farmer/profile')} 
          />
          <SidebarItem 
            icon="settings" 
            label="Settings" 
            onClick={() => {}} 
          />
          
          <div className="pt-6 mt-6 border-t border-white/10">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-6 py-4 text-red-300 hover:text-red-100 hover:bg-red-500/10 rounded-2xl transition-all group font-bold text-sm"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">logout</span>
              Sign Out
            </button>
          </div>
        </nav>

        <div className="mt-auto px-6 py-6 border-t border-white/5 bg-black/10">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-[#2D5A27] flex items-center justify-center text-white font-black overflow-hidden border border-white/10">
              {stats?.profile_picture_url ? (
                <img src={stats.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                farmer?.username?.[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-[#A7C0A4] uppercase tracking-widest leading-none mb-1">Active Farmer</p>
              <p className="text-sm font-bold text-white truncate">{farmer?.username}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#2D5A27]/20">
            <Flame className="w-5 h-5" />
          </div>
          <span className="font-black text-lg text-[#1A1C1E] tracking-tight">Daily Feed</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/farmer/dashboard')}
            className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="lg:ml-72 p-6 md:p-12 pb-32">
        {/* Back link - Desktop only */}
        <Link to="/farmer/dashboard" className="hidden lg:inline-flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-[#2D5A27] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to All Modules
        </Link>

        {/* Page header */}
        <div className="mb-8 lg:mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 bg-orange-100 text-orange-500 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] text-orange-500">Today's Batch</span>
          </div>
          <h1 className="text-2xl lg:text-4xl font-black text-[#1A1C1E] tracking-tight mb-2">
            Learning Progress
          </h1>
          <p className="text-slate-500 text-sm lg:text-base font-medium">
            Complete {BATCH_SIZE} lessons to unlock the next batch.
          </p>
        </div>

        {feed?.curriculum_complete ? (
          /* ── Curriculum complete state ── */
          <div className="bg-gradient-to-br from-[#2D5A27] to-[#1E3D1A] rounded-[40px] p-12 text-white text-center shadow-2xl shadow-[#2D5A27]/20">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl font-black mb-4">You've completed the entire curriculum! 🎉</h2>
            <p className="text-white/70 text-lg font-medium max-w-md mx-auto">
              You've gone through all {feed.total_lessons} lessons. Incredible work, {farmer?.username}!
            </p>
          </div>
        ) : (
          <>
            {/* Progress cards - Responsive/Scrollable */}
            {/* Progress cards - Vertical Stacking for Mobile to avoid horizontal scroll */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 mb-10">
              {/* Batch progress */}
              <div className="bg-white rounded-2xl lg:rounded-[28px] border border-slate-100 p-5 lg:p-6 shadow-sm lg:shadow-none">
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Today's Batch</p>
                <p className="text-2xl lg:text-3xl font-black text-[#1A1C1E] mb-3">{completedInBatch} / {feed?.batch_lessons?.length ?? 5}</p>
                <div className="h-1.5 lg:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full transition-all duration-500" style={{ width: `${batchProgress}%` }} />
                </div>
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-2">{batchProgress}% complete</p>
              </div>

              {/* Module progress */}
              <div className="bg-white rounded-2xl lg:rounded-[28px] border border-slate-100 p-5 lg:p-6 shadow-sm lg:shadow-none">
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Current Module</p>
                <p className="text-xs lg:text-sm font-black text-[#1A1C1E] mb-1 truncate">{feed?.current_module ?? '—'}</p>
                <p className="text-2xl lg:text-3xl font-black text-[#1A1C1E] mb-3">{feed?.module_completed ?? 0} / {feed?.module_total ?? 0}</p>
                <div className="h-1.5 lg:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2D5A27] rounded-full transition-all duration-500" style={{ width: `${moduleProgress}%` }} />
                </div>
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-2">{moduleProgress}% of module done</p>
              </div>

              {/* Overall progress */}
              <div className="bg-white rounded-2xl lg:rounded-[28px] border border-slate-100 p-5 lg:p-6 shadow-sm lg:shadow-none">
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Overall Growth</p>
                <p className="text-2xl lg:text-3xl font-black text-[#1A1C1E] mb-3">{feed?.completed_count ?? 0} / {feed?.total_lessons ?? 0}</p>
                <div className="h-1.5 lg:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${feed?.total_lessons ? Math.round((feed.completed_count / feed.total_lessons) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-2">
                  Batch {feed?.batch_number} of {feed?.total_lessons ? Math.ceil(feed.total_lessons / BATCH_SIZE) : '—'}
                </p>
              </div>
            </div>

            {/* All-batch-complete banner */}
            {feed?.all_complete && (
              <div className="bg-gradient-to-r from-[#2D5A27] to-[#3d7a35] rounded-[28px] p-6 mb-8 flex items-center gap-5 text-white shadow-lg shadow-[#2D5A27]/20">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Star className="w-7 h-7 text-yellow-300" />
                </div>
                <div>
                  <p className="font-black text-lg">Batch {feed.batch_number} complete!</p>
                  <p className="text-white/80 font-medium text-sm">
                    Great work! Refresh the page to load your next batch of lessons.
                  </p>
                </div>
                <button
                  onClick={() => {
                    sessionStorage.removeItem(`feed_${farmer?.id}`);
                    fetchFeed(farmer.id);
                  }}
                  className="ml-auto px-6 py-3 bg-white text-[#2D5A27] rounded-2xl font-black hover:scale-105 transition-transform shrink-0"
                >
                  Next Batch →
                </button>
              </div>
            )}

            {/* Lesson cards — tap to open dedicated feed lesson view, auto-marks complete */}
            <div className="space-y-4">
              {feed?.batch_lessons?.map((lesson, idx) => (
                <Link
                  key={lesson.id}
                  to={`/farmer/feed/lesson/${encodeURIComponent(lesson.code)}`}
                  className={`block rounded-[24px] border transition-all group ${
                    lesson.completed
                      ? 'border-[#2D5A27]/20 bg-[#F2F8F3] hover:border-[#2D5A27]/40'
                      : 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-md'
                  }`}
                >
                  <div className="p-6 flex items-start gap-5">
                    {/* Step number / check */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg transition-colors ${
                      lesson.completed
                        ? 'bg-[#2D5A27] text-white'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-500'
                    }`}>
                      {lesson.completed ? <CheckCircle2 className="w-6 h-6" /> : idx + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{lesson.theme}</span>
                          <h3 className={`text-base font-black leading-snug transition-colors ${
                            lesson.completed ? 'text-[#2D5A27]' : 'text-[#1A1C1E] group-hover:text-orange-600'
                          }`}>
                            {lesson.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold shrink-0">
                          <Clock className="w-3.5 h-3.5" /> 5 min
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                        {lesson.content?.substring(0, 120)}...
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className={`w-5 h-5 shrink-0 transition-all mt-1 ${
                      lesson.completed
                        ? 'text-[#2D5A27]/30'
                        : 'text-slate-300 group-hover:text-orange-400 group-hover:translate-x-0.5'
                    }`} />
                  </div>

                  {/* Footer */}
                  <div className="px-6 pb-4 flex items-center justify-between border-t border-slate-100/60 pt-3">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{lesson.code}</span>
                    {lesson.completed ? (
                      <span className="flex items-center gap-1.5 text-[#2D5A27] text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-orange-400 text-xs font-black">
                        <BookOpen className="w-3.5 h-3.5" /> Tap to read &amp; complete
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <MobileNavItem icon={<Home />} label="Home" onClick={() => navigate('/farmer/dashboard')} />
        <MobileNavItem icon={<Flame />} label="Feed" active onClick={() => navigate('/farmer/feed')} />
        <MobileNavItem icon={<BookOpen />} label="Library" onClick={() => navigate('/farmer/dashboard')} />
        <MobileNavItem icon={<User />} label="Profile" onClick={() => {}} />
      </nav>
    </div>
  );
};

const MobileNavItem = ({ icon, label, active = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[#2D5A27]' : 'text-slate-400'}`}
  >
    <div className={`p-1 rounded-xl transition-all ${active ? 'bg-[#2D5A27]/10' : ''}`}>
      {React.cloneElement(icon, { className: "w-5 h-5" })}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

const SidebarItem = ({ icon, label, active = false, onClick }) => (
  <button 
    onClick={onClick}
    className={`${
      active 
        ? 'bg-[#2D5A27] text-white shadow-lg shadow-black/20' 
        : 'text-[#A7C0A4] hover:text-white hover:bg-white/5'
    } w-full rounded-2xl flex items-center px-6 py-4 gap-4 transition-all duration-200 active:scale-[0.98] group`}
  >
    <span className={`material-symbols-outlined text-[22px] transition-transform ${active ? '' : 'group-hover:scale-110'}`}>
      {icon}
    </span>
    <span className="font-bold text-sm">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />}
  </button>
);

export default DailyFeedPage;
