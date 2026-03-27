// ==UserScript==
// @name         WOL Unified (Pinyin · Highlighter · Sync · Question Boxes)
// @namespace    wol-unified
// @version      2.6
// @description  Study/pinyin mode, 3-colour highlighter, ENG/KOR/JPN/SPA↔CHS sync, reference symbol persistence, grey question boxes — merged into one script
// @match        https://wol.jw.org/*
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/javalan/userscripts/main/Study_chinese.js
// @downloadURL  https://raw.githubusercontent.com/javalan/userscripts/main/Study_chinese.js
// @grant        unsafeWindow
// @require      https://apple.helioho.st/Study_chinese_version.js
// ==/UserScript==

// ─────────────────────────────────────────────────────────────
// 0. PRE-HIDE RUBY (must run before everything else)
// ─────────────────────────────────────────────────────────────
(function preHideRuby() {
    if (localStorage.getItem('wol_app_mode') !== 'study') return;
    const s = document.createElement('style');
    s.id = 'wol_prehide_ruby';
    s.textContent = 'ruby rt { opacity: 0 !important; transition: none !important; }';
    document.head.appendChild(s);
    window.addEventListener('load', () => {
        setTimeout(() => {
            const el = document.getElementById('wol_prehide_ruby');
            if (el) el.remove();
        }, 500);
    });
})();

(function() {
    'use strict';

    const CURRENT_VERSION = "2.6";

    function compareVersions(local, remote) {
        const l = local.split('.').map(Number);
        const r = remote.split('.').map(Number);
        for (let i = 0; i < Math.max(l.length, r.length); i++) {
            const li = l[i] || 0;
            const ri = r[i] || 0;
            if (li < ri) return -1;
            if (li > ri) return 1;
        }
        return 0;
    }

    const _lang = (() => {
        const l = (navigator.language || navigator.userLanguage || '').toLowerCase();
        if (l.startsWith('ko')) return 'ko';
        if (l.startsWith('ja')) return 'ja';
        if (l.startsWith('es')) return 'es';
        return 'en';
    })();

    function showUpdateToast(versionData) {
        if (localStorage.getItem('study_chinese_update_' + versionData.version)) return;

        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%) translateY(50px)';
        toast.style.backgroundColor = '#f2f2f7';
        toast.style.border = '1px solid #c1c1c1';
        toast.style.borderRadius = '6px';
        toast.style.boxShadow = '0 3px 10px rgba(0,0,0,0.15)';
        toast.style.padding = '16px 18px';
        toast.style.zIndex = '999999';
        toast.style.width = '180px';
        toast.style.display = 'flex';
        toast.style.flexDirection = 'column';
        toast.style.alignItems = 'center';
        toast.style.gap = '8px';
        toast.style.fontFamily = 'system-ui, sans-serif';
        toast.style.fontSize = '14px';
        toast.style.color = '#1a1a1a';
        toast.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        toast.style.opacity = '0';

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '✕';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '4px';
        closeBtn.style.right = '6px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontWeight = 'bold';
        closeBtn.style.fontSize = '24px';
        closeBtn.onclick = () => {
            toast.remove();
            localStorage.setItem('study_chinese_update_' + versionData.version, 'true');
        };
        toast.appendChild(closeBtn);

        const textContainer = document.createElement('div');
        textContainer.style.textAlign = 'center';

        const heading = document.createElement('div');
        heading.textContent = 'STUDY CHINESE';
        heading.style.fontWeight = 'bold';
        heading.style.fontSize = '16px';
        heading.style.textTransform = 'uppercase';
        textContainer.appendChild(heading);

        const updateLabels = {
            en: 'Update available 🔔',
            ko: '업데이트 가능 🔔',
            ja: 'アップデートあり 🔔',
            es: 'Actualización disponible 🔔',
        };
        const watchLabels = {
            en: '▶  How to update',
            ko: '▶  업데이트 방법',
            ja: '▶  更新方法',
            es: '▶  Cómo actualizar',
        };
        const subheading = document.createElement('div');
        subheading.textContent = updateLabels[_lang] || updateLabels.en;
        subheading.style.fontWeight = 'normal';
        subheading.style.fontSize = '14px';
        textContainer.appendChild(subheading);
        toast.appendChild(textContainer);

        const videoBtn = document.createElement('button');
        videoBtn.textContent = watchLabels[_lang] || watchLabels.en;
        videoBtn.style.padding = '10px 14px';
        videoBtn.style.backgroundColor = '#4a90e2';
        videoBtn.style.color = 'white';
        videoBtn.style.border = 'none';
        videoBtn.style.borderRadius = '4px';
        videoBtn.style.cursor = 'pointer';
        videoBtn.style.fontWeight = '500';
        videoBtn.style.fontSize = '14px';
        videoBtn.style.alignSelf = 'center';
        videoBtn.onclick = () => {
            if (versionData.install_video) {
                openFullscreenVideo(versionData.install_video);
            } else {
                alert('No video URL available.');
            }
        };
        toast.appendChild(videoBtn);

        if (document.body) document.body.appendChild(toast);
        else window.addEventListener('load', () => document.body.appendChild(toast));

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        });
    }

    // ── Reusable fullscreen video modal ──
    function openFullscreenVideo(videoURL) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0,0,0,0.9)';
        modal.style.zIndex = '2147483647'; // maximum possible z-index
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.flexDirection = 'column';

        // Spinner CSS (inject only once)
        if (!document.getElementById('modal-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'modal-spinner-style';
            style.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        // Spinner element
        const spinner = document.createElement('div');
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.border = '5px solid rgba(255,255,255,0.3)';
        spinner.style.borderTopColor = 'white';
        spinner.style.borderRadius = '50%';
        spinner.style.animation = 'spin 1s linear infinite';
        modal.appendChild(spinner);

        // Video element
        const video = document.createElement('video');
        video.src = videoURL;
        video.controls = true;
        video.autoplay = true;
        video.setAttribute('playsinline', '');
        video.style.width = '100%';
        video.style.maxWidth = '900px';
        video.style.display = 'none';
        video.style.borderRadius = '6px';
        video.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
        modal.appendChild(video);

        // Add modal to DOM
        document.body.appendChild(modal);

        // ── IMMEDIATE: hide version reminder ──
        const versionContainer = document.getElementById('versionReminder');
        if (versionContainer) {
            versionContainer.style.display = 'none';
            versionContainer.style.zIndex = '-1'; // belt and suspenders
        }

        let isLoading = true;
        let timeoutTimer = setTimeout(() => {
            if (isLoading) {
                alert('Video loading timed out. Please try again.');
                closeModal();
            }
        }, 15000);

        // Close modal function (restores version reminder)
        const closeModal = () => {
            video.pause();
            if (modal.parentNode) modal.remove();
            if (versionContainer) {
                versionContainer.style.display = 'block';
                versionContainer.style.zIndex = ''; // restore original z-index
            }
        };

        // Exit fullscreen closes modal
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) closeModal();
        });
        video.addEventListener('webkitendfullscreen', closeModal);

        // Click outside video closes modal
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal();
        });

        // When metadata loads, hide spinner and request fullscreen
        video.addEventListener('loadedmetadata', () => {
            isLoading = false;
            clearTimeout(timeoutTimer);

            // Hide spinner immediately
            spinner.style.display = 'none';

            const showFallback = () => {
                video.style.display = 'block';
                video.style.opacity = '1';
            };

            const isDesktop = !/iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isDesktop) {
                video.style.display = 'block';
                video.style.opacity = '1'; // show immediately
                video.style.position = 'fixed';
                video.style.top = '0';
                video.style.left = '0';
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.zIndex = '9999';
                video.style.backgroundColor = 'black';
                video.setAttribute('controls', '');
            }

            // iOS fullscreen behavior
            if (video.webkitEnterFullscreen) {
                video.webkitEnterFullscreen(); // iOS Safari — synchronous
            } else if (video.requestFullscreen) {
                video.requestFullscreen().catch(showFallback);
            } else if (video.webkitRequestFullscreen) {
                video.webkitRequestFullscreen().catch(showFallback);
            } else {
                showFallback(); // fallback if no fullscreen API
            }
        });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Version check using @require file (no fetch, CSP safe)
    // ─────────────────────────────────────────────────────────────
    (function checkVersion() {

        if (!window.STUDY_CHINESE_VERSION) return;

        const data = window.STUDY_CHINESE_VERSION;

        const local = String(CURRENT_VERSION);
        const remote = String(data.version);

        console.log("LOCAL:", local);
        console.log("REMOTE:", remote);

        if (compareVersions(local, remote) < 0) {
            showUpdateToast(data);
        }

    })();

    // ─────────────────────────────────────────────────────────────
    // 1. CONSTANTS & SHARED STATE
    // ─────────────────────────────────────────────────────────────
    const MODE_KEY = 'wol_app_mode'; // 'default' | 'study'
    const HASH_KEY = 'wol_last_hash';
    const LEVEL_KEY = 'pinyinLevel_global';
    const COMPACT_KEY = 'pinyinCompact_global';
    const PLAYBACK_KEY = 'wol_playback_focus_enabled';
    const FONT_SIZE_KEY = 'wol_remembered_font_size';
    const FONT_SIZE_REMEMBER_KEY = 'wol_remember_font_size_enabled';
    const STORAGE_KEY_REFERENCE = 'wol_reference_symbols_enabled';
    const STORAGE_KEY_PINYIN = 'wol_sync_pinyin_enabled';
    const STORAGE_KEY_ENG_CHS_SYNC = 'wol_eng_chs_sync_enabled';
    const PANEL_OPEN_GUARD_MS = 600;

    const safeWindow = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;

    function getCanonicalArticleKey(pathname) {
        const bibleMatch = pathname.match(/\/(?:b|bsync)\/[^\/]+\/[^\/]+\/(\d+)\/(\d+)/);
        if (bibleMatch) return 'pinyinProgress_bible_' + bibleMatch[1] + '_' + bibleMatch[2];
        const idMatch = pathname.match(/\/(\d+)(?:\/\d+)*\/?$/);
        if (idMatch) return 'pinyinProgress_article_' + idMatch[1];
        return 'pinyinProgress_' + pathname;
    }

    function migrateOldPinyinKeys() {
        if (localStorage.getItem('wol_pinyin_migrated_v2')) return;
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('pinyinProgress_')) continue;
            if (key.startsWith('pinyinProgress_article_') || key.startsWith('pinyinProgress_bible_')) continue;
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (!data || !Object.keys(data).length) continue;
                const pathPart = key.replace('pinyinProgress_', '');
                const newKey = getCanonicalArticleKey(pathPart);
                if (newKey === key) continue;
                const existing = JSON.parse(localStorage.getItem(newKey) || '{}');
                localStorage.setItem(newKey, JSON.stringify({ ...existing, ...data }));
                localStorage.removeItem(key);
            } catch(e) {}
        }
        localStorage.setItem('wol_pinyin_migrated_v2', 'true');
    }
    migrateOldPinyinKeys();

    const PINYIN_STORAGE_KEY = getCanonicalArticleKey(location.pathname);

    let savedProgress = JSON.parse(localStorage.getItem(PINYIN_STORAGE_KEY) || '{}');
    let level = localStorage.getItem(LEVEL_KEY) || 'advanced';
    if (localStorage.getItem(COMPACT_KEY) === 'true' && level === 'advanced') {
        level = 'compact';
        localStorage.setItem(LEVEL_KEY, 'compact');
        localStorage.removeItem(COMPACT_KEY);
    }
    let compact = (level === 'compact');

    // IndexedDB — shared by highlighter and pinyin export/import
    let db = null;

    function getMode() { return localStorage.getItem(MODE_KEY) || 'default'; }
    function setMode(m) { localStorage.setItem(MODE_KEY, m); }
    function getPlaybackEnabled() { return localStorage.getItem(PLAYBACK_KEY) === 'true'; }
    function setPlaybackEnabled(v) { localStorage.setItem(PLAYBACK_KEY, v ? 'true' : 'false'); }

