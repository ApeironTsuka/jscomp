import { Token } from '../tokens/token.mjs';
import { BNFToken } from '../tokens/bnftoken.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM, NONTERM, ZEROORONE, ONEPLUS, ZEROPLUS } from '../consts.mjs';
export class BNFTokenizer extends Tokenizer {
  constructor(str, keepWS = false) { super(); this.str = str; this.keep = keepWS; }
  *parse() {
    let { str, K } = this, lines = str.split(/\n/), line, arr, inCode = false, bcount = 0, code = '', seenSet = false, seenBar = false;
    let nonterm = /^(\{?)(\<(.*?)\>)((\})([+*?]))?$/, d;
    for (let i = 0, l = lines.length; i < l; i++) {
      line = lines[i].replace(/^ */, '').replace(/ *$/, '');
      if (!inCode) {
        if (line == '') { continue; }
        if (line[0] == '#') { continue; }
        arr = line.split(' ')
        if (line[0] == '{') {
          inCode = true;
          bcount = 1;
          code = '';
          lines[i] = line.substr(1);
          yield new BNFToken('{', undefined, i, 0);
          i--;
          continue;
        }
        else if (line[0] == '.') {
          yield new BNFToken('.', undefined, i, 0);
          yield new BNFToken(TERM, arr[0].substr(1), i, 0);
          if (arr.length == 1) { yield new BNFToken(TERM, '1', i, 1); continue; }
          if (arr[1][0] == '{') {
            inCode = true;
            bcount = 1;
            code = '';
            lines[i] = line.substr(arr[0].length + 2);
            yield new BNFToken('{', undefined, i, 1);
            i--;
          } else { yield new BNFToken(TERM, arr[1], i, 1); }
          continue;
        }
        seenBar = seenSet = false;
        for (let x = 0, xl = arr.length; x < xl; x++) {
          if (arr[x] == '') { continue; }
          if (d = nonterm.exec(arr[x])) { yield new BNFToken(NONTERM, d[3], i, x, (d[6] == '+' ? ONEPLUS : d[6] == '*' ? ZEROPLUS : d[6] == '?' ? ZEROORONE : undefined)); }
          else {
            switch (arr[x]) {
              case '::=':
                yield seenSet ? new BNFToken(TERM, arr[x], i, x) : new BNFToken(arr[x], undefined, i, x);
                seenSet = true;
                break;
              case '|':
                yield (seenBar || seenSet) ? new BNFToken(TERM, arr[x], i, x) : new BNFToken(arr[x], undefined, i, x);
                seenBar = true;
                break;
              default: yield new BNFToken(TERM, arr[x], i, x); break;
            }
          }
        }
        yield new BNFToken('\\n', undefined, i, arr.length);
      } else {
        for (let x = 0, xl = line.length; x < xl; x++) {
          if (line[x] == '{') { bcount++; }
          else if (line[x] == '}') { bcount--; }
        }
        if (this.keep) { code += '\n' + lines[i]; }
        else { code += line; }
        if (bcount == 0) {
          code = code.replace(/\s*?\}$/, '');
          inCode = false;
          yield new BNFToken('[code]', code, i, 0);
          yield new BNFToken('}', undefined, i, 0);
          yield new BNFToken('\\n', undefined, i, 0);
        }
      }
    }
    while (K > 1) { yield new Token(TERM, '$'); K--; }
    return new Token(TERM, '$');
  }
}

