import { Token } from './token.mjs';
import { TERM, NONTERM } from '../consts.mjs';
export class BNFToken extends Token {
  constructor(type, value, line, word, repeat) { super(TERM, value == '[empty]' && BNFToken.honorEmpty ? '[empty]' : type == TERM ? '[term]' : type == NONTERM ? '[nonterm]' : type, value); this.line = line; this.word = word; this.repeat = repeat; this._type = type; }
  copy(token) { super.copy(token); this.line = token.line; this.char = token.char; this.repeat = token.repeat; this._type = token._type; }
  static copyOf(token) { let n = new BNFToken(); n.copy(token); return n; }
  static honorEmpty = true;
}
