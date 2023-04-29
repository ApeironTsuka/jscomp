import { SDT } from './compiler/sdt.mjs';
import { parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import fs from 'fs';

parseBNF(`
<axiom> ::= <A> <A>
<A> ::= a <A>
      | b
`)
.then((b) => {
  let sdt = new SDT();
  sdt.create(b);
  if (!sdt.useLALR()) { console.log('LALR false'); return; }
  let a = [ new Token(TERM, 'a'), new Token(TERM, 'a'), new Token(TERM, 'b'), new Token(TERM, 'b'), Token.endToken ];
  return sdt.run(a);
})
.then((b) => {});
