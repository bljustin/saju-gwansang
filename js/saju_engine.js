// ============================================================
// saju_engine.js — 명식/십성 계산 엔진 (오프라인, 순수 JS)
// docs/saju_core.py (검증된 레퍼런스)의 이식 + Layer 1 정밀화:
//   · 절기 절입 시·분 테이블 (jeolgi_data.js, 1900~2100 KST)
//   · 서머타임 자동 보정 (1948~51, 1955~60, 1987~88)
//   · 표준자오선 변경 반영 (1908~11, 1954~61: UTC+8:30)
//   · 진태양시 경도 보정, 야자시/정자시 옵션
// ============================================================
"use strict";

// ── 1. 기초 데이터 (saju_core.py와 동일) ──────────────────
const GAN = "갑을병정무기경신임계".split("");
const JI = "자축인묘진사오미신유술해".split("");

const GAN_INFO = {
  "갑": ["목", 1], "을": ["목", -1], "병": ["화", 1], "정": ["화", -1],
  "무": ["토", 1], "기": ["토", -1], "경": ["금", 1], "신": ["금", -1],
  "임": ["수", 1], "계": ["수", -1],
};
// ⚠️ 자·사·오·해는 실제 작용(用) 기준 음양 반전 — 강의 기준 그대로
const JI_INFO = {
  "자": ["수", -1], "축": ["토", -1], "인": ["목", 1], "묘": ["목", -1],
  "진": ["토", 1], "사": ["화", 1], "오": ["화", -1], "미": ["토", -1],
  "신": ["금", 1], "유": ["금", -1], "술": ["토", 1], "해": ["수", 1],
};

const SAENG = { "목": "화", "화": "토", "토": "금", "금": "수", "수": "목" };
const GEUK = { "목": "토", "토": "수", "수": "화", "화": "금", "금": "목" };

const OHAENG_COLOR = { "목": "청", "화": "적", "토": "황", "금": "백", "수": "흑" };
const OHAENG_HEX = { "목": "#2E7D5B", "화": "#C0392B", "토": "#B8860B", "금": "#8E9AAF", "수": "#1F3A5F" };
const MULSANG = { "갑": "큰 나무", "을": "꽃·풀", "병": "태양", "정": "달·촛불", "무": "큰 산", "기": "밭흙", "경": "원석", "신": "보석", "임": "바다", "계": "이슬비" };
const TTI = { "자": "쥐", "축": "소", "인": "호랑이", "묘": "토끼", "진": "용", "사": "뱀", "오": "말", "미": "양", "신": "원숭이", "유": "닭", "술": "개", "해": "돼지" };

const SIPSIN_ALL = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
const SIPSIN_GROUP = { "비견": "비겁", "겁재": "비겁", "식신": "식상", "상관": "식상", "편재": "재성", "정재": "재성", "편관": "관성", "정관": "관성", "편인": "인성", "정인": "인성" };

const WOLDU = { "갑": "병", "기": "병", "을": "무", "경": "무", "병": "경", "신": "경", "정": "임", "임": "임", "무": "갑", "계": "갑" };
const SIDU = { "갑": "갑", "기": "갑", "을": "병", "경": "병", "병": "무", "신": "무", "정": "경", "임": "경", "무": "임", "계": "임" };

// jeolgi_data.js 행 순서(연내 시간순)와 월지 매핑
const JEOL_META = [
  { name: "소한", ji: "축" }, { name: "입춘", ji: "인" }, { name: "경칩", ji: "묘" },
  { name: "청명", ji: "진" }, { name: "입하", ji: "사" }, { name: "망종", ji: "오" },
  { name: "소서", ji: "미" }, { name: "입추", ji: "신" }, { name: "백로", ji: "유" },
  { name: "한로", ji: "술" }, { name: "입동", ji: "해" }, { name: "대설", ji: "자" },
];

// ── 2. 시간 유틸 (분 단위 절대시간; Date.UTC를 '벽시계' 컨테이너로만 사용) ──
function tmin(y, mo, d, h, mi) { return Date.UTC(y, mo - 1, d, h || 0, mi || 0) / 60000; }
function fromMin(m) {
  const dt = new Date(m * 60000);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes() };
}
function fmtMin(m) {
  const t = fromMin(m);
  const p = (n) => String(n).padStart(2, "0");
  return `${t.y}-${p(t.mo)}-${p(t.d)} ${p(t.h)}:${p(t.mi)}`;
}

