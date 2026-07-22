// ============================================================
// gwansang_photo.js — 사진 기반 관상 측정 v2 (기기 내 처리, 저장·전송 없음)
//
// 정확도 3단 파이프라인:
//  1) 다중 스케일 검출 → 얼굴 영역을 크게 잘라 확대 후 랜드마크 재검출(줌 정밀화)
//  2) 좌우반전 검출 평균(TTA) — 모델의 좌우 편향 상쇄
//  3) 화소 분석 보정 — 눈썹 점은 실제 눈썹(어두운 털)의 무게중심으로 스냅,
//     이마는 피부색을 위로 추적해 헤어라인을 직접 찾는다 (검출상자 추정 폐기)
// 잴 수 없는 것(찰색·기세·법령)은 잴 수 없다고 정직하게 말한다.
// ============================================================
"use strict";

// 68 랜드마크 좌우반전 대응표 (거울상에서 i번 점 ↔ 원본 FLIP68[i]번 점)
const FLIP68 = [
  16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
  27, 28, 29, 30,
  35, 34, 33, 32, 31,
  45, 44, 43, 42, 47, 46,
  39, 38, 37, 36, 41, 40,
  54, 53, 52, 51, 50, 49, 48,
  59, 58, 57, 56, 55,
  64, 63, 62, 61, 60,
  67, 66, 65,
];

