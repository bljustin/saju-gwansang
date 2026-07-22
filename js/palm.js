// ============================================================
// palm.js — 손금 자동 분석 (기기 내 처리, 저장·전송 없음)
//
// 파이프라인:
//  1) 피부색 행 스캔 → 손바닥 기하(손가락 길이·손바닥 비율·엄지 방향)
//     → 손 모양 4원소 자동 판정
//  2) 국소 대비 강조 → 주름 마스크 → 연결 성분
//  3) 위치 사전지식으로 선 분류 — 감정선(상단 가로)·두뇌선(중단 가로)·
//     생명선(엄지쪽 곡선)·운명선(중앙 세로)·막쥔손금(합일 가로선)
//  4) 측정 근거와 함께 해석. 못 읽은 선은 못 읽었다고 정직하게.
// 참고: wikihow 손금 보는 법, 고전 수상학. 생명선=수명 금지.
// ============================================================
"use strict";

const PALM_LINE_COLORS = { heart: "#e0656b", head: "#5b8ac0", life: "#5aa46f", fate: "#e3b341", simian: "#a06bc0" };
const PALM_LINE_NAMES = { heart: "감정선", head: "두뇌선", life: "생명선", fate: "운명선", simian: "막쥔손금" };

// ── 미니 다이어그램 SVG (결과 카드용) ─────────────────────
function palmSVG(hl) {
  const L = (id, d) => {
    const on = hl === id;
    return `<path d="${d}" fill="none" stroke="${on ? PALM_LINE_COLORS[id] : "#cfc4ae"}" stroke-width="${on ? 5 : 2.2}" stroke-linecap="round"${on ? "" : ' opacity=".5"'}/>`;
  };
  const midLines = hl === "simian"
    ? L("simian", "M50 106 C 95 102 135 104 162 110")
    : L("heart", "M50 94 C 90 78 130 78 162 96") + L("head", "M52 118 C 95 122 130 128 158 140");
  return `<svg viewBox="0 0 200 240" class="palmsvg" aria-hidden="true">
    <path d="M55 232 C 32 212 28 162 36 122 C 22 110 16 88 28 80 C 40 72 54 86 60 98
             C 62 70 66 46 76 40 C 84 36 90 44 90 62
             C 92 36 100 28 108 30 C 116 32 118 46 118 62
             C 124 38 132 34 140 38 C 146 42 146 56 144 70
             C 152 54 160 52 166 58 C 172 64 168 78 164 92
             C 172 122 174 172 158 212 C 140 234 80 240 55 232 Z"
          fill="#f8f1e4" stroke="#c9bda6" stroke-width="3"/>
    ${L("life", "M62 106 C 46 140 48 180 68 214")}
    ${midLines}
    ${L("fate", "M112 214 C 110 170 108 122 106 90")}
  </svg>`;
}
function shapeSVG(rectPalm, longF) {
  const ph = rectPalm ? 96 : 72, fl = longF ? 54 : 32;
  const fingers = [0, 1, 2, 3].map((i) =>
    `<rect x="${34 + i * 20}" y="${120 - ph - fl}" width="14" height="${fl}" rx="7" fill="#f8f1e4" stroke="#c9bda6" stroke-width="2.5"/>`).join("");
  return `<svg viewBox="0 0 145 130" class="shapesvg" aria-hidden="true">
    ${fingers}
    <rect x="30" y="${120 - ph}" width="86" height="${ph}" rx="12" fill="#f8f1e4" stroke="#c9bda6" stroke-width="3"/>
  </svg>`;
}

