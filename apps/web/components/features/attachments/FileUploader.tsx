'use client';

import { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../lib/firebase';
import type { TaskAttachment as Attachment } from '@mda/shared';

export type { Attachment };

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

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 10;

interface Props {
  teamId: string;
  entityId: string;
  entityType: 'task' | 'journal' | 'section';
  attachments?: Attachment[];
  onAdd: (attachment: Attachment) => void;
  onRemove?: (path: string) => void;
  maxFiles?: number;
}

export function FileUploader({
  teamId, entityId, entityType, attachments = [], onAdd, onRemove, maxFiles = 5,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const file = files[0]!;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('지원하지 않는 파일 형식입니다 (이미지, PDF, Word, TXT)');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다`);
      return;
    }
    if (attachments.length >= maxFiles) {
      setError(`최대 ${maxFiles}개까지 첨부할 수 있습니다`);
      return;
    }

    setUploading(true);
    setProgress(0);

    const path = `teams/${teamId}/${entityType}/${entityId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        setError(`업로드 실패: ${err.message}`);
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onAdd({ name: file.name, url, type: file.type, size: file.size, path });
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
      },
    );
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  function getIcon(type: string) {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word')) return '📝';
    return '📎';
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium" style={{ color: C.ink500 }}>
          첨부파일 {attachments.length > 0 && `(${attachments.length}/${maxFiles})`}
        </p>
        {attachments.length < maxFiles && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2.5 py-1 rounded-xl transition-colors"
            style={{
              background: uploading ? C.beige : C.cream,
              border: `1px solid ${C.beige}`,
              color: uploading ? C.ink300 : C.ink500,
            }}
          >
            {uploading ? `업로드 중 ${progress}%` : '+ 파일 추가'}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {/* 업로드 진행 바 */}
      {uploading && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.beige }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: C.mustard }} />
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: C.coral }}>{error}</p>
      )}

      {/* 드래그 앤 드롭 존 */}
      {attachments.length === 0 && !uploading && (
        <div
          className="rounded-xl border-2 border-dashed flex items-center justify-center py-4 cursor-pointer"
          style={{ borderColor: C.beige }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
        >
          <p className="text-xs text-center" style={{ color: C.ink300 }}>
            📎 파일을 드래그하거나 클릭하세요<br />
            <span style={{ fontSize: 10 }}>이미지·PDF·Word·TXT / 최대 {MAX_SIZE_MB}MB</span>
          </p>
        </div>
      )}

      {/* 첨부 목록 */}
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1">
          {attachments.map((att) => (
            <div key={att.path} className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
              <span className="text-base flex-shrink-0">{getIcon(att.type)}</span>
              <div className="flex-1 min-w-0">
                <a href={att.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium truncate block hover:underline"
                  style={{ color: C.ink900 }}>
                  {att.name}
                </a>
                <p className="text-[10px]" style={{ color: C.ink300 }}>{formatSize(att.size)}</p>
              </div>
              {/* 이미지 미리보기 */}
              {att.type.startsWith('image/') && (
                <img src={att.url} alt={att.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  style={{ border: `1px solid ${C.beige}` }} />
              )}
              {onRemove && (
                <button onClick={() => onRemove(att.path)}
                  className="text-xs flex-shrink-0" style={{ color: C.ink300 }}>
                  ×
                </button>
              )}
            </div>
          ))}
          {/* 추가 드롭존 (파일 있을 때) */}
          {attachments.length < maxFiles && (
            <div
              className="rounded-xl border border-dashed flex items-center justify-center py-2 cursor-pointer"
              style={{ borderColor: C.beige }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); void handleFiles(e.dataTransfer.files); }}
            >
              <p className="text-[10px]" style={{ color: C.ink300 }}>+ 파일 추가</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
