/**
 * Helpers for slide 6 — sanitization of user-supplied free text.
 *
 * Prisma already parameterizes queries (Prisma never builds SQL via string
 * concat), so SQL injection is mitigated at the driver layer. Even so, we
 * keep an `escapeForLike` for `contains` filters to neutralize the LIKE
 * meta-characters (`%`, `_`, `\`), and `stripXss` to harden free-text fields
 * that may eventually be reflected to a browser/dashboard.
 */

const XSS_RE = /[<>]|<\s*\/?\s*[a-zA-Z][^>]*>/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;
const SQL_META_RE = /[;'"`\\]/g;

export function stripXss(input: string): string {
  return input
    .replace(/<\s*\/?\s*script[^>]*>/gi, '')
    .replace(XSS_RE, '')
    .replace(CONTROL_CHARS_RE, '')
    .trim();
}

export function escapeForLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function stripSqlMeta(input: string): string {
  return input.replace(SQL_META_RE, '').replace(CONTROL_CHARS_RE, '');
}

export function safeFreeText(input: string, maxLen = 200): string {
  return stripXss(input).slice(0, maxLen);
}
