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
    // Show page shell immediately, fetch feed in background
    setLoading(false);
    fetchFeed(f.id);
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
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col p-8 z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white">
            <Layout className="w-6 h-6" />
          </div>
          <span className="font-black text-xl text-[#1A1C1E] tracking-tight">Care4Animals</span>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={<Flame />} label="Daily Feed" active onClick={() => navigate('/farmer/feed')} />
          <NavItem icon={<BookOpen />} label="All Modules" onClick={() => navigate('/farmer/dashboard')} />
          <NavItem icon={<User />} label="My Settings" onClick={() => {}} />
        </nav>
        <div className="pt-8 border-t border-slate-100">
          <div className="bg-[#F8FAFB] rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
            <p className="font-bold text-[#1A1C1E] truncate">{farmer?.username}</p>
          </div>
          <button onClick={handleLogout} className="w-full py-4 px-4 flex items-center gap-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
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
        <button 
          onClick={() => navigate('/farmer/dashboard')}
          className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100"
        >
          <Home className="w-5 h-5" />
        </button>
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
            <div className="flex lg:grid lg:grid-cols-3 gap-4 lg:gap-5 mb-10 overflow-x-auto pb-4 lg:pb-0 no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0">
              {/* Batch progress */}
              <div className="bg-white rounded-2xl lg:rounded-[28px] border border-slate-100 p-5 lg:p-6 min-w-[240px] lg:min-w-0 flex-1 shrink-0 lg:shrink shadow-sm lg:shadow-none">
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Today's Batch</p>
                <p className="text-2xl lg:text-3xl font-black text-[#1A1C1E] mb-3">{completedInBatch} / {feed?.batch_lessons?.length ?? 5}</p>
                <div className="h-1.5 lg:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 rounded-full transition-all duration-500" style={{ width: `${batchProgress}%` }} />
                </div>
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-2">{batchProgress}% complete</p>
              </div>

              {/* Module progress */}
              <div className="bg-white rounded-2xl lg:rounded-[28px] border border-slate-100 p-5 lg:p-6 min-w-[240px] lg:min-w-0 flex-1 shrink-0 lg:shrink shadow-sm lg:shadow-none">
                <p className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Current Module</p>
                <p className="text-xs lg:text-sm font-black text-[#1A1C1E] mb-1 truncate">{feed?.current_module ?? '—'}</p>
                <p className="text-2xl lg:text-3xl font-black text-[#1A1C1E] mb-3">{feed?.module_completed ?? 0} / {feed?.module_total ?? 0}</p>
                <div className="h-1.5 lg:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2D5A27] rounded-full transition-all duration-500" style={{ width: `${moduleProgress}%` }} />
                </div>
                <p className="text-[10px] lg:text-xs font-bold text-slate-400 mt-2">{moduleProgress}% of module done</p>
              </div>

              {/* Overall progress */}
              <div className="bg-white rounded-2xl lg:rounded-[28px] border border-slate-100 p-5 lg:p-6 min-w-[240px] lg:min-w-0 flex-1 shrink-0 lg:shrink shadow-sm lg:shadow-none">
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

const NavItem = ({ icon, label, active = false, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold cursor-pointer transition-all ${
      active ? 'bg-[#2D5A27] text-white shadow-lg shadow-[#2D5A27]/20' : 'text-slate-500 hover:bg-slate-50'
    }`}
  >
    {React.cloneElement(icon, { className: 'w-5 h-5' })} {label}
  </div>
);

export default DailyFeedPage;
