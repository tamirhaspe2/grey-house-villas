import React, { useState, useEffect } from 'react';
import { Camera, Save, LogOut, Check, X, Image as ImageIcon, Home as HomeIcon } from 'lucide-react';
import villasData from '../data/villas.json';
import homeDataDefault from '../data/home.json';
import { Villa } from '../types';

interface HomeData {
  hero: {
    backgroundImage: string;
    location: string;
    title: string;
    subtitle: string;
    description: string;
    button1: string;
    button2: string;
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
}

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [villas, setVillas] = useState<Villa[]>(villasData as Villa[]);
    const [activeVilla, setActiveVilla] = useState<string>(villasData[0].id);
    const [activeSection, setActiveSection] = useState<'villas' | 'home'>('villas');
    const [homeData, setHomeData] = useState<HomeData>(homeDataDefault as HomeData);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [uploadingImage, setUploadingImage] = useState<string | null>(null); // Track which image is uploading

    // Load home data on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetch('/api/home')
                .then(res => res.json())
                .then(data => setHomeData(data))
                .catch(() => setHomeData(homeDataDefault as HomeData));
        }
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

    const handleImageUpload = async (file: File, folder: string, index: number | 'hero') => {
        // Create unique key for this upload
        const uploadKey = index === 'hero' ? `hero-${activeVilla}` : `gallery-${activeVilla}-${index}`;

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

                // Ensure URL starts with /
                const imageUrl = url.startsWith('/') ? url : `/${url}`;

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
                        const galleryIndex = index as number;
                        if (!updatedVillas[villaIndex].gallery) {
                            updatedVillas[villaIndex].gallery = [];
                        }
                        const newGallery = [...updatedVillas[villaIndex].gallery];
                        newGallery[galleryIndex] = imageUrl;
                        updatedVillas[villaIndex] = {
                            ...updatedVillas[villaIndex],
                            gallery: newGallery
                        };
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
                    setTimeout(() => setSaveStatus('idle'), 3000);
                } else {
                    setSaveStatus('error');
                }
            } else {
                const res = await fetch('/api/admin/home', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(homeData)
                });

                if (res.ok) {
                    setSaveStatus('success');
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

                // Ensure URL starts with /
                const imageUrl = url.startsWith('/') ? url : `/${url}`;

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

                    <div className="flex items-center gap-4 md:gap-6">
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
                                                console.error('Hero image failed to load:', homeData.hero.backgroundImage);
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

                                {/* Hero Text Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Location</label>
                                        <input
                                            type="text"
                                            value={homeData.hero.location}
                                            onChange={(e) => setHomeData({...homeData, hero: {...homeData.hero, location: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={homeData.hero.title}
                                            onChange={(e) => setHomeData({...homeData, hero: {...homeData.hero, title: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Subtitle</label>
                                        <input
                                            type="text"
                                            value={homeData.hero.subtitle}
                                            onChange={(e) => setHomeData({...homeData, hero: {...homeData.hero, subtitle: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                        <textarea
                                            value={homeData.hero.description}
                                            onChange={(e) => setHomeData({...homeData, hero: {...homeData.hero, description: e.target.value}})}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Button 1 Text</label>
                                            <input
                                                type="text"
                                                value={homeData.hero.button1}
                                                onChange={(e) => setHomeData({...homeData, hero: {...homeData.hero, button1: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Button 2 Text</label>
                                            <input
                                                type="text"
                                                value={homeData.hero.button2}
                                                onChange={(e) => setHomeData({...homeData, hero: {...homeData.hero, button2: e.target.value}})}
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
                                            value={homeData.philosophy.sectionLabel}
                                            onChange={(e) => setHomeData({...homeData, philosophy: {...homeData.philosophy, sectionLabel: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                            <input
                                                type="text"
                                                value={homeData.philosophy.heading}
                                                onChange={(e) => setHomeData({...homeData, philosophy: {...homeData.philosophy, heading: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading Highlight</label>
                                            <input
                                                type="text"
                                                value={homeData.philosophy.headingHighlight}
                                                onChange={(e) => setHomeData({...homeData, philosophy: {...homeData.philosophy, headingHighlight: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Paragraph 1</label>
                                        <textarea
                                            value={homeData.philosophy.paragraph1}
                                            onChange={(e) => setHomeData({...homeData, philosophy: {...homeData.philosophy, paragraph1: e.target.value}})}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Paragraph 2</label>
                                        <textarea
                                            value={homeData.philosophy.paragraph2}
                                            onChange={(e) => setHomeData({...homeData, philosophy: {...homeData.philosophy, paragraph2: e.target.value}})}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Quote</label>
                                        <input
                                            type="text"
                                            value={homeData.philosophy.quote}
                                            onChange={(e) => setHomeData({...homeData, philosophy: {...homeData.philosophy, quote: e.target.value}})}
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
                                            value={homeData.interior.sectionLabel}
                                            onChange={(e) => setHomeData({...homeData, interior: {...homeData.interior, sectionLabel: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                            <input
                                                type="text"
                                                value={homeData.interior.heading}
                                                onChange={(e) => setHomeData({...homeData, interior: {...homeData.interior, heading: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading Highlight</label>
                                            <input
                                                type="text"
                                                value={homeData.interior.headingHighlight}
                                                onChange={(e) => setHomeData({...homeData, interior: {...homeData.interior, headingHighlight: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                        <textarea
                                            value={homeData.interior.description}
                                            onChange={(e) => setHomeData({...homeData, interior: {...homeData.interior, description: e.target.value}})}
                                            rows={4}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Features (one per line)</label>
                                        <textarea
                                            value={homeData.interior.features.join('\n')}
                                            onChange={(e) => setHomeData({...homeData, interior: {...homeData.interior, features: e.target.value.split('\n').filter(f => f.trim())}})}
                                            rows={6}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Button Text</label>
                                        <input
                                            type="text"
                                            value={homeData.interior.buttonText}
                                            onChange={(e) => setHomeData({...homeData, interior: {...homeData.interior, buttonText: e.target.value}})}
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
                                            value={homeData.gallery.sectionLabel}
                                            onChange={(e) => setHomeData({...homeData, gallery: {...homeData.gallery, sectionLabel: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                            <input
                                                type="text"
                                                value={homeData.gallery.heading}
                                                onChange={(e) => setHomeData({...homeData, gallery: {...homeData.gallery, heading: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading Highlight</label>
                                            <input
                                                type="text"
                                                value={homeData.gallery.headingHighlight}
                                                onChange={(e) => setHomeData({...homeData, gallery: {...homeData.gallery, headingHighlight: e.target.value}})}
                                                className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Description</label>
                                        <textarea
                                            value={homeData.gallery.description}
                                            onChange={(e) => setHomeData({...homeData, gallery: {...homeData.gallery, description: e.target.value}})}
                                            rows={3}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Gallery Images */}
                                <div>
                                    <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Gallery Images ({homeData.gallery.images.length})</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {homeData.gallery.images.map((img, idx) => {
                                            const isUploading = uploadingImage === `home-gallery.images.${idx}`;
                                            return (
                                                <div key={idx} className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[4/5]">
                                                    {isUploading && (
                                                        <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                            <div className="text-white text-xs">Uploading...</div>
                                                        </div>
                                                    )}
                                                    <img
                                                        key={img}
                                                        src={img}
                                                        alt={`Gallery ${idx}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            console.error('Gallery image failed to load:', img);
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
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                                            value={homeData.residences.sectionLabel}
                                            onChange={(e) => setHomeData({...homeData, residences: {...homeData.residences, sectionLabel: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-2">Heading</label>
                                        <input
                                            type="text"
                                            value={homeData.residences.heading}
                                            onChange={(e) => setHomeData({...homeData, residences: {...homeData.residences, heading: e.target.value}})}
                                            className="w-full border border-gray-200 px-4 py-2 focus:border-[#2C3539] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : currentVilla && (
                        <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                            <h2 className="text-4xl font-serif text-[#2C3539] mb-3">{currentVilla.name}</h2>
                            <p className="text-[#A89F91] text-xs tracking-[0.2em] uppercase mb-12">{currentVilla.subtitle}</p>

                            {/* Hero Image Edit */}
                            <div className="mb-20">
                                <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Cover Image</h3>
                                <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[21/9]">
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
                                            console.error('Image failed to load:', currentVilla.image);
                                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
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

                            {/* Gallery Edit */}
                            <div>
                                <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Gallery Images ({currentVilla.gallery.length})</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {currentVilla.gallery.map((img, idx) => {
                                        const isUploading = uploadingImage === `gallery-${activeVilla}-${idx}`;
                                        return (
                                            <div key={idx} className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[2/3]">
                                                {isUploading && (
                                                    <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center">
                                                        <div className="text-white text-xs">Uploading...</div>
                                                    </div>
                                                )}
                                                <img
                                                    src={img}
                                                    alt={`Gallery ${idx}`}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    onError={(e) => {
                                                        console.error('Gallery image failed to load:', img);
                                                        (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                                    }}
                                                />

                                                {/* Image Number / Indicator overlay */}
                                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm backdrop-blur-sm z-10 transition-opacity group-hover:opacity-0">
                                                    Image {idx + 1}
                                                </div>

                                                {/* Hover Overlay */}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 z-20">
                                                    <Camera className="text-white drop-shadow-md transform -translate-y-4 group-hover:translate-y-0 transition-transform duration-300" size={28} strokeWidth={1.5} />
                                                    <label className={`cursor-pointer bg-white/90 text-[#2C3539] px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-[#8B6F5A] hover:text-white transition-colors text-center w-3/4 transform translate-y-4 group-hover:translate-y-0 shadow-lg ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                        {isUploading ? 'Uploading...' : 'Replace'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            disabled={isUploading}
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    // Extract folder name from image path
                                                                    // Handles both local paths (/VILLA_ONEIRO/image.png) and GCS URLs (https://storage.googleapis.com/bucket/VILLA_ONEIRO/image.png)
                                                                    let imagePath = img;
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

                                                                    handleImageUpload(e.target.files[0], folderName, idx);
                                                                    // Reset input to allow re-uploading the same file
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
