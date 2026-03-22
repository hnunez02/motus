import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api.js';
import { useAI } from '../hooks/useAI.js';
import AtlasAvatar from '../components/ui/AtlasAvatar.jsx';

// ── constants ─────────────────────────────────────────────────────────────

const FILTER_CHIPS = [
  { id: 'all',    label: 'All' },
  { id: 'push',   label: 'Push' },
  { id: 'pull',   label: 'Pull' },
  { id: 'legs',   label: 'Legs' },
  { id: 'cardio', label: 'Cardio' },
];

const PUSH_MUSCLES = new Set(['chest', 'shoulders', 'triceps']);
const PULL_MUSCLES = new Set(['back', 'biceps', 'rear_delt']);
const LEG_MUSCLES  = new Set(['quads', 'hamstrings', 'glutes', 'calves']);

const MUSCLE_COLORS = {
  chest:       'bg-brand/20 text-brand',
  shoulders:   'bg-brand/20 text-brand',
  triceps:     'bg-brand/20 text-brand',
  back:        'bg-blue-500/20 text-blue-400',
  biceps:      'bg-blue-500/20 text-blue-400',
  rear_delt:   'bg-blue-500/20 text-blue-400',
  quads:       'bg-emerald-500/20 text-emerald-400',
  hamstrings:  'bg-emerald-500/20 text-emerald-400',
  glutes:      'bg-emerald-500/20 text-emerald-400',
  calves:      'bg-emerald-500/20 text-emerald-400',
  core:        'bg-purple-500/20 text-purple-400',
};

const STARTER_PROMPTS = [
  "Why am I not getting stronger?",
  "How much volume do I need for bigger arms?",
  "Should I train fasted?",
  "I have lower back pain, what should I avoid?",
];

const CITATION_REGEX = /\[Source:[^\]]+\]/g;


// ── helpers ────────────────────────────────────────────────────────────────

function parseCitations(text) {
  const matches = text.match(CITATION_REGEX);
  if (!matches) return [];
  return matches.map((m) => m.replace(/^\[Source:\s*/, '').replace(/\]$/, ''));
}

function stripCitations(text) {
  return text.replace(CITATION_REGEX, '').replace(/\s{2,}/g, ' ').trim();
}

function matchesFilter(exercise, chip) {
  if (chip === 'all') return true;
  if (chip === 'cardio') return exercise?.modality === 'cardio';
  const muscles = exercise?.muscleGroups ?? [];
  if (chip === 'push') return muscles.some((m) => PUSH_MUSCLES.has(m));
  if (chip === 'pull') return muscles.some((m) => PULL_MUSCLES.has(m));
  if (chip === 'legs') return muscles.some((m) => LEG_MUSCLES.has(m));
  return true;
}

function matchesSearch(exercise, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (exercise?.name ?? '').toLowerCase().includes(q) ||
    (exercise?.muscleGroups ?? []).some((m) => m.toLowerCase().includes(q))
  );
}

// ── ExerciseLibraryCard ───────────────────────────────────────────────────

function ExerciseLibraryCard({ exercise, onTap }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(exercise)}
      className="w-full text-left bg-surface-card rounded-card p-3 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-text-primary text-sm leading-tight">
          {exercise?.name ?? ''}
        </span>
        <span
          className={`text-[10px] font-mono uppercase tracking-wide flex-shrink-0 px-2 py-0.5 rounded-chip ${
            exercise?.category === 'compound'
              ? 'bg-brand text-white'
              : 'border border-surface-elevated text-text-muted'
          }`}
        >
          {exercise?.category ?? ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {(exercise?.muscleGroups ?? []).map((m) => (
          <span
            key={m}
            className={`text-[10px] px-2 py-0.5 rounded-chip font-medium ${
              MUSCLE_COLORS[m] || 'bg-surface-elevated text-text-muted'
            }`}
          >
            {m.replace('_', ' ')}
          </span>
        ))}
      </div>
    </motion.button>
  );
}

// ── ExerciseDetailSheet ───────────────────────────────────────────────────

