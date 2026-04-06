// Global stack to track open dialogs and handle nested ESC key behavior.
// Entries can opt out of scroll lock (e.g. attachment list / viewer) to avoid conflicts.
interface StackEntry {
  close: () => void;
  lockScroll: boolean;
}

const dialogStack: StackEntry[] = [];

function handleGlobalEsc(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (dialogStack.length === 0) return;
  e.preventDefault();
  e.stopPropagation();
  const top = dialogStack[dialogStack.length - 1];
  top.close();
}

// Single global Esc listener so Esc always closes the top dialog (avoids focus/iframe issues in Edit PO).
if (typeof window !== "undefined") {
  window.addEventListener("keydown", handleGlobalEsc, true);
}

export interface RegisterDialogOptions {
  /** When false, this dialog does not participate in body scroll lock (default true). */
  lockScroll?: boolean;
}

/**
 * Registers a close function to the stack.
 * Returns a cleanup function to remove it.
 * @param options.lockScroll - If false, opening/closing this dialog won't lock/unlock body scroll.
 */
export function registerDialog(closeFn: () => void, options?: RegisterDialogOptions) {
  const lockScroll = options?.lockScroll !== false;
  const entry: StackEntry = { close: closeFn, lockScroll };
  dialogStack.push(entry);

  return () => {
    const index = dialogStack.findIndex((e) => e.close === closeFn);
    if (index > -1) {
      dialogStack.splice(index, 1);
    }
  };
}

/**
 * Checks if the given close function is at the top of the stack.
 */
export function isTopDialog(closeFn: () => void) {
  return dialogStack.length > 0 && dialogStack[dialogStack.length - 1].close === closeFn;
}

/**
 * Gets the total number of open dialogs.
 */
export function getOpenDialogCount() {
  return dialogStack.length;
}

/**
 * Gets the number of open dialogs that participate in scroll lock.
 * Used to lock body scroll only when this count goes 0 -> 1 and unlock when 1 -> 0.
 */
export function getScrollLockCount() {
  return dialogStack.filter((e) => e.lockScroll).length;
}

/**
 * Applies body scroll lock state to match the current dialog stack.
 * Call this after closing a non-Dialog overlay (e.g. PDF iframe viewer) so that
 * any overflow left by the browser/iframe is corrected.
 */
export function applyScrollLockState() {
  if (typeof document === "undefined") return;
  const shouldLock = getScrollLockCount() > 0;
  document.body.style.overflow = shouldLock ? "hidden" : "";
  document.documentElement.style.overflow = shouldLock ? "hidden" : "";
}