// ── 해석 DB (자체 집필) ──────────────────────────────────
const PALM_DB = {
  shape: {
    "흙손": { sub: "정사각 손바닥 + 짧은 손가락", rect: false, longF: false,
      desc: "흙의 손 — 두 발이 땅에 붙어 있는 사람입니다. 말보다 행동, 이론보다 경험. 손으로 직접 만지고 만들어야 직성이 풀리고, 한번 맡은 일은 우직하게 끝까지 갑니다. 곁에 있으면 이상하게 마음이 놓이는 유형이에요." },
    "불손": { sub: "긴 손바닥 + 짧은 손가락", rect: true, longF: false,
      desc: "불의 손 — 엔진이 큰 사람입니다. 열정이 먼저 움직이고 계획은 그다음. 시작이 빠르고 사람을 끌어당기는 힘이 있습니다. 대신 불은 연료 관리가 전부라, 쉼표를 일정에 미리 박아 두면 오래 탑니다." },
    "공기손": { sub: "정사각 손바닥 + 긴 손가락", rect: false, longF: true,
      desc: "공기의 손 — 머리로 세상을 만지는 사람입니다. 말과 글, 논리와 아이디어가 주무기. 대화가 통하는 사람을 만나면 밤새는 유형입니다. 생각이 많아지는 날엔 몸을 움직여 주면 균형이 잡힙니다." },
    "물손": { sub: "긴 손바닥 + 긴 손가락", rect: true, longF: true,
      desc: "물의 손 — 마음의 해상도가 높은 사람입니다. 남들이 못 느끼는 미세한 감정까지 잡아내고, 예술·돌봄·직관의 영역에서 빛납니다. 깊이 느끼는 만큼 지치기도 쉬우니, 혼자 고요해지는 시간이 필수 영양소입니다." },
  },
  heart: {
    long: { level: "검지 쪽까지 길게 뻗음", desc: "마음을 크게 쓰는 사람입니다. 사랑에 이상이 있고, 좋아하는 사람에게 아낌없이 주는 형. 그만큼 기대도 커서 가끔 서운함이 남는데 — 그건 마음이 큰 사람만 치르는 세금입니다. 깎을 필요 없어요." },
    mid: { level: "검지와 중지 사이까지", desc: "균형 잡힌 로맨티스트 — 고전 수상학이 가장 편안하게 보는 자리입니다. 마음은 따뜻하되 발은 현실에 붙어 있어서, 사랑에서도 줄 것과 지킬 것을 자연스럽게 압니다." },
    short: { level: "중지 아래쯤에서 멈춤", desc: "감정을 아껴 담는 사람입니다. 표현이 짧다고 마음이 얕은 게 아니라, 말 대신 행동으로 증명하는 쪽입니다. 곁의 사람에게 '표현이 서툰 것뿐'이라고 한 번만 말해 두면 오해의 절반이 사라집니다." },
    chain: { level: "여러 갈래·끊김이 보임", desc: "감정의 결이 촘촘한 사람입니다. 남들보다 깊게 느끼고, 그래서 마음에 계절이 자주 바뀝니다. 수상학은 이런 선을 '겪은 만큼 넓어진 마음'으로 읽습니다 — 감수성은 관리만 되면 최고의 재능입니다." },
  },
  head: {
    long: { level: "손바닥을 길게 가로지름", desc: "생각의 지구력이 좋은 사람입니다. 하나를 오래, 깊게, 여러 각도에서 굴립니다. 결정이 느리다는 말을 들을 수 있지만 — 그 결정이 잘 안 무너집니다. 장고 끝에 둔 수가 당신의 수입니다." },
    short: { level: "짧고 굵은 편", desc: "직관과 결단의 머리입니다. 핵심만 빠르게 잡고 바로 움직입니다. 회의가 길어지면 답답해지는 유형 — 대신 현장에서는 누구보다 빠릅니다. 속도가 곧 재능입니다." },
    curve: { level: "끝이 손목 쪽으로 휘어짐", desc: "상상력 쪽으로 기운 머리입니다. 논리 끝에 꼭 '그런데 만약에?'가 붙는 사람. 창작·기획·이야기의 영역에서 이 곡선이 밥값을 합니다. 공상이 많다는 건, 재료가 많다는 뜻입니다." },
    straight: { level: "곧게 뻗은 직선", desc: "현실을 정면으로 보는 머리입니다. 숫자와 사실에 강하고, 감정에 휘둘리지 않고 판단합니다. 실무·관리·분석에서 신뢰를 얻는 유형 — '그 사람 말은 믿을 만하다'가 당신의 브랜드가 됩니다." },
  },
  life: {
    wide: { level: "엄지를 넓게 감싸는 큰 곡선", desc: "에너지 탱크가 큰 사람입니다. 몸으로 부딪히는 일에 강하고 회복도 빠른 편. 넘치는 힘은 쓰라고 있는 겁니다 — 운동이든 여행이든, 몸을 크게 쓰는 취미가 이 손과 잘 맞습니다." },
    narrow: { level: "엄지 가까이 붙은 좁은 곡선", desc: "에너지를 정밀하게 쓰는 사람입니다. 큰 파티보다 조용한 저녁에 충전되는 형 — 체력이 약한 게 아니라 연비가 다른 겁니다. 자기 페이스만 지키면 장거리에서 오히려 강합니다." },
    dbl: { level: "이중선(안쪽에 한 줄 더)", desc: "수상학에서 반가워하는 무늬입니다 — 보조 배터리를 하나 더 들고 다니는 손. 쓰러져도 다시 일어나는 회복력, 위기에서 발휘되는 저력으로 읽습니다." },
    faint: { level: "가늘거나 흐릿하게 잡힘", desc: "에너지 관리가 재능이 되는 손입니다. 분명히 말씀드리면 — 생명선은 수명이 아닙니다. 이 선이 말하는 건 '무리하면 표가 나는 몸이니 아껴 쓰라'는 것뿐. 잘 자고 잘 먹는 것만으로 이 선은 실제로 진해집니다." },
  },
  fate: {
    strong: { level: "손목부터 중지까지 뚜렷", desc: "한 길을 우직하게 걷는 손입니다. 일찍 방향을 잡고 그 길에서 깊어지는 형 — 조직이든 한 분야든, 시간이 당신 편입니다. 쌓인 세월이 그대로 신용이 됩니다." },
    partial: { level: "중간부터 시작하거나 흐릿함", desc: "자수성가의 무늬로 읽는 선입니다. 정해진 길을 받은 게 아니라 길을 스스로 낸 사람 — 커리어의 2막, 3막이 있는 손입니다. 시작이 늦은 게 아니라, 진짜 길을 찾는 데 시간을 쓴 겁니다." },
    broken: { level: "끊겼다가 다시 이어짐", desc: "전환의 경험이 새겨진 선입니다. 수상학은 이 끊김을 실패가 아니라 '경로 변경'으로 읽습니다. 끊긴 자리에서 다시 이어졌다는 것 — 그게 이 선의 진짜 메시지입니다." },
    none: { level: "잘 보이지 않음 / 없음", desc: "정해진 노선 없이 스스로 설계하는 손입니다. 운명선이 없는 손은 고전에서도 '자유로운 손'으로 봤습니다 — 없는 사람이 아주 많고, 나쁜 뜻이 전혀 아닙니다. 지도를 받는 사람이 아니라 지도를 그리는 사람입니다." },
  },
  simian: {
    yes: { level: "감정선·두뇌선이 한 줄로 합쳐짐", desc: "감정과 이성이 한 회로에 붙은, 백 명에 몇 없는 손입니다. 한번 꽂히면 마음과 머리가 통째로 몰입하는 형 — 옛말로는 '크게 쥐는 손'이라 했습니다. 몰입의 방향만 잘 잡히면 한 분야를 뚫어내는 힘이 남다릅니다. 대신 껐다 켜기가 어려우니, 의식적인 휴식 스위치를 만들어 두세요." },
  },
  closing: "손금은 손바닥의 주름이고, 주름은 손을 쓰는 방식이 만듭니다. 그래서 손금은 사주와 달리 — 몇 달 단위로도 실제로 바뀝니다. 오늘 당신 손에 있는 것은 판결문이 아니라, 현재 진행형의 일기장입니다. 다음 장을 어떻게 쓸지는 늘 펜을 쥔 사람 마음입니다.",
};

