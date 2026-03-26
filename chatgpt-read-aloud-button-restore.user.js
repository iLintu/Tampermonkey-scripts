// ==UserScript==
// @author       iLintu
// @name         ChatGPT Read Aloud Button Restore
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Restores the "Read aloud" button directly in ChatGPT UI
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

function addReadAloudButtons() {
  hideMoreActionsMenu();

  const gptMessages = document.querySelectorAll('[data-turn="assistant"]');
  if (!gptMessages.length) return;
  createButtons(gptMessages);

  createNewMessagesObserver();
}

function hideMoreActionsMenu() {
  const style = document.createElement('style');
  style.innerHTML = `
    /* hide "Try again" menu button */
    button[aria-label="Switch model"] {
      display: none !important;
    }
    /* hide "More actions" menu button */
    button[aria-label="More actions"] {
      display: none !important;
    }
    /* hide "More actions" pop-up */
    [role="menu"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function createButtons(gptMessages) {
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
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(async node => {
        if (node.nodeType === 1 && node.matches('[data-turn="assistant"]')) {
          const buttonsContainer = await waitForButtons(node);
          createButton(node);
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
