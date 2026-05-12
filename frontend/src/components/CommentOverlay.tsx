import { type CSSProperties, useEffect, useMemo, useState } from 'react';

export interface CommentItem {
  author: string;
  text: string;
  reply: string;
}

interface CommentOverlayProps {
  comments: CommentItem[];
}

export function CommentOverlay({ comments }: CommentOverlayProps): JSX.Element {
  const visibleComments = useMemo(() => comments.slice(-5), [comments]);
  const firstVisibleIndex = comments.length - visibleComments.length;
  const latestCommentKey =
    comments.length > 0 ? commentKey(comments[comments.length - 1], comments.length - 1) : null;
  const [visibleCommentKey, setVisibleCommentKey] = useState<string | null>(latestCommentKey);

  useEffect(() => {
    if (!latestCommentKey) {
      setVisibleCommentKey(null);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      setVisibleCommentKey(latestCommentKey);
    });
    return () => cancelAnimationFrame(frameId);
  }, [latestCommentKey]);

  return (
    <div style={styles.root}>
      {visibleComments.map((comment, index) => {
        const key = commentKey(comment, firstVisibleIndex + index);
        const isEntering = key === latestCommentKey && key !== visibleCommentKey;
        return (
          <div key={key} style={{ ...styles.item, opacity: isEntering ? 0 : 1 }}>
            <div style={styles.meta}>{comment.author}</div>
            <div style={styles.text}>{comment.text}</div>
            <div style={styles.reply}>{comment.reply}</div>
          </div>
        );
      })}
    </div>
  );
}

function commentKey(comment: CommentItem, index: number): string {
  return `${comment.author}-${comment.text}-${index}`;
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 'min(380px, calc(100vw - 48px))',
    maxHeight: '58vh',
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: 10,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  item: {
    padding: '12px 14px',
    borderRadius: 8,
    background: 'rgba(18, 23, 30, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#f6f8fb',
    opacity: 1,
    transition: 'opacity 260ms ease-out',
  },
  meta: {
    color: '#8bb7ff',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
  reply: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#d8dee8',
    fontSize: 13,
    lineHeight: 1.45,
    wordBreak: 'break-word',
  },
};
