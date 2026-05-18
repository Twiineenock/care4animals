import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../supabaseClient';


const Dashboard = () => {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeView, setActiveView] = useState('overview'); // 'overview' or 'lessons'
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({
    code: '', title: '', topic: '', content: '', language: 'en', theme: '', sms_text: '', target_animals: 'cow', checklist: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [smsError, setSmsError] = useState(null);

  const handleSendDailyFeedSMS = async () => {
    setSmsSending(true);
    setSmsResult(null);
    setSmsError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sms/send-daily-feed`, {
        method: 'POST'
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to send daily feed SMS");
      }
      const data = await response.json();
      setSmsResult(data);
      
      // Proactively refresh live SMS traffic table!
      const logsRes = await fetch(`${import.meta.env.VITE_API_URL}/sms/logs`);
      const logsJson = await logsRes.json();
      setLogs(logsJson);
    } catch (err) {
      console.error(err);
      setSmsError(err.message || "An unexpected error occurred while sending SMS.");
    } finally {
      setSmsSending(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, logsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/analytics/summary`),
          fetch(`${import.meta.env.VITE_API_URL}/sms/logs`)
        ]);
        
        const analyticsJson = await analyticsRes.json();
        const logsJson = await logsRes.json();
        
        setData(analyticsJson);
        setLogs(logsJson);
      } catch (err) {
        console.error("Connection error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-on-surface-variant font-medium animate-pulse">Syncing AgriAnalytics Data...</p>
        </div>
      </div>
    );
  }

  // Curve data for the chart
  const curveData = [
    { name: 'Mon', value: 30 }, { name: 'Tue', value: 45 }, { name: 'Wed', value: 35 },
    { name: 'Thu', value: 50 }, { name: 'Fri', value: 48 }, { name: 'Sat', value: 60 },
    { name: 'Sun', value: 55 },
  ];

  return (
    <div className="flex min-h-screen bg-background text-on-background font-inter overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-[280px] bg-primary flex flex-col py-8 shadow-md z-50">
        <div className="px-6 mb-10">
          <h1 className="text-on-primary font-manrope text-[24px] font-bold tracking-tight">Care4Animals</h1>
          <p className="text-on-primary-container text-[12px] font-semibold uppercase tracking-wider">Precision Farming</p>
        </div>
        
        <nav className="flex-1 space-y-2 px-2">
          <SidebarItem icon="dashboard" label="Dashboard" active={activeView === 'overview'} onClick={() => setActiveView('overview')} />
          <SidebarItem icon="menu_book" label="Lessons" active={activeView === 'lessons'} onClick={() => setActiveView('lessons')} />
          <SidebarItem icon="groups" label="Farmers" />
          <SidebarItem icon="sms" label="SMS Traffic" />
          <SidebarItem icon="bar_chart" label="Reports" />
          <div className="pt-4 mt-4 border-t border-primary-container/30">
            <button 
              onClick={handleLogoutClick}
              className="w-full text-on-primary-container hover:text-red-200 hover:bg-red-900/20 rounded-lg flex items-center px-6 py-3 gap-3 transition-all duration-200 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-semibold text-[12px]">Logout</span>
            </button>
          </div>
        </nav>

        <div className="px-6 py-4 border-t border-primary-container mt-auto">
          <button 
            onClick={() => setShowAddLesson(true)}
            className="w-full bg-secondary-fixed text-on-secondary-fixed py-2.5 rounded-lg font-semibold text-[12px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Lesson
          </button>
          
          <div className="mt-6 space-y-1">
            <FooterLink icon="settings" label="Settings" />
            <FooterLink icon="help" label="Support" />
          </div>
        </div>

        <div className="px-6 py-6 border-t border-primary-container bg-primary">
          <p className="text-on-primary-container font-semibold uppercase tracking-wider text-[10px] mb-4">Partnered with</p>
          <div className="flex flex-col gap-4">
            <Partner brand="WTS Foundation" logo="/wts_logo.png" />
            <Partner brand="Bugema University" logo="/bugema_logo.png" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-[280px] min-h-screen flex-1">
        {/* Top Navigation Bar */}
        <header className="flex justify-between items-center h-16 px-8 bg-surface border-b border-outline-variant sticky top-0 z-40">
          <div className="flex items-center gap-8">
            <h2 className="text-primary font-manrope text-[24px] font-semibold whitespace-nowrap">
              {activeView === 'overview' ? 'Analytics Overview' : 'Lesson Management'}
            </h2>
            <div className="h-8 w-[1px] bg-outline-variant"></div>
          </div>
          
          <div className="flex items-center gap-6 flex-1 justify-end">
            <div className="relative max-w-xs w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input 
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm w-full focus:ring-1 focus:ring-primary outline-none" 
                placeholder="Search analytics..." 
                type="text"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <IconButton icon="notifications" />
              <button 
                onClick={handleLogoutClick}
                className="flex items-center gap-2 p-1 pl-3 pr-1 bg-surface-container-high rounded-full hover:bg-red-50 hover:text-red-600 transition-colors group"
                title="Logout"
              >
                <span className="font-semibold text-[12px] text-on-surface-variant group-hover:text-red-600">Admin</span>
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary group-hover:bg-red-600">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 space-y-12">
          {activeView === 'overview' ? (
            <>
              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCard 
                  label="Total Lessons" 
                  value={data?.metrics?.total_lessons || 0} 
                  icon="menu_book" 
                  trend="+12%" 
                  trendText="vs last month"
                  accentColor="border-b-blue-500"
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <MetricCard 
                  label="Languages" 
                  value={Object.keys(data?.language_stats || {}).length || 3} 
                  icon="translate" 
                  trendText="LG, EN, SW active"
                  accentColor="border-b-green-600"
                  iconBg="bg-green-50"
                  iconColor="text-green-700"
                />
                <MetricCard 
                  label="Active Users" 
                  value={data?.metrics?.active_users || 0} 
                  icon="person_pin_circle" 
                  trend="Awaiting Campaign" 
                  trendColor="text-error"
                  accentColor="border-b-orange-500"
                  iconBg="bg-orange-50"
                  iconColor="text-orange-600"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Curriculum Engagement Card */}
                <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h4 className="text-primary font-manrope text-[20px] font-semibold">Curriculum Engagement</h4>
                      <p className="text-on-surface-variant text-[14px]">Engagement trends across all learning modules</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 text-[12px] font-semibold bg-surface-container rounded-lg border border-outline-variant">7 Days</button>
                      <button className="px-3 py-1 text-[12px] font-semibold bg-primary text-on-primary rounded-lg">30 Days</button>
                    </div>
                  </div>
                  
                  <div className="h-[320px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={curveData}>
                        <defs>
                          <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#012d1d" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#012d1d" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e3e4" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#414844', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#414844', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="value" stroke="#012d1d" strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Language Distribution Card */}
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col p-8">
                  <h4 className="text-primary font-manrope text-[20px] font-semibold mb-2">Language Distribution</h4>
                  <p className="text-on-surface-variant text-[14px] mb-8">Content availability by language code</p>
                  
                  <div className="flex-1 flex flex-col justify-between space-y-6">
                    <ProgressBar label="LG (Luganda)" count="136 Lessons" percentage={33} color="bg-primary" />
                    <ProgressBar label="EN (English)" count="136 Lessons" percentage={33} color="bg-secondary-fixed-dim" />
                    <ProgressBar label="SW (Swahili)" count="136 Lessons" percentage={34} color="bg-tertiary-fixed-dim" />
                  </div>

                  <div className="mt-8 pt-6 border-t border-outline-variant">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-tertiary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-tertiary-container">public</span>
                      </div>
                      <div>
                        <p className="text-on-surface font-semibold text-[14px]">Regional Expansion</p>
                        <p className="text-on-surface-variant text-[12px]">Targeting 2 new regions in Q4</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Premium SMS Broadcast Console Card */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8 border-l-[8px] border-orange-500 flex flex-col gap-6 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <span className="material-symbols-outlined text-[28px] animate-pulse">cell_tower</span>
                    </div>
                    <div>
                      <h4 className="text-primary font-manrope text-[20px] font-semibold flex items-center gap-2">
                        SMS Broadcast Console
                      </h4>
                      <p className="text-on-surface-variant text-[14px] mt-1">
                        Instantly send today's daily feed to offline farmers' phones using your paired Textbee Android Gateway.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                    <div className="bg-orange-50/70 border border-orange-100 rounded-xl p-3 max-w-[280px]">
                      <p className="text-[10px] text-orange-700 font-bold leading-relaxed">
                        ⚠️ <strong>Testing Mode Active:</strong> Outbox is restricted to <strong>ONLY 1 farmer</strong> (the first record) to preserve your free Textbee credits.
                      </p>
                    </div>

                    <button
                      id="send-sms-button"
                      onClick={handleSendDailyFeedSMS}
                      disabled={smsSending}
                      className={`py-3.5 px-6 rounded-xl font-bold text-[12px] uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${
                        smsSending
                          ? 'bg-orange-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {smsSending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Broadcasting Daily Feed...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          Send Daily Feed SMS
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SMS Broadcast Results */}
                {smsResult && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col gap-3 animate-fadeIn">
                    <p className="text-sm text-green-800 font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-green-600">check_circle</span>
                      {smsResult.message}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {smsResult.results?.map((res, idx) => (
                        <div key={idx} className="text-xs text-green-700 bg-white/60 p-3 rounded-lg border border-green-100/50 flex flex-col gap-0.5 animate-fadeIn">
                          <span className="font-bold">Farmer: {res.farmer}</span>
                          <span>Phone: {res.phone}</span>
                          <span className="flex items-center gap-1 font-semibold">
                            Status: <strong className="uppercase">{res.status}</strong>
                            {res.message_id && <span className="text-[10px] text-gray-400 font-normal">({res.message_id})</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {smsError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-sm text-red-800 font-medium animate-fadeIn">
                    <span className="material-symbols-outlined text-red-600 shrink-0">error</span>
                    <div>
                      <p className="font-bold">Failed to broadcast</p>
                      <p className="text-xs text-red-600 mt-0.5">{smsError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* SMS Traffic Table */}
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-6 border-b border-outline-variant flex justify-between items-center">
                  <h4 className="text-primary font-manrope text-[20px] font-semibold">Live SMS Traffic</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Farmer</th>
                        <th className="px-6 py-4 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Message</th>
                        <th className="px-6 py-4 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 font-semibold text-[12px] text-on-surface-variant uppercase tracking-wider">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {logs.slice(0, 10).map((log) => (
                        <tr key={log.id} className="hover:bg-surface-container-low transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-on-surface">{log.phone_number}</div>
                            <div className="text-[11px] text-on-surface-variant">UID: {log.user_id}</div>
                          </td>
                          <td className="px-6 py-4 text-[14px] text-on-surface-variant max-w-xs truncate">{log.message_body}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase ${
                              log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[12px] text-on-surface-variant">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8">
              <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-primary font-manrope text-[24px] font-bold">Lessons Management</h3>
                  <button 
                    onClick={() => setShowAddLesson(true)}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-bold text-[14px] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Create New Lesson
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Lesson Cards or Table would go here */}
                  <div className="p-12 text-center col-span-full border-2 border-dashed border-outline-variant rounded-2xl">
                    <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">auto_stories</span>
                    <p className="text-on-surface-variant font-medium text-lg">Use the "Create New Lesson" button to start building your curriculum.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-surface-container-lowest rounded-[32px] shadow-2xl border border-outline-variant p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[32px]">logout</span>
              </div>
              <h3 className="text-primary font-manrope text-[24px] font-bold mb-2">Sign Out?</h3>
              <p className="text-on-surface-variant text-[14px] mb-8">
                Are you sure you want to end your session? You will need to login again to access the dashboard.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-3 px-4 bg-surface-container-high hover:bg-surface-variant text-on-surface rounded-2xl font-bold text-[14px] transition-colors"
                >
                  Stay Logged In
                </button>
                <button 
                  onClick={confirmLogout}
                  className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-[14px] transition-all shadow-lg shadow-red-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lesson Modal */}
      {showAddLesson && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddLesson(false)} />
          <div className="relative bg-surface-container-lowest rounded-[32px] shadow-2xl border border-outline-variant p-10 max-w-2xl w-full my-8">
            <h3 className="text-primary font-manrope text-[28px] font-black mb-8">Create New Lesson</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-on-surface-variant">Lesson Code</label>
                <input 
                  type="text" 
                  placeholder="e.g. COW1"
                  className="w-full px-4 py-3 bg-surface-container rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newLesson.code}
                  onChange={e => setNewLesson({...newLesson, code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-on-surface-variant">Title</label>
                <input 
                  type="text" 
                  placeholder="Lesson Title"
                  className="w-full px-4 py-3 bg-surface-container rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newLesson.title}
                  onChange={e => setNewLesson({...newLesson, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-on-surface-variant">Target Animal(s)</label>
                <select 
                  className="w-full px-4 py-3 bg-surface-container rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newLesson.target_animals}
                  onChange={e => setNewLesson({...newLesson, target_animals: e.target.value})}
                >
                  <option value="cow">Cows</option>
                  <option value="dog">Dogs</option>
                  <option value="pig">Pigs</option>
                  <option value="chicken">Chickens</option>
                  <option value="goat">Goats</option>
                  <option value="cow,dog,pig,chicken,goat">General / All</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-on-surface-variant">Language</label>
                <select 
                  className="w-full px-4 py-3 bg-surface-container rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newLesson.language}
                  onChange={e => setNewLesson({...newLesson, language: e.target.value})}
                >
                  <option value="en">English</option>
                  <option value="lg">Luganda</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black uppercase text-on-surface-variant">Content</label>
                <textarea 
                  rows={4}
                  placeholder="Full lesson content..."
                  className="w-full px-4 py-3 bg-surface-container rounded-xl outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  value={newLesson.content}
                  onChange={e => setNewLesson({...newLesson, content: e.target.value})}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black uppercase text-on-surface-variant">SMS Summary</label>
                <input 
                  type="text" 
                  placeholder="Brief SMS text..."
                  className="w-full px-4 py-3 bg-surface-container rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newLesson.sms_text}
                  onChange={e => setNewLesson({...newLesson, sms_text: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => setShowAddLesson(false)}
                className="flex-1 py-4 bg-surface-container-high text-on-surface rounded-2xl font-black transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={isSaving}
                onClick={async () => {
                    setIsSaving(true);
                    try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/lessons`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newLesson)
                        });
                        if (res.ok) {
                            setShowAddLesson(false);
                            setNewLesson({
                                code: '', title: '', topic: '', content: '', language: 'en', theme: '', sms_text: '', target_animals: 'cow', checklist: ''
                            });
                            // Refresh data
                            const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/analytics/summary`);
                            const statsJson = await statsRes.json();
                            setData(statsJson);
                        } else {
                            const errData = await res.json();
                            alert(`Error: ${errData.detail || 'Failed to save lesson'}`);
                        }
                    } catch (e) { 
                        console.error(e);
                        alert("Connection error while saving lesson");
                    }
                    finally { setIsSaving(false); }
                }}
                className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-black shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Lesson'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const SidebarItem = ({ icon, label, active = false, onClick }) => (
  <a 
    onClick={(e) => { e.preventDefault(); onClick && onClick(); }}
    className={`${
      active ? 'bg-tertiary-container text-on-tertiary-container' : 'text-on-primary-container hover:text-on-primary hover:bg-primary-container'
    } rounded-lg mx-2 flex items-center px-4 py-3 gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer`} 
    href="#"
  >
    <span className="material-symbols-outlined">{icon}</span>
    <span className="font-semibold text-[12px]">{label}</span>
  </a>
);

const FooterLink = ({ icon, label }) => (
  <a className="text-on-primary-container hover:text-on-primary flex items-center gap-3 py-2 text-sm cursor-pointer" href="#">
    <span className="material-symbols-outlined text-[20px]">{icon}</span>
    <span>{label}</span>
  </a>
);

const Partner = ({ brand, logo }) => (
  <div className="flex items-center gap-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
    <div className="w-8 h-8 rounded bg-white flex items-center justify-center overflow-hidden p-1">
      <img src={logo} alt={brand} className="w-full h-full object-contain" />
    </div>
    <span className="text-on-primary-container font-semibold text-[12px]">{brand}</span>
  </div>
);

const IconButton = ({ icon }) => (
  <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
    <span className="material-symbols-outlined">{icon}</span>
  </button>
);

const MetricCard = ({ label, value, icon, trend, trendText, trendColor = "text-green-600", accentColor, iconBg, iconColor }) => (
  <div className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant border-b-4 ${accentColor} flex flex-col justify-between hover:shadow-md transition-shadow cursor-default`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-on-surface-variant font-semibold text-[12px] uppercase tracking-wider">{label}</p>
        <h3 className="text-primary font-manrope text-[32px] font-bold mt-1">{value}</h3>
      </div>
      <div className={`p-2 ${iconBg} ${iconColor} rounded-lg`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
    </div>
    <div className="mt-4 flex items-center gap-2">
      {trend && <span className={`${trendColor} font-semibold text-[12px]`}>{trend}</span>}
      <span className="text-on-surface-variant text-[12px]">{trendText}</span>
    </div>
  </div>
);

const ProgressBar = ({ label, count, percentage, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[12px] font-semibold">
      <span className="text-on-surface">{label}</span>
      <span className="text-primary">{count}</span>
    </div>
    <div className="h-4 bg-surface-container rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-1000`} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  </div>
);

export default Dashboard;