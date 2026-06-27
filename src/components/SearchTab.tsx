import React, { useState, useEffect } from 'react';
import { Search, MapPin, Compass, Clock, Star, ArrowLeftRight, Plus, Trash2, Calendar, Clock as ClockIcon } from 'lucide-react';

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

  // 3. 日時指定 (Yahoo風: 現在時刻 / 出発 / 到着 / 始発 / 終電)
  const [timeType, setTimeType] = useState<'now' | 'custom' | 'first' | 'last'>('now');
  const [searchType, setSearchType] = useState<'departure' | 'arrival' | 'first' | 'last'>('departure');
  
  // 現在の日時を初期値に設定
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

  // 4. サジェスト関連
  const [suggests, setSuggests] = useState<Place[]>([]);
  // activeInput: 'from' | 'to' | number (経由地のインデックス)
  const [activeInput, setActiveInput] = useState<'from' | 'to' | number | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // 5. 現在地・履歴・お気に入り
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

  // 初期読み込み: 履歴とお気に入り、周辺駅の取得
  useEffect(() => {
    const history = localStorage.getItem('transit_history');
    if (history) setRecentSearches(JSON.parse(history));

    const favs = localStorage.getItem('transit_favorites');
    if (favs) setFavoriteStations(JSON.parse(favs));

    fetchNearbyStations();
  }, []);

  // サジェストAPIの呼び出し
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
        console.error('Suggest API Error:', err);
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
          console.error('Reverse API Error:', err);
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

  // プレース（駅・場所）を選択したとき
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

  // 経由地の追加
  const handleAddVia = () => {
    if (vias.length >= 3) return; // API最大3つ
    setVias([...vias, { id: Math.random().toString(), input: '', place: null }]);
  };

  // 経由地の削除
  const handleRemoveVia = (index: number) => {
    setVias(vias.filter((_, idx) => idx !== index));
    if (activeInput === index) {
      setActiveInput(null);
    }
  };

  // 経由地入力の更新
  const handleViaInputChange = (index: number, val: string) => {
    const updated = [...vias];
    updated[index] = { ...updated[index], input: val, place: val === '' ? null : updated[index].place };
    setVias(updated);
  };

  // 出発地と目的地の入れ替え
  const handleSwap = () => {
    const tempInput = fromInput;
    const tempPlace = fromPlace;
    setFromInput(toInput);
    setFromPlace(toPlace);
    setToInput(tempInput);
    setToPlace(tempPlace);
  };

  // 検索実行
  const handleSearchClick = () => {
    if (!fromPlace || !toPlace) return;

    // 日時・検索タイプのフォーマット
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
      // 始発または終電
      apiDate = targetDate.replace(/-/g, '');
      apiTime = '04:00'; // ダミー時刻
      apiSearchType = timeType; // 'first' or 'last'
    }

    const viaPlaces = vias.map(v => v.place).filter((p): p is Place => p !== null);

    onSearch(fromPlace, toPlace, viaPlaces, apiSearchType, apiDate, apiTime);
  };

  return (
    <div className="flex flex-col flex-1" style={{ height: '100%' }}>
      {/* 経路入力部 (Yahoo乗換案内の構成) */}
      <div className="p-4 bg-gradient-to-b from-[#1c1c1c] to-[#121212] border-b border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search size={18} className="text-accent" style={{ color: 'var(--accent)' }} />
            乗換案内
          </h2>
          <button
            onClick={handleAddVia}
            disabled={vias.length >= 3}
            className="text-xs btn-pill py-1 px-3 border border-gray-700 bg-transparent flex items-center gap-1"
          >
            <Plus size={12} />
            経由駅を追加 ({vias.length}/3)
          </button>
        </div>

        <div className="flex gap-2">
          {/* 入力フォーム群 */}
          <div className="flex-1 space-y-2">
            {/* 出発地 */}
            <div className="input-container">
              <Compass className="input-icon" size={16} />
              <input
                type="text"
                className="input-pill"
                style={{ paddingRight: '40px', height: '40px' }}
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
                onClick={handleSetCurrentLocation}
                title="現在地を設定"
              >
                <MapPin size={16} className="text-accent" style={{ color: 'var(--accent)' }} />
              </button>
            </div>

            {/* 経由地 (最大3つ) */}
            {vias.map((via, idx) => (
              <div key={via.id} className="input-container flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold">経由{idx + 1}</span>
                  <input
                    type="text"
                    className="input-pill"
                    style={{ paddingLeft: '50px', paddingRight: '35px', height: '40px' }}
                    placeholder="駅名・場所を入力"
                    value={via.input}
                    onChange={(e) => handleViaInputChange(idx, e.target.value)}
                    onFocus={() => setActiveInput(idx)}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400"
                    onClick={() => handleRemoveVia(idx)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {/* 目的地 */}
            <div className="input-container">
              <Search className="input-icon" size={16} />
              <input
                type="text"
                className="input-pill"
                style={{ height: '40px' }}
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
          <div className="flex flex-col justify-center">
            <button
              onClick={handleSwap}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-700 transition"
              style={{ backgroundColor: 'var(--bg-interactive)' }}
            >
              <ArrowLeftRight size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* 日時指定セクション (Yahoo風タブ切り替え) */}
        <div className="border-t border-gray-800 pt-3 space-y-2">
          {/* 日時切り替えタブ */}
          <div className="flex rounded-lg overflow-hidden border border-gray-800 bg-[#121212] p-0.5 text-xs">
            <button
              className="flex-1 py-1.5 text-center font-bold rounded"
              style={{
                backgroundColor: timeType === 'now' ? 'var(--bg-interactive)' : 'transparent',
                color: timeType === 'now' ? 'var(--accent)' : 'var(--text-muted)'
              }}
              onClick={() => setTimeType('now')}
            >
              現在時刻
            </button>
            <button
              className="flex-1 py-1.5 text-center font-bold rounded"
              style={{
                backgroundColor: timeType === 'custom' ? 'var(--bg-interactive)' : 'transparent',
                color: timeType === 'custom' ? 'var(--accent)' : 'var(--text-muted)'
              }}
              onClick={() => {
                setTimeType('custom');
                setSearchType('departure');
              }}
            >
              日時指定
            </button>
            <button
              className="flex-1 py-1.5 text-center font-bold rounded"
              style={{
                backgroundColor: timeType === 'first' ? 'var(--bg-interactive)' : 'transparent',
                color: timeType === 'first' ? 'var(--accent)' : 'var(--text-muted)'
              }}
              onClick={() => setTimeType('first')}
            >
              始発
            </button>
            <button
              className="flex-1 py-1.5 text-center font-bold rounded"
              style={{
                backgroundColor: timeType === 'last' ? 'var(--bg-interactive)' : 'transparent',
                color: timeType === 'last' ? 'var(--accent)' : 'var(--text-muted)'
              }}
              onClick={() => setTimeType('last')}
            >
              終電
            </button>
          </div>

          {/* 日時指定の詳細オプション */}
          {timeType === 'custom' && (
            <div className="flex gap-2 text-xs">
              <div className="flex-1 flex rounded-lg border border-gray-800 p-0.5 bg-[#121212]">
                <button
                  className="flex-1 py-1 text-center font-bold rounded"
                  style={{
                    backgroundColor: searchType === 'departure' ? 'var(--bg-interactive)' : 'transparent',
                    color: searchType === 'departure' ? '#ffffff' : 'var(--text-muted)'
                  }}
                  onClick={() => setSearchType('departure')}
                >
                  出発
                </button>
                <button
                  className="flex-1 py-1 text-center font-bold rounded"
                  style={{
                    backgroundColor: searchType === 'arrival' ? 'var(--bg-interactive)' : 'transparent',
                    color: searchType === 'arrival' ? '#ffffff' : 'var(--text-muted)'
                  }}
                  onClick={() => setSearchType('arrival')}
                >
                  到着
                </button>
              </div>

              {/* 日付入力 */}
              <div className="relative flex-1 flex items-center bg-[#1f1f1f] rounded-lg px-2 border border-gray-800">
                <Calendar size={12} className="text-gray-500 mr-1.5" />
                <input
                  type="date"
                  className="bg-transparent text-white w-full border-none outline-none font-bold text-[10px]"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              {/* 時刻入力 */}
              <div className="relative flex-1 flex items-center bg-[#1f1f1f] rounded-lg px-2 border border-gray-800">
                <ClockIcon size={12} className="text-gray-500 mr-1.5" />
                <input
                  type="time"
                  className="bg-transparent text-white w-full border-none outline-none font-bold text-[10px]"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 始発・終電の時の日付指定 */}
          {(timeType === 'first' || timeType === 'last') && (
            <div className="flex gap-2 text-xs">
              <div className="relative flex-1 flex items-center bg-[#1f1f1f] rounded-lg px-2 border border-gray-800">
                <Calendar size={12} className="text-gray-500 mr-1.5" />
                <input
                  type="date"
                  className="bg-transparent text-white w-full border-none outline-none font-bold text-[10px] py-1"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="flex-2 flex items-center justify-end text-gray-500 text-[10px]">
                ※検索日の最初の電車、または最後の電車を検索します。
              </div>
            </div>
          )}
        </div>

        {/* 検索実行ボタン */}
        {fromPlace && toPlace && (
          <button
            className="w-full btn-pill btn-pill-primary py-3 text-base font-bold tracking-wider uppercase mt-2 shadow-heavy"
            onClick={handleSearchClick}
          >
            この条件で検索
          </button>
        )}
      </div>

      {/* メインエリア：サジェスト or 履歴/お気に入り/周辺駅 */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ paddingBottom: '100px' }}>
        {activeInput !== null && suggests.length > 0 ? (
          /* サジェストリスト */
          <div className="bg-var-bg-surface rounded-lg p-2 mt-2 space-y-1" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1.5">検索候補</div>
            {loadingSuggest && <div className="spinner" style={{ width: '20px', height: '20px', margin: '10px auto' }} />}
            {suggests.map((place) => (
              <button
                key={place.id}
                className="w-full text-left px-3 py-2 rounded hover:bg-var-bg-card-hover flex items-center gap-3 transition"
                onClick={() => handleSelectPlace(place)}
              >
                <div className="p-1.5 rounded-full bg-[#333333] text-gray-300">
                  <Compass size={14} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{place.name}</div>
                  <div className="text-xs text-gray-400">{place.description || place.kind}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* 周辺駅・履歴・お気に入り (Spotify プレイリスト風グリッド) */
          <div className="space-y-6 mt-3">
            {/* 周辺駅 */}
            {nearbyStations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between">
                  近くの駅 (現在地周辺)
                  {loadingNearby && <span className="text-xs text-accent" style={{ color: 'var(--accent)' }}>更新中...</span>}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {nearbyStations.map((station) => (
                    <div
                      key={station.id}
                      className="card-item"
                      onClick={() => {
                        // アクティブな入力に設定するか、出発地がなければ出発、あれば目的地に差し込む
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
                          // アクティブ入力がない場合
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
                      <div className="card-title truncate">{station.name}</div>
                      <div className="card-desc truncate">{station.description || '周辺の駅・バス停'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最近の検索履歴 */}
            {recentSearches.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">最近の検索</h3>
                <div className="space-y-2">
                  {recentSearches.map((history, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-var-bg-surface hover:bg-var-bg-card-hover transition text-left"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                      onClick={() => {
                        setFromPlace(history.from);
                        setFromInput(history.from.name);
                        setToPlace(history.to);
                        setToInput(history.to.name);
                        
                        // 現在日時で検索
                        const now = new Date();
                        const targetDateStr = getTodayString(now).replace(/-/g, '');
                        const targetTimeStr = getTimeString(now);
                        onSearch(history.from, history.to, [], 'departure', targetDateStr, targetTimeStr);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-gray-500" />
                        <div>
                          <div className="text-sm font-bold text-white">{history.from.name} ➔ {history.to.name}</div>
                          <div className="text-xs text-gray-400">乗換案内ルート</div>
                        </div>
                      </div>
                      <span className="text-xs text-accent font-bold" style={{ color: 'var(--accent)' }}>検索</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* お気に入り */}
            {favoriteStations.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">お気に入り駅</h3>
                <div className="grid grid-cols-2 gap-3">
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
                      <div className="card-title truncate">{fav.name}</div>
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
