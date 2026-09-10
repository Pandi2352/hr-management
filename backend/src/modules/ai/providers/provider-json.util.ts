/**
 * Pulling a JSON object out of whatever a language model actually returned.
 *
 * Models are asked for JSON and reply with JSON wrapped in a code fence, or
 * with a sentence before it, or with both. Every provider had grown its own
 * regex for this, and they disagreed: one stripped fences, one looked for the
 * first `{`, and neither handled a brace inside a string value. A single
 * implementation means a fix helps every provider at once.
 */

/**
 * Extracts the first complete JSON object from a model's reply.
 *
 * Scans for a balanced brace pair rather than matching `\{[\s\S]*\}`, which is
 * greedy to the last brace in the response and swallows any trailing prose the
 * model added. String contents are skipped while scanning, so a `}` inside a
 * summary does not close the object early.
 *
 * Returns `null` rather than throwing: a model returning prose is an ordinary
 * outcome that the caller reports in its own words, not an exception.
 */
export function extractJsonObject(raw: string): unknown | null {
  if (!raw) return null;

  // Fences first: a model that wraps its answer usually wraps all of it.
  const text = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          // Balanced but not valid JSON — a trailing comma, a stray quote.
          // Nothing further in the string will parse either.
          return null;
        }
      }
    }
  }

  return null;
}

/**
 * Strips a model's own reasoning preamble from a plain-text answer.
 *
 * Several open models emit their thinking in `<think>` tags before the answer.
 * It is not for the reader, and it lands in the middle of a copilot reply.
 */
export function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim();
}
