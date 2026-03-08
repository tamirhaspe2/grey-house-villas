export interface Villa {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  description: string;
  specs: { label: string; value: string }[];
  gallery: string[];
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
