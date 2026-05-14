import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Mail, Phone, ChevronRight, UserPlus, LogIn, Eye, EyeOff, Globe, Camera } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Common country codes (A sample, can be expanded to "all" if needed via library)
const countryCodes = [
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+211', country: 'South Sudan', flag: '🇸🇸' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
].sort((a, b) => a.country.localeCompare(b.country));

const FarmerAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone_number: '',
    country_code: '+256',
    profile_picture_url: ''
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/farmers/login' : '/farmers/signup';
    
    // Combine country code and phone number for the backend
    const full_phone = `${formData.country_code}${formData.phone_number.replace(/^0+/, '')}`;
    
    const payload = {
      username: formData.username,
      password: formData.password,
      ...(isLogin ? {} : { 
        email: formData.email, 
        phone_number: full_phone,
        profile_picture_url: formData.profile_picture_url
      })
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      if (isLogin) {
        localStorage.setItem('farmer_user', JSON.stringify(data.user));
        navigate('/farmer/dashboard'); 
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `new-farmer-${Math.random()}.${fileExt}`;
      const filePath = `profile_pictures/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_pictures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_pictures')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, profile_picture_url: publicUrl }));
    } catch (err) {
      console.error("Upload error", err);
      setError('Failed to upload image. Account can still be created without it.');
    } finally {
      setUploading(false);
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

                  {/* Phone Field with Country Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="flex gap-2">
                      <div className="relative w-44 shrink-0">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                          className="w-full pl-9 pr-2 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                          value={formData.country_code}
                          onChange={(e) => setFormData({...formData, country_code: e.target.value})}
                        >
                          {countryCodes.map(c => (
                            <option key={c.code} value={c.code}>{c.country} ({c.code})</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative flex-1 group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#4CAF50] transition-colors" />
                        <input
                          type="tel"
                          required
                          placeholder="700 000 000"
                          className="w-full pl-12 pr-4 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                          value={formData.phone_number}
                          onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profile Picture Upload (Optional) */}
                  <div className="space-y-3 py-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Profile Picture (Optional)</label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
                          {formData.profile_picture_url ? (
                            <img src={formData.profile_picture_url} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-slate-200" />
                          )}
                          {uploading && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 text-sm font-bold flex items-center justify-center gap-2 hover:border-[#2D5A27]/20 hover:bg-[#F2F8F3] transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        {formData.profile_picture_url ? 'Change Photo' : 'Add Photo'}
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
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
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4CAF50] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field (Signup only) */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#4CAF50] transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-[#F8FAFB] border-2 border-transparent rounded-2xl focus:border-[#4CAF50]/20 focus:bg-white outline-none transition-all font-semibold text-slate-700"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#4CAF50] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}
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
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
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
