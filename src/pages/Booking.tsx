import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar as CalendarIcon, Info, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, differenceInDays } from 'date-fns';
import 'react-day-picker/style.css';

export default function Booking() {
    const [date, setDate] = useState<DateRange | undefined>();
    const [guests, setGuests] = useState('2');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [disabledDates, setDisabledDates] = useState<DateRange[]>([]);

    useEffect(() => {
        // Fetch booked dates to disable them on the calendar
        fetch('/api/bookings/dates')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const parsedDates = data.map((d: any) => ({
                        from: new Date(d.from),
                        to: new Date(d.to)
                    }));
                    setDisabledDates(parsedDates);
                }
            })
            .catch(err => console.error("Failed to load disabled dates", err));
    }, []);

    // Assume nightly rate for demo
    const nightlyRate = 850;

    const nights = date?.from && date?.to ? differenceInDays(date.to, date.from) : 0;
    const total = nights > 0 ? nights * nightlyRate : 0;

    const handleBookingRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date?.from || !date?.to) return;

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    guests,
                    message,
                    checkIn: date.from.toISOString(),
                    checkOut: date.to.toISOString(),
                    total
                })
            });

            if (response.ok) {
                setSubmitStatus('success');
            } else {
                setSubmitStatus('error');
            }
        } catch (err) {
            setSubmitStatus('error');
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
                        Select your dates to request a booking at Grey House. We will review your request and contact you directly to arrange payment and details.
                    </p>

                    {submitStatus === 'success' ? (
                        <div className="my-auto bg-[#F4F1ED] p-8 text-center rounded">
                            <h3 className="font-serif text-xl mb-4 text-[#2C3539]">Request Received</h3>
                            <p className="text-sm text-gray-600">
                                Thank you for your interest in Grey House. We have received your booking request for {date?.from ? format(date.from, 'PPP') : ''} to {date?.to ? format(date.to, 'PPP') : ''}. Our concierge team will be in touch shortly.
                            </p>
                        </div>
                    ) : (
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

                                <div className="pt-2">
                                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">Guests</label>
                                    <select
                                        value={guests}
                                        onChange={(e) => setGuests(e.target.value)}
                                        className="w-full border-b border-gray-200 pb-2 text-sm text-[#1A202C] bg-transparent focus:outline-none"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(num => (
                                            <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                                        ))}
                                    </select>
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
                                    </div>
                                    {nights > 0 && (
                                        <div className="text-xs text-gray-500 font-light">
                                            {nights} {nights === 1 ? 'night' : 'nights'}
                                        </div>
                                    )}
                                </div>

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
                    )}
                </div>

                {/* Right Pane - Calendar Selection */}
                <div className="flex-1 bg-white p-8 lg:p-12 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[600px] mb-8 flex justify-between items-center text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={16} className="text-[#A89F91]" />
                            <span>Select your check-in and check-out dates</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="w-3 h-3 bg-[#1A202C] rounded-full inline-block"></span>
                            <span>Selected</span>
                        </div>
                    </div>

                    <div className="bg-[#FDFCFB] p-4 lg:p-8 rounded-xl border border-gray-100 shadow-sm w-full max-w-[700px] overflow-x-auto flex justify-center">
                        <DayPicker
                            mode="range"
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={window.innerWidth > 768 ? 2 : 1}
                            pagedNavigation
                            disabled={[{ before: new Date() }, ...disabledDates]} // Disable past dates and booked dates
                            className="bg-transparent"
                            style={{ margin: 0 }}
                        />
                    </div>

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
        </div>
    );
}
