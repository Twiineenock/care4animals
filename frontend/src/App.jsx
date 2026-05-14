import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Auth from './pages/Auth';
import FarmerAuth from './pages/FarmerAuth';
import FarmerDashboard from './pages/FarmerDashboard';
import ModulesPage from './pages/farmer/ModulesPage';
import LessonPage from './pages/farmer/LessonPage';
import DailyFeedPage from './pages/farmer/DailyFeedPage';
import FeedLessonPage from './pages/farmer/FeedLessonPage';

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return children;
};

// Decides whether to show the modules list or the lesson reader
// based on URL params: ?module=X&lesson=Y → LessonPage, ?module=X → ModulesPage
const FarmerDashboardRouter = () => {
  const [searchParams] = useSearchParams();
  const hasLesson = searchParams.get('lesson');
  return hasLesson ? <LessonPage /> : <ModulesPage />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/farmer/auth" element={<FarmerAuth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Farmer dashboard — URL-driven routing */}
        <Route path="/farmer/dashboard" element={<FarmerDashboardRouter />} />
        <Route path="/farmer/feed" element={<DailyFeedPage />} />
        <Route path="/farmer/feed/lesson/:code" element={<FeedLessonPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
