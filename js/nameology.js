// ============================================================
// nameology.js — 성명학 엔진 (발음오행 · 음양 배열 · 수리사격 · 사주 연계)
//
// 설계 원칙:
//  · 점수 후려치기 금지 — 100점 채점 대신 "구조 서술형"으로 제공
//  · 학파 차이는 숨기지 않고 설정으로 노출 (ㅇㅎ=토 전통 / ㅇㅎ=수 훈민정음계)
//  · 상생 판정은 3경로 중 하나만 만족해도 상생 구조로 봄
//    (①초성 연쇄 ②성 종성→이름 초성 ③종성 포함 연쇄 — 일부 무료 서비스가
//     ①만 보고 '나쁜 이름' 판정 후 개명을 유도하는 관행이 있어, 그 반대로 감)
//  · 81수리는 "전통적으로 이렇게 봅니다" 수준의 서술 (송대 81수원도 유래,
//    일본 구마사키 계열 유입 지적이 있는 이론임을 일러두기에 명시)
// ============================================================
"use strict";

// ── 한글 분해 ─────────────────────────────────────────────
const NM_CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const NM_JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
const NM_JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

function nmDecompose(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return {
    cho: NM_CHO[Math.floor(code / 588)],
    jung: NM_JUNG[Math.floor((code % 588) / 28)],
    jong: NM_JONG[code % 28] || null,
  };
}

// ── 발음오행 (자음 → 오행) — 두 학파 ─────────────────────
const NM_SCHOOLS = {
  classic: { // 전통 다수설: ㅇㅎ=토, ㅁㅂㅍ=수
    label: "전통 (ㅇㅎ=토 · ㅁㅂㅍ=수)",
    map: { "ㄱ": "목", "ㅋ": "목", "ㄲ": "목", "ㄴ": "화", "ㄷ": "화", "ㄹ": "화", "ㅌ": "화", "ㄸ": "화",
      "ㅇ": "토", "ㅎ": "토", "ㅅ": "금", "ㅈ": "금", "ㅊ": "금", "ㅆ": "금", "ㅉ": "금",
      "ㅁ": "수", "ㅂ": "수", "ㅍ": "수", "ㅃ": "수" },
  },
  hunmin: { // 훈민정음 운해 계열: ㅇㅎ=수, ㅁㅂㅍ=토
    label: "훈민정음계 (ㅇㅎ=수 · ㅁㅂㅍ=토)",
    map: { "ㄱ": "목", "ㅋ": "목", "ㄲ": "목", "ㄴ": "화", "ㄷ": "화", "ㄹ": "화", "ㅌ": "화", "ㄸ": "화",
      "ㅇ": "수", "ㅎ": "수", "ㅅ": "금", "ㅈ": "금", "ㅊ": "금", "ㅆ": "금", "ㅉ": "금",
      "ㅁ": "토", "ㅂ": "토", "ㅍ": "토", "ㅃ": "토" },
  },
};
function nmConsOhaeng(jamo, school) {
  if (!jamo) return null;
  const first = jamo[0] === "ㄳ" ? "ㄱ" : jamo[0]; // 겹받침은 첫 자음
  const m = NM_SCHOOLS[school || "classic"].map;
  return m[first] || m[jamo.charAt(0)] || null;
}

// ── 모음 음양 ─────────────────────────────────────────────
const NM_YANG_V = new Set(["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ"]);
const NM_EUM_V = new Set(["ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ"]);
function nmVowelEY(jung) {
  if (NM_YANG_V.has(jung)) return "양";
  if (NM_EUM_V.has(jung)) return "음";
  return "중"; // ㅣ 는 중성
}

// ── 오행 관계 ─────────────────────────────────────────────
// SAENG/GEUK 은 saju_engine.js 전역을 사용 (스크립트 로드 순서 보장)
function nmRelation(a, b) {
  if (a === b) return "비화"; // 같은 오행 — 나쁘지 않음
  if (SAENG[a] === b) return "상생";       // a가 b를 생함
  if (SAENG[b] === a) return "상생";       // b가 a를 생함 (역방향도 생 기운)
  return "상극"; // 남는 관계는 극
}
function nmChainCheck(list) {
  // 인접 쌍의 관계 목록과 종합 판정
  const rels = [];
  for (let i = 0; i < list.length - 1; i++)
    rels.push({ from: list[i], to: list[i + 1], rel: nmRelation(list[i].oh, list[i + 1].oh) });
  const bad = rels.filter((r) => r.rel === "상극").length;
  const good = rels.filter((r) => r.rel === "상생").length;
  let verdict;
  if (rels.length === 0) verdict = "판정 불가";
  else if (bad === 0 && good === rels.length) verdict = "상생";
  else if (bad === 0) verdict = "순환"; // 상생+비화 혼합, 극 없음
  else verdict = "긴장";
  return { rels, verdict };
}

