import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Info, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, startOfMonth, differenceInCalendarDays } from 'date-fns';
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

/** Fixed capacity per experience (no guest picker). */
const PACKAGE_GUESTS: Record<'A' | 'B' | 'C', number> = { A: 4, B: 2, C: 6 };

export default function Booking() {
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
    const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
    const [numMonths, setNumMonths] = useState(() => (typeof window !== 'undefined' && window.innerWidth > 768 ? 2 : 1));
    const [minStayModal, setMinStayModal] = useState<{
        required: number;
        nights: number;
        checkIn: Date;
        checkOut: Date;
        periodLabel: string | null;
    } | null>(null);

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
        fetch(`/api/bookings/dates?package=${packageType}`)
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

    // Reset selected dates whenever the package changes
    useEffect(() => {
        setDate(undefined);
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
            const t = toDateOnly(d).getTime();
            return disabledDates.some((br) => {
                if (!br.from || !br.to) return false;
                const a = toDateOnly(br.from).getTime();
                const b = toDateOnly(br.to).getTime();
                return t >= a && t < b;
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
        if (!date?.from || !date?.to) return;

        setIsSubmitting(true);
        setSubmitStatus('idle');
        setSubmitError('');

        try {
            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    guests: String(PACKAGE_GUESTS[selectedPackage]),
                    message,
                    packageType: selectedPackage,
                    checkIn: date.from.toISOString(),
                    checkOut: date.to.toISOString(),
                    total
                })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                setSubmitStatus('success');
            } else if (response.status === 400 && data.error === 'dates_unavailable') {
                setSubmitStatus('error');
                setSubmitError(data.message || 'Some of these dates are no longer available. Please choose different dates.');
                setDate(undefined);
                if (selectedPackage !== 'none') fetchDisabledDates(selectedPackage);
            } else {
                setSubmitStatus('error');
                setSubmitError('Something went wrong. Please try again.');
            }
        } catch (err) {
            setSubmitStatus('error');
            setSubmitError('Something went wrong. Please try again.');
        } finally {
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

                    <h1 className="font-serif text-[32px] leading-tight text-[#1A202C] mb-4 font-semibold uppercase tracking-wide">
                        Reserve Your Stay
                    </h1>
                    <p className="text-[#4A5568] text-sm mb-10 leading-relaxed font-light">
                        Select an option to request a booking at Grey House. We will review your request and contact you directly to arrange payment and details.
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[#A89F91] mb-6 -mt-4">
                        Nightly rates appear after check-in and check-out. Weekday vs weekend nights are priced
                        separately (weekend = Fri–Sun nights). Minimum nights apply per season — the calendar will remind
                        you if your stay is too short. Dates in <span className="text-rose-700 font-semibold">red</span> are
                        free nights that still cannot start a stay (not enough consecutive nights before the next booking).
                    </p>

                    <div className="mb-10 space-y-3">
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-4">Choose Your Experience</label>

                        <button
                            onClick={() => setSelectedPackage('A')}
                            className={`w-full text-left p-4 border transition-all ${selectedPackage === 'A' ? 'border-[#2C3539] bg-[#F4F1ED]' : 'border-gray-200 hover:border-gray-300 bg-transparent'}`}
                        >
                            <div className="flex justify-between gap-3 items-start">
                                <span className="font-serif text-[#1A202C]">Oneiro</span>
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
                            <div className="text-xs text-gray-500 mt-1 font-light">Main House + Suite (3 Beds, 3.5 Baths)</div>
                            <div className="text-[10px] uppercase tracking-wider text-[#A89F91] mt-1.5">Up to 4 guests</div>
                        </button>

                        <button
                            onClick={() => setSelectedPackage('B')}
                            className={`w-full text-left p-4 border transition-all ${selectedPackage === 'B' ? 'border-[#2C3539] bg-[#F4F1ED]' : 'border-gray-200 hover:border-gray-300 bg-transparent'}`}
                        >
                            <div className="flex justify-between gap-3 items-start">
                                <span className="font-serif text-[#1A202C]">Villa Pétra</span>
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
                            <div className="text-xs text-gray-500 mt-1 font-light">The Private Enclave (1 Bed, 1 Bath)</div>
                            <div className="text-[10px] uppercase tracking-wider text-[#A89F91] mt-1.5">Up to 2 guests</div>
                        </button>

                        <button
                            onClick={() => setSelectedPackage('C')}
                            className={`w-full text-left p-4 border transition-all ${selectedPackage === 'C' ? 'border-[#2C3539] bg-[#F4F1ED]' : 'border-gray-200 hover:border-gray-300 bg-transparent'}`}
                        >
                            <div className="flex justify-between gap-3 items-start">
                                <span className="font-serif text-[#1A202C]">Grey Estate</span>
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
                            <div className="text-xs text-gray-500 mt-1 font-light">The Ultimate Sanctuary (All 4 Beds & Both Pools)</div>
                            <div className="text-[10px] uppercase tracking-wider text-[#A89F91] mt-1.5">Up to 6 guests</div>
                        </button>
                    </div>

                    {submitStatus === 'success' ? (
                        <div className="my-auto bg-[#F4F1ED] p-8 text-center rounded">
                            <h3 className="font-serif text-xl mb-4 text-[#2C3539]">Request Received</h3>
                            <p className="text-sm text-gray-600">
                                Thank you for your interest in Grey House. We have received your booking request for {date?.from ? format(date.from, 'PPP') : ''} to {date?.to ? format(date.to, 'PPP') : ''}. Our concierge team will be in touch shortly.
                            </p>
                        </div>
                    ) : selectedPackage !== 'none' ? (
                        <form className="space-y-6 flex-grow flex flex-col" onSubmit={handleBookingRequest}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">Check-in</label>
                                        <div className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] font-medium min-h-[30px]">
                                            {date?.from ? format(date.from, 'MMM dd, yyyy') : 'Select date'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">Check-out</label>
                                        <div className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] font-medium min-h-[30px]">
                                            {date?.to ? format(date.to, 'MMM dd, yyyy') : 'Select date'}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-b border-gray-200 pb-2">
                                    <span className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Guests</span>
                                    <span className="text-sm text-[#1A202C] font-medium">
                                        {selectedPackage === 'A' && '4 guests (Oneiro)'}
                                        {selectedPackage === 'B' && '2 guests (Villa Pétra)'}
                                        {selectedPackage === 'C' && '6 guests (Grey Estate)'}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1 font-light">Capacity is fixed for each experience.</p>
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Full Name"
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none focus:border-[#A89F91] placeholder-gray-400"
                                    />
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email Address"
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none focus:border-[#A89F91] placeholder-gray-400"
                                    />
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Special Requests (Optional)"
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none focus:border-[#A89F91] placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-100 flex-grow flex flex-col justify-end">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Estimated Total</div>
                                        <div className="font-serif text-2xl text-[#1A202C]">
                                            {total > 0 ? `€${total.toLocaleString()}` : '—'}
                                        </div>
                                        {stayQuote && stayQuote.discount > 0 && (
                                            <div className="text-[10px] text-emerald-700 mt-1">
                                                Includes {pricingConfig.longStayDiscountPercent}% long-stay discount (€
                                                {stayQuote.discount.toLocaleString()})
                                            </div>
                                        )}
                                    </div>
                                    {stayQuote && stayQuote.nights > 0 && (
                                        <div className="text-xs text-gray-500 font-light">
                                            {stayQuote.nights} {stayQuote.nights === 1 ? 'night' : 'nights'}
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
                                    {isSubmitting ? 'Processing...' : 'Request Booking'}
                                </button>
                                <p className="text-[10px] text-gray-400 text-center mt-4">You won't be charged yet. This is a booking request.</p>
                            </div>
                        </form>
                    ) : null}
                </div>

                {/* Right Pane - Calendar Selection */}
                <div className="flex-1 bg-white p-8 lg:p-12 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[600px] mb-8 flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={16} className="text-[#A89F91]" />
                            <span>Select your check-in and check-out dates</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs justify-end">
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-[#1A202C] rounded-full inline-block shrink-0" />
                                Selected
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full inline-block shrink-0 border-2 border-rose-600 bg-rose-50" />
                                <span className="text-rose-800">Can’t start here (min. stay)</span>
                            </span>
                        </div>
                    </div>

                    <div className="relative bg-[#FDFCFB] p-4 lg:p-8 rounded-xl border border-gray-100 shadow-sm w-full max-w-[700px] overflow-x-auto flex justify-center">
                        <DayPicker
                            mode="range"
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
                                              setSubmitError(
                                                  'That night isn’t available as a check-in — there aren’t enough consecutive nights before the next booking for the minimum stay. You can still use it as a check-out if your stay ends the night before.'
                                              );
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
                                                  setSubmitError(
                                                      'That range includes booked dates. Choose a check-out that avoids booked nights, or tap another check-in date.'
                                                  );
                                                  return;
                                              }
                                              setDate(undefined);
                                              setSubmitError(
                                                  'Those dates include booked nights. Please pick a new check-in.'
                                              );
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
                                <div className="bg-[#FDFCFB]/90 px-6 py-3 rounded-full border border-dashed border-gray-300 text-xs uppercase tracking-[0.18em] text-gray-500 text-center">
                                    Select an experience on the left to enable dates
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
                                Minimum stay: {calendarMinStayHint.minN}{' '}
                                {calendarMinStayHint.minN === 1 ? 'night' : 'nights'}
                            </span>
                            {calendarMinStayHint.touchedSeasonLabels.length > 0 ? (
                                <>
                                    {' '}
                                    (may apply across season changes). Periods near your dates:{' '}
                                    <span className="font-medium">
                                        {calendarMinStayHint.touchedSeasonLabels.join(' · ')}
                                    </span>
                                    . Choose check-out at least {calendarMinStayHint.minN}{' '}
                                    {calendarMinStayHint.minN === 1 ? 'night' : 'nights'} after check-in.
                                </>
                            ) : (
                                <>
                                    {' '}
                                    Choose check-out at least {calendarMinStayHint.minN}{' '}
                                    {calendarMinStayHint.minN === 1 ? 'night' : 'nights'} after check-in (rules tighten
                                    near season boundaries).
                                </>
                            )}
                        </div>
                    )}

                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[600px]">
                        <div className="bg-[#F4F1ED]/50 p-6 flex flex-col gap-2 rounded-sm">
                            <Info size={18} className="text-[#A89F91] mb-2" />
                            <h4 className="font-serif text-[#1A202C]">Booking Policy</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">A 50% deposit is required to secure your reservation. The remaining balance is due 30 days prior to arrival.</p>
                        </div>
                        <div className="bg-[#F4F1ED]/50 p-6 flex flex-col gap-2 rounded-sm">
                            <CreditCard size={18} className="text-[#A89F91] mb-2" />
                            <h4 className="font-serif text-[#1A202C]">Secure Payments</h4>
                            <p className="text-xs text-gray-500 leading-relaxed">All payments are processed securely via wire transfer or encrypted credit card link upon booking confirmation.</p>
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
                            Minimum stay required
                        </h2>
                        <p className="text-sm text-[#4A5568] leading-relaxed mb-2">
                            Your selection is only <strong>{minStayModal.nights}</strong>{' '}
                            {minStayModal.nights === 1 ? 'night' : 'nights'} (
                            {format(minStayModal.checkIn, 'MMM d, yyyy')} →{' '}
                            {format(minStayModal.checkOut, 'MMM d, yyyy')}).
                        </p>
                        <p className="text-sm text-[#4A5568] leading-relaxed mb-6">
                            The minimum stay for nights you selected is{' '}
                            <strong>
                                {minStayModal.required}{' '}
                                {minStayModal.required === 1 ? 'night' : 'nights'}
                            </strong>
                            {minStayModal.periodLabel ? (
                                <>
                                    {' '}
                                    (pricing periods included:{' '}
                                    <span className="font-medium text-[#1A202C]">{minStayModal.periodLabel}</span>
                                    {minStayModal.periodLabel.includes('·') ? (
                                        <span> — rules use the strictest minimum when seasons differ</span>
                                    ) : null}
                                    )
                                </>
                            ) : null}
                            . Please choose a later check-out. Your check-in is kept — pick a new check-out on the
                            calendar.
                        </p>
                        <button
                            type="button"
                            onClick={() => setMinStayModal(null)}
                            className="w-full py-3 text-[11px] uppercase tracking-[0.2em] font-bold bg-[#1A202C] text-white hover:bg-[#2C3539] transition-colors rounded-sm"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
