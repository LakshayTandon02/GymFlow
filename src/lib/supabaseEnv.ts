export interface SupabaseEnvValidationResult {
  url: string | null;
  anonKey: string | null;
  error: string | null;
}

function stripKeyPrefixAndQuotes(raw: string, expectedVarName: string): string {
  let value = raw.trim();

  // Handle accidental "KEY=VALUE" pasted into a secret value input
  const prefixPattern = new RegExp(`^${expectedVarName}\\s*=\\s*`, 'i');
  if (prefixPattern.test(value)) {
    value = value.replace(prefixPattern, '').trim();
  }

  // Strip matching surrounding single or double quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return value;
}

function unwrapMarkdownOrAngleUrl(value: string): string {
  // Handle Markdown link syntax: [label](https://example.supabase.co)
  const mdLinkMatch = value.match(/^\[[^\]]*\]\(([^)]+)\)$/);
  if (mdLinkMatch && mdLinkMatch[1]) {
    return mdLinkMatch[1].trim();
  }

  // Handle Markdown autolink syntax: <https://example.supabase.co>
  const angleMatch = value.match(/^<(https?:\/\/[^>]+)>$/i);
  if (angleMatch && angleMatch[1]) {
    return angleMatch[1].trim();
  }

  return value;
}

export function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  const upper = trimmed.toUpperCase();
  return (
    upper.startsWith('YOUR_') ||
    upper.startsWith('MY_') ||
    upper.includes('YOUR_SUPABASE') ||
    upper.includes('MY_SUPABASE') ||
    upper === 'PLACEHOLDER' ||
    trimmed.includes('...')
  );
}

export function validateSupabaseCredentials(
  rawUrl: string | undefined,
  rawAnonKey: string | undefined
): SupabaseEnvValidationResult {
  if (!rawUrl || !rawAnonKey) {
    return {
      url: null,
      anonKey: null,
      error:
        'Supabase credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Google AI Studio Secrets (or your local .env file) and reload the app.',
    };
  }

  const cleanedUrlStep1 = stripKeyPrefixAndQuotes(rawUrl, 'VITE_SUPABASE_URL');
  const cleanedUrl = unwrapMarkdownOrAngleUrl(cleanedUrlStep1)
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
  const cleanedKey = stripKeyPrefixAndQuotes(rawAnonKey, 'VITE_SUPABASE_ANON_KEY');

  if (isPlaceholderValue(cleanedUrl) || isPlaceholderValue(cleanedKey)) {
    return {
      url: null,
      anonKey: null,
      error:
        'Supabase credentials are still set to placeholder values. Replace them with your real Project URL and Publishable/anon key from Supabase Settings → API.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleanedUrl);
  } catch {
    return {
      url: null,
      anonKey: null,
      error: `VITE_SUPABASE_URL ("${cleanedUrl}") is not a valid URL. Use only the plain https:// URL (e.g. https://your-project.supabase.co) without quotes, Markdown links, or a variable name prefix.`,
    };
  }

  const isLocalHost =
    parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !(isLocalHost && parsed.protocol === 'http:')) {
    return {
      url: null,
      anonKey: null,
      error: 'VITE_SUPABASE_URL must use the https:// protocol.',
    };
  }

  if (!parsed.hostname || (!isLocalHost && !parsed.hostname.includes('.'))) {
    return {
      url: null,
      anonKey: null,
      error: `VITE_SUPABASE_URL hostname ("${parsed.hostname}") is invalid.`,
    };
  }

  if (/\s/.test(cleanedKey) || cleanedKey.length < 20) {
    return {
      url: null,
      anonKey: null,
      error:
        'VITE_SUPABASE_ANON_KEY does not look like a valid Supabase publishable/anon key. Copy the plain key without spaces or extra text.',
    };
  }

  return {
    url: cleanedUrl,
    anonKey: cleanedKey,
    error: null,
  };
}
