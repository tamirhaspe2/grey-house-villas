import { Villa } from './types';
// Import villa data from JSON file so admin changes are reflected in frontend
import villasData from './data/villas.json';

// Export as VILLAS to maintain compatibility with existing imports
export const VILLAS: Villa[] = villasData as Villa[];

const normalizeVillaGallery = (villa: Villa): Villa => {
    const legacy = Array.isArray(villa.gallery) ? villa.gallery : [];
    const sections = Array.isArray(villa.gallerySections) ? villa.gallerySections : [];

    // Base: ensure at least 1 section exists
    const out: Villa = {
        ...villa,
        gallerySections: sections.length > 0 ? sections : [{ title: 'Visual Details.', images: legacy }],
    };

    // Migration safety: if sections exist but are empty while legacy gallery still has images,
    // backfill section #1 so the frontend doesn't show empty galleries.
    const hasLegacy = legacy.length > 0;
    const allSectionImagesEmpty = (out.gallerySections || []).every((s) => !Array.isArray(s.images) || s.images.length === 0);
    if (hasLegacy && allSectionImagesEmpty) {
        out.gallerySections = [
            { ...(out.gallerySections?.[0] || { title: 'Visual Details.', images: [] }), images: legacy },
            ...(out.gallerySections || []).slice(1),
        ];
    }

    // Oneiro should always have two accordions (2nd can be empty for custom content)
    if (out.id === 'villa-oneiro') {
        const sections = out.gallerySections || [];
        if (sections.length < 2) {
            out.gallerySections = [...sections, { title: '', images: [] }];
        }
    }

    // Petra should stay as a single accordion
    if (out.id === 'villa-petra') {
        out.gallerySections = (out.gallerySections || []).slice(0, 1);
    }

    return out;
};

// Also provide async function to fetch from API (for dynamic updates)
export async function getVillas(): Promise<Villa[]> {
    try {
        const res = await fetch('/api/villas');
        if (!res.ok) throw new Error('Failed to fetch villas');
        const data = await res.json();
        return (data as Villa[]).map(normalizeVillaGallery);
    } catch (error) {
        console.error("Error fetching villas:", error);
        // Fallback to local data
        return (VILLAS as Villa[]).map(normalizeVillaGallery);
    }
}
