import AtlasAvatar from '../ui/AtlasAvatar.jsx';

export default function ChatBubble({ role, content, isStreaming = false }) {
  const isAtlas = role === 'assistant';

  return (
    <div className={`flex gap-3 mb-4 ${isAtlas ? 'flex-row' : 'flex-row-reverse'}`}>
      {isAtlas && (
        <div className="flex-shrink-0 self-end">
          <AtlasAvatar mood={isStreaming ? 'thinking' : 'neutral'} size="sm" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-card text-sm leading-relaxed ${
          isAtlas
            ? 'bg-surface-card text-text-primary rounded-bl-none'
            : 'bg-brand text-white rounded-br-none'
        }`}
      >
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-text-secondary animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
