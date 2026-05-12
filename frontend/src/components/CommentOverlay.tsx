import { type CSSProperties, useEffect, useMemo, useState } from 'react';

export interface CommentItem {
  id: number;
  author: string;
  text: string;
  reply: string;
}

interface CommentOverlayProps {
  comments: CommentItem[];
}

export function CommentOverlay({ comments }: CommentOverlayProps): JSX.Element {
  const visibleComments = useMemo(() => comments.slice(-5), [comments]);
  const latestCommentId = comments.length > 0 ? comments[comments.length - 1].id : null;
  const [visibleCommentId, setVisibleCommentId] = useState<number | null>(latestCommentId);

  useEffect(() => {
    if (!latestCommentId) {
      setVisibleCommentId(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setVisibleCommentId(latestCommentId);
    });
    return () => cancelAnimationFrame(frameId);
  }, [latestCommentId]);

  return (
    <div style={styles.root}>
      {visibleComments.map((comment) => {
        const isEntering = comment.id === latestCommentId && comment.id !== visibleCommentId;
        return (
          <div
            key={comment.id}
            style={{
              ...styles.item,
              opacity: isEntering ? 0 : 1,
              transform: isEntering ? 'translateY(14px)' : 'translateY(0)',
            }}
          >
            <div style={styles.author}>{comment.author}</div>
            <div style={styles.text}>{comment.text}</div>
            <div style={styles.reply}>{comment.reply}</div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 'min(360px, calc(100vw - 32px))',
    maxHeight: '58vh',
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: 8,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  item: {
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(10, 14, 20, 0.55)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f6f8fb',
    opacity: 1,
    transition: 'opacity 300ms ease-out, transform 300ms ease-out',
  },
  author: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 3,
    letterSpacing: '0.02em',
  },
  text: {
    color: '#f0f4f8',
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  reply: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
};
