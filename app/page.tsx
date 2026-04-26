'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { Pause, SkipBack, SkipForward, Volume2, VolumeX, RotateCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type ReadingItem = {
  title: string; author: string | null; coverImage: string | null;
};

const THEME_COLOR_MAP: Record<string, string> = {
  sky: '#6C9AC4', pastel: '#8DB4CF', pink: '#DC4B84', dark: '#3A4458',
  wide: '#2E3D6F', purple: '#7B58D3', green: '#44A67B', yellow: '#F0B11D',
};

function HomeContent() {
  const searchParams = useSearchParams();
  const themeColor = searchParams.get('themeColor');
  const [items, setItems] = useState<ReadingItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pointColor = useMemo(() => {
    if (!themeColor) return '#6C9AC4';
    const lower = themeColor.toLowerCase();
    return THEME_COLOR_MAP[lower] || (themeColor.startsWith('#') ? themeColor : '#6C9AC4');
  }, [themeColor]);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/notion', { cache: 'no-store' });
      const data = await response.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items]);

  const data = items[currentIndex] ?? { title: '', author: '', coverImage: null };
  const totalItems = items.length;
  const currentNumber = totalItems > 0 ? currentIndex + 1 : 0;

  return (
    /* 모드별 배경색 자동 전환 유지 */
    <main className="fixed inset-0 flex h-full w-full items-center justify-center bg-white dark:bg-[#191919] p-0 overflow-hidden shadow-none transition-colors duration-300">
      
      {/* [수정] 위젯 전체 너비를 320px에서 280px로 줄이고 패딩을 조정했습니다. */}
      <div className="relative flex w-[280px] flex-col items-center rounded-[30px] border-2 border-gray-200 bg-white p-5 shadow-none overflow-hidden">
        
        {/* 상단바: 간격 조정 */}
        <div className="mb-4 flex w-full items-center justify-between px-1">
          <div className="flex gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28C840] opacity-30" />
          </div>
          <span className="text-[9px] font-black tracking-[0.2em] text-gray-400">MINIPLAY</span>
          
          <button 
            onClick={fetchData}
            className="p-1 rounded-full hover:bg-gray-100 transition-all active:scale-95"
            title="새로고침"
          >
            <RotateCw size={12} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 커버 이미지: 너비에 맞춰 크기 축소 */}
        <div className="relative mb-5 aspect-square w-full rounded-[30px] overflow-hidden bg-gray-50 shadow-inner">
          {data.coverImage && (
            <div className="relative h-full w-full">
              <img src={data.coverImage} className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110" alt="" />
              <div className="relative h-full w-full p-3 flex items-center justify-center">
                <img src={data.coverImage} className="h-full w-auto rounded-[15px] object-contain shadow-xl" alt={data.title} />
              </div>
            </div>
          )}
        </div>

        <div className="w-full">
          {/* 프로그레스 바 영역 */}
          <div className="mb-4 w-full px-1">
            <div className="mb-1.5 flex justify-between text-[9px] font-medium text-gray-400">
              <span>02:50</span>
              <span>-01:25</span>
            </div>
            <div className="relative h-[2px] w-full rounded-full bg-gray-100">
              <div className="absolute h-full w-[70%] rounded-full" style={{ backgroundColor: pointColor }} />
            </div>
          </div>

          {/* 텍스트 정보: 폰트 크기 및 간격 미세 조정 */}
          <div className="mb-6 text-center px-1">
            <h2 className="text-[13px] font-bold text-gray-800 break-words whitespace-normal leading-snug">
              {data.title || '로딩 중...'}
            </h2>
            <p className="mt-0.5 text-[10px] text-gray-500">{data.author || '저자 미상'}</p>
            {totalItems > 0 && (
              <p className="mt-1 text-[9px] font-medium text-gray-400">
                ({currentNumber} / {totalItems})
              </p>
            )}
          </div>

          {/* 컨트롤 버튼: 크기 축소 */}
          <div className="mb-6 flex items-center justify-center gap-6 text-gray-400">
            <SkipBack size={20} className="fill-current" />
            <Pause size={28} style={{ color: pointColor, fill: pointColor }} />
            <SkipForward size={20} className="fill-current" />
          </div>

          {/* 볼륨 바 영역 */}
          <div className="flex w-full items-center gap-2 px-3 pb-1">
            <VolumeX size={10} className="text-gray-400" />
            <div className="relative h-[2px] flex-grow rounded-full bg-gray-100">
              <div className="absolute h-full w-[40%] rounded-full" style={{ backgroundColor: pointColor }} />
            </div>
            <Volume2 size={10} className="text-gray-400" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}