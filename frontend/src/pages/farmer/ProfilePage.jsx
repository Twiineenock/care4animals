import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Camera, ArrowLeft, 
  Save, Layout, BookOpen, Flame, LogOut, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ProfilePage = () => {
  const [farmer, setFarmer] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    bio: '',
    profile_picture_url: ''
  });
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('farmer_user');
    if (!stored) {
      navigate('/farmer/auth');
      return;
    }
    const f = JSON.parse(stored);
    setFarmer(f);
    fetchProfile(f.id, f);
  }, [navigate]);

  const fetchProfile = async (id, currentFarmer) => {
    try {
      const res = await fetch(`${API_URL}/farmers/${id}/stats`);
      const data = await res.json();
      setStats(data);
      setFormData({
        username: currentFarmer?.username || '',
        email: currentFarmer?.email || '',
        phone_number: currentFarmer?.phone_number || '',
        bio: data.bio || '',
        profile_picture_url: data.profile_picture_url || ''
      });
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${farmer.id}-${Math.random()}.${fileExt}`;
      const filePath = `profile_pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, profile_picture_url: publicUrl }));
      setMessage({ type: 'success', text: 'Image uploaded! Remember to save changes.' });
    } catch (err) {
      console.error("Upload error", err);
      setMessage({ type: 'error', text: 'Failed to upload image. Make sure the bucket exists.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/farmers/${farmer.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update profile');
      }

      const updatedFarmer = await res.json();
      
      // Update local storage
      const stored = JSON.parse(localStorage.getItem('farmer_user'));
      localStorage.setItem('farmer_user', JSON.stringify({
        ...stored,
        username: updatedFarmer.username,
        email: updatedFarmer.email,
        phone_number: updatedFarmer.phone_number
      }));

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('farmer_user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="w-10 h-10 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-outfit flex">
      {/* Sidebar - Same as ModulesPage */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-[#012d1d] flex flex-col py-8 shadow-xl hidden lg:flex z-50 overflow-y-auto">
        <div className="px-8 mb-12 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#2D5A27] rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
              <Layout className="w-6 h-6" />
            </div>
            <span className="font-manrope font-black text-2xl tracking-tight">Care4Animals</span>
          </div>
          <p className="text-[#A7C0A4] text-[10px] font-black uppercase tracking-[0.2em] ml-1">Farmer Profile</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5">
          <SidebarItem icon="dashboard" label="Daily Feed" onClick={() => navigate('/farmer/feed')} />
          <SidebarItem icon="menu_book" label="All Modules" onClick={() => navigate('/farmer/dashboard')} />
          <SidebarItem icon="person" label="My Profile" active={true} />
          <SidebarItem icon="settings" label="Settings" onClick={() => navigate('/farmer/dashboard?settings=true')} />
          <div className="pt-6 mt-6 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-4 text-red-300 hover:text-red-100 hover:bg-red-500/10 rounded-2xl transition-all group font-bold text-sm">
              <span className="material-symbols-outlined text-[20px]">logout</span> Sign Out
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

      <main className="flex-1 lg:ml-72 p-6 md:p-12 pb-32 lg:pb-12 overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-[#2D5A27] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#2D5A27]/20 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <span className="font-black text-lg text-[#1A1C1E] tracking-tight truncate">My Profile</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleLogout}
              className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 shrink-0"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button onClick={() => navigate('/farmer/dashboard')} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 border border-slate-100 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#1A1C1E] tracking-tight mb-2">Edit Your Profile</h1>
            <p className="text-slate-500 font-medium">Manage your personal information and profile appearance.</p>
          </div>
          <button 
            onClick={() => navigate('/farmer/dashboard')}
            className="flex items-center gap-2 text-slate-400 font-bold hover:text-[#2D5A27] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </button>
        </div>

        <div className="max-w-4xl">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Left: Image Upload */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm flex flex-col items-center text-center">
                <div className="relative group mb-6">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-[32px] bg-slate-50 border-4 border-[#F2F8F3] overflow-hidden shadow-inner flex items-center justify-center">
                    {formData.profile_picture_url ? (
                      <img src={formData.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-slate-200" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-12 h-12 bg-[#2D5A27] text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                  />
                </div>
                <h4 className="font-black text-[#1A1C1E] text-lg mb-1">{formData.username}</h4>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Farmer</p>
                <p className="text-slate-500 text-sm font-medium italic">
                  {formData.bio || "No bio added yet. Tell us a bit about your farm!"}
                </p>
              </div>
            </div>

            {/* Right: Form Fields */}
            <div className="md:col-span-2 space-y-6">
              {message && (
                <div className={`p-5 rounded-3xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : null}
                  {message.text}
                </div>
              )}

              <div className="bg-white rounded-[40px] border border-slate-100 p-8 lg:p-10 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-[#2D5A27]/10 focus:bg-white outline-none transition-all font-bold text-[#1A1C1E]"
                        value={formData.username}
                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-[#2D5A27]/10 focus:bg-white outline-none transition-all font-bold text-[#1A1C1E]"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-[#2D5A27]/10 focus:bg-white outline-none transition-all font-bold text-[#1A1C1E]"
                        value={formData.phone_number}
                        placeholder="+256700000000"
                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">About Your Farm</label>
                  <textarea
                    rows={4}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-3xl focus:border-[#2D5A27]/10 focus:bg-white outline-none transition-all font-bold text-[#1A1C1E] resize-none"
                    placeholder="E.g. I farm cows and chickens in the central region..."
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>

                <div className="pt-4">
                  <button
                    disabled={saving || uploading}
                    className="w-full py-5 bg-[#2D5A27] text-white rounded-3xl font-black shadow-xl shadow-[#2D5A27]/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                  >
                    {saving ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Profile Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <MobileNavItem icon={<Layout />} label="Home" onClick={() => navigate('/farmer/dashboard')} />
        <MobileNavItem icon={<Flame />} label="Feed" onClick={() => navigate('/farmer/feed')} />
        <MobileNavItem icon={<BookOpen />} label="Library" onClick={() => navigate('/farmer/dashboard')} />
        <MobileNavItem icon={<User />} label="Profile" active onClick={() => navigate('/farmer/profile')} />
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

export default ProfilePage;
