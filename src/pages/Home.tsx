import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Maximize, Home as HomeIcon, Droplets, Wind, Check } from 'lucide-react';
import { Villa } from '../types';
import homeDataDefault from '../data/home.json';

interface HomeProps {
  villas: Villa[];
}

interface HomeData {
  hero: {
    backgroundImage: string;
    location: string;
    title: string;
    subtitle: string;
    description: string;
    button1: string;
    button2: string;
  };
  philosophy: {
    sectionLabel: string;
    heading: string;
    headingHighlight: string;
    paragraph1: string;
    paragraph2: string;
    quote: string;
    mainImage: string;
    detailImage: string;
  };
  interior: {
    sectionLabel: string;
    heading: string;
    headingHighlight: string;
    description: string;
    features: string[];
    buttonText: string;
    image1: string;
    image2: string;
  };
  gallery: {
    sectionLabel: string;
    heading: string;
    headingHighlight: string;
    description: string;
    images: string[];
  };
  residences: {
    sectionLabel: string;
    heading: string;
  };
}

export default function Home({ villas }: HomeProps) {
  const [activeVillaIndex, setActiveVillaIndex] = useState(0);
  const [homeData, setHomeData] = useState<HomeData>(homeDataDefault as HomeData);

  useEffect(() => {
    // Fetch home data from API
    fetch('/api/home')
      .then(res => res.json())
      .then(data => setHomeData(data))
      .catch(() => {
        // Fallback to default data if API fails
        setHomeData(homeDataDefault as HomeData);
      });
  }, []);

  return (
    <div className="bg-[#FDFCFB] text-[#1A1A1A]">
      {/* Hero Section - Editorial Recipe */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2 }}
            key={homeData.hero.backgroundImage}
            src={homeData.hero.backgroundImage}
            alt="Breathtaking view from Lefkas"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Hero image failed to load:', homeData.hero.backgroundImage);
            }}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <span className="inline-block text-[10px] uppercase tracking-[0.5em] text-white/80 mb-8 border-b border-white/20 pb-2">
              {homeData.hero.location}
            </span>
            <h1 className="text-5xl md:text-8xl lg:text-9xl font-serif text-white leading-[0.85] mb-12 tracking-tight">
              {homeData.hero.title} <br /> <span className="italic font-light opacity-90">{homeData.hero.subtitle}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
              {homeData.hero.description}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a href="#villas" className="px-10 py-4 bg-white text-black text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#D4C3B3] transition-all duration-500">
                {homeData.hero.button1}
              </a>
              <a href="#estate" className="text-white text-[10px] uppercase tracking-[0.3em] font-bold flex items-center group">
                {homeData.hero.button2} <ArrowRight size={14} className="ml-3 group-hover:translate-x-2 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-white/50 to-transparent"></div>
        </motion.div>
      </section>

      {/* Architectural Philosophy - Warm Organic Recipe */}
      <section id="estate" className="py-32 lg:py-48 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              >
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-6 block">{homeData.philosophy.sectionLabel}</span>
                <h2 className="text-4xl md:text-6xl font-serif mb-10 text-[#2C3539] leading-tight">
                  {homeData.philosophy.heading} <br /> <span className="italic">{homeData.philosophy.headingHighlight}</span>
                </h2>
                <div className="space-y-8 text-gray-600 font-light leading-relaxed text-lg">
                  <p>
                    {homeData.philosophy.paragraph1}
                  </p>
                  <p>
                    {homeData.philosophy.paragraph2}
                  </p>
                </div>
                <div className="mt-16 flex items-center gap-8">
                  <div className="w-16 h-[1px] bg-[#D4C3B3]"></div>
                  <p className="font-serif italic text-xl text-[#8B6F5A]">{homeData.philosophy.quote}</p>
                </div>
              </motion.div>
            </div>
            <div className="lg:col-span-7 relative">
              <motion.div
                initial={{ opacity: 0, scale: 1.05 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2 }}
                className="relative aspect-[4/5] md:aspect-video lg:aspect-[4/5]"
              >
                <img
                  key={homeData.philosophy.mainImage}
                  src={homeData.philosophy.mainImage}
                  alt="Natural stone architecture"
                  className="w-full h-full object-cover rounded-sm shadow-2xl"
                  onError={(e) => {
                    console.error('Philosophy main image failed to load:', homeData.philosophy.mainImage);
                  }}
                />
                <div className="absolute -bottom-12 -left-12 w-64 h-80 hidden xl:block border-[12px] border-white shadow-xl">
                  <img
                    key={homeData.philosophy.detailImage}
                    src={homeData.philosophy.detailImage}
                    alt="Detail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Philosophy detail image failed to load:', homeData.philosophy.detailImage);
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* The Residences - Accordion Showcase */}
      <section id="villas" className="py-32 bg-[#F9F8F6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-4 block">{homeData.residences.sectionLabel}</span>
            <h2 className="text-4xl md:text-5xl font-serif text-[#2C3539]">{homeData.residences.heading}</h2>
          </div>

          <div className="flex flex-col gap-4">
            {villas.map((villa, index) => (
              <div key={villa.id} className="border-b border-black/10 overflow-hidden">
                <button
                  onClick={() => setActiveVillaIndex(index)}
                  className="w-full py-8 flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-8">
                    <span className="text-[10px] font-mono text-[#A89F91]">0{index + 1}</span>
                    <h4 className={`text-3xl md:text-5xl font-serif transition-all duration-500 ${activeVillaIndex === index ? 'text-[#8B6F5A] translate-x-4' : 'text-[#2C3539]'}`}>
                      {villa.name}
                    </h4>
                  </div>
                  <div className={`w-10 h-10 rounded-full border border-black/10 flex items-center justify-center transition-transform duration-500 ${activeVillaIndex === index ? 'rotate-90 bg-[#2C3539] text-white' : ''}`}>
                    <ArrowRight size={16} />
                  </div>
                </button>

                <AnimatePresence>
                  {activeVillaIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="grid lg:grid-cols-12 gap-12 pb-12">
                        <div className="lg:col-span-7 relative h-[400px] lg:h-[500px] overflow-hidden rounded-sm">
                          <motion.img
                            initial={{ scale: 1.1 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 1.5 }}
                            key={villa.image}
                            src={villa.image}
                            alt={villa.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image failed to load:', villa.image);
                            }}
                          />
                          <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-1.5 text-[9px] font-bold tracking-[0.3em] uppercase text-[#8B6F5A]">
                            {villa.subtitle}
                          </div>
                        </div>
                        <div className="lg:col-span-5 flex flex-col justify-center">
                          <p className="text-gray-500 font-light mb-10 leading-relaxed text-lg">
                            {villa.description}
                          </p>

                          <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-12">
                            {villa.specs.slice(0, 4).map((spec, i) => (
                              <div key={i} className="flex flex-col gap-1">
                                <span className="text-[9px] uppercase tracking-widest text-[#A89F91] font-bold">{spec.label}</span>
                                <span className="text-sm text-[#2C3539] font-medium">{spec.value}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-6">
                            <Link
                              to={`/villas/${villa.id}`}
                              className="w-full sm:w-auto px-10 py-4 bg-[#2C3539] text-white text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#8B6F5A] transition-all duration-300 text-center"
                            >
                              Explore Villa
                            </Link>
                            <Link
                              to={`/villas/${villa.id}`}
                              className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8B6F5A] hover:text-[#2C3539] transition-colors flex items-center group"
                            >
                              Gallery <ArrowRight size={14} className="ml-3 group-hover:translate-x-2 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interior & Lifestyle - Minimal Utility Recipe */}
      <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="grid grid-cols-2 gap-4">
                <motion.img
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={homeData.interior.image1}
                  src={homeData.interior.image1}
                  alt="Interior"
                  className="w-full aspect-[3/4] object-cover rounded-sm"
                  onError={(e) => {
                    console.error('Interior image 1 failed to load:', homeData.interior.image1);
                  }}
                />
                <motion.img
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  key={homeData.interior.image2}
                  src={homeData.interior.image2}
                  alt="Kitchen"
                  className="w-full aspect-[3/4] object-cover rounded-sm mt-12"
                  onError={(e) => {
                    console.error('Interior image 2 failed to load:', homeData.interior.image2);
                  }}
                />
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] bg-[#F9F8F6] rounded-full blur-3xl opacity-50"></div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-6 block">{homeData.interior.sectionLabel}</span>
              <h2 className="text-4xl md:text-5xl font-serif mb-8 text-[#2C3539]">{homeData.interior.heading} <br /> <span className="italic">{homeData.interior.headingHighlight}</span></h2>
              <p className="text-gray-600 font-light mb-10 text-lg leading-relaxed">
                {homeData.interior.description}
              </p>
              <div className="space-y-6 mb-12">
                {homeData.interior.features.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-[#F4F1ED] flex items-center justify-center text-[#A89F91]">
                      <Check size={12} />
                    </div>
                    <span className="text-gray-700 font-light">{item}</span>
                  </div>
                ))}
              </div>
              <button className="px-10 py-4 border border-black text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-black hover:text-white transition-all">
                {homeData.interior.buttonText}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Grid - Atmospheric Recipe */}
      <section id="gallery" className="py-32 bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-6 mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4 block">{homeData.gallery.sectionLabel}</span>
              <h2 className="text-4xl md:text-6xl font-serif">{homeData.gallery.heading} <span className="italic font-light">{homeData.gallery.headingHighlight}</span></h2>
            </div>
            <p className="text-white/50 font-light max-w-md text-lg">
              {homeData.gallery.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 px-1">
          {homeData.gallery.images.map((src, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: idx * 0.1 }}
              className="aspect-[4/5] overflow-hidden group relative"
            >
              <img
                key={src}
                src={src}
                alt={`Gallery ${idx}`}
                className="w-full h-full object-cover transition-all duration-1000 scale-110 group-hover:scale-100"
                onError={(e) => {
                  console.error('Gallery image failed to load:', src);
                }}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
