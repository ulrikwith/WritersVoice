// Stone Instructions - Guide users on how to prepare for the journey
import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface StoneInstructionsProps {
  onNext: () => void;
  onBack: () => void;
}

export function StoneInstructions({ onNext, onBack }: StoneInstructionsProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (!acknowledged) return;
    setIsAnimating(true);
    setTimeout(() => {
      onNext();
    }, 300);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 dark:from-slate-900 dark:to-slate-800
                  flex flex-col items-center px-6 py-12
                  transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <span className="text-6xl mb-4 block">🪨</span>
        <h1 className="text-3xl md:text-4xl font-bold text-stone-800 dark:text-stone-100 mb-4">
          Find Your Stone
        </h1>
        <p className="text-lg text-stone-600 dark:text-stone-300 max-w-xl">
          Before we begin, you'll need a stone. This is the foundation of everything that follows.
        </p>
      </div>

      {/* Instructions Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg max-w-2xl w-full mb-8
                      border border-stone-200 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-stone-800 dark:text-stone-100 mb-6">
          Choosing Your Stone
        </h2>

        <div className="space-y-6">
          <InstructionStep
            number={1}
            title="Find a smooth, palm-sized stone"
            description="It should fit comfortably in your hand. River stones work well, but any stone with some smooth areas will do."
          />

          <InstructionStep
            number={2}
            title="Look for interesting texture"
            description="Some smooth patches, some rough spots. The variation is important—it gives your fingers something to explore."
          />

          <InstructionStep
            number={3}
            title="Make it yours"
            description="Keep it at your desk, by your writing space. This stone will become your anchor throughout the journey."
          />
        </div>

        {/* Visual examples */}
        <div className="mt-8 p-4 bg-stone-100 dark:bg-slate-700 rounded-lg">
          <p className="text-sm text-stone-600 dark:text-stone-300 italic">
            "Any stone will work. A beach pebble, a garden stone, something from a nature walk.
            The important thing is that you can hold it and feel it."
          </p>
        </div>
      </div>

      {/* Acknowledgment Checkbox */}
      <label className="flex items-center gap-3 cursor-pointer mb-8 max-w-2xl w-full px-4">
        <div
          onClick={() => setAcknowledged(!acknowledged)}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors
                     ${acknowledged
                       ? 'bg-stone-800 dark:bg-stone-100 border-stone-800 dark:border-stone-100'
                       : 'border-stone-400 dark:border-slate-500'
                     }`}
        >
          {acknowledged && (
            <CheckCircle2 className="w-4 h-4 text-white dark:text-stone-900" />
          )}
        </div>
        <span className="text-stone-700 dark:text-stone-300">
          I have a stone ready, or I will find one before my first practice session
        </span>
      </label>

      {/* Navigation Buttons */}
      <div className="flex gap-4 max-w-2xl w-full px-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 text-stone-600 dark:text-stone-300
                     hover:text-stone-800 dark:hover:text-stone-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={!acknowledged}
          className={`flex-1 flex items-center justify-center gap-2 px-8 py-4 rounded-full text-lg font-semibold
                     transition-all shadow-lg
                     ${acknowledged
                       ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-200'
                       : 'bg-stone-300 dark:bg-slate-600 text-stone-500 dark:text-slate-400 cursor-not-allowed'
                     }`}
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface InstructionStepProps {
  number: number;
  title: string;
  description: string;
}

function InstructionStep({ number, title, description }: InstructionStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900
                      rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h3 className="font-medium text-stone-800 dark:text-stone-100 mb-1">{title}</h3>
        <p className="text-stone-600 dark:text-stone-400 text-sm">{description}</p>
      </div>
    </div>
  );
}

export default StoneInstructions;
