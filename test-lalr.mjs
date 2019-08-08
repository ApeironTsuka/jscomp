import { BNFTokenizer } from './compiler/tokenizers/bnftokenizer.mjs';
import { SDT } from './compiler/sdt.mjs';
import { LALR } from './compiler/lalr.mjs';
import { bnfpre, parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import fs from 'fs';

console.log('outer '+parseBNF(`
<axiom> ::= <A> <A>
<A> ::= a <A>
      | b
`, (b) => {
  let sdt = new SDT(), tmp;
  sdt.create(b);
  if (!sdt.useLALR()) { console.log('LALR false'); return; }
  let a = [ new Token(TERM, 'a'), new Token(TERM, 'a'), new Token(TERM, 'b'), new Token(TERM, 'b'), new Token(TERM, '$') ];
  console.log('inner '+sdt.run(a, (b) => {}));
}));
