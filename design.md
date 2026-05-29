# 결 (Gyeol) — Design System

> **가만히 쌓이는, 보통의 날들.**
> Soft Mint 톤 + 부크크 명조 본문의 한국어 일상 기록 앱 디자인 시스템.
> 본 문서는 React(Vite + TypeScript) 웹 구현의 단일 출처(Single Source of Truth)다.
> 제품 원칙·하지 말 것은 `CLAUDE.md`를, 시장·여정·수익화 근거는 `조각_제품기획서.docx`를 따른다.
> 앱 이름과 entry 단위 모두 **결**로 통일.

- 버전: 0.2 (Soft Mint pivot)
- 작성일: 2026-05-28
- 톤 프리셋: **Soft Mint** — 회색 매트 위에 놓인 흰 카드, 민트 그린 액센트, **부크크 명조 본문**
- 메타포: 노트북 위에 놓인 작은 메모지 (모바일 카드 + 한국어 명조 본문)
- 다크모드: v1 제외

---

## 목차

1. 브랜드 한 줄과 인격
2. 색 토큰 (Soft Mint palette)
3. 타이포그래피 (부크크 명조)
4. 레이아웃 & 매트 프레임
5. 표면 — 라운드 · 보더 · 그림자 없음
6. 모션
7. 아이콘
8. 컴포넌트 명세
9. 화면 명세 (오늘 / 돌아보기 / 캘린더)
10. 보이스 & 톤
11. 안티 패턴 체크리스트
12. 접근성
13. React 구현 노트
14. 수익화 표면 (Plans · Monetization)
부록 A. 폰트 폴백
부록 B. CLAUDE.md cross-check

---

## §1. 브랜드 한 줄과 인격

**앱 이름.**
**결 (Gyeol)** — 나무결·하루의 결. 1음절의 여백, 부크크 명조와 결이 맞고, "결을 새기다 / 하루의 결 / 결결이 쌓이다" 같은 카피 확장이 자연스럽다.

**용어.** 앱 이름과 entry 단위 모두 **결**. ("오늘의 결을 남기다 / 결이 결결이 쌓이다")

**제품 한 줄 (tagline).**
> 가만히 쌓이는, 보통의 날들.

**제품 한 줄 정의 (longer).**
하루의 순간을 사진·영상·글·음성 무엇으로든 가볍게 한 결씩 남기고, 그 기록이 사라지지 않는 개인 아카이브로 결결이 쌓이며, 원할 때 가까운 소수와 같은 페이지를 비동기로 공유하는 일상 기록 앱.

**인격 (persona).**
오래된 편지를 다시 펼치는 사람. 조용하고, 비난하지 않으며, 빈 칸을 부끄럽게 만들지 않는다. 큰 소리로 칭찬하지 않고, 작은 소리로 곁에 머문다.

**디자인 한 줄 명제.**
> 기록은 가볍게, 표면은 깨끗하게.

표면은 흰 카드처럼 깨끗하지만, 본문은 명조체로 천천히 읽힌다. 디지털 미니멀과 한국어 활자 전통의 만남이다.

---

## §2. 색 토큰 (Soft Mint palette)

semantic 토큰만 컴포넌트에서 사용한다. 토큰 이름은 레퍼런스 HTML과 호환되도록 `--color-*` 네이밍을 따른다.

### 2.1 의미 토큰

| 토큰 | HEX | 용도 |
|------|------|------|
| `--color-background-primary` | `#FFFFFF` | 메인 카드 표면 |
| `--color-background-secondary` | `#F2F4F6` | 매트 프레임, 썸네일·칩 배경, today cell fill |
| `--color-background-info` | `#E6F5F0` | PromptChip 배경 (민트 틴트) |
| `--color-text-primary` | `#1A1A1A` | 본문, 헤드라인 |
| `--color-text-secondary` | `#5F6063` | 보조 본문, 요일·메타 |
| `--color-text-tertiary` | `#9AA0A6` | 시각·tertiary 메타, placeholder |
| `--color-text-info` | `#1D9E75` | PromptChip 텍스트·아이콘 |
| `--color-text-on-accent` | `#FFFFFF` | accent 위 텍스트 |
| `--color-border-tertiary` | `#ECEEF0` | 0.5px 기본 보더, 디바이더 |
| `--color-border-secondary` | `#D9DCE0` | dashed 캡처 진입 영역 |
| `--color-accent` | `#1D9E75` | primary CTA, 캘린더 dot |
| `--color-accent-press` | `#178B66` | hover · press |

### 2.2 색 사용 규칙

- 빨강·진한 파랑·옐로우 신호색 **사용 금지**. 경고는 텍스트로만 (`--color-text-tertiary`).
- 한 화면당 강조색은 1종(민트). 보조 강조 토큰을 추가하지 않는다.
- 단일 색 채움 영역이 화면의 30%를 넘지 않는다 (카드 외 단조).
- 민트 (`#1D9E75`) 위 흰 텍스트는 **14px 이상 weight 700**일 때만 허용 (§12 대비비 참조).

---

## §3. 타이포그래피 (부크크 명조)

### 3.1 폰트 패밀리

- 본문 (단일): **`BookkMyungjo`** (CDN 호스팅, weight 400 Light · 700 Bold 2 종)
- 폴백 체인: `'BookkMyungjo', 'Apple Myungjo', 'Nanum Myeongjo', 'KoPub Batang', 'Batang', serif`
- @font-face 정의는 `src/styles/base.css` 상단에 위치 — `font-display: swap`로 FOIT 방지.

산세리프 도입 안 함. UI 라벨도 동일 명조체(weight 700)로 통일한다.

### 3.2 스케일

| 토큰 | size / line-height | weight | 용도 |
|------|---------------------|--------|------|
| `--type-display` | 22 / 30 | 700 | DayHeader 날짜 |
| `--type-title` | 20 / 28 | 700 | Lookback 요약 |
| `--type-section` | 17 / 24 | 700 | 월 네비 타이틀 |
| `--type-body` | 15 / 22 | 400 | 본문 캡처 카피 |
| `--type-body-sm` | 14 / 20 | 400 | FragmentItem 제목, 버튼 |
| `--type-meta` | 13 / 18 | 400/700 | 요일·날짜 메타 |
| `--type-caption` | 12 / 16 | 400 | tertiary 메타 |
| `--type-micro` | 11 / 14 | 500 | TabBar 라벨, 요일 헤더 |

### 3.3 규칙

- `letter-spacing: 0`. 명조체는 자간 음수 금지.
- `font-variant-numeric: tabular-nums` 전역 적용 — 시각·날짜·요일이 흔들리지 않게.
- BookkMyungjo는 **두 weight만 제공**(400, 700). 500·600을 쓰지 않는다 — 폴백 시 의도와 다르게 표시될 수 있음.
- 본문 line-height 비율 `1.5` 기준 (명조체는 sans-serif보다 약간 넉넉히).

---

## §4. 레이아웃 & 매트 프레임

### 4.1 구조

```
<body>                            ← bg: --color-background-secondary (매트 컬러)
  <div class="matte">             ← max-width 508, 좌우 14px padding (데스크톱)
    <main class="card">           ← bg: white, 0.5px border, radius xl, overflow hidden
      <div class="card__body">    ← padding 18px (내부 콘텐츠 영역)
        <Outlet />
      </div>
      <TabBar />                  ← border-top 0.5px tertiary, 카드 내부 하단
    </main>
  </div>
</body>
```

### 4.2 폭

- 카드 최대 폭: `480px` (모바일 스크린 + 데스크톱 카드 미러). 매트 패딩 좌우 14 포함 시 outer ≈ `508px`.
- 모바일 뷰(`max-width: 480px`)에서는 매트 패딩 0, 카드 라운드 0, 좌우 보더 0 → 풀 스크린 시트로 자연 변환.

### 4.3 8pt 그리드

| 토큰 | px |
|------|----|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 24 |
| `--space-6` | 32 |
| `--space-7` | 48 |
| `--space-8` | 64 |

