import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, GripVertical } from 'lucide-react';
import type { HeroBlockPosition, HeroUiBlockKey, HomeSiteUiSection } from '../lib/homeSiteUi';
import {
  resolveHeroBlockPositions,
  heroBlockPositionStyle,
  homeUiTextStyle,
} from '../lib/homeSiteUi';

export type HeroLayoutPreviewCopy = {
  location: string;
  title: string;
  subtitle: string;
  description: string;
  button1: string;
  button2: string;
};

const BLOCK_LABELS: Record<HeroUiBlockKey, string> = {
  location: 'Location line',
  headline: 'Title + subtitle',
  description: 'Description',
  actions: 'Buttons row',
};

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 50;
  return Math.max(2, Math.min(98, n));
}

interface HeroLayoutEditorProps {
  backgroundImage: string;
  hero: HeroLayoutPreviewCopy;
  /** Merged hero section (defaults + overrides) for typography preview */
  heroUi: HomeSiteUiSection;
  rawBlockPositions: Partial<Record<HeroUiBlockKey, HeroBlockPosition>> | undefined;
  overlayOpacityPct: number;
  onChangePositions: (p: Record<HeroUiBlockKey, HeroBlockPosition>) => void;
}

export default function HeroLayoutEditor({
  backgroundImage,
  hero,
  heroUi,
  rawBlockPositions,
  overlayOpacityPct,
  onChangePositions,
}: HeroLayoutEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => resolveHeroBlockPositions(rawBlockPositions));
  const [dragging, setDragging] = useState<HeroUiBlockKey | null>(null);

  useEffect(() => {
    setPos(resolveHeroBlockPositions(rawBlockPositions));
  }, [rawBlockPositions]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      setPos((prev) => ({
        ...prev,
        [dragging]: { leftPct: clampPct(x), topPct: clampPct(y) },
      }));
    };
    const onUp = () => {
      setPos((current) => {
        onChangePositions(current);
        return current;
      });
      setDragging(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging, onChangePositions]);

  const startDrag = useCallback((key: HeroUiBlockKey) => {
    setDragging(key);
  }, []);

  const heroLoc = heroUi.textStyles?.location;
  const heroTitle = heroUi.textStyles?.title;
  const heroSub = heroUi.textStyles?.subtitle;
  const heroDesc = heroUi.textStyles?.description;
  const heroBtnP = heroUi.textStyles?.buttonPrimary;
  const heroBtnS = heroUi.textStyles?.buttonSecondary;

  const BlockChrome = ({
    blockKey,
    children,
  }: {
    blockKey: HeroUiBlockKey;
    children: React.ReactNode;
  }) => (
    <div
      className={`rounded border-2 border-dashed transition-colors ${
        dragging === blockKey ? 'border-[#8B6F5A] bg-white/10' : 'border-white/40 bg-black/20'
      }`}
      style={{ ...heroBlockPositionStyle(pos[blockKey]), zIndex: dragging === blockKey ? 20 : 10 }}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          startDrag(blockKey);
        }}
        className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-[#2C3539] text-white text-[9px] uppercase tracking-wider cursor-grab active:cursor-grabbing whitespace-nowrap shadow"
        aria-label={`Drag ${BLOCK_LABELS[blockKey]}`}
      >
        <GripVertical size={12} className="opacity-80" />
        {BLOCK_LABELS[blockKey]}
      </button>
      <div className="px-2 py-3 text-center pointer-events-none">{children}</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600 leading-relaxed">
        Drag the handles on each block. Positions are saved with the rest of the home content when you click{' '}
        <span className="font-semibold text-[#2C3539]">Save</span>. This preview matches the live hero overlay
        strength.
      </p>
      <div
        ref={containerRef}
        className="relative w-full rounded-sm overflow-hidden border-2 border-gray-300 bg-[#1a1a1a]"
        style={{ aspectRatio: '16 / 9', minHeight: 280 }}
      >
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            t.onerror = null;
            t.src = 'https://placehold.co/1200x675?text=Hero';
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: `rgba(0,0,0,${Math.max(0, Math.min(100, overlayOpacityPct)) / 100})`,
          }}
          aria-hidden
        />
        <div className="absolute inset-0">
          <BlockChrome blockKey="location">
            <span
              className="inline-block uppercase tracking-[0.35em] border-b border-white/20 pb-1 text-[10px]"
              style={homeUiTextStyle(heroLoc)}
            >
              {hero.location || 'Location'}
            </span>
          </BlockChrome>

          <BlockChrome blockKey="headline">
            <h2
              className="font-serif leading-[0.95] tracking-tight break-words"
              style={{
                ...homeUiTextStyle(heroTitle),
                ...(heroTitle?.fontSizePx == null ? { fontSize: 'clamp(1.25rem, 3vw + 0.5rem, 2.75rem)' } : {}),
              }}
            >
              {hero.title || 'Title'}{' '}
              <span
                className="italic opacity-90"
                style={{
                  ...homeUiTextStyle(heroSub),
                  ...(heroSub?.fontSizePx == null ? { fontSize: '1em' } : {}),
                }}
              >
                {hero.subtitle || 'Subtitle'}
              </span>
            </h2>
          </BlockChrome>

          <BlockChrome blockKey="description">
            <p
              className="font-light leading-relaxed break-words max-w-md mx-auto text-sm"
              style={{
                ...homeUiTextStyle(heroDesc),
                ...(heroDesc?.fontSizePx == null ? { fontSize: 13 } : {}),
              }}
            >
              {hero.description || 'Description text'}
            </p>
          </BlockChrome>

          <BlockChrome blockKey="actions">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center justify-center px-5 py-2 bg-white uppercase tracking-[0.2em] text-[9px]"
                style={homeUiTextStyle(heroBtnP)}
              >
                {hero.button1 || 'Primary'}
              </span>
              <span
                className="inline-flex items-center justify-center uppercase tracking-[0.2em] text-[9px] gap-2"
                style={homeUiTextStyle(heroBtnS)}
              >
                {hero.button2 || 'Secondary'}
                <ArrowRight size={12} style={{ color: heroBtnS?.colorHex || 'currentColor' }} />
              </span>
            </div>
          </BlockChrome>
        </div>
      </div>
    </div>
  );
}
