// Import villa data from JSON file so admin changes are reflected in frontend
import villasData from './data/villas.json';
import { Villa } from './types';

// Export as VILLAS to maintain compatibility with existing imports
export const VILLAS: Villa[] = villasData as Villa[];
