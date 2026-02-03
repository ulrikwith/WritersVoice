// Simplified Editor - Basic text editor for Transfer Phase
import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, FileText } from 'lucide-react';

interface SimplifiedEditorProps {
  initialContent?: string;
  maxDuration?: number; // in minutes
  onContentChange?: (content: string) => void;
  onSessionStart?: () => void;
  onSessionEnd?: (wordCount: number, duration: number) => void;
  placeholder?: string;
}

export function SimplifiedEditor({
  initialContent = '',
  maxDuration = 20,
  onContentChange,
  onSessionStart,
  onSessionEnd,
  placeholder = 'Begin writing...',
}: SimplifiedEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isActive, setIsActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Calculate word count
  const countWords = useCallback((text: string): number => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }, []);

  // Update word count when content changes
  useEffect(() => {
    setWordCount(countWords(content));
  }, [content, countWords]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start session timer
  const startSession = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      startTimeRef.current = Date.now();
      onSessionStart?.();

      timerRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setElapsedTime(elapsed);
        }
      }, 1000);
    }
  }, [isActive, onSessionStart]);

  // End session
  const endSession = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const finalDuration = Math.floor(elapsedTime / 60);
      onSessionEnd?.(wordCount, finalDuration);
    }
  }, [isActive, elapsedTime, wordCount, onSessionEnd]);

  // Auto-end session after max duration
  useEffect(() => {
    if (isActive && elapsedTime >= maxDuration * 60) {
      endSession();
    }
  }, [isActive, elapsedTime, maxDuration, endSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Handle content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange?.(newContent);

    // Start session on first keystroke
    if (!isActive && newContent.length > 0) {
      startSession();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(300, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  // Calculate progress towards session time
  const progressPercent = Math.min(100, (elapsedTime / (maxDuration * 60)) * 100);

  return (
    <div className="w-full">
      {/* Session Status Bar */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 ${
                isActive
                  ? 'text-green-500 animate-pulse'
                  : 'text-stone-400 dark:text-stone-500'
              }`}
            />
            <span
              className={`font-mono text-sm ${
                isActive
                  ? 'text-stone-700 dark:text-stone-300'
                  : 'text-stone-400 dark:text-stone-500'
              }`}
            >
              {formatTime(elapsedTime)} / {maxDuration}:00
            </span>
          </div>

          {/* Word count */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Session controls */}
        {isActive && (
          <button
            onClick={endSession}
            className="px-3 py-1 text-sm text-stone-600 dark:text-stone-300
                       border border-stone-300 dark:border-slate-600 rounded-full
                       hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors"
          >
            End Session
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="h-1 bg-stone-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full min-h-[300px] p-6 rounded-xl border-2
                     bg-white dark:bg-slate-800
                     text-stone-800 dark:text-stone-100
                     placeholder-stone-400 dark:placeholder-stone-500
                     border-stone-200 dark:border-slate-600
                     focus:border-blue-400 dark:focus:border-blue-500
                     focus:outline-none
                     resize-none text-lg leading-relaxed
                     font-serif"
          style={{ fontFamily: 'Georgia, serif' }}
        />

        {/* Not started hint */}
        {!isActive && content.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-stone-400 dark:text-stone-500 text-center">
              Start typing to begin your {maxDuration}-minute session
            </p>
          </div>
        )}
      </div>

      {/* Session reminder */}
      {isActive && elapsedTime < 60 && (
        <p className="mt-4 text-center text-sm text-stone-500 dark:text-stone-400 italic">
          Remember: feel your fingers on the keys, sensing the sensing...
        </p>
      )}
    </div>
  );
}

export default SimplifiedEditor;
