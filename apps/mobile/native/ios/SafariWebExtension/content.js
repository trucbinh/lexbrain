(() => {
  const MAX_LENGTH = 3000;
  let host;
  let button;

  function ensureButton() {
    if (host) return button;
    host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `button { position: fixed; padding: 10px 14px; border: 0; border-radius: 8px; background: #17213b; color: white; font: 600 14px -apple-system, sans-serif; box-shadow: 0 4px 18px #0005; }`;
    button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Add to LexBrain';
    button.addEventListener('mousedown', (event) => event.preventDefault());
    shadow.append(style, button);
    document.documentElement.append(host);
    return button;
  }

  function hide() {
    host?.remove();
    host = undefined;
    button = undefined;
  }

  function onSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, ' ').trim() ?? '';
    if (!text || text.length > MAX_LENGTH || selection?.isCollapsed) {
      hide();
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return;

    const control = ensureButton();
    control.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 150))}px`;
    control.style.top = `${Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 48))}px`;
    control.onclick = async () => {
      control.disabled = true;
      control.textContent = 'Sending…';
      try {
        const response = await browser.runtime.sendNativeMessage('datamerge.xyz.lexbrain.app', {
          text,
          title: document.title,
          url: location.href,
        });
        if (!response?.ok) throw new Error('Capture handoff failed');
        control.textContent = 'Opening LexBrain…';
        location.href = 'lexbrain://capture';
      } catch {
        control.disabled = false;
        control.textContent = 'Could not send to LexBrain';
      }
    };
  }

  document.addEventListener('mouseup', () => setTimeout(onSelection, 20), true);
  document.addEventListener('touchend', () => setTimeout(onSelection, 20), true);
  document.addEventListener('keyup', (event) => {
    if (event.key === 'Escape') hide();
    else if (event.key.startsWith('Arrow') || event.key === 'Shift') setTimeout(onSelection, 20);
  }, true);
  window.addEventListener('scroll', hide, { passive: true });
})();