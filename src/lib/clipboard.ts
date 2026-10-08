/**
 * Copy text to the clipboard. Returns true if it worked.
 *
 * navigator.clipboard only exists on HTTPS / localhost, and Android WebViews
 * (the mobile app) often reject it even there - so fall back to the legacy
 * hidden-textarea + execCommand('copy') path, which works in both. Must be
 * called from a user gesture (click handler).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    // Off-screen, and font-size 16px stops iOS from zooming in on focus.
    textarea.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
