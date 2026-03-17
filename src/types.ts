export interface Villa {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  description: string;
  specs: { label: string; value: string }[];
  // Legacy single gallery array (kept for backwards compatibility)
  gallery?: string[];
  // New multi-section gallery model (used by villa pages and admin)
  gallerySections?: { title: string; images: string[] }[];
}

export { };

declare global {
  interface Window {
    aistudio?: {
      openSelectKey: () => Promise<void>;
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}
