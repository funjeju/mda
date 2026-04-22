'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useContacts } from '../../../lib/hooks/useContacts';
import type { ContactDoc } from '../../../lib/hooks/useContacts';
import { AppShell } from '../../../components/layout/AppShell';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  red:     '#EB8B7C',
};

export default function ContactsPage() {
  const { user, teamId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <AppShell>
      <ContactsContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function ContactsContent({ teamId, userId }: { teamId: string; userId: string }) {
  const { contacts, loading, createContact, updateContact, deleteContact } = useContacts(teamId, userId);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactDoc | null>(null);
  const [search, setSearch] = useState('');

  const [sortBy, setSortBy] = useState<'mention' | 'name' | 'recent'>('mention');

  const sorted = [...contacts].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko');
    if (sortBy === 'recent') {
      const ta = a.last_mentioned_at?.getTime() ?? 0;
      const tb = b.last_mentioned_at?.getTime() ?? 0;
      return tb - ta;
    }
    return (b.mention_count ?? 0) - (a.mention_count ?? 0);
  });

  const filtered = sorted.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.relationship.toLowerCase().includes(search.toLowerCase()),
  );

  const maxMention = Math.max(...contacts.map(c => c.mention_count ?? 0), 1);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createContact(newName, newRelation);
      setNewName('');
      setNewRelation('');
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>연락처 👥</h2>
          <p className="text-sm mt-1" style={{ color: C.ink500 }}>AI가 일기·태스크에서 언급된 사람을 자동 추가합니다</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="text-sm px-3 py-2 rounded-xl font-medium"
          style={{ background: C.mustard, color: '#fff' }}
        >
          + 추가
        </button>
      </div>

      {/* 검색 + 정렬 */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 관계로 검색..."
          className="flex-1 rounded-2xl px-4 py-2.5 text-sm outline-none"
          style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink900 }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-2xl px-3 py-2 text-xs outline-none"
          style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}
        >
          <option value="mention">언급 많은 순</option>
          <option value="recent">최근 순</option>
          <option value="name">이름 순</option>
        </select>
      </div>

      {/* 새 연락처 */}
      {showNew && (
        <div className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
          <p className="text-sm font-medium" style={{ color: C.ink900 }}>새 연락처</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="이름"
            autoFocus
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
          />
          <input
            value={newRelation}
            onChange={(e) => setNewRelation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="관계 (예: 친구, 동료, 가족)"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNew(false)} className="text-sm px-3 py-1.5 rounded-xl"
              style={{ color: C.ink500 }}>취소</button>
            <button onClick={handleCreate} disabled={!newName.trim() || creating}
              className="text-sm px-3 py-1.5 rounded-xl font-medium"
              style={{ background: C.mustard, color: '#fff' }}>
              {creating ? '...' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-sm" style={{ color: C.ink300 }}>
            {search ? '검색 결과가 없습니다' : '아직 연락처가 없습니다'}
          </p>
          <p className="text-xs mt-1" style={{ color: C.ink300 }}>
            입력창에서 누군가를 언급하면 AI가 자동으로 추가합니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              maxMention={maxMention}
              onClick={() => setSelectedContact(contact)}
            />
          ))}
        </div>
      )}

      {/* 연락처 상세 패널 */}
      {selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onUpdate={updateContact}
          onDelete={async (id) => { await deleteContact(id); setSelectedContact(null); }}
        />
      )}
    </div>
  );
}

function ContactCard({ contact, maxMention, onClick }: { contact: ContactDoc; maxMention: number; onClick: () => void }) {
  const initials = contact.name.slice(0, 2);
  const mentionPct = maxMention > 0 ? Math.round(((contact.mention_count ?? 0) / maxMention) * 100) : 0;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.mustard)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.beige)}
      onClick={onClick}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: C.mustard + '25', color: C.mustard }}
      >
        {contact.emoji ?? initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium" style={{ color: C.ink900 }}>{contact.name}</p>
          {contact.relationship && (
            <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: C.beige, color: C.ink500 }}>
              {contact.relationship}
            </span>
          )}
        </div>
        {contact.mention_count > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: C.beige }}>
              <div className="h-full rounded-full" style={{ width: `${mentionPct}%`, background: C.mustard }} />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: C.ink300 }}>{contact.mention_count}회</span>
          </div>
        )}
      </div>
      <span style={{ color: C.ink300 }}>›</span>
    </div>
  );
}

function ContactDetailPanel({
  contact,
  onClose,
  onUpdate,
  onDelete,
}: {
  contact: ContactDoc;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<ContactDoc>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(contact.name);
  const [relationship, setRelationship] = useState(contact.relationship);
  const [email, setEmail] = useState(contact.email ?? '');
  const [phone, setPhone] = useState(contact.phone ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(contact.id, { name, relationship, email: email || null, phone: phone || null });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(45,42,38,0.3)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col overflow-hidden"
        style={{ background: C.ivory, borderLeft: `1px solid ${C.beige}` }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.beige}` }}>
          <h3 className="font-semibold text-sm" style={{ color: C.ink900 }}>연락처 상세</h3>
          <div className="flex gap-2">
            <button onClick={() => onDelete(contact.id)} className="text-xs px-2 py-1 rounded-lg" style={{ color: C.red }}>삭제</button>
            <button onClick={onClose} className="text-lg leading-none" style={{ color: C.ink300 }}>×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* 아바타 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
              style={{ background: C.mustard + '25', color: C.mustard }}>
              {contact.emoji ?? contact.name.slice(0, 2)}
            </div>
          </div>

          {[
            { label: '이름', value: name, setter: setName, placeholder: '이름' },
            { label: '관계', value: relationship, setter: setRelationship, placeholder: '예: 친구, 동료' },
            { label: '이메일', value: email, setter: setEmail, placeholder: 'email@example.com' },
            { label: '전화번호', value: phone, setter: setPhone, placeholder: '010-0000-0000' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="text-xs font-medium block mb-1" style={{ color: C.ink500 }}>{label}</label>
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink900 }}
              />
            </div>
          ))}

          {contact.ai_summary && (
            <div className="rounded-xl p-3" style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: C.ink500 }}>🤖 AI 요약</p>
              <p className="text-sm" style={{ color: C.ink900 }}>{contact.ai_summary}</p>
            </div>
          )}

          <div className="text-xs" style={{ color: C.ink300 }}>
            총 {contact.mention_count}회 언급됨
            {contact.last_mentioned_at && ` · 마지막: ${contact.last_mentioned_at.toLocaleDateString('ko-KR')}`}
          </div>
        </div>

        <div className="px-5 py-4" style={{ borderTop: `1px solid ${C.beige}` }}>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: C.mustard, color: '#fff' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  );
}
