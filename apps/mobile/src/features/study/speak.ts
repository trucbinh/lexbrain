export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, lang: string): void {
  if (!canSpeak) return;
  const utterance = new SpeechSynthesisUtterance(text);
  if (lang && lang !== 'auto') utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
