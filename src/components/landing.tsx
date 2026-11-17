import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

const TYPE_MS = 75;
const HOLD_MS = 1700;
const EXIT_MS = 340;

/**
 * Types each word, holds it with a blinking cursor, fades it up and out, then types the next.
 * The line has a fixed height, so nothing around it ever moves. Screen readers get the full list once.
 * With reduced motion it shows the first word, still.
 */
export function Typewriter({ words }: { words: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const word = words[index];
    let timer: number;
    if (leaving) {
      timer = window.setTimeout(() => { setLeaving(false); setText(''); setIndex((i) => (i + 1) % words.length); }, EXIT_MS);
    } else if (text.length < word.length) {
      timer = window.setTimeout(() => setText(word.slice(0, text.length + 1)), TYPE_MS + Math.random() * 45);
    } else {
      timer = window.setTimeout(() => setLeaving(true), HOLD_MS);
    }
    return () => window.clearTimeout(timer);
  }, [reduced, words, index, text, leaving]);

  return (
    <>
      <span className="sr-only">{words.join(', ')}</span>
      <span aria-hidden="true" className="block h-[1.2em] leading-[1.2]">
        <span className={`inline-block ${leaving ? 'animate-[word-out_.34s_ease-in_forwards]' : ''}`}>
          <span className="text-gradient">{reduced ? words[0] : text}</span>
          <span className="ml-1 inline-block h-[0.85em] w-[0.07em] translate-y-[0.08em] animate-[blink_1.05s_steps(1)_infinite] bg-moss motion-reduce:animate-none" />
        </span>
      </span>
    </>
  );
}

/** Fades and lifts its children in once they scroll into view. */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !('IntersectionObserver' in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const style: CSSProperties = delay ? { transitionDelay: `${delay}ms` } : {};
  return <div ref={ref} style={style} className={`reveal ${shown ? 'in' : ''} ${className}`}>{children}</div>;
}
