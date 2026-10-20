import {
  addCard,
  createTranslator,
  getSettings,
  initializeDatabase,
  saveSettings,
  translateWithCache,
} from '@lexbrain/core';
import type { Req, Res } from './messages';

let databaseInitialization: Promise<boolean> | undefined;

function ensureDatabaseInitialized(): Promise<boolean> {
  databaseInitialization ??= initializeDatabase(chrome.runtime.getManifest().version);
  return databaseInitialization;
}

async function handle(req: Req): Promise<Res<Record<string, unknown>>> {
  await ensureDatabaseInitialized();
  switch (req.type) {
    case 'lexbrain/init': {
      const s = await getSettings();
      return { ok: true, targetLang: s.targetLang };
    }
    case 'lexbrain/translate': {
      const s = await getSettings();
      const r = await translateWithCache(createTranslator(), req.text, req.target);
      return { ok: true, translatedText: r.translatedText, detectedLang: r.detectedLang };
    }
    case 'lexbrain/save': {
      const { type: _type, ...card } = req;
      await addCard(card);
      await saveSettings({ targetLang: card.targetLang });
      return { ok: true };
    }
  }
}

chrome.runtime.onMessage.addListener((message: Req, _sender, sendResponse) => {
  handle(message).then(sendResponse, (e: unknown) =>
    sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }),
  );
  return true; // keep the channel open for the async response
});

// Toolbar button opens the study / library app bundled in the extension.
chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('app/index.html') });
});

// Right-click menu: works wherever content scripts cannot run (e.g. built-in PDF viewers).
chrome.runtime.onInstalled.addListener(() => {
  void ensureDatabaseInitialized();
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'lexbrain-add',
      title: 'Add "%s" to LexBrain',
      contexts: ['selection'],
    });
  });
});

function flashBadge(text: string, color: string) {
  void chrome.action.setBadgeBackgroundColor({ color });
  void chrome.action.setBadgeText({ text });
  setTimeout(() => void chrome.action.setBadgeText({ text: '' }), 2500);
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'lexbrain-add' || !info.selectionText) return;
  try {
    await ensureDatabaseInitialized();
    const settings = await getSettings();
    const translated = await translateWithCache(createTranslator(), info.selectionText, settings.targetLang);
    await addCard({
      sourceText: info.selectionText,
      translatedText: translated.translatedText,
      sourceLang: translated.detectedLang,
      targetLang: settings.targetLang,
      sourceUrl: info.pageUrl ?? tab?.url,
      sourceTitle: tab?.title,
    });
    flashBadge('OK', '#2b4bff');
  } catch (e) {
    console.error('LexBrain: could not save selection', e);
    flashBadge('!', '#b3261e');
  }
});
