import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import '../types.ts';
import LanguageSwitcher from './LanguageSwitcher';
import { Menu, X, Users, Instagram, Facebook, Linkedin, ChevronDown, Mail, Phone, MapPin, ChevronLeft } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Villa } from '../types';
import homeDataDefault from '../data/home.json';
import { buildGoogleMapsEmbedSrc } from '../lib/googleMapsEmbed';
import type { HomeSiteUi } from '../lib/homeSiteUi';
import { homeUiSectionBackground, homeUiTextStyle, mergeHomeSiteUi } from '../lib/homeSiteUi';

interface LayoutProps {
  children: React.ReactNode;
  villas: Villa[];
}

export default function Layout({ children, villas }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [viewers, setViewers] = useState(1);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    const socket: Socket = io();
    socket.on('viewers:update', (count: number) => {
      setViewers(count);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      socket.disconnect();
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveSubMenu(null);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [footer, setFooter] = useState<any>((homeDataDefault as any).footer ?? null);
  const [siteUiRaw, setSiteUiRaw] = useState<HomeSiteUi | undefined>(
    (homeDataDefault as { siteUi?: HomeSiteUi }).siteUi
  );
  const siteUi = useMemo(() => mergeHomeSiteUi(siteUiRaw), [siteUiRaw]);

  useEffect(() => {
    const loadHome = () => {
      fetch('/api/home', { cache: 'no-store' })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.footer) setFooter(data.footer);
          if (data && data.siteUi) setSiteUiRaw(data.siteUi);
          else setSiteUiRaw((homeDataDefault as { siteUi?: HomeSiteUi }).siteUi);
        })
        .catch(() => {
          setFooter((homeDataDefault as any).footer ?? null);
          setSiteUiRaw((homeDataDefault as { siteUi?: HomeSiteUi }).siteUi);
        });
    };
    loadHome();
    window.addEventListener('home:updated', loadHome);
    return () => window.removeEventListener('home:updated', loadHome);
  }, []);

  const isEn = i18n.language === 'en';
  const footerTagline = isEn
    ? (footer?.brandTagline ?? t('layout.footer.defaultTagline'))
    : t('layout.footer.defaultTagline');
  const footerDirectTitle = isEn
    ? (footer?.directInquiriesTitle ?? t('layout.footer.directInquiries'))
    : t('layout.footer.directInquiries');
  const footerRegisterTitle = isEn
    ? (footer?.registerInterestTitle ?? t('layout.footer.registerInterest'))
    : t('layout.footer.registerInterest');
  const footerCopyright = isEn
    ? (footer?.copyright ?? t('layout.footer.copyright'))
    : t('layout.footer.copyright');
  const footerPrivacy = isEn
    ? (footer?.privacyLabel ?? t('layout.footer.privacy'))
    : t('layout.footer.privacy');
  const footerDisclaimer = isEn
    ? (footer?.disclaimerLabel ?? t('layout.footer.disclaimer'))
    : t('layout.footer.disclaimer');

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

  const isDarkHeader = location.pathname !== '/';
