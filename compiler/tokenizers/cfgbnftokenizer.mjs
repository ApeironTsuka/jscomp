import { Token } from '../tokens/token.mjs';
import { BNFToken } from '../tokens/bnftoken.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM, NONTERM } from '../consts.mjs';
export class CFGBNFTokenizer extends Tokenizer {
  constructor(str) { super(); this.str = str; }
  *parse() {
    let { str } = this, lines = str.split(/\n/), line, d;
    let nonterms = {
      'letter': true,
      'digit': true,
      'identifier': true,
      'floating-constant': true,
      'decimal-constant': true,
      'octal-constant': true,
      'binary-constant': true,
      'integer-constant': true,
      'number-constant': true,
      'enumeration-constant': true,
      'character-constant': true,
      'string': true,
      'space': true
    };
    for (let i = 0, l = lines.length; i < l; i++) {
      if (lines[i][0] == ' ') { continue; }
      else if (lines[i][0] == '*') { continue; }
      else { nonterms[lines[i].split(' ')[0]] = true; }
    }
    for (let i = 0, l = lines.length; i < l; i++) {
      lines[i] = lines[i].replace(/\t/g, ' ').replace(/ *$/, '');
      if (lines[i] == '') { continue; }
      if (lines[i][0] == '#') { continue; }
      line = lines[i].split(' ');
      switch (line[0]) {
        case '': yield new BNFToken('[space]', undefined, i, 0); d = 1; break;
        case '*':
          yield new BNFToken('[ast]', undefined, i, 0);
          yield new BNFToken('[code]', lines[i].substr(1), i, 1);
          yield new BNFToken('[newline]', undefined, i, 2);
          continue;
        default: d = 0;
      }
      for (let x = d, xl = line.length; x < xl; x++) {
        if (line[x] == '') { continue; }
        if (nonterms[line[x]]) { yield new BNFToken(NONTERM, line[x], i, x); }
        else { yield new BNFToken(TERM, line[x], i, x); }
      }
      yield new BNFToken('[newline]', undefined, i, line.length);
    }
    while (this.K > 0) { yield new Token(TERM, '$'); }
    return new Token(TERM, '$');
  }
}
