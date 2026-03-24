import { motion, AnimatePresence } from 'framer-motion';
import { encodePublicMediaUrl } from '../lib/mediaUrl';

const GALLERY_VISIBLE = 5;

export type RollingGalleryStripProps = {
  images: string[];
  galleryIndex: number;
  onSelectIndex: (idx: number) => void;
  /** Fires on double-click of the enlarged (center) panel only */
  onCenterDoubleClick?: (src: string) => void;
  missingImageFallback?: string;
  /** Alt text for the image at a given index (center slot may repeat indices in the strip) */
  altForIndex?: (imageIndex: number) => string;
};

export function RollingGalleryStrip({
  images,
  galleryIndex,
  onSelectIndex,
  onCenterDoubleClick,
  missingImageFallback = 'Missing image',
  altForIndex,
}: RollingGalleryStripProps) {
  const n = images.length;
  if (n === 0) return null;

  const radius = Math.floor(GALLERY_VISIBLE / 2);
  const indices: number[] = [];
  for (let i = -radius; i <= radius; i++) {
    indices.push(((galleryIndex + i) % n + n) % n);
  }
  const centerSlot = radius;

  return (
    <div className="relative w-full h-[60vh] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-stretch justify-center gap-1 h-full w-full max-w-[95vw]">
          <AnimatePresence mode="popLayout" initial={false}>
            {indices.map((imgIdx, slotIdx) => {
              const isCenter = slotIdx === centerSlot;
              const fromLeft = slotIdx < centerSlot;
              const src = encodePublicMediaUrl(images[imgIdx]);
              return (
                <motion.div
                  key={`${slotIdx}-${imgIdx}`}
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
                  onClick={() => onSelectIndex(imgIdx)}
                  onDoubleClick={(e) => {
                    if (!isCenter || !onCenterDoubleClick) return;
                    e.preventDefault();
                    e.stopPropagation();
                    onCenterDoubleClick(src);
                  }}
                >
                  <img
                    src={src}
                    alt={altForIndex ? altForIndex(imgIdx) : ''}
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = `https://placehold.co/1200x800?text=${encodeURIComponent(missingImageFallback)}`;
                    }}
                  />
                  <div
                    className={`absolute inset-0 transition-colors duration-500 ${isCenter ? 'bg-transparent' : 'bg-black/50'}`}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
