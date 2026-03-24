import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedVillas } from './hooks/useLocalizedVillas';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import VillaDetail from './pages/VillaDetail';
import Testimonials from './pages/Testimonials';
import Admin from './pages/Admin';
import ScheduleCall from './pages/ScheduleCall';
import Booking from './pages/Booking';
import { getVillas } from './constants';
import { Villa } from './types';

export default function App() {
  const { t, i18n } = useTranslation();
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);
  const localizedVillas = useLocalizedVillas(villas);

  useEffect(() => {
    document.title = t('meta.title');
  }, [t, i18n.language]);

  const refreshVillas = async () => {
    try {
      const data = await getVillas();
      setVillas(data);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshVillas();
    const onUpdate = () => refreshVillas();
    window.addEventListener('villas:updated', onUpdate as EventListener);
    window.addEventListener('home:updated', onUpdate as EventListener);
    return () => {
      window.removeEventListener('villas:updated', onUpdate as EventListener);
      window.removeEventListener('home:updated', onUpdate as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="font-serif text-2xl tracking-widest uppercase text-[#2C3539] animate-pulse">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={
          <Layout villas={localizedVillas}>
            <Routes>
              <Route path="/" element={<Home villas={localizedVillas} />} />
              <Route path="/villas/:id" element={<VillaDetail villas={localizedVillas} />} />
              <Route path="/testimonials" element={<Testimonials />} />
              <Route path="/schedule-call" element={<ScheduleCall />} />
              <Route path="/booking" element={<Booking />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}
