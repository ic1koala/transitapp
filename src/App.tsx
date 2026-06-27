import { useState, useEffect } from 'react';
import { Search, Library, Settings as SettingsIcon } from 'lucide-react';
import { SearchTab } from './components/SearchTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { ResultsView } from './components/ResultsView';

type TabType = 'search' | 'library' | 'settings';

interface Place {
  name: string;
  endpoint: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [fromPlace, setFromPlace] = useState<Place | null>(null);
  const [toPlace, setToPlace] = useState<Place | null>(null);
  
  const [searchResult, setSearchResult] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // 設定タブと連動する回避設定
  const [avoidModes, setAvoidModes] = useState<string[]>(() => {
    const saved = localStorage.getItem('transit_avoid_modes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('transit_avoid_modes', JSON.stringify(avoidModes));
  }, [avoidModes]);

  // 経路検索の実行
  const handleSearch = async (from: Place, to: Place) => {
    setFromPlace(from);
    setToPlace(to);
    setLoading(true);
    setSearchError(null);
    setSearchResult(null);

    const avoidParams = avoidModes.length > 0 ? `&avoidModes=${avoidModes.join(',')}` : '';

    try {
      const url = `https://api.transit.ls8h.com/api/v1/guidance/plan?from=${encodeURIComponent(from.endpoint)}&to=${encodeURIComponent(to.endpoint)}${avoidParams}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('経路の検索に失敗しました。時間帯や入力場所を変更して再度お試しください。');
      }

      const data = await res.json();
      if (!data.options || data.options.length === 0) {
        throw new Error('指定された区間の経路が見つかりませんでした。');
      }

      setSearchResult(data.options);
    } catch (err: any) {
      setSearchError(err.message || '通信エラーが発生しました。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // LibraryTab から駅が選択された場合
  const handleSelectStationFromLibrary = (station: Place) => {
    setFromPlace(station);
    setActiveTab('search');
    // 入力フォーム側の状態は SearchTab のマウント時に引き継がれる
  };

  // LibraryTab からルートが選択された場合
  const handleSelectRouteFromLibrary = (from: Place, to: Place) => {
    setActiveTab('search');
    handleSearch(from, to);
  };

  // 検索結果から戻る
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
          <div className="text-red-400 font-bold mb-4">⚠️ エラー</div>
          <p className="text-sm text-gray-300 max-w-xs">{searchError}</p>
          <button className="btn-pill btn-pill-primary mt-6" onClick={handleBackToSearch}>
            検索画面に戻る
          </button>
        </div>
      );
    }

    if (searchResult && fromPlace && toPlace) {
      return (
        <ResultsView
          options={searchResult}
          fromName={fromPlace.name}
          toName={toPlace.name}
          onBack={handleBackToSearch}
        />
      );
    }

    switch (activeTab) {
      case 'search':
        return <SearchTab onSearch={handleSearch} />;
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

  return (
    <div className="app-container">
      {/* メインビュー */}
      <div className="main-content">
        {renderContent()}
      </div>

      {/* 下部ナビゲーション（検索中や結果表示中は非表示にして全画面感を強調） */}
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
