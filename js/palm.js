// ============================================================
// palm.js — 손금 (기기 내 처리, 저장·전송 없음)
//
// 3단 구조:
//  1) 사진 → 손금 강조 필터(국소 대비) + 주요 주름 자동 감지 오버레이
//     — 조명·각도에 흔들리지 않는, 정직하게 보여줄 수 있는 부분만 자동화
//  2) 이름 붙은 선(감정·두뇌·생명·운명)의 형태는 강조 사진을 보며
//     그림 선택지로 확인 — 사진만으로 단정하지 않는다
//  3) 해석은 자체 집필 DB — 판정 금지 · 생명선=수명 금지 · 희망적 마무리
// 참고: wikihow 손금 보는 법, 고전 수상학(4대선·4원소 손·막쥔손금)
// ============================================================
"use strict";

// ── 미니 다이어그램 SVG ──────────────────────────────────
const PALM_LINE_COLORS = { heart: "#e0656b", head: "#5b8ac0", life: "#5aa46f", fate: "#c9a13d", simian: "#a06bc0" };

function palmSVG(hl) {
  const L = (id, d) => {
    const on = hl === id;
    return `<path d="${d}" fill="none" stroke="${on ? PALM_LINE_COLORS[id] : "#cfc4ae"}" stroke-width="${on ? 5 : 2.2}" stroke-linecap="round"${on ? "" : ' opacity=".5"'}/>`;
  };
  // 막쥔손금 모드: 감정선·두뇌선 대신 하나의 가로선
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
// 손 모양 (손바닥 비율 × 손가락 길이)
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
  hand: {
    title: "어느 손을 볼까요?",
    hint: "수상학의 오랜 관례 — 주로 쓰지 않는 손은 타고난 결, 주로 쓰는 손은 지금 만들어 가는 결로 봅니다. 어느 쪽도 '진짜'고, 둘을 비교하는 게 제일 재밌습니다.",
    options: [
      { k: "dominant", label: "주로 쓰는 손", desc: "지금의 당신 — 살아오며 스스로 만들어 온 현재의 지도를 읽습니다. 손금은 손을 쓰는 방식에 따라 실제로 변하기 때문에, 이 손에는 당신의 선택들이 쌓여 있습니다." },
      { k: "passive", label: "주로 쓰지 않는 손", desc: "타고난 결 — 출발선의 지도를 읽습니다. 나중에 주로 쓰는 손과 비교해 보세요. 두 손이 많이 다르다면, 그만큼 스스로를 많이 바꿔 온 사람이라는 뜻입니다." },
    ],
  },
  parts: [
    {
      id: "shape", name: "손 모양", palace: "4원소", domain: "기본 기질",
      find: "손바닥이 정사각형에 가까운지 세로로 긴지, 그리고 손가락이 손바닥 세로 길이보다 짧은지 비슷하게 긴지를 봅니다.",
      svgKind: "shape",
      options: [
        { level: "흙손", sub: "정사각 손바닥 + 짧은 손가락", rect: false, longF: false,
          desc: "흙의 손 — 두 발이 땅에 붙어 있는 사람입니다. 말보다 행동, 이론보다 경험. 손으로 직접 만지고 만들어야 직성이 풀리고, 한번 맡은 일은 우직하게 끝까지 갑니다. 곁에 있으면 이상하게 마음이 놓이는 유형이에요." },
        { level: "불손", sub: "긴 손바닥 + 짧은 손가락", rect: true, longF: false,
          desc: "불의 손 — 엔진이 큰 사람입니다. 열정이 먼저 움직이고 계획은 그다음. 시작이 빠르고 사람을 끌어당기는 힘이 있습니다. 대신 불은 연료 관리가 전부라, 쉼표를 일정에 미리 박아 두면 오래 탑니다." },
        { level: "공기손", sub: "정사각 손바닥 + 긴 손가락", rect: false, longF: true,
          desc: "공기의 손 — 머리로 세상을 만지는 사람입니다. 말과 글, 논리와 아이디어가 주무기. 대화가 통하는 사람을 만나면 밤새는 유형입니다. 생각이 많아지는 날엔 몸을 움직여 주면 균형이 잡힙니다." },
        { level: "물손", sub: "긴 손바닥 + 긴 손가락", rect: true, longF: true,
          desc: "물의 손 — 마음의 해상도가 높은 사람입니다. 남들이 못 느끼는 미세한 감정까지 잡아내고, 예술·돌봄·직관의 영역에서 빛납니다. 깊이 느끼는 만큼 지치기도 쉬우니, 혼자 고요해지는 시간이 필수 영양소입니다." },
      ],
    },
    {
      id: "heart", name: "감정선", palace: "사랑과 마음", domain: "감정 표현 방식", hlLine: "heart",
      find: "새끼손가락 아래에서 시작해 검지 쪽으로 가로지르는, 손바닥 맨 위의 선입니다. 어디까지 뻗는지, 곡선인지 직선인지 보세요.",
      options: [
        { level: "검지 아래까지 길게", desc: "마음을 크게 쓰는 사람입니다. 사랑에 이상이 있고, 좋아하는 사람에게 아낌없이 주는 형. 그만큼 기대도 커서 가끔 서운함이 남는데 — 그건 마음이 큰 사람만 치르는 세금입니다. 깎을 필요 없어요." },
        { level: "검지와 중지 사이로", desc: "균형 잡힌 로맨티스트 — 고전 수상학이 가장 편안하게 보는 자리입니다. 마음은 따뜻하되 발은 현실에 붙어 있어서, 사랑에서도 줄 것과 지킬 것을 자연스럽게 압니다." },
        { level: "중지 아래쯤에서 멈춤", desc: "감정을 아껴 담는 사람입니다. 표현이 짧다고 마음이 얕은 게 아니라, 말 대신 행동으로 증명하는 쪽입니다. 곁의 사람에게 '표현이 서툰 것뿐'이라고 한 번만 말해 두면 오해의 절반이 사라집니다." },
        { level: "사슬 모양 · 끊김이 보임", desc: "감정의 결이 촘촘한 사람입니다. 남들보다 깊게 느끼고, 그래서 마음에 계절이 자주 바뀝니다. 수상학은 이런 선을 '겪은 만큼 넓어진 마음'으로 읽습니다 — 감수성은 관리만 되면 최고의 재능입니다." },
      ],
    },
    {
      id: "head", name: "두뇌선", palace: "생각의 결", domain: "사고 방식", hlLine: "head",
      find: "엄지와 검지 사이에서 시작해 손바닥 가운데를 가로지르는 선입니다. 길이와 기울기를 보세요.",
      options: [
        { level: "손바닥을 길게 가로지름", desc: "생각의 지구력이 좋은 사람입니다. 하나를 오래, 깊게, 여러 각도에서 굴립니다. 결정이 느리다는 말을 들을 수 있지만 — 그 결정이 잘 안 무너집니다. 장고 끝에 둔 수가 당신의 수입니다." },
        { level: "짧고 굵은 편", desc: "직관과 결단의 머리입니다. 핵심만 빠르게 잡고 바로 움직입니다. 회의가 길어지면 답답해지는 유형 — 대신 현장에서는 누구보다 빠릅니다. 속도가 곧 재능입니다." },
        { level: "끝이 손목 쪽으로 휘어짐", desc: "상상력 쪽으로 기운 머리입니다. 논리 끝에 꼭 '그런데 만약에?'가 붙는 사람. 창작·기획·이야기의 영역에서 이 곡선이 밥값을 합니다. 공상이 많다는 건, 재료가 많다는 뜻입니다." },
        { level: "곧게 뻗은 직선", desc: "현실을 정면으로 보는 머리입니다. 숫자와 사실에 강하고, 감정에 휘둘리지 않고 판단합니다. 실무·관리·분석에서 신뢰를 얻는 유형 — '그 사람 말은 믿을 만하다'가 당신의 브랜드가 됩니다." },
      ],
    },
    {
      id: "life", name: "생명선", palace: "에너지", domain: "체력과 회복력", hlLine: "life",
      find: "엄지 둘레를 감싸며 손목 쪽으로 내려가는 곡선입니다. 얼마나 넓게 감싸는지, 선이 또렷한지 보세요. ⚠️ 길이는 수명과 무관합니다 — 현대 수상학의 공통 원칙입니다.",
      options: [
        { level: "엄지를 넓게 감싸는 큰 곡선", desc: "에너지 탱크가 큰 사람입니다. 몸으로 부딪히는 일에 강하고 회복도 빠른 편. 넘치는 힘은 쓰라고 있는 겁니다 — 운동이든 여행이든, 몸을 크게 쓰는 취미가 이 손과 잘 맞습니다." },
        { level: "엄지 가까이 붙은 좁은 곡선", desc: "에너지를 정밀하게 쓰는 사람입니다. 큰 파티보다 조용한 저녁에 충전되는 형 — 체력이 약한 게 아니라 연비가 다른 겁니다. 자기 페이스만 지키면 장거리에서 오히려 강합니다." },
        { level: "이중선(안쪽에 한 줄 더)", desc: "수상학에서 반가워하는 무늬입니다 — 보조 배터리를 하나 더 들고 다니는 손. 쓰러져도 다시 일어나는 회복력, 위기에서 발휘되는 저력으로 읽습니다." },
        { level: "가늘거나 중간에 흐릿함", desc: "에너지 관리가 재능이 되는 손입니다. 분명히 말씀드리면 — 생명선은 수명이 아닙니다. 이 선이 말하는 건 '무리하면 표가 나는 몸이니 아껴 쓰라'는 것뿐. 잘 자고 잘 먹는 것만으로 이 선은 실제로 진해집니다." },
      ],
    },
    {
      id: "fate", name: "운명선", palace: "일과 방향", domain: "커리어의 결", hlLine: "fate",
      find: "손목 부근에서 중지를 향해 세로로 오르는 선입니다. 없는 사람도 아주 많습니다 — 없다고 걱정할 것 하나 없습니다.",
      options: [
        { level: "손목부터 중지까지 뚜렷", desc: "한 길을 우직하게 걷는 손입니다. 일찍 방향을 잡고 그 길에서 깊어지는 형 — 조직이든 한 분야든, 시간이 당신 편입니다. 쌓인 세월이 그대로 신용이 됩니다." },
        { level: "중간부터 시작하거나 흐릿함", desc: "자수성가의 무늬로 읽는 선입니다. 정해진 길을 받은 게 아니라 길을 스스로 낸 사람 — 커리어의 2막, 3막이 있는 손입니다. 시작이 늦은 게 아니라, 진짜 길을 찾는 데 시간을 쓴 겁니다." },
        { level: "끊겼다가 다시 이어짐", desc: "전환의 경험이 새겨진 선입니다. 수상학은 이 끊김을 실패가 아니라 '경로 변경'으로 읽습니다. 끊긴 자리에서 다시 이어졌다는 것 — 그게 이 선의 진짜 메시지입니다." },
        { level: "잘 안 보임 / 없음", desc: "정해진 노선 없이 스스로 설계하는 손입니다. 운명선이 없는 손은 고전에서도 '자유로운 손'으로 봤습니다. 두뇌선이 또렷하다면 더욱 — 지도를 받는 사람이 아니라 지도를 그리는 사람입니다." },
      ],
    },
    {
      id: "simian", name: "특별한 무늬", palace: "막쥔손금", domain: "집중의 형태", hlLine: "simian",
      find: "감정선과 두뇌선이 따로 있지 않고 하나의 굵은 가로선으로 합쳐져 손바닥을 가로지르면 '막쥔손금'입니다. 드문 무늬입니다.",
      options: [
        { level: "있다 (한 줄로 가로지름)", desc: "감정과 이성이 한 회로에 붙은, 백 명에 몇 없는 손입니다. 한번 꽂히면 마음과 머리가 통째로 몰입하는 형 — 옛말로는 '크게 쥐는 손'이라 했습니다. 몰입의 방향만 잘 잡히면 한 분야를 뚫어내는 힘이 남다릅니다. 대신 껐다 켜기가 어려우니, 의식적인 휴식 스위치를 만들어 두세요." },
        { level: "없다 (감정선·두뇌선 따로)", desc: "감정과 이성이 각자의 방을 가진, 가장 일반적인 구조입니다. 마음이 격해져도 판단의 방은 따로 지킬 수 있는 형 — 특별한 무늬가 없는 게 아니라, 균형이 당신의 무늬입니다." },
      ],
    },
  ],
  closing: "손금은 손바닥의 주름이고, 주름은 손을 쓰는 방식이 만듭니다. 그래서 손금은 사주와 달리 — 몇 달 단위로도 실제로 바뀝니다. 오늘 당신 손에 있는 것은 판결문이 아니라, 현재 진행형의 일기장입니다. 다음 장을 어떻게 쓸지는 늘 펜을 쥔 사람 마음입니다.",
};