// ── 사진 처리 ────────────────────────────────────────────
const PALM_PHOTO = {
  base: null, views: null, comps: [], skin: null, w: 0, h: 0,

  boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1);
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1);
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  },

  /** 강조 뷰 + 주름 마스크.
   *  ① 적응형 대비: 지역 표준편차로 정규화 — 어두운 구석의 희미한 선도 같은 기준
   *  ② 헤시안 계곡 검출(2스케일): '어둡다'가 아니라 '선 모양(V자 계곡)이다'를 측정
   *  ③ 1px 팽창으로 끊긴 조각 연결 */
  process(cv) {
    const w = cv.width, h = cv.height;
    this.w = w; this.h = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    this.base = ctx.getImageData(0, 0, w, h);
    const d = this.base.data;
    const g = new Float32Array(w * h);
    const skin = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      g[p] = 0.299 * r + 0.587 * gg + 0.114 * b;
      skin[p] = (r > 60 && r >= gg && gg >= b * 0.75 && r - b > 10) ? 1 : 0;
    }
    this.skin = skin;
    const rBig = Math.max(6, Math.round(Math.min(w, h) / 26));
    const mean = this.boxBlur(g, w, h, rBig);

    // 지역 표준편차 (조명 적응 임계값의 기준)
    const dv = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) { const t = g[p] - mean[p]; dv[p] = t * t; }
    const varMap = this.boxBlur(dv, w, h, rBig);

    // 잡음 제거용 약한 스무딩 (지문 결 억제)
    const Lm = this.boxBlur(this.boxBlur(g, w, h, 1), w, h, 1);

    // 헤시안 계곡 응답 — 스케일 2(가는 선)·4(굵은 선)의 최대값
    const R = new Float32Array(w * h);
    for (const s of [2, 4]) {
      const sw = s * w;
      for (let y = s; y < h - s; y++) {
        const row = y * w;
        for (let x = s; x < w - s; x++) {
          const p = row + x;
          if (!skin[p]) continue;
          const ixx = Lm[p - s] + Lm[p + s] - 2 * Lm[p];
          const iyy = Lm[p - sw] + Lm[p + sw] - 2 * Lm[p];
          const ixy = (Lm[p + s + sw] + Lm[p - s - sw] - Lm[p + s - sw] - Lm[p - s + sw]) / 4;
          const tr = ixx + iyy, dt = Math.sqrt((ixx - iyy) * (ixx - iyy) + 4 * ixy * ixy);
          const l1 = (tr + dt) / 2, l2 = (tr - dt) / 2;
          // 계곡(어두운 선): 큰 고유값이 양수이고, 등방성 덩어리(λ2도 큼)는 억제
          const resp = l1 > 0 ? l1 - Math.abs(l2) : 0;
          if (resp > R[p]) R[p] = resp;
        }
      }
    }

    // 행별 주 피부 구간 — 손 윤곽·가장자리 후광 배제
    const L = new Int32Array(h).fill(-1), Rr = new Int32Array(h).fill(-1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let bs = -1, bl = 0, start = -1;
      for (let x = 0; x <= w; x++) {
        const s = x < w && skin[row + x];
        if (s && start < 0) start = x;
        else if (!s && start >= 0) {
          if (x - start > bl) { bl = x - start; bs = start; }
          start = -1;
        }
      }
      if (bl > 0) { L[y] = bs; Rr[y] = bs + bl; }
    }
    const inset = Math.max(6, Math.round(w * 0.03));

    const enh = ctx.createImageData(w, h);
    const raw = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      const diff = g[p] - mean[p];
      const sig = Math.sqrt(varMap[p]) + 8;
      // 강조 뷰: 지역 대비로 정규화 — 조명과 무관하게 주름이 고르게 보인다
      const v = Math.max(0, Math.min(255, 132 + (diff / sig) * 64));
      enh.data[i] = enh.data[i + 1] = enh.data[i + 2] = v;
      enh.data[i + 3] = 255;
      if (!skin[p]) continue;
      const x = p % w, y = (p / w) | 0;
      if (L[y] < 0 || x < L[y] + inset || x > Rr[y] - inset) continue;
      // 마스크: 선 모양(계곡 응답)이 지역 기준을 넘거나, 아주 뚜렷하게 어두운 곳
      if ((R[p] > Math.max(3.4, sig * 0.4) && diff < 0) || diff < -1.4 * sig) raw[p] = 1;
    }
    // 1px 팽창 — 끊긴 조각 연결
    const mask = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      if (!raw[p]) continue;
      mask[p] = 1;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) mask[p - 1] = 1;
      if (x < w - 1) mask[p + 1] = 1;
      if (y > 0) mask[p - w] = 1;
      if (y < h - 1) mask[p + w] = 1;
    }
    this.mask = mask;
    this.comps = [];
    this.views = { enh, lines: null };
    return 0;
  },

  /** 주름 마스크의 연결 성분 (기하 정보 포함). geo가 있으면 손바닥 영역 성분 우선 */
  components(mask, w, h, geo) {
    const seen = new Uint8Array(w * h);
    const out = [];
    const minSize = Math.max(50, Math.round(w * h * 0.00022));
    const minSpan = Math.min(w, h) * 0.06;
    for (let start = 0; start < w * h; start++) {
      if (!mask[start] || seen[start]) continue;
      const stack = [start], px = [];
      seen[start] = 1;
      let minX = w, maxX = 0, minY = h, maxY = 0, sx = 0, sy = 0;
      while (stack.length) {
        const p = stack.pop();
        px.push(p);
        const x = p % w, y = (p / w) | 0;
        sx += x; sy += y;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = ny * w + nx;
          if (mask[np] && !seen[np]) { seen[np] = 1; stack.push(np); }
        }
      }
      const span = Math.hypot(maxX - minX, maxY - minY);
      if (px.length >= minSize && span >= minSpan)
        out.push({ px, minX, maxX, minY, maxY, cx: sx / px.length, cy: sy / px.length, size: px.length });
    }
    // 손바닥 영역 성분 우선 (손가락 사이 그림자 등은 뒤로)
    if (geo) {
      const inPalm = (c) => c.cy >= geo.palmTop && c.cy <= geo.palmBottom && c.cx >= geo.x0 - geo.palmW * 0.1 && c.cx <= geo.x1 + geo.palmW * 0.1;
      out.sort((a, b) => (inPalm(b) - inPalm(a)) || (b.size - a.size));
      return out.filter(inPalm).slice(0, 16);
    }
    out.sort((a, b) => b.size - a.size);
    return out.slice(0, 12);
  },

  /** 선 인식 뷰: 분류된 역할 픽셀은 선 색, 나머지 주름은 회색 */
  buildLineView(auto) {
    if (!this.base) return;
    const w = this.w, h = this.h;
    const view = new ImageData(w, h);
    const d = this.base.data, v = view.data;
    for (let i = 0; i < d.length; i += 4) {
      v[i] = d[i] * 0.45; v[i + 1] = d[i + 1] * 0.45; v[i + 2] = d[i + 2] * 0.45; v[i + 3] = 255;
    }
    const paint = (pxs, hex) => {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      for (const p of pxs) { const i = p * 4; v[i] = r; v[i + 1] = g; v[i + 2] = b; }
    };
    for (const c of this.comps) paint(c.px, "#8a8578"); // 미분류 주름: 회색
    if (auto && auto.rolePx)
      for (const [role, pxs] of Object.entries(auto.rolePx)) paint(pxs, PALM_LINE_COLORS[role] || "#ffffff");
    this.views.lines = view;
  },

  show(cv, which) {
    const ctx = cv.getContext("2d");
    if (which === "base" && this.base) ctx.putImageData(this.base, 0, 0);
    else if (this.views && this.views[which]) ctx.putImageData(this.views[which], 0, 0);
  },
};

