import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Villa } from '../types';
import homeDataDefault from '../data/home.json';
import { mergeHomeWithLocale } from '../lib/mergeHomeWithLocale';
import { mergeHomeDataWithCmsLocale } from '../lib/cmsHomeLocale';

interface VillasProps {
  villas: Villa[];
}

export default function Villas({ villas }: VillasProps) {
  const { t, i18n } = useTranslation();
  const [homeData, setHomeData] = useState(() => homeDataDefault);

  useEffect(() => {
    fetch('/api/home', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setHomeData(data as typeof homeDataDefault))
      .catch(() => setHomeData(homeDataDefault));
  }, []);

  const homeDisplay = useMemo(() => {
    const lng = i18n.language;
    const afterJson = mergeHomeWithLocale(
      homeData as Parameters<typeof mergeHomeWithLocale>[0],
      lng,
      i18n.getResourceBundle(lng, 'translation') as { home?: Record<string, unknown> }
    );
    return mergeHomeDataWithCmsLocale(
      afterJson as unknown as Record<string, unknown>,
      lng
    ) as unknown as typeof homeDataDefault;
  }, [homeData, i18n]);

  const { sectionLabel, heading } = homeDisplay.residences;

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A]">
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-4 block">{sectionLabel}</span>
            <h1 className="text-4xl md:text-5xl font-serif text-[#2C3539] mb-16 md:mb-20">{heading}</h1>
          </motion.div>
          <div className="grid gap-10 md:gap-12 sm:grid-cols-2">
            {villas.map((villa, index) => (
              <motion.article
                key={villa.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="group"
              >
                <Link
                  to={`/villas/${villa.id}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F5A] rounded-sm"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-sm mb-6">
                    <img
                      src={villa.image}
                      alt={villa.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.onerror = null;
                        el.src = `https://placehold.co/800x600?text=${encodeURIComponent(t('homeA11y.missingImage'))}`;
                      }}
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 text-[9px] font-bold tracking-[0.3em] uppercase text-[#8B6F5A]">
                      {villa.subtitle}
                    </div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif text-[#2C3539] mb-3 group-hover:text-[#8B6F5A] transition-colors">
                    {villa.name}
                  </h2>
                  <p className="text-gray-500 font-light leading-relaxed line-clamp-3 mb-4">{villa.description}</p>
                  <span className="inline-flex items-center text-[10px] uppercase tracking-[0.3em] font-bold text-[#8B6F5A]">
                    {t('villa.viewVilla')}
                    <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
