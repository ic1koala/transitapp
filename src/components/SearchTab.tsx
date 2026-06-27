import React, { useState, useEffect } from 'react';
import { Search, MapPin, Compass, Clock, Star, ArrowLeftRight, Plus, Trash2, Calendar, Clock as ClockIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface Place {
  id: string;
  endpoint: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  description?: string;
}

interface SearchTabProps {
  onSearch: (
    from: Place,
    to: Place,
    vias: Place[],
    searchType: 'departure' | 'arrival' | 'first' | 'last',
    targetDate: string,
    targetTime: string
  ) => void;
  initialFrom?: { name: string; endpoint: string } | null;
  initialTo?: { name: string; endpoint: string } | null;
  onClearFrom?: () => void;
  onClearTo?: () => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  onSearch,
  initialFrom,
  initialTo,
  onClearFrom,
  onClearTo
}) => {
  // 1. 出発地・目的地
  const [fromInput, setFromInput] = useState(initialFrom?.name || '');
  const [fromPlace, setFromPlace] = useState<Place | null>(initialFrom ? { ...initialFrom, id: '', kind: 'station', lat: 0, lon: 0 } : null);
  
  const [toInput, setToInput] = useState(initialTo?.name || '');
  const [toPlace, setToPlace] = useState<Place | null>(initialTo ? { ...initialTo, id: '', kind: 'station', lat: 0, lon: 0 } : null);

  // 2. 経由地 (最大3つ)
  const [vias, setVias] = useState<{ id: string; input: string; place: Place | null }[]>([]);

  // 3. 日時指定アコーディオンの開閉状態 (Yahoo風)
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  // 4. 日時指定状態
  const [timeType, setTimeType] = useState<'now' | 'custom' | 'first' | 'last'>('now');
  const [searchType, setSearchType] = useState<'departure' | 'arrival' | 'first' | 'last'>('departure');
  
  const getTodayString = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getTimeString = (dateObj: Date) => {
    const h = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  };

  const [targetDate, setTargetDate] = useState(getTodayString(new Date()));
  const [targetTime, setTargetTime] = useState(getTimeString(new Date()));

  // 5. サジェスト関連
  const [suggests, setSuggests] = useState<Place[]>([]);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | number | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // 6. 周辺駅・履歴・お気に入り
  const [nearbyStations, setNearbyStations] = useState<Place[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [recentSearches, setRecentSearches] = useState<{ from: Place; to: Place }[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<Place[]>([]);

  // 初期値の同期
  useEffect(() => {
    if (initialFrom) {
      setFromPlace({ ...initialFrom, id: '', kind: 'station', lat: 0, lon: 0 });
      setFromInput(initialFrom.name);
    }
    if (initialTo) {
      setToPlace({ ...initialTo, id: '', kind: 'station', lat: 0, lon: 0 });
      setToInput(initialTo.name);
    }
  }, [initialFrom, initialTo]);

  // 初期読み込み
  useEffect(() => {
    const history = localStorage.getItem('transit_history');
    if (history) setRecentSearches(JSON.parse(history));

    const favs = localStorage.getItem('transit_favorites');
    if (favs) setFavoriteStations(JSON.parse(favs));

    fetchNearbyStations();
  }, []);

  // サジェストAPI
  useEffect(() => {
    let query = '';
    if (activeInput === 'from') query = fromInput;
    else if (activeInput === 'to') query = toInput;
    else if (typeof activeInput === 'number') query = vias[activeInput]?.input || '';

    if (!query || query.length < 2 || activeInput === null) {
      setSuggests([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggest(true);
      try {
        const res = await fetch(`https://api.transit.ls8h.com/api/v1/places/suggest?q=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setSuggests(data.places || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSuggest(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [fromInput, toInput, vias, activeInput]);

  // 周辺駅取得
  const fetchNearbyStations = () => {
    if (!navigator.geolocation) return;
    setLoadingNearby(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://api.transit.ls8h.com/api/v1/places/reverse?lat=${latitude}&lon=${longitude}&limit=6&radiusMeters=500`);
          if (res.ok) {
            const data = await res.json();
            setNearbyStations(data.places || []);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingNearby(false);
        }
      },
      (err) => {
        console.warn(err);
        setLoadingNearby(false);
      }
    );
  };

  // 現在地を設定
  const handleSetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const endpoint = `geo:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      const place = { id: 'current', endpoint, name: '現在地', kind: 'place', lat: latitude, lon: longitude };
      setFromPlace(place);
      setFromInput('現在地');
      setActiveInput(null);
    });
  };

  // プレース選択時
  const handleSelectPlace = (place: Place) => {
    if (activeInput === 'from') {
      setFromPlace(place);
      setFromInput(place.name);
    } else if (activeInput === 'to') {
      setToPlace(place);
      setToInput(place.name);
    } else if (typeof activeInput === 'number') {
      const updated = [...vias];
      updated[activeInput] = { ...updated[activeInput], input: place.name, place };
      setVias(updated);
    }
    setSuggests([]);
    setActiveInput(null);
  };

  // 経由地追加
  const handleAddVia = () => {
    if (vias.length >= 3) return;
    setVias([...vias, { id: Math.random().toString(), input: '', place: null }]);
  };

  // 経由地削除
  const handleRemoveVia = (index: number) => {
    setVias(vias.filter((_, idx) => idx !== index));
    if (activeInput === index) setActiveInput(null);
  };

  // 経由地入力更新
  const handleViaInputChange = (index: number, val: string) => {
    const updated = [...vias];
    updated[index] = { ...updated[index], input: val, place: val === '' ? null : updated[index].place };
    setVias(updated);
  };

  const handleSwap = () => {
    const tempInput = fromInput;
    const tempPlace = fromPlace;
    setFromInput(toInput);
    setFromPlace(toPlace);
    setToInput(tempInput);
    setToPlace(tempPlace);
  };

  // 検索ボタンクリック
  const handleSearchClick = async () => {
    let finalFrom = fromPlace;
    let finalTo = toPlace;

    if (!fromInput.trim()) {
      alert('出発地を入力してください。');
      return;
    }
    if (!toInput.trim()) {
      alert('目的地を入力してください。');
      return;
    }

    if (!finalFrom) {
      try {
        const res = await fetch(`https://api.transit.ls8h.com/api/v1/places/suggest?q=${encodeURIComponent(fromInput)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.places && data.places.length > 0) {
            const resolvedPlace = data.places[0];
            finalFrom = resolvedPlace;
            setFromPlace(resolvedPlace);
            setFromInput(resolvedPlace.name);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (!finalTo) {
      try {
        const res = await fetch(`https://api.transit.ls8h.com/api/v1/places/suggest?q=${encodeURIComponent(toInput)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.places && data.places.length > 0) {
            const resolvedPlace = data.places[0];
            finalTo = resolvedPlace;
            setToPlace(resolvedPlace);
            setToInput(resolvedPlace.name);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    const fromP = finalFrom;
    const toP = finalTo;

    if (!fromP || !toP) {
      alert('入力された出発地または目的地が見つかりませんでした。正しい駅名を入力し、サジェストから選択するか再試行してください。');
      return;
    }

    let apiDate = '';
    let apiTime = '';
    let apiSearchType: 'departure' | 'arrival' | 'first' | 'last' = 'departure';

    if (timeType === 'now') {
      const now = new Date();
      apiDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      apiTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      apiSearchType = 'departure';
    } else if (timeType === 'custom') {
      apiDate = targetDate.replace(/-/g, '');
      apiTime = targetTime;
      apiSearchType = searchType;
    } else {
      apiDate = targetDate.replace(/-/g, '');
      apiTime = '04:00';
      apiSearchType = timeType;
    }

    const viaPlaces = vias.map(v => v.place).filter((p): p is Place => p !== null);
    onSearch(fromP, toP, viaPlaces, apiSearchType, apiDate, apiTime);
  };

  const getFormattedDateTimeLabel = () => {
    if (timeType === 'now') {
      return '現在時刻 出発';
    }
    const [, m, d] = targetDate.split('-');
    const typeLabel = timeType === 'first' ? '始発' : timeType === 'last' ? '終電' : (searchType === 'departure' ? '出発' : '到着');
    if (timeType === 'first' || timeType === 'last') {
      return `${m}月${d}日 ${typeLabel}`;
    }
    return `${m}月${d}日 ${targetTime} ${typeLabel}`;
  };

  return (
    <div className="flex flex-col flex-1" style={{ height: '100%' }}>
      {/* 検索パネルフォーム */}
      <div className="p-4 bg-gradient-to-b from-[#161616] to-[#0a0a0a] border-b border-gray-800 space-y-3" style={{ borderBottom: '1px solid var(--border-gray)', padding: '16px 20px' }}>
        <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-base font-bold text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-title)', letterSpacing: '-0.02em', fontSize: '18px', fontWeight: '800' }}>
            <Search size={20} className="text-accent" style={{ color: 'var(--accent)', marginRight: '6px' }} />
            乗換案内
          </h2>
          <button
            onClick={handleAddVia}
            disabled={vias.length >= 3}
            className="text-xs btn-pill py-1 px-3 border border-gray-700 bg-transparent flex items-center gap-1"
            style={{
              border: '1px solid var(--border-gray)',
              background: 'transparent',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '9999px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Plus size={12} style={{ marginRight: '3px' }} />
            経由駅を追加 ({vias.length}/3)
          </button>
        </div>

        <div className="flex gap-2" style={{ display: 'flex', gap: '10px' }}>
          {/* 入力ボックス */}
          <div className="flex-grow space-y-2.5" style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '8px' }}>
            {/* 出発地 */}
            <div className="input-container" style={{ position: 'relative' }}>
              <Compass className="input-icon" size={16} />
              <input
                type="text"
                className="input-pill"
                style={{ paddingRight: '42px', height: '44px' }}
                placeholder="出発地を入力 (例: 東京)"
                value={fromInput}
                onChange={(e) => {
                  setFromInput(e.target.value);
                  if (fromPlace && e.target.value !== fromPlace.name) {
                    setFromPlace(null);
                    if (onClearFrom) onClearFrom();
                  }
                }}
                onFocus={() => setActiveInput('from')}
              />
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                style={{
                  background: 'transparent',
                  border: 'none',
                  position: 'absolute',
                  top: '50%',
                  right: '16px',
                  transform: 'translateY(-50%)',
                  cursor: 'pointer',
                  display: 'flex'
                }}
                onClick={handleSetCurrentLocation}
                title="現在地を設定"
              >
                <MapPin size={16} className="text-accent" style={{ color: 'var(--accent)' }} />
              </button>
            </div>

            {/* 経由地 (最大3つ) */}
            {vias.map((via, idx) => (
              <div key={via.id} className="input-container flex items-center gap-2" style={{ position: 'relative' }}>
                <div className="relative flex-grow" style={{ flex: 1, position: 'relative' }}>
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', fontSize: '10px' }}>経由{idx + 1}</span>
                  <input
                    type="text"
                    className="input-pill"
                    style={{ paddingLeft: '52px', paddingRight: '38px', height: '44px' }}
                    placeholder="駅名・場所を入力"
                    value={via.input}
                    onChange={(e) => handleViaInputChange(idx, e.target.value)}
                    onFocus={() => setActiveInput(idx)}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                    onClick={() => handleRemoveVia(idx)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* 目的地 */}
            <div className="input-container" style={{ position: 'relative' }}>
              <Search className="input-icon" size={16} />
              <input
                type="text"
                className="input-pill"
                style={{ height: '44px' }}
                placeholder="目的地を入力 (例: 新宿)"
                value={toInput}
                onChange={(e) => {
                  setToInput(e.target.value);
                  if (toPlace && e.target.value !== toPlace.name) {
                    setToPlace(null);
                    if (onClearTo) onClearTo();
                  }
                }}
                onFocus={() => setActiveInput('to')}
              />
            </div>
          </div>

          {/* 入れ替えボタン */}
          <div className="flex flex-col justify-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <button
              onClick={handleSwap}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-700 transition"
              style={{
                backgroundColor: 'var(--bg-interactive)',
                border: '1px solid var(--border-gray)',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <ArrowLeftRight size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* 日時指定アコーディオンボタン (Yahoo風に1行に集約) */}
        <div className="border-t border-gray-800 pt-2.5" style={{ borderTop: '1px solid var(--border-gray)', paddingTop: '10px' }}>
          <button
            onClick={() => setIsTimePickerOpen(!isTimePickerOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#181818] border border-gray-800 text-xs font-bold text-gray-300 hover:bg-[#222222] transition"
            style={{
              display: 'flex',
              width: '100%',
              backgroundColor: '#121212',
              border: '1px solid #1a1a1a',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#b3b3b3',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center' }}>
              <ClockIcon size={14} className="text-accent" style={{ color: 'var(--accent)', marginRight: '8px' }} />
              <span style={{ fontFamily: 'var(--font-title)', fontWeight: '700', fontSize: '12px' }}>{getFormattedDateTimeLabel()}</span>
            </div>
            {isTimePickerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* アコーディオン展開部分 (ヌルヌル開閉) */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: isTimePickerOpen ? '1fr' : '0fr',
              transition: 'grid-template-rows 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden'
            }}
          >
            <div style={{ minHeight: 0 }}>
              <div className="mt-2.5 p-3 rounded-lg border border-gray-850 bg-[#151515] space-y-2.5" style={{ border: '1px solid #202020', backgroundColor: '#111111', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
                
                {/* 時間タイプ選択タブ */}
                <div className="flex rounded-lg overflow-hidden border border-gray-800 bg-[#121212] p-0.5 text-xs" style={{ display: 'flex', border: '1px solid #222', borderRadius: '6px', backgroundColor: '#0c0c0c', padding: '2px' }}>
                  <button
                    className="flex-grow py-1.5 text-center font-bold rounded"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      backgroundColor: timeType === 'now' ? 'var(--bg-interactive)' : 'transparent',
                      color: timeType === 'now' ? 'var(--accent)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '11px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setTimeType('now')}
                  >
                    現在時刻
                  </button>
                  <button
                    className="flex-grow py-1.5 text-center font-bold rounded"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      backgroundColor: timeType === 'custom' ? 'var(--bg-interactive)' : 'transparent',
                      color: timeType === 'custom' ? 'var(--accent)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '11px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setTimeType('custom');
                      setSearchType('departure');
                    }}
                  >
                    日時指定
                  </button>
                  <button
                    className="flex-grow py-1.5 text-center font-bold rounded"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      backgroundColor: timeType === 'first' ? 'var(--bg-interactive)' : 'transparent',
                      color: timeType === 'first' ? 'var(--accent)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '11px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setTimeType('first')}
                  >
                    始発
                  </button>
                  <button
                    className="flex-grow py-1.5 text-center font-bold rounded"
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      backgroundColor: timeType === 'last' ? 'var(--bg-interactive)' : 'transparent',
                      color: timeType === 'last' ? 'var(--accent)' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '11px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setTimeType('last')}
                  >
                    終電
                  </button>
                </div>

                {/* 詳細入力エリア */}
                {timeType === 'custom' && (
                  <div className="flex gap-2 text-xs" style={{ display: 'flex', gap: '8px' }}>
                    <div className="flex-1 flex rounded-lg border border-gray-800 p-0.5 bg-[#121212]" style={{ display: 'flex', flex: 1, border: '1px solid #222', borderRadius: '6px', backgroundColor: '#0c0c0c', padding: '2px' }}>
                      <button
                        className="flex-1 py-1 text-center font-bold rounded"
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          backgroundColor: searchType === 'departure' ? 'var(--bg-interactive)' : 'transparent',
                          color: searchType === 'departure' ? '#ffffff' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                        onClick={() => setSearchType('departure')}
                      >
                        出発
                      </button>
                      <button
                        className="flex-1 py-1 text-center font-bold rounded"
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          backgroundColor: searchType === 'arrival' ? 'var(--bg-interactive)' : 'transparent',
                          color: searchType === 'arrival' ? '#ffffff' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                        onClick={() => setSearchType('arrival')}
                      >
                        到着
                      </button>
                    </div>

                    <div className="relative flex-1 flex items-center bg-[#1f1f1f] rounded-lg px-2 border border-gray-800" style={{ display: 'flex', flex: 1, height: '32px', border: '1px solid #222', borderRadius: '6px', backgroundColor: '#1a1a1a', padding: '0 8px', alignItems: 'center' }}>
                      <Calendar size={12} className="text-gray-500" style={{ marginRight: '6px' }} />
                      <input
                        type="date"
                        className="bg-transparent text-white w-full border-none outline-none font-bold text-[10px]"
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#fff', fontSize: '10px', width: '100%', fontWeight: '700' }}
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                      />
                    </div>

                    <div className="relative flex-1 flex items-center bg-[#1f1f1f] rounded-lg px-2 border border-gray-800" style={{ display: 'flex', flex: 1, height: '32px', border: '1px solid #222', borderRadius: '6px', backgroundColor: '#1a1a1a', padding: '0 8px', alignItems: 'center' }}>
                      <ClockIcon size={12} className="text-gray-500" style={{ marginRight: '6px' }} />
                      <input
                        type="time"
                        className="bg-transparent text-white w-full border-none outline-none font-bold text-[10px]"
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#fff', fontSize: '10px', width: '100%', fontWeight: '700' }}
                        value={targetTime}
                        onChange={(e) => setTargetTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* 始発・終電時の日付入力 */}
                {(timeType === 'first' || timeType === 'last') && (
                  <div className="flex gap-2 text-xs" style={{ display: 'flex', gap: '8px' }}>
                    <div className="relative flex-1 flex items-center bg-[#1f1f1f] rounded-lg px-2 border border-gray-800" style={{ display: 'flex', flex: 1, height: '32px', border: '1px solid #222', borderRadius: '6px', backgroundColor: '#1a1a1a', padding: '0 8px', alignItems: 'center' }}>
                      <Calendar size={12} className="text-gray-500" style={{ marginRight: '6px' }} />
                      <input
                        type="date"
                        className="bg-transparent text-white w-full border-none outline-none font-bold text-[10px] py-1"
                        style={{ border: 'none', background: 'transparent', outline: 'none', color: '#fff', fontSize: '10px', width: '100%', fontWeight: '700' }}
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-2 flex items-center justify-end text-gray-500 text-[10px]" style={{ flex: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: '10px', color: '#555' }}>
                      ※指定日の最初の便、または最終便を検索します。
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {/* 大きな検索ボタン */}
        <button
          className="w-full btn-pill btn-pill-primary py-3.5 text-base font-bold tracking-wider uppercase mt-3 shadow-heavy"
          style={{
            width: '100%',
            backgroundColor: 'var(--accent)',
            color: '#000000',
            border: 'none',
            borderRadius: '9999px',
            padding: '14px 20px',
            fontSize: '16px',
            fontWeight: '900',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(30, 215, 96, 0.25)',
            transition: 'all 0.2s ease'
          }}
          onClick={handleSearchClick}
        >
          検索
        </button>
      </div>

      {/* サジェスト or 周辺駅リスト */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ paddingBottom: '100px', WebkitOverflowScrolling: 'touch' }}>
        {activeInput !== null && suggests.length > 0 ? (
          /* サジェスト */
          <div className="rounded-lg p-2 mt-2 space-y-1" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-gray)' }}>
            <div className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1.5" style={{ letterSpacing: '0.05em', fontWeight: '900' }}>検索候補</div>
            {loadingSuggest && <div className="spinner" style={{ width: '20px', height: '20px', margin: '10px auto' }} />}
            {suggests.map((place) => (
              <button
                key={place.id}
                className="w-full text-left px-3 py-2 rounded hover:bg-var-bg-card-hover flex items-center gap-3 transition"
                style={{
                  background: 'transparent',
                  border: 'none',
                  width: '100%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleSelectPlace(place)}
              >
                <div className="p-1.5 rounded-full bg-[#252525] text-gray-300" style={{ padding: '6px', borderRadius: '50%', marginRight: '10px', display: 'flex' }}>
                  <Compass size={14} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white" style={{ fontSize: '13px', fontWeight: '700' }}>{place.name}</div>
                  <div className="text-xs text-gray-400" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{place.description || place.kind}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* 周辺駅・履歴・お気に入り */
          <div className="space-y-6 mt-3.5" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* 周辺駅 */}
            {nearbyStations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between" style={{ letterSpacing: '0.05em', fontSize: '11px', fontWeight: '900', marginBottom: '12px' }}>
                  近くの駅 (現在地周辺)
                  {loadingNearby && <span className="text-xs text-accent" style={{ color: 'var(--accent)' }}>更新中...</span>}
                </h3>
                <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {nearbyStations.map((station) => (
                    <div
                      key={station.id}
                      className="card-item"
                      onClick={() => {
                        if (activeInput === 'from') {
                          setFromPlace(station);
                          setFromInput(station.name);
                          setActiveInput(null);
                        } else if (activeInput === 'to') {
                          setToPlace(station);
                          setToInput(station.name);
                          setActiveInput(null);
                        } else if (typeof activeInput === 'number') {
                          const updated = [...vias];
                          updated[activeInput] = { ...updated[activeInput], input: station.name, place: station };
                          setVias(updated);
                          setActiveInput(null);
                        } else {
                          if (!fromPlace) {
                            setFromPlace(station);
                            setFromInput(station.name);
                          } else {
                            setToPlace(station);
                            setToInput(station.name);
                          }
                        }
                      }}
                    >
                      <MapPin size={18} className="card-icon" />
                      <div className="card-title truncate" style={{ fontWeight: '700', fontSize: '13px' }}>{station.name}</div>
                      <div className="card-desc truncate" style={{ fontSize: '10px' }}>{station.description || '周辺の駅・バス停'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 履歴 */}
            {recentSearches.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3" style={{ letterSpacing: '0.05em', fontSize: '11px', fontWeight: '900', marginBottom: '12px' }}>最近の検索</h3>
                <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentSearches.map((history, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#1a1a1a] transition text-left"
                      style={{
                        display: 'flex',
                        width: '100%',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-gray)',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        setFromPlace(history.from);
                        setFromInput(history.from.name);
                        setToPlace(history.to);
                        setToInput(history.to.name);
                        
                        const now = new Date();
                        const targetDateStr = getTodayString(now).replace(/-/g, '');
                        const targetTimeStr = getTimeString(now);
                        onSearch(history.from, history.to, [], 'departure', targetDateStr, targetTimeStr);
                      }}
                    >
                      <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center' }}>
                        <Clock size={16} className="text-gray-500" style={{ marginRight: '10px' }} />
                        <div>
                          <div className="text-sm font-bold text-white" style={{ fontSize: '13px', fontWeight: '700' }}>{history.from.name} ➔ {history.to.name}</div>
                          <div className="text-xs text-gray-400" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>乗換案内ルート</div>
                        </div>
                      </div>
                      <span className="text-xs text-accent font-bold" style={{ color: 'var(--accent)', fontWeight: '800' }}>検索</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* お気に入り */}
            {favoriteStations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3" style={{ letterSpacing: '0.05em', fontSize: '11px', fontWeight: '900', marginBottom: '12px' }}>お気に入り駅</h3>
                <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {favoriteStations.map((fav, idx) => (
                    <div
                      key={idx}
                      className="card-item"
                      onClick={() => {
                        if (activeInput === 'from') {
                          setFromPlace(fav);
                          setFromInput(fav.name);
                          setActiveInput(null);
                        } else if (activeInput === 'to') {
                          setToPlace(fav);
                          setToInput(fav.name);
                          setActiveInput(null);
                        } else if (typeof activeInput === 'number') {
                          const updated = [...vias];
                          updated[activeInput] = { ...updated[activeInput], input: fav.name, place: fav };
                          setVias(updated);
                          setActiveInput(null);
                        } else {
                          if (!fromPlace) {
                            setFromPlace(fav);
                            setFromInput(fav.name);
                          } else {
                            setToPlace(fav);
                            setToInput(fav.name);
                          }
                        }
                      }}
                    >
                      <Star size={18} className="card-icon" style={{ color: '#ffa42b' }} />
                      <div className="card-title truncate" style={{ fontWeight: '700', fontSize: '13px' }}>{fav.name}</div>
                      <div className="card-desc">お気に入り駅</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
