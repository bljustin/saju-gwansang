// ============================================================
// app.js — 화면 로직 (Layer 3 해석 + Layer 4 표현) v2
// 유쾌하게, 그러나 가드레일은 단단하게:
//   단정 금지 · 상극=나쁨 금지 · 부재=보완영역 · 점수 후려치기 금지
//   길흉 점수 대신 "타이밍(나아갈/멈출/다질 때)"의 언어
// ============================================================
"use strict";

const HANJA_GAN = { "갑": "甲", "을": "乙", "병": "丙", "정": "丁", "무": "戊", "기": "己", "경": "庚", "신": "辛", "임": "壬", "계": "癸" };
const HANJA_JI = { "자": "子", "축": "丑", "인": "寅", "묘": "卯", "진": "辰", "사": "巳", "오": "午", "미": "未", "신": "申", "유": "酉", "술": "戌", "해": "亥" };

const CITIES = [
  ["서울", 126.98], ["부산", 129.08], ["대구", 128.60], ["인천", 126.71],
  ["광주", 126.85], ["대전", 127.38], ["울산", 129.31], ["세종", 127.29],
  ["수원", 127.03], ["청주", 127.49], ["전주", 127.15], ["창원", 128.68],
  ["제주", 126.53], ["춘천", 127.73], ["강릉", 128.88], ["포항", 129.34],
  ["목포", 126.39], ["여수", 127.66], ["평양", 125.75], ["개성", 126.55],
];

const GROUP_COLOR = { "비겁": "#a3552f", "식상": "#2E7D5B", "재성": "#B8860B", "관성": "#5b6c8f", "인성": "#7d5ba6" };
// 흐름의 언어(IT.FLOW)와 기질 서술(IT.SIPSIN/ILGAN)은 interpret.js 로 이관됨
const TODAY_LINE = {
  "비견": "내 기준이 또렷해지는 날. 남의 정답보다 내 정답을 조금 더 믿어도 좋은 하루입니다.",
  "겁재": "승부욕이 살짝 달아오르는 날. 경쟁은 게임처럼 — 지더라도 한 판 더!",
  "식신": "몰입이 잘 되는 날. 파고들던 그 일이 오늘 한 뼘 더 깊어집니다.",
  "상관": "말과 아이디어가 술술 풀리는 날. 미뤄 둔 연락과 제안을 오늘 던져 보세요.",
  "편재": "판이 크게 보이는 날. 큰 그림을 그리기 좋습니다 — 지갑은 잠깐 닫아 두고요.",
  "정재": "꼼꼼함이 빛나는 날. 정리·정산·저축 — 작은 마무리가 큰 안심이 됩니다.",
  "편관": "버티는 힘이 돋보이는 날. 무거워도 자세만 지키면 내일이 가벼워집니다.",
  "정관": "격식이 어울리는 날. 약속·예의·마감 — 오늘 지킨 것이 곧 평판이 됩니다.",
  "편인": "'이게 맞나?' 촉이 서는 날. 한 번 더 확인하면 실수 하나를 미리 줍습니다.",
  "정인": "흡수력이 좋은 날. 배우고 묻고 읽기 — 들어오는 것이 고스란히 남는 하루입니다.",
};

// ── 오늘의 기운 확장 데이터 ──────────────────────────────
// 십이운성: 일간 × 오늘 지지 → 에너지 단계 (양간 순행 · 음간 역행)
const STAGE12 = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
const JANGSAENG = { "갑": "해", "병": "인", "무": "인", "경": "사", "임": "신", "을": "오", "정": "유", "기": "유", "신": "자", "계": "묘" };
// [게이지%, 이모지, 별명, 한 줄 해설] — 낮은 날도 '나쁜 날'이 아니라 '용도가 다른 날'로 서술
const STAGE_META = {
  "장생": [70, "🌱", "돋아나는 날", "새로 시작하는 일에 순풍이 붙는 날입니다. 첫걸음은 오늘 떼세요."],
  "목욕": [55, "🚿", "말갛게 씻는 날", "감성이 예민해지고 매력이 살아나는 날. 대신 충동구매 버튼은 잠깐 멀리."],
  "관대": [80, "🎓", "차려입는 날", "격식이 어울리는 날입니다. 면접·발표·첫인사에 힘이 실립니다."],
  "건록": [90, "🏃", "제 궤도의 날", "실력이 제값을 하는 날. 미뤄둔 실무는 오늘 해치우면 됩니다."],
  "제왕": [100, "👑", "만충의 날", "에너지 최고점입니다. 가장 어려운 일을 오늘에 배치하세요."],
  "쇠": [60, "🍂", "한숨 돌리는 날", "정점 뒤의 완만한 구간. 새로 벌이기보다 마무리가 어울립니다."],
  "병": [40, "🛋️", "느슨한 날", "집중이 흩어지기 쉬운 날. 가벼운 일 위주로 — 무리하지 않는 게 이기는 날입니다."],
  "사": [30, "🌙", "고요한 날", "몸보다 머리가 잘 도는 날. 계획·구상·정리에 어울립니다."],
  "묘": [20, "📦", "갈무리의 날", "담아두기 좋은 날입니다. 저축·백업·기록 — 오늘 담은 것이 남습니다."],
  "절": [10, "🔌", "충전의 날", "배터리가 바닥에 가까운 날 — 게으른 게 아니라 충전이 필요한 겁니다. 오늘은 일찍 쉬는 게 일정 관리입니다."],
  "태": [25, "🥚", "움트는 날", "아이디어가 배는 날. 실행은 내일로 미루고, 오늘은 메모만 해두세요."],
  "양": [45, "🌤️", "기지개의 날", "기운이 서서히 차오르는 중입니다. 작은 일부터 몸을 풀면 좋습니다."],
};
function unseong12(gan, ji) {
  const start = JI.indexOf(JANGSAENG[gan]), idx = JI.indexOf(ji);
  return STAGE12[GAN_INFO[gan][1] > 0 ? (idx - start + 12) % 12 : (start - idx + 12) % 12];
}
// 지지 관계표
const YUKHAP = { "자": "축", "축": "자", "인": "해", "해": "인", "묘": "술", "술": "묘", "진": "유", "유": "진", "사": "신", "신": "사", "오": "미", "미": "오" };
const CHUNG = { "자": "오", "오": "자", "축": "미", "미": "축", "인": "신", "신": "인", "묘": "유", "유": "묘", "진": "술", "술": "진", "사": "해", "해": "사" };
const SAMHAP = [["인", "오", "술"], ["사", "유", "축"], ["신", "자", "진"], ["해", "묘", "미"]];
const JI_HOURS = { "자": "23~01시", "축": "01~03시", "인": "03~05시", "묘": "05~07시", "진": "07~09시", "사": "09~11시", "오": "11~13시", "미": "13~15시", "신": "15~17시", "유": "17~19시", "술": "19~21시", "해": "21~23시" };
const TOMORROW_TEASE = {
  "비견": "내 기준이 서는 날입니다 — 미뤄둔 결정은 내일 내리면 좋습니다",
  "겁재": "승부수의 날입니다 — 도전할 일은 내일 던져 보세요",
  "식신": "몰입의 날입니다 — 파고들 일은 내일로 잡아두세요",
  "상관": "말문이 트이는 날입니다 — 연락·제안은 내일이 잘 풀립니다",
  "편재": "판이 커 보이는 날입니다 — 큰 그림 구상은 내일로",
  "정재": "꼼꼼함의 날입니다 — 정산·계약서 검토는 내일이 적기입니다",
  "편관": "맷집의 날입니다 — 부담스러운 자리는 내일이 오히려 낫습니다",
  "정관": "격식의 날입니다 — 미룬 서류·공식 일정은 내일이 더 잘 풀립니다",
  "편인": "촉이 서는 날입니다 — 검토·재확인은 내일 하면 하나를 더 잡아냅니다",
  "정인": "흡수의 날입니다 — 배우고 묻는 일은 내일 잘 들어옵니다",
};
/** 오늘 지지와 내 일지의 관계 → [이모지, 라벨, 해설] */
function jiRelation(myJi, tJi) {
  if (tJi === myJi)
    return ["🪞", "같은 기운", `오늘 지지가 당신의 일지와 똑같은 <b>${myJi}</b> — 내 결이 두 배로 진해지는 날입니다. 평소의 장점도 습관도 크게 나오니, 좋은 버릇을 앞세우면 됩니다.`];
  if (YUKHAP[myJi] === tJi)
    return ["🤝", "합이 드는 날", `오늘 지지(${tJi})가 당신의 일지(${myJi})와 <b>육합</b> — 마음 맞는 사람이 나타나기 쉬운 날입니다. 약속·만남·부탁은 오늘 하세요.`];
  if (CHUNG[myJi] === tJi)
    return ["🌀", "변화의 날", `오늘 지지(${tJi})가 당신의 일지(${myJi})와 <b>충</b> — 일정이 바뀌기 쉬운 날입니다. 나쁜 날이 아니라 '움직임의 날' — 여유 시간을 끼워 두면 오히려 전환의 기회가 됩니다.`];
  const grp = SAMHAP.find((g) => g.includes(myJi) && g.includes(tJi));
  if (grp)
    return ["🧩", "손발이 맞는 날", `오늘 지지(${tJi})가 당신의 일지(${myJi})와 <b>삼합</b> 짝 — 혼자보다 같이가 잘 풀리는 날입니다. 협업·모임·부탁하기 좋습니다.`];
  return ["🍵", "담백한 날", `오늘 지지(${tJi})와 당신의 일지(${myJi})는 서로 담백한 사이 — 무리 없는 날입니다. 평소 페이스대로 가면 됩니다.`];
}
/** 아침 문안 스트릭 (이 기기에만 저장) */
function touchStreak() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let s = null;
  try { s = JSON.parse(localStorage.getItem("saju.streak") || "null"); } catch (e) {}
  if (!s) s = { last: null, n: 0 };
  if (s.last === key) return s.n || 1;
  const yd = new Date(now); yd.setDate(yd.getDate() - 1);
  const ydKey = `${yd.getFullYear()}-${yd.getMonth() + 1}-${yd.getDate()}`;
  s.n = s.last === ydKey ? (s.n || 0) + 1 : 1;
  s.last = key;
  try { localStorage.setItem("saju.streak", JSON.stringify(s)); } catch (e) {}
  return s.n;
}

let lastChart = null, lastResult = null;