// ── 자동 판독 엔진 ───────────────────────────────────────
const PALM_AUTO = {
  last: null,

  /** 피부 행 스캔 → 손바닥 기하.
   *  손가락을 붙이고 찍으면 손가락 구간도 넓은 덩어리로 보이므로,
   *  기준점은 위(손가락)가 아니라 아래(손꿈치)에서 앵커링한다. */
  geometry(skin, w, h) {
    const step = 2, rows = [];
    for (let y = 0; y < h; y += step) {
      const runs = [];
      let start = -1;
      const row = y * w;
      for (let x = 0; x < w; x++) {
        if (skin[row + x]) { if (start < 0) start = x; }
        else if (start >= 0) { if (x - start >= w * 0.03) runs.push([start, x]); start = -1; }
      }
      if (start >= 0 && w - start >= w * 0.03) runs.push([start, w]);
      if (!runs.length) { rows.push(null); continue; }
      let main = runs[0];
      for (const r of runs) if (r[1] - r[0] > main[1] - main[0]) main = r;
      rows.push({ y, runs, main, mainW: main[1] - main[0] });
    }
    const valid = rows.filter(Boolean);
    if (!valid.length) return null;
    const maxMain = Math.max(...valid.map((r) => r.mainW));
    if (maxMain < w * 0.3) return null; // 손이 화면을 충분히 채우지 못함
    const fingerTop = valid[0].y;
    const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
    // ① 손꿈치(손바닥 아래): 아래에서부터 폭이 최대폭의 75% 이상인 마지막 행
    let palmBottom = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r && r.mainW >= maxMain * 0.75) { palmBottom = r.y; break; }
    }
    if (palmBottom == null) return null;
    // ② 손바닥 폭: 손꿈치 위쪽 구간의 중앙값
    const baseRows = valid.filter((r) => r.y <= palmBottom && r.y >= palmBottom - maxMain * 0.35);
    if (baseRows.length < 4) return null;
    const palmW = med(baseRows.map((r) => r.mainW));
    const x0 = med(baseRows.map((r) => r.main[0]));
    const x1 = med(baseRows.map((r) => r.main[1]));
    // ③ 손바닥 위(손가락 뿌리): 아래→위로 폭이 78% 미만으로 좁아지는 지점 (실측)
    let pt = null, streak = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (!r || r.y > palmBottom) continue;
      if (r.mainW < palmW * 0.78) {
        streak++;
        if (streak >= 4) { pt = r.y + step * 4; break; }
      } else streak = 0;
    }
    // 실측이 상식 범위(폭의 0.85~1.45배)를 벗어나면 표준 비율로 보정
    const ptMin = palmBottom - Math.round(palmW * 1.45), ptMax = palmBottom - Math.round(palmW * 0.85);
    let approx = false, palmTop;
    if (pt == null || pt < ptMin || pt > ptMax) { palmTop = palmBottom - Math.round(palmW * 1.1); approx = true; }
    else palmTop = pt;
    const palmH = palmBottom - palmTop;
    const fingerLen = Math.max(0, palmTop - fingerTop);
    // ④ 엄지 방향: 손바닥 상반부에서 중앙 상자 밖으로 나간 피부량
    let extL = 0, extR = 0;
    for (const r of valid) {
      if (r.y < palmTop || r.y > palmTop + palmH * 0.62) continue;
      for (const run of r.runs) {
        extL += Math.max(0, x0 - run[0]);
        extR += Math.max(0, run[1] - x1);
      }
    }
    const thumb = extR >= extL ? "R" : "L";
    return {
      fingerTop, palmTop, palmBottom, palmW, palmH, x0, x1, fingerLen, thumb, approx,
      aspect: palmH / palmW, fingerRatio: fingerLen / palmH,
    };
  },

  /** 성분 픽셀을 손바닥 좌표계 밴드로 합산 집계해 역할별 분류.
   *  주름이 여러 조각으로 끊겨 있어도(약한 대비·마스크 분절) 견고하다. */
  classify(comps, geo, w) {
    const { palmTop, palmH, x0, palmW, thumb } = geo;
    const nx = (x) => (x - x0) / palmW, ny = (y) => (y - palmTop) / palmH;
    const used = new Set();
    // 성분을 방향 풀로 나눈다 — 가로형 주름은 감정·두뇌선 후보,
    // 세로형(엄지·검지 사이 주름, 운명선 등)은 생명·운명선 후보
    for (const c of comps) {
      const ws = (c.maxX - c.minX) / palmW, vs = (c.maxY - c.minY) / palmH;
      c._horiz = ws > vs * 1.15;
      c._vert = vs > ws * 1.15;
    }
    // 밴드 픽셀 수집 (pool: "h"=가로형+중립, "v"=세로형+중립, null=전체)
    const collect = (x0n, x1n, y0n, y1n, pool) => {
      const all = [];
      let contrib = 0;
      for (const c of comps) {
        if (pool === "h" && c._vert) continue;
        if (pool === "v" && c._horiz) continue;
        let got = 0;
        for (let k = 0; k < c.px.length; k += 2) {
          const p = c.px[k];
          if (used.has(p)) continue;
          const X = nx(p % w), Y = ny((p / w) | 0);
          if (X >= x0n && X <= x1n && Y >= y0n && Y <= y1n) { all.push(p); got++; }
        }
        if (got > 25) contrib++;
      }
      return { all, contrib };
    };
    // 4~96 백분위 통계 (외딴 노이즈 픽셀에 강함)
    const stat = (pxs) => {
      if (pxs.length < 30) return null;
      const xs = [], ys = [];
      for (const p of pxs) { xs.push(nx(p % w)); ys.push(ny((p / w) | 0)); }
      xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
      const q = (a, f) => a[Math.max(0, Math.min(a.length - 1, Math.floor((a.length - 1) * f)))];
      const mnx = q(xs, 0.04), mxx = q(xs, 0.96), mny = q(ys, 0.04), mxy = q(ys, 0.96);
      return { mnx, mxx, mny, mxy, wspan: mxx - mnx, vspan: mxy - mny, my: q(ys, 0.5), n: pxs.length };
    };
    const claim = (pxs) => { for (const p of pxs) used.add(p); };
    const roles = {}, rolePx = {}, basis = {};
    const pct = (x) => Math.round(Math.max(0, Math.min(1, x)) * 100);

    // ① 감정선: 상단 밴드의 가로형 주름 (합산)
    const hC = collect(-0.02, 1.02, 0.03, 0.4, "h");
    let hs = stat(hC.all);
    if (hs && !(hs.wspan > 0.42 && hs.wspan > hs.vspan * 1.05)) hs = null;
    if (hs) claim(hC.all);

    // ② 두뇌선: 감정선 아래 밴드의 가로형 주름
    const headTop = hs ? Math.max(0.26, hs.my + 0.09) : 0.26;
    const dC = collect(-0.02, 1.02, headTop, 0.64, "h");
    let ds = stat(dC.all);
    if (ds && !(ds.wspan > 0.38 && ds.wspan > ds.vspan * 0.85)) ds = null;
    if (ds) claim(dC.all);

    // ③ 막쥔손금: 가로선이 하나로만 아주 길게
    const simian = !!(hs && !ds && hs.wspan > 0.75 && hs.my > 0.14 && hs.my < 0.5 && hs.vspan < 0.2);

    // ④ 생명선: 엄지쪽 대각/세로형 곡선
    const lifeX0 = thumb === "R" ? 0.4 : -0.06, lifeX1 = thumb === "R" ? 1.06 : 0.6;
    const lC = collect(lifeX0, lifeX1, 0.06, 1.02, "v");
    let ls = stat(lC.all);
    if (ls && !(ls.vspan > 0.32 && ls.n > 70)) ls = null;

    // ⑤ 운명선: 중앙 세로형 주름 (생명선 픽셀 제외)
    if (ls) claim(lC.all);
    const fC = collect(0.32, 0.7, 0.18, 1.02, "v");
    let fs = stat(fC.all);
    if (fs && !(fs.vspan > 0.3 && fs.wspan < 0.38 && fs.vspan > fs.wspan * 1.15)) fs = null;

    // ── 역할 → 해석 옵션 매핑 ──
    if (simian) {
      roles.simian = PALM_DB.simian.yes;
      rolePx.simian = hC.all;
      basis.simian = `가로 주름이 하나로 손바닥 폭의 ${pct(hs.wspan)}%를 가로지릅니다 (감정선·두뇌선 분리가 보이지 않음).`;
    } else {
      if (hs) {
        // 끊김(chain)은 사진 화질로도 생기는 무늬라 자동 단정하지 않는다 — 길이로만 분류
        // 희미한 끝부분은 마스크가 놓치기 쉬워 도달 거리를 관대하게 본다
        const reach = Math.max(0, thumb === "R" ? 1 - hs.mxx : hs.mnx);
        const key = reach < 0.2 ? "long" : reach < 0.38 ? "mid" : "short";
        roles.heart = PALM_DB.heart[key];
        rolePx.heart = hC.all;
        basis.heart = `손바닥 폭의 ${pct(hs.wspan)}% 구간에서 잡혔고, 검지 쪽 끝에서 ${pct(reach)}% 지점까지 뻗음.`;
      }
      if (ds) {
        // 끝부분 처짐: 새끼손가락 쪽 1/4 구간
        let tailSum = 0, tailN = 0;
        for (const p of dC.all) {
          const X = nx(p % w);
          const tail = thumb === "R" ? X < ds.mnx + ds.wspan * 0.25 : X > ds.mxx - ds.wspan * 0.25;
          if (tail) { tailSum += ny((p / w) | 0); tailN++; }
        }
        const droop = tailN > 10 ? (tailSum / tailN) - ds.my : 0;
        const key = droop > 0.08 ? "curve" : ds.wspan > 0.7 ? "long" : ds.wspan < 0.5 ? "short" : "straight";
        roles.head = PALM_DB.head[key];
        rolePx.head = dC.all;
        basis.head = `손바닥 폭의 ${pct(ds.wspan)}% 구간에서 잡힘 · 끝부분이 ${droop > 0.08 ? "손목 쪽으로 " + pct(droop) + "% 내려감" : "수평에 가까움"}.`;
      }
      if (ls) {
        const depth = Math.max(0, thumb === "R" ? 1 - ls.mnx : ls.mxx);
        const dense = ls.n / Math.max(1, ls.vspan * palmH); // 굵기 근사
        const key = (ls.vspan < 0.45 && dense < 1.6) ? "faint" : depth > 0.5 ? "wide" : "narrow";
        roles.life = PALM_DB.life[key];
        rolePx.life = lC.all;
        basis.life = `세로로 손바닥 높이의 ${pct(ls.vspan)}%를 내려가며, 엄지 쪽에서 안쪽으로 ${pct(depth)}%까지 감쌈.`;
      }
      if (fs) {
        const key = fs.vspan > 0.55 ? "strong" : "partial";
        roles.fate = PALM_DB.fate[key];
        rolePx.fate = fC.all;
        basis.fate = `중앙 세로 주름이 손바닥 높이의 ${pct(fs.vspan)}%를 오름 (${fs.vspan > 0.55 ? "손목 부근~중지 방향" : "중간 구간"}).`;
      } else {
        roles.fate = PALM_DB.fate.none;
        basis.fate = "중앙 세로 주름이 뚜렷하게 잡히지 않았습니다 — 실제로 없는 사람이 아주 많은 선입니다.";
      }
    }
    return { roles, rolePx, basis };
  },

  /** 전체 실행 */
  run(photo) {
    if (!photo.skin || !photo.mask) return { ok: false, reason: "사진을 먼저 분석해 주세요." };
    const geo = this.geometry(photo.skin, photo.w, photo.h);
    if (!geo) {
      photo.comps = photo.components(photo.mask, photo.w, photo.h, null);
      return {
        ok: false,
        reason: "손바닥을 또렷하게 찾지 못했습니다. 밝은 곳에서, 배경과 손이 구분되게, 손바닥이 화면을 가득 채우고 손가락이 위로 가게 다시 찍어 주세요.",
      };
    }
    photo.comps = photo.components(photo.mask, photo.w, photo.h, geo);
    const cls = this.classify(photo.comps, geo, photo.w);
    // 손 모양 판정 — 고전 규칙: 손가락(중지)이 손바닥 높이 이상이면 '긴 손가락'
    const rect = geo.aspect > 0.98, longF = geo.fingerRatio >= 1.0;
    const shapeName = rect ? (longF ? "물손" : "불손") : (longF ? "공기손" : "흙손");
    const missing = ["heart", "head", "life"].filter((k) => !cls.roles[k] && !cls.roles.simian);
    const res = {
      ok: true, geo,
      hand: geo.thumb === "R" ? "오른손" : "왼손",
      shape: { name: shapeName, ...PALM_DB.shape[shapeName],
        basis: `손바닥 세로/가로 비율 ${geo.aspect.toFixed(2)} (${rect ? "긴" : "정사각"} 손바닥) · 손가락/손바닥 길이 ${geo.fingerRatio.toFixed(2)} (${longF ? "긴" : "짧은"} 손가락)${geo.approx ? " · 손가락 경계가 흐려 손바닥 높이는 표준 비율로 근사" : ""}.` },
      roles: cls.roles, rolePx: cls.rolePx, basis: cls.basis, missing,
    };
    this.last = res;
    return res;
  },
};
