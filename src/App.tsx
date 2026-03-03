import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import VillaDetail from './pages/VillaDetail';
import Testimonials from './pages/Testimonials';

import Admin from './pages/Admin';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/villas/:id" element={<VillaDetail />} />
              <Route path="/testimonials" element={<Testimonials />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}