// ── 3. 한국 시간제도 이력 ─────────────────────────────────
// 서머타임 (벽시계 기준 근사 경계. 경계일 출생은 UI에서 안내)
const DST_PERIODS = [
  [tmin(1948, 6, 1, 0, 0), tmin(1948, 9, 13, 0, 0)],
  [tmin(1949, 4, 3, 0, 0), tmin(1949, 9, 11, 0, 0)],
  [tmin(1950, 4, 1, 0, 0), tmin(1950, 9, 10, 0, 0)],
  [tmin(1951, 5, 6, 0, 0), tmin(1951, 9, 9, 0, 0)],
  [tmin(1955, 5, 5, 0, 0), tmin(1955, 9, 9, 0, 0)],
  [tmin(1956, 5, 20, 0, 0), tmin(1956, 9, 30, 0, 0)],
  [tmin(1957, 5, 5, 0, 0), tmin(1957, 9, 22, 0, 0)],
  [tmin(1958, 5, 4, 0, 0), tmin(1958, 9, 21, 0, 0)],
  [tmin(1959, 5, 3, 0, 0), tmin(1959, 9, 20, 0, 0)],
  [tmin(1960, 5, 1, 0, 0), tmin(1960, 9, 18, 0, 0)],
  [tmin(1987, 5, 10, 2, 0), tmin(1987, 10, 11, 3, 0)],
  [tmin(1988, 5, 8, 2, 0), tmin(1988, 10, 9, 3, 0)],
];
function dstOffsetMin(clockMin) {
  for (const [s, e] of DST_PERIODS) if (clockMin >= s && clockMin < e) return 60;
  return 0;
}

// 표준시 오프셋(분). 1908-04-01~1912, 1954-03-21~1961-08-10 은 UTC+8:30(=510분)
function eraOffsetMin(stdMin) {
  if (stdMin < tmin(1908, 4, 1, 0, 0)) return 510;      // 대한제국 표준시(127.5°E) 이전 포함 근사
  if (stdMin < tmin(1912, 1, 1, 0, 0)) return 510;
  if (stdMin < tmin(1954, 3, 21, 0, 0)) return 540;
  if (stdMin < tmin(1961, 8, 10, 0, 0)) return 510;
  return 540;
}

// ── 4. 절기 조회 ──────────────────────────────────────────
function jeolInstant(year, idx) {
  const row = JEOLGI_TABLE[String(year)];
  if (!row) return null;
  const [mo, d, h, mi] = row[idx];
  return tmin(year, mo, d, h, mi);
}
// kstMin 시점의 (월지, 최근 절입, 다음 절입) — 절기 비교는 KST(UTC+9) 기준
function monthJiAt(kstMin) {
  const y = fromMin(kstMin).y;
  let last = null, next = null;
  for (let k = -1; k <= 1; k++) {
    const yy = y + k;
    if (!JEOLGI_TABLE[String(yy)]) continue;
    for (let i = 0; i < 12; i++) {
      const t = jeolInstant(yy, i);
      if (t <= kstMin) {
        if (!last || t > last.t) last = { t, ...JEOL_META[i], year: yy };
      } else if (!next || t < next.t) {
        next = { t, ...JEOL_META[i], year: yy };
      }
    }
  }
  // 1900년 1월 초(소한 이전)처럼 이전 연도 테이블이 없는 극단 경계
  const ji = last ? last.ji : "자";
  return { ji, last, next };
}

