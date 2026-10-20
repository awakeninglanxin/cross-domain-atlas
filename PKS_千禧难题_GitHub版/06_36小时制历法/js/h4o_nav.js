/* ==========================================================================
   36 小时制历法页 · 右浮窗「本页小标题」导航（2026-10-20）
   --------------------------------------------------------------------------
   目标：把页面上所有 h2.section-title / h3 / h4（以及默认藏在 v-if 里的
         「四愿景」详情）做成按钮，一键跳到正确位置。
   三条硬约束（本页的坑都在这三处）：
     ① 顶栏是 fixed 44px ⇒ 跳转必须自己让出 TOP_OFFSET，否则标题被压在栏下；
     ② 部分内容默认折叠：.tl-body 是 v-show（display:none）、
        .expandable-tech 是 <details>（未 open）、
        四愿景详情是 v-if（DOM 里根本不存在，静态扫不到）⇒
        跳之前必须先展开，展开后位置会变 ⇒ 展开后要"再滚一次"；
     ③ 不碰 Vue 实例：所有动作只走真实 UI 路径（点按钮 / 设 details.open），
        并把结果记进 localStorage 的原键位，和用户手点效果一致。
   依赖：css/h4o_extra.css；纯原生 JS，Vue 渲染完成后自启动。
   ========================================================================== */