- 카드 내부 콘텐츠 간격 기본: `--space-4` (16px) → 레퍼런스의 14–18px 호흡에 가장 근접.
- 섹션 간격 큰 호흡: `--space-5`.

---

## §5. 표면 — 라운드 · 보더 · 그림자 없음

### 5.1 라운드

| 토큰 | px | 용도 |
|------|----|------|
| `--border-radius-sm` | 4 | 작은 칩, 인풋 |
| `--border-radius-md` | 8 | 썸네일, dashed 캡처 박스 |
| `--border-radius-lg` | 14 | (매트 외곽, 향후 사용) |
| `--border-radius-xl` | 20 | 메인 카드 외곽 |

- **9999px 풀 캡슐 금지** — 단, MediaToggle의 4개 매체 원형 버튼(`border-radius: 50%`)은 명시적 예외 (레퍼런스 시각 일관성, §8.6).

### 5.2 그림자 — 없음

- 카드는 0.5px tertiary 보더 하나로만 분리.
- elevation 단계를 정의하지 않는다 (카드는 종이 위에 종이 한 장을 얹은 평면 인상).

### 5.3 보더

- 모든 보더 기본 두께 `0.5px` (`--color-border-tertiary`).
- 점선·dashed는 캡처 진입 영역 한 곳에만 한정 (`--color-border-secondary` 0.5px dashed).
- 1px 이상 굵은 보더 도입 안 함.

---

## §6. 모션

원칙: **명조체가 종이에 닿듯**. 빠르지 않고, 튕기지 않는다.

| 토큰 | 값 |
|------|----|
| `--motion-quick` | `120ms` |
| `--motion-base` | `220ms` |
| `--motion-slow` | `360ms` |
| `--ease-soft` | `cubic-bezier(0.2, 0, 0, 1)` (감속 위주, 오버슈트 없음) |

### 패턴

- **저장 성공** — 새 fragment 카드 `opacity 0→1 + translateY 4→0`, `--motion-base`, 1회.
- **PromptChip dismiss** — `opacity 1→0 + scale 1→0.98`, `--motion-quick`.
- **버튼 press** — `scale(0.98)` `--motion-quick`. ripple 금지.
- **탭 전환** — 페이지 cross-fade `--motion-base`만. 슬라이드·페이지 넘김 금지.

### 금지

- 좋아요 폭죽, confetti, 스파클.
- 햅틱 강한 패턴 (soft tap 1회만).
- `prefers-reduced-motion: reduce` → 모든 transform 제거, opacity만 유지, duration `--motion-quick` 단축.

---

## §7. 아이콘

### 7.1 스타일

- **라이브러리: `lucide-react`** (사용자 지정).
- stroke 1.5 (기본), 1.75 (PromptChip), 2.0 (활성 TabBar 아이콘)
- round cap, round join.
- 색: `--color-text-primary` 기본, `--color-text-tertiary` 비활성, `--color-text-info` 정보, `--color-accent` 강조.
- **fill variant 사용 금지** — outline only.

### 7.2 매체 4종 (사진 · 영상 · 글 · 음성)

- 4개 모두 동일한 시각 무게 (stroke, size, hit area). 카메라가 더 크거나 1번 자리에 있어선 안 된다.
- 매핑:
  - 사진 — `Camera`
  - 영상 — `Video` (재생 삼각형 fill 금지 → outline only)
  - 글 — `PenLine`
  - 음성 — `Mic`

### 7.3 TabBar 아이콘

- 오늘 — `Disc` (원 + 가운데 점, "오늘 인디케이터" 인상)
- 캘린더 — `Calendar`
- 돌아보기 — `History`
- 활성 탭은 stroke 1.5 → 2.0, 텍스트 색 tertiary → primary, weight 400 → 700.
- 빨간 dot 알림 배지 금지 (탭바, 헤더 어디에도).

### 7.4 상태 표식

- 캘린더 기록 있는 날 = `5px` 원 dot, `--color-accent`.
- 오늘 = 셀 배경 `--color-background-secondary` 채움 + weight 700.
- 외곽선·border로 today를 강조하지 않는다 (소프트 fill 방식).

---

## §8. 컴포넌트 명세

각 컴포넌트는 **anatomy / states / props / 금지** 4블록.

### 8.1 Button

**Anatomy.** label + optional leading icon. height 40(default) / 32(sm) / auto(block). padding-x: 16 / 12 / 11. radius `--border-radius-md`. font 명조 700.

**Variants.**
- `primary` — bg `--color-accent`, text `--color-text-on-accent`
- `secondary` — bg `--color-background-secondary`, text primary
- `ghost` — bg transparent, text primary

**Modifier.**
- `--block` — 풀폭, padding 11px.

**States.** default / hover / press / disabled / loading.
- press: `scale(0.98)` `--motion-quick`
- loading: `...` 점 3개 정적

**금지.** `border-radius: 9999px` (캡슐), 그라데이션, 그림자.

---

### 8.2 TextField

**Anatomy.** label (옵션, 위) + input + 0.5px 밑줄 + helper (옵션, 아래).

**시각.** input 배경 없음. focused 시 밑줄 0.5 → 1px, 색 tertiary → primary.

**Placeholder.** tertiary 색, 동일 명조체 (italic 적용하지 않음 — 한글 명조 italic 가독성 저하).

**금지.** 둥근 박스 input (Material), floating label.

---

### 8.3 FragmentItem

**Anatomy.**
```
[썸네일 46×46 md radius secondary bg] [제목 14px primary / 시각 12px tertiary]
```
- 사진/영상: 실제 썸네일.
- 글/음성: `Quote` / `Mic` 그리프 (tertiary 색).

**States.** default / hover (bg `--color-background-secondary`) / focused / pressed.

**Props.**
```ts
type FragmentItemProps = {
  fragment: Fragment;
  onOpen?: (id: string) => void;
};
```

**금지.** 좋아요·하트·댓글 카운트 슬롯, 작성자 아바타 강조, 조회수.

---

### 8.4 PromptChip

**Anatomy.** 좌측 카테고리 아이콘 16px (`--color-text-info`) + 텍스트 + 우측 ✕ 15px (opacity 0.55).

**시각.** 카테고리별 부드러운 흙빛 톤 팔레트(10색)를 PromptChip이 inline CSS 변수(`--prompt-bg` / `--prompt-fg`)로 주입, `.prompt` 가 폴백 포함해 받음. 모두 ~5-7% 채도의 연한 틴트 + 같은 색조의 깊은 톤. 한 화면에서 어떤 카테고리가 떠도 한 결로 읽히도록 채도·명도 범위 일치. 폴백(변수 미주입 시): 기존 민트 `--color-background-info` / `--color-text-info`. padding `9px 11px`, radius md, **보더 없음**.

카테고리 → (bg / fg) 매핑:
- music → `#E6F5F0` / `#1D9E75` (민트)
- sky → `#E6F0F5` / `#3A7AA0` (옅은 하늘)
- people → `#F5E8E2` / `#B85C3A` (따뜻한 코랄)
- food → `#F5F0E2` / `#A07C2E` (옅은 버터)
- feeling → `#F5E6EC` / `#A04A6E` (옅은 로즈)
- object → `#ECF0E6` / `#5C7A4A` (옅은 세이지)
- place → `#ECE6F5` / `#6E4AA0` (옅은 라벤더)
- sound → `#E2F0EC` / `#2E7C72` (옅은 청록)
- time → `#EFEAE2` / `#7A6048` (옅은 토프)
- light → `#F5EFE2` / `#9C7B3A` (옅은 모래)

