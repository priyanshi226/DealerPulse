import { useState } from 'react';
import { DataExplorer } from './components/DataExplorer/DataExplorer';
import { AnalyticsPage } from './components/AnalyticsPage/AnalyticsPage';
import { ActionablePage } from './components/ActionablePage/ActionablePage';
import { ViewToggle, type AppView } from './components/ViewToggle/ViewToggle';
import './App.css';

function App() {
  const [view, setView] = useState<AppView>('analytics');

  return (
    <div className="app-shell">
      <div className="app-shell__topbar">
        <div className="app-shell__header">
          <h1 className="app-shell__brand">Industrial IQ</h1>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>
      <hr className="app-shell__divider" />
      <main className="app-shell__main">
        <div hidden={view !== 'analytics'}>
          <AnalyticsPage />
        </div>
        <div hidden={view !== 'actionable'}>
          <ActionablePage />
        </div>
        <div hidden={view !== 'table'}>
          <DataExplorer />
        </div>
      </main>
    </div>
  );
}

export default App;