function ExerciseDetailSheet({ exercise, onClose }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed bottom-0 left-0 right-0 bg-surface-card rounded-t-[24px] z-50 max-h-[85dvh] overflow-y-auto"
      >
        {/* Handle + header */}
        <div className="sticky top-0 bg-surface-card pt-3 pb-3 px-5 border-b border-surface-elevated">
          <div className="w-10 h-1 bg-surface-elevated rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display font-bold text-text-primary text-lg leading-tight">
                {exercise?.name ?? ''}
              </h2>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(exercise?.muscleGroups ?? []).map((m) => (
                  <span
                    key={m}
                    className={`text-[10px] px-2 py-0.5 rounded-chip font-medium ${
                      MUSCLE_COLORS[m] || 'bg-surface-elevated text-text-muted'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            <span
              className={`text-[10px] font-mono uppercase tracking-wide flex-shrink-0 px-2 py-0.5 rounded-chip mt-1 ${
                exercise?.category === 'compound'
                  ? 'bg-brand text-white'
                  : 'border border-surface-elevated text-text-muted'
              }`}
            >
              {exercise?.category ?? ''}
            </span>
          </div>
        </div>

        <div className="px-5 pt-5 pb-10 space-y-5">
          {/* Video placeholder */}
          <div className="w-full aspect-video bg-surface-elevated rounded-card flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-surface-card flex items-center justify-center">
              <span className="text-brand text-xl ml-0.5">▶</span>
            </div>
            <span className="text-xs text-text-muted">Video coming soon</span>
          </div>

          {/* Muscle diagram placeholder */}
          <div className="w-full h-28 bg-surface-elevated rounded-card flex flex-col items-center justify-center gap-1.5">
            <span className="text-2xl opacity-40">🫀</span>
            <span className="text-xs text-text-muted">Muscle diagram coming soon</span>
          </div>

          {/* Form cues */}
          {(exercise?.formCues ?? []).length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-2.5">
                Form cues
              </p>
              <ol className="space-y-2.5">
                {(exercise?.formCues ?? []).map((cue, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-brand font-mono text-xs flex-shrink-0 w-4 pt-0.5">
                      {i + 1}.
                    </span>
                    <p className="text-sm text-text-secondary leading-relaxed">{cue}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Equipment */}
          {(exercise?.equipment ?? []).length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-2">
                Equipment
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(exercise?.equipment ?? []).map((e) => (
                  <span
                    key={e}
                    className="text-xs px-2.5 py-1 rounded-chip bg-surface-elevated text-text-secondary"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full py-4 rounded-card bg-brand text-white font-semibold text-base"
          >
            Add to today's workout
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}

// ── LibraryTab ────────────────────────────────────────────────────────────

function LibraryTab() {
  const [search,           setSearch]           = useState('');
  const [activeChip,       setActiveChip]       = useState('all');
  const [selectedExercise, setSelectedExercise] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () =>
      api.get('/api/exercises').then((r) => r.data.exercises ?? r.data),
    staleTime: 5 * 60 * 1000,
  });

  const safeExercises = Array.isArray(data) ? data : [];
  const filtered = safeExercises.filter(
    (ex) => matchesFilter(ex, activeChip) && matchesSearch(ex, search)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Search + filter */}
      <div className="px-4 pt-3 pb-2 space-y-2.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises or muscle groups..."
          className="w-full bg-surface-card text-text-primary placeholder:text-text-muted px-4 py-2.5 rounded-chip border border-surface-elevated focus:outline-none focus:border-brand text-sm"
        />
        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveChip(chip.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-chip text-sm font-medium transition-colors ${
                activeChip === chip.id
                  ? 'bg-brand text-white'
                  : 'bg-surface-elevated text-text-secondary'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-text-muted">Loading exercises...</p>
          </div>
        ) : safeExercises.length === 0 || filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-text-muted">No exercises found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => (
              <ExerciseLibraryCard
                key={ex.id}
                exercise={ex}
                onTap={setSelectedExercise}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedExercise && (
          <ExerciseDetailSheet
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ChatMessage (with markdown + Sources section) ─────────────────────────

function ChatMessage({ role, content, isStreaming = false }) {
  const isAtlas    = role === 'assistant';
  const citations  = isAtlas && !isStreaming ? parseCitations(content) : [];
  const displayText = isAtlas && !isStreaming ? stripCitations(content) : content;

  return (
    <div className={`flex gap-3 mb-4 ${isAtlas ? 'flex-row' : 'flex-row-reverse'}`}>
      {isAtlas && (
        <div className="flex-shrink-0 self-end">
          <AtlasAvatar mood={isStreaming ? 'thinking' : 'neutral'} size="sm" />
        </div>
      )}
      <div className="max-w-[85%] space-y-1.5">
        <div
          className={`p-4 text-sm leading-relaxed ${
            isAtlas
              ? 'bg-surface-card text-text-primary rounded-2xl rounded-tl-sm'
              : 'bg-brand text-white rounded-2xl rounded-tr-sm'
          }`}
        >
          {isAtlas ? (
            isStreaming ? (
              <span>
                {displayText}
                <span className="animate-pulse ml-0.5 font-light text-text-secondary">|</span>
              </span>
            ) : (
              <ReactMarkdown
                components={{
                  p:      ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  ul:     ({ children }) => <ul className="list-disc pl-5 space-y-2 mb-3">{children}</ul>,
                  ol:     ({ children }) => <ol className="list-decimal pl-5 space-y-2 mb-3">{children}</ol>,
                  li:     ({ children }) => <li className="leading-relaxed">{children}</li>,
                }}
              >
                {displayText}
              </ReactMarkdown>
            )
          ) : (
            content
          )}
        </div>
        {citations.length > 0 && (
          <div className="px-3 py-2 bg-surface-elevated rounded-card">
            <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1.5">
              Sources
            </p>
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={i} className="text-xs text-text-muted leading-snug">
                  · {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ChatTab ───────────────────────────────────────────────────────────────

function ChatTab() {
  const { sendMessage, streamedText, isStreaming } = useAI();
  const [input,        setInput]        = useState('');
  const [history,      setHistory]      = useState([]);
  const [showStarters, setShowStarters] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, streamedText]);

  const handleSend = useCallback(async (msg) => {
    const text = (typeof msg === 'string' ? msg : input).trim();
    if (!text || isStreaming) return;
    setInput('');
    setShowStarters(false);
    // Capture history snapshot before state update so sendMessage gets the
    // correct prior context (without the new user message appended yet).
    const snapshot = history;
    setHistory((h) => [...h, { role: 'user', content: text }]);
    const reply = await sendMessage(text, snapshot);
    setHistory((h) => [...h, { role: 'assistant', content: reply }]);
  }, [input, isStreaming, history, sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {history.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center pt-6 pb-2 gap-3">
            <AtlasAvatar mood="neutral" size="lg" />
            <p className="text-text-secondary text-sm text-center max-w-xs leading-relaxed">
              Ask me anything about training, recovery, nutrition
              timing, or your program.
            </p>
          </div>
        )}

        {history.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {isStreaming && (
          <ChatMessage role="assistant" content={streamedText || ''} isStreaming />
        )}

        {/* Starter prompts */}
        {showStarters && history.length === 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="text-left px-4 py-3 rounded-card bg-surface-elevated text-text-secondary text-sm border border-surface-elevated/50 active:bg-surface-card transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-4 pb-4 pt-2 border-t border-surface-elevated">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask Atlas anything..."
            className="flex-1 bg-surface-card text-text-primary placeholder:text-text-muted px-4 py-2.5 rounded-chip border border-surface-elevated focus:outline-none focus:border-brand text-sm"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            className="bg-brand text-white px-4 py-2.5 rounded-card font-semibold text-sm disabled:opacity-40"
          >
            {isStreaming ? '···' : 'Send'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ── Coach ─────────────────────────────────────────────────────────────────

export default function Coach() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div className="flex flex-col h-[100dvh] bg-surface">
      {/* Header */}
      <div className="px-4 pb-3 border-b border-surface-elevated" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
        <h1 className="text-2xl font-display font-bold text-text-primary mb-3">
          Coach
        </h1>
        {/* Tab switcher */}
        <div className="flex gap-1 bg-surface-elevated rounded-card p-1">
          {[
            { id: 'library', label: 'Exercise Library' },
            { id: 'chat',    label: '🦉 Ask Atlas'      },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-[12px] text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-surface-card text-text-primary'
                  : 'text-text-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' ? <LibraryTab /> : <ChatTab />}
      </div>
    </div>
  );
}
