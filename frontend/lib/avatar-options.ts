/** Single default avatar (public/avatar/avatar.svg → /avatar/avatar.svg). */
export const DEFAULT_AVATAR_PATH = "/avatar/avatar.svg";

export const FALLBACK_AVATAR_PATH = DEFAULT_AVATAR_PATH;

/**
 * Resolves the image URL for a stored avatar filename.
 * New flow stores a full URL (e.g. `/avatar/avatar.svg`) or null.
 * Legacy records may still store a filename; we keep a fallback mapping.
 */
export function getAvatarUrl(avatar: string | null | undefined): string {
  if (!avatar) return FALLBACK_AVATAR_PATH;
  if (avatar.startsWith("http") || avatar.startsWith("/")) return avatar;
  // Legacy: treat a bare filename as coming from /assets/avatar/
  return `/assets/avatar/${avatar}`;
}