// ── 공통 도우미 ──────────────────────────────────────────
const $ = (s) => document.querySelector(s);
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function ohaengOfPos(c, isGan) { return charInfo(c, isGan)[0]; }
function hanjaOf(c, isGan) { return isGan ? HANJA_GAN[c] : (HANJA_JI[c] || HANJA_GAN[c]); }
function esc(s) { return String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])); }
function profileKey(p) { return `${p.y}-${p.mo}-${p.d}-${p.noTime ? "x" : p.h + ":" + p.mi}`; }

// ── 탭 ───────────────────────────────────────────────────
document.querySelectorAll(".tabs button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    for (const t of ["saju", "fortune", "name", "gwansang", "learn", "about"])
      $("#tab-" + t).classList.toggle("hidden", t !== b.dataset.tab);
    if (b.dataset.tab === "learn") renderLearn();
    if (b.dataset.tab === "fortune") renderFortune();
  });
});

// ── 입력 폼 초기화 ────────────────────────────────────────
function fillSelect(sel, from, to, pad, suffix) {
  for (let i = from; i <= to; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = (pad ? String(i).padStart(2, "0") : i) + (suffix || "");
    sel.appendChild(o);
  }
}
fillSelect($("#in-mo"), 1, 12, false, "월");
fillSelect($("#in-d"), 1, 31, false, "일");
// 시 선택에 해당 지지를 함께 표기 (23시 → "23시 (자시)")
{
  const hs = $("#in-h");
  for (let i = 0; i <= 23; i++) {
    const ji = hourToJi(i, 30, false); // 각 시의 대표 지지
    hs.appendChild(new Option(`${String(i).padStart(2, "0")}시 (${ji}시)`, i));
  }
}
fillSelect($("#in-mi"), 0, 59, true, "분");
{
  const cs = $("#in-city");
  for (const [name, lon] of CITIES) cs.appendChild(new Option(`${name} (${lon}°E)`, lon));
  cs.appendChild(new Option("경도 직접 입력…", "custom"));
  cs.appendChild(new Option("모름 / 해외 (보정 안 함)", "none"));
  cs.addEventListener("change", () => { $("#lon-wrap").style.display = cs.value === "custom" ? "" : "none"; });
}
$("#in-noTime").addEventListener("change", (e) => {
  $("#in-h").disabled = $("#in-mi").disabled = e.target.checked;
});

// ── 프로필 저장/복원 (이 기기에만) ────────────────────────
function saveProfile() {
  const p = {
    y: $("#in-y").value, mo: $("#in-mo").value, d: $("#in-d").value,
    h: $("#in-h").value, mi: $("#in-mi").value, noTime: $("#in-noTime").checked,
    city: $("#in-city").value, lon: $("#in-lon").value, gender: $("#in-gender").value,
    fam: $("#nm-fam").value, giv: $("#nm-giv").value,
  };
  try { localStorage.setItem("saju.profile", JSON.stringify(p)); } catch (e) {}
  return p;
}
function restoreProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem("saju.profile") || "null"); } catch (e) {}
  if (!p) return false;
  $("#in-y").value = p.y || ""; $("#in-mo").value = p.mo || 1; $("#in-d").value = p.d || 1;
  $("#in-h").value = p.h || 12; $("#in-mi").value = p.mi || 0;
  $("#in-noTime").checked = !!p.noTime;
  $("#in-h").disabled = $("#in-mi").disabled = !!p.noTime;
  if (p.city) { $("#in-city").value = p.city; $("#lon-wrap").style.display = p.city === "custom" ? "" : "none"; }
  $("#in-lon").value = p.lon || ""; $("#in-gender").value = p.gender || "";
  $("#nm-fam").value = p.fam || ""; $("#nm-giv").value = p.giv || "";
  return !!p.y;
}

// ── 명식 세우기 ──────────────────────────────────────────
function currentInput() {
  const y = parseInt($("#in-y").value, 10);
  if (!y || y < 1900 || y > 2100) return null;
  const cityVal = $("#in-city").value;
  let longitude = null, trueSolar = false;
  if (cityVal === "custom") {
    const v = parseFloat($("#in-lon").value);
    if (!isNaN(v)) { longitude = v; trueSolar = true; }
  } else if (cityVal !== "none") { longitude = parseFloat(cityVal); trueSolar = true; }
  return {
    y, mo: +$("#in-mo").value, d: +$("#in-d").value,
    h: +$("#in-h").value, mi: +$("#in-mi").value,
    timeKnown: !$("#in-noTime").checked,
    longitude, trueSolar, jasiMode: "yaja", // 야자시(자정 기준)로 고정 — 단순함이 정확함보다 어려울 때가 있다
  };
}
function runSaju(scroll) {
  const inp = currentInput();
  if (!inp) { alert("연도를 1900~2100 사이로 입력해 주세요."); return false; }
  let chart;
  try { chart = buildChart(inp); } catch (err) { alert(err.message); return false; }
  lastChart = chart;
  lastResult = analyze(chart);
  // 명식이 바뀌면 대운·월운 선택은 새 명식 기준으로 다시 잡는다
  selDaeunIdx = null;
  for (const k of Object.keys(window)) if (k.startsWith("__selWol")) window[k] = null;
  saveProfile();
  renderToday();
  renderResult(chart, lastResult, scroll);
  return true;
}
$("#btn-run").addEventListener("click", () => runSaju(true));

