import type {
  GeneratedFile,
  PromptInterpretation,
  VariantBrief,
} from "@zeno/shared";
import { anthropic, ANTHROPIC_MODEL_CODE_WEB, ANTHROPIC_MODEL_CODE_APP, USE_ANTHROPIC_CODE } from "../lib/openai";

function extractIndexHtml(files: GeneratedFile[]): GeneratedFile | null {
  return files.find((f) => f.path === "/index.html") ?? null;
}

function fallbackGeneratedFiles(
  prompt: string,
  brief: VariantBrief,
  interpretation: PromptInterpretation,
): GeneratedFile[] {
  return [{
    path: "/index.html",
    content: `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${brief.summary}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: sans-serif; background: #0a0a0a; color: #fff; padding: 2rem; }
h1 { font-size: 2.5rem; margin-bottom: 1rem; }
p { color: rgba(255,255,255,0.6); line-height: 1.8; }
</style>
</head>
<body>
<h1>${prompt}</h1>
<p>${interpretation.summary}</p>
<p style="margin-top:0.5rem">${brief.summary}</p>
</body>
</html>`,
  }];
}
/**
 * Returns true when `line` ends inside an open single- or double-quoted string
 * literal (template literals are excluded — they may span lines legitimately).
 */
function isUnterminatedStringLine(line: string): boolean {
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;

  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === "\\") { j++; continue; } // skip escaped char
    if (!inSingle && !inDouble && line[j] === "/" && line[j + 1] === "/") break; // line comment
    if (c === "`" && !inSingle && !inDouble) { inTemplate = !inTemplate; continue; }
    if (inTemplate) continue; // multiline template literals are valid
    if (c === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (c === '"' && !inSingle) { inDouble = !inDouble; continue; }
  }

  return inSingle || inDouble;
}

/**
 * Post-processes LLM-generated TypeScript/TSX source to fix unterminated
 * string literals caused by actual newlines inside single- or double-quoted
 * strings. Lines are merged (newline → space) until the string is closed.
 */
function sanitizeGeneratedContent(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];
    while (isUnterminatedStringLine(line) && i + 1 < lines.length) {
      i++;
      line = `${line} ${lines[i].trimStart()}`;
    }
    out.push(line);
    i++;
  }

  return out.join("\n");
}




const TEST_MODE = true;


const getFontConfig = (brief: VariantBrief) => {
  const keywords = [
    ...(brief.styleKeywords || []),
    ...(brief.moodKeywords || []),
  ].map((k) => k.toLowerCase());

  const has = (terms: string[]) =>
    terms.some((t) => keywords.some((k) => k.includes(t)));

  if (has(['트렌디', '팝', '감성', 'mz', 'trendy', 'pop'])) {
    return {
      imports: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap');
        @font-face {
          font-family: 'OneStoreMobileGothic';
          src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/ONE-Mobile-Regular.woff') format('woff');
          font-weight: 400;
          font-display: swap;
        }
        @font-face {
          font-family: 'OneStoreMobileGothic';
          src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2105_2@1.0/ONE-Mobile-Title.woff') format('woff');
          font-weight: 700;
          font-display: swap;
        }
      `,
      koHeading: "'OneStoreMobileGothic'",
      enHeading: "'Montserrat'",
      koBody: "'OneStoreMobileGothic'",
      enBody: "'Montserrat'",
      englishTitle: true,
    };
  } else if (has(['프리미엄', '럭셔리', '고급', 'premium', 'luxury'])) {
    return {
      imports: `@import url('https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css');`,
      koHeading: "'SUIT'",
      enHeading: "'SUIT'",
      koBody: "'SUIT'",
      enBody: "'SUIT'",
      englishTitle: false,
    };
  } else if (has(['테크', 'ai', 'it', 'saas', 'tech', 'software', '기술'])) {
    return {
      imports: `@import url('https://cdn.jsdelivr.net/gh/naver/nanumfont/fonts/NanumSquareNeo/NanumSquareNeo.css');`,
      koHeading: "'NanumSquareNeo'",
      enHeading: "'NanumSquareNeo'",
      koBody: "'NanumSquareNeo'",
      enBody: "'NanumSquareNeo'",
      englishTitle: false,
    };
  } else {
    return {
      imports: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css');
        @import url('https://fonts.googleapis.com/css2?family=Wanted+Sans:wght@400;600;700&display=swap');
      `,
      koHeading: "'Pretendard'",
      enHeading: "'Wanted Sans'",
      koBody: "'Pretendard'",
      enBody: "'Wanted Sans'",
      englishTitle: false,
    };
  }
};

export async function searchPexelsImage(keyword: string): Promise<string> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('[PEXELS] PEXELS_API_KEY not set');
    return '';
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}&per_page=5&orientation=landscape`;
    console.log(`[PEXELS] searching: "${keyword}" → ${url}`);
    const response = await fetch(url, { headers: { Authorization: apiKey } });

    console.log(`[PEXELS] "${keyword}" status=${response.status}`);
    if (!response.ok) {
      console.warn(`[PEXELS] "${keyword}" HTTP error: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json() as { photos?: Array<{ src: { large2x: string; large: string } }>; total_results?: number };
    console.log(`[PEXELS] "${keyword}" total_results=${data.total_results ?? 0} photos=${data.photos?.length ?? 0}`);

    const photos = data.photos;
    if (!photos || photos.length === 0) return '';

    const photo = photos[Math.floor(Math.random() * photos.length)];
    const resultUrl = photo.src.large2x || photo.src.large || '';
    console.log(`[PEXELS] "${keyword}" → ${resultUrl.slice(0, 80)}`);
    return resultUrl;
  } catch (e) {
    console.error(`[PEXELS] "${keyword}" fetch error:`, e instanceof Error ? e.message : e);
    return '';
  }
}

