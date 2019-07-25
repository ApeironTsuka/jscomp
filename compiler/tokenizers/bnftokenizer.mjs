import { Token } from '../tokens/token.mjs';
import { BNFToken } from '../tokens/bnftoken.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM, NONTERM, ZEROORONE, ONEPLUS, ZEROPLUS } from '../consts.mjs';
export class BNFTokenizer extends Tokenizer {
  constructor(str) { super(); this.str = str; }
  *parse() {
    let str = this.str, lines = str.split(/\n/), line, inCode = false, bcount = 0, code = '', seenSet = false, seenBar = false;
    let nonterm = /^(\{?)(\<(.*?)\>)((\})([+*?]))?$/, d;
    for (let i = 0, l = lines.length; i < l; i++) {
      lines[i] = lines[i].replace(/^ */, '').replace(/ *$/, '');
      if (!inCode) {
        if (lines[i] == '') { continue; }
        if (lines[i][0] == '#') { continue; }
        line = lines[i].split(' ')
        if (lines[i][0] == '{') {
          inCode = true;
          bcount = 1;
          code = '';
          lines[i] = lines[i].substr(1);
          yield new BNFToken('{', undefined, i, 0);
          i--;
          continue;
        }
        seenBar = seenSet = false;
        for (let x = 0, xl = line.length; x < xl; x++) {
          if (!inCode) {
            if (line[x] == '') { continue; }
            if (d = nonterm.exec(line[x])) { yield new BNFToken(NONTERM, d[3], i, x, (d[6]=='+'?ONEPLUS:d[6]=='*'?ZEROPLUS:d[6]=='?'?ZEROORONE:undefined)); }
            else {
              switch (line[x]) {
                case '::=':
                  yield seenSet?new BNFToken(TERM, line[x], i, x):new BNFToken(line[x], undefined, i, x);
                  seenSet = true;
                  break;
                case '|': 
                  yield seenBar|seenSet?new BNFToken(TERM, line[x], i, x):new BNFToken(line[x], undefined, i, x);
                  seenBar = true;
                  break;
                default: yield new BNFToken(TERM, line[x], i, x); break;
              }
            }
          }
        }
        yield new BNFToken('\\n', undefined, i, line.length);
      } else {
        for (let x = 0, line = lines[i], xl = line.length; x < xl; x++) {
          if (line[x] == '{') { bcount++; }
          else if (line[x] == '}') { bcount--; }
        }
        code += lines[i];
        if (bcount == 0) {
          code = code.replace(/ ?\}$/, '');
          inCode = false;
          yield new BNFToken('[code]', code, i, 0);
          yield new BNFToken('}', undefined, i, 0);
          yield new BNFToken('\\n', undefined, i, 0);
        }
      }
    }
    return new Token(TERM, '$');
  }
}

