import React, { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Home as HomeIcon, Droplets, Wind, ArrowRight, ChevronLeft, X } from 'lucide-react';
import { Villa } from '../types';

interface VillaDetailProps {
  villas: Villa[];
}

export default function VillaDetail({ villas }: VillaDetailProps) {
  const { id } = useParams<{ id: string }>();
  const villa = villas.find(v => v.id === id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (err) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!villa) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-[#FDFCFB] min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] overflow-hidden">
        <motion.div
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
        >
          <img
            key={villa.image}
            src={villa.image}
            alt={villa.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Image failed to load:', villa.image);
            }}
          />
          <div className="absolute inset-0 bg-black/30"></div>
        </motion.div>

        <div className="relative z-10 h-full flex flex-col justify-end pb-24 px-6">
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link to="/" className="inline-flex items-center text-white/70 text-[10px] uppercase tracking-[0.4em] mb-8 hover:text-white transition-colors">
                <ChevronLeft size={14} className="mr-2" /> Back to Estate
              </Link>
              <h1 className="text-6xl md:text-9xl font-serif text-white mb-6 leading-none tracking-tight">{villa.name}</h1>
              <p className="text-xl text-white/80 font-light uppercase tracking-[0.4em]">{villa.subtitle}</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-20">
          <div className="lg:col-span-7">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-8 block">The Residence</span>
            <h2 className="text-3xl md:text-5xl font-serif text-[#2C3539] leading-tight mb-12">
              {villa.description}
            </h2>

            <div className="grid md:grid-cols-2 gap-12 mt-20">
              {villa.specs.map((spec, i) => (
                <div key={i} className="group">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#F4F1ED] flex items-center justify-center text-[#8B6F5A] group-hover:bg-[#2C3539] group-hover:text-white transition-all duration-500">
                      {i === 0 && <Maximize size={18} />}
                      {i === 1 && <HomeIcon size={18} />}
                      {i === 2 && <Droplets size={18} />}
                      {i === 3 && <Wind size={18} />}
                    </div>
                    <h4 className="text-[10px] uppercase tracking-[0.3em] text-[#A89F91] font-bold">{spec.label}</h4>
                  </div>
                  <p className="text-xl text-[#2C3539] font-light pl-[72px]">{spec.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-[#F9F8F6] p-12 lg:p-16 sticky top-32">
              <h3 className="text-2xl font-serif mb-8 text-[#2C3539]">Inquire for Ownership</h3>
              <p className="text-gray-500 font-light mb-10 leading-relaxed">
                Grey House Villas are offered as a complete estate or individual residences. Each villa is delivered turnkey with full designer furnishings.
              </p>
              <form className="space-y-6">
                <input type="text" placeholder="Full Name" className="w-full bg-transparent border-b border-black/10 py-4 text-sm focus:border-black outline-none transition-colors" />
                <input type="email" placeholder="Email Address" className="w-full bg-transparent border-b border-black/10 py-4 text-sm focus:border-black outline-none transition-colors" />
                <textarea placeholder="Message" rows={4} className="w-full bg-transparent border-b border-black/10 py-4 text-sm focus:border-black outline-none transition-colors resize-none"></textarea>
                <button className="w-full py-5 bg-[#2C3539] text-white text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#8B6F5A] transition-all">
                  Request Brochure
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Grid - Masonry-like */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-4 block">Gallery</span>
              <h2 className="text-4xl md:text-5xl font-serif text-[#2C3539]">Visual Details.</h2>
            </div>
            <p className="text-gray-500 font-light max-w-sm">
              Click on any image to expand and explore the intricate craftsmanship of {villa.name}.
            </p>
          </div>

          <div
            className="flex w-full h-[60vh] md:h-[80vh] gap-1 md:gap-2 overflow-hidden select-none touch-pan-y"
            onTouchMove={(e) => {
              const touch = e.touches[0];
              const el = document.elementFromPoint(touch.clientX, touch.clientY);
              const item = el?.closest('.gallery-item');
              if (item) {
                const idx = parseInt(item.getAttribute('data-idx') || '-1', 10);
                if (idx !== -1 && activeIdx !== idx) {
                  setActiveIdx(idx);
                }
              }
            }}
          >
            {villa.gallery.map((img, idx) => (
              <motion.div
                key={`${img}-${idx}`}
                data-idx={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.02 }}
                className={`gallery-item relative cursor-pointer overflow-hidden rounded-sm flex-1 md:hover:flex-[8] transition-all duration-500 ease-out ${activeIdx === idx ? 'flex-[8]' : ''}`}
                onClick={(e) => {
                  const isMobile = window.matchMedia('(hover: none)').matches || window.innerWidth < 1024;
                  if (isMobile) {
                    if (activeIdx === idx) {
                      setSelectedImage(img);
                    } else {
                      setActiveIdx(idx);
                    }
                  } else {
                    setSelectedImage(img);
                  }
                }}
              >
                <img
                  key={img}
                  src={img}
                  alt={`${villa.name} detail ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-105"
                  onError={(e) => {
                    console.error('Gallery image failed to load:', img);
                  }}
                />
                <div className={`absolute inset-0 bg-black/40 transition-colors flex items-center justify-center md:group-hover:bg-black/0 md:group-hover:opacity-100 ${activeIdx === idx ? 'bg-black/0 opacity-100' : 'opacity-0'}`}>
                  <Maximize className={`text-white transition-opacity md:opacity-0 md:group-hover:opacity-100 ${activeIdx === idx ? 'opacity-100' : 'opacity-0'}`} size={24} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Between Villas */}
      <section className="py-32 bg-[#F9F8F6] px-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-12 block text-center">Continue Exploring</span>
          <div className="grid md:grid-cols-2 gap-8">
            {villas.filter(v => v.id !== id).map(otherVilla => (
              <Link
                key={otherVilla.id}
                to={`/villas/${otherVilla.id}`}
                className="group relative h-80 overflow-hidden flex items-center justify-center"
              >
                <img
                  src={otherVilla.image}
                  alt={otherVilla.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors"></div>
                <div className="relative z-10 text-center">
                  <h4 className="text-3xl font-serif text-white mb-2">{otherVilla.name}</h4>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 group-hover:text-white transition-colors">View Villa</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
