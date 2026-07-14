"use client";

import { useRef, useState } from "react";

// Synthesizes a short "page swoosh" on every flip via the Web Audio API —
// no MP3 asset to source/license, works fully offline. The AudioContext is
// created lazily on the first real call (always inside a click/keypress
// handler here), which doubles as satisfying the browser's "audio needs a
// user gesture" autoplay policy.
export function useFlipbookSound() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);

  function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      ctxRef.current = new AudioContextCtor();
    }
    if (ctxRef.current.state === "suspended") void ctxRef.current.resume();
    return ctxRef.current;
  }

  function playFlipSound() {
    if (muted) return;
    const ctx = getContext();
    if (!ctx) return;

    const duration = 0.22;
    const bufferSize = Math.round(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2200;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  return { muted, toggleMuted: () => setMuted((m) => !m), playFlipSound };
}
