import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Save, LogOut, Check, X, Image as ImageIcon, Home as HomeIcon, CreditCard } from 'lucide-react';
import villasData from '../data/villas.json';
import homeDataDefault from '../data/home.json';
import bookingPricingDefault from '../data/bookingPricing.json';
import { Villa } from '../types';
import type { BookingPricingConfig, BookingSeason, PackageCode } from '../lib/bookingPricing';
import type { AdminContentLocale } from '../lib/cmsLocaleTypes';
import { ADMIN_CONTENT_LOCALE_OPTIONS } from '../lib/cmsLocaleTypes';
import { editHomeAtPath, readHomeAtPath, readHomeFieldForAdmin } from '../lib/cmsHomeLocale';
import {
    readVillaName,
    readVillaSubtitleForAdmin,
    readVillaDescriptionForAdmin,
    readVillaNameForAdmin,
    writeVillaSubtitle,
    writeVillaDescription,
    writeVillaName,
    readVillaSpecForAdmin,
    writeVillaSpecField,
    removeVillaSpec,
    addVillaSpec,
    readVillaGalleryTitleForAdmin,
    writeVillaGalleryTitle,
    removeVillaGallerySection,
} from '../lib/adminVillaLocale';
import i18n, { applyDocumentLang } from '../i18n';

