import React, { useState, useEffect } from 'react';
import { Camera, Save, LogOut, Check, X, Image as ImageIcon } from 'lucide-react';
import villasData from '../data/villas.json';
import { Villa } from '../types';

export default function Admin() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [villas, setVillas] = useState<Villa[]>(villasData as Villa[]);
    const [activeVilla, setActiveVilla] = useState<string>(villasData[0].id);

    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const { url } = await res.json();

                // Update local state with new image URL
                const updatedVillas = [...villas];
                const villaIndex = updatedVillas.findIndex(v => v.id === activeVilla);

                if (index === 'hero') {
                    updatedVillas[villaIndex].image = url;
                } else {
                    updatedVillas[villaIndex].gallery[index as number] = url;
                }

                setVillas(updatedVillas);
            } else {
                alert('Upload failed. Are you logged in?');
            }
        } catch (err) {
            alert('Upload error.');
        }
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            const res = await fetch('/api/admin/villas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(villas)
            });

            if (res.ok) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (err) {
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
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
                    <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#A89F91] font-bold mb-6">Select Villa</h3>
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

                    <div className="hidden lg:block mt-24 p-5 bg-stone-100/50 border border-stone-200 rounded-sm">
                        <p className="text-xs text-stone-600 leading-relaxed font-serif italic text-center">
                            "Architecture is a visual diary of spaces lived."
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    {currentVilla && (
                        <div className="bg-white p-6 md:p-12 shadow-sm border border-gray-100 rounded-sm">
                            <h2 className="text-4xl font-serif text-[#2C3539] mb-3">{currentVilla.name}</h2>
                            <p className="text-[#A89F91] text-xs tracking-[0.2em] uppercase mb-12">{currentVilla.subtitle}</p>

                            {/* Hero Image Edit */}
                            <div className="mb-20">
                                <h3 className="text-xs uppercase tracking-[0.3em] text-[#2C3539] font-bold mb-6 border-b border-gray-100 pb-4">Cover Image</h3>
                                <div className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[21/9]">
                                    <img src={currentVilla.image} alt={currentVilla.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                        <ImageIcon className="text-white drop-shadow-md" size={40} strokeWidth={1.5} />
                                        <label className="cursor-pointer bg-white text-[#2C3539] px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#8B6F5A] hover:text-white transition-colors">
                                            Upload Replacement
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        const folderName = currentVilla.image.split('/')[1] || '';
                                                        handleImageUpload(e.target.files[0], folderName, 'hero');
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
                                    {currentVilla.gallery.map((img, idx) => (
                                        <div key={idx} className="relative group rounded-sm overflow-hidden border border-gray-200 aspect-[2/3]">
                                            <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

                                            {/* Image Number / Indicator overlay */}
                                            <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] uppercase tracking-wider px-2 py-1 rounded-sm backdrop-blur-sm z-10 transition-opacity group-hover:opacity-0">
                                                Image {idx + 1}
                                            </div>

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-4 z-20">
                                                <Camera className="text-white drop-shadow-md transform -translate-y-4 group-hover:translate-y-0 transition-transform duration-300" size={28} strokeWidth={1.5} />
                                                <label className="cursor-pointer bg-white/90 text-[#2C3539] px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-[#8B6F5A] hover:text-white transition-colors text-center w-3/4 transform translate-y-4 group-hover:translate-y-0 shadow-lg">
                                                    Replace
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            if (e.target.files?.[0]) {
                                                                const folderName = img.split('/')[1] || '';
                                                                handleImageUpload(e.target.files[0], folderName, idx);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
