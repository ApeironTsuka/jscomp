import { Token } from '../tokens/token.mjs';
import { BNFToken } from '../tokens/bnftoken.mjs';
import { Tokenizer } from './tokenizer.mjs';
import { TERM, NONTERM } from '../consts.mjs';
export class CFGBNFTokenizer extends Tokenizer {
  constructor(str) { super(str); }
  async *parse() {
    let { reader, K } = this, lines = [], line, d;
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
    while ((line = await reader.read()) !== false) {
      lines.push(line);
      if (line[0] == ' ') { continue; }
      else if (line[0] == '*') { continue; }
      else { nonterms[line.split(' ')[0]] = true; }
    }
    for (let i = 0, l = lines.length; i < l; i++) {
      line = lines[i].replace(/\t/g, ' ').replace(/ *$/, '');
      if (line == '') { continue; }
      if (line[0] == '#') { continue; }
      line = line.split(' ');
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
        if (line[x] == '_E_M_P_T_Y_R_U_L_E_') { yield new BNFToken('[empty]', undefined, i, x); break; }
        else if (nonterms[line[x]]) { yield new BNFToken(NONTERM, line[x], i, x); }
        else { yield new BNFToken(TERM, line[x], i, x); }
      }
      yield new BNFToken('[newline]', undefined, i, line.length);
    }
    while (K > 1) { yield new Token(TERM, '$'); K--; }
    return new Token(TERM, '$');
  }
}