// ── 81수리 (전통 분류: 최상/상/길/중/흉/최흉) ─────────────
// 출처: 송대 81수원도 계열 전통표 (표기·분류는 문헌마다 소폭 차이가 있음)
const NM_SURI = {
  1: ["기본격", "최상"], 2: ["분리격", "흉"], 3: ["성형격", "상"], 4: ["부정격", "흉"], 5: ["정성격", "상"],
  6: ["계성격", "상"], 7: ["독립격", "길"], 8: ["개물격", "길"], 9: ["궁박격", "최흉"], 10: ["공허격", "최흉"],
  11: ["신성격", "상"], 12: ["박약격", "흉"], 13: ["지모격", "최상"], 14: ["이산격", "흉"], 15: ["통솔격", "상"],
  16: ["덕망격", "최상"], 17: ["건창격", "길"], 18: ["발전격", "길"], 19: ["고난격", "최흉"], 20: ["허망격", "최흉"],
  21: ["두령격", "최상"], 22: ["중절격", "흉"], 23: ["공명격", "최상"], 24: ["입신격", "상"], 25: ["안전격", "길"],
  26: ["영웅시비격", "최흉"], 27: ["중단격", "흉"], 28: ["파란격", "흉"], 29: ["성공격", "길"], 30: ["부몽격", "흉"],
  31: ["융창격", "최상"], 32: ["요행격", "상"], 33: ["승천격", "길"], 34: ["파멸격", "최흉"], 35: ["평범격", "상"],
  36: ["영걸시비격", "최흉"], 37: ["인덕격", "상"], 38: ["복록격", "길"], 39: ["안락격", "상"], 40: ["무상격", "최흉"],
  41: ["대공격", "최상"], 42: ["고행격", "최흉"], 43: ["미혹격", "최흉"], 44: ["마장격", "최흉"], 45: ["대지격", "길"],
  46: ["부지격", "최흉"], 47: ["출세격", "길"], 48: ["유덕격", "길"], 49: ["은퇴격", "중"], 50: ["불행격", "최흉"],
  51: ["춘추격", "중"], 52: ["능직격", "길"], 53: ["불화격", "흉"], 54: ["신고격", "최흉"], 55: ["불인격", "흉"],
  56: ["부족격", "최흉"], 57: ["노력격", "길"], 58: ["자력격", "길"], 59: ["불우격", "흉"], 60: ["암흑격", "흉"],
  61: ["영화격", "길"], 62: ["고독격", "흉"], 63: ["길상격", "길"], 64: ["침체격", "최흉"], 65: ["완미격", "길"],
  66: ["역난격", "최흉"], 67: ["성장격", "길"], 68: ["달성격", "길"], 69: ["쇠약격", "흉"], 70: ["암난격", "최흉"],
  71: ["불안격", "중"], 72: ["상반격", "흉"], 73: ["형통격", "길"], 74: ["불교격", "최흉"], 75: ["왕성격", "길"],
  76: ["이산격", "흉"], 77: ["강건격", "중"], 78: ["무력격", "흉"], 79: ["불신격", "흉"], 80: ["음영격", "최흉"],
  81: ["환희격", "길"],
};
function nmSuriOf(n) {
  const k = ((n - 1) % 81) + 1; // 81 초과는 81을 뺀 수로 봄 (전통 관례)
  return { num: n, reduced: k, name: NM_SURI[k][0], cat: NM_SURI[k][1] };
}

// ── 메인 분석 ─────────────────────────────────────────────
/**
 * analyzeName({ family:"김", given:"민준", school:"classic",
 *               hanja:[{ch,won,pil,jawon,hun}|null,...]|null, // 글자별 선택 한자
 *               strokes:[8,5,12]|null,  // 획수 직접 입력 (한자 선택보다 우선)
 *               sajuOhaeng: {목:2,...}|null })  // 사주 연계 (선택)
 * 자원오행이 사주 보충의 우선 수단, 발음오행은 차선 (성명학 정석).
 */
