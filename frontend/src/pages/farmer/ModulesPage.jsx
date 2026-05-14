import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Search, LogOut, User, Layout, ChevronDown,
  PlayCircle, Clock, Sparkles, CheckCircle2, FolderOpen,
  Folder, Info
} from 'lucide-react';

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
        const [modulesRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/lessons/modules?language=${lang}`),
          fetch(`${API_URL}/farmers/${f.id}/stats`)
        ]);
        if (modulesRes.ok) setModules(await modulesRes.json());
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
          const preferred = s.preferred_language || 'en';
          if (preferred !== lang) { setLanguageFilter(preferred); fetchData(preferred); return; }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
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

  // Reload modules when language changes
  useEffect(() => {
    if (!farmer) return;
    setLessonCache({});
    setSearchParams({});
    fetch(`${API_URL}/api/v1/lessons/modules?language=${languageFilter}`)
      .then(r => r.ok ? r.json() : [])
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
      {/* Sidebar */}
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
              {recentActivity.length > 0 ? recentActivity.map((a, i) => (
                <div key={i} className="pl-4 border-l-2 border-slate-100 hover:border-[#2D5A27] transition-all">
                  <p className="text-xs font-bold text-[#1A1C1E] truncate">{a.username}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">Completed {a.lesson_title}</p>
                  <p className="text-[8px] text-slate-300 font-black uppercase mt-1">
                    {new Date(a.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )) : (
                <p className="text-[10px] text-slate-400 italic text-center py-4">Waiting for activity...</p>
              )}
            </div>
          </div>
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

      {/* Main */}
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
              placeholder="Search modules..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl outline-none focus:border-[#2D5A27] focus:ring-4 focus:ring-[#2D5A27]/5 transition-all font-medium text-slate-700"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard label="Lessons Available" value={stats.lessons_available} color="bg-blue-50 text-blue-600" />
          <StatCard label="Lessons Completed" value={stats.lessons_completed} color="bg-green-50 text-green-600" />
          <StatCard label="Last Activity" value={stats.last_activity ? new Date(stats.last_activity).toLocaleDateString() : 'None'} color="bg-orange-50 text-orange-600" />
        </div>

        {/* Library header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-black text-[#1A1C1E] tracking-tight">Your Knowledge Library</h2>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
              {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''} · {stats.lessons_available} lessons
            </p>
          </div>
          {/* Language Filter */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            {[{ id: 'en', label: 'English' }, { id: 'lg', label: 'Luganda' }, { id: 'sw', label: 'Swahili' }].map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguageFilter(lang.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${languageFilter === lang.id ? 'bg-[#2D5A27] text-white shadow-lg shadow-[#2D5A27]/20' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
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
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/60 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-[#2D5A27] text-white' : 'bg-[#F2F8F3] text-[#2D5A27]'}`}>
                      {isOpen ? <FolderOpen className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#1A1C1E] group-hover:text-[#2D5A27] transition-colors">{moduleName}</h3>
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
          <div className="absolute inset-0 bg-[#1A1C1E]/60 backdrop-blur-xl" onClick={() => setShowSettings(false)} />
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 p-10">
            <h3 className="text-2xl font-black text-[#1A1C1E] mb-2">Farm Settings</h3>
            <p className="text-slate-500 font-medium mb-8">Select the animals you farm to personalise your lessons.</p>
            <div className="space-y-4 mb-10">
              {['cow', 'dog', 'pig', 'chicken', 'goat'].map(animal => {
                const isSelected = (stats.farmed_animals || 'cow').split(',').includes(animal);
                return (
                  <label key={animal} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-[#2D5A27] bg-[#F2F8F3]' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#2D5A27] text-white' : 'bg-slate-100 text-slate-300'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                      <span className={`font-bold ${isSelected ? 'text-[#1A1C1E]' : 'text-slate-400'}`}>{animal.charAt(0).toUpperCase() + animal.slice(1)}s</span>
                    </div>
                    <input type="checkbox" className="hidden" checked={isSelected} onChange={async () => {
                      const current = (stats.farmed_animals || 'cow').split(',');
                      const updated = current.includes(animal) ? current.filter(a => a !== animal) : [...current, animal];
                      if (updated.length === 0) return;
                      setIsUpdatingAnimals(true);
                      try {
                        const res = await fetch(`${API_URL}/farmers/${farmer.id}/animals`, {
                          method: 'PUT', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ farmed_animals: updated.join(',') })
                        });
                        if (res.ok) {
                          const s = await (await fetch(`${API_URL}/farmers/${farmer.id}/stats`)).json();
                          setStats(s);
                        }
                      } finally { setIsUpdatingAnimals(false); }
                    }} />
                  </label>
                );
              })}
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full py-5 bg-[#2D5A27] text-white rounded-2xl font-black shadow-xl shadow-[#2D5A27]/20 hover:scale-[1.02] transition-all">Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active = false, onClick }) => (
  <div onClick={onClick} className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold cursor-pointer transition-all ${active ? 'bg-[#2D5A27] text-white shadow-lg shadow-[#2D5A27]/20' : 'text-slate-500 hover:bg-slate-50'}`}>
    {React.cloneElement(icon, { className: 'w-5 h-5' })} {label}
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-[#1A1C1E]">{value}</p>
    </div>
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center font-bold`}>
      <BookOpen className="w-6 h-6" />
    </div>
  </div>
);

export default ModulesPage;
