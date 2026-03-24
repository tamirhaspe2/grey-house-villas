import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

type Item = { name: string; role: string; text: string };

const PORTRAITS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200',
];

export default function Testimonials() {
  const { t } = useTranslation();
  const raw = t('testimonials.items', { returnObjects: true });
  const items: Item[] = Array.isArray(raw) ? (raw as Item[]) : [];

  return (
    <div className="bg-[#FDFCFB] min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-6 block">{t('testimonials.label')}</span>
            <h1 className="text-5xl md:text-7xl font-serif text-[#2C3539] mb-8">
              {t('testimonials.heading')} <span className="italic font-light">{t('testimonials.headingItalic')}</span>
            </h1>
            <p className="text-gray-500 font-light max-w-2xl mx-auto text-lg leading-relaxed">
              {t('testimonials.sub')}
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {items.map((testimonial, index) => (
            <motion.div
              key={testimonial.name + index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="bg-white p-10 lg:p-14 border border-black/5 hover:border-[#D4C3B3]/50 transition-colors duration-500 group relative"
            >
              <Quote className="absolute top-10 right-10 text-[#F4F1ED] w-16 h-16 -z-0 group-hover:text-[#EFEBE4] transition-colors" />

              <div className="relative z-10">
                <div className="flex gap-1 mb-8">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className="fill-[#8B6F5A] text-[#8B6F5A]" />
                  ))}
                </div>

                <p className="text-xl lg:text-2xl font-serif text-[#2C3539] leading-relaxed mb-12 italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-black/10">
                    <img
                      src={PORTRAITS[index] ?? PORTRAITS[0]}
                      alt={testimonial.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-wider uppercase text-[#2C3539]">{testimonial.name}</h4>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#A89F91] mt-1">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