// sss
  const topLine = siteUi.topBar.textStyles?.line;
  const topCount = siteUi.topBar.textStyles?.count;

  return (
    <div
      className="min-h-screen text-[#2C3539] font-sans selection:bg-[#D4C3B3] selection:text-white"
      style={{ backgroundColor: siteUi.pageShell.backgroundColor }}
    >
      {/* Fixed Top Navigation Container */}
      <div className="fixed w-full z-50 top-0">
        {/* Scarcity / Urgency Banner */}
        <div
          className="text-center py-2.5 px-4 tracking-wide flex items-center justify-center gap-4 relative md:text-xs"
          style={homeUiSectionBackground(siteUi.topBar)}
        >
          <span className="flex items-center gap-2" style={homeUiTextStyle(topLine)}>
            <Users
              size={12}
              style={{ color: topLine?.colorHex ? `${topLine.colorHex}99` : 'rgba(255,255,255,0.8)' }}
            />
            <span style={homeUiTextStyle(topCount)}>{viewers}</span>{' '}
            {viewers === 1 ? t('layout.viewing_one') : t('layout.viewing_other')}
          </span>
          {/* <span className="hidden md:inline opacity-30">|</span> */}
          {/* <span className="hidden md:inline"> */}
          <span className="hidden">
            Last opportunity: <span className="font-semibold text-white">only one Grey House Villa remains</span> before we're fully reserved. <Link to="/schedule-call" className="underline hover:text-white transition-colors ml-1">Click to schedule a call.</Link>
          </span>
        </div>

        {/* Global Header */}
        <header
          // className={`w-full transition-all duration-500 border-b border-transparent ${isScrolled || isDarkHeader ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100 py-4' : 'bg-transparent py-6'
          className={`w-full transition-all duration-500 border-b border-transparent ${isScrolled || isDarkHeader ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100 py-4' : 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100 py-4'
            }`}
        >
          <div className="max-w-[1800px] px-6 lg:px-12 flex justify-between items-center mx-auto">
            {/* <Link to="/" className={`font-serif text-2xl lg:text-3xl tracking-wider uppercase transition-colors ${isScrolled || isDarkHeader ? 'text-[#2C3539]' : 'text-white drop-shadow-md'}`}> */}
            <Link to="/" className={`font-serif text-2xl lg:text-3xl tracking-wider uppercase transition-colors ${isScrolled || isDarkHeader ? 'text-[#2C3539]' : 'text-[#2C3539]'}`}>
              Grey House
              <div className={`text-[9px] tracking-[0.4em] mt-1 transition-opacity ${isScrolled || isDarkHeader ? 'opacity-60' : 'opacity-80'}`}>By Katouna</div>
            </Link>

            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              {/* <Link to="/schedule-call" className={`hidden sm:block px-8 py-2.5 text-[11px] uppercase tracking-widest border rounded-full transition-all duration-300 ${isScrolled || isDarkHeader
                ? 'border-[#2C3539] text-[#2C3539] hover:bg-[#2C3539] hover:text-white'
                : 'border-white text-white hover:bg-white hover:text-[#2C3539]'
                }`}>
                Get in Touch
              </Link> */}
              {/* : 'border-white text-white hover:bg-white hover:text-[#2C3539]' */}
              <a
                href="#contact"
                className={`hidden sm:inline-flex min-h-[44px] items-center justify-center px-6 sm:px-8 py-2.5 uppercase tracking-widest border border-[#2C3539] rounded-full transition-all duration-300 touch-manipulation hover:bg-[#2C3539] hover:text-white ${
                  siteUi.header.textStyles?.navButton?.fontSizePx == null ? 'text-[11px]' : ''
                }`}
                style={homeUiTextStyle(siteUi.header.textStyles?.navButton)}
              >
                {t('layout.getInTouch')}
              </a>
              <Link
                to="/booking"
                className={`hidden sm:inline-flex min-h-[44px] items-center justify-center px-6 sm:px-8 py-2.5 uppercase tracking-widest border border-[#2C3539] rounded-full transition-all duration-300 touch-manipulation hover:bg-[#2C3539] hover:text-white ${
                  siteUi.header.textStyles?.navButton?.fontSizePx == null ? 'text-[11px]' : ''
                }`}
                style={homeUiTextStyle(siteUi.header.textStyles?.navButton)}
              >
                {t('layout.bookNow')}
              </Link>

              <LanguageSwitcher className="min-h-[44px] max-w-[140px] px-2 py-1 text-[10px] uppercase tracking-wider border border-[#2C3539] rounded-full bg-white/90 text-[#2C3539] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A89F91]" />

              <button
                type="button"
                aria-label={mobileMenuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
                className={`min-w-[44px] min-h-[44px] p-3 border transition-all duration-300 z-[80] relative flex items-center justify-center touch-manipulation ${mobileMenuOpen
                  ? 'border-[#2C3539] text-[#2C3539] bg-white'
                  : isScrolled || isDarkHeader
                    ? 'border-[#2C3539] text-[#2C3539]'
                    // : 'border-white text-white'
                    : 'border-[#2C3539] text-[#2C3539]'
                  }`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Sidebar Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-full max-w-[400px] z-[70] bg-[#F4F1ED] shadow-2xl flex flex-col p-8 md:p-16 overflow-y-auto"
            >
              <div className="mb-16">
                <div className="font-serif text-2xl tracking-wider uppercase text-[#2C3539]">
                  Grey House
                  <div className="text-[10px] tracking-[0.3em] mt-1 opacity-60 uppercase">By Katouna</div>
                </div>
              </div>

              <div className="flex-grow overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {!activeSubMenu ? (
                    <motion.nav
                      key="main-menu"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -20, opacity: 0 }}
                      className="flex flex-col space-y-2"
                    >
                      <Link to="/" onClick={() => setMobileMenuOpen(false)} className="min-h-[48px] flex items-center text-3xl font-serif text-[#2C3539] hover:text-[#A89F91] transition-colors py-2">{t('layout.home')}</Link>
                      <button
                        onClick={() => setActiveSubMenu('villas')}
                        className="min-h-[48px] text-left text-3xl font-serif text-[#2C3539] hover:text-[#A89F91] transition-colors flex items-center group py-2 touch-manipulation"
                      >
                        {t('layout.villas')} <ChevronDown size={20} className="-rotate-90 ml-2 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <Link to="/testimonials" onClick={() => setMobileMenuOpen(false)} className="min-h-[48px] flex items-center text-3xl font-serif text-[#2C3539] hover:text-[#A89F91] transition-colors py-2">{t('layout.testimonials')}</Link>
                      <a href="/#gallery" onClick={() => setMobileMenuOpen(false)} className="min-h-[48px] flex items-center text-3xl font-serif text-[#2C3539] hover:text-[#A89F91] transition-colors py-2 group">
                        {t('layout.gallery')} <ChevronDown size={20} className="-rotate-90 ml-2 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <Link
                        to="/booking"
                        onClick={() => setMobileMenuOpen(false)}
                        className="min-h-[48px] flex items-center mt-4 px-6 py-3 rounded-full bg-[#2C3539] text-white text-[11px] uppercase tracking-widest font-bold hover:bg-[#8B6F5A] transition-colors touch-manipulation w-fit"
                      >
                        {t('layout.bookNow')}
                      </Link>
                    </motion.nav>
                  ) : (
                    <motion.div
                      key="sub-menu"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      className="flex flex-col space-y-6"
                    >
                      <button
                        onClick={() => setActiveSubMenu(null)}
                        className="flex items-center text-xl font-serif text-[#2C3539] opacity-60 hover:opacity-100 transition-opacity mb-4"
                      >
                        <ChevronLeft size={20} className="mr-2" /> {t('layout.back')}
                      </button>
                      {villas.map((villa) => (
                        <Link
                          key={villa.id}
                          to={`/villas/${villa.id}`}
                          className="text-3xl font-serif text-[#2C3539] hover:text-[#A89F91] transition-colors"
                        >
                          {villa.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-12 border-t border-[#2C3539]/10 mt-8">
                <div className="mb-6">
                  <span className="text-[10px] uppercase tracking-wider text-[#A89F91] block mb-2">{t('layout.languageLabel')}</span>
                  <LanguageSwitcher className="w-full max-w-[220px] min-h-[44px] px-3 py-2 text-sm border border-[#2C3539] rounded-sm bg-white text-[#2C3539] cursor-pointer" />
                </div>
                <div className="flex space-x-4 mb-8">
                  <a href="#" className="w-10 h-10 rounded-full bg-[#8B6F5A] flex items-center justify-center text-white hover:bg-[#2C3539] transition-colors">
                    <Instagram size={18} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-[#8B6F5A] flex items-center justify-center text-white hover:bg-[#2C3539] transition-colors">
                    <Facebook size={18} />
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-[#8B6F5A] flex items-center justify-center text-white hover:bg-[#2C3539] transition-colors">
                    <Linkedin size={18} />
                  </a>
                </div>
                {/* <Link
                  to="/schedule-call"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-block border border-[#8B6F5A] text-[#8B6F5A] px-10 py-3.5 rounded-full uppercase tracking-widest text-[10px] font-bold hover:bg-[#8B6F5A] hover:text-white transition-all duration-300"
                >
                  Get in Touch
                </Link> */}
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main>{children}</main>

      {/* Footer & Contact */}
      <footer
        id="contact"
        className="pt-20 pb-10 border-t border-white/10"
        style={homeUiSectionBackground(siteUi.footer)}
      >
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 lg:gap-24 mb-16">
          <div>
            <div
              className={`font-serif tracking-wider uppercase mb-6 ${
                siteUi.footer.textStyles?.brand?.fontSizePx == null ? 'text-2xl' : ''
              }`}
              style={homeUiTextStyle(siteUi.footer.textStyles?.brand)}
            >
              {footer?.brandName ?? 'Grey House'}
            </div>
            <p
              className={`font-light mb-8 leading-relaxed ${
                siteUi.footer.textStyles?.body?.fontSizePx == null ? 'text-sm' : ''
              }`}
              style={homeUiTextStyle(siteUi.footer.textStyles?.body)}
            >
              {footerTagline}
            </p>
            <div className="flex space-x-4">
              <a href={footer?.social?.facebookUrl ?? '#'} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#D4C3B3] transition-colors">
                <Facebook size={18} />
              </a>
              <a href={footer?.social?.instagramUrl ?? '#'} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#D4C3B3] transition-colors">
                <Instagram size={18} />
              </a>
              <a href={footer?.social?.linkedinUrl ?? '#'} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-[#D4C3B3] transition-colors">
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4
              className={`font-serif mb-6 ${
                siteUi.footer.textStyles?.heading?.fontSizePx == null ? 'text-xl' : ''
              }`}
              style={homeUiTextStyle(siteUi.footer.textStyles?.heading)}
            >
              {footerDirectTitle}
            </h4>
            <div className="space-y-4">
              <a href={`mailto:${footer?.email ?? 'sales@greyhousevillas.com'}`} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <Mail size={18} className="mr-4 text-[#A89F91]" />
                {footer?.email ?? 'sales@greyhousevillas.com'}
              </a>
              <a href={`tel:${(footer?.phone ?? '+30 690 000 0000').replace(/\s+/g, '')}`} className="flex items-center text-gray-400 hover:text-white transition-colors">
                <Phone size={18} className="mr-4 text-[#A89F91]" />
                {footer?.phone ?? '+30 690 000 0000'}
              </a>
              <div className="flex items-start text-gray-400">
                <MapPin size={18} className="mr-4 mt-1 text-[#A89F91] shrink-0" />
                <span>
                  {footer?.addressLine1 ?? 'Katouna, Lefkas Island'}
                  <br />
                  {footer?.addressLine2 ?? 'Ionian Islands, Greece 311 00'}
                </span>
              </div>
              {(() => {
                const mapSrc = footer ? buildGoogleMapsEmbedSrc(footer) : null;
                if (!mapSrc) return null;
                return (
                  <div className="mt-6 w-full overflow-hidden rounded-sm border border-white/10 bg-black/20 aspect-[4/3] min-h-[200px]">
                    <iframe
                      title={t('layout.footer.mapEmbedTitle')}
                      src={mapSrc}
                      className="h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            <h4
              className={`font-serif mb-6 ${
                siteUi.footer.textStyles?.heading?.fontSizePx == null ? 'text-xl' : ''
              }`}
              style={homeUiTextStyle(siteUi.footer.textStyles?.heading)}
            >
              {footerRegisterTitle}
            </h4>
            <form className="space-y-4" onSubmit={handleInquiry}>
              <input
                type="text"
                placeholder={t('layout.footer.fullName')}
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4C3B3] transition-colors"
              />
              <input
                type="email"
                placeholder={t('layout.footer.email')}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4C3B3] transition-colors"
              />
              <textarea
                placeholder={t('layout.footer.message')}
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#D4C3B3] transition-colors resize-none"
              ></textarea>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#D4C3B3] text-[#2C3539] font-medium tracking-widest uppercase py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('layout.footer.sending') : t('layout.footer.requestBrochure')}
              </button>
              {submitStatus === 'success' && (
                <p className="text-emerald-400 text-xs mt-2">{t('layout.footer.inquirySuccess')}</p>
              )}
              {submitStatus === 'error' && (
                <p className="text-rose-400 text-xs mt-2">{t('layout.footer.inquiryError')}</p>
              )}
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-light">
          <p>{footerCopyright}</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href={footer?.privacyUrl ?? '#'} className="hover:text-white transition-colors">{footerPrivacy}</a>
            <a href={footer?.disclaimerUrl ?? '#'} className="hover:text-white transition-colors">{footerDisclaimer}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
