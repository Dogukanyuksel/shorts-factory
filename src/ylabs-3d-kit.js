/**
 * Y-LABS OS — Shared 3D PBR Cinema Kit (served offline at https://local.shorts/ylabs-3d-kit.js)
 * Zero-CDN studio lighting, PBR materials, X-ray edges, camera choreography & Safe-Zone HUD
 * for all 4 channels: physics, explainer, wealth, bio.
 */
import * as THREE from 'https://local.shorts/three.module.js';

export const CHANNEL_THEMES = {
  physics: {
    bg: 0x0B0F19,
    bgCss: '#0B0F19',
    primary: 0x00F0FF,
    primaryCss: '#00F0FF',
    accent: 0xFF3B30,
    accentCss: '#FF3B30',
    gridA: 0x164e63,
    gridB: 0x0f172a,
    brand: 'KINETIC LAB HQ',
  },
  explainer: {
    bg: 0x141414,
    bgCss: '#141414',
    primary: 0xFF9500,
    primaryCss: '#FF9500',
    accent: 0x38BDF8,
    accentCss: '#38BDF8',
    gridA: 0x475569,
    gridB: 0x1f2937,
    brand: 'CLEAR MECHANICS',
  },
  wealth: {
    bg: 0x090D16,
    bgCss: '#090D16',
    primary: 0xFFD60A,
    primaryCss: '#FFD60A',
    accent: 0x30D158,
    accentCss: '#30D158',
    gridA: 0x14532d,
    gridB: 0x0f172a,
    brand: 'WEALTH MECHANICS',
  },
  bio: {
    bg: 0x0D1117,
    bgCss: '#0D1117',
    primary: 0x34C759,
    primaryCss: '#34C759',
    accent: 0xFF2D55,
    accentCss: '#FF2D55',
    gridA: 0x1e3a5f,
    gridB: 0x111827,
    brand: 'BIO MECHANICS',
  },
};

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, t) => {
  const x = clamp((t - a) / Math.max(1e-5, b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
export const easeOutCubic = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);

export function createStudioStage({
  width = 720,
  height = 1280,
  channel = 'explainer',
  fov = 40,
  fogDensity = 0.032,
  bufferScale = 0.75,
  floorY = -2.4,
  addGrid = true,
} = {}) {
  const theme = CHANNEL_THEMES[channel] || CHANNEL_THEMES.explainer;
  const glCanvas = document.createElement('canvas');
  const glW = Math.max(320, Math.round(width * bufferScale));
  const glH = Math.max(320, Math.round(height * bufferScale));
  glCanvas.width = glW;
  glCanvas.height = glH;

  const renderer = new THREE.WebGLRenderer({
    canvas: glCanvas,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setSize(glW, glH, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.bg);
  scene.fog = new THREE.FogExp2(theme.bg, fogDensity);

  const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 120);
  camera.position.set(0, 2.2, 8.6);
  camera.lookAt(0, 0, 0);

  // Studio 3-Point + Channel Rim PBR Lighting
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.95);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.55);
  keyLight.position.set(5.5, 9.0, 7.0);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(theme.primary, 2.0);
  rimLight.position.set(-6.0, 4.5, -5.0);
  scene.add(rimLight);

  const accentRim = new THREE.PointLight(theme.accent, 14, 22);
  accentRim.position.set(5.0, -1.2, 4.5);
  scene.add(accentRim);

  const primaryRim = new THREE.PointLight(theme.primary, 12, 22);
  primaryRim.position.set(-4.5, 2.2, 4.0);
  scene.add(primaryRim);

  let floorGroup = null;
  if (addGrid) {
    floorGroup = new THREE.Group();
    const grid = new THREE.GridHelper(22, 26, theme.gridA, theme.gridB);
    grid.position.y = floorY;
    floorGroup.add(grid);

    const ringGeo = new THREE.RingGeometry(2.6, 2.66, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: theme.primary,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = floorY + 0.01;
    floorGroup.add(ring);
    scene.add(floorGroup);
  }

  function composite(ctx, W, H) {
    renderer.render(scene, camera);
    ctx.drawImage(glCanvas, 0, 0, W, H);
    // Subtle studio vignette for depth & HUD legibility
    const vg = ctx.createRadialGradient(W * 0.48, H * 0.46, W * 0.25, W * 0.5, H * 0.5, H * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(2,6,14,0.52)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  return { THREE, theme, glCanvas, renderer, scene, camera, floorGroup, composite };
}

export function createMaterials(channel = 'explainer') {
  const theme = CHANNEL_THEMES[channel] || CHANNEL_THEMES.explainer;
  return {
    steel: new THREE.MeshStandardMaterial({
      color: 0xc2cedc,
      metalness: 0.88,
      roughness: 0.22,
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x263142,
      metalness: 0.82,
      roughness: 0.34,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xffd60a,
      emissive: 0x78350f,
      emissiveIntensity: 0.18,
      metalness: 0.92,
      roughness: 0.18,
    }),
    primary: new THREE.MeshStandardMaterial({
      color: theme.primary,
      emissive: theme.primary,
      emissiveIntensity: 0.38,
      metalness: 0.45,
      roughness: 0.24,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: theme.accent,
      emissive: theme.accent,
      emissiveIntensity: 0.42,
      metalness: 0.42,
      roughness: 0.25,
    }),
    xrayGlass: new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.17,
      roughness: 0.1,
      metalness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    glow(hex, emissiveIntensity = 0.65, roughness = 0.22, metalness = 0.35) {
      return new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity,
        roughness,
        metalness,
      });
    },
    translucent(hex, opacity = 0.22) {
      return new THREE.MeshPhysicalMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.12,
        transparent: true,
        opacity,
        roughness: 0.14,
        metalness: 0.08,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    },
  };
}

export function addXrayEdges(geometry, color = 0x38bdf8, opacity = 0.48) {
  const edges = new THREE.EdgesGeometry(geometry, 20);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineSegments(edges, mat);
}

export function fitFont(ctx, text, basePx, maxW, weight = '900', family = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif') {
  let px = Math.round(basePx);
  ctx.font = `${weight} ${px}px ${family}`;
  const m = ctx.measureText(text).width || 1;
  if (m > maxW) px = Math.max(10, Math.floor(px * (maxW / m)));
  ctx.font = `${weight} ${px}px ${family}`;
  return px;
}

/**
 * Draws Y-LABS Safe-Zone compliant 2D HUD over a 3D WebGL frame.
 * Strict Safe-Zone: x in [6.5%W, 84%W], y in [12.5%H, 74%H].
 */
export function drawStudioHud(ctx, {
  W,
  H,
  channel = 'explainer',
  title = '',
  subtitle = '',
  badge = '',
  caption = '',
  metrics = [],
  progress = 0,
}) {
  const theme = CHANNEL_THEMES[channel] || CHANNEL_THEMES.explainer;
  const S = W / 720;
  const safeL = W * 0.065;
  const safeR = W * 0.84;
  const safeW = safeR - safeL;
  const cx = (safeL + safeR) * 0.5;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Top Hook / Badge Pill (y = 13.0%H)
  if (badge) {
    fitFont(ctx, badge, 13.5 * S, safeW - 28 * S, '900', 'ui-monospace, monospace');
    const bw = Math.min(safeW, ctx.measureText(badge).width + 28 * S);
    const bh = 28 * S;
    const by = H * 0.132;
    ctx.fillStyle = 'rgba(8, 13, 24, 0.82)';
    ctx.strokeStyle = theme.primaryCss;
    ctx.lineWidth = 1.6 * S;
    ctx.beginPath();
    ctx.roundRect(cx - bw * 0.5, by - bh * 0.5, bw, bh, 14 * S);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.primaryCss;
    ctx.fillText(badge, cx, by);
  }

  // Main Title (y = 16.5%H)
  if (title) {
    fitFont(ctx, title, 31 * S, safeW, '900');
    ctx.lineWidth = 5.5 * S;
    ctx.strokeStyle = 'rgba(4, 8, 16, 0.92)';
    ctx.strokeText(title, cx, H * 0.168);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(title, cx, H * 0.168);
  }

  // Subtitle (y = 19.3%H)
  if (subtitle) {
    fitFont(ctx, subtitle, 14 * S, safeW, '800', 'ui-monospace, monospace');
    ctx.lineWidth = 3.5 * S;
    ctx.strokeStyle = 'rgba(4, 8, 16, 0.88)';
    ctx.strokeText(subtitle, cx, H * 0.194);
    ctx.fillStyle = theme.primaryCss;
    ctx.fillText(subtitle, cx, H * 0.194);
  }

  // Compact Live Telemetry Strip (y = 63.8%H, safely above caption)
  if (metrics && metrics.length > 0) {
    const gap = 8 * S;
    const count = Math.min(3, metrics.length);
    const cardW = (safeW - gap * (count - 1)) / count;
    const cardH = 54 * S;
    const y0 = H * 0.625;
    for (let i = 0; i < count; i++) {
      const m = metrics[i];
      const x0 = safeL + i * (cardW + gap);
      const col = m.color || theme.primaryCss;
      ctx.fillStyle = 'rgba(8, 13, 24, 0.80)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      ctx.roundRect(x0, y0, cardW, cardH, 12 * S);
      ctx.fill();
      ctx.stroke();

      fitFont(ctx, m.label || '', 10.5 * S, cardW - 14 * S, '800', 'ui-monospace, monospace');
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(m.label || '', x0 + cardW * 0.5, y0 + 16 * S);

      fitFont(ctx, m.value || '', 18 * S, cardW - 14 * S, '900', 'ui-monospace, monospace');
      ctx.fillStyle = col;
      ctx.fillText(m.value || '', x0 + cardW * 0.5, y0 + 38 * S);
    }
  }

  // Bottom Safe-Zone Caption Pill (y = 71.5%H — exact Y-LABS OS v2.3 spec)
  if (caption) {
    fitFont(ctx, caption, 23 * S, safeW - 26 * S, '900');
    const cw = Math.min(safeW, ctx.measureText(caption).width + 34 * S);
    const ch = 44 * S;
    const cy = H * 0.715;
    ctx.fillStyle = 'rgba(6, 10, 18, 0.86)';
    ctx.strokeStyle = theme.primaryCss;
    ctx.lineWidth = 2.0 * S;
    ctx.beginPath();
    ctx.roundRect(cx - cw * 0.5, cy - ch * 0.5, cw, ch, 14 * S);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, cx, cy);
  }

  // Subtle top-of-safe-zone progress bar (y = 74.2%H)
  if (progress > 0) {
    const py = H * 0.742;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.fillRect(safeL, py, safeW, 3 * S);
    ctx.fillStyle = theme.primaryCss;
    ctx.fillRect(safeL, py, safeW * clamp(progress, 0, 1), 3 * S);
  }

  ctx.restore();
}
