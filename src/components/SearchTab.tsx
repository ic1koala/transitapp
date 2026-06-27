import React, { useState, useEffect } from 'react';
import { Search, MapPin, Compass, Clock, Star, ArrowLeftRight } from 'lucide-react';

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
  onSearch: (from: { name: string; endpoint: string }, to: { name: string; endpoint: string }) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({ onSearch }) => {
  // 入力クエリと選択された駅情報
  const [fromInput, setFromInput] = useState('');
  const [fromPlace, setFromPlace] = useState<{ name: string; endpoint: string } | null>(null);
  
  const [toInput, setToInput] = useState('');
  const [toPlace, setToPlace] = useState<{ name: string; endpoint: string } | null>(null);

  // サジェスト候補
  const [suggests, setSuggests] = useState<Place[]>([]);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // 現在地と周辺駅
  const [nearbyStations, setNearbyStations] = useState<Place[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  // 履歴とお気に入り
  const [recentSearches, setRecentSearches] = useState<{ from: { name: string; endpoint: string }, to: { name: string; endpoint: string } }[]>([]);
  const [favoriteStations, setFavoriteStations] = useState<{ name: string; endpoint: string }[]>([]);

  // 初期読み込み: 履歴と周辺駅の取得
  useEffect(() => {
    // ローカルストレージから履歴を取得
    const history = localStorage.getItem('transit_history');
    if (history) {
      setRecentSearches(JSON.parse(history));
    }

    const favs = localStorage.getItem('transit_favorites');
    if (favs) {
      setFavoriteStations(JSON.parse(favs));
    }

    // 周辺駅の取得
    fetchNearbyStations();
  }, []);

  // サジェストAPIの呼び出し (Debounce的な効果のためクエリ文字数等で制御)
  useEffect(() => {
    const query = activeInput === 'from' ? fromInput : toInput;
    if (!query || query.length < 2 || !activeInput) {
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
    }, 400);

    return () => clearTimeout(timer);
  }, [fromInput, toInput, activeInput]);

  // Geolocation API による現在地周辺駅の検索
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
        console.warn('Geolocation Error:', err);
        setLoadingNearby(false);
      }
    );
  };

  // 現在地を直接出発地に設定する処理
  const handleSetCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const endpoint = `geo:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      const place = { name: '現在地', endpoint };
      setFromPlace(place);
      setFromInput('現在地');
      setActiveInput(null);
    });
  };

  // サジェストのプレース（駅）を選択したとき
  const handleSelectPlace = (place: Place) => {
    const selected = { name: place.name, endpoint: place.endpoint };
    if (activeInput === 'from') {
      setFromPlace(selected);
      setFromInput(place.name);
    } else {
      setToPlace(selected);
      setToInput(place.name);
    }
    setSuggests([]);
    setActiveInput(null);
  };

  // 出発地と目的地を入れ替える
  const handleSwap = () => {
    const tempInput = fromInput;
    const tempPlace = fromPlace;
    setFromInput(toInput);
    setFromPlace(toPlace);
    setToInput(tempInput);
    setToPlace(tempPlace);
  };

  // 検索ボタンクリック
  const handleSearchSubmit = () => {
    if (!fromPlace || !toPlace) return;

    // 履歴に保存
    const newSearch = { from: fromPlace, to: toPlace };
    const updatedHistory = [newSearch, ...recentSearches.filter(h => h.from.endpoint !== fromPlace.endpoint || h.to.endpoint !== toPlace.endpoint)].slice(0, 10);
    setRecentSearches(updatedHistory);
    localStorage.setItem('transit_history', JSON.stringify(updatedHistory));

    // 親コンポーネントへ引き渡し
    onSearch(fromPlace, toPlace);
  };

  return (
    <div className="flex flex-col flex-1" style={{ height: '100%' }}>
      {/* 検索入力パネル（Spotify Greenアクセントのピル） */}
      <div className="p-4 bg-gradient-to-b from-[#181818] to-transparent space-y-3">
        <h2 className="text-xl font-bold mb-3 text-white">どちらまで行きますか？</h2>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-3">
            {/* 出発地入力 */}
            <div className="input-container">
              <Compass className="input-icon" size={18} />
              <input
                type="text"
                className="input-pill"
                placeholder="出発地を入力 (例: 東京)"
                value={fromInput}
                onChange={(e) => {
                  setFromInput(e.target.value);
                  if (fromPlace && e.target.value !== fromPlace.name) {
                    setFromPlace(null);
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

            {/* 目的地入力 */}
            <div className="input-container">
              <Search className="input-icon" size={18} />
              <input
                type="text"
                className="input-pill"
                placeholder="目的地を入力 (例: 新宿)"
                value={toInput}
                onChange={(e) => {
                  setToInput(e.target.value);
                  if (toPlace && e.target.value !== toPlace.name) {
                    setToPlace(null);
                  }
                }}
                onFocus={() => setActiveInput('to')}
              />
            </div>
          </div>

          {/* 入れ替えボタン */}
          <button
            onClick={handleSwap}
            className="w-10 h-10 rounded-full bg-var-bg-interactive flex items-center justify-center border border-gray-700 hover:bg-gray-800 transition"
            style={{ backgroundColor: 'var(--bg-interactive)' }}
          >
            <ArrowLeftRight size={16} className="text-white" />
          </button>
        </div>

        {/* 検索実行ボタン */}
        {fromPlace && toPlace && (
          <button
            className="w-full btn-pill btn-pill-primary py-3 text-base font-bold tracking-wider uppercase mt-2"
            onClick={handleSearchSubmit}
          >
            経路を検索する
          </button>
        )}
      </div>

      {/* メインエリア：サジェスト、または履歴・お気に入り・周辺駅 */}
      <div className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: '100px' }}>
        {activeInput && suggests.length > 0 ? (
          /* サジェストリストの表示 */
          <div className="bg-var-bg-surface rounded-lg p-2 space-y-1" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1.5">検索候補</div>
            {loadingSuggest && <div className="spinner" style={{ width: '20px', height: '20px', margin: '10px auto' }} />}
            {suggests.map((place) => (
              <button
                key={place.id}
                className="w-full text-left px-3 py-2 rounded hover:bg-var-bg-card-hover flex items-center gap-3 transition"
                style={{ contentVisibility: 'auto' }}
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
          /* デフォルト表示: 周辺駅とお気に入り・履歴 */
          <div className="space-y-6 mt-2">
            {/* 現在地周辺の駅 (Spotify の「お勧めのプレイリスト」風) */}
            {nearbyStations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
                  近くの駅 (現在地周辺)
                  {loadingNearby && <span className="text-xs text-accent" style={{ color: 'var(--accent)' }}>更新中...</span>}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {nearbyStations.map((station) => (
                    <div
                      key={station.id}
                      className="card-item"
                      onClick={() => {
                        const target = { name: station.name, endpoint: station.endpoint };
                        if (!fromPlace) {
                          setFromPlace(target);
                          setFromInput(station.name);
                        } else {
                          setToPlace(target);
                          setToInput(station.name);
                        }
                      }}
                    >
                      <MapPin size={20} className="card-icon" />
                      <div className="card-title truncate">{station.name}</div>
                      <div className="card-desc truncate">{station.description || '周辺の駅・バス停'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最近の検索履歴 (Spotify の「最近再生した項目」風のリスト) */}
            {recentSearches.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">最近の検索履歴</h3>
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
                        onSearch(history.from, history.to);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Clock size={16} className="text-gray-500" />
                        <div>
                          <div className="text-sm font-bold text-white">{history.from.name} ➔ {history.to.name}</div>
                          <div className="text-xs text-gray-400">乗換案内ルート</div>
                        </div>
                      </div>
                      <span className="text-xs text-accent font-bold" style={{ color: 'var(--accent)' }}>再検索</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* お気に入りの駅 */}
            {favoriteStations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">お気に入り</h3>
                <div className="grid grid-cols-2 gap-3">
                  {favoriteStations.map((fav, idx) => (
                    <div
                      key={idx}
                      className="card-item"
                      onClick={() => {
                        const target = { name: fav.name, endpoint: fav.endpoint };
                        if (!fromPlace) {
                          setFromPlace(target);
                          setFromInput(fav.name);
                        } else {
                          setToPlace(target);
                          setToInput(fav.name);
                        }
                      }}
                    >
                      <Star size={20} className="card-icon" style={{ color: '#ffa42b' }} />
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