export async function generateFilesFromBrief(
  prompt: string,
  brief: VariantBrief,
  interpretation: PromptInterpretation,
  signal?: AbortSignal,
): Promise<GeneratedFile[]> {
  if (TEST_MODE && brief.variantId !== "A") {
    return [{
      path: "/index.html",
      content: `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>Variant ${brief.variantId}</title></head><body style="padding:2rem;font-family:sans-serif;text-align:center;background:#0a0a0a;color:#fff"><h2>Variant ${brief.variantId} — 테스트 모드</h2><p>TEST_MODE=false로 변경하면 실제 생성됩니다.</p></body></html>`,
    }];
  }

  if (!USE_ANTHROPIC_CODE) {
    return fallbackGeneratedFiles(prompt, brief, interpretation);
  }

  const resolvedProductType = brief.productType;
  console.log(`[CODEGEN] variant=${brief.variantId} productType=${resolvedProductType} navPattern=${brief.navPattern}`);
  const productTypeRules = resolvedProductType === "app"
    ? `APP LAYOUT RULES (CRITICAL — this is a mobile app HTML page, not a website):
- Outer wrapper: max-width 390px, margin 0 auto, min-height 100vh, overflow hidden
- NO status bar chrome at the top — content starts at the very top
- Fixed bottom tab bar: position fixed, bottom 0, width 100%, 4-5 tabs with emoji icons + labels
- Safe area: padding-bottom env(safe-area-inset-bottom, 16px) on tab bar
- NO header navigation bar, NO full-screen hero sections
- Card-based UI: border-radius 16px, subtle box-shadow
- All tap targets: minimum 44px height
- Top of content: greeting card, quick action buttons, activity feed

APP NAVIGATION — vanilla JS only, NO frameworks:

Implement tab navigation exactly like this:

MANDATORY APP SKELETON — copy this structure exactly, do NOT deviate:

HTML:
\`\`\`
<body>
  <div class="app-wrapper">
    <div id="screen-home" class="screen active"><!-- home screen content --></div>
    <div id="screen-feed" class="screen"><!-- feed screen content --></div>
    <div id="screen-profile" class="screen"><!-- profile screen content --></div>
    <nav class="tab-bar">
      <button class="tab active" id="tab-home" onclick="switchTab('home')">🏠<span>홈</span></button>
      <button class="tab" id="tab-feed" onclick="switchTab('feed')">📋<span>피드</span></button>
      <button class="tab" id="tab-profile" onclick="switchTab('profile')">👤<span>프로필</span></button>
    </nav>
  </div>
</body>
\`\`\`

MANDATORY CSS (include this block verbatim — these rules are structural, not decorative):
\`\`\`css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; overflow: hidden; background: var(--color-bg, #0a0a0a); }
.app-wrapper { position: relative; width: 390px; max-width: 390px; height: 100vh; margin: 0 auto; overflow: hidden; background: var(--color-bg, #0a0a0a); }

/* screens: absolutely stacked — active one is visible, rest are hidden */
.screen { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow-y: auto; padding-bottom: 70px; visibility: hidden; pointer-events: none; }
.screen.active { visibility: visible; pointer-events: auto; }

/* tab bar: fixed to iframe viewport, centered to match 390px wrapper */
.tab-bar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 390px; display: flex; align-items: stretch; background: var(--color-surface, #111); border-top: 1px solid rgba(255,255,255,0.08); padding-bottom: env(safe-area-inset-bottom, 8px); z-index: 100; }
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 8px 0; border: none; background: none; color: rgba(255,255,255,0.35); font-size: 10px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.tab.active { color: var(--color-primary, #36FFDA); }
.tab span { font-size: 10px; line-height: 1; }
\`\`\`

MANDATORY JS (top-level global scope — copy verbatim, do NOT wrap in DOMContentLoaded):
\`\`\`js
// GLOBAL — must be top-level so onclick="" attributes can reach them
function switchTab(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('screen-' + tab)?.classList.add('active');
  document.getElementById('tab-' + tab)?.classList.add('active');
}
function showDetail(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id)?.classList.add('active');
}
function goBack(tab) { switchTab(tab); }
\`\`\`

⚠️ CRITICAL — FUNCTION SCOPE (ALL buttons will be dead without this):
switchTab, showDetail, goBack MUST be TOP-LEVEL in <script> — NEVER inside DOMContentLoaded or any wrapper.

⚠️ CRITICAL — LAYOUT RULES (violating these causes the broken layout the user complained about):
- NEVER add display:flex or display:grid to .app-wrapper — screens use position:absolute, not flex children
- NEVER add overflow:auto or overflow:scroll to html or body — only .screen scrolls internally
- NEVER place .screen elements outside of .app-wrapper
- The mandatory CSS block above is structural — do not remove or override these rules

⚠️ APP-SPECIFIC JS RULES:
- NO IntersectionObserver — apps use tap interaction, not scroll-based reveals
- NO clip-reveal, NO word-stagger, NO card-stagger
- NO typing effect
- All interactions are onclick (tap-based)

- Every card/item click MUST call showDetail() or switchTab() — NEVER empty onclick
- Detail screens must have a back button: <button onclick="goBack('home')">← 뒤로</button>
- NEVER use <img> tags — use emoji, colored divs, or CSS shapes only`
    : `WEB LAYOUT RULES:
- Full width (100%), desktop-first layout
- Fixed header with logo on the left and nav links on the right
- Mobile: hamburger menu that toggles a nav drawer (NO bottom tab bar)
- Full-screen hero section (min-height: 100vh or large padding)
- Marketing sections below hero: features, testimonials, CTA, footer
- NO bottom tab bar

**WEB LAYOUT DIVERSITY (CRITICAL)**

Never repeat the same layout pattern across sections.
Every section must use a different layout structure:

Available layouts — use ALL of these across sections, never repeat:
- Full-bleed hero (text centered, full viewport height)
- Split screen (50/50 text + visual, alternate left/right per section)
- Asymmetric grid (70/30 or 60/40 split)
- Masonry/bento grid (irregular card sizes)
- Horizontal scroll section
- Overlapping elements (text over visual with offset)
- Full-width image with text overlay
- Zigzag layout (alternate image left/right between sections)
- Sticky sidebar with scrolling content
- Magazine-style (mixed column widths)

Rules:
- Each of the 4 variants must use completely different section layout combinations
- Within one variant, no two sections can use the same layout
- Hero section must be unique per variant (fullbleed / split / centered / immersive)
- At least 3 different layout patterns per variant

**WEB INTERACTION GUIDELINES**

Core principle: match interaction to element role. Not everything needs animation.
Fewer, well-chosen effects feel more premium than every element moving.

BANNED — overused, avoid entirely:
- fadeInUp / slideUp as default scroll trigger for all sections
- Generic opacity + translateY on every paragraph, card, or section
- Slide-in from left/right on text blocks

Structural interactions (use contextually — not all at once):
- Parallax on hero background image
- Sticky nav: transparent on top → solid on scroll
- Horizontal scroll carousel for logo strips or feature showcases
- Thin progress bar at top of page for long-scroll variants only

**TEXT INTERACTIONS — select based on element role:**

Hero h1 (pick exactly ONE per variant):
- Typing effect: characters appear one by one with blinking cursor
- Character stagger: each letter has sequential CSS animation-delay
- Clip reveal: text slides up from behind a clip-path mask

Section h2 (pick ONE per section — vary across sections):
- Word-by-word stagger: split into word spans, each fades in with delay
- Clip reveal: whole line slides up on scroll entry
- Plain fade (no translate) for dense, body-heavy sections only

Marquee / ticker (max 1–2 per page, use only where rhythmic repetition adds value):
- Client logos, feature tags, or short brand phrases
- Infinite horizontal scroll via CSS animation, no JS needed

Stats / numbers:
- Count-up from 0 to value on scroll entry (JS setInterval)

Cards on scroll entry (subtle — not dramatic):
- Stagger: each card with 0.05s delay, translateY max 12px
- Opacity 0 → 1, minimal movement

CTA buttons:
- Shimmer sweep on HOVER only — not looping on load
- scale(1.03) on hover, scale(0.97) on active

Body text / descriptions: NO animation — readability first

Mood calibration:
- Bold & Disruptive → typing + character stagger on hero, clip reveal on h2s, marquee for brand labels
- Refined & Trustworthy → clip reveal on hero, word stagger on h2s, no marquee
- Energetic → typing + stagger throughout, marquee for energy
- Warm & Approachable → word stagger only, no typing or marquee`;

  console.log(`[CODEGEN] productTypeRules injected: ${productTypeRules.slice(0, 100)}`);

  const codeSystemContent = `
You generate a SINGLE completely self-contained HTML page. No frameworks, no build tools, no npm.

OUTPUT FORMAT — MANDATORY:
Wrap your entire HTML output in <html_output> tags like this:
<html_output>
<!DOCTYPE html>
<html lang="ko">
...
</html>
</html_output>

OUTPUT REQUIREMENTS — ABSOLUTE:
- All CSS inside <style> in <head>
- All JavaScript inside <script> before </body>
- Vanilla HTML5 + CSS3 + JavaScript ONLY
- NO React, NO JSX, NO Vue, NO TypeScript, NO import/export statements
- Do NOT add any @import for fonts — fonts are injected automatically

HTML SKELETON (always follow this structure):
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <style>
    :root {
      --color-primary: #value;
      --color-secondary: #value;
      --color-accent: #value;
      --color-bg: #value;
      --color-text: #value;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: var(--color-bg); color: var(--color-text); }
    /* all other styles */
  </style>
</head>
<body>
  <!-- all content -->
  <script>
    // all JavaScript
  </script>
</body>
</html>

SECTION TAGGING (REQUIRED — no exceptions):
Every top-level section MUST have a data-section attribute. This is used for section-level editing.
<section data-section="hero">...</section>
<section data-section="features">...</section>
<section data-section="testimonials">...</section>
<section data-section="footer">...</section>

Valid data-section values:
hero, features, feature-grid, products, menu, testimonials,
stats, philosophy, ingredients, faq, cta, contact, footer

Rules:
- Every visible section element MUST have data-section. No exceptions.
- Use <section> tags (not <div>) for all top-level sections.
- The value must exactly match one of the valid values above.

TYPOGRAPHY:
- h1, h2, h3: font-weight 700, use clamp() for responsive size
- Hero h1: font-size clamp(3rem, 8vw, 7rem)
- Body text: font-weight 400, line-height 1.5
- Headings (h1~h6): line-height 1.3
- font-weight: NEVER 800 or 900

IMAGE RULES:
${resolvedProductType === "app"
  ? `- MOBILE APP — do NOT use any <img> tags anywhere
- Use emoji, colored divs with initials, or CSS shapes as visuals
- Avatar: <div style="background:#555;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">AB</div>
- NEVER place <img> tags in app HTML`
  : `- For EVERY <img> tag, use ONLY the __PEXELS__:keyword__ placeholder format — NEVER a real URL
- Format: <img src="__PEXELS__:your english keyword__" alt="..." style="width:100%;height:100%;object-fit:cover">
- This format is MANDATORY for ALL website types — fitness, fashion, tech, food, beauty, cafe, real estate, etc.
- Pick the most specific English keyword that matches YOUR topic:
    fitness hero     → __PEXELS__:gym workout athlete__
    yoga / wellness  → __PEXELS__:yoga meditation studio__
    fashion hero     → __PEXELS__:fashion model editorial__
    beauty / skincare → __PEXELS__:skincare beauty product__
    tech / startup   → __PEXELS__:modern office technology__
    food / restaurant → __PEXELS__:restaurant interior dining__
    cafe / coffee    → __PEXELS__:cafe interior cozy__
    real estate      → __PEXELS__:modern architecture interior__
    travel           → __PEXELS__:travel landscape scenic__
    team photo       → __PEXELS__:diverse team office__
    product shot     → __PEXELS__:product photography minimal__
- Every image must use a DIFFERENT keyword so each one looks unique
- Every <img> must have style="width:100%;height:100%;object-fit:cover"
- Hero backgrounds: wrap <img> in position:relative container, img is position:absolute inset:0
- NEVER use https://picsum.photos or any real URL — only __PEXELS__:keyword__ placeholders`}

IMAGE CSS RULES (CRITICAL — violations cause invisible images):

1. Every img tag MUST have these styles:
   img {
     width: 100% !important;
     height: 100% !important;
     object-fit: cover !important;
     display: block !important;
   }

2. Every image container MUST have explicit height:
   [class*='-img'], [class*='image'], [class*='photo'],
   [class*='thumb'], [class*='picture'] {
     width: 100%;
     min-height: 200px;
     height: 250px;
     overflow: hidden;
     position: relative;
     display: block;
   }

3. NEVER rely on img tag to define container height
4. ALWAYS set explicit px height on image containers
5. Use !important on img width/height to prevent override
6. NEVER add crossorigin attribute to any img tag — crossorigin causes COEP errors in iframe environments

${productTypeRules}

**INTERACTION & DESIGN QUALITY RULES (CRITICAL)**

### Core principle:
Select interactions based on element role. Not every element needs animation.
Fewer well-executed effects > everything moving. Body text never gets animation.

### Implementation patterns — use these, pick contextually:

\`\`\`js
// TYPING EFFECT — hero h1 only
function initTyping(el, speed = 40) {
  const text = el.textContent
  el.textContent = ''
  el.style.borderRight = '2px solid currentColor'
  let i = 0
  const timer = setInterval(() => {
    el.textContent += text[i++]
    if (i >= text.length) { clearInterval(timer); el.style.borderRight = 'none' }
  }, speed)
}
// Usage: initTyping(document.querySelector('.hero-title'))

// CHARACTER STAGGER — hero h1 alternative
function initCharStagger(el) {
  const chars = el.textContent.split('')
  el.innerHTML = chars.map((c, i) =>
    \`<span style="opacity:0;display:inline-block;animation:charIn 0.4s \${i*0.03}s ease forwards">\${c === ' ' ? '&nbsp;' : c}</span>\`
  ).join('')
}

// WORD STAGGER — section h2 on scroll entry
function initWordStagger(el) {
  const words = el.textContent.split(' ')
  el.innerHTML = words.map((w, i) =>
    \`<span class="word-span" style="opacity:0;transform:translateY(16px);display:inline-block;transition:opacity 0.35s \${i*0.06}s ease,transform 0.35s \${i*0.06}s ease">\${w}&nbsp;</span>\`
  ).join('')
}
const wordObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.word-span').forEach(s => {
        s.style.opacity = '1'; s.style.transform = 'translateY(0)'
      })
    }
  })
}, { threshold: 0.3 })
// Usage — MUST call observe() after initWordStagger():
// document.querySelectorAll('.section-heading').forEach(el => { initWordStagger(el); wordObserver.observe(el) })

// CLIP REVEAL — hero or h2 alternative
// Add class="clip-reveal" to element AND wrap its text in <span>
// IMPORTANT: clip-reveal requires JS to add the .revealed class — CSS alone does NOT work
const clipObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('revealed') })
}, { threshold: 0.2 })
// Usage — MUST call observe() on every .clip-reveal element:
// document.querySelectorAll('.clip-reveal').forEach(el => clipObserver.observe(el))

// COUNT-UP — stats/numbers on scroll entry
function countUp(el, target, duration = 1500) {
  const start = performance.now()
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1)
    el.textContent = Math.floor(progress * target).toLocaleString()
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}

// CARD STAGGER on scroll entry — subtle
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('card-visible') })
}, { threshold: 0.1 })
// Usage — MUST call observe() on every card element:
// document.querySelectorAll('.card-stagger').forEach(el => cardObserver.observe(el))
\`\`\`

\`\`\`css
/* Character stagger keyframe */
@keyframes charIn { to { opacity: 1; } }

/* Clip reveal */
.clip-reveal { overflow: hidden; }
.clip-reveal span { display: block; transform: translateY(100%); transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
.clip-reveal.revealed span { transform: translateY(0); }

/* Marquee / ticker */
.marquee-track { display: flex; width: max-content; animation: marquee 18s linear infinite; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* Card stagger */
.card-stagger { opacity: 0; transform: translateY(12px); transition: opacity 0.4s ease, transform 0.4s ease; }
.card-visible .card-stagger, .card-stagger.card-visible { opacity: 1; transform: translateY(0); }
/* Delay per card: add style="transition-delay: Xs" inline */

/* CTA shimmer on hover only */
.cta-btn { position: relative; overflow: hidden; }
.cta-btn::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent); transition: left 0.4s ease; }
.cta-btn:hover::after { left: 140%; }

/* Gradient text — use sparingly, max 1 element per variant */
@keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
.gradient-text {
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent), var(--color-primary));
  background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  animation: gradientShift 4s ease infinite;
}
\`\`\`

### Assignment guide:
- Hero h1 → typing OR character stagger (pick one per variant, never both)
- Section h2 → word stagger OR clip reveal (vary across sections)
- Logo strip / tag list → marquee (max once per page)
- Stats → count-up on scroll
- Card grids → card stagger with 0.05s delay increments
- CTA → hover shimmer only
- Body paragraphs / descriptions → NO animation

### OBSERVER WIRING — CRITICAL (cards and text will be invisible without this)
Every animation that uses an IntersectionObserver MUST call observe() in the <script> block.
Add this pattern at the end of your <script>, inside a DOMContentLoaded listener or after all elements exist:

\`\`\`js
document.addEventListener('DOMContentLoaded', () => {
  // Word stagger — every heading that uses initWordStagger
  document.querySelectorAll('.section-heading').forEach(el => { initWordStagger(el); wordObserver.observe(el) })

  // Clip reveal — every element with class="clip-reveal"
  document.querySelectorAll('.clip-reveal').forEach(el => clipObserver.observe(el))

  // Card stagger — every card with class="card-stagger"
  document.querySelectorAll('.card-stagger').forEach(el => cardObserver.observe(el))
})
\`\`\`

- If any of these observe() calls are missing, those elements stay at opacity:0 or clipped — permanently invisible.
- testimonial cards, feature cards, review cards: ALWAYS add class="card-stagger" AND call cardObserver.observe().

### SCROLL ANIMATION SAFETY (CRITICAL):
IntersectionObserver may fail in blob URL iframe environment.
Always add a timeout fallback:

\`\`\`js
// After setting up IntersectionObserver, add:
setTimeout(() => {
  document.querySelectorAll('.animate, .card-stagger, .fade-in, [class*="stagger"]')
    .forEach(el => {
      el.classList.add('visible')
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
}, 2000) // 2 second fallback — shows all content if observer fails
\`\`\`

This ensures content always becomes visible even if
IntersectionObserver fails in the iframe environment.

### ANIMATION VISIBILITY RULES (CRITICAL):
- NEVER set overflow: hidden on elements that contain text animation (translateY, fadeInUp, word-reveal etc.)
- Hero title containers: overflow: visible (not hidden)
- Word-reveal spans: overflow: visible
- Only use overflow: hidden on IMAGE containers, not text containers
- If clip is needed for text, use clip-path instead of overflow: hidden

### JAVASCRIPT FUNCTION RULES (CRITICAL):
- Every function referenced in onclick, onchange, onsubmit etc. MUST be defined in the <script> tag
- NEVER reference a function in HTML that is not defined in <script>
- All event handlers must use one of these patterns:

  Pattern 1 (inline - must have function in script):
  HTML: <button onclick="myFunction()">
  Script: function myFunction() { ... }

  Pattern 2 (addEventListener - preferred):
  HTML: <button id="myBtn">
  Script: document.getElementById('myBtn').addEventListener('click', () => { ... })

- Before writing any onclick attribute, verify the function exists in <script>
- Camera, microphone, GPS APIs are NOT available in iframe - do not implement them

### Section Dividers:

- NEVER use thick gradient lines between sections
- If a divider is needed, use ONLY: border-top: 1px solid rgba(255,255,255,0.1)
- Prefer spacing (padding/margin) over visible dividers
- No colored gradient bars as section separators

### Background Colors:

- Keep background saturation LOW — avoid bright mid-tone backgrounds
- Dark variants: stick to deep backgrounds (#0a0a0a, #0d0d0d, #111, #1a1a1a)
- Never use bright brown, bright tan, or mid-tone warm colors as main background
- If warm tones needed: use as accent only, not full-section background
- Text must always have sufficient contrast against background

### Typography Rules (CRITICAL for Korean):

- Korean font weight: NEVER use font-weight 900 or 800 for body/paragraph text
- Korean headlines: maximum font-weight 700
- Korean body text: font-weight 400, line-height 1.5
- Korean headings: line-height 1.2
- Section headings: use English titles displayed prominently (MENU, LOCATION, RESERVATION, ABOUT, CONTACT etc.) even for Korean websites
  → English title large and bold → Korean subtitle smaller below
  Example:
  \`<h2>MENU</h2>\`
  \`<p>브루밍의 메뉴</p>\`
- This creates visual hierarchy and feels more international/premium

### Card & Section Interactions:

- Cards: translateY(-4px) + box-shadow increase on hover
- Card grids on scroll: stagger with 0.05s delay per card, translateY 12px max
- Buttons: scale(1.03) on hover, scale(0.97) on active
- Sections with only body text: no animation — white space and typography carry them

### TYPOGRAPHY & LINE BREAK RULES (CRITICAL):
- NEVER break a line before a Korean particle (조사): 이/가, 을/를, 은/는, 의, 와/과, 로/으로, 에서, 에게, 도, 만, 까지
  BAD: "따뜻한 커피 한 잔과 함께, 오늘 하루가 조금 더\n       특별해지는 곳."
  GOOD: "따뜻한 커피 한 잔과 함께, 오늘 하루가 조금 더 특별해지는 곳."
- Line breaks only at natural meaning units
- Remove unnecessary spaces before/after punctuation

### CARD LAYOUT RULES:
- All cards in the same grid must have identical height
- Use CSS grid with align-items: stretch
- Card inner content: display flex, flex-direction: column
- Description text area: flex: 1 (fills remaining space)
- Profile/avatar always at bottom: margin-top: auto
- NEVER let card height vary based on content length

### SNS/SOCIAL ICONS:
- NEVER use text for social media links (Instagram, Facebook, YouTube etc.)
- Always use SVG icons for social media
- Instagram SVG, Facebook SVG, YouTube SVG, Twitter/X SVG must be inline
- Icon size: 24x24px, color: currentColor

### TIME & SCHEDULE FORMAT:
- Between day and time use: ~ or -
  GOOD: "월~금 09:00 - 18:00"
  GOOD: "월~금 09:00~18:00"
  BAD: "월금 09:00 18:00"

### DESCRIPTION TEXT ALIGNMENT:
- All description texts in the same section must have equal line count
- Use CSS: display: -webkit-box; -webkit-line-clamp: 3; overflow: hidden to truncate to same number of lines
- This ensures cards stay aligned regardless of content length

### FAQ SECTION STRUCTURE:
- FAQ section label (small text above): "FAQ"
- FAQ section main title: creative and relevant (e.g. "Everything You Asked", "궁금한 게 있어요?")
- NEVER use "FAQ" as both label and title

### INTERACTION STABILITY:
- During animations, layout must NOT shift
- All animated elements: position absolute or use transform only
- NEVER animate width, height, top, left, margin, padding
- Only animate: transform, opacity (GPU accelerated)
- Text and buttons must stay in fixed position during all animations

## KOREAN TONE & VOICE RULES (CRITICAL)

When generating Korean copy, follow these rules strictly:

Tone:
- Friendly but not too casual — like a knowledgeable friend
- Short sentences with natural rhythm (not long, formal sentences)
- Use suggestion/empathy form, not command form

GOOD examples:
- "오늘 컨디션은 어떠세요?" (O)
- "오늘 얼마나 운동할 수 있나요?" (O)
- "딱 맞는 루틴을 준비했어요" (O)
- "지금 기분에 맞는 루틴을 추천해드릴게요" (O)

BAD examples (never use):
- "오늘 몸 상태를 먼저 묻습니다" (X) — robotic, formal
- "시간을 입력해주세요" (X) — command form
- "운동 목표를 설정하세요" (X) — command form
- "당신에게 적합한 루틴을 추천해드릴게요" (X) — awkward translation style

Rules:
- NEVER use "당신" or any made-up user names
- NEVER use "여러분"
- NEVER use "네/니" as informal address
- Always omit the subject entirely for natural Korean flow
  (X) "당신에게 맞는 루틴" → (O) "딱 맞는 루틴"
  (X) "당신의 목표" → (O) "목표에 맞게"
  (X) invented names like "세올님" → (O) omit entirely
- NEVER use command endings (하세요, 입력하세요, 선택하세요)
  → Replace with suggestion endings (해볼까요?, 어떠세요?, 해드릴게요)
- NEVER use robotic/translated phrases
- NEVER describe service features robotically:
  (X) "감정 분석 기능을 제공합니다"
  (O) "감정을 이해에서 시작해요"
  (O) "오늘의 마음을 이해하는 가장 쉬운 방법"
- ALWAYS use natural conversational Korean
- Button text: action-oriented but friendly
  (X) "다음 단계" → (O) "좋아요, 다음으로"
  (X) "제출하기" → (O) "시작해볼게요"
  (X) "확인" → (O) "맞아요"
- Personalize CTA to the service context — must feel like it belongs to THIS specific brand, not a generic website:
  (X) "더 알아보기" → (O) 서비스에 맞는 구체적 문구
  (X) "시작하기" → (O) "함께해요", "살펴볼게요"
- NEVER use placeholder copy — all copy must be real and business-specific.
  `.trim();

  const font = resolvedProductType === "web" ? getFontConfig(brief) : null;
  console.log('[FONT] brief keywords:', brief.styleKeywords, brief.moodKeywords);
  console.log('[FONT] selected:', font ? `enHeading=${font.enHeading} koHeading=${font.koHeading}` : 'null (app or no font)');
  // </head> 바로 앞에 삽입 → 기존 모든 스타일보다 나중에 로드 + !important로 덮어씀
  const headingFamily = font ? `${font.enHeading}, ${font.koHeading}, sans-serif` : "";
  const bodyFamily = font ? `${font.enBody}, ${font.koBody}, sans-serif` : "";
  const fontStyle = font
    ? `${font.imports}
  h1, h2, h3, h4, h5, h6 { font-family: ${headingFamily} !important; font-weight: 700 !important; line-height: 1.2 !important; }
  body, p, span, li, button, input, textarea, div { font-family: ${bodyFamily} !important; line-height: 1.5; }
  :lang(ko), *[lang="ko"] { font-family: ${font.koBody} !important; }`
    : resolvedProductType === "app"
      ? `h1, h2, h3, h4, h5, h6 { line-height: 1.2 !important; }
  body, p, span, li, button, input, textarea, div { line-height: 1.5; }`
      : "";

  const finalizeHtml = async (html: string): Promise<string> => {
    let result = sanitizeGeneratedContent(html);
    if (fontStyle) {
      result = result.replace('</head>', `<style>\n${fontStyle}\n</style>\n</head>`);
    }

    // __PEXELS__:keyword__ 플레이스홀더를 실제 Pexels URL로 치환
    const placeholderRegex = /__PEXELS__:((?:[^_]|_(?!_))+)__/g;
    const matches = [...result.matchAll(placeholderRegex)];
    console.log(`[PEXELS] found ${matches.length} placeholder(s) in HTML`);
    if (matches.length === 0) {
      const srcSample = result.match(/src=['"]([^'"]{0,120})['"]/g)?.slice(0, 3);
      console.warn('[PEXELS] no placeholders found. src sample:', srcSample);
    }
    if (matches.length > 0) {
      const keywords = matches.map((m) => m[1].trim());
      console.log(`[PEXELS] keywords to fetch:`, keywords);
      const imageUrls = await Promise.all(keywords.map(async (kw) => {
        const url = await searchPexelsImage(kw);
        if (!url) {
          // Pexels 결과 없으면 picsum 폴백
          const seed = kw.split(' ')[0];
          return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/900`;
        }
        return url;
      }));
      keywords.forEach((kw, i) => {
        console.log(`[PEXELS] replace "${kw}" url=${imageUrls[i].slice(0, 60)}`);
        // split+join으로 모든 발생 치환 (String.replace는 첫 번째만)
        result = result.split(`__PEXELS__:${kw}__`).join(imageUrls[i]);
      });
    }

    // 작은따옴표 src → 큰따옴표로 통일
    result = result.replace(/src='(https?:\/\/[^']*)'/g, 'src="$1"');

    // crossorigin 속성 제거 — blob URL iframe 환경에서 COEP 오류 유발
    result = result.replace(/\s*crossorigin="[^"]*"/g, '');
    result = result.replace(/\s*crossorigin='[^']*'/g, '');

    // 앱 모드: LLM이 지시를 어기고 img 태그를 넣었을 경우 후처리로 제거
    if (resolvedProductType === "app") {
      const imgCount = (result.match(/<img\b[^>]*>/gi) ?? []).length;
      if (imgCount > 0) {
        console.warn(`[APP] removing ${imgCount} <img> tag(s) from app HTML`);
        result = result.replace(/<img\b[^>]*>/gi, '');
      }
    }

    const imgCheck = result.match(/src='([^']+)'|src="([^"]+)"/g);
    console.log('[FINAL IMG CHECK]', imgCheck?.slice(0, 3));
    console.log('[FONT] injected enHeading:', font ? result.includes(font.enHeading) : 'n/a');
    console.log('[FONT] injected koHeading:', font ? result.includes(font.koHeading) : 'n/a');
    return result;
  };

  const englishTitleInstruction = font?.englishTitle
    ? "\n\n[IMPORTANT] Unless the user explicitly requested Korean titles, use English for all h1/h2/h3 headings. Korean is acceptable for body text and descriptions only."
    : "";

  const pexelsInstruction = resolvedProductType === "app"
    ? `\n\n[APP MODE — NO IMAGES] This is a mobile app. Do NOT use any <img> tags anywhere in the HTML. Use emoji, colored divs, CSS shapes, or initials avatars instead. Every <img> tag will break the app layout.`
    : `\n\nFor every <img> tag, use this exact format (double quotes, no real URLs):
<img src="__PEXELS__:keyword__" alt="...">
Use the most specific English keyword that matches YOUR topic — this applies to ALL industries, not just cafe.
Examples across different topics:
- Fitness hero     → src="__PEXELS__:gym workout athlete__"
- Yoga/wellness    → src="__PEXELS__:yoga meditation studio__"
- Fashion hero     → src="__PEXELS__:fashion model editorial__"
- Beauty/skincare  → src="__PEXELS__:skincare beauty product__"
- Tech/startup     → src="__PEXELS__:modern office technology__"
- Restaurant       → src="__PEXELS__:restaurant interior dining__"
- Cafe/coffee      → src="__PEXELS__:cafe interior cozy__"
- Real estate      → src="__PEXELS__:modern architecture interior__"
- Travel           → src="__PEXELS__:travel landscape scenic__"
Always use English keywords. NEVER use real URLs — only __PEXELS__:keyword__ placeholders.`;

  const codeUserContent =
    JSON.stringify({ prompt, interpretation, brief }, null, 2) +
    englishTitleInstruction +
    pexelsInstruction;

  const codeInput = [
    { role: "system" as const, content: codeSystemContent },
    { role: "user" as const, content: codeUserContent },
  ];

  const minimalFallback: GeneratedFile[] = [
    {
      path: "/index.html",
      content: `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>오류</title><style>body{margin:0;padding:2rem;font-family:sans-serif;background:#0a0a0a;color:#fff}</style></head><body><h1>생성 중 오류가 발생했습니다</h1><p style="margin-top:1rem;color:rgba(255,255,255,0.6)">다시 시도해 주세요.</p></body></html>`,
    },
  ];

  const modelCode = resolvedProductType === "app" ? ANTHROPIC_MODEL_CODE_APP : ANTHROPIC_MODEL_CODE_WEB;

  const attemptCodegen = async (): Promise<GeneratedFile[]> => {
    console.log(`[CODEGEN] model=${modelCode} variant=${brief.variantId} productType=${resolvedProductType}`);

    const stream = anthropic.messages.stream(
      {
        model: modelCode,
        max_tokens: 32000,
        system: codeSystemContent,
        messages: [{ role: "user", content: codeUserContent }],
      },
      { signal },
    );
    const response = await stream.finalMessage();

    console.log(`[CODEGEN] stop_reason=${response.stop_reason} blocks=${response.content.map((b) => b.type).join(",")}`);

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    console.log(`[CODEGEN] rawText length=${rawText.length}`);
    console.log(`[CODEGEN] rawText FULL:\n${rawText}`);

    // html_output 태그 우선 추출
    const tagMatch = rawText.match(/<html_output>([\s\S]*?)<\/html_output>/i);
    if (tagMatch) {
      const html = tagMatch[1].trim();
      console.log(`[CODEGEN] extracted via <html_output> tag, length=${html.length}`);
      const imgMatches = html.match(/<img[^>]*src="([^"]*)"[^>]*>/g);
      console.log('[CODEGEN IMAGES]', imgMatches?.slice(0, 3));
      return [{ path: "/index.html", content: await finalizeHtml(html) }];
    }

    // 코드 블록(```html ... ```) 추출
    const codeBlockMatch = rawText.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      const html = codeBlockMatch[1].trim();
      console.log(`[CODEGEN] extracted via code block, length=${html.length}`);
      const imgMatches = html.match(/<img[^>]*src="([^"]*)"[^>]*>/g);
      console.log('[CODEGEN IMAGES]', imgMatches?.slice(0, 3));
      return [{ path: "/index.html", content: await finalizeHtml(html) }];
    }

    // <!DOCTYPE html> ... </html> 직접 추출
    const doctypeMatch = rawText.match(/(<!DOCTYPE\s+html[\s\S]*<\/html>)/i);
    if (doctypeMatch) {
      const html = doctypeMatch[1].trim();
      console.log(`[CODEGEN] extracted via DOCTYPE match, length=${html.length}`);
      const imgMatches = html.match(/<img[^>]*src="([^"]*)"[^>]*>/g);
      console.log('[CODEGEN IMAGES]', imgMatches?.slice(0, 3));
      return [{ path: "/index.html", content: await finalizeHtml(html) }];
    }

    // max_tokens로 응답이 잘린 경우: 닫는 태그 없이 잘린 HTML 구제
    if (response.stop_reason === 'max_tokens') {
      const truncatedTag = rawText.match(/<html_output>([\s\S]*)/i);
      if (truncatedTag) {
        let html = truncatedTag[1].trim();
        if (!html.endsWith('</html>')) html += '\n</body>\n</html>';
        console.log(`[CODEGEN] salvaged truncated <html_output> (max_tokens), length=${html.length}`);
        const imgMatches = html.match(/<img[^>]*src="([^"]*)"[^>]*>/g);
        console.log('[CODEGEN IMAGES]', imgMatches?.slice(0, 3));
        return [{ path: "/index.html", content: await finalizeHtml(html) }];
      }
      const truncatedDoctype = rawText.match(/(<!DOCTYPE\s+html[\s\S]*)/i);
      if (truncatedDoctype) {
        let html = truncatedDoctype[1].trim();
        if (!html.endsWith('</html>')) html += '\n</body>\n</html>';
        console.log(`[CODEGEN] salvaged truncated DOCTYPE (max_tokens), length=${html.length}`);
        const imgMatches = html.match(/<img[^>]*src="([^"]*)"[^>]*>/g);
        console.log('[CODEGEN IMAGES]', imgMatches?.slice(0, 3));
        return [{ path: "/index.html", content: await finalizeHtml(html) }];
      }
    }

    console.log('[CODEGEN RAW RESPONSE]', JSON.stringify(response.content, null, 2).slice(0, 1000));
    console.log(`[CODEGEN FAIL] could not extract HTML from response`);
    return [];
  };

  let files = await attemptCodegen().catch((e) => {
    console.error('[CODEGEN] attemptCodegen threw:', e instanceof Error ? e.message : e);
    return [] as GeneratedFile[];
  });
  if (files.length === 0) {
    console.warn(`[CODEGEN] Variant ${brief.variantId} returned empty files, retrying...`);
    files = await attemptCodegen().catch((e) => {
      console.error('[CODEGEN] retry attemptCodegen threw:', e instanceof Error ? e.message : e);
      return [] as GeneratedFile[];
    });
  }
  if (files.length === 0) {
    console.error(`[CODEGEN] Variant ${brief.variantId} retry also returned empty files, using fallback`);
    return minimalFallback;
  }
  return files;
}