**카테고리 시스템.** 10개 카테고리(`music · sky · people · food · feeling · object · place · sound · time · light`) × 카테고리당 2–3 변형 = 총 ~25개 prompt가 `src/data/prompts.ts`에 정의됨. 모든 prompt는 **명확한 의문형**("~인가요?", "~어땠나요?", "~있나요?")으로 통일 — 단어 나열형 fragment 금지. `pickRandomPrompt()` 가 매번 무작위로 하나를 반환하고, `useDailyPrompt(dayKey)`의 `useMemo([dayKey, dismissed])`가 마운트 동안 안정화 → **새로고침·재진입할 때마다 새 prompt**. dismiss는 여전히 `localStorage('jogak:prompt-dismissed:<dayDate>')`로 그날 단위 영속화. 카테고리별 lucide 아이콘 매핑:
- music → `Music`, sky → `Cloud`, people → `Users`, food → `Coffee`
- feeling → `Heart`, object → `Hand`, place → `MapPin`
- sound → `Volume2`, time → `Clock`, light → `Sun`

**Props.**
```ts
type PromptChipProps = {
  category: PromptCategory; // 10 카테고리 중 하나
  message: string;
  onDismiss: () => void;
};
```

**동작.** ✕ 탭 → `--motion-quick` 페이드아웃 → `localStorage`(키 `jogak:prompt-dismissed:<dayDate>`)에 저장되어 그날 다시 노출되지 않음. 다음 날엔 새 prompt가 자연스레 노출. `useDailyPrompt(dayKey)` 훅이 이 상태를 캡슐화.

**금지.** 강제 노출, 닫지 못하는 prompt, 반복 toast, prompt 새로고침 버튼("다른 거 보여줘") — 일부러 한 번에 하나만.

---

### 8.5 CaptureEntry

**Anatomy.** 0.5px dashed `--color-border-secondary` 박스 + 가운데 카피 "오늘, 무엇이든 한 결 남겨요". padding `18px 16px`, radius lg, 텍스트 15px secondary.

**동작.** 탭 → 4매체 시트 등장. 입력은 오프라인에서도 즉시 로컬 큐로.

**금지.** 4개 매체 중 하나 우선 표시, 추천 매체 배지, 네트워크 가드.

---

### 8.6 MediaToggle (캡슐 예외 컴포넌트)

**Anatomy.** 4 버튼 가로 균등(`justify-content: space-around`). 각 버튼 = `48×48` 원형(`border-radius: 50%`) `--color-background-secondary` 배경 + 20px lucide 아이콘 + 5px gap + 12px 라벨 secondary.

**예외 명시.** §11 캡슐 금지 룰에 대한 **단 하나의 예외** — 4매체의 동등성을 시각적으로 표현하기 위해 원형을 사용한다. 다른 컴포넌트에서는 50% 원형 도입 안 함.

**Props.**
```ts
type MediaToggleProps = {
  onSelect: (type: 'photo' | 'video' | 'text' | 'voice') => void;
};
```

**금지.** 정렬 강조, 추천 배지, 신규 라벨, 사진 우선 표시.

---

### 8.7 DayHeader

**Anatomy.**
```
요일 (작게) [· 오늘 태그]
날짜 (크게, 명조 700)
```
- 요일: 13px secondary
- 날짜: 22px primary 700 (`--type-display`)
- 보더 라인 없음 (카드 내부 첫 블록이라 구분 불필요)

---

### 8.8 CalendarCell

**Anatomy.** aspect-ratio 1, radius md, flex column center, 13px primary 숫자 + 5px gap + 5px dot.

**States.** default / hover (bg secondary) / today (bg secondary, weight 700) / hasRecord (dot 표시) / outside (opacity 0.5).

**Props.**
```ts
type CalendarCellProps = {
  date: Date;
  hasRecord: boolean;
  isToday: boolean;
  isOutsideMonth: boolean;
  onSelect?: (date: Date) => void;
};
```

**금지.** 빨강·주황으로 "기록 없는 날" 강조. heatmap 채도 채움 (잔디 형식).

---

### 8.9 LookbackRow

**Anatomy.**
- 좌측 30px 컬럼: 날짜(12px tertiary) + 요일(13px primary 700)
- 우측 flex 컬럼:
  - **fragment 1개**일 때: 54×54 썸네일 + flex 1 caption chip(13px primary, bg secondary, radius md, padding `8px 10px`)
  - **fragment 2개 이상**일 때: 54×54 썸네일 타일을 나란히 (caption 없음)

**렌더 규칙.** 빈 날은 **컴포넌트가 그려지지 않음** — 상위 LookbackPage가 group 단계에서 필터링.

**금지.** "기록 없음" placeholder row, 회색 비활성 row.

---

### 8.10 TabBar

**Anatomy.** viewport 하단 고정, 풀폭 흰 strip + `border-top: 0.5px tertiary`. 내부에 `--column-max`(480px) 폭의 inner 래퍼 + 3 셀 균등(`flex: 1`). 각 셀 `padding: 10px 0`, 아이콘 19px(stroke 1.5) + 2px gap + 11px 라벨(weight 500). 높이 토큰 `--tabbar-height: 60px`.

**활성 상태.** 텍스트 색 tertiary → primary, weight 400 → 700, 아이콘 stroke 1.5 → 2.0.

**Position.** `position: fixed; bottom: 0; left: 0; right: 0;` — 카드와 분리. `z-index: 10`, `padding-bottom: env(safe-area-inset-bottom, 0)` 로 iOS notch 대응. 매트의 하단 패딩에 `var(--tabbar-height) + safe-area`를 더해 콘텐츠가 가리지 않게 한다.

**금지.** 빨간 dot 배지, 가운데 floating action button (FAB), 활성 탭 배경 채움.

---

### 8.10a SoftBar (오프라인·동기화 안내)

**Anatomy.** 카드 본문 최상단 1줄 strip. 좌측 `CloudOff` 14px + 한 줄 메시지.

**시각.** bg `--color-background-info`, 텍스트·아이콘 `--color-text-info`, padding `9px 12px`, radius md. 빨강 금지 — 모든 안내는 info 톤.

**Props.**
```ts
type SoftBarProps = { message?: string };
```

**동작.** `useOnlineStatus()` 훅이 `navigator.onLine` 모니터링. offline일 때만 RootLayout이 렌더. 캡처는 정상 동작 (제품 원칙 §2-1).

---

### 8.10b Segmented (탭 토글)

**Anatomy.** 가로 inline-flex, padding 3px, bg `--color-background-secondary`, radius md. 자식 버튼들 6px radius. 활성 버튼만 bg `--color-background-primary` + weight 700 + 1px ambient shadow.

**Props.**
```ts
type SegmentedProps<V extends string> = {
  value: V;
  onChange: (next: V) => void;
  options: ReadonlyArray<{ value: V; label: string }>;
  ariaLabel?: string;
};
```

**용도.** Lookback 페이지의 주/월/연 토글. 향후 다른 토글 UI에도 재사용 가능.

**금지.** 활성 버튼에 색 액센트(민트) 채움 (조용한 톤 유지). 4개 이상 옵션 (3개 권장 한도).

---

### 8.10c ConfirmSheet

**Anatomy.** Sheet 기반 모달. body는 안내 메시지 1단락. footer는 2열 grid — "그만두기" secondary + "비우기" primary.

**Props.**
```ts
type ConfirmSheetProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};
```

**용도.** 결 비우기, 공유 공간 나가기 등 되돌릴 수 없는 동작 전에 한 박자.

**카피 패턴.** 제목은 의문문 ("이 결을 비울까요?"), 메시지는 결과 명시 ("비운 결은 되돌릴 수 없어요."). "삭제" 대신 "비우다".

---

### 8.10d SpaceChip + SpaceSheet + CreateSpaceSheet + InviteSheet (공유 공간 진입)

CLAUDE.md §5 "솔로 로그도 멤버 1명 공간으로 통일" + §12 성장 루프의 프런트 구현.

#### SpaceChip
- 모든 메인 페이지(Today/Calendar/Lookback) 최상단의 작은 pill
- 표시: 현재 공간 이름 + (공유 공간일 때) `Users` 아이콘 + 멤버 수 + `ChevronDown`
- 탭 → `SpaceSheet`

