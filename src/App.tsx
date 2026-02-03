// Writers Voice - Voice Journey Application
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useProgressStore } from './store/useProgressStore';
import { VoiceModule } from './components/Dashboard/VoiceModule';
import { StonePhase } from './phases/StonePhase';
import { TransferPhase } from './phases/TransferPhase';
import { ApplicationPhase } from './phases/ApplicationPhase';
import { AutonomousPhase } from './phases/AutonomousPhase';
import { BlueSettings } from './components/Settings/BlueSettings';

export default function App() {
  const { checkPhaseTransition, hasHydrated, phase } = useProgressStore();

  // Check phase transitions periodically
  useEffect(() => {
    if (!hasHydrated) return;

    checkPhaseTransition();

    const interval = setInterval(() => {
      checkPhaseTransition();
    }, 1000 * 60 * 60); // Every hour

    return () => clearInterval(interval);
  }, [hasHydrated, checkPhaseTransition]);

  if (!hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading Voice Journey...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-slate-800/90 backdrop-blur-xl border-b border-slate-700/50 z-50">
        <div className="flex items-center justify-between h-full px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {phase === 'stone' && '🪨'}
              {phase === 'transfer' && '✍️'}
              {phase === 'application' && '📖'}
              {phase === 'autonomous' && '🚀'}
            </span>
            <h1 className="text-lg font-bold text-white">Writers Voice</h1>
          </div>
          <nav className="flex items-center gap-4">
            <NavLink to="/" label="Journey" />
            <NavLink to={`/phase/${phase}`} label="Practice" />
            <NavLink to="/settings" label="Settings" />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14 min-h-screen">
        <Routes>
          <Route path="/" element={<VoiceModule />} />
          <Route path="/phase/stone" element={<StonePhase />} />
          <Route path="/phase/transfer" element={<TransferPhase />} />
          <Route path="/phase/application" element={<ApplicationPhase />} />
          <Route path="/phase/autonomous" element={<AutonomousPhase />} />
          <Route path="/settings" element={<BlueSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <a
      href={to}
      className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700/50"
      onClick={(e) => {
        e.preventDefault();
        window.history.pushState({}, '', to);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }}
    >
      {label}
    </a>
  );
}
