"use client";

import { useRef, useState } from "react";

// Plays public/flipsound.ogg on every flip. The <audio> element is created
// lazily on the first real call (always inside a click/keypress handler
// here, since page flips are user-triggered), satisfying the browser's
// "audio needs a user gesture" autoplay policy.
//
// .ogg has no playback support in Safari (desktop or iOS) — audio.play()
// rejects there, in which case we fall back to a synthesized "page swoosh"
// via the Web Audio API instead of leaving Safari/iPad silent.
export function useFlipbookSound() {
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  function playFallbackSwoosh() {
    if (typeof window === "undefined") return;
    if (!ctxRef.current) {
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      ctxRef.current = new AudioContextCtor();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();

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

  function playFlipSound() {
    if (muted) return;
    if (typeof window === "undefined") return;
    if (!audioRef.current) {
      audioRef.current = new Audio("/flipsound.ogg");
    }
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => playFallbackSwoosh());
  }

  return { muted, toggleMuted: () => setMuted((m) => !m), playFlipSound };
}
