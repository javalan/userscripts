// ==UserScript==
// @name         WOL – Make Questions into Grey Boxes (No Dividers)
// @namespace    https://github.com/javalan/userscripts
// @version      4.2
// @description  Replace disabled text boxes by turning the PRECEDING question into a grey box
// @author       ZEBROS
// @match        https://wol.jw.org/*
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/javalan/userscripts/main/question_boxes.user.js
// @downloadURL  https://raw.githubusercontent.com/javalan/userscripts/main/question_boxes.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function styleQuestionAsBox(questionP) {
        if (!questionP) return;
        questionP.style.backgroundColor = '#f2f2f2';
        questionP.style.borderLeft = '6px solid #c6c6c6';
        questionP.style.padding = '10px 12px';
        questionP.style.margin = '12px 0 6px 0';
        questionP.style.borderRadius = '4px';
        questionP.dataset.greyBoxDone = "true";
    }

    function processAllDisabledTextareas() {
        const textareas = document.querySelectorAll('textarea:disabled');
        textareas.forEach(textarea => {
            const container = textarea.closest('.gen-field');
            if (!container || container.dataset.processed) return;
            const questionP = container.previousElementSibling;
            if (questionP && questionP.matches('p.qu')) {
                styleQuestionAsBox(questionP);
            }
            container.remove();
        });
    }

    // Re-apply grey box styles whenever jwac-textHighlight is removed from a .qu paragraph
    const highlightObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const el = mutation.target;
                if (
                    el.matches('p.qu') &&
                    el.dataset.greyBoxDone === 'true' &&
                    !el.classList.contains('jwac-textHighlight')
                ) {
                    styleQuestionAsBox(el);
                }
            }
        });
    });

    highlightObserver.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
    });

    const domObserver = new MutationObserver(() => processAllDisabledTextareas());
    domObserver.observe(document.body, { childList: true, subtree: true });

    processAllDisabledTextareas();
})();