// ── 사진 처리: 손금 강조 + 주름 자동 감지 ────────────────
const PALM_PHOTO = {
  base: null, // 원본 ImageData
  views: null, // {enh: ImageData, crease: ImageData}
  creaseCount: 0,

  boxBlur(src, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { // 가로 패스
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc / (2 * r + 1);
        acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) { // 세로 패스
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc / (2 * r + 1);
        acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  },

  /** 원본 캔버스 → 강조/주름 뷰 생성. 주요 주름 개수 반환 */
  process(cv) {
    const w = cv.width, h = cv.height;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    this.base = ctx.getImageData(0, 0, w, h);
    const d = this.base.data;
    const g = new Float32Array(w * h);
    const skin = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      g[p] = 0.299 * r + 0.587 * gg + 0.114 * b;
      // 대략적 피부색 판정 — 배경 무늬가 주름으로 오인되는 것을 막는다
      skin[p] = (r > 60 && r >= gg && gg >= b * 0.75 && r - b > 10) ? 1 : 0;
    }
    const mean = this.boxBlur(g, w, h, Math.max(6, Math.round(Math.min(w, h) / 26)));

    // 강조 뷰: 국소 대비 증폭 (주름이 또렷해진다)
    const enh = ctx.createImageData(w, h);
    const mask = new Uint8Array(w * h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      const diff = g[p] - mean[p];
      const v = Math.max(0, Math.min(255, 132 + diff * 2.8));
      enh.data[i] = enh.data[i + 1] = enh.data[i + 2] = v;
      enh.data[i + 3] = 255;
      if (skin[p] && diff < -9) mask[p] = 1; // 국소 평균보다 뚜렷이 어두움 = 주름
    }

    // 주요 주름: 연결 성분 중 긴 것 상위만 색으로
    const comps = this.components(mask, w, h);
    const palette = ["#ff6b6b", "#feca57", "#54d0ff", "#7bed9f", "#c56cf0", "#ff9ff3"];
    const crease = ctx.createImageData(w, h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) { // 배경: 원본을 어둡게
      crease.data[i] = d[i] * 0.42; crease.data[i + 1] = d[i + 1] * 0.42; crease.data[i + 2] = d[i + 2] * 0.42;
      crease.data[i + 3] = 255;
    }
    comps.forEach((comp, ci) => {
      const col = palette[ci % palette.length];
      const r = parseInt(col.slice(1, 3), 16), gg = parseInt(col.slice(3, 5), 16), b = parseInt(col.slice(5, 7), 16);
      for (const p of comp) {
        const i = p * 4;
        crease.data[i] = r; crease.data[i + 1] = gg; crease.data[i + 2] = b;
      }
    });
    this.views = { enh, crease };
    this.creaseCount = comps.length;
    return comps.length;
  },

  /** 주름 마스크의 연결 성분 — 길고 큰 것 상위 6개 */
  components(mask, w, h) {
    const seen = new Uint8Array(w * h);
    const out = [];
    const minSize = Math.max(120, Math.round(w * h * 0.0006));
    const minSpan = Math.min(w, h) * 0.14;
    for (let start = 0; start < w * h; start++) {
      if (!mask[start] || seen[start]) continue;
      const stack = [start], px = [];
      seen[start] = 1;
      let minX = w, maxX = 0, minY = h, maxY = 0;
      while (stack.length) {
        const p = stack.pop();
        px.push(p);
        const x = p % w, y = (p / w) | 0;
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
      if (px.length >= minSize && span >= minSpan) out.push(px);
    }
    out.sort((a, b) => b.length - a.length);
    return out.slice(0, 6);
  },

  show(cv, which) {
    const ctx = cv.getContext("2d");
    if (which === "base" && this.base) ctx.putImageData(this.base, 0, 0);
    else if (this.views && this.views[which]) ctx.putImageData(this.views[which], 0, 0);
  },
};