(function () {
	'use strict';

	var SEL = '#app h2.section-title, #app h3, #app h4';
	var TOP_OFFSET = 56;            /* 顶栏 44 + 12 呼吸 */
	var LS_KEY = 'cosmic36_mininav';
	var WIDE = 1280;                /* 内容栏 800 居中，此宽度以上右侧才够放浮窗 */

	var heads = [];                 /* {tag,text,lv,id,vision,el} */
	var btns = [];
	var active = -1;
	var listEl, findEl, countEl, wrapEl, pillEl;
	var open = true;

	/* ---------- 小工具 ---------- */
	function norm(s) {
		return (s || '')
			.replace(/[\u25be\u25b8\u25bc\u25b4]/g, '')   /* ▾ ▸ ▼ ▲ 折叠箭头 */
			.replace(/\s+/g, ' ')
			.trim();
	}
	function scrollTop() {
		return window.pageYOffset || document.documentElement.scrollTop || 0;
	}

	/* ---------- 采集标题 ---------- */
	function collect() {
		var arr = [], nodes = document.querySelectorAll(SEL), i, el, t;

		for (i = 0; i < nodes.length; i++) {
			el = nodes[i];
			if (wrapEl && wrapEl.contains(el)) continue;
			t = norm(el.textContent);
			if (!t || t.length > 60) continue;       /* 空标题、或明显不是标题的长文 */

			var id = el.id || ('mnh' + arr.length);
			if (!el.id) el.id = id;

			arr.push({
				tag: el.tagName,
				text: t,
				lv: el.tagName === 'H2' ? 1 : (el.tagName === 'H3' ? 2 : 3),
				id: id,
				vision: '',
				el: el
			});
		}

		/* 四愿景详情在 v-if 里，静态扫不到 ⇒ 用 .vision-item 当入口按钮。
		   注意：Vue 编译后会把 @click 属性从 DOM 上摘掉，所以这里不能靠属性找键，
		   只能靠"点它 → 看出来的那个 .vision-detail"来定位（activeVision 是单值，
		   任一时刻最多只有一个 .vision-detail 存在）。 */
		var vs = document.querySelectorAll('.vision-item');
		for (i = 0; i < vs.length; i++) {
			var lab = vs[i].querySelector('.vision-title');
			if (!lab) continue;
			arr.push({
				tag: 'VISION',
				text: norm(lab.textContent) + ' · 展开详情',
				lv: 3,
				id: '',
				vision: 'v' + i,
				el: vs[i]
			});
		}
		return arr;
	}

	/* ---------- 取元素：v-if 重建过就按「标签+文本」重新认领 ---------- */
	function resolve(h) {
		if (h.tag === 'VISION') return h.el || null;
		if (h.el && h.el.isConnected) return h.el;
		if (h.id) {
			var e = document.getElementById(h.id);
			if (e && e.isConnected) { h.el = e; return e; }
		}
		var all = document.querySelectorAll(SEL);
		for (var i = 0; i < all.length; i++) {
			if (all[i].tagName === h.tag && norm(all[i].textContent) === h.text) {
				if (h.id) all[i].id = h.id;
				h.el = all[i];
				return all[i];
			}
		}
		return null;
	}

	/* ---------- 展开所有挡路的折叠 ---------- */
	function ensureVisible(el) {
		/* ① <details> */
		var d = el.closest ? el.closest('details') : null;
		while (d) {
			if (!d.open) d.open = true;
			var up = d.parentElement;
			d = up ? up.closest('details') : null;
		}
		/* ② .tl-body 被 v-show 收掉 ⇒ 点卡片标题（等于用户手点）。
		   Vue 编译后 @click 属性会被摘掉，不能拿它做判据，直接点 h3 即可：
		   只有存在折叠开关的卡片，其 .tl-body 才会处于 display:none。 */
		var body = el.closest ? el.closest('.tl-body') : null;
		if (body && body.offsetParent === null) {
			var card = body.closest('.tl-card') || body.parentElement;
			var h3 = card ? card.querySelector('h3') : null;
			if (h3) h3.click();
		}
	}

	/* ---------- 滚到位置 ---------- */
	function scrollToEl(el, smooth) {
		var top = el.getBoundingClientRect().top + scrollTop() - TOP_OFFSET;
		window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: smooth ? 'smooth' : 'auto' });
	}

	function jumpTo(h) {
		/* 四愿景：先点开（已展开就别再点，点了会关掉），再等 Vue 吐出 DOM */
		if (h.vision) {
			var it = h.el;
			if (!it || !it.isConnected) return;
			var wasOpen = it.classList.contains('expanded');
			if (!wasOpen) it.click();

			setTimeout(function () {
				var d = document.querySelector('.vision-detail');
				if (!d) return;
				scrollToEl(d, true);
				setTimeout(function () { scrollToEl(d, false); }, 420);
			}, wasOpen ? 30 : 100);
			return;
		}

		var el = resolve(h);
		if (!el) return;

		var hidden = el.offsetParent === null;
		ensureVisible(el);

		if (!hidden) { scrollToEl(el, true); return; }

		/* 刚展开 ⇒ 高度变了，滚两次把落点钉准 */
		setTimeout(function () { var e2 = resolve(h) || el; scrollToEl(e2, true); }, 70);
		setTimeout(function () { var e2 = resolve(h) || el; scrollToEl(e2, false); }, 430);
	}

	/* ---------- 当前所在小节高亮 ---------- */
	function setActive(i) {
		if (i === active) return;
		if (active >= 0 && btns[active]) btns[active].classList.remove('active');
		active = i;
		if (i < 0 || !btns[i]) return;
		var b = btns[i], l = listEl;
		b.classList.add('active');
		var br = b.getBoundingClientRect(), lr = l.getBoundingClientRect();
		if (br.top < lr.top) l.scrollTop += br.top - lr.top - 4;
		else if (br.bottom > lr.bottom) l.scrollTop += br.bottom - lr.bottom + 4;
	}

	var ticking = false;
	function onScroll() {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(function () {
			ticking = false;
			spy();
		});
	}

	function spy() {
		var y = scrollTop() + TOP_OFFSET + 10, idx = -1, i, el, top;
		for (i = 0; i < heads.length; i++) {
			el = heads[i].el;
			if (!el || !el.isConnected || el.offsetParent === null) continue;
			top = el.getBoundingClientRect().top + scrollTop();
			if (top <= y) idx = i;
		}
		setActive(idx);
	}

	/* ---------- 筛选 ---------- */
	function filter() {
		var q = (findEl.value || '').trim().toLowerCase(), i, j, keep = [];
		if (!q) {
			for (i = 0; i < heads.length; i++) keep[i] = true;
		} else {
			for (i = 0; i < heads.length; i++) {
				keep[i] = btns[i].getAttribute('data-t').indexOf(q) >= 0;
			}
			/* 命中的项把上级也带出来，否则看不出它挂在哪一节下面 */
			for (i = 0; i < heads.length; i++) {
				if (!keep[i]) continue;
				var need2 = heads[i].lv >= 3, need1 = heads[i].lv >= 2;
				for (j = i - 1; j >= 0 && (need1 || need2); j--) {
					if (need1 && heads[j].lv <= 1) { keep[j] = true; need1 = false; need2 = false; }
					else if (need2 && heads[j].lv === 2) { keep[j] = true; need2 = false; }
				}
			}
		}
		var n = 0;
		for (i = 0; i < heads.length; i++) {
			btns[i].style.display = keep[i] ? '' : 'none';
			if (keep[i]) n++;
		}
		countEl.textContent = q ? n + '/' + heads.length : String(heads.length);
	}

	/* ---------- 开合 ---------- */
	function setCollapsed(v, remember) {
		open = !v;
		document.body.classList.toggle('mn-collapsed', v);
		if (remember) {
			try { localStorage.setItem(LS_KEY, v ? 'off' : 'on'); } catch (e) {}
		}
	}

	/* ---------- 建界面 ---------- */
	function build() {
		wrapEl = document.createElement('aside');
		wrapEl.id = 'mnWrap';
		wrapEl.setAttribute('aria-label', '本页小标题导航');
		wrapEl.innerHTML =
			'<div class="mn-head">' +
				'<span class="mn-t">📑 小标题</span>' +
				'<span class="mn-n" id="mnCount">0</span>' +
				'<button class="mn-fold" id="mnFold" type="button" title="收起为药丸（Ctrl+.）">–</button>' +
			'</div>' +
			'<div class="mn-body">' +
				'<input class="mn-find" id="mnFind" type="search" placeholder="筛选标题…" autocomplete="off">' +
				'<div class="mn-list" id="mnList"></div>' +
			'</div>';
		document.body.appendChild(wrapEl);

		pillEl = document.createElement('button');
		pillEl.id = 'mnPill';
		pillEl.type = 'button';
		pillEl.title = '展开「本页小标题」（Ctrl+.）';
		pillEl.textContent = '📑 小标题';
		document.body.appendChild(pillEl);

		listEl = document.getElementById('mnList');
		findEl = document.getElementById('mnFind');
		countEl = document.getElementById('mnCount');

		heads = collect();
		var frag = document.createDocumentFragment();

		heads.forEach(function (h, i) {
			var b = document.createElement('button');
			b.type = 'button';
			b.className = 'mn-item lv' + h.lv;
			b.textContent = h.text;
			b.title = h.text;
			b.setAttribute('data-t', h.text.toLowerCase());
			b.addEventListener('click', function () { setActive(i); jumpTo(h); });
			btns.push(b);
			frag.appendChild(b);
		});
		listEl.appendChild(frag);
		countEl.textContent = String(heads.length);

		document.getElementById('mnFold').addEventListener('click', function () { setCollapsed(true, true); });
		pillEl.addEventListener('click', function () { setCollapsed(false, true); });
		findEl.addEventListener('input', filter);

		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		window.addEventListener('keydown', function (e) {
			if ((e.ctrlKey || e.metaKey) && e.key === '.') {
				e.preventDefault();
				setCollapsed(open, true);
			}
		});
	}

	function init() {
		build();
		var saved = null;
		try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
		var wantOpen = saved ? saved === 'on' : (window.innerWidth >= WIDE);
		setCollapsed(!wantOpen, false);
		spy();
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 60); });
	} else {
		setTimeout(init, 60);   /* 等 Vue 首帧渲染完再扫标题 */
	}

	/* 探针接口 */
	window.__mn = {
		count: function () { return heads.length; },
		list: function () {
			return heads.map(function (h) { return h.lv + '|' + h.text; });
		},
		jump: function (i) { setActive(i); jumpTo(heads[i]); },
		active: function () { return active; },
		collapsed: function () { return !open; },
		setCollapsed: setCollapsed
	};
})();
