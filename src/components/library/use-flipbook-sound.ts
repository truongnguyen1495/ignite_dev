"use client";

import { useEffect, useRef, useState } from "react";

const SOUND_URL = "/flipsound.ogg";
// public/flipsound.ogg has ~70ms of near-silence baked in before the actual
// "flip" transient starts (measured with ffmpeg silencedetect) — starting
// playback at 0 made the sound noticeably lag behind the visual flip.
// Starting the buffer source at this offset skips straight to the transient.
const SOUND_START_OFFSET = 0.05;

// Plays public/flipsound.ogg on every flip via the Web Audio API — decoded
// once into an AudioBuffer up front so playback on each flip is
// near-instant (HTMLAudioElement.play() has noticeably higher start-up
// latency, which combined with the file's lead-in silence made the sound
// feel like it landed after the page had already finished turning).
//
// .ogg has no decode support in Safari (desktop or iOS) — decodeAudioData
// rejects there, in which case we fall back to a synthesized "page swoosh"
// instead of leaving Safari/iPad silent.
export function useFlipbookSound() {
  const [muted, setMuted] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  // null = not requested yet, "loading"/"failed" = in flight or gave up,
  // AudioBuffer = ready to play.
  const bufferRef = useRef<AudioBuffer | "loading" | "failed" | null>(null);

  // Kicks off the fetch+decode as soon as the reader mounts, well before the
  // first flip — constructing/decoding into an AudioContext needs no user
  // gesture, only actually producing sound does (handled separately via
  // ctx.resume() inside playFlipSound, always called from a click handler).
  useEffect(() => {
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!ctxRef.current) ctxRef.current = new AudioContextCtor();
    if (bufferRef.current === null) loadBuffer(ctxRef.current);
  }, []);

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

  function loadBuffer(ctx: AudioContext) {
    bufferRef.current = "loading";
    fetch(SOUND_URL)
      .then((res) => res.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .then((buffer) => {
        bufferRef.current = buffer;
      })
      .catch(() => {
        bufferRef.current = "failed";
      });
  }

  function playFallbackSwoosh(ctx: AudioContext) {
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
    const ctx = getContext();
    if (!ctx) return;

    if (bufferRef.current === null) loadBuffer(ctx);

    if (bufferRef.current instanceof AudioBuffer) {
      const buffer = bufferRef.current;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(ctx.currentTime, Math.min(SOUND_START_OFFSET, buffer.duration));
    } else {
      // Not ready yet (still loading on this very first flip, or decoding
      // failed outright, e.g. Safari) — the swoosh keeps every flip audible
      // instead of some flips being silent while the fetch is in flight.
      playFallbackSwoosh(ctx);
    }
  }

  return { muted, toggleMuted: () => setMuted((m) => !m), playFlipSound };
}
