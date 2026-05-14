import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Clock, Languages,
  ChevronLeft, ChevronRight, Flame, Layout, LogOut, BookOpen
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
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 min-w-0">
            <Link
              to="/farmer/feed"
              className="hover:text-[#2D5A27] transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">Daily Feed</span>
            </Link>
            <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
            <span className="text-[#1A1C1E] truncate">{lesson.title}</span>
          </div>

          {/* Batch position */}
          <span className="text-xs font-black text-slate-400 shrink-0">
            {currentIdx + 1} / {batchLessons.length}
          </span>
        </div>

        {/* Batch progress bar */}
        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden max-w-3xl mx-auto">
          <div
            className="h-full bg-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${((currentIdx + 1) / batchLessons.length) * 100}%` }}
          />
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Lesson header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-50 text-orange-500 rounded-full text-xs font-black uppercase tracking-widest">
              <Flame className="w-3.5 h-3.5" /> Daily Feed
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#F2F8F3] text-[#2D5A27] rounded-full text-xs font-black uppercase tracking-widest">
              {lesson.theme}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-[#1A1C1E] tracking-tight leading-tight mb-4">
            {lesson.title}
          </h1>

          <div className="flex items-center gap-4 text-slate-400 text-sm font-bold">
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> 5 min read</span>
            <span className="text-slate-200">·</span>
            <span className="uppercase tracking-widest text-xs">{lesson.code}</span>
            {(marked || lesson.completed) && (
              <>
                <span className="text-slate-200">·</span>
                <span className="flex items-center gap-1.5 text-[#2D5A27]">
                  <CheckCircle2 className="w-4 h-4" /> Completed
                </span>
              </>
            )}
          </div>
        </div>

        {/* SMS summary */}
        {lesson.sms_text && (
          <div className="bg-[#F8FAFB] rounded-[28px] p-6 border border-slate-100 mb-10">
            <div className="flex items-center gap-2 mb-3 text-[#2D5A27]">
              <Languages className="w-4 h-4" />
              <span className="font-black text-xs uppercase tracking-widest">Quick Summary</span>
            </div>
            <p className="text-slate-600 font-mono text-sm leading-relaxed italic">"{lesson.sms_text}"</p>
          </div>
        )}

        {/* Full content */}
        <article className="space-y-5 mb-12">
          {lesson.content?.split(/\n+/).map((para, i) =>
            para.trim() ? (
              <p key={i} className="text-lg text-slate-700 leading-loose font-medium">{para}</p>
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
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-6 py-4 z-40">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">

          {/* Previous */}
          {prevLesson ? (
            <button
              onClick={() => goTo(prevLesson)}
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
              to="/farmer/feed"
              className="flex items-center gap-3 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:border-[#2D5A27] hover:text-[#2D5A27] transition-all group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Back to</p>
                <p className="text-sm font-bold">Daily Feed</p>
              </div>
            </Link>
          )}

          {/* Batch dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {batchLessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => goTo(l)}
                title={l.title}
                className={`rounded-full transition-all ${
                  i === currentIdx
                    ? 'w-6 h-2.5 bg-orange-400'
                    : l.completed || (i === currentIdx && marked)
                    ? 'w-2.5 h-2.5 bg-[#2D5A27]/50'
                    : 'w-2.5 h-2.5 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Next */}
          {nextLesson ? (
            <button
              onClick={() => goTo(nextLesson)}
              className="flex items-center gap-3 px-5 py-3 bg-orange-500 text-white rounded-2xl font-bold hover:bg-orange-600 transition-all group max-w-[45%] shadow-lg shadow-orange-500/20"
            >
              <div className="text-right min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Next</p>
                <p className="text-sm font-bold truncate">{nextLesson.title}</p>
              </div>
              <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <Link
              to="/farmer/feed"
              className="flex items-center gap-3 px-5 py-3 bg-[#2D5A27] text-white rounded-2xl font-bold hover:bg-[#245220] transition-all group shadow-lg shadow-[#2D5A27]/20"
            >
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">All done!</p>
                <p className="text-sm font-bold">Back to Feed</p>
              </div>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedLessonPage;
