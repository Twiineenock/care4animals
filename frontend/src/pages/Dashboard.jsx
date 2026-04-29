import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { LayoutDashboard, Users, MessageSquare, ShieldCheck, BookOpen, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [logs, setLogs] = useState([]); // New state for logs
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, logsRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/analytics/summary'),
          fetch('http://127.0.0.1:8000/sms/logs')
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
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-slate-500 font-medium animate-pulse">Syncing Care4Animals Data...</p>
        </div>
      </div>
    );
  }

  const langData = Object.entries(data?.language_stats || {}).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  }));

  const themeData = Object.entries(data?.theme_stats || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* SIDEBAR */}
      <nav className="w-64 bg-slate-900 text-white p-6 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 border-b border-slate-800 pb-6">
          <div className="bg-emerald-500 p-2 rounded-lg text-white shadow-lg shadow-emerald-500/20">
            <LayoutDashboard size={20}/>
          </div>
          <span className="font-bold text-xl tracking-tight">Care4Animals</span>
        </div>
        
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 text-emerald-400 font-bold bg-emerald-400/10 p-3 rounded-xl cursor-pointer">
            <Activity size={18}/> Dashboard
          </div>
          <div className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800 p-3 rounded-xl transition-all cursor-pointer">
            <Users size={18}/> Farmers
          </div>
          {/* Link to the SMS section */}
          <a href="#sms-traffic" className="flex items-center gap-3 text-slate-400 hover:text-white hover:bg-slate-800 p-3 rounded-xl transition-all cursor-pointer">
            <MessageSquare size={18}/> SMS Traffic
          </a>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          <ShieldCheck size={14} className="text-emerald-500"/> Admin Verified
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Analytics Overview</h1>
            <p className="text-slate-500 font-medium italic">Partnering with Bugema University & WTS Foundation</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex flex-col items-end px-2">
               <span className="text-[10px] font-bold text-slate-400 leading-none mb-1 uppercase tracking-tighter">Verified Partner</span>
               <span className="text-sm font-black text-slate-700">WTS Foundation</span>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="flex gap-2 h-10 items-center">
                <img src="/bugema_logo.png" alt="BU" className="h-full object-contain" />
                <img src="/wts_logo.png" alt="WTS" className="h-8 object-contain" />
             </div>
          </div>
        </header>

        {/* METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-blue-500">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Lessons</p>
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg"><BookOpen size={16}/></div>
            </div>
            <p className="text-4xl font-black text-slate-800">{data?.metrics?.total_lessons || 0}</p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-emerald-500">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Languages</p>
              <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg"><ShieldCheck size={16}/></div>
            </div>
            <p className="text-4xl font-black text-slate-800">{langData.length}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-amber-500">
            <div className="flex justify-between items-start mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Users</p>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg"><Users size={16}/></div>
            </div>
            <p className="text-4xl font-black text-slate-800">{data?.metrics?.active_users || 0}</p>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
              Curriculum Engagement
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={themeData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
              Language Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={langData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                    {langData.map((entry, index) => (
                      <Cell key={index} fill={entry.name === 'LG' ? '#10b981' : entry.name === 'SW' ? '#f59e0b' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* NEW: SMS TRAFFIC TABLE SECTION */}
        <section id="sms-traffic" className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-6 bg-slate-800 rounded-full"></span>
              Live SMS Traffic
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase">Last 20 Activities</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Farmer</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Message Body</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-8 py-4">
                      <div className="font-bold text-slate-700">{log.phone_number}</div>
                      <div className="text-[10px] text-slate-400 font-medium">UID: {log.user_id}</div>
                    </td>
                    <td className="px-8 py-4 text-sm text-slate-600 max-w-xs truncate">
                      {log.message_body}
                    </td>
                    <td className="px-8 py-4">
                      <div className={`flex items-center gap-1.5 font-bold text-[10px] uppercase px-2.5 py-1 rounded-full w-fit ${
                        log.status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status === 'success' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>}
                        {log.status}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-xs text-slate-400 font-medium">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;