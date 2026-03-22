// ==UserScript==
// @name        WOL Highlighter
// @namespace   https://wol.jw.org
// @version     1.0
// @description 4-colour highlighter for iOS/iPadOS — save, restore, export/import
// @match       https://wol.jw.org/*
// @run-at      document-end
// @updateURL    https://raw.githubusercontent.com/javalan/userscripts/main/highlighter.js
// @downloadURL  https://raw.githubusercontent.com/javalan/userscripts/main/highlighter.js
// @grant       unsafeWindow
// @require     https://raw.githubusercontent.com/javalan/userscripts/main/highlighter_version.js
// ==/UserScript==
(function () {

// ─────────────────────────────────────────────────────────────
// VERSION CHECK
// ─────────────────────────────────────────────────────────────
const CURRENT_VERSION = "1.0";

function compareVersions(local, remote) {
    const l = local.split('.').map(Number);
    const r = remote.split('.').map(Number);
    for (let i = 0; i < Math.max(l.length, r.length); i++) {
        const li = l[i] || 0, ri = r[i] || 0;
        if (li < ri) return -1;
        if (li > ri) return 1;
    }
    return 0;
}

const _lang = (() => {
    const l = (navigator.language || '').toLowerCase();
    return l.startsWith('zh') ? 'zh' : 'en';
})();

function showUpdateToast(versionData) {
    if (localStorage.getItem('wol_hl_update_' + versionData.version)) return;

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(50px);background:#f2f2f7;border:1px solid #c1c1c1;border-radius:6px;box-shadow:0 3px 10px rgba(0,0,0,0.15);padding:16px 18px;z-index:999999;width:180px;display:flex;flex-direction:column;align-items:center;gap:8px;font-family:system-ui,sans-serif;font-size:14px;color:#1a1a1a;transition:transform 0.3s ease,opacity 0.3s ease;opacity:0;';

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:4px;right:6px;cursor:pointer;font-weight:bold;font-size:24px;';
    closeBtn.onclick = () => {
        toast.remove();
        localStorage.setItem('wol_hl_update_' + versionData.version, 'true');
    };
    toast.appendChild(closeBtn);

    const textContainer = document.createElement('div');
    textContainer.style.textAlign = 'center';

    const heading = document.createElement('div');
    heading.textContent = 'HIGHLIGHTER';
    heading.style.cssText = 'font-weight:bold;font-size:16px;text-transform:uppercase;';
    textContainer.appendChild(heading);

    const updateLabels = { en: 'Update available 🔔', zh: '有新版本 🔔' };
    const watchLabels  = { en: '▶  How to update',   zh: '▶  查看更新方法' };

    const subheading = document.createElement('div');
    subheading.textContent = updateLabels[_lang] || updateLabels.en;
    subheading.style.cssText = 'font-weight:normal;font-size:14px;';
    textContainer.appendChild(subheading);
    toast.appendChild(textContainer);

    const videoBtn = document.createElement('button');
    videoBtn.textContent = watchLabels[_lang] || watchLabels.en;
    videoBtn.style.cssText = 'padding:10px 14px;background:#4a90e2;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:500;font-size:14px;align-self:center;';
    videoBtn.onclick = () => {
        if (versionData.install_video) openFullscreenVideo(versionData.install_video);
    };
    toast.appendChild(videoBtn);

    if (document.body) document.body.appendChild(toast);
    else window.addEventListener('load', () => document.body.appendChild(toast));

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });
}

