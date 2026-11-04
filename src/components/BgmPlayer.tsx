import { useEffect, useRef, useState } from 'react';

/**
 * 全局背景音乐（1.mp3），贯穿序章与游戏。
 *
 * 浏览器自动播放策略：父页面在序章（全屏 iframe）阶段无法直接发声，
 * 因此序章阶段由 iframe 内的 <audio> 播放，进入游戏时通过 postMessage
 * 把播放进度与音量交接到本播放器，保证全程有音乐。
 * 控件始终在左下角，序章阶段通过消息控制 iframe 内的音频。
 */
export function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userMuted = useRef(false);
  const prologueActive = useRef(
    (() => {
      try {
        return localStorage.getItem('weimar_prologue_seen') !== '1';
      } catch {
        return true;
      }
    })(),
  );
  const [volume, setVolume] = useState(0.35);
  const [muted, setMuted] = useState(false);

  const syncPrologue = (v: number, m: boolean) => {
    if (!prologueActive.current) return;
    const frame = document.querySelector('iframe');
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'weimar-bgm', volume: v, muted: m }, '*');
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;

    const startGameAudio = () => {
      const a = audioRef.current;
      if (!a) return;
      a.muted = false;
      a.play().catch(() => {});
    };

    const onHandoff = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== 'weimar-bgm-handoff') return;
      prologueActive.current = false;
      const a = audioRef.current;
      if (!a) return;
      const v = typeof d.volume === 'number' ? d.volume : volume;
      const m = !!d.muted;
      a.volume = v;
      a.muted = m;
      try {
        a.currentTime = typeof d.time === 'number' ? d.time : 0;
      } catch {
        /* ignore */
      }
      a.play().catch(() => {});
      setVolume(v);
      setMuted(m);
    };

    const onGesture = () => {
      // 序章阶段由 iframe 内的音频负责发声
      if (prologueActive.current) return;
      startGameAudio();
    };

    window.addEventListener('message', onHandoff);
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('message', onHandoff);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    userMuted.current = next;
    if (prologueActive.current) {
      syncPrologue(volume, next);
    } else {
      const a = audioRef.current;
      if (a) {
        a.muted = next;
        if (!next) a.play().catch(() => {});
      }
    }
  };

  return (
    <>
      <audio ref={audioRef} src="./bgm.mp3" loop preload="auto" />
      <div
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px 6px 8px',
          borderRadius: 999,
          background: 'rgba(20, 19, 18, 0.9)',
          border: '1px solid rgba(185, 154, 98, 0.4)',
          color: '#b99a62',
          fontSize: 12,
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <button
          type="button"
          onClick={toggleMute}
          title={muted ? '开启背景音乐' : '关闭背景音乐'}
          style={{
            width: 24,
            height: 24,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            border: '1px solid rgba(185,154,98,0.4)',
            background: 'transparent',
            color: '#b99a62',
            cursor: 'pointer',
            fontSize: 13,
            lineHeight: 1,
            padding: 0,
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            if (v > 0 && muted) {
              setMuted(false);
              userMuted.current = false;
            }
            if (prologueActive.current) {
              syncPrologue(v, v > 0 ? false : muted);
            }
          }}
          aria-label="背景音乐音量"
          style={{ width: 78, accentColor: '#b99a62', cursor: 'pointer' }}
        />
      </div>
    </>
  );
}
