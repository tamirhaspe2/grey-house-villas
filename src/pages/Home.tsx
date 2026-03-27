import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Maximize, Home as HomeIcon, Droplets, Wind, Check } from 'lucide-react';
import { Villa } from '../types';
import homeDataDefault from '../data/home.json';
import { encodePublicMediaUrl } from '../lib/mediaUrl';
import { mergeHomeWithLocale } from '../lib/mergeHomeWithLocale';
import { mergeHomeDataWithCmsLocale } from '../lib/cmsHomeLocale';
import type { HomeSiteUi } from '../lib/homeSiteUi';
import {
  homeUiSectionBackground,
  homeUiTextStyle,
  mergeHomeSiteUi,
  isHeroFreeLayout,
  resolveHeroBlockPositions,
  heroBlockPositionStyle,
} from '../lib/homeSiteUi';

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
    videoUrl?: string;
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
  /** Admin-edited translations (fr/he/el); merged on top of JSON locale files. */
  localeStrings?: Partial<Record<'fr' | 'he' | 'el', Record<string, unknown>>>;
  /** Global section colors & typography (not per language). */
  siteUi?: HomeSiteUi;
  footer?: {
    brandName: string;
    brandTagline: string;
    social: {
      instagramUrl: string;
      facebookUrl: string;
      linkedinUrl?: string;
    };
    directInquiriesTitle: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    mapQuery?: string;
    mapEmbedUrl?: string;
    registerInterestTitle: string;
    copyright: string;
    privacyLabel: string;
    privacyUrl: string;
    disclaimerLabel: string;
    disclaimerUrl: string;
  };
}

const GALLERY_VISIBLE = 5; // how many images visible in accordion
const GALLERY_AUTOPLAY_MS = 4000;

/**
 * iOS (Safari + Chrome/Firefox/Edge on iPhone) all use WebKit for video. iPadOS may report as MacIntel + touch.
 */
function isIOSStyleWebKitVideo(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  if (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1) return true;
  if (/CriOS|FxiOS|EdgiOS/i.test(ua)) return true;
  return false;
}

/**
 * iOS WebKit: muted autoplay is unreliable (Low Power Mode, data saver). Always show controls so guests can tap play.
 * Direct `src` on `<video>` is more reliable than `<source>` alone on some iOS versions.
 * Avoid placing this component inside a Framer Motion node that applies translateY — WebKit often shows a black box.
 */
function EstateFilmVideo({ src, ariaLabel }: { src: string; ariaLabel?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const iosLike = useMemo(() => isIOSStyleWebKitVideo(), []);
  const [showControls, setShowControls] = useState(iosLike);
  const encodedSrc = encodePublicMediaUrl(src);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    el.playsInline = true;
    el.muted = true;
    el.defaultMuted = true;

    const tryPlay = () => {
      el.muted = true;
      void el.play().catch(() => setShowControls(true));
    };

    el.load();

    if (!iosLike) {
      el.addEventListener('loadedmetadata', tryPlay);
      el.addEventListener('canplay', tryPlay);
      const retry = window.setTimeout(tryPlay, 400);
      tryPlay();
      return () => {
        window.clearTimeout(retry);
        el.removeEventListener('loadedmetadata', tryPlay);
        el.removeEventListener('canplay', tryPlay);
      };
    }

    tryPlay();
    return undefined;
  }, [encodedSrc, iosLike]);

  return (
    <video
      key={encodedSrc}
      ref={ref}
      src={encodedSrc}
      autoPlay={!iosLike}
      muted
      defaultMuted
      loop
      playsInline
      preload={iosLike ? 'metadata' : 'auto'}
      controls={showControls}
      className="absolute inset-0 w-full h-full object-cover"
      aria-label={ariaLabel ?? 'Grey House estate film'}
      onError={() => setShowControls(true)}
    />
  );
}

