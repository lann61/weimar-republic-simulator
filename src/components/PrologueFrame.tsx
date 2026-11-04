import { useEffect } from 'react';

export function PrologueFrame({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === 'weimar-prologue-done') onDone();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onDone]);

  const params = new URLSearchParams(window.location.search);
  const sharecode = params.get('sharecode');
  const src = `./prologue.html${sharecode ? `?sharecode=${encodeURIComponent(sharecode)}` : ''}`;

  return (
    <iframe
      src={src}
      title="序章 · 一个国家，两次诞生"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        zIndex: 9000,
        background: '#141312',
      }}
    />
  );
}