#### SpaceSheet
- 모든 공간 리스트: 각 행에 이름·"나만의 공간"/멤버 N명 표시, 현재 활성 공간은 `Check`
- 행 탭 → `setActiveSpace(id)` + sheet 닫힘 → 모든 페이지 데이터가 그 공간으로 필터링됨
- 푸터 액션:
  - 공유 공간이 활성일 때만: "이 공간에 초대하기" (`Send`)
  - 항상: "+ 새 공유 공간"

#### CreateSpaceSheet
- 단일 텍스트 필드 "공간 이름" (최대 20자, 자동 포커스, autocomplete off)
- "만들기" → `createSpace(name)` + 즉시 활성 공간으로 전환
- 안내문: "가까운 사람과 같은 페이지를 비동기로 함께 채우는 공간이에요…"

#### InviteSheet
- sheet 오픈 시 즉시 `generateInvite(spaceId)` → 토큰 발급 + IDB 영속 (7일 만료)
- 표시:
  - 헤더: "초대" (Sheet 표준)
  - 큰 문구 "이 페이지 같이 볼래?" (17px 700 — CLAUDE.md §12 "보상 미끼가 아닌 친밀한 제안" 톤)
  - 안내 한 줄
  - secondary bg 박스에 URL `${origin}/invite/${token}` 표시
- 푸터: "링크 복사" primary CTA (`Copy` → 클릭 시 navigator.clipboard) → "복사됐어요" (`Check`)
- 금지: "친구 초대하고 포인트", 보상 미끼, 발송 알림(이메일/SMS) — 사용자가 자기 메신저로 직접 전달

---

### 8.11a Sheet (generic bottom sheet)

**Anatomy.** viewport 하단에서 올라오는 모달. 풀폭(모바일) 또는 `var(--column-max)` 폭 중앙(데스크톱). 상단 라운드 xl, 하단 사각. 헤더(타이틀 + ✕) + 스크롤 가능한 body + 선택적 footer.

**시각.** 배경 `--color-background-primary`, overlay `rgba(20,20,22,0.32)`. 등장 애니메이션 = body `translateY 16 → 0` + overlay `opacity 0 → 1`, `--motion-base`.

**동작.** Esc 키 또는 overlay 탭 시 닫힘. 열려 있는 동안 `body.overflow = hidden`. `createPortal`로 `document.body` 직속 마운트.

**Props.**
```ts
type SheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};
```

**금지.** 풀스크린 강제 cover (사용자가 escape 못 함), 드래그-to-dismiss 미구현 상태에서 인디케이터만 보여주기.

---

### 8.11b CaptureSheet (Sheet 구체 구현)

**Anatomy.** Sheet 안에:
1. **타입 탭 4개** (사진·영상·글·음성) — 활성 탭은 `--color-background-info` 배경 + `--color-text-info`
2. **타입별 입력 영역**:
   - **사진** (`PhotoCapture`):
     - 초기: 두 옵션 (점선 박스 2개) — **"카메라로 찍기"** / **"갤러리에서 선택"**
     - "카메라로 찍기" → `getUserMedia({ video: { facingMode: 'environment' }, audio: false })` 라이브 프리뷰 + 흰 셔터 버튼 + 앞뒤 전환(`RefreshCcw`) + 취소. 셔터 → `canvas.drawImage` → `toBlob('image/jpeg', 0.92)` → preview
     - "갤러리에서 선택" → `<input type="file" accept="image/*">` (mobile 브라우저는 capture 가능)
     - 캡처 후: contain 미리보기 + "다시 선택" 오버레이
   - **영상** (`VideoCapture`):
     - 초기: 동일 두 옵션
     - "카메라로 찍기" → `getUserMedia({ video: {...}, audio: true })` 라이브 프리뷰 + 빨간 record 셔터 → `MediaRecorder` 시작. 녹화 중 상단 `● 0:12` 뱃지 + 셔터가 정지(`Square`)로 변경. 정지 → `video/webm` blob → preview
     - "갤러리에서 선택" → `<input type="file" accept="video/*">`
   - **글**: 6행 textarea, max 500자, placeholder는 부드러운 한 줄
   - **음성**: `MediaRecorder({ audio: true })` 기반 녹음/재생 토글 (Mic ↔ Square ↔ Play/Pause)
3. **메모 인풋** (사진·영상·음성 한정): 80자 한 줄 caption
4. **푸터**: primary `--block` "저장" 버튼

**저장 조건.** `title.trim().length > 0 || previewUrl !== null` — 빈 상태에서는 저장 비활성.

**타입 전환 시 미리보기 리셋** — 다른 타입으로 바꾸면 이전 첨부는 폐기 (의도된 단순화, 한 sheet에서 하나의 결만).

**Props.**
```ts
type CaptureSheetProps = {
  open: boolean;
  initialType: MediaType;
  onClose: () => void;
  onSave: (draft: CaptureDraft) => void;
};
type CaptureDraft = {
  type: MediaType;
  title: string;
  previewUrl?: string;
};
```

**금지.** "다음에 다시 작성" 같은 자동 저장 인디케이터 (압박), 사진 필터·편집 도구 (가벼움 원칙 위반), 매체 타입 추천 배지.

---

### 8.11 YearAgoCard

**Anatomy.** 상단 0.5px tertiary 디바이더 + 14px padding-top + "1년 전 오늘" 라벨(12px tertiary) + 8px gap + 썸네일(48×48 md radius secondary) + 10px gap + 캡션(14px primary) + 날짜 메타(12px tertiary).

**노출 조건.** 1년 전 같은 `dayDate`에 fragment가 1개 이상 존재할 때만. 없으면 렌더하지 않음.

**금지.** "기억하세요?", "잊지 마세요!" 강한 호출.

---

## §9. 화면 명세

각 화면은 **구성 / 데이터 / 상태(empty·loading·error·success·skeleton) / 인터랙션 / 금지** 5블록.

### §9.A — 오늘 (`/`)

#### 구성
1. `DayHeader` — 요일 + "오늘" + 날짜
2. `PromptChip` (옵션) — 민트 틴트 칩
3. `CaptureEntry` — dashed 박스
4. `MediaToggle` — 4 원형 버튼
5. 섹션 sub 라벨 "오늘 남긴 결 N" (12px tertiary)
6. `FragmentItem` 리스트 (시간 역순)
7. `TabBar` (카드 하단)

#### 데이터
- `fragments`: 오늘 user의 personal space의 fragment 배열 (CLAUDE.md §5)
- `prompt`: 그날 부드러운 prompt (사용자가 dismiss했으면 null)
- offline queue 상태

#### 상태

| 상태 | 표시 |
|------|------|
| empty (결 0개) | 섹션 sub 숨김, MediaToggle 강조 |
| loading | 헤더 즉시, 리스트는 fragment skeleton 3개 (정적 회색 box, 펄스 금지) |
| error (네트워크) | 카드 상단 안쪽 1줄 안내, tertiary 색, 캡처는 정상 동작 |
| success (저장 직후) | 새 카드 fade+rise 1회 |

#### 인터랙션
- 캡처: 3탭 이내, 오프라인 동작, 낙관적 로컬 쓰기.
- prompt ✕ → 그날 다시 노출 안 됨.

#### 금지
- streak / "N일째".
- 좋아요·조회수.
- "오늘 안 남기면 사라져요" 류 카피.
- 강제 로그인 게이트.

#### Day 0 변형 (온보딩)

CLAUDE.md §11 "첫 화면 = 첫 캡처". 가입 폼·튜토리얼·오버레이·진행 단계 표시 일체 없음.

- **트리거**: `localStorage.gyeol:onboarded` 가 미설정. `useOnboarding()` 훅이 캡슐화.
- **차이점**:
  - `PromptChip` 자리에 **`WelcomeNote`** — `환영해요.` (17px 700 primary) + `지금, 무엇이든 한 결을 가볍게 남겨주세요.` (15px secondary)
  - **"오늘 남긴 결 N" 섹션과 fragment 리스트 숨김** — 깨끗한 캔버스로 캡처에 집중
  - DayHeader, CaptureEntry, MediaToggle, CaptureSheet 그대로
  - TabBar 그대로 노출 (사용자가 자유롭게 탐색할 수 있어야 함 — 락인 금지)
