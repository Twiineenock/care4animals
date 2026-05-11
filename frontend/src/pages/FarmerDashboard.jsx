import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Search, LogOut, User, Layout, ChevronRight, PlayCircle, Clock } from 'lucide-react';

const FarmerDashboard = () => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [farmer, setFarmer] = useState(null);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    // Check if farmer is logged in
    const storedFarmer = localStorage.getItem('farmer_user');
    if (!storedFarmer) {
      navigate('/farmer/auth');
      return;
    }
    setFarmer(JSON.parse(storedFarmer));

    // Fetch lessons
    const fetchLessons = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/lessons`);
        const data = await response.json();
        setLessons(data);
      } catch (err) {
        console.error("Error fetching lessons:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [navigate, API_URL]);

  const handleLogout = () => {
    localStorage.removeItem('farmer_user');
    navigate('/');
  };

  const filteredLessons = lessons.filter(lesson => 
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <StatCard label="Lessons Available" value={lessons.length} color="bg-blue-50 text-blue-600" />
          <StatCard label="Modules Finished" value="0" color="bg-green-50 text-green-600" />
          <StatCard label="Last Activity" value="Today" color="bg-orange-50 text-orange-600" />
        </div>

        {/* Lessons Grid */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#1A1C1E] tracking-tight">Your Knowledge Library</h2>
            <span className="text-sm font-bold text-slate-400">{filteredLessons.length} Results Found</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredLessons.map((lesson) => (
              <div 
                key={lesson.id}
                className="group bg-white rounded-[32px] border border-slate-100 p-6 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.02)] hover:shadow-[0_32px_64px_-16px_rgba(45,90,39,0.08)] hover:border-[#2D5A27]/10 transition-all cursor-pointer"
              >
                <div className="w-14 h-14 bg-[#F2F8F3] text-[#2D5A27] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="mb-4">
                  <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 inline-block">
                    {lesson.theme || 'Livestock Health'}
                  </span>
                  <h3 className="text-xl font-bold text-[#1A1C1E] mb-2 group-hover:text-[#2D5A27] transition-colors line-clamp-1">
                    {lesson.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                    {lesson.content.substring(0, 100)}...
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
              <p className="text-slate-400 font-bold text-lg">No lessons found matching your search.</p>
            </div>
          )}
        </div>
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