interface HomeData {
    hero: {
        backgroundImage: string;
        location: string;
        title: string;
        subtitle: string;
        description: string;
        button1?: string;
        button2: string;
        videoUrl?: string;
    };
    philosophy: {
        sectionLabel: string;
        heading: string;
        headingHighlight: string;
        paragraph1: string;
        paragraph2: string;
        quote: string;
        mainImage: string;
        detailImage: string;
    };
    interior: {
        sectionLabel: string;
        heading: string;
        headingHighlight: string;
        description: string;
        features: string[];
        buttonText: string;
        image1: string;
        image2: string;
    };
    gallery: {
        sectionLabel: string;
        heading: string;
        headingHighlight: string;
        description: string;
        images: string[];
    };
    residences: {
        sectionLabel: string;
        heading: string;
    };
    footer?: {
        brandName: string;
        brandTagline: string;
        social: {
            instagramUrl: string;
            facebookUrl: string;
            linkedinUrl?: string;
        };
        directInquiriesTitle: string;
        email: string;
        phone: string;
        addressLine1: string;
        addressLine2: string;
        registerInterestTitle: string;
        copyright: string;
        privacyLabel: string;
        privacyUrl: string;
        disclaimerLabel: string;
        disclaimerUrl: string;
    };
    localeStrings?: Partial<Record<'fr' | 'he' | 'el', Record<string, unknown>>>;
}

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // IMPORTANT: don't trust bundled JSON in production; always sync from /api/villas after login
    const [villas, setVillas] = useState<Villa[]>([]);
    const [activeVilla, setActiveVilla] = useState<string>('');
    const [activeSection, setActiveSection] = useState<'villas' | 'home' | 'booking'>('villas');
    const [homeData, setHomeData] = useState<HomeData>(homeDataDefault as HomeData);
    const [bookingPricing, setBookingPricing] = useState<BookingPricingConfig>(
        bookingPricingDefault as BookingPricingConfig
    );
    /** Which language’s CMS copy is being edited (Admin UI stays English / LTR). */
    const [adminContentLocale, setAdminContentLocale] = useState<AdminContentLocale>('en');

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [uploadingImage, setUploadingImage] = useState<string | null>(null); // Track which image is uploading
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null); // For drag-and-drop reorder feedback

    useEffect(() => {
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
        return () => {
            applyDocumentLang(i18n.language);
        };
    }, []);

    // Reorder array: move item from fromIndex to toIndex (used for gallery drag-and-drop)
    const reorderArray = <T,>(arr: T[], fromIndex: number, toIndex: number): T[] => {
        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length || toIndex >= arr.length) return arr;
        const out = [...arr];
        const [item] = out.splice(fromIndex, 1);
        out.splice(toIndex, 0, item);
        return out;
    };

    // Move image between accordions (or within) and return updated sections
    const moveGalleryImage = (
        sections: { title: string; images: string[] }[],
        fromSectionIdx: number,
        fromIdx: number,
        toSectionIdx: number,
        toIdx: number
    ): { title: string; images: string[] }[] => {
        if (!Array.isArray(sections) || sections.length === 0) return sections;
        if (!sections[fromSectionIdx] || !sections[toSectionIdx]) return sections;

        const out = sections.map((s) => ({ ...s, images: Array.isArray(s.images) ? [...s.images] : [] }));
        const fromImages = out[fromSectionIdx].images;
        const toImages = out[toSectionIdx].images;

        if (fromIdx < 0 || fromIdx >= fromImages.length) return sections;

        const [moved] = fromImages.splice(fromIdx, 1);
        if (typeof moved !== 'string') return sections;

        const safeToIdx = Math.max(0, Math.min(toIdx, toImages.length));
        toImages.splice(safeToIdx, 0, moved);

        out[fromSectionIdx] = { ...out[fromSectionIdx], images: fromImages };
        out[toSectionIdx] = { ...out[toSectionIdx], images: toImages };
        return out;
    };

    const normalizeVillaGallerySections = (villa: Villa): Villa => {
        const legacy = Array.isArray((villa as any).gallery) ? (villa as any).gallery : [];
        const sections = Array.isArray((villa as any).gallerySections) ? (villa as any).gallerySections : [];

        const out = {
            ...villa,
            gallerySections: sections.length > 0 ? sections : [{ title: 'Visual Details.', images: legacy }],
        } as any;

        const hasLegacy = legacy.length > 0;
        const allSectionImagesEmpty = (out.gallerySections || []).every((s: any) => !Array.isArray(s.images) || s.images.length === 0);
        if (hasLegacy && allSectionImagesEmpty) {
            out.gallerySections = [
                { ...(out.gallerySections?.[0] || { title: 'Visual Details.', images: [] }), images: legacy },
                ...(out.gallerySections || []).slice(1),
            ];
        }

        // Lock Petra to one accordion in Admin
        if (out.id === 'villa-petra') {
            out.gallerySections = (out.gallerySections || []).slice(0, 1);
        }

        return out;
    };

    // Load home data on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetch('/api/home')
                .then(res => res.json())
                .then(data => setHomeData(data))
                .catch(() => setHomeData(homeDataDefault as HomeData));
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetch('/api/booking-pricing', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (data && Array.isArray(data.seasons)) {
                    setBookingPricing(data as BookingPricingConfig);
                }
            })
            .catch(() => setBookingPricing(bookingPricingDefault as BookingPricingConfig));
    }, [isAuthenticated]);

    // Load villas data on mount (after auth)
    useEffect(() => {
        if (!isAuthenticated) return;

        fetch('/api/villas', { cache: 'no-store' })
            .then(res => res.json())
            .then((data: Villa[]) => {
                const base = Array.isArray(data) && data.length ? data : (villasData as Villa[]);
                const nextVillas = base.map(normalizeVillaGallerySections).map((v) => {
                    // Oneiro should start with two gallery accordions (2nd can be empty; user will fill it)
                    if (v.id === 'villa-oneiro') {
                        const sections = Array.isArray((v as any).gallerySections) ? (v as any).gallerySections : [];
                        if (sections.length < 2) {
                            return {
                                ...v,
                                gallerySections: [...sections, { title: '', images: [] }],
                            } as any;
                        }
                    }
                    return v;
                });
                setVillas(nextVillas);

                // Keep current selection if it still exists; otherwise fall back to first villa
                setActiveVilla(prev => {
                    const stillExists = prev && nextVillas.some(v => v.id === prev);
                    return stillExists ? prev : (nextVillas[0]?.id ?? '');
                });
            })
            .catch(() => {
                const fallback = (villasData as Villa[]).map(normalizeVillaGallerySections).map((v) => {
                    if (v.id === 'villa-oneiro') {
                        const sections = Array.isArray((v as any).gallerySections) ? (v as any).gallerySections : [];
                        if (sections.length < 2) {
                            return { ...v, gallerySections: [...sections, { title: '', images: [] }] } as any;
                        }
                    }
                    return v;
                });
                setVillas(fallback);
                setActiveVilla(prev => prev || (fallback[0]?.id ?? ''));
            });
    }, [isAuthenticated]);

    // Verify auth on mount
    useEffect(() => {
        // A simple check if they have the cookie might not be possible from client side if httpOnly,
        // so we assume they need to login unless a test call succeeds.
        // For simplicity in this demo, we'll just require login on refresh.
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                setIsAuthenticated(true);
                setLoginError('');
            } else {
                setLoginError('Invalid password');
            }
        } catch (err) {
            setLoginError('Connection error');
        }
    };

    const currentVilla = villas.find(v => v.id === activeVilla);

    const isEditingEnglish = adminContentLocale === 'en';

    const updateHomePath = useCallback(
        (path: string[], value: unknown) => {
            setHomeData((prev) =>
                editHomeAtPath(prev as unknown as Record<string, unknown>, adminContentLocale, path, value) as unknown as HomeData
            );
        },
        [adminContentLocale]
    );

    const homeText = useCallback(
        (path: string[]): string => {
            const raw = readHomeFieldForAdmin(homeData as unknown as Record<string, unknown>, adminContentLocale, path);
            if (raw == null) return '';
            return String(raw);
        },
        [homeData, adminContentLocale]
    );

    const homeTextPh = useCallback(
        (path: string[]): string | undefined => {
            if (adminContentLocale === 'en') return undefined;
            const v = readHomeAtPath(homeData as unknown as Record<string, unknown>, 'en', path);
            if (v == null || String(v) === '') return 'Uses English when empty';
            const s = String(v);
            return s.length > 120 ? `EN: ${s.slice(0, 120)}…` : `EN: ${s}`;
        },
        [homeData, adminContentLocale]
    );

    const homeFeaturesLines = useCallback((): string => {
        const raw = readHomeFieldForAdmin(homeData as unknown as Record<string, unknown>, adminContentLocale, [
            'interior',
            'features',
        ]);
        if (Array.isArray(raw)) return (raw as string[]).join('\n');
        return '';
    }, [homeData, adminContentLocale]);

    const handleImageUpload = async (file: File, folder: string, index: number | 'hero' | 'new', sectionIndex?: number) => {
        if (adminContentLocale !== 'en') {
            alert('Set “Content language” to English to upload or reorder images.');
            return;
        }
        // Create unique key for this upload
        const uploadKey =
            index === 'hero'
                ? `hero-${activeVilla}`
                : `gallery-${activeVilla}-${typeof sectionIndex === 'number' ? `s${sectionIndex}-` : ''}${index}`;

        // Validate file
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image size must be less than 10MB.');
            return;
        }

        // Validate folder
        if (!folder || folder.trim() === '') {
            alert('Could not determine folder for this image. Please refresh and try again.');
            return;
        }

        setUploadingImage(uploadKey);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const url = data.url;

                if (!url) {
                    alert('Upload succeeded but no URL returned.');
                    setUploadingImage(null);
                    return;
                }

                // Ensure local URLs start with /, keep absolute URLs as is
                const imageUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : (url.startsWith('/') ? url : `/${url}`);

                // Update local state with new image URL - use functional update to ensure we have latest state
                setVillas(prevVillas => {
                    const updatedVillas = [...prevVillas];
                    const villaIndex = updatedVillas.findIndex(v => v.id === activeVilla);

                    if (villaIndex === -1) {
                        console.error('Villa not found:', activeVilla);
                        return prevVillas; // Return unchanged state
                    }

                    if (index === 'hero') {
                        updatedVillas[villaIndex] = {
                            ...updatedVillas[villaIndex],
                            image: imageUrl
                        };
                    } else {
                        // Prefer new multi-section model when present; fall back to legacy `gallery`
                        const hasSections = Array.isArray((updatedVillas[villaIndex] as any).gallerySections);
                        if (hasSections) {
                            const sections = [...((updatedVillas[villaIndex] as any).gallerySections || [])];
                            const sIdx = typeof sectionIndex === 'number' ? sectionIndex : 0;
                            if (!sections[sIdx]) sections[sIdx] = { title: '', images: [] };
                            const images = [...(sections[sIdx].images || [])];

                            if (index === 'new') {
                                images.push(imageUrl);
                            } else {
                                const imgIdx = index as number;
                                images[imgIdx] = imageUrl;
                            }

                            sections[sIdx] = { ...sections[sIdx], images };
                            updatedVillas[villaIndex] = { ...(updatedVillas[villaIndex] as any), gallerySections: sections } as any;
                        } else {
                            if (index === 'new') {
                                if (!(updatedVillas[villaIndex] as any).gallery) {
                                    (updatedVillas[villaIndex] as any).gallery = [];
                                }
                                updatedVillas[villaIndex] = {
                                    ...updatedVillas[villaIndex],
                                    gallery: [...((updatedVillas[villaIndex] as any).gallery || []), imageUrl]
                                } as any;
                            } else {
                                const galleryIndex = index as number;
                                if (!(updatedVillas[villaIndex] as any).gallery) {
                                    (updatedVillas[villaIndex] as any).gallery = [];
                                }
                                const newGallery = [...((updatedVillas[villaIndex] as any).gallery || [])];
                                newGallery[galleryIndex] = imageUrl;
                                updatedVillas[villaIndex] = {
                                    ...updatedVillas[villaIndex],
                                    gallery: newGallery
                                } as any;
                            }
                        }
                    }

                    return updatedVillas;
                });
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                if (res.status === 401) {
                    alert('Upload failed: You are not authenticated. Please log in again.');
                    setIsAuthenticated(false);
                } else {
                    alert(`Upload failed: ${errorData.error || 'Server error'}`);
                }
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload error: Could not connect to server. Please check your connection.');
        } finally {
            setUploadingImage(null);
        }
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            if (activeSection === 'villas') {
                const res = await fetch('/api/admin/villas', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(villas)
                });

                if (res.ok) {
                    setSaveStatus('success');
                    // Notify the rest of the app to refresh villa data (so Live/local update is instant)
                    window.dispatchEvent(new Event('villas:updated'));
                    setTimeout(() => setSaveStatus('idle'), 3000);
                } else {
                    setSaveStatus('error');
                }
            } else if (activeSection === 'home') {
                const res = await fetch('/api/admin/home', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(homeData)
                });

                if (res.ok) {
                    setSaveStatus('success');
                    setTimeout(() => setSaveStatus('idle'), 3000);
                    window.dispatchEvent(new Event('home:updated'));
                } else {
                    setSaveStatus('error');
                }
            } else if (activeSection === 'booking') {
                const res = await fetch('/api/admin/booking-pricing', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(bookingPricing)
                });

                if (res.ok) {
                    setSaveStatus('success');
                    window.dispatchEvent(new Event('booking-pricing:updated'));
                    setTimeout(() => setSaveStatus('idle'), 3000);
                } else {
                    setSaveStatus('error');
                }
            }
        } catch (err) {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleHomeImageUpload = async (file: File, imageKey: string, folder: string = '') => {
        if (adminContentLocale !== 'en') {
            alert('Set “Content language” to English to change home images or video.');
            return;
        }
        // Validate file
        if (!file || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
            alert('Please select a valid image or video file.');
            return;
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB.');
            return;
        }

        // Use 'home' folder for home page images, or provided folder
        const uploadFolder = folder || 'home';
        setUploadingImage(`home-${imageKey}`);
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', uploadFolder);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const url = data.url;

                if (!url) {
                    alert('Upload succeeded but no URL returned.');
                    setUploadingImage(null);
                    return;
                }

                // Ensure local URLs start with /, keep absolute URLs as is
                const imageUrl = (url.startsWith('http://') || url.startsWith('https://')) ? url : (url.startsWith('/') ? url : `/${url}`);

                // Update home data state
                setHomeData(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData)); // Deep clone
                    const keys = imageKey.split('.');

                    // Handle array indices (e.g., gallery.images.0)
                    if (keys.length === 3 && keys[0] === 'gallery' && keys[1] === 'images') {
                        const index = parseInt(keys[2]);
                        newData.gallery.images[index] = imageUrl;
                    } else {
                        // Handle nested object properties
                        let current: any = newData;
                        for (let i = 0; i < keys.length - 1; i++) {
                            current = current[keys[i]];
                        }
                        current[keys[keys.length - 1]] = imageUrl;
                    }

                    return newData;
                });
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                if (res.status === 401) {
                    alert('Upload failed: You are not authenticated. Please log in again.');
                    setIsAuthenticated(false);
                } else {
                    alert(`Upload failed: ${errorData.error || 'Server error'}`);
                }
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Upload error: Could not connect to server. Please check your connection.');
        } finally {
            setUploadingImage(null);
        }
    };

    // ---------------------------------------------------------------------------
    // LOGIN SCREEN
    // ---------------------------------------------------------------------------
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white p-12 shadow-xl border border-gray-100">
                    <div className="text-center mb-10">
                        <h1 className="font-serif text-3xl tracking-wider text-[#2C3539] uppercase">Grey House</h1>
                        <p className="text-[10px] tracking-[0.4em] text-[#A89F91] mt-2 uppercase">Admin Portal</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter Admin Password"
                                className="w-full bg-transparent border-b border-gray-300 py-3 text-center focus:border-[#2C3539] outline-none transition-colors"
                                autoFocus
                            />
                        </div>
                        {loginError && <p className="text-rose-500 text-xs text-center">{loginError}</p>}
                        <button
                            type="submit"
                            className="w-full bg-[#2C3539] text-white py-4 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#8B6F5A] transition-colors"
                        >
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // DASHBOARD SCREEN
    // ---------------------------------------------------------------------------
    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-32">
            {/* Admin Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="font-serif text-xl tracking-wider text-[#2C3539] uppercase">Grey House</h1>
                        <span className="text-[10px] tracking-[0.4em] text-[#A89F91] uppercase border-l border-gray-200 pl-4 hidden md:block">Admin</span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5 flex-wrap justify-end">
                        <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#2C3539] font-bold">
                            <span className="hidden sm:inline">Content language</span>
                            <select
                                value={adminContentLocale}
                                onChange={(e) => setAdminContentLocale(e.target.value as AdminContentLocale)}
                                className="border border-gray-200 px-2 py-2 rounded-sm bg-white text-xs font-normal normal-case tracking-normal min-w-[9rem]"
                            >
                                {ADMIN_CONTENT_LOCALE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex items-center gap-3">
                            {saveStatus === 'success' && <span className="text-emerald-500 text-xs flex items-center gap-1"><Check size={14} /> Saved!</span>}
                            {saveStatus === 'error' && <span className="text-rose-500 text-xs flex items-center gap-1"><X size={14} /> Error</span>}
                            <button
                                onClick={handleSaveAll}
                                disabled={isSaving}
                                className="flex items-center gap-2 bg-[#8B6F5A] hover:bg-[#2C3539] text-white px-4 md:px-6 py-2.5 rounded-sm text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                <Save size={14} />
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                        <button onClick={() => setIsAuthenticated(false)} className="text-gray-400 hover:text-[#2C3539] transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {!isEditingEnglish && (
                <div className="bg-amber-50 border-b border-amber-200 text-amber-950 text-center text-xs py-2.5 px-4 leading-relaxed">
                    Editing{' '}
                    <strong>{ADMIN_CONTENT_LOCALE_OPTIONS.find((o) => o.value === adminContentLocale)?.label}</strong>{' '}
                    copy. Text fields show what visitors see for this language (locale files plus any saved CMS overrides). Save updates overrides only for this language. Switch to English to change images, gallery layout, or specs list length.
                </div>
            )}

            <div className="max-w-[1800px] mx-auto px-6 mt-12 grid lg:grid-cols-4 gap-12">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 border-r border-gray-200 pr-0 lg:pr-8">
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#A89F91] font-bold mb-6">Navigation</h3>

                    {/* Section Selector */}
                    <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible space-x-2 lg:space-x-0 lg:space-y-2 pb-4 lg:pb-0 mb-8">
                        <button
                            onClick={() => setActiveSection('home')}
                            className={`text-left px-4 py-3 rounded-sm text-sm transition-all whitespace-nowrap lg:whitespace-normal flex items-center gap-2 ${activeSection === 'home' ? 'bg-[#2C3539] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <HomeIcon size={16} />
                            Home Page
                        </button>
                        <button
                            onClick={() => setActiveSection('villas')}
                            className={`text-left px-4 py-3 rounded-sm text-sm transition-all whitespace-nowrap lg:whitespace-normal ${activeSection === 'villas' ? 'bg-[#2C3539] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Villas
                        </button>
                        <button
                            onClick={() => setActiveSection('booking')}
                            className={`text-left px-4 py-3 rounded-sm text-sm transition-all whitespace-nowrap lg:whitespace-normal flex items-center gap-2 ${activeSection === 'booking' ? 'bg-[#2C3539] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <CreditCard size={16} />
                            Booking
                        </button>
                    </div>

                    {/* Villa Selector (only show when villas section is active) */}
                    {activeSection === 'villas' && (
                        <>
                            <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#A89F91] font-bold mb-6 mt-8">Select Villa</h3>
                            <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible space-x-2 lg:space-x-0 lg:space-y-2 pb-4 lg:pb-0 mb-8 lg:mb-0">
                                {villas.map(villa => (
                                    <button
                                        key={villa.id}
                                        onClick={() => setActiveVilla(villa.id)}
                                        className={`text-left px-4 py-3 rounded-sm text-sm transition-all whitespace-nowrap lg:whitespace-normal ${activeVilla === villa.id ? 'bg-[#2C3539] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {villa.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="hidden lg:block mt-24 p-5 bg-stone-100/50 border border-stone-200 rounded-sm">
                        <p className="text-xs text-stone-600 leading-relaxed font-serif italic text-center">
                            "Architecture is a visual diary of spaces lived."
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    {activeSection === 'home' ? (
                        /* HOME PAGE EDITOR */
                        <div className="space-y-12">
                            {/* Hero Section */}
                            <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-12">Home Page - Hero Section</h2>

                                {/* Hero Background Image */}
                                <div className="mb-8">
                                    <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Hero Background Image</h3>
                                    <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[21/9]">
                                        {uploadingImage === 'home-hero.backgroundImage' && (
                                            <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                <div className="text-white text-sm">Uploading...</div>
                                            </div>
                                        )}
                                        <img
                                            key={homeData.hero.backgroundImage}
                                            src={homeData.hero.backgroundImage}
                                            alt="Hero background"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null; // Prevent infinite loops
                                                console.error('Hero background image failed to load:', homeData.hero.backgroundImage);
                                                target.src = 'https://placehold.co/1200x800?text=Missing+Image';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                            <ImageIcon className="text-white drop-shadow-md" size={40} strokeWidth={1.5} />
                                            <label className={`cursor-pointer bg-white text-[#2C3539] px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#8B6F5A] hover:text-white transition-colors ${uploadingImage === 'home-hero.backgroundImage' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                {uploadingImage === 'home-hero.backgroundImage' ? 'Uploading...' : 'Upload Replacement'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    disabled={uploadingImage === 'home-hero.backgroundImage'}
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleHomeImageUpload(e.target.files[0], 'hero.backgroundImage', 'home');
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Hero Floating Video */}
                                <div className="mb-8">
                                    <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Hero Floating Video (Optional)</h3>
                                    <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-video max-w-sm bg-gray-50 flex items-center justify-center">
                                        {uploadingImage === 'home-hero.videoUrl' && (
                                            <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                <div className="text-white text-sm">Uploading...</div>
                                            </div>
                                        )}
                                        {homeData.hero.videoUrl ? (
                                            <video
                                                src={homeData.hero.videoUrl}
                                                className="w-full h-full object-cover"
                                                controls
                                                muted
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs uppercase tracking-widest">No Video Selected</span>
                                        )}
                                        <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 ${!homeData.hero.videoUrl ? 'opacity-100 bg-transparent' : ''}`}>
                                            <ImageIcon className="text-[#2C3539] drop-shadow-md hidden" size={40} strokeWidth={1.5} />
                                            <label className={`cursor-pointer bg-white text-[#2C3539] px-6 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#2C3539] hover:bg-[#8B6F5A] hover:text-white hover:border-[#8B6F5A] transition-colors shadow-sm ${uploadingImage === 'home-hero.videoUrl' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                {uploadingImage === 'home-hero.videoUrl' ? 'Uploading...' : (homeData.hero.videoUrl ? 'Replace Video' : 'Upload Video')}
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    className="hidden"
                                                    disabled={uploadingImage === 'home-hero.videoUrl'}
                                                    onChange={(e) => {
                                                        if (e.target.files?.[0]) {
                                                            handleHomeImageUpload(e.target.files[0], 'hero.videoUrl', 'home');
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {homeData.hero.videoUrl && isEditingEnglish && (
                                                <button
                                                    onClick={() => setHomeData(prev => ({ ...prev, hero: { ...prev.hero, videoUrl: '' } }))}
                                                    className="text-white text-[10px] uppercase tracking-widest hover:text-rose-400 transition-colors"
                                                >
                                                    Remove Video
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Hero Text Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Location</label>
                                        <input
                                            type="text"
                                            value={homeText(['hero', 'location'])}
                                            placeholder={homeTextPh(['hero', 'location'])}
                                            onChange={(e) => updateHomePath(['hero', 'location'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={homeText(['hero', 'title'])}
                                            placeholder={homeTextPh(['hero', 'title'])}
                                            onChange={(e) => updateHomePath(['hero', 'title'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Subtitle</label>
                                        <input
                                            type="text"
                                            value={homeText(['hero', 'subtitle'])}
                                            placeholder={homeTextPh(['hero', 'subtitle'])}
                                            onChange={(e) => updateHomePath(['hero', 'subtitle'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                        <textarea
                                            value={homeText(['hero', 'description'])}
                                            placeholder={homeTextPh(['hero', 'description'])}
                                            onChange={(e) => updateHomePath(['hero', 'description'], e.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Button 1 Text</label>
                                            <input
                                                type="text"
                                                value={homeText(['hero', 'button1'])}
                                                placeholder={homeTextPh(['hero', 'button1'])}
                                                onChange={(e) => updateHomePath(['hero', 'button1'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Button 2 Text</label>
                                            <input
                                                type="text"
                                                value={homeText(['hero', 'button2'])}
                                                placeholder={homeTextPh(['hero', 'button2'])}
                                                onChange={(e) => updateHomePath(['hero', 'button2'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Philosophy Section */}
                            <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-12">Philosophy Section</h2>

                                {/* Philosophy Images */}
                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-4">Main Image</h3>
                                        <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[4/5]">
                                            {uploadingImage === 'home-philosophy.mainImage' && (
                                                <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                    <div className="text-white text-sm">Uploading...</div>
                                                </div>
                                            )}
                                            <img
                                                key={homeData.philosophy.mainImage}
                                                src={homeData.philosophy.mainImage}
                                                alt="Philosophy main"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className={`cursor-pointer bg-white text-[#2C3539] px-4 py-2 text-xs font-bold uppercase ${uploadingImage === 'home-philosophy.mainImage' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    Replace
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        disabled={uploadingImage === 'home-philosophy.mainImage'}
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                handleHomeImageUpload(e.target.files[0], 'philosophy.mainImage', 'home');
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-4">Detail Image</h3>
                                        <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[4/5]">
                                            {uploadingImage === 'home-philosophy.detailImage' && (
                                                <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                    <div className="text-white text-sm">Uploading...</div>
                                                </div>
                                            )}
                                            <img
                                                key={homeData.philosophy.detailImage}
                                                src={homeData.philosophy.detailImage}
                                                alt="Philosophy detail"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className={`cursor-pointer bg-white text-[#2C3539] px-4 py-2 text-xs font-bold uppercase ${uploadingImage === 'home-philosophy.detailImage' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    Replace
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        disabled={uploadingImage === 'home-philosophy.detailImage'}
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                handleHomeImageUpload(e.target.files[0], 'philosophy.detailImage', 'home');
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Philosophy Text Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Section Label</label>
                                        <input
                                            type="text"
                                            value={homeText(['philosophy', 'sectionLabel'])}
                                            placeholder={homeTextPh(['philosophy', 'sectionLabel'])}
                                            onChange={(e) => updateHomePath(['philosophy', 'sectionLabel'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                            <input
                                                type="text"
                                                value={homeText(['philosophy', 'heading'])}
                                                placeholder={homeTextPh(['philosophy', 'heading'])}
                                                onChange={(e) => updateHomePath(['philosophy', 'heading'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading Highlight</label>
                                            <input
                                                type="text"
                                                value={homeText(['philosophy', 'headingHighlight'])}
                                                placeholder={homeTextPh(['philosophy', 'headingHighlight'])}
                                                onChange={(e) => updateHomePath(['philosophy', 'headingHighlight'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Paragraph 1</label>
                                        <textarea
                                            value={homeText(['philosophy', 'paragraph1'])}
                                            placeholder={homeTextPh(['philosophy', 'paragraph1'])}
                                            onChange={(e) => updateHomePath(['philosophy', 'paragraph1'], e.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Paragraph 2</label>
                                        <textarea
                                            value={homeText(['philosophy', 'paragraph2'])}
                                            placeholder={homeTextPh(['philosophy', 'paragraph2'])}
                                            onChange={(e) => updateHomePath(['philosophy', 'paragraph2'], e.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Quote</label>
                                        <input
                                            type="text"
                                            value={homeText(['philosophy', 'quote'])}
                                            placeholder={homeTextPh(['philosophy', 'quote'])}
                                            onChange={(e) => updateHomePath(['philosophy', 'quote'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Interior Section */}
                            <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-12">Interior Section</h2>

                                {/* Interior Images */}
                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-4">Image 1</h3>
                                        <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[3/4]">
                                            {uploadingImage === 'home-interior.image1' && (
                                                <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                    <div className="text-white text-sm">Uploading...</div>
                                                </div>
                                            )}
                                            <img
                                                key={homeData.interior.image1}
                                                src={homeData.interior.image1}
                                                alt="Interior 1"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className={`cursor-pointer bg-white text-[#2C3539] px-4 py-2 text-xs font-bold uppercase ${uploadingImage === 'home-interior.image1' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    Replace
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        disabled={uploadingImage === 'home-interior.image1'}
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                handleHomeImageUpload(e.target.files[0], 'interior.image1', 'home');
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-4">Image 2</h3>
                                        <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[3/4]">
                                            {uploadingImage === 'home-interior.image2' && (
                                                <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                    <div className="text-white text-sm">Uploading...</div>
                                                </div>
                                            )}
                                            <img
                                                key={homeData.interior.image2}
                                                src={homeData.interior.image2}
                                                alt="Interior 2"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <label className={`cursor-pointer bg-white text-[#2C3539] px-4 py-2 text-xs font-bold uppercase ${uploadingImage === 'home-interior.image2' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    Replace
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        disabled={uploadingImage === 'home-interior.image2'}
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                handleHomeImageUpload(e.target.files[0], 'interior.image2', 'home');
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Interior Text Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Section Label</label>
                                        <input
                                            type="text"
                                            value={homeText(['interior', 'sectionLabel'])}
                                            placeholder={homeTextPh(['interior', 'sectionLabel'])}
                                            onChange={(e) => updateHomePath(['interior', 'sectionLabel'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                            <input
                                                type="text"
                                                value={homeText(['interior', 'heading'])}
                                                placeholder={homeTextPh(['interior', 'heading'])}
                                                onChange={(e) => updateHomePath(['interior', 'heading'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading Highlight</label>
                                            <input
                                                type="text"
                                                value={homeText(['interior', 'headingHighlight'])}
                                                placeholder={homeTextPh(['interior', 'headingHighlight'])}
                                                onChange={(e) => updateHomePath(['interior', 'headingHighlight'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                        <textarea
                                            value={homeText(['interior', 'description'])}
                                            placeholder={homeTextPh(['interior', 'description'])}
                                            onChange={(e) => updateHomePath(['interior', 'description'], e.target.value)}
                                            rows={4}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Features (one per line)</label>
                                        <textarea
                                            value={homeFeaturesLines()}
                                            placeholder={
                                                adminContentLocale === 'en'
                                                    ? undefined
                                                    : homeData.interior.features.length
                                                      ? `EN sample: ${homeData.interior.features[0]?.slice(0, 60) ?? ''}…`
                                                      : 'Uses English when empty'
                                            }
                                            onChange={(e) =>
                                                updateHomePath(
                                                    ['interior', 'features'],
                                                    e.target.value.split('\n').filter((f) => f.trim())
                                                )
                                            }
                                            rows={6}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Button Text</label>
                                        <input
                                            type="text"
                                            value={homeText(['interior', 'buttonText'])}
                                            placeholder={homeTextPh(['interior', 'buttonText'])}
                                            onChange={(e) => updateHomePath(['interior', 'buttonText'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Gallery Section */}
                            <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-12">Gallery Section</h2>

                                {/* Gallery Text Fields */}
                                <div className="space-y-6 mb-8">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Section Label</label>
                                        <input
                                            type="text"
                                            value={homeText(['gallery', 'sectionLabel'])}
                                            placeholder={homeTextPh(['gallery', 'sectionLabel'])}
                                            onChange={(e) => updateHomePath(['gallery', 'sectionLabel'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                            <input
                                                type="text"
                                                value={homeText(['gallery', 'heading'])}
                                                placeholder={homeTextPh(['gallery', 'heading'])}
                                                onChange={(e) => updateHomePath(['gallery', 'heading'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading Highlight</label>
                                            <input
                                                type="text"
                                                value={homeText(['gallery', 'headingHighlight'])}
                                                placeholder={homeTextPh(['gallery', 'headingHighlight'])}
                                                onChange={(e) => updateHomePath(['gallery', 'headingHighlight'], e.target.value)}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                        <textarea
                                            value={homeText(['gallery', 'description'])}
                                            placeholder={homeTextPh(['gallery', 'description'])}
                                            onChange={(e) => updateHomePath(['gallery', 'description'], e.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Gallery Images - drag to reorder, order saved on Save Changes */}
                                <div>
                                    <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Gallery Images ({homeData.gallery.images.length}) — drag to reorder</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {homeData.gallery.images.map((img, idx) => {
                                            const isUploading = uploadingImage === `home-gallery.images.${idx}`;
                                            return (
                                                <div
                                                    key={img}
                                                    draggable={isEditingEnglish}
                                                    onDragStart={(e) => {
                                                        if (!isEditingEnglish) return;
                                                        e.dataTransfer.setData('text/plain', String(idx));
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onDragOver={(e) => {
                                                        if (!isEditingEnglish) return;
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        setDragOverIndex(idx);
                                                    }}
                                                    onDragLeave={() => setDragOverIndex(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (!isEditingEnglish) {
                                                            setDragOverIndex(null);
                                                            return;
                                                        }
                                                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                                                        if (Number.isNaN(from) || from === idx) {
                                                            setDragOverIndex(null);
                                                            return;
                                                        }
                                                        const reordered = reorderArray(homeData.gallery.images, from, idx);
                                                        setHomeData({ ...homeData, gallery: { ...homeData.gallery, images: reordered } });
                                                        setDragOverIndex(null);
                                                    }}
                                                    className={`relative group rounded-sm overflow-hidden border aspect-[4/5] select-none ${isEditingEnglish ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${dragOverIndex === idx ? 'border-[#8B6F5A] ring-2 ring-[#8B6F5A]/40' : 'border-gray-200'}`}
                                                >
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                            <div className="text-white text-xs">Uploading...</div>
                                                        </div>
                                                    )}
                                                    <img
                                                        src={img}
                                                        alt={`Gallery ${idx + 1}`}
                                                        draggable={false}
                                                        className="w-full h-full object-cover pointer-events-none"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.onerror = null; // Prevent infinite loops
                                                            console.error('Gallery image failed to load:', img);
                                                            target.src = 'https://placehold.co/600x400?text=Missing+Image';
                                                        }}
                                                    />
                                                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm backdrop-blur-sm z-10 transition-opacity group-hover:opacity-0">
                                                        Image {idx + 1}
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 z-20">
                                                        <Camera className="text-white drop-shadow-md" size={28} strokeWidth={1.5} />
                                                        <label className={`cursor-pointer bg-white/90 text-[#2C3539] px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-[#8B6F5A] hover:text-white transition-colors text-center w-3/4 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                            {isUploading ? 'Uploading...' : 'Replace'}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={isUploading}
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) {
                                                                        handleHomeImageUpload(e.target.files[0], `gallery.images.${idx}`, 'home');
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                        <button
                                                            onClick={() => {
                                                                const newImages = [...homeData.gallery.images];
                                                                newImages.splice(idx, 1);
                                                                setHomeData({ ...homeData, gallery: { ...homeData.gallery, images: newImages } });
                                                            }}
                                                            className="text-white text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add New Home Gallery Image */}
                                        <div className="relative group rounded-sm overflow-hidden border-2 border-dashed border-gray-300 aspect-[4/5] flex items-center justify-center hover:border-[#8B6F5A] transition-colors cursor-pointer bg-gray-50">
                                            {uploadingImage === `home-gallery.images.new` && (
                                                <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                    <div className="text-white text-xs">Uploading...</div>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Camera className="text-[#2C3539] mb-2" size={24} />
                                                <span className="text-[#2C3539] text-[10px] uppercase tracking-widest font-bold">Add Image</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                disabled={uploadingImage === `home-gallery.images.new`}
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        handleHomeImageUpload(e.target.files[0], `gallery.images.${homeData.gallery.images.length}`, 'home');
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Residences Section */}
                            <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-12">Residences Section</h2>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Section Label</label>
                                        <input
                                            type="text"
                                            value={homeText(['residences', 'sectionLabel'])}
                                            placeholder={homeTextPh(['residences', 'sectionLabel'])}
                                            onChange={(e) => updateHomePath(['residences', 'sectionLabel'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                        <input
                                            type="text"
                                            value={homeText(['residences', 'heading'])}
                                            placeholder={homeTextPh(['residences', 'heading'])}
                                            onChange={(e) => updateHomePath(['residences', 'heading'], e.target.value)}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Section */}
                            <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-12">Footer</h2>

                                <div className="space-y-10">
                                    <div className="space-y-6">
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2 border-b border-gray-100 pb-4">Brand</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Brand Name</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'brandName'])}
                                                    placeholder={homeTextPh(['footer', 'brandName'])}
                                                    onChange={(e) => updateHomePath(['footer', 'brandName'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Brand Tagline</label>
                                                <textarea
                                                    value={homeText(['footer', 'brandTagline'])}
                                                    placeholder={homeTextPh(['footer', 'brandTagline'])}
                                                    onChange={(e) => updateHomePath(['footer', 'brandTagline'], e.target.value)}
                                                    rows={3}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2 border-b border-gray-100 pb-4">Direct Inquiries</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Section Title</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'directInquiriesTitle'])}
                                                    placeholder={homeTextPh(['footer', 'directInquiriesTitle'])}
                                                    onChange={(e) => updateHomePath(['footer', 'directInquiriesTitle'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    value={homeText(['footer', 'email'])}
                                                    placeholder={homeTextPh(['footer', 'email'])}
                                                    onChange={(e) => updateHomePath(['footer', 'email'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Phone</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'phone'])}
                                                    placeholder={homeTextPh(['footer', 'phone'])}
                                                    onChange={(e) => updateHomePath(['footer', 'phone'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Address Line 1</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'addressLine1'])}
                                                    placeholder={homeTextPh(['footer', 'addressLine1'])}
                                                    onChange={(e) => updateHomePath(['footer', 'addressLine1'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Address Line 2</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'addressLine2'])}
                                                    placeholder={homeTextPh(['footer', 'addressLine2'])}
                                                    onChange={(e) => updateHomePath(['footer', 'addressLine2'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2 border-b border-gray-100 pb-4">Links & Social</h3>
                                        <div className="grid md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Instagram URL</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'social', 'instagramUrl'])}
                                                    placeholder={homeTextPh(['footer', 'social', 'instagramUrl'])}
                                                    onChange={(e) => updateHomePath(['footer', 'social', 'instagramUrl'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Facebook URL</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'social', 'facebookUrl'])}
                                                    placeholder={homeTextPh(['footer', 'social', 'facebookUrl'])}
                                                    onChange={(e) => updateHomePath(['footer', 'social', 'facebookUrl'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">LinkedIn URL</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'social', 'linkedinUrl'])}
                                                    placeholder={homeTextPh(['footer', 'social', 'linkedinUrl'])}
                                                    onChange={(e) => updateHomePath(['footer', 'social', 'linkedinUrl'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Privacy Label</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'privacyLabel'])}
                                                    placeholder={homeTextPh(['footer', 'privacyLabel'])}
                                                    onChange={(e) => updateHomePath(['footer', 'privacyLabel'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Privacy URL</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'privacyUrl'])}
                                                    placeholder={homeTextPh(['footer', 'privacyUrl'])}
                                                    onChange={(e) => updateHomePath(['footer', 'privacyUrl'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Disclaimer Label</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'disclaimerLabel'])}
                                                    placeholder={homeTextPh(['footer', 'disclaimerLabel'])}
                                                    onChange={(e) => updateHomePath(['footer', 'disclaimerLabel'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Disclaimer URL</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'disclaimerUrl'])}
                                                    placeholder={homeTextPh(['footer', 'disclaimerUrl'])}
                                                    onChange={(e) => updateHomePath(['footer', 'disclaimerUrl'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2 border-b border-gray-100 pb-4">Bottom Bar</h3>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Copyright Text</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'copyright'])}
                                                    placeholder={homeTextPh(['footer', 'copyright'])}
                                                    onChange={(e) => updateHomePath(['footer', 'copyright'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Register Interest Title</label>
                                                <input
                                                    type="text"
                                                    value={homeText(['footer', 'registerInterestTitle'])}
                                                    placeholder={homeTextPh(['footer', 'registerInterestTitle'])}
                                                    onChange={(e) => updateHomePath(['footer', 'registerInterestTitle'], e.target.value)}
                                                    className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeSection === 'booking' ? (
                        <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm space-y-10">
                            <div>
                                <h2 className="text-4xl font-serif text-[#2C3539] mb-4">Booking — seasonal pricing</h2>
                                <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
                                    Persists to <code className="text-xs bg-gray-100 px-1">src/data/bookingPricing.json</code> locally and to Firestore{' '}
                                    <code className="text-xs bg-gray-100 px-1">config/bookingPricing</code> when enabled. The public booking page reads{' '}
                                    <code className="text-xs bg-gray-100 px-1">GET /api/booking-pricing</code>. Packages:{' '}
                                    <strong>A</strong> Oneiro, <strong>B</strong> Villa Pétra, <strong>C</strong> Grey Estate.
                                </p>
                                <div className="mt-4 max-w-3xl rounded-sm border border-[#D4C3B3] bg-[#F4F1ED]/60 px-4 py-3 text-xs text-[#2C3539] leading-relaxed space-y-2">
                                    <p>
                                        <strong>Guest calendar:</strong> After they pick check-in, they see the{' '}
                                        <strong>minimum nights</strong> under the calendar (including across{' '}
                                        <strong>season boundaries</strong> and a 14-day “shoulder” before/after each season,
                                        so gaps don’t show as 1 night by mistake).{' '}
                                        <strong>Nightly rates</strong> use the same shoulder: dates that fall in a gap between
                                        seasons get the <em>nearest</em> season’s weekday/weekend table (not the flat fallback). If check-out is too soon, a{' '}
                                        <strong>pop-up</strong> lists the pricing periods involved and keeps check-in. If a
                                        range crosses <strong>booked</strong> nights, tapping a later valid date starts a
                                        new check-in there (releases a stuck anchor).
                                    </p>
                                    <p>
                                        <strong>Weekend column</strong> in your rates applies to the days listed under
                                        “Weekend day numbers” (default <code className="text-[10px] bg-white/80 px-1">5, 6, 0</code> = Fri–Sun). That matches typical sheets where
                                        weekend ≠ only Saturday–Sunday.
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 border-b border-gray-100 pb-8">
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Long-stay discount %</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={bookingPricing.longStayDiscountPercent}
                                        onChange={(e) =>
                                            setBookingPricing({
                                                ...bookingPricing,
                                                longStayDiscountPercent: Number(e.target.value) || 0,
                                            })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Min nights for discount</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={bookingPricing.longStayMinNights}
                                        onChange={(e) =>
                                            setBookingPricing({
                                                ...bookingPricing,
                                                longStayMinNights: Math.max(1, Number(e.target.value) || 1),
                                            })
                                        }
                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Weekend day numbers</label>
                                    <input
                                        type="text"
                                        value={(bookingPricing.weekendDays || []).join(', ')}
                                        onChange={(e) =>
                                            setBookingPricing({
                                                ...bookingPricing,
                                                weekendDays: e.target.value
                                                    .split(',')
                                                    .map((s) => parseInt(s.trim(), 10))
                                                    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6),
                                            })
                                        }
                                        placeholder="5, 6, 0"
                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        JS <code>getDay</code>: 0 = Sun, 5 = Fri, 6 = Sat. Default <strong>5, 6, 0</strong>{' '}
                                        = Fri–Sun use the <em>weekend</em> rate; Mon–Thu use <em>weekday</em>.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-4">Fallback rates (outside all seasons)</h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {(['A', 'B', 'C'] as PackageCode[]).map((pkg) => (
                                        <div key={pkg} className="border border-gray-100 p-4 rounded-sm">
                                            <div className="text-sm font-serif mb-3">
                                                {pkg === 'A' ? 'Oneiro (A)' : pkg === 'B' ? 'Villa Pétra (B)' : 'Grey Estate (C)'}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] uppercase text-gray-500">Weekday</label>
                                                    <input
                                                        type="number"
                                                        value={bookingPricing.fallbackRates[pkg].weekday}
                                                        onChange={(e) =>
                                                            setBookingPricing({
                                                                ...bookingPricing,
                                                                fallbackRates: {
                                                                    ...bookingPricing.fallbackRates,
                                                                    [pkg]: {
                                                                        ...bookingPricing.fallbackRates[pkg],
                                                                        weekday: Number(e.target.value) || 0,
                                                                    },
                                                                },
                                                            })
                                                        }
                                                        className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase text-gray-500">Weekend</label>
                                                    <input
                                                        type="number"
                                                        value={bookingPricing.fallbackRates[pkg].weekend}
                                                        onChange={(e) =>
                                                            setBookingPricing({
                                                                ...bookingPricing,
                                                                fallbackRates: {
                                                                    ...bookingPricing.fallbackRates,
                                                                    [pkg]: {
                                                                        ...bookingPricing.fallbackRates[pkg],
                                                                        weekend: Number(e.target.value) || 0,
                                                                    },
                                                                },
                                                            })
                                                        }
                                                        className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                    <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold">
                                        Seasons (inclusive dates)
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const blank: BookingSeason = {
                                                id: `season-${Date.now()}`,
                                                start: '2026-01-01',
                                                end: '2026-01-31',
                                                minStay: 3,
                                                rates: {
                                                    A: { weekday: 0, weekend: 0 },
                                                    B: { weekday: 0, weekend: 0 },
                                                    C: { weekday: 0, weekend: 0 },
                                                },
                                            };
                                            setBookingPricing({
                                                ...bookingPricing,
                                                seasons: [...bookingPricing.seasons, blank],
                                            });
                                        }}
                                        className="text-xs font-bold uppercase tracking-widest text-[#8B6F5A] hover:text-[#2C3539]"
                                    >
                                        + Add season
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {bookingPricing.seasons.map((season, sIdx) => (
                                        <div key={season.id} className="border border-gray-200 p-4 md:p-6 rounded-sm space-y-4">
                                            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                                <div className="lg:col-span-1">
                                                    <label className="block text-[10px] uppercase text-gray-500 mb-1">Id</label>
                                                    <input
                                                        value={season.id}
                                                        onChange={(e) => {
                                                            const next = [...bookingPricing.seasons];
                                                            next[sIdx] = { ...season, id: e.target.value };
                                                            setBookingPricing({ ...bookingPricing, seasons: next });
                                                        }}
                                                        className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 mb-1">Start</label>
                                                    <input
                                                        type="date"
                                                        value={season.start}
                                                        onChange={(e) => {
                                                            const next = [...bookingPricing.seasons];
                                                            next[sIdx] = { ...season, start: e.target.value };
                                                            setBookingPricing({ ...bookingPricing, seasons: next });
                                                        }}
                                                        className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 mb-1">End</label>
                                                    <input
                                                        type="date"
                                                        value={season.end}
                                                        onChange={(e) => {
                                                            const next = [...bookingPricing.seasons];
                                                            next[sIdx] = { ...season, end: e.target.value };
                                                            setBookingPricing({ ...bookingPricing, seasons: next });
                                                        }}
                                                        className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] uppercase text-gray-500 mb-1">Min stay (nights)</label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={season.minStay}
                                                        onChange={(e) => {
                                                            const next = [...bookingPricing.seasons];
                                                            next[sIdx] = {
                                                                ...season,
                                                                minStay: Math.max(1, Number(e.target.value) || 1),
                                                            };
                                                            setBookingPricing({ ...bookingPricing, seasons: next });
                                                        }}
                                                        className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                                                    />
                                                    <p className="text-[9px] text-gray-400 mt-1 leading-snug">
                                                        Shown on the booking calendar + in a pop-up if the guest picks too
                                                        short a stay for this season.
                                                    </p>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setBookingPricing({
                                                                ...bookingPricing,
                                                                seasons: bookingPricing.seasons.filter((_, i) => i !== sIdx),
                                                            })
                                                        }
                                                        className="text-xs text-rose-600 hover:underline uppercase tracking-widest"
                                                    >
                                                        Remove season
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-6">
                                                {(['A', 'B', 'C'] as PackageCode[]).map((pkg) => (
                                                    <div key={pkg} className="bg-[#F9F8F6] p-4 rounded-sm">
                                                        <div className="text-[10px] uppercase font-bold text-[#A89F91] mb-3">
                                                            {pkg === 'A' ? 'Oneiro' : pkg === 'B' ? 'Villa Pétra' : 'Grey Estate'}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-[10px] text-gray-500">Weekday €</label>
                                                                <input
                                                                    type="number"
                                                                    step={0.1}
                                                                    value={season.rates[pkg].weekday}
                                                                    onChange={(e) => {
                                                                        const next = [...bookingPricing.seasons];
                                                                        next[sIdx] = {
                                                                            ...season,
                                                                            rates: {
                                                                                ...season.rates,
                                                                                [pkg]: {
                                                                                    ...season.rates[pkg],
                                                                                    weekday: Number(e.target.value) || 0,
                                                                                },
                                                                            },
                                                                        };
                                                                        setBookingPricing({ ...bookingPricing, seasons: next });
                                                                    }}
                                                                    className="w-full border border-gray-200 px-2 py-1.5 text-sm bg-white"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] text-gray-500">Weekend €</label>
                                                                <input
                                                                    type="number"
                                                                    step={0.1}
                                                                    value={season.rates[pkg].weekend}
                                                                    onChange={(e) => {
                                                                        const next = [...bookingPricing.seasons];
                                                                        next[sIdx] = {
                                                                            ...season,
                                                                            rates: {
                                                                                ...season.rates,
                                                                                [pkg]: {
                                                                                    ...season.rates[pkg],
                                                                                    weekend: Number(e.target.value) || 0,
                                                                                },
                                                                            },
                                                                        };
                                                                        setBookingPricing({ ...bookingPricing, seasons: next });
                                                                    }}
                                                                    className="w-full border border-gray-200 px-2 py-1.5 text-sm bg-white"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : currentVilla && (
                        <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                            <h2 className="text-4xl font-serif text-[#2C3539] mb-8">
                                {readVillaName(currentVilla, 'en')} Settings
                                {!isEditingEnglish && (
                                    <span className="block text-xs font-sans normal-case tracking-normal text-[#8B6F5A] mt-2">
                                        Editing: {ADMIN_CONTENT_LOCALE_OPTIONS.find((o) => o.value === adminContentLocale)?.label}
                                    </span>
                                )}
                            </h2>
                            {currentVilla.id === 'grey-estate' && (
                                <div className="mb-8 bg-[#F4F1ED] border border-[#D4C3B3] px-6 py-4 text-sm text-[#2C3539]">
                                    Grey Estate galleries are derived from Villa Oneiro (accordion 1 &amp; 2) and Villa Pétra (accordion 1). Edit those villas to update Grey Estate.
                                </div>
                            )}

                            {/* Text Fields */}
                            <div className="space-y-6 mb-12">
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Name</label>
                                    <input
                                        type="text"
                                        value={readVillaNameForAdmin(currentVilla, adminContentLocale)}
                                        placeholder={
                                            adminContentLocale === 'en'
                                                ? undefined
                                                : currentVilla.name
                                                  ? `EN: ${currentVilla.name}`
                                                  : undefined
                                        }
                                        onChange={(e) =>
                                            setVillas(writeVillaName(villas, activeVilla, adminContentLocale, e.target.value))
                                        }
                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none font-serif text-xl"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Subtitle</label>
                                    <input
                                        type="text"
                                        value={readVillaSubtitleForAdmin(currentVilla, adminContentLocale)}
                                        placeholder={
                                            adminContentLocale === 'en'
                                                ? undefined
                                                : currentVilla.subtitle
                                                  ? `EN: ${currentVilla.subtitle}`
                                                  : undefined
                                        }
                                        onChange={(e) =>
                                            setVillas(writeVillaSubtitle(villas, activeVilla, adminContentLocale, e.target.value))
                                        }
                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                    <textarea
                                        value={readVillaDescriptionForAdmin(currentVilla, adminContentLocale)}
                                        placeholder={
                                            adminContentLocale === 'en'
                                                ? undefined
                                                : currentVilla.description
                                                  ? `EN: ${currentVilla.description.slice(0, 120)}${currentVilla.description.length > 120 ? '…' : ''}`
                                                  : undefined
                                        }
                                        onChange={(e) =>
                                            setVillas(
                                                writeVillaDescription(villas, activeVilla, adminContentLocale, e.target.value)
                                            )
                                        }
                                        rows={5}
                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-4">Specs</label>
                                    <div className="space-y-3">
                                        {currentVilla.specs.map((spec, specIdx) => {
                                            const locSpec = readVillaSpecForAdmin(currentVilla, adminContentLocale, specIdx);
                                            return (
                                            <div key={specIdx} className="flex gap-4 items-center">
                                                <div className="w-1/3">
                                                    <input
                                                        type="text"
                                                        value={locSpec.label}
                                                        onChange={(e) =>
                                                            setVillas(
                                                                writeVillaSpecField(
                                                                    villas,
                                                                    activeVilla,
                                                                    adminContentLocale,
                                                                    specIdx,
                                                                    'label',
                                                                    e.target.value
                                                                )
                                                            )
                                                        }
                                                        placeholder={
                                                            adminContentLocale === 'en' ? 'Label' : `EN label: ${spec.label}`
                                                        }
                                                        className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#2C3539] outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={locSpec.value}
                                                        onChange={(e) =>
                                                            setVillas(
                                                                writeVillaSpecField(
                                                                    villas,
                                                                    activeVilla,
                                                                    adminContentLocale,
                                                                    specIdx,
                                                                    'value',
                                                                    e.target.value
                                                                )
                                                            )
                                                        }
                                                        placeholder={
                                                            adminContentLocale === 'en' ? 'Value' : `EN value: ${spec.value}`
                                                        }
                                                        className="w-full border border-gray-200 px-3 py-2 text-sm focus:border-[#2C3539] outline-none"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={!isEditingEnglish}
                                                    onClick={() => {
                                                        if (!isEditingEnglish) return;
                                                        setVillas(removeVillaSpec(villas, activeVilla, specIdx));
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 rounded transition-colors flex-shrink-0 disabled:opacity-30 disabled:pointer-events-none"
                                                    title="Remove Spec"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            );
                                        })}
                                        <button
                                            type="button"
                                            disabled={!isEditingEnglish}
                                            onClick={() => {
                                                if (!isEditingEnglish) return;
                                                setVillas(addVillaSpec(villas, activeVilla));
                                            }}
                                            className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2C3539] hover:text-[#8B6F5A] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                        >
                                            <span className="w-5 h-5 flex items-center justify-center border border-current rounded-full text-base leading-none pb-[1px]">+</span>
                                            Add Spec
                                        </button>
                                    </div>
                                </div>
                            </div>


                            {/* Hero Image Edit */}
                            <div className="mb-20">
                                <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Cover Image</h3>
                                <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[21/9]">
                                    {!isEditingEnglish && (
                                        <div className="absolute inset-0 z-20 bg-white/80 flex items-center justify-center text-xs text-[#2C3539] text-center px-6 pointer-events-none">
                                            Switch content language to English to change the cover image.
                                        </div>
                                    )}
                                    {uploadingImage === `hero-${activeVilla}` && (
                                        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                            <div className="text-white text-sm">Uploading...</div>
                                        </div>
                                    )}
                                    <img
                                        src={currentVilla.image}
                                        alt={currentVilla.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null; // Prevent infinite loops
                                            console.error('Image failed to load:', currentVilla.image);
                                            target.src = 'https://placehold.co/1200x800?text=Missing+Image';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                        <ImageIcon className="text-white drop-shadow-md" size={40} strokeWidth={1.5} />
                                        <label className={`cursor-pointer bg-white text-[#2C3539] px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#8B6F5A] hover:text-white transition-colors ${uploadingImage === `hero-${activeVilla}` ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            {uploadingImage === `hero-${activeVilla}` ? 'Uploading...' : 'Upload Replacement'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploadingImage === `hero-${activeVilla}`}
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        // Extract folder name from image path
                                                        // Handles both local paths (/VILLA_ONEIRO/image.png) and GCS URLs (https://storage.googleapis.com/bucket/VILLA_ONEIRO/image.png)
                                                        let imagePath = currentVilla.image;
                                                        // Fix malformed URLs that might have leading slash before https://
                                                        if (imagePath.startsWith('/https://') || imagePath.startsWith('/http://')) {
                                                            imagePath = imagePath.substring(1);
                                                        }
                                                        let folderName = '';

                                                        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                                                            // GCS URL: extract folder from path
                                                            try {
                                                                const url = new URL(imagePath);
                                                                const pathParts = url.pathname.split('/').filter(part => part);
                                                                // Path is usually: bucket/folder/filename, so folder is second part
                                                                if (pathParts.length >= 2) {
                                                                    folderName = pathParts[1]; // Skip bucket name, get folder
                                                                } else {
                                                                    // Fallback: try to get from villa ID
                                                                    folderName = currentVilla.id === 'villa-oneiro' ? 'VILLA_ONEIRO' :
                                                                        currentVilla.id === 'omorfi-suite' ? 'OMORFI_SUITE' :
                                                                            currentVilla.id === 'villa-petra' ? 'Villa_PETRA' : '';
                                                                }
                                                            } catch (err) {
                                                                // If URL parsing fails, use villa ID mapping
                                                                folderName = currentVilla.id === 'villa-oneiro' ? 'VILLA_ONEIRO' :
                                                                    currentVilla.id === 'omorfi-suite' ? 'OMORFI_SUITE' :
                                                                        currentVilla.id === 'villa-petra' ? 'Villa_PETRA' : '';
                                                            }
                                                        } else {
                                                            // Local path: /VILLA_ONEIRO/image.png
                                                            const pathParts = imagePath.split('/').filter(part => part);
                                                            folderName = pathParts.length > 0 ? pathParts[0] : '';
                                                        }

                                                        if (!folderName) {
                                                            alert('Could not determine folder for this image. Please check the image path.');
                                                            e.target.value = '';
                                                            return;
                                                        }

                                                        handleImageUpload(e.target.files[0], folderName, 'hero');
                                                        // Reset input to allow re-uploading the same file
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Gallery Edit - multiple accordions with editable titles */}
                            {currentVilla.id !== 'grey-estate' && (
                            <div className="space-y-10">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold border-b border-gray-100 pb-4 flex-1">
                                        Galleries — drag to reorder
                                    </h3>
                                    <button
                                        type="button"
                                        disabled={
                                            !isEditingEnglish ||
                                            currentVilla.id === 'villa-petra' ||
                                            currentVilla.id === 'grey-estate'
                                        }
                                        onClick={() => {
                                            if (!isEditingEnglish) return;
                                            const sections = Array.isArray((currentVilla as any).gallerySections) ? [...(currentVilla as any).gallerySections] : [];
                                            sections.push({ title: '', images: [] });
                                            setVillas(villas.map(v => v.id === activeVilla ? { ...(v as any), gallerySections: sections } as any : v));
                                        }}
                                        className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold border border-[#2C3539] text-[#2C3539] hover:bg-[#2C3539] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#2C3539]"
                                    >
                                        Add Accordion
                                    </button>
                                </div>

                                {(Array.isArray((currentVilla as any).gallerySections) ? (currentVilla as any).gallerySections : [{ title: 'Visual Details.', images: (currentVilla as any).gallery || [] }]).map((section: any, sectionIdx: number) => {
                                    const images: string[] = Array.isArray(section.images) ? section.images : [];
                                    return (
                                        <div key={`section-${sectionIdx}`} className="border border-gray-100 bg-[#FDFCFB] p-4 md:p-6 rounded-sm">
                                            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                                                <div className="flex-1">
                                                    <label className="block text-[10px] uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Accordion Title</label>
                                                    <input
                                                        type="text"
                                                        value={readVillaGalleryTitleForAdmin(currentVilla, adminContentLocale, sectionIdx)}
                                                        onChange={(e) =>
                                                            setVillas(
                                                                writeVillaGalleryTitle(
                                                                    villas,
                                                                    activeVilla,
                                                                    adminContentLocale,
                                                                    sectionIdx,
                                                                    e.target.value
                                                                )
                                                            )
                                                        }
                                                        placeholder={
                                                            adminContentLocale === 'en'
                                                                ? 'e.g. Visual Details.'
                                                                : section.title
                                                                  ? `EN: ${section.title}`
                                                                  : 'Uses English title when empty'
                                                        }
                                                        className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none bg-white"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            !isEditingEnglish ||
                                                            currentVilla.id === 'grey-estate' ||
                                                            (currentVilla.id === 'villa-petra' && (Array.isArray((currentVilla as any).gallerySections) ? (currentVilla as any).gallerySections.length : 1) <= 1)
                                                        }
                                                        onClick={() => {
                                                            if (!isEditingEnglish) return;
                                                            setVillas(removeVillaGallerySection(villas, activeVilla, sectionIdx));
                                                        }}
                                                        className="text-[10px] uppercase tracking-widest font-bold text-red-600 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-red-600"
                                                    >
                                                        Remove Accordion
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                                {images.map((img, idx) => {
                                                    const dragKey = sectionIdx * 1000 + idx;
                                                    const isUploading = uploadingImage === `gallery-${activeVilla}-s${sectionIdx}-${idx}`;
                                                    return (
                                                        <div
                                                            key={img}
                                                            draggable={isEditingEnglish}
                                                            onDragStart={(e) => {
                                                                if (!isEditingEnglish) return;
                                                                e.dataTransfer.setData('text/plain', JSON.stringify({ sectionIdx, idx }));
                                                                e.dataTransfer.effectAllowed = 'move';
                                                            }}
                                                            onDragOver={(e) => {
                                                                if (!isEditingEnglish) return;
                                                                e.preventDefault();
                                                                e.dataTransfer.dropEffect = 'move';
                                                                setDragOverIndex(dragKey);
                                                            }}
                                                            onDragLeave={() => setDragOverIndex(null)}
                                                            onDrop={(e) => {
                                                                e.preventDefault();
                                                                if (!isEditingEnglish) {
                                                                    setDragOverIndex(null);
                                                                    return;
                                                                }
                                                                const raw = e.dataTransfer.getData('text/plain');
                                                                let parsed: any = null;
                                                                try { parsed = JSON.parse(raw); } catch { parsed = null; }
                                                                if (!parsed || typeof parsed.sectionIdx !== 'number' || typeof parsed.idx !== 'number') {
                                                                    setDragOverIndex(null);
                                                                    return;
                                                                }
                                                                const fromSectionIdx = parsed.sectionIdx as number;
                                                                const fromIdx = parsed.idx as number;

                                                                // No-op
                                                                if (fromSectionIdx === sectionIdx && fromIdx === idx) {
                                                                    setDragOverIndex(null);
                                                                    return;
                                                                }
                                                                const nextSections = Array.isArray((currentVilla as any).gallerySections) ? [...(currentVilla as any).gallerySections] : [];

                                                                // Move within same accordion OR across accordions
                                                                if (fromSectionIdx === sectionIdx) {
                                                                    const nextImages = reorderArray(images, fromIdx, idx);
                                                                    nextSections[sectionIdx] = { ...nextSections[sectionIdx], images: nextImages };
                                                                } else {
                                                                    const moved = moveGalleryImage(nextSections as any, fromSectionIdx, fromIdx, sectionIdx, idx);
                                                                    // also allow highlighting to clear
                                                                    for (let i = 0; i < moved.length; i++) nextSections[i] = moved[i] as any;
                                                                }
                                                                setVillas(villas.map(v => v.id === activeVilla ? { ...(v as any), gallerySections: nextSections } as any : v));
                                                                setDragOverIndex(null);
                                                            }}
                                                            className={`relative group rounded-sm overflow-hidden border aspect-[2/3] select-none ${isEditingEnglish ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${dragOverIndex === dragKey ? 'border-[#8B6F5A] ring-2 ring-[#8B6F5A]/40' : 'border-gray-200'}`}
                                                        >
                                                            {isUploading && (
                                                                <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                                    <div className="text-white text-xs">Uploading...</div>
                                                                </div>
                                                            )}
                                                            <img
                                                                src={img}
                                                                alt={`Gallery ${idx + 1}`}
                                                                draggable={false}
                                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.onerror = null;
                                                                    console.error('Gallery image failed to load:', img);
                                                                    target.src = 'https://placehold.co/600x400?text=Missing+Image';
                                                                }}
                                                            />

                                                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm backdrop-blur-sm z-10 transition-opacity group-hover:opacity-0">
                                                                Image {idx + 1}
                                                            </div>

                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 z-20">
                                                                <Camera className="text-white drop-shadow-md transform -translate-y-4 group-hover:translate-y-0 transition-transform duration-300" size={28} strokeWidth={1.5} />
                                                                <label className={`cursor-pointer bg-white/90 text-[#2C3539] px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-[#8B6F5A] hover:text-white transition-colors text-center w-3/4 transform translate-y-4 group-hover:translate-y-0 shadow-lg ${isUploading || !isEditingEnglish ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                                    {isUploading ? 'Uploading...' : 'Replace'}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        disabled={isUploading || !isEditingEnglish}
                                                                        onChange={(e) => {
                                                                            if (e.target.files?.[0]) {
                                                                                let imagePath = img;
                                                                                if (imagePath.startsWith('/https://') || imagePath.startsWith('/http://')) imagePath = imagePath.substring(1);
                                                                                let folderName = '';

                                                                                if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                                                                                    try {
                                                                                        const url = new URL(imagePath);
                                                                                        const pathParts = url.pathname.split('/').filter(part => part);
                                                                                        if (pathParts.length >= 2) folderName = pathParts[1];
                                                                                    } catch { /* ignore */ }
                                                                                } else {
                                                                                    const pathParts = imagePath.split('/').filter(part => part);
                                                                                    folderName = pathParts.length > 0 ? pathParts[0] : '';
                                                                                }

                                                                                if (!folderName) {
                                                                                    folderName = currentVilla.id === 'villa-oneiro' ? 'VILLA_ONEIRO'
                                                                                        : currentVilla.id === 'omorfi-suite' ? 'OMORFI_SUITE'
                                                                                            : currentVilla.id === 'villa-petra' ? 'Villa_PETRA' : 'UPLOADS';
                                                                                }

                                                                                handleImageUpload(e.target.files[0], folderName, idx, sectionIdx);
                                                                                e.target.value = '';
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                                <button
                                                                    type="button"
                                                                    disabled={!isEditingEnglish}
                                                                    onClick={() => {
                                                                        if (!isEditingEnglish) return;
                                                                        const nextSections = Array.isArray((currentVilla as any).gallerySections) ? [...(currentVilla as any).gallerySections] : [];
                                                                        const nextImages = [...images];
                                                                        nextImages.splice(idx, 1);
                                                                        nextSections[sectionIdx] = { ...nextSections[sectionIdx], images: nextImages };
                                                                        setVillas(villas.map(v => v.id === activeVilla ? { ...(v as any), gallerySections: nextSections } as any : v));
                                                                    }}
                                                                    className="text-white text-[10px] uppercase tracking-widest hover:text-red-400 transition-colors transform translate-y-4 group-hover:translate-y-0 disabled:opacity-40"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                <div
                                                    className="relative group rounded-sm overflow-hidden border-2 border-dashed border-gray-300 aspect-[2/3] flex items-center justify-center hover:border-[#8B6F5A] transition-colors cursor-pointer bg-gray-50"
                                                    onDragOver={(e) => {
                                                        if (!isEditingEnglish) return;
                                                        e.preventDefault();
                                                        e.dataTransfer.dropEffect = 'move';
                                                        setDragOverIndex(sectionIdx * 1000 + 999);
                                                    }}
                                                    onDragLeave={() => setDragOverIndex(null)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        if (!isEditingEnglish) {
                                                            setDragOverIndex(null);
                                                            return;
                                                        }
                                                        const raw = e.dataTransfer.getData('text/plain');
                                                        let parsed: any = null;
                                                        try { parsed = JSON.parse(raw); } catch { parsed = null; }
                                                        if (!parsed || typeof parsed.sectionIdx !== 'number' || typeof parsed.idx !== 'number') {
                                                            setDragOverIndex(null);
                                                            return;
                                                        }
                                                        const fromSectionIdx = parsed.sectionIdx as number;
                                                        const fromIdx = parsed.idx as number;
                                                        const nextSections = Array.isArray((currentVilla as any).gallerySections) ? [...(currentVilla as any).gallerySections] : [];
                                                        const moved = moveGalleryImage(nextSections as any, fromSectionIdx, fromIdx, sectionIdx, (Array.isArray(nextSections[sectionIdx]?.images) ? nextSections[sectionIdx].images.length : 0));
                                                        for (let i = 0; i < moved.length; i++) nextSections[i] = moved[i] as any;
                                                        setVillas(villas.map(v => v.id === activeVilla ? { ...(v as any), gallerySections: nextSections } as any : v));
                                                        setDragOverIndex(null);
                                                    }}
                                                >
                                                    {uploadingImage === `gallery-${activeVilla}-s${sectionIdx}-new` && (
                                                        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                            <div className="text-white text-xs">Uploading...</div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col items-center opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <Camera className="text-[#2C3539] mb-2" size={24} />
                                                        <span className="text-[#2C3539] text-[10px] uppercase tracking-widest font-bold">Add Image</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        disabled={uploadingImage === `gallery-${activeVilla}-s${sectionIdx}-new` || !isEditingEnglish}
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                const folderName = currentVilla.id === 'villa-oneiro' ? 'VILLA_ONEIRO'
                                                                    : currentVilla.id === 'omorfi-suite' ? 'OMORFI_SUITE'
                                                                        : currentVilla.id === 'villa-petra' ? 'Villa_PETRA' : 'UPLOADS';
                                                                handleImageUpload(e.target.files[0], folderName, "new", sectionIdx);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
