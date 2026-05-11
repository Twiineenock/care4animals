import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone, ChevronRight, UserPlus, LogIn } from 'lucide-react';

const FarmerAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    phone_number: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isLogin ? '/farmers/login' : '/farmers/signup';
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (isLogin) {
        localStorage.setItem('farmer_user', JSON.stringify(data.user));
        navigate('/dashboard'); // Or a specific farmer dashboard if we create one
      } else {
        setIsLogin(true);
        setError('Account created! Please login.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 font-outfit">
      <div className="max-w-[480px] w-full">
        {/* Logo/Header Area */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E7F3E8] rounded-full text-[#2D5A27] text-sm font-bold mb-4">
            <span className="w-2 h-2 bg-[#4CAF50] rounded-full animate-pulse" />
            FOR OUR FARMERS
          </div>
          <h1 className="text-4xl font-black text-[#1A1C1E] tracking-tight mb-2">
            {isLogin ? 'Welcome Back' : 'Join Care4Animals'}
          </h1>
          <p className="text-slate-500 font-medium">
            {isLogin ? 'Access your animal health dashboard' : 'Start tracking your livestock health today'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(45,90,39,0.08)] border border-slate-100 p-8 md:p-10 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F2F8F3] rounded-full -mr-16 -mt-16 z-0" />
          
          <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
            {error && (
              <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${error.includes('created') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#4CAF50] transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="farmer_joe"
                    className="w-full pl-12 pr-4 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#4CAF50] transition-colors" />
                      <input
                        type="email"
                        required
                        placeholder="joe@example.com"
                        className="w-full pl-12 pr-4 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#4CAF50] transition-colors" />
                      <input
                        type="tel"
                        required
                        placeholder="+256 700 000 000"
                        className="w-full pl-12 pr-4 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                        value={formData.phone_number}
                        onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#4CAF50] transition-colors" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#2D5A27] hover:bg-[#1E3D1A] text-white rounded-3xl font-bold text-lg transition-all shadow-[0_12px_24px_-8px_rgba(45,90,39,0.3)] flex items-center justify-center gap-3 group disabled:opacity-70"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Button */}
          <div className="mt-8 pt-8 border-t border-slate-100 text-center relative z-10">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-500 font-bold text-sm hover:text-[#2D5A27] transition-colors inline-flex items-center gap-2"
            >
              {isLogin ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Don't have an account? <span className="text-[#2D5A27] underline">Sign up here</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Already have an account? <span className="text-[#2D5A27] underline">Login here</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerAuth;
