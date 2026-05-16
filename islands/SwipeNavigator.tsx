import { useEffect } from "preact/hooks";

interface Props {
  prevHref: string | null;
  nextHref: string | null;
}

export default function SwipeNavigator({ prevHref, nextHref }: Props) {
  useEffect(() => {
    const target = document.querySelector("main") as HTMLElement | null;
    if (!target) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let dx = 0;
    let tracking = false;
    let locked: "h" | "v" | null = null;

    const THRESHOLD = 80;
    const LOCK_DIST = 10;
    const MAX_TIME = 600;

    const setTransform = (x: number, withTransition: boolean) => {
      target.style.transition = withTransition
        ? "transform 220ms ease-out, opacity 220ms ease-out"
        : "none";
      target.style.transform = x === 0 ? "" : `translateX(${x}px)`;
      target.style.opacity = x === 0 ? "" : String(
        Math.max(0.4, 1 - Math.abs(x) / (globalThis.innerWidth * 1.5)),
      );
    };

    const reset = () => {
      setTransform(0, true);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
      dx = 0;
      tracking = true;
      locked = null;
      target.style.transition = "none";
    };

    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const rawDx = t.clientX - startX;
      const rawDy = t.clientY - startY;

      if (locked === null) {
        if (Math.abs(rawDx) < LOCK_DIST && Math.abs(rawDy) < LOCK_DIST) return;
        if (Math.abs(rawDx) > Math.abs(rawDy)) {
          locked = "h";
        } else {
          locked = "v";
          tracking = false;
          return;
        }
      }

      if (locked !== "h") return;

      let eff = rawDx;
      // Resistance when no destination
      if ((eff < 0 && !nextHref) || (eff > 0 && !prevHref)) {
        eff = eff * 0.25;
      }
      dx = eff;
      if (e.cancelable) e.preventDefault();
      setTransform(eff, false);
    };

    const onEnd = (_e: TouchEvent) => {
      if (!tracking && locked !== "h") {
        return;
      }
      tracking = false;
      const dt = Date.now() - startT;
      const width = globalThis.innerWidth;

      const goNext = dx < 0 && nextHref &&
        (Math.abs(dx) > THRESHOLD || (dt < MAX_TIME && Math.abs(dx) > 40));
      const goPrev = dx > 0 && prevHref &&
        (Math.abs(dx) > THRESHOLD || (dt < MAX_TIME && Math.abs(dx) > 40));

      if (goNext || goPrev) {
        const exitX = goNext ? -width : width;
        target.style.transition =
          "transform 200ms ease-in, opacity 200ms ease-in";
        target.style.transform = `translateX(${exitX}px)`;
        target.style.opacity = "0";
        const href = goNext ? nextHref! : prevHref!;
        globalThis.setTimeout(() => {
          globalThis.location.href = href;
        }, 180);
      } else {
        reset();
      }
    };

    const onCancel = () => {
      tracking = false;
      locked = null;
      reset();
    };

    globalThis.addEventListener("touchstart", onStart, { passive: true });
    globalThis.addEventListener("touchmove", onMove, { passive: false });
    globalThis.addEventListener("touchend", onEnd, { passive: true });
    globalThis.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      globalThis.removeEventListener("touchstart", onStart);
      globalThis.removeEventListener("touchmove", onMove);
      globalThis.removeEventListener("touchend", onEnd);
      globalThis.removeEventListener("touchcancel", onCancel);
      target.style.transition = "";
      target.style.transform = "";
      target.style.opacity = "";
    };
  }, [prevHref, nextHref]);

  return null;
}
