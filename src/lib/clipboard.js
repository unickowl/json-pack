/**
 * Copying is this tool's whole point, so it must never claim a success it did
 * not achieve. writeText can also hang indefinitely when the document is not
 * focused, which is why the timeout exists.
 */
export async function copyText(text, timeoutMs = 1500) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
    await Promise.race([
      navigator.clipboard.writeText(text),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), timeoutMs)),
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
