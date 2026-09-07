import { useRef, useState } from 'react';
import { DataExplorer } from './components/DataExplorer/DataExplorer';
import { AnalyticsPage } from './components/AnalyticsPage/AnalyticsPage';
import { QuestionsView } from './components/AnalyticsPage/QuestionsView';
import { ActionablePage } from './components/ActionablePage/ActionablePage';
import { ViewToggle, type AppView } from './components/ViewToggle/ViewToggle';
import { Walkthrough, type WalkthroughHandle } from './walkthrough/Walkthrough';
import './App.css';

function App() {
  // Actionable is the default landing view — "what needs my attention?" is
  // the first thing a user (or evaluator) should see, not a KPI wall.
  const [view, setView] = useState<AppView>('actionable');
  const walkthroughRef = useRef<WalkthroughHandle>(null);

  return (
    <div className="app-shell">
      <div className="app-shell__topbar">
        <div className="app-shell__header">
          <h1 className="app-shell__brand">DealerPulse</h1>
          <div className="app-shell__nav-row">
            <ViewToggle value={view} onChange={setView} />
            <button
              type="button"
              className="app-shell__tour-btn"
              onClick={() => walkthroughRef.current?.start()}
            >
              ⟳ Replay tour
            </button>
          </div>
        </div>
      </div>
      <hr className="app-shell__divider" />
      <main className="app-shell__main">
        <div hidden={view !== 'actionable'}>
          <ActionablePage />
        </div>
        <div hidden={view !== 'analytics'}>
          <AnalyticsPage />
        </div>
        <div hidden={view !== 'questions'}>
          <QuestionsView />
        </div>
        <div hidden={view !== 'table'}>
          <DataExplorer />
        </div>
      </main>

      <Walkthrough ref={walkthroughRef} view={view} onNavigate={setView} />
    </div>
  );
}

export default App;