- **종료**: 첫 캡처 저장 성공 → `markOnboarded()` 호출 → 다음 렌더부터 일반 UI(PromptChip + 섹션 + 리스트)
- **금지**: 튜토리얼 오버레이, 가입 폼/CTA, 회원가입 페이지로의 리다이렉트, 진행 단계 인디케이터, "건너뛰기" 버튼 (건너뛸 게 없음).

---

### §9.B — 돌아보기 (`/lookback`)

상단 **Segmented 토글** (주 / 월 / 연)로 회고 범위 전환. 토글 자체는 항상 노출되어 사용자가 자유롭게 이동할 수 있다.

#### B-1 주간 (week)
1. 기간 라벨 "지난 한 주 · 5월 22 – 28일" (13px secondary)
2. 요약 "6개의 순간을 남겼어요" (20px primary 700)
3. `LookbackRow` 리스트 (기록 있는 날만, **빈 날 미렌더**)

> "이번 주 영상으로 보기"(자동 브이로그) CTA는 기능이 실제로 구현되기 전까지 넣지 않는다 — 동작 없는 버튼은 신뢰를 해친다. 브이로그 라운드에서 이 자리에 풀폭 primary CTA로 되살린다.

#### B-2 월간 (month)
1. 기간 라벨 "2026년 5월" + 요약 "{N}개의 순간을 남겼어요"
2. **LookbackHero** — 이달의 대표 결 한 컷 (4:3 cover image + 하단 그라데이션 caption). 사진/영상 없으면 텍스트 인용 형태 카드로 fallback. 탭하면 그날 `/days/:dayDate` 진입
3. **Inline 통계 sentence** — "{N}개의 결 · {M}일에 걸쳐" (`--type-meta`, secondary)
4. **MediaBreakdown** — 매체별 카운트 칩 ("사진 7 · 글 3 · 영상 1 · 음성 1"), bg secondary 단일 묶음 패널
5. **섹션 라벨 "주"** (`--type-caption`, tertiary)
6. **WeekRow** 리스트 — 주차별 그룹(일~토). 각 행:
   - 헤더: 날짜 범위 (14px 700) + "{N}개의 결" (12px tertiary)
   - 하단: 4-col grid의 정사각 thumbnail (최대 4개, 더 크고 균등)

#### B-3 연간 (year)
1. 기간 라벨 "{YYYY}년" + 요약 "{N}개의 순간을 남겼어요"
2. **LookbackHero** — 올해의 대표 결 한 컷
3. **Inline 통계** — "{N}개의 결 · {M}개월에 걸쳐"
4. **MediaBreakdown** — 연간 매체 합계
5. **섹션 라벨 "월"**
6. **MonthTile 2-col grid** — 기록 있는 월만 (최신 월 먼저). 각 타일:
   - 정사각형 cover (그 달의 대표 사진/영상, 없으면 큰 "5월" 텍스트가 secondary bg 위에)
   - 하단 그라데이션 오버레이: 월 라벨(14px 700 흰색) + "{N}개의 결" (12px 흰 0.85)
   - 탭하면 그 달의 최신 결 날짜로 `/days/:dayDate` 진입

#### 데이터 (공통)
- `useFragmentStore.fragments`를 범위에 맞게 필터링
- Week: 이번 주(일~토), Month: 이번 달, Year: 올해

#### 상태

| 상태 | 표시 |
|------|------|
| 결 0개 (해당 범위) | "한 결이라도 쌓이면 다시 만나요" / "이번 달엔 아직..." / "올해는 아직..." (범위별 카피) |
| 정상 | 위 명세대로 렌더 |

#### 금지
- 빈 날·빈 주·빈 월 placeholder
- "이만큼밖에", "목표 미달"
- 점수·뱃지·heatmap 색 채움

---

### §9.F — Invite (`/invite/:token`)

CLAUDE.md §12 "빈 방 없는 도착" — 초대받은 사람이 빈 앱이 아니라 **초대자의 기록이 담긴 미리보기**로 도착하게 한다.

#### 구성
1. **헤더**:
   - 인사 한 줄 "${inviter}님이 함께 보자고 했어요." (13px secondary)
   - 공간 이름 (20px 700)
   - 멤버 수 한 줄
2. **이 공간에 쌓인 결** — 최근 4개 fragment의 thumbnail 4-col grid (`invite-page__preview`)
3. **들어가기** — primary `--block` CTA → `acceptInvite(token, me)` + `setActiveSpace(spaceId)` + `navigate('/')`

#### 데이터
- `useParams<{ token }>()` → `spaceStore.getInvite(token)`
- 만료(`expiresAt < now`)·미존재 → "이 초대 링크는 만료됐어요." empty + "돌아가기" 버튼

#### 인터랙션
- 들어가기 → 멤버 추가(idempotent) + 즉시 그 공간의 Today로 전환
- 데모: 같은 디바이스에서 단일 사용자가 자기 공간 미리보기를 볼 수 있음 (실제 백엔드 연결 시 다른 사용자가 클릭)

#### 금지
- 가입 폼 요구 (이미 로그인된 사용자만 들어옴 가정. 로그인 안 된 게스트는 별도 흐름 — 후속 라운드)
- "다른 사람의 비밀번호 입력" 같은 마찰
- 거절 시 "정말 안 들어가실 거예요?" 류 다크 패턴

---

### §9.D — Fragment 단일 뷰 (`/fragments/:id`)

#### 구성
1. `.detail-header` — `‹` 뒤로 + "결" 타이틀 + 우측 액션 2개 (`Pencil` 편집 / `Trash2` 비우기)
2. `.detail-media` — 사진/영상/음성 풀폭. 영상은 `<video controls>`, 음성은 `<audio controls>`, 사진은 contain, 글은 placeholder 아이콘
3. `.detail-title` — 20px 700 (부크크 명조 Bd)
4. `.detail-meta` — "2026년 5월 28일 · 오후 1:02" (+ pending 시 "· 저장 중")

#### 데이터
- `useParams<{ id }>()` → `useFragmentStore.fragments.find(...)`
- 미발견 시: detail-header + empty `"이 결을 찾을 수 없어요."`

#### 인터랙션
- `‹` → `navigate(-1)`
- 편집 → CaptureSheet를 `initialDraft`로 미리 채워서 열기 (제목/타입/미리보기). 저장 시 `store.update(id, patch)`
- 비우기 → ConfirmSheet ("이 결을 비울까요?" / "비운 결은 되돌릴 수 없어요." / "비우기") → 확정 시 `store.remove(id)` + `navigate(-1)`

#### 금지
- 좋아요·댓글·"공유하기" 액션 카운트
- 작성자 아바타 강조 (공유 공간에서도 작은 메타로만)
- "이 결을 추천" 같은 알고리즘 cross-sell
- 비우기를 toast 없이 즉시 처리 — 항상 ConfirmSheet 한 박자

---

### §9.E — 일일 디테일 (`/days/:dayDate`)

캘린더 셀 탭에서 진입. 그날 남긴 결 전체.

#### 구성
1. `.detail-header` — `‹` 뒤로 + "하루" 타이틀
2. `DayHeader` — 요일 + (오늘이면 "· 오늘" 태그) + 날짜
3. 섹션 sub "남긴 결 N" (결 1개 이상일 때만)
4. `FragmentItem` 리스트 (시간 역순). 각 탭 → `/fragments/:id`

#### 데이터
- `useParams<{ dayDate }>()` → `mockFragments.filter(f => f.dayDate === dayDate)`
- 잘못된 날짜: empty `"잘못된 날짜예요."`
- 0건: empty `"이 날엔 아직 결이 없어요."`

#### 인터랙션
- 셀 탭 (캘린더에서) → 이 페이지
- FragmentItem 탭 → `/fragments/:id`
- 뒤로 → 캘린더 (또는 lookback 등 진입 경로 보존)

