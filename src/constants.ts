import { Villa } from './types';
// Import villa data from JSON file so admin changes are reflected in frontend
import villasData from './data/villas.json';

// Export as VILLAS to maintain compatibility with existing imports
export const VILLAS: Villa[] = villasData as Villa[];

const normalizeVillaGallery = (villa: Villa): Villa => {
    if (Array.isArray(villa.gallerySections) && villa.gallerySections.length > 0) return villa;
    const legacy = Array.isArray(villa.gallery) ? villa.gallery : [];
    const out: Villa = {
        ...villa,
        gallerySections: [{ title: 'Visual Details.', images: legacy }],
    };
    // Oneiro should always have two accordions (2nd can be empty for custom content)
    if (out.id === 'villa-oneiro') {
        const sections = out.gallerySections || [];
        if (sections.length < 2) {
            out.gallerySections = [...sections, { title: '', images: [] }];
        }
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
