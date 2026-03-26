import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar as CalendarIcon, Info, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, startOfMonth, differenceInCalendarDays, type Locale } from 'date-fns';
import { enUS, fr, el, he } from 'date-fns/locale';
import { io } from 'socket.io-client';
import 'react-day-picker/style.css';
import bookingPricingDefault from '../data/bookingPricing.json';
import type { BookingPricingConfig, PackageCode } from '../lib/bookingPricing';
import {
    computeStayPricing,
    findSeasonForDate,
    formatSeasonDateRange,
    formatSeasonsTouchingStayLabel,
    formatStayRateDisplay,
    isMinStayGapBlockedCheckIn,
    maxMinStayNightsInRange,
    maxMinStayProspectFromCheckIn,
} from '../lib/bookingPricing';
import { bookingPageBlockStyle, bookingPageBlockText } from '../lib/bookingPageCopy';
import type { BookingPageBlockKey } from '../lib/bookingPageCopy';

/** Fixed capacity per experience (no guest picker). */
const PACKAGE_GUESTS: Record<'A' | 'B' | 'C', number> = { A: 6, B: 2, C: 8 };

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, fr, el, he };

export default function Booking() {
    const { t, i18n } = useTranslation();
    const dfLocale = useMemo(() => DATE_FNS_LOCALES[i18n.language] ?? enUS, [i18n.language]);
    const [selectedPackage, setSelectedPackage] = useState<'A' | 'B' | 'C' | 'none'>('none');
    const [date, setDate] = useState<DateRange | undefined>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [submitError, setSubmitError] = useState<string>('');
    const [disabledDates, setDisabledDates] = useState<DateRange[]>([]);
    const [pricingConfig, setPricingConfig] = useState<BookingPricingConfig>(
        bookingPricingDefault as BookingPricingConfig
    );

    const bt = useCallback(
        (key: BookingPageBlockKey) => bookingPageBlockText(key, pricingConfig, i18n.language, t),
        [pricingConfig, i18n.language, t]
    );
    const bs = useCallback(
        (key: BookingPageBlockKey) => bookingPageBlockStyle(key, pricingConfig, i18n.language),
        [pricingConfig, i18n.language]
    );
    const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
    const [numMonths, setNumMonths] = useState(() => (typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1));
    const [minStayModal, setMinStayModal] = useState<{
        required: number;
        nights: number;
        checkIn: Date;
        checkOut: Date;
        periodLabel: string | null;
    } | null>(null);
    /** Snapshot at submit success so confirmation text does not clear if package changes or date resets (common on mobile). */
    const [submittedSnapshot, setSubmittedSnapshot] = useState<{ from: Date; to: Date } | null>(null);
    const submitLockRef = useRef(false);

    const loadPricing = useCallback(() => {
        fetch('/api/booking-pricing', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (data && Array.isArray(data.seasons)) {
                    setPricingConfig(data as BookingPricingConfig);
                }
            })
            .catch(() => {
                setPricingConfig(bookingPricingDefault as BookingPricingConfig);
            });
    }, []);

    useEffect(() => {
        loadPricing();
        const onPricingUpdated = () => loadPricing();
        window.addEventListener('booking-pricing:updated', onPricingUpdated);
        return () => window.removeEventListener('booking-pricing:updated', onPricingUpdated);
    }, [loadPricing]);

    useEffect(() => {
        const onResize = () => setNumMonths(window.innerWidth > 768 ? 2 : 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!minStayModal) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMinStayModal(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [minStayModal]);

    const fetchDisabledDates = useCallback((packageType: 'A' | 'B' | 'C') => {
        fetch(`/api/bookings/dates?package=${packageType}`, { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const parsedDates = data.map((d: { from: string; to: string }) => ({
                        from: new Date(d.from),
                        to: new Date(d.to)
                    }));
                    setDisabledDates(parsedDates);
                }
            })
            .catch(err => console.error("Failed to load disabled dates", err));
    }, []);

    useEffect(() => {
        if (selectedPackage === 'none') {
            setDisabledDates([]);
            return;
        }
        fetchDisabledDates(selectedPackage);
    }, [selectedPackage, fetchDisabledDates]);

    // When someone else books, refresh calendar so taken dates update immediately
    useEffect(() => {
        const socket = io();
        socket.on('bookings:updated', () => {
            if (selectedPackage !== 'none') {
                fetchDisabledDates(selectedPackage);
            }
        });
        return () => { socket.disconnect(); };
    }, [selectedPackage, fetchDisabledDates]);

    // When user switches back to this tab/window, refetch so duplicated tabs see latest availability
    useEffect(() => {
        const onFocus = () => {
            if (selectedPackage !== 'none') {
                fetchDisabledDates(selectedPackage);
            }
        };
        document.addEventListener('visibilitychange', onFocus);
        window.addEventListener('focus', onFocus);
        return () => {
            document.removeEventListener('visibilitychange', onFocus);
            window.removeEventListener('focus', onFocus);
        };
    }, [selectedPackage, fetchDisabledDates]);

    // Reset selected dates whenever the package changes; leaving success clears the confirmation so a new flow can start
    useEffect(() => {
        setDate(undefined);
        setSubmitStatus((s) => (s === 'success' ? 'idle' : s));
        setSubmittedSnapshot(null);
    }, [selectedPackage]);

    /** Per-night copy on each card only after check-in & check-out (≥1 night), from actual weekday/weekend mix. */
    const rateLinesByPackage = useMemo(() => {
        const empty: Record<PackageCode, string[]> = { A: [], B: [], C: [] };
        if (!date?.from || !date?.to) return empty;
        const n = differenceInCalendarDays(date.to, date.from);
        if (n < 1) return empty;
        return {
            A: formatStayRateDisplay(date.from, date.to, 'A', pricingConfig),
            B: formatStayRateDisplay(date.from, date.to, 'B', pricingConfig),
            C: formatStayRateDisplay(date.from, date.to, 'C', pricingConfig),
        };
    }, [date, pricingConfig]);

    const stayQuote =
        selectedPackage !== 'none' && date?.from && date?.to
            ? computeStayPricing(date.from, date.to, selectedPackage, pricingConfig)
            : null;
    const total = stayQuote?.total ?? 0;

    /** While check-in is set but range not finished (or same-day), show min-stay (handles season switches). */
    const calendarMinStayHint = useMemo(() => {
        if (selectedPackage === 'none' || !date?.from) return null;
        const nights = date.to ? differenceInCalendarDays(date.to, date.from) : 0;
        if (nights >= 1) return null;
        const { minN, touchedSeasonLabels } = maxMinStayProspectFromCheckIn(
            date.from,
            pricingConfig.seasons,
            21
        );
        return { minN, touchedSeasonLabels };
    }, [selectedPackage, date, pricingConfig.seasons]);

    // Date-only (midnight) for overlap comparison
    const toDateOnly = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const isBeforeTodayLocal = (d: Date): boolean =>
        toDateOnly(d).getTime() < toDateOnly(new Date()).getTime();
    /** A booked stay occupies nights [from, to) (checkout morning is free), matching the server overlap check. */
    const isNightBooked = useCallback(
        (d: Date): boolean => {
            const dayMs = toDateOnly(d).getTime();
            return disabledDates.some((br) => {
                if (!br.from || !br.to) return false;
                const a = toDateOnly(br.from).getTime();
                const b = toDateOnly(br.to).getTime();
                return dayMs >= a && dayMs < b;
            });
        },
        [disabledDates]
    );
    const canUseAsCheckIn = (d: Date): boolean => !isBeforeTodayLocal(d) && !isNightBooked(d);

    /** Free night but not enough consecutive free nights ahead to satisfy min stay — show red; cannot be check-in. */
    const isMinStayGapDay = useCallback(
        (d: Date): boolean => {
            if (selectedPackage === 'none') return false;
            const day = toDateOnly(d);
            if (isBeforeTodayLocal(day) || isNightBooked(day)) return false;
            return isMinStayGapBlockedCheckIn(day, pricingConfig.seasons, isNightBooked);
        },
        [selectedPackage, pricingConfig.seasons, isNightBooked]
    );

    const rangesOverlap = (a: Date, b: Date, from: Date, to: Date): boolean =>
        toDateOnly(a) < toDateOnly(to) && toDateOnly(from) < toDateOnly(b);

    const selectionIncludesDisabled = (range: DateRange | undefined): boolean => {
        if (!range?.from || !range?.to || disabledDates.length === 0) return false;
        const start = toDateOnly(range.from);
        const end = toDateOnly(range.to);
        return disabledDates.some(
            (d) => d.from && d.to && rangesOverlap(range.from!, range.to!, d.from, d.to)
        );
    };

    const handleBookingRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitLockRef.current) return;
        if (!date?.from || !date?.to) return;
        if (selectedPackage !== 'A' && selectedPackage !== 'B' && selectedPackage !== 'C') return;

        submitLockRef.current = true;
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setSubmitError('');

        const pkg = selectedPackage;
        const checkInIso = date.from.toISOString();
        const checkOutIso = date.to.toISOString();

        try {
            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store',
                body: JSON.stringify({
                    name,
                    email,
                    guests: String(PACKAGE_GUESTS[pkg]),
                    message,
                    packageType: pkg,
                    checkIn: checkInIso,
                    checkOut: checkOutIso,
                    total
                })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                setSubmittedSnapshot({
                    from: new Date(checkInIso),
                    to: new Date(checkOutIso),
                });
                setSubmitStatus('success');
                fetchDisabledDates(pkg);
            } else if (response.status === 400 && data.error === 'dates_unavailable') {
                setSubmitStatus('error');
                setSubmitError(
                    typeof data.message === 'string' && data.message.trim()
                        ? data.message
                        : t('booking.error_datesUnavailable')
                );
                setDate(undefined);
                fetchDisabledDates(pkg);
            } else {
                setSubmitStatus('error');
                const errCode = typeof data.error === 'string' ? data.error : '';
                if (errCode === 'invalid_package' || errCode === 'Invalid package type') {
                    setSubmitError(t('booking.error_invalidPackage'));
                } else if (errCode) {
                    setSubmitError(errCode);
                } else {
                    setSubmitError(t('booking.error_generic'));
                }
            }
        } catch (err) {
            setSubmitStatus('error');
            setSubmitError(t('booking.error_generic'));
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] pt-32 pb-20 px-6 sm:px-12 flex items-start justify-center font-sans">
            <div className="max-w-[1200px] w-full bg-white shadow-xl rounded-md flex flex-col lg:flex-row border border-gray-100 overflow-hidden">

                {/* Left Pane - Booking Info and Form */}
                <div className="w-full lg:w-[450px] p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col bg-[#FDFCFB]">
                    <Link
                        to="/"
                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#2C3539] hover:bg-white hover:border-[#A89F91] transition-all mb-10 shrink-0 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    </Link>

                    <h1
                        className="font-serif leading-tight mb-4 uppercase tracking-wide"
                        style={bs('title')}
                    >
                        {bt('title')}
                    </h1>
                    <p className="mb-10 leading-relaxed" style={bs('intro')}>
                        {bt('intro')}
                    </p>
                    <p className="uppercase tracking-wider mb-6 -mt-4 leading-relaxed">
                        <span style={bs('ratesHintBefore')}>{bt('ratesHintBefore')}</span>
                        <span style={bs('ratesHintHighlight')}>{bt('ratesHintHighlight')}</span>
                        <span style={bs('ratesHintAfter')}>{bt('ratesHintAfter')}</span>
                    </p>

                    <div className="mb-10 space-y-3">
                        <label className="block uppercase tracking-wider mb-4" style={bs('chooseExperience')}>
                            {bt('chooseExperience')}
                        </label>

                        <button
                            type="button"
                            onClick={() => setSelectedPackage('A')}
                            className={`w-full text-left p-4 border transition-all ${selectedPackage === 'A' ? 'border-[#2C3539] bg-[#F4F1ED]' : 'border-gray-200 hover:border-gray-300 bg-transparent'}`}
                        >
                            <div className="flex justify-between gap-3 items-start">
                                <span className="font-serif" style={bs('pkgA_name')}>
                                    {bt('pkgA_name')}
                                </span>
                                <div className="text-xs text-gray-500 text-right shrink-0 max-w-[58%]">
                                    {rateLinesByPackage.A.length > 0 ? (
                                        <div className="flex flex-col items-end gap-0.5 leading-snug">
                                            {rateLinesByPackage.A.map((line, i) => (
                                                <span key={i}>{line}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="mt-1" style={bs('pkgA_desc')}>
                                {bt('pkgA_desc')}
                            </div>
                            <div className="uppercase tracking-wider mt-1.5" style={bs('pkgA_guests')}>
                                {bt('pkgA_guests')}
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedPackage('B')}
                            className={`w-full text-left p-4 border transition-all ${selectedPackage === 'B' ? 'border-[#2C3539] bg-[#F4F1ED]' : 'border-gray-200 hover:border-gray-300 bg-transparent'}`}
                        >
                            <div className="flex justify-between gap-3 items-start">
                                <span className="font-serif" style={bs('pkgB_name')}>
                                    {bt('pkgB_name')}
                                </span>
                                <div className="text-xs text-gray-500 text-right shrink-0 max-w-[58%]">
                                    {rateLinesByPackage.B.length > 0 ? (
                                        <div className="flex flex-col items-end gap-0.5 leading-snug">
                                            {rateLinesByPackage.B.map((line, i) => (
                                                <span key={i}>{line}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="mt-1" style={bs('pkgB_desc')}>
                                {bt('pkgB_desc')}
                            </div>
                            <div className="uppercase tracking-wider mt-1.5" style={bs('pkgB_guests')}>
                                {bt('pkgB_guests')}
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedPackage('C')}
                            className={`w-full text-left p-4 border transition-all ${selectedPackage === 'C' ? 'border-[#2C3539] bg-[#F4F1ED]' : 'border-gray-200 hover:border-gray-300 bg-transparent'}`}
                        >
                            <div className="flex justify-between gap-3 items-start">
                                <span className="font-serif" style={bs('pkgC_name')}>
                                    {bt('pkgC_name')}
                                </span>
                                <div className="text-xs text-gray-500 text-right shrink-0 max-w-[58%]">
                                    {rateLinesByPackage.C.length > 0 ? (
                                        <div className="flex flex-col items-end gap-0.5 leading-snug">
                                            {rateLinesByPackage.C.map((line, i) => (
                                                <span key={i}>{line}</span>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="mt-1" style={bs('pkgC_desc')}>
                                {bt('pkgC_desc')}
                            </div>
                            <div className="uppercase tracking-wider mt-1.5" style={bs('pkgC_guests')}>
                                {bt('pkgC_guests')}
                            </div>
                        </button>
                    </div>

                    {submitStatus === 'success' ? (
                        <div className="my-auto bg-[#F4F1ED] p-8 text-center rounded">
                            <h3 className="font-serif text-xl mb-4 text-[#2C3539]">{t('booking.successTitle')}</h3>
                            <p className="text-sm text-gray-600">
                                {t('booking.successBody', {
                                    range:
                                        submittedSnapshot
                                            ? `${format(submittedSnapshot.from, 'PPP', { locale: dfLocale })} — ${format(submittedSnapshot.to, 'PPP', { locale: dfLocale })}`
                                            : date?.from && date?.to
                                              ? `${format(date.from, 'PPP', { locale: dfLocale })} — ${format(date.to, 'PPP', { locale: dfLocale })}`
                                              : t('booking.successDatesFallback'),
                                })}
                            </p>
                        </div>
                    ) : selectedPackage !== 'none' ? (
                        <form className="space-y-6 flex-grow flex flex-col" onSubmit={handleBookingRequest}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                                            {t('booking.checkIn')}
                                        </label>
                                        <div className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] font-medium min-h-[30px]">
                                            {date?.from
                                                ? format(date.from, 'MMM dd, yyyy', { locale: dfLocale })
                                                : t('booking.selectDate')}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                                            {t('booking.checkOut')}
                                        </label>
                                        <div className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] font-medium min-h-[30px]">
                                            {date?.to
                                                ? format(date.to, 'MMM dd, yyyy', { locale: dfLocale })
                                                : t('booking.selectDate')}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-b border-gray-200 pb-2">
                                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                                        {t('booking.guests')}
                                    </span>
                                    <span className="text-sm text-[#1A202C] font-medium">
                                        {selectedPackage === 'A' && t('booking.guestLineA')}
                                        {selectedPackage === 'B' && t('booking.guestLineB')}
                                        {selectedPackage === 'C' && t('booking.guestLineC')}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1 font-light">{t('booking.guestsFixed')}</p>
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('booking.fullName')}
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none focus:border-[#A89F91] placeholder-gray-400"
                                    />
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t('booking.emailPh')}
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none focus:border-[#A89F91] placeholder-gray-400"
                                    />
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder={t('booking.specialRequests')}
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none focus:border-[#A89F91] placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-100 flex-grow flex flex-col justify-end">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                                            {t('booking.estimatedTotal')}
                                        </div>
                                        <div className="font-serif text-2xl text-[#1A202C]">
                                            {total > 0 ? `€${total.toLocaleString()}` : '—'}
                                        </div>
                                        {stayQuote && stayQuote.discount > 0 && (
                                            <div className="text-[10px] text-emerald-700 mt-1">
                                                {t('booking.discountLine', {
                                                    pct: pricingConfig.longStayDiscountPercent,
                                                    amount: stayQuote.discount.toLocaleString(),
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {stayQuote && stayQuote.nights > 0 && (
                                        <div className="text-xs text-gray-500 font-light">
                                            {stayQuote.nights}{' '}
                                            {t(
                                                stayQuote.nights === 1 ? 'booking.night_one' : 'booking.night_other'
                                            )}
                                        </div>
                                    )}
                                </div>

                                {submitStatus === 'error' && submitError && (
                                    <p className="text-rose-600 text-sm mb-4 text-center">{submitError}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={!date?.from || !date?.to || isSubmitting}
                                    className={`w-full py-4 text-[11px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${date?.from && date?.to && !isSubmitting
                                        ? 'bg-[#1A202C] text-white hover:bg-[#2C3539]'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    {isSubmitting ? t('booking.processing') : t('booking.requestBooking')}
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-4">{t('booking.notCharged')}</p>
                            </div>
                        </form>
                    ) : null}
                </div>

                {/* Right Pane - Calendar Selection */}
                <div className="flex-1 bg-white p-8 lg:p-12 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[600px] mb-8 flex justify-between items-center flex-wrap gap-y-2">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={16} className="text-[#A89F91] shrink-0" />
                            <span style={bs('calendarPrompt')}>{bt('calendarPrompt')}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-end">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-[#1A202C] rounded-full inline-block shrink-0" />
                                <span style={bs('legendSelected')}>{bt('legendSelected')}</span>
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full inline-block shrink-0 border-2 border-rose-600 bg-rose-50" />
                                <span style={bs('legendMinStay')}>{bt('legendMinStay')}</span>
                            </span>
                        </div>
                    </div>

                    <div className="relative bg-[#FDFCFB] p-4 lg:p-8 rounded-xl border border-gray-100 shadow-sm w-full max-w-[700px] overflow-x-auto flex justify-center">
                        <DayPicker
                            mode="range"
                            locale={dfLocale}
                            selected={date}
                            onSelect={
                                selectedPackage === 'none'
                                    ? undefined
                                    : (range) => {
                                          // Block check-in on “pocket” nights (e.g. single free night between bookings)
                                          const anchorNights =
                                              range?.from && range?.to
                                                  ? differenceInCalendarDays(range.to, range.from)
                                                  : 0;
                                          if (
                                              range?.from &&
                                              (!range.to || anchorNights < 1) &&
                                              isMinStayGapDay(range.from)
                                          ) {
                                              setDate(undefined);
                                              setSubmitError(t('booking.error_gapCheckIn'));
                                              return;
                                          }
                                          if (selectionIncludesDisabled(range)) {
                                              // If the guest clicked a later day as checkout, use it as a fresh check-in
                                              // (releases a stuck anchor when the first range crossed booked nights).
                                              if (
                                                  range?.from &&
                                                  range?.to &&
                                                  canUseAsCheckIn(range.to)
                                              ) {
                                                  setDate({ from: range.to, to: undefined });
                                                  setSubmitError('');
                                                  return;
                                              }
                                              if (range?.from && canUseAsCheckIn(range.from)) {
                                                  setDate({ from: range.from, to: undefined });
                                                  setSubmitError(t('booking.error_rangeBooked'));
                                                  return;
                                              }
                                              setDate(undefined);
                                              setSubmitError(t('booking.error_bookedNights'));
                                              return;
                                          }
                                          // RDP often sets from === to on the first click; nights === 0 then.
                                          // Only enforce min-stay once the guest has a real range (≥1 night).
                                          if (range?.from && range?.to && selectedPackage !== 'none') {
                                              const nights = differenceInCalendarDays(range.to, range.from);
                                              if (nights >= 1) {
                                                  const required = maxMinStayNightsInRange(
                                                      range.from,
                                                      range.to,
                                                      pricingConfig.seasons
                                                  );
                                                  if (nights < required) {
                                                      const multiLabel = formatSeasonsTouchingStayLabel(
                                                          range.from,
                                                          range.to,
                                                          pricingConfig.seasons
                                                      );
                                                      const season = findSeasonForDate(
                                                          range.from,
                                                          pricingConfig.seasons
                                                      );
                                                      setMinStayModal({
                                                          required,
                                                          nights,
                                                          checkIn: range.from,
                                                          checkOut: range.to,
                                                          periodLabel:
                                                              multiLabel ??
                                                              (season ? formatSeasonDateRange(season) : null),
                                                      });
                                                      setDate({ from: range.from, to: undefined });
                                                      setSubmitError('');
                                                      return;
                                                  }
                                              }
                                          }
                                          setDate(range);
                                          setSubmitError('');
                                      }
                            }
                            month={calendarMonth}
                            onMonthChange={setCalendarMonth}
                            numberOfMonths={numMonths}
                            pagedNavigation
                            disabled={
                                selectedPackage === 'none'
                                    ? [{ from: new Date(1900, 0, 1), to: new Date(2100, 11, 31) }]
                                    : [{ before: new Date() }, ...disabledDates]
                            } // Disable all dates until a package is chosen, then past + booked dates
                            modifiers={{
                                minStayGap: isMinStayGapDay,
                            }}
                            modifiersClassNames={{
                                minStayGap: 'booking-rdp-minstay-gap',
                            }}
                            className={`bg-transparent ${selectedPackage === 'none' ? 'opacity-60' : ''}`}
                            style={{ margin: 0 }}
                        />
                        {selectedPackage === 'none' && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                <div
                                    className="bg-[#FDFCFB]/90 px-6 py-3 rounded-full border border-dashed border-gray-300 uppercase tracking-[0.18em] text-center"
                                    style={bs('selectExperienceCalendar')}
                                >
                                    {bt('selectExperienceCalendar')}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedPackage !== 'none' && calendarMinStayHint && (
                        <div
                            className="mt-4 w-full max-w-[700px] rounded-sm border border-[#D4C3B3] bg-[#F4F1ED]/80 px-4 py-3 text-xs text-[#2C3539] leading-relaxed"
                            role="status"
                        >
                            <span className="font-semibold">
                                {t('booking.minHint_prefix')} {calendarMinStayHint.minN}{' '}
                                {t(
                                    calendarMinStayHint.minN === 1
                                        ? 'booking.night_one'
                                        : 'booking.night_other'
                                )}
                            </span>
                            {calendarMinStayHint.touchedSeasonLabels.length > 0 ? (
                                <>
                                    {' '}
                                    {t('booking.minHint_mid')}{' '}
                                    <span className="font-medium">
                                        {calendarMinStayHint.touchedSeasonLabels.join(' · ')}
                                    </span>
                                    {t('booking.minHint_suffix', {
                                        n: calendarMinStayHint.minN,
                                        nights: t(
                                            calendarMinStayHint.minN === 1
                                                ? 'booking.night_one'
                                                : 'booking.night_other'
                                        ),
                                    })}
                                </>
                            ) : (
                                <>
                                    {' '}
                                    {t('booking.minHint_simple', {
                                        n: calendarMinStayHint.minN,
                                        nights: t(
                                            calendarMinStayHint.minN === 1
                                                ? 'booking.night_one'
                                                : 'booking.night_other'
                                        ),
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[600px]">
                        <div className="bg-[#F4F1ED]/50 p-6 flex flex-col gap-2 rounded-sm">
                            <Info size={18} className="text-[#A89F91] mb-2" />
                            <h4 className="font-serif" style={bs('policyTitle')}>
                                {bt('policyTitle')}
                            </h4>
                            <p className="leading-relaxed" style={bs('policyText')}>
                                {bt('policyText')}
                            </p>
                        </div>
                        <div className="bg-[#F4F1ED]/50 p-6 flex flex-col gap-2 rounded-sm">
                            <CreditCard size={18} className="text-[#A89F91] mb-2" />
                            <h4 className="font-serif" style={bs('secureTitle')}>
                                {bt('secureTitle')}
                            </h4>
                            <p className="leading-relaxed" style={bs('secureText')}>
                                {bt('secureText')}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {minStayModal && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/45"
                    role="presentation"
                    onClick={() => setMinStayModal(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="min-stay-dialog-title"
                        className="bg-white max-w-md w-full shadow-2xl rounded-sm border border-gray-200 p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2
                            id="min-stay-dialog-title"
                            className="font-serif text-xl text-[#1A202C] mb-4"
                        >
                            {t('booking.minStayModalTitle')}
                        </h2>
                        <p className="text-sm text-[#4A5568] leading-relaxed mb-2">
                            {t('booking.minStayModalP1', {
                                count: minStayModal.nights,
                                nightWord: t(
                                    minStayModal.nights === 1 ? 'booking.night_one' : 'booking.night_other'
                                ),
                                from: format(minStayModal.checkIn, 'MMM d, yyyy', { locale: dfLocale }),
                                to: format(minStayModal.checkOut, 'MMM d, yyyy', { locale: dfLocale }),
                            })}
                        </p>
                        <p className="text-sm text-[#4A5568] leading-relaxed mb-6">
                            {t('booking.minStayModalP2a', {
                                required: minStayModal.required,
                                reqNightWord: t(
                                    minStayModal.required === 1 ? 'booking.night_one' : 'booking.night_other'
                                ),
                            })}
                            {minStayModal.periodLabel ? (
                                <>
                                    {' '}
                                    {t('booking.minStayModalP2period', { label: minStayModal.periodLabel })}
                                    {minStayModal.periodLabel.includes('·') ? t('booking.minStayModalP2strict') : ''}
                                    )
                                </>
                            ) : null}
                            {t('booking.minStayModalP2end')}
                        </p>
                        <button
                            type="button"
                            onClick={() => setMinStayModal(null)}
                            className="w-full py-3 text-[11px] uppercase tracking-[0.2em] font-bold bg-[#1A202C] text-white hover:bg-[#2C3539] transition-colors rounded-sm"
                        >
                            {t('booking.minStayOk')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
