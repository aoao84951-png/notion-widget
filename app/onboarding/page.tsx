'use client';

import { useMemo, useState } from 'react';
import { Check, Database, Laptop, Loader2, Link2, Palette, Plug, SunMoon } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

type ThemeOption = {
  id: string;
  label: string;
  primary: string;
  soft: string;
};

type NotionDatabase = {
  id: string;
  title: string;
  lastEditedTime: string;
};

const STEP_ITEMS: { id: Step; label: string }[] = [
  { id: 1, label: '01 연결' },
  { id: 2, label: '02 선택' },
  { id: 3, label: '03 디자인' },
  { id: 4, label: '04 완료' },
];

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'sky', label: '스카이', primary: '#6C9AC4', soft: '#DCE9F5' },
  { id: 'pastel', label: '파스텔', primary: '#8DB4CF', soft: '#E5EDF5' },
  { id: 'pink', label: '핑크', primary: '#DC4B84', soft: '#F9D9E7' },
  { id: 'dark', label: '다크', primary: '#3A4458', soft: '#D4D9E2' },
  { id: 'wide', label: '와이드', primary: '#2E3D6F', soft: '#DBE1F8' },
  { id: 'purple', label: '보라', primary: '#7B58D3', soft: '#E6E0F7' },
  { id: 'green', label: '그린', primary: '#44A67B', soft: '#DAF1E7' },
  { id: 'yellow', label: '레몬', primary: '#F0B11D', soft: '#FFF2CB' },
];

function getDatabaseTitle(item: any) {
  const title = item?.title?.[0]?.plain_text;
  return typeof title === 'string' && title.trim().length > 0 ? title : '제목 없는 데이터베이스';
}

