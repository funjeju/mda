'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

const C = {
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
};

interface Props {
  onSubmit: (title: string) => Promise<void>;
}

export function TaskInput({ onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    try {
      setSubmitting(true);
      await onSubmit(trimmed);
      setValue('');
      textareaRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="오늘 할 일을 적어보세요... (Cmd+Enter로 저장)"
        className="w-full resize-none outline-none text-sm leading-relaxed min-h-[72px] bg-transparent"
        style={{ color: C.ink900 }}
      />
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.beige}` }}>
        <span className="text-xs" style={{ color: C.ink300 }}>
          {value.length > 0 ? `${value.length}자` : 'Cmd+Enter로 빠르게 저장'}
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!value.trim() || submitting}
          style={{ background: C.mustard, color: '#fff', border: 'none' }}
        >
          {submitting ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}