function openFullscreenVideo(videoURL) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:2147483647;display:flex;justify-content:center;align-items:center;flex-direction:column;';

    const spinner = document.createElement('div');
    spinner.style.cssText = 'width:50px;height:50px;border:5px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;';
    if (!document.getElementById('modal-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'modal-spinner-style';
        style.textContent = '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
        document.head.appendChild(style);
    }
    modal.appendChild(spinner);

    const video = document.createElement('video');
    video.src = videoURL;
    video.controls = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'width:100%;max-width:900px;display:none;border-radius:6px;';
    modal.appendChild(video);

    document.body.appendChild(modal);

    const closeModal = () => { video.pause(); if (modal.parentNode) modal.remove(); };
    video.addEventListener('webkitendfullscreen', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    video.addEventListener('loadedmetadata', () => {
        spinner.style.display = 'none';
        video.style.display = 'block';
        if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });
}

(function checkVersion() {
    if (!window.HIGHLIGHTER_VERSION) return;
    const data = window.HIGHLIGHTER_VERSION;
    if (compareVersions(CURRENT_VERSION, data.version) < 0) {
        showUpdateToast(data);
    }
})();

// ─────────────────────────────────────────────────────────────
// i18n — EN / CHS
// ─────────────────────────────────────────────────────────────
const T = {
    exportHL:         { en: '↑  Export highlights',        zh: '↑  导出高亮' },
    importHL:         { en: '↓  Import highlights',        zh: '↓  导入高亮' },
    clearHL:          { en: '🗑  Clear all highlights',     zh: '🗑  清除所有高亮' },
    confirmClear:     { en: 'Delete all highlights?',       zh: '删除所有高亮？' },
    allCleared:       { en: 'All highlights cleared',       zh: '所有高亮已清除' },
    promptFilename:   { en: 'Enter filename for export:',  zh: '输入导出文件名：' },
    noHighlights:     { en: 'No highlights to export',      zh: '没有可导出的高亮' },
    exported:         { en: (n) => `Exported ${n} page${n===1?'':'s'}`, zh: (n) => `已导出 ${n} 页` },
    imported:         { en: (n,e) => `Imported ${n} pages${e>0?` (${e} errors)`:''}`, zh: (n,e) => `已导入 ${n} 页${e>0?`（${e} 个错误）`:''}` },
    invalidFormat:    { en: 'Invalid file format',          zh: '文件格式无效' },
    dbNotReady:       { en: 'Database not ready',           zh: '数据库未就绪' },
    selectFirst:      { en: 'Select text first',            zh: '请先选择文字' },
    selectionComplex: { en: (e) => 'Selection too complex: ' + e, zh: (e) => '选择过于复杂：' + e },
    errorReading:     { en: (e) => 'Error: ' + e,          zh: (e) => '错误：' + e },
};
function t(key, ...args) {
    const entry = T[key]; if (!entry) return key;
    const val = entry[_lang] || entry.en;
    return typeof val === 'function' ? val(...args) : val;
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const safeWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
const hlColors = ['#fff176', '#b9f6ca', '#ffe0b2', '#ead5f5'];
let currentRange = null;
let db = null;

// ─────────────────────────────────────────────────────────────
// PANEL CSS
// ─────────────────────────────────────────────────────────────
(function injectStyles() {
    if (document.getElementById('wol_hl_styles')) return;
    const s = document.createElement('style');
    s.id = 'wol_hl_styles';
    s.textContent = `
        #wol_hl_panel {
            position: fixed;
            background: #ffffff;
            border: 1px solid #d0d0d0;
            border-radius: 10px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
            z-index: 99999;
            min-width: 200px;
            display: none;
            overflow: hidden;
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
            transition: opacity 0.22s cubic-bezier(.4,0,.2,1), transform 0.22s cubic-bezier(.4,0,.2,1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            color: #1a1a1a;
        }
        #wol_hl_panel.pp-open { opacity: 1; transform: translateY(0) scale(1); }
        #wol_hl_panel .pp-btn {
            display: block; width: 100%; padding: 9px 14px; font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-weight: 400; color: #1a1a1a; background: transparent; border: none;
            text-align: left; cursor: pointer; box-sizing: border-box; white-space: nowrap;
        }
        #wol_hl_panel .pp-btn.pp-danger { color: #c00; }
        #wol_hl_icon_btn {
            display: flex; align-items: center; justify-content: center;
            width: 44px; height: 44px; cursor: pointer;
            -webkit-user-select: none; user-select: none;
            -webkit-touch-callout: none; touch-action: manipulation;
            background: none; border: none; padding: 0; margin: 0;
        }
        #wol_hl_icon_btn svg { width: 28px; height: 28px; display: block; pointer-events: none; }
        span[data-highlight-id] ruby rt { background-color: transparent !important; }
        span[data-highlight-id] { border-radius: 2px; }
    `;
    document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────
// PANEL
// ─────────────────────────────────────────────────────────────
let _panel = null;
let _panelOpenTime = 0;

function getPanel() {
    if (!_panel) { _panel = document.createElement('div'); _panel.id = 'wol_hl_panel'; document.body.appendChild(_panel); }
    return _panel;
}

function showPanel(anchorEl) {
    _panelOpenTime = Date.now();
    const panel = getPanel();
    panel.innerHTML = '';
    const section = document.createElement('div');
    section.style.padding = '6px 0 8px 0';
    function makeBtn(label, danger, onClick) {
        const btn = document.createElement('button');
        btn.className = 'pp-btn' + (danger ? ' pp-danger' : '');
        btn.textContent = label;
        btn.addEventListener('touchend', (e) => { e.preventDefault(); hidePanel(); onClick(); }, { passive: false });
        return btn;
    }
    section.appendChild(makeBtn(t('exportHL'), false, exportHighlights));
    section.appendChild(makeBtn(t('importHL'), false, importHighlights));
    section.appendChild(makeBtn(t('clearHL'), true, clearAllHighlights));
    panel.appendChild(section);
    panel.style.display = 'block';
    panel.getBoundingClientRect();
    const pw = 210;
    const rect = anchorEl.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + pw > window.innerWidth) left = window.innerWidth - pw - 10;
    if (left < 10) left = 10;
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.classList.add('pp-open');
}

function hidePanel() {
    if (!_panel) return;
    _panel.classList.remove('pp-open');
    setTimeout(() => { if (_panel && !_panel.classList.contains('pp-open')) _panel.style.display = 'none'; }, 230);
}

document.addEventListener('touchend', (e) => {
    if (Date.now() - _panelOpenTime < 600) return;
    if (_panel && _panel.style.display !== 'none' && !_panel.contains(e.target)) hidePanel();
}, { passive: true });

// ─────────────────────────────────────────────────────────────
// HL ICON BUTTON (touch only)
// ─────────────────────────────────────────────────────────────
const HL_SVG = `<svg width="28" height="28" viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.6375 9.04176L13.3875 14.2418C13.3075 14.3218 13.1876 14.3718 13.0676 14.3718H10.1075V11.3118C10.1075 11.1918 10.1575 11.0818 10.2375 11.0018L15.4376 5.84176" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.7076 11.9818V21.6618C18.7076 21.9018 18.5176 22.0918 18.2776 22.0918H2.84756C2.60756 22.0918 2.41754 21.9018 2.41754 21.6618V6.23176C2.41754 5.99176 2.60756 5.80176 2.84756 5.80176H12.4875" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.3863 2.90824L16.859 4.43558L20.0551 7.63167L21.5824 6.10433L18.3863 2.90824Z" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function buildHighlightIconBtn() {
    if (document.getElementById('wol_hl_icon_btn')) return;
    const menuBar = document.getElementById('menuBar');
    if (!menuBar) return;

    const li = document.createElement('li');
    li.id = 'wol_hl_icon_li';
    li.className = 'chrome menuButton';
    li.style.cssText = 'display:flex !important;align-items:center !important;justify-content:center !important;padding:0 !important;margin:0 !important;';

    const btn = document.createElement('div');
    btn.id = 'wol_hl_icon_btn';
    btn.innerHTML = HL_SVG;
    btn.title = 'Tap: toggle highlighter  |  Long-press: export/import/clear';

    let hlTouchLong = false, hlTouchTimer = null;
    btn.addEventListener('touchstart', () => {
        hlTouchLong = false;
        hlTouchTimer = setTimeout(() => { hlTouchLong = true; hideFloatingPalette(); showPanel(btn); }, 500);
    }, { passive: true });
    btn.addEventListener('touchmove', () => { if (hlTouchTimer) { clearTimeout(hlTouchTimer); hlTouchTimer = null; } }, { passive: true });
    btn.addEventListener('touchend', e => {
        if (hlTouchTimer) { clearTimeout(hlTouchTimer); hlTouchTimer = null; }
        e.preventDefault(); e.stopPropagation();
        if (hlTouchLong) { hlTouchLong = false; return; }
        if (document.getElementById('wol_hl_float_palette')) hideFloatingPalette();
        else showFloatingPalette();
    }, { passive: false });
    btn.addEventListener('contextmenu', e => e.preventDefault(), true);

    li.appendChild(btn);
    const menuBible = document.getElementById('menuBible');
    if (menuBible) menuBar.insertBefore(li, menuBible);
    else menuBar.insertBefore(li, menuBar.firstChild);
}

// ─────────────────────────────────────────────────────────────
// FLOATING PALETTE — right of HL icon
// ─────────────────────────────────────────────────────────────
function showFloatingPalette() {
    if (document.getElementById('wol_hl_float_palette')) return;
    const palette = document.createElement('div');
    palette.id = 'wol_hl_float_palette';
    palette.style.cssText = 'position:fixed;z-index:2147483646;background:#f0f0f0;border:1px solid #d0d0d0;border-radius:8px;padding:0 10px;height:44px;display:flex;align-items:center;gap:13px;box-shadow:0 2px 10px rgba(0,0,0,0.12);-webkit-user-select:none;user-select:none;touch-action:none;top:0;left:0;';

    const handle = document.createElement('div');
    handle.style.cssText = 'color:#bbb;font-size:15px;padding:0 2px;line-height:1;flex-shrink:0;';
    handle.textContent = '⠿';
    palette.appendChild(handle);

    hlColors.forEach(c => {
        const dot = document.createElement('div');
        dot.style.cssText = 'width:24px;height:24px;border-radius:50%;background:' + (c === '#fff176' ? '#ffd600' : c) + ';border:1.5px solid rgba(0,0,0,0.15);flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.15);';
        dot.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); applyHighlightColor(c); }, { passive: false });
        palette.appendChild(dot);
    });

    const closeBtn = document.createElement('div');
    closeBtn.style.cssText = 'color:#999;font-size:16px;padding:0 2px;line-height:1;font-family:sans-serif;flex-shrink:0;';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); hideFloatingPalette(); }, { passive: false });
    palette.appendChild(closeBtn);

    // Touch drag via handle
    let dragActive = false, dragStartX = 0, dragStartY = 0, palStartX = 0, palStartY = 0;
    handle.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        dragActive = true;
        const rect = palette.getBoundingClientRect();
        dragStartX = touch.clientX; dragStartY = touch.clientY;
        palStartX = rect.left; palStartY = rect.top;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
        if (!dragActive) return;
        const touch = e.touches[0];
        palette.style.left = Math.max(0, Math.min(window.innerWidth - palette.offsetWidth, palStartX + touch.clientX - dragStartX)) + 'px';
        palette.style.top  = Math.max(0, Math.min(window.innerHeight - palette.offsetHeight, palStartY + touch.clientY - dragStartY)) + 'px';
    }, { passive: true });
    document.addEventListener('touchend', () => { dragActive = false; }, { passive: true });

    document.body.appendChild(palette);

    // Position to the right of the HL icon
    const hlBtn = document.getElementById('wol_hl_icon_btn');
    if (hlBtn) {
        const btnRect = hlBtn.getBoundingClientRect();
        const left = Math.min(btnRect.right + 6, window.innerWidth - palette.offsetWidth - 6);
        const top  = btnRect.top + (btnRect.height / 2) - (palette.offsetHeight / 2);
        palette.style.left = Math.max(left, btnRect.right + 4) + 'px';
        palette.style.top  = Math.max(top, 4) + 'px';
    }
}

function hideFloatingPalette() {
    const p = document.getElementById('wol_hl_float_palette');
    if (p) p.remove();
}

function applyHighlightColor(c) {
    if (!currentRange) { alert(t('selectFirst')); return; }
    const rangeToHighlight = currentRange.cloneRange();
    currentRange = null;
    window.getSelection && window.getSelection().removeAllRanges();
    try { smartHighlight(rangeToHighlight, c); } catch (err) { alert(t('selectionComplex', err.message)); }
}

// ─────────────────────────────────────────────────────────────
// SELECTION TRACKING
// ─────────────────────────────────────────────────────────────
document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    if (sel.rangeCount === 1) {
        currentRange = sel.getRangeAt(0).cloneRange();
    } else {
        const first = sel.getRangeAt(0), last = sel.getRangeAt(sel.rangeCount - 1);
        const merged = document.createRange();
        merged.setStart(first.startContainer, first.startOffset);
        merged.setEnd(last.endContainer, last.endOffset);
        currentRange = merged;
    }
});

// ─────────────────────────────────────────────────────────────
// ADD REMOVE LISTENER (long-press to remove)
// ─────────────────────────────────────────────────────────────
function unwrapSpan(span) {
    const parent = span.parentNode; if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
}

function removeHighlight(span) {
    const id = span.getAttribute('data-highlight-id');
    const container = span.closest('.tooltip, .tooltipContainer') || document.body;
    container.querySelectorAll(`span[data-highlight-id="${id}"]`).forEach(s => unwrapSpan(s));
    setTimeout(() => saveHighlights(container), 100);
}

function addRemoveListener(span) {
    let timer = null;
    span.addEventListener('touchstart', () => {
        timer = setTimeout(() => { timer = null; removeHighlight(span); }, 600);
    }, { passive: true });
    ['touchend', 'touchcancel', 'touchmove'].forEach(ev =>
        span.addEventListener(ev, () => { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true })
    );
}

// ─────────────────────────────────────────────────────────────
// SMART HIGHLIGHT ENGINE
// ─────────────────────────────────────────────────────────────
function snapRangeToRubyBoundaries(range) {
    let startRuby = range.startContainer;
    while (startRuby && startRuby.tagName !== 'RUBY') startRuby = startRuby.parentElement;
    let endRuby = range.endContainer;
    while (endRuby && endRuby.tagName !== 'RUBY') endRuby = endRuby.parentElement;
    if (startRuby) range.setStartBefore(startRuby);
    if (endRuby) range.setEndAfter(endRuby);
}

function smartHighlight(range, color, skipSave = false) {
    if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset > 0) {
        const newNode = range.startContainer.splitText(range.startOffset);
        range.setStart(newNode, 0);
    }
    if (range.endContainer.nodeType === Node.TEXT_NODE && range.endOffset < range.endContainer.textContent.length) {
        range.endContainer.splitText(range.endOffset);
    }
    snapRangeToRubyBoundaries(range);
    const frag = range.cloneContents();
    const rubyElems = frag.querySelectorAll('ruby');
    const highlightID = 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    function skipPinyinFilter(n) {
        let p = n.parentElement;
        while (p) {
            if (p.tagName === 'RT') return NodeFilter.FILTER_REJECT;
            if (p.classList && p.classList.contains('wol-char-pinyin')) return NodeFilter.FILTER_REJECT;
            if (p.tagName === 'RUBY') break;
            p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
    }
    function isFootnoteMarker(node) {
        if (node.nodeType !== Node.TEXT_NODE) return false;
        return /^[\*\+\#]$/.test(node.textContent.trim()) || /^[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(node.textContent.trim());
    }
    function isReferenceSymbol(node) {
        if (node.nodeType !== Node.TEXT_NODE) return false;
        const p = node.parentElement;
        return p && p.tagName === 'A' && p.classList.contains('b') && /^[\+\*\#]+$/.test(node.textContent.trim());
    }
    function makeHlSpan() {
        const span = document.createElement('span');
        span.style.backgroundColor = color;
        span.style.color = 'black';
        span.setAttribute('data-highlight-id', highlightID);
        addRemoveListener(span);
        return span;
    }
    function wrapTextNode(textNode) {
        let p = textNode.parentElement;
        while (p) { if (p.tagName === 'RT') return; if (p.tagName === 'RUBY') break; p = p.parentElement; }
        const span = makeHlSpan();
        textNode.parentNode.replaceChild(span, textNode);
        span.appendChild(textNode);
    }

    if (rubyElems.length) {
        const startEl = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
        const endEl   = range.endContainer.nodeType === Node.TEXT_NODE   ? range.endContainer.parentElement   : range.endContainer;
        let para = startEl.closest('p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4') || startEl.parentElement;
        const endPara = endEl.closest('p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4') || endEl.parentElement;
        if (para && endPara && para !== endPara) { para = para.parentElement; while (para && !para.contains(endPara)) para = para.parentElement; }
        if (para) {
            const walker = document.createTreeWalker(para, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
            const liveRubies = [], liveTextNodes = [];
            while (walker.nextNode()) {
                const node = walker.currentNode;
                try {
                    const nr = document.createRange(); nr.selectNode(node);
                    if (nr.compareBoundaryPoints(Range.START_TO_END, range) <= 0) continue;
                    if (nr.compareBoundaryPoints(Range.END_TO_START, range) >= 0) continue;
                } catch (e) { continue; }
                if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'RUBY') {
                    liveRubies.push(node);
                } else if (node.nodeType === Node.TEXT_NODE) {
                    let insideRuby = false, insideHL = false;
                    let anc = node.parentElement;
                    while (anc && anc !== para) {
                        if (anc.tagName === 'RUBY') { insideRuby = true; break; }
                        if (anc.getAttribute('data-highlight-id')) { insideHL = true; break; }
                        anc = anc.parentElement;
                    }
                    if (!insideRuby && !insideHL && node.textContent.trim() && !isFootnoteMarker(node) && !isReferenceSymbol(node))
                        liveTextNodes.push(node);
                }
            }
            liveRubies.forEach(ruby => {
                if (ruby.closest('span[data-highlight-id]')) return;
                const span = makeHlSpan(); ruby.parentNode.replaceChild(span, ruby); span.appendChild(ruby);
            });
            liveTextNodes.forEach(n => {
                if (n.parentNode && !n.parentNode.getAttribute('data-highlight-id')) {
                    const span = makeHlSpan(); n.parentNode.replaceChild(span, n); span.appendChild(n);
                }
            });
        }
    } else {
        const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (!isFootnoteMarker(node) && !isReferenceSymbol(node)) textNodes.push(node);
        }
        textNodes.forEach(n => wrapTextNode(n));
        range.deleteContents();
        range.insertNode(frag);
    }

    if (!skipSave) {
        const container = document.querySelector('.tooltip, .tooltipContainer') || document.body;
        setTimeout(() => saveHighlights(container), 100);
    }
}

// ─────────────────────────────────────────────────────────────
// PAGE ID HELPERS
// ─────────────────────────────────────────────────────────────
function extractScriptureRef(url) {
    const m = url.match(/\/b\/[^\/]+\/[^\/]+\/[^\/]+\/(\d+)\/(\d+)/);
    return m ? `scripture_${m[1]}_${m[2]}` : null;
}
function extractArticleRef(url) {
    const m1 = url.match(/\/(?:d|dsync|b|bsync|m|msync|meetings|lv|pc)\/((?:[^\/]+\/)*[^\/]+?)\/(\d+)(?:[^#\/\?]*)/);
    if (m1) return `article_${m1[1].replace(/\//g,'_')}_${m1[2]}`;
    const m2 = url.match(/\/(w|wp|g|km|mwb)\/[^\/]+\/[^\/]+\/([^#\/\?]+)/);
    if (m2) return `pub_${m2[1]}_${m2[2]}`;
    return null;
}
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
    return Math.abs(hash).toString(36);
}
function getAllSyncKeys(url) {
    const keys = [];
    const sr = extractScriptureRef(url); if (sr) keys.push('tooltip_' + sr);
    const ar = extractArticleRef(url);   if (ar) keys.push('tooltip_' + ar);
    keys.push(url.split('#')[0]);
    return keys;
}
function getPageID(container = document.body) {
    const tooltip = container.closest('.tooltip, .tooltipContainer');
    if (tooltip) {
        const link = tooltip.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
        if (link) {
            const href = link.getAttribute('href');
            if (href) {
                const sr = extractScriptureRef(href); if (sr) return 'tooltip_' + sr;
                const ar = extractArticleRef(href);   if (ar) return 'tooltip_' + ar;
                return 'tooltip_' + href.split('#')[0];
            }
        }
        return 'tooltip_' + simpleHash(tooltip.textContent.trim().substring(0, 500));
    }
    const ar = extractArticleRef(window.location.pathname); if (ar) return ar;
    const sr = extractScriptureRef(window.location.pathname); if (sr) return sr;
    return window.location.pathname + window.location.search;
}
function getBaseReference(container = document.body) {
    const tooltip = container.closest('.tooltip, .tooltipContainer');
    if (tooltip) {
        const link = tooltip.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
        if (link) {
            const href = link.getAttribute('href');
            if (href) {
                const sr = extractScriptureRef(href); if (sr) return sr;
                const ar = extractArticleRef(href);   if (ar) return ar;
                return href.split('#')[0];
            }
        }
    }
    const sr = extractScriptureRef(window.location.pathname); if (sr) return sr;
    const ar = extractArticleRef(window.location.pathname);   if (ar) return ar;
    return window.location.pathname + window.location.search;
}
function getCurrentSyncKeys() {
    const keys = [];
    const sr = extractScriptureRef(window.location.pathname); if (sr) keys.push('tooltip_' + sr);
    return keys;
}

// ─────────────────────────────────────────────────────────────
// INDEXEDDB
// ─────────────────────────────────────────────────────────────
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WolHighlights', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(db); };
        request.onupgradeneeded = (event) => {
            const d = event.target.result;
            if (!d.objectStoreNames.contains('highlights'))
                d.createObjectStore('highlights', { keyPath: 'pageID' });
        };
    });
}

// ─────────────────────────────────────────────────────────────
// SAVE / RESTORE
// ─────────────────────────────────────────────────────────────
function saveHighlights(container = document.body) {
    if (!db) return;
    const pageID = getPageID(container);
    const baseRef = getBaseReference(container);
    const highlights = [];
    const highlightGroups = new Map();
    container.querySelectorAll('span[data-highlight-id]').forEach(span => {
        const id = span.getAttribute('data-highlight-id');
        if (!highlightGroups.has(id)) highlightGroups.set(id, []);
        highlightGroups.get(id).push(span);
    });
    function skipPinyinFilter(n) {
        let p = n.parentElement;
        while (p) {
            if (p.tagName === 'RT') return NodeFilter.FILTER_REJECT;
            if (p.classList && p.classList.contains('wol-char-pinyin')) return NodeFilter.FILTER_REJECT;
            if (p.tagName === 'RUBY') break;
            p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
    }
    function getRbText(node) {
        let text = '';
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, { acceptNode: skipPinyinFilter });
        while (walker.nextNode()) text += walker.currentNode.textContent;
        return text;
    }
    function getTextBetweenSpans(spanGroup) {
        let ancestor = spanGroup[0].parentElement;
        const allIn = (anc) => spanGroup.every(s => anc.contains(s));
        while (ancestor && !allIn(ancestor)) ancestor = ancestor.parentElement;
        if (!ancestor) return spanGroup.map(s => getRbText(s)).join('');
        const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT, { acceptNode: skipPinyinFilter });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        const firstSpan = spanGroup[0], lastSpan = spanGroup[spanGroup.length - 1];
        let startIdx = -1, endIdx = -1;
        for (let i = 0; i < nodes.length; i++) {
            if (startIdx === -1 && firstSpan.contains(nodes[i])) startIdx = i;
            if (lastSpan.contains(nodes[i])) endIdx = i;
        }
        if (startIdx === -1 || endIdx === -1) return spanGroup.map(s => getRbText(s)).join('');
        return nodes.slice(startIdx, endIdx + 1).map(n => n.textContent).join('');
    }
    highlightGroups.forEach((spanGroup, id) => {
        if (spanGroup.length === 0) return;
        highlights.push({ id, color: spanGroup[0].style.backgroundColor, text: getTextBetweenSpans(spanGroup) });
    });
    const transaction = db.transaction(['highlights'], 'readwrite');
    const store = transaction.objectStore('highlights');
    if (highlights.length > 0) {
        store.put({ pageID, highlights });
        if (baseRef && baseRef !== pageID) store.put({ pageID: baseRef, highlights });
        if (container === document.body) getCurrentSyncKeys().forEach(key => store.put({ pageID: key, highlights }));
        if (container.closest('.tooltip, .tooltipContainer')) {
            const link = container.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
            if (link) { const href = link.getAttribute('href'); if (href) getAllSyncKeys(href).forEach(key => store.put({ pageID: key, highlights })); }
        }
    } else {
        store.delete(pageID);
        if (baseRef && baseRef !== pageID) store.delete(baseRef);
        if (container === document.body) getCurrentSyncKeys().forEach(key => store.delete(key));
    }
}

function restoreHighlights(container = document.body) {
    if (!db) return;
    const pageID = getPageID(container);
    const baseRef = getBaseReference(container);
    let pageIDsToCheck = [pageID];
    if (baseRef && baseRef !== pageID) pageIDsToCheck.push(baseRef);
    if (container === document.body) pageIDsToCheck = pageIDsToCheck.concat(getCurrentSyncKeys());
    const transaction = db.transaction(['highlights'], 'readonly');
    const store = transaction.objectStore('highlights');
    const allHighlights = new Map();
    let processed = 0;
    pageIDsToCheck.forEach(id => {
        const request = store.get(id);
        request.onsuccess = () => {
            processed++;
            const result = request.result;
            if (result && result.highlights)
                result.highlights.forEach(h => { if (!allHighlights.has(h.text)) allHighlights.set(h.text, h); });
            if (processed === pageIDsToCheck.length) {
                const highlights = Array.from(allHighlights.values());
                if (highlights.length === 0) return;
                function pinyinFilter(node) {
                    let p = node.parentElement;
                    while (p) {
                        if (p.tagName === 'RT') return NodeFilter.FILTER_REJECT;
                        if (p.classList && p.classList.contains('wol-char-pinyin')) return NodeFilter.FILTER_REJECT;
                        if (p.tagName === 'RUBY') break;
                        p = p.parentElement;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
                const pfo = { acceptNode: pinyinFilter };
                function getTextContent(node) {
                    let text = '';
                    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, pfo);
                    while (walker.nextNode()) text += walker.currentNode.textContent;
                    return text;
                }
                function highlightTextInElement(element, searchText, highlight) {
                    const fullText = getTextContent(element);
                    const index = fullText.indexOf(searchText);
                    if (index === -1) return false;
                    const range = document.createRange();
                    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, pfo);
                    let currentLength = 0, startNode = null, startOffset = 0, endNode = null, endOffset = 0;
                    while (walker.nextNode()) {
                        const node = walker.currentNode, nodeLength = node.textContent.length;
                        if (startNode === null && currentLength + nodeLength > index) { startNode = node; startOffset = index - currentLength; }
                        if (currentLength + nodeLength >= index + searchText.length) { endNode = node; endOffset = (index + searchText.length) - currentLength; break; }
                        currentLength += nodeLength;
                    }
                    if (startNode && endNode) {
                        try { range.setStart(startNode, startOffset); range.setEnd(endNode, endOffset); smartHighlight(range, highlight.color, true); return true; }
                        catch (e) { return false; }
                    }
                    return false;
                }
                const articleContainer = container.querySelector('#article, .article, #content, .synopsis') || container;
                const paragraphs = Array.from(articleContainer.querySelectorAll('div[data-pid], p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4'))
                    .filter(el => !el.closest('.documentNavigation, .noTooltips'));
                highlights.forEach(highlight => {
                    if (container.querySelector(`span[data-highlight-id="${highlight.id}"]`)) return;
                    for (let i = 0; i < paragraphs.length; i++) {
                        if (paragraphs[i].querySelector(`span[data-highlight-id="${highlight.id}"]`)) continue;
                        if (highlightTextInElement(paragraphs[i], highlight.text, highlight)) break;
                    }
                });
            }
        };
    });
}

// ─────────────────────────────────────────────────────────────
// EXPORT / IMPORT / CLEAR
// ─────────────────────────────────────────────────────────────
function exportHighlights() {
    if (!db) { alert(t('dbNotReady')); return; }
    const transaction = db.transaction(['highlights'], 'readonly');
    const store = transaction.objectStore('highlights');
    const request = store.getAll();
    request.onsuccess = () => {
        const allData = request.result;
        if (allData.length === 0) { alert(t('noHighlights')); return; }
        const combined = { pinyin: {}, highlights: allData };
        const blob = new Blob([JSON.stringify(combined, null, 2)], { type: 'application/json' });
        const filename = prompt(t('promptFilename'));
        if (!filename) return;
        const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';
        blob.text().then(text => {
            const file = new File([text], finalFilename, { type: 'application/json' });
            if (navigator.share) navigator.share({ files: [file], title: 'WOL Highlights Export' }).catch(() => {});
        });
        alert(t('exported', allData.length));
    };
}

function importHighlights() {
    if (!db) { alert(t('dbNotReady')); return; }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onerror = () => alert(t('errorReading', reader.error));
        reader.onload = (event) => {
            try {
                const raw = JSON.parse(event.target.result);
                const hlData = Array.isArray(raw) ? raw : (Array.isArray(raw.highlights) ? raw.highlights : null);
                if (!hlData) { alert(t('invalidFormat')); return; }
                const transaction = db.transaction(['highlights'], 'readwrite');
                const store = transaction.objectStore('highlights');
                let imported = 0, errors = 0;
                hlData.forEach(item => { if (item.pageID && item.highlights) { try { store.put(item); imported++; } catch (err) { errors++; } } });
                transaction.oncomplete = () => { alert(t('imported', imported, errors)); setTimeout(() => window.location.reload(), 300); };
                transaction.onerror = () => alert(t('errorReading', transaction.error));
            } catch (err) { alert(t('errorReading', err.message)); }
        };
        setTimeout(() => reader.readAsText(file), 300);
    };
    input.click();
}

function clearAllHighlights() {
    if (!db) { alert(t('dbNotReady')); return; }
    if (!confirm(t('confirmClear'))) return;
    const transaction = db.transaction(['highlights'], 'readwrite');
    const store = transaction.objectStore('highlights');
    store.clear().onsuccess = () => { alert(t('allCleared')); setTimeout(() => window.location.reload(), 300); };
}

// ─────────────────────────────────────────────────────────────
// TOOLTIP PALETTE
// ─────────────────────────────────────────────────────────────
function addPaletteToTooltip(tooltip) {
    if (tooltip.querySelector('.hl_tooltip_palette')) return;
    const tooltipHeader = tooltip.querySelector('.tooltipHeader');
    if (!tooltipHeader) return;
    tooltipHeader.style.cssText = 'display:flex !important;align-items:center !important;justify-content:flex-start !important;flex-wrap:nowrap !important;gap:0 !important;';
    const tooltipType = tooltipHeader.querySelector('.tooltipType');
    if (tooltipType) tooltipType.style.display = 'none';
    const tooltipPalette = document.createElement('div');
    tooltipPalette.className = 'hl_tooltip_palette';
    tooltipPalette.style.cssText = 'display:flex !important;align-items:center;gap:6px;padding:4px 8px;flex-shrink:0;order:-1;';
    hlColors.forEach(c => {
        const btn = document.createElement('div');
        btn.style.cssText = `width:16px;height:16px;border-radius:50%;cursor:pointer;border:1px solid #999;background:${c === '#fff176' ? '#ffd600' : c};flex-shrink:0;`;
        btn.addEventListener('touchend', e => {
            e.preventDefault(); e.stopPropagation();
            if (!currentRange) { alert(t('selectFirst')); return; }
            const rangeToHighlight = currentRange.cloneRange();
            currentRange = null;
            window.getSelection && window.getSelection().removeAllRanges();
            try { smartHighlight(rangeToHighlight, c); } catch (err) { alert(t('selectionComplex', err.message)); }
        }, { passive: false });
        tooltipPalette.appendChild(btn);
    });
    const tooltipClose = tooltipHeader.querySelector('.tooltipClose');
    if (tooltipClose) { tooltipClose.style.cssText = 'flex-shrink:0;margin-left:auto;order:999;'; tooltipHeader.insertBefore(tooltipPalette, tooltipClose); }
    else tooltipHeader.appendChild(tooltipPalette);
}

new MutationObserver(mutations => {
    mutations.forEach(m => {
        m.addedNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.classList && (node.classList.contains('tooltip') || node.classList.contains('tooltipContainer'))) {
                setTimeout(() => { restoreHighlights(node); addPaletteToTooltip(node); }, 100);
            }
            node.querySelectorAll && node.querySelectorAll('.tooltip, .tooltipContainer').forEach(tip => {
                setTimeout(() => { restoreHighlights(tip); addPaletteToTooltip(tip); }, 100);
            });
        });
    });
}).observe(document.body, { childList: true, subtree: true });