function toLocalDateText(isoDate: string) {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);

  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [databaseError, setDatabaseError] = useState('');

  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDbId, setSelectedDbId] = useState('');

  const [theme, setTheme] = useState<ThemeOption>(THEME_OPTIONS[0]);
  const [opacity, setOpacity] = useState(95);
  const [darkMode, setDarkMode] = useState(false);

  const selectedDatabase = useMemo(
    () => databases.find((item) => item.id === selectedDbId) ?? null,
    [databases, selectedDbId]
  );

  const embedLink = useMemo(() => {
    if (!selectedDbId) return '';
    if (typeof window === 'undefined') return '';

    const params = new URLSearchParams({
      dbId: selectedDbId,
      theme: theme.id,
      opacity: String(opacity),
      dark: darkMode ? '1' : '0',
    });

    return `${window.location.origin}/embed?${params.toString()}`;
  }, [darkMode, opacity, selectedDbId, theme.id]);

  const canMoveToDesign = selectedDbId.length > 0;
  const canMoveToDone = Boolean(selectedDbId && theme.id);

  const runNotionDatabaseSearch = async (inputToken: string) => {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${inputToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object',
        },
        page_size: 50,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || '토큰 확인에 실패했어요.');
    }

    const parsed: NotionDatabase[] = (data?.results ?? []).map((item: any) => ({
      id: item.id,
      title: getDatabaseTitle(item),
      lastEditedTime: item.last_edited_time,
    }));

    return parsed;
  };

  const handleConnect = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      setTokenError('Notion API 토큰을 입력해 주세요.');
      return;
    }

    setTokenError('');
    setDatabaseError('');
    setIsCheckingToken(true);

    try {
      const fetched = await runNotionDatabaseSearch(trimmed);
      setDatabases(fetched);
      setSelectedDbId(fetched[0]?.id ?? '');
      setStep(2);
    } catch (error) {
      setTokenError(error instanceof Error ? error.message : '토큰 검증 중 오류가 발생했어요.');
    } finally {
      setIsCheckingToken(false);
    }
  };

  const handleRefreshDatabases = async () => {
    setDatabaseError('');
    setIsLoadingDatabases(true);

    try {
      const fetched = await runNotionDatabaseSearch(token.trim());
      setDatabases(fetched);
      if (!selectedDbId && fetched.length > 0) {
        setSelectedDbId(fetched[0].id);
      }
    } catch (error) {
      setDatabaseError(error instanceof Error ? error.message : '데이터베이스 목록을 불러오지 못했어요.');
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#EAF2FA] bg-[radial-gradient(#dbe9f6_1px,transparent_1px)] [background-size:24px_24px] p-4 md:p-8">
      <div className="mx-auto flex w-full max-w-[620px] flex-col items-center">
        <section className="w-full rounded-[26px] border border-[#D6E4F1] bg-white/92 p-6 shadow-[0_18px_50px_rgba(108,154,196,0.2)] backdrop-blur-md">
          <header className="mb-6 flex items-center justify-between border-b border-[#EBF2F8] pb-4">
            <div className="flex items-center gap-2 text-[#6C8BA8]">
              <Laptop size={17} />
              <p className="text-lg font-bold tracking-wide">READING FLOW</p>
            </div>
            <div className="flex gap-2">
              <span className="h-3 w-3 rounded-full bg-[#E5EAF0]" />
              <span className="h-3 w-3 rounded-full bg-[#E5EAF0]" />
              <span className="h-3 w-3 rounded-full bg-[#FF7070]" />
            </div>
          </header>

          <div className="mb-9 grid grid-cols-4 gap-2">
            {STEP_ITEMS.map((item) => {
              const isActive = step === item.id;
              const isPassed = step > item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 1) setStep(1);
                    if (item.id === 2 && databases.length > 0) setStep(2);
                    if (item.id === 3 && canMoveToDesign) setStep(3);
                    if (item.id === 4 && canMoveToDone) setStep(4);
                  }}
                  className={[
                    'rounded-full px-3 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'bg-[#6C9AC4] text-white shadow-[0_6px_16px_rgba(108,154,196,0.35)]'
                      : isPassed
                      ? 'bg-[#DCE9F5] text-[#5A7D9E]'
                      : 'bg-[#F3F6FA] text-[#9AAFC1]',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {step === 1 && (
            <div className="mx-auto flex w-full max-w-[440px] flex-col items-center">
              <div className="mb-6 rounded-full bg-[#E7F0F8] p-5 text-[#6C9AC4]">
                <Plug size={30} />
              </div>
              <h2 className="text-center text-3xl font-bold text-[#30455A]">노션과 연결해볼까요?</h2>
              <p className="mt-3 text-center text-[15px] text-[#738CA2]">
                Integration Token을 입력하면 데이터베이스를 가져올 수 있어요.
              </p>

              <div className="mt-9 w-full">
                <label className="mb-2 block text-sm font-bold text-[#3D5369]">API TOKEN</label>
                <input
                  type="password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="secret_..."
                  className="w-full rounded-2xl border border-[#DCE8F3] bg-[#F9FCFF] px-4 py-3 text-[#2E4154] outline-none transition focus:border-[#93B7D8] focus:ring-2 focus:ring-[#CBE0F3]"
                />
                {tokenError && <p className="mt-2 text-sm text-[#CF4863]">{tokenError}</p>}
              </div>

              <button
                type="button"
                onClick={handleConnect}
                disabled={isCheckingToken}
                className="mt-8 self-end rounded-2xl bg-[#6C9AC4] px-7 py-3 text-base font-bold text-white shadow-[0_8px_22px_rgba(108,154,196,0.35)] transition hover:bg-[#5A8BB8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCheckingToken ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} />
                    확인 중
                  </span>
                ) : (
                  '다음 단계로 >'
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto w-full max-w-[470px]">
              <h2 className="text-center text-3xl font-bold text-[#30455A]">데이터베이스 선택</h2>
              <p className="mt-2 text-center text-sm text-[#738CA2]">
                API 키로 조회한 노션 데이터베이스 목록 중 하나를 선택해 주세요.
              </p>

              <div className="mt-6 max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {databases.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#C8D9E8] bg-[#F9FCFF] p-5 text-center text-sm text-[#738CA2]">
                    연결된 데이터베이스가 없습니다.
                  </div>
                )}
                {databases.map((item) => {
                  const checked = selectedDbId === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setSelectedDbId(item.id)}
                      className={[
                        'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition',
                        checked
                          ? 'border-[#85AFD4] bg-[#EEF6FD] shadow-[0_4px_14px_rgba(108,154,196,0.2)]'
                          : 'border-[#E1EBF4] bg-white hover:border-[#B8D0E5]',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-xl border',
                          checked ? 'border-[#85AFD4] bg-white text-[#6C9AC4]' : 'border-[#DCE8F2] text-[#B2C3D3]',
                        ].join(' ')}
                      >
                        <Database size={17} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-base font-bold text-[#30455A]">{item.title}</span>
                        <span className="mt-1 block text-xs text-[#7E95AA]">
                          마지막 수정일: {toLocalDateText(item.lastEditedTime)}
                        </span>
                      </span>
                      {checked && (
                        <span className="rounded-full bg-[#6C9AC4] p-1 text-white">
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {databaseError && <p className="mt-3 text-sm text-[#CF4863]">{databaseError}</p>}

              <div className="mt-7 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-2xl border border-[#D7E4EF] bg-white px-5 py-3 font-semibold text-[#5F7F9D]"
                >
                  이전
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshDatabases}
                    disabled={isLoadingDatabases}
                    className="rounded-2xl border border-[#D7E4EF] bg-white px-5 py-3 font-semibold text-[#5F7F9D] disabled:opacity-70"
                  >
                    {isLoadingDatabases ? '불러오는 중...' : '새로고침'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canMoveToDesign}
                    className="rounded-2xl bg-[#6C9AC4] px-6 py-3 font-bold text-white shadow-[0_8px_22px_rgba(108,154,196,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto w-full max-w-[480px]">
              <h2 className="text-center text-3xl font-bold text-[#30455A]">테마 선택</h2>

              <div className="mt-6 rounded-3xl border border-[#E3ECF4] bg-[#F9FCFF] p-4">
                <div className="mb-4 flex items-center gap-2 text-[#3E5970]">
                  <Palette size={16} />
                  <span className="text-sm font-semibold">테마 색상</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {THEME_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTheme(item)}
                      className={[
                        'rounded-2xl border p-3 transition',
                        theme.id === item.id ? 'border-[#8CB3D6] bg-white' : 'border-transparent bg-white/70',
                      ].join(' ')}
                    >
                      <span className="mb-2 flex items-center justify-center gap-1">
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: item.primary }} />
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: item.soft }} />
                      </span>
                      <span className="text-sm font-semibold text-[#3E5970]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-[#E3ECF4] bg-[#F9FCFF] p-4">
                <label className="mb-2 flex items-center justify-between text-sm font-semibold text-[#3E5970]">
                  배경 투명도
                  <span className="font-bold text-[#6C9AC4]">{opacity}%</span>
                </label>
                <input
                  type="range"
                  min={40}
                  max={100}
                  step={1}
                  value={opacity}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  className="w-full accent-[#6C9AC4]"
                />

                <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#DDE9F3] bg-white px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#3E5970]">
                    <SunMoon size={15} />
                    NOTION DARK MODE
                  </span>
                  <button
                    type="button"
                    onClick={() => setDarkMode((prev) => !prev)}
                    className={[
                      'relative h-7 w-12 rounded-full transition',
                      darkMode ? 'bg-[#6C9AC4]' : 'bg-[#DDE7F1]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
                        darkMode ? 'left-6' : 'left-1',
                      ].join(' ')}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-[#E3ECF4] bg-white p-4">
                <p className="text-center text-xs font-bold text-[#6E89A3]">LIVE PREVIEW</p>
                <div
                  className="mx-auto mt-3 flex h-[170px] w-[210px] flex-col items-center justify-center rounded-2xl border text-center"
                  style={{
                    borderColor: theme.primary,
                    backgroundColor: `${theme.soft}${Math.round((opacity / 100) * 255)
                      .toString(16)
                      .padStart(2, '0')}`,
                    color: darkMode ? '#FFFFFF' : '#30455A',
                  }}
                >
                  <p className="text-4xl font-light">14:09</p>
                  <p className="mt-1 text-xs font-semibold opacity-70">SUN, APR 26</p>
                  <p className="mt-4 text-xs font-semibold opacity-80">{selectedDatabase?.title ?? 'DATABASE'}</p>
                </div>
              </div>

              <div className="mt-7 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-2xl border border-[#D7E4EF] bg-white px-5 py-3 font-semibold text-[#5F7F9D]"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="rounded-2xl bg-[#6C9AC4] px-6 py-3 font-bold text-white shadow-[0_8px_22px_rgba(108,154,196,0.35)]"
                >
                  완료 및 생성
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mx-auto w-full max-w-[470px]">
              <h2 className="text-center text-3xl font-bold text-[#30455A]">완료!</h2>
              <p className="mt-2 text-center text-sm text-[#738CA2]">
                아래 링크를 복사해 임베드에 사용하세요.
              </p>

              <div className="mt-7 space-y-4 rounded-3xl border border-[#E3ECF4] bg-[#F9FCFF] p-5">
                <div className="rounded-2xl border border-[#DCE8F2] bg-white p-4 text-sm text-[#3E5970]">
                  <p className="mb-1 font-semibold">선택된 데이터베이스</p>
                  <p className="text-[#6484A0]">{selectedDatabase?.title ?? '-'}</p>
                </div>

                <div className="rounded-2xl border border-[#DCE8F2] bg-white p-4 text-sm text-[#3E5970]">
                  <p className="mb-2 font-semibold">생성된 임베드 링크</p>
                  <div className="break-all rounded-xl bg-[#F2F7FC] px-3 py-2 font-mono text-xs text-[#496782]">
                    {embedLink}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!embedLink) return;
                      await navigator.clipboard.writeText(embedLink);
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#6C9AC4] px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Link2 size={14} />
                    링크 복사
                  </button>
                </div>

                <div className="rounded-2xl border border-[#DCE8F2] bg-white p-4 text-sm text-[#3E5970]">
                  <p>theme: {theme.id}</p>
                  <p>opacity: {opacity}</p>
                  <p>dark mode: {darkMode ? 'on' : 'off'}</p>
                </div>
              </div>

              <div className="mt-7 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-2xl border border-[#D7E4EF] bg-white px-5 py-3 font-semibold text-[#5F7F9D]"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setToken('');
                    setDatabases([]);
                    setSelectedDbId('');
                    setTheme(THEME_OPTIONS[0]);
                    setOpacity(95);
                    setDarkMode(false);
                  }}
                  className="rounded-2xl bg-[#6C9AC4] px-6 py-3 font-bold text-white shadow-[0_8px_22px_rgba(108,154,196,0.35)]"
                >
                  처음으로
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-sm text-[#5E758B]">
          <p className="font-semibold">created by SOMLUTION</p>
          <p className="mt-1">❤️ X (@somnote_) &nbsp; | &nbsp; 💌 somlution@gmail.com</p>
        </footer>
      </div>
    </main>
  );
}
