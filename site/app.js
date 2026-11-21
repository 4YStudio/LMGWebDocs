/* ============================================================
   Carpet Sky Additions — 交互逻辑
   ============================================================ */

(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /* ── Toast ── */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1900);
  }

  /* ── 复制到剪贴板 ── */
  async function copyText(text) {
    const plain = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    try {
      await navigator.clipboard.writeText(plain);
      toast('已复制：' + plain);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plain;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('已复制：' + plain); }
      catch { toast('复制失败，请手动选择'); }
      ta.remove();
    }
  }

  /* ═══════════ 1. 安装步骤 ═══════════ */
  function renderInstall() {
    const single = $('#installSingle');
    const multi  = $('#installMulti');
    single.innerHTML = DATA.installSingle.map((s) => `<li>${s}</li>`).join('');
    multi.innerHTML  = DATA.installMulti.map((s) => `<li>${s}</li>`).join('');
  }

  /* ═══════════ 2. 世界生成 ═══════════ */
  function renderGeneration() {
    const wrap = $('#genList');
    wrap.innerHTML = DATA.generation.map((g) => {
      const img = g.img
        ? `<div class="gen-thumb" data-lightbox data-src="${g.img}" data-cap="${esc(g.alt || g.title)}">
             <img src="${g.img}" alt="${esc(g.alt || g.title)}" loading="lazy">
           </div>`
        : '';
      const flag = g.condText
        ? `<span class="gen-flag">${esc(g.condText)}</span>`
        : (g.cond ? `<span class="gen-flag">属性 <code style="background:none;border:0;padding:0;font-size:10.5px">${g.cond}</code></span>` : '');
      return `<article class="gen-item reveal ${g.img ? '' : 'no-img'}">
        ${img}
        <div class="gen-body">
          <h3>${esc(g.title)}</h3>
          <p>${g.desc}</p>
          ${flag}
        </div>
      </article>`;
    }).join('');
  }

  /* ═══════════ 3. 模组特性 ═══════════ */
  /* 卡片只留摘要，全部细节收进「详情」对话框 */
  const DETAIL = Object.create(null);
  let detailSeq = 0;

  function stripTags(html) {
    return String(html || '').replace(/<[^>]*>/g, '');
  }

  /* 从正文里取一句作为卡片摘要 */
  function briefOf(body, limit) {
    const list = Array.isArray(body) ? body : [body];
    for (const raw of list) {
      const txt = stripTags(raw).replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      const cut = txt.length > (limit || 96) ? txt.slice(0, limit || 96) + '…' : txt;
      return cut;
    }
    return '';
  }

  function detailLink(rec) {
    const key = 'd' + (++detailSeq);
    DETAIL[key] = rec;
    const n = (rec.use || []).length;
    return `<button class="detail-link" type="button" data-detail-key="${key}">
      <span class="detail-link-ico" aria-hidden="true">＋</span>
      <span>查看详情</span>
      ${n ? `<span class="detail-link-n">${n} 条用法</span>` : ''}
      <span class="detail-link-arrow" aria-hidden="true">→</span>
    </button>`;
  }

  function tableHtml(t) {
    if (!t) return '';
    return `<div class="table-wrap" style="margin-top:14px"><table class="data-table">
      <caption>${esc(t.caption)}</caption>
      <thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function stepsHtml(f) {
    if (!f.steps) return '';
    return `<div class="steps-media">${f.steps.map((st, si) =>
      `${si ? '<span class="arrow">➜</span>' : ''}
       <figure><img src="${st.img}" alt="${esc(st.cap)}" loading="lazy"
         data-lightbox data-src="${st.img}" data-cap="${esc(st.cap)}">
         <figcaption>${esc(st.cap)}</figcaption></figure>`).join('')}
      ${f.result ? `<span class="arrow">➜</span>
        <figure class="result"><img src="${f.result.img}" alt="${esc(f.result.cap)}" loading="lazy"
          data-lightbox data-src="${f.result.img}" data-cap="${esc(f.result.cap)}">
          <figcaption>${esc(f.result.cap)}</figcaption></figure>` : ''}
    </div>`;
  }

  function cmdLine(cmd, note) {
    return `<button class="cmd-line" data-copy="${esc(cmd)}" title="点击复制">
      <span>${cmd}</span><span class="copy-ico">⧉</span>
    </button>${note ? `<span class="cmd-note">${esc(note)}</span>` : ''}`;
  }

  function renderModFeatures() {
    const wrap = $('#modFeatures');
    const nodes = DATA.modFeatures.map((f, i) => {
      const provides = (f.provides || [])
        .map((p) => `<span class="chip">${esc(p)}</span>`).join('');

      const brief = briefOf(f.body, 104);
      const link = detailLink({
        kind: '模组特性',
        title: f.title,
        chips: f.provides || [],
        use: f.use || [],
        body: f.body || [],
        reasons: f.reasons || [],
        table: f.table || null,
        steps: f.steps || null,
        result: f.result || null,
        cmd: f.cmd || '',
        cmdNote: f.cmdNote || '',
        extraCmds: f.extraCmds || [],
        disabled: !!f.disabledByDefault,
        footTip: f.cmd ? '' : '这条特性由数据包提供，可用 <code>/carpetskyadditions</code> 查看当前状态',
      });

      const card = document.createElement('article');
      card.className = 'card reveal card-brief';
      card.dataset.feature = '';
      card.dataset.order = String(i);
      card.dataset.search = [f.title, ...(f.provides || []), f.cmd || '',
        ...(f.use || []), ...(f.body || [])].join(' ').toLowerCase();
      card.innerHTML = `
        <div class="card-top"><h3>${esc(f.title)}</h3></div>
        ${provides ? `<div class="provides">${provides}</div>` : ''}
        ${brief ? `<p class="card-brief-text">${brief}</p>` : ''}
        ${link}`;
      return card;
    });

    wrap.innerHTML = '';
    layoutMasonry(wrap, nodes);
    observeReveals(wrap);

    /* 地毯特性 */
    $('#carpetFeatures').innerHTML = DATA.carpetFeatures.map((c) => `
      <article class="card reveal">
        <div class="card-top">
          <h3><a href="${c.link}" target="_blank" rel="noopener" style="color:inherit">${esc(c.title)} ↗</a></h3>
        </div>
        <div class="provides">${(c.provides || []).map((p) => `<span class="chip alt">${esc(p)}</span>`).join('')}</div>
        <div class="card-body"><p>${c.body}</p></div>
      </article>`).join('');
  }

  /* ═══════════ 4. 数据包特性 ═══════════ */
  function renderDatapack() {
    const wrap = $('#datapackFeatures');
    const nodes = DATA.datapackFeatures.map((f, i) => {
      const provides = (f.provides || [])
        .map((p) => `<span class="chip alt">${esc(p)}</span>`).join('');

      const brief = briefOf(f.body, 104);
      const link = detailLink({
        kind: '数据包特性',
        title: f.title,
        chips: f.provides || [],
        use: f.use || [],
        body: [f.body || ''],
        img: f.img || '',
        imgAlt: f.imgAlt || f.title,
        remove: f.remove || '',
        footTip: f.remove
          ? '想还原原版行为？在数据包里删除上面那个文件即可'
          : '这条特性没有对应的数据包文件，只能整体停用数据包',
      });

      const card = document.createElement('article');
      card.className = 'card reveal card-brief';
      card.dataset.feature = '';
      card.dataset.order = String(i);
      card.dataset.search = [f.title, ...(f.provides || []), f.remove || '', f.body,
        ...(f.use || [])].join(' ').toLowerCase();
      card.innerHTML = `
        <div class="card-top"><h3>${esc(f.title)}</h3></div>
        ${provides ? `<div class="provides">${provides}</div>` : ''}
        ${brief ? `<p class="card-brief-text">${brief}</p>` : ''}
        ${link}`;
      return card;
    });

    wrap.innerHTML = '';
    layoutMasonry(wrap, nodes);
    observeReveals(wrap);
  }

  /* ═══════════ 5. 命令 ═══════════ */
  function renderCommands() {
    $('#cmdList').innerHTML = DATA.commands.map((c) => `
      <article class="cmd-card reveal">
        <button class="cmd-usage" data-copy="${esc(c.usage)}" title="点击复制">
          <span>${esc(c.usage)}</span><span class="copy-ico">⧉</span>
        </button>
        <div class="cmd-text">
          <p>${c.zh}</p>
          <p class="en">${c.en}</p>
        </div>
        ${c.notes.length ? `<ul class="cmd-notes">${c.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        ${c.notesEn && c.notesEn.length ? `<p class="cmd-notes-en">${c.notesEn.map((n) => esc(n)).join(' ')}</p>` : ''}
      </article>`).join('');
  }

  /* ═══════════ 6. 流程时间线 ═══════════ */
  function renderProgression() {
    const rail = $('#timeline');
    const fill = $('#timelineFill');
    const items = DATA.progression.map((p) => {
      const bullets = p.bullets
        ? `<ul>${p.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : '';
      return `<article class="tl-item">
        <span class="tl-dot">${p.step}</span>
        <div class="tl-content">
          <h3>${esc(p.title)}</h3>
          <p>${p.body}</p>
          ${bullets}
        </div>
      </article>`;
    }).join('');
    rail.insertAdjacentHTML('beforeend', items);

    // 时间线填充进度
    const itemsEls = $$('.tl-item', rail);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('is-in');
      });
    }, { rootMargin: '-12% 0px -18% 0px', threshold: 0.15 });
    itemsEls.forEach((el) => io.observe(el));

    function updateFill() {
      const rect = rail.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height;
      const passed = Math.min(Math.max(vh * 0.55 - rect.top, 0), total);
      fill.style.height = (total > 0 ? (passed / total) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', updateFill, { passive: true });
    window.addEventListener('resize', updateFill);
    updateFill();
  }

  /* ═══════════ 7. 图集 ═══════════ */
  function renderGallery() {
    $('#galleryGrid').innerHTML = DATA.gallery.map((g) => `
      <figure class="gal-item" data-lightbox data-src="${g.src}" data-cap="${esc(g.cap)}">
        <div class="gal-media"><img src="${g.src}" alt="${esc(g.cap)}" loading="lazy"></div>
        <span class="gal-tag">${esc(g.tag)}</span>
        <figcaption>${esc(g.cap)}</figcaption>
      </figure>`).join('');
  }

  /* ═══════════ 瀑布流布局 ═══════════ */
  /* 先按容器宽度算列数，再逐个把卡片放进当前最矮的一列 */
  const MASONRY = new WeakMap();

  function masonryCols(el) {
    const w = el.clientWidth || 0;
    if (!w) return 0;          // 尚未布局，稍后重试
    let n;
    if (w < 560) n = 1;
    else if (w < 860) n = 2;
    else if (w < 1040) n = 3;
    else n = 4;
    const cap = Number(el.dataset.maxCols) || 0;
    return cap ? Math.min(n, cap) : n;
  }

  function layoutMasonry(el, items, opts) {
    const o = opts || {};
    const forceCols = o.cols || 0;
    const n = Math.max(1, forceCols || masonryCols(el));
    el.dataset.masonry = '1';

    // 容器还没渲染出宽度（初始 innerHTML 刚插入）→ 稍后重试
    if (!forceCols && !masonryCols(el)) {
      if (!el.dataset.masonryPending) {
        el.dataset.masonryPending = '1';
        setTimeout(() => {
          delete el.dataset.masonryPending;
          relayoutMasonry(el);
        }, 60);
      }
      return;
    }

    if (!MASONRY.has(el)) MASONRY.set(el, {});
    const st = MASONRY.get(el);
    // 容器被 innerHTML 清空过 → 之前的列已脱离文档，必须重建
    if (st.colsEls && (!st.colsEls.length || st.colsEls[0].el.parentElement !== el)) st.cols = 0;
    if (st.cols !== n && st.colsEls) st.colsEls.forEach((c) => { c.h = 0; });

    if (st.cols !== n) {
      st.cols = n;
      el.innerHTML = '';
      st.colsEls = [];
      for (let i = 0; i < n; i++) {
        const col = document.createElement('div');
        col.className = 'masonry-col';
        el.appendChild(col);
        st.colsEls.push({ el: col, h: 0 });
      }
      st.nodeOf = new WeakMap();
    }

    // 两轮：先把所有卡片临时放进第一列，一次性量出真实高度（同列宽，高度准确），
    // 再按「当前最矮的列」逐个分配，保证列高尽量一致。
    const pending = [];
    items.forEach((node) => {
      const owner = st.nodeOf.get(node);
      if (owner && owner.isConnected) return; // 已在某列且列未被重建
      pending.push(node);
    });

    if (pending.length) {
      const measureCol = st.colsEls[0].el;
      pending.forEach((n) => measureCol.appendChild(n));
      const heights = pending.map((n) => (n.offsetHeight || n.scrollHeight || 260) + 16);

      // 重新从零分配
      st.colsEls.forEach((c) => { c.h = 0; });
      pending.forEach((node, i) => {
        let best = st.colsEls[0];
        for (const c of st.colsEls) if (c.h < best.h) best = c;
        if (node.parentElement !== best.el) best.el.appendChild(node);
        st.nodeOf.set(node, best.el);
        if (node.classList.contains('is-hidden')) return; // 搜索过滤掉的卡不占高度
        best.h += heights[i];
      });
    }
  }

  /* 重新排列（筛选/搜索后或窗口尺寸变化时） */
  function relayoutMasonry(el) {
    const st = MASONRY.get(el);
    if (!st) return;
    const items = Array.from(el.querySelectorAll('[data-order]'));
    // 保留原始顺序
    items.sort((a, b) => (Number(a.dataset.order) || 0) - (Number(b.dataset.order) || 0));
    st.cols = 0;            // 强制重建列
    layoutMasonry(el, items);
  }

  /* 视口/容器宽度变化时重排（列数或列宽变了都要重排，因为卡片高度会跟着变） */
  function setupMasonryResize() {
    const grids = [$('#modFeatures'), $('#datapackFeatures'), $('#recipeGrid')].filter(Boolean);
    if (!grids.length) return;

    grids.forEach((g) => {
      let timer = 0;
      let lastW = 0;
      const check = () => {
        const w = g.clientWidth || 0;
        if (!w || w === lastW) return;
        lastW = w;
        relayoutMasonry(g);
      };
      const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(check, 80);
      };
      if (typeof ResizeObserver === 'function') {
        new ResizeObserver(schedule).observe(g);
      }
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('orientationchange', schedule, { passive: true });
    });
  }

  /* ═══════════ 8. 配方速查 ═══════════ */
  const RECIPE_GROUPS = ['全部', '矿石', '马铠', '锻造模板', '其他'];

  /* ── 物品图标（assets/items/，缺图时自动退回文字） ── */
  const ICONS = (DATA.itemIcons || {});
  const ICON_DIR = 'assets/items/';

  function iconHtml(name, cls) {
    const file = ICONS[name];
    if (!file) return '';
    return `<img class="ico${cls ? ' ' + cls : ''}" src="${ICON_DIR}${esc(file)}" alt="" decoding="async" data-ico="${esc(name)}">`;
  }

  /* 图片加载成功后隐藏文字，加载失败则保留文字（不会出现破图）
     —— 用事件 + 轮询双保险：后台标签页/懒加载时 load 事件可能被节流 */
  function bindIcons(root) {
    const imgs = $$('img.ico', root).filter((img) => !img.dataset.bound);
    if (!imgs.length) return;
    const settle = (img, ok) => {
      img.dataset.bound = '2';
      if (ok) {
        img.classList.remove('is-missing');
        img.closest('.slot, .craft-out')?.classList.add('has-ico');
      } else {
        img.classList.add('is-missing');
        img.closest('.slot, .craft-out')?.classList.remove('has-ico');
      }
    };
    imgs.forEach((img) => {
      img.dataset.bound = '1';
      img.addEventListener('load', () => settle(img, true), { once: true });
      img.addEventListener('error', () => settle(img, false), { once: true });
    });

    let tries = 0;
    const poll = () => {
      let pending = 0;
      imgs.forEach((img) => {
        if (img.dataset.bound === '2') return;
        if (img.naturalWidth > 0) settle(img, true);
        else if (img.complete && !img.naturalWidth) settle(img, false);
        else pending++;
      });
      if (pending && ++tries < 40) setTimeout(poll, 250);
    };
    poll();
  }

  /* 格子：图标 + 物品名（供悬浮提示用），不再显示符号/图例 */
  function slotHtml(name, extra) {
    const label = name || '';
    return `<span class="slot${extra ? ' ' + extra : ''}" data-item="${esc(label)}">${
      iconHtml(label)}<b>${esc(label)}</b></span>`;
  }

  function craftGrid(r) {
    const key = r.key || {};
    const cells = r.grid.map((row) => row.map((sym) => {
      if (!sym) return '<span class="slot is-empty"></span>';
      return slotHtml(key[sym] || sym);
    }).join('')).join('');
    return `<div class="craft">
      <div class="craft-grid">${cells}</div>
      <div class="craft-arrow" aria-hidden="true">→</div>
      <div class="craft-out">${slotHtml(r.result, 'is-out')}${
        r.count > 1 ? `<span class="craft-count">×${r.count}</span>` : ''}</div>
    </div>`;
  }

  /* 熔炉类：输入 → 炉子 → 输出 */
  function blastingHtml(r) {
    return `<div class="craft craft-smelt">
      <div class="smelt-in">${slotHtml(r.ingredient, 'is-out')}</div>
      <div class="smelt-mid">
        <span class="smelt-flame" aria-hidden="true"></span>
        ${iconHtml('高炉', 'ico-furnace')}
      </div>
      <div class="craft-arrow" aria-hidden="true">→</div>
      <div class="craft-out">${slotHtml(r.result, 'is-out')}${
        r.count > 1 ? `<span class="craft-count">×${r.count}</span>` : ''}</div>
    </div>`;
  }

  /* 无序合成：材料散落在 3×3 网格里，空位画虚线表示「放哪都行」 */
  function shapelessHtml(r) {
    const items = (r.ingredients || []).slice(0, 9);
    // 由中心向四角、再向四边散开，两个材料时呈现对角，视觉上不像固定配方
    const spread = [4, 0, 8, 2, 6, 1, 7, 3, 5];
    const cells = new Array(9).fill('<span class="slot is-empty is-free"></span>');
    items.forEach((name, i) => {
      cells[spread[i]] = slotHtml(name);
    });
    return `<div class="craft">
      <div class="shapeless-wrap">
        <div class="craft-grid is-shapeless">${cells.join('')}</div>
        <span class="shapeless-tag">⇄ 位置随意</span>
      </div>
      <div class="craft-arrow" aria-hidden="true">→</div>
      <div class="craft-out">${slotHtml(r.result, 'is-out')}${
        r.count > 1 ? `<span class="craft-count">×${r.count}</span>` : ''}</div>
    </div>`;
  }

  function otherRecipe(r) {
    if (r.type === 'blasting') return blastingHtml(r);
    if (r.type === 'crafting_shapeless') return shapelessHtml(r);
    const items = (r.ingredients || []).map((i) => slotHtml(i, 'is-out'))
      .join('<span class="plus">+</span>');
    return `<div class="craft">
      <div class="craft-out">${items}</div>
      <div class="craft-arrow" aria-hidden="true">→</div>
      <div class="craft-out">${slotHtml(r.result, 'is-out')}${
        r.count > 1 ? `<span class="craft-count">×${r.count}</span>` : ''}</div>
    </div>`;
  }

  /* 配方的工艺说明（替代原来的图例行） */
  function recipeMeta(r) {
    if (r.type === 'blasting') {
      return `高炉烧炼 · ${r.time} 刻 · 经验 ${r.exp}`;
    }
    if (r.type === 'crafting_shapeless') return '无序合成 · 材料位置不限';
    return '';
  }

  let recipeFilter = '全部';

  function renderRecipes() {
    const box = $('#recipeGrid');
    const count = $('#recipeCount');
    const rows = DATA.recipes.filter((r) => recipeFilter === '全部' || r.group === recipeFilter);

    const nodes = rows.map((r, i) => {
      const mats = r.type === 'crafting_shaped'
        ? [...new Set(Object.values(r.key || {}))].join(' · ')
        : (r.type === 'blasting' ? r.ingredient : (r.ingredients || []).join(' + '));
      const card = document.createElement('article');
      card.className = 'recipe-card reveal';
      card.dataset.recipe = '';
      card.dataset.order = String(i);
      card.innerHTML = `
        <header class="recipe-head">
          <h3>${esc(r.result)}${r.count > 1 ? `<span class="recipe-x">×${r.count}</span>` : ''}</h3>
          <span class="badge">${esc(r.group)}</span>
        </header>
        <p class="recipe-mats">${esc(mats)}</p>
        ${recipeMeta(r) ? `<p class="recipe-meta">${esc(recipeMeta(r))}</p>` : ''}
        ${r.type === 'crafting_shaped' ? craftGrid(r) : otherRecipe(r)}
        <button class="file-path" data-copy="${esc(r.file)}" title="点击复制数据包内路径">
          <span>${esc(r.file)}</span><span class="copy-ico">⧉</span>
        </button>`;
      return card;
    });

    box.dataset.maxCols = '3';
    box.innerHTML = '';
    layoutMasonry(box, nodes);
    count.textContent = `${rows.length} / ${DATA.recipes.length} 条配方`;
    bindIcons(box);
    observeReveals(box);
  }

  function setupRecipeFilters() {
    const row = $('#recipeFilters');
    row.innerHTML = RECIPE_GROUPS.map((g, i) =>
      `<button class="filter-chip${i === 0 ? ' is-on' : ''}" data-filter="${esc(g)}" type="button">${esc(g)}</button>`
    ).join('');
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      recipeFilter = btn.dataset.filter;
      $$('[data-filter]', row).forEach((b) => b.classList.toggle('is-on', b === btn));
      renderRecipes();
      relayoutMasonry($('#recipeGrid'));
    });
  }

  /* ═══════════ 9. 进度与挑战 ═══════════ */
  const FRAME_LABEL = { task: '普通进度', goal: '目标', challenge: '挑战' };
  let advFilter = '全部';

  function buildAdvTree() {
    const byId = new Map(DATA.advancements.map((a) => [a.id, a]));
    const children = new Map();
    DATA.advancements.forEach((a) => {
      const p = a.parent || '__root__';
      if (!children.has(p)) children.set(p, []);
      children.get(p).push(a);
    });
    return { byId, children };
  }

  function advMatches(a, q) {
    if (!q) return true;
    return [a.title, a.en, a.desc, a.detail, a.iconName, a.reward || '', a.id]
      .join(' ').toLowerCase().includes(q);
  }

  function advNodeHtml(a, kids, depth, matched, visible, q) {
    const list = kids.get(a.id) || [];
    const shownKids = list.filter((k) => visible.has(k.id));
    const hit = matched.has(a.id);
    const pad = Math.min(depth, 6) * 16;
    const reward = a.reward
      ? `<span class="adv-reward">奖励 · ${esc(a.reward)}</span>` : '';
    const desc = a.desc ? `<p class="adv-desc">${esc(a.desc)}</p>`
      : `<p class="adv-desc is-missing">原文未提供描述。</p>`;
    const detail = a.detail
      ? `<p class="adv-detail">${esc(a.detail)}</p>` : '';
    const en = a.en ? `<span class="adv-en">${esc(a.en)}</span>` : '';
    const childHtml = shownKids.length
      ? `<ul class="adv-children">${shownKids.map((k) => advNodeHtml(k, kids, depth + 1, matched, visible, q)).join('')}</ul>`
      : '';
    // 没有子节点但有奖励/细则的条目（例如挑战）也能展开
    const canToggle = shownKids.length > 0 || !!a.detail || !!a.reward;
    // 挑战默认展开，让「完成条件 + 奖励」一眼可见
    const isOpen = canToggle && (q ? hit : (shownKids.length > 0 && depth <= 1) || a.frame === 'challenge');

    return `<li class="adv-node frame-${esc(a.frame)}${isOpen ? ' is-open' : ''}" data-adv="${esc(a.id)}" style="--pad:${pad}px">
      <button class="adv-head" type="button" aria-expanded="${isOpen}">
        <span class="adv-caret${canToggle ? '' : ' is-leaf'}" aria-hidden="true"></span>
        <span class="adv-frame"></span>
        <span class="adv-text">
          <span class="adv-title">${esc(a.title)}</span>
          ${en}
        </span>
        <span class="adv-icon" title="${esc(a.iconName)}">${esc(a.iconName)}</span>
      </button>
      <div class="adv-body">${desc}${detail}${reward ? `<div class="adv-meta">${reward}</div>` : ''}</div>
      ${childHtml}
    </li>`;
  }

  function renderAdvancements() {
    const q = ($('#advSearch').value || '').trim().toLowerCase();
    const { byId, children } = buildAdvTree();
    const pool = DATA.advancements.filter((a) =>
      advFilter === '全部' ||
      (advFilter === '进度' ? a.id.startsWith('progression/') : a.id.startsWith('challenges/')));

    const matched = new Set();
    pool.forEach((a) => { if (advMatches(a, q)) matched.add(a.id); });

    // 搜索时保留命中项及其祖先
    const visible = new Set(matched);
    if (q) {
      matched.forEach((id) => {
        let cur = byId.get(id);
        while (cur && cur.parent) {
          visible.add(cur.parent);
          cur = byId.get(cur.parent);
        }
      });
    }

    const roots = pool.filter((a) => !a.parent || !pool.some((p) => p.id === a.parent));
    const tree = $('#advTree');
    tree.innerHTML = roots
      .filter((r) => visible.has(r.id))
      .map((r) => `<ul class="adv-roots">${advNodeHtml(r, children, 0, matched, visible, q)}</ul>`)
      .join('');

    const total = pool.length;
    const shown = q ? visible.size : total;
    $('#advCount').textContent = q ? `${shown} / ${total} 个进度` : `${total} 个进度`;
    $('#advEmpty').hidden = !(q && matched.size === 0);
    observeReveals(tree);
  }

  function setupAdvFilters() {
    const row = $('#advFilters');
    const groups = ['全部', '进度', '挑战'];
    row.innerHTML = groups.map((g, i) =>
      `<button class="filter-chip${i === 0 ? ' is-on' : ''}" data-adv-filter="${g}" type="button">${g}</button>`
    ).join('');
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-adv-filter]');
      if (!btn) return;
      advFilter = btn.dataset.advFilter;
      $$('[data-adv-filter]', row).forEach((b) => b.classList.toggle('is-on', b === btn));
      renderAdvancements();
    });

    const input = $('#advSearch');
    let t;
    input.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(renderAdvancements, 120);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; renderAdvancements(); input.blur(); }
    });

    // 展开 / 收起
    $('#advTree').addEventListener('click', (e) => {
      const head = e.target.closest('.adv-head');
      if (!head) return;
      const li = head.closest('.adv-node');
      if (!li.querySelector('.adv-children') &&
          !li.querySelector('.adv-detail') &&
          !li.querySelector('.adv-reward')) return;
      const open = li.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(open));
    });

    const toggle = $('#advToggleAll');
    toggle.addEventListener('click', () => {
      const allOpen = toggle.dataset.state === 'open';
      $$('.adv-node', $('#advTree')).forEach((li) => {
        if (!li.querySelector('.adv-children') &&
            !li.querySelector('.adv-detail') &&
            !li.querySelector('.adv-reward')) return;
        li.classList.toggle('is-open', !allOpen);
        li.querySelector('.adv-head').setAttribute('aria-expanded', String(!allOpen));
      });
      toggle.dataset.state = allOpen ? 'closed' : 'open';
      toggle.textContent = allOpen ? '展开全部' : '收起全部';
    });
  }

  /* ═══════════ 10. 规则设置 ═══════════ */
  const SETTING_CATS = ['全部', '世界生成', '玩法特性', '流浪商人', '命令'];
  let settingFilter = '全部';

  function plainDefault(v) {
    return String(v).replace(/^"|"$/g, '');
  }

  function renderConfig() {
    $('#configBody').innerHTML = DATA.config.map((c) => {
      const def = c.type === 'boolean'
        ? (c.default ? '<code>true</code>' : '<code>false</code>')
        : `<code>${esc(c.default)}</code>`;
      const opt = c.options
        ? `<div class="key-row">${c.options.map((o) => `<span class="key-item"><i>·</i>${esc(o)}</span>`).join('')}</div>` : '';
      return `<tr>
        <td data-label="键名"><code>${esc(c.key)}</code></td>
        <td data-label="默认">${def}</td>
        <td data-label="说明"><b>${esc(c.label)}</b><br>${c.desc}${opt}</td>
      </tr>`;
    }).join('');
  }

  function renderSettings() {
    const q = ($('#settingSearch').value || '').trim().toLowerCase();
    const rows = DATA.settings.filter((s) => {
      if (settingFilter !== '全部' && s.catLabel !== settingFilter) return false;
      if (!q) return true;
      return [s.name, s.desc, s.catLabel, ...(s.extra || [])].join(' ').toLowerCase().includes(q);
    });

    const box = $('#settingsList');
    box.innerHTML = rows.map((s) => {
      const opts = s.options || (s.type === 'boolean' ? ['true', 'false'] : null);
      const chips = opts
        ? opts.map((o) => `<button class="opt-chip" type="button" data-copy="/carpetskyadditions ${esc(s.name)} ${esc(o)}"
             title="复制：/carpetskyadditions ${esc(s.name)} ${esc(o)}">${esc(o)}</button>`).join('')
        : '';
      const extras = (s.extra || []).map((x) => `<p class="setting-extra">${esc(x)}</p>`).join('');
      const sky = s.sky !== null && s.sky !== undefined
        ? `<span class="tag-sky">默认开启${s.sky === 'true' ? '' : ' · ' + esc(s.sky)}</span>` : '';
      return `<article class="setting-row">
        <div class="setting-main">
          <div class="setting-name">
            <button class="rule-name" type="button" data-copy="/carpetskyadditions ${esc(s.name)}"
              title="复制：/carpetskyadditions ${esc(s.name)}">${esc(s.name)}<span class="copy-ico">⧉</span></button>
            ${sky}
            <span class="badge">${esc(s.catLabel)}</span>
          </div>
          <p class="setting-desc">${esc(s.desc)}</p>
          ${extras}
        </div>
        <div class="setting-side">
          <span class="setting-default">默认 <b>${esc(plainDefault(s.default))}</b></span>
          ${chips ? `<div class="opt-row">${chips}</div>` : ''}
        </div>
      </article>`;
    }).join('');

    $('#settingCount').textContent = `${rows.length} / ${DATA.settings.length} 条规则`;
    $('#settingEmpty').hidden = rows.length > 0;
  }

  function setupSettingFilters() {
    const row = $('#settingFilters');
    row.innerHTML = SETTING_CATS.map((g, i) =>
      `<button class="filter-chip${i === 0 ? ' is-on' : ''}" data-set-filter="${g}" type="button">${g}</button>`
    ).join('');
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-set-filter]');
      if (!btn) return;
      settingFilter = btn.dataset.setFilter;
      $$('[data-set-filter]', row).forEach((b) => b.classList.toggle('is-on', b === btn));
      renderSettings();
    });

    const input = $('#settingSearch');
    input.addEventListener('input', renderSettings);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; renderSettings(); input.blur(); }
    });
  }

  /* ═══════════ 11. Hero 统计 ═══════════ */
  function renderStats() {
    const stats = [
      { n: DATA.modFeatures.length, l: '模组特性' },
      { n: DATA.datapackFeatures.length, l: '数据包特性' },
      { n: DATA.recipes.length, l: '数据包配方' },
      { n: DATA.advancements.length, l: '进度与挑战' },
      { n: DATA.settings.length, l: '规则设置' },
      { n: DATA.commands.length, l: '命令' }
    ];
    $('#heroStats').innerHTML = stats.map((s) => `
      <div class="stat"><b data-count="${s.n}">0</b><span>${s.l}</span></div>`).join('');
  }

  function animateCounters() {
    $$('.stat b[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const dur = 1100;
      const start = performance.now();
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        el.textContent = target;
      };
      // 后台标签页 requestAnimationFrame 会被冻结，超时兜底保证数字最终正确
      setTimeout(settle, dur + 400);
      function tick(now) {
        if (settled) return;
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
        else settle();
      }
      requestAnimationFrame(tick);
    });
  }

  /* ═══════════ 12. 滚动揭示 ═══════════ */
  let revealIO = null;

  function observeReveals(root = document) {
    if (!revealIO) return;
    const els = root === document ? $$('.reveal') : $$('.reveal', root);
    els.forEach((el) => {
      if (el.classList.contains('is-in') || el.dataset.revealed) return;
      el.dataset.revealed = '1';
      revealIO.observe(el);
    });
  }

  function setupReveal() {
    const els = $$('.reveal');
    // 错峰延迟：同一父级内的元素依次入场
    const groups = new Map();
    els.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, 0);
      const idx = groups.get(parent);
      el.style.setProperty('--d', Math.min(idx * 65, 320) + 'ms');
      groups.set(parent, idx + 1);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    revealIO = io;

    els.forEach((el) => io.observe(el));
  }

  /* ═══════════ 13. 导航高亮 + 滑块 ═══════════ */
  function setupNav() {
    const links = $$('.nav-link');
    const pill  = $('#navPill');
    const sections = links
      .map((l) => ({ link: l, el: document.querySelector(l.getAttribute('href')) }))
      .filter((s) => s.el);

    function movePill(link) {
      if (!link) { pill.style.opacity = '0'; return; }
      const navRect = $('.nav').getBoundingClientRect();
      const r = link.getBoundingClientRect();
      pill.style.opacity = '1';
      pill.style.height = r.height + 'px';
      pill.style.transform = `translateY(${r.top - navRect.top}px)`;
    }

    function setActive(link) {
      if (!link) return;
      links.forEach((l) => l.classList.toggle('is-active', l === link));
      movePill(link);
    }

    setActive(links[0]);

    // 滚动位置直接判定：取最后一个 top 已越过视口上沿 30% 的 section
    let ticking = false;
    function syncActive() {
      const line = window.innerHeight * 0.3;
      let current = sections[0];
      sections.forEach((s) => {
        if (s.el.getBoundingClientRect().top <= line) current = s;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1];
      }
      if (current) setActive(current.link);
    }
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { syncActive(); ticking = false; });
    }, { passive: true });
    syncActive();

    links.forEach((l) => {
      l.addEventListener('click', () => {
        setActive(l);
        closeSidebar();
      });
      l.addEventListener('mouseenter', () => {
        if (!l.classList.contains('is-active')) movePill(l);
      });
    });
    $('.nav').addEventListener('mouseleave', () => {
      const active = $('.nav-link.is-active');
      if (active) movePill(active);
    });

    window.addEventListener('resize', () => {
      const active = $('.nav-link.is-active');
      if (active) movePill(active);
    });
  }

  /* ═══════════ 14. 移动端侧栏 ═══════════ */
  const sidebar = $('#sidebar');
  const scrim = $('#scrim');
  const navToggle = $('#navToggle');

  function openSidebar() {
    sidebar.classList.add('is-open');
    scrim.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('is-open');
    scrim.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  navToggle.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });
  scrim.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSidebar(); closeLightbox(); closeUseModal(); }
  });

  /* ═══════════ 15. 滚动进度 + 回到顶部 ═══════════ */
  function setupScroll() {
    const bar = $('#scrollProgress');
    const toTop = $('#toTop');
    let ticking = false;

    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = pct + '%';
      toTop.classList.toggle('is-visible', window.scrollY > 620);
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });

    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ═══════════ 16. 灯箱 ═══════════ */
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxCap = $('#lightboxCap');

  function openLightbox(src, cap) {
    lightboxImg.src = src;
    lightboxImg.alt = cap || '';
    lightboxCap.textContent = cap || '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    if (!sidebar.classList.contains('is-open') && !useModal.classList.contains('is-open')) {
      document.body.style.overflow = '';
    }
  }
  $('#lightboxClose').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  /* ═══════════ 16.5 特性详情对话框 ═══════════ */
  const useModal = $('#useModal');
  const useModalBody = $('#useModalBody');
  const useModalTitle = $('#useModalTitle');
  const useModalKicker = $('#useModalKicker');
  const useModalChips = $('#useModalChips');
  const useModalFoot = $('#useModalFoot');
  let useLastFocus = null;

  function detailBodyHtml(rec) {
    const parts = [];

    if (rec.disabled) {
      parts.push('<p class="detail-warn">默认禁用 —— 需要手动开启后才会生效。</p>');
    }

    if (rec.use && rec.use.length) {
      parts.push(`<section class="detail-sec">
        <h4>能做什么 / 怎么用</h4>
        <ul class="use-list">${rec.use.map((u, i) =>
          `<li><span class="use-no">${String(i + 1).padStart(2, '0')}</span><p>${u}</p></li>`).join('')}</ul>
      </section>`);
    }

    if (rec.body && rec.body.length) {
      parts.push(`<section class="detail-sec">
        <h4>${rec.use && rec.use.length ? '原文细节' : '说明'}</h4>
        <div class="detail-prose">${rec.body.map((p) => `<p>${p}</p>`).join('')}</div>
      </section>`);
    }

    if (rec.img) {
      parts.push(`<section class="detail-sec">
        <figure class="detail-figure">
          <img src="${rec.img}" alt="${esc(rec.imgAlt || '')}" loading="lazy"
            data-lightbox data-src="${rec.img}" data-cap="${esc(rec.imgAlt || '')}">
          <figcaption>${esc(rec.imgAlt || '')}</figcaption>
        </figure>
      </section>`);
    }

    if (rec.steps) {
      parts.push(`<section class="detail-sec">
        <h4>合成过程</h4>
        ${stepsHtml({ steps: rec.steps, result: rec.result })}
      </section>`);
    }

    if (rec.table) {
      parts.push(`<section class="detail-sec">${tableHtml(rec.table)}</section>`);
    }

    if (rec.reasons && rec.reasons.length) {
      parts.push(`<section class="detail-sec">
        <h4>为什么这样设计</h4>
        <ul class="detail-reasons">${rec.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      </section>`);
    }

    if (rec.cmd || rec.remove) {
      const lines = [];
      if (rec.cmd) lines.push(cmdLine(rec.cmd, rec.cmdNote));
      (rec.extraCmds || []).forEach((c) => lines.push(cmdLine(c)));
      if (rec.remove) {
        lines.push(`<span class="detail-cmd-label">删除以移除</span>` +
          `<button class="cmd-line" data-copy="${esc(rec.remove)}" title="点击复制">
             <span>${esc(rec.remove)}</span><span class="copy-ico">⧉</span></button>`);
      }
      parts.push(`<section class="detail-sec detail-sec-cmd">
        <h4>指令</h4><div class="detail-cmds">${lines.join('')}</div>
      </section>`);
    }

    return parts.join('');
  }

  function openUseModal(key) {
    const rec = DETAIL[key];
    if (!rec || !useModal) return;
    useLastFocus = document.activeElement;

    useModalKicker.textContent = rec.kind;
    useModalTitle.textContent = rec.title;
    useModalChips.innerHTML = (rec.chips || []).length
      ? rec.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')
      : '';
    useModalBody.innerHTML = detailBodyHtml(rec);
    useModalBody.scrollTop = 0;

    if (rec.footTip) {
      useModalFoot.innerHTML = rec.footTip;
      useModalFoot.hidden = false;
    } else {
      useModalFoot.hidden = true;
    }

    useModal.classList.add('is-open');
    useModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const btn = useModal.querySelector('#useModalClose');
    if (btn) btn.focus({ preventScroll: true });
  }

  function closeUseModal() {
    if (!useModal || !useModal.classList.contains('is-open')) return;
    useModal.classList.remove('is-open');
    // 先移走对话框内的焦点，再设 aria-hidden，避免「焦点被隐藏」的无障碍告警
    const active = document.activeElement;
    if (active && useModal.contains(active)) active.blur();
    useModal.setAttribute('aria-hidden', 'true');
    const back = useLastFocus;
    useLastFocus = null;
    if (back && back.focus && back !== document.body && document.contains(back)) {
      back.focus({ preventScroll: true });
    }
    if (!sidebar.classList.contains('is-open') && !lightbox.classList.contains('is-open')) {
      document.body.style.overflow = '';
    }
  }

  if (useModal) {
    useModal.addEventListener('click', (e) => {
      if (e.target.closest('[data-modal-close]') || e.target.closest('#useModalClose')) {
        closeUseModal();
      }
    });
  }

  /* ═══════════ 16.6 配方物品悬浮提示（仿 MC tooltip） ═══════════ */
  function setupItemTips() {
    const tip = $('#itemTip');
    if (!tip) return;
    let current = null;
    let hideTimer = 0;

    function show(slot) {
      const name = slot.dataset.item;
      if (!name) return;
      const ico = slot.querySelector('img.ico');
      const src = ico && ico.naturalWidth > 0 ? ico.src : '';
      tip.innerHTML = `
        ${src ? `<div class="tip-art"><img src="${src}" alt=""></div>` : ''}
        <div class="tip-text"><strong>${esc(name)}</strong></div>`;
      tip.classList.add('is-visible');
      current = slot;
      place(slot);
    }

    function place(slot) {
      const r = slot.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      let x = r.left + r.width / 2 - tw / 2;
      let y = r.top - th - 10;
      if (y < 8) y = r.bottom + 10;
      x = Math.max(8, Math.min(x, window.innerWidth - tw - 8));
      tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }

    function hide() {
      tip.classList.remove('is-visible');
      current = null;
    }

    document.addEventListener('mouseover', (e) => {
      const slot = e.target.closest('.recipe-card [data-item]');
      if (!slot || slot === current) return;
      clearTimeout(hideTimer);
      show(slot);
    });
    document.addEventListener('mouseout', (e) => {
      const slot = e.target.closest('.recipe-card [data-item]');
      if (!slot) return;
      const to = e.relatedTarget && e.relatedTarget.closest
        ? e.relatedTarget.closest('.recipe-card [data-item]') : null;
      if (to === slot) return;
      hideTimer = setTimeout(hide, 60);
    });
    window.addEventListener('scroll', () => { if (current) hide(); }, { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  }

  /* ═══════════ 17. 特性搜索 ═══════════ */
  function setupSearch() {
    const input = $('#featureSearch');
    const count = $('#searchCount');
    const empty = $('#emptyState');

    function run() {
      const q = input.value.trim().toLowerCase();
      const cards = $$('#features [data-feature]');
      let shown = 0;
      cards.forEach((card) => {
        const hit = !q || card.dataset.search.includes(q);
        card.classList.toggle('is-hidden', !hit);
        if (hit) shown++;
      });
      count.textContent = q ? `${shown} / ${cards.length}` : '';
      empty.hidden = !(q && shown === 0);
      if (q) relayoutMasonry($('#modFeatures'));
    }
    input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; run(); input.blur(); }
    });
  }

  /* ═══════════ 18. 全局点击委托（复制 / 灯箱） ═══════════ */
  function setupDelegates() {
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.dataset.copy);
        return;
      }
      const detailBtn = e.target.closest('[data-detail-key]');
      if (detailBtn) {
        openUseModal(detailBtn.dataset.detailKey);
        return;
      }
      const lb = e.target.closest('[data-lightbox]');
      if (lb) {
        openLightbox(lb.dataset.src, lb.dataset.cap);
      }
    });
  }

  /* ═══════════ 19. 平滑锚点（带偏移） ═══════════ */
  function setupAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top, behavior: 'smooth' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* ═══════════ 初始化 ═══════════ */
  function init() {
    renderInstall();
    renderGeneration();
    renderModFeatures();
    renderDatapack();
    renderRecipes();
    renderAdvancements();
    renderCommands();
    renderConfig();
    renderSettings();
    renderProgression();
    renderGallery();
    renderStats();

    setupReveal();
    setupNav();
    setupScroll();
    setupSearch();
    setupRecipeFilters();
    setupAdvFilters();
    setupSettingFilters();
    setupDelegates();
    setupAnchors();
    setupMasonryResize();
    setupItemTips();

    // Hero 入场计数
    const heroStats = $('#heroStats');
    const statIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { animateCounters(); statIO.disconnect(); }
      });
    }, { threshold: 0.4 });
    statIO.observe(heroStats);

    // 兜底：后台标签页里 IntersectionObserver 不触发，直接给出最终数值
    setTimeout(() => {
      if (document.hidden) {
        $$('.stat b[data-count]').forEach((el) => { el.textContent = el.dataset.count; });
      }
    }, 1600);

    // 兜底：后台标签页里滚动揭示不触发，切回前台时把已在视口内的补齐
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      $$('.reveal:not(.is-in)').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
      // 后台标签页里 ResizeObserver 可能不触发，回前台补一次瀑布流重排
      [$('#modFeatures'), $('#datapackFeatures')].forEach((g) => {
        if (g && MASONRY.has(g) && masonryCols(g) !== MASONRY.get(g).cols) relayoutMasonry(g);
      });
    });

    // Hero 元素立即入场
    setTimeout(() => {
      $$('.hero .reveal').forEach((el, i) => {
        setTimeout(() => el.classList.add('is-in'), 90 * i + 60);
      });
    }, 30);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