#### 금지
- "이 날엔 N개 부족" 비교 표시
- 같은 날 다른 사용자 비교 (공유 공간 외 노출 금지)

---

### §9.G — 결 플랜 (`/plans`)

CLAUDE.md §14 수익화 원칙을 사용자가 직접 보고 확인할 수 있는 **정보 표면**. 결제 플로우가 아닌 **약속의 페이지**다. PMF 도착 전까지 모든 CTA는 정보 전달까지만 동작한다.

#### 구성
1. `.detail-header` — `‹` 뒤로 + "결 플랜" 타이틀
2. **FreeForeverHero** (`.plans-hero`) — 0.5px dashed `--color-border-secondary` 박스. "항상 무료 — 기록 습관" (`--type-section` 700) + "매일 기록 · 캘린더 · 기본 회고 · 공유 1팀."
3. **AboveTheLineDivider** (`.plans-divider`) — 좌우 dashed 라인 사이 "수익화는 이 선 아래에서만" (`--type-caption` tertiary)
4. **Plus 개인 카드** — 가격 "₩4,900/월 · ₩39,000/년" + 무료↔Plus 비교표 (6행: 매일 기록·캘린더·미디어·공유방·자동 영상·1년 전 오늘) + secondary `Bell` 버튼 "곧 만나요 · 알림 받기" (disabled)
5. **Plus 그룹·페어 카드** — 가격 "₩7,900/월 (가설)" + 본문 "한 명이 결제하면 공유방 전원이 혜택" + "곧 만나요" disabled
6. **프린트 teaser 카드** — 가격 "₩25,000–50,000 · 일회성" + 4-항목 `plan-feature-list` (포토북·연말 책·벽 캘린더·커플 다이어리) + "곧 만나요" disabled
7. **Guardrails** (`.plans-guardrails`) — 결의 약속 4줄: 습관은 영원히 무료 · 과거 결은 페이월 없음 · 업그레이드는 자연스러운 순간에만 · 광고·데이터 판매·공개 피드 없음

#### 데이터
없음 (정적). 향후 결제 인프라가 붙으면 `useEntitlementStore`(가칭)로 사용자의 현재 플랜 상태를 받아 카드 상단에 "현재 플랜" 배지를 한 줄 그릴 자리.

#### 비교표 (`.plan-table`)

| 기능 | 무료 · 기록 | Plus · 개인 |
|------|-------------|-------------|
| 매일 기록·전 매체 | 무제한 | 무제한 |
| 캘린더·주간 회고 | 기본 | 심화 (연간 회고, 검색·태그) |
| 미디어 보관 | 표준 화질 | 원본 화질 영구 |
| 공유방 | 1팀 (최대 3인) | 무제한 (최대 6인) |
| 자동 영상 내보내기 | — | HD |
| 1년 전 오늘·테마 | — | 포함 |

- grid `1.2fr 1fr 1.4fr`. 행마다 0.5px tertiary 하단 보더.
- Plus 열은 `--color-text-primary` weight 700, 무료 열은 `--color-text-tertiary` weight 400 — 비교의 무게를 시각으로 표현하되 무료 열을 "결핍"으로 칠하지 않음(빨강·회색 채움 금지).

#### 인터랙션
- 모든 CTA `disabled` — 실제로는 후속 라운드에 `onClick`이 알림 등록·결제 시트로 연결될 자리. 현재는 hover/press 상태도 disabled 시각(opacity 0.4).
- `‹` → `navigate(-1)` (대부분 Settings로 복귀).

#### 진입 경로
- 1차: Settings → "결 플랜" 섹션의 "결 플랜 보기" row.
- 2차(후속): "가치를 느낀 순간" 트리거 — 보관 용량 가득, 연말 회고 내보내기 시도, 프린트 플로우 진입 등. **MVP에는 1차만**.

#### 금지
- "지금 시작하세요", "한정 할인", "오늘만" 류 압박 카피
- 결제 모달·체크아웃 스텁 (사용자가 정보형으로만 받기로 결정)
- 무료 열을 빨강·X 아이콘으로 표시 (정체성 훼손)
- 비교표 어느 셀이든 "팝업으로 자세히" 같은 cross-sell
- 가짜 사용자 카운트 ("이미 N명이 Plus 사용 중")

---

### §9.C — 캘린더 (`/calendar`)

#### 구성
1. 월 네비 — `‹` / "2026년 5월" (17px 700) / `›`
2. 요일 헤더 일~토 (11px tertiary)
3. 7×6 그리드 셀
4. `YearAgoCard` (조건부)

#### 데이터
- 해당 월 fragments grouped by dayDate → hasRecord set
- 1년 전 today fragment

#### 상태

| 상태 | 표시 |
|------|------|
| 신규 (점 0개) | 정상 — 빈 그리드, 부정 카피 없음 |
| loading | 셀 secondary 정적 채움 |
| error | 캐시 유지 + 상단 안내 |

#### 금지
- 잔디 heatmap.
- "이번 달 N일 채움/비움" 비율.
- 빨강 표식.

---

## §10. 보이스 & 톤

### 10.1 원칙

1. 사용자보다 작은 목소리로 말한다.
2. 양이 아닌 순간을 칭찬한다.
3. 부정문보다 긍정문, 명령문보다 청유문.
4. 영문 외래어보다 한글 일상어.
5. 빈 상태는 결핍이 아니라 여백.

### 10.2 어휘 정책

**금지 어휘.** "연속", "streak", "N일째", "꾸준히", "달성", "실패", "놓쳤어요", "목표 미달", "회원", "팔로워", "좋아요", "조회", "공유 횟수", "프리미엄", "결제 안 하면", "잠금".

**권장 어휘.** "오늘", "남기다", "결", "쌓이다", "돌아보다", "조용히", "천천히", "곁에".

### 10.3 카피 라이브러리

| 상황 | 카피 |
|------|------|
| 첫 진입 (empty Today) | "오늘, 무엇이든 한 결 남겨요" |
| 캡처 직후 success | (toast 없음. 카드 fade-in으로만) |
| 네트워크 실패 | "지금은 연결이 약해요. 결은 안전하게 저장됐고, 잠시 뒤 동기화돼요." |
| 빈 회고 | "한 결이라도 쌓이면 다시 만나요." |
| 빈 캘린더 (신규) | (별도 카피 없이 그리드만) |
| 삭제 확인 | "이 결을 비울까요?" |

---

## §11. 안티 패턴 체크리스트

PR 리뷰 / 디자인 리뷰에서 자동 reject. 한 항목이라도 걸리면 머지하지 않는다.

- [ ] streak / 연속일 카운터 / "N일째" 배지
- [ ] 좋아요·하트, 조회수, 팔로워, 공개 카운터
- [ ] 공개 피드 / 탐색 탭 / 추천 알고리즘
- [ ] FOMO 타이머
- [ ] 과거 기록 페이월
- [ ] 광고 슬롯, 트래킹 픽셀
- [ ] **빨강 경고 색** (어떤 신호용으로도)
- [ ] **fill 아이콘** (lucide outline만)
- [ ] **`border-radius: 9999px` 풀 캡슐** (MediaToggle의 `50%` 원형은 명시적 예외)
- [ ] **산세리프 본문** (BookkMyungjo + 폴백 명조 체인만 사용)
- [ ] **카드 그림자 / elevation 다단계** (0.5px 보더만 허용)
- [ ] 강제 동시 촬영 / 그룹 동기화 압박
- [ ] **민트 색 위 흰 텍스트가 14px 미만 또는 weight 700 미만** (§12 대비비)
- [ ] **과거 결 열람을 막는 페이월** (CLAUDE.md §3 · §14 — 페이월은 미래·부가 기능에만)
- [ ] **결제 압박 카피** ("지금만", "곧 종료", "한정", 카운트다운, 가짜 사용자 수)
- [ ] **무료 열을 빨강·X·회색 채움으로 결핍 표현** (비교표는 정보, 죄책감 아님)

---

