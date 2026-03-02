import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    id: 1,
    name: "Eleanor Vance",
    role: "Property Investor, London",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200",
    text: "The attention to detail at Grey House Villas is unparalleled. The seamless integration of Katouna stone with modern Italian finishings creates an atmosphere that is both grounded and incredibly luxurious. A truly exceptional addition to our portfolio.",
    rating: 5
  },
  {
    id: 2,
    name: "Marcus Thorne",
    role: "Architectural Digest Contributor",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200&h=200",
    text: "What Katouna has achieved here is a masterclass in contextual architecture. The way the structures step down the mountain, offering complete privacy while maximizing those endless Ionian views, is nothing short of brilliant.",
    rating: 5
  },
  {
    id: 3,
    name: "Sophia & Julian Wright",
    role: "Private Owners",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200",
    text: "From the moment we stepped onto the terrace of Villa Oneiro, we knew we had found our sanctuary. The underfloor heating makes it perfect for winter retreats, while the summer breeze off the sea is simply magical.",
    rating: 5
  },
  {
    id: 4,
    name: "Isabella Rossi",
    role: "Boutique Hotelier",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200",
    text: "The turnkey delivery exceeded all expectations. The curation of European designer furniture perfectly complements the raw, organic nature of the estate. It's rare to find a property that requires absolutely zero compromise.",
    rating: 5
  }
];

export default function Testimonials() {
  return (
    <div className="bg-[#FDFCFB] min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#A89F91] mb-6 block">Client Experiences</span>
            <h1 className="text-5xl md:text-7xl font-serif text-[#2C3539] mb-8">
              Words of <span className="italic font-light">Distinction.</span>
            </h1>
            <p className="text-gray-500 font-light max-w-2xl mx-auto text-lg leading-relaxed">
              Hear from the investors, architects, and residents who have experienced the unparalleled luxury and craftsmanship of Grey House Villas.
            </p>
          </motion.div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="bg-white p-10 lg:p-14 border border-black/5 hover:border-[#D4C3B3]/50 transition-colors duration-500 group relative"
            >
              <Quote className="absolute top-10 right-10 text-[#F4F1ED] w-16 h-16 -z-0 group-hover:text-[#EFEBE4] transition-colors" />
              
              <div className="relative z-10">
                <div className="flex gap-1 mb-8">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} className="fill-[#8B6F5A] text-[#8B6F5A]" />
                  ))}
                </div>
                
                <p className="text-xl lg:text-2xl font-serif text-[#2C3539] leading-relaxed mb-12 italic">
                  "{testimonial.text}"
                </p>
                
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-black/10">
                    <img 
                      src={testimonial.image} 
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
