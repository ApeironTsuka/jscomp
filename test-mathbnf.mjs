import { MathTokenizer } from './compiler/tokenizers/mathtokenizer.mjs';
import { SDT } from './compiler/sdt.mjs';
import { bnfpre, parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import fs from 'fs';

console.log('outer '+parseBNF(fs.readFileSync('bnf/math.bnf').toString(), (b) => {
  let sdt = new SDT();
  sdt.create(b, bnfpre);
  let a = [ new Token(TERM, '1'), new Token(TERM, '+'), new Token(TERM, '1'), new Token(TERM, '$') ];
  console.log('inner '+sdt.run(a, (b) => { console.log(`Result: ${b}`); }));
}));
