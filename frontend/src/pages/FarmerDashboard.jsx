import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, LogOut, User, Layout, ChevronRight, PlayCircle, Clock, X, Languages, Info, Sparkles, CheckCircle2 } from 'lucide-react';

const FarmerDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [languageFilter, setLanguageFilter] = useState('en');
  const [stats, setStats] = useState({
    lessons_available: 0,
    lessons_completed: 0,
    last_activity: null,
    completed_lesson_ids: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isMarking, setIsMarking] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // Check if farmer is logged in
    const storedFarmer = localStorage.getItem('farmer_user');
    if (!storedFarmer) {
      navigate('/farmer/auth');
      return;
    }
    try {
      setFarmer(JSON.parse(storedFarmer));
    } catch (e) {
      console.error("Malformed farmer data:", e);
      localStorage.removeItem('farmer_user');
      navigate('/farmer/auth');
      return;
    }

    // Fetch lessons and stats
    const fetchData = async () => {
      const f = JSON.parse(storedFarmer);
      try {
        const [lessonsRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/lessons`),
          fetch(`${API_URL}/farmers/${f.id}/stats`)
        ]);

        if (lessonsRes.ok) {
          const lessonsData = await lessonsRes.json();
          setLessons(Array.isArray(lessonsData) ? lessonsData : []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
          if (statsData.preferred_language) {
            setLanguageFilter(statsData.preferred_language);
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, API_URL]);

  // Live Activity Polling
  useEffect(() => {
    const fetchLiveActivity = async () => {
      try {
        const res = await fetch(`${API_URL}/analytics/live`);
        if (res.ok) {
          const data = await res.json();
          setRecentActivity(data);
        }
      } catch (err) {
        console.error("Error fetching live activity:", err);
      }
    };

    fetchLiveActivity();
    const interval = setInterval(fetchLiveActivity, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [API_URL]);

  const handleMarkAsCompleted = async (lessonId) => {
    if (!farmer || isMarking) return;
    setIsMarking(true);
    try {
      const response = await fetch(`${API_URL}/progress/complete/${lessonId}?farmer_id=${farmer.id}`, {
        method: 'POST'
      });
      if (response.ok) {
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/farmers/${farmer.id}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        setSelectedLesson(null);
      }
    } catch (err) {
      console.error("Error marking lesson as completed:", err);
    } finally {
      setIsMarking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('farmer_user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin" />
          <p className="text-[#2D5A27] font-bold animate-pulse">Loading your knowledge base...</p>
        </div>
      </div>
    );
  }

  const filteredLessons = lessons.filter(lesson => 
    (lesson.language === languageFilter) && (
      lesson.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.topic?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const dailyTip = lessons.find(l => l.language === languageFilter) || lessons[0];

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-outfit">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col p-8 z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white">
            <Layout className="w-6 h-6" />
          </div>
          <span className="font-black text-xl text-[#1A1C1E] tracking-tight">Care4Animals</span>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem icon={<BookOpen />} label="My Lessons" active />
          <NavItem icon={<User />} label="My Profile" />
          
          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Community Pulse</span>
            </div>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, i) => (
                  <div key={i} className="group/activity relative pl-4 border-l-2 border-slate-100 hover:border-[#2D5A27] transition-all">
                    <p className="text-xs font-bold text-[#1A1C1E] group-hover/activity:text-[#2D5A27] transition-colors truncate">
                      {activity.username}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      Completed {activity.lesson_title}
                    </p>
                    <p className="text-[8px] text-slate-300 font-black uppercase mt-1">
                      {new Date(activity.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-[10px] text-slate-400 font-medium italic">Waiting for activity...</p>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="pt-8 border-t border-slate-100">
          <div className="bg-[#F8FAFB] rounded-2xl p-4 mb-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
            <p className="font-bold text-[#1A1C1E] truncate">{farmer?.username}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full py-4 px-4 flex items-center gap-3 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-6 md:p-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#1A1C1E] tracking-tight mb-2">
              Welcome, {farmer?.username}! 👋
            </h1>
            <p className="text-slate-500 font-medium">Ready to learn something new about your animals today?</p>
          </div>

          <div className="relative group max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#2D5A27] transition-colors" />
            <input 
              type="text" 
              placeholder="Search lessons (e.g. Cow, Nutrition...)"
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:border-[#2D5A27] focus:ring-4 focus:ring-[#2D5A27]/5 transition-all font-medium text-slate-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Lessons Available" value={stats.lessons_available} color="bg-blue-50 text-blue-600" />
          <StatCard label="Modules Finished" value={stats.lessons_completed} color="bg-green-50 text-green-600" />
          <StatCard label="Last Activity" value={stats.last_activity ? new Date(stats.last_activity).toLocaleDateString() : 'None'} color="bg-orange-50 text-orange-600" />
        </div>

        {/* Daily Tip Spotlight */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-[#2D5A27] to-[#1E3D1A] rounded-[40px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-[#2D5A27]/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Tip of the Day
              </div>
              <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight max-w-2xl">
                {dailyTip?.title || "Welcome to your digital farm assistant."}
              </h2>
              <p className="text-white/70 text-lg md:text-xl font-medium mb-8 max-w-xl leading-relaxed">
                {dailyTip ? (dailyTip.content?.substring(0, 120) + "...") : "Start your learning journey today and improve your livestock's health."}
              </p>
              <button 
                onClick={() => dailyTip && setSelectedLesson(dailyTip)}
                className="px-8 py-4 bg-white text-[#2D5A27] rounded-2xl font-black hover:scale-105 transition-transform shadow-xl"
              >
                Read Full Tip
              </button>
            </div>
          </div>
        </div>

        {/* Lessons Section */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-black text-[#1A1C1E] tracking-tight">Your Knowledge Library</h2>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
                Showing {filteredLessons.length} modules
              </p>
            </div>

            {/* Language Filter */}
            <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
              {[
                { id: 'en', label: 'English' },
                { id: 'lg', label: 'Luganda' },
                { id: 'sw', label: 'Swahili' }
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setLanguageFilter(lang.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                    languageFilter === lang.id 
                    ? 'bg-[#2D5A27] text-white shadow-lg shadow-[#2D5A27]/20' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredLessons.map((lesson) => (
              <div 
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="group bg-white rounded-[32px] border border-slate-100 p-6 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.02)] hover:shadow-[0_32px_64px_-16px_rgba(45,90,39,0.08)] hover:border-[#2D5A27]/10 transition-all cursor-pointer flex flex-col h-full"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-[#F2F8F3] text-[#2D5A27] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  {stats.completed_lesson_ids.includes(lesson.id) ? (
                    <div className="flex items-center gap-1.5 text-white font-black text-[10px] uppercase tracking-widest bg-[#2D5A27] px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full">
                      <BookOpen className="w-3.5 h-3.5" />
                      Ready
                    </div>
                  )}
                </div>
                
                <div className="flex-1 mb-8">
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 inline-block">
                    {lesson.theme || 'Livestock Health'}
                  </span>
                  <h3 className="text-xl font-bold text-[#1A1C1E] mb-2 group-hover:text-[#2D5A27] transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                    {lesson.content?.substring(0, 120)}...
                  </p>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <Clock className="w-4 h-4" />
                    5 MIN READ
                  </div>
                  <div className="w-10 h-10 bg-[#F8FAFB] rounded-full flex items-center justify-center text-[#2D5A27] group-hover:bg-[#2D5A27] group-hover:text-white transition-all">
                    <PlayCircle className="w-6 h-6" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLessons.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1C1E] mb-2">No lessons found</h3>
              <p className="text-slate-400 font-medium max-w-sm mx-auto">We couldn't find any lessons in {languageFilter === 'en' ? 'English' : languageFilter === 'lg' ? 'Luganda' : 'Swahili'} matching your search.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-[#2D5A27] font-black hover:underline"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>

        {/* Lesson Reading Modal */}
        {selectedLesson && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <div 
              className="absolute inset-0 bg-[#1A1C1E]/60 backdrop-blur-xl"
              onClick={() => setSelectedLesson(null)}
            />
            <div className="bg-white w-full max-w-4xl h-full max-h-[85vh] rounded-[48px] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
              {/* Modal Header */}
              <div className="p-8 md:p-10 border-b border-slate-100 flex items-center justify-between bg-[#FDFCFB]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#2D5A27] text-white rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{selectedLesson.theme || 'Knowledge Base'}</span>
                    <h3 className="text-2xl font-black text-[#1A1C1E] tracking-tight">{selectedLesson.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLesson(null)}
                  className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-[#1A1C1E] hover:border-slate-300 transition-all shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12">
                <div className="max-w-2xl mx-auto space-y-10">
                  {/* SMS Summary Card */}
                  <div className="bg-[#F8FAFB] rounded-[32px] p-8 border border-slate-100">
                    <div className="flex items-center gap-3 mb-4 text-[#2D5A27]">
                      <Languages className="w-5 h-5" />
                      <span className="font-black text-xs uppercase tracking-widest">SMS Version (Offline Friendly)</span>
                    </div>
                    <p className="text-slate-600 font-mono text-sm leading-relaxed bg-white p-6 rounded-2xl border border-slate-100 italic">
                      "{selectedLesson.sms_text || "No SMS summary available for this lesson."}"
                    </p>
                  </div>

                  {/* Full Article Content */}
                  <article className="prose prose-slate max-w-none">
                    <div className="flex items-center gap-2 mb-8 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      <Clock className="w-4 h-4" />
                      5 Minute In-Depth Reading
                    </div>
                    <div className="space-y-6">
                      {selectedLesson.content ? (
                        selectedLesson.content.split(/\n+/).map((para, i) => (
                          <p key={i} className="text-lg text-slate-700 leading-loose font-medium">
                            {para}
                          </p>
                        ))
                      ) : (
                        <p className="text-lg text-slate-400 italic">No detailed content available for this module.</p>
                      )}
                    </div>
                  </article>

                  {/* Key Takeaways */}
                  <div className="pt-12 border-t border-slate-100">
                    <h4 className="text-xl font-black text-[#1A1C1E] mb-6 tracking-tight">Summary Checklist</h4>
                    <div className="grid gap-4">
                      {selectedLesson.checklist ? (
                        JSON.parse(selectedLesson.checklist).map((tip, i) => (
                          <div key={i} className="flex items-center gap-4 bg-[#F2F8F3] p-5 rounded-2xl border border-[#2D5A27]/10">
                            <CheckCircle2 className="w-6 h-6 text-[#2D5A27]" />
                            <span className="font-bold text-[#1A1C1E]">{tip}</span>
                          </div>
                        ))
                      ) : (
                        [
                          "Follow recommended feeding schedules",
                          "Ensure clean water is always available",
                          "Monitor animal behavior daily",
                          "Contact veterinary services for vaccinations"
                        ].map((tip, i) => (
                          <div key={i} className="flex items-center gap-4 bg-[#F2F8F3] p-5 rounded-2xl border border-[#2D5A27]/10">
                            <CheckCircle2 className="w-6 h-6 text-[#2D5A27]" />
                            <span className="font-bold text-[#1A1C1E]">{tip}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-[#FDFCFB] border-t border-slate-100 flex items-center justify-between">
                <button 
                  onClick={() => setSelectedLesson(null)}
                  className="px-8 py-4 text-slate-500 font-black hover:text-[#1A1C1E] transition-colors"
                >
                  Close Lesson
                </button>
                {stats.completed_lesson_ids.includes(selectedLesson.id) ? (
                  <button 
                    disabled
                    className="px-10 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Already Completed
                  </button>
                ) : (
                  <button 
                    onClick={() => handleMarkAsCompleted(selectedLesson.id)}
                    disabled={isMarking}
                    className="px-10 py-4 bg-[#2D5A27] text-white rounded-2xl font-black shadow-xl shadow-[#2D5A27]/20 hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isMarking ? 'Processing...' : 'Mark as Completed'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold cursor-pointer transition-all ${
    active ? 'bg-[#2D5A27] text-white shadow-lg shadow-[#2D5A27]/20' : 'text-slate-500 hover:bg-slate-50'
  }`}>
    {React.cloneElement(icon, { className: "w-5 h-5" })}
    {label}
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-[#1A1C1E]">{value}</p>
    </div>
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center font-bold`}>
      <ChevronRight className="w-6 h-6" />
    </div>
  </div>
);

export default FarmerDashboard;