// ─────────────────────────────────────────────────────────────
// PHOTOSWIPE ALT TEXT
// ─────────────────────────────────────────────────────────────
const imageAltTextMap = new Map();
let pswpActive = false, currentAltDiv = null;

function resetPSWP(pswp, obs1, obs2) {
    if (obs1) obs1.disconnect(); if (obs2) obs2.disconnect();
    pswpActive = false; currentAltDiv = null;
    pswp.querySelectorAll('#pswp-alt-text-display').forEach(d => { d.style.opacity = '0'; setTimeout(() => d.remove(), 200); });
}
function displayAltText(pswp) {
    if (!pswpActive) return;
    const last = imageAltTextMap.get('lastClicked'); if (!last) return;
    const altDiv = currentAltDiv || pswp.querySelector('#pswp-alt-text-display'); if (!altDiv) return;
    const img = pswp.querySelector('.pswp__img:not(.pswp__img--placeholder)'); if (!img) return;
    altDiv.textContent = last.altText;
    const show = () => {
        if (!pswpActive || !img.offsetHeight) return;
        const top = Math.max(img.getBoundingClientRect().top - pswp.getBoundingClientRect().top - altDiv.offsetHeight - 10, 30);
        altDiv.style.top = top + 'px'; altDiv.style.visibility = 'visible';
        requestAnimationFrame(() => { altDiv.style.opacity = '1'; });
    };
    const wait = () => {
        if (img.complete && img.naturalWidth > 0 && img.offsetHeight > 0) {
            const c = pswp.querySelector('.pswp__container'); let fired = false;
            const trigger = () => { if (fired) return; fired = true; requestAnimationFrame(show); };
            if (c) c.addEventListener('transitionend', trigger, { once: true });
            setTimeout(trigger, 50);
        } else img.addEventListener('load', wait, { once: true });
    };
    wait();
}
function handlePSWPOpen(pswp) {
    resetPSWP(pswp); pswpActive = true;
    const altDiv = document.createElement('div');
    altDiv.id = 'pswp-alt-text-display';
    altDiv.style.cssText = 'position:absolute;left:12px;right:12px;background:rgba(0,0,0,0.85);color:#fff;padding:8px 12px;border-radius:6px;font-size:15px;line-height:1.5;max-width:calc(100% - 24px);z-index:10050;font-family:-apple-system,sans-serif;pointer-events:auto;user-select:text;visibility:hidden;opacity:0;transition:opacity 0.2s ease;';
    pswp.appendChild(altDiv); currentAltDiv = altDiv;
    const c = pswp.querySelector('.pswp__container');
    if (c) {
        const obs1 = new MutationObserver(() => { if (pswpActive) displayAltText(pswp); });
        obs1.observe(c, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        const obs2 = new MutationObserver(() => { if (!pswp.classList.contains('pswp--open')) resetPSWP(pswp, obs1, obs2); });
        obs2.observe(pswp, { attributes: true, attributeFilter: ['class'] });
    }
    displayAltText(pswp);
}
document.addEventListener('touchend', e => {
    const img = e.target.tagName === 'IMG' ? e.target : e.target.querySelector('img');
    if (img && (img.alt || img.title)) imageAltTextMap.set('lastClicked', { altText: img.alt || img.title });
}, { passive: true });
new MutationObserver(mutations => {
    mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'class') {
            const pswp = m.target;
            if (pswp.classList.contains('pswp') && pswp.classList.contains('pswp--open')) handlePSWPOpen(pswp);
        }
    });
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

