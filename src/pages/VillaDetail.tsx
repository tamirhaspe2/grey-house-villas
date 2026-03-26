import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Home as HomeIcon, Droplets, Wind, ChevronLeft, X, Leaf } from 'lucide-react';
import { RollingGalleryStrip } from '../components/RollingGalleryStrip';
import { Villa } from '../types';

interface VillaDetailProps {
  villas: Villa[];
}

export default function VillaDetail({ villas }: VillaDetailProps) {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const villa = villas.find(v => v.id === id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  /** Rolling carousel index per gallery section (Home-style strip) */
  const [rollingBySection, setRollingBySection] = useState<Record<number, number>>({});

  const gallerySections = useMemo(() => {
    if (!villa) return [];
    const normalizeSections = (v: Villa): { title: string; images: string[] }[] => {
      if (Array.isArray(v.gallerySections) && v.gallerySections.length > 0) return v.gallerySections;
      const legacy = Array.isArray(v.gallery) ? v.gallery : [];
      return [{ title: t('villa.visualDetails'), images: legacy }];
    };
    if (villa.id === 'grey-estate') {
      const oneiro = villas.find(v => v.id === 'villa-oneiro');
      const petra = villas.find(v => v.id === 'villa-petra');
      const oneiroSections = oneiro ? normalizeSections(oneiro) : [{ title: t('villa.visualDetails'), images: [] }];
      const petraSections = petra ? normalizeSections(petra) : [{ title: t('villa.visualDetails'), images: [] }];
      const oneiroA = oneiroSections[0] ?? { title: oneiro?.name || 'Oneiro', images: [] };
      const oneiroB = oneiroSections[1] ?? { title: '', images: [] };
      const petraA = petraSections[0] ?? { title: petra?.name || 'Villa Pétra', images: [] };
      return [
        { title: oneiroA.title || oneiro?.name || 'Oneiro', images: Array.isArray(oneiroA.images) ? oneiroA.images : [] },
        { title: oneiroB.title || t('villa.suiteFallback'), images: Array.isArray(oneiroB.images) ? oneiroB.images : [] },
        { title: petraA.title || petra?.name || 'Villa Pétra', images: Array.isArray(petraA.images) ? petraA.images : [] },
      ].filter(s => Array.isArray(s.images));
    }
    return normalizeSections(villa).filter(s => Array.isArray(s.images));
  }, [villa, villas, t, i18n.language]);

  const galleryFingerprint = useMemo(
    () => gallerySections.map((s) => s.images.length).join('-'),
    [gallerySections],
  );

  useEffect(() => {
    setRollingBySection({});
  }, [villa?.id, galleryFingerprint]);

  useEffect(() => {
    const timers: ReturnType<typeof setInterval>[] = [];
    gallerySections.forEach((sec, sectionIdx) => {
      const len = sec.images?.length ?? 0;
      if (len <= 1) return;
      timers.push(
        setInterval(() => {
          setRollingBySection((prev) => ({
            ...prev,
            [sectionIdx]: ((prev[sectionIdx] ?? 0) + 1) % len,
          }));
        }, 4000),
      );
    });
    return () => timers.forEach(clearInterval);
  }, [villa?.id, galleryFingerprint]);

  if (!villa) {
    return <Navigate to="/" replace />;
  }

  const comfortNote = (villa.allSeasonsNote ?? '').trim();
  const comfortLines = comfortNote ? comfortNote.split(/\n/).map((l) => l.trim()).filter(Boolean) : [];
  const comfortHead = comfortLines[0];
  const comfortBody = comfortLines.slice(1).join('\n');

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
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = 'https://placehold.co/1200x800?text=Missing+Image';
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
                <ChevronLeft size={14} className="mr-2" /> {t('villa.backToEstate')}
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
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-8 block">{t('villa.detailsLabel')}</span>
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
            <div
              className="bg-[#F9F8F6] p-12 lg:p-16 sticky top-32 border border-[#E8E4DF]"
              dir={i18n.dir()}
            >
              <div className="flex items-center gap-3 mb-6 text-[#8B6F5A]">
                <Leaf size={22} strokeWidth={1.25} className="shrink-0" aria-hidden />
                <span className="text-[10px] uppercase tracking-[0.35em] font-bold">
                  {t('villa.allSeasonsLabel')}
                </span>
              </div>
              {comfortNote ? (
                <div className="text-[#2C3539] leading-relaxed">
                  {comfortBody ? (
                    <>
                      <p className="text-lg font-serif font-semibold text-[#2C3539] mb-4">{comfortHead}</p>
                      <p className="text-base font-light text-gray-600 whitespace-pre-line">{comfortBody}</p>
                    </>
                  ) : (
                    <p className="text-base font-light text-gray-600 whitespace-pre-line">{comfortHead}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-light">{t('villa.allSeasonsEmpty')}</p>
              )}
              <p className="mt-10 text-xs text-gray-400 font-light leading-relaxed border-t border-black/5 pt-8">
                {t('villa.bookingInsteadHint')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/*
      OLD GALLERY — hover-to-expand strip (kept for reference; replaced by rolling carousel below)
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto space-y-24">
          {gallerySections.map((section, sectionIdx) => {
            const images = section.images || [];
            const localActiveIdx = activeIdx;
            return (
              <div key={`${section.title}-${sectionIdx}`}>
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-4 block">{t('villa.galleryLabel')}</span>
                    <h2 className="text-4xl md:text-5xl font-serif text-[#2C3539]">{section.title || t('villa.visualDetails')}</h2>
                  </div>
                  <p className="text-gray-500 font-light max-w-sm">
                    {t('villa.galleryHelp', { name: villa.name })}
                  </p>
                </div>

                <div
                  className="flex w-full h-[60vh] md:h-[80vh] gap-1 md:gap-2 overflow-hidden select-none touch-pan-y"
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const el = document.elementFromPoint(touch.clientX, touch.clientY);
                    const item = el?.closest(`.gallery-item-${sectionIdx}`);
                    if (item) {
                      const idx = parseInt(item.getAttribute('data-idx') || '-1', 10);
                      if (idx !== -1 && localActiveIdx !== idx) {
                        setActiveIdx(idx);
                      }
                    }
                  }}
                >
                  {images.map((img, idx) => (
                    <motion.div
                      key={`${img}-${idx}`}
                      data-idx={idx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.02 }}
                      className={`gallery-item-${sectionIdx} relative cursor-pointer overflow-hidden rounded-sm flex-1 md:hover:flex-[8] transition-all duration-500 ease-out ${localActiveIdx === idx ? 'flex-[8]' : ''}`}
                      onClick={() => {
                        const isMobile = window.matchMedia('(hover: none)').matches || window.innerWidth < 1024;
                        if (isMobile) {
                          if (localActiveIdx === idx) {
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
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://placehold.co/600x400?text=Missing+Image';
                        }}
                      />
                      <div className={`absolute inset-0 bg-black/40 transition-colors flex items-center justify-center md:group-hover:bg-black/0 md:group-hover:opacity-100 ${localActiveIdx === idx ? 'bg-black/0 opacity-100' : 'opacity-0'}`}>
                        <Maximize className={`text-white transition-opacity md:opacity-0 md:group-hover:opacity-100 ${localActiveIdx === idx ? 'opacity-100' : 'opacity-0'}`} size={24} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      */}

      {/* Gallery — rolling accordion (same interaction pattern as commented block on Home) */}
      <div className="space-y-0">
        {gallerySections.map((section, sectionIdx) => {
          const images = section.images || [];
          const galleryIndex = rollingBySection[sectionIdx] ?? 0;
          return (
            <section
              key={`rolling-${section.title}-${sectionIdx}`}
              className="py-32 bg-[#1A1A1A] text-white overflow-hidden px-6"
            >
              <div className="max-w-7xl mx-auto mb-12 lg:mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4 block">
                      {t('villa.galleryLabel')}
                    </span>
                    <h2 className="text-4xl md:text-5xl md:text-6xl font-serif">
                      {section.title || t('villa.visualDetails')}
                    </h2>
                  </div>
                  <p className="text-white/50 font-light max-w-md text-lg">
                    {t('villa.galleryHelp', { name: villa.name })}
                  </p>
                </div>
              </div>

              <RollingGalleryStrip
                images={images}
                galleryIndex={galleryIndex}
                onSelectIndex={(idx) =>
                  setRollingBySection((prev) => ({ ...prev, [sectionIdx]: idx }))
                }
                onCenterDoubleClick={(src) => setSelectedImage(src)}
                missingImageFallback={t('homeA11y.missingImage')}
                altForIndex={(idx) =>
                  `${villa.name} — ${section.title || t('villa.visualDetails')} — ${idx + 1}`
                }
              />
            </section>
          );
        })}
      </div>

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
              alt={t('villa.expandedAlt')}
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Between Villas */}
      <section className="py-32 bg-[#F9F8F6] px-6">
        <div className="max-w-7xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-12 block text-center">{t('villa.continueExploring')}</span>
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
                  <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 group-hover:text-white transition-colors">{t('villa.viewVilla')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
