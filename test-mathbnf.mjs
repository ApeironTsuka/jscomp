import { MathTokenizer } from './compiler/tokenizers/mathtokenizer.mjs';
import { SDT } from './compiler/sdt.mjs';
import { bnfpre, parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import fs from 'fs';

console.log('outer '+parseBNF(fs.readFileSync('bnf/math.bnf').toString(), (b) => {
  let sdt = new SDT(), t = new MathTokenizer('1+1');
  sdt.create(b, bnfpre);
  console.log('inner '+sdt.run(t, (b) => { console.log(`Result: ${b}`); }));
}));
