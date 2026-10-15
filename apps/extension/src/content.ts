import { LANGUAGES } from '@lexbrain/core/languages';
import { detectKind, extractContextSentence, normalizeSelection } from '@lexbrain/core/text';
import type { InitRes, Req, SaveRes, TranslateRes } from './messages';

/**
 * Shows a small "Add to LexBrain" button next to selected text. Clicking it opens a panel with the
 * translation, which the user can edit before saving. The UI lives in a closed-style shadow root so
 * page CSS cannot affect it, and page text is only ever inserted with textContent / value.
 */

const MAX_LENGTH = 3000;

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.trigger { position: fixed; z-index: 2147483647; padding: 7px 12px; border: 0; border-radius: 999px;
  background: #121a2b; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,.28); }
.trigger::before { content: ''; display: inline-block; width: 9px; height: 9px; margin-right: 7px;
  background: #ffdd4a; border-radius: 2px; transform: rotate(-8deg); }
.trigger:hover { background: #2b4bff; }
.panel { position: fixed; z-index: 2147483647; width: 340px; max-width: calc(100vw - 16px); padding: 14px;
  background: #f4f6fa; color: #121a2b; border: 1.5px solid #d9dfea; border-radius: 12px;
  box-shadow: 0 18px 44px rgba(0,0,0,.35); display: grid; gap: 10px; font-size: 14px; line-height: 1.45; }
.head { display: flex; align-items: center; gap: 8px; }
.head strong { font: 700 16px Charter, 'Iowan Old Style', Georgia, serif; }
.kind { padding: 0 8px; border: 1px solid #d9dfea; border-radius: 999px; color: #55607a; font-size: 12px; }
.x { margin-left: auto; border: 0; background: none; font-size: 20px; line-height: 1; cursor: pointer; color: #55607a; }
.orig { margin: 0; max-height: 120px; overflow: auto; padding: 10px 12px; background: #fff; border: 1.5px solid #d9dfea;
  border-radius: 8px; font: 16px/1.5 Charter, 'Iowan Old Style', Georgia, serif; overflow-wrap: anywhere; }
.orig mark { background: linear-gradient(transparent 52%, #ffdd4a 52%, #ffdd4a 93%, transparent 93%); color: #121a2b; padding: 0 .12em; margin: 0 -.12em; }
label { display: grid; gap: 4px; font-weight: 600; font-size: 13px; }
select, textarea { width: 100%; padding: 8px 10px; border: 1.5px solid #d9dfea; border-radius: 8px; background: #fff; color: #121a2b; font-size: 14px; }
textarea { resize: vertical; min-height: 64px; }
.err { margin: 0; padding: 8px 10px; border-left: 3px solid #b3261e; background: #fff; color: #b3261e; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn { min-height: 38px; padding: 0 18px; border: 0; border-radius: 999px; background: #121a2b; color: #fff; font-weight: 600; cursor: pointer; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
button:focus-visible, select:focus-visible, textarea:focus-visible { outline: 3px solid #2b4bff; outline-offset: 2px; }
@media (prefers-color-scheme: dark) {
  .panel { background: #0f1420; color: #eef1f8; border-color: #283250; }
  .orig, select, textarea, .err { background: #171e30; color: #eef1f8; border-color: #283250; }
  .orig mark { color: #121a2b; }
  .kind, .x { color: #a3adc7; border-color: #283250; }
  .btn { background: #eef1f8; color: #0f1420; }
}
`;

interface Selected {
  text: string;
  context?: string;
  rect: DOMRect;
}

let host: HTMLElement | undefined;
let root: ShadowRoot | undefined;
let trigger: HTMLButtonElement | undefined;
let panel: HTMLElement | undefined;
let requestId = 0;

function ensureRoot(): ShadowRoot {
  if (root) return root;
  host = document.createElement('div');
  host.id = 'lexbrain-root';
  root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CSS;
  root.append(style);
  document.documentElement.append(host);
  return root;
}

function send<T>(req: Req): Promise<T> {
  return chrome.runtime.sendMessage(req) as Promise<T>;
}

function hideAll() {
  trigger?.remove();
  panel?.remove();
  trigger = panel = undefined;
  requestId++;
}

function readSelection(): Selected | undefined {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return undefined;
  const text = normalizeSelection(sel.toString());
  if (!text || text.length > MAX_LENGTH) return undefined;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return undefined;

  const node = range.commonAncestorContainer;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  const block = el?.closest('p, li, blockquote, td, dd, h1, h2, h3, h4, h5, h6, article, div');
  const context = extractContextSentence((block?.textContent ?? '').slice(0, 20000), text);
  return { text, context, rect };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function showTrigger(s: Selected) {
  const r = ensureRoot();
  trigger?.remove();
  trigger = document.createElement('button');
  trigger.className = 'trigger';
  trigger.type = 'button';
  trigger.textContent = 'Add to LexBrain';
  trigger.style.left = `${clamp(s.rect.right - 20, 8, window.innerWidth - 150)}px`;
  trigger.style.top = `${clamp(s.rect.bottom + 8, 8, window.innerHeight - 44)}px`;
  // Keep the page selection alive while clicking.
  trigger.addEventListener('mousedown', (e) => e.preventDefault());
  trigger.addEventListener('click', () => void openPanel(s));
  r.append(trigger);
}

async function openPanel(s: Selected) {
  const r = ensureRoot();
  trigger?.remove();
  trigger = undefined;
  panel?.remove();
  requestId++;

  panel = document.createElement('section');
  panel.className = 'panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Add to LexBrain');
  panel.innerHTML = `
    <div class="head"><strong>LexBrain</strong><span class="kind"></span><button class="x" type="button" aria-label="Close">×</button></div>
    <p class="orig"></p>
    <label>Translate into <select class="lang"></select></label>
    <label>Translation <textarea class="out" rows="3" placeholder="Translating…"></textarea></label>
    <p class="err" role="alert" hidden></p>
    <div class="actions"><button class="btn save" type="button" disabled>Save card</button></div>`;

  const thisPanel = panel;
  const q = <T extends HTMLElement>(sel: string) => thisPanel.querySelector(sel) as T;
  const kind = detectKind(s.text);
  q('.kind').textContent = kind;
  const orig = q<HTMLParagraphElement>('.orig');
  if (kind === 'word') {
    const mark = document.createElement('mark');
    mark.textContent = s.text;
    orig.append(mark);
  } else {
    orig.textContent = s.text;
  }

  const langSelect = q<HTMLSelectElement>('.lang');
  for (const l of LANGUAGES) {
    const o = document.createElement('option');
    o.value = l.code;
    o.textContent = l.name;
    langSelect.append(o);
  }
  const out = q<HTMLTextAreaElement>('.out');
  const err = q<HTMLParagraphElement>('.err');
  const save = q<HTMLButtonElement>('.save');
  const showError = (m: string) => {
    err.textContent = m;
    err.hidden = false;
  };

  panel.style.left = `${clamp(s.rect.left, 8, window.innerWidth - 356)}px`;
  panel.style.top = `${clamp(s.rect.bottom + 8, 8, Math.max(8, window.innerHeight - 400))}px`;
  r.append(panel);
  q<HTMLButtonElement>('.x').addEventListener('click', hideAll);

  let detected: string | undefined;
  const translate = async () => {
    const mine = ++requestId;
    err.hidden = true;
    save.disabled = true;
    out.value = '';
    out.placeholder = 'Translating…';
    try {
      const res = await send<TranslateRes>({ type: 'lexbrain/translate', text: s.text, target: langSelect.value });
      if (mine !== requestId) return;
      if (!res.ok) throw new Error(res.error);
      out.value = res.translatedText;
      detected = res.detectedLang;
      save.disabled = !out.value.trim();
    } catch (e) {
      if (mine !== requestId) return;
      out.placeholder = 'Type a translation, or change the language to try again.';
      showError(e instanceof Error ? e.message : 'Translation failed.');
    }
  };

  langSelect.addEventListener('change', () => void translate());
  out.addEventListener('input', () => (save.disabled = !out.value.trim()));
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const res = await send<SaveRes>({
        type: 'lexbrain/save',
        sourceText: s.text,
        translatedText: out.value,
        targetLang: langSelect.value,
        sourceLang: detected,
        contextSentence: s.context,
        sourceUrl: location.href,
        sourceTitle: document.title,
      });
      if (!res.ok) throw new Error(res.error);
      save.textContent = 'Saved';
      setTimeout(hideAll, 700);
    } catch (e) {
      save.disabled = false;
      showError(e instanceof Error ? e.message : 'Could not save. Try again.');
    }
  });

  try {
    const init = await send<InitRes>({ type: 'lexbrain/init' });
    if (panel !== thisPanel) return; // closed or replaced while waiting
    if (init.ok) langSelect.value = init.targetLang;
  } catch {
    // fall back to the first language in the list
  }
  void translate();
  langSelect.focus();
}

function onSelectionEnd(e: Event) {
  if (host && e.composedPath().includes(host)) return;
  window.setTimeout(() => {
    const s = readSelection();
    if (!s) {
      if (!panel) hideAll();
      return;
    }
    if (panel) return; // keep an open panel until the user closes it
    showTrigger(s);
  }, 10);
}

document.addEventListener('mouseup', onSelectionEnd, true);
document.addEventListener('touchend', onSelectionEnd, true);
document.addEventListener('keyup', (e) => {
  if (e.key === 'Escape') hideAll();
  else if (e.shiftKey || e.key.startsWith('Arrow')) onSelectionEnd(e);
}, true);
document.addEventListener('mousedown', (e) => {
  if (host && e.composedPath().includes(host)) return;
  if (!panel) trigger?.remove();
}, true);
window.addEventListener('scroll', () => { if (!panel) hideAll(); }, { passive: true });
