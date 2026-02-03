// Voice Journey Router - Provides Voice Journey context
// Standalone version for Writers Voice app
import { useEffect } from 'react';
import { useProgressStore } from '../../store/useProgressStore';

interface VoiceJourneyRouterProps {
  children: React.ReactNode;
}

export function VoiceJourneyRouter({ children }: VoiceJourneyRouterProps) {
  const { checkPhaseTransition, hasHydrated } = useProgressStore();

  // Check phase transitions periodically
  useEffect(() => {
    if (!hasHydrated) return;

    // Check phase on mount
    checkPhaseTransition();

    // Check periodically (every hour)
    const interval = setInterval(() => {
      checkPhaseTransition();
    }, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, [hasHydrated, checkPhaseTransition]);

  return (
    <>
      {children}
    </>
  );
}

export default VoiceJourneyRouter;
