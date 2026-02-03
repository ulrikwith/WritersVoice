// Simple Journal - 3-sentence max reflection for stone phase
import { useState, useRef, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface SimpleJournalProps {
  maxSentences?: number;
  placeholder?: string;
  initialValue?: string;
  onSave: (content: string) => void;
  autoSave?: boolean;
}

export function SimpleJournal({
  maxSentences = 3,
  placeholder = 'What did you notice during your practice?',
  initialValue = '',
  onSave,
  autoSave = true,
}: SimpleJournalProps) {
  const [content, setContent] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const [sentenceCount, setSentenceCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Count sentences (roughly)
  const countSentences = (text: string): number => {
    if (!text.trim()) return 0;
    // Match sentence-ending punctuation followed by space or end
    const matches = text.match(/[.!?]+(?:\s|$)/g);
    // Also count the last fragment if it doesn't end with punctuation
    const lastChar = text.trim().slice(-1);
    const hasTrailing = !['.', '!', '?'].includes(lastChar) && text.trim().length > 0;
    return (matches?.length || 0) + (hasTrailing ? 1 : 0);
  };

  // Update sentence count when content changes
  useEffect(() => {
    setSentenceCount(countSentences(content));
  }, [content]);

  // Auto-save with debounce
  useEffect(() => {
    if (!autoSave) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (content.trim()) {
      saveTimeoutRef.current = window.setTimeout(() => {
        onSave(content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 1000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, autoSave, onSave]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newSentenceCount = countSentences(newContent);

    // Only prevent if we're adding beyond max (allow editing existing)
    if (newSentenceCount <= maxSentences || newContent.length < content.length) {
      setContent(newContent);
    }
  };

  const handleManualSave = () => {
    if (content.trim()) {
      onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const isAtLimit = sentenceCount >= maxSentences;
  const isOverLimit = sentenceCount > maxSentences;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
          Daily Reflection
        </label>
        <div className="flex items-center gap-3">
          {/* Sentence counter */}
          <span
            className={`text-sm ${
              isOverLimit
                ? 'text-red-500'
                : isAtLimit
                ? 'text-amber-500'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            {sentenceCount}/{maxSentences} sentences
          </span>

          {/* Save indicator */}
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full min-h-[120px] p-4 rounded-xl border-2 transition-colors
                     bg-white dark:bg-slate-800
                     text-stone-800 dark:text-stone-100
                     placeholder-stone-400 dark:placeholder-stone-500
                     resize-none focus:outline-none
                     ${
                       isOverLimit
                         ? 'border-red-300 dark:border-red-500 focus:border-red-400 dark:focus:border-red-400'
                         : isAtLimit
                         ? 'border-amber-300 dark:border-amber-500 focus:border-amber-400 dark:focus:border-amber-400'
                         : 'border-stone-200 dark:border-slate-600 focus:border-stone-400 dark:focus:border-stone-400'
                     }`}
          rows={3}
        />

        {/* Over limit warning */}
        {isOverLimit && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5
                          text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            <span>Maximum {maxSentences} sentences</span>
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        Brief reflections only. What you noticed, nothing more.
      </p>

      {/* Manual save button (if autoSave is off) */}
      {!autoSave && content.trim() && (
        <button
          onClick={handleManualSave}
          className="mt-4 flex items-center gap-2 px-4 py-2
                     bg-stone-800 dark:bg-stone-100
                     text-white dark:text-stone-900 rounded-lg
                     hover:bg-stone-700 dark:hover:bg-stone-200 transition-colors"
        >
          <Check className="w-4 h-4" />
          Save Reflection
        </button>
      )}
    </div>
  );
}

export default SimpleJournal;
