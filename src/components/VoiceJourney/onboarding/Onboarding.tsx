// Voice Journey Onboarding - Main orchestrator component
import { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { StoneInstructions } from './StoneInstructions';
import { CommitmentScreen } from './CommitmentScreen';
import { PhaseExplanation } from './PhaseExplanation';
import { useProgressStore } from '../../../store/useProgressStore';

interface OnboardingProps {
  onComplete: () => void;
  isExistingUser?: boolean;
}

type OnboardingStep = 'welcome' | 'stone' | 'commitment' | 'explanation';

export function Onboarding({ onComplete, isExistingUser = false }: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const { startJourney, skipJourney } = useProgressStore();

  const handleComplete = () => {
    startJourney();
    onComplete();
  };

  const handleSkip = () => {
    skipJourney();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto">
      {step === 'welcome' && (
        <WelcomeScreen
          onNext={() => setStep('stone')}
          isExistingUser={isExistingUser}
        />
      )}

      {step === 'stone' && (
        <StoneInstructions
          onNext={() => setStep('commitment')}
          onBack={() => setStep('welcome')}
        />
      )}

      {step === 'commitment' && (
        <CommitmentScreen
          onNext={() => setStep('explanation')}
          onBack={() => setStep('stone')}
          onSkip={isExistingUser ? handleSkip : undefined}
          isExistingUser={isExistingUser}
        />
      )}

      {step === 'explanation' && (
        <PhaseExplanation
          onComplete={handleComplete}
          onBack={() => setStep('commitment')}
        />
      )}
    </div>
  );
}

export default Onboarding;
