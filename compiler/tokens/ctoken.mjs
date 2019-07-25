import { Token } from './token.mjs';
import { TERM } from '../consts.mjs';
export class CToken extends Token {
  constructor(value, line, char) { super(TERM, value, value); this.line = line; this.char = char; }
  copy(token) { super.copy(token); this.line = token.line; this.char = token.char; }
  static copyOf(token) { let n = new CToken(); n.copy(token); return n; }
}