export default function Home({ villas }: HomeProps) {
  const { t, i18n } = useTranslation();
  const [activeVillaIndex, setActiveVillaIndex] = useState(0);
  const [homeData, setHomeData] = useState<HomeData>(homeDataDefault as HomeData);
  const [isLoading, setIsLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const homeDisplay = useMemo(() => {
    const lng = i18n.language;
    const afterJson = mergeHomeWithLocale(
      homeData,
      lng,
      i18n.getResourceBundle(lng, 'translation') as { home?: Partial<HomeData> }
    );
    return mergeHomeDataWithCmsLocale(afterJson as Record<string, unknown>, lng) as unknown as HomeData;
  }, [homeData, i18n]);

  const siteUi = useMemo(() => mergeHomeSiteUi(homeData.siteUi), [homeData.siteUi]);

  useEffect(() => {
    // Fetch home data from API
    fetch('/api/home', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setHomeData(data);
        setIsLoading(false);
      })
      .catch(() => {
        // Fallback to default data if API fails
        setHomeData(homeDataDefault as HomeData);
        setIsLoading(false);
      });
  }, []);

  // Rolling accordion gallery autoplay
  useEffect(() => {
    const imgs = homeDisplay.gallery.images;
    if (imgs.length === 0) return;
    const t = setInterval(() => {
      setGalleryIndex((i) => (i + 1) % imgs.length);
    }, GALLERY_AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [homeDisplay.gallery.images]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <div className="font-serif text-2xl tracking-widest uppercase text-[#2C3539] animate-pulse">{t('app.loading')}</div>
      </div>
    );
  }

  const heroLoc = siteUi.hero.textStyles?.location;
  const heroTitle = siteUi.hero.textStyles?.title;
  const heroSub = siteUi.hero.textStyles?.subtitle;
  const heroDesc = siteUi.hero.textStyles?.description;
  const heroBtnP = siteUi.hero.textStyles?.buttonPrimary;
  const heroBtnS = siteUi.hero.textStyles?.buttonSecondary;
  const heroFreeLayout = isHeroFreeLayout(siteUi.hero);
  const heroBlockPos = resolveHeroBlockPositions(siteUi.hero.blockPositions);
  const heroVh = siteUi.hero.minHeightVh ?? 100;

  return (
    <div
      className="text-[#1A1A1A]"
      style={{ backgroundColor: siteUi.pageShell.backgroundColor }}
    >
      {/* Hero Section - Editorial Recipe: fully responsive, text never clipped or covered */}
      <section
        className={`relative ${heroFreeLayout ? 'flex flex-col' : 'flex items-center justify-center'}`}
        style={{ minHeight: `${heroVh}vh` }}
      >
        {/* Background only: clip image to section, content stays above */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.img
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2 }}
            key={homeDisplay.hero.backgroundImage}
            src={homeDisplay.hero.backgroundImage}
            alt={t('homeA11y.heroAlt')}
            className="absolute inset-0 w-full h-full object-cover object-center"
            style={{ minHeight: '100%', minWidth: '100%' }}
            onError={(e) => {
              console.error('Hero image failed to load:', homeDisplay.hero.backgroundImage);
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: `rgba(0,0,0,${(siteUi.hero.overlayOpacity ?? 25) / 100})`,
            }}
            aria-hidden
          />
        </div>

        {/* Content: stacked (default) or absolute blocks when custom positions are saved in Admin */}
        {heroFreeLayout ? (
          <div
            className="relative z-10 w-full min-w-0 flex-1 box-border px-4 py-16 sm:py-20 sm:px-6 md:px-8 pointer-events-none"
            style={{ minHeight: `${heroVh}vh` }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.35 }}
              className="relative w-full max-w-6xl mx-auto min-w-0"
              style={{ minHeight: `max(360px, calc(${heroVh}vh - 6rem))` }}
            >
              <div
                className="text-center min-w-0"
                style={{
                  ...heroBlockPositionStyle(heroBlockPos.location),
                }}
              >
                <span
                  className="inline-block uppercase tracking-[0.5em] border-b border-white/20 pb-2"
                  style={homeUiTextStyle(heroLoc)}
                >
                  {homeDisplay.hero.location}
                </span>
              </div>
              <div
                className="text-center min-w-0 w-full max-w-5xl"
                style={{
                  ...heroBlockPositionStyle(heroBlockPos.headline),
                }}
              >
                <h1
                  className="font-serif leading-[0.9] tracking-tight break-words"
                  style={{
                    ...homeUiTextStyle(heroTitle),
                    ...(heroTitle?.fontSizePx == null ? { fontSize: 'clamp(2.25rem, 6vw + 1.5rem, 8rem)' } : {}),
                  }}
                >
                  {homeDisplay.hero.title} <br />{' '}
                  <span
                    className="italic opacity-90"
                    style={{
                      ...homeUiTextStyle(heroSub),
                      ...(heroSub?.fontSizePx == null
                        ? {
                            fontSize:
                              heroTitle?.fontSizePx != null
                                ? '1em'
                                : 'clamp(2.25rem, 6vw + 1.5rem, 8rem)',
                          }
                        : {}),
                    }}
                  >
                    {homeDisplay.hero.subtitle}
                  </span>
                </h1>
              </div>
              <div
                className="text-center min-w-0 w-full"
                style={{
                  ...heroBlockPositionStyle(heroBlockPos.description),
                }}
              >
                <p
                  className="font-light w-full max-w-2xl mx-auto leading-relaxed break-words"
                  style={{
                    ...homeUiTextStyle(heroDesc),
                    ...(heroDesc?.fontSizePx == null
                      ? { fontSize: 'clamp(0.9375rem, 1.5vw + 0.75rem, 1.25rem)' }
                      : {}),
                  }}
                >
                  {homeDisplay.hero.description}
                </p>
              </div>
              <div
                className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 flex-wrap"
                style={{
                  ...heroBlockPositionStyle(heroBlockPos.actions),
                }}
              >
                <Link
                  to="/villas"
                  className="min-h-[44px] inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 bg-white uppercase tracking-[0.3em] hover:bg-[#D4C3B3] transition-all duration-500 shrink-0"
                  style={homeUiTextStyle(heroBtnP)}
                >
                  {homeDisplay.hero.button1}
                </Link>
                <a
                  href="#gallery"
                  className="min-h-[44px] inline-flex items-center justify-center uppercase tracking-[0.3em] group shrink-0"
                  style={homeUiTextStyle(heroBtnS)}
                >
                  {homeDisplay.hero.button2}{' '}
                  <ArrowRight
                    size={14}
                    className="ml-3 group-hover:translate-x-2 transition-transform shrink-0"
                    style={{ color: heroBtnS?.colorHex || 'currentColor' }}
                  />
                </a>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="relative z-10 w-full min-w-0 text-center px-4 py-20 sm:px-6 md:px-8 max-w-5xl mx-auto box-border">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="flex flex-col items-center min-w-0 w-full"
            >
              <span
                className="inline-block uppercase tracking-[0.5em] mb-4 sm:mb-8 border-b border-white/20 pb-2"
                style={homeUiTextStyle(heroLoc)}
              >
                {homeDisplay.hero.location}
              </span>
              <h1
                className="font-serif leading-[0.9] mb-8 sm:mb-12 tracking-tight w-full break-words"
                style={{
                  ...homeUiTextStyle(heroTitle),
                  ...(heroTitle?.fontSizePx == null ? { fontSize: 'clamp(2.25rem, 6vw + 1.5rem, 8rem)' } : {}),
                }}
              >
                {homeDisplay.hero.title} <br />{' '}
                <span
                  className="italic opacity-90"
                  style={{
                    ...homeUiTextStyle(heroSub),
                    ...(heroSub?.fontSizePx == null
                      ? {
                          fontSize:
                            heroTitle?.fontSizePx != null
                              ? '1em'
                              : 'clamp(2.25rem, 6vw + 1.5rem, 8rem)',
                        }
                      : {}),
                  }}
                >
                  {homeDisplay.hero.subtitle}
                </span>
              </h1>
              <p
                className="font-light w-full max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed break-words"
                style={{
                  ...homeUiTextStyle(heroDesc),
                  ...(heroDesc?.fontSizePx == null
                    ? { fontSize: 'clamp(0.9375rem, 1.5vw + 0.75rem, 1.25rem)' }
                    : {}),
                }}
              >
                {homeDisplay.hero.description}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 flex-wrap">
                <Link
                  to="/villas"
                  className="min-h-[44px] inline-flex items-center justify-center px-8 sm:px-10 py-3.5 sm:py-4 bg-white uppercase tracking-[0.3em] hover:bg-[#D4C3B3] transition-all duration-500 shrink-0"
                  style={homeUiTextStyle(heroBtnP)}
                >
                  {homeDisplay.hero.button1}
                </Link>
                <a
                  href="#gallery"
                  className="min-h-[44px] inline-flex items-center justify-center uppercase tracking-[0.3em] group shrink-0"
                  style={homeUiTextStyle(heroBtnS)}
                >
                  {homeDisplay.hero.button2}{' '}
                  <ArrowRight
                    size={14}
                    className="ml-3 group-hover:translate-x-2 transition-transform shrink-0"
                    style={{ color: heroBtnS?.colorHex || 'currentColor' }}
                  />
                </a>
              </div>
            </motion.div>
          </div>
        )}

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
      <section
        id="estate"
        className="py-32 lg:py-48 px-6 overflow-hidden"
        style={homeUiSectionBackground(siteUi.philosophy)}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1 }}
              >
                <span
                  className="uppercase tracking-[0.4em] mb-6 block"
                  style={homeUiTextStyle(siteUi.philosophy.textStyles?.label)}
                >
                  {homeDisplay.philosophy.sectionLabel}
                </span>
                <h2
                  className={`font-serif mb-10 leading-tight ${
                    siteUi.philosophy.textStyles?.heading?.fontSizePx == null ? 'text-4xl md:text-6xl' : ''
                  }`}
                  style={homeUiTextStyle(siteUi.philosophy.textStyles?.heading)}
                >
                  {homeDisplay.philosophy.heading} <br />{' '}
                  <span className="italic">{homeDisplay.philosophy.headingHighlight}</span>
                </h2>
                <div
                  className={`space-y-8 font-light leading-relaxed ${
                    siteUi.philosophy.textStyles?.body?.fontSizePx == null ? 'text-lg' : ''
                  }`}
                  style={homeUiTextStyle(siteUi.philosophy.textStyles?.body)}
                >
                  <p>{homeDisplay.philosophy.paragraph1}</p>
                  <p>{homeDisplay.philosophy.paragraph2}</p>
                </div>
                <div className="mt-16 flex items-center gap-8">
                  <div className="w-16 h-[1px] bg-[#D4C3B3]"></div>
                  <p
                    className={`font-serif italic ${
                      siteUi.philosophy.textStyles?.quote?.fontSizePx == null ? 'text-xl' : ''
                    }`}
                    style={homeUiTextStyle(siteUi.philosophy.textStyles?.quote)}
                  >
                    {homeDisplay.philosophy.quote}
                  </p>
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
                  key={homeDisplay.philosophy.mainImage}
                  src={homeDisplay.philosophy.mainImage}
                  alt={t('homeA11y.philosophyMainAlt')}
                  className="w-full h-full object-cover rounded-sm shadow-2xl"
                  onError={(e) => {
                    console.error('Philosophy main image failed to load:', homeDisplay.philosophy.mainImage);
                  }}
                />
                <div className="absolute -bottom-12 -left-12 w-64 h-80 hidden xl:block border-[12px] border-white shadow-xl">
                  <img
                    key={homeDisplay.philosophy.detailImage}
                    src={homeDisplay.philosophy.detailImage}
                    alt={t('homeA11y.philosophyDetailAlt')}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Philosophy detail image failed to load:', homeDisplay.philosophy.detailImage);
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* The Residences - Accordion Showcase */}
      {/* <section id="villas" className="py-32 bg-[#F9F8F6]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-4 block">{homeDisplay.residences.sectionLabel}</span>
            <h2 className="text-4xl md:text-5xl font-serif text-[#2C3539]">{homeDisplay.residences.heading}</h2>
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
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://placehold.co/600x400?text=${encodeURIComponent(t('homeA11y.missingImage'))}`;
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
                            {villa.specs.map((spec, i) => (
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
                              {t('homeA11y.exploreOption')}
                            </Link>
                            <Link
                              to={`/villas/${villa.id}`}
                              className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#8B6F5A] hover:text-[#2C3539] transition-colors flex items-center group"
                            >
                              {t('homeA11y.galleryLink')} <ArrowRight size={14} className="ml-3 group-hover:translate-x-2 transition-transform" />
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
      </section> */}

      {/* Interior & Lifestyle - Minimal Utility Recipe */}
      {/* <section className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="grid grid-cols-2 gap-4">
                <motion.img
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  key={homeDisplay.interior.image1}
                  src={homeDisplay.interior.image1}
                  alt="Interior"
                  className="w-full aspect-[3/4] object-cover rounded-sm"
                  onError={(e) => {
                    console.error('Interior image 1 failed to load:', homeDisplay.interior.image1);
                  }}
                />
                <motion.img
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  key={homeDisplay.interior.image2}
                  src={homeDisplay.interior.image2}
                  alt="Kitchen"
                  className="w-full aspect-[3/4] object-cover rounded-sm mt-12"
                  onError={(e) => {
                    console.error('Interior image 2 failed to load:', homeDisplay.interior.image2);
                  }}
                />
              </div>
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] bg-[#F9F8F6] rounded-full blur-3xl opacity-50"></div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-6 block">{homeDisplay.interior.sectionLabel}</span>
              <h2 className="text-4xl md:text-5xl font-serif mb-8 text-[#2C3539]">{homeDisplay.interior.heading} <br /> <span className="italic">{homeDisplay.interior.headingHighlight}</span></h2>
              <p className="text-gray-600 font-light mb-10 text-lg leading-relaxed">
                {homeDisplay.interior.description}
              </p>
              <div className="space-y-6 mb-12">
                {homeDisplay.interior.features.map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-[#F4F1ED] flex items-center justify-center text-[#A89F91]">
                      <Check size={12} />
                    </div>
                    <span className="text-gray-700 font-light">{item}</span>
                  </div>
                ))}
              </div>
              <button className="px-10 py-4 border border-black text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-black hover:text-white transition-all">
                {homeDisplay.interior.buttonText}
              </button>
            </div>
          </div>
        </div>
      </section> */}

      {/* Gallery — featured film (same copy as data gallery; carousel implementation remains in comments below) */}
      <section
        id="gallery"
        className="py-32 overflow-hidden"
        style={homeUiSectionBackground(siteUi.gallery)}
      >
        <div className="max-w-7xl mx-auto px-6 mb-12 lg:mb-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span
                className="uppercase tracking-[0.4em] mb-4 block"
                style={homeUiTextStyle(siteUi.gallery.textStyles?.label)}
              >
                {homeDisplay.gallery.sectionLabel}
              </span>
              <h2
                className={`font-serif ${
                  siteUi.gallery.textStyles?.heading?.fontSizePx == null ? 'text-4xl md:text-6xl' : ''
                }`}
                style={homeUiTextStyle(siteUi.gallery.textStyles?.heading)}
              >
                {homeDisplay.gallery.heading}{' '}
                <span className="italic font-light">{homeDisplay.gallery.headingHighlight}</span>
              </h2>
            </div>
            <p
              className={`font-light max-w-md ${
                siteUi.gallery.textStyles?.description?.fontSizePx == null ? 'text-lg' : ''
              }`}
              style={homeUiTextStyle(siteUi.gallery.textStyles?.description)}
            >
              {homeDisplay.gallery.description}
            </p>
          </div>
        </div>

        {homeDisplay.hero.videoUrl ? (
          <div className="max-w-6xl mx-auto px-6">
            {/* No motion transform here: iOS Safari often renders inline video as a black box when an ancestor has translateY/transform. */}
            <div className="relative w-full aspect-video rounded-sm overflow-hidden shadow-2xl border border-white/15 bg-black">
              <EstateFilmVideo src={homeDisplay.hero.videoUrl!} ariaLabel={t('homeA11y.videoAria')} />
            </div>
          </div>
        ) : (
          <p className="text-center text-white/40 text-sm px-6">{t('homeA11y.filmSoon')}</p>
        )}
      </section>

      {/* Gallery - Rolling Accordion */}
      
      {/* <section id="gallery" className="py-32 bg-[#1A1A1A] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-4 block">{homeDisplay.gallery.sectionLabel}</span>
              <h2 className="text-4xl md:text-6xl font-serif">{homeDisplay.gallery.heading} <span className="italic font-light">{homeDisplay.gallery.headingHighlight}</span></h2>
            </div>
            <p className="text-white/50 font-light max-w-md text-lg">
              {homeDisplay.gallery.description}
            </p>
          </div>
        </div>

        <div className="relative w-full h-[60vh] overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-stretch justify-center gap-1 h-full w-full max-w-[95vw]">
              <AnimatePresence mode="popLayout" initial={false}>
                {(() => {
                  const imgs = homeDisplay.gallery.images;
                  const n = imgs.length;
                  if (n === 0) return null;
                  const radius = Math.floor(GALLERY_VISIBLE / 2);
                  const indices: number[] = [];
                  for (let i = -radius; i <= radius; i++) {
                    indices.push(((galleryIndex + i) % n + n) % n);
                  }
                  const centerIdx = radius;
                  return indices.map((imgIdx, slotIdx) => {
                    const isCenter = slotIdx === centerIdx;
                    const fromLeft = slotIdx < centerIdx;
                    return (
                      <motion.div
                        key={imgIdx}
                        layout
                        initial={{ opacity: 0, x: fromLeft ? -150 : 150 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          flex: isCenter ? 4 : 1,
                          minWidth: isCenter ? '40%' : '10%',
                        }}
                        exit={{ opacity: 0, x: fromLeft ? -150 : 150 }}
                        transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
                        className="relative overflow-hidden cursor-pointer rounded-sm shrink-0"
                        onClick={() => setGalleryIndex(imgIdx)}
                      >
                        <img
                          src={imgs[imgIdx]}
                          alt={`Gallery ${imgIdx}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          draggable={false}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://placehold.co/1200x800?text=${encodeURIComponent(t('homeA11y.missingImage'))}`;
                          }}
                        />
                        <div className={`absolute inset-0 transition-colors duration-500 ${isCenter ? 'bg-transparent' : 'bg-black/50'}`} />
                      </motion.div>
                    );
                  });
                })()}
              </AnimatePresence>
            </div>
          </div>
        </div> */}

        {/* Progress dots */}
        {/* <div className="flex justify-center gap-2 mt-8">
          {homeDisplay.gallery.images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setGalleryIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${galleryIndex === idx ? 'bg-white w-8' : 'bg-white/40 hover:bg-white/60'}`}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      </section>
 */}
    </div>
  );
}
