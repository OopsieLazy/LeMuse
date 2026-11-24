// Zoom and pan on the current image (owner, session 22; ADR-0033).
//
// Pure maths, so it can be unit-tested and shared by the view (wheel, drag,
// pinch, double-click) and the app (keys). A zoom is a scale plus a pan in
// screen pixels from the frame's centre; the image and the study grid both get
// `translate(pan) scale(scale)` before any mirror or turn, so the grid stays on
// the same features of the image. Nothing here reads pixels or stores images.

export interface Zoom {
  /** 1 = fit (no zoom). */
  scale: number;
  /** Pan in CSS pixels, from the frame's centre. */
  x: number;
  y: number;
}

/** The frame's size and the image's shown size at scale 1. */
export interface ZoomBox {
  frameW: number;
  frameH: number;
  imageW: number;
  imageH: number;
}

export const NO_ZOOM: Zoom = { scale: 1, x: 0, y: 0 };
export const MAX_ZOOM = 8;
/** One key press or button step. */
export const ZOOM_STEP = 1.25;
/** Double-click from fit (PhotoSwipe's default is about 2.5× fit). */
export const DOUBLE_CLICK_ZOOM = 2.5;
/** Past this the sharpest stored size is loaded (ADR-0033 §3). */
export const SHARPER_AT = 1.2;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const isZoomed = (z: Zoom) => z.scale > 1;

/**
 * Keep the scale in 1…MAX_ZOOM and the pan inside the image: an edge can come
 * to the frame's edge but no further, and an axis the image doesn't fill
 * stays centred. Back at 1, the pan resets.
 */
export function clampZoom(z: Zoom, box: ZoomBox): Zoom {
  const scale = clamp(Number.isFinite(z.scale) ? z.scale : 1, 1, MAX_ZOOM);
  if (scale <= 1.001) return NO_ZOOM;
  const mx = Math.max(0, (box.imageW * scale - box.frameW) / 2);
  const my = Math.max(0, (box.imageH * scale - box.frameH) / 2);
  return {
    scale,
    x: clamp(Number.isFinite(z.x) ? z.x : 0, -mx, mx),
    y: clamp(Number.isFinite(z.y) ? z.y : 0, -my, my),
  };
}

/**
 * Zoom to `scale` keeping the point at (dx, dy) from the frame's centre under
 * the pointer. With the origin at the image's centre, a screen point p shows
 * image point q where p = pan + scale·q, so keeping p fixed gives
 * pan' = d − (scale'/scale)·(d − pan).
 */
export function zoomAt(z: Zoom, scale: number, dx: number, dy: number, box: ZoomBox): Zoom {
  const next = clamp(scale, 1, MAX_ZOOM);
  const k = next / z.scale;
  return clampZoom({ scale: next, x: dx - k * (dx - z.x), y: dy - k * (dy - z.y) }, box);
}

export const panBy = (z: Zoom, dx: number, dy: number, box: ZoomBox): Zoom =>
  clampZoom({ ...z, x: z.x + dx, y: z.y + dy }, box);

/** Zoom in (+1) or out (−1) one step about the centre: the keys. */
export const zoomStep = (z: Zoom, dir: 1 | -1, box: ZoomBox): Zoom =>
  zoomAt(z, z.scale * (dir > 0 ? ZOOM_STEP : 1 / ZOOM_STEP), 0, 0, box);

/** Double-click: from fit to 2.5× at the pointer; from any zoom back to fit. */
export const toggleZoom = (z: Zoom, dx: number, dy: number, box: ZoomBox): Zoom =>
  isZoomed(z) ? NO_ZOOM : zoomAt(z, DOUBLE_CLICK_ZOOM, dx, dy, box);

/**
 * One wheel event's zoom factor. A mouse notch (~100 px) is about ±16%; a
 * touchpad pinch arrives as ctrl + small deltas and is made more sensitive.
 * Line-based deltas (deltaMode 1) are about 40 px each.
 */
export function wheelFactor(deltaY: number, deltaMode: number, ctrlKey: boolean): number {
  const px = deltaMode === 1 ? deltaY * 40 : deltaMode === 2 ? deltaY * 800 : deltaY;
  return Math.exp(-clamp(px, -400, 400) * (ctrlKey ? 0.01 : 0.0015));
}

/**
 * The image's shown size inside its element (object-fit contain fits it in;
 * cover fills the element, which then clips it).
 */
export function shownSize(elW: number, elH: number, natW: number, natH: number, cover: boolean) {
  if (cover || !(natW > 0) || !(natH > 0) || !(elW > 0) || !(elH > 0)) return { w: elW, h: elH };
  const k = Math.min(elW / natW, elH / natH);
  return { w: natW * k, h: natH * k };
}

/** Measure the frame and its image (the browser's layout sizes, before any transform). */
export function measureBox(frame: Element | null, cover: boolean): ZoomBox | null {
  if (!(frame instanceof HTMLElement)) return null;
  const img = frame.querySelector(":scope > img");
  if (!(img instanceof HTMLImageElement) || !img.offsetWidth) return null;
  const shown = shownSize(img.offsetWidth, img.offsetHeight, img.naturalWidth, img.naturalHeight, cover);
  return { frameW: frame.clientWidth, frameH: frame.clientHeight, imageW: shown.w, imageH: shown.h };
}

/** "250%". */
export const zoomLabel = (z: Zoom) => `${Math.round(z.scale * 100)}%`;
