'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
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

  const pointColor = useMemo(() => {
    if (!themeColor) return '#6C9AC4';
    return THEME_COLOR_MAP[themeColor.toLowerCase()] || (themeColor.startsWith('#') ? themeColor : '#6C9AC4');
  }, [themeColor]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/library', { cache: 'no-store' });
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  useEffect(() => { fetchData(); }, []);
  
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items]);

  const getIndex = (offset: number) => {
    if (items.length === 0) return -1;
    return (currentIndex + offset + items.length) % items.length;
  };

  const renderBook = (offset: number) => {
    const idx = getIndex(offset);
    if (idx === -1) return null;
    const item = items[idx];
    const isCenter = offset === 0;
    const statusLabel = STATUS_TEXT_MAP[item.status || ''] || (item.status?.toUpperCase() || 'UNKNOWN');

    return (
      <div className={`transition-all duration-1000 ease-in-out flex flex-col items-center shrink-0
        ${isCenter 
          ? 'z-30 scale-100 opacity-100 w-[280px]' 
          : 'z-10 scale-[0.8] opacity-15 w-[160px] blur-[3px] pointer-events-none'}`}>
        
        <span className={`text-[10px] font-black mb-4 tracking-[0.2em] transition-opacity duration-700 ${isCenter ? 'opacity-100' : 'opacity-0'}`} style={{ color: pointColor }}>
          {statusLabel}
        </span>

        <div 
          className={`relative w-full aspect-[2/3] overflow-hidden bg-gray-200 transition-all duration-1000 ${isCenter ? 'shadow-[0_30px_60px_rgba(0,0,0,0.3)]' : ''}`}
          style={{ borderRadius: '60px' }} 
        >
          {item.coverImage ? (
            <img 
              src={item.coverImage} 
              className="w-full h-full object-cover block" 
              alt={item.title} 
              style={{ borderRadius: '60px' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Cover</div>
          )}
        </div>

        <div className={`text-center w-full px-4 mt-8 transition-all duration-700 ${isCenter ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-[17px] font-black text-[#111] dark:text-gray-100 leading-tight mb-2 break-keep tracking-[0.1em]">
            {item.title}
          </h2>
          {/* 저자 텍스트 스타일 수정: font-black 및 tracking 적용 */}
          <p className="text-[13px] font-black text-[#888] tracking-[0.1em]">
            {item.author || '저자 미상'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden !shadow-none">
      <div className="relative flex w-full h-full flex-col items-center justify-center">
        
        <div className="absolute top-10 right-10 z-50">
          <button onClick={fetchData} className="p-2.5 rounded-full hover:bg-black/5 active:scale-90 bg-white/30 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 transition-all">
            <RotateCw size={18} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative flex w-full items-center justify-center gap-10 md:gap-24">
          {items.length > 0 ? (
            <>
              {renderBook(-1)}
              {renderBook(0)}
              {renderBook(1)}
            </>
          ) : (
            <div className="text-[12px] text-gray-300 font-black tracking-widest animate-pulse">Syncing...</div>
          )}
        </div>

        <div className="absolute bottom-12 text-[10px] font-black text-[#ccc] tracking-[0.4em]">
           {items.length > 0 ? `${currentIndex + 1} / ${items.length}` : '0 / 0'}
        </div>
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