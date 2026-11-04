import { useEffect, useRef } from 'react';
import { useGame } from '../store/useGame';
import { playParliamentMurmur } from '../utils/sfx';

/**
 * 监听国会选举发生（state.elections 增长）并播放远处人声嘈杂音效。
 */
export function SfxController() {
  const { state } = useGame();
  const count = state?.elections.length ?? 0;
  const prev = useRef(count);

  useEffect(() => {
    if (count > prev.current) {
      playParliamentMurmur();
    }
    prev.current = count;
  }, [count]);

  return null;
}
