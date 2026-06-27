import { useState, useEffect } from 'react';
import { Search, Library, Settings as SettingsIcon } from 'lucide-react';
import { SearchTab } from './components/SearchTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { ResultsView } from './components/ResultsView';

type TabType = 'search' | 'library' | 'settings';

interface Place {
  id: string;
  endpoint: string;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  description?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [fromPlace, setFromPlace] = useState<Place | null>(null);
  const [toPlace, setToPlace] = useState<Place | null>(null);
  
  const [searchResult, setSearchResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 1本前・1本後のための検索条件キャッシュ
  const [searchCache, setSearchCache] = useState<{
    from: Place;
    to: Place;
    vias: Place[];
    searchType: 'departure' | 'arrival' | 'first' | 'last';
    date: string;
    time: string;
  } | null>(null);
  
  // 回避設定
  const [avoidModes, setAvoidModes] = useState<string[]>(() => {
    const saved = localStorage.getItem('transit_avoid_modes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('transit_avoid_modes', JSON.stringify(avoidModes));
  }, [avoidModes]);

  // 経路検索の実行
  const handleSearch = async (
    from: Place,
    to: Place,
    vias: Place[],
    searchType: 'departure' | 'arrival' | 'first' | 'last',
    targetDate: string,
    targetTime: string
  ) => {
    setFromPlace(from);
    setToPlace(to);
    setLoading(true);
    setSearchError(null);
    setSearchResult(null);

    setSearchCache({
      from,
      to,
      vias,
      searchType,
      date: targetDate,
      time: targetTime
    });

    let queryParams = `from=${encodeURIComponent(from.endpoint)}&to=${encodeURIComponent(to.endpoint)}`;
    
    if (vias && vias.length > 0) {
      vias.forEach(via => {
        queryParams += `&via=${encodeURIComponent(via.endpoint)}`;
      });
    }

    queryParams += `&type=${searchType}`;
    if (targetDate) queryParams += `&date=${targetDate}`;
    if (targetTime) queryParams += `&time=${targetTime}`;

    if (avoidModes.length > 0) {
      queryParams += `&avoidModes=${avoidModes.join(',')}`;
    }

    try {
      const url = `https://api.transit.ls8h.com/api/v1/guidance/plan?${queryParams}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('経路の検索に失敗しました。日時や検索条件を変更して再度お試しください。');
      }

      const data = await res.json();
      if (!data.options || data.options.length === 0) {
        throw new Error('指定された条件で経路が見つかりませんでした。');
      }

      setSearchResult(data.options);
    } catch (err: any) {
      setSearchError(err.message || '通信エラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOffsetSearch = (offsetMinutes: number) => {
    if (!searchCache) return;

    const year = parseInt(searchCache.date.substring(0, 4));
    const month = parseInt(searchCache.date.substring(4, 6)) - 1;
    const day = parseInt(searchCache.date.substring(6, 8));
    const [hours, minutes] = searchCache.time.split(':').map(Number);

    const currentDate = new Date(year, month, day, hours, minutes);
    currentDate.setMinutes(currentDate.getMinutes() + offsetMinutes);

    const newDateStr = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
    const newTimeStr = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

    handleSearch(
      searchCache.from,
      searchCache.to,
      searchCache.vias,
      searchCache.searchType,
      newDateStr,
      newTimeStr
    );
  };

  const handleSelectStationFromLibrary = (station: { name: string; endpoint: string }) => {
    const place: Place = {
      id: '',
      endpoint: station.endpoint,
      name: station.name,
      kind: 'station',
      lat: 0,
      lon: 0
    };
    setFromPlace(place);
    setActiveTab('search');
  };

  const handleSelectRouteFromLibrary = (
    from: { name: string; endpoint: string },
    to: { name: string; endpoint: string }
  ) => {
    setActiveTab('search');
    const fromPlaceObj: Place = {
      id: '',
      endpoint: from.endpoint,
      name: from.name,
      kind: 'station',
      lat: 0,
      lon: 0
    };
    const toPlaceObj: Place = {
      id: '',
      endpoint: to.endpoint,
      name: to.name,
      kind: 'station',
      lat: 0,
      lon: 0
    };
    setFromPlace(fromPlaceObj);
    setToPlace(toPlaceObj);
    
    const now = new Date();
    const targetDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const targetTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    handleSearch(fromPlaceObj, toPlaceObj, [], 'departure', targetDate, targetTime);
  };

  const handleBackToSearch = () => {
    setSearchResult(null);
    setSearchError(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="spinner" />
          <h3 className="text-base font-bold mt-4 text-white">最適な経路を探索中...</h3>
          <p className="text-xs text-gray-500 mt-2">OpenData (GTFS/ODPT) から時刻表を解析しています。</p>
        </div>
      );
    }

    if (searchError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-red-400 font-bold mb-4" style={{ fontSize: '18px' }}>⚠️ エラー</div>
          <p className="text-sm text-gray-300 max-w-xs mb-6">{searchError}</p>
          <button className="btn-pill btn-pill-primary" onClick={handleBackToSearch}>
            検索画面に戻る
          </button>
        </div>
      );
    }

    if (searchResult && fromPlace && toPlace && searchCache) {
      return (
        <ResultsView
          options={searchResult}
          fromName={fromPlace.name}
          toName={toPlace.name}
          searchTimeLabel={`${searchCache.time} 発`}
          onBack={handleBackToSearch}
          onOffsetSearch={handleOffsetSearch}
        />
      );
    }

    switch (activeTab) {
      case 'search':
        return (
          <SearchTab
            onSearch={handleSearch}
            initialFrom={fromPlace}
            initialTo={toPlace}
            onClearFrom={() => setFromPlace(null)}
            onClearTo={() => setToPlace(null)}
          />
        );
      case 'library':
        return (
          <LibraryTab
            onSelectStation={handleSelectStationFromLibrary}
            onSelectRoute={handleSelectRouteFromLibrary}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            avoidModes={avoidModes}
            onChangeAvoidModes={setAvoidModes}
          />
        );
      default:
        return <SearchTab onSearch={handleSearch} />;
    }
  };

  // 表示状態切り替え時のキーを生成し、滑らかなフェードトランジションをトリガーする
  const animationKey = activeTab + (loading ? '_loading' : '') + (searchResult ? '_result' : '') + (searchError ? '_error' : '');

  return (
    <div className="app-container">
      {/* メインビュー (アニメーションキーを付与) */}
      <div className="main-content tab-content-active" key={animationKey}>
        {renderContent()}
      </div>

      {/* 下部ナビゲーション */}
      {!loading && !searchResult && !searchError && (
        <div className="nav-bar">
          <button
            className={`nav-item ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={22} color={activeTab === 'search' ? 'var(--accent)' : 'var(--text-muted)'} />
            <span>検索</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <Library size={22} color={activeTab === 'library' ? 'var(--accent)' : 'var(--text-muted)'} />
            <span>マイライブラリ</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={22} color={activeTab === 'settings' ? 'var(--accent)' : 'var(--text-muted)'} />
            <span>設定</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
