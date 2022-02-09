import { Token } from '../tokens/token.mjs';
import { BNFToken } from '../tokens/bnftoken.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM, NONTERM } from '../consts.mjs';
export class YBNFTokenizer extends Tokenizer {
  constructor(str) { super(str); }
  async *parse() {
    let { reader, K } = this, line, d;
    let term = /^'(.*?)'$/;
    while ((line = await reader.read()) !== false) {
      line = line.replace(/^[ \t]*/, '').replace(/[ \t]*$/, '').replace(/\t/g, ' ');
      if (line == '') { continue; }
      if (/^%/.test(line)) { continue; } // dunno how to handle this stuff
      line = line.split(' ');
      for (let x = 0, xl = line.length; x < xl; x++) {
        if (d = term.exec(line[x])) { yield new BNFToken(TERM, d[1], i, x); }
        else {
          switch (line[x]) {
            case ':': case '|': case ';': yield new BNFToken(line[x], undefined, i, x); break;
            case '': continue;
            default: yield new BNFToken(NONTERM, line[x], i, x); break;
          }
        }
      }
    }
    while (K > 1) { yield new Token(TERM, '$'); K--; }
    return new Token(TERM, '$');
  }
}