// ── 오늘의 기운 ──────────────────────────────────────────
function renderToday() {
  const root = $("#today-card");
  root.innerHTML = "";
  if (!lastChart) return;
  const now = new Date();
  const dp = dayPillar(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const me = lastChart.day[0], myJi = lastChart.day[1];
  const gs = sipsin(me, dp[0], true), js = sipsin(me, dp[1], false);
  // 오늘의 포인트 컬러: 내 명식에 없는 오행 우선, 없으면 오늘 일진의 오행
  const zero = Object.entries(lastResult.ohaeng).filter(([, n]) => n === 0).map(([o]) => o);
  const pointOh = zero.length ? zero[0] : GAN_INFO[dp[0]][0];
  const streak = touchStreak();

  const c = el("div", "card today reveal");
  c.appendChild(el("h2", null,
    `오늘의 기운 <small style="color:#f4ead2;opacity:.6">일진은 매일 바뀝니다 · ${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} ${dp}(${HANJA_GAN[dp[0]]}${HANJA_JI[dp[1]]})일</small>` +
    (streak >= 2 ? `<span class="streak">🕯️ ${streak}일째 아침 문안</span>` : "")));

  // ① 오늘의 한 줄 (십성)
  c.appendChild(el("p", "tline", `오늘은 당신(${me}·${MULSANG[me]})에게 <b>${gs}·${js}</b>의 날 — ${TODAY_LINE[gs]}`));

  // ② 에너지 게이지 (십이운성)
  const stage = unseong12(me, dp[1]);
  const [pct, gemo, gnick, gline] = STAGE_META[stage];
  c.appendChild(el("div", "gaugewrap",
    `<div class="gemoji">${gemo}</div>` +
    `<div class="gmain"><div class="glab">오늘의 배터리 <b>${pct}%</b> — ${gnick}<small>십이운성 · ${stage}</small></div>` +
    `<div class="gtrack2"><div class="gfill2" style="width:${pct}%"></div></div></div>`));
  c.appendChild(el("p", "gdesc", gline));

  // ③ 60일에 한 번 '당신의 날' / 10일에 한 번 작은 공명
  if (dp === lastChart.day) {
    c.appendChild(el("div", "myday", `✨ 오늘은 <b>${dp}일</b> — 당신의 일주와 똑같은, <b>60일에 한 번 오는 '당신의 날'</b>입니다. 오늘 내린 결정은 유난히 '나답게' 남습니다.`));
  } else if (dp[0] === me) {
    c.appendChild(el("div", "trow", `<span class="tico">🌗</span><span>오늘 천간이 당신의 일간과 같은 <b>${me}</b> — 열흘에 한 번, 내 색이 진해지는 날입니다.</span>`));
  }

  // ④ 오늘 지지 × 내 일지 관계 (합·충·삼합)
  const [rIco, , rTxt] = jiRelation(myJi, dp[1]);
  c.appendChild(el("div", "trow", `<span class="tico">${rIco}</span><span>${rTxt}</span>`));

  // ⑤ 골든아워 — 오늘 지지와 합이 드는 시진
  const gh = YUKHAP[dp[1]];
  c.appendChild(el("div", "trow", `<span class="tico">⏰</span><span>오늘의 골든아워 — <b>${JI_HOURS[gh]}(${gh}시)</b>. 오늘 기운(${dp[1]})과 합이 드는 시간이라, 중요한 연락·결정은 이때가 부드럽습니다.</span>`));

  // ⑥ 포인트 컬러
  c.appendChild(el("div", "trow", `<span class="tico">🎨</span><span>오늘의 포인트 컬러 — <b>${OHAENG_COLOR[pointOh]}(${pointOh})</b>` +
    `<span class="chip" style="background:${OHAENG_HEX[pointOh]}">${pointOh}</span>` +
    (zero.length ? " · 명식에 드러나지 않은 기운을 곁에 두는 재미입니다." : "") + `</span>`));

  // ⑦ 절기 카운트다운
  try {
    const kstMin = tmin(now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes());
    const nj = monthJiAt(kstMin).next;
    if (nj) {
      const days = Math.ceil((nj.t - kstMin) / 1440);
      const oh = JI_INFO[nj.ji][0];
      c.appendChild(el("div", "trow", `<span class="tico">🌱</span><span>다음 절기 <b>${nj.name}</b>까지 ${days === 0 ? "<b>오늘!</b> 계절의 기운이 바뀌는 날입니다" : `<b>${days}일</b> — 계절의 기운이 ${oh}(${OHAENG_COLOR[oh]}) 쪽으로 넘어가는 중입니다`}.</span>`));
    }
  } catch (e) { /* 절기 조회 실패 시 생략 */ }

  // ⑧ 내일 예고 — 내일 또 올 이유
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  const dp2 = dayPillar(tm.getFullYear(), tm.getMonth() + 1, tm.getDate());
  const gs2 = sipsin(me, dp2[0], true);
  let tease = `🌙 <b>내일 예고</b> — 내일은 <b>${gs2}</b>, ${TOMORROW_TEASE[gs2]}.`;
  if (dp2 === lastChart.day) tease += " 게다가 <b>60일에 한 번 오는 '당신의 날'</b>입니다 — 놓치지 마세요.";
  else if (YUKHAP[myJi] === dp2[1]) tease += " 게다가 당신의 일지와 <b>합</b>이 드는 날 — 기대하셔도 좋습니다.";
  tease += " 내일 또 확인해 보세요.";
  c.appendChild(el("div", "tmrw", tease));

  root.appendChild(c);
}

// ── 결과 렌더링 (단계별 공개) ─────────────────────────────
function renderResult(chart, r, scroll) {
  const root = $("#result");
  root.innerHTML = "";
  let delay = 0;
  const put = (card) => {
    card.classList.add("reveal");
    card.style.animationDelay = delay + "s";
    delay += 0.22;
    root.appendChild(card);
  };

  // 1) 명식판
  const c1 = el("div", "card");
  c1.appendChild(el("h2", null, `당신의 카드 ${r.pillarCount * 2}장 <small>${r.pillarCount === 4 ? "사주(四柱) 여덟 글자" : "삼주(三柱) 여섯 글자 — 시 미상"}</small>`));
  const board = el("div", "board");
  const order = ["hour", "day", "month", "year"].filter((k) => chart[k]);
  const label = { hour: "시주 時柱", day: "일주 日柱", month: "월주 月柱", year: "연주 年柱" };
  for (const k of order) {
    const p = chart[k], d = r.detail[k];
    const col = el("div", "pillar");
    col.appendChild(el("div", "plabel", label[k]));
    const gOh = ohaengOfPos(p[0], true), jOh = ohaengOfPos(p[1], false);
    const ganCell = el("div", "cell" + (k === "day" ? " me" : ""));
    ganCell.style.background = OHAENG_HEX[gOh];
    ganCell.innerHTML = `<div class="hanja">${HANJA_GAN[p[0]]}</div><div class="hangul">${p[0]} · ${gOh}</div>` +
      `<span class="ss">${k === "day" ? "나 (일간)" : d.gan_sipsin}</span>` +
      (k === "day" ? `<span class="mebadge">★나</span>` : "");
    const jiCell = el("div", "cell");
    jiCell.style.background = OHAENG_HEX[jOh];
    jiCell.innerHTML = `<div class="hanja">${HANJA_JI[p[1]]}</div><div class="hangul">${p[1]} · ${jOh} · ${TTI[p[1]]}</div>` +
      `<span class="ss">${d.ji_sipsin}</span>`;
    col.appendChild(ganCell); col.appendChild(jiCell);
    board.appendChild(col);
  }
  c1.appendChild(board);
  const bd = el("div", "badges");
  bd.appendChild(el("span", "badge", `일간 <b>${r.ilgan.char}(${HANJA_GAN[r.ilgan.char]})</b> — ${r.ilgan.mulsang} (${r.ilgan.eumyang}${r.ilgan.ohaeng})`));
  bd.appendChild(el("span", "badge", `일주 동물: <b>${IT.COLOR_KO[r.ilgan.ohaeng]} ${TTI[chart.day[1]]}</b> 🐾`));
  bd.appendChild(el("span", "badge", `사주 기준 연도: ${chart.sajuYear}년 (${chart.year}년)`));
  c1.appendChild(bd);
  for (const w of chart.warnings) c1.appendChild(el("div", "warn", "⚠ " + w));
  if (chart.notes.length) c1.appendChild(el("div", "notice", chart.notes.map((s) => "· " + s).join("<br>")));
  put(c1);

  // 2) 분포
  const c2 = el("div", "card");
  c2.appendChild(el("h2", null, "다섯 기운의 저울 <small>오행 · 십성 분포</small>"));
  c2.appendChild(el("h4", "sec", "오행 분포 (일간 포함)"));
  c2.appendChild(makeBars(["목", "화", "토", "금", "수"].map((o) => [`${o}(${OHAENG_COLOR[o]})`, r.ohaeng[o], OHAENG_HEX[o]]), r.pillarCount * 2));
  c2.appendChild(el("h4", "sec", "십성 다섯 그룹"));
  c2.appendChild(makeBars(["비겁", "식상", "재성", "관성", "인성"].map((g) => [g, r.group[g], GROUP_COLOR[g]]), r.pillarCount * 2 - 1));
  c2.appendChild(el("div", "notice", Object.entries(INTERP_DB.group_meaning).map(([g, t]) => `<b style="color:${GROUP_COLOR[g]}">${g}</b> ${t}`).join(" · ")));
  const tbl = el("table", "sstable");
  tbl.innerHTML = "<tr>" + SIPSIN_ALL.map((s) => `<th>${s}</th>`).join("") + "</tr>" +
    "<tr>" + SIPSIN_ALL.map((s) => `<td>${r.counts[s] || "·"}</td>`).join("") + "</tr>";
  c2.appendChild(tbl);
  put(c2);

  // 3) 리포트 — 이야기 형식
  const c3 = el("div", "card report");
  c3.appendChild(el("h2", null, `기질 리포트 <small>진단서이지 판결문이 아닙니다</small>`));
  c3.appendChild(el("div", "nickbox",
    `<span>당신은</span><b>${IT.nickname(r)}</b>` +
    `<i class="poetic">“${IT.poeticName(r)}”</i>`));
  c3.appendChild(el("div", "headline", IT.headline(r)));
  // 정직한 지표 3종
  const gbox = el("div", "gauges");
  for (const g of IT.gauges(r)) {
    const b = el("div", "gauge");
    b.innerHTML = `<div class="gtop"><span>${g.label}</span><b>${g.raw || g.val + g.unit}</b></div>` +
      `<div class="gtrack"><div class="gfill" style="width:${g.val}%"></div></div>` +
      `<div class="gends"><span>${g.lo}</span><span>${g.hi}</span></div>` +
      `<p>${g.note}</p>`;
    gbox.appendChild(b);
  }
  c3.appendChild(gbox);
  c3.appendChild(el("p", "hint", "※ 이 수치는 운세 점수가 아니라 <b>당신 명식의 실제 구조를 잰 값</b>입니다. 높다고 좋고 낮다고 나쁜 게 아닙니다. 그런 점수를 매기는 건 정직하지 않다고 생각합니다."));
  for (const blk of IT.buildReport(chart, r)) {
    const sec = el("div", "rsec");
    sec.appendChild(el("h3", "rhead", `<span class="ricon">${blk.icon}</span>${blk.head}`));
    sec.appendChild(el("div", "rbody", blk.body));
    c3.appendChild(sec);
  }
  c3.appendChild(el("em", "quote", `“${INTERP_DB.closing_message.core}”`));
  const btnRow = el("div", "center");
  const copyBtn = el("button", "btn2", "📋 결과 복사하기");
  copyBtn.style.marginTop = "14px";
  copyBtn.onclick = () => copySummary(chart, r, copyBtn);
  const printBtn = el("button", "btn2", "🖨️ 인쇄 · PDF로 저장");
  printBtn.style.cssText = "margin-top:14px;margin-left:8px";
  printBtn.onclick = () => window.print();
  btnRow.appendChild(copyBtn); btnRow.appendChild(printBtn);
  c3.appendChild(btnRow);
  put(c3);

  // 3-2) 분야별 풀이
  const cc = el("div", "card");
  cc.appendChild(el("h2", null, "분야별로 보면 <small>일 · 돈 · 사람 · 마음</small>"));
  for (const cat of IT.categories(r)) {
    const sec = el("div", "rsec");
    sec.appendChild(el("h3", "rhead", `<span class="ricon">${cat.icon}</span>${cat.title}`));
    sec.appendChild(el("div", "rbody", cat.lines.map((l) => `<p>${l}</p>`).join("")));
    cc.appendChild(sec);
  }
  put(cc);

  // 3-3) 행운 세트
  const L = IT.luckySet(r);
  const cl = el("div", "card");
  cl.appendChild(el("h2", null, "당신을 채워주는 것들 <small>보완 오행에서 뽑은 전통 배속</small>"));
  cl.appendChild(el("div", "rbody", `<p>${L.why}</p>`));
  const lgrid = el("div", "luckygrid");
  for (const [k, v] of [["색", L.color], ["방향", L.dir], ["숫자", L.num], ["시간", L.hour], ["한 글자", L.word], ["소품", L.item]]) {
    const it = el("div", "luckyitem");
    it.innerHTML = `<span>${k}</span><b>${v}</b>`;
    it.style.borderTopColor = L.hex;
    lgrid.appendChild(it);
  }
  cl.appendChild(lgrid);
  cl.appendChild(el("div", "notice", "부적처럼 믿으실 건 없습니다. 다만 <b>내게 부족한 기운을 의식하며 사는 것</b> 자체가 꽤 좋은 습관입니다. 오늘 " + L.color + " 하나만 걸쳐보셔도 좋고요."));
  put(cl);

  // 3-4) 같은 사주를 가진 사람들
  const co = el("div", "card");
  co.appendChild(el("h2", null, "나와 같은 사주를 가진 사람 <small>진짜로 계산해 봤습니다</small>"));
  co.appendChild(el("div", "rbody", IT.cohort(chart, r)));
  put(co);

  // 4) 다음 안내
  const c4 = el("div", "card");
  c4.appendChild(el("h2", null, "다음 카드가 기다립니다 🌊"));
  c4.appendChild(el("p", null, `기질이 "자동차"라면, 이제 "도로"를 볼 차례 — 상단의 <b>운의 흐름</b> 탭에서 10년 단위 대운 타임라인과 올해·월별 기운을 볼 수 있습니다.` +
    (($("#in-gender").value) ? "" : " (대운 방향 계산을 위해 성별을 선택해 주세요)") +
    ` <b>이름 풀이</b> 탭에서는 이름 소리가 품은 오행이 사주의 빈 곳을 채우는지도 확인합니다.`));
  put(c4);

  if (scroll) root.scrollIntoView({ behavior: "smooth" });
  renderFortune();
}

function makeBars(items, max) {
  const box = el("div", "bars");
  for (const [name, n, color] of items) {
    const bar = el("div", "bar");
    bar.appendChild(el("span", "bl", name));
    const track = el("div", "bt");
    const fill = el("div", "bf");
    fill.style.background = color;
    fill.style.width = (max ? (n / max) * 100 : 0) + "%";
    track.appendChild(fill);
    bar.appendChild(track);
    bar.appendChild(el("span", "bn", String(n)));
    box.appendChild(bar);
  }
  return box;
}


function copySummary(chart, r, btn) {
  const L = IT.luckySet(r);
  const lines = [
    `🎴 나는 "${IT.nickname(r)}" — “${IT.poeticName(r)}”`,
    `명식 — ${["hour", "day", "month", "year"].filter((k) => chart[k]).reverse().map((k) => chart[k]).join(" ")}`,
    `일간 ${r.ilgan.char}(${r.ilgan.mulsang}) · 일주 동물 ${r.ilju_animal}`,
    `많은 기질: ${r.dominant.join(", ") || "고른 분포"} / 드러나지 않는 기질: ${r.absent.join(", ") || "없음"}`,
    `오행: ` + Object.entries(r.ohaeng).map(([o, n]) => `${o}${n}`).join(" "),
    `채워주는 것: ${L.color} · ${L.dir} · ${L.num} · "${L.word}"`,
    `— 사주·관상 (오프라인 자기이해 도구)`,
  ];
  const txt = lines.join("\n");
  const done = () => { btn.textContent = "✅ 복사됨!"; setTimeout(() => (btn.textContent = "📋 결과 복사하기"), 1500); };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done).catch(() => prompt("복사해 주세요:", txt));
  else prompt("복사해 주세요:", txt);
}

