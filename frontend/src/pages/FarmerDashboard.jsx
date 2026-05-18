import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, LogOut, User, Layout, ChevronRight, ChevronDown, PlayCircle, Clock, X, Languages, Info, Sparkles, CheckCircle2, FolderOpen, Folder, Smartphone, MessageSquare } from 'lucide-react';

const FarmerDashboard = () => {
  const [modules, setModules] = useState([]);       // lightweight: [{module, lesson_count}]
  const [lessonCache, setLessonCache] = useState({}); // { "ModuleName": [...lessons] }
  const [loadingModules, setLoadingModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [languageFilter, setLanguageFilter] = useState('en');
  const [stats, setStats] = useState({
    lessons_available: 0,
    lessons_completed: 0,
    last_activity: null,
    completed_lesson_ids: [],
    is_subscribed_to_sms: false
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isMarking, setIsMarking] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState('cow');
  const [showSettings, setShowSettings] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [isSubscribingSms, setIsSubscribingSms] = useState(false);
  const [isUpdatingAnimals, setIsUpdatingAnimals] = useState(false);
  const [openModules, setOpenModules] = useState(new Set());
  const navigate = useNavigate();

  const toggleModule = (moduleName) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
        // Lazy-load lessons for this module if not already cached
        if (!lessonCache[moduleName]) {
          fetchModuleLessons(moduleName);
        }
      }
      return next;
    });
  };

  const fetchModuleLessons = async (moduleName) => {
    setLoadingModules(prev => ({ ...prev, [moduleName]: true }));
    try {
      const res = await fetch(
        `${API_URL}/api/v1/lessons/by-module?module=${encodeURIComponent(moduleName)}&language=${languageFilter}`
      );
      if (res.ok) {
        const data = await res.json();
        setLessonCache(prev => ({ ...prev, [moduleName]: data }));
      }
    } catch (err) {
      console.error(`Error loading lessons for ${moduleName}:`, err);
    } finally {
      setLoadingModules(prev => ({ ...prev, [moduleName]: false }));
    }
  };

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

    // Fetch modules list (lightweight) and stats in parallel
    const fetchData = async (lang = 'en') => {
      const f = JSON.parse(storedFarmer);
      try {
        const [modulesRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/lessons/modules?language=${lang}`),
          fetch(`${API_URL}/farmers/${f.id}/stats`)
        ]);

        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          setModules(Array.isArray(modulesData) ? modulesData : []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
          const preferredLang = statsData.preferred_language || 'en';
          if (preferredLang !== lang) {
            setLanguageFilter(preferredLang);
            fetchData(preferredLang);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData(languageFilter);
  }, [navigate, API_URL]);

  // Reload modules and clear lesson cache when language changes
  useEffect(() => {
    if (!farmer) return;
    setLessonCache({});
    setOpenModules(new Set());
    fetch(`${API_URL}/api/v1/lessons/modules?language=${languageFilter}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setModules(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [languageFilter, API_URL, farmer]);

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

  const handleToggleSmsSubscription = async (subscribeStatus) => {
    if (!farmer) return;
    setIsSubscribingSms(true);
    try {
      const response = await fetch(`${API_URL}/farmers/${farmer.id}/sms-subscription?is_subscribed=${subscribeStatus}`, {
        method: 'PUT'
      });
      if (response.ok) {
        // Refresh stats
        const statsRes = await fetch(`${API_URL}/farmers/${farmer.id}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        setShowSmsModal(false);
      }
    } catch (err) {
      console.error("Error toggling SMS subscription:", err);
    } finally {
      setIsSubscribingSms(false);
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

  // Filter modules by search query (module name match)
  const filteredModules = modules.filter(m =>
    !searchQuery || m.module.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // For the daily tip, use the first cached lesson we have, or null
  const allCachedLessons = Object.values(lessonCache).flat();
  const dailyTip = allCachedLessons[0] || null;

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
          <NavItem icon={<User />} label="My Settings" onClick={() => setShowSettings(true)} />
          
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

        {/* SMS Subscription Banner */}
        <div className="bg-white rounded-[32px] border border-slate-100 p-8 mb-12 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stats.is_subscribed_to_sms ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'} shrink-0`}>
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-xl font-black text-[#1A1C1E] tracking-tight">Care4Animals SMS Learning Group</h3>
                {stats.is_subscribed_to_sms ? (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 animate-pulse" /> Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full">
                    Not Joined
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm font-medium mt-1.5 leading-relaxed max-w-xl">
                Get single branded animal care lessons sent directly to your mobile phone via SMS whenever updates are broadcasted by the administration. Highly recommended for offline study!
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSmsModal(true)}
            className={`px-8 py-4 rounded-2xl font-black transition-all whitespace-nowrap shadow-md hover:scale-[1.02] active:scale-[0.98] ${
              stats.is_subscribed_to_sms
                ? 'bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/10'
            }`}
          >
            {stats.is_subscribed_to_sms ? 'Manage Subscription' : 'Subscribe to SMS Group'}
          </button>
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
                {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''} · {stats.lessons_available} lessons
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

          {/* Animal Switcher */}
          <div className="flex overflow-x-auto pb-2 gap-4">
            {(stats.farmed_animals || 'cow').split(',').map((animal) => (
              <button
                key={animal}
                onClick={() => setSelectedAnimal(animal)}
                className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                  selectedAnimal === animal
                  ? 'bg-orange-100 text-orange-700 shadow-sm border border-orange-200'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-orange-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${selectedAnimal === animal ? 'bg-orange-500' : 'bg-slate-200'}`} />
                {animal.charAt(0).toUpperCase() + animal.slice(1)}s
              </button>
            ))}
            <button 
              onClick={() => setShowSettings(true)}
              className="px-6 py-3 rounded-2xl text-sm font-black text-[#2D5A27] bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Info className="w-4 h-4" />
              Manage Animals
            </button>
          </div>

          {/* Module Accordion */}
          <div className="space-y-4">
            {filteredModules.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-[#1A1C1E] mb-2">No modules found</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto">
                  We couldn't find any modules in {languageFilter === 'en' ? 'English' : languageFilter === 'lg' ? 'Luganda' : 'Swahili'} matching your search.
                </p>
                <button onClick={() => setSearchQuery('')} className="mt-6 text-[#2D5A27] font-black hover:underline">
                  Clear Search
                </button>
              </div>
            ) : (
              filteredModules.map(({ module: moduleName, lesson_count }) => {
                const isOpen = openModules.has(moduleName);
                const isLoadingModule = loadingModules[moduleName];
                const moduleLessons = lessonCache[moduleName] || [];
                const completedCount = moduleLessons.filter(l => stats.completed_lesson_ids.includes(l.id)).length;
                const progress = moduleLessons.length > 0 ? Math.round((completedCount / moduleLessons.length) * 100) : 0;

                return (
                  <div key={moduleName} className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)]">
                    {/* Module Header — click to toggle */}
                    <button
                      onClick={() => toggleModule(moduleName)}
                      className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/60 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-[#2D5A27] text-white' : 'bg-[#F2F8F3] text-[#2D5A27]'}`}>
                          {isOpen ? <FolderOpen className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-[#1A1C1E] group-hover:text-[#2D5A27] transition-colors">
                            {moduleName}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs font-bold text-slate-400">
                              {lesson_count} lesson{lesson_count !== 1 ? 's' : ''}
                            </span>
                            {completedCount > 0 && (
                              <span className="text-xs font-bold text-[#2D5A27]">
                                · {completedCount} completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Progress bar — only shown once lessons are loaded */}
                        {moduleLessons.length > 0 && (
                          <div className="hidden md:flex items-center gap-3">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2D5A27] rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-black text-slate-400">{progress}%</span>
                          </div>
                        )}
                        <div className={`w-9 h-9 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </button>

                    {/* Lessons inside the module */}
                    {isOpen && (
                      <div className="border-t border-slate-100 px-6 pb-6 pt-4">
                        {isLoadingModule ? (
                          <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
                            <div className="w-5 h-5 border-2 border-slate-200 border-t-[#2D5A27] rounded-full animate-spin" />
                            <span className="text-sm font-bold">Loading lessons...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {moduleLessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                onClick={() => setSelectedLesson(lesson)}
                                className="group/card bg-[#FDFCFB] rounded-[20px] border border-slate-100 p-5 hover:border-[#2D5A27]/20 hover:shadow-md transition-all cursor-pointer flex flex-col"
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="w-10 h-10 bg-white text-[#2D5A27] rounded-xl flex items-center justify-center border border-slate-100 group-hover/card:bg-[#2D5A27] group-hover/card:text-white transition-colors">
                                    <BookOpen className="w-5 h-5" />
                                  </div>
                                  {stats.completed_lesson_ids.includes(lesson.id) ? (
                                    <div className="flex items-center gap-1 text-white font-black text-[9px] uppercase tracking-widest bg-[#2D5A27] px-2.5 py-1 rounded-full">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Done
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 text-slate-400 font-black text-[9px] uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                                      <Clock className="w-3 h-3" />
                                      5 min
                                    </div>
                                  )}
                                </div>

                                <h4 className="text-sm font-bold text-[#1A1C1E] mb-2 group-hover/card:text-[#2D5A27] transition-colors leading-snug">
                                  {lesson.title}
                                </h4>
                                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 flex-1">
                                  {lesson.content?.substring(0, 90)}...
                                </p>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    {lesson.code}
                                  </span>
                                  <PlayCircle className="w-5 h-5 text-slate-300 group-hover/card:text-[#2D5A27] transition-colors" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
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

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#1A1C1E]/60 backdrop-blur-xl" onClick={() => setShowSettings(false)} />
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 p-10 animate-in fade-in zoom-in duration-200">
              <h3 className="text-2xl font-black text-[#1A1C1E] mb-2">Farm Settings</h3>
              <p className="text-slate-500 font-medium mb-8">Select the animals you are currently dealing with to get personalized lessons.</p>
              
              <div className="space-y-4 mb-10">
                {['cow', 'dog', 'pig', 'chicken', 'goat'].map((animal) => {
                  const isSelected = (stats.farmed_animals || 'cow').split(',').includes(animal);
                  return (
                    <label 
                      key={animal}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected ? 'border-[#2D5A27] bg-[#F2F8F3]' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#2D5A27] text-white' : 'bg-slate-100 text-slate-300'}`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className={`font-bold ${isSelected ? 'text-[#1A1C1E]' : 'text-slate-400'}`}>
                            {animal.charAt(0).toUpperCase() + animal.slice(1)}s
                        </span>
                      </div>
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={async () => {
                            const current = (stats.farmed_animals || 'cow').split(',');
                            let updated;
                            if (current.includes(animal)) {
                                updated = current.filter(a => a !== animal);
                            } else {
                                updated = [...current, animal];
                            }
                            if (updated.length === 0) return; // Must have at least one

                            setIsUpdatingAnimals(true);
                            try {
                                const res = await fetch(`${API_URL}/farmers/${farmer.id}/animals`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ farmed_animals: updated.join(',') })
                                });
                                if (res.ok) {
                                    const statsRes = await fetch(`${API_URL}/farmers/${farmer.id}/stats`);
                                    const statsData = await statsRes.json();
                                    setStats(statsData);
                                }
                            } catch (e) { console.error(e); }
                            finally { setIsUpdatingAnimals(false); }
                        }}
                      />
                    </label>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-5 bg-[#2D5A27] text-white rounded-2xl font-black shadow-xl shadow-[#2D5A27]/20 hover:scale-[1.02] transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* SMS Subscription Modal */}
        {showSmsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#1A1C1E]/60 backdrop-blur-xl" onClick={() => setShowSmsModal(false)} />
            <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 p-10 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.is_subscribed_to_sms ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1A1C1E]">
                    {stats.is_subscribed_to_sms ? 'Leave SMS Group?' : 'Join SMS Group?'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Offline learning feed</p>
                </div>
              </div>

              <div className="bg-[#F8FAFB] p-6 rounded-3xl border border-slate-100 mb-8 space-y-4 text-sm leading-relaxed text-slate-600">
                {stats.is_subscribed_to_sms ? (
                  <p>
                    You are currently subscribed to receive SMS animal care lessons. If you opt out, you will no longer receive automated SMS curriculum lessons on your phone.
                  </p>
                ) : (
                  <p>
                    By joining, you deliberately opt in to receive targeted, single animal care lessons directly to your registered phone number (<strong>{farmer?.phone_number}</strong>) via SMS.
                  </p>
                )}
                <div className="p-3.5 bg-yellow-50 text-yellow-800 text-xs font-bold rounded-xl border border-yellow-100 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Standard local network carrier rates apply when receiving messages. You can unsubscribe at any time.</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowSmsModal(false)}
                  className="flex-1 py-4.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-black transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleToggleSmsSubscription(!stats.is_subscribed_to_sms)}
                  disabled={isSubscribingSms}
                  className={`flex-1 py-4.5 text-white rounded-2xl font-black shadow-lg transition-all ${
                    stats.is_subscribed_to_sms
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                      : 'bg-[#2D5A27] hover:bg-[#1E3D1A] shadow-[#2D5A27]/10'
                  }`}
                >
                  {isSubscribingSms ? 'Processing...' : stats.is_subscribed_to_sms ? 'Yes, Opt Out' : 'Yes, Subscribe'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold cursor-pointer transition-all ${
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