const GWP = {
  ready: false,
  async init() {
    if (this.ready) return;
    await faceapi.nets.tinyFaceDetector.loadFromUri("models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("models");
    this.ready = true;
  },

  dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); },
  mean(pts) {
    const n = pts.length;
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n };
  },

  /** 여러 해상도·문턱값으로 검출 시도 — 작은 얼굴·어두운 사진 대응 */
  async detectAny(cv, sizes) {
    for (const [sz, th] of sizes) {
      try {
        const det = await faceapi
          .detectSingleFace(cv, new faceapi.TinyFaceDetectorOptions({ inputSize: sz, scoreThreshold: th }))
          .withFaceLandmarks();
        if (det) return det;
      } catch (e) { /* 다음 스케일 시도 */ }
    }
    return null;
  },

  /** 얼굴 영역을 이마 여유 포함해 크게 잘라 확대 → 랜드마크 재검출 + 반전 평균 */
  async refine(canvas, det) {
    const box = det.detection.box;
    const mX = box.width * 0.35, mTop = box.height * 0.8, mBot = box.height * 0.3;
    const sx = Math.max(0, box.x - mX), sy = Math.max(0, box.y - mTop);
    const sw = Math.min(canvas.width - sx, box.width + 2 * mX);
    const sh = Math.min(canvas.height - sy, box.height + mTop + mBot);
    const scale = Math.min(3, Math.max(1, 720 / sw));
    const oc = document.createElement("canvas");
    oc.width = Math.round(sw * scale); oc.height = Math.round(sh * scale);
    oc.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, oc.width, oc.height);

    const d2 = await this.detectAny(oc, [[512, 0.35], [416, 0.3], [320, 0.25]]);
    if (!d2) return null;
    let pts = d2.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));

    // 좌우반전 검출 평균 — 두 번의 독립 추정을 평균해 점 위치의 잡음을 줄인다
    try {
      const fc = document.createElement("canvas");
      fc.width = oc.width; fc.height = oc.height;
      const fx = fc.getContext("2d");
      fx.translate(fc.width, 0); fx.scale(-1, 1); fx.drawImage(oc, 0, 0);
      const d3 = await this.detectAny(fc, [[512, 0.35], [416, 0.3]]);
      if (d3) {
        const q = d3.landmarks.positions;
        pts = pts.map((p, i) => {
          const m = q[FLIP68[i]];
          return { x: (p.x + (fc.width - m.x)) / 2, y: (p.y + m.y) / 2 };
        });
      }
    } catch (e) { /* 반전 실패 시 단독 추정 사용 */ }

    const b2 = d2.detection.box;
    return {
      pts: pts.map((p) => ({ x: sx + p.x / scale, y: sy + p.y / scale })),
      box: { x: sx + b2.x / scale, y: sy + b2.y / scale, width: b2.width / scale, height: b2.height / scale },
    };
  },

  /** 사각 영역 평균 RGB */
  patch(ctx, x, y, w, h) {
    x = Math.round(Math.max(0, x)); y = Math.round(Math.max(0, y));
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    try {
      const im = ctx.getImageData(x, y, w, h).data;
      let r = 0, g = 0, b = 0, n = im.length / 4;
      for (let i = 0; i < im.length; i += 4) { r += im[i]; g += im[i + 1]; b += im[i + 2]; }
      return { r: r / n, g: g / n, b: b / n, lum: (0.299 * r + 0.587 * g + 0.114 * b) / n };
    } catch (e) { return null; }
  },

  /** 세로 띠(폭 2px)에서 최소 밝기 — 눈썹 털이 지나가면 어두워진다 */
  stripMin(ctx, x, yTop, h) {
    const p = ctx.getImageData(Math.max(0, Math.round(x)), Math.max(0, Math.round(yTop)), 2, Math.max(2, Math.round(h))).data;
    let mn = 255;
    for (let i = 0; i < p.length; i += 4) {
      const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      if (l < mn) mn = l;
    }
    return mn;
  },

  /**
   * 눈썹 점 보정 (2단계):
   *  ① 몸통 점(17~20, 23~26)은 세로 방향으로만 어두운 띠 중심에 스냅 (가로 이동 금지 — 편향 방지)
   *  ② 안쪽 끝점(21, 22)은 눈썹 몸통에서 미간 쪽으로 "어두운 띠를 따라 걷다가 띠가 끊기는 지점"으로 확정
   *     — 무게중심 방식은 점을 몸통 쪽으로 끌어당겨 미간이 넓게 재지는 편향이 있어 폐기
   */
  snapBrows(ctx, P, eyeW, midX) {
    const snapped = {};
    const wy = Math.max(4, eyeW * 0.26);
    // ① 세로 스냅
    for (const i of [17, 18, 19, 20, 23, 24, 25, 26]) {
      const p = P[i];
      let im;
      const H = Math.round(wy * 2);
      try { im = ctx.getImageData(Math.round(p.x - 1), Math.round(p.y - wy), 3, H).data; } catch (e) { continue; }
      const rows = H, lums = new Float32Array(rows);
      for (let r = 0; r < rows; r++) {
        let s = 0;
        for (let c = 0; c < 3; c++) {
          const k = (r * 3 + c) * 4;
          s += 0.299 * im[k] + 0.587 * im[k + 1] + 0.114 * im[k + 2];
        }
        lums[r] = s / 3;
      }
      const sorted = Array.from(lums).sort((a, b) => a - b);
      const darkTh = sorted[Math.floor(rows * 0.25)], bright = sorted[Math.floor(rows * 0.85)];
      if (bright - darkTh < 14) continue;
      let cy = 0, cn = 0;
      for (let r = 0; r < rows; r++) if (lums[r] <= darkTh) { cy += r; cn++; }
      if (cn < 2) continue;
      P[i] = { x: p.x, y: Math.round(p.y - wy) + cy / cn };
      snapped[i] = true;
    }
    // ② 안쪽 끝점: 몸통→미간 방향 띠 추적
    for (const [endI, fromI] of [[21, 20], [22, 23]]) {
      const from = P[fromI], end = P[endI];
      let dx = end.x - from.x, dy = end.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const h = Math.max(6, eyeW * 0.5);
      let body, skin;
      try {
        body = this.stripMin(ctx, from.x, from.y - h / 2, h); // 눈썹 몸통의 어두움
        const sp = this.patch(ctx, from.x - 3, from.y - h * 1.1, 6, 4); // 그 위 이마 피부
        skin = sp ? sp.lum : null;
      } catch (e) { continue; }
      if (skin == null || skin - body < 18) continue; // 대비 부족 → 원점 유지
      const darkTh = body + (skin - body) * 0.45;
      let lastDark = 0, miss = 0;
      const maxT = eyeW * 1.1;
      for (let t = 0; t <= maxT; t += 2) {
        const x = from.x + dx * t, y = from.y + dy * t;
        // 미간 중앙선은 넘지 않는다
        if ((endI === 21 && x >= midX - 2) || (endI === 22 && x <= midX + 2)) break;
        let mn;
        try { mn = this.stripMin(ctx, x, y - h / 2, h); } catch (e) { break; }
        if (mn <= darkTh) { lastDark = t; miss = 0; }
        else { miss++; if (miss >= 3) break; } // 연속 6px 밝음 → 눈썹 끝
      }
      if (lastDark > 0) {
        P[endI] = { x: from.x + dx * lastDark, y: from.y + dy * lastDark };
        snapped[endI] = true;
      }
    }
    return snapped;
  },

  /** 피부색을 위로 추적해 헤어라인을 찾는다. {y, cols, reachedTop} */
  findHairline(ctx, P, browTopY, eyeW, canvas) {
    // 기준 피부색: 콧대 + 양 볼 (거의 항상 맨살인 자리)
    const refs = [
      this.patch(ctx, P[28].x - 3, P[28].y - 3, 6, 6),
      this.patch(ctx, (P[36].x + P[48].x) / 2 - 4, (P[36].y + P[48].y) / 2 - 4, 8, 8),
      this.patch(ctx, (P[45].x + P[54].x) / 2 - 4, (P[45].y + P[54].y) / 2 - 4, 8, 8),
    ].filter(Boolean);
    if (!refs.length) return { y: null, cols: 0, reachedTop: false };
    const skin = {
      r: refs.reduce((s, p) => s + p.r, 0) / refs.length,
      g: refs.reduce((s, p) => s + p.g, 0) / refs.length,
      b: refs.reduce((s, p) => s + p.b, 0) / refs.length,
    };
    const skinSum = skin.r + skin.g + skin.b + 1;
    const colsX = [P[19].x, (P[21].x + P[22].x) / 2, P[24].x];
    const found = [];
    let reachedTop = false;
    for (const cx of colsX) {
      let streak = 0, boundary = null;
      const y0 = browTopY - Math.max(4, eyeW * 0.25);
      for (let y = y0; y >= 2; y -= 2) {
        const p = this.patch(ctx, cx - 3, y - 1, 6, 3);
        if (!p) break;
        const dcol = (Math.abs(p.r - skin.r) + Math.abs(p.g - skin.g) + Math.abs(p.b - skin.b)) / skinSum;
        if (dcol > 0.30) {
          streak++;
          if (streak >= 4) { boundary = y + 2 * streak; break; } // 연속 4표본(≈8px) 이탈 → 경계 확정
        } else streak = 0;
        if (y <= 4) reachedTop = true;
      }
      if (boundary != null) found.push(boundary);
    }
    if (found.length >= 2) {
      found.sort((a, b) => a - b);
      return { y: found[Math.floor(found.length / 2)], cols: found.length, reachedTop: false };
    }
    return { y: null, cols: found.length, reachedTop };
  },

  /** canvas: 원본 이미지가 그려진 캔버스. 반환: {ok, findings[], summary, unmeasured[], hairline, browSnapped} */
  async analyze(canvas) {
    await this.init();
    // 1차: 다중 스케일 검출
    const det = await this.detectAny(canvas, [[512, 0.4], [416, 0.3], [608, 0.3], [320, 0.25]]);
    if (!det) return { ok: false, reason: "얼굴을 찾지 못했습니다. 정면·밝은 조명·이마가 보이는 사진으로 다시 시도해 주세요." };

    // 2차: 줌 정밀화 + 반전 평균
    let P = det.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
    let box = det.detection.box;
    const fine = await this.refine(canvas, det);
    if (fine) { P = fine.pts; box = fine.box; }

    const d = this.dist.bind(this);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const faceW = d(P[0], P[16]);
    const eyeWL = d(P[36], P[39]), eyeWR = d(P[42], P[45]);
    const eyeW = (eyeWL + eyeWR) / 2;
    const midX = (P[27].x + P[8].x) / 2;

    // 3차: 눈썹 점 화소 스냅 (미간 측정 정확도의 핵심)
    let browSnapped = {};
    try { browSnapped = this.snapBrows(ctx, P, eyeW, midX); } catch (e) {}

    // ── 기준 측정값 (보정된 점 기준) ──
    const innerEyeGap = d(P[39], P[42]);
    const browGap = d(P[21], P[22]);
    const eyeCL = this.mean(P.slice(36, 42)), eyeCR = this.mean(P.slice(42, 48));
    const pupilDist = d(eyeCL, eyeCR);
    const mouthW = d(P[48], P[54]);
    const browTopY = Math.min(P[19].y, P[24].y);
    const browEyeGapL = this.mean([P[37], P[38]]).y - this.mean([P[19], P[20]]).y;
    const browEyeGapR = this.mean([P[43], P[44]]).y - this.mean([P[23], P[24]]).y;
    const browEyeGap = (browEyeGapL + browEyeGapR) / 2;
    const noseW = d(P[31], P[35]);
    const noseBase = P[33], chin = P[8];
    const upperLipTop = P[51], upperLipBot = P[62], lowerLipTop = P[66], lowerLipBot = P[57];
    const philtrum = d(noseBase, upperLipTop);
    const lowerFace = d(noseBase, chin);
    const upperLip = Math.abs(upperLipBot.y - upperLipTop.y);
    const lowerLip = Math.abs(lowerLipBot.y - lowerLipTop.y);
    const cheekW = d(P[1], P[15]);
    const jawW = d(P[4], P[12]);
    const chinW = d(P[6], P[10]);
    const jung = noseBase.y - browTopY;
    const ha = chin.y - noseBase.y;

    // ── 이마: 헤어라인을 화소 분석으로 직접 찾는다 ──
    let hair = { y: null, cols: 0, reachedTop: false };
    try { hair = this.findHairline(ctx, P, browTopY, eyeW, canvas); } catch (e) {}
    let sang, sangSource, cropped = false;
    if (hair.y != null) {
      sang = Math.max(1, browTopY - hair.y);
      sangSource = "hairline";
    } else if (hair.reachedTop) {
      sang = Math.max(1, browTopY - box.y);
      sangSource = "cropped";
      cropped = true; // 사진 위 끝까지 피부가 이어짐 = 이마가 실제로 잘림
    } else {
      sang = Math.max(1, browTopY - box.y);
      sangSource = "box"; // 헤어라인을 못 찾았지만 잘린 것도 아님(모자·강한 역광 등) — 추정치로 안내
    }
    const tot = sang + jung + ha;
    const ratio = [sang, jung, ha].map((v) => (v / (tot / 3)));

    // 좌우 대칭 (촬영 각도 영향이 크므로 관대하게)
    const pairs = [[0, 16], [2, 14], [4, 12], [36, 45], [39, 42], [31, 35], [48, 54], [17, 26], [21, 22]];
    let asym = 0;
    for (const [l, r] of pairs)
      asym += Math.abs(Math.abs(P[l].x - midX) - Math.abs(P[r].x - midX));
    asym = asym / pairs.length / faceW;

    // 눈썹 짙기 — 화소 대비 측정
    let browContrast = null;
    try {
      const lum = (x, y) => {
        const s = Math.max(2, Math.round(eyeW * 0.06));
        const p = this.patch(ctx, x - s / 2, y - s / 2, s, s);
        return p ? p.lum : null;
      };
      const vals = [lum(P[18].x, P[18].y), lum(P[19].x, P[19].y), lum(P[24].x, P[24].y), lum(P[25].x, P[25].y)].filter((v) => v != null);
      const browL = vals.reduce((s, v) => s + v, 0) / vals.length;
      const skinY = browTopY - Math.max(6, jung * 0.35);
      const s1 = lum(P[19].x, skinY), s2 = lum(P[24].x, skinY);
      const skin = ((s1 || 0) + (s2 || 0)) / ((s1 ? 1 : 0) + (s2 ? 1 : 0) || 1);
      if (skin > 30) browContrast = (skin - browL) / skin;
    } catch (e) { /* 픽셀 접근 실패 시 생략 */ }

    // ── 판독 조립: {part, level, basis} → DB 해설 매칭 ──
    const F = [];
    const fmt = (x) => (Math.round(x * 100) / 100).toFixed(2);

    // 이마
    const foreheadRatio = sang / tot;
    if (!cropped) {
      F.push({
        id: "ima", level: foreheadRatio > 0.37 ? "넓음" : foreheadRatio < 0.29 ? "좁음" : "보통",
        basis: sangSource === "hairline"
          ? `헤어라인을 사진에서 직접 찾아 측정 — 상정(이마)이 얼굴 세로의 ${Math.round(foreheadRatio * 100)}%.`
          : `상정(이마 추정 구간)이 얼굴 세로의 ${Math.round(foreheadRatio * 100)}%. 헤어라인이 또렷하지 않아(모자·역광 등) 추정치입니다.`,
      });
    }
    // 미간 (명궁) — 화소 스냅된 눈썹 끝점 기준
    const browGapR2 = browGap / eyeW;
    F.push({
      id: "myeonggung", level: browGapR2 > 1.35 ? "매우 넓음" : browGapR2 < 0.85 ? "좁음" : "적당",
      basis: `눈썹 사이 거리가 눈 너비의 ${fmt(browGapR2)}배 (적당 범위 약 0.85~1.35배)${browSnapped[21] && browSnapped[22] ? " · 눈썹 끝점은 화소 분석으로 보정" : ""}.`,
    });
    // 눈썹 (짙기)
    if (browContrast != null) {
      F.push({
        id: "nunsseop", level: browContrast > 0.34 ? "짙고 농밀" : browContrast < 0.14 ? "흐릿함" : "보통",
        basis: `눈썹 부위와 이마 피부의 명암 대비 ${Math.round(browContrast * 100)}% (짙음 기준 34% 이상).`,
      });
    }
    // 전택궁 (눈썹~눈 사이)
    const jt = browEyeGap / eyeW;
    F.push({
      id: "jeontaek", level: jt > 0.62 ? "넓음" : jt < 0.34 ? "좁음" : "보통",
      basis: `눈썹과 눈 사이 간격이 눈 너비의 ${fmt(jt)}배 (표준 약 0.34~0.62배).`,
    });
    // 눈 사이
    const eyeGapR = innerEyeGap / eyeW;
    F.push({
      id: "nun", level: eyeGapR > 1.28 ? "양 눈 사이가 넓음" : "보통",
      basis: `두 눈 안쪽 거리 = 눈 너비의 ${fmt(eyeGapR)}배 (관상에서는 눈 하나 폭 정도를 표준으로 봅니다).`,
    });
    // 광대
    const gw = cheekW / jawW;
    F.push({
      id: "gwangdae", level: gw > 1.22 ? "발달" : gw < 1.06 ? "밋밋" : "보통",
      basis: `광대 폭이 턱선 폭의 ${fmt(gw)}배.`,
    });
    // 코 (재백궁)
    const nw = noseW / innerEyeGap;
    F.push({
      id: "ko", level: nw >= 1.05 ? "준두 살집 있고 콧방울 뚜렷" : "보통",
      basis: `콧방울 폭이 두 눈 사이 거리의 ${fmt(nw)}배 (1배 이상이면 재백궁이 넉넉한 형으로 봅니다).`,
    });
    // 입 (야망)
    const mw = mouthW / pupilDist;
    F.push({
      id: "ip", level: mw > 1.0 ? "큼" : mw < 0.82 ? "작음" : "보통",
      basis: `입 너비가 눈동자 간격의 ${fmt(mw)}배 — "양 눈동자 수직선보다 크면 큰 입"이라는 고전 측정법 그대로입니다.`,
      extra: Math.abs(upperLip - lowerLip) / Math.max(upperLip, lowerLip) < 0.25
        ? "윗입술과 아랫입술 두께가 비슷합니다 — 전통적으로 가장 좋게 보는 형태입니다."
        : (lowerLip > upperLip ? "아랫입술이 더 두꺼운 편 — 받는 사랑에 대한 마음이 큰 형으로 봅니다."
          : "윗입술이 더 두꺼운 편 — 주는 사랑의 성향으로 봅니다."),
    });
    // 인중
    const pj = philtrum / lowerFace;
    F.push({
      id: "injung", level: pj > 0.33 ? "긺" : pj < 0.2 ? "짧음" : "적정",
      basis: `인중 길이가 코끝~턱 구간의 ${Math.round(pj * 100)}% (적정 약 20~33%).`,
    });
    // 턱
    const cw = chinW / faceW;
    F.push({
      id: "teok", level: cw < 0.17 ? "뾰족·역삼각형" : "단단하고 적당함",
      basis: `턱 끝 폭이 얼굴 폭의 ${Math.round(cw * 100)}% (17% 미만이면 갸름한 형).`,
    });

    // DB 매칭
    const DBP = INTERP_DB.gwansang.parts;
    const findings = F.map((f) => {
      const part = DBP.find((p) => p.id === f.id);
      const opt = part ? part.options.find((o) => o.level === f.level) : null;
      return {
        name: part ? part.name : f.id,
        palace: part && part.palace !== "-" ? part.palace : null,
        domain: part && part.domain !== "-" ? part.domain : null,
        level: f.level,
        desc: opt ? opt.desc : "균형 잡힌 형태입니다.",
        basis: f.basis, extra: f.extra || null,
      };
    });

    const symText = asym < 0.03 ? "좌우가 매우 고르게 균형 잡혀 있습니다."
      : asym < 0.06 ? "좌우 균형이 자연스러운 범위입니다. (대부분의 얼굴이 이 범위입니다)"
        : "좌우에 개성이 있습니다. 촬영 각도의 영향일 가능성이 크니 정면 사진으로 다시 재 보세요.";

    return {
      ok: true,
      box, landmarks: P,
      hairline: hair.y != null ? { y: hair.y, x1: P[17].x, x2: P[26].x } : null,
      browSnapped,
      summary: {
        samjeong: ratio.map((v) => fmt(v)).join(" : "),
        samjeongText: cropped
          ? "사진 상단이 이마 위에서 잘려 있어 삼정(초·중·말년 구간) 비율은 이번에 정확히 잴 수 없었습니다. 이마와 머리 위 여백이 함께 나온 사진이면 정확해집니다."
          : (Math.max(...ratio) - Math.min(...ratio) < 0.25
            ? "상·중·하정이 1:1:1에 가까운 고른 비율입니다. 초년·중년·말년의 기운이 고르게 흐르는 형으로 봅니다."
            : `상·중·하정 비율이 ${ratio.map((v) => fmt(v)).join(" : ")} — ${["초년(이마)", "중년(눈썹~코)", "말년(코~턱)"][ratio.indexOf(Math.max(...ratio))]} 구간이 상대적으로 발달한 형입니다. 그 시기의 기운을 잘 쓰는 얼굴로 읽습니다.`)
          + (sangSource === "hairline" ? " (이마 높이는 헤어라인을 화소 분석으로 직접 찾아 쟀습니다)" : ""),
        symmetry: symText, asym: fmt(asym),
      },
      findings,
      unmeasured: ["찰색(피부빛)과 기세·품격 — 관상의 가장 근본 기준이지만 조명에 좌우되어 사진만으로 판단하지 않습니다",
        "법령(팔자주름)·귀 — 각도에 따라 왜곡이 커서 사진만으로 단정하지 않습니다"],
    };
  },
};