// ─────────────────────────────────────────────────────────────
// QU COLLAPSE BLOCK when palette open
// ─────────────────────────────────────────────────────────────
document.addEventListener('touchstart', (e) => {
    if (!document.getElementById('wol_hl_float_palette')) return;
    if (e.target.closest('p.qu')) e.stopImmediatePropagation();
}, { capture: true, passive: true });

// ─────────────────────────────────────────────────────────────
// HL ICON PERSISTENCE
// ─────────────────────────────────────────────────────────────
let _iconTimer = null;
new MutationObserver(() => {
    if (_iconTimer) return;
    _iconTimer = setTimeout(() => { _iconTimer = null; if (!document.getElementById('wol_hl_icon_btn')) buildHighlightIconBtn(); }, 150);
}).observe(document.body, { childList: true, subtree: true });

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
(function waitForMenuBar() {
    if (document.getElementById('menuBar')) buildHighlightIconBtn();
    else { const poll = setInterval(() => { if (document.getElementById('menuBar')) { clearInterval(poll); buildHighlightIconBtn(); } }, 200); }
})();

initDB().then(() => {
    restoreHighlights(document.body);
    setTimeout(() => restoreHighlights(document.body), 800);
    setTimeout(() => restoreHighlights(document.body), 2000);
}).catch(err => console.error('WOL Highlighter: IndexedDB init failed:', err));

})();
