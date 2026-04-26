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
    
    const cardWidth = isCenter ? '280px' : '220px'; 
    const scale = isCenter ? 'scale(1)' : 'scale(0.85)';
    const opacity = isCenter ? 1 : 0.3;
    const blur = isCenter ? '0px' : '1.5px';
    const zIndex = isCenter ? 30 : 10;

    const statusLabel = STATUS_TEXT_MAP[item.status || ''] || (item.status?.toUpperCase() || 'UNKNOWN');

    return (
      <div 
        className="transition-all duration-1000 ease-in-out flex flex-col items-center shrink-0"
        style={{ 
          width: cardWidth,
          opacity: opacity,
          zIndex: zIndex,
          transform: scale,
          filter: `blur(${blur})`,
          pointerEvents: isCenter ? 'auto' : 'none'
        }}
      >
        <span 
          className="text-[12px] font-black mb-4 tracking-[0.2em] transition-opacity duration-700 h-[20px] flex items-center" 
          style={{ color: pointColor, opacity: isCenter ? 1 : 0 }}
        >
          {statusLabel}
        </span>

        <div 
          className={`relative w-full aspect-[2/3] overflow-hidden bg-gray-200 transition-all duration-1000 ${isCenter ? 'shadow-[0_40px_80px_rgba(0,0,0,0.3)]' : ''}`}
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
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold bg-gray-100">NO COVER</div>
          )}
        </div>

        <div className="text-center w-full px-4 mt-8 transition-all duration-700">
          <h2 className="text-[18px] font-black text-[#111] dark:text-gray-100 leading-tight mb-2 break-keep tracking-[0.05em] line-clamp-2">
            {item.title}
          </h2>
          <p className="text-[14px] font-black text-[#888] tracking-[0.05em] truncate mb-3">
            {item.author || '저자 미상'}
          </p>

          <div className="flex justify-center w-full" style={{ opacity: isCenter ? 1 : 0 }}>
             <span className="text-[16px] font-black text-[#555] dark:text-gray-400 tracking-[0.2em]">
                {currentIndex + 1} / {items.length}
              </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="fixed inset-0 flex items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden !shadow-none">
      
      {/* [진짜 크기 수정] zoom을 제거하고, 기기 화면 너비에 반응하는 단위(vw) 적용 */}
      {/* 이렇게 해야 맥과 아이패드 모두에서 동일하게 작고 정갈한 비율로 보입니다. */}
      <div 
        className="absolute top-10 right-10 z-[100] flex items-center justify-center"
        // vw 단위를 사용하여 화면 너비가 커지면(맥) 자동으로 수치가 계산되어 폰트가 작아지게 설정
        style={{ fontSize: '1.2vw' }} // 맥에서는 대략 18px~22px 사이로 렌더링됨
      >
        <button 
          onClick={fetchData} 
          // 버튼 크기와 패딩도 vw 단위를 기준으로 설정
          className="p-[0.8vw] rounded-full hover:bg-black/5 active:scale-90 bg-white/40 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 transition-all shadow-sm flex items-center justify-center"
        >
          {/* 아이콘 크기도 vw 단위를 기준으로 설정하여 완벽한 비율 동기화 */}
          <RotateCw style={{ width: '1.5vw', height: '1.5vw' }} className={`text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div 
        style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }} 
        className="relative flex flex-col items-center justify-center min-w-[1400px] h-full"
      >
        <div className="flex items-center justify-center gap-12 w-full translate-y-[-20px]">
          {items.length > 0 ? (
            <>
              {renderBook(-2)}
              {renderBook(-1)}
              {renderBook(0)}
              {renderBook(1)}
              {renderBook(2)}
            </>
          ) : (
            <div className="text-[14px] text-gray-300 font-black tracking-widest animate-pulse">Syncing...</div>
          )}
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