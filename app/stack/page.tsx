'use client';

import { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { RotateCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type BookItem = {
  title: string; 
  author: string | null; 
  coverImage: string | null; 
  status: string | null;
};

const THEME_COLOR_MAP: Record<string, string> = {
  sky: '#6C9AC4', pastel: '#8DB4CF', pink: '#DC4B84', dark: '#3A4458',
  wide: '#2E3D6F', purple: '#7B58D3', green: '#44A67B', yellow: '#F0B11D',
};

const STATUS_TEXT_MAP: Record<string, string> = {
  '읽는 중': 'READING', '완독': 'FINISHED', '책바구니': 'WISH LIST', '읽기 전': 'TO READ', '하차': 'DROPPED',
};

function StackWidgetContent() {
  const searchParams = useSearchParams();
  const themeColor = searchParams.get('themeColor');
  const [items, setItems] = useState<BookItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const dragStartX = useRef<number | null>(null);
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);
  const pauseTimer = useRef<NodeJS.Timeout | null>(null);

  const extendedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return [...items, ...items, ...items];
  }, [items]);

  const pointColor = useMemo(() => {
    if (!themeColor) return '#6C9AC4';
    return THEME_COLOR_MAP[themeColor.toLowerCase()] || (themeColor.startsWith('#') ? themeColor : '#6C9AC4');
  }, [themeColor]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/library', { cache: 'no-store' });
      const data = await response.json();
      const newItems = Array.isArray(data?.items) ? data.items : [];
      if (newItems.length > 0) {
        setItems(newItems);
        setCurrentIndex(newItems.length);
      }
    } catch (err) { console.error(err); } 
    finally { setTimeout(() => setIsRefreshing(false), 800); }
  };

  useEffect(() => { fetchData(); }, []);

  // [속도 조정] 무한 루프 워프 타이머를 700ms -> 500ms로 단축
  useEffect(() => {
    if (items.length === 0) return;
    if (currentIndex >= items.length * 2) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(items.length);
      }, 500); // 속도 UP
      return () => clearTimeout(timer);
    } else if (currentIndex < items.length) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(currentIndex + items.length);
      }, 500); // 속도 UP
      return () => clearTimeout(timer);
    }
  }, [currentIndex, items.length]);

  useEffect(() => {
    if (items.length <= 1 || isPaused || isRefreshing) return;
    autoPlayTimer.current = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
    }, 5000);
    return () => { if (autoPlayTimer.current) clearInterval(autoPlayTimer.current); };
  }, [items, isPaused, isRefreshing]);

  const handleStart = (clientX: number) => {
    if (items.length === 0) return;
    setIsPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    dragStartX.current = clientX;
  };

  const handleEnd = (clientX: number) => {
    if (dragStartX.current === null) return;
    const diff = dragStartX.current - clientX;
    if (Math.abs(diff) > 50) {
      setIsTransitioning(true);
      if (diff > 0) setCurrentIndex(prev => prev + 1);
      else setCurrentIndex(prev => prev - 1);
    }
    dragStartX.current = null;
    pauseTimer.current = setTimeout(() => setIsPaused(false), 3000);
  };

  const renderBook = (item: BookItem, index: number) => {
    const isCenter = index === currentIndex;
    const scale = isCenter ? 'scale(1)' : 'scale(0.8)';
    const opacity = isCenter ? 1 : 0.5;
    const blur = isCenter ? '0px' : '2.5px';
    const displayIndex = (index % (items.length || 1)) + 1;

    return (
      <div 
        key={`book-${index}`}
        // [속도 조정] css transition 시간을 700ms -> 500ms로 단축
        className={`flex flex-col items-center shrink-0 select-none ${isTransitioning ? 'transition-all duration-500 ease-out' : ''}`}
        style={{ width: '300px', opacity, transform: scale, filter: `blur(${blur})`, zIndex: isCenter ? 30 : 10 }}
      >
        <span className="text-[12px] font-black mb-4 tracking-[0.2em] h-[20px] flex items-center" style={{ color: pointColor, opacity: isCenter ? 1 : 0 }}>
          {STATUS_TEXT_MAP[item.status || ''] || 'UNKNOWN'}
        </span>

        <div className={`relative w-[280px] aspect-[2/3] overflow-hidden ${isCenter ? 'shadow-[0_40px_80px_rgba(0,0,0,0.3)]' : ''}`} style={{ borderRadius: '60px' }}>
          {item.coverImage ? (
            <img src={item.coverImage} className="w-full h-full object-cover block pointer-events-none" alt={item.title} style={{ borderRadius: '60px' }} />
          ) : (
            /* [디자인 수정] 'NO COVER' 디자인 단순화 - 커버 안 제목 삭제 */
            <div className="w-full h-full bg-[#F2F2F2] dark:bg-[#1A1A1A] relative" style={{ borderRadius: '60px' }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
                {/* 제목을 삭제하고 NO COVER 문구만 정갈하게 배치 */}
                <span className="text-[14px] font-black text-gray-400 dark:text-gray-600 tracking-[0.4em] uppercase">NO COVER</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center w-full px-4 mt-8 transition-opacity duration-700">
          <h2 className="text-[18px] font-black text-[#111] dark:text-gray-100 leading-tight mb-1 break-keep line-clamp-2">{item.title}</h2>
          <p className="text-[14px] font-black text-[#888] truncate mb-3">{item.author || '저자 미상'}</p>
          <div className="flex justify-center w-full" style={{ visibility: isCenter ? 'visible' : 'hidden' }}>
             <span className="text-[16px] font-black text-[#555] dark:text-gray-400 tracking-[0.2em]">{displayIndex} / {items.length}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden" 
      onMouseDown={(e) => handleStart(e.clientX)} onMouseUp={(e) => handleEnd(e.clientX)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)} onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientX)}>
      <div className="absolute bottom-3 right-3 z-[100]">
        <button onClick={(e) => { e.stopPropagation(); fetchData(); }} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 bg-white/20 dark:bg-white/5 backdrop-blur-sm border border-black/5 dark:border-white/5 transition-all shadow-none">
          <RotateCw size={12} className={`text-gray-300 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }} className="relative flex flex-col items-center justify-center w-full h-full">
        {items.length > 0 ? (
          <div 
            // [속도 조정] css transition 시간을 700ms -> 500ms로 단축
            className={`flex items-center ${isTransitioning ? 'transition-transform duration-500 ease-out' : ''}`}
            style={{ transform: `translateX(calc(50% - (300px * ${currentIndex}) - 150px))` }}
          >
            {extendedItems.map((item, index) => renderBook(item, index))}
          </div>
        ) : (
          <div className="text-[14px] text-gray-300 font-black tracking-widest animate-pulse uppercase">Syncing...</div>
        )}
      </div>
    </main>
  );
}

export default function StackWidget() {
  return (
    <Suspense fallback={null}>
      <StackWidgetContent />
    </Suspense>
  );
}