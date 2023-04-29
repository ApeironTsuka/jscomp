import { Token } from '../tokens/token.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { CToken } from '../tokens/ctoken.mjs';
import { TERM } from '../consts.mjs';
// This could certainly be done differently/better, but is sufficient for testing purposes
export class CTokenizer extends Tokenizer {
  constructor(str) { super(str, true); }
  async *parse() {
    let { reader, K } = this, line = 1, char = 0, offset = 0, o;
    let identr = /^([a-zA-Z_][a-zA-Z0-9_]*)/, floatr = /^([0-9]*\.[0-9]+)/, decr = /^([1-9][0-9]*|0)/, hexr = /^(0[xX][a-fA-F0-9]+)/,
        octr = /^(0[0-7]+)/, binr = /^(0[bB][0-1]+)/, opr = /^(<<=|>>=|\+\+|--|<<|>>|->|<=|>=|\+=|-=|\*=|\/=|&=|^=|%=|\|=|\+|-|\*|\/|&|\^|%|!|\||~|\[|\]|<|>|\.|=|;|,|\(|\)|{|})/,
        wordsr = /^(short|int|long|char|float|double|bool|void|unsigned|signed|struct|union|const|static|typedef|return|switch|case|default|while|for|do|class|goto|continue|break|if|else|enum|sizeof|this|null|true|false)\b/i; // f l u e
    while (true) {
      o = await reader.read();
      if (o !== false) { str += o; }
      if (str[offset] == ' ') { char++; offset++; continue; }
      if (str[offset] == '\n') { char = 0; line++; offset++; continue; }
      if (offset != 0) { str = str.substr(offset); offset = 0; }
      if (str == '') { break; }
      if (o = wordsr.exec(str)) { let t = new CToken(o[0], line, char); t.noRegex = true; yield t; o = o[0].length; offset += o; char += o; }
      else if ((o = hexr.exec(str)) || (o = octr.exec(str)) || (o = binr.exec(str)) ||
               (o = floatr.exec(str)) || (o = decr.exec(str)) || (o = opr.exec(str)) ||
               (o = identr.exec(str))) { yield new CToken(o[0], line, char); o = o[0].length; offset += o; char += o; }
      else if ((str[0] == '"') || (str[0] == "'")) {
        let s = '', c = 0, k = 1;
        while (true) {
          if (k >= str.length) { throw new Error(`Unmatched ${str[0]} at line ${line} char ${char}`); }
          if ((str[k] == str[0]) && (c%2 == 0)) { offset = k + 1; break; }
          if (str[k] == '\\') { c++; } else { c = 0; }
          s += str[k];
          k++;
        }
        yield new CToken(str[0], line, char);
        yield new CToken(s, line, char + 1);
        yield new CToken(str[0], line, char + s.length + 2);
        char += s.length + 3;
      } else { throw new Error(`Unknown ... something at line ${line} char ${char}`); }
    }
    while (K > 1) { yield Token.endToken; K--; }
    return Token.endToken;
  }
}
