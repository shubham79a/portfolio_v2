"use client";

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * Atmosphere for the hero: two soft washes on a parallax, a grain, and a
 * vignette. Nothing else.
 *
 * Depth comes from the parallax — the layers translate at different
 * fractions of the pointer, so the near one outruns the far one and the
 * eye reads separation.
 *
 * Three things were deliberately removed, and are worth not putting
 * back:
 *
 *   1. **Blur filters.** The glows were once radial gradients with
 *      `blur-[120px]` on top. A radial gradient is already soft — the
 *      filter added nothing visually, and a 736px element blurred by
 *      120px is an enormous convolution to rasterise on every repaint,
 *      which includes every theme change.
 *   2. **The two thin rings.** They were the only hard edges here, and
 *      they never earned their place: invisible against the dark field,
 *      and on the pale one they read as stray hairs drawn across the
 *      composition rather than as structure. The rotating dashed ring
 *      around the portrait in `hero.tsx` is the one piece of that
 *      language worth keeping, because it belongs to something.
 *   3. **The light that followed the cursor.** A 52rem element tracking
 *      the pointer on a spring. In dark mode it was a warm pool; in
 *      light mode the same gradient could only ever be a grey smudge
 *      trailing the mouse, since the page sits at 73% luminance and
 *      leaves nothing to brighten into.
 *
 * What is left animates on `transform` only, and takes every colour from
 * the `--glow-*` tokens rather than `--accent-*`. That indirection
 * matters: a glow has to be brighter than the ground it falls on, and
 * the accent is lighter than the page in dark mode but much darker in
 * light. See the note in globals.css.
 */
export function HeroBackdrop() {
  const reduced = useReducedMotion();

  // Normalised pointer, -0.5..0.5 per axis, for the parallax layers.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 38, damping: 20, mass: 1 });
  const sy = useSpring(my, { stiffness: 38, damping: 20, mass: 1 });

  /* Layer travel in px. Larger = nearer the viewer. */
  const farX = useTransform(sx, (v) => v * 14);
  const farY = useTransform(sy, (v) => v * 10);
  const midX = useTransform(sx, (v) => v * 38);
  const midY = useTransform(sy, (v) => v * 26);

  useEffect(() => {
    if (reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e: PointerEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, reduced]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* far: one broad wash anchoring the field */}
      <motion.div style={{ x: farX, y: farY }} className="absolute -inset-[15%]">
        <div
          className="absolute top-[18%] left-[52%] h-[46rem] w-[46rem] rounded-full opacity-90"
          style={{
            background:
              "radial-gradient(circle, var(--glow-wash) 0%, transparent 62%)",
          }}
        />
      </motion.div>

      {/* mid: two smaller glows, offset so the field is not symmetrical.
          `lg` and up only, which is the same breakpoint at which the
          hero becomes two columns — not a coincidence, since every
          offset here is a percentage tuned to sit in the empty band
          beside the portrait in that layout. Collapse to one column and
          the same percentages drop them straight through the copy. That
          also covers a phone in desktop mode, whose ~980px layout width
          still sits below `lg`. */}
      <motion.div
        style={{ x: midX, y: midY }}
        className="absolute -inset-[15%] hidden lg:block"
      >
        <div
          className="absolute top-[8%] left-[62%] h-[30rem] w-[30rem] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, var(--glow-soft) 0%, transparent 64%)",
          }}
        />
        <div
          className="absolute top-[58%] left-[38%] h-[26rem] w-[26rem] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, var(--glow-deep) 0%, transparent 66%)",
          }}
        />
      </motion.div>

      {/* fine grain, which is what stops the gradients reading as flat
          CSS blobs. Inlined so it costs no request, and composited
          plainly — `mix-blend-mode` here forced a full-viewport blend
          layer for a texture that reads the same without it. */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* vignette, so the field sits behind the type instead of competing */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 35%, var(--bg) 100%)",
        }}
      />
    </div>
  );
}
