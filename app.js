const deckEl = document.querySelector("#deck");
const thumbsEl = document.querySelector("#thumbs");
const countEl = document.querySelector("#slide-count");
const prevEl = document.querySelector("#prev");
const nextEl = document.querySelector("#next");

let deckData;
let activeIndex = 0;

if (new URLSearchParams(window.location.search).has("video")) {
  document.body.classList.add("video-mode");
}

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// Convert a leading "提案 · / 建议 · / 估算 · / 数据 · / 待补 ·" prefix into a small colored badge,
// so it scans as a visual tag rather than extra text.
const TAG_CLASS = {
  "提案": "tag-proposal",
  "建议": "tag-suggest",
  "估算": "tag-estimate",
  "数据": "tag-data",
  "待补": "tag-pending",
  "事实": "tag-data",
  "学": "tag-good",
  "不学": "tag-bad",
  "起点": "tag-neutral",
  "机制": "tag-good",
  "启示": "tag-good",
  "价格": "tag-good",
  "主": "tag-proposal",
  "副": "tag-suggest",
  "辅": "tag-neutral",
  "避": "tag-bad",
};

function badge(text) {
  const str = String(text ?? "");
  const match = str.match(/^(提案|建议|估算|数据|待补)\s*·\s*(.*)$/);
  if (!match) return esc(str);
  const cls = TAG_CLASS[match[1]] || "tag-neutral";
  return `<span class="tag ${cls}">${esc(match[1])}</span>${esc(match[2])}`;
}


// <picture> with AVIF + WebP fallback. Browsers pick the first supported source.
// Eager-load only the cover hero; everything else lazy + async decode.
function pictureTag(src, alt, opts = {}) {
  const cleanSrc = String(src ?? "").split("?")[0];
  const avif = cleanSrc.replace(/\.webp$/i, ".avif").replace(/\.jpg$/i, ".avif").replace(/\.png$/i, ".avif");
  const eager = opts.eager === true;
  const lazyAttr = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
  return `<picture><source srcset="${esc(avif)}" type="image/avif"><source srcset="${esc(cleanSrc)}" type="image/webp"><img ${lazyAttr} src="${esc(cleanSrc)}" alt="${esc(alt ?? "")}" /></picture>`;
}

// CSS background image with AVIF+WebP via image-set()
function bgImageStyle(src) {
  const cleanSrc = String(src ?? "").split("?")[0];
  const avif = cleanSrc.replace(/\.webp$/i, ".avif").replace(/\.jpg$/i, ".avif").replace(/\.png$/i, ".avif");
  return `image-set(url('${avif}') type('image/avif') 1x, url('${cleanSrc}') type('image/webp') 1x)`;
}

// Stagger delay helper
const stagger = (i, base = 80, start = 80) => `style="--anim-delay: ${start + i * base}ms"`;

function topline(slide, opts = {}) {
  const { startDelay = 0 } = opts;
  return `
    <header class="topline">
      <span class="kicker" data-anim style="--anim-delay: ${startDelay}ms">${esc(slide.kicker)}</span>
      <h2 data-anim style="--anim-delay: ${startDelay + 100}ms">${esc(slide.headline)}</h2>
      <p class="subtitle" data-anim style="--anim-delay: ${startDelay + 200}ms">${esc(slide.subhead)}</p>
    </header>
  `;
}

function proofBlock(slide, delay = 0) {
  return slide.proof ? `<p class="proof" data-anim style="--anim-delay: ${delay}ms">${esc(slide.proof)}</p>` : "";
}

