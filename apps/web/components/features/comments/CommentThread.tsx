'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { taskCommentsCol } from '../../../lib/firestore/collections';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
};

interface Comment {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  mentions: string[];
  reactions: Record<string, string[]>;
  created_at: Date | null;
  deleted_at: Date | null;
}

interface Props {
  teamId: string;
  taskId: string;
  userId: string;
  userName: string;
  members?: { user_id: string; display_name?: string | null; email?: string | null }[];
}

const REACTION_OPTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

export function CommentThread({ teamId, taskId, userId, userName, members = [] }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  useEffect(() => {
    const q = query(taskCommentsCol(teamId, taskId), orderBy('created_at', 'asc'));
    return onSnapshot(q, (snap) => {
      setComments(
        snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              text: data.text ?? '',
              author_id: data.author_id ?? '',
              author_name: data.author_name ?? '?',
              mentions: data.mentions ?? [],
              reactions: data.reactions ?? {},
              created_at: data.created_at?.toDate?.() ?? null,
              deleted_at: data.deleted_at?.toDate?.() ?? null,
            } as Comment;
          })
          .filter((c) => !c.deleted_at),
      );
    });
  }, [teamId, taskId]);

  // 멘션 감지
  function handleInputChange(val: string) {
    setInput(val);
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && lastAt === val.length - 1 - (val.slice(lastAt + 1).search(/\s/)) ) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(' ')) {
        setMentionQuery(query);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  }

  function insertMention(member: { user_id: string; display_name?: string | null }) {
    const name = member.display_name ?? member.user_id;
    const lastAt = input.lastIndexOf('@');
    setInput(input.slice(0, lastAt) + `@${name} `);
    setShowMentions(false);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      // 멘션 추출
      const mentionRegex = /@(\S+)/g;
      const mentions: string[] = [];
      let m;
      while ((m = mentionRegex.exec(text)) !== null) {
        const name = m[1];
        const found = members.find((mb) =>
          (mb.display_name ?? mb.email ?? mb.user_id) === name,
        );
        if (found) mentions.push(found.user_id);
      }

      await addDoc(taskCommentsCol(teamId, taskId), {
        text,
        author_id: userId,
        author_name: userName,
        mentions,
        reactions: {},
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        deleted_at: null,
      });
      setInput('');
    } finally {
      setSending(false);
    }
  }

  async function handleReact(commentId: string, emoji: string) {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment) return;
    const existing = comment.reactions[emoji] ?? [];
    const updated = existing.includes(userId)
      ? existing.filter((id) => id !== userId)
      : [...existing, userId];
    const newReactions = { ...comment.reactions, [emoji]: updated };
    if (updated.length === 0) delete newReactions[emoji];
    await updateDoc(doc(db, 'teams', teamId, 'tasks_independent', taskId, 'comments', commentId), {
      reactions: newReactions,
    });
  }

  async function handleDelete(commentId: string) {
    if (!confirm('댓글을 삭제할까요?')) return;
    await updateDoc(doc(db, 'teams', teamId, 'tasks_independent', taskId, 'comments', commentId), {
      deleted_at: serverTimestamp(),
    });
  }

  const filteredMembers = members.filter((m) => {
    const name = (m.display_name ?? m.email ?? m.user_id).toLowerCase();
    return name.includes(mentionQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.ink300 }}>
        댓글 {comments.length > 0 && `(${comments.length})`}
      </p>

      {/* 댓글 목록 */}
      {comments.length > 0 && (
        <div className="flex flex-col gap-2">
          {comments.map((comment) => {
            const isMine = comment.author_id === userId;
            const timeStr = comment.created_at
              ? comment.created_at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
              : '';
            const totalReactions = Object.values(comment.reactions).reduce((s, ids) => s + ids.length, 0);

            return (
              <div key={comment.id} className="flex flex-col gap-1">
                <div className="flex items-start gap-2">
                  {/* 아바타 */}
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: isMine ? C.mustard : C.beige, color: isMine ? '#fff' : C.ink500 }}>
                    {comment.author_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: isMine ? C.mustard : C.ink900 }}>
                        {comment.author_name}
                      </span>
                      <span className="text-[10px]" style={{ color: C.ink300 }}>{timeStr}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: C.ink900 }}>
                      {/* 멘션 하이라이트 */}
                      {comment.text.split(/(@\S+)/g).map((part, i) =>
                        part.startsWith('@')
                          ? <span key={i} style={{ color: C.mustard, fontWeight: 600 }}>{part}</span>
                          : part,
                      )}
                    </p>
                    {/* 리액션 + 반응 버튼 */}
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {Object.entries(comment.reactions).map(([emoji, ids]) =>
                        ids.length > 0 ? (
                          <button key={emoji}
                            onClick={() => handleReact(comment.id, emoji)}
                            className="text-xs px-1.5 py-0.5 rounded-lg flex items-center gap-0.5"
                            style={{
                              background: ids.includes(userId) ? C.mustard + '20' : C.cream,
                              border: `1px solid ${ids.includes(userId) ? C.mustard : C.beige}`,
                            }}>
                            {emoji} {ids.length}
                          </button>
                        ) : null,
                      )}
                      {/* 리액션 추가 */}
                      <div className="relative group">
                        <button className="text-xs px-1.5 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
                          +😊
                        </button>
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 rounded-xl p-1.5 z-10"
                          style={{ background: C.ivory, border: `1px solid ${C.beige}` }}>
                          {REACTION_OPTIONS.map((e) => (
                            <button key={e} onClick={() => handleReact(comment.id, e)}
                              className="text-base hover:scale-110 transition-transform">{e}</button>
                          ))}
                        </div>
                      </div>
                      {isMine && (
                        <button onClick={() => handleDelete(comment.id)}
                          className="text-[10px] ml-1 opacity-0 hover:opacity-100"
                          style={{ color: C.coral }}>삭제</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 댓글 입력 */}
      <div className="relative">
        {/* 멘션 드롭다운 */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 rounded-xl py-1 z-10"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, minWidth: 160 }}>
            {filteredMembers.slice(0, 5).map((m) => (
              <button key={m.user_id}
                onClick={() => insertMention(m)}
                className="w-full text-left text-xs px-3 py-1.5 hover:opacity-80"
                style={{ color: C.ink900 }}>
                @{m.display_name ?? m.email ?? m.user_id}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 rounded-xl px-3 py-2"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder="댓글 추가... (@멘션)"
            className="flex-1 text-xs outline-none bg-transparent"
            style={{ color: C.ink900 }}
          />
          <button onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            className="text-xs font-medium"
            style={{ color: C.mustard, opacity: !input.trim() ? 0.4 : 1 }}>
            {sending ? '...' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
}