const T = {
        studyMode:        { en: 'Preparing study mode…', ko: '학습 모드 준비 중…', ja: '学習モードを準備中…', es: 'Preparando modo de estudio…' },
        regularMode:      { en: 'Switching to regular mode…', ko: '일반 모드로 전환 중…', ja: 'レギュラーモードに切替中…', es: 'Cambiando a modo regular…' },
        dailyText:        { en: 'Preparing daily text…', ko: '오늘의 성구 준비 중…', ja: 'テキストを準備中…', es: 'Preparando texto del día…' },
        watchtower:       { en: 'Preparing Watchtower…', ko: '파수대 준비 중…', ja: '塔の見張り準備中…', es: 'Preparando La Atalaya…' },
        modeTitle:        { en: 'Mode', ko: '모드', ja: 'モード', es: 'Modo' },
        modeRegular:      { en: 'Regular', ko: '일반', ja: 'レギュラー', es: 'Regular' },
        modeStudy:        { en: 'Study 汉字', ko: '학습 汉字', ja: '学習 汉字', es: 'Estudio 汉字' },
        levelTitle:       { en: 'Level', ko: '레벨', ja: 'レベル', es: 'Nivel' },
        levelBeginner:    { en: 'Beginner', ko: '초급', ja: '初級', es: 'Principiante' },
        levelAdvanced:    { en: 'Advanced', ko: '고급', ja: '上級', es: 'Avanzado' },
        levelCompact:     { en: 'Compact', ko: '컴팩트', ja: 'コンパクト', es: 'Compacto' },
        quickLinks:       { en: 'Quick Links', ko: '빠른 링크', ja: 'クイックリンク', es: 'Accesos rápidos' },
        navDailyText:     { en: 'Daily Text', ko: '오늘의 성구', ja: 'デイリーテキスト', es: 'Texto del día' },
        navWatchtower:    { en: 'Watchtower', ko: '파수대', ja: '塔の見張り', es: 'La Atalaya' },
        syncTitle:        { en: 'Direct Sync', ko: '직접 동기화', ja: 'ダイレクト同期', es: 'Sincronización directa' },
        syncPinyin:       { en: 'Sync Pinyin', ko: '병음 동기화', ja: 'ピンイン同期', es: 'Sincronizar Pinyin' },
        playback:         { en: 'Inline audio playback', ko: '인라인 오디오 재생', ja: 'インライン音声再生', es: 'Reproducción de audio' },
        resetPage:        { en: '↺  Reset pinyin this page', ko: '↺  이 페이지 병음 초기화', ja: '↺  このページのピンインをリセット', es: '↺  Restablecer pinyin esta página' },
        resetAll:         { en: '⚠  Reset pinyin ALL pages', ko: '⚠  모든 페이지 병음 초기화', ja: '⚠  全ページのピンインをリセット', es: '⚠  Restablecer pinyin todas las páginas' },
        inclHighlights:   { en: 'Include highlights', ko: '형광펜 포함', ja: 'ハイライトも含む', es: 'Incluir marcados' },
        exportPinyin:     { en: '↑  Export pinyin + highlights', ko: '↑  병음 + 형광펜 내보내기', ja: '↑  ピンイン＋ハイライトを書き出す', es: '↑  Exportar pinyin + marcados' },
        importPinyin:     { en: '↓  Import pinyin + highlights', ko: '↓  병음 + 형광펜 가져오기', ja: '↓  ピンイン＋ハイライトを読み込む', es: '↓  Importar pinyin + marcados' },
        exportHL:         { en: '↑  Export highlights', ko: '↑  형광펜 내보내기', ja: '↑  ハイライトを書き出す', es: '↑  Exportar marcados' },
        importHL:         { en: '↓  Import highlights', ko: '↓  형광펜 가져오기', ja: '↓  ハイライトを読み込む', es: '↓  Importar marcados' },
        clearHL:          { en: '🗑  Clear all highlights', ko: '🗑  모든 형광펜 지우기', ja: '🗑  ハイライトをすべて消去', es: '🗑  Borrar todos los marcados' },
        confirmResetPage: { en: 'Reset pinyin progress for this article?', ko: '이 글의 병음 학습을 초기화할까요?', ja: 'この記事のピンイン進捗をリセットしますか？', es: '¿Restablecer el progreso de pinyin de este artículo?' },
        confirmResetAll:  { en: 'Delete pinyin progress for ALL articles? This cannot be undone.', ko: '모든 글의 병음 학습을 삭제할까요? 되돌릴 수 없습니다.', ja: 'すべての記事のピンイン進捗を削除しますか？この操作は元に戻せません。', es: '¿Eliminar el progreso de pinyin de TODOS los artículos? Esta acción no se puede deshacer.' },
        confirmResetHL:   { en: 'Also delete ALL highlights? This cannot be undone.', ko: '모든 형광펜도 삭제할까요? 되돌릴 수 없습니다.', ja: 'ハイライトもすべて削除しますか？この操作は元に戻せません。', es: '¿Eliminar también TODOS los marcados? Esta acción no se puede deshacer.' },
        confirmClearHL:   { en: 'Delete all highlights?', ko: '모든 형광펜을 삭제할까요?', ja: 'ハイライトをすべて削除しますか？', es: '¿Eliminar todos los marcados?' },
        promptExportName: { en: 'Enter a file name for the export:', ko: '내보낼 파일 이름을 입력하세요:', ja: 'ファイル名を入力してください：', es: 'Introduce un nombre para el archivo:' },
        promptExportHL:   { en: 'Enter filename for export:', ko: '내보낼 파일 이름:', ja: 'ファイル名を入力：', es: 'Nombre del archivo de exportación:' },
        noExportData:     { en: 'No pinyin or highlights to export.', ko: '내보낼 병음이나 형광펜이 없습니다.', ja: '書き出すデータがありません。', es: 'No hay pinyin ni marcados para exportar.' },
        exportedHL:       { en: (n) => `Exported ${n} page${n===1?'':'s'} with highlights`, ko: (n) => `형광펜 ${n}페이지 내보내기 완료`, ja: (n) => `${n}ページのハイライトを書き出しました`, es: (n) => `${n} página${n===1?'':'s'} exportada${n===1?'':'s'}` },
        importedHL:       { en: (n,e) => `Imported ${n} pages${e>0?` (${e} errors)`:''}`, ko: (n,e) => `${n}페이지 가져오기 완료${e>0?` (오류 ${e}건)`:''}`, ja: (n,e) => `${n}ページを読み込みました${e>0?`（エラー${e}件）`:''}`, es: (n,e) => `${n} páginas importadas${e>0?` (${e} errores)`:''}` },
        allHLCleared:     { en: 'All highlights cleared', ko: '모든 형광펜을 지웠습니다', ja: 'ハイライトをすべて消去しました', es: 'Todos los marcados eliminados' },
        importSuccess:    { en: 'Import successful.', ko: '가져오기가 완료되었습니다.', ja: '読み込みが完了しました。', es: 'Importación completada.' },
        invalidJSON:      { en: 'Invalid JSON file.', ko: '잘못된 JSON 파일입니다.', ja: '無効なJSONファイルです。', es: 'Archivo JSON no válido.' },
        dbNotReady:       { en: 'Database not ready', ko: '데이터베이스 준비 중', ja: 'データベース準備中', es: 'Base de datos no lista' },
        noHLExport:       { en: 'No highlights to export', ko: '내보낼 형광펜이 없습니다', ja: '書き出すハイライトがありません', es: 'No hay marcados para exportar' },
        invalidFormat:    { en: 'Invalid file format', ko: '잘못된 파일 형식', ja: '無効なファイル形式', es: 'Formato de archivo no válido' },
        pinyinFound:      { en: 'Pinyin progress found in this file — import it too?', ko: '이 파일에 병음 학습 데이터가 있습니다 — 함께 가져올까요?', ja: 'このファイルにピンインデータがあります — 一緒に読み込みますか？', es: '¿Este archivo contiene progreso de pinyin — importarlo también?' },
        speed:            { en: 'SPEED', ko: '속도', ja: 'スピード', es: 'VELOCIDAD' },
        whatsNewTitle:    { en: 'How to use', ko: '사용 방법', ja: '使い方', es: 'Cómo usarlo' },
        whatsNew:         { en: '▶  Watch video', ko: '▶  동영상 보기', ja: '▶  動画を見る', es: '▶  Ver video' },
        selectFirst:      { en: 'Select text first', ko: '먼저 텍스트를 선택하세요', ja: 'テキストを先に選択してください', es: 'Primero selecciona el texto' },
        linkNotFound:     { en: 'Link not found on this page.', ko: '이 페이지에서 링크를 찾을 수 없습니다.', ja: 'このページにリンクが見つかりません。', es: 'Enlace no encontrado en esta página.' },
        noWatchtower:     { en: 'Could not find Watchtower link.', ko: '파수대 링크를 찾을 수 없습니다.', ja: '塔の見張りのリンクが見つかりません。', es: 'No se encontró el enlace de La Atalaya.' },
        noDailyText:      { en: 'Could not find Daily Text link.', ko: '오늘의 성구 링크를 찾을 수 없습니다.', ja: 'テキストのリンクが見つかりません。', es: 'No se encontrado el enlace del texto del día.' },
    };

    // t(key, ...args) — look up translated string
    function t(key, ...args) {
        const entry = T[key];
        if (!entry) return key;
        const val = entry[_lang] || entry.en;
        return typeof val === 'function' ? val(...args) : val;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. PANEL CSS  (one combined block — deduplicates all three scripts)
    // ─────────────────────────────────────────────────────────────
    function injectAllStyles() {
        if (document.getElementById('wol_unified_styles')) return;
        const s = document.createElement('style');
        s.id = 'wol_unified_styles';
        s.textContent = `
/* ── Pinyin core ── */
ruby rt { transition: opacity 0.15s ease; cursor: pointer; }
body.wol-study-mode ruby { cursor: pointer; touch-action: manipulation; }
body.wol-study-mode ruby rt,
body.wol-study-mode ruby rt *,
body.wol-study-mode .wol-char-pinyin {
    -webkit-user-select: none; user-select: none; pointer-events: none;
}
body.wol-study-mode ruby rb,
body.wol-study-mode ruby rb * { -webkit-user-select: text; user-select: text; }
@media (hover: hover) and (pointer: fine) {
    body.wol-study-mode:not(.wol-highlighter-mode) ruby rb::selection,
    body.wol-study-mode:not(.wol-highlighter-mode) ruby rb *::selection { background: #b3d4ff; }
}
@media (hover: none) {
    body.wol-study-mode:not(.wol-highlighter-mode) ruby rb::selection,
    body.wol-study-mode:not(.wol-highlighter-mode) ruby rb *::selection { background: transparent; }
}
body.wol-study-mode .wol-char-wrap { -webkit-user-select: text; user-select: text; }
body.wol-study-mode ruby rb::selection,
body.wol-study-mode ruby *::selection,
body.wol-study-mode .wol-char-wrap::selection,
body.wol-study-mode .wol-char-wrap *::selection { background: #b3d4ff; }
body.wol-highlighter-mode .wol-char-wrap,
body.wol-highlighter-mode .wol-char-wrap > span,
body.wol-highlighter-mode ruby,
body.wol-highlighter-mode ruby rb {
    -webkit-user-select: text !important; user-select: text !important;
}
body.wol-highlighter-mode .wol-char-wrap::selection,
body.wol-highlighter-mode .wol-char-wrap *::selection { background: #b3d4ff; }
.jwac-textHighlight,
.jwac-textHighlight ruby,
.v.jwac-textHighlight,
.v.jwac-textHighlight ruby {
    background: none !important; outline: none !important;
    box-shadow: none !important; text-decoration: none !important;
}
body.wol-study-mode:not(.wol-audio-active) #contextMenu { display: none !important; pointer-events: none !important; }

/* ── Study icon button ── */
#wol_study_icon_btn {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; cursor: pointer;
    -webkit-user-select: none; user-select: none;
    -webkit-touch-callout: none; touch-action: manipulation;
    background: none; border: none; padding: 0; margin: 0; box-sizing: border-box;
}
#wol_study_icon_btn svg { width: 44px; height: 44px; display: block; pointer-events: none; }

/* ── Highlight icon button ── */
#wol_hl_icon_li {
    display: flex !important; align-items: center !important;
    justify-content: center !important; padding: 0 !important; margin: 0 !important; flex-shrink: 0 !important;
}
#wol_hl_icon_btn {
    display: flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; cursor: pointer;
    -webkit-user-select: none; user-select: none;
    -webkit-touch-callout: none; touch-action: manipulation;
    background: none; border: none; padding: 0; margin: 0; box-sizing: border-box;
}
#wol_hl_icon_btn svg { width: 28px; height: 28px; display: block; pointer-events: none; }

/* ── Unified drop-down panel ── */
#wol_mode_panel {
    position: fixed; background: #fff; border: 1px solid #d0d0d0;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
    z-index: 99999; min-width: 230px; display: none; overflow: hidden;
    opacity: 0; transform: translateY(-8px) scale(0.97);
    transition: opacity 0.22s cubic-bezier(.4,0,.2,1), transform 0.22s cubic-bezier(.4,0,.2,1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px; color: #1a1a1a;
}
#wol_mode_panel.pp-open { opacity: 1; transform: translateY(0) scale(1); }
#wol_mode_panel .pp-section { padding: 7px 14px 18px 14px; }
#wol_mode_panel .pp-divider { height: 1px; background: #e8e8e8; margin: -2px 0; }
#wol_mode_panel .pp-section-title {
    font-size: 10.5px; font-weight: 600; letter-spacing: 0.09em;
    text-transform: uppercase; color: #999; margin-bottom: 5px;
}
#wol_mode_panel .pp-radio-label {
    display: flex; align-items: center; gap: 10px;
    font-size: 15px; font-weight: 400; color: #1a1a1a;
    cursor: pointer; padding: 3px 4px; border-radius: 6px;
    transition: background 0.13s; -webkit-user-select: none; user-select: none;
}
#wol_mode_panel .pp-radio-label:hover { background: #f2f2f7; }
#wol_mode_panel .pp-radio-label:last-of-type { margin-bottom: 2px; }
#wol_mode_panel .pp-radio-label input[type="radio"],
#wol_mode_panel .pp-radio-label input[type="checkbox"] {
    width: 16px; height: 16px; margin: 0; accent-color: #4A90E2; cursor: pointer; flex-shrink: 0;
}
#wol_mode_panel .pp-btn {
    display: block; width: 100%; padding: 9px 14px; font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-weight: 400; color: #1a1a1a; background: transparent; border: none;
    text-align: left; cursor: pointer; transition: background 0.13s;
    box-sizing: border-box; white-space: nowrap;
}
#wol_mode_panel .pp-btn:hover { background: #f2f2f7; }
#wol_mode_panel .pp-btn.pp-danger { color: #c00; }
#wol_mode_panel .pp-btn.pp-danger:hover { background: #fff0f0; }
#wol_mode_panel .pp-btn.pp-nav {
    background: #ebebeb; color: #1a1a1a; border-radius: 7px;
    font-weight: 500; margin: 10px 14px; width: calc(100% - 28px); text-align: center;
}
#wol_mode_panel .pp-btn.pp-nav:hover { background: #dcdcdc; }

/* ── Toggle rows (sync panel) ── */
#wol_mode_panel .pp-toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 4px; border-radius: 6px;
    -webkit-user-select: none; user-select: none; cursor: default;
}
#wol_mode_panel .pp-toggle-row:hover { background: transparent; }
#wol_mode_panel .pp-toggle-label { font-size: 15px; font-weight: 400; color: #1a1a1a; pointer-events: none; }
#wol_mode_panel .pp-toggle-track {
    position: relative; width: 42px; height: 24px;
    background: #ccc; border-radius: 12px;
    transition: background 0.25s; flex-shrink: 0; cursor: pointer;
}
#wol_mode_panel .pp-toggle-track.on { background: #34C759; }
#wol_mode_panel .pp-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px; background: #fff; border-radius: 50%;
    transition: transform 0.25s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.22); pointer-events: none;
}
#wol_mode_panel .pp-toggle-track.on .pp-toggle-knob { transform: translateX(18px); }

/* ── Highlighter: keep rt transparent ── */
span[data-highlight-id] ruby rt { background-color: transparent !important; }
span[data-highlight-id] { border-radius: 2px; }

/* ── Context menu suppression ── */
body:not(.wol-study-mode):not(.wol-playback-enabled) #contextMenu {
    display: none !important; pointer-events: none !important;
}
body.wol-highlighter-mode:not(.wol-playback-enabled) #contextMenu {
    display: none !important; pointer-events: none !important;
}

/* ── Font size row ── */
#wol_fontsize_display {
    display: inline-block; min-width: 1.8em; text-align: center;
    font-size: 12px; font-weight: 600; color: #333; vertical-align: middle;
}
#wol_fontsize_combined_li .wol-lock-icon { font-size: 13px; cursor: pointer; line-height: 1; }
#wol_fontsize_combined_li {
    display: flex !important; align-items: center !important;
    height: auto !important; min-height: 1.75em;
}
#wol_fontsize_combined_li .wol-lock-group { margin-left: auto; margin-right: -18px; }
body.wol-compact ul.documentMenu li { line-height: 1.75 !important; }

/* ── Compact mode ── */
body.wol-compact p, body.wol-compact .sb, body.wol-compact .sc, body.wol-compact li,
body.wol-compact h1, body.wol-compact h2, body.wol-compact h3, body.wol-compact h4,
body.wol-compact .sl, body.wol-compact .sz, body.wol-compact .sm, body.wol-compact .sn {
    line-height: 3em !important;
}
body.wol-compact .sl, body.wol-compact .sz,
body.wol-compact .sm, body.wol-compact .sn { text-indent: 0 !important; padding-left: 0 !important; }
body.wol-compact .sl .v, body.wol-compact .sz .v,
body.wol-compact .sm .v, body.wol-compact .sn .v { display: inline-block !important; width: 100% !important; }
.wol-char-wrap {
    display: inline-block; position: relative; margin: 0; padding: 0;
    cursor: pointer; font-weight: inherit; touch-action: manipulation;
    -webkit-user-select: none; user-select: none;
}
.wol-char-wrap .wol-char-pinyin {
    display: block; position: absolute; bottom: 80%; margin-bottom: 1px;
    left: 50%; transform: translateX(-50%); white-space: nowrap;
    font-size: 0.8298755187em; line-height: 1.2; color: #444;
    pointer-events: none; -webkit-user-select: none; user-select: none;
    opacity: 0; transition: opacity 0.15s ease; z-index: 1;
}
.wol-char-wrap.pinyin-pinned .wol-char-pinyin { opacity: 1 !important; }
body.wol-highlighter-mode .wol-char-wrap { touch-action: auto; }
body.wol-compact ruby rt { display: none !important; }
.documentMenu ruby rt, .documentMenu ruby rb { display: inline !important; }

/* ── Verse highlight (grey, Original mode only) ── */
.v.jwac-textHighlight, p.jwac-textHighlight,
h1.jwac-textHighlight, h2.jwac-textHighlight,
h3.jwac-textHighlight, h4.jwac-textHighlight {
    background-color: rgba(200,200,200,0.45) !important;
    border-radius: 3px !important; padding: 0 !important;
    transition: background-color 0.18s ease !important;
    -webkit-box-decoration-break: clone !important;
    box-decoration-break: clone !important;
}
p.qu.jwac-textHighlight {
    background-color: rgba(200,200,200,0.45) !important;
    padding: 10px 12px !important; border-radius: 4px !important;
}
body.wol-study-mode .v.jwac-textHighlight,
body.wol-study-mode p.jwac-textHighlight,
body.wol-study-mode h1.jwac-textHighlight,
body.wol-study-mode h2.jwac-textHighlight,
body.wol-study-mode h3.jwac-textHighlight,
body.wol-study-mode h4.jwac-textHighlight,
body.wol-study-mode p.qu.jwac-textHighlight,
body.wol-highlighter-mode .v.jwac-textHighlight,
body.wol-highlighter-mode p.jwac-textHighlight,
body.wol-highlighter-mode h1.jwac-textHighlight,
body.wol-highlighter-mode h2.jwac-textHighlight,
body.wol-highlighter-mode h3.jwac-textHighlight,
body.wol-highlighter-mode h4.jwac-textHighlight,
body.wol-highlighter-mode p.qu.jwac-textHighlight {
    background-color: transparent !important;
    border-radius: 0 !important; padding: 0 !important;
    box-shadow: none !important; outline: none !important;
}
        `;
        document.head.appendChild(s);
    }
    injectAllStyles();

    // ── iOS/iPadOS detection ──
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // ── Hide publication nav bar and media controls on iOS in study mode ──
    (function injectIOSStudyStyles() {
        if (!isIOS) return;
        const s = document.createElement('style');
        s.id = 'wol_ios_study_styles';
        s.textContent = `
body.wol-study-mode #publicationNavigation,
body.wol-study-mode:not(.wol-player-visible) #playerwrapper {
    display: none !important;
}`;
        document.head.appendChild(s);
    })();


    // ─────────────────────────────────────────────────────────────
    // 3. SHARED PANEL FUNCTIONS
    // ─────────────────────────────────────────────────────────────
    let _modePanel = null;

    function getModePanel() {
        if (!_modePanel || !_modePanel.isConnected) {
            _modePanel = document.getElementById('wol_mode_panel');
            if (!_modePanel) {
                _modePanel = document.createElement('div');
                _modePanel.id = 'wol_mode_panel';
                document.body.appendChild(_modePanel);
            }
        }
        return _modePanel;
    }

    function getPanelOpenTime() { return safeWindow.__wolPanelOpenTime || 0; }

    // extraSectionsBuilder(panel) — optional callback to append extra sections
    // skipModeSection — if true, omit the Mode radio group (used by HL extras-only panel)
    function showPanel(anchorEl, extraSectionsBuilder, skipModeSection) {
        safeWindow.__wolPanelOpenTime = Date.now();
        const panel = getModePanel();
        panel.innerHTML = '';

        if (!skipModeSection) {
            const modeSection = document.createElement('div');
            modeSection.className = 'pp-section';
            const modeTitle = document.createElement('div');
            modeTitle.className = 'pp-section-title';
            modeTitle.textContent = t('modeTitle');
            modeSection.appendChild(modeTitle);

            const currentMode = getMode();
            [['default', t('modeRegular')], ['study', t('modeStudy')]].forEach(([val, label]) => {
                const lbl = document.createElement('label');
                lbl.className = 'pp-radio-label';
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'wol_mode_radio';
                radio.value = val;
                radio.checked = (currentMode === val);

                function handleModeSelect(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    radio.checked = true;
                    saveCurrentHash();
                    setMode(val);
                    hidePanel();
                    if (val === 'study') activateStudyMode();
                    else {
                        safeWindow.__wolModeChangePending = true;
                        showSyncToast(t('regularMode'));
                        setTimeout(() => {
                            const t = getRegularTarget(location.href);
                            if (t) location.href = t; else location.reload();
                        }, 1000);
                    }
                }

                lbl.addEventListener('mousedown', handleModeSelect, true);
                lbl.addEventListener('touchend', handleModeSelect, true);
                lbl.appendChild(radio);
                lbl.appendChild(document.createTextNode(label));
                modeSection.appendChild(lbl);
            });
            panel.appendChild(modeSection);
        }

        if (typeof extraSectionsBuilder === 'function') extraSectionsBuilder(panel);

        // ── "How to use" section — hidden by default, revealed by ℹ️ button ──
        if (!skipModeSection && getMode() === 'default') {
            // ── Add ℹ️ button to the mode section title row ──
            const modeSection = panel.querySelector('.pp-section');
            if (modeSection) {
                const modeTitle = modeSection.querySelector('.pp-section-title');
                if (modeTitle) {
                    modeTitle.style.display = 'flex';
                    modeTitle.style.alignItems = 'center';
                    modeTitle.style.justifyContent = 'space-between';

                    const infoBtn = document.createElement('span');
                    infoBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="12" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="14" cy="9" r="1.4" fill="currentColor"/>
                    <line x1="14" y1="13" x2="14" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>`;
                    infoBtn.style.cssText = 'display:inline-flex;align-items:center;cursor:pointer;opacity:1;transition:opacity 0.15s,transform 0.15s;flex-shrink:0;color:#666;-webkit-user-select:none;user-select:none;';
                    infoBtn.title = t('whatsNewTitle');
                    modeTitle.appendChild(infoBtn);

                    // Hidden expandable section
                    const wnDivider = document.createElement('div');
                    wnDivider.className = 'pp-divider';
                    wnDivider.style.cssText = 'height:1px;background:#e8e8e8;margin:-2px 0;overflow:hidden;max-height:0;transition:max-height 0.28s cubic-bezier(.4,0,.2,1),opacity 0.22s ease;opacity:0;';

                    const wnSection = document.createElement('div');
                    wnSection.style.cssText = 'padding:0;overflow:hidden;max-height:0;transition:max-height 0.28s cubic-bezier(.4,0,.2,1),opacity 0.22s ease,padding 0.22s ease;opacity:0;';

                    const wnInner = document.createElement('div');
                    wnInner.style.padding = '6px 0 20px 0';

                    const wnTitle = document.createElement('div');
                    wnTitle.className = 'pp-section-title';
                    wnTitle.style.padding = '6px 14px 2px 14px';
                    wnTitle.textContent = t('whatsNewTitle');
                    wnInner.appendChild(wnTitle);

                    const wnBtn = document.createElement('button');
                    wnBtn.className = 'pp-btn pp-nav';
                    wnBtn.textContent = t('whatsNew');
                    wnBtn.style.margin = '10px 14px 10px 14px';
                    wnBtn.addEventListener('click', () => {
                        hidePanel();
                        openFullscreenVideo('https://d1oegedfje2ody.cloudfront.net/Study_chinese.mp4');
                    });
                    wnInner.appendChild(wnBtn);
                    wnSection.appendChild(wnInner);

                    panel.appendChild(wnDivider);
                    panel.appendChild(wnSection);

                    let expanded = false;
                    function toggleHowToUse(e) {
                        e.preventDefault(); e.stopPropagation();
                        expanded = !expanded;
                        infoBtn.style.transform = expanded ? 'scale(1.15)' : 'scale(1)';
                        if (expanded) {
                            wnDivider.style.maxHeight = '2px';
                            wnDivider.style.opacity = '1';
                            wnSection.style.maxHeight = '90px';
                            wnSection.style.opacity = '1';
                        } else {
                            wnDivider.style.maxHeight = '0';
                            wnDivider.style.opacity = '0';
                            wnSection.style.maxHeight = '0';
                            wnSection.style.opacity = '0';
                        }
                        // Reposition panel after expansion
                        setTimeout(() => {
                            const pw = 240;
                            const rect = panel.getBoundingClientRect();
                            if (rect.bottom > window.innerHeight - 10) {
                                panel.style.top = Math.max(parseInt(panel.style.top) - (rect.bottom - window.innerHeight + 10), 4) + 'px';
                            }
                        }, 30);
                    }
                    infoBtn.addEventListener('click', toggleHowToUse);
                    infoBtn.addEventListener('touchend', toggleHowToUse, { passive: false });
                }
            }
        }

        panel.style.display = 'block';
        panel.getBoundingClientRect();

        const pw = 240;
        const rect = anchorEl.getBoundingClientRect();
        let left = rect.left, top = rect.bottom + 6;
        if (left + pw > window.innerWidth) left = window.innerWidth - pw - 10;
        if (left < 10) left = 10;
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.classList.add('pp-open');
        panel.onmouseleave = () => hidePanel();
    }

    function hidePanel() {
        const panel = document.getElementById('wol_mode_panel');
        if (!panel) return;
        panel.classList.remove('pp-open');
        setTimeout(() => {
            if (panel && !panel.classList.contains('pp-open')) panel.style.display = 'none';
        }, 230);
    }

    document.addEventListener('click', (e) => {
        if (Date.now() - getPanelOpenTime() < PANEL_OPEN_GUARD_MS) return;
        const panel = document.getElementById('wol_mode_panel');
        if (panel && !panel.contains(e.target)) hidePanel();
    });
    document.addEventListener('touchend', (e) => {
        if (Date.now() - getPanelOpenTime() < PANEL_OPEN_GUARD_MS) return;
        const panel = document.getElementById('wol_mode_panel');
        if (panel && panel.style.display !== 'none' && !panel.contains(e.target)) hidePanel();
    }, { passive: true });

    // Toggle row builder (used by sync panel section)
    function makeToggleRow(labelText, storageKey, defaultValue, onChange) {
        const row = document.createElement('div');
        row.className = 'pp-toggle-row';
        const lbl = document.createElement('span');
        lbl.className = 'pp-toggle-label';
        lbl.textContent = labelText;
        const track = document.createElement('div');
        track.className = 'pp-toggle-track';
        const knob = document.createElement('div');
        knob.className = 'pp-toggle-knob';
        track.appendChild(knob);
        const saved = localStorage.getItem(storageKey);
        const enabled = saved === null ? defaultValue : saved === 'true';
        if (enabled) track.classList.add('on');
        track.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const current = localStorage.getItem(storageKey);
            const newState = !(current === null ? defaultValue : current === 'true');
            localStorage.setItem(storageKey, newState.toString());
            track.classList.toggle('on', newState);
            if (onChange) onChange(newState);
        });
        row.appendChild(lbl);
        row.appendChild(track);
        return row;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. PINYIN / STUDY LOGIC  (from script1)
    // ─────────────────────────────────────────────────────────────

    // ── Close WOL document menu if open ──
    function closeDocumentMenuIfOpen() {
        const openMenu = Array.from(document.querySelectorAll('.documentMenu')).find(
            m => m.style.display && m.style.display !== 'none'
        );
        if (!openMenu) return;
        // Dispatch a bubbling click on body so WOL's own outside-click handler fires
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }

    // ── Syllable splitter ──
    function splitPinyinToSyllables(pinyin, charCount) {
        const p = pinyin.trim();
        if (charCount === 1) return [p];
        const syllableRe = /[A-ZÄÖÜ]?(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|n(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?/gi;
        const matches = p.match(syllableRe) || [];
        if (matches.length === charCount) return matches;
        const result = [];
        const step = p.length / charCount;
        for (let i = 0; i < charCount; i++) {
            result.push(p.slice(Math.round(i * step), Math.round((i + 1) * step)) || '');
        }
        return result;
    }

    // ── makeRubyKey ──
    function makeRubyKey(ruby) {
        const par = ruby.closest('[data-pid]');
        const pid = par ? par.getAttribute('data-pid') : null;
        if (!pid) return null;
        const verse = ruby.closest('span.v[id]');
        if (verse) {
            const pos = Array.from(verse.querySelectorAll('ruby')).indexOf(ruby);
            return pos === -1 ? null : 'r_' + pid + '_' + verse.id + '_' + pos;
        }
        const pos = Array.from(par.querySelectorAll('ruby')).indexOf(ruby);
        return pos === -1 ? null : 'r_' + pid + '_' + pos;
    }

    // ── Initial state ──
    function applyInitialState() {
        if (compact) {
            document.querySelectorAll('.wol-char-wrap').forEach(w => {
                const idx = w.getAttribute('data-idx');
                const pinned = idx !== null && savedProgress['compact_' + idx] === true;
                w.classList.toggle('pinyin-pinned', pinned);
                const p = w.querySelector('.wol-char-pinyin');
                if (p) p.style.opacity = pinned ? '1' : '0';
            });
        } else {
            document.querySelectorAll('ruby').forEach((ruby) => {
                const word = ruby.querySelector('rb')?.textContent;
                const rt = ruby.querySelector('rt');
                if (!word || !rt) return;
                if (level === 'beginner') {
                    rt.style.opacity = !savedProgress[word] ? '1' : '0';
                } else {
                    const rkey = makeRubyKey(ruby);
                    const pinned = rkey !== null && savedProgress[rkey] === true;
                    ruby.classList.toggle('pinyin-pinned', pinned);
                    rt.style.opacity = pinned ? '1' : '0';
                }
            });
        }
    }

    const fadeTimers = new WeakMap();



    function showPinyinTemporarily(wrap) {
        const p = wrap.querySelector('.wol-char-pinyin');
        if (!p) return;
        if (wrap.classList.contains('pinyin-pinned')) {
            wrap.classList.remove('pinyin-pinned');
            if (fadeTimers.has(wrap)) { clearTimeout(fadeTimers.get(wrap)); fadeTimers.delete(wrap); }
            p.style.opacity = '0';
            return;
        }
        p.style.opacity = '1';
        if (fadeTimers.has(wrap)) clearTimeout(fadeTimers.get(wrap));
        const timer = setTimeout(() => {
            if (!wrap.classList.contains('pinyin-pinned')) p.style.opacity = '0';
            fadeTimers.delete(wrap);
        }, 1000);
        fadeTimers.set(wrap, timer);
    }

    // ── Compact mode ──
    const compactSplitSpans = [];
    let _bannerBlockInstalled = false;

    function installBannerBlock() {
        if (_bannerBlockInstalled) return;
        _bannerBlockInstalled = true;
        let _lastTap = 0;
        document.addEventListener('touchend', (e) => {
            if (getMode() === 'default') return;
            if (e.target.closest('#wol_hl_float_palette')) return;
            if (e.target.closest('.wol-char-wrap')) return;
            if (e.target.closest('ruby')) return;
            if (e.touches.length > 0) return;
            const now = Date.now();
            const prev = _lastTap;
            _lastTap = now;
            if (now - prev < 350) {
                e.stopPropagation();
                _lastTap = 0;
            }
        }, { capture: true, passive: false });

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                if (getMode() !== 'study') return;
                setTimeout(() => {
                    ['#navHeader','#header','header','.navHeader'].forEach(sel => {
                        const el = document.querySelector(sel);
                        if (el && getComputedStyle(el).display === 'none') el.style.setProperty('display','','important');
                        if (el && getComputedStyle(el).visibility === 'hidden') el.style.setProperty('visibility','visible','important');
                    });
                    ['hideHeader','header-hidden','nav-hidden'].forEach(cls => {
                        if (document.body.classList.contains(cls)) document.body.classList.remove(cls);
                    });
                }, 300);
            });
        }
    }

    function makeCharWrap(ch, syllable, isBold) {
        const wrap = document.createElement('span');
        wrap.className = 'wol-char-wrap';
        wrap.setAttribute('data-char', ch);
        wrap.setAttribute('data-syllable', syllable);
        const pinyinSpan = document.createElement('span');
        pinyinSpan.className = 'wol-char-pinyin';
        pinyinSpan.textContent = syllable;
        const charSpan = document.createElement('span');
        charSpan.textContent = ch;
        wrap.appendChild(pinyinSpan);
        if (isBold) {
            const strong = document.createElement('strong');
            strong.appendChild(charSpan);
            wrap.appendChild(strong);
        } else {
            wrap.appendChild(charSpan);
        }
        return wrap;
    }

    let _selectStartInstalled = false;
    let _lastClickTime = 0;
    let _lastClickTarget = null;

    function installSelectStartBlock() {
        if (_selectStartInstalled) return;
        _selectStartInstalled = true;
        document.addEventListener('mousedown', (e) => {
            const now = Date.now();
            const target = e.target.closest('ruby, .wol-char-wrap');
            if (target && now - _lastClickTime < 400 && _lastClickTarget === target) e.preventDefault();
            _lastClickTime = now;
            _lastClickTarget = target;
        }, true);
        document.addEventListener('selectstart', (e) => {
            if (!document.body.classList.contains('wol-study-mode')) return;
            if (e.target.closest('.wol-char-wrap, ruby')) {
                if (Date.now() - _lastClickTime < 400) e.preventDefault();
            }
        });
    }

    function splitAndCompact() {
        document.body.classList.add('wol-compact');
        let wrapIdx = 0;
        document.querySelectorAll('ruby:not([data-compact-split])').forEach(ruby => {
            const rb = ruby.querySelector('rb'), rt = ruby.querySelector('rt');
            if (!rb || !rt) return;
            const chars = Array.from(rb.textContent);
            const syllables = splitPinyinToSyllables(rt.textContent, chars.length);
            const isBold = !!rb.querySelector('strong');
            const group = document.createElement('span');
            group.setAttribute('data-compact-group', 'true');
            group.setAttribute('data-original-ruby', ruby.outerHTML);
            group.style.cssText = 'display:inline;margin:0;padding:0;';
            if (chars.length > 1 && syllables.length === chars.length) {
                chars.forEach((ch, i) => {
                    const w = makeCharWrap(ch, syllables[i], isBold);
                    w.setAttribute('data-idx', wrapIdx++);
                    group.appendChild(w);
                });
            } else {
                const w = makeCharWrap(rb.textContent, rt.textContent.trim(), isBold);
                w.setAttribute('data-idx', wrapIdx++);
                group.appendChild(w);
            }
            ruby.replaceWith(group);
            compactSplitSpans.push(group);
        });
        attachClickHandlers();
        applyInitialState();
    }

    function restoreCompact() {
        // Unwrap any highlight spans before replacing DOM so the ruby elements
        // come back clean, then re-apply from DB to the fresh ruby DOM.
        document.querySelectorAll('span[data-highlight-id]').forEach(span => {
            const parent = span.parentNode; if (!parent) return;
            while (span.firstChild) parent.insertBefore(span.firstChild, span);
            parent.removeChild(span);
        });
        document.body.classList.remove('wol-compact');
        compactSplitSpans.forEach(group => {
            if (!group.isConnected) return;
            const html = group.getAttribute('data-original-ruby');
            if (html) {
                const tmp = document.createElement('div'); tmp.innerHTML = html;
                group.replaceWith(tmp.firstChild);
            }
        });
        compactSplitSpans.length = 0;
        attachClickHandlers();
        applyInitialState();
        // Re-apply highlights from DB to the clean ruby DOM
        if (db) setTimeout(() => restoreHighlights(document.body), 50);
    }

    function applyCompact() {
        if (compact) { installBannerBlock(); splitAndCompact(); }
        else restoreCompact();
    }

    // ── Click handlers ──
    let cTouchStartX = 0, cTouchStartY = 0, cTouchStartTime = 0;
    let cTouchMoved = false, cTouchWrap = null;
    let cLastTapWrap = null, cLastTapTime = 0, cDoubleTapJustFired = false;
    let rLastTapRuby = null, rLastTapTime = 0, rDoubleTapJustFired = false;
    let _compactTouchInstalled = false, _compactTouchArticleEl = null;

    function attachClickHandlers() {
        if (compact) {
            const articleEl = document.querySelector('#article, .article, .mainContent, body');
            if (!_compactTouchInstalled || _compactTouchArticleEl !== articleEl) {
                _compactTouchInstalled = true;
                _compactTouchArticleEl = articleEl;

                window.addEventListener('scroll', () => { cLastTapTime = 0; cLastTapWrap = null; }, { passive: true });

                articleEl.addEventListener('touchstart', (e) => {
                    cTouchMoved = false; cTouchWrap = null;
                    const wrap = e.target.closest('.wol-char-wrap');
                    if (!wrap || e.target.closest('a')) return;
                    if (e.touches.length > 0) { cTouchStartX = e.touches[0].clientX; cTouchStartY = e.touches[0].clientY; }
                    cTouchStartTime = Date.now();
                    cTouchWrap = wrap;
                }, { passive: true });

                articleEl.addEventListener('touchmove', (e) => {
                    if (!cTouchWrap) return;
                    if (e.touches.length > 0) {
                        const dx = e.touches[0].clientX - cTouchStartX;
                        const dy = e.touches[0].clientY - cTouchStartY;
                        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { cTouchMoved = true; cTouchWrap = null; }
                    }
                }, { passive: true });

                articleEl.addEventListener('touchend', (e) => {
                    const wrap = cTouchWrap; cTouchWrap = null;
                    if (!wrap || cTouchMoved) return;
                    if (e.target.closest('a')) return;
                    if (Date.now() - cTouchStartTime > 400) return;
                    const paletteOpen = !!document.getElementById('wol_hl_float_palette');
                    const now = Date.now();
                    const isDoubleTap = (now - cLastTapTime < 500) && (cLastTapWrap === wrap);
                    closeDocumentMenuIfOpen();
                    if (isDoubleTap) {
                        // Double-tap always works — pins/unpins pinyin regardless of palette state
                        e.stopPropagation(); e.preventDefault();
                        cLastTapTime = 0; cLastTapWrap = null;
                        cDoubleTapJustFired = true;
                        setTimeout(() => { cDoubleTapJustFired = false; }, 600);
                        window.getSelection && window.getSelection().removeAllRanges();
                        if (fadeTimers.has(wrap)) { clearTimeout(fadeTimers.get(wrap)); fadeTimers.delete(wrap); }
                        const p = wrap.querySelector('.wol-char-pinyin');
                        wrap.classList.toggle('pinyin-pinned');
                        const nowPinned = wrap.classList.contains('pinyin-pinned');
                        if (p) p.style.opacity = nowPinned ? '1' : '0';
                        const idx = wrap.getAttribute('data-idx');
                        if (idx !== null) {
                            if (nowPinned) savedProgress['compact_' + idx] = true;
                            else delete savedProgress['compact_' + idx];
                            localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                        }
                    } else if (!paletteOpen) {
                        // Single tap without palette — show temporarily (skip if pinned)
                        e.stopPropagation();
                        const p = wrap.querySelector('.wol-char-pinyin');
                        cLastTapTime = now; cLastTapWrap = wrap;
                        if (!wrap.classList.contains('pinyin-pinned')) {
                            if (p) p.style.opacity = '1';
                            if (fadeTimers.has(wrap)) clearTimeout(fadeTimers.get(wrap));
                            const timer = setTimeout(() => {
                                if (!wrap.classList.contains('pinyin-pinned')) p.style.opacity = '0';
                                fadeTimers.delete(wrap);
                            }, 1000);
                            fadeTimers.set(wrap, timer);
                        }
                    } else {
                        // Single tap with palette open — track for double-tap detection, no pinyin flash
                        cLastTapTime = now; cLastTapWrap = wrap;
                    }
                }, { passive: false });
            }

            document.querySelectorAll('.wol-char-wrap').forEach(wrap => {
                wrap.onclick = (e) => {
                    if (e.pointerType === 'touch') return;
                    if (e.target.closest('a')) return;
                    e.stopPropagation();
                    if (cDoubleTapJustFired) return;
                    if (wrap.classList.contains('pinyin-pinned')) return;
                    showPinyinTemporarily(wrap);
                };
                wrap.ondblclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    window.getSelection && window.getSelection().removeAllRanges();
                    if (fadeTimers.has(wrap)) { clearTimeout(fadeTimers.get(wrap)); fadeTimers.delete(wrap); }
                    const p = wrap.querySelector('.wol-char-pinyin');
                    wrap.classList.toggle('pinyin-pinned');
                    const nowPinned = wrap.classList.contains('pinyin-pinned');
                    if (p) p.style.opacity = nowPinned ? '1' : '0';
                    const idx = wrap.getAttribute('data-idx');
                    if (idx !== null) {
                        if (nowPinned) savedProgress['compact_' + idx] = true;
                        else delete savedProgress['compact_' + idx];
                        localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                    }
                };
            });
            return;
        }

        // Non-compact (beginner / advanced)
        const rubyArticle = document.querySelector('#article, .article, .mainContent, body');
        let rTouchStartX = 0, rTouchStartY = 0, rTouchMoved = false, rTouchRuby = null, rTouchStartTime = 0;

        if (!rubyArticle._wolRubyTouchInstalled) {
            rubyArticle._wolRubyTouchInstalled = true;

            rubyArticle.addEventListener('touchstart', (e) => {
                rTouchMoved = false; rTouchRuby = null;
                const ruby = e.target.closest('ruby');
                if (!ruby || e.target.closest('a')) return;
                if (e.target.closest('.tooltip, .tooltipContainer')) return;
                rTouchStartX = e.touches[0].clientX;
                rTouchStartY = e.touches[0].clientY;
                rTouchStartTime = Date.now();
                rTouchRuby = ruby;
            }, { passive: true });

            rubyArticle.addEventListener('touchmove', (e) => {
                if (!rTouchRuby) return;
                const dx = e.touches[0].clientX - rTouchStartX;
                const dy = e.touches[0].clientY - rTouchStartY;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { rTouchMoved = true; rTouchRuby = null; }
            }, { passive: true });

            rubyArticle.addEventListener('touchend', (e) => {
                const ruby = rTouchRuby; rTouchRuby = null;
                if (!ruby || rTouchMoved) return;
                if (e.target.closest('a')) return;
                if (e.target.closest('.tooltip, .tooltipContainer')) return;
                if (Date.now() - rTouchStartTime > 500) return;
                closeDocumentMenuIfOpen();
                e.stopPropagation(); e.preventDefault();
                window.getSelection && window.getSelection().removeAllRanges();
                const rb = ruby.querySelector('rb'), rt = ruby.querySelector('rt');
                if (!rb || !rt) return;
                const word = rb.textContent;
                if (level === 'beginner') {
                    const allMatches = Array.from(document.querySelectorAll('ruby')).filter(r => r.querySelector('rb')?.textContent === word);
                    const currentlyVisible = allMatches.some(r => r.querySelector('rt').style.opacity === '1');
                    const newOp = currentlyVisible ? '0' : '1';
                    allMatches.forEach(r => { r.querySelector('rt').style.opacity = newOp; });
                    savedProgress[word] = (newOp === '0');
                    localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                } else {
                    const now = Date.now();
                    const isDouble = (now - rLastTapTime < 500) && (rLastTapRuby === ruby);
                    if (!isDouble) { rLastTapTime = now; rLastTapRuby = ruby; }
                    if (isDouble) {
                        rLastTapTime = 0; rLastTapRuby = null;
                        rDoubleTapJustFired = true;
                        setTimeout(() => { rDoubleTapJustFired = false; }, 600);
                        if (fadeTimers.has(ruby)) { clearTimeout(fadeTimers.get(ruby)); fadeTimers.delete(ruby); }
                        ruby.classList.toggle('pinyin-pinned');
                        const pinned = ruby.classList.contains('pinyin-pinned');
                        rt.style.opacity = pinned ? '1' : '0';
                        const rkey = makeRubyKey(ruby);
                        if (rkey) { if (pinned) savedProgress[rkey] = true; else delete savedProgress[rkey]; }
                        localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                    } else {
                        if (ruby.classList.contains('pinyin-pinned')) return;
                        rt.style.opacity = '1';
                        if (fadeTimers.has(ruby)) clearTimeout(fadeTimers.get(ruby));
                        const timer = setTimeout(() => {
                            if (!ruby.classList.contains('pinyin-pinned')) rt.style.opacity = '0';
                            fadeTimers.delete(ruby);
                        }, 1000);
                        fadeTimers.set(ruby, timer);
                    }
                }
            }, { passive: false });
        }

        document.querySelectorAll('ruby').forEach((ruby) => {
            const rb = ruby.querySelector('rb'), rt = ruby.querySelector('rt');
            if (!rb || !rt) return;
            const word = rb.textContent;
            ruby.onclick = null; ruby.ondblclick = null;
            ruby.onclick = (e) => {
                if (e.pointerType === 'touch') return;
                if (rDoubleTapJustFired) return;
                if (e.target.closest('a')) return;
                e.stopPropagation();
                window.getSelection && window.getSelection().removeAllRanges();
                if (level === 'beginner') {
                    const allMatches = Array.from(document.querySelectorAll('ruby')).filter(r => r.querySelector('rb')?.textContent === word);
                    const currentlyVisible = allMatches.some(r => r.querySelector('rt').style.opacity === '1');
                    const newOp = currentlyVisible ? '0' : '1';
                    allMatches.forEach(r => { r.querySelector('rt').style.opacity = newOp; });
                    savedProgress[word] = (newOp === '0');
                    localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                } else {
                    const now = Date.now();
                    const isDouble = (now - rLastTapTime < 500) && (rLastTapRuby === ruby);
                    rLastTapTime = now; rLastTapRuby = ruby;
                    if (isDouble) {
                        rLastTapTime = 0; rLastTapRuby = null;
                        if (fadeTimers.has(ruby)) { clearTimeout(fadeTimers.get(ruby)); fadeTimers.delete(ruby); }
                        ruby.classList.toggle('pinyin-pinned');
                        const pinned = ruby.classList.contains('pinyin-pinned');
                        rt.style.opacity = pinned ? '1' : '0';
                        const rkey = makeRubyKey(ruby);
                        if (rkey) { if (pinned) savedProgress[rkey] = true; else delete savedProgress[rkey]; }
                        localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                    } else {
                        if (ruby.classList.contains('pinyin-pinned')) return;
                        rt.style.opacity = '1';
                        if (fadeTimers.has(ruby)) clearTimeout(fadeTimers.get(ruby));
                        const timer = setTimeout(() => {
                            if (!ruby.classList.contains('pinyin-pinned')) rt.style.opacity = '0';
                            fadeTimers.delete(ruby);
                        }, 1000);
                        fadeTimers.set(ruby, timer);
                    }
                }
            };
        });
    }

    // ── Study mode panel extras ──
    function buildStudyExtras(panel) {
        const d1 = document.createElement('div'); d1.className = 'pp-divider'; panel.appendChild(d1);
        const levelSection = document.createElement('div'); levelSection.className = 'pp-section pp-level-section';
        const levelTitle = document.createElement('div'); levelTitle.className = 'pp-section-title';
        levelTitle.textContent = t('levelTitle'); levelSection.appendChild(levelTitle);

        ['beginner','advanced','compact'].forEach(val => {
            const lbl = document.createElement('label'); lbl.className = 'pp-radio-label';
            const radio = document.createElement('input');
            radio.type = 'radio'; radio.name = 'wol_level_radio'; radio.value = val;
            radio.checked = (level === val);
            if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) radio.style.accentColor = '#34C759';
            radio.addEventListener('change', () => {
                const prev = level;
                level = val; compact = (val === 'compact');
                localStorage.setItem(LEVEL_KEY, level);
                if (compact || prev === 'compact') {
                    requestAnimationFrame(() => setTimeout(() => {
                        applyCompact(); applyInitialState();
                        setTimeout(restoreSavedHash, 300);
                    }, 0));
                } else {
                    applyInitialState();
                }
            });
            lbl.appendChild(radio);
            lbl.appendChild(document.createTextNode(val === 'beginner' ? t('levelBeginner') : val === 'advanced' ? t('levelAdvanced') : t('levelCompact')));
            levelSection.appendChild(lbl);
        });
        panel.appendChild(levelSection);

        // Quick links
        const dQL = document.createElement('div'); dQL.className = 'pp-divider'; panel.appendChild(dQL);
        const qlSection = document.createElement('div'); qlSection.className = 'pp-section';
        qlSection.style.padding = '6px 0 8px 0';
        const qlTitle = document.createElement('div'); qlTitle.className = 'pp-section-title';
        qlTitle.style.padding = '6px 14px 2px 14px'; qlTitle.textContent = t('quickLinks');
        qlSection.appendChild(qlTitle);

        function makeNavBtn(label, getHref) {
            const btn = document.createElement('button'); btn.className = 'pp-btn pp-nav'; btn.textContent = label;
            btn.addEventListener('click', () => {
                const href = getHref();
                if (href === 'async') return;
                if (href) {
                    hidePanel();
                    const cleaned = href.replace('?#','#');
                    const parts = cleaned.split('#');
                    window.location.assign(window.location.origin + parts[0] + (parts[1] ? '#' + parts[1] : ''));
                } else { alert(t('linkNotFound')); }
            });
            return btn;
        }

        qlSection.appendChild(makeNavBtn(t('navDailyText'), () => {
            sessionStorage.setItem('wol_daily_text_redirect','1');
            sessionStorage.removeItem(HASH_KEY);
            hidePanel();
            showSyncToast(t('dailyText'));
            setTimeout(() => window.location.assign(window.location.origin + '/cmn-Hans/wol/h/r23/lp-chs'), 1000);
            return 'async';
        }));
        qlSection.appendChild(makeNavBtn(t('navWatchtower'), () => {
            const item = document.querySelector('li.todayItem.pub-w a[href]');
            if (item) {
                hidePanel();
                showSyncToast(t('watchtower'));
                setTimeout(() => { const cleaned = item.getAttribute('href').replace('?#','#'); const parts = cleaned.split('#'); window.location.assign(window.location.origin + parts[0] + (parts[1] ? '#' + parts[1] : '')); }, 1000);
                return 'async';
            }
            sessionStorage.setItem('wol_watchtower_redirect','1');
            hidePanel();
            showSyncToast(t('watchtower'));
            setTimeout(() => window.location.assign(window.location.origin + '/cmn-Hans/wol/meetings/r23/lp-chs-rb'), 1000);
            return 'async';
        }));
        panel.appendChild(qlSection);

        // Actions
        const d2 = document.createElement('div'); d2.className = 'pp-divider'; panel.appendChild(d2);
        const actSection = document.createElement('div'); actSection.className = 'pp-section';
        actSection.style.padding = '6px 0 8px 0';

        function makeBtn(label, danger, onClick) {
            const btn = document.createElement('button');
            btn.className = 'pp-btn' + (danger ? ' pp-danger' : '');
            btn.textContent = label;
            btn.addEventListener('click', () => { hidePanel(); onClick(); });
            return btn;
        }

        actSection.appendChild(makeBtn(t('resetPage'), false, () => {
            if (!confirm(t('confirmResetPage'))) return;
            localStorage.removeItem(PINYIN_STORAGE_KEY); savedProgress = {}; applyInitialState();
        }));

        const resetAllWrap = document.createElement('div');
        resetAllWrap.style.cssText = 'display:flex;flex-direction:column;gap:0;';
        const resetAllBtn = document.createElement('button');
        resetAllBtn.className = 'pp-btn pp-danger';
        resetAllBtn.textContent = t('resetAll');
        resetAllBtn.addEventListener('click', () => {
            if (!confirm(t('confirmResetAll'))) return;
            if (inclHlCheck.checked && !confirm(t('confirmResetHL'))) return;
            hidePanel();
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('pinyinProgress_')) localStorage.removeItem(key);
            }
            savedProgress = {}; applyInitialState();
            if (inclHlCheck.checked && db) {
                const tx = db.transaction(['highlights'], 'readwrite');
                tx.objectStore('highlights').clear();
                tx.oncomplete = () => location.reload();
            }
        });
        const inclHlRow = document.createElement('label');
        inclHlRow.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 14px 8px 28px;font-size:13px;color:#c00;cursor:pointer;-webkit-user-select:none;user-select:none;';
        const inclHlCheck = document.createElement('input');
        inclHlCheck.type = 'checkbox';
        inclHlCheck.style.cssText = 'width:14px;height:14px;margin:0;accent-color:#c00;cursor:pointer;flex-shrink:0;';
        inclHlRow.appendChild(inclHlCheck);
        inclHlRow.appendChild(document.createTextNode(t('inclHighlights')));
        resetAllWrap.appendChild(resetAllBtn);
        resetAllWrap.appendChild(inclHlRow);
        actSection.appendChild(resetAllWrap);
        panel.appendChild(actSection);

        // Export / import
        const d3 = document.createElement('div'); d3.className = 'pp-divider'; panel.appendChild(d3);
        const ioSection = document.createElement('div'); ioSection.className = 'pp-section';
        ioSection.style.padding = '6px 0 8px 0';

        ioSection.appendChild(makeBtn(t('exportPinyin'), false, () => {
            const pinyin = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('pinyinProgress_')) {
                    try {
                        const progress = JSON.parse(localStorage.getItem(key));
                        const cleaned = Object.fromEntries(Object.entries(progress).filter(([, v]) => v === true));
                        if (Object.keys(cleaned).length > 0) pinyin[key] = cleaned;
                    } catch(e) {}
                }
            }
            const doExport = (highlights) => {
                const combined = { pinyin, highlights: highlights || [] };
                if (!Object.keys(pinyin).length && !combined.highlights.length) { alert(t('noExportData')); return; }
                const name = prompt(t('promptExportName'),'');
                if (name === null) return;
                const trimmed = name.trim();
                const filename = (trimmed || 'wol-study-export') + (trimmed.endsWith('.json') ? '' : '.json');
                const blob = new Blob([JSON.stringify(combined, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
            };
            if (db) {
                const tx = db.transaction(['highlights'], 'readonly');
                const req = tx.objectStore('highlights').getAll();
                req.onsuccess = () => doExport(req.result);
                req.onerror = () => doExport([]);
            } else { doExport([]); }
        }));

        ioSection.appendChild(makeBtn(t('importPinyin'), false, () => {
            _importUnified(true); // silent: import pinyin + highlights without asking
        }));
        panel.appendChild(ioSection);
    }

    // ── Context menu block (study mode) ──
    function blockContextMenu(e) {
        if (document.body.classList.contains('wol-audio-active')) return;
        e.stopImmediatePropagation();
    }

    // ── Study mode audio ──
    // Par number tap → show contextMenu + player wrapper (iOS).
    // Highlighter icon tap → hide both. Player stays visible while audio plays.
    function enableStudyAudio() {
        document.body.classList.add('wol-audio-active');
        if (isIOS) document.body.classList.add('wol-player-visible');
        const cm = document.getElementById('contextMenu');
        if (cm) cm.style.removeProperty('display');
        patchVerseLinksForAudio();
        patchParLinksForAudio();
    }
    function disableStudyAudio() {
        document.body.classList.remove('wol-audio-active');
        if (isIOS) document.body.classList.remove('wol-player-visible');
        const cm = document.getElementById('contextMenu');
        if (cm) cm.style.setProperty('display', 'none', 'important');
    }

    function patchVerseLinksForAudio() {
        if (!isIOS || !getPlaybackEnabled() || getMode() !== 'study') return;
        document.querySelectorAll('a.vl.vx.vp, span.v a.vl').forEach(link => {
            if (link.dataset.wolHrefPatched) return;
            link.dataset.wolHrefPatched = 'true';
            link.dataset.wolOrigHref = link.getAttribute('href') || '';
            link.removeAttribute('href');
            link.style.webkitUserSelect = 'none';
            link.style.userSelect = 'none';
            link.style.webkitTouchCallout = 'none';
        });
    }

    function patchParLinksForAudio() {
        if (!isIOS || !getPlaybackEnabled() || getMode() !== 'study') return;
        document.querySelectorAll('span.parNum, [class*="parNum"], a[id^="p"], h1[data-pid], h2[data-pid], h3[data-pid], h4[data-pid], p.qu strong:first-child').forEach(el => {
            if (el.dataset.wolParPatched) return;
            el.dataset.wolParPatched = 'true';
            el.style.webkitUserSelect = 'none';
            el.style.userSelect = 'none';
            el.style.webkitTouchCallout = 'none';
            if (el.matches('span.parNum, [class*="parNum"], p.qu strong:first-child')) {
                el.style.padding = '8px 20px 8px 0';
                el.style.margin = '-8px -20px -8px 0';
                el.style.display = 'inline-block';
            }
        });
    }

    new MutationObserver(() => patchParLinksForAudio())
    .observe(document.body, { childList: true, subtree: true });

    // Capture-phase mousedown+touchstart: enable audio on par tap BEFORE WOL's handler.
    // Using mousedown ensures wol-audio-active is set before WOL shows contextMenu.
    function _parLinkFromEvent(e) {
        // Only match actual paragraph number spans and workbook item headings
        // whose DIRECT content (not ruby/text) was tapped.
        // Exclude any tap on ruby, rb, rt, char-wrap — those are pinyin taps.
        if (e.target.closest('ruby, .wol-char-wrap, rt, rb')) return null;
        // Workbook headings: only match if the tap was directly on the number label
        // (the <strong> before any ruby content), not on ruby/text content.
        const heading = e.target.closest('h1[data-pid], h2[data-pid], h3[data-pid], h4[data-pid]');
        if (heading) {
            // If tap was on a ruby or inside one — it's a pinyin tap, skip
            if (e.target.closest('ruby, rb, rt')) return null;
            // If the heading is ALL ruby (content heading like article subheadings) — skip
            const firstChild = heading.firstElementChild;
            const firstIsRuby = firstChild && firstChild.tagName === 'RUBY';
            if (firstIsRuby) return null;
            // Otherwise it's a workbook item heading starting with a number label — match
            return heading;
        }
        return e.target.closest('a[id^="p"], .parNum, [class*="parNum"], p.qu > strong:first-child');
    }

    if (isIOS) {
        // ── Prevent question box collapse on touch ──
        document.addEventListener('touchstart', (e) => {
            if (getMode() !== 'study') return;
            if (e.target.closest('.tooltip, .tooltipContainer')) return;
            const qu = e.target.closest('p.qu[data-pid]');
            if (!qu) return;
            if (e.target.closest('ruby, rb, rt, .wol-char-wrap')) return;
            e.stopImmediatePropagation();
        }, { capture: true, passive: false });

        let _verseLongPressTimer = null;
        let _verseTouchMoved = false;
        let _verseLongPressFired = false;
        let _parLongPressTimer = null;
        let _parTouchMoved = false;
        let _parLongPressFired = false;

        document.addEventListener('touchstart', (e) => {
            if (getMode() !== 'study') return;
            if (!getPlaybackEnabled()) return;
            const verseLink = e.target.closest('a.vl.vx.vp, span.v a.vl');
            if (verseLink) {
                _verseTouchMoved = false;
                _verseLongPressFired = false;
                _verseLongPressTimer = setTimeout(() => {
                    _verseLongPressTimer = null;
                    if (_verseTouchMoved) return;
                    _verseLongPressFired = true;
                    enableStudyAudio();
                    const verseSpan = verseLink.closest('span.v');
                    if (verseSpan) {
                        const rect = verseSpan.getBoundingClientRect();
                        verseSpan.dispatchEvent(new MouseEvent('click', {
                            bubbles: true, cancelable: true,
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top + rect.height / 2,
                            view: window
                        }));
                    }
                }, 400);
                return;
            }
            const parLink = _parLinkFromEvent(e);
            if (parLink) {
                _parTouchMoved = false;
                _parLongPressFired = false;
                _parLongPressTimer = setTimeout(() => {
                    _parLongPressTimer = null;
                    if (_parTouchMoved) return;
                    _parLongPressFired = true;
                    enableStudyAudio();
                    const rect = parLink.getBoundingClientRect();
                    parLink.dispatchEvent(new MouseEvent('click', {
                        bubbles: true, cancelable: true,
                        clientX: rect.left + 5,
                        clientY: rect.top + 5,
                        view: window
                    }));
                }, 250);
            }
        }, { capture: true, passive: true });

        document.addEventListener('touchmove', () => {
            _verseTouchMoved = true;
            if (_verseLongPressTimer) { clearTimeout(_verseLongPressTimer); _verseLongPressTimer = null; }
            _parTouchMoved = true;
            if (_parLongPressTimer) { clearTimeout(_parLongPressTimer); _parLongPressTimer = null; }
        }, { capture: true, passive: true });

        document.addEventListener('touchend', (e) => {
            if (_verseLongPressTimer) { clearTimeout(_verseLongPressTimer); _verseLongPressTimer = null; }
            if (_verseLongPressFired) {
                _verseLongPressFired = false;
                const verseLink = e.target.closest('a.vl.vx.vp, span.v a.vl');
                if (verseLink) { e.preventDefault(); e.stopImmediatePropagation(); }
            }
            if (_parLongPressTimer) { clearTimeout(_parLongPressTimer); _parLongPressTimer = null; }
            if (_parLongPressFired) {
                _parLongPressFired = false;
                if (_parLinkFromEvent(e)) { e.preventDefault(); e.stopImmediatePropagation(); }
            }
        }, { capture: true, passive: false });

        document.addEventListener('contextmenu', (e) => {
            if (getMode() !== 'study') return;
            if (!getPlaybackEnabled()) return;
            if (e.target.closest('a.vl.vx.vp, span.v a.vl')) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, { capture: true, passive: false });
    }

    // ── Study icon SVG ──
    const STUDY_SVG = `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <rect width="44" height="44" rx="6" fill="#799fcc"/>
        <text x="22" y="30" text-anchor="middle" font-family="serif" font-size="26" font-weight="bold" fill="white">字</text>
    </svg>`;

    // ── Redirect handling ──
    function handleRedirects() {
        if (sessionStorage.getItem('wol_watchtower_redirect') === '1') {
            sessionStorage.removeItem('wol_watchtower_redirect');
            let attempts = 0;
            const poll = setInterval(() => {
                attempts++;
                const item = document.querySelector('li.todayItem.pub-w a[href]');
                if (item || attempts > 40) {
                    clearInterval(poll);
                    if (!item) { alert(t('noWatchtower')); return; }
                    window.location.assign(window.location.origin + item.getAttribute('href'));
                }
            }, 150);
            return true;
        }
        if (sessionStorage.getItem('wol_daily_text_redirect') === '1') {
            sessionStorage.removeItem('wol_daily_text_redirect');
            let attempts = 0;
            const poll = setInterval(() => {
                attempts++;
                const activeTab = document.querySelector('.tabContent.active');
                const anchor = activeTab ? activeTab.querySelector('a[href*="/wol/d/"]') : null;
                if (anchor) {
                    clearInterval(poll);
                    const href = anchor.getAttribute('href')
                        .replace(/lp-chs(?!-rb)/g, 'lp-chs-rb').replace('?#','#');
                    const parts = href.split('#');
                    window.location.assign(window.location.origin + parts[0] + (parts[1] ? '#' + parts[1] : ''));
                    return;
                }
                if (attempts > 60) { clearInterval(poll); alert(t('noDailyText')); }
            }, 100);
            return true;
        }
        return false;
    }

    // ── Hash tracking ──
    function saveCurrentHash() {
        const h = location.hash;
        if (h && (h.startsWith('#h=') || h.startsWith('#v='))) {
            sessionStorage.setItem(HASH_KEY, location.pathname + '|' + h);
        }
    }
    function restoreSavedHash() {
        const stored = sessionStorage.getItem(HASH_KEY);
        if (!stored) return;
        const sep = stored.indexOf('|');
        if (sep === -1) return;
        const storedPath = stored.slice(0, sep);
        const h = stored.slice(sep + 1);
        if (storedPath !== location.pathname) return;
        if (!h || (!h.startsWith('#h=') && !h.startsWith('#v='))) return;
        history.replaceState(null, '', location.pathname + location.search);
        setTimeout(() => {
            history.replaceState(null, '', location.pathname + location.search + h);
            window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href }));
        }, 50);
    }
    window.addEventListener('hashchange', saveCurrentHash);
    let _lastHash = location.hash;
    setInterval(() => {
        if (location.hash !== _lastHash) { _lastHash = location.hash; saveCurrentHash(); }
    }, 500);

    function getWolHashForElement(el) {
        const verse = el.closest('span.v[id]');
        if (verse) {
            const m = verse.id.match(/^v(\d+)-(\d+)-(\d+)/);
            if (m) return '#v=' + m[1] + ':' + m[2] + ':' + m[3];
        }
        const par = el.closest('[data-pid]') || el.closest('[id^="p"]');
        if (!par) return null;
        const pid = par.getAttribute('data-pid') || par.id.replace('p','');
        if (!pid) return null;
        return '#h=' + pid + ':0';
    }

    document.addEventListener('touchstart', (e) => {
        if (getMode() !== 'study') return;
        const hash = getWolHashForElement(e.target);
        if (!hash) return;
        sessionStorage.setItem(HASH_KEY, location.pathname + '|' + hash);
        if (location.hash !== hash) { history.replaceState(null, '', location.pathname + location.search + hash); _lastHash = hash; }
    }, { passive: true, capture: true });

    document.addEventListener('click', (e) => {
        if (getMode() !== 'study') return;
        const hash = getWolHashForElement(e.target);
        if (!hash) return;
        sessionStorage.setItem(HASH_KEY, location.pathname + '|' + hash);
        if (location.hash !== hash) { history.replaceState(null, '', location.pathname + location.search + hash); _lastHash = hash; }
    }, { capture: true });

    // ── Language detection ──
    function detectLang() {
        const lang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        if (lang.startsWith('ko')) return 'korean';
        if (lang.startsWith('ja')) return 'japanese';
        if (lang.startsWith('es')) return 'spanish';
        return 'english';
    }

    // ── Study toast ──
    function showStudyToast() {
        const msg = t('studyMode');
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(30,30,30,0.92);color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:15px;font-weight:500;padding:12px 22px;border-radius:999px;z-index:2147483647;pointer-events:none;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,0.28);opacity:0;transition:opacity 0.2s ease';
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1800);
    }

    // ── Pinyin URL rules ──
    const PINYIN_RULES = {
        english: [
            ["meetings/r1/lp-e","msync/r1/lp-e/r23/lp-chs-rb"],
            ["msync/r1/lp-e/r23/lp-chs-rb","meetings/r1/lp-e"],
            ["cmn-Hans/wol/meetings/r23/lp-chs-rb","en/wol/meetings/r1/lp-e"],
            ["d/r1/lp-e","dsync/r1/lp-e/r23/lp-chs-rb"],
            ["dsync/r1/lp-e/r23/lp-chs-rb","d/r1/lp-e"],
            ["cmn-Hans/wol/d/r23/lp-chs-rb","en/wol/d/r1/lp-e"],
            ["b/r1/lp-e/nwtsty","bsync/r1/lp-e/nwtsty/r23/lp-chs-rb"],
            ["bsync/r1/lp-e/nwtsty/r23/lp-chs-rb","b/r1/lp-e/nwtsty"],
            ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","en/wol/b/r1/lp-e/nwtsty"],
            ["en/wol/h/r1/lp-e","cmn-Hans/wol/h/r23/lp-chs-rb"],
            ["cmn-Hans/wol/h/r23/lp-chs-rb","en/wol/h/r1/lp-e"]
        ],
        korean: [
            ["meetings/r8/lp-ko","msync/r8/lp-ko/r23/lp-chs-rb"],
            ["msync/r8/lp-ko/r23/lp-chs-rb","meetings/r8/lp-ko"],
            ["cmn-Hans/wol/meetings/r23/lp-chs-rb","ko/wol/meetings/r8/lp-ko"],
            ["d/r8/lp-ko","dsync/r8/lp-ko/r23/lp-chs-rb"],
            ["dsync/r8/lp-ko/r23/lp-chs-rb","d/r8/lp-ko"],
            ["cmn-Hans/wol/d/r23/lp-chs-rb","ko/wol/d/r8/lp-ko"],
            ["b/r8/lp-ko/nwtsty","bsync/r8/lp-ko/nwtsty/r23/lp-chs-rb"],
            ["bsync/r8/lp-ko/nwtsty/r23/lp-chs-rb","b/r8/lp-ko/nwtsty"],
            ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","ko/wol/b/r8/lp-ko/nwtsty"],
            ["ko/wol/h/r8/lp-ko","cmn-Hans/wol/h/r23/lp-chs-rb"],
            ["cmn-Hans/wol/h/r23/lp-chs-rb","ko/wol/h/r8/lp-ko"]
        ],
        japanese: [
            ["meetings/r7/lp-j","msync/r7/lp-j/r23/lp-chs-rb"],
            ["msync/r7/lp-j/r23/lp-chs-rb","meetings/r7/lp-j"],
            ["cmn-Hans/wol/meetings/r23/lp-chs-rb","ja/wol/meetings/r7/lp-j"],
            ["d/r7/lp-j","dsync/r7/lp-j/r23/lp-chs-rb"],
            ["dsync/r7/lp-j/r23/lp-chs-rb","d/r7/lp-j"],
            ["cmn-Hans/wol/d/r23/lp-chs-rb","ja/wol/d/r7/lp-j"],
            ["b/r7/lp-j/nwtsty","bsync/r7/lp-j/nwtsty/r23/lp-chs-rb"],
            ["bsync/r7/lp-j/nwtsty/r23/lp-chs-rb","b/r7/lp-j/nwtsty"],
            ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","ja/wol/b/r7/lp-j/nwtsty"],
            ["ja/wol/h/r7/lp-j","cmn-Hans/wol/h/r23/lp-chs-rb"],
            ["cmn-Hans/wol/h/r23/lp-chs-rb","ja/wol/h/r7/lp-j"]
        ],
        spanish: [
            ["meetings/r4/lp-s","msync/r4/lp-s/r23/lp-chs-rb"],
            ["msync/r4/lp-s/r23/lp-chs-rb","meetings/r4/lp-s"],
            ["cmn-Hans/wol/meetings/r23/lp-chs-rb","es/wol/meetings/r4/lp-s"],
            ["d/r4/lp-s","dsync/r4/lp-s/r23/lp-chs-rb"],
            ["dsync/r4/lp-s/r23/lp-chs-rb","d/r4/lp-s"],
            ["cmn-Hans/wol/d/r23/lp-chs-rb","es/wol/d/r4/lp-s"],
            ["b/r4/lp-s/nwtsty","bsync/r4/lp-s/nwtsty/r23/lp-chs-rb"],
            ["bsync/r4/lp-s/nwtsty/r23/lp-chs-rb","b/r4/lp-s/nwtsty"],
            ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","es/wol/b/r4/lp-s/nwtsty"],
            ["es/wol/h/r4/lp-s","cmn-Hans/wol/h/r23/lp-chs-rb"],
            ["cmn-Hans/wol/h/r23/lp-chs-rb","es/wol/h/r4/lp-s"]
        ]
    };

    function getPinyinTarget(href) {
        const hashIdx = href.indexOf('#');
        const base = hashIdx === -1 ? href : href.slice(0, hashIdx);
        const hash = hashIdx === -1 ? '' : href.slice(hashIdx);
        const rules = PINYIN_RULES[detectLang()] || PINYIN_RULES.english;
        const sorted = [...rules].sort((a, b) => b[0].length - a[0].length);
        for (const [from, to] of sorted) {
            if (base.includes(from)) return base.replace(from, to) + hash;
        }
        return null;
    }

    function getRegularTarget(href) {
        const hashIdx = href.indexOf('#');
        const base = hashIdx === -1 ? href : href.slice(0, hashIdx);
        const hash = hashIdx === -1 ? '' : href.slice(hashIdx);
        const rules = PINYIN_RULES[detectLang()] || PINYIN_RULES.english;
        const sorted = [...rules].sort((a, b) => b[1].length - a[1].length);
        for (const [from, to] of sorted) {
            if (base.includes(to)) return base.replace(to, from) + hash;
        }
        return null;
    }

    // ── Activate study mode ──
    function activateStudyMode() {
        const href = location.href;
        if (href.includes('lp-chs-rb')) {
            showStudyToast();
            setTimeout(() => { try { localStorage.setItem(MODE_KEY, 'study'); } catch(e) {} location.reload(); }, 1000);
            return;
        }
        const isChinese = /\/(lp-chs|cmn-Hans)\//i.test(href);
        if (isChinese) {
            showStudyToast();
            setTimeout(() => {
                sessionStorage.setItem('wol_study_activating','1');
                location.href = href.replace(/lp-chs(?!-rb)/g,'lp-chs-rb');
            }, 1000);
            return;
        }
        showStudyToast();
        const isHomePage = /\/wol\/h\//i.test(href);
        const target = getPinyinTarget(href);
        setTimeout(() => {
            if (isHomePage) {
                sessionStorage.setItem('wol_daily_text_redirect','1');
                window.location.assign(window.location.origin + '/cmn-Hans/wol/h/r23/lp-chs');
            } else if (target) { location.href = target; }
            else location.reload();
        }, 1000);
    }

    // ── applyModeToTooltip ──
    function applyModeToTooltip(tooltip) {
        if (getMode() !== 'study') return;
        if (tooltip.dataset.studyModeApplied) return;
        tooltip.dataset.studyModeApplied = 'true';
        const tooltipProgress = savedProgress;

        if (compact) {
            tooltip.querySelectorAll('ruby').forEach(ruby => {
                const rb = ruby.querySelector('rb'), rt = ruby.querySelector('rt');
                if (!rb || !rt) return;
                const chars = Array.from(rb.textContent);
                const syllables = splitPinyinToSyllables(rt.textContent, chars.length);
                const isBold = !!rb.querySelector('strong');
                const group = document.createElement('span');
                group.setAttribute('data-compact-group','true');
                group.setAttribute('data-original-ruby', ruby.outerHTML);
                group.style.cssText = 'display:inline;margin:0;padding:0;';
                if (chars.length > 1 && syllables.length === chars.length) {
                    chars.forEach((ch, i) => group.appendChild(makeCharWrap(ch, syllables[i], isBold)));
                } else { group.appendChild(makeCharWrap(rb.textContent, rt.textContent.trim(), isBold)); }
                ruby.replaceWith(group);
            });
            tooltip.querySelectorAll('.wol-char-wrap').forEach(wrap => {
                const ch = wrap.getAttribute('data-char');
                const sy = wrap.getAttribute('data-syllable');
                const compactKey = 'tooltip_compact_' + ch + '_' + sy;
                const pinned = savedProgress[compactKey] === true;
                wrap.classList.toggle('pinyin-pinned', pinned);
                const p = wrap.querySelector('.wol-char-pinyin');
                if (p) p.style.opacity = pinned ? '1' : '0';
                let lastTap = 0, touchStartTime = 0;
                wrap.addEventListener('touchstart', () => { touchStartTime = Date.now(); }, { passive: true });
                wrap.addEventListener('touchend', (e) => {
                    if (Date.now() - touchStartTime > 400) return;
                    const now = Date.now(), delta = now - lastTap;
                    lastTap = now;
                    if (delta < 300 && delta > 0) {
                        e.stopPropagation(); e.preventDefault(); lastTap = 0;
                        window.getSelection && window.getSelection().removeAllRanges();
                        if (fadeTimers.has(wrap)) { clearTimeout(fadeTimers.get(wrap)); fadeTimers.delete(wrap); }
                        const p2 = wrap.querySelector('.wol-char-pinyin');
                        wrap.classList.toggle('pinyin-pinned');
                        const nowPinned = wrap.classList.contains('pinyin-pinned');
                        if (p2) p2.style.opacity = nowPinned ? '1' : '0';
                        if (nowPinned) savedProgress[compactKey] = true; else delete savedProgress[compactKey];
                        localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                    } else {
                        e.stopPropagation();
                        if (!wrap.classList.contains('pinyin-pinned')) showPinyinTemporarily(wrap);
                    }
                }, { passive: false });
                wrap.onclick = (e) => { e.stopPropagation(); if (!wrap.classList.contains('pinyin-pinned')) showPinyinTemporarily(wrap); };
                wrap.ondblclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    window.getSelection && window.getSelection().removeAllRanges();
                    if (fadeTimers.has(wrap)) { clearTimeout(fadeTimers.get(wrap)); fadeTimers.delete(wrap); }
                    const p2 = wrap.querySelector('.wol-char-pinyin');
                    wrap.classList.toggle('pinyin-pinned');
                    const nowPinned = wrap.classList.contains('pinyin-pinned');
                    if (p2) p2.style.opacity = nowPinned ? '1' : '0';
                    if (nowPinned) savedProgress[compactKey] = true; else delete savedProgress[compactKey];
                    localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(savedProgress));
                };
            });
        } else {
            tooltip.querySelectorAll('ruby').forEach(ruby => {
                const rb = ruby.querySelector('rb'), rt = ruby.querySelector('rt');
                if (!rb || !rt) return;
                const word = rb.textContent;
                const rkey = makeRubyKey(ruby);
                const pinned = level === 'beginner' ? false : (rkey ? tooltipProgress[rkey] === true : tooltipProgress[word] === true);
                const visible = level === 'beginner' ? !tooltipProgress[word] : pinned;
                ruby.classList.toggle('pinyin-pinned', pinned);
                rt.style.opacity = visible ? '1' : '0';
                ruby.onclick = (e) => {
                    if (e.target.closest('a')) return;
                    e.stopPropagation();
                    if (level === 'beginner') {
                        window.getSelection && window.getSelection().removeAllRanges();
                        const all = Array.from(tooltip.querySelectorAll('ruby')).filter(r => r.querySelector('rb')?.textContent === word);
                        const cv = all.some(r => r.querySelector('rt').style.opacity === '1');
                        const op = cv ? '0' : '1';
                        all.forEach(r => { r.querySelector('rt').style.opacity = op; });
                        tooltipProgress[word] = (op === '0');
                    } else {
                        if (ruby.classList.contains('pinyin-pinned')) return;
                        rt.style.opacity = '1';
                        if (fadeTimers.has(ruby)) clearTimeout(fadeTimers.get(ruby));
                        const timer = setTimeout(() => { if (!ruby.classList.contains('pinyin-pinned')) rt.style.opacity = '0'; fadeTimers.delete(ruby); }, 1000);
                        fadeTimers.set(ruby, timer);
                    }
                };
                ruby.ondblclick = (e) => {
                    if (e.target.closest('a')) return;
                    e.preventDefault(); e.stopPropagation();
                    window.getSelection && window.getSelection().removeAllRanges();
                    if (level === 'advanced') {
                        if (fadeTimers.has(ruby)) { clearTimeout(fadeTimers.get(ruby)); fadeTimers.delete(ruby); }
                        ruby.classList.toggle('pinyin-pinned');
                        const pinned = ruby.classList.contains('pinyin-pinned');
                        rt.style.opacity = pinned ? '1' : '0';
                        const rkey = makeRubyKey(ruby);
                        if (rkey) {
                            if (pinned) tooltipProgress[rkey] = true; else delete tooltipProgress[rkey];
                        } else {
                            if (pinned) tooltipProgress[word] = true; else delete tooltipProgress[word];
                        }
                        localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(tooltipProgress));
                    }
                };
            });
            let tLTR = null, tLTT = 0, tTSX = 0, tTSY = 0, tTM = false, tTR = null, tTSTime = 0;
            tooltip.addEventListener('touchstart', (e) => {
                tTM = false; tTR = null;
                const ruby = e.target.closest('ruby');
                if (!ruby || e.target.closest('a')) return;
                tTSX = e.touches[0].clientX; tTSY = e.touches[0].clientY;
                tTSTime = Date.now(); tTR = ruby;
            }, { passive: true });
            tooltip.addEventListener('touchmove', (e) => {
                if (!tTR) return;
                const dx = e.touches[0].clientX - tTSX, dy = e.touches[0].clientY - tTSY;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { tTM = true; tTR = null; }
            }, { passive: true });
            tooltip.addEventListener('touchend', (e) => {
                const ruby = tTR; tTR = null;
                if (!ruby || tTM) return;
                if (e.target.closest('a')) return;
                if (Date.now() - tTSTime > 400) return;
                e.stopPropagation();
                const now = Date.now();
                const isDouble = (now - tLTT < 300) && (tLTR === ruby);
                tLTT = now; tLTR = ruby;
                const rb = ruby.querySelector('rb'), rt = ruby.querySelector('rt');
                if (!rb || !rt) return;
                const word = rb.textContent;
                if (level === 'beginner') {
                    e.preventDefault();
                    window.getSelection && window.getSelection().removeAllRanges();
                    const all = Array.from(tooltip.querySelectorAll('ruby')).filter(r => r.querySelector('rb')?.textContent === word);
                    const cv = all.some(r => r.querySelector('rt').style.opacity === '1');
                    const op = cv ? '0' : '1';
                    all.forEach(r => { r.querySelector('rt').style.opacity = op; });
                    tooltipProgress[word] = (op === '0');
                } else {
                    if (isDouble) {
                        e.preventDefault(); tLTT = 0; tLTR = null;
                        window.getSelection && window.getSelection().removeAllRanges();
                        if (fadeTimers.has(ruby)) { clearTimeout(fadeTimers.get(ruby)); fadeTimers.delete(ruby); }
                        ruby.classList.toggle('pinyin-pinned');
                        const pinned = ruby.classList.contains('pinyin-pinned');
                        rt.style.opacity = pinned ? '1' : '0';
                        const rkey = makeRubyKey(ruby);
                        if (rkey) {
                            if (pinned) tooltipProgress[rkey] = true; else delete tooltipProgress[rkey];
                        } else {
                            if (pinned) tooltipProgress[word] = true; else delete tooltipProgress[word];
                        }
                        localStorage.setItem(PINYIN_STORAGE_KEY, JSON.stringify(tooltipProgress));
                    } else {
                        if (ruby.classList.contains('pinyin-pinned')) return;
                        rt.style.opacity = '1';
                        if (fadeTimers.has(ruby)) clearTimeout(fadeTimers.get(ruby));
                        const timer = setTimeout(() => { if (!ruby.classList.contains('pinyin-pinned')) rt.style.opacity = '0'; fadeTimers.delete(ruby); }, 1000);
                        fadeTimers.set(ruby, timer);
                    }
                }
            }, { passive: false });
        }
    }

    // ── qu tap suppression ──
    function isNonInteractiveQuTap(e) {
        if (getMode() !== 'study') return false;
        const qu = e.target.closest('.qu');
        if (!qu) return false;
        // Only pinyin elements are interactive — everything else (including par number
        // links) should suppress WOL's qu collapse handler.
        return !e.target.closest('ruby, rb, rt, .wol-char-wrap, a');
    }
    let _quTouchStartY = 0;
    document.addEventListener('touchstart', (e) => {
        if (!isNonInteractiveQuTap(e)) return;
        const link = e.target.closest('a');
        if (link && !link.matches('a[id^="p"], .parNum, [class*="parNum"]')) {
            // scripture or other non-par links inside .qu — don't interfere
            return;
        }
        e.stopImmediatePropagation();
        if (!link) {
            if (!document.getElementById('wol_hl_float_palette')) e.preventDefault();
        }
    }, { capture: true, passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!e.target.closest('.qu')) return;
        if (e.target.closest('.tooltip, .tooltipContainer')) return;
        const dy = Math.abs(e.touches[0].clientY - _quTouchStartY);
        if (dy > 8) return; // it's a scroll — let it through
        if (getMode() !== 'study') return;
        if (!e.target.closest('ruby, rb, rt, .wol-char-wrap, strong, a')) {
            e.stopImmediatePropagation();
        }
    }, { capture: true, passive: true });
    document.addEventListener('click', (e) => {
        if (!isNonInteractiveQuTap(e)) return;
        if (e.target.closest('.tooltip, .tooltipContainer')) return;
        e.stopImmediatePropagation();
        const link = e.target.closest('a');
        if (link && link.matches('a[id^="p"], .parNum, [class*="parNum"]')) {
            e.preventDefault();
            enableStudyAudio();
        } else if (link) {
            // scripture or other links — let them open naturally (tooltip etc.)
        } else {
            e.preventDefault();
        }
    }, true);

    // ─────────────────────────────────────────────────────────────
    // Audio speed controller — injected into #playerwrapper
    // ─────────────────────────────────────────────────────────────
    const SPEED_KEY = 'wol_audio_speed';
    const SPEEDS = [
        { label: '1x · Normal', val: 1.0 },
        { label: '0.9x', val: 0.9 },
        { label: '0.8x', val: 0.8 },
        { label: '0.7x', val: 0.7 },
        { label: '0.6x', val: 0.6 },
    ];

    function getSavedSpeed() {
        return parseFloat(localStorage.getItem(SPEED_KEY)) || 1.0;
    }

    function applySpeedToAudio(speed) {
        const audio = document.querySelector('#playerwrapper audio, .mejs-container audio');
        if (audio) audio.playbackRate = speed;
    }

    function injectSpeedControl() {
        if (getMode() !== 'study') return;
        const wrapper = document.getElementById('playerwrapper');
        if (!wrapper || wrapper.querySelector('#wol_speed_btn')) return;
        const audio = wrapper.querySelector('audio, .mejs-container audio');
        if (!audio) return;

        // Apply saved speed to audio element
        const savedSpeed = getSavedSpeed();
        audio.playbackRate = savedSpeed;

        // Also apply on every play event (WOL may reset it)
        audio.addEventListener('play', () => { audio.playbackRate = getSavedSpeed(); });

        // ── Speed button (clock + label) ──
        const btn = document.createElement('div');
        btn.id = 'wol_speed_btn';
        btn.title = 'Playback speed';
        btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;gap:3px;cursor:pointer;padding:0 5px;height:22px;min-width:44px;border-radius:6px;background:rgba(0,0,0,0.07);flex-shrink:0;margin-left:4px;margin-right:6px;margin-top:5px;transition:background 0.15s;';
        btn.innerHTML = `
            <span style="font-size:14px;line-height:1;">🕓</span>
            <span id="wol_speed_label" style="font-size:12px;font-weight:600;color:#333;line-height:1;letter-spacing:-0.3px;">${savedSpeed === 1 ? '1x' : savedSpeed + 'x'}</span>
        `;
        btn.addEventListener('mouseover', () => { btn.style.background = 'rgba(0,0,0,0.13)'; });
        btn.addEventListener('mouseout', () => { btn.style.background = 'rgba(0,0,0,0.07)'; });

        // ── Dropdown menu ──
        let menuOpen = false;
        function openMenu() {
            if (document.getElementById('wol_speed_menu')) return;
            menuOpen = true;
            const menu = document.createElement('div');
            menu.id = 'wol_speed_menu';
            menu.style.cssText = 'position:fixed;z-index:2147483647;background:#fff;border:1px solid #d0d0d0;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.18);min-width:160px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;';

            // Header
            const header = document.createElement('div');
            header.textContent = t('speed');
            header.style.cssText = 'padding:10px 16px 8px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#888;border-bottom:1px solid #eee;';
            menu.appendChild(header);

            const saved = getSavedSpeed();
            SPEEDS.forEach(({ label, val }) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex;align-items:center;padding:10px 16px;cursor:pointer;gap:10px;';
                row.addEventListener('mouseover', () => { row.style.background = '#f5f5f5'; });
                row.addEventListener('mouseout', () => { row.style.background = ''; });

                // Radio circle
                const radio = document.createElement('div');
                const isSelected = Math.abs(val - saved) < 0.01;
                radio.style.cssText = `width:16px;height:16px;border-radius:50%;border:2px solid ${isSelected ? '#007aff' : '#bbb'};flex-shrink:0;display:flex;align-items:center;justify-content:center;`;
                if (isSelected) {
                    const dot = document.createElement('div');
                    dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#007aff;';
                    radio.appendChild(dot);
                }

                const text = document.createElement('span');
                text.textContent = label;
                text.style.cssText = `font-size:15px;color:${isSelected ? '#007aff' : '#222'};font-weight:${isSelected ? '600' : '400'};`;

                row.appendChild(radio); row.appendChild(text);

                function selectSpeed(e) {
                    e.stopPropagation();
                    localStorage.setItem(SPEED_KEY, val);
                    applySpeedToAudio(val);
                    const label = document.getElementById('wol_speed_label');
                    if (label) label.textContent = val === 1 ? '1x' : val + 'x';
                    closeMenu();
                }
                row.addEventListener('click', selectSpeed);
                row.addEventListener('touchend', (e) => { e.preventDefault(); selectSpeed(e); }, { passive: false });
                menu.appendChild(row);
            });

            // Position below the button
            document.body.appendChild(menu);
            const btnRect = btn.getBoundingClientRect();
            const menuW = menu.offsetWidth;
            const menuTop = btnRect.bottom + 6;
            const menuLeft = Math.min(btnRect.left, window.innerWidth - menuW - 8);
            menu.style.top = Math.max(menuTop, 4) + 'px';
            menu.style.left = Math.max(menuLeft, 8) + 'px';

            // Close on outside tap/click
            setTimeout(() => {
                document.addEventListener('click', closeMenu, { once: true });
                document.addEventListener('touchend', closeMenu, { once: true });
            }, 0);
        }

        function closeMenu() {
            const m = document.getElementById('wol_speed_menu');
            if (m) m.remove();
            menuOpen = false;
        }

        btn.addEventListener('click', (e) => { e.stopPropagation(); menuOpen ? closeMenu() : openMenu(); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); menuOpen ? closeMenu() : openMenu(); }, { passive: false });

        // Replace placeholder if present, otherwise insert after play button
        const placeholder = wrapper.querySelector('#wol_speed_placeholder');
        if (placeholder) placeholder.replaceWith(btn);
        else {
            const playBtn = wrapper.querySelector('.mejs-play, .mejs-pause, .mejs-button');
            if (playBtn) playBtn.insertAdjacentElement('afterend', btn);
            else wrapper.appendChild(btn);
        }
    }

    function injectSpeedPlaceholder() {
        if (isIOS && !getPlaybackEnabled()) return;
        if (getMode() !== 'study') return;
        const wrapper = document.getElementById('playerwrapper');
        if (!wrapper || wrapper.querySelector('#wol_speed_btn') || wrapper.querySelector('#wol_speed_placeholder')) return;
        const placeholder = document.createElement('div');
        placeholder.id = 'wol_speed_placeholder';
        placeholder.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:22px;margin-left:4px;margin-top:2px;flex-shrink:0;visibility:hidden;';
        const playBtn = wrapper.querySelector('.mejs-play, .mejs-pause, .mejs-button');
        if (playBtn) playBtn.insertAdjacentElement('afterend', placeholder);
        else wrapper.appendChild(placeholder);
    }

    const speedObserver = new MutationObserver(() => {
        const wrapper = document.getElementById('playerwrapper');
        if (!wrapper) return;
        const style = window.getComputedStyle(wrapper);
        if (style.display === 'none') return;
        if (isIOS && !getPlaybackEnabled()) return;
        injectSpeedPlaceholder();
        injectSpeedControl();
    });
    speedObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    if (!isIOS || getPlaybackEnabled()) {
        injectSpeedPlaceholder();
        injectSpeedControl();
    }

    // ─────────────────────────────────────────────────────────────
    // 6. HIGHLIGHTER LOGIC  (from script2)
    // ─────────────────────────────────────────────────────────────

    // ── IndexedDB (single init, shared) ──
    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('WolHighlights', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => { db = request.result; resolve(db); };
            request.onupgradeneeded = (event) => {
                const d = event.target.result;
                if (!d.objectStoreNames.contains('highlights')) {
                    d.createObjectStore('highlights', { keyPath: 'pageID' });
                }
            };
        });
    }

    // ── Playback state ──
    function applyPlaybackState(enabled) {
        document.body.classList.toggle('wol-playback-enabled', enabled);
        enforceContextMenuState();
    }
    let _enforcingCM = false;
    function enforceContextMenuState() {
        if (_enforcingCM) return;
        const enabled = getPlaybackEnabled();
        const mode = getMode();
        if (mode === 'study') return;
        const contextMenu = document.getElementById('contextMenu');
        if (!contextMenu) return;
        if (!enabled && contextMenu.style.display !== 'none') {
            _enforcingCM = true;
            contextMenu.style.setProperty('display','none','important');
            _enforcingCM = false;
        }
    }
    const contextMenuObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            const cm = m.target.id === 'contextMenu' ? m.target
                : (m.addedNodes.length ? Array.from(m.addedNodes).find(n => n.id === 'contextMenu') : null);
            if (cm || m.target.id === 'contextMenu') { enforceContextMenuState(); break; }
        }
    });
    contextMenuObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style','class'] });
    applyPlaybackState(getPlaybackEnabled());

    // ── Font size ──
    const WOL_FONT_SCALE = [
        { pct: '70%', pt: 8 }, { pct: '78%', pt: 9 }, { pct: '85%', pt: 10 },
        { pct: '100%', pt: 12 }, { pct: '117%', pt: 14 }, { pct: '138%', pt: 16 },
        { pct: '172%', pt: 20 }, { pct: '190%', pt: 22 }, { pct: '223%', pt: 26 },
        { pct: '267%', pt: 32 }, { pct: '308%', pt: 36 }, { pct: '370%', pt: 44 },
    ];
    function pctToPt(pct) {
        if (!pct) return 12;
        const entry = WOL_FONT_SCALE.find(s => s.pct === pct);
        return entry ? entry.pt : 12;
    }
    function getCurrentScalableUIPct() {
        let lastPct = null;
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                const rules = document.styleSheets[i].cssRules;
                if (!rules) continue;
                for (let j = 0; j < rules.length; j++) {
                    const r = rules[j];
                    if (r.selectorText === '.scalableui' && r.style && r.style.fontSize) lastPct = r.style.fontSize;
                }
            } catch(e) {}
        }
        return lastPct;
    }
    (function patchInsertRule() {
        const targetProto = (typeof unsafeWindow !== 'undefined')
            ? unsafeWindow.CSSStyleSheet.prototype
            : CSSStyleSheet.prototype;
        const orig = targetProto.insertRule;
        targetProto.insertRule = function(rule, index) {
            const result = orig.call(this, rule, index);
            if (/\.scalableui\s*\{[^}]*font-size\s*:/i.test(rule)) {
                const match = rule.match(/font-size\s*:\s*([^;}"]+)/i);
                if (match) {
                    const newPct = match[1].trim();
                    const display = document.getElementById('wol_fontsize_display');
                    if (display) display.textContent = pctToPt(newPct);
                    if (localStorage.getItem(FONT_SIZE_REMEMBER_KEY) === 'true'
                        && !safeWindow._wolFontRestoring && safeWindow._wolFontInitSeen) {
                        localStorage.setItem(FONT_SIZE_KEY, newPct);
                    }
                    safeWindow._wolFontInitSeen = true;
                    clearTimeout(safeWindow._wolScrollTodayTimer);
                    safeWindow._wolScrollTodayTimer = setTimeout(scrollToToday, 300);
                }
            }
            return result;
        };
    })();

    function scrollToToday() {
        setTimeout(() => {
            const today = document.querySelector('li.todayItem.pub-w, li.todayItem');
            if (today) { today.scrollIntoView({ behavior: 'instant', block: 'center' }); return; }
            const hash = location.hash;
            if (hash) {
                history.replaceState(null, '', location.pathname + location.search);
                setTimeout(() => {
                    history.replaceState(null, '', location.pathname + location.search + hash);
                    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href }));
                }, 50);
            }
        }, 400);
    }

    function restoreRememberedFontSize() {
        if (localStorage.getItem(FONT_SIZE_REMEMBER_KEY) !== 'true') return;
        const savedPct = localStorage.getItem(FONT_SIZE_KEY);
        if (!savedPct || !/^\d+(\.\d+)?%$/.test(savedPct)) return;
        let attempts = 0;
        const poll = setInterval(() => {
            attempts++;
            const larger = document.getElementById('fontSizeLarger');
            const smaller = document.getElementById('fontSizeSmaller');
            if (!larger || !smaller) { if (attempts > 60) clearInterval(poll); return; }
            clearInterval(poll);
            setTimeout(() => requestAnimationFrame(() => {
                const currentPct = getCurrentScalableUIPct() || '100%';
                const savedIdx = WOL_FONT_SCALE.findIndex(s => s.pct === savedPct);
                const currentIdx = WOL_FONT_SCALE.findIndex(s => s.pct === currentPct);
                const diff = savedIdx - currentIdx;
                const display = document.getElementById('wol_fontsize_display');
                if (display) display.textContent = pctToPt(savedPct);
                if (diff === 0) { scrollToToday(); return; }
                safeWindow._wolFontRestoring = true;
                const btnId = diff > 0 ? 'fontSizeLarger' : 'fontSizeSmaller';
                const steps = Math.abs(diff);
                let i = 0;
                function clickNext() {
                    if (i++ >= steps) {
                        safeWindow._wolFontRestoring = false;
                        if (localStorage.getItem(FONT_SIZE_REMEMBER_KEY) === 'true') localStorage.setItem(FONT_SIZE_KEY, savedPct);
                        setTimeout(scrollToToday, 300); return;
                    }
                    const btn = document.getElementById(btnId);
                    if (btn) btn.click();
                    setTimeout(clickNext, 60);
                }
                clickNext();
            }), 150);
        }, 100);
    }
    restoreRememberedFontSize();

    function injectFontSizeEnhancements(menu) {
        if (menu.querySelector('#wol_fontsize_combined_li')) return;
        const wolSpinLi = menu.querySelector('li.spin');
        if (!wolSpinLi) return;
        const spinContainer = wolSpinLi.querySelector('.spinContainer');
        const wolLarger = wolSpinLi.querySelector('#fontSizeLarger');
        if (!spinContainer || !wolLarger) return;
        wolSpinLi.id = 'wol_fontsize_combined_li';
        const ptDisplay = document.createElement('span');
        ptDisplay.id = 'wol_fontsize_display';
        ptDisplay.textContent = pctToPt(getCurrentScalableUIPct());
        ptDisplay.style.cssText = 'display:inline-block;min-width:1.8em;text-align:center;padding-left:5px;font-size:12px;font-weight:600;color:#333;vertical-align:middle;';
        spinContainer.insertBefore(ptDisplay, wolLarger);
        const isRemembering = localStorage.getItem(FONT_SIZE_REMEMBER_KEY) === 'true';
        if (isRemembering) wolSpinLi.classList.add('checked');
        const icn = document.createElement('span'); icn.className = 'icon';
        const cbx = document.createElement('input'); cbx.type = 'checkbox'; cbx.checked = isRemembering;
        const lockIcon = document.createElement('span');
        lockIcon.className = 'wol-lock-icon'; lockIcon.textContent = '🔒'; lockIcon.title = 'Remember font size across pages';
        function handleRememberToggle(e) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            const newState = !cbx.checked;
            cbx.checked = newState; wolSpinLi.classList.toggle('checked', newState);
            localStorage.setItem(FONT_SIZE_REMEMBER_KEY, newState ? 'true' : 'false');
            if (newState) localStorage.setItem(FONT_SIZE_KEY, getCurrentScalableUIPct() || '100%');
        }
        [lockIcon, cbx, icn].forEach(el => {
            el.addEventListener('mousedown', handleRememberToggle, true);
            el.addEventListener('touchstart', e => e.stopPropagation(), { capture: true, passive: true });
            el.addEventListener('touchend', handleRememberToggle, true);
            el.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }, true);
        });
        wolSpinLi.style.cssText = 'display:flex;align-items:center;';
        spinContainer.style.cssText = 'display:inline-flex;align-items:center;margin-left:14px;';
        const lockGroup = document.createElement('span');
        lockGroup.className = 'wol-lock-group';
        lockGroup.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-left:auto;margin-right:-18px;';
        lockGroup.appendChild(lockIcon); lockGroup.appendChild(cbx); lockGroup.appendChild(icn);
        wolSpinLi.appendChild(lockGroup);
    }
    document.querySelectorAll('.documentMenu').forEach(menu => injectFontSizeEnhancements(menu));

    function injectPlaybackToggle(menu) {
        if (menu.querySelector('#wol_playback_toggle_li')) return;
        const li = document.createElement('li');
        li.id = 'wol_playback_toggle_li';
        li.className = 'toggle' + (getPlaybackEnabled() ? ' checked' : '');
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = getPlaybackEnabled();
        const icon = document.createElement('span'); icon.className = 'icon';
        li.appendChild(checkbox);
        li.appendChild(document.createTextNode(t('playback')));
        li.appendChild(icon);
        function handlePlaybackToggle(e) {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            const newState = !checkbox.checked;
            checkbox.checked = newState; li.classList.toggle('checked', newState);
            setPlaybackEnabled(newState);
            if (getMode() === 'study') {
                // In study mode: toggle controls audio UI directly
                if (newState) enableStudyAudio();
                else disableStudyAudio();
            } else {
                applyPlaybackState(newState);
            }
        }
        li.addEventListener('mousedown', handlePlaybackToggle, true);
        li.addEventListener('touchstart', (e) => { e.stopPropagation(); }, { capture: true, passive: true });
        li.addEventListener('touchend', handlePlaybackToggle, true);
        li.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }, true);
        const fontSizeLi = Array.from(menu.querySelectorAll('li')).find(
            el => el.id === 'wol_fontsize_combined_li' || (!el.classList.contains('toggle') && el.id !== 'wol_playback_toggle_li')
        );
        if (fontSizeLi) menu.insertBefore(li, fontSizeLi); else menu.appendChild(li);
    }

    let _docMenuTimer = null;
    const docMenuObserver = new MutationObserver((mutations) => {
        const allOurs = mutations.every(m => {
            const ownIds = ['wol_playback_toggle_li','wol_fontsize_combined_li','wol_fontsize_display'];
            if (ownIds.includes(m.target.id)) return true;
            if (m.addedNodes.length === 1 && ownIds.includes(m.addedNodes[0].id)) return true;
            return false;
        });
        if (allOurs) return;
        if (_docMenuTimer) return;
        _docMenuTimer = setTimeout(() => {
            _docMenuTimer = null;
            document.querySelectorAll('.documentMenu').forEach(menu => {
                if (!menu.querySelector('#wol_playback_toggle_li')) injectPlaybackToggle(menu);
                if (!menu.querySelector('#wol_fontsize_combined_li')) injectFontSizeEnhancements(menu);
            });
        }, 80);
    });
    docMenuObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    document.querySelectorAll('.documentMenu').forEach(menu => {
        if (menu.style.display && menu.style.display !== 'none') injectPlaybackToggle(menu);
    });

    // ── Highlighter helpers ──
    function extractScriptureRef(url) {
        const m = url.match(/\/b\/[^\/]+\/[^\/]+\/[^\/]+\/(\d+)\/(\d+)/);
        return m ? `scripture_${m[1]}_${m[2]}` : null;
    }
    function extractArticleRef(url) {
        const m1 = url.match(/\/(?:d|dsync|m|msync|meetings|lv|pc)\/((?:[^\/]+\/)*[^\/]+?)\/(\d+)(?:[^#\/\?]*)/);
        if (m1) return `article_${m1[1].replace(/\//g,'_')}_${m1[2]}`;
        const m2 = url.match(/\/(w|wp|g|km|mwb)\/[^\/]+\/[^\/]+\/([^#\/\?]+)/);
        if (m2) return `pub_${m2[1]}_${m2[2]}`;
        return null;
    }
    function getAllSyncKeys(url) {
        const keys = [];
        const sr = extractScriptureRef(url);
        if (sr) keys.push('tooltip_' + sr);
        const ar = extractArticleRef(url);
        if (ar) keys.push('tooltip_' + ar);
        keys.push(url.split('#')[0]);
        return keys;
    }
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) { const char = str.charCodeAt(i); hash = ((hash << 5) - hash) + char; hash = hash & hash; }
        return Math.abs(hash).toString(36);
    }
    function getPageID(container) {
        container = container || document.body;
        const tooltip = container.closest('.tooltip, .tooltipContainer');
        if (tooltip) {
            const link = tooltip.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
            if (link) {
                const href = link.getAttribute('href');
                if (href) {
                    const ar = extractArticleRef(href); if (ar) return 'tooltip_' + ar;
                    return 'tooltip_' + href.split('#')[0];
                }
            }
            return 'tooltip_' + simpleHash(tooltip.textContent.trim().substring(0, 500));
        }
        const ar = extractArticleRef(window.location.pathname, true);
        if (ar) return ar;
        const sr = extractScriptureRef(window.location.pathname);
        if (sr) return sr;
        return window.location.pathname + window.location.search;
    }
    function getBaseReference(container) {
        container = container || document.body;
        const tooltip = container.closest('.tooltip, .tooltipContainer');
        if (tooltip) {
            const link = tooltip.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
            if (link) {
                const href = link.getAttribute('href');
                if (href) {
                    const ar = extractArticleRef(href); if (ar) return ar;
                    return href.split('#')[0];
                }
            }
        }
        const sr = extractScriptureRef(window.location.pathname); if (sr) return sr;
        const ar = extractArticleRef(window.location.pathname); if (ar) return ar;
        return window.location.pathname + window.location.search;
    }
    function getCurrentSyncKeys() {
        const keys = [];
        const sr = extractScriptureRef(window.location.pathname);
        if (sr) keys.push('tooltip_' + sr);
        return keys;
    }

    // ── Save / restore highlights ──
    function saveHighlights(container) {
        container = container || document.body;
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
            const color = spanGroup[0].style.backgroundColor;
            highlights.push({ id, color, text: getTextBetweenSpans(spanGroup) });
        });
        const transaction = db.transaction(['highlights'], 'readwrite');
        const store = transaction.objectStore('highlights');
        if (highlights.length > 0) {
            store.put({ pageID, highlights });
            if (baseRef && baseRef !== pageID) store.put({ pageID: baseRef, highlights });
            if (container === document.body) getCurrentSyncKeys().forEach(key => store.put({ pageID: key, highlights }));
            if (container === document.body) {
                const rawPath = window.location.pathname;
                store.put({ pageID: rawPath, highlights });
                const ar = extractArticleRef(rawPath);
                if (ar) store.put({ pageID: 'tooltip_' + ar, highlights });
            }
            if (container.closest('.tooltip, .tooltipContainer')) {
                const link = container.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
                if (link) {
                    const href = link.getAttribute('href');
                    if (href) {
                        const ar = extractArticleRef(href);
                        if (ar) store.put({ pageID: 'tooltip_' + ar, highlights });
                        store.put({ pageID: href.split('#')[0], highlights });
                    }
                }
            }
        } else {
            store.delete(pageID);
            if (baseRef && baseRef !== pageID) store.delete(baseRef);
            if (container === document.body) getCurrentSyncKeys().forEach(key => store.delete(key));
            if (container === document.body) {
                const rawPath = window.location.pathname;
                store.delete(rawPath);
                const ar = extractArticleRef(rawPath);
                if (ar) store.delete('tooltip_' + ar);
            }
            if (container.closest('.tooltip, .tooltipContainer')) {
                const link = container.querySelector('a.bibleCitation, a.publicationCitation, a.pub-');
                if (link) {
                    const href = link.getAttribute('href');
                    if (href) {
                        const ar = extractArticleRef(href);
                        if (ar) store.delete('tooltip_' + ar);
                        store.delete(href.split('#')[0]);
                    }
                }
            }
        }
    }

    function restoreHighlights(container) {
        container = container || document.body;
        if (!db) return;
        const pageID = getPageID(container);
        const baseRef = getBaseReference(container);
        let pageIDsToCheck = [pageID];
        if (baseRef && baseRef !== pageID) pageIDsToCheck.push(baseRef);
        if (container === document.body) pageIDsToCheck = pageIDsToCheck.concat(getCurrentSyncKeys());
        // Also check raw pathname and tooltip-prefixed key so tooltip highlights
        // restore when navigating directly to the Bible page
        if (container === document.body) {
            const rawPath = window.location.pathname;
            if (!pageIDsToCheck.includes(rawPath)) pageIDsToCheck.push(rawPath);
            const ar = extractArticleRef(rawPath);
            if (ar) {
                const tooltipKey = 'tooltip_' + ar;
                if (!pageIDsToCheck.includes(tooltipKey)) pageIDsToCheck.push(tooltipKey);
            }
        }
        const transaction = db.transaction(['highlights'], 'readonly');
        const store = transaction.objectStore('highlights');
        const allHighlights = new Map();
        let processed = 0;
        pageIDsToCheck.forEach(id => {
            const request = store.get(id);
            request.onsuccess = () => {
                processed++;
                const result = request.result;
                if (result && result.highlights) result.highlights.forEach(h => { if (!allHighlights.has(h.text)) allHighlights.set(h.text, h); });
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
                    const pinyinFilterObj = { acceptNode: pinyinFilter };
                    function getTextContent(node) {
                        let text = '';
                        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, pinyinFilterObj);
                        while (walker.nextNode()) text += walker.currentNode.textContent;
                        return text;
                    }
                    function highlightTextInElement(element, searchText, highlight) {
                        const fullText = getTextContent(element);
                        const index = fullText.indexOf(searchText);
                        if (index === -1) return false;
                        const range = document.createRange();
                        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, pinyinFilterObj);
                        let currentLength = 0, startNode = null, startOffset = 0, endNode = null, endOffset = 0;
                        while (walker.nextNode()) {
                            const node = walker.currentNode, nodeLength = node.textContent.length;
                            if (startNode === null && currentLength + nodeLength > index) { startNode = node; startOffset = index - currentLength; }
                            if (currentLength + nodeLength >= index + searchText.length) { endNode = node; endOffset = (index + searchText.length) - currentLength; break; }
                            currentLength += nodeLength;
                        }
                        if (startNode && endNode) {
                            try { range.setStart(startNode, startOffset); range.setEnd(endNode, endOffset); smartHighlight(range, highlight.color, true); return true; }
                            catch(e) { return false; }
                        }
                        return false;
                    }
                    const articleContainer = container.querySelector('#article, .article, #content, .synopsis') || container;
                    const allParas = articleContainer.querySelectorAll('div[data-pid], p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4');
                    const paragraphs = Array.from(allParas).filter(el => !el.closest('.documentNavigation, .noTooltips'));
                    highlights.forEach(highlight => {
                        const existing = container.querySelector(`span[data-highlight-id="${highlight.id}"]`);
                        if (existing) return;
                        for (let i = 0; i < paragraphs.length; i++) {
                            const para = paragraphs[i];
                            if (para.querySelector(`span[data-highlight-id="${highlight.id}"]`)) continue;
                            if (highlightTextInElement(para, highlight.text, highlight)) break;
                        }
                    });
                }
            };
        });
    }

    // ── Remove highlight listener ──
    function unwrapSpan(part) {
        const parent = part.parentNode; if (!parent) return;
        while (part.firstChild) parent.insertBefore(part.firstChild, part);
        parent.removeChild(part);
    }
    function removeHighlight(span) {
        const highlightID = span.getAttribute('data-highlight-id');
        const container = span.closest('.tooltip, .tooltipContainer') || document.body;
        container.querySelectorAll(`span[data-highlight-id="${highlightID}"]`).forEach(part => unwrapSpan(part));
        setTimeout(() => saveHighlights(container), 100);
    }
    function addRemoveListener(span) {
        span.style.cursor = 'pointer'; span.title = 'Long-press to remove highlight';
        let mousePressTimer = null;
        span.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            mousePressTimer = setTimeout(() => { mousePressTimer = null; removeHighlight(span); }, 600);
        });
        span.addEventListener('mouseup', function() { if (mousePressTimer) { clearTimeout(mousePressTimer); mousePressTimer = null; } });
        span.addEventListener('mouseleave', function() { if (mousePressTimer) { clearTimeout(mousePressTimer); mousePressTimer = null; } });
        let touchPressTimer = null;
        span.addEventListener('touchstart', function() { touchPressTimer = setTimeout(() => { touchPressTimer = null; removeHighlight(span); }, 600); }, { passive: true });
        span.addEventListener('touchend', function() { if (touchPressTimer) { clearTimeout(touchPressTimer); touchPressTimer = null; } });
        span.addEventListener('touchcancel', function() { if (touchPressTimer) { clearTimeout(touchPressTimer); touchPressTimer = null; } });
        span.addEventListener('touchmove', function() { if (touchPressTimer) { clearTimeout(touchPressTimer); touchPressTimer = null; } }, { passive: true });
    }

    // ── Selection tracking ──
    let currentRange = null;
    document.addEventListener('selectionchange', function() {
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

    // ── Ruby-aware mouse selection ──
    (function() {
        let rubyDragStart = null;
        function getRubyAtPoint(x, y) {
            const el = document.elementFromPoint(x, y); if (!el) return null;
            let node = el;
            while (node && node !== document.body) {
                if (node.tagName === 'RUBY') return node;
                if (node.tagName === 'RB') return node.closest('ruby');
                node = node.parentElement;
            }
            return null;
        }
        function buildRubyRange(startRuby, endRuby) {
            const cmp = startRuby.compareDocumentPosition(endRuby);
            if (cmp & Node.DOCUMENT_POSITION_PRECEDING) [startRuby, endRuby] = [endRuby, startRuby];
            const range = document.createRange();
            range.setStartBefore(startRuby); range.setEndAfter(endRuby);
            return range;
        }
        document.addEventListener('mousedown', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('#wol_hl_float_palette')) return;
            rubyDragStart = getRubyAtPoint(e.clientX, e.clientY);
        }, { passive: true });
        document.addEventListener('mouseup', function(e) {
            if (e.button !== 0) return;
            if (e.target.closest('#wol_hl_float_palette')) return;
            if (!rubyDragStart) return;
            const rubyEnd = getRubyAtPoint(e.clientX, e.clientY);
            if (!rubyEnd || rubyEnd === rubyDragStart) { rubyDragStart = null; return; }
            const range = buildRubyRange(rubyDragStart, rubyEnd);
            if (!range.collapsed) {
                currentRange = range;
                const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
            }
            rubyDragStart = null;
        }, { passive: true });
    })();

    // ── Smart highlight ──
    const hlColors = ['#fff176','#b9f6ca','#ffe0b2','#ead5f5'];

    function snapRangeToRubyBoundaries(range) {
        let startNode = range.startContainer, endNode = range.endContainer;
        let startRuby = startNode;
        while (startRuby && startRuby.tagName !== 'RUBY') startRuby = startRuby.parentElement;
        let endRuby = endNode;
        while (endRuby && endRuby.tagName !== 'RUBY') endRuby = endRuby.parentElement;
        if (startRuby) range.setStartBefore(startRuby);
        if (endRuby) range.setEndAfter(endRuby);
    }

    function smartHighlight(range, color, skipSave) {
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

        function isFootnoteMarker(node) {
            if (node.nodeType !== Node.TEXT_NODE) return false;
            const text = node.textContent.trim();
            return /^[\*\+\#]$/.test(text) || /^[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(text);
        }
        function isFootnoteReference(element) {
            if (!element) return false;
            return element.classList && (element.classList.contains('footnote') || element.classList.contains('noteMarker') || element.classList.contains('fn') || element.tagName === 'SUP');
        }
        function isVerseNumberLink(element) {
            if (!element) return false;
            return element.classList && (element.classList.contains('vl') || element.classList.contains('vx') || element.classList.contains('vp'));
        }
        function isInsideVerseLink(node) {
            let parent = node.parentElement;
            while (parent) {
                if (parent.tagName === 'A' && isVerseNumberLink(parent)) return true;
                if (parent.classList && (parent.classList.contains('v') || parent.classList.contains('sb'))) break;
                parent = parent.parentElement;
            }
            return false;
        }
        function isReferenceSymbol(node) {
            if (node.nodeType !== Node.TEXT_NODE) return false;
            const parent = node.parentElement;
            if (!parent || parent.tagName !== 'A') return false;
            if (!parent.classList || !parent.classList.contains('b')) return false;
            return /^[\+\*\#]+$/.test(node.textContent.trim());
        }
        function wrapTextNode(textNode) {
            let p = textNode.parentElement;
            while (p) { if (p.tagName === 'RT') return; if (p.tagName === 'RUBY') break; p = p.parentElement; }
            const span = document.createElement('span');
            span.style.backgroundColor = color; span.style.color = 'black';
            span.setAttribute('data-highlight-id', highlightID);
            addRemoveListener(span);
            textNode.parentNode.replaceChild(span, textNode);
            span.appendChild(textNode);
        }

        if (rubyElems.length) {
            const liveRubies = [], liveTextNodes = [];
            const startEl = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer);
            const endEl = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer);
            let para = startEl.closest('p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4') || startEl.parentElement;
            const endPara = endEl.closest('p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4') || endEl.parentElement;
            if (para && endPara && para !== endPara) { para = para.parentElement; while (para && !para.contains(endPara)) para = para.parentElement; }
            if (para) {
                const nodeWalker = document.createTreeWalker(para, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
                while (nodeWalker.nextNode()) {
                    const node = nodeWalker.currentNode;
                    try {
                        const nr = document.createRange(); nr.selectNode(node);
                        if (nr.compareBoundaryPoints(Range.START_TO_END, range) <= 0) continue;
                        if (nr.compareBoundaryPoints(Range.END_TO_START, range) >= 0) continue;
                    } catch(e) { continue; }
                    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'RUBY') {
                        liveRubies.push(node);
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        let insideRuby = false, insideHighlight = false;
                        let anc = node.parentElement;
                        while (anc && anc !== para) {
                            if (anc.tagName === 'RUBY') { insideRuby = true; break; }
                            if (anc.getAttribute('data-highlight-id')) { insideHighlight = true; break; }
                            anc = anc.parentElement;
                        }
                        if (!insideRuby && !insideHighlight && node.textContent.trim() !== '' && !isFootnoteMarker(node) && !isReferenceSymbol(node)) {
                        liveTextNodes.push(node);
                    }
                }
            }
            function makeHlSpan() {
                const span = document.createElement('span');
                span.style.backgroundColor = color; span.style.color = 'black';
                span.setAttribute('data-highlight-id', highlightID);
                addRemoveListener(span); return span;
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
            const startEl2 = (range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer);
            const endEl2 = (range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer);
            let para2 = startEl2.closest('p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4') || startEl2.parentElement;
            const endPara2 = endEl2.closest('p, div.v, div.sb, div.sc, li, div.du, div.dc, h1, h2, h3, h4') || endEl2.parentElement;
            if (para2 && endPara2 && para2 !== endPara2) { para2 = para2.parentElement; while (para2 && !para2.contains(endPara2)) para2 = para2.parentElement; }
            const isCompact = para2 && para2.querySelector('.wol-char-wrap');
            if (isCompact) {
                const allWraps = Array.from(para2.querySelectorAll('.wol-char-wrap'));
                const liveCompactNodes = [];
                allWraps.forEach(wrap => {
                    const tw = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT, {
                        acceptNode(n) {
                            let p = n.parentElement;
                            while (p && p !== wrap) {
                                if (p.classList.contains('wol-char-pinyin')) return NodeFilter.FILTER_REJECT;
                                if (p.getAttribute('data-highlight-id')) return NodeFilter.FILTER_REJECT;
                                p = p.parentElement;
                            }
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    });
                    while (tw.nextNode()) {
                        const n = tw.currentNode; if (!n.textContent.trim()) continue;
                        try {
                            const wr = document.createRange(); wr.selectNode(wrap);
                            if (!(wr.compareBoundaryPoints(Range.END_TO_START, range) > 0) && !(wr.compareBoundaryPoints(Range.START_TO_END, range) < 0)) {
                                liveCompactNodes.push(n);
                            }
                        } catch(e) {}
                    }
                });
                const plainTw = document.createTreeWalker(para2, NodeFilter.SHOW_TEXT, {
                    acceptNode(n) {
                        let p = n.parentElement;
                        while (p && p !== para2) {
                            if (p.classList && p.classList.contains('wol-char-wrap')) return NodeFilter.FILTER_REJECT;
                            if (p.getAttribute && p.getAttribute('data-highlight-id')) return NodeFilter.FILTER_REJECT;
                            p = p.parentElement;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                });
                const plainNodes = [];
                while (plainTw.nextNode()) {
                    const n = plainTw.currentNode;
                    if (!n.textContent.trim() || isFootnoteMarker(n) || isReferenceSymbol(n)) continue;
                    try {
                        const wr = document.createRange(); wr.selectNode(n);
                        if (!(wr.compareBoundaryPoints(Range.END_TO_START, range) > 0) && !(wr.compareBoundaryPoints(Range.START_TO_END, range) < 0)) {
                            plainNodes.push(n);
                        }
                    } catch(e) {}
                }
                liveCompactNodes.forEach(n => { if (!isFootnoteMarker(n) && !isReferenceSymbol(n) && n.parentNode && !n.parentNode.getAttribute('data-highlight-id')) wrapTextNode(n); });
                plainNodes.forEach(n => { if (n.parentNode && !n.parentNode.getAttribute('data-highlight-id')) wrapTextNode(n); });
            } else {
                const walker = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT, null, false);
                const textNodes = [];
                while (walker.nextNode()) {
                    const node = walker.currentNode;
                    if (isFootnoteMarker(node) || isFootnoteReference(node.parentElement) || isInsideVerseLink(node) || isReferenceSymbol(node)) continue;
                    textNodes.push(node);
                }
                textNodes.forEach(n => wrapTextNode(n));
                range.deleteContents(); range.insertNode(frag);
            }
        }
        if (!skipSave) {
            const tooltipContainer = document.querySelector('.tooltip, .tooltipContainer');
            const container = tooltipContainer || document.body;
            setTimeout(() => saveHighlights(container), 100);
        }
    }

    // ── Highlight icon + floating palette ──
    const HL_SVG = `<svg width="28" height="28" viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.6375 9.04176L13.3875 14.2418C13.3075 14.3218 13.1876 14.3718 13.0676 14.3718H10.1075V11.3118C10.1075 11.1918 10.1575 11.0818 10.2375 11.0018L15.4376 5.84176" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.7076 11.9818V21.6618C18.7076 21.9018 18.5176 22.0918 18.2776 22.0918H2.84756C2.60756 22.0918 2.41754 21.9018 2.41754 21.6618V6.23176C2.41754 5.99176 2.60756 5.80176 2.84756 5.80176H12.4875" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M18.3863 2.90824L16.859 4.43558L20.0551 7.63167L21.5824 6.10433L18.3863 2.90824Z" stroke="currentColor" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    function buildHighlightExtrasPanel(panel) {
        const divider = document.createElement('div'); divider.className = 'pp-divider'; panel.appendChild(divider);
        const actSection = document.createElement('div'); actSection.className = 'pp-section'; actSection.style.padding = '6px 0 8px 0';
        function makeBtn(label, danger, onClick) {
            const btn = document.createElement('button');
            btn.className = 'pp-btn' + (danger ? ' pp-danger' : '');
            btn.textContent = label;
            btn.addEventListener('click', () => { hidePanel(); onClick(); });
            return btn;
        }
        actSection.appendChild(makeBtn(t('exportHL'), false, exportHighlights));
        actSection.appendChild(makeBtn(t('importHL'), false, importHighlights));
        actSection.appendChild(makeBtn(t('clearHL'), true, clearAllHighlights));
        panel.appendChild(actSection);
    }


    function showFloatingPalette() {
        if (document.getElementById('wol_hl_float_palette')) return;

        const palette = document.createElement('div');
        palette.id = 'wol_hl_float_palette';
        palette.style.cssText = 'position:fixed;z-index:2147483646;background:#f0f0f0;border:1px solid #d0d0d0;border-radius:8px;padding:0 10px;height:44px;display:flex;align-items:center;gap:13px;box-shadow:0 2px 10px rgba(0,0,0,0.12);user-select:none;-webkit-user-select:none;touch-action:none;cursor:grab;top:56px;left:10px;';
        const handle = document.createElement('div');
        handle.style.cssText = 'color:#bbb;font-size:15px;cursor:grab;padding:0 2px;line-height:1;flex-shrink:0;';
        handle.textContent = '⠿'; handle.title = 'Drag to move';
        palette.appendChild(handle);
        hlColors.forEach(c => {
            const dot = document.createElement('div');
            dot.style.cssText = 'width:24px;height:24px;border-radius:50%;background:' + (c === '#fff176' ? '#ffd600' : c === '#e1bee7' ? '#d4aaee' : c) + ';border:1.5px solid rgba(0,0,0,0.15);cursor:pointer;flex-shrink:0;transition:transform 0.12s,box-shadow 0.12s;box-shadow:0 1px 3px rgba(0,0,0,0.15);';
            dot.title = 'Highlight';
            let dotLong = false, dotTimer = null;
            dot.addEventListener('mousedown', e => { if (e.button !== 0) return; e.preventDefault(); dotLong = false; dotTimer = setTimeout(() => { dotLong = true; }, 500); });
            dot.addEventListener('mouseup', () => { if (dotTimer) { clearTimeout(dotTimer); dotTimer = null; } });
            dot.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (dotLong) { dotLong = false; return; } applyHighlightColor(c); });
            dot.addEventListener('touchstart', () => { dotLong = false; dotTimer = setTimeout(() => { dotLong = true; }, 500); }, { passive: true });
            dot.addEventListener('touchend', e => { if (dotTimer) { clearTimeout(dotTimer); dotTimer = null; } if (dotLong) { dotLong = false; return; } e.preventDefault(); e.stopPropagation(); applyHighlightColor(c); }, { passive: false });
            palette.appendChild(dot);
        });
        const closeBtn = document.createElement('div');
        closeBtn.style.cssText = 'color:#999;font-size:16px;cursor:pointer;padding:0 2px;line-height:1;font-family:sans-serif;flex-shrink:0;';
        closeBtn.textContent = '✕'; closeBtn.title = 'Close palette';
        closeBtn.addEventListener('click', e => { e.stopPropagation(); hideFloatingPalette(); });
        closeBtn.addEventListener('touchend', e => { e.preventDefault(); e.stopPropagation(); hideFloatingPalette(); }, { passive: false });
        palette.appendChild(closeBtn);
        let dragActive = false, dragStartX = 0, dragStartY = 0, palStartX = 0, palStartY = 0;
        function startDrag(cx, cy) {
            dragActive = true; palette.style.cursor = 'grabbing';
            const rect = palette.getBoundingClientRect();
            dragStartX = cx; dragStartY = cy; palStartX = rect.left; palStartY = rect.top;
        }
        function moveDrag(cx, cy) {
            if (!dragActive) return;
            const dx = cx - dragStartX, dy = cy - dragStartY;
            const newX = Math.max(0, Math.min(window.innerWidth - palette.offsetWidth, palStartX + dx));
            const newY = Math.max(0, Math.min(window.innerHeight - palette.offsetHeight, palStartY + dy));
            palette.style.left = newX + 'px'; palette.style.top = newY + 'px';
        }
        function endDrag() { dragActive = false; palette.style.cursor = 'grab'; }
        handle.addEventListener('mousedown', e => { e.preventDefault(); startDrag(e.clientX, e.clientY); });
        document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup', endDrag);
        handle.addEventListener('touchstart', e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: true });
        document.addEventListener('touchmove', e => { if (!dragActive) return; moveDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
        document.addEventListener('touchend', endDrag, { passive: true });
        palette.addEventListener('mousedown', e => e.preventDefault());
        document.body.appendChild(palette);

        // On iOS: position palette to the right of the HL icon (saves vertical space).
        // On desktop: position below the HL icon, left edges flush.
        const hlBtn = document.getElementById('wol_hl_icon_btn');
        if (hlBtn) {
            const btnRect = hlBtn.getBoundingClientRect();
            if (isIOS) {
                // Right of icon, vertically centred on it
                const left = Math.min(btnRect.right + 6, window.innerWidth - palette.offsetWidth - 6);
                const top = btnRect.top + (btnRect.height / 2) - (palette.offsetHeight / 2);
                palette.style.left = Math.max(left, btnRect.right + 4) + 'px';
                palette.style.top = Math.max(top, 4) + 'px';

            } else {
                // Desktop: horizontally centred in the viewport
                const top = btnRect.bottom + 6;
                const left = (window.innerWidth - palette.offsetWidth) / 2;
                palette.style.top = Math.max(top, 0) + 'px';
                palette.style.left = Math.max(left, 6) + 'px';
            }
        }
    }

    function hideFloatingPalette() {
        const p = document.getElementById('wol_hl_float_palette');
        if (p) p.remove();

    }

    function applyHighlightColor(c) {
        if (!currentRange) return;
        const rangeToHighlight = currentRange.cloneRange();
        currentRange = null;
        window.getSelection().removeAllRanges();
        try { smartHighlight(rangeToHighlight, c); } catch(err) { console.warn('Highlight error:', err); }
    }

    function buildHighlightIconBtn() {
    if (document.getElementById('wol_hl_icon_btn')) return;
    const menuBar = document.getElementById('menuBar');
    if (!menuBar) return;
    const li = document.createElement('li');
    li.id = 'wol_hl_icon_li'; li.className = 'chrome menuButton';
    const btn = document.createElement('div');
    btn.id = 'wol_hl_icon_btn'; btn.innerHTML = HL_SVG; btn.title = 'Tap: toggle highlighter  |  Long-press: export/import/clear';

    function onTap() {
            // If panel is open, close it first, leave palette as is
            const panel = document.getElementById('wol_mode_panel');
            if (panel && panel.classList.contains('pp-open')) { hidePanel(); return; }
            // Otherwise toggle palette
            if (document.getElementById('wol_hl_float_palette')) hideFloatingPalette();
            else showFloatingPalette();
        }

        let hlIconLongPressTimer = null, hlIconLongPressed = false;
        btn.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            hlIconLongPressed = false;
            hlIconLongPressTimer = setTimeout(() => {
                hlIconLongPressed = true;
                hideFloatingPalette();
                const panel = document.getElementById('wol_mode_panel');
                if (panel && panel.classList.contains('pp-open')) hidePanel();
                else showPanel(btn, buildHighlightExtrasPanel, true);
            }, 500);
        });
        btn.addEventListener('mouseup', () => { if (hlIconLongPressTimer) { clearTimeout(hlIconLongPressTimer); hlIconLongPressTimer = null; } });
        btn.addEventListener('mouseleave', () => { if (hlIconLongPressTimer) { clearTimeout(hlIconLongPressTimer); hlIconLongPressTimer = null; } });
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (hlIconLongPressed) { hlIconLongPressed = false; return; } onTap(); });

        let hlTouchLong = false;
        btn.addEventListener('touchstart', () => {
            hlTouchLong = false;
            hlIconLongPressTimer = setTimeout(() => {
                hlTouchLong = true;
                hideFloatingPalette();
                const panel = document.getElementById('wol_mode_panel');
                if (panel && panel.classList.contains('pp-open')) hidePanel();
                else showPanel(btn, buildHighlightExtrasPanel, true);
            }, 500);
        }, { passive: true });
        btn.addEventListener('touchmove', () => { if (hlIconLongPressTimer) { clearTimeout(hlIconLongPressTimer); hlIconLongPressTimer = null; } }, { passive: true });
        btn.addEventListener('touchend', e => {
            if (hlIconLongPressTimer) { clearTimeout(hlIconLongPressTimer); hlIconLongPressTimer = null; }
            e.preventDefault(); e.stopPropagation();
            if (hlTouchLong) { hlTouchLong = false; return; }
            onTap();
        }, { passive: false });
        btn.addEventListener('contextmenu', e => e.preventDefault(), true);
        li.appendChild(btn);
        const menuBible = document.getElementById('menuBible');
        if (menuBible) menuBar.insertBefore(li, menuBible); else menuBar.insertBefore(li, menuBar.firstChild);
    }

    // ── Export / Import / Clear ──
    function exportHighlights() {
        if (!db) { alert(t('dbNotReady')); return; }
        const transaction = db.transaction(['highlights'], 'readonly');
        const store = transaction.objectStore('highlights');
        const request = store.getAll();
        request.onsuccess = () => {
            const allData = request.result;
            if (allData.length === 0) { alert(t('noHLExport')); return; }
            // Unified format — same as pinyin+highlights export, pinyin left empty
            const combined = { pinyin: {}, highlights: allData };
            const blob = new Blob([JSON.stringify(combined, null, 2)], { type: 'application/json' });
            const filename = prompt(t('promptExportHL'));
            if (!filename) return;
            const finalFilename = filename.endsWith('.json') ? filename : filename + '.json';
            _downloadFile(blob, allData.length, finalFilename);
        };
    }
    function _downloadFile(blob, count, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = filename || `wol-highlights-${new Date().toISOString().split('T')[0]}.json`;
        if (navigator.share && blob.size < 10485760) {
            blob.text().then(text => {
                const file = new File([text], a.download, { type: 'application/json' });
                navigator.share({ files: [file], title: 'WOL Highlights Export', text: `Exported ${count} pages` })
                    .catch(() => _triggerDownload(a, url, count));
            });
        } else { _triggerDownload(a, url, count); }
    }
    function _triggerDownload(a, url, count) {
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 100);
        alert(t('exportedHL', count));
    }
    function importHighlights() {
        _importUnified(false); // false = ask about pinyin if found
    }
    function _importUnified(silentPinyin) {
        if (!db) { alert(t('dbNotReady')); return; }
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json,.json';
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onerror = () => alert('Error reading file: ' + reader.error);
            reader.onload = (event) => {
                try {
                    const raw = JSON.parse(event.target.result);
                    // Detect format:
                    // Unified: { pinyin: {}, highlights: [...] }
                    // Old HL-only: [{pageID, highlights}, ...]
                    let hlData, pinyinData;
                    if (Array.isArray(raw)) {
                        // Old format — highlights array only
                        hlData = raw; pinyinData = null;
                    } else if (raw && Array.isArray(raw.highlights)) {
                        // Unified format
                        hlData = raw.highlights;
                        pinyinData = (raw.pinyin && Object.keys(raw.pinyin).length > 0) ? raw.pinyin : null;
                    } else { alert(t('invalidFormat')); return; }

                    // Ask about pinyin if found and not silent
                    const doPinyin = pinyinData && (silentPinyin || confirm(t('pinyinFound')));

                    if (doPinyin) {
                        Object.entries(pinyinData).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
                    }

                    if (hlData && hlData.length > 0) {
                        if (!db.objectStoreNames.contains('highlights')) { alert(t('dbNotReady')); return; }
                        const transaction = db.transaction(['highlights'], 'readwrite');
                        const store = transaction.objectStore('highlights');
                        let imported = 0, errors = 0;
                        hlData.forEach(item => { if (item.pageID && item.highlights) { try { store.put(item); imported++; } catch(err) { errors++; } } });
                        transaction.oncomplete = () => { alert(t('importedHL', imported, errors)); setTimeout(() => window.location.reload(), 300); };
                        transaction.onerror = () => alert('Error importing: ' + transaction.error);
                    } else {
                        alert(t('importSuccess'));
                    }
                } catch(err) { alert(t('invalidJSON')); }
            };
            setTimeout(() => reader.readAsText(file), 300);
        };
        input.click();
    }
    function clearAllHighlights() {
        if (!db) { alert(t('dbNotReady')); return; }
        if (!confirm(t('confirmClearHL'))) return;
        const transaction = db.transaction(['highlights'], 'readwrite');
        const request = transaction.objectStore('highlights').clear();
        request.onsuccess = () => { alert(t('allHLCleared')); setTimeout(() => window.location.reload(), 300); };
        request.onerror = () => alert('Error clearing highlights');
    }

    // ── HL icon persistence observer ──
    let _hlIconCheckTimer = null;
    const hlIconObserver = new MutationObserver(() => {
        if (_hlIconCheckTimer) return;
        _hlIconCheckTimer = setTimeout(() => { _hlIconCheckTimer = null; if (!document.getElementById('wol_hl_icon_btn')) buildHighlightIconBtn(); }, 150);
    });
    hlIconObserver.observe(document.body, { childList: true, subtree: true });

    // ── Tooltip support ──
    function addPaletteToTooltip(tooltip) {
        if (tooltip.querySelector('.hl_tooltip_palette')) return;
        const tooltipHeader = tooltip.querySelector('.tooltipHeader');
        if (!tooltipHeader) return;
        tooltip.querySelectorAll('a.bibleCitation, a.publicationCitation, a[class*="pub-"]').forEach(link => {
            link.addEventListener('click', () => {
                tooltip.querySelectorAll('span[data-highlight-id]').forEach(span => unwrapSpan(span));
                const container = tooltip.closest('.tooltipContainer, .tooltip') || tooltip;
                container.style.display = 'none'; container.remove();
            }, { once: true });
        });
        tooltipHeader.style.cssText = 'display:flex !important;align-items:center !important;justify-content:flex-start !important;flex-wrap:nowrap !important;gap:0 !important;';
        const tooltipType = tooltipHeader.querySelector('.tooltipType');
        if (tooltipType) tooltipType.style.display = 'none';
        const tooltipPalette = document.createElement('div');
        tooltipPalette.className = 'hl_tooltip_palette';
        tooltipPalette.style.cssText = 'display:flex !important;align-items:center;gap:6px;padding:4px 8px;flex-shrink:0;order:-1;';
        hlColors.forEach(c => {
            const btn = document.createElement('div');
            btn.style.cssText = 'width:16px;height:16px;border-radius:50%;cursor:pointer;border:1px solid #999;background:' + c + ';flex-shrink:0;';
            btn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (!currentRange) { alert(t('selectFirst')); return; }
                const rangeToHighlight = currentRange.cloneRange();
                currentRange = null;
                window.getSelection().removeAllRanges();
                try { smartHighlight(rangeToHighlight, c); } catch(err) { alert('Selection too complex: ' + err.message); }
            };
            tooltipPalette.appendChild(btn);
        });
        const tooltipClose = tooltipHeader.querySelector('.tooltipClose');
        if (tooltipClose) { tooltipClose.style.cssText = 'flex-shrink:0;margin-left:auto;order:999;'; tooltipHeader.insertBefore(tooltipPalette, tooltipClose); }
        else tooltipHeader.appendChild(tooltipPalette);
        hideReferenceSymbolsInTooltip(tooltip);
    }

    // ── PhotoSwipe alt text ──
    const imageAltTextMap = new Map();
    let pswpActive = false, currentAltDiv = null;

    function resetPhotoSwipeState(pswp, imgObserver, closeObserver) {
        if (imgObserver) imgObserver.disconnect();
        if (closeObserver) closeObserver.disconnect();
        pswpActive = false; currentAltDiv = null;
        pswp.querySelectorAll('#pswp-alt-text-display').forEach(div => { div.style.opacity = '0'; setTimeout(() => div.remove(), 200); });
    }
    function handlePhotoSwipeOpen(pswp) {
        resetPhotoSwipeState(pswp); pswpActive = true;
        const altDiv = document.createElement('div'); altDiv.id = 'pswp-alt-text-display';
        altDiv.style.cssText = 'position:absolute;left:12px;right:12px;background:rgba(0,0,0,0.85);color:#fff;padding:8px 12px;border-radius:6px;font-size:15px;line-height:1.5;text-align:left;max-width:calc(100% - 24px);z-index:10050;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,0.9);pointer-events:auto;user-select:text;visibility:hidden;opacity:0;transition:opacity 0.2s ease;-webkit-transform:translate3d(0,0,0);backface-visibility:hidden;';
        altDiv.addEventListener('click', e => { if (e.target === altDiv) altDiv.remove(); });
        pswp.appendChild(altDiv); currentAltDiv = altDiv;
        const container = pswp.querySelector('.pswp__container');
        if (container) {
            // Watch only childList (actual slide changes) — attribute/style mutations
            // are triggered by mouse movement and cause constant flicker if observed.
            const imgObserver = new MutationObserver(() => { if (pswpActive) displayAltText(pswp); });
            imgObserver.observe(container, { childList: true, subtree: true });
            const closeObserver = new MutationObserver(() => { if (!pswp.classList.contains('pswp--open')) resetPhotoSwipeState(pswp, imgObserver, closeObserver); });
            closeObserver.observe(pswp, { attributes: true, attributeFilter: ['class'] });
        }
        displayAltText(pswp);
    }
    function displayAltText(pswp) {
        if (!pswpActive) return;
        const last = imageAltTextMap.get('lastClicked'); if (!last) return;
        const altDiv = currentAltDiv || pswp.querySelector('#pswp-alt-text-display'); if (!altDiv) return;
        const img = pswp.querySelector('.pswp__img:not(.pswp__img--placeholder)'); if (!img) return;
        // Already showing this alt text — don't re-run and cause a visibility flicker.
        if (altDiv.textContent === last.altText && altDiv.style.opacity === '1') return;
        altDiv.textContent = last.altText;
        const positionAndShow = () => {
            if (!pswpActive || !img.offsetHeight) return;
            const imgRect = img.getBoundingClientRect(), pswpRect = pswp.getBoundingClientRect();
            const top = Math.max(imgRect.top - pswpRect.top - altDiv.offsetHeight - 10, 30);
            altDiv.style.top = top + 'px'; altDiv.style.visibility = 'visible';
            requestAnimationFrame(() => { altDiv.style.opacity = '1'; });
        };
        const waitForLayout = () => {
            if (img.complete && img.naturalWidth > 0 && img.offsetHeight > 0) {
                const container = pswp.querySelector('.pswp__container');
                let fired = false;
                const triggerPosition = () => { if (fired) return; fired = true; requestAnimationFrame(() => positionAndShow()); };
                if (container) container.addEventListener('transitionend', triggerPosition, { once: true });
                setTimeout(triggerPosition, 50);
            } else { img.addEventListener('load', waitForLayout, { once: true }); }
        };
        waitForLayout();
    }
    function initPhotoSwipeAltText() {
        document.addEventListener('click', function(e) {
            const img = e.target.tagName === 'IMG' ? e.target : e.target.querySelector('img');
            if (img && (img.alt || img.title)) imageAltTextMap.set('lastClicked', { altText: img.alt || img.title, timestamp: Date.now(), imgSrc: img.src || img.getAttribute('data-src') || '' });
        }, true);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.type !== 'attributes' || m.attributeName !== 'class') return;
                const pswp = m.target;
                if (!pswp.classList.contains('pswp')) return;
                const wasOpen = m.oldValue && m.oldValue.split(' ').includes('pswp--open');
                const isOpen = pswp.classList.contains('pswp--open');
                // Only fire on the transition TO open, not on every subsequent class tweak
                if (isOpen && !wasOpen) handlePhotoSwipeOpen(pswp);
            });
        });
        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
        const existing = document.querySelector('.pswp.pswp--open');
        if (existing) handlePhotoSwipeOpen(existing);
    }
    initPhotoSwipeAltText();

    // Block qu collapse when palette is open
    ['pointerdown','mousedown','click'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            if (!document.getElementById('wol_hl_float_palette')) return;
            if (e.target.closest('p.qu')) e.stopImmediatePropagation();
        }, { capture: true });
    });

    // ── Tooltip observer ──
    const tooltipObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const mode = getMode();
                    function processTooltip(t) {
                        setTimeout(() => { restoreHighlights(t); addPaletteToTooltip(t); hideReferenceSymbolsInTooltip(t); }, 100);
                        if (mode === 'study') {
                            setTimeout(() => { hideReferenceSymbolsInTooltip(t); const content = t.querySelector('.tooltipText, .tooltipContent') || t; applyModeToTooltip(content); }, 400);
                        }
                    }
                    if (node.classList && (node.classList.contains('tooltip') || node.classList.contains('tooltipContainer'))) processTooltip(node);
                    node.querySelectorAll && node.querySelectorAll('.tooltip, .tooltipContainer').forEach(processTooltip);
                }
            });
        });
    });
    tooltipObserver.observe(document.body, { childList: true, subtree: true });

    // ─────────────────────────────────────────────────────────────
    // 7. SYNC / REFERENCE LOGIC  (from script3)
    // ─────────────────────────────────────────────────────────────

    // ── Language config ──
    function detectBrowserLanguage() {
        const lang = (navigator.language || navigator.userLanguage || navigator.browserLanguage || (navigator.languages && navigator.languages[0]) || 'en').toLowerCase();
        if (lang.startsWith('ko')) return 'korean';
        if (lang.startsWith('ja')) return 'japanese';
        if (lang.startsWith('es')) return 'spanish';
        return 'english';
    }

    function getLanguageConfig() {
        const configs = {
            english: {
                label: 'ENG ↔ CHS',
                isPage: () => location.href.includes('/lp-e') || location.href.includes('/en/wol/'),
                isSyncPage: () => ['/meetings/r1/lp-e','/msync/r1/lp-e','/d/r1/lp-e','/dsync/r1/lp-e','/b/r1/lp-e/nwtsty','/bsync/r1/lp-e/nwtsty','/h/r1/lp-e'].some(p => location.href.includes(p))
            },
            korean: {
                label: 'KOR ↔ CHS',
                isPage: () => location.href.includes('/lp-ko') || location.href.includes('/ko/wol/'),
                isSyncPage: () => ['/meetings/r8/lp-ko','/msync/r8/lp-ko','/d/r8/lp-ko','/dsync/r8/lp-ko','/b/r8/lp-ko/nwtsty','/bsync/r8/lp-ko/nwtsty','/h/r8/lp-ko'].some(p => location.href.includes(p))
            },
            japanese: {
                label: 'JPN ↔ CHS',
                isPage: () => location.href.includes('/lp-j') || location.href.includes('/ja/wol/'),
                isSyncPage: () => ['/meetings/r7/lp-j','/msync/r7/lp-j','/d/r7/lp-j','/dsync/r7/lp-j','/b/r7/lp-j/nwtsty','/bsync/r7/lp-j/nwtsty','/h/r7/lp-j'].some(p => location.href.includes(p))
            },
            spanish: {
                label: 'SPA ↔ CHS',
                isPage: () => location.href.includes('/lp-s') || location.href.includes('/es/wol/'),
                isSyncPage: () => ['/meetings/r4/lp-s','/msync/r4/lp-s','/d/r4/lp-s','/dsync/r4/lp-s','/b/r4/lp-s/nwtsty','/bsync/r4/lp-s/nwtsty','/h/r4/lp-s'].some(p => location.href.includes(p))
            }
        };
        return configs[detectBrowserLanguage()];
    }
    const CURRENT_LANG_CONFIG = getLanguageConfig();

    const findToggleItem = pattern => {
        for (const li of document.querySelectorAll('.documentMenu li.toggle')) { if (pattern.test(li.textContent)) return li; }
        return null;
    };
    const findReferenceToggle = () => findToggleItem(/Reference Symbols|脚注符号|참조 기호|ふりがな|Símbolos de las notas/i);
    const findNativePinyinToggle = () => findToggleItem(/拼音|Pinyin|pinyin/i);
    const isEnglishPage = () => CURRENT_LANG_CONFIG.isPage();
    const isChinesePage = () => location.href.includes('/lp-chs') || location.href.includes('/cmn-Hans/');
    const isSyncEnabledPage = () => CURRENT_LANG_CONFIG.isSyncPage();

    // ── Native pinyin toggle guard ──
    function attachNativePinyinToggleGuard() {
        if (!location.href.includes('lp-chs-rb')) return;
        const toggle = findNativePinyinToggle();
        if (!toggle || toggle.dataset.pinyinGuardAttached) return;
        toggle.dataset.pinyinGuardAttached = 'true';
        toggle.addEventListener('click', (e) => {
            const isPinyinOn = toggle.classList.contains('showRuby-CHS');
            if (isPinyinOn && localStorage.getItem('wol_app_mode') === 'study') {
                e.stopImmediatePropagation(); e.preventDefault();
                toggle.classList.remove('showRuby-CHS');
                localStorage.setItem('wol_app_mode', 'default');
                showSyncToast(t('regularMode'));
                setTimeout(() => window.location.assign(location.href.replace(/lp-chs-rb/g, 'lp-chs')), 1000);
            }
        }, true);
    }

    // ── Reference symbols persistence ──
    function hideRubyIndicator() {
        const ind = document.querySelector('.rubyIndicator.showRuby-CHS');
        if (ind) ind.style.display = 'none';
    }
    function applyLookupReferenceState() {
        if (!location.href.includes('/wol/s/') && !document.querySelector('article.lookup')) return;
        const saved = localStorage.getItem(STORAGE_KEY_REFERENCE);
        const hide = saved === 'false';
        document.querySelectorAll('article.lookup a.b').forEach(link => {
            if (/^[\+\*\#]+$/.test(link.textContent.trim())) link.style.visibility = hide ? 'hidden' : '';
        });
    }

    function applySavedState() {
        const toggle = findReferenceToggle();
        if (toggle) {
            const checkbox = toggle.querySelector("input[type='checkbox']");
            if (checkbox) {
                const saved = localStorage.getItem(STORAGE_KEY_REFERENCE);
                if (saved !== null && checkbox.checked.toString() !== saved) toggle.click();
                if (!toggle.dataset.persistAttached) {
                    toggle.addEventListener('click', () => localStorage.setItem(STORAGE_KEY_REFERENCE, checkbox.checked.toString()));
                    toggle.dataset.persistAttached = 'true';
                }
            }
        } else { setTimeout(applySavedState, 100); }
        hideRubyIndicator();
        applyLookupReferenceState();
        attachNativePinyinToggleGuard();
    }

    // ── Scroll fix ──
    function fixScrollToParagraph() {
        const hash = window.location.hash;
        if (!hash) return;
        let targetElement = null, isVerse = false;
        const paraMatch = hash.match(/#h=(\d+)/);
        if (paraMatch) targetElement = document.getElementById('p' + paraMatch[1]);
        if (!targetElement) {
            const verseMatch = hash.match(/[#&]v=(\d+)(?::(\d+))?(?::(\d+))?/);
            if (verseMatch) {
                let book, chapter, verse;
                if (verseMatch[3] !== undefined) { [, book, chapter, verse] = verseMatch; }
                else if (verseMatch[2] !== undefined) {
                    const bookMatch = location.href.match(/\/(\d+)\/\d+#/);
                    book = bookMatch ? bookMatch[1] : null; chapter = verseMatch[1]; verse = verseMatch[2];
                }
                if (book && chapter && verse) {
                    let wordSpan = document.getElementById(`v${book}-${chapter}-${verse}-1`);
                    if (!wordSpan) wordSpan = document.getElementById(`v${book}-${chapter}-${verse}`);
                    targetElement = wordSpan?.closest('span.v') ?? wordSpan;
                    isVerse = true;
                }
            }
        }
        if (!targetElement) return;
        const isPinyin = location.href.includes('lp-chs-rb');
        const delay = isVerse ? 900 : 500, offset = isVerse ? (isPinyin ? 160 : 140) : 130;
        setTimeout(() => {
            const el = document.getElementById(targetElement.id); if (!el) return;
            let absTop = 0, node = el;
            while (node) { absTop += node.offsetTop; node = node.offsetParent; }
            window.scrollTo({ top: absTop - offset, behavior: 'smooth' });
            const origBg = el.style.background;
            el.style.background = '#fff9c0';
            setTimeout(() => { el.style.background = origBg; }, 1000);
        }, delay);
    }

    // ── Sync rules ──
    const syncRules = {
        english: {
            standard: [
                ["msync/r1/lp-e/r23/lp-chs","meetings/r1/lp-e"],["meetings/r1/lp-e","msync/r1/lp-e/r23/lp-chs"],
                ["cmn-Hans/wol/meetings/r23/lp-chs","en/wol/meetings/r1/lp-e"],["d/r1/lp-e","dsync/r1/lp-e/r23/lp-chs"],
                ["dsync/r1/lp-e/r23/lp-chs","d/r1/lp-e"],["cmn-Hans/wol/d/r23/lp-chs","en/wol/d/r1/lp-e"],
                ["b/r1/lp-e/nwtsty","bsync/r1/lp-e/nwtsty/r23/lp-chs"],["bsync/r1/lp-e/nwtsty/r23/lp-chs","b/r1/lp-e/nwtsty"],
                ["cmn-Hans/wol/b/r23/lp-chs/nwtsty","en/wol/b/r1/lp-e/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs","en/wol/h/r1/lp-e"],["en/wol/h/r1/lp-e","cmn-Hans/wol/h/r23/lp-chs"]
            ],
            pinyin: [
                ["msync/r1/lp-e/r23/lp-chs-rb","meetings/r1/lp-e"],["meetings/r1/lp-e","msync/r1/lp-e/r23/lp-chs-rb"],
                ["cmn-Hans/wol/meetings/r23/lp-chs-rb","en/wol/meetings/r1/lp-e"],["d/r1/lp-e","dsync/r1/lp-e/r23/lp-chs-rb"],
                ["dsync/r1/lp-e/r23/lp-chs-rb","d/r1/lp-e"],["cmn-Hans/wol/d/r23/lp-chs-rb","en/wol/d/r1/lp-e"],
                ["b/r1/lp-e/nwtsty","bsync/r1/lp-e/nwtsty/r23/lp-chs-rb"],["bsync/r1/lp-e/nwtsty/r23/lp-chs-rb","b/r1/lp-e/nwtsty"],
                ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","en/wol/b/r1/lp-e/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs-rb","en/wol/h/r1/lp-e"],["en/wol/h/r1/lp-e","cmn-Hans/wol/h/r23/lp-chs-rb"]
            ]
        },
        korean: {
            standard: [
                ["msync/r8/lp-ko/r23/lp-chs","meetings/r8/lp-ko"],["meetings/r8/lp-ko","msync/r8/lp-ko/r23/lp-chs"],
                ["d/r8/lp-ko","dsync/r8/lp-ko/r23/lp-chs"],["dsync/r8/lp-ko/r23/lp-chs","d/r8/lp-ko"],
                ["b/r8/lp-ko/nwtsty","bsync/r8/lp-ko/nwtsty/r23/lp-chs"],["bsync/r8/lp-ko/nwtsty/r23/lp-chs","b/r8/lp-ko/nwtsty"],
                ["cmn-Hans/wol/meetings/r23/lp-chs","ko/wol/meetings/r8/lp-ko"],["cmn-Hans/wol/d/r23/lp-chs","ko/wol/d/r8/lp-ko"],
                ["cmn-Hans/wol/b/r23/lp-chs/nwtsty","ko/wol/b/r8/lp-ko/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs","ko/wol/h/r8/lp-ko"],["ko/wol/h/r8/lp-ko","cmn-Hans/wol/h/r23/lp-chs"]
            ],
            pinyin: [
                ["msync/r8/lp-ko/r23/lp-chs-rb","meetings/r8/lp-ko"],["meetings/r8/lp-ko","msync/r8/lp-ko/r23/lp-chs-rb"],
                ["d/r8/lp-ko","dsync/r8/lp-ko/r23/lp-chs-rb"],["dsync/r8/lp-ko/r23/lp-chs-rb","d/r8/lp-ko"],
                ["b/r8/lp-ko/nwtsty","bsync/r8/lp-ko/nwtsty/r23/lp-chs-rb"],["bsync/r8/lp-ko/nwtsty/r23/lp-chs-rb","b/r8/lp-ko/nwtsty"],
                ["cmn-Hans/wol/meetings/r23/lp-chs-rb","ko/wol/meetings/r8/lp-ko"],["cmn-Hans/wol/d/r23/lp-chs-rb","ko/wol/d/r8/lp-ko"],
                ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","ko/wol/b/r8/lp-ko/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs-rb","ko/wol/h/r8/lp-ko"],["ko/wol/h/r8/lp-ko","cmn-Hans/wol/h/r23/lp-chs-rb"]
            ]
        },
        japanese: {
            standard: [
                ["msync/r7/lp-j/r23/lp-chs","meetings/r7/lp-j"],["meetings/r7/lp-j","msync/r7/lp-j/r23/lp-chs"],
                ["cmn-Hans/wol/meetings/r23/lp-chs","ja/wol/meetings/r7/lp-j"],["d/r7/lp-j","dsync/r7/lp-j/r23/lp-chs"],
                ["dsync/r7/lp-j/r23/lp-chs","d/r7/lp-j"],["cmn-Hans/wol/d/r23/lp-chs","ja/wol/d/r7/lp-j"],
                ["b/r7/lp-j/nwtsty","bsync/r7/lp-j/nwtsty/r23/lp-chs"],["bsync/r7/lp-j/nwtsty/r23/lp-chs","b/r7/lp-j/nwtsty"],
                ["cmn-Hans/wol/b/r23/lp-chs/nwtsty","ja/wol/b/r7/lp-j/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs","ja/wol/h/r7/lp-j"],["ja/wol/h/r7/lp-j","cmn-Hans/wol/h/r23/lp-chs"]
            ],
            pinyin: [
                ["msync/r7/lp-j/r23/lp-chs-rb","meetings/r7/lp-j"],["meetings/r7/lp-j","msync/r7/lp-j/r23/lp-chs-rb"],
                ["cmn-Hans/wol/meetings/r23/lp-chs-rb","ja/wol/meetings/r7/lp-j"],["d/r7/lp-j","dsync/r7/lp-j/r23/lp-chs-rb"],
                ["dsync/r7/lp-j/r23/lp-chs-rb","d/r7/lp-j"],["cmn-Hans/wol/d/r23/lp-chs-rb","ja/wol/d/r7/lp-j"],
                ["b/r7/lp-j/nwtsty","bsync/r7/lp-j/nwtsty/r23/lp-chs-rb"],["bsync/r7/lp-j/nwtsty/r23/lp-chs-rb","b/r7/lp-j/nwtsty"],
                ["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","ja/wol/b/r7/lp-j/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs-rb","ja/wol/h/r7/lp-j"],["ja/wol/h/r7/lp-j","cmn-Hans/wol/h/r23/lp-chs-rb"]
            ]
        },
        spanish: {
            standard: [
                ["msync/r4/lp-s/r23/lp-chs","meetings/r4/lp-s"],["meetings/r4/lp-s","msync/r4/lp-s/r23/lp-chs"],
                ["cmn-Hans/wol/meetings/r23/lp-chs","es/wol/meetings/r4/lp-s"],["d/r4/lp-s","dsync/r4/lp-s/r23/lp-chs"],
                ["dsync/r4/lp-s/r23/lp-chs","d/r4/lp-s"],["cmn-Hans/wol/d/r23/lp-chs","es/wol/d/r4/lp-s"],
                ["b/r4/lp-s/nwtsty","bsync/r4/lp-s/nwtsty/r23/lp-chs"],["bsync/r4/lp-s/nwtsty/r23/lp-chs","b/r4/lp-s/nwtsty"],
                ["cmn-Hans/wol/b/r23/lp-chs/nwtsty","es/wol/b/r4/lp-s/nwtsty"],["cmn-Hans/wol/h/r23/lp-chs","es/wol/h/r4/lp-s"],["es/wol/h/r4/lp-s","cmn-Hans/wol/h/r23/lp-chs"]
            ],
            pinyin: [
                ["msync/r4/lp-s/r23/lp-chs-rb","meetings/r4/lp-s"],["meetings/r4/lp-s","msync/r4/lp-s/r23/lp-chs-rb"],
                ["cmn-Hans/wol/meetings/r23/lp-chs-rb","es/wol/meetings/r4/lp-s"],["d/r4/lp-s","dsync/r4/lp-s/r23/lp-chs-rb"],
                ["dsync/r4/lp-s/r23/lp-chs-rb","d/r4/lp-s"],["cmn-Hans/wol/b/r23/lp-chs-rb/nwtsty","es/wol/b/r4/lp-s/nwtsty"],
                ["cmn-Hans/wol/h/r23/lp-chs-rb","es/wol/h/r4/lp-s"],["es/wol/h/r4/lp-s","cmn-Hans/wol/h/r23/lp-chs-rb"]
            ]
        }
    };

    function shouldUsePinyin() {
        if (location.href.includes('lp-chs-rb')) return true;
        if (isEnglishPage() && !isChinesePage()) return localStorage.getItem(STORAGE_KEY_PINYIN) === 'true';
        return false;
    }
    function getSyncRulesForCurrentLanguage() {
        const langRules = syncRules[detectBrowserLanguage()];
        return shouldUsePinyin() ? langRules.pinyin : langRules.standard;
    }
    function getSyncTarget(url, rules) {
        const hashIndex = url.indexOf('#');
        const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
        const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
        const sorted = [...rules].sort((a, b) => b[0].length - a[0].length);
        for (const [from, to] of sorted) { if (base.includes(from)) return base.replace(from, to) + hash; }
        return null;
    }
    function getSelectedVerseHash() {
        const highlighted = document.querySelectorAll('.v.jwac-textHighlight');
        if (highlighted.length > 0) {
            const refs = []; const seen = new Set();
            highlighted.forEach(v => {
                const idMatch = v.id?.match(/v(\d+)-(\d+)-(\d+)/);
                if (idMatch) { const key = `${idMatch[1]}:${idMatch[2]}:${idMatch[3]}`; if (!seen.has(key)) { seen.add(key); refs.push(key); } }
            });
            if (refs.length > 0) return `#study=discover&v=${refs.join(',')}`;
        }
        const selectedLink = document.querySelector('a.cl.vx.vp.tt.selected, span.tt.vl.selected');
        if (selectedLink) {
            const verseSpan = selectedLink.closest('.v');
            if (verseSpan) { const idMatch = verseSpan.id?.match(/v(\d+)-(\d+)-(\d+)/); if (idMatch) return `#study=discover&v=${idMatch[1]}:${idMatch[2]}:${idMatch[3]}`; }
        }
        return location.hash.replace(/[#&]s=\d+/, m => m.startsWith('#') ? '#' : '').replace(/#&/, '#') || '';
    }
    function showSyncToast(msg) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(30,30,30,0.92);color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:15px;font-weight:500;padding:12px 22px;border-radius:999px;z-index:2147483647;pointer-events:none;white-space:nowrap;box-shadow:0 4px 18px rgba(0,0,0,0.28);opacity:0;transition:opacity 0.2s ease';
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1800);
    }
    function handleSyncClick() {
        if (localStorage.getItem('wol_app_mode') === 'study') {
            localStorage.setItem('wol_app_mode', 'default');
            // Freeze the icon persistence observer for the duration of the toast
            // delay so it cannot insert a home anchor beside the study icon.
            safeWindow.__wolModeChangePending = true;
            showSyncToast(t('regularMode'));
            setTimeout(() => {
                const hash = location.hash || getSelectedVerseHash();
                const hashIndex = location.href.indexOf('#');
                const base = hashIndex === -1 ? location.href : location.href.slice(0, hashIndex);
                const target = getSyncTarget(base + hash, getSyncRulesForCurrentLanguage());
                if (target) location.href = target; else location.reload();
            }, 1000);
            return;
        }
        setTimeout(() => {
            const hash = getSelectedVerseHash();
            const hashIndex = location.href.indexOf('#');
            const base = hashIndex === -1 ? location.href : location.href.slice(0, hashIndex);
            const target = getSyncTarget(base + hash, getSyncRulesForCurrentLanguage());
            if (target) location.href = target; else alert('No sync rule found for this page.');
        }, 150);
    }

    // ── Sync panel extras (appended to showPanel) ──
    function buildSyncExtras(panel) {
            const syncSection = document.createElement('div'); syncSection.className = 'pp-section';
            const syncTitle = document.createElement('div'); syncTitle.className = 'pp-section-title';
            syncTitle.textContent = t('syncTitle'); syncSection.appendChild(syncTitle);
            let pinyinTrack = null;
            syncSection.appendChild(makeToggleRow(CURRENT_LANG_CONFIG.label, STORAGE_KEY_ENG_CHS_SYNC, true, (newState) => {
                if (!newState && pinyinTrack) { localStorage.setItem(STORAGE_KEY_PINYIN, 'false'); pinyinTrack.classList.remove('on'); }
            }));
            panel.appendChild(syncSection);
            if (isEnglishPage() && !isChinesePage() && isSyncEnabledPage()) {
                const d2 = document.createElement('div'); d2.className = 'pp-divider'; panel.appendChild(d2);
                const pinyinSection = document.createElement('div'); pinyinSection.className = 'pp-section';
                const row = makeToggleRow(t('syncPinyin'), STORAGE_KEY_PINYIN, false);
                pinyinTrack = row.querySelector('.pp-toggle-track');
                pinyinSection.appendChild(row); panel.appendChild(pinyinSection);
            }
        }

        // ── Attach long-press to sync button ──
        function attachSyncButton() {
        const btn = document.getElementById('menuSynchronizeSwitch');
        if (!btn || btn.dataset.longPressAttached) return;
        btn.style.webkitTouchCallout = 'none'; btn.style.webkitUserSelect = 'none';
        const DELAY = 500;
        let timer = null, longPressTriggered = false, touchActive = false, startX = 0, startY = 0;
        function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
        function triggerLongPress() {
            longPressTriggered = true;
            const panel = document.getElementById('wol_mode_panel');
            if (panel && panel.classList.contains('pp-open')) hidePanel();
            else showPanel(btn, buildSyncExtras, true);
        }
        btn.addEventListener('mousedown', () => { if (touchActive) return; longPressTriggered = false; timer = setTimeout(triggerLongPress, DELAY); });
        btn.addEventListener('mouseup', () => { if (touchActive) return; clearTimer(); });
        btn.addEventListener('mouseleave', () => { if (touchActive) return; clearTimer(); });
        btn.addEventListener('click', (e) => {
            if (touchActive) { e.preventDefault(); e.stopImmediatePropagation(); return; }
            if (longPressTriggered) { e.preventDefault(); e.stopImmediatePropagation(); longPressTriggered = false; return; }
            const useCustomSync = (localStorage.getItem(STORAGE_KEY_ENG_CHS_SYNC) ?? 'true') !== 'false';
            if (useCustomSync) { e.preventDefault(); e.stopImmediatePropagation(); handleSyncClick(); }
        }, true);
        btn.addEventListener('touchstart', (e) => {
            touchActive = true; longPressTriggered = false;
            startX = e.touches[0].clientX; startY = e.touches[0].clientY;
            timer = setTimeout(triggerLongPress, DELAY);
        }, { capture: true, passive: true });
        btn.addEventListener('touchmove', (e) => {
            if (!timer) return;
            const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) clearTimer();
        }, { capture: true, passive: true });
        btn.addEventListener('touchend', (e) => {
            clearTimer();
            if (longPressTriggered) { e.preventDefault(); e.stopImmediatePropagation(); longPressTriggered = false; touchActive = false; return; }
            const useCustomSync = (localStorage.getItem(STORAGE_KEY_ENG_CHS_SYNC) ?? 'true') !== 'false';
            if (useCustomSync) { e.preventDefault(); e.stopImmediatePropagation(); handleSyncClick(); }
            touchActive = false;
        }, { capture: true, passive: false });
        btn.addEventListener('touchcancel', () => { clearTimer(); touchActive = false; }, { capture: true });
        btn.addEventListener('contextmenu', (e) => e.preventDefault(), true);
        btn.dataset.longPressAttached = 'true';
    }
    // ── Verse highlight ──
    setTimeout(() => {
        if (window.innerWidth < 768) {
            const toggle = document.querySelector('.studyPaneToggle');
            const studyPane = document.getElementById('study');
            if (studyPane && !studyPane.dataset.tealObserverAttached) {
                new MutationObserver(() => {
                    if (!studyPane.classList.contains('activePane')) document.querySelectorAll('span.tt.vl.selected').forEach(el => el.classList.remove('selected'));
                }).observe(studyPane, { attributes: true, attributeFilter: ['class'] });
                studyPane.dataset.tealObserverAttached = 'true';
            }
            const underlay = document.getElementById('underlayContainer'), modalUnder = document.getElementById('modalUnderlayContainer');
            if (toggle && toggle.classList.contains('expanded')) toggle.classList.remove('expanded');
            if (studyPane && studyPane.classList.contains('activePane')) studyPane.classList.remove('activePane','slideIn');
            if (underlay) underlay.style.display = 'none';
            if (modalUnder) modalUnder.style.display = 'none';
            document.body.classList.remove('noscroll','slideInUnderlay');
            localStorage.setItem('studyPaneOpen','false');
            if (studyPane && !studyPane.dataset.contextObserverAttached) {
                new MutationObserver(() => { if (studyPane.classList.contains('activePane')) { const ctx = document.getElementById('contextMenu'); if (ctx) ctx.style.display = 'none'; } }).observe(studyPane, { attributes: true, attributeFilter: ['class'] });
                studyPane.dataset.contextObserverAttached = 'true';
            }
        }
        document.querySelectorAll('a.vl.vp').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                if ((localStorage.getItem('wol_app_mode') || 'default') === 'study') return;
                document.querySelectorAll('.v.jwac-textHighlight').forEach(v => v.classList.remove('jwac-textHighlight'));
                const verseSpan = link.closest('.v'); if (!verseSpan) return;
                verseSpan.classList.add('jwac-textHighlight');
                const idMatch = verseSpan.id?.match(/^(v\d+-\d+-\d+)-\d+$/);
                if (idMatch) { const prefix = idMatch[1]; document.querySelectorAll(`[id^="${prefix}-"]`).forEach(el => { if (el !== verseSpan) el.classList.add('jwac-textHighlight'); }); }
            });
        });

        new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type !== 'attributes' || m.attributeName !== 'class') continue;
                const el = m.target;
                if (el.classList.contains('currentMarker') && m.oldValue && !m.oldValue.split(' ').includes('currentMarker')) {
                    document.querySelectorAll('.jwac-textHighlight').forEach(v => v.classList.remove('jwac-textHighlight')); break;
                }
            }
        }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }, 100);

    // ── Multi-verse highlight restore ──
    (function applyMultiVerseHighlight() {
        const hash = location.hash;
        const vMatch = hash.match(/[?&]?v=([^&]+)/);
        if (!vMatch) return;
        const refs = vMatch[1].split(',');
        if (refs.length < 2) return;
        if ((localStorage.getItem('wol_app_mode') || 'default') !== 'default') return;
        let attempts = 0;
        const poll = setInterval(() => {
            attempts++;
            if (document.querySelector('.v') || attempts > 20) {
                clearInterval(poll);
                refs.forEach(ref => {
                    const parts = ref.trim().split(':'); if (parts.length < 3) return;
                    const [book, chapter, verse] = parts;
                    document.querySelectorAll(`[id^="v${book}-${chapter}-${verse}-"]`).forEach(el => el.classList.add('jwac-textHighlight'));
                });
            }
        }, 150);
    })();

    // ── Global teal marker suppression ──
    new MutationObserver(() => {
        setTimeout(() => {
            document.querySelectorAll('span.tt.vl.selected').forEach(el => {
                if (!el.closest('.v')?.classList.contains('jwac-textHighlight')) el.classList.remove('selected');
            });
        }, 20);
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

    // ── Reference symbol observer ──
    const refObserver = new MutationObserver(() => { applySavedState(); attachSyncButton(); });
    refObserver.observe(document.body, { childList: true, subtree: true });
    applySavedState();
    attachSyncButton();
    fixScrollToParagraph();

    // ── Reference symbol visibility (persistent) ──
    function checkReferenceSymbolsSetting() {
        try { const s = localStorage.getItem(STORAGE_KEY_REFERENCE); if (s !== null) return s === 'true'; } catch(e) {}
        const refSymbol = document.querySelector('a.b');
        if (refSymbol && /^[\+\*\#]+$/.test(refSymbol.textContent.trim())) {
            const style = window.getComputedStyle(refSymbol);
            return style.display !== 'none' && style.visibility !== 'hidden';
        }
        return true;
    }
    function hideReferenceSymbolsInTooltip(tooltip) {
        const shouldShow = checkReferenceSymbolsSetting();
        tooltip.querySelectorAll('a.b, a.fn, a.fn.pr').forEach(link => {
            if (/^[\+\*\#\s]+$/.test(link.textContent)) link.style.display = shouldShow ? '' : 'none';
        });
    }
    function isSymbolLink(a) { return /^[\+\*\#\s]+$/.test(a.textContent); }
    function applyRefSymbolVisibility(show) {
        document.querySelectorAll('a.b, a.fn, a.fn.pr').forEach(a => {
            if (!isSymbolLink(a)) return;
            if (show) { a.style.display = ''; a.style.fontSize = ''; a.style.lineHeight = ''; }
            else { a.style.display = 'none'; a.style.fontSize = '0'; a.style.lineHeight = '0'; }
        });
    }
    // Applied after DB init below via refStyleEl

    // ── Search proximity default ──
    (function setSearchProximityDefault() {
    if (!location.pathname.includes('/wol/s/')) return;
    const url = new URL(location.href);
    const p = url.searchParams.get('p');
    const q = url.searchParams.get('q') || '';
    const CHOSE_KEY = 'wol_proximity_user_chose_' + q;
    const userChose = sessionStorage.getItem(CHOSE_KEY);

    if (p === 'par' && !userChose) {
        url.searchParams.set('p', 'sen');
        location.replace(url.toString());
        return;
    }

    function attachProximityListener() {
        const sel = document.querySelector('#proximitySelector select[name="p"]');
        if (!sel || sel._wolProximityBound) return;
        sel._wolProximityBound = true;
        if (p) sel.value = p;
        sel.addEventListener('change', () => {
            sessionStorage.setItem(CHOSE_KEY, sel.value);
            const url2 = new URL(location.href);
            url2.searchParams.set('p', sel.value);
            location.replace(url2.toString());
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attachProximityListener);
    else attachProximityListener();
})();

    // ─────────────────────────────────────────────────────────────
    // 8. QUESTION BOXES  (from script4)
    // ─────────────────────────────────────────────────────────────
    (function initQuestionBoxes() {
        const isSearchResult = /[?&]p=/.test(location.search);
        const SCROLL_OFFSET = 136;

        function styleQuestionAsBox(questionP) {
            if (!questionP) return;
            questionP.style.backgroundColor = '#f2f2f2';
            questionP.style.borderLeft = '6px solid #c6c6c6';
            questionP.style.padding = '10px 12px';
            questionP.style.margin = '12px 0 6px 0';
            questionP.style.borderRadius = '4px';
            questionP.dataset.greyBoxDone = 'true';
        }
        function scrollToMkhl() {
            const target = document.querySelector('span.mkhl'); if (!target) return;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET, behavior: 'smooth' });
            history.replaceState(null, '', location.pathname + location.search + location.hash);
        }
        function rescrollWhenIdle() {
            let lastY = window.scrollY, stable = 0;
            const check = setInterval(() => {
                const y = window.scrollY;
                if (y === lastY) { if (++stable >= 3) { clearInterval(check); scrollToMkhl(); } }
                else { stable = 0; lastY = y; }
            }, 100);
            setTimeout(() => clearInterval(check), 3000);
        }
        function installSearchHitInterceptors() {
            ['menuSearchHitNext','menuSearchHitPrev'].forEach(id => {
                const li = document.getElementById(id);
                if (!li || li.dataset.scrollPatched) return;
                li.dataset.scrollPatched = 'true';
                li.addEventListener('click', () => setTimeout(scrollToMkhl, 150), true);
            });
        }
        let _rescrollScheduled = false;
        function processAllDisabledTextareas() {
            const textareas = document.querySelectorAll('textarea:disabled');
            let removed = false;
            textareas.forEach(textarea => {
                const container = textarea.closest('.gen-field');
                if (!container || container.dataset.processed) return;
                const questionP = container.previousElementSibling;
                if (questionP && questionP.matches('p.qu')) styleQuestionAsBox(questionP);
                container.remove(); removed = true;
            });
            if (removed && isSearchResult && !_rescrollScheduled) { _rescrollScheduled = true; rescrollWhenIdle(); }
            if (isSearchResult) installSearchHitInterceptors();
        }
        const highlightObserverQB = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const el = mutation.target;
                    if (el.matches('p.qu') && el.dataset.greyBoxDone === 'true' && !el.classList.contains('jwac-textHighlight')) {
                        styleQuestionAsBox(el);
                    }
                }
            });
        });
        highlightObserverQB.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
        const domObserverQB = new MutationObserver(() => processAllDisabledTextareas());
        domObserverQB.observe(document.body, { childList: true, subtree: true });
        processAllDisabledTextareas();
    })();

    // ─────────────────────────────────────────────────────────────
    // 9. MENU HOME — single, definitive handler
    // ─────────────────────────────────────────────────────────────
    // buildMenuHome is called from applyCurrentMode and from the icon
    // persistence observer. It replaces the entire menuHome content
    // with the correct widget for the current mode and attaches exactly
    // one set of event listeners, guarded by a dataset flag.

    let iconPersistObserver = null;
    function pauseIconObserver() { if (iconPersistObserver) iconPersistObserver.disconnect(); }
    function resumeIconObserver() { if (iconPersistObserver) iconPersistObserver.observe(document.body, { childList: true, subtree: true }); }

    function _buildSiteBannerHome(titleEl) {
        if (titleEl.dataset.wolReady === 'true') return;
        titleEl.dataset.wolReady = 'true';
        const mode = getMode();
        const anchor = titleEl.querySelector('a');

        if (mode === 'study') {
            if (titleEl.querySelector('#wol_study_icon_btn')) return;
            // Hide the native anchor content and overlay the study icon in its place
            if (anchor) {
                anchor.removeAttribute('href');
                anchor.style.cssText = 'pointer-events:none;opacity:0;position:absolute;';
            }
            const iconBtn = document.createElement('div');
            iconBtn.id = 'wol_study_icon_btn';
            iconBtn.innerHTML = STUDY_SVG;
            iconBtn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;cursor:pointer;width:44px;height:44px;';
            iconBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showPanel(iconBtn, buildStudyExtras); }, true);
            iconBtn.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); showPanel(iconBtn, buildStudyExtras); }, { capture: true, passive: false });
            // Insert before the anchor so it takes the same visual position
            titleEl.insertBefore(iconBtn, anchor || titleEl.firstChild);
        } else {
            // Restore anchor if switching back from study mode
            const staleIcon = titleEl.querySelector('#wol_study_icon_btn');
            if (staleIcon) staleIcon.remove();
            if (anchor) { anchor.removeAttribute('href'); anchor.style.cssText = 'cursor:pointer;'; }
            titleEl.style.webkitUserSelect = 'none'; titleEl.style.userSelect = 'none';
            let tMoved = false, tX = 0, tY = 0;
            titleEl.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showPanel(titleEl); });
            titleEl.addEventListener('touchstart', (e) => { tMoved = false; tX = e.touches[0].clientX; tY = e.touches[0].clientY; }, { passive: true });
            titleEl.addEventListener('touchmove', (e) => { if (Math.abs(e.touches[0].clientX - tX) > 8 || Math.abs(e.touches[0].clientY - tY) > 8) tMoved = true; }, { passive: true });
            titleEl.addEventListener('touchend', (e) => { if (tMoved) return; e.preventDefault(); e.stopPropagation(); showPanel(titleEl); }, { passive: false });
        }
    }

    function buildMenuHome() {
        const siteBannerTitle = document.querySelector('#siteBanner .title');
        if (siteBannerTitle) _buildSiteBannerHome(siteBannerTitle);
        const menuHome = document.getElementById('menuHome');
        if (!menuHome) return;
        const mode = getMode();

        if (mode === 'study') {
            if (menuHome.querySelector('#wol_study_icon_btn') && !menuHome.querySelector('a')) return;
            const sbt = document.querySelector('#siteBanner .title');
            if (sbt) { sbt.dataset.wolReady = ''; }
            pauseIconObserver();
            while (menuHome.firstChild) menuHome.removeChild(menuHome.firstChild);
            menuHome.style.height = '44px'; menuHome.style.minHeight = '44px';
            const iconBtn = document.createElement('div');
            iconBtn.id = 'wol_study_icon_btn';
            iconBtn.innerHTML = STUDY_SVG;
            iconBtn.title = 'Study options';
            iconBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                const panel = document.getElementById('wol_mode_panel');
                if (panel && panel.classList.contains('pp-open')) hidePanel();
                else showPanel(iconBtn, buildStudyExtras);
            }, true);
            iconBtn.addEventListener('touchend', (e) => {
                e.preventDefault(); e.stopPropagation();
                const panel = document.getElementById('wol_mode_panel');
                if (panel && panel.classList.contains('pp-open')) hidePanel();
                else showPanel(iconBtn, buildStudyExtras);
            }, { capture: true, passive: false });
            menuHome.appendChild(iconBtn);
            resumeIconObserver();
        } else {
            if (menuHome.dataset.wolMenuHomeReady === 'true' && menuHome.querySelector('a') && !menuHome.querySelector('#wol_study_icon_btn')) return;

            const sbt2 = document.querySelector('#siteBanner .title');
            if (sbt2) sbt2.dataset.wolReady = '';

            pauseIconObserver();
            menuHome.dataset.wolMenuHomeReady = '';
            while (menuHome.firstChild) menuHome.removeChild(menuHome.firstChild);

            const a = document.createElement('a');
            a.setAttribute('aria-label','home');
            const span = document.createElement('span'); span.className = 'icon';
            a.appendChild(span);
            menuHome.style.height = '44px'; menuHome.style.minHeight = '44px';
            menuHome.appendChild(a);
            resumeIconObserver();

            menuHome.dataset.wolMenuHomeReady = 'true';
            menuHome.style.webkitTouchCallout = 'none';
            menuHome.style.webkitUserSelect = 'none';
            menuHome.style.userSelect = 'none';

            const homeAnchor = menuHome.querySelector('a');
            if (homeAnchor) { homeAnchor.removeAttribute('href'); homeAnchor.style.cursor = 'pointer'; }

            menuHome.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                const panel = document.getElementById('wol_mode_panel');
                if (panel && panel.classList.contains('pp-open')) hidePanel();
                else showPanel(menuHome);
            });
            menuHome.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); }, true);

            let touchMoved = false, touchStartX = 0, touchStartY = 0;
            menuHome.addEventListener('touchstart', (e) => {
                touchMoved = false;
                touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY;
            }, { passive: true });
            menuHome.addEventListener('touchmove', (e) => {
                const dx = e.touches[0].clientX - touchStartX, dy = e.touches[0].clientY - touchStartY;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) touchMoved = true;
            }, { passive: true });
            menuHome.addEventListener('touchend', (e) => {
                if (touchMoved) return;
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
                const panel = document.getElementById('wol_mode_panel');
                if (panel && panel.classList.contains('pp-open')) hidePanel();
                else showPanel(menuHome);
            }, { passive: false });
        }
    }

    // Icon persistence observer (replaces the separate ones from script1 + script2)
    let _iconCheckTimer2 = null;
    function scheduleIconCheck() {
        if (_iconCheckTimer2) return;
        _iconCheckTimer2 = setTimeout(() => {
            _iconCheckTimer2 = null;
            // If a mode-change redirect is already in flight, do nothing —
            // the page is about to unload and rebuilding the icon would cause
            // the double-icon flash the user sees during the ~1s toast delay.
            if (safeWindow.__wolModeChangePending) return;
            const mode = getMode();
            const menuHome = document.getElementById('menuHome');
            if (!menuHome) return;
            if (mode === 'study') {
                const hasIcon = !!menuHome.querySelector('#wol_study_icon_btn');
                const strayLink = !!menuHome.querySelector('a');
                if (!hasIcon || strayLink) buildMenuHome();
            } else {
                if (!menuHome.dataset.wolMenuHomeReady) buildMenuHome();
            }
        }, 100);
    }
    iconPersistObserver = new MutationObserver(scheduleIconCheck);
    resumeIconObserver();

    // ─────────────────────────────────────────────────────────────
    // 10. STARTUP
    // ─────────────────────────────────────────────────────────────

    // Startup redirect check (runs immediately — same as script1's checkStudyRedirectOnLoad)
    (function checkStudyRedirectOnLoad() {
        if (getMode() !== 'study') return;
        const href = location.href;
        if (href.includes('lp-chs-rb')) return;
        const isChinese = /\/(lp-chs|cmn-Hans)\//i.test(href);
        if (/\/wol\/h\//i.test(href)) {
            if (!sessionStorage.getItem('wol_daily_text_redirect')) setMode('default');
            return;
        }
        if (isChinese) {
            showStudyToast();
            setTimeout(() => { location.href = href.replace(/lp-chs(?!-rb)/g,'lp-chs-rb'); }, 1000);
            return;
        }
        showStudyToast();
        const target = getPinyinTarget(href);
        if (target) setTimeout(() => { location.href = target; }, 1000);
    })();

    function applyCurrentMode() {
        if (handleRedirects()) return;
        const mode = getMode();
        if (mode === 'study') {
            document.body.classList.add('wol-study-mode');
            buildMenuHome();
            document.addEventListener('contextmenu', blockContextMenu, true);
        // If playback was already enabled, activate study audio immediately
        if (getPlaybackEnabled()) {
            enableStudyAudio();
            patchParLinksForAudio();
        }
            installBannerBlock();
            installSelectStartBlock();
            applyCompact();
            attachClickHandlers();
            applyInitialState();
            if (getPlaybackEnabled()) patchVerseLinksForAudio();
            if (!sessionStorage.getItem('wol_daily_text_redirect') && !sessionStorage.getItem('wol_watchtower_redirect')) {
                if (!location.hash) setTimeout(restoreSavedHash, 600);
            }
        } else {
            buildMenuHome();
        }
        buildHighlightIconBtn();
    }

    // InitDB then apply everything
    initDB().then(() => {
        restoreHighlights(document.body);
        setTimeout(() => restoreHighlights(document.body), 800);
        setTimeout(() => restoreHighlights(document.body), 2000);

        // Reference symbol style element
        const refStyleEl = document.createElement('style');
        refStyleEl.id = 'wol_ref_symbol_style';
        document.head.appendChild(refStyleEl);

        function applyRefSymbolStyle() {
            refStyleEl.textContent = '';
            applyRefSymbolVisibility(checkReferenceSymbolsSetting());
        }
        applyRefSymbolStyle();
        let lastRefState = checkReferenceSymbolsSetting();
        setInterval(() => {
            const cur = checkReferenceSymbolsSetting();
            if (cur !== lastRefState) { lastRefState = cur; applyRefSymbolStyle(); document.querySelectorAll('.tooltip, .tooltipContainer').forEach(t => hideReferenceSymbolsInTooltip(t)); }
            applyRefSymbolVisibility(checkReferenceSymbolsSetting());
        }, 1000);
    }).catch(err => console.error('WolHighlights DB init failed:', err));

    // Wait for menuHome then apply mode
    function waitAndApply(attempts) {
        if (document.getElementById('menuHome')) applyCurrentMode();
        else if (attempts > 0) setTimeout(() => waitAndApply(attempts - 1), 200);
    }
    setTimeout(() => waitAndApply(20), 50);

})();
