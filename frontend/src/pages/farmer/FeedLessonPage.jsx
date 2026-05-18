import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock, Languages,
  ChevronLeft, ChevronRight, Flame, Layout, LogOut, BookOpen,
  Send, Smartphone
} from 'lucide-react';
import { cachedFetch, invalidateFarmerCache } from '../../utils/apiCache';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const FeedLessonPage = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [feed, setFeed] = useState(null);
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState(false);
  const markedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('farmer_user');
    if (!stored) { navigate('/farmer/auth'); return; }
    const f = JSON.parse(stored);
    setFarmer(f);

    const init = async () => {
      try {
        // cachedFetch uses sessionStorage — navigating between lessons is instant
        const feedData = await cachedFetch(
          `${API_URL}/farmers/${f.id}/daily-feed?language=en`,
          'farmer'
        );

        setFeed(feedData);

        const found = feedData.batch_lessons?.find(l => l.code === code);
        if (!found) { navigate('/farmer/feed'); return; }
        setLesson(found);

        // Auto-mark complete on open — fire-and-forget so page shows immediately
        if (!found.completed && !markedRef.current) {
          markedRef.current = true;
          fetch(`${API_URL}/progress/complete/${found.id}?farmer_id=${f.id}`, { method: 'POST' })
            .then(() => {
              setMarked(true);
              // Invalidate farmer caches so next visit shows updated progress
              invalidateFarmerCache(f.id);
            })
            .catch(console.error);
        } else {
          setMarked(found.completed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [code, navigate]);



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="w-10 h-10 border-4 border-[#2D5A27]/20 border-t-[#2D5A27] rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) return null;

  // Prev / next within the batch
  const batchLessons = feed?.batch_lessons ?? [];
  const currentIdx = batchLessons.findIndex(l => l.code === code);
  const prevLesson = currentIdx > 0 ? batchLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < batchLessons.length - 1 ? batchLessons[currentIdx + 1] : null;

  const goTo = (l) => navigate(`/farmer/feed/lesson/${encodeURIComponent(l.code)}`);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-outfit">

      {/* ── Top nav bar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-3 lg:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Breadcrumb - Simplified for Mobile */}
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 min-w-0">
            <Link
              to="/farmer/feed"
              className="hover:text-[#2D5A27] transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="hidden lg:inline">Feed</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-300" />
            <span className="text-[#1A1C1E] truncate max-w-[200px] lg:max-w-xs">{lesson.title}</span>
          </div>

          {/* Batch position */}
          <div className="bg-orange-50 px-3 py-1 rounded-full border border-orange-100 shrink-0">
            <span className="text-[10px] lg:text-xs font-black text-orange-600">
              {currentIdx + 1} / {batchLessons.length}
            </span>
          </div>
        </div>

        {/* Batch progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-orange-400 transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / batchLessons.length) * 100}%` }}
          />
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 py-8 lg:py-12">
        {/* Lesson header */}
        <div className="mb-8 lg:mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-50 text-orange-500 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Flame className="w-3.5 h-3.5" /> Daily Feed
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#F2F8F3] text-[#2D5A27] rounded-full text-[10px] font-black uppercase tracking-widest">
              {lesson.theme}
            </span>
          </div>

          <h1 className="text-2xl lg:text-4xl font-black text-[#1A1C1E] tracking-tight leading-tight mb-4">
            {lesson.title}
          </h1>

          <div className="flex items-center gap-4 text-slate-400 text-xs lg:text-sm font-bold">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 5 min read</span>
            <span className="text-slate-200">·</span>
            <span className="uppercase tracking-widest text-[10px]">{lesson.code}</span>
            {(marked || lesson.completed) && (
              <div className="flex items-center gap-1.5 text-[#2D5A27] bg-[#F2F8F3] px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> 
                <span className="text-[10px] uppercase tracking-wider font-black">Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* SMS summary */}
        {lesson.sms_text && (
          <div className="bg-[#F8FAFB] rounded-[28px] p-6 border border-slate-100 mb-10 relative overflow-hidden">
            <div className="flex items-center gap-2 text-[#2D5A27] mb-3">
              <Smartphone className="w-4 h-4" />
              <span className="font-black text-xs uppercase tracking-widest">SMS Version (Offline Friendly)</span>
            </div>
            <p className="text-slate-600 font-mono text-sm leading-relaxed italic">"{lesson.sms_text}"</p>
          </div>
        )}

        {/* Full content - Better readability on mobile */}
        <article className="space-y-6 mb-12">
          {lesson.content?.split(/\n+/).map((para, i) =>
            para.trim() ? (
              <p key={i} className="text-[17px] lg:text-lg text-slate-700 leading-relaxed lg:leading-loose font-medium">
                {para}
              </p>
            ) : null
          )}
        </article>

        {/* Checklist */}
        {lesson.checklist && (() => {
          try {
            const items = JSON.parse(lesson.checklist);
            return (
              <div className="mb-12">
                <h3 className="text-xl font-black text-[#1A1C1E] mb-5 tracking-tight">Key Takeaways</h3>
                <div className="grid gap-3">
                  {items.map((tip, i) => (
                    <div key={i} className="flex items-center gap-4 bg-[#F2F8F3] p-5 rounded-2xl border border-[#2D5A27]/10">
                      <CheckCircle2 className="w-5 h-5 text-[#2D5A27] shrink-0" />
                      <span className="font-bold text-[#1A1C1E]">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          } catch { return null; }
        })()}

        {/* Auto-complete notice */}
        <div className="flex items-center gap-3 px-6 py-4 bg-[#F2F8F3] text-[#2D5A27] rounded-2xl border border-[#2D5A27]/20 mb-16">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">
            {marked || lesson.completed
              ? 'This lesson has been marked as complete.'
              : 'Opening this lesson marks it as complete automatically.'}
          </p>
        </div>
      </div>

      {/* ── Sticky bottom nav ── */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 lg:py-4 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 lg:gap-4">

          {/* Previous */}
          {prevLesson ? (
            <button
              onClick={() => goTo(prevLesson)}
              className="flex items-center gap-2 lg:gap-3 px-4 lg:px-5 py-2.5 lg:py-3 bg-white border border-slate-200 rounded-xl lg:rounded-2xl font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all group max-w-[48%] flex-1 lg:flex-none"
            >
              <ChevronLeft className="w-5 h-5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <div className="text-left min-w-0">
                <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Prev</p>
                <p className="text-xs lg:text-sm font-bold truncate">{prevLesson.title}</p>
              </div>
            </button>
          ) : (
            <Link
              to="/farmer/feed"
              className="flex items-center gap-2 lg:gap-3 px-4 lg:px-5 py-2.5 lg:py-3 bg-white border border-slate-200 rounded-xl lg:rounded-2xl font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all group flex-1 lg:flex-none justify-center lg:justify-start"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs lg:text-sm font-bold">Back</span>
            </Link>
          )}

          {/* Batch dots - Hidden on very small screens */}
          <div className="hidden md:flex items-center gap-1.5">
            {batchLessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => goTo(l)}
                className={`rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 h-2 bg-orange-400'
                    : l.completed || (i === currentIdx && marked)
                    ? 'w-2 h-2 bg-[#2D5A27]/50'
                    : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Next */}
          {nextLesson ? (
            <button
              onClick={() => goTo(nextLesson)}
              className="flex items-center gap-2 lg:gap-3 px-4 lg:px-5 py-2.5 lg:py-3 bg-orange-500 text-white rounded-xl lg:rounded-2xl font-bold hover:bg-orange-600 transition-all group max-w-[48%] flex-1 lg:flex-none shadow-lg shadow-orange-500/10"
            >
              <div className="text-right min-w-0 flex-1">
                <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Next</p>
                <p className="text-xs lg:text-sm font-bold truncate">{nextLesson.title}</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <Link
              to="/farmer/feed"
              className="flex items-center gap-2 lg:gap-3 px-4 lg:px-5 py-2.5 lg:py-3 bg-[#2D5A27] text-white rounded-xl lg:rounded-2xl font-bold hover:bg-[#245220] transition-all group shadow-lg shadow-[#2D5A27]/10 flex-1 lg:flex-none justify-center"
            >
              <span className="text-xs lg:text-sm font-bold">Finish</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedLessonPage;
