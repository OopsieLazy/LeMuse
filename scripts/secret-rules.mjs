// Shared rules for scripts/scan-secrets.mjs and scripts/hooks/review-snapshot.mjs
// (ADR-0011). Patterns only; importing this file runs nothing.

export const RULES = [
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ["Stripe key", /\b[sr]k_live_[0-9A-Za-z]{20,}\b/],
  ["Anthropic/OpenAI key", /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ["bearer token literal", /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/],
  // LeMuse's own dashboard token (lemuse serve, ADR-0019), e.g. a pasted
  // dashboard address or an env assignment (review 0015).
  ["dashboard token in a URL", /#token=[A-Za-z0-9_-]{32,}/],
  ["LEMUSE_SERVE_TOKEN value", /\bLEMUSE_SERVE_TOKEN\s*[:=]\s*["']?[A-Za-z0-9_-]{32,}/],
  [
    "hard-coded credential",
    /\b(?:api[_-]?key|secret|token|passw(?:or)?d|client[_-]?secret)\b\s*[:=]\s*["'][^"'\s${}<>]{12,}["']/i,
  ],
];

// Any email address is a finding unless it's on these allow-lists (privacy
// rule in CLAUDE.md; review 0005 A-22).
const EMAIL = /\b[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)\b/g;
const ALLOWED_ADDRESS = [/^no-?reply@/i];
const ALLOWED_DOMAIN = [
  /(^|\.)noreply\.github\.com$/i,
  /^example\.(com|org|net)$/i,
  /\.(invalid|test|example|localhost)$/i,
  // Public organisation addresses cited in the research and ADRs
  // (Are.na's help desk, Wikimedia's mailing lists). Not personal.
  /^are\.na$/i,
  /^lists\.wikimedia\.org$/i,
  // Not emails at all: retina image names such as icon@2x.png.
  /^\dx\.(png|jpe?g|gif|webp|svg)$/i,
];

/** Email addresses in `text` that aren't on the allow-lists. */
export function personalEmails(text) {
  const hits = [];
  for (const m of text.matchAll(EMAIL)) {
    if (ALLOWED_ADDRESS.some((re) => re.test(m[0]))) continue;
    if (ALLOWED_DOMAIN.some((re) => re.test(m[1]))) continue;
    hits.push(m[0]);
  }
  return hits;
}

/** Files that must never be committed or copied, whatever they contain. */
export const FORBIDDEN_FILES = [
  /(^|\/)\.env(\..+)?$/,
  /\.(pem|key|pfx|p12|keystore|jks)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
  /(^|\/)credentials[^/]*\.json$/i,
  /(^|\/)credentials$/i,
  /(^|\/)\.npmrc$/,
  /\.db(-wal|-shm)?$/,
  // Local LeMuse data and outputs: config, UI settings, databases, logs,
  // browser network captures, exported sheets and link lists (review 0015).
  /(^|\/)lemuse\.toml(\.lock)?$/,
  /(^|\/)ui\.json$/,
  /\.(sqlite3?|log|har|pdf)$/i,
  /(^|\/)sheet[^/]*\.html$/i,
  /-links\.(csv|json|txt)$/i,
  // No screenshots or downloaded images in the repo (ADR-0009); only the app's
  // own icons, which are allowed below.
  /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|avif|ico|icns)$/i,
  // A token pasted into a file by mistake (ADR-0023: the Are.na token lives
  // only in Windows Credential Manager).
  /(^|\/)(token[^/]*|[^/]*tokens?)\.txt$/i,
  /\.token$/i,
  /(^|\/)\.arena[^/]*$/i,
  /(^|\/)arena[-_]token[^/]*$/i,
  /(^|\/)secrets\//i,
  // Release outputs (ADR-0028): installers, SHA256SUMS and SBOMs are built in
  // CI and attached to a GitHub Release, never committed.
  /^release\//,
  /\.cdx\.json$/i,
  /(^|\/)SHA256SUMS$/,
  /\.(exe|msi|msix)$/i,
];
export const ALLOWED_FORBIDDEN = [
  /(^|\/)\.env\.example$/,
  /^app\/src-tauri\/icons\//,
  /^app\/app-icon\.png$/,
];

export const isForbiddenFile = (f) =>
  FORBIDDEN_FILES.some((re) => re.test(f)) && !ALLOWED_FORBIDDEN.some((re) => re.test(f));
