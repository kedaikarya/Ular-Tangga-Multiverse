import React, { useEffect, useRef } from 'react';
import { RoomData } from '../types';
import { LADDERS, SNAKES, TILE_SIZE, BOARD_COLOR_THEMES, SNAKE_COLOR_PRESETS } from '../constants';

interface ThreeCanvasProps {
  room: RoomData | null;
  visualThemeMode: 'classic' | 'modern';
  boardElevationStyle: 'stepped' | 'terraced' | 'pyramid';
  boardColorTheme: 'rainbow' | 'wood' | 'grayscale' | 'bamboo' | 'marble';
  snakeStyleConfig: {
    colorPreset: string;
    customHex: string;
    patternPreset: string;
  };
  cameraPreset: 'isometric' | 'top' | 'follow';
  cameraTrigger?: number;
  focusPlayerId?: string;
}

export default function ThreeCanvas({
  room,
  visualThemeMode,
  boardElevationStyle,
  boardColorTheme,
  snakeStyleConfig,
  cameraPreset,
  cameraTrigger = 0,
  focusPlayerId
}: ThreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const basePlatformRef = useRef<any>(null);
  const boardGroupRef = useRef<any>(null);
  const connectorsGroupRef = useRef<any>(null);
  const pawnsGroupRef = useRef<any>(null);
  const tileHeightsRef = useRef<Record<number, number>>({});
  const pawnMeshesRef = useRef<Record<string, any>>({});
  const animatedLiftsRef = useRef<any[]>([]);
  const animatedTonguesRef = useRef<any[]>([]);
  const animFrameIdRef = useRef<number>(0);

  const getTileGridCoords = (tileNum: number) => {
    const idx = Math.max(0, Math.min(99, tileNum - 1));
    const row = Math.floor(idx / 10);
    const rawCol = idx % 10;
    const col = row % 2 === 0 ? rawCol : 9 - rawCol;
    const x = (col - 4.5) * TILE_SIZE;
    const z = (4.5 - row) * TILE_SIZE;
    return { x, z, row, col };
  };

  const computeTileHeight = (tileNum: number) => {
    if (tileNum === 100) return 4.55;
    const { row, col } = getTileGridCoords(tileNum);

    if (boardElevationStyle === 'terraced') {
      return 0.45 + row * 0.25 + (col % 2) * 0.08;
    }
    if (boardElevationStyle === 'pyramid') {
      const dist = Math.abs(col - 4.5);
      return 0.45 + row * 0.22 + (4.5 - dist) * 0.16;
    }

    const rowBase = 0.42 + row * 0.22;
    const patterns = [
      Math.sin(col * 0.7) * 0.16,
      (col % 2 === 0 ? 0.20 : 0.04),
      Math.cos((col - 4.5) * 0.55) * 0.24,
      (col < 5 ? col * 0.06 : (9 - col) * 0.06),
      Math.sin(col * 1.1) * 0.22,
      ((col % 3) * 0.11),
      Math.abs(col - 4.5) * 0.06,
      Math.cos(col * 0.9) * 0.20,
      (col % 2 === 1 ? 0.24 : 0.06),
      (col * 0.055)
    ];
    return Math.min(3.15, Math.max(0.35, rowBase + patterns[row % patterns.length]));
  };

  const createFloatingSignSprite = (text: string, bgColor: string, borderColor: string, textColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 20);
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '800 22px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 33);

    const tex = new (window as any).THREE.CanvasTexture(canvas);
    const mat = new (window as any).THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new (window as any).THREE.Sprite(mat);
    sprite.scale.set(1.85, 0.46, 1);
    return sprite;
  };

  const createTileTexture = (tileNum: number, row: number, col: number, tileStyle: any) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = tileStyle.bgHex;
    ctx.fillRect(0, 0, 256, 256);

    if (tileStyle.textureType === 'wood' || tileStyle.textureType === 'bamboo') {
      ctx.strokeStyle = tileStyle.grainHex || 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 3;
      for (let y = 14; y < 248; y += 16) {
        ctx.beginPath();
        ctx.moveTo(8, y);
        ctx.bezierCurveTo(
          84, y + Math.sin(y * 0.08 + col) * 7,
          172, y - Math.cos(y * 0.08 + row) * 7,
          248, y
        );
        ctx.stroke();
      }
    } else if (tileStyle.textureType === 'grayscale' || tileStyle.textureType === 'marble') {
      ctx.strokeStyle = tileStyle.grainHex || 'rgba(120,120,130,0.16)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(20, 40 + ((row * 19) % 40));
      ctx.quadraticCurveTo(128, 110, 236, 190 - ((col * 17) % 50));
      ctx.stroke();
    }

    ctx.strokeStyle = tileStyle.borderHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 242, 242);

    ctx.fillStyle = tileNum === 100 ? '#0f172a' : (tileStyle.textHex || '#f8fafc');
    ctx.font = '900 76px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tileNum), 128, 122);

    ctx.font = '800 24px Inter, sans-serif';
    if (tileNum === 1) {
      ctx.fillStyle = tileStyle.isLightTile ? '#b45309' : '#fde047';
      ctx.fillText('START', 128, 204);
    } else if (tileNum === 100) {
      ctx.fillStyle = '#78350f';
      ctx.fillText('👑 PUNCAK', 128, 204);
    } else if (LADDERS[tileNum]) {
      ctx.fillStyle = tileStyle.isLightTile ? '#047857' : '#6ee7b7';
      ctx.fillText(`↑ ${LADDERS[tileNum]}`, 128, 204);
    } else if (SNAKES[tileNum]) {
      ctx.fillStyle = tileStyle.isLightTile ? '#be123c' : '#fda4af';
      ctx.fillText(`↓ ${SNAKES[tileNum]}`, 128, 204);
    } else {
      ctx.fillStyle = tileStyle.subTextHex || 'rgba(255,255,255,0.45)';
      ctx.font = '700 18px Inter, sans-serif';
      ctx.fillText(`BARIS ${row + 1}`, 128, 208);
    }

    return new (window as any).THREE.CanvasTexture(canvas);
  };

  const resolveTileVisualStyle = (tileNum: number, row: number, col: number) => {
    if (tileNum === 100) {
      return {
        bgHex: '#facc15',
        borderHex: '#fef08a',
        sideHex: 0xd97706,
        textHex: '#0f172a',
        subTextHex: '#78350f',
        textureType: 'solid',
        isLightTile: true
      };
    }

    const isEven = (row + col) % 2 === 0;

    if (boardColorTheme === 'wood') {
      return isEven
        ? {
            bgHex: '#5d4037',
            borderHex: '#3e2723',
            sideHex: 0x3e2723,
            textHex: '#fef3c7',
            subTextHex: 'rgba(254,243,199,0.55)',
            grainHex: 'rgba(30,15,8,0.28)',
            textureType: 'wood',
            isLightTile: false
          }
        : {
            bgHex: '#d7a86e',
            borderHex: '#8d6e63',
            sideHex: 0x795548,
            textHex: '#27150c',
            subTextHex: 'rgba(39,21,12,0.6)',
            grainHex: 'rgba(120,72,32,0.22)',
            textureType: 'wood',
            isLightTile: true
          };
    }

    if (boardColorTheme === 'grayscale') {
      return isEven
        ? {
            bgHex: '#27272a',
            borderHex: '#52525b',
            sideHex: 0x18181b,
            textHex: '#fafafa',
            subTextHex: 'rgba(250,250,250,0.5)',
            grainHex: 'rgba(255,255,255,0.08)',
            textureType: 'grayscale',
            isLightTile: false
          }
        : {
            bgHex: '#d4d4d8',
            borderHex: '#71717a',
            sideHex: 0x52525b,
            textHex: '#09090b',
            subTextHex: 'rgba(9,9,11,0.55)',
            grainHex: 'rgba(24,24,27,0.12)',
            textureType: 'grayscale',
            isLightTile: true
          };
    }

    if (boardColorTheme === 'bamboo') {
      return isEven
        ? {
            bgHex: '#3f6212',
            borderHex: '#84cc16',
            sideHex: 0x1a2e05,
            textHex: '#f7fee7',
            subTextHex: 'rgba(247,254,231,0.55)',
            grainHex: 'rgba(20,40,5,0.24)',
            textureType: 'bamboo',
            isLightTile: false
          }
        : {
            bgHex: '#c69c4e',
            borderHex: '#854d0e',
            sideHex: 0x713f12,
            textHex: '#1c1917',
            subTextHex: 'rgba(28,25,23,0.6)',
            grainHex: 'rgba(113,63,18,0.22)',
            textureType: 'bamboo',
            isLightTile: true
          };
    }

    if (boardColorTheme === 'marble') {
      return isEven
        ? {
            bgHex: '#334155',
            borderHex: '#64748b',
            sideHex: 0x1e293b,
            textHex: '#f8fafc',
            subTextHex: 'rgba(248,250,252,0.5)',
            grainHex: 'rgba(148,163,184,0.18)',
            textureType: 'marble',
            isLightTile: false
          }
        : {
            bgHex: '#f1f5f9',
            borderHex: '#94a3b8',
            sideHex: 0x64748b,
            textHex: '#0f172a',
            subTextHex: 'rgba(15,23,42,0.55)',
            grainHex: 'rgba(100,116,139,0.22)',
            textureType: 'marble',
            isLightTile: true
          };
    }

    const rowThemes = [
      { a: '#1e3a8a', b: '#1d4ed8', side: 0x172554, border: '#60a5fa' },
      { a: '#065f46', b: '#047857', side: 0x064e3b, border: '#34d399' },
      { a: '#5b21b6', b: '#6d28d9', side: 0x3b0764, border: '#a78bfa' },
      { a: '#9a3412', b: '#c2410c', side: 0x431407, border: '#fb923c' },
      { a: '#155e75', b: '#0e7490', side: 0x083344, border: '#22d3ee' },
      { a: '#86198f', b: '#a21caf', side: 0x4a044e, border: '#e879f9' },
      { a: '#3f6212', b: '#4d7c0f', side: 0x1a2e05, border: '#a3e635' },
      { a: '#9f1239', b: '#be123c', side: 0x4c0519, border: '#fb7185' },
      { a: '#3730a3', b: '#4338ca', side: 0x1e1b4b, border: '#818cf8' },
      { a: '#0f766e', b: '#115e59', side: 0x042f2e, border: '#2dd4bf' }
    ];
    const theme = rowThemes[row % rowThemes.length];
    return {
      bgHex: isEven ? theme.a : theme.b,
      borderHex: theme.border,
      sideHex: theme.side,
      textHex: '#f8fafc',
      subTextHex: 'rgba(255,255,255,0.45)',
      textureType: 'solid',
      isLightTile: false
    };
  };

  const resolveActiveSnakePalette = () => {
    const presetKey = snakeStyleConfig.colorPreset || 'green';
    if (presetKey !== 'custom' && SNAKE_COLOR_PRESETS[presetKey]) {
      return SNAKE_COLOR_PRESETS[presetKey];
    }
    const hex = snakeStyleConfig.customHex || '#ffffff';
    const THREE = (window as any).THREE;
    const c = new THREE.Color(hex);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);

    const patternColor = new THREE.Color().setHSL(
      (hsl.h + 0.08) % 1,
      Math.min(1, hsl.s * 0.85),
      hsl.l > 0.65 ? Math.max(0.22, hsl.l - 0.38) : Math.min(0.92, hsl.l + 0.35)
    );
    const accentColor = new THREE.Color().setHSL(
      (hsl.h + 0.5) % 1,
      Math.min(1, Math.max(0.35, hsl.s)),
      hsl.l > 0.5 ? 0.35 : 0.72
    );
    const jawColor = c.clone().multiplyScalar(0.84);

    return {
      name: `Kustom (${hex.toUpperCase()})`,
      swatch: hex,
      baseHex: '#' + c.getHexString(),
      patternHex: '#' + patternColor.getHexString(),
      accentHex: '#' + accentColor.getHexString(),
      skullHex: c.getHex(),
      jawHex: jawColor.getHex(),
      eyeHex: hsl.l > 0.75 ? 0xf43f5e : 0xfacc15
    };
  };

  const createSnakeScaleTexture = () => {
    const THREE = (window as any).THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    const pal = resolveActiveSnakePalette();
    const pattern = snakeStyleConfig.patternPreset || 'diamond';

    if (pal.isRainbow) {
      const grad = ctx.createLinearGradient(0, 0, 128, 0);
      grad.addColorStop(0.0, '#ef4444');
      grad.addColorStop(0.25, '#facc15');
      grad.addColorStop(0.5, '#22c55e');
      grad.addColorStop(0.75, '#3b82f6');
      grad.addColorStop(1.0, '#a855f7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    } else {
      ctx.fillStyle = pal.baseHex;
      ctx.fillRect(0, 0, 128, 128);
    }

    if (pattern === 'stripes') {
      ctx.fillStyle = pal.patternHex;
      ctx.fillRect(16, 0, 34, 128);
      ctx.fillStyle = pal.accentHex;
      ctx.fillRect(50, 0, 12, 128);
      ctx.fillRect(4, 0, 12, 128);
    } else if (pattern === 'spots') {
      const spots = [
        { x: 34, y: 34, r: 22 },
        { x: 94, y: 94, r: 22 },
        { x: 94, y: 30, r: 15 },
        { x: 34, y: 98, r: 15 }
      ];
      spots.forEach(s => {
        ctx.fillStyle = pal.accentHex;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r + 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = pal.patternHex;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (pattern === 'zigzag') {
      ctx.strokeStyle = pal.accentHex;
      ctx.lineWidth = 22;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(0, 28);
      ctx.lineTo(32, 96);
      ctx.lineTo(64, 28);
      ctx.lineTo(96, 96);
      ctx.lineTo(128, 28);
      ctx.stroke();

      ctx.strokeStyle = pal.patternHex;
      ctx.lineWidth = 11;
      ctx.stroke();
    } else if (pattern === 'scales') {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const cx = col * 32 + (row % 2 === 0 ? 16 : 0);
          const cy = row * 32 + 16;
          ctx.fillStyle = pal.patternHex;
          ctx.beginPath();
          ctx.arc(cx, cy, 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = pal.accentHex;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    } else {
      ctx.fillStyle = pal.patternHex;
      ctx.beginPath();
      ctx.moveTo(64, 12);
      ctx.lineTo(108, 64);
      ctx.lineTo(64, 116);
      ctx.lineTo(20, 64);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = pal.accentHex;
      ctx.beginPath();
      ctx.moveTo(64, 30);
      ctx.lineTo(90, 64);
      ctx.lineTo(64, 98);
      ctx.lineTo(38, 64);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(14, 2);
    return tex;
  };

  const createLadder3D = (fromBotTile: number, toTopTile: number) => {
    const THREE = (window as any).THREE;
    const g = new THREE.Group();
    const cBot = getTileGridCoords(fromBotTile);
    const cTop = getTileGridCoords(toTopTile);
    const p1 = new THREE.Vector3(cBot.x, tileHeightsRef.current[fromBotTile] + 0.08, cBot.z);
    const p2 = new THREE.Vector3(cTop.x, tileHeightsRef.current[toTopTile] + 0.08, cTop.z);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const ladderUnit = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.3 });
    const rungMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });

    [-0.24, 0.24].forEach(rx => {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, len, 10), railMat);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(rx, 0.05, 0);
      ladderUnit.add(rail);
    });

    const rungCount = Math.max(4, Math.floor(len / 0.52));
    for (let i = 1; i < rungCount; i++) {
      const zOff = -len / 2 + (i / rungCount) * len;
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.48, 8), rungMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, 0.05, zOff);
      ladderUnit.add(rung);
    }

    ladderUnit.position.copy(mid);
    ladderUnit.lookAt(p2);
    g.add(ladderUnit);

    const badge = createFloatingSignSprite(`🪜 NAIK → ${toTopTile}`, 'rgba(6,78,59,0.9)', '#34d399', '#ecfdf5');
    badge.position.set(p1.x, p1.y + 0.72, p1.z);
    g.add(badge);

    return g;
  };

  const createSkyLift3D = (fromBotTile: number, toTopTile: number) => {
    const THREE = (window as any).THREE;
    const g = new THREE.Group();
    const cBot = getTileGridCoords(fromBotTile);
    const cTop = getTileGridCoords(toTopTile);
    const p1 = new THREE.Vector3(cBot.x, tileHeightsRef.current[fromBotTile] + 0.25, cBot.z);
    const p2 = new THREE.Vector3(cTop.x, tileHeightsRef.current[toTopTile] + 0.25, cTop.z);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const trackGroup = new THREE.Group();
    const railMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.2 });
    [-0.22, 0.22].forEach(rx => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, len), railMat);
      rail.position.set(rx, 0, 0);
      trackGroup.add(rail);
    });
    trackGroup.position.copy(mid);
    trackGroup.lookAt(p2);
    g.add(trackGroup);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.42, 0.54),
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.85, roughness: 0.15 })
    );
    cabin.position.copy(p1);
    g.add(cabin);

    animatedLiftsRef.current.push({
      cabin,
      p1,
      p2,
      phase: Math.random() * Math.PI * 2
    });

    const signStart = createFloatingSignSprite(`🛗 LIFT → ${toTopTile}`, 'rgba(12,74,110,0.92)', '#38bdf8', '#e0f2fe');
    signStart.position.set(p1.x, p1.y + 0.65, p1.z);
    g.add(signStart);

    return g;
  };

  const createSnake3D = (fromTopTile: number, toBottomTile: number) => {
    const THREE = (window as any).THREE;
    const g = new THREE.Group();
    const pal = resolveActiveSnakePalette();
    const cTop = getTileGridCoords(fromTopTile);
    const cBot = getTileGridCoords(toBottomTile);

    const topSurface = new THREE.Vector3(cTop.x, tileHeightsRef.current[fromTopTile], cTop.z);
    const botSurface = new THREE.Vector3(cBot.x, tileHeightsRef.current[toBottomTile], cBot.z);

    const horizVec = new THREE.Vector3(botSurface.x - topSurface.x, 0, botSurface.z - topSurface.z);
    const horizDist = Math.max(0.5, horizVec.length());
    const dirDown = horizVec.clone().normalize();
    const sideVec = new THREE.Vector3(-dirDown.z, 0, dirDown.x).normalize();

    const headPos = topSurface.clone()
      .add(new THREE.Vector3(0, 0.52, 0))
      .addScaledVector(dirDown, 0.34);

    const neckBackPos = topSurface.clone()
      .add(new THREE.Vector3(0, 0.56, 0))
      .addScaledVector(dirDown, -0.05);

    const neckCurvePos = topSurface.clone()
      .add(new THREE.Vector3(0, 0.24, 0))
      .addScaledVector(dirDown, -0.32)
      .addScaledVector(sideVec, 0.36);

    const bodyStartPos = topSurface.clone()
      .add(new THREE.Vector3(0, 0.14, 0))
      .addScaledVector(dirDown, 0.45)
      .addScaledVector(sideVec, 0.55);

    const tailPos = botSurface.clone().add(new THREE.Vector3(0, 0.08, 0));

    const curvePoints = [headPos, neckBackPos, neckCurvePos, bodyStartPos];
    const segments = 22;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const base = new THREE.Vector3().lerpVectors(bodyStartPos, tailPos, t);
      const envelope = Math.sin(t * Math.PI);
      const wave = Math.cos(t * Math.PI * 2.5) * 0.54 * envelope;
      base.addScaledVector(sideVec, wave);
      base.y += Math.sin(t * Math.PI) * 0.12;
      curvePoints.push(base);
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const radialSegs = 12;
    const tubularSegs = 56;
    const tubeGeo = new THREE.TubeGeometry(curve, tubularSegs, 0.21, radialSegs, false);

    const posAttr = tubeGeo.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i <= tubularSegs; i++) {
      const t = i / tubularSegs;
      const center = curve.getPointAt(t);
      const taper = t < 0.12
        ? 0.72 + (t / 0.12) * 0.28
        : Math.max(0.06, 1.0 - Math.pow((t - 0.12) / 0.88, 1.15) * 0.94);

      for (let j = 0; j <= radialSegs; j++) {
        const idx = i * (radialSegs + 1) + j;
        vertex.fromBufferAttribute(posAttr, idx);
        vertex.sub(center).multiplyScalar(taper).add(center);
        posAttr.setXYZ(idx, vertex.x, vertex.y, vertex.z);
      }
    }
    tubeGeo.computeVertexNormals();

    const snakeMat = new THREE.MeshStandardMaterial({
      map: createSnakeScaleTexture(),
      roughness: 0.42,
      metalness: 0.15
    });
    const bodyMesh = new THREE.Mesh(tubeGeo, snakeMat);
    bodyMesh.castShadow = true;
    g.add(bodyMesh);

    const headGroup = new THREE.Group();
    const skullGeo = new THREE.SphereGeometry(0.28, 14, 12);
    skullGeo.scale(1.08, 0.62, 1.50);
    const skullMat = new THREE.MeshStandardMaterial({ color: pal.skullHex, roughness: 0.35 });
    const skullMesh = new THREE.Mesh(skullGeo, skullMat);
    headGroup.add(skullMesh);

    const jawMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.08, 0.42),
      new THREE.MeshStandardMaterial({ color: pal.jawHex, roughness: 0.4 })
    );
    jawMesh.position.set(0, -0.08, 0.12);
    headGroup.add(jawMesh);

    const eyeMat = new THREE.MeshBasicMaterial({ color: pal.eyeHex });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
    [-0.17, 0.17].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), eyeMat);
      eye.position.set(ex, 0.09, 0.15);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.095, 0.03), pupilMat);
      pupil.position.set(ex * 1.05, 0.09, 0.20);
      headGroup.add(eye, pupil);
    });

    const tongueGroup = new THREE.Group();
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const tongueBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.30), tongueMat);
    tongueBase.position.set(0, -0.05, 0.46);
    const forkL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.13), tongueMat);
    forkL.position.set(-0.038, -0.05, 0.63);
    forkL.rotation.y = -0.35;
    const forkR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.015, 0.13), tongueMat);
    forkR.position.set(0.038, -0.05, 0.63);
    forkR.rotation.y = 0.35;
    tongueGroup.add(tongueBase, forkL, forkR);
    headGroup.add(tongueGroup);

    headGroup.position.copy(headPos);
    const lookTarget = headPos.clone()
      .addScaledVector(dirDown, Math.min(2.2, horizDist))
      .add(new THREE.Vector3(0, -0.58, 0));
    headGroup.lookAt(lookTarget);
    g.add(headGroup);

    animatedTonguesRef.current.push({
      tongue: tongueGroup,
      phase: Math.random() * Math.PI * 2
    });

    return g;
  };

  const createSlide3D = (fromTopTile: number, toBottomTile: number) => {
    const THREE = (window as any).THREE;
    const g = new THREE.Group();
    const cTop = getTileGridCoords(fromTopTile);
    const cBot = getTileGridCoords(toBottomTile);
    const p1 = new THREE.Vector3(cTop.x, tileHeightsRef.current[fromTopTile] + 0.12, cTop.z);
    const p2 = new THREE.Vector3(cBot.x, tileHeightsRef.current[toBottomTile] + 0.12, cBot.z);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

    const slideGroup = new THREE.Group();
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25, metalness: 0.2 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.3 });

    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, len), bedMat);
    slideGroup.add(bed);

    [-0.32, 0.32].forEach(rx => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, len), rimMat);
      rim.position.set(rx, 0.08, 0);
      slideGroup.add(rim);
    });

    slideGroup.position.copy(mid);
    slideGroup.lookAt(p2);
    g.add(slideGroup);
    return g;
  };

  const createCharacterPawn3D = (player: any) => {
    const THREE = (window as any).THREE;
    const group = new THREE.Group();
    const ringColor = new THREE.Color(player.color || '#6366f1');
    const av = player.avatar || '🦊';

    const baseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.14, 20),
      new THREE.MeshStandardMaterial({ color: ringColor, roughness: 0.3, metalness: 0.4 })
    );
    baseRing.position.y = 0.07;
    baseRing.castShadow = true;
    group.add(baseRing);

    const bodyGroup = new THREE.Group();
    bodyGroup.position.y = 0.14;

    if (av === '🚀') {
      const hull = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.26, 0.72, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.4 })
      );
      hull.position.y = 0.36;
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.28, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
      );
      nose.position.y = 0.85;
      bodyGroup.add(hull, nose);
      [0, 1, 2].forEach(k => {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.24, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xef4444 })
        );
        const ang = (k * Math.PI * 2) / 3;
        fin.position.set(Math.cos(ang) * 0.22, 0.16, Math.sin(ang) * 0.22);
        fin.rotation.y = -ang;
        bodyGroup.add(fin);
      });
    } else if (av === '🤖') {
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.42, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.25 })
      );
      torso.position.y = 0.24;
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.40, 0.32, 0.34),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.2 })
      );
      head.position.y = 0.64;
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.30, 0.10, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      visor.position.set(0, 0.66, 0.17);
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 })
      );
      ant.position.y = 0.88;
      bodyGroup.add(torso, head, visor, ant);
    } else {
      const paletteMap: Record<string, any> = {
        '🦊': { main: 0xf97316, accent: 0xffffff, ear: 'pointy' },
        '🐼': { main: 0xffffff, accent: 0x1e293b, ear: 'round' },
        '🦁': { main: 0xf59e0b, accent: 0x92400e, ear: 'mane' },
        '🐯': { main: 0xfb923c, accent: 0x1e293b, ear: 'round' },
        '🐸': { main: 0x22c55e, accent: 0xbef264, ear: 'frog' },
        '🐧': { main: 0x1e293b, accent: 0xf8fafc, ear: 'beak' },
        '🦄': { main: 0xf472b6, accent: 0xfacc15, ear: 'horn' },
        '🐨': { main: 0x94a3b8, accent: 0xe2e8f0, ear: 'round' },
        '🐙': { main: 0xa855f7, accent: 0xf0abfc, ear: 'tentacle' },
        '🦉': { main: 0x78350f, accent: 0xfde68a, ear: 'pointy' },
        '🎓': { main: 0x0284c7, accent: 0xfacc15, ear: 'cap' }
      };
      const style = paletteMap[av] || { main: 0x6366f1, accent: 0xffffff, ear: 'round' };

      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.20, 0.28, 0.44, 16),
        new THREE.MeshStandardMaterial({ color: style.main, roughness: 0.45 })
      );
      torso.position.y = 0.22;

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 14),
        new THREE.MeshStandardMaterial({ color: style.main, roughness: 0.4 })
      );
      head.position.y = 0.58;

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      [-0.08, 0.08].forEach(ex => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
        eye.position.set(ex, 0.61, 0.21);
        bodyGroup.add(eye);
      });

      if (style.ear === 'pointy') {
        [-0.13, 0.13].forEach(ex => {
          const ear = new THREE.Mesh(
            new THREE.ConeGeometry(0.07, 0.18, 10),
            new THREE.MeshStandardMaterial({ color: style.main })
          );
          ear.position.set(ex, 0.84, 0);
          bodyGroup.add(ear);
        });
      } else if (style.ear === 'round') {
        [-0.16, 0.16].forEach(ex => {
          const ear = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 10, 10),
            new THREE.MeshStandardMaterial({ color: style.accent })
          );
          ear.position.set(ex, 0.80, 0);
          bodyGroup.add(ear);
        });
      } else if (style.ear === 'mane') {
        const mane = new THREE.Mesh(
          new THREE.TorusGeometry(0.25, 0.08, 10, 20),
          new THREE.MeshStandardMaterial({ color: style.accent })
        );
        mane.position.set(0, 0.58, -0.03);
        bodyGroup.add(mane);
      } else if (style.ear === 'horn') {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.24, 10),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6 })
        );
        horn.position.set(0, 0.88, 0.04);
        bodyGroup.add(horn);
      } else if (style.ear === 'cap') {
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.05, 0.42),
          new THREE.MeshStandardMaterial({ color: 0x0f172a })
        );
        cap.position.set(0, 0.83, 0);
        bodyGroup.add(cap);
      }

      bodyGroup.add(torso, head);
    }

    group.add(bodyGroup);

    const label = createFloatingSignSprite(`${av} ${player.name}`, 'rgba(15,23,42,0.9)', player.color || '#818cf8', '#ffffff');
    label.position.set(0, 1.45, 0);
    group.add(label);

    return group;
  };

  const disposeGroupObjects = (group: any) => {
    if (!group) return;
    group.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: any) => {
          if (m.map) m.map.dispose();
          m.dispose?.();
        });
      }
    });
  };

  const applyResponsiveCameraPreset = (preset: 'isometric' | 'top' | 'follow') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const container = containerRef.current;
    if (!camera || !controls || !container) return;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(h, 1);
    const portraitScale = aspect < 1 ? Math.min(2.15, 1.05 / Math.max(aspect, 0.44)) : 1.0;

    if (preset === 'top') {
      camera.position.set(0, 27 * portraitScale, 0.1);
      controls.target.set(0, 0, 0);
    } else if (preset === 'follow') {
      const players = room ? Object.values(room.players || {}).filter(p => p.role !== 'teacher') : [];
      const me = focusPlayerId ? room?.players?.[focusPlayerId] : null;
      const leader = players.sort((a, b) => (b.position || 1) - (a.position || 1))[0];
      const targetPlayer = (me && me.role !== 'teacher' ? me : leader) || null;
      const tile = targetPlayer?.position || 1;
      const { x, z } = getTileGridCoords(tile);
      const th = tileHeightsRef.current[tile] || 1;
      camera.position.set(x + 7 * portraitScale, th + 9 * portraitScale, z + 9 * portraitScale);
      controls.target.set(x, th + 0.5, z);
    } else {
      camera.position.set(14 * portraitScale, 18.5 * portraitScale, 17 * portraitScale);
      controls.target.set(0, 1.2, 0);
    }
    controls.update();
  };

  useEffect(() => {
    const container = containerRef.current;
    const THREE = (window as any).THREE;
    if (!container || !THREE) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2') || probe.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.012);

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(h, 1);
    const portraitScale = aspect < 1 ? Math.min(2.15, 1.05 / Math.max(aspect, 0.44)) : 1.0;

    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    cameraRef.current = camera;
    camera.position.set(14 * portraitScale, 18.5 * portraitScale, 17 * portraitScale);

    const renderer = new THREE.WebGLRenderer({ antialias: !isSoftwareGl, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    let controls: any = null;
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controlsRef.current = controls;
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.07;
      controls.maxPolarAngle = Math.PI * 0.47;
      controls.minDistance = 6;
      controls.maxDistance = 85;
      controls.target.set(0, 1.2, 0);
      controls.update();
    }

    const ambientLight = new THREE.AmbientLight(0xc7d2fe, 0.78);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    dirLight.position.set(14, 26, 16);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x818cf8, 0.65, 50);
    rimLight.position.set(-14, 12, -14);
    scene.add(rimLight);

    const info = BOARD_COLOR_THEMES[boardColorTheme] || BOARD_COLOR_THEMES.rainbow;
    const basePlatformMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TILE_SIZE * 10.6, 0.4, TILE_SIZE * 10.6),
      new THREE.MeshStandardMaterial({ color: info.platformHex, roughness: 0.7, metalness: 0.3 })
    );
    basePlatformMesh.position.y = -0.2;
    basePlatformMesh.receiveShadow = true;
    basePlatformRef.current = basePlatformMesh;
    scene.add(basePlatformMesh);

    const pawnsGroup = new THREE.Group();
    pawnsGroupRef.current = pawnsGroup;
    scene.add(pawnsGroup);

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const t = performance.now() * 0.002;

      animatedLiftsRef.current.forEach(item => {
        const progress = (Math.sin(t + item.phase) + 1) * 0.5;
        item.cabin.position.lerpVectors(item.p1, item.p2, progress);
      });

      animatedTonguesRef.current.forEach(item => {
        const s = 0.85 + Math.sin(t * 4 + item.phase) * 0.25;
        item.tongue.scale.z = s;
      });

      if (controls) controls.update();
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!renderer || !camera || !container) return;
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      camera.aspect = nw / Math.max(nh, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => handleResize())
      : null;
    resizeObserver?.observe(container);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      disposeGroupObjects(boardGroupRef.current);
      disposeGroupObjects(connectorsGroupRef.current);
      disposeGroupObjects(pawnsGroupRef.current);
      renderer?.dispose();
    };
  }, []);

  // Rebuild board & connectors cleanly when visual settings change without recreating renderer
  useEffect(() => {
    const scene = sceneRef.current;
    const THREE = (window as any).THREE;
    if (!scene || !THREE) return;

    if (basePlatformRef.current?.material) {
      const info = BOARD_COLOR_THEMES[boardColorTheme] || BOARD_COLOR_THEMES.rainbow;
      basePlatformRef.current.material.color.setHex(info.platformHex);
    }

    if (boardGroupRef.current) {
      scene.remove(boardGroupRef.current);
      disposeGroupObjects(boardGroupRef.current);
    }
    if (connectorsGroupRef.current) {
      scene.remove(connectorsGroupRef.current);
      disposeGroupObjects(connectorsGroupRef.current);
    }

    const boardGroup = new THREE.Group();
    boardGroupRef.current = boardGroup;
    scene.add(boardGroup);

    const tileHeights: Record<number, number> = {};
    for (let tileNum = 1; tileNum <= 100; tileNum++) {
      const { x, z, row, col } = getTileGridCoords(tileNum);
      const th = computeTileHeight(tileNum);
      tileHeights[tileNum] = th;

      const isPeak100 = tileNum === 100;
      const tileStyle = resolveTileVisualStyle(tileNum, row, col);

      const topTex = createTileTexture(tileNum, row, col, tileStyle);
      const sideMat = new THREE.MeshStandardMaterial({ color: tileStyle.sideHex, roughness: 0.55, metalness: 0.2 });
      const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.35, metalness: isPeak100 ? 0.35 : 0.1 });

      const blockGeo = new THREE.BoxGeometry(TILE_SIZE * 0.94, th, TILE_SIZE * 0.94);
      const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
      const blockMesh = new THREE.Mesh(blockGeo, materials);
      blockMesh.position.set(x, th / 2, z);
      blockMesh.castShadow = true;
      blockMesh.receiveShadow = true;
      boardGroup.add(blockMesh);

      if (isPeak100) {
        const crownPedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.62, 0.78, 0.24, 24),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 })
        );
        crownPedestal.position.set(x, th + 0.12, z);
        boardGroup.add(crownPedestal);

        const crownSign = createFloatingSignSprite('👑 FINISH 100', 'rgba(120,53,15,0.95)', '#facc15', '#fef08a');
        crownSign.position.set(x, th + 1.05, z);
        boardGroup.add(crownSign);
      } else if (tileNum === 1) {
        const startSign = createFloatingSignSprite('🚀 START 1', 'rgba(6,78,59,0.92)', '#34d399', '#ecfdf5');
        startSign.position.set(x, th + 0.75, z);
        boardGroup.add(startSign);
      }
    }
    tileHeightsRef.current = tileHeights;

    const connectorsGroup = new THREE.Group();
    connectorsGroupRef.current = connectorsGroup;
    scene.add(connectorsGroup);
    animatedLiftsRef.current = [];
    animatedTonguesRef.current = [];

    Object.entries(LADDERS).forEach(([fromStr, toNum]) => {
      const fromNum = Number(fromStr);
      const obj = visualThemeMode === 'modern'
        ? createSkyLift3D(fromNum, toNum)
        : createLadder3D(fromNum, toNum);
      connectorsGroup.add(obj);
    });

    Object.entries(SNAKES).forEach(([fromStr, toNum]) => {
      const fromNum = Number(fromStr);
      const obj = visualThemeMode === 'modern'
        ? createSlide3D(fromNum, toNum)
        : createSnake3D(fromNum, toNum);
      connectorsGroup.add(obj);
    });
  }, [visualThemeMode, boardElevationStyle, boardColorTheme, snakeStyleConfig]);

  // Handle Camera Presets
  useEffect(() => {
    applyResponsiveCameraPreset(cameraPreset);
  }, [cameraPreset, cameraTrigger]);

  // Handle Pawns Sync
  useEffect(() => {
    if (!sceneRef.current || !pawnsGroupRef.current) return;
    const pawnsGroup = pawnsGroupRef.current;
    const THREE = (window as any).THREE;
    if (!THREE) return;

    const players = room ? Object.values(room.players || {}).filter(p => p.role !== 'teacher') : [];
    const activeIds = new Set(players.map(p => p.id));

    Object.keys(pawnMeshesRef.current).forEach(pid => {
      if (!activeIds.has(pid)) {
        const oldMesh = pawnMeshesRef.current[pid];
        pawnsGroup.remove(oldMesh);
        disposeGroupObjects(oldMesh);
        delete pawnMeshesRef.current[pid];
      }
    });

    const tileOccupants: Record<number, string[]> = {};
    players.forEach(p => {
      const pos = p.position || 1;
      if (!tileOccupants[pos]) tileOccupants[pos] = [];
      tileOccupants[pos].push(p.id);
    });

    players.forEach(p => {
      let mesh = pawnMeshesRef.current[p.id];
      if (!mesh || mesh.userData.avatar !== p.avatar || mesh.userData.name !== p.name) {
        if (mesh) pawnsGroup.remove(mesh);
        mesh = createCharacterPawn3D(p);
        mesh.userData = { avatar: p.avatar, name: p.name };
        pawnsGroup.add(mesh);
        pawnMeshesRef.current[p.id] = mesh;
      }

      const tileNum = p.position || 1;
      const peers = tileOccupants[tileNum] || [p.id];
      const slotIdx = peers.indexOf(p.id);
      const { x, z } = getTileGridCoords(tileNum);
      const h = tileHeightsRef.current[tileNum] || 0.4;

      let offsetX = 0;
      let offsetZ = 0;
      if (peers.length > 1) {
        const angle = (slotIdx / peers.length) * Math.PI * 2;
        offsetX = Math.cos(angle) * 0.36;
        offsetZ = Math.sin(angle) * 0.36;
      }

      mesh.position.set(x + offsetX, h, z + offsetZ);
    });
  }, [room, visualThemeMode, boardElevationStyle, boardColorTheme, snakeStyleConfig]);

  return <div id="canvas-container" ref={containerRef} className="fixed inset-0 w-screen h-[100dvh] z-10 touch-none"></div>;
}