## §12. 접근성 (WCAG 2.1 AA 기준)

### 12.1 색 대비

| 조합 | 비율 | 결과 |
|------|------|------|
| `#1A1A1A` on `#FFFFFF` | ≈ 18.7:1 | AAA ✓ |
| `#5F6063` on `#FFFFFF` | ≈ 6.8:1 | AAA ✓ |
| `#9AA0A6` on `#FFFFFF` | ≈ 2.85:1 | placeholder·meta 한정, AA 일반 텍스트 미달 — 정보 전달의 단독 수단으로 사용 금지 |
| `#1D9E75` on `#FFFFFF` | ≈ 3.0:1 | **large text (≥18.66px or ≥14px+700) AA 통과**. 14px 미만이거나 weight 400은 사용 금지 |
| `#FFFFFF` on `#1D9E75` | ≈ 3.0:1 | 동일 — primary CTA는 14px+ weight 700 + padding 충분 |
| `#1D9E75` on `#E6F5F0` | ≈ 2.7:1 | PromptChip은 13px 일반 텍스트지만 **보조 정보(닫을 수 있음, 본문 가치 없음)**로만 사용 — 핵심 동선에 정보 단독 전달 금지 |

### 12.2 인터랙션

- 최소 hit target **44×44** (TabBar 셀, 캘린더 셀, MediaToggle 원형).
- focus ring: `2px solid var(--color-accent)` + `outline-offset: 2px`.
- 키보드 탭 순서 (Today): 매트 → 카드 → DayHeader → PromptChip(닫기) → CaptureEntry → MediaToggle(4) → FragmentItem 리스트 → TabBar.
- 캘린더는 방향키로 셀 이동, Enter로 선택.

### 12.3 스크린리더

- 매체 4종 aria-label: "사진 캡처", "영상 캡처", "글 작성", "음성 녹음".
- 캘린더 셀: `aria-label="5월 28일, 기록 있음 / 없음"`.
- 라이브 리전: 저장 success("새 결이 추가됐어요") 단 하나만.

### 12.4 모션 감소

- `prefers-reduced-motion: reduce` → §6 정책 자동 적용.

### 12.5 폰트 폴백

- BookkMyungjo 웹로드 실패 시 시스템 한국어 명조(`Apple Myungjo` → `Nanum Myeongjo` → `Batang` → `serif`)로 폴백.
- 폴백 체인이 모두 명조 계열 → 산세리프로 떨어지지 않음.

---

## §13. React 구현 노트

### 13.1 폴더 구조

```
src/
  main.tsx                      // entry
  app/
    RootLayout.tsx              // matte > card > body + TabBar
    routes.tsx                  // react-router-dom v6 createBrowserRouter
  styles/
    tokens.css                  // §2~§6 토큰
    base.css                    // @font-face, reset, body bg, matte, card
    components.css              // §8 컴포넌트 클래스
  components/
    Button.tsx · TextField.tsx · FragmentItem.tsx · PromptChip.tsx
    CaptureEntry.tsx · MediaToggle.tsx · DayHeader.tsx
    CalendarCell.tsx · LookbackRow.tsx · TabBar.tsx · YearAgoCard.tsx
  features/
    today/TodayPage.tsx
    lookback/LookbackPage.tsx
    calendar/CalendarPage.tsx
  data/mockFragments.ts         // 임시 — Supabase 연결 시 교체
  types/fragment.ts
public/
  (현재 비어 있음 — 종이 noise 제거됨)
```

### 13.2 폰트 로딩 (`src/styles/base.css` 상단)

```css
@font-face {
  font-family: 'BookkMyungjo';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2')
    format('woff2');
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: 'BookkMyungjo';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Bd.woff2')
    format('woff2');
  font-weight: 700;
  font-display: swap;
}
```

### 13.3 토큰 → CSS 변수 (발췌)

```css
:root {
  --color-background-primary: #ffffff;
  --color-background-secondary: #f2f4f6;
  --color-background-info: #e6f5f0;

  --color-text-primary: #1a1a1a;
  --color-text-secondary: #5f6063;
  --color-text-tertiary: #9aa0a6;
  --color-text-info: #1d9e75;
  --color-text-on-accent: #ffffff;

  --color-border-tertiary: #eceef0;
  --color-border-secondary: #d9dce0;

  --color-accent: #1d9e75;
  --color-accent-press: #178b66;

  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 14px;
  --border-radius-xl: 20px;

  --font-body:
    'BookkMyungjo', 'Apple Myungjo', 'Nanum Myeongjo', 'KoPub Batang',
    'Batang', serif;

  --motion-quick: 120ms;
  --motion-base: 220ms;
  --motion-slow: 360ms;
  --ease-soft: cubic-bezier(0.2, 0, 0, 1);

  --column-max: 480px;
  --matte-pad: 14px;
}
```

### 13.4 매트 / 카드 (`base.css`)

```css
html, body {
  background: var(--color-background-secondary);
  font-family: var(--font-body);
}
.matte {
  max-width: calc(var(--column-max) + var(--matte-pad) * 2);
  margin: 0 auto;
  padding: var(--matte-pad);
  min-height: 100vh;
}
.card {
  background: var(--color-background-primary);
  border: 0.5px solid var(--color-border-tertiary);
  border-radius: var(--border-radius-xl);
  overflow: hidden;
}
@media (max-width: 480px) {
  .matte { padding: 0; }
  .card { border-radius: 0; border-left: 0; border-right: 0; min-height: 100vh; }
}
```

### 13.5 권장 라이브러리

- 라우팅: `react-router-dom` v6
- 서버 상태: `@tanstack/react-query` (CLAUDE.md §4 유지, 미도입)
- 로컬 상태: **`zustand` v5** (도입 완료 — `src/lib/fragmentStore.ts`)
- 오프라인 영속화: **`idb-keyval` v6** (IndexedDB key-value, 도입 완료)
- 아이콘: `lucide-react` (사용자 지정, line variant만)
- 백엔드: `@supabase/supabase-js` — RLS는 CLAUDE.md §5 (미도입)

### 13.5b Space Store + Identity + Invite (공유 공간 인프라)

```ts
// src/lib/spaceStore.ts (zustand + idb-keyval)
useSpaceStore.getState() → {
  spaces: Space[],
  invites: Invite[],
  activeSpaceId: string,
  hydrated: boolean,
  hydrate(),
  setActiveSpace(id),
  createSpace(name) → Space,            // 새 공유 공간 생성 + me를 owner로
  joinSpace(spaceId, user),             // 멤버 추가 (idempotent)
  generateInvite(spaceId) → Invite,     // 7일 만료 토큰 발급
  acceptInvite(token, user) → Space|null, // 만료/미존재 시 null, 아니면 joinSpace
  getInvite(token) → Invite|null,
  getActiveSpace() → Space|null,
}
```

- IDB 키: `gyeol:spaces:v1`, `gyeol:invites:v1`. activeSpaceId는 localStorage(`gyeol:active-space:v1`)에 영속화.
- 데이터 모델은 CLAUDE.md §5의 `spaces` / `space_members` / `invites` 테이블 스키마와 정합 — 추후 Supabase 연결 시 그대로 매핑 가능.

```ts
// src/lib/identity.ts
getCurrentUser() → User { id: 'me', displayName: '나' }
```

- 현재는 단일 mock identity. 추후 Supabase Auth 연결 시 이 함수가 실제 세션 사용자로 교체.

```ts
// src/lib/useActiveSpaceFragments.ts
useActiveSpaceFragments() → Fragment[]  // activeSpaceId로 필터링된 fragments
```

- 모든 페이지(Today/Calendar/Lookback/Daily)가 이 훅을 통해 데이터를 받음 — 공간 전환 시 즉시 반영.

```ts
// src/types/fragment.ts — 확장
interface Fragment {
  ...,
  spaceId: string,    // CLAUDE.md §5 fragments 테이블 컬럼
  authorId: string,   // 멀티 작성자 (공유 공간)
}
```

