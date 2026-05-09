import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Slide {
    id: string;
    image: string;
    title?: string;
    subtitle?: string;
    link?: string;
}

interface Props {
    children?: React.ReactNode;
    slides?: Slide[];
    autoPlay?: boolean;
    interval?: number;
    className?: string;
    showDots?: boolean;
    showArrows?: boolean;
    onBannerClick?: (link: string) => void;
}

export const BannerCarousel: React.FC<Props> = ({
    children,
    slides = [],
    autoPlay = false,
    interval = 5000,
    className,
    showDots = true,
    showArrows = true,
    onBannerClick
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Convert children to array if it's not already
    const childArray = React.Children.toArray(children);
    const items = slides.length > 0 ? slides : childArray;
    const count = items.length;

    const nextSlide = () => {
        if (count > 0) setCurrentIndex((prev) => (prev + 1) % count);
    };

    const prevSlide = () => {
        if (count > 0) setCurrentIndex((prev) => (prev - 1 + count) % count);
    };

    useEffect(() => {
        if (!autoPlay || count <= 1) return;
        const timer = setInterval(nextSlide, interval);
        return () => clearInterval(timer);
    }, [autoPlay, interval, count]);

    if (count === 0) return null;

    return (
        <div className={`relative overflow-hidden rounded-2xl h-full group ${className}`}>
            <div 
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {slides.length > 0 ? (
                    slides.map((slide, index) => (
                        <div
                            key={slide.id || index}
                            className="w-full flex-shrink-0 relative h-full cursor-pointer overflow-hidden group"
                            onClick={() => {
                                if (slide.link && onBannerClick) {
                                    onBannerClick(slide.link);
                                } else if (slide.link) {
                                    window.open(slide.link, '_blank');
                                }
                            }}
                        >
                            <img
                                src={slide.image}
                                alt={slide.title || ''}
                                className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80"></div>
                            {(slide.title || slide.subtitle) && (
                                <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform transition-all duration-500 translate-y-0">
                                    {slide.title && <h3 className="font-bold text-2xl mb-1 drop-shadow-md animate-in slide-in-from-bottom-2 fade-in duration-700">{slide.title}</h3>}
                                    {slide.subtitle && <p className="text-sm font-medium opacity-90 drop-shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-1000 delay-100">{slide.subtitle}</p>}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    childArray.map((child, index) => (
                        <div key={index} className="w-full flex-shrink-0 h-full">
                            {child}
                        </div>
                    ))
                )}
            </div>

            {/* Arrows */}
            {showArrows && count > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight size={24} />
                    </button>
                </>
            )}

            {/* Dots */}
            {showDots && count > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                            className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-white w-6' : 'bg-white/40 w-2 hover:bg-white/60'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
