import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineWidget } from 'react-calendly';
import { ArrowLeft, Clock, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ScheduleCall() {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen bg-[#FDFCFB] pt-32 pb-20 px-6 flex items-center justify-center">
            <div className="max-w-[1000px] w-full bg-white shadow-xl rounded-md overflow-hidden flex flex-col md:flex-row border border-gray-100 min-h-[650px]">
                {/* Left Info Pane */}
                <div className="w-full md:w-[400px] p-8 lg:p-12 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col">
                    <Link
                        to="/"
                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#2C3539] hover:bg-[#FDFCFB] hover:border-[#A89F91] transition-all mb-12 shrink-0 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                    </Link>

                    <h1 className="font-serif text-[32px] md:text-[40px] leading-[1.1] text-[#1A202C] mb-8 font-semibold">
                        {t('schedule.title')}
                    </h1>

                    <div className="space-y-6 text-[#4A5568] flex-grow">
                        <div className="flex items-start gap-4">
                            <Clock size={20} className="mt-0.5 shrink-0 opacity-70" strokeWidth={1.5} />
                            <span className="text-[15px] font-medium text-[#1A202C]">{t('schedule.duration')}</span>
                        </div>

                        <div className="flex items-start gap-4">
                            <Video size={20} className="mt-0.5 shrink-0 opacity-70" strokeWidth={1.5} />
                            <span className="text-[15px] leading-relaxed">{t('schedule.videoNote')}</span>
                        </div>

                        {/* Mock layout for dynamic fields that appear after date selection - hid usually on initial load in Calendly but good for layout structure */}
                        {/* 
            <div className="flex items-start gap-4">
              <CalendarIcon size={20} className="mt-0.5 shrink-0 text-gray-400" strokeWidth={1.5} />
              <span className="text-[15px] text-gray-600 font-medium">11:00 - 11:30, Tuesday, March 10, 2026</span>
            </div>
            <div className="flex items-start gap-4">
              <Globe size={20} className="mt-0.5 shrink-0 text-gray-400" strokeWidth={1.5} />
              <span className="text-[15px] text-gray-600">Israel Time</span>
            </div> 
            */}
                    </div>

                    <div className="pt-12 mt-auto flex gap-6 text-[11px] font-medium text-[#0060E6]">
                        <a href="#" className="hover:underline">{t('schedule.cookies')}</a>
                        <a href="#" className="hover:underline">{t('schedule.privacy')}</a>
                    </div>
                </div>

                {/* Right Calendly Widget */}
                <div className="w-full md:flex-1 relative bg-white">
                    <div className="absolute top-0 right-0 z-10 w-24 h-24 overflow-hidden pointer-events-none">
                        {/* Decorative standard Calendly triangle ribbon */}
                        <div className="absolute top-6 -right-6 bg-gray-600 text-[8px] uppercase tracking-wider text-white font-bold py-1 px-8 rotate-45 transform origin-center shadow-sm">
                            Powered By
                            <br />Calendly
                        </div>
                    </div>
                    <div className="w-full h-full min-h-[600px] relative z-0">
                        <InlineWidget
                            url="https://calendly.com/gali-greyvilla"
                            styles={{
                                height: '100%',
                                width: '100%',
                                minHeight: '650px',
                                border: 'none',
                            }}
                            pageSettings={{
                                backgroundColor: 'ffffff',
                                hideEventTypeDetails: true, // We show them on the left pane instead matching the design
                                hideGdprBanner: true
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
