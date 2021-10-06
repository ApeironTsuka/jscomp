import { SDT } from './compiler/sdt.mjs';
import { ybnfpre, parseYBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import fs from 'fs';

console.log('outer', parseYBNF(fs.readFileSync('bnf/c.ybnf').toString(), (b) => {
  let sdt = new SDT();
  sdt.create(b, ybnfpre);
  let a = [ new Token(TERM, '1'), new Token(TERM, '+'), new Token(TERM, '1'), new Token(TERM, '$') ];
  console.log('inner', sdt.run(a, (b) => {}));
}));
