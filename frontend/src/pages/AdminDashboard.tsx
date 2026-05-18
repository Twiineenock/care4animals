import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, BookOpen, Globe, Filter, ListTree, Send, Smartphone, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const AdminDashboard = () => {
  const [rawStats, setRawStats] = useState<any>(null);
  const [langChartData, setLangChartData] = useState<any[]>([]);
  const [themeChartData, setThemeChartData] = useState<any[]>([]);
  const [selectedLang, setSelectedLang] = useState('ALL');
  const [isOnline, setIsOnline] = useState(false);

  // SMS Broadcast States
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);
  const [smsError, setSmsError] = useState<string | null>(null);

  const NAVY = "#2E5B96";
  const EMERALD = "#4CAF50";
  const AMBER = "#F59E0B";

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
    } catch (err: any) {
      console.error(err);
      setSmsError(err.message || "An unexpected error occurred while sending SMS.");
    } finally {
      setSmsSending(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/analytics/summary`);
        const result = await response.json();
        setRawStats(result);
        
        // Map Language Data
        setLangChartData(Object.keys(result.language_stats).map(key => ({
          name: key.toUpperCase(),
          value: result.language_stats[key]
        })));

        // Map Theme Data (Sorted by value for better visualization)
        const themes = Object.keys(result.theme_stats).map(key => ({
          name: key,
          value: result.theme_stats[key]
        })).sort((a, b) => b.value - a.value);
        
        setThemeChartData(themes);
        setIsOnline(true);
      } catch (error) {
        console.error("Backend unreachable", error);
        setIsOnline(false);
      }
    };
    fetchStats();
  }, []);

  const handleFilterChange = (lang: string) => {
    setSelectedLang(lang);
    if (!rawStats) return;

    if (lang === 'ALL') {
      setLangChartData(Object.keys(rawStats.language_stats).map(k => ({ name: k.toUpperCase(), value: rawStats.language_stats[k] })));
    } else {
      setLangChartData([{ name: lang, value: rawStats.language_stats[lang.toLowerCase()] }]);
    }
  };

  if (!rawStats && isOnline) return <div className="p-10 text-center font-bold">Loading Bugema Analytics...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* HEADER SECTION (Same as before) */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border-b-4 border-[#4CAF50] gap-4">
        <div className="flex items-center gap-3">
          <img src="/bugema_logo.png" alt="Bugema" className="h-10 w-auto" />
          <div className="h-8 w-px bg-gray-200 mx-2" />
          <img src="/wts_logo.png" alt="WTS" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
          <Filter size={16} className="text-gray-400 ml-2" />
          {['ALL', 'EN', 'LG', 'SW'].map((l) => (
            <button key={l} onClick={() => handleFilterChange(l)} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${selectedLang === l ? 'bg-white text-[#2E5B96] shadow-sm border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}>{l}</button>
          ))}
        </div>
      </header>

      {/* TOP ROW: LANGUAGE CHART & STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-lg font-bold mb-6 text-[#2E5B96] flex items-center gap-2"><Globe size={20}/> Language Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={langChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f9fafb'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={50}>
                  {langChartData.map((e, i) => <Cell key={i} fill={e.name === 'LG' ? EMERALD : e.name === 'SW' ? AMBER : NAVY} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-[#2E5B96]">
                <p className="text-xs text-gray-500 font-bold uppercase">Total Lessons</p>
                <p className="text-4xl font-black text-gray-800">{rawStats?.metrics.total_lessons}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-[#4CAF50]">
                <p className="text-xs text-gray-500 font-bold uppercase">Active Themes</p>
                <p className="text-4xl font-black text-gray-800">{Object.keys(rawStats?.theme_stats || {}).length}</p>
            </div>

            {/* Premium SMS Broadcast Console Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-8 border-orange-500 flex flex-col gap-4">
                <div>
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <Smartphone size={16} className="text-orange-500 animate-pulse" />
                        SMS Broadcast Console
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">
                        Broadcast the next curriculum lesson as a branded SMS directly to all opted-in, subscribed farmers.
                    </p>
                </div>

                <button
                    id="send-sms-button"
                    onClick={handleSendDailyFeedSMS}
                    disabled={smsSending}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                        smsSending
                            ? 'bg-orange-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                    {smsSending ? (
                        <>
                            <Loader size={14} className="animate-spin" />
                            Broadcasting Lessons...
                        </>
                    ) : (
                        <>
                            <Send size={14} />
                            Broadcast SMS Lessons
                        </>
                    )}
                </button>

                <div className="bg-orange-50/70 border border-orange-100 rounded-xl p-3">
                    <p className="text-[10px] text-orange-700 font-bold leading-relaxed flex items-start gap-1">
                        <span className="text-xs">📢</span>
                        <span>
                            <strong>Subscription Policy Active:</strong> SMS lessons will only reach farmers who deliberately subscribed via their portal. Perfect for offline users!
                        </span>
                    </p>
                </div>

                {/* SMS Broadcast Results */}
                {smsResult && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex flex-col gap-1.5 animate-fadeIn">
                        <p className="text-xs text-green-800 font-bold flex items-center gap-1.5">
                            <CheckCircle size={14} className="text-green-600" />
                            {smsResult.message}
                        </p>
                        {smsResult.results?.map((res: any, idx: number) => (
                            <div key={idx} className="text-[10px] text-green-700 bg-white/60 p-2 rounded-lg border border-green-100/50 flex flex-col font-medium">
                                <span className="font-bold">Farmer: {res.farmer}</span>
                                <span>Phone: {res.phone}</span>
                                <span className="flex items-center gap-1">
                                    Status: <strong className="uppercase">{res.status}</strong>
                                    {res.message_id && <span className="text-[9px] text-gray-400 font-normal">({res.message_id})</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {smsError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-800 font-medium animate-fadeIn">
                        <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Failed to broadcast</p>
                            <p className="text-[10px] text-red-600 mt-0.5">{smsError}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* BOTTOM ROW: THEME DISTRIBUTION (New!) */}
      <div className="bg-white p-8 rounded-2xl shadow-sm">
        <h3 className="text-xl font-black text-[#2E5B96] mb-8 flex items-center gap-2">
            <ListTree size={24} /> Curriculum Coverage by Theme
        </h3>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={themeChartData} layout="vertical" margin={{ left: 150 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={140}
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#4b5563', fontSize: 11, fontWeight: 600}}
              />
              <Tooltip cursor={{fill: '#f9fafb'}} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                {themeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? NAVY : "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;