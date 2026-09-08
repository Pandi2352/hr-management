/**
 * How `ResultEntity` should be written to the wire.
 *
 * `json` wraps the payload in the standard envelope; `json_direct` sends
 * `data` alone, for endpoints that must match a third-party response shape.
 */
export class ResultEntityTypes {
  static readonly json = 'json';
  static readonly json_direct = 'json_direct';
  static readonly redirect = 'redirect';
  static readonly html = 'html';
  static readonly css = 'css';
  static readonly js = 'js';
  static readonly image = 'image';
  static readonly xml = 'xml';
  static readonly pem = 'pem';
  static readonly audio = 'audio';
  /** Binary or streamed attachment — the document vault downloads use this. */
  static readonly file = 'file';
  static readonly csv = 'csv';
  static readonly text = 'text';
}

/** Default `Content-Type` per result type. */
export const CONTENT_TYPE_BY_RESULT: Record<string, string> = {
  [ResultEntityTypes.html]: 'text/html; charset=UTF-8',
  [ResultEntityTypes.css]: 'text/css; charset=UTF-8',
  [ResultEntityTypes.js]: 'application/javascript; charset=UTF-8',
  [ResultEntityTypes.xml]: 'application/xml; charset=UTF-8',
  [ResultEntityTypes.pem]: 'application/x-pem-file',
  [ResultEntityTypes.audio]: 'audio/mpeg',
  [ResultEntityTypes.csv]: 'text/csv; charset=UTF-8',
  [ResultEntityTypes.text]: 'text/plain; charset=UTF-8',
};
