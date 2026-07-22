// ============================================================
// gwansang_photo.js — 사진 기반 관상 측정 (기기 내 처리, 저장·전송 없음)
//
// face-api.js(내장 모델)로 얼굴 68개 지점을 찾아 기하 비율을 측정하고,
// interpretation_db.js 의 12부위 해설에 연결한다. 모든 판독에는
// "무엇을 어떻게 쟀는지" 근거를 함께 보여주며, 결론은 항상 보완 방향과
// 희망의 언어로 맺는다. 찰색·기세·법령 등 사진으로 잴 수 없는 것은
// 잴 수 없다고 정직하게 말하고 셀프 체크로 안내한다.
// ============================================================
"use strict";

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

  /** canvas: 원본 이미지가 그려진 캔버스. 반환: {ok, findings[], summary, unmeasured[]} */
  async analyze(canvas) {
    await this.init();
    const det = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 }))
      .withFaceLandmarks();
    if (!det) return { ok: false, reason: "얼굴을 찾지 못했습니다. 정면·밝은 조명·이마가 보이는 사진으로 다시 시도해 주세요." };

    const P = det.landmarks.positions;
    const box = det.detection.box;
    const d = this.dist.bind(this);
    const faceW = d(P[0], P[16]);

    // ── 기준 측정값 ──
    const eyeWL = d(P[36], P[39]), eyeWR = d(P[42], P[45]);
    const eyeW = (eyeWL + eyeWR) / 2;
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

    // 삼정 (상정은 검출 상자 상단 = 헤어라인 추정치)
    const sang = Math.max(1, browTopY - box.y);
    const jung = noseBase.y - browTopY;
    const ha = chin.y - noseBase.y;
    const tot = sang + jung + ha;
    const ratio = [sang, jung, ha].map((v) => (v / (tot / 3)));

    // 좌우 대칭 (촬영 각도 영향이 크므로 관대하게)
    const midX = (P[27].x + P[8].x) / 2;
    const pairs = [[0, 16], [2, 14], [4, 12], [36, 45], [39, 42], [31, 35], [48, 54], [17, 26], [21, 22]];
    let asym = 0;
    for (const [l, r] of pairs)
      asym += Math.abs(Math.abs(P[l].x - midX) - Math.abs(P[r].x - midX));
    asym = asym / pairs.length / faceW;

    // 눈썹 짙기 — 화소 대비 측정
    let browContrast = null;
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const lum = (x, y) => {
        const s = Math.max(2, Math.round(eyeW * 0.06));
        const im = ctx.getImageData(Math.round(x - s / 2), Math.round(y - s / 2), s, s).data;
        let t = 0;
        for (let i = 0; i < im.length; i += 4) t += 0.299 * im[i] + 0.587 * im[i + 1] + 0.114 * im[i + 2];
        return t / (im.length / 4);
      };
      const browL = (lum(P[18].x, P[18].y) + lum(P[19].x, P[19].y) + lum(P[24].x, P[24].y) + lum(P[25].x, P[25].y)) / 4;
      const skinY = browTopY - Math.max(6, jung * 0.35);
      const skin = (lum(P[19].x, skinY) + lum(P[24].x, skinY)) / 2;
      if (skin > 30) browContrast = (skin - browL) / skin;
    } catch (e) { /* 픽셀 접근 실패 시 생략 */ }

    // ── 판독 조립: {part, level, basis} → DB 해설 매칭 ──
    const F = [];
    const fmt = (x) => (Math.round(x * 100) / 100).toFixed(2);

    // 이마 (추정) — 상정이 극단적으로 짧으면 사진 상단이 잘렸을 가능성이 큼
    const foreheadRatio = sang / tot;
    const cropped = foreheadRatio < 0.2 || box.y < canvas.height * 0.02;
    if (!cropped) {
      F.push({
        id: "ima", level: foreheadRatio > 0.37 ? "넓음" : foreheadRatio < 0.29 ? "좁음" : "보통",
        basis: `삼정 중 상정(이마 추정 구간)이 얼굴 세로의 ${Math.round(foreheadRatio * 100)}%. 헤어라인은 추정치입니다.`,
      });
    }
    // 미간 (명궁)
    const browGapR2 = browGap / eyeW;
    F.push({
      id: "myeonggung", level: browGapR2 > 1.35 ? "매우 넓음" : browGapR2 < 0.85 ? "좁음" : "적당",
      basis: `눈썹 사이 거리가 눈 너비의 ${fmt(browGapR2)}배 (적당 범위 약 0.85~1.35배).`,
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
    // 코 (재백궁) — 콧방울 폭 기준 (콧구멍 노출은 사진으로 단정하지 않음)
    const nw = noseW / innerEyeGap;
    F.push({
      id: "ko", level: nw >= 1.05 ? "준두 살집 있고 콧방울 뚜렷" : "보통",
      basis: `콧방울 폭이 두 눈 사이 거리의 ${fmt(nw)}배 (1배 이상이면 재백궁이 넉넉한 형으로 봅니다).`,
    });
    // 입 (야망) — DB의 측정법 그대로: 눈동자 수직선 기준
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
      summary: {
        samjeong: ratio.map((v) => fmt(v)).join(" : "),
        samjeongText: cropped
          ? "사진 상단이 이마 위에서 잘려 있어 삼정(초·중·말년 구간) 비율은 이번에 정확히 잴 수 없었습니다. 이마와 머리 위 여백이 함께 나온 사진이면 정확해집니다."
          : (Math.max(...ratio) - Math.min(...ratio) < 0.25
            ? "상·중·하정이 1:1:1에 가까운 고른 비율입니다. 초년·중년·말년의 기운이 고르게 흐르는 형으로 봅니다."
            : `상·중·하정 비율이 ${ratio.map((v) => fmt(v)).join(" : ")} — ${["초년(이마)", "중년(눈썹~코)", "말년(코~턱)"][ratio.indexOf(Math.max(...ratio))]} 구간이 상대적으로 발달한 형입니다. 그 시기의 기운을 잘 쓰는 얼굴로 읽습니다.`),
        symmetry: symText, asym: fmt(asym),
      },
      findings,
      unmeasured: ["찰색(피부빛)과 기세·품격 — 관상의 가장 근본 기준이지만 조명에 좌우되어 사진만으로 판단하지 않습니다",
        "법령(팔자주름)·귀 — 각도에 따라 왜곡이 커서 셀프 체크로 확인하는 편이 정확합니다"],
    };
  },
};