- 마이그레이션: 옛 IDB 스냅샷(spaceId/authorId 없음)은 hydrate 시 `'personal'` / `'me'`로 자동 채움 + IDB 재저장.

### 13.5a Fragment Store + 오프라인 큐 (현재 구현)

```ts
// src/lib/fragmentStore.ts
useFragmentStore.getState() → {
  fragments: Fragment[],
  pendingIds: Set<string>,
  recentlyAddedId: string | null,
  hydrated: boolean,
  hydrate(): Promise<void>,       // IDB → store rehydrate (RootLayout mount에서 호출)
  add(fragment, opts?),           // 낙관적 추가 + pendingIds 등록 + IDB persist
  update(id, patch),              // mutate + persist
  remove(id),                     // mutate + persist
  markSynced(id),                 // pending 제거 (sync 시뮬레이션)
  clearRecent(),
}
```

- IDB 키: `jogak:fragments:v1` (idb-keyval `set`/`get`)
- 모든 mutation은 IDB에 fire-and-forget persist (private mode 등 실패 허용)
- `useSyncSimulation()` — 온라인일 때 1.6초마다 pendingIds 일부를 markSynced 호출 (실 백엔드 연결 시 이 hook이 Supabase upsert로 교체됨)
- `useOnlineStatus()` — `navigator.onLine` + online/offline 이벤트
- `recentlyAddedId` — 신규 결 fade-rise 애니메이션 트리거 (FragmentItem `appear` prop)

### 13.6 모바일 / 웹 대응 (CLAUDE.md 차이)

CLAUDE.md 권장 스택은 Expo(React Native)이지만 본 프로젝트는 React 웹.

| CLAUDE.md (RN) | 웹 대응 |
|----------------|---------|
| Expo Camera | `<input type="file" capture="environment">` / `getUserMedia` |
| Expo Image Picker | `<input type="file" accept="image/*,video/*">` |
| Expo Notifications | Web Push + Service Worker |
| iOS WidgetKit / Android Widget | **PWA Install + Web Share Target API** |
| Supabase Storage | 동일 |
| 오프라인 우선 | Service Worker + IndexedDB 큐 |

---

## §14. 수익화 표면 (Plans · Monetization)

CLAUDE.md §14를 디자인 표면에 정합하는 절. 본 절은 **수익화 UI의 단일 출처**다. 가격·문구·CTA 톤이 흔들리면 여기로 돌아온다.

### 14.1 한 줄 원칙

> **습관은 영원히 무료, 수익은 깊이와 영속성에서.**

캡처·캘린더·기본 회고에 돈을 받는 순간 지원의 첫 2주 활성화가 깨진다(CLAUDE.md §11). 페이월은 **항상 "이 선 아래"**에만 그어진다.

### 14.2 세 갈래 모델

| 수익원 | 타입 | 가격(가설) | 페이월 위치 |
|--------|------|------------|-------------|
| Plus · 개인 | 구독(반복) | ₩4,900/월 · ₩39,000/년 | 원본 보관, 무제한 공유방, 내보내기, 검색·태그, 연간 회고, HD 영상, 1년 전 오늘·테마 |
| Plus · 그룹·페어 | 구독(반복) | ₩7,900/월 | 한 명이 결제, 공유방 전원이 혜택 (관계적 가치 구매) |
| 프린트 커머스 | 일회성 | ₩25,000–50,000 | 1년 치 결 → 포토북, 연말 "올해의 책", 벽 캘린더, 커플 다이어리 |

### 14.3 4 가드레일 (안티 패턴 §11과 짝)

1. **타이밍** — PMF·습관 형성 전엔 결제 들이밀지 않음. MVP에선 Settings 한 곳에서만 진입.
2. **추억을 인질로 잡지 않기** — 본인이 이미 남긴 과거 결의 **열람은 항상 무료**. 페이월은 미래·부가 기능에만 (원본 화질 새 업로드, 내보내기, HD 영상, 테마).
3. **압박 카피 금지** — 카운트다운, "한정", "오늘만", "이미 N명이 사용 중" 류 사회적 증명 압박 일체.
4. **광고·데이터 판매 금지** — 정체성과 직접 충돌.

### 14.4 자연스러운 업그레이드 트리거 (후속 라운드)

MVP에는 들어가지 않지만 향후 배치할 자리만 정의:

- 보관 용량이 차오를 때 — Today 화면 상단 SoftBar 톤으로 한 줄
- 연말 회고를 내보내려 할 때 — Lookback의 "영상으로 보기" 버튼이 Plus 진입점 (브이로그 기능 구현 시 부활)
- 프린트 플로우에 진입할 때 — Lookback 연간 뷰에서 "1년의 책으로" 카드

**금지:** 결 캡처 시점, 캘린더 첫 진입 시점, 신규 사용자 첫 30일 — 이 세 자리에는 결제 표면을 띄우지 않는다.

### 14.5 표면 구성

- **`/plans`** — 정보형 단일 페이지 (§9.G). 비교표 + 3카드 + 가드레일.
- **Settings → 결 플랜 섹션** — 진입 row. "PMF 이후에 천천히 열어요" 힌트.
- **결제 화면** — MVP에 없음. 후속 라운드에 Sheet 기반(§8.11a)으로 추가 예정.

### 14.6 카피 톤

| 상황 | 카피 |
|------|------|
| Plus 카드 헤더 | "Plus · 개인" / "Plus · 그룹·페어" (영문 "Premium"·"Pro" 금지 — 한국어 톤) |
| 가격 단위 | "₩4,900 /월" (스페이스 한 칸, 슬래시 톤 다운) |
| 알림 받기 CTA | "곧 만나요 · 알림 받기" (출시 예정·Coming soon 금지) |
| 비활성 카드 보조 | "PMF가 도착한 뒤에 천천히 열어요." |
| 가드레일 헤더 | "결의 약속" (Terms·정책 아님) |
| 금지 표현 | "프리미엄", "잠금", "결제 안 하면", "지금만", "한정", "필수", "베스트" |

---

## 부록 A. 폰트 폴백

```
font-family:
  'BookkMyungjo',
  'Apple Myungjo',
  'Nanum Myeongjo',
  'KoPub Batang',
  'Batang',
  serif;
```

- macOS/iOS: `Apple Myungjo` 가 자연스러운 폴백.
- 안드로이드/크롬 OS: `Nanum Myeongjo` (Noto Serif KR은 산세리프 인상 강해 우선순위 낮춤).
- Windows: `Batang` 기본 탑재.
- 최후: 시스템 `serif` — 산세리프로 떨어지지 않게 모든 폴백을 명조 계열로만 구성.

## 부록 B. CLAUDE.md cross-check

| CLAUDE.md 항목 | 본 문서 위치 |
|---------------|--------------|
| §2-1 남기긴 쉽게 (3탭, 오프라인) | §9.A 인터랙션 / §8.5 / §13.6 |
| §2-2 돌아보긴 즐겁게 | §9.B 전체 |
| §2-3 절대 혼내지 않기 | §2.2 / §10 / §11 |
| §2-4 추억을 인질로 잡지 않기 | §10 어휘 / §11 |
| §2-5 압박 없는 공유 | §11 |
| §3 streak | §11 |
| §3 좋아요·팔로워·조회 | §8.3 / §11 |
| §3 공개 피드·추천 | §11 |
| §3 광고 SDK | §11 |
| §3 FOMO 타이머 | §11 |
| §3 과거 페이월 | §11 |
| §6 오늘 화면 | §9.A |
| §6 돌아보기 | §9.B |
| §6 캘린더 | §9.C |
| §8 코딩 컨벤션 (한국어 카피) | §10 / 본 문서 전체 한국어 |
| §14 수익화 (Plus · 그룹 · 프린트) | §14 / §9.G / §11 (anti-pattern) |

---

> 변경 시 본 문서를 함께 갱신한다. 디자인 결정의 근거가 흐려지면 §1의 한 줄 명제로 돌아온다 — **기록은 가볍게, 표면은 깨끗하게**.
