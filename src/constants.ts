import { Villa } from './types';
// Import villa data from JSON file so admin changes are reflected in frontend
import villasData from './data/villas.json';

// Export as VILLAS to maintain compatibility with existing imports
export const VILLAS: Villa[] = villasData as Villa[];

// Also provide async function to fetch from API (for dynamic updates)
export async function getVillas(): Promise<Villa[]> {
    try {
        const res = await fetch('/api/villas');
        if (!res.ok) throw new Error('Failed to fetch villas');
        const data = await res.json();
        return data as Villa[];
    } catch (error) {
        console.error("Error fetching villas:", error);
        // Fallback to local data
        return VILLAS;
    }
}
