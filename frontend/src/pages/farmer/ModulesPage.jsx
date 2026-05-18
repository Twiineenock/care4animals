import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen, Search, LogOut, User, Layout, ChevronDown,
  PlayCircle, Clock, CheckCircle2, FolderOpen,
  Folder, Flame, Zap, ChevronRight, Home, Settings, Menu,
  Smartphone, Info, Globe, X
} from 'lucide-react';
import { cachedFetch, invalidateFarmerCache } from '../../utils/apiCache';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ModulesPage = () => {
  const [modules, setModules] = useState([]);
  const [lessonCache, setLessonCache] = useState({});
  const [loadingModules, setLoadingModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [languageFilter, setLanguageFilter] = useState('en');
  const [stats, setStats] = useState({
    lessons_available: 0,
    lessons_completed: 0,
    last_activity: null,
    completed_lesson_ids: []
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isUpdatingAnimals, setIsUpdatingAnimals] = useState(false);
  const [isSubscribingSms, setIsSubscribingSms] = useState(false);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
  const [dailyFeed, setDailyFeed] = useState(null);

  const handleToggleSmsSubscription = async (subscribeStatus) => {
    if (!farmer) return;
    setIsSubscribingSms(true);
    try {
      const response = await fetch(`${API_URL}/farmers/${farmer.id}/sms-subscription?is_subscribed=${subscribeStatus}`, {
        method: 'PUT'
      });
      if (response.ok) {
        invalidateFarmerCache(farmer.id);
        const statsRes = await fetch(`${API_URL}/farmers/${farmer.id}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      }
    } catch (err) {
      console.error("Error toggling SMS subscription:", err);
    } finally {
      setIsSubscribingSms(false);
    }
  };

  const handleUpdateLanguage = async (newLang) => {
    if (!farmer) return;
    setIsUpdatingLanguage(true);
    try {
      const response = await fetch(`${API_URL}/farmers/${farmer.id}/language`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_language: newLang })
      });
      if (response.ok) {
        invalidateFarmerCache(farmer.id);
        setLanguageFilter(newLang);
        const statsRes = await fetch(`${API_URL}/farmers/${farmer.id}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      }
    } catch (err) {
      console.error("Error updating language:", err);
    } finally {
      setIsUpdatingLanguage(false);
    }
  };

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Which modules are open — driven by URL param
  const openModuleParam = searchParams.get('module');

  // Sync open state from URL
  const openModules = new Set(openModuleParam ? [decodeURIComponent(openModuleParam)] : []);

  const toggleModule = (moduleName) => {
    const encoded = encodeURIComponent(moduleName);
    if (openModuleParam === encoded || openModuleParam === moduleName) {
      // Close: remove module param
      setSearchParams({});
    } else {
      // Open: set module param
      setSearchParams({ module: moduleName });
      if (!lessonCache[moduleName]) {
        fetchModuleLessons(moduleName);
      }
    }
  };

  const fetchModuleLessons = async (moduleName) => {
    setLoadingModules(prev => ({ ...prev, [moduleName]: true }));
    try {
      const url = `${API_URL}/api/v1/lessons/by-module?module=${encodeURIComponent(moduleName)}&language=${languageFilter}`;
      const data = await cachedFetch(url, 'static');
      setLessonCache(prev => ({ ...prev, [moduleName]: data }));
    } catch (err) {
      console.error(`Error loading lessons for ${moduleName}:`, err);
    } finally {
      setLoadingModules(prev => ({ ...prev, [moduleName]: false }));
    }
  };

  // On mount: auth check + initial data
  useEffect(() => {
    const storedFarmer = localStorage.getItem('farmer_user');
    if (!storedFarmer) { navigate('/farmer/auth'); return; }
    try {
      setFarmer(JSON.parse(storedFarmer));
    } catch {
      localStorage.removeItem('farmer_user');
      navigate('/farmer/auth');
      return;
    }

    const fetchData = async (lang = 'en') => {
      const f = JSON.parse(storedFarmer);
      try {
        // Modules: static cache (5 min). Stats: farmer cache (30s).
        const [modules, statsData] = await Promise.all([
          cachedFetch(`${API_URL}/api/v1/lessons/modules?language=${lang}`, 'static'),
          cachedFetch(`${API_URL}/farmers/${f.id}/stats`, 'farmer'),
        ]);
        setModules(Array.isArray(modules) ? modules : []);
        setStats(statsData);
        const preferred = statsData.preferred_language || 'en';
        if (preferred !== lang) { setLanguageFilter(preferred); fetchData(preferred); return; }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }

      // Daily feed loads after page is visible (non-blocking)
      try {
        const feedData = await cachedFetch(`${API_URL}/farmers/${f.id}/daily-feed?language=${lang}`, 'farmer');
        setDailyFeed(feedData);
      } catch (err) {
        console.error('Feed load error:', err);
      }
    };
    fetchData(languageFilter);
  }, [navigate]);

  // If a module is in the URL on load, pre-fetch its lessons
  useEffect(() => {
    if (openModuleParam && !lessonCache[openModuleParam]) {
      fetchModuleLessons(decodeURIComponent(openModuleParam));
    }
  }, [openModuleParam]);

  // Sync settings param from URL
  useEffect(() => {
    if (searchParams.get('settings') === 'true') {
      setShowSettings(true);
    }
  }, [searchParams]);

  // Reload modules when language changes
  useEffect(() => {
    if (!farmer) return;
    setLessonCache({});
    setSearchParams({});
    cachedFetch(`${API_URL}/api/v1/lessons/modules?language=${languageFilter}`, 'static')
      .then(data => setModules(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [languageFilter, farmer]);

  // Live activity polling
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/analytics/live`);
        if (res.ok) setRecentActivity(await res.json());
      } catch {}
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

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

  const filteredModules = modules.filter(m =>
    !searchQuery || m.module.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-outfit">
      {/* Desktop Sidebar - Admin-style Design */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#012d1d] flex flex-col py-8 shadow-xl hidden lg:flex z-50 overflow-y-auto custom-scrollbar">
        <div className="px-8 mb-12">
          <Link to="/" className="flex items-center gap-3 mb-2 group">
            <img src="/care4animals.png" alt="Care4Animals Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-0.5 shadow-lg shadow-black/20 group-hover:scale-105 transition-transform" />
            <span className="font-manrope font-black text-2xl text-white tracking-tight group-hover:text-slate-200 transition-colors">Care4Animals</span>
          </Link>
          <p className="text-[#A7C0A4] text-[10px] font-black uppercase tracking-[0.2em] ml-1">Farmer Dashboard</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          <SidebarItem 
            icon="dashboard" 
            label="Daily Feed" 
            active={false} 
            onClick={() => navigate('/farmer/feed')} 
          />
          <SidebarItem 
            icon="menu_book" 
            label="All Modules" 
            active={true} 
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
            onClick={() => setShowSettings(true)} 
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
        <Link to="/" className="flex items-center gap-3 min-w-0 group">
          <img src="/care4animals.png" alt="Care4Animals Logo" className="w-9 h-9 object-contain bg-white rounded-xl p-0.5 shadow-lg shadow-[#2D5A27]/20 shrink-0 group-hover:scale-105 transition-transform" />
          <span className="font-black text-lg text-[#1A1C1E] tracking-tight truncate">Care4Animals</span>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleLogout}
            className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100 shrink-0"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="lg:ml-72 p-6 md:p-12 pb-32 lg:pb-12 overflow-x-hidden">
        {/* Top Header - Unified branding */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#E7F3E8] text-[#2D5A27] rounded-2xl flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#2D5A27]">Curriculum</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[#1A1C1E] tracking-tight mb-2">
              Learning Library
            </h1>
            <p className="text-slate-500 font-medium text-lg">
              Explore {stats?.lessons_available ?? 0} expert lessons to improve your animal welfare.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative group max-w-xl mb-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#2D5A27] transition-colors" />
          <input
            type="text"
            placeholder="Search modules..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:border-[#2D5A27] focus:ring-4 focus:ring-[#2D5A27]/5 transition-all font-medium text-slate-700 shadow-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 mb-10">
          <StatCard label="Available" value={stats.lessons_available} color="bg-blue-50 text-blue-600" />
          <StatCard label="Completed" value={stats.lessons_completed} color="bg-green-50 text-green-600" />
          <StatCard label="Last Seen" value={stats.last_activity ? new Date(stats.last_activity).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'None'} color="bg-orange-50 text-orange-600" />
        </div>

        {/* Module Accordion */}
        <div className="space-y-4">
          {filteredModules.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-100">
              <Search className="w-10 h-10 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-[#1A1C1E] mb-2">No modules found</h3>
              <button onClick={() => setSearchQuery('')} className="mt-4 text-[#2D5A27] font-black hover:underline">Clear Search</button>
            </div>
          ) : filteredModules.map(({ module: moduleName, lesson_count }) => {
            const isOpen = openModules.has(moduleName);
            const isLoadingModule = loadingModules[moduleName];
            const moduleLessons = lessonCache[moduleName] || [];
            const completedCount = moduleLessons.filter(l => stats.completed_lesson_ids.includes(l.id)).length;
            const progress = moduleLessons.length > 0 ? Math.round((completedCount / moduleLessons.length) * 100) : 0;

            return (
              <div key={moduleName} className="bg-white rounded-[28px] border border-slate-100 overflow-hidden shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)]">
                {/* Module header row */}
                <button
                  onClick={() => toggleModule(moduleName)}
                  className="w-full flex items-center justify-between p-5 lg:p-6 text-left hover:bg-slate-50/60 active:bg-slate-100/80 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-[#2D5A27] text-white' : 'bg-[#F2F8F3] text-[#2D5A27]'}`}>
                      {isOpen ? <FolderOpen className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-[#1A1C1E] group-hover:text-[#2D5A27] transition-colors truncate">{moduleName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-slate-400">{lesson_count} lesson{lesson_count !== 1 ? 's' : ''}</span>
                        {completedCount > 0 && <span className="text-xs font-bold text-[#2D5A27]">· {completedCount} completed</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {moduleLessons.length > 0 && (
                      <div className="hidden md:flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2D5A27] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-400">{progress}%</span>
                      </div>
                    )}
                    <div className={`w-9 h-9 rounded-full border border-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </button>

                {/* Lessons grid */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-6 pb-6 pt-4">
                    {isLoadingModule ? (
                      <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
                        <div className="w-5 h-5 border-2 border-slate-200 border-t-[#2D5A27] rounded-full animate-spin" />
                        <span className="text-sm font-bold">Loading lessons...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {moduleLessons.map((lesson, idx) => (
                          <button
                            key={lesson.id}
                            onClick={() => navigate(`/farmer/dashboard?module=${encodeURIComponent(moduleName)}&lesson=${encodeURIComponent(lesson.code)}`)}
                            className="group/card bg-[#FDFCFB] rounded-[20px] border border-slate-100 p-5 hover:border-[#2D5A27]/20 hover:shadow-md transition-all text-left flex flex-col"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-10 h-10 bg-white text-[#2D5A27] rounded-xl flex items-center justify-center border border-slate-100 group-hover/card:bg-[#2D5A27] group-hover/card:text-white transition-colors">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              {stats.completed_lesson_ids.includes(lesson.id) ? (
                                <span className="flex items-center gap-1 text-white font-black text-[9px] uppercase tracking-widest bg-[#2D5A27] px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Done
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400 font-black text-[9px] uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                                  <Clock className="w-3 h-3" /> 5 min
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-[#1A1C1E] mb-2 group-hover/card:text-[#2D5A27] transition-colors leading-snug">{lesson.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 flex-1">{lesson.content?.substring(0, 90)}...</p>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{lesson.code}</span>
                              <PlayCircle className="w-5 h-5 text-slate-300 group-hover/card:text-[#2D5A27] transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#1A1C1E]/60 backdrop-blur-xl" 
            onClick={() => {
              setShowSettings(false);
              if (searchParams.get('settings')) setSearchParams({});
            }} 
          />
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl relative z-10 p-8 md:p-10 animate-in fade-in zoom-in duration-200 custom-scrollbar">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E7F3E8] text-[#2D5A27] rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[#2D5A27]" />
                </div>
                <h3 className="text-2xl font-black text-[#1A1C1E] tracking-tight">Farm Settings</h3>
              </div>
              <button 
                onClick={() => {
                  setShowSettings(false);
                  if (searchParams.get('settings')) setSearchParams({});
                }}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Farmed Animals Section */}
            <div className="mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Personalized Curriculums
              </h4>
              <p className="text-sm text-slate-500 font-medium mb-4">Select the animals you deal with to prioritize and personalize your library feed.</p>
              <div className="grid grid-cols-2 gap-3">
                {['cow', 'dog', 'pig', 'chicken', 'goat'].map((animal) => {
                  const isSelected = (stats.farmed_animals || 'cow').split(',').includes(animal);
                  return (
                    <button
                      key={animal}
                      onClick={async () => {
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
                            invalidateFarmerCache(farmer.id);
                            const statsRes = await fetch(`${API_URL}/farmers/${farmer.id}/stats`);
                            const statsData = await statsRes.json();
                            setStats(statsData);
                          }
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsUpdatingAnimals(false);
                        }
                      }}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-[#2D5A27] bg-[#F2F8F3] text-[#1A1C1E]' 
                          : 'border-slate-100 hover:border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-[#2D5A27] text-white' : 'bg-slate-100 text-slate-300'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold text-sm capitalize">
                        {animal}s
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Preference Section */}
            <div className="mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Language Preference
              </h4>
              <p className="text-sm text-slate-500 font-medium mb-4">Choose your preferred reading language. All modules and instructions will translate instantly.</p>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 gap-1">
                {[
                  { id: 'en', label: 'English' },
                  { id: 'lg', label: 'Luganda' },
                  { id: 'sw', label: 'Swahili' }
                ].map((lang) => {
                  const isSelected = languageFilter === lang.id;
                  return (
                    <button
                      key={lang.id}
                      onClick={() => handleUpdateLanguage(lang.id)}
                      disabled={isUpdatingLanguage}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all ${
                        isSelected 
                          ? 'bg-[#2D5A27] text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                      }`}
                    >
                      {lang.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SMS Subscription Section */}
            <div className="mb-8">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5" /> SMS Learning Feed
              </h4>
              
              <div className="bg-[#F8FAFB] border border-slate-100 rounded-3xl p-6 transition-all">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h5 className="font-black text-[#1A1C1E] text-base">Care4Animals SMS Group</h5>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Offline learning feed</p>
                  </div>
                  {/* Premium iOS-style Toggle Switch */}
                  <button
                    onClick={() => handleToggleSmsSubscription(!stats.is_subscribed_to_sms)}
                    disabled={isSubscribingSms}
                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${
                      stats.is_subscribed_to_sms ? 'bg-[#2D5A27]' : 'bg-slate-200'
                    }`}
                  >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300 ${
                      stats.is_subscribed_to_sms ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-4">
                  Get single animal care lessons sent directly to your phone (<strong>{farmer?.phone_number || "registered number"}</strong>) via SMS. Turn it on to be eligible to receive automated updates broadcasted by the administration.
                </p>

                <div className="p-3 bg-yellow-50/50 text-yellow-800 text-[11px] font-bold rounded-xl border border-yellow-100/50 flex items-start gap-2.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Standard carrier rates apply. You can turn this off at any time.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowSettings(false);
                if (searchParams.get('settings')) setSearchParams({});
              }}
              className="w-full py-5 bg-[#2D5A27] text-white rounded-2xl font-bold text-lg shadow-xl shadow-[#2D5A27]/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Save & Done
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <MobileNavItem icon={<Layout />} label="Home" active onClick={() => navigate('/farmer/dashboard')} />
        <MobileNavItem icon={<Flame />} label="Feed" onClick={() => navigate('/farmer/feed')} />
        <MobileNavItem icon={<BookOpen />} label="Library" onClick={() => navigate('/farmer/dashboard')} />
        <MobileNavItem icon={<User />} label="Profile" onClick={() => navigate('/farmer/profile')} />
      </nav>
    </div>
  );
};

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

const StatCard = ({ label, value, color }) => (
  <div className="bg-white p-5 lg:p-6 rounded-2xl lg:rounded-[32px] border border-slate-100 flex items-center justify-between min-w-[140px] lg:min-w-0 flex-1 shrink-0 lg:shrink shadow-sm lg:shadow-none">
    <div>
      <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl lg:text-2xl font-black text-[#1A1C1E]">{value}</p>
    </div>
    <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color} rounded-xl lg:rounded-2xl flex items-center justify-center font-bold`}>
      <BookOpen className="w-5 h-5 lg:w-6 lg:h-6" />
    </div>
  </div>
);

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

export default ModulesPage;
