import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, Languages, ArrowLeft, Layout, Home
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LessonPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const moduleName = searchParams.get('module') || '';
  const lessonCode = searchParams.get('lesson') || '';

  const [lesson, setLesson] = useState(null);
  const [moduleLessons, setModuleLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState(null);
  const [stats, setStats] = useState({ completed_lesson_ids: [] });
  const [isMarking, setIsMarking] = useState(false);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const storedFarmer = localStorage.getItem('farmer_user');
    if (!storedFarmer) { navigate('/farmer/auth'); return; }
    const f = JSON.parse(storedFarmer);
    setFarmer(f);

    const init = async () => {
      try {
        const [lessonsRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/lessons/by-module?module=${encodeURIComponent(moduleName)}&language=${lang}`),
          fetch(`${API_URL}/farmers/${f.id}/stats`)
        ]);
        if (lessonsRes.ok) {
          const all = await lessonsRes.json();
          setModuleLessons(all);
          const found = all.find(l => l.code === lessonCode);
          setLesson(found || null);
        }
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [moduleName, lessonCode, lang, navigate]);

  const currentIndex = moduleLessons.findIndex(l => l.code === lessonCode);
  const prevLesson = currentIndex > 0 ? moduleLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < moduleLessons.length - 1 ? moduleLessons[currentIndex + 1] : null;

  const goToLesson = (l) => {
    navigate(`/farmer/dashboard?module=${encodeURIComponent(moduleName)}&lesson=${encodeURIComponent(l.code)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkAsCompleted = async () => {
    if (!farmer || isMarking || !lesson) return;
    setIsMarking(true);
    try {
      const res = await fetch(`${API_URL}/progress/complete/${lesson.id}?farmer_id=${farmer.id}`, { method: 'POST' });
      if (res.ok) {
        const s = await (await fetch(`${API_URL}/farmers/${farmer.id}/stats`)).json();
        setStats(s);
        // Auto-advance to next lesson after marking complete
        if (nextLesson) {
          setTimeout(() => goToLesson(nextLesson), 600);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="w-10 h-10 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB] gap-4">
        <p className="text-xl font-bold text-slate-500">Lesson not found.</p>
        <Link to={`/farmer/dashboard?module=${encodeURIComponent(moduleName)}`} className="text-[#2D5A27] font-black hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to module
        </Link>
      </div>
    );
  }

  const isCompleted = stats.completed_lesson_ids.includes(lesson.id);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-outfit">
      {/* Top navigation bar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 min-w-0">
            <Link to="/farmer/dashboard" className="hover:text-[#2D5A27] transition-colors flex items-center gap-1.5 shrink-0">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Modules</span>
            </Link>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <Link
              to={`/farmer/dashboard?module=${encodeURIComponent(moduleName)}`}
              className="hover:text-[#2D5A27] transition-colors truncate max-w-[140px] sm:max-w-xs"
            >
              {moduleName}
            </Link>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span className="text-[#1A1C1E] truncate max-w-[120px] sm:max-w-xs">{lesson.title}</span>
          </div>

          {/* Lesson counter */}
          <span className="text-xs font-black text-slate-400 shrink-0">
            {currentIndex + 1} / {moduleLessons.length}
          </span>
        </div>

        {/* Progress bar across full width */}
        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2D5A27] rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / moduleLessons.length) * 100}%` }}
          />
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Lesson header */}
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#F2F8F3] text-[#2D5A27] rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <Layout className="w-3.5 h-3.5" />
            {moduleName}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-[#1A1C1E] tracking-tight leading-tight mb-4">
            {lesson.title}
          </h1>
          <div className="flex items-center gap-4 text-slate-400 text-sm font-bold">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 5 min read</span>
            <span className="text-slate-200">·</span>
            <span className="uppercase tracking-widest text-xs">{lesson.code}</span>
            {isCompleted && (
              <>
                <span className="text-slate-200">·</span>
                <span className="flex items-center gap-1.5 text-[#2D5A27]">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              </>
            )}
          </div>
        </div>

        {/* SMS summary card */}
        {lesson.sms_text && (
          <div className="bg-[#F8FAFB] rounded-[28px] p-6 border border-slate-100 mb-10">
            <div className="flex items-center gap-2 mb-3 text-[#2D5A27]">
              <Languages className="w-4 h-4" />
              <span className="font-black text-xs uppercase tracking-widest">Quick Summary (SMS Version)</span>
            </div>
            <p className="text-slate-600 font-mono text-sm leading-relaxed italic">"{lesson.sms_text}"</p>
          </div>
        )}

        {/* Full content */}
        <article className="space-y-5 mb-12">
          {lesson.content?.split(/\n+/).map((para, i) => (
            para.trim() ? (
              <p key={i} className="text-lg text-slate-700 leading-loose font-medium">{para}</p>
            ) : null
          ))}
        </article>

        {/* Checklist */}
        {lesson.checklist && (
          <div className="mb-12">
            <h3 className="text-xl font-black text-[#1A1C1E] mb-5 tracking-tight">Summary Checklist</h3>
            <div className="grid gap-3">
              {(() => {
                try {
                  return JSON.parse(lesson.checklist).map((tip, i) => (
                    <div key={i} className="flex items-center gap-4 bg-[#F2F8F3] p-5 rounded-2xl border border-[#2D5A27]/10">
                      <CheckCircle2 className="w-5 h-5 text-[#2D5A27] shrink-0" />
                      <span className="font-bold text-[#1A1C1E]">{tip}</span>
                    </div>
                  ));
                } catch { return null; }
              })()}
            </div>
          </div>
        )}

        {/* Mark complete button */}
        <div className="flex justify-center mb-16">
          {isCompleted ? (
            <div className="flex items-center gap-3 px-8 py-4 bg-[#F2F8F3] text-[#2D5A27] rounded-2xl font-black border border-[#2D5A27]/20">
              <CheckCircle2 className="w-5 h-5" /> Lesson Completed
            </div>
          ) : (
            <button
              onClick={handleMarkAsCompleted}
              disabled={isMarking}
              className="px-10 py-4 bg-[#2D5A27] text-white rounded-2xl font-black shadow-xl shadow-[#2D5A27]/20 hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-3"
            >
              {isMarking ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Mark as Completed</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sticky bottom navigation */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-4 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Previous */}
          {prevLesson ? (
            <button
              onClick={() => goToLesson(prevLesson)}
              className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all group max-w-[45%]"
            >
              <ChevronLeft className="w-5 h-5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <div className="text-left min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Previous</p>
                <p className="text-sm font-bold truncate">{prevLesson.title}</p>
              </div>
            </button>
          ) : (
            <Link
              to={`/farmer/dashboard?module=${encodeURIComponent(moduleName)}`}
              className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Back to</p>
                <p className="text-sm font-bold">Module</p>
              </div>
            </Link>
          )}

          {/* Lesson dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {moduleLessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => goToLesson(l)}
                title={l.title}
                className={`rounded-full transition-all ${
                  i === currentIndex
                    ? 'w-6 h-2.5 bg-[#2D5A27]'
                    : stats.completed_lesson_ids.includes(l.id)
                    ? 'w-2.5 h-2.5 bg-[#2D5A27]/40'
                    : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Next */}
          {nextLesson ? (
            <button
              onClick={() => goToLesson(nextLesson)}
              className="flex items-center gap-3 px-5 py-3 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#245220] transition-all group max-w-[45%] shadow-lg shadow-[#2D5A27]/20"
            >
              <div className="text-right min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Next</p>
                <p className="text-sm font-bold truncate">{nextLesson.title}</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <Link
              to={`/farmer/dashboard?module=${encodeURIComponent(moduleName)}`}
              className="flex items-center gap-3 px-5 py-3 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#245220] transition-all group shadow-lg shadow-[#2D5A27]/20"
            >
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Done!</p>
                <p className="text-sm font-bold">Back to Module</p>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonPage;
