import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import VillaDetail from './pages/VillaDetail';
import Testimonials from './pages/Testimonials';
import Admin from './pages/Admin';
import ScheduleCall from './pages/ScheduleCall';
import { getVillas } from './constants';
import { Villa } from './types';

export default function App() {
  const [villas, setVillas] = useState<Villa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVillas().then(data => {
      setVillas(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="font-serif text-2xl tracking-widest uppercase text-[#2C3539] animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={
          <Layout villas={villas}>
            <Routes>
              <Route path="/" element={<Home villas={villas} />} />
              <Route path="/villas/:id" element={<VillaDetail villas={villas} />} />
              <Route path="/testimonials" element={<Testimonials />} />
              <Route path="/schedule-call" element={<ScheduleCall />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}
