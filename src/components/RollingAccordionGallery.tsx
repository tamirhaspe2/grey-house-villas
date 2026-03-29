import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { encodePublicMediaUrl } from '../lib/mediaUrl';

const GALLERY_VISIBLE = 5;
const GALLERY_AUTOPLAY_MS = 4000;

export type RollingAccordionGalleryCopy = {
  sectionLabel: string;
  heading: string;
  headingHighlight: string;
  description: string;
  images: string[];
};

type RollingAccordionGalleryProps = {
  gallery: RollingAccordionGalleryCopy;
  missingImageLabel: string;
  /** Wider strip + minimal horizontal padding (e.g. villas listing page) */
  wide?: boolean;
  closeLightboxLabel: string;
  prevImageLabel: string;
  nextImageLabel: string;
};

export default function RollingAccordionGallery({
  gallery,
  missingImageLabel,
  wide = false,
  closeLightboxLabel,
  prevImageLabel,
  nextImageLabel,
}: RollingAccordionGalleryProps) {
  const { sectionLabel, heading, headingHighlight, description, images: rawImages } = gallery;
  const images = useMemo(() => rawImages.map((u) => encodePublicMediaUrl(u)), [rawImages]);

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const n = images.length;
  const lightboxOpen = lightboxIndex !== null;

  useEffect(() => {
    if (n === 0 || lightboxOpen) return;
    const id = window.setInterval(() => {
      setGalleryIndex((i) => (i + 1) % n);
    }, GALLERY_AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [n, lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? 0 : (i - 1 + n) % n));
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? 0 : (i + 1) % n));
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, n]);

  const openLightbox = useCallback(
    (idx: number) => {
      setGalleryIndex(idx);
      setLightboxIndex(idx);
    },
    []
  );

  const goPrevLb = useCallback(() => {
    setLightboxIndex((i) => (i === null ? 0 : (i - 1 + n) % n));
  }, [n]);

  const goNextLb = useCallback(() => {
    setLightboxIndex((i) => (i === null ? 0 : (i + 1) % n));
  }, [n]);

  const goPrevStrip = useCallback(() => {
    setGalleryIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const goNextStrip = useCallback(() => {
    setGalleryIndex((i) => (i + 1) % n);
  }, [n]);

  if (n === 0) return null;

  const radius = Math.floor(GALLERY_VISIBLE / 2);
  const indices: number[] = [];
  for (let i = -radius; i <= radius; i++) {
    indices.push(((galleryIndex + i) % n + n) % n);
  }
  const centerIdx = radius;

  const headerPad = wide ? 'px-4 sm:px-6 lg:px-10' : 'px-6';
  const stripPad = wide ? 'px-1 sm:px-3 lg:px-6' : 'px-3 sm:px-6';

  return (
    <>
      <section className="bg-[#1A1A1A] py-20 text-white md:py-28" aria-label={heading}>
        <div className={`mx-auto mb-12 max-w-7xl lg:mb-16 ${headerPad}`}>
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <span className="mb-4 block text-[10px] uppercase tracking-[0.4em] text-white/40">{sectionLabel}</span>
              <h2 className="font-serif text-4xl md:text-6xl">
                {heading} <span className="font-light italic">{headingHighlight}</span>
              </h2>
            </div>
            <p className="max-w-md text-lg font-light text-white/50">{description}</p>
          </div>
        </div>

        <div className={`w-full ${stripPad}`}>
          <div
            className={`relative mx-auto ${
              wide ? 'h-[min(68vh,640px)] max-w-[min(100vw,1920px)]' : 'h-[60vh] max-w-[95vw]'
            }`}
          >
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-full w-full max-w-full items-stretch justify-center gap-1">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {indices.map((imgIdx, slotIdx) => {
                      const isCenter = slotIdx === centerIdx;
                      const fromLeft = slotIdx < centerIdx;
                      return (
                        <motion.button
                          type="button"
                          key={imgIdx}
                          layout
                          initial={{ opacity: 0, x: fromLeft ? -150 : 150 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            flex: isCenter ? 4 : 1,
                            minWidth: isCenter ? (wide ? '38%' : '40%') : '10%',
                          }}
                          exit={{ opacity: 0, x: fromLeft ? -150 : 150 }}
                          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                          className="relative shrink-0 cursor-pointer overflow-hidden rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                          onClick={() => openLightbox(imgIdx)}
                          aria-label={`${heading} ${imgIdx + 1}`}
                        >
                          <img
                            src={images[imgIdx]}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            draggable={false}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://placehold.co/1200x800?text=${encodeURIComponent(missingImageLabel)}`;
                            }}
                          />
                          <div
                            className={`absolute inset-0 transition-colors duration-500 ${isCenter ? 'bg-transparent' : 'bg-black/50'}`}
                          />
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {n > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevStrip();
                  }}
                  className="absolute left-1 top-1/2 z-30 flex h-20 min-h-[44px] w-10 min-w-[44px] -translate-y-1/2 items-center justify-center rounded-r-full border border-white/15 bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 active:scale-95 md:left-2 md:h-24 md:w-11"
                  aria-label={prevImageLabel}
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextStrip();
                  }}
                  className="absolute right-1 top-1/2 z-30 flex h-20 min-h-[44px] w-10 min-w-[44px] -translate-y-1/2 items-center justify-center rounded-l-full border border-white/15 bg-black/50 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/70 active:scale-95 md:right-2 md:h-24 md:w-11"
                  aria-label={nextImageLabel}
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {rawImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setGalleryIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                galleryIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`${heading} ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex touch-manipulation items-center justify-center bg-black/95 p-2 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={closeLightboxLabel}
            onClick={() => setLightboxIndex(null)}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
              aria-label={closeLightboxLabel}
            >
              <X size={22} strokeWidth={1.5} />
            </button>

            {n > 1 && (
              <>
                <button
                  type="button"
                  className="absolute left-1 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevLb();
                  }}
                  aria-label={prevImageLabel}
                >
                  <ChevronLeft size={28} strokeWidth={1.5} />
                </button>
                <button
                  type="button"
                  className="absolute right-1 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextLb();
                  }}
                  aria-label={nextImageLabel}
                >
                  <ChevronRight size={28} strokeWidth={1.5} />
                </button>
              </>
            )}

            <img
              src={images[lightboxIndex]!}
              alt=""
              className="max-h-[min(92dvh,92vh)] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = `https://placehold.co/1600x1000?text=${encodeURIComponent(missingImageLabel)}`;
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