// ── 5. 기둥 계산 (saju_core.py 이식) ─────────────────────
function jdn(y, mo, d) {
  const a = Math.floor((14 - mo) / 12);
  const yy = y + 4800 - a;
  const mm = mo + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
function yearPillar(year) { const i = ((year - 4) % 60 + 60) % 60; return GAN[i % 10] + JI[i % 12]; }
function monthPillar(yearGan, monthJi) {
  const start = WOLDU[yearGan];
  // 인월부터 몇 번째 달인지 (자·축월은 +10, +11번째 — 음수 거리로 계산하면 안 됨)
  const off = (JI.indexOf(monthJi) - JI.indexOf("인") + 12) % 12;
  return GAN[(GAN.indexOf(start) + off) % 10] + monthJi;
}
function dayPillar(y, mo, d) { const i = (jdn(y, mo, d) + 49) % 60; return GAN[i % 10] + JI[i % 12]; }
function hourPillar(dayGan, hourJi) {
  const start = SIDU[dayGan];
  return GAN[(GAN.indexOf(start) + JI.indexOf(hourJi)) % 10] + hourJi;
}
/**
 * 시각 → 시지.
 * corrected=false: 한국 관례 경계(자시 23:30~01:30, 서울 기준 -30분이 이미 반영된 표)
 * corrected=true : 진태양시 보정을 이미 적용한 시각 → 정통 경계(자시 23:00~01:00)
 *   (보정된 시각에 23:30 경계를 또 쓰면 서울 -32분이 이중 적용된다)
 */
function hourToJi(h, mi, corrected) {
  const shift = corrected ? 60 : 30;
  const shifted = (h * 60 + mi + shift) % 1440;
  return JI[Math.floor(shifted / 120)];
}

// ── 6. 십성 판정 ──────────────────────────────────────────
// ⚠️ '신'은 천간 辛(음금)과 지지 申(양금) 양쪽에 존재하는 유일한 중복 글자.
//    위치(isGan)를 명시하지 않으면 천간으로 해석되므로, 지지는 반드시 isGan=false로 호출할 것.
function charInfo(c, isGan) {
  if (isGan === true) return GAN_INFO[c];
  if (isGan === false) return JI_INFO[c];
  return GAN_INFO[c] || JI_INFO[c]; // 위치 미상(레거시) — 신은 천간으로 해석됨
}
function sipsin(dayGan, target, isGan) {
  const [meOh, meUm] = GAN_INFO[dayGan];
  const [tOh, tUm] = charInfo(target, isGan);
  const same = meUm === tUm;
  if (tOh === meOh) return same ? "비견" : "겁재";
  if (SAENG[meOh] === tOh) return same ? "식신" : "상관";
  if (GEUK[meOh] === tOh) return same ? "편재" : "정재";
  if (GEUK[tOh] === meOh) return same ? "편관" : "정관";
  if (SAENG[tOh] === meOh) return same ? "편인" : "정인";
  throw new Error("판정 불가: " + dayGan + " vs " + target);
}

// ── 7. 통합 API ───────────────────────────────────────────
/**
 * input = { y, mo, d, h, mi, timeKnown,
 *           longitude(도, null 가능), trueSolar(bool), jasiMode:'yaja'|'jeongja' }
 */
function buildChart(input) {
  const notes = [];
  const warnings = [];
  const timeKnown = !!input.timeKnown;
  const h = timeKnown ? input.h : 12, mi = timeKnown ? input.mi : 0;

  if (input.y < 1900 || input.y > 2100) throw new Error("1900~2100년 범위만 지원합니다.");

  // ① 벽시계 → 서머타임 제거
  const clockMin = tmin(input.y, input.mo, input.d, h, mi);
  const dst = dstOffsetMin(clockMin);
  const stdMin = clockMin - dst;
  if (dst) notes.push(`서머타임 기간 출생 → 표준시로 1시간 환산 (${fmtMin(stdMin)})`);

  // ② 당시 표준시 → UTC → KST(UTC+9) 정규화 (절기 비교용)
  const offset = eraOffsetMin(stdMin);
  const utcMin = stdMin - offset;
  const kstMin = utcMin + 540;
  if (offset !== 540) notes.push("당시 한국 표준시가 동경 127.5° 기준(UTC+8:30)이어서 30분 환산을 적용했습니다.");

  // ③ 진태양시 (시주·일주 경계용)
  //    보정 시 시지 경계는 정통 23:00 기준, 미보정 시 한국 관례 23:30 기준
  let solarMin = stdMin;
  let corrected = false;
  let solarNote = "진태양시 보정 없음 → 한국 관례 시지 경계(자시 23:30~01:30) 적용";
  if (input.trueSolar && input.longitude != null) {
    corrected = true;
    solarMin = utcMin + Math.round(input.longitude * 4);
    const diff = solarMin - clockMin;
    solarNote = `진태양시 보정: 경도 ${input.longitude}° → 벽시계 대비 ${diff >= 0 ? "+" : ""}${diff}분 (${fmtMin(solarMin)}), 시지 경계는 정통 기준(자시 23:00~01:00)`;
  }
  if (timeKnown) notes.push(solarNote);
  const jasiStart = corrected ? 23 * 60 : 23 * 60 + 30; // 자시 시작(그날 심야)

  // ④ 연주 — 입춘 절입시각 기준 (KST)
  let sajuYear = fromMin(kstMin).y;
  const ipchun = jeolInstant(sajuYear, 1);
  if (ipchun != null && kstMin < ipchun) sajuYear -= 1;
  const yp = yearPillar(sajuYear);

  // ⑤ 월주 — 12절 절입시각 기준
  const mj = monthJiAt(kstMin);
  const mp = monthPillar(yp[0], mj.ji);

  // ⑥ 일주 — 진태양시 날짜 기준. 정자시 선택 시 자시 시작 이후 다음 날로.
  let dayRef = fromMin(solarMin);
  if (timeKnown && input.jasiMode === "jeongja") {
    const tod = dayRef.h * 60 + dayRef.mi;
    if (tod >= jasiStart) {
      dayRef = fromMin(solarMin + (1440 - tod) + 1); // 다음 날 00:00 이후로
      notes.push("정자시 방식: 자시 시작 이후 출생 → 일주를 다음 날로 처리했습니다.");
    }
  }
  const dp = dayPillar(dayRef.y, dayRef.mo, dayRef.d);

  // ⑦ 시주
  let hp = null;
  if (timeKnown) {
    const st = fromMin(solarMin);
    hp = hourPillar(dp[0], hourToJi(st.h, st.mi, corrected));
  }

  // ⑧ 경계 경고
  if (mj.last && kstMin - mj.last.t <= 120) {
    warnings.push(`${mj.last.name}(${fmtMin(mj.last.t)}) 절입 직후 ${Math.round(kstMin - mj.last.t)}분입니다. 출생 시각이 조금만 달라도 월주(또는 연주)가 바뀔 수 있습니다.`);
  }
  if (mj.next && mj.next.t - kstMin <= 120) {
    warnings.push(`${mj.next.name}(${fmtMin(mj.next.t)}) 절입 ${Math.round(mj.next.t - kstMin)}분 전입니다. 출생 시각이 조금만 달라도 월주(또는 연주)가 바뀔 수 있습니다.`);
  }
  if (!timeKnown) {
    notes.push("출생 시각 미상 → 연·월·일 3주(三柱) 해석 모드");
    if (mj.last && Math.abs(mj.last.t - tmin(input.y, input.mo, input.d, 12, 0)) < 1440) {
      const t = fromMin(mj.last.t);
      if (t.y === input.y && t.mo === input.mo && t.d === input.d)
        warnings.push(`출생일이 ${mj.last.name} 절입일입니다. 시각에 따라 연/월주가 달라질 수 있어 정오(12:00) 기준으로 계산했습니다.`);
    }
  }
  if (timeKnown && input.jasiMode !== "jeongja") {
    const st = fromMin(solarMin);
    if (st.h * 60 + st.mi >= jasiStart) notes.push("야자시 방식: 자시 시작~자정 출생 → 일주는 당일 유지, 시주는 자시로 처리했습니다.");
  }

  return {
    input, year: yp, month: mp, day: dp, hour: hp,
    sajuYear, kstMin, solarMin,
    jeol: { last: mj.last, next: mj.next },
    notes, warnings,
  };
}

function analyze(chart) {
  const dayGan = chart.day[0];
  const keys = ["year", "month", "day"];
  if (chart.hour) keys.push("hour");

  const items = []; // {c, isGan} — '신' 중복 글자 때문에 위치를 반드시 보존
  const detail = {};
  for (const k of keys) {
    const p = chart[k];
    detail[k] = {
      gan: p[0], ji: p[1],
      gan_sipsin: k === "day" ? null : sipsin(dayGan, p[0], true),
      ji_sipsin: sipsin(dayGan, p[1], false),
    };
    items.push({ c: p[1], isGan: false });
    if (k !== "day") items.push({ c: p[0], isGan: true });
  }

  const counts = {};
  for (const s of SIPSIN_ALL) counts[s] = 0;
  for (const it of items) counts[sipsin(dayGan, it.c, it.isGan)]++;

  const group = { "비겁": 0, "식상": 0, "재성": 0, "관성": 0, "인성": 0 };
  for (const s of SIPSIN_ALL) group[SIPSIN_GROUP[s]] += counts[s];

  const ohaeng = { "목": 0, "화": 0, "토": 0, "금": 0, "수": 0 };
  for (const it of items) ohaeng[charInfo(it.c, it.isGan)[0]]++;
  ohaeng[GAN_INFO[dayGan][0]]++;

  const [oh, um] = GAN_INFO[dayGan];
  return {
    ilgan: {
      char: dayGan, ohaeng: oh, eumyang: um > 0 ? "양" : "음",
      mulsang: MULSANG[dayGan], color: OHAENG_COLOR[oh], hex: OHAENG_HEX[oh],
    },
    ilju_animal: `${OHAENG_COLOR[oh]}색 ${TTI[chart.day[1]]}`,
    detail, counts, group, ohaeng,
    dominant: SIPSIN_ALL.filter((s) => counts[s] >= 2).sort((a, b) => counts[b] - counts[a]),
    absent: SIPSIN_ALL.filter((s) => counts[s] === 0),
    pillarCount: keys.length,
  };
}

// ── 8. 대운(大運) · 세운(歲運) · 월운(月運) ─────────────────
function ganzhiIndex(pillar) {
  for (let i = 0; i < 60; i++)
    if (GAN[i % 10] + JI[i % 12] === pillar) return i;
  throw new Error("60갑자 아님: " + pillar);
}
function ganzhiAt(i) { const k = ((i % 60) + 60) % 60; return GAN[k % 10] + JI[k % 12]; }

function pillarSipsin(dayGan, pillar) {
  return {
    pillar, gan: pillar[0], ji: pillar[1],
    ganSipsin: sipsin(dayGan, pillar[0], true),
    jiSipsin: sipsin(dayGan, pillar[1], false),
  };
}

/**
 * 대운. gender: 'M'|'F', rounding: 'floor'(버림)|'round'(반올림) — 학파에 따라 다름.
 * 방향: 양간 연생 남자·음간 연생 여자 = 순행, 반대는 역행.
 * 대운수: 순행은 생시→다음 절입, 역행은 이전 절입→생시까지 일수 ÷ 3.
 */
function daeun(chart, gender, rounding) {
  const yangYear = GAN_INFO[chart.year[0]][1] > 0;
  const forward = (gender === "M") === yangYear;
  const ref = forward ? chart.jeol.next : chart.jeol.last;
  const diffDays = Math.abs(ref.t - chart.kstMin) / 1440;
  let su = rounding === "round" ? Math.round(diffDays / 3) : Math.floor(diffDays / 3);
  if (su < 1) su = 1;

  const dayGan = chart.day[0];
  const base = ganzhiIndex(chart.month);
  const periods = [];
  for (let i = 1; i <= 10; i++) {
    const p = pillarSipsin(dayGan, ganzhiAt(base + (forward ? i : -i)));
    p.startAge = su + (i - 1) * 10;
    p.endAge = su + i * 10 - 1;
    p.startYear = chart.input.y + p.startAge;
    periods.push(p);
  }
  return { forward, su, diffDays: Math.round(diffDays * 10) / 10, refJeol: ref.name, periods };
}

/** 세운: 해당 연도의 간지를 일간과 대조. (입춘부터 적용됨을 UI에 명시) */
function seun(chart, year) {
  return pillarSipsin(chart.day[0], yearPillar(year));
}

/** 월운: year의 입춘부터 시작하는 12개 월 간지 (인월~축월). */
function wolun(chart, year) {
  const yGan = yearPillar(year)[0];
  const dayGan = chart.day[0];
  const MONTH_LABEL = { "인": "2월", "묘": "3월", "진": "4월", "사": "5월", "오": "6월", "미": "7월",
    "신": "8월", "유": "9월", "술": "10월", "해": "11월", "자": "12월", "축": "1월(익년)" };
  const JEOL_OF = { "인": "입춘", "묘": "경칩", "진": "청명", "사": "입하", "오": "망종", "미": "소서",
    "신": "입추", "유": "백로", "술": "한로", "해": "입동", "자": "대설", "축": "소한" };
  const order = ["인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "자", "축"];
  return order.map((ji) => {
    const p = pillarSipsin(dayGan, monthPillar(yGan, ji));
    p.label = MONTH_LABEL[ji];
    p.jeol = JEOL_OF[ji];
    return p;
  });
}

// Node 테스트용 내보내기 (브라우저에서는 전역으로 사용)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GAN, JI, GAN_INFO, JI_INFO, SAENG, GEUK, OHAENG_COLOR, OHAENG_HEX, MULSANG, TTI,
    SIPSIN_ALL, SIPSIN_GROUP, WOLDU, SIDU,
    tmin, fromMin, fmtMin, dstOffsetMin, eraOffsetMin, jeolInstant, monthJiAt,
    jdn, yearPillar, monthPillar, dayPillar, hourPillar, hourToJi,
    sipsin, charInfo, buildChart, analyze,
    ganzhiIndex, ganzhiAt, pillarSipsin, daeun, seun, wolun,
  };
}
