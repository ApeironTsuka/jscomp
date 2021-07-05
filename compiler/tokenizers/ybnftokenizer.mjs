import { Token } from '../tokens/token.mjs';
import { BNFToken } from '../tokens/bnftoken.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM, NONTERM } from '../consts.mjs';
export class YBNFTokenizer extends Tokenizer {
  constructor(str) { super(); this.str = str; }
  *parse() {
    let { str } = this, lines = str.split(/\n/), line, d;
    let term = /^'(.*?)'$/;
    for (let i = 0, l = lines.length; i < l; i++) {
      lines[i] = lines[i].replace(/^[ \t]*/, '').replace(/[ \t]*$/, '').replace(/\t/g, ' ');
      if (lines[i] == '') { continue; }
      if (/^%/.test(lines[i])) { continue; } // dunno how to handle this stuff
      line = lines[i].split(' ');
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
    while (this.K > 0) { yield new Token(TERM, '$'); }
    return new Token(TERM, '$');
  }
}

