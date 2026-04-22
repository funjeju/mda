'use client';

import { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { useEffect } from 'react';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  green:   '#5A8F6A',
};

export interface CustomSticker {
  id: string;
  url: string;
  name: string;
  created_by: string;
  team_id: string;
  shared: boolean;
  created_at: unknown;
}

interface Props {
  teamId: string;
  userId: string;
  onSelect?: (url: string) => void;
}

export function CustomStickerUploader({ teamId, userId, onSelect }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stickers, setStickers] = useState<CustomSticker[]>([]);
  const [tab, setTab] = useState<'mine' | 'team' | 'community'>('mine');
  const [communityStickers, setCommunityStickers] = useState<CustomSticker[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // 팀 커스텀 스티커 구독
  useEffect(() => {
    const col = collection(db, 'teams', teamId, 'custom_stickers');
    const q = tab === 'mine'
      ? query(col, where('created_by', '==', userId))
      : query(col);
    const unsub = onSnapshot(q, (snap) => {
      setStickers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomSticker));
    });
    return unsub;
  }, [teamId, userId, tab]);

  // 커뮤니티 스티커 구독
  useEffect(() => {
    if (tab !== 'community') return;
    const col = collection(db, 'community_stickers');
    const q = query(col, where('shared', '==', true));
    const unsub = onSnapshot(q, (snap) => {
      setCommunityStickers(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomSticker));
    });
    return unsub;
  }, [tab]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 500 * 1024) { alert('500KB 이하 이미지만 업로드 가능합니다'); return; }

    setUploading(true);
    setProgress(0);

    const path = `teams/${teamId}/custom_stickers/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on('state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => { setUploading(false); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, 'teams', teamId, 'custom_stickers'), {
          url, name: file.name, created_by: userId,
          team_id: teamId, shared: false,
          created_at: serverTimestamp(),
          path,
        });
        setUploading(false);
        setProgress(0);
        if (fileRef.current) fileRef.current.value = '';
      }
    );
  }

  async function handleShare(sticker: CustomSticker) {
    // 커뮤니티에 공유
    await addDoc(collection(db, 'community_stickers'), {
      url: sticker.url, name: sticker.name,
      created_by: userId, team_id: teamId,
      shared: true, created_at: serverTimestamp(),
      original_id: sticker.id,
    });
    await updateDoc(doc(db, 'teams', teamId, 'custom_stickers', sticker.id), { shared: true });
  }

  async function handleDelete(stickerId: string) {
    await deleteDoc(doc(db, 'teams', teamId, 'custom_stickers', stickerId));
  }

  const displayList = tab === 'community' ? communityStickers : stickers;

  return (
    <div className="flex flex-col gap-3">
      {/* 탭 */}
      <div className="flex gap-1">
        {(['mine', 'team', 'community'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-xs px-3 py-1 rounded-xl transition-colors"
            style={{
              background: tab === t ? C.mustard : C.cream,
              color: tab === t ? '#fff' : C.ink500,
            }}
          >
            {t === 'mine' ? '내 스티커' : t === 'team' ? '팀 스티커' : '커뮤니티'}
          </button>
        ))}
      </div>

      {/* 업로드 버튼 */}
      {tab !== 'community' && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full text-xs py-2 rounded-xl border-dashed border-2 transition-colors"
            style={{ borderColor: C.beige, color: C.ink300 }}
          >
            {uploading ? `업로드 중... ${progress}%` : '+ 이미지 업로드 (PNG/GIF, 500KB 이하)'}
          </button>
          {uploading && (
            <div className="mt-1 rounded-full overflow-hidden h-1" style={{ background: C.beige }}>
              <div style={{ width: `${progress}%`, background: C.mustard, height: '100%', transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
      )}

      {/* 스티커 그리드 */}
      <div className="grid grid-cols-5 gap-2">
        {displayList.map((s) => (
          <div key={s.id} className="relative group">
            <button
              onClick={() => onSelect?.(s.url)}
              className="w-12 h-12 rounded-xl overflow-hidden border transition-all hover:scale-105"
              style={{ borderColor: C.beige }}
            >
              <img src={s.url} alt={s.name} className="w-full h-full object-contain" />
            </button>
            {/* 호버 액션 */}
            {tab !== 'community' && s.created_by === userId && (
              <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                {!s.shared && (
                  <button
                    onClick={() => handleShare(s)}
                    className="w-5 h-5 rounded-full text-[9px] flex items-center justify-center"
                    style={{ background: C.green, color: '#fff' }}
                    title="커뮤니티에 공유"
                  >↑</button>
                )}
                <button
                  onClick={() => handleDelete(s.id)}
                  className="w-5 h-5 rounded-full text-[9px] flex items-center justify-center"
                  style={{ background: '#EB8B7C', color: '#fff' }}
                  title="삭제"
                >×</button>
              </div>
            )}
          </div>
        ))}
        {displayList.length === 0 && (
          <p className="col-span-5 text-xs text-center py-4" style={{ color: C.ink300 }}>
            {tab === 'community' ? '공유된 스티커가 없습니다' : '업로드된 스티커가 없습니다'}
          </p>
        )}
      </div>
    </div>
  );
}
