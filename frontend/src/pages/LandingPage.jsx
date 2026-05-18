import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-on-background font-inter selection:bg-secondary-fixed selection:text-on-secondary-fixed">
      {/* Navigation */}
      <nav className="flex flex-col md:flex-row justify-between items-center gap-4 px-8 md:px-16 py-4 sticky top-0 bg-background/90 backdrop-blur-md border-b border-outline-variant z-50 shadow-sm">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img src="/care4animals.png" alt="Care4Animals Logo" className="w-12 h-12 object-contain bg-white rounded-xl p-0.5 shadow-md group-hover:scale-105 transition-transform" />
            <span className="font-manrope text-2xl font-black text-primary tracking-tight group-hover:text-primary/85 transition-colors">Care4Animals</span>
          </Link>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Supported by:</span>
            <div className="flex items-center gap-3 bg-white border border-outline-variant rounded-full px-3.5 py-1.5 shadow-sm">
              <img src="/wts_logo.png" alt="WTS" className="h-6 object-contain" />
              <div className="h-3 w-px bg-slate-200" />
              <img src="/bugema_logo.png" alt="Bugema" className="h-8 object-contain" />
              <div className="h-3 w-px bg-slate-200" />
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                <span className="tracking-tight text-[11px] font-black uppercase">Global Animal Fund</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-6 text-sm font-bold text-on-surface-variant">
            <a href="#about" className="hover:text-primary transition-colors">Our Mission</a>
            <a href="#impact" className="hover:text-primary transition-colors">Impact</a>
            <a href="#partners" className="hover:text-primary transition-colors">Partners</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/farmer/auth" className="px-5 py-2 rounded-full text-xs font-bold text-primary hover:bg-primary/5 transition-all">
              Farmer Portal
            </Link>
            <Link to="/login" className="px-5 py-2.5 rounded-full text-xs font-bold bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 transition-all">
              Admin Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-8 md:px-16 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full text-primary font-bold text-xs uppercase tracking-widest">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Empowering 10k+ Farmers
            </div>
            <h1 className="font-manrope text-5xl md:text-7xl font-extrabold text-primary leading-[1.1] tracking-tight">
              Smarter Care for <span className="text-secondary italic">Every</span> Animal.
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              We leverage data analytics and SMS technology to bring expert veterinary knowledge directly to rural farmers, ensuring healthier livestock and sustainable livelihoods.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/farmer/auth" className="px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center gap-2">
                Farmer Portal <span className="material-symbols-outlined">agriculture</span>
              </Link>
              <Link to="/login" className="px-8 py-4 bg-white border border-outline-variant text-primary rounded-2xl font-bold text-lg hover:bg-surface-container-low transition-all">
                Admin Login
              </Link>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/5 rounded-[40px] rotate-3 blur-2xl"></div>
            <div className="relative aspect-square bg-white rounded-[40px] overflow-hidden border-8 border-white shadow-2xl flex items-center justify-center p-6">
              <img src="/care4animals.png" alt="Care4Animals Banner" className="w-full h-full object-contain" />
            </div>
            {/* Floating Card */}
            <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-3xl shadow-2xl border border-outline-variant animate-bounce-slow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined">trending_up</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Survival Rate</p>
                  <p className="text-xl font-black text-slate-800">+24% Increase</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section id="partners" className="py-24 bg-surface-container-low border-y border-outline-variant">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-center text-xs font-bold text-on-surface-variant uppercase tracking-[0.3em] mb-12">Trusted By Global Leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-16 md:gap-32">
            <img src="/wts_logo.png" alt="WTS" className="h-14 md:h-16 object-contain hover:scale-105 transition-all cursor-pointer" />
            <img src="/bugema_logo.png" alt="Bugema" className="h-16 md:h-20 object-contain hover:scale-105 transition-all cursor-pointer" />
            <div className="flex items-center gap-3 text-primary hover:scale-105 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-4xl text-primary">public</span>
              <span className="font-manrope text-xl font-black uppercase tracking-tight">Global Animal Fund</span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-8">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="font-manrope text-4xl md:text-5xl font-bold text-primary">Our Mission</h2>
          <p className="text-xl md:text-2xl text-on-surface-variant leading-relaxed">
            "Care4Animals exists to bridge the information gap in rural veterinary care. By combining simple SMS communication with complex data analytics, we help farmers identify diseases early, optimize nutrition, and increase productivity."
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
            <FeatureCard 
              icon="sms" 
              title="SMS Education" 
              desc="Daily tips and disease alerts sent directly to basic mobile phones." 
            />
            <FeatureCard 
              icon="monitoring" 
              title="Data Insights" 
              desc="Real-time tracking of livestock health across entire regions." 
            />
            <FeatureCard 
              icon="support_agent" 
              title="Expert Support" 
              desc="Connecting farmers with certified veterinarians in seconds." 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-on-primary py-20 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/care4animals.png" alt="Care4Animals Logo" className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 shadow-sm group-hover:scale-105 transition-transform" />
              <span className="font-manrope text-xl font-black text-white tracking-tight">Care4Animals</span>
            </Link>
            <p className="text-on-primary-container max-w-sm">
              Protecting livelihoods by protecting animals. We are committed to sustainable farming and veterinary excellence.
            </p>
          </div>
          <div className="space-y-4">
            <p className="font-bold text-secondary-fixed">Platform</p>
            <ul className="space-y-2 text-sm text-on-primary-container">
              <li><a href="#" className="hover:text-on-primary">Dashboard</a></li>
              <li><a href="#" className="hover:text-on-primary">For Farmers</a></li>
              <li><a href="#" className="hover:text-on-primary">Success Stories</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="font-bold text-secondary-fixed">Contact</p>
            <ul className="space-y-2 text-sm text-on-primary-container">
              <li>info@care4animals.org</li>
              <li>+256 700 000000</li>
              <li>Uganda, East Africa</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-primary-container text-center text-xs text-on-primary-container/60">
          © 2026 Care4Animals. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-8 bg-surface-container rounded-3xl border border-outline-variant hover:border-primary/20 hover:shadow-xl transition-all group text-left">
    <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <h3 className="font-manrope text-xl font-bold mb-3">{title}</h3>
    <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;