function analyzeName(opt) {
  const school = opt.school || "classic";
  const chars = (opt.family + opt.given).split("");
  const syl = chars.map((ch) => {
    const d = nmDecompose(ch);
    if (!d) return null;
    return {
      ch, cho: d.cho, jung: d.jung, jong: d.jong,
      choOh: nmConsOhaeng(d.cho, school),
      jongOh: d.jong ? nmConsOhaeng(d.jong, school) : null,
      ey: nmVowelEY(d.jung),
    };
  });
  if (syl.some((s) => !s)) throw new Error("한글 이름만 분석할 수 있습니다.");
  const fam = syl.slice(0, opt.family.length);
  const giv = syl.slice(opt.family.length);
  if (!giv.length) throw new Error("이름 부분이 비어 있습니다.");

  // ① 발음오행 — 3경로 상생 검사 (하나만 만족해도 상생 구조)
  const path1 = nmChainCheck(syl.map((s) => ({ label: s.ch + " 초성 " + s.cho, oh: s.choOh })));
  let path2 = null;
  const lastFam = fam[fam.length - 1];
  if (lastFam.jong) {
    path2 = nmChainCheck([{ label: lastFam.ch + " 받침 " + lastFam.jong, oh: lastFam.jongOh }]
      .concat(giv.map((s) => ({ label: s.ch + " 초성 " + s.cho, oh: s.choOh }))));
  }
  const fullChain = [];
  for (const s of syl) {
    fullChain.push({ label: s.ch + " 초성 " + s.cho, oh: s.choOh });
    if (s.jong) fullChain.push({ label: s.ch + " 받침 " + s.jong, oh: s.jongOh });
  }
  const path3 = nmChainCheck(fullChain);
  const paths = [
    { id: "① 초성 연쇄", ...path1 },
    ...(path2 ? [{ id: "② 성 받침 → 이름 초성", ...path2 }] : []),
    { id: "③ 받침 포함 전체 연쇄", ...path3 },
  ];
  const bestPath = paths.find((p) => p.verdict === "상생") || paths.find((p) => p.verdict === "순환") || paths[0];
  const pronVerdict = paths.some((p) => p.verdict === "상생") ? "상생"
    : paths.some((p) => p.verdict === "순환") ? "순환" : "긴장";

  // ② 음양 배열 (모음)
  const eyArr = syl.map((s) => s.ey);
  const uniq = new Set(eyArr.filter((e) => e !== "중"));
  const eyVerdict = uniq.size >= 2 ? "조화" : (uniq.size === 0 ? "중성" : "단일");

  // ③ 자원오행 — 선택한 한자 자체가 품은 오행 (부수 기반 근사)
  let jawon = null;
  const hj = opt.hanja && opt.hanja.length === chars.length ? opt.hanja : null;
  if (hj && hj.some((h) => h)) {
    const ohs = [...new Set(hj.filter((h) => h && h.jawon).map((h) => h.jawon))];
    let chain = null;
    if (hj.every((h) => h && h.jawon))
      chain = nmChainCheck(hj.map((h, i) => ({ label: chars[i] + "(" + h.ch + ") " + h.jawon, oh: h.jawon })));
    jawon = { items: hj, ohs, chain };
  }

  // ④ 사주 연계 — 자원오행 우선, 발음오행 차선
  let sajuLink = null;
  if (opt.sajuOhaeng) {
    const nameOh = new Set();
    for (const s of syl) { nameOh.add(s.choOh); if (s.jongOh) nameOh.add(s.jongOh); }
    const missing = Object.entries(opt.sajuOhaeng).filter(([, n]) => n === 0).map(([o]) => o);
    const byJawon = missing.filter((o) => jawon && jawon.ohs.includes(o));
    const byPron = missing.filter((o) => !byJawon.includes(o) && nameOh.has(o));
    sajuLink = {
      nameOhaeng: [...nameOh],
      jawonOhaeng: jawon ? jawon.ohs : [],
      sajuMissing: missing,
      suppliedByJawon: byJawon,
      suppliedByPron: byPron,
      supplied: byJawon.concat(byPron),
      notSupplied: missing.filter((o) => !byJawon.includes(o) && !byPron.includes(o)),
    };
  }

  // ⑤ 수리사격 — 획수: 직접 입력 > 선택 한자의 원획
  let suri = null;
  let strokes = (opt.strokes && opt.strokes.length === chars.length && opt.strokes.every((n) => n > 0)) ? opt.strokes : null;
  let strokeSource = strokes ? "직접 입력" : null;
  if (!strokes && hj && hj.every((h) => h && h.won > 0)) {
    strokes = hj.map((h) => h.won);
    strokeSource = "선택한 한자의 원획(原劃)";
  }
  if (strokes) {
    const st = strokes;
    const famS = st.slice(0, opt.family.length).reduce((a, b) => a + b, 0);
    const givS = st.slice(opt.family.length);
    const g1 = givS[0], g2 = givS[givS.length - 1];
    suri = {
      won: { ...nmSuriOf(givS.length > 1 ? g1 + g2 : g1 + 1), label: "원격(元)", period: "초년" },
      hyeong: { ...nmSuriOf(famS + g1), label: "형격(亨)", period: "청년" },
      i: { ...nmSuriOf(famS + g2), label: "이격(利)", period: "중년" },
      jeong: { ...nmSuriOf(famS + givS.reduce((a, b) => a + b, 0)), label: "정격(貞)", period: "말년·총운" },
      source: strokeSource,
      note: givS.length === 1 ? "외자 이름은 원격에 허수 1을 더하는 관례를 따랐습니다." : null,
    };
  }

  return { syl, fam, giv, school, schoolLabel: NM_SCHOOLS[school].label,
    paths, bestPath, pronVerdict, eyArr, eyVerdict, jawon, sajuLink, suri };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { nmDecompose, nmConsOhaeng, nmVowelEY, nmRelation, nmChainCheck, nmSuriOf, analyzeName, NM_SCHOOLS, NM_SURI };
}
