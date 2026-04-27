/**
 * Copies text to the clipboard.
 * Uses navigator.clipboard when available, with a legacy execCommand fallback
 * for environments where the Clipboard API is blocked (e.g. iframes).
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Prefer the modern async API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to execCommand fallback
    }
  }

  // Legacy fallback: create a hidden textarea, select its content, and copy
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
