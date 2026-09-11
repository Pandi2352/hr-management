/**
 * Recovering usable JSON from a response that was cut short.
 *
 * Models stop at a token limit mid-sentence, which for a JSON array means a
 * response that is perfectly good for the first several elements and then
 * simply stops. Throwing all of it away turns "eight of ten questions arrived"
 * into "generation failed", which is the worse outcome by a wide margin.
 *
 * Deliberately conservative: it only ever *closes* structures that were left
 * open and drops the incomplete tail. It never invents a value, never repairs a
 * key, and never guesses at what the model meant to say.
 */

/** How many times the tail is trimmed back before giving up. */
const MAX_TRIM_ATTEMPTS = 200;

interface ScanState {
  /** Unclosed openers, innermost last. */
  stack: string[];
  inString: boolean;
}

/**
 * Walks the text tracking strings, escapes and nesting.
 *
 * Bracket counting without string awareness breaks on the first `"}"` inside a
 * question, which is exactly the content this has to survive.
 */
function scan(text: string): ScanState {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      if (inString) escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  return { stack, inString };
}

/** The closers needed to finish what is still open, innermost first. */
function closersFor(stack: string[]): string {
  return stack
    .slice()
    .reverse()
    .map((open) => (open === '{' ? '}' : ']'))
    .join('');
}

/**
 * Parses JSON, closing off a truncated tail if that is the only problem.
 *
 * Returns `undefined` when the text cannot be salvaged, so a caller can tell
 * "nothing usable" apart from a legitimately parsed `null`.
 */
export function salvageJson<T = unknown>(text: string): T | undefined {
  const trimmed = String(text || '').trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Fall through to the salvage attempt.
  }

  /*
   * Walk backwards from the end, cutting at each element boundary and closing
   * whatever is still open. The first cut that parses is the longest valid
   * prefix, which is the most content recoverable.
   */
  let cut = trimmed.length;

  for (let attempt = 0; attempt < MAX_TRIM_ATTEMPTS; attempt += 1) {
    const lastClose = Math.max(
      trimmed.lastIndexOf('}', cut - 1),
      trimmed.lastIndexOf(']', cut - 1),
    );
    if (lastClose <= 0) return undefined;

    const head = trimmed.slice(0, lastClose + 1);
    const state = scan(head);

    // A cut that lands inside a string cannot be closed sensibly; step back.
    if (!state.inString) {
      const candidate = head + closersFor(state.stack);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Not a boundary after all. Keep walking back.
      }
    }

    cut = lastClose;
  }

  return undefined;
}