// ── 운의 흐름 탭 ─────────────────────────────────────────
let selDaeunIdx = null;
function renderFortune() {
  const root = $("#fortune-body");
  root.innerHTML = "";
  if (!lastChart) {
    root.appendChild(el("div", "card", `<p class="notice">먼저 [사주] 탭에서 명식을 펼쳐 주세요. 자동차(기질)를 알아야 도로(운)를 읽을 수 있습니다.</p>`));
    return;
  }
  const gender = $("#in-gender").value;
  const chart = lastChart, me = chart.day[0];
  const nowY = new Date().getFullYear();

  // 안내 카드 — 접이식으로 압축
  const c0 = el("div", "card");
  c0.innerHTML = `<details class="intro"><summary>🚗 운을 읽는 법 — 점수가 아니라 타이밍입니다 (펼쳐 보기)</summary>
    <div class="gdbody">
    <p><b>사주는 자동차, 대운은 도로, 세운은 그 해의 교통상황</b>입니다. 트럭이 스포츠카보다 나쁜 게 아니듯 — 비포장길에선 트럭이 잘 달립니다.</p>
    <p class="tip">→ 이 화면이 묻는 건 하나. <b>지금이 나아갈 때인가, 채울 때인가, 다질 때인가.</b></p>
    </div></details>`;
  root.appendChild(c0);

  // 대운
  const c1 = el("div", "card");
  c1.appendChild(el("h2", null, "인생 대운 타임라인 <small>10년마다 바뀌는 도로</small>"));
  if (!gender) {
    c1.appendChild(el("p", "notice", "대운은 연간의 음양과 성별로 순행/역행이 갈립니다. [사주] 탭에서 성별을 선택하면 타임라인이 열립니다."));
  } else {
    const du = daeun(chart, gender, "floor");
    c1.appendChild(el("p", "hint",
      `${chart.year}년(${GAN_INFO[chart.year[0]][1] > 0 ? "양간" : "음간"}) ${gender === "M" ? "남자" : "여자"} → <b>${du.forward ? "순행" : "역행"}</b> · 대운수 <b>${du.su}</b>`));
    const tlBox = el("div", "timeline");
    let nowIdx = null;
    du.periods.forEach((p, i) => {
      const isNow = nowY >= p.startYear && nowY < p.startYear + 10;
      if (isNow) nowIdx = i;
      const isPast = p.startYear + 10 <= nowY;
      const card = el("div", "tl" + (isNow ? " now" : "") + (isPast ? " past" : ""));
      const flow = IT.FLOW[SIPSIN_GROUP[p.jiSipsin]];
      card.innerHTML = `<div class="age">${p.startAge}~${p.endAge}세 · ${p.startYear}~</div>` +
        `<div class="gz" style="color:${OHAENG_HEX[ohaengOfPos(p.gan, true)]}">${HANJA_GAN[p.gan]}${HANJA_JI[p.ji]}</div>` +
        `<div class="flow">${flow.emoji} ${flow.t}</div>` +
        `<div class="sslabel">${p.ganSipsin}·${p.jiSipsin}</div>` +
        (isNow ? `<div class="nowtag">◉ 지금 여기</div>` : "");
      card.onclick = () => { selDaeunIdx = i; renderFortune(); };
      tlBox.appendChild(card);
    });
    c1.appendChild(tlBox);
    if (selDaeunIdx == null) selDaeunIdx = nowIdx != null ? nowIdx : 0;
    const p = du.periods[selDaeunIdx];
    if (p) {
      const phase = (p.startYear + 10 <= nowY) ? "past" : (nowY >= p.startYear ? "now" : "future");
      const st = IT.daeunStory(p, phase);
      const det = el("div", "tldetail");
      det.appendChild(el("h3", "rhead",
        `<span class="ricon">${IT.FLOW[SIPSIN_GROUP[p.jiSipsin]].emoji}</span>${st.head} <span class="gzsmall">${p.pillar}(${HANJA_GAN[p.gan]}${HANJA_JI[p.ji]})</span>`));
      det.appendChild(el("div", "rbody", st.body));
      c1.appendChild(det);
      c1.appendChild(el("p", "hint", "다른 구간을 눌러 보세요. 지나온 시기부터 읽으면 “아, 그때 그랬지” 하는 순간이 옵니다 — 그게 맞으면 앞으로의 구간도 같은 방식으로 읽으시면 됩니다."));
    }
  }
  root.appendChild(c1);

  // 지금 위치 · 지금의 분야별 · 지금 할 것 (성별 입력 시)
  const curSeun = seun(chart, nowY);
  if (gender) {
    const du = daeun(chart, gender, "floor");
    const cm = el("div", "card");
    cm.appendChild(el("h2", null, "지금 당신은 여기쯤 📍 <small>인생 지도에서의 현재 위치</small>"));
    cm.appendChild(el("div", "rbody", IT.lifeMap(du, nowY, chart.input.y)));
    root.appendChild(cm);

    const curDu = du.periods.find((p) => nowY >= p.startYear && nowY < p.startYear + 10);
    const act = IT.activeNow(curDu, curSeun);

    const cn = el("div", "card");
    cn.appendChild(el("h2", null, "지금 이 시기를 분야별로 <small>평생 기질이 아니라 <b>지금</b>의 국면입니다</small>"));
    cn.appendChild(el("p", "hint", `지금 활발한 기운: ${act.list.map((x) => `<b>${x.s}</b>(${x.src})`).join(" · ")}`));
    for (const cat of IT.nowCategories(act)) {
      const sec = el("div", "rsec");
      sec.appendChild(el("h3", "rhead", `<span class="ricon">${cat.icon}</span>${cat.title}`));
      sec.appendChild(el("div", "rbody", cat.lines.map((l) => `<p>${l}</p>`).join("")));
      cn.appendChild(sec);
    }
    root.appendChild(cn);

    const pr = IT.nowPrescription(act);
    const cp = el("div", "card");
    cp.appendChild(el("h2", null, "그래서 지금은 이렇게 ✅ <small>이 시기에 유리한 것 · 미뤄도 되는 것</small>"));
    const two = el("div", "twocol");
    two.innerHTML =
      `<div class="colbox do"><h4>지금 하면 잘 되는 것</h4><ul>${pr.doList.map((x) => `<li>${x}</li>`).join("")}</ul></div>` +
      `<div class="colbox wait"><h4>지금은 미뤄도 되는 것</h4><ul>${pr.waitList.map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
    cp.appendChild(two);
    cp.appendChild(el("div", "notice", "'미뤄도 되는 것'은 <b>하면 안 된다</b>는 뜻이 아닙니다. 지금은 힘이 더 든다는 뜻이고, 꼭 해야 한다면 그만큼 준비를 더 하시면 됩니다. 운은 금지 목록이 아니라 난이도 표시에 가깝습니다."));
    root.appendChild(cp);
  }

  // 세운
  for (const yy of [nowY, nowY + 1]) {
    const s = seun(chart, yy);
    const st = IT.seunStory(s, yy, yy === nowY);
    const c2 = el("div", "card");
    c2.appendChild(el("h2", null, `${st.title} <small>${yy === nowY ? "올해" : "내년"} · 입춘부터 적용</small>`));
    c2.appendChild(el("div", "rbody", st.body));
    root.appendChild(c2);
  }

  // 같은 해를 지나는 사람들
  const cs = el("div", "card");
  cs.appendChild(el("h2", null, "같은 해를 지나는 사람들 <small>왜 띠별 운세는 잘 안 맞을까</small>"));
  cs.appendChild(el("div", "rbody", IT.seunCohort(chart, curSeun, nowY)));
  root.appendChild(cs);

  // 월운 — 3개월씩 네 묶음으로 콤팩트하게 · 올해와 내년
  const QGLOSS = {
    "비겁": "내 기준과 페이스가 또렷해지는 결",
    "식상": "안의 것을 밖으로 꺼내기 좋은 결",
    "재성": "벌인 일이 실속으로 잡히는 결",
    "관성": "자리를 다지고 신뢰가 쌓이는 결",
    "인성": "속도를 늦추고 채우기 좋은 결",
  };
  const nowM = new Date().getMonth() + 1;
  for (const yy of [nowY, nowY + 1]) {
    const c3 = el("div", "card");
    c3.appendChild(el("h2", null, `${yy}년 열두 달의 기운 <small>절기 기준 · 3개월씩 네 묶음</small>`));
    const w = wolun(chart, yy);
    for (let q = 0; q < 4; q++) {
      const ms = w.slice(q * 3, q * 3 + 3);
      if (ms.length < 3) continue;
      // 우세 흐름: 석 달의 월지+월간 십성 6개로 계산 (월간이 해마다 달라 연도별 차이가 살아난다)
      const toks = [];
      ms.forEach((m, mi) => {
        toks.push({ g: SIPSIN_GROUP[m.jiSipsin], s: m.jiSipsin, mi });
        toks.push({ g: SIPSIN_GROUP[m.ganSipsin], s: m.ganSipsin, mi });
      });
      const cnt = {};
      toks.forEach((t) => (cnt[t.g] = (cnt[t.g] || 0) + 1));
      const dom = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
      const fl = IT.FLOW[dom];
      const domTok = toks.find((t) => t.g === dom);
      const domIdx = domTok.mi, domSip = domTok.s;
      const kwFirst = IT.MONTH[ms[0].jiSipsin][0], kwLast = IT.MONTH[ms[2].jiSipsin][0];
      const sec = el("div", "rsec");
      sec.appendChild(el("h3", "rhead",
        `<span class="ricon">${fl.emoji}</span>${ms[0].label}~${ms[2].label} — ${fl.t}`));
      const monthLine = ms.map((m) => {
        const isNow = yy === nowY && m.label === nowM + "월";
        return `<b>${m.label}</b> ${IT.MONTH[m.jiSipsin][0]}${isNow ? " ◉" : ""}`;
      }).join(" &nbsp;·&nbsp; ");
      const arc = kwFirst === kwLast
        ? `석 달 내내 <b>「${kwFirst}」</b>의 결이 이어집니다.`
        : `<b>「${kwFirst}」</b>로 열어 <b>「${kwLast}」</b>로 닫는 석 달입니다.`;
      // 연도별 뉘앙스: 월간(해마다 바뀜)의 우세 결이 지지 흐름과 다르면 한 줄 덧입힌다
      const gcnt = {};
      ms.forEach((m) => { const g = SIPSIN_GROUP[m.ganSipsin]; gcnt[g] = (gcnt[g] || 0) + 1; });
      const gTop = Object.entries(gcnt).sort((a, b) => b[1] - a[1])[0][0];
      const overlay = gTop !== dom ? ` 그리고 ${yy}년에는 여기에 <b>${IT.FLOW[gTop].verb}</b> 기운이 함께 흐릅니다.` : "";
      sec.appendChild(el("div", "rbody",
        `<p>${monthLine}</p>` +
        `<p>${arc} 큰 흐름은 <b>${fl.t}</b> — ${QGLOSS[dom]}입니다.${overlay}</p>` +
        `<p class="tip">→ <b>${ms[domIdx].label} 포인트</b> — ${IT.MONTH[domSip][1]}</p>`));
      c3.appendChild(sec);
    }
    root.appendChild(c3);
  }

  const c4 = el("div", "card");
  c4.appendChild(el("div", "rbody",
    `<p>마지막으로 하나만 더 말씀드리겠습니다. 운을 보는 이유는 좋은 때를 기다리기 위해서가 아닙니다.</p>` +
    `<p><b>안 풀리는 시기에 "내가 못나서 그런 게 아니구나" 하고 자기를 덜 미워하기 위해서</b>고, 잘 풀리는 시기에 "지금이 그때구나" 하고 한 번 더 힘내기 위해서입니다. 그거면 충분합니다.</p>`));
  c4.appendChild(el("em", "quote", `“${INTERP_DB.un.purpose}”`));
  root.appendChild(c4);
}
$("#in-gender").addEventListener("change", () => { saveProfile(); renderFortune(); });

// ── 이름 풀이 탭 ─────────────────────────────────────────
// 성씨의 관용 한자 — 성 자리 후보에서 맨 앞에 놓고 자동 선택
const SURNAME_HANJA = { "김": "金", "이": "李", "박": "朴", "최": "崔", "정": "鄭", "강": "姜", "조": "趙", "윤": "尹", "장": "張", "임": "林", "한": "韓", "오": "吳", "서": "徐", "신": "申", "권": "權", "황": "黃", "안": "安", "송": "宋", "전": "全", "홍": "洪", "유": "柳", "고": "高", "문": "文", "양": "梁", "손": "孫", "배": "裵", "백": "白", "허": "許", "남": "南", "심": "沈", "노": "盧", "하": "河", "곽": "郭", "성": "成", "차": "車", "주": "朱", "우": "禹", "구": "具", "나": "羅", "민": "閔", "류": "柳", "진": "陳", "지": "池", "엄": "嚴", "채": "蔡", "원": "元", "천": "千", "방": "方", "공": "孔", "현": "玄", "함": "咸", "변": "卞", "염": "廉", "여": "呂", "추": "秋", "도": "都", "소": "蘇", "석": "石", "선": "宣", "설": "薛", "마": "馬", "길": "吉", "연": "延", "표": "表", "명": "明", "기": "奇", "반": "潘", "금": "琴", "옥": "玉", "육": "陸", "인": "印", "맹": "孟", "탁": "卓", "국": "鞠", "어": "魚", "은": "殷", "편": "片", "용": "龍" };

// 글자별 한자 피커: HANJA_DB[독음] = [[한자, 원획, 필획, 자원|null, 훈음], ...]
function refreshStrokeInputs() {
  const fam = $("#nm-fam").value.trim(), giv = $("#nm-giv").value.trim();
  const box = $("#nm-hanja");
  box.innerHTML = "";
  const chars = (fam + giv).split("");
  chars.forEach((ch, i) => {
    const isFam = i < fam.length;
    const f = el("div", "field");
    f.appendChild(el("label", null, `${esc(ch)}${isFam ? " (성)" : ""}`));
    const sel = document.createElement("select");
    sel.className = "nm-hj"; sel.dataset.idx = i; sel.style.maxWidth = "230px";
    sel.appendChild(new Option("한자 안 씀 / 모름", ""));
    const cands = (typeof HANJA_DB !== "undefined" && HANJA_DB[ch]) || [];
    // 성 자리는 관용 성씨 한자를 맨 앞에
    let order = cands.map((_, k) => k);
    let autoPick = null;
    if (isFam && SURNAME_HANJA[ch]) {
      const si = cands.findIndex((c) => c[0] === SURNAME_HANJA[ch]);
      if (si >= 0) { order = [si].concat(order.filter((k) => k !== si)); autoPick = si; }
    }
    for (const k of order) {
      const [hz, won, pil, jw, hun] = cands[k];
      const isSurname = isFam && hz === SURNAME_HANJA[ch];
      sel.appendChild(new Option(`${hz} ${hun} · ${won}획${jw ? " · " + jw : ""}${isSurname ? "  ★성씨" : ""}`, k));
    }
    if (!cands.length && /[가-힣]/.test(ch)) sel.appendChild(new Option("(후보 없음)", ""));
    if (autoPick != null) sel.value = autoPick;
    f.appendChild(sel);
    box.appendChild(f);
  });
}
$("#nm-fam").addEventListener("input", refreshStrokeInputs);
$("#nm-giv").addEventListener("input", refreshStrokeInputs);

function pickedHanja(chars) {
  const sels = [...document.querySelectorAll(".nm-hj")];
  if (sels.length !== chars.length) return null;
  const out = sels.map((sel, i) => {
    if (sel.value === "") return null;
    const c = HANJA_DB[chars[i]] && HANJA_DB[chars[i]][+sel.value];
    if (!c) return null;
    return { ch: c[0], won: c[1], pil: c[2], jawon: c[3], hun: c[4] };
  });
  return out.some((h) => h) ? out : null;
}

$("#btn-name").addEventListener("click", () => {
  const fam = $("#nm-fam").value.trim(), giv = $("#nm-giv").value.trim();
  if (!fam || !giv) { alert("성과 이름을 한글로 입력해 주세요."); return; }
  const chars = (fam + giv).split("");
  let res;
  try {
    res = analyzeName({
      family: fam, given: giv, school: "classic", // 발음오행은 전통 다수설로 통일
      hanja: pickedHanja(chars),
      sajuOhaeng: lastResult ? lastResult.ohaeng : null,
    });
  } catch (err) { alert(err.message); return; }
  saveProfile();
  renderName(res, fam, giv);
});

function renderName(r, fam, giv) {
  const root = $("#name-result");
  root.innerHTML = "";
  let delay = 0;
  const put = (c) => { c.classList.add("reveal"); c.style.animationDelay = delay + "s"; delay += 0.2; root.appendChild(c); };
  const VC = { "상생": "#2E7D5B", "순환": "#B8860B", "긴장": "#5b6c8f" };
  const VT = {
    "상생": "소리가 서로를 살려 주는 배열입니다. 부를수록 기운이 도는 이름입니다.",
    "순환": "극(剋) 없이 이어지는 무난하고 안정적인 배열입니다.",
    "긴장": "소리 사이에 긴장이 있는 배열입니다 — 결함이 아니라, 강단과 개성을 만드는 구조로도 읽습니다. 극(剋)은 통제와 절제를 만드는 힘이기도 합니다.",
  };
  const hasHanja = r.jawon && r.jawon.items.some((h) => h);

  // ① 이름 프로필 — 한 장의 명함
  {
    const c = el("div", "card");
    c.appendChild(el("h2", null, "이름의 명함 <small>이 세 글자에 대해 알아두면 좋은 것들</small>"));
    const big = el("div", "nameface");
    big.innerHTML =
      `<div class="nf-kor">${esc(fam + giv)}</div>` +
      (hasHanja ? `<div class="nf-hanja">${r.jawon.items.map((h, i) => h ? h.ch : esc(r.syl[i].ch)).join(" ")}</div>` : "") +
      `<div class="nf-roman">${IT.romanize(fam, giv)}</div>`;
    c.appendChild(big);
    const rows = [];
    rows.push(["로마자 표기", `${IT.romanize(fam, giv)} <span class="soft-inline">(성씨는 관용 표기, 이름은 국어의 로마자 표기법)</span>`]);
    if (hasHanja) {
      rows.push(["뜻", r.jawon.items.filter((h) => h).map((h) => `${h.ch} ${esc(h.hun)}`).join(" · ")]);
      rows.push(["획수 (원획)", r.jawon.items.filter((h) => h).map((h) => `${h.ch} ${h.won}획`).join(" · ")]);
    }
    rows.push(["소리의 오행", r.syl.map((s) => `${esc(s.ch)}→${s.choOh}`).join(" · ") + ` <span class="vbadge sm" style="background:${VC[r.pronVerdict]}">${r.pronVerdict}</span>`]);
    if (hasHanja && r.jawon.ohs.length)
      rows.push(["뿌리의 오행 (자원)", r.jawon.items.map((h, i) => h ? `${h.ch}→${h.jawon || "—"}` : `${esc(r.syl[i].ch)}→?`).join(" · ")]);
    rows.push(["모음의 리듬", r.eyArr.join(" · ") + (r.eyVerdict === "조화" ? " — 높낮이가 살아 있는 이름" : r.eyVerdict === "중성" ? " — 담백하고 단정한 이름" : " — 한길로 곧은 이름")]);
    const tbl = el("table", "nametable");
    tbl.innerHTML = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
    c.appendChild(tbl);
    put(c);
  }

  // ② 뿌리 · 꽃 · 열매
  const rff = IT.rootFlowerFruit(r, fam, giv);
  {
    const c = el("div", "card");
    c.appendChild(el("h2", null, `뿌리 · 꽃 · 열매 <small>세 글자의 자리 — ${rff.basis}</small>`));
    c.appendChild(el("div", "rbody",
      `<p>전통 작명은 이름 세 글자를 한 그루 나무로 봤습니다. <b>성은 뿌리, 가운뎃자는 꽃, 끝자는 열매.</b> 글자마다 맡은 자리가 다릅니다.</p>`));
    const row = el("div", "rffrow");
    rff.slots.forEach((s, i) => {
      if (i > 0) {
        const rel = i === 1 ? rff.rel1 : rff.rel2;
        if (rel) {
          const a = el("div", "rffarrow " + (rel === "상극" ? "tension" : "flow"));
          a.innerHTML = rel === "상생" ? "→<small>생</small>" : rel === "비화" ? "＝<small>동행</small>" : "⚡<small>긴장</small>";
          row.appendChild(a);
        }
      }
      const b = el("div", "rffbox");
      b.style.borderTopColor = OHAENG_HEX[s.oh];
      b.innerHTML = `<div class="rff-ic">${s.icon}</div><div class="rff-pos">${s.pos}</div>` +
        `<div class="rff-ch" style="color:${OHAENG_HEX[s.oh]}">${s.hanja || esc(s.ch)}</div>` +
        (s.hun ? `<div class="rff-hun">${esc(s.hun)}</div>` : `<div class="rff-hun">${esc(s.ch)}</div>`) +
        `<div class="rff-oh"><span class="chip" style="background:${OHAENG_HEX[s.oh]}">${s.oh}</span></div>` +
        `<p>${s.desc}</p>`;
      row.appendChild(b);
    });
    c.appendChild(row);
    c.appendChild(el("div", "rbody", rff.story));
    c.appendChild(el("div", "rbody", IT.rffHumanity(rff)));
    put(c);
  }

  // ③ 소리의 오행 — 3경로 판정
  {
    const c = el("div", "card");
    c.appendChild(el("h2", null, `소리로 다시 듣기 <small>발음오행 · ${r.schoolLabel}</small>`));
    c.appendChild(el("div", "rbody", IT.nameOpening(r, fam, giv)));
    const chips = el("div", "namechips");
    for (const s of r.syl) {
      const chip = el("div", "nchip");
      chip.style.background = OHAENG_HEX[s.choOh];
      chip.innerHTML = `<div class="big">${esc(s.ch)}</div><small>초성 ${s.cho} → ${s.choOh}(${OHAENG_COLOR[s.choOh]})</small>` +
        (s.jong ? `<small>받침 ${s.jong} → ${s.jongOh}</small>` : "");
      chips.appendChild(chip);
    }
    c.appendChild(chips);
    c.appendChild(el("div", "relrow", `종합 판정 <span class="vbadge" style="background:${VC[r.pronVerdict]}">${r.pronVerdict} 구조</span>`));
    c.appendChild(el("p", null, VT[r.pronVerdict]));
    const pl = el("ul", "plain");
    for (const p of r.paths) {
      const rels = p.rels.map((x) => `${x.from.oh}${x.rel === "상생" ? "→" : x.rel === "비화" ? "=" : "⚡"}${x.to.oh}`).join(" ");
      pl.appendChild(el("li", null, `<b>${p.id}</b>: ${rels || "-"} → ${p.verdict}`));
    }
    c.appendChild(el("h4", "sec", "판정 근거 — 세 경로 중 하나만 통해도 좋은 배열로 봅니다"));
    c.appendChild(pl);
    c.appendChild(el("div", "notice", "일부 서비스는 ① 경로 하나만 보고 '나쁜 이름'이라 겁을 주고 개명을 권합니다. 전통 성명학은 세 경로를 모두 보며, 학파(설정)에 따라서도 결과가 달라집니다 — 이름은 그렇게 쉽게 '나쁜 것'이 되지 않습니다."));
    c.appendChild(el("div", "rbody", IT.soundHumanity(r)));
    put(c);
  }

  // ④ 불용한자 이야기 (한자 선택 시)
  if (hasHanja) {
    const hits = IT.bulyongCheck(r);
    const c = el("div", "card");
    c.appendChild(el("h2", null, "불용한자(不用漢字) 이야기 <small>옛 작명가들이 피하던 글자들</small>"));
    if (hits && hits.length) {
      let s = "";
      for (const h of hits)
        s += `<p>당신 이름의 <b>${h.ch}(${esc(h.hun)})</b>은 전통 작명에서 이른바 불용한자로 꼽히던 글자입니다. 이유는 — <b>${IT.BULYONG_REASON[h.cat]}</b>이기 때문입니다.</p>`;
      s += `<p class="soft">겁내실 필요는 없습니다. 이건 금기라기보다 옛사람들의 겸손 — "이름은 그릇이니 뜻을 너무 가득 담지 말라"는 감각에 가깝습니다. 현대 작명에서는 오히려 개성으로 보기도 하고, 실제로 이 글자를 쓰고 잘 사는 사람이 셀 수 없이 많습니다. 다만 이런 전통이 있었다는 걸 알고 있으면, 어른들이 왜 그런 말씀을 하시는지 이해가 됩니다.</p>`;
      c.appendChild(el("div", "rbody", s));
    } else {
      c.appendChild(el("div", "rbody",
        `<p>확인 결과, 당신 이름에는 전통 불용한자가 <b>없습니다</b>. ✓</p>` +
        `<p class="soft">불용한자란 天(하늘)·龍(용)·福(복)처럼 뜻이 너무 크거나, 복을 미리 못 박아 두는 글자를 이름에 피하던 전통입니다. "이름은 그릇이니 뜻을 너무 가득 담지 말라"는 옛사람들의 겸손이었죠. 당신 이름은 그 기준에서도 무난하게 지어진 이름입니다.</p>`));
    }
    put(c);
  }

  // ⑤ 수리로 본 인생의 능선 (한자 획수 있을 때)
  {
    const c = el("div", "card");
    c.appendChild(el("h2", null, "수리로 본 인생의 능선 <small>네 개의 수가 나이 구간을 하나씩 맡습니다</small>"));
    const bands = IT.suriAgeBands(r, fam, giv);
    if (bands) {
      c.appendChild(el("div", "rbody",
        `<p>수리사격은 이름 획수를 네 가지로 조합해, 각 수가 <b>인생의 한 구간씩</b> 맡는다고 본 이론입니다. 어떤 글자끼리 합쳐 그 시기를 만드는지 함께 보여드립니다.</p>`));
      c.appendChild(el("div", "ridge", IT.suriRidgeSVG(bands)));
      c.appendChild(el("p", "hint", "※ 이 곡선은 미래 예측 그래프가 아닙니다. 전통 81수리표의 분류(최상~최흉)를 나이 구간에 그대로 얹어 그린 것으로, 출처가 분명한 그림입니다."));
      const CAT_COLOR = { "최상": "#196f4e", "상": "#2E7D5B", "길": "#5b8a5e", "중": "#B8860B", "흉": "#8a7a9e", "최흉": "#7a6a8e" };
      for (const b of bands) {
        const sec = el("div", "rsec");
        sec.appendChild(el("h3", "rhead",
          `<span class="ricon">⛰️</span>${b.age} <span class="gzsmall">${b.combo} = ${b.s.num}획 · ${b.s.label}</span>`));
        sec.appendChild(el("div", "rbody",
          `<p><b>${b.s.reduced}수 ${b.s.name}</b><span class="cat" style="background:${CAT_COLOR[b.s.cat]};margin-left:8px">${b.s.cat}</span></p>` +
          `<p><b>이 수의 뜻</b> — ${IT.SURI_MEANING[b.s.reduced] || ""}</p>` +
          `<p>${IT.SURI_CAT_TONE[b.s.cat]}</p>` +
          `<p class="soft">왜 이 글자들인가 — ${b.note}</p>`));
        c.appendChild(sec);
      }
      // 등장한 분류의 압축 문장 풀이 — "이 말이 무슨 뜻인가요?"
      const usedCats = [...new Set(bands.map((b) => b.s.cat))];
      c.appendChild(el("div", "rbody",
        `<h4 class="sec">위에 나온 말들, 풀어서 드리겠습니다</h4>` +
        usedCats.map((cat) =>
          `<p><b>「${IT.SURI_CAT_TONE[cat].split("—")[0].split(".")[0].trim()}」</b><br>${IT.SURI_CAT_PLAIN[cat]}</p>`
        ).join("")));
      c.appendChild(el("div", "rbody",
        `<h4 class="sec">능선을 읽는 법</h4>` +
        `<p>같은 수가 두 번 나오기도 합니다. 조합되는 획수 합이 같으면 같은 수가 나오는 것이니 이상한 일이 아닙니다. 그리고 능선의 높낮이는 <b>인생의 성적표가 아니라 계절표</b>에 가깝습니다 — 낮은 구간은 실패의 예고가 아니라 "이 계절엔 씨를 심고, 저 계절엔 거두라"는 농사의 달력처럼 읽는 것이 전통의 본뜻에 가깝습니다.</p>` +
        `<p class="warm">한 가지 더. 옛사람들이 이름에 수리까지 따진 이유를 생각해 보면 — 결국 <b>한 사람의 평생이 편안하기를 바라는 마음</b>이었습니다. 초년·중년·장년·말년, 네 구간을 하나하나 짚었다는 건, 그 사람의 스무 살도 마흔도 예순도 다 궁금했다는 뜻입니다. 이름 하나에 그런 긴 마음이 들어 있습니다.</p>`));
      if (r.suri.note) c.appendChild(el("p", "hint", r.suri.note));
      c.appendChild(el("div", "notice",
        "81수리는 송대 「81수원도」에서 비롯된 전통표이고, 유래에 학계 이견도 있습니다. '전통적으로 이렇게 봅니다'로 읽는 것이 바르며, " +
        "경계하는 수가 있어도 그건 '그 시기를 더 의식적으로 살라'는 오래된 당부이지 판결이 아닙니다."));
    } else {
      c.appendChild(el("p", "notice", "위 입력칸에서 글자마다 한자를 골라 주면, 획수를 원획법으로 자동 계산해 초년·중년·장년·말년의 능선을 그려드립니다."));
    }
    put(c);
  }

  // ⑥ 이름 × 사주
  {
    const c = el("div", "card");
    c.appendChild(el("h2", null, "이름 × 사주 <small>이 앱만의 연결 고리</small>"));
    if (r.sajuLink) {
      const L = r.sajuLink;
      if (!L.sajuMissing.length) {
        c.appendChild(el("p", null, "당신의 사주에는 오행이 모두 갖춰져 있습니다. 이름은 보충 임무 없이, 소리의 결 그대로 즐기면 됩니다. 🎉"));
      } else {
        c.appendChild(el("p", null, `사주에 드러나지 않은 오행: <b>${L.sajuMissing.join("·")}</b>`));
        if (L.suppliedByJawon.length)
          c.appendChild(el("p", null, `선택한 한자의 <b>자원오행</b>이 <b>${L.suppliedByJawon.join("·")}</b> 기운을 품고 있습니다! 글자의 뿌리로 사주의 빈 곳을 채우는, 성명학에서 으뜸으로 치는 연결입니다. ✨`));
        if (L.suppliedByPron.length)
          c.appendChild(el("p", null, `이름의 <b>소리(발음오행)</b>가 <b>${L.suppliedByPron.join("·")}</b> 기운을 품고 있습니다. 매일 불릴 때마다 그 기운이 한 번씩 도는 구조입니다.`));
        if (L.notSupplied.length)
          c.appendChild(el("p", null, `<b>${L.notSupplied.join("·")}</b> 기운은 이름에 없으니, 색(${L.notSupplied.map((o) => OHAENG_COLOR[o]).join("·")})이나 그 기운의 활동을 생활에 곁들이면 좋은 보완이 됩니다.`));
      }
    } else {
      c.appendChild(el("p", "notice", "[사주] 탭에서 명식을 먼저 펼치면, 이름이 사주의 빈 오행을 채우는지 이어서 볼 수 있습니다."));
    }
    put(c);
  }

  // ⑦ 같은 이름을 가진 사람
  {
    const nc = IT.nameCohort(r, fam, giv);
    if (nc) {
      const c = el("div", "card");
      c.appendChild(el("h2", null, "같은 이름을 가진 사람 <small>한자까지 같기는 얼마나 어려울까</small>"));
      c.appendChild(el("div", "rbody", nc));
      put(c);
    }
  }

  // ⑧ 닫는 말 — 이 이름의 좋은 점을 모아 부각
  {
    const c = el("div", "card");
    c.appendChild(el("h2", null, "그리고, 이름에 대하여 🌱"));
    c.appendChild(el("div", "rbody",
      IT.nameClosing(r, fam, giv, { rff, bulyongHits: hasHanja ? IT.bulyongCheck(r) : null }) +
      `<p class="soft">덧붙여 — 아직 물어볼 수 있는 분이 계시다면, 이 이름을 왜 이렇게 지었는지 한 번 여쭤보세요. 대부분 놀랄 만큼 긴 이야기가 나옵니다. 그리고 그 이야기는, 언젠가는 못 듣게 됩니다.</p>`));
    put(c);
  }
}

// ── 관상: 사진 판독 ──────────────────────────────────────
let camStream = null;
$("#btn-upload").addEventListener("click", () => $("#photo-file").click());
$("#photo-file").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => { drawToCanvas(img); analyzePhoto(); };
  img.src = URL.createObjectURL(f);
});
$("#btn-camera").addEventListener("click", async () => {
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 960 } });
    const v = $("#cam");
    v.srcObject = camStream;
    v.classList.remove("hidden");
    $("#btn-shoot").classList.remove("hidden");
    $("#photo-status").textContent = "카메라가 켜졌습니다. 정면을 보고 [촬영]을 눌러 주세요.";
  } catch (err) {
    $("#photo-status").textContent = "카메라를 열 수 없습니다 (" + err.name + "). 사진 올리기를 이용해 주세요.";
  }
});
$("#btn-shoot").addEventListener("click", () => {
  const v = $("#cam");
  drawToCanvas(v, v.videoWidth, v.videoHeight);
  stopCam();
  analyzePhoto();
});
$("#btn-clear").addEventListener("click", () => {
  stopCam();
  const cv = $("#photo-canvas");
  cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
  cv.classList.add("hidden");
  $("#btn-clear").classList.add("hidden");
  $("#photo-result").innerHTML = "";
  $("#photo-file").value = "";
  $("#photo-status").textContent = "지웠습니다. 사진은 어디에도 남지 않습니다.";
});
function stopCam() {
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  $("#cam").classList.add("hidden");
  $("#btn-shoot").classList.add("hidden");
}
function drawToCanvas(src, w, h) {
  const cv = $("#photo-canvas");
  const sw = w || src.naturalWidth, sh = h || src.naturalHeight;
  const scale = Math.min(1, 900 / sw);
  cv.width = Math.round(sw * scale); cv.height = Math.round(sh * scale);
  cv.getContext("2d").drawImage(src, 0, 0, cv.width, cv.height);
  cv.classList.remove("hidden");
  $("#btn-clear").classList.remove("hidden");
}
async function analyzePhoto() {
  const cv = $("#photo-canvas");
  const st = $("#photo-status");
  st.textContent = "⏳ 얼굴의 68개 지점을 찾아 재는 중… (이 기기 안에서만)";
  let res;
  try { res = await GWP.analyze(cv); }
  catch (err) { st.textContent = "분석 중 오류: " + err.message; return; }
  if (!res.ok) { st.textContent = "🙏 " + res.reason; $("#photo-result").innerHTML = ""; return; }
  st.textContent = "측정 완료. 아래 풀이는 판정이 아니라 이해의 자료입니다.";
  // 랜드마크 오버레이 — 눈썹 점은 크게(보정 지점), 헤어라인은 점선으로
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "rgba(212,175,55,.9)";
  res.landmarks.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, i >= 17 && i <= 26 ? 2.6 : 1.6, 0, 7);
    ctx.fill();
  });
  if (res.hairline) {
    ctx.strokeStyle = "rgba(212,175,55,.85)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(res.hairline.x1 - 10, res.hairline.y);
    ctx.lineTo(res.hairline.x2 + 10, res.hairline.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  renderPhotoResult(res);
}
function renderPhotoResult(res) {
  const root = $("#photo-result");
  root.innerHTML = "";
  let delay = 0;
  const put = (c) => { c.classList.add("reveal"); c.style.animationDelay = delay + "s"; delay += 0.2; root.appendChild(c); };

  const c1 = el("div", "card");
  c1.appendChild(el("h2", null, "얼굴을 읽기 전에 <small>관상이 원래 무엇을 보는 것이었나</small>"));
  c1.appendChild(el("div", "rbody", IT.gwansangOpening +
    `<p><b>삼정 비율</b> (상정:중정:하정 = ${res.summary.samjeong}) — ${res.summary.samjeongText}</p>` +
    `<p><b>좌우 균형</b> — ${res.summary.symmetry} 참고로 완벽한 좌우대칭 얼굴은 거의 없고, 미세한 비대칭이 오히려 사람을 매력적으로 만듭니다.</p>`));
  put(c1);

  // 삼정 — 시기별로
  const cs3 = el("div", "card");
  cs3.appendChild(el("h2", null, "삼정 — 시기로 나눠 읽기 <small>얼굴을 초년·중년·말년으로 나눈 오래된 방식</small>"));
  for (const s of IT.samjeongRead(res)) {
    const sec = el("div", "rsec");
    sec.appendChild(el("h3", "rhead", `<span class="ricon">${s.icon}</span>${s.title}`));
    sec.appendChild(el("div", "rbody", s.body));
    cs3.appendChild(sec);
  }
  put(cs3);

  // 궁별로
  const cg = el("div", "card");
  cg.appendChild(el("h2", null, "궁(宮)으로 나눠 읽기 <small>옛사람들이 얼굴에 그려둔 분야 지도</small>"));
  for (const s of IT.gungRead(res)) {
    const sec = el("div", "rsec");
    sec.appendChild(el("h3", "rhead", `<span class="ricon">${s.icon}</span>${s.title}`));
    sec.appendChild(el("div", "rbody", s.body));
    cg.appendChild(sec);
  }
  put(cg);

  // 전체 측정치
  const c2 = el("div", "card");
  c2.appendChild(el("h2", null, "전체 측정값 <small>무엇을 어떻게 쟀는지 그대로</small>"));
  for (const f of res.findings) {
    const g = el("div", "gfind");
    g.appendChild(el("div", "gt", `${f.name} <b>· ${f.level}</b>` +
      `<small>${f.palace ? f.palace + " · " : ""}${f.domain || ""}</small>`));
    g.appendChild(el("p", null, f.desc + (f.extra ? " " + f.extra : "")));
    g.appendChild(el("div", "basis", "📐 " + f.basis));
    c2.appendChild(g);
  }
  put(c2);

  // ★ 오늘부터 바뀌는 얼굴
  const cf = el("div", "card");
  cf.appendChild(el("h2", null, "오늘부터 바뀌는 얼굴 ✨ <small>사주는 못 바꿔도, 관상은 바뀝니다</small>"));
  cf.appendChild(el("div", "rbody",
    `<p>이게 관상이 사주와 결정적으로 다른 점입니다. <b>사주 여덟 글자는 평생 안 바뀌지만, 얼굴은 바뀝니다.</b> 그것도 생각보다 빠르게요. 아래는 오늘부터 할 수 있는 것들입니다.</p>`));
  for (const it of IT.faceCare(res)) {
    const sec = el("div", "rsec");
    sec.appendChild(el("h3", "rhead", `<span class="ricon">${it.icon}</span>${it.t}`));
    sec.appendChild(el("div", "rbody", `<p>${it.d}</p>`));
    cf.appendChild(sec);
  }
  put(cf);

  // 같은 얼굴은 없다
  const cfc = el("div", "card");
  cfc.appendChild(el("h2", null, "같은 얼굴은 없습니다 <small>조합을 세어 봤습니다</small>"));
  cfc.appendChild(el("div", "rbody", IT.faceCohort(res)));
  put(cfc);

  const c3 = el("div", "card");
  c3.appendChild(el("h2", null, "사진이 재지 못하는 것들 <small>정직하게 말씀드립니다</small>"));
  const ul = el("ul", "plain");
  for (const u of res.unmeasured) ul.appendChild(el("li", null, u));
  c3.appendChild(ul);
  c3.appendChild(el("p", null, "기억해 주세요 — 관상의 제1 기준은 부위의 생김이 아니라 <b>조화·기세·찰색</b>, 즉 얼굴에 흐르는 힘과 빛입니다. 그것은 오늘의 표정과 마음가짐이 만듭니다."));
  put(c3);

  const c4 = el("div", "card");
  c4.appendChild(el("h2", null, "마지막으로 드리고 싶은 말 🌱"));
  c4.appendChild(el("div", "rbody", IT.gwansangClosing()));
  c4.appendChild(el("em", "quote", `“${INTERP_DB.gwansang.closing}”`));
  put(c4);
}

// ── 관상: 일반 해설 사전 (부위별 전통 해석) ────────────────
function renderGwansangGuide() {
  const G = INTERP_DB.gwansang;
  const root = $("#gw-guide");
  root.innerHTML = "";
  for (const p of G.principles)
    root.appendChild(el("div", "principle", `<b>${p.label}</b> — ${p.desc}`));
  root.appendChild(el("div", "principle",
    `<b>삼정(三停)</b> — 이마(초년) · 눈썹~코끝(중년) · 코끝~턱(말년). ${G.samjeong_rule}<br>` +
    `<b>오악(五嶽)</b> — ${G.oak.parts.join("·")}. ${G.oak.rule}`));
  for (const part of G.parts) {
    const d = el("details", "gd");
    d.innerHTML = `<summary><b>${part.name}</b><small>${part.palace !== "-" ? part.palace + " · " : ""}${part.domain !== "-" ? part.domain : ""}</small></summary>` +
      `<div class="gdbody">` +
      (part.measure && part.measure !== "-" ? `<p class="hint">📐 보는 법 — ${part.measure}</p>` : "") +
      part.options.map((o) => `<p><b>${o.level}</b> — ${o.desc}</p>`).join("") +
      `</div>`;
    root.appendChild(d);
  }
  root.appendChild(el("div", "notice",
    "한 부위만으로 판단하지 않는 것이 관상의 원칙입니다. 아쉽게 읽히는 부위는 <b>더 신경 쓰면 좋은 영역</b>이라는 뜻일 뿐, 좋고 나쁨의 판정이 아닙니다."));
  root.appendChild(el("em", "quote", `“${G.closing}”`));
}
renderGwansangGuide();

// ── 학습 모드 ────────────────────────────────────────────
let learnStep = 0;
function renderLearn() {
  const body = $("#learn-body");
  if (!lastChart) {
    body.innerHTML = `<p class="notice">먼저 [사주] 탭에서 명식을 펼쳐 주세요. 그 명식이 교과서가 됩니다.</p>`;
    return;
  }
  const chart = lastChart, r = lastResult;
  const posList = [];
  for (const k of ["year", "month", "day", "hour"]) if (chart[k]) {
    posList.push({ c: chart[k][0], isGan: true });
    posList.push({ c: chart[k][1], isGan: false });
  }
  const steps = [
    ["이것이 당신의 사주 " + posList.length + "글자입니다",
      `연·월·일${chart.hour ? "·시" : ""} 각각이 하나의 기둥(柱)입니다. 기둥마다 위아래 두 글자 — <b>${posList.map((s) => s.c + "(" + hanjaOf(s.c, s.isGan) + ")").join(" ")}</b>. 관례상 오른쪽(연주)에서 왼쪽으로 읽습니다.`],
    ["위 글자는 천간, 아래 글자는 지지입니다",
      `위 글자들은 하늘의 기운 <b>천간(天干)</b> 10개 중 하나, 아래 글자들은 땅의 기운 <b>지지(地支)</b> 12개 중 하나입니다. 지지는 띠 동물과도 연결됩니다.`],
    ["글자를 오행으로 바꿔 봅니다",
      posList.map((s) => `${s.c} → <b style="color:${OHAENG_HEX[ohaengOfPos(s.c, s.isGan)]}">${ohaengOfPos(s.c, s.isGan)}</b>`).join(", ") +
      `<br>목·화·토·금·수 다섯 기운의 분포가 곧 명식의 바탕색입니다.`],
    ["여기, 이 글자가 바로 '당신'입니다",
      `일주의 천간, <b style="color:${r.ilgan.hex}">${r.ilgan.char}(${HANJA_GAN[r.ilgan.char]})</b> — 이것이 <b>일간(日干)</b>, 사주의 원점입니다. 해석의 전 과정은 "일간과 나머지 ${posList.length - 1}글자의 관계 읽기"입니다.`],
    [`당신은 ${r.ilgan.mulsang}(으)로 태어났습니다`,
      `${INTERP_DB.cheongan[r.ilgan.char].desc}<br>일주 동물로 부르면 <b>${r.ilju_animal}</b>입니다.`],
    ["나와 나머지 글자들의 관계를 봅니다",
      `오행 사이에는 낳아주는 관계(상생)와 제어하는 관계(상극)가 있습니다. <b>생한다고 반드시 좋은 것이 아니고, 극한다고 반드시 나쁜 것이 아닙니다.</b> 상극은 긴장·통제·규율을 만드는, 살아가는 데 꼭 필요한 관계입니다.`],
    ["그 관계에 붙는 이름이 십성(十星)입니다",
      `오행 관계(같음/내가 생함/내가 극함/나를 극함/나를 생함) × 음양(같음/다름) = 10가지.<br>당신의 명식: ` +
      ["year", "month", "day", "hour"].filter((k) => chart[k]).map((k) => {
        const d = r.detail[k];
        return `${chart[k][0]}${d.gan_sipsin ? "(" + d.gan_sipsin + ")" : "(나)"} ${chart[k][1]}(${d.ji_sipsin})`;
      }).join(" · ")],
    ["당신의 기질은 이렇습니다",
      `많은 것: <b>${r.dominant.length ? r.dominant.join(", ") : "특정 편중 없음"}</b> / 드러나지 않는 것: <b>${r.absent.join(", ") || "없음"}</b><br>` +
      `무엇이 있는가 → 무엇이 많은가 → 무엇이 없는가의 순서로 읽습니다. 이제 [운의 흐름] 탭에서 도로(대운)를 볼 준비가 됐습니다.`],
  ];
  if (learnStep >= steps.length) learnStep = 0;
  const [title, html] = steps[learnStep];
  body.innerHTML = "";
  const sb = el("div", "stepbody");
  sb.appendChild(el("h3", null, `Step ${learnStep + 1}. ${title}`));
  sb.appendChild(el("p", null, html));
  body.appendChild(sb);
  const nav = el("div", "stepnav");
  nav.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:16px";
  const prev = el("button", "btn2", "← 이전");
  prev.disabled = learnStep === 0;
  prev.onclick = () => { learnStep--; renderLearn(); };
  const dots = el("div", null);
  dots.style.cssText = "display:flex;gap:6px";
  steps.forEach((_, i) => {
    const dot = el("i");
    dot.style.cssText = `width:9px;height:9px;border-radius:50%;display:block;background:${i === learnStep ? "var(--accent)" : "var(--line)"}`;
    dots.appendChild(dot);
  });
  const next = el("button", "btn2", learnStep === steps.length - 1 ? "처음으로" : "다음 →");
  next.onclick = () => { learnStep = learnStep === steps.length - 1 ? 0 : learnStep + 1; renderLearn(); };
  nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
  body.appendChild(nav);
}

// ── 일러두기 ─────────────────────────────────────────────
$("#about-body").innerHTML = `
  <h2>일러두기</h2>
  <p style="margin-bottom:12px">${INTERP_DB._meta.note}. 본 앱은 서버 없이 이 폴더 안에서만 작동하며, 입력한 정보·사진·메모는 이 기기 밖으로 나가지 않습니다.</p>
  <h4 class="sec">사주 계산</h4>
  <ul class="plain">
    <li>절기 절입시각: 1900~2100년 천문 계산(VSOP87) — 공표값 대비 오차 ±1분 검증</li>
    <li>서머타임(1948~51·1955~60·1987~88), 1908~11·1954~61년 표준시(UTC+8:30) 자동 환산</li>
    <li>진태양시: 경도 보정(1°=4분). 균시차(±16분) 미반영 · 자시는 야자시(자정 기준)로 통일</li>
    <li>대운수: 절입까지 일수 ÷ 3, 버림(전통 다수설)으로 통일</li>
    <li>세운·월운은 십성(기운의 성격)으로만 서술 — 월별 점수 그래프는 고전 근거가 없어 넣지 않음</li>
    <li>음력 입력·궁합은 다음 버전 예정</li>
  </ul>
  <h4 class="sec">이름 풀이</h4>
  <ul class="plain">
    <li>발음오행은 전통 다수설(ㅇㅎ=토·ㅁㅂㅍ=수) 기준 — 훈민정음계 등 이설이 있으나 가장 널리 쓰이는 기준으로 통일</li>
    <li>상생 판정은 3경로(초성 연쇄 / 성 받침→이름 초성 / 받침 포함) 중 하나만 통해도 인정</li>
    <li>한자 사전: 한국 표준(KS) 수록 7,700여 자 내장 — 훈음은 libhangul, 획수·부수는 Unicode Unihan</li>
    <li>획수는 원획법(부수를 본자 획수로 환산: 氵=水 4획, 艹=艸 6획 등)으로 자동 계산</li>
    <li>자원오행은 부수 기반 근사 — 뚜렷하지 않은 글자는 '—'로 정직하게 표시</li>
    <li>81수리는 전통표 기준의 문화적 해석 (유래에 학계 이견 있음을 명시)</li>
    <li>점수 채점·개명 권유 없음 — 이름을 '나쁘다' 판정하는 기능은 만들지 않았습니다</li>
  </ul>
  <h4 class="sec">관상 사진</h4>
  <ul class="plain">
    <li>얼굴 68지점 검출과 비율 측정은 전부 이 기기 안에서 수행 (내장 모델 · 전송 없음 · 저장 없음)</li>
    <li>모든 풀이에 측정 근거를 함께 표시 · 조명/각도/표정의 영향이 있음을 감안해 주세요</li>
    <li>찰색·기세 등 사진으로 잴 수 없는 항목은 잴 수 없다고 표시</li>
    <li>'나쁜 관상' 판정, 관상 순위, 성형 판정 기능은 없습니다</li>
  </ul>
  <h4 class="sec">해석의 원칙</h4>
  <ul class="plain">${INTERP_DB._meta.guardrails.map((g) => `<li>${g}</li>`).join("")}</ul>
  <h4 class="sec">넣지 않은 기능</h4>
  <ul class="plain">
    <li>수명·질병·사망 예측 / 구체적 금전 액수 / 관상·이름 순위 매기기 — 다루지 않습니다</li>
  </ul>
  <h4 class="sec">오픈소스 출처</h4>
  <ul class="plain">
    <li>한자 훈음: <b>libhangul</b> hanja.txt (LGPL) · 한자 획수/부수: <b>Unicode Unihan Database</b> (Unicode License)</li>
    <li>얼굴 검출: <b>face-api.js</b> (MIT, justadudewhohacks) — 모델 포함, 전부 기기 내 실행</li>
    <li>절기 계산: VSOP87 이론 기반 자체 구현</li>
  </ul>
  <em class="quote">“운은 통제할 수 없지만, 기질은 바꿀 수 있습니다.”</em>`;

$("#foot").innerHTML =
  "본 서비스는 전통 명리학·성명학·관상학의 문화적 해석을 제공하는 오락 및 자기이해 목적의 콘텐츠입니다. " +
  "의학적·법률적·재무적 판단의 근거로 사용될 수 없으며, 개인의 능력·가치·미래를 확정하지 않습니다.";

// ── 시작: 프로필 복원 → 자동 계산 ─────────────────────────
if (restoreProfile()) {
  refreshStrokeInputs();
  runSaju(false);
} else {
  refreshStrokeInputs();
}
