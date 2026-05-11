import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Map username to the virtual email format used by our seed script
    const virtualEmail = `${username.toLowerCase().trim()}@care4animals.org`;

    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: virtualEmail, 
        password 
      });
      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      setMessage({ type: 'error', text: 'Invalid username or password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-[40px] shadow-2xl shadow-primary/10 border border-outline-variant p-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-on-primary mx-auto mb-6 shadow-xl shadow-primary/20">
            <span className="material-symbols-outlined text-3xl">shield_person</span>
          </div>
          <h2 className="font-manrope text-3xl font-extrabold text-primary tracking-tight">
            Admin Portal
          </h2>
          <p className="text-on-surface-variant text-sm font-medium">
            Authorized Personnel Only
          </p>
        </div>

        {message && (
          <div className="p-4 rounded-2xl text-sm font-bold flex items-center gap-3 bg-red-50 text-red-700">
            <span className="material-symbols-outlined">error</span>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Username</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors">person</span>
              <input 
                type="text" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1">Password</label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] group-focus-within:text-primary transition-colors">lock</span>
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>Secure Login <span className="material-symbols-outlined">verified_user</span></>
            )}
          </button>
        </form>

        <div className="pt-4 text-center border-t border-outline-variant">
          <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">
            Care4Animals Security Protocol v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;



