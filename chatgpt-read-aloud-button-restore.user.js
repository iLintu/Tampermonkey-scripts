// ==UserScript==
// @author       iLintu
// @name         ChatGPT Read Aloud Button Restore
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Restores the "Read aloud" button directly in ChatGPT UI
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

function addReadAloudButtons() {
  hideMoreActionsMenu();
  createNewMessagesObserver();
}

function hideMoreActionsMenu() {
  const style = document.createElement('style');
  style.innerHTML = `
    [data-turn="assistant"] [aria-label="Response actions"] button[aria-label="More actions"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
    [data-radix-popper-content-wrapper]:has([aria-label="Branch in new chat"]) {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function createButtons(gptMessages) {
  if (!gptMessages.length) return;
  gptMessages.forEach(msg => {
    createButton(msg);
  });
}

function createButton(gptMessage) {
  const msgButtonsArea = gptMessage.querySelector('[aria-label="Response actions"]'); 
  if (msgButtonsArea.querySelector('button[aria-label="Read aloud"]')) return;
  const templateBtn = msgButtonsArea.querySelector('button'); // !!!
  const newBtn = templateBtn.cloneNode(true);
  newBtn.setAttribute('aria-label', 'Read aloud');
  newBtn.querySelector('svg use').setAttribute('href', '/cdn/assets/sprites-core-lbtco6v1.svg#54f145');
  msgButtonsArea.prepend(newBtn);
  newBtn.onclick = async () => {
    const moreActionsBtn = msgButtonsArea.querySelector('button[aria-label="More actions"]');
    realClick(moreActionsBtn);

    const readAloudBtn = await waitForReadAloudButton('read aloud');
    if (readAloudBtn) readAloudBtn.click();
  };
  return newBtn;
}

function realClick(el) {
  ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
    el.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true
    }));
  });
}

async function waitForReadAloudButton(text, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const items = document.querySelectorAll('[role="menuitem"]');
    for (const item of items) {
      if (item.innerText.toLowerCase().includes(text)) {
        return item;
      }
    }
    await new Promise(r => setTimeout(r, 50));
  }
  return null;
}

function createNewMessagesObserver() {
  let target;
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(async node => {
        if (node.nodeType === 1 && node.matches('[data-turn="assistant"]')) {
          const buttonsContainer = await waitForButtons(node);
          createButton(node);
        } else if (node.nodeType === 1) {
            const target = node.matches('[class="flex flex-col text-sm pb-25"]')
                           ? node
                           : node.querySelector('[class="flex flex-col text-sm pb-25"]');
            if (target) {
              const gptMessages = target.querySelectorAll('[data-turn="assistant"]');
              createButtons(gptMessages);
            }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function waitForButtons(msg) {
  return new Promise(resolve => {
    const buttonsContainer = msg.querySelector('[aria-label="Response actions"]');
    if (buttonsContainer) return resolve(buttonsContainer);

    const msgObserver = new MutationObserver(() => {
      const buttons = msg.querySelector('[aria-label="Response actions"]');
      if (buttons) {
        msgObserver.disconnect();
        resolve(buttons);
      }
    });

    msgObserver.observe(msg, { childList: true, subtree: true });
  });
}

addReadAloudButtons();
