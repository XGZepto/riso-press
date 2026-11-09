/* Riso Press — progressive enhancements; pages work without this file. */
(function () {
    'use strict';

    var CJK = /[㐀-鿿豈-﫿]/g;
    var body = document.body;

    function store(key, value) {
        try {
            if (value === undefined) { return window.localStorage.getItem(key); }
            window.localStorage.setItem(key, value);
        } catch (e) { /* storage unavailable */ }
        return null;
    }
    function chineseShare(text) {
        var t = (text || '').replace(/\s+/g, '');
        return t.length ? (t.match(CJK) || []).length / t.length : 0;
    }
    function detectLang(root) {
        root.querySelectorAll('[data-detect-lang]').forEach(function (el) {
            if (!el.hasAttribute('lang') && chineseShare(el.textContent) > 0.3) {
                el.setAttribute('lang', el.closest('[lang="zh-Hans"]') ? 'zh-Hans' : 'zh-Hant');
            }
        });
    }
    function minutes(el) {
        var text = el.textContent || '';
        var cjk = (text.match(CJK) || []).length;
        var words = (text.replace(CJK, ' ').match(/[A-Za-z0-9À-ɏ'’-]+/g) || []).length;
        var seconds = (cjk + words) / (275 / 60);
        for (var n = 12; n > 12 - el.querySelectorAll('img').length; n--) { seconds += Math.max(n, 3); }
        return Math.max(1, Math.round(seconds / 60));
    }
    function ink(name) {
        var hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim().replace('#', '');
        if (hex.length === 3) { hex = hex.replace(/./g, '$&$&'); }
        var v = [0, 2, 4].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); });
        return v.some(isNaN) ? [47, 77, 160] : v;
    }

    // Paper grain in the first ink, rendered once to a small tile.
    function grain() {
        try {
            var c = document.createElement('canvas');
            c.width = c.height = 180;
            var x = c.getContext('2d');
            var d = x.createImageData(180, 180);
            var col = ink('--ink-1');
            for (var i = 0; i < d.data.length; i += 4) {
                d.data[i] = col[0]; d.data[i + 1] = col[1]; d.data[i + 2] = col[2];
                d.data[i + 3] = Math.random() < 0.5 ? Math.round(Math.random() * 22) : 0;
            }
            x.putImageData(d, 0, 0);
            document.documentElement.style.setProperty('--grain', 'url(' + c.toDataURL() + ')');
        } catch (e) { /* plain paper */ }
    }

    // Two-ink duotone, rendered once per photo: shadows print in the first ink, highlights stay paper.
    function duotone(img) {
        var base = ink('--ink-1');
        var dark = img.getAttribute('data-duo') === 'deep' ? base.map(function (v) { return Math.round(v * 0.78); }) : base;
        var light = [247, 245, 239];
        var src = new Image();
        src.crossOrigin = 'anonymous';
        src.onload = function () {
            try {
                var w = Math.min(src.naturalWidth, 1600);
                var h = Math.round(w * src.naturalHeight / src.naturalWidth);
                var c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                var x = c.getContext('2d');
                x.drawImage(src, 0, 0, w, h);
                var d = x.getImageData(0, 0, w, h);
                var px = d.data;
                for (var i = 0; i < px.length; i += 4) {
                    var l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
                    l = Math.min(1, Math.max(0, (l - 0.5) * 1.18 + 0.53));
                    px[i] = dark[0] + (light[0] - dark[0]) * l;
                    px[i + 1] = dark[1] + (light[1] - dark[1]) * l;
                    px[i + 2] = dark[2] + (light[2] - dark[2]) * l;
                }
                x.putImageData(d, 0, 0);
                c.toBlob(function (blob) {
                    if (!blob) { return; }
                    img.removeAttribute('srcset');
                    img.addEventListener('load', function () { img.classList.add('is-duo'); }, {once: true});
                    img.src = URL.createObjectURL(blob);
                }, 'image/jpeg', 0.9);
            } catch (e) { /* stays greyscale */ }
        };
        src.src = img.currentSrc || img.src;
    }

    // The hero quote prints in two lines, each with its own offset outline.
    function quote() {
        var q = document.querySelector('[data-quote]');
        if (!q) { return; }
        var text = q.textContent.trim();
        var lines = text.split(/\s+/);
        if (lines.length === 1 && chineseShare(text) > 0.5 && text.length > 6) {
            var core = text.replace(/[。！？!?.]+$/, '');
            var cut = Math.ceil(core.length / 2);
            lines = [text.slice(0, cut), text.slice(cut)];
        }
        q.textContent = '';
        // Chinese lines are sized so the longest one fits the width without breaking (see .quote in CSS).
        q.style.setProperty('--chars', Math.max.apply(null, lines.map(function (l) { return l.length; })));
        lines.forEach(function (line) {
            var s = document.createElement('span');
            s.className = 'mis';
            s.setAttribute('data-text', line);
            s.textContent = line;
            q.appendChild(s);
        });
    }

    // Issue numbers count down from the newest post.
    function numbers() {
        document.querySelectorAll('.rows').forEach(function (list) {
            var total = +list.getAttribute('data-total');
            var page = +list.getAttribute('data-page') || 1;
            var limit = +list.getAttribute('data-limit') || 0;
            var skip = +list.getAttribute('data-skip') || 0;
            list.querySelectorAll('.row').forEach(function (row, i) {
                var n = total - (page - 1) * limit - skip - i;
                row.querySelector('[data-n]').textContent = String(n).padStart(2, '0');
                var label = row.querySelector('[data-lang-label]');
                if (label && chineseShare(row.querySelector('.row-t').textContent + row.querySelector('.row-x').textContent) > 0.3) {
                    label.textContent = '中文';
                    label.className = 'is-zh';
                }
            });
        });
    }

    function prepContent(content) {
        content.querySelectorAll('table').forEach(function (t) {
            var w = document.createElement('div');
            w.className = 'table-wrap';
            w.tabIndex = 0;
            w.setAttribute('role', 'region');
            w.setAttribute('aria-label', 'Table');
            t.replaceWith(w);
            w.appendChild(t);
        });
        content.querySelectorAll('pre > code').forEach(function (c) {
            var m = (c.className || '').match(/language-([\w-]+)/);
            if (m) { c.parentElement.setAttribute('data-lang', m[1]); }
        });
    }
    function finish(scope) {
        var n = 0;
        scope.querySelectorAll('figure.kg-image-card').forEach(function (f) {
            var img = f.querySelector('img');
            if (!img) { return; }
            n++;
            var w = +img.getAttribute('width');
            var h = +img.getAttribute('height');
            if (w && h && h > w * 1.15) { f.classList.add('is-tall'); } else if (w && w < 700) { f.classList.add('is-small'); }
            var frame = document.createElement('div');
            frame.className = 'print';
            img.replaceWith(frame);
            frame.appendChild(img);
            var cap = f.querySelector('figcaption');
            if (!cap) { cap = document.createElement('figcaption'); f.appendChild(cap); }
            var label = document.createElement('span');
            label.className = 'fig';
            label.textContent = 'Fig. ' + n;
            cap.prepend(label);
        });
        var ps = scope.querySelectorAll(':scope > p');
        var last = ps[ps.length - 1];
        if (last) {
            var end = document.createElement('span');
            end.className = 'end';
            end.setAttribute('aria-hidden', 'true');
            last.appendChild(end);
        }
    }

    function bilingual(content) {
        var kids = Array.prototype.slice.call(content.children);
        var at = kids.findIndex(function (n) { return n.tagName === 'HR'; });
        if (at < 1 || at === kids.length - 1) { return null; }
        var zh = document.createElement('section');
        var en = document.createElement('section');
        zh.className = en.className = 'lang-block';
        zh.setAttribute('lang', content.closest('[lang="zh-Hans"]') ? 'zh-Hans' : 'zh-Hant');
        en.setAttribute('lang', 'en');
        kids.forEach(function (n, i) {
            if (i < at) {
                if (n.tagName === 'P' && /english version follows/i.test(n.textContent) && n.textContent.trim().length < 40) { n.remove(); } else { zh.appendChild(n); }
            } else if (i > at) { en.appendChild(n); } else { n.remove(); }
        });
        content.append(zh, en);
        var article = content.closest('article');
        var group = article.querySelector('.lang');
        var buttons = article.querySelectorAll('[data-setlang]');
        var reading = article.querySelector('[data-reading-time]');
        var mins = {zh: minutes(zh), en: minutes(en)};
        function apply(lang) {
            zh.hidden = lang !== 'zh';
            en.hidden = lang !== 'en';
            buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-setlang') === lang)); });
            if (reading) { reading.textContent = mins[lang] + ' min'; }
        }
        buttons.forEach(function (b) {
            b.addEventListener('click', function () { store('riso-lang', b.getAttribute('data-setlang')); apply(b.getAttribute('data-setlang')); });
        });
        var pref = body.getAttribute('data-default-lang');
        var saved = store('riso-lang');
        var browser = (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
        if (group) { group.hidden = false; }
        apply(saved === 'zh' || saved === 'en' ? saved : pref === '中文' ? 'zh' : pref === 'English' ? 'en' : browser);
        return {zh: zh, en: en};
    }

    function post() {
        var content = document.querySelector('article .gh-content');
        if (!content) { return; }
        prepContent(content);
        var article = content.closest('article');
        if (!article.hasAttribute('lang') && chineseShare(content.textContent) > 0.3) { article.setAttribute('lang', 'zh-Hant'); }
        var parts = content.hasAttribute('data-bilingual') ? bilingual(content) : null;
        if (parts) { finish(parts.zh); finish(parts.en); } else { finish(content); }
    }

    // Below 980px the nav links live in a menu under the header.
    function menu() {
        var btn = document.querySelector('[data-menu]');
        var panel = document.querySelector('[data-menu-panel]');
        if (!btn || !panel) { return; }
        var here = location.pathname;
        panel.querySelectorAll('a[href]').forEach(function (a) {
            if (a.pathname === here && a.getAttribute('href').charAt(0) !== '#') { a.setAttribute('aria-current', 'page'); }
        });
        function set(open) {
            panel.hidden = !open;
            btn.setAttribute('aria-expanded', String(open));
        }
        btn.addEventListener('click', function () { set(panel.hidden); });
        panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
        document.addEventListener('click', function (e) {
            if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) { set(false); }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); }
        });
    }

    // Search opens as a printed index sheet; matches are highlighted in the second ink.
    function search() {
        if (!window.themeSearch) { return; }
        var tz = body.getAttribute('data-timezone') || undefined;
        var day;
        try { day = new Intl.DateTimeFormat('en-US', {timeZone: tz, month: 'short', day: 'numeric', year: 'numeric'}); } catch (e) { day = new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'}); }
        window.themeSearch({
            render: function (it, h) {
                var zh = chineseShare(it.title) > 0.3 ? ' lang="zh-Hant"' : '';
                var zhx = chineseShare(h.snippet) > 0.3 ? ' lang="zh-Hant"' : '';
                return '<a href="' + h.esc(it.url) + '">' +
                    '<span class="s-n" aria-hidden="true">' + String(h.index + 1).padStart(2, '0') + '</span>' +
                    '<span class="s-meta">' + day.format(new Date(it.date)) + (it.mins ? ' · ' + it.mins + ' min' : '') + '</span>' +
                    '<span class="s-t"' + zh + '>' + h.mark(it.title, h.terms) + '</span>' +
                    '<span class="s-x"' + zhx + '>' + h.mark(h.snippet, h.terms) + '</span></a>';
            },
            text: {
                loading: 'Loading the archive…',
                recent: '',
                found: function (n) { return 'Found ' + n; },
                none: 'Nothing printed matches · 沒有找到',
                error: 'Search is unavailable right now'
            }
        });
    }

    // Video embeds arrive at a fixed size (often 200×113); scale them to the column, keeping their shape.
    function embeds() {
        document.querySelectorAll('.gh-content .kg-embed-card iframe[width][height]').forEach(function (f) {
            var w = parseFloat(f.getAttribute('width'));
            var h = parseFloat(f.getAttribute('height'));
            if (w > 0 && h > 0 && !/%/.test(f.getAttribute('width'))) {
                f.style.aspectRatio = w + ' / ' + h;
                f.classList.add('is-fluid');
            }
        });
    }

    function init() {
        embeds();
        grain();
        menu();
        search();
        quote();
        numbers();
        post();
        detectLang(document);
        document.querySelectorAll('img[data-duo]').forEach(duotone);
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