function renderCover(slide) {
  // split headline AFTER punctuation so comma/period stay at end of previous line
  const lines = esc(slide.headline)
    .split(/(?<=，|。|！)/)
    .filter(Boolean);
  return `
    <section class="slide layout-cover" data-id="${esc(slide.id)}">
      <div class="cover-bg-mark" aria-hidden="true"></div>
      <div class="slide-inner">
        <div class="cover-copy">
          <span class="brand-chip" data-anim style="--anim-delay: 0ms">${esc(slide.brand)}</span>
          <span class="kicker" data-anim style="--anim-delay: 80ms">${esc(slide.kicker)}</span>
          <div class="cover-headline">
            <h1>${lines.map((ln) => `<span class="ln"><span>${ln}</span></span>`).join("")}</h1>
          </div>
          <p class="subtitle" data-anim style="--anim-delay: 540ms">${esc(slide.subhead)}</p>
          <p class="proof" data-anim style="--anim-delay: 720ms">${esc(slide.proof || "")}</p>
        </div>
        <figure class="cover-visual" data-anim-scale style="--anim-delay: 300ms">
          ${pictureTag(slide.image, slide.image_alt, {eager: true})}
        </figure>
      </div>
    </section>
  `;
}

function renderStats(slide) {
  const hasBg = !!slide.background_image;
  const bgStyle = hasBg ? ` style="--bg-image: ${bgImageStyle(slide.background_image)}"` : "";
  return `
    <section class="slide layout-stats${hasBg ? " has-bg" : ""}" data-id="${esc(slide.id)}"${bgStyle}>
      ${hasBg ? `<div class="slide-bg-image" aria-hidden="true"></div>` : ""}
      <div class="slide-inner">
        ${topline(slide)}
        <div class="stats-grid">
          ${slide.stats
            .map(
              (s, i) => `
                <article class="stat-card" data-anim ${stagger(i, 120, 240)}>
                  <span class="stat-value" data-count-target="${esc(s.value)}">${esc(s.value)}</span>
                  <span class="stat-unit">${esc(s.unit)}</span>
                  <span class="stat-note">${esc(s.note)}</span>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 240 + slide.stats.length * 120 + 200)}
      </div>
    </section>
  `;
}

function renderAssetGrid(slide) {
  return `
    <section class="slide layout-asset-grid" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="asset-grid">
          ${slide.assets
            .map(
              (a, i) => `
                <article class="asset-card" data-anim-scale ${stagger(i, 70, 320)}>
                  <span class="asset-code">${esc(a.code)}</span>
                  <b>${esc(a.name_cn)}</b>
                  <p class="asset-source">${esc(a.source)}</p>
                  <p class="asset-translation">${esc(a.translation)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.assets.length * 70 + 240)}
      </div>
    </section>
  `;
}

function renderAssetWithImage(slide) {
  return `
    <section class="slide layout-asset-with-image" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="asset-image-body">
          <div class="asset-grid-2x2">
            ${slide.assets
              .map(
                (a, i) => `
                  <article class="asset-card" data-anim-scale ${stagger(i, 90, 380)}>
                    <span class="asset-code">${esc(a.code)}</span>
                    <b>${esc(a.name_cn)}</b>
                    <p class="asset-source">${esc(a.source)}</p>
                    <p class="asset-translation">${esc(a.translation)}</p>
                  </article>
                `,
              )
              .join("")}
          </div>
          <figure class="asset-side-image" data-anim-scale style="--anim-delay: 320ms">
            ${pictureTag(slide.image, slide.image_alt)}
          </figure>
        </div>
        ${proofBlock(slide, 380 + slide.assets.length * 90 + 240)}
      </div>
    </section>
  `;
}

function renderTranslation(slide) {
  const visualBlock = slide.image
    ? `<figure class="translation-visual" data-anim-scale style="--anim-delay: 320ms">
        ${pictureTag(slide.image, slide.image_alt || "")}
        <figcaption>同一种纹理语言，从鞋底翻到杯身</figcaption>
      </figure>`
    : "";
  return `
    <section class="slide layout-translation${slide.image ? " has-visual" : ""}" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="translation-body">
          ${visualBlock}
          <div class="translation-table">
            <div class="translation-head" data-anim style="--anim-delay: 280ms">
              <span>斯凯奇资产</span>
              <span class="arrow">→</span>
              <span>杯壶结构</span>
            </div>
            ${slide.rows
              .map(
                (r, i) => `
                  <div class="translation-row" data-anim ${stagger(i, 110, 380)}>
                    <div class="cell-left">
                      <b>${esc(r.left_code)}</b>
                      <p>${esc(r.left_note)}</p>
                    </div>
                    <span class="arrow">→</span>
                    <div class="cell-right">
                      <b>${esc(r.right_struct)}</b>
                      <p>${esc(r.right_note)}</p>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
        ${proofBlock(slide, 380 + slide.rows.length * 110 + 240)}
      </div>
    </section>
  `;
}

function renderHeroSpec(slide) {
  return `
    <section class="slide layout-hero-spec" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        <figure class="hero-image-side">
          ${pictureTag(slide.image, slide.image_alt)}
        </figure>
        <div class="hero-content-side">
          <div class="topline">
            <span class="kicker" data-anim style="--anim-delay: 120ms">${esc(slide.kicker)}</span>
            <h2 data-anim style="--anim-delay: 220ms">${esc(slide.headline)}</h2>
            <p class="subtitle" data-anim style="--anim-delay: 320ms">${esc(slide.subhead)}</p>
          </div>
          <div class="hero-body-stack">
            <div class="hero-specs">
              ${slide.specs
                .map(
                  (s, i) => `
                    <div class="spec-row" data-anim-slide-right ${stagger(i, 70, 460)}>
                      <span class="spec-label">${esc(s.label)}</span>
                      <span class="spec-value">${badge(s.value)}</span>
                    </div>
                  `,
                )
                .join("")}
            </div>
            <p class="hero-hook" data-anim style="--anim-delay: 800ms">${esc(slide.hook)}</p>
            <div class="hero-channels">
              ${slide.channels
                .map(
                  (c, i) => `
                    <article class="channel-tag" data-anim ${stagger(i, 80, 880)}>
                      <b>${esc(c.channel)}</b>
                      <p>${esc(c.action)}</p>
                    </article>
                  `,
                )
                .join("")}
            </div>
            <div class="hero-kpi">
              ${slide.kpi
                .map(
                  (k, i) => `
                    <article class="kpi-cell" data-anim-scale ${stagger(i, 60, 1080)}>
                      <span>${badge(k.label)}</span>
                      <b>${esc(k.value)}</b>
                    </article>
                  `,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderValidationTable(slide) {
  const hasBg = !!slide.background_image;
  const bgStyle = hasBg ? ` style="--bg-image: ${bgImageStyle(slide.background_image)}"` : "";
  return `
    <section class="slide layout-validation${hasBg ? " has-watermark" : ""}" data-id="${esc(slide.id)}"${bgStyle}>
      ${hasBg ? `<div class="slide-watermark" aria-hidden="true"></div>` : ""}
      <div class="slide-inner">
        ${topline(slide)}
        <div class="validation-table">
          <div class="validation-row header" data-anim style="--anim-delay: 280ms">
            <span class="name-cell">产品</span>
            ${slide.columns.slice(1).map((c) => `<span>${esc(c)}</span>`).join("")}
          </div>
          ${slide.rows
            .map(
              (r, i) => `
                <div class="validation-row" data-anim-slide-left ${stagger(i, 130, 380)}>
                  <span class="name-cell"><b>${esc(r.name)}</b></span>
                  ${r.cells.map((cell) => `<span>${badge(cell)}</span>`).join("")}
                </div>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 380 + slide.rows.length * 130 + 200)}
      </div>
    </section>
  `;
}

function renderDashboard(slide) {
  // generate fake bar viz of variable length for each panel
  const fakeBars = (seed) => {
    const heights = [];
    let x = seed;
    for (let i = 0; i < 12; i++) {
      x = (x * 9301 + 49297) % 233280;
      heights.push(30 + (x % 70));
    }
    return heights;
  };
  const hasBg = !!slide.background_image;
  const bgStyle = hasBg ? ` style="--bg-image: ${bgImageStyle(slide.background_image)}"` : "";
  return `
    <section class="slide layout-dashboard${hasBg ? " has-bg" : ""}" data-id="${esc(slide.id)}"${bgStyle}>
      ${hasBg ? `<div class="slide-bg-image dim" aria-hidden="true"></div>` : ""}
      <div class="slide-inner">
        ${topline(slide)}
        <div class="dashboard-grid">
          ${slide.panels
            .map(
              (p, i) => {
                const bars = fakeBars(i + 1);
                return `
                  <article class="dashboard-panel" data-anim ${stagger(i, 140, 320)}>
                    <header><b>${esc(p.title)}</b></header>
                    <div class="dashboard-fakeviz" aria-hidden="true">
                      ${bars.map((h, bi) => `<div class="bar" style="height: ${h}%; animation-delay: ${320 + i * 140 + bi * 35}ms"></div>`).join("")}
                    </div>
                    <ul>
                      ${p.metrics.map((m) => `<li>${esc(m)}</li>`).join("")}
                    </ul>
                    <footer>${esc(p.decision)}</footer>
                  </article>
                `;
              },
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.panels.length * 140 + 240)}
      </div>
    </section>
  `;
}

function renderWeekly(slide) {
  return `
    <section class="slide layout-weekly" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="weekly-track">
          <div class="weekly-line" aria-hidden="true"></div>
          <div class="weekly-grid">
            ${slide.weeks
              .map(
                (w, i) => `
                  <article class="weekly-card" data-anim ${stagger(i, 100, 460)}>
                    <em>${esc(w.period)}</em>
                    <b>${esc(w.title)}</b>
                    <ul>${w.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
        <div class="redline-row">
          <span class="redline-label" data-anim style="--anim-delay: 1280ms">KPI 红线</span>
          ${slide.redlines
            .map(
              (r, i) => `
                <article class="redline-pill" data-anim ${stagger(i, 80, 1360)}>
                  <b>${badge(r.label)}</b>
                  <p>${esc(r.action)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderYear(slide) {
  return `
    <section class="slide layout-year" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="year-table">
          <div class="year-row header" data-anim style="--anim-delay: 280ms">
            <span>时间</span>
            <span>节点</span>
            <span>主推产品</span>
            <span>营销动力</span>
          </div>
          ${slide.items
            .map(
              (it, i) => `
                <div class="year-row" data-anim-slide-left ${stagger(i, 80, 380)}>
                  <span class="year-date">${esc(it.date)}</span>
                  <span>${esc(it.node)}</span>
                  <span><b>${esc(it.hero)}</b></span>
                  <span>${esc(it.lever)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 380 + slide.items.length * 80 + 200)}
      </div>
    </section>
  `;
}

function renderAsk(slide) {
  return `
    <section class="slide layout-ask" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="ask-grid">
          ${slide.asks
            .map(
              (a, i) => `
                <article class="ask-card" data-anim ${stagger(i, 160, 320)}>
                  <em>${esc(a.num)}</em>
                  <b>${esc(a.title)}</b>
                  <p class="ask-detail">${esc(a.detail)}</p>
                  <p class="ask-use">用于：${esc(a.use)}</p>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.asks.length * 160 + 200)}
      </div>
    </section>
  `;
}

function renderCaseStudy(slide) {
  return `
    <section class="slide layout-case-study" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="case-body">
          <figure class="case-visual" data-anim-scale style="--anim-delay: 320ms">
            ${pictureTag(slide.image, slide.image_alt || "")}
          </figure>
          <div class="case-lessons">
            ${slide.lessons
              .map(
                (l, i) => `
                  <article class="lesson-row lesson-${esc(l.tone)}" data-anim-slide-right ${stagger(i, 100, 380)}>
                    <span class="lesson-tag ${TAG_CLASS[l.tag] || ""}">${esc(l.tag)}</span>
                    <div>
                      <b>${esc(l.title)}</b>
                      <p>${esc(l.detail)}</p>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
        ${proofBlock(slide, 380 + slide.lessons.length * 100 + 240)}
      </div>
    </section>
  `;
}

function renderSegmentCards(slide) {
  return `
    <section class="slide layout-segment-cards" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="segment-grid">
          ${slide.segments
            .map(
              (s, i) => `
                <article class="segment-card priority-${esc(s.priority).toLowerCase()}" data-anim-scale ${stagger(i, 110, 320)}>
                  <span class="seg-priority">${esc(s.priority)}</span>
                  <b>${esc(s.name)}</b>
                  <div class="seg-row"><span class="seg-label">场景</span><span>${esc(s.scenes)}</span></div>
                  <div class="seg-row"><span class="seg-label">购买动机</span><span>${esc(s.drivers)}</span></div>
                  <div class="seg-hero">→ ${esc(s.hero)}</div>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.segments.length * 110 + 200)}
      </div>
    </section>
  `;
}

function renderSkuMatrix(slide) {
  return `
    <section class="slide layout-sku-matrix" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="sku-matrix-grid">
          ${slide.series
            .map(
              (s, i) => `
                <article class="sku-col${s.image ? " with-image" : ""}" data-anim ${stagger(i, 120, 320)}>
                  ${s.image ? `<figure class="sku-image">${pictureTag(s.image, s.name)}</figure>` : ""}
                  <header>
                    <b>${esc(s.name)}</b>
                    <span>${esc(s.name_cn)}</span>
                  </header>
                  <ul>
                    ${s.items.map((it) => `<li class="${it.hero ? "is-hero" : ""}">${it.hero ? "⭐ " : ""}${esc(it.text)}</li>`).join("")}
                  </ul>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.series.length * 120 + 240)}
      </div>
    </section>
  `;
}

function renderTouchpoint(slide) {
  return `
    <section class="slide layout-touchpoint" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="touchpoint-body">
          <figure class="touchpoint-visual" data-anim-scale style="--anim-delay: 320ms">
            ${pictureTag(slide.image, slide.image_alt || "")}
          </figure>
          <div class="touchpoint-list">
            ${slide.touchpoints
              .map(
                (t, i) => `
                  <article class="tp-row" data-anim-slide-right ${stagger(i, 90, 420)}>
                    <span class="tp-num">${esc(t.num)}</span>
                    <div class="tp-body">
                      <div class="tp-head"><b>${esc(t.name)}</b><span class="tp-asset">${esc(t.asset)}</span></div>
                      <p>${esc(t.detail)}</p>
                    </div>
                  </article>
                `,
              )
              .join("")}
          </div>
        </div>
        ${proofBlock(slide, 420 + slide.touchpoints.length * 90 + 200)}
      </div>
    </section>
  `;
}

function renderChannelGrid(slide) {
  const anyImage = slide.channels.some((c) => c.image);
  return `
    <section class="slide layout-channel-grid${anyImage ? " with-images" : ""}" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="channel-grid">
          ${slide.channels
            .map(
              (c, i) => `
                <article class="channel-card" data-anim ${stagger(i, 140, 320)}>
                  ${c.image ? `<figure class="ch-image">${pictureTag(c.image, c.name)}</figure>` : ""}
                  <header>
                    <b>${esc(c.name)}</b>
                    <span>${esc(c.role)}</span>
                  </header>
                  <div class="ch-row"><span class="ch-label">场景</span><p>${esc(c.scenes)}</p></div>
                  <div class="ch-row"><span class="ch-label">主推</span><p>${esc(c.hero)}</p></div>
                  <div class="ch-row"><span class="ch-label">KPI</span><p>${esc(c.kpi)}</p></div>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.channels.length * 140 + 200)}
      </div>
    </section>
  `;
}

function renderAssetCardGrid(slide) {
  return `
    <section class="slide layout-asset-card-grid" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="asset-card-grid">
          ${slide.assets
            .map(
              (a, i) => `
                <article class="asset-photo-card" data-anim-scale ${stagger(i, 110, 320)}>
                  ${a.image ? `<figure class="asset-photo">${pictureTag(a.image, a.code)}</figure>` : ""}
                  <div class="asset-photo-body">
                    <span class="asset-code">${esc(a.code)}</span>
                    <b>${esc(a.name_cn)}</b>
                    <p class="asset-source">${esc(a.source)}</p>
                    <p class="asset-translation">${esc(a.translation)}</p>
                  </div>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.assets.length * 110 + 220)}
      </div>
    </section>
  `;
}

function renderRiskTable(slide) {
  return `
    <section class="slide layout-risk-table" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="risk-table">
          <div class="risk-row header" data-anim style="--anim-delay: 280ms">
            <span>风险</span>
            <span>影响</span>
            <span>Plan B</span>
          </div>
          ${slide.rows
            .map(
              (r, i) => `
                <div class="risk-row" data-anim-slide-left ${stagger(i, 110, 380)}>
                  <span class="risk-cell risk-name"><b>${esc(r.risk)}</b></span>
                  <span class="risk-cell">${esc(r.impact)}</span>
                  <span class="risk-cell risk-planb"><span class="planb-tag">PLAN B</span> ${esc(r.planb)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 380 + slide.rows.length * 110 + 200)}
      </div>
    </section>
  `;
}

function renderDataBaseline(slide) {
  return `
    <section class="slide layout-data-baseline" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="baseline-grid">
          ${slide.buckets
            .map(
              (b, i) => `
                <article class="baseline-card tone-${esc(b.tone)}" data-anim ${stagger(i, 160, 320)}>
                  <header>
                    <span class="bl-level">${esc(b.level)}</span>
                    <span class="bl-tag">${esc(b.tag)}</span>
                  </header>
                  <b class="bl-title">${esc(b.title)}</b>
                  <ul>
                    ${b.examples.map((e) => `<li>${esc(e)}</li>`).join("")}
                  </ul>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.buckets.length * 160 + 200)}
      </div>
    </section>
  `;
}

function renderMindMap(slide) {
  return `
    <section class="slide layout-mind-map" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="mindmap-wrap">
          <div class="mindmap-canvas">
            <span class="axis-label axis-top">↑ ${esc(slide.axis.y_top)}</span>
            <span class="axis-label axis-bottom">↓ ${esc(slide.axis.y_bottom)}</span>
            <span class="axis-label axis-left">← ${esc(slide.axis.x_left)}</span>
            <span class="axis-label axis-right">${esc(slide.axis.x_right)} →</span>
            <div class="quad q-tl"></div>
            <div class="quad q-tr"></div>
            <div class="quad q-bl"></div>
            <div class="quad q-br"></div>
            ${slide.brands
              .map(
                (b, i) => `
                  <div class="brand-dot ${b.highlight ? "highlight" : ""}"
                       style="left: ${b.x}%; top: ${b.y}%; --anim-delay: ${400 + i * 90}ms"
                       data-anim-scale>
                    <span class="dot-mark"></span>
                    <span class="dot-label">${esc(b.name)}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </div>
        ${proofBlock(slide, 400 + slide.brands.length * 90 + 240)}
      </div>
    </section>
  `;
}

function renderNamingSystem(slide) {
  return `
    <section class="slide layout-naming" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="naming-grid">
          ${slide.names
            .map(
              (n, i) => `
                <article class="name-card" data-anim-scale ${stagger(i, 130, 320)}>
                  <header class="name-head">
                    <div class="name-en">
                      ${n.en_parts.map((p) => `<span class="part"><b>${esc(p.part)}</b><em>${esc(p.meaning)}</em></span>`).join('<span class="plus">+</span>')}
                    </div>
                    <div class="name-cn">${esc(n.cn)}</div>
                  </header>
                  <p class="name-action">${esc(n.action)}</p>
                  <span class="name-asset">${esc(n.asset)}</span>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.names.length * 130 + 240)}
      </div>
    </section>
  `;
}

function renderContentScripts(slide) {
  return `
    <section class="slide layout-content-scripts" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="scripts-grid">
          ${slide.scripts
            .map(
              (s, i) => `
                <article class="script-card" data-anim ${stagger(i, 140, 320)}>
                  <header>
                    <b>${esc(s.hero)}</b>
                    <span class="script-tag">${esc(s.tag)}</span>
                  </header>
                  <ol class="shot-list">
                    ${s.shots.map((sh) => `<li><em>${esc(sh.t)}</em><p>${esc(sh.act)}</p></li>`).join("")}
                  </ol>
                  <footer>
                    <div><span>达人级别</span>${esc(s.level)}</div>
                    <div><span>首发渠道</span>${esc(s.channel)}</div>
                  </footer>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 320 + slide.scripts.length * 140 + 200)}
      </div>
    </section>
  `;
}

function renderPhaseColumns(slide) {
  return `
    <section class="slide layout-phase-columns" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="phase-grid">
          ${slide.phases
            .map(
              (p, i) => `
                <article class="phase-card" data-anim ${stagger(i, 160, 380)}>
                  <header>
                    <em>${esc(p.label)}</em>
                    <b>${esc(p.title)}</b>
                  </header>
                  <div class="phase-section">
                    <span class="phase-section-label">SKU 投放</span>
                    <ul>
                      ${p.skus.map((s) => `<li><b>${esc(s.name)}</b><em>${badge(s.qty)}</em></li>`).join("")}
                    </ul>
                  </div>
                  <div class="phase-section">
                    <span class="phase-section-label">渠道</span>
                    <p>${p.channels.map((c) => esc(c)).join(" · ")}</p>
                  </div>
                  <div class="phase-goal">${badge(p.goal)}</div>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 380 + slide.phases.length * 160 + 240)}
      </div>
    </section>
  `;
}

function renderRampCurve(slide) {
  return `
    <section class="slide layout-ramp-curve" data-id="${esc(slide.id)}">
      <div class="slide-inner">
        ${topline(slide)}
        <div class="ramp-grid">
          ${slide.years
            .map(
              (y, i) => `
                <article class="ramp-card ramp-${i}" data-anim ${stagger(i, 180, 360)}>
                  <header>
                    <em>${esc(y.year)}</em>
                    <span class="ramp-period">${esc(y.period)}</span>
                    <b>${esc(y.stage)}</b>
                  </header>
                  <div class="ramp-target">
                    <span>目标</span>
                    <strong>${badge(y.target)}</strong>
                  </div>
                  <ul class="ramp-drivers">
                    ${y.drivers.map((d) => `<li>${esc(d)}</li>`).join("")}
                  </ul>
                  <div class="ramp-milestone">${badge(y.milestone)}</div>
                </article>
              `,
            )
            .join("")}
        </div>
        ${proofBlock(slide, 360 + slide.years.length * 180 + 240)}
      </div>
    </section>
  `;
}

function renderSlide(slide) {
  const renderers = {
    cover: renderCover,
    stats: renderStats,
    asset_grid: renderAssetGrid,
    asset_with_image: renderAssetWithImage,
    asset_card_grid: renderAssetCardGrid,
    translation: renderTranslation,
    hero_spec: renderHeroSpec,
    validation_table: renderValidationTable,
    dashboard: renderDashboard,
    weekly: renderWeekly,
    year: renderYear,
    ask: renderAsk,
    case_study: renderCaseStudy,
    segment_cards: renderSegmentCards,
    sku_matrix: renderSkuMatrix,
    touchpoint: renderTouchpoint,
    channel_grid: renderChannelGrid,
    risk_table: renderRiskTable,
    mind_map: renderMindMap,
    data_baseline: renderDataBaseline,
    naming_system: renderNamingSystem,
    content_scripts: renderContentScripts,
    phase_columns: renderPhaseColumns,
    ramp_curve: renderRampCurve,
  };
  return (renderers[slide.layout] ?? renderCover)(slide);
}

// ============ Number count-up ============
function parseNumericTarget(text) {
  // extract leading number; preserve unit/suffix
  const match = String(text).match(/^([0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return null;
  return { num: parseFloat(match[1]), suffix: match[2] };
}

function animateCount(el, target, duration = 1500, delay = 0) {
  const parsed = parseNumericTarget(target);
  if (!parsed) return;
  const start = 0;
  const startTime = performance.now() + delay;
  const decimals = (String(parsed.num).split(".")[1] || "").length;

  const tick = (t) => {
    if (t < startTime) {
      el.textContent = "0" + parsed.suffix;
      requestAnimationFrame(tick);
      return;
    }
    const progress = Math.min(1, (t - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (parsed.num - start) * eased;
    el.textContent = value.toFixed(decimals) + parsed.suffix;
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function triggerSlideAnimations(slideEl) {
  const counters = slideEl.querySelectorAll("[data-count-target]");
  counters.forEach((el, i) => {
    const target = el.getAttribute("data-count-target");
    animateCount(el, target, 1400, 200 + i * 120);
  });
}

// Fixed-canvas scaling (reveal.js / slides.com pattern):
// Every slide is laid out at exactly 1920×1080 (set in CSS). We compute a
// single uniform scale = min(deckW/1920, deckH/1080) and apply it on the
// .deck root via --deck-scale. The CSS `transform: scale(var(--deck-scale))`
// on every .slide does the rest. No content measurement, no per-page
// overflow logic — design always at 1920×1080, render anywhere.
const CANVAS_W = 1920;
const CANVAS_H = 1080;

function recomputeDeckScale() {
  if (!deckEl) return;
  // Mobile (≤880px) bypasses canvas scaling — separate vertical flow in CSS.
  if (window.innerWidth <= 880) {
    deckEl.style.removeProperty("--deck-scale");
    document.documentElement.style.removeProperty("--deck-scale");
    return;
  }
  const w = deckEl.clientWidth;
  const h = deckEl.clientHeight;
  if (!w || !h) return;
  const scale = Math.min(w / CANVAS_W, h / CANVAS_H);
  deckEl.style.setProperty("--deck-scale", scale.toFixed(4));
}

// Kept as a no-op shim so existing callers (setActive, resize listener) work.
function fitSlide(_slideEl) {
  recomputeDeckScale();
}

function setActive(index) {
  activeIndex = Math.max(0, Math.min(index, deckData.slides.length - 1));

  const slides = [...deckEl.children];
  slides.forEach((slide, i) => {
    if (i === activeIndex) {
      // force animation restart by removing then adding class
      slide.classList.remove("active");
      void slide.offsetWidth;
      slide.classList.add("active");
      fitSlide(slide);
      triggerSlideAnimations(slide);
    } else {
      slide.classList.remove("active");
    }
  });

  [...thumbsEl.querySelectorAll("button")].forEach((thumb, i) => thumb.classList.toggle("active", i === activeIndex));

  countEl.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(deckData.slides.length).padStart(2, "0")}`;
  prevEl.disabled = activeIndex === 0;
  nextEl.disabled = activeIndex === deckData.slides.length - 1;
}

function renderDeck() {
  deckEl.innerHTML = deckData.slides.map(renderSlide).join("");
  thumbsEl.innerHTML = deckData.slides
    .map((slide, index) => `<li><button type="button" aria-label="第 ${index + 1} 页：${esc(slide.headline)}"></button></li>`)
    .join("");

  thumbsEl.querySelectorAll("button").forEach((button, index) => {
    button.addEventListener("click", () => setActive(index));
  });

  setActive(0);
}

prevEl.addEventListener("click", () => setActive(activeIndex - 1));
nextEl.addEventListener("click", () => setActive(activeIndex + 1));

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " ") setActive(activeIndex + 1);
  if (event.key === "ArrowLeft") setActive(activeIndex - 1);
});

// Recompute canvas scale on viewport changes
let _resizeT = null;
window.addEventListener("resize", () => {
  if (_resizeT) clearTimeout(_resizeT);
  _resizeT = setTimeout(recomputeDeckScale, 120);
});
window.addEventListener("load", recomputeDeckScale);

// touch swipe support
let touchStartX = null;
window.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
window.addEventListener("touchend", (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 60) {
    setActive(activeIndex + (dx < 0 ? 1 : -1));
  }
  touchStartX = null;
}, { passive: true });

if (window.DECK_DATA) {
  deckData = window.DECK_DATA;
  renderDeck();
} else {
  const cacheBust = `?v=${Date.now()}`;
  fetch(`./strategy_pages.json${cacheBust}`)
    .then((response) => response.json())
    .then((data) => {
      deckData = data;
      renderDeck();
    });
}
