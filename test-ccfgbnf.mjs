import { SDT } from './compiler/sdt.mjs';
import { bnfpre, parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import { CFGBNFTokenizer } from './compiler/tokenizers/cfgbnftokenizer.mjs';
import fs from 'fs';

let cfgbnfpre = {
  'string-literal': bnfpre['string']
};
for (let i = 0, keys = Object.keys(bnfpre), l = keys.length; i < l; i++) { cfgbnfpre[keys[i]] = bnfpre[keys[i]]; }
console.log('Parse CFG parser');
parseBNF(`
# terminals with [] are special ones created by the tokenizer. They're effectively pseudo non-terminals
<axiom> ::= {<definition>}+
          { let out = {}; for (let i = 0, l = right.length; i < l; i++) { out[right[i].value[0]] = right[i].value[1]; } left.value = out; }

<definition> ::= [nonterm] [newline] <productions>
               { left.value = [ right[0].value, right[2].value ]; }

<productions> ::= {<production>}+
               { let out = []; for (let i = 0, l = right.length; i < l; i++) { out.push(right[i].value); } left.value = out; }

<production> ::= [space] {<token>}+ [newline] {<code>}?
               { left.value = mkprod(1, left, right); }
               | [space] [empty] [newline]
               { left.value = mkprod(0, left, []); }

<token> ::= [term]
          { left.value = { type: right[0].orig._type, label: right[0].value }; }
          | [nonterm]
          { left.value = { type: right[0].orig._type, label: right[0].value }; }

<code> ::= {<codep>}+

<codep> ::= [ast] [code] \n
         { left.value = right[1].value; }
`, false).then((b) => {
  console.log('CFG parser');
  let t = new CFGBNFTokenizer(fs.readFileSync('./bnf/c.cfg', 'utf8').toString()), sdt = new SDT();
  sdt.create(b, cfgbnfpre);
  return sdt.run(t);
}).then((b) => {
  console.log('CFG');
  let sdt = new SDT();
  sdt.create(b, cfgbnfpre);
  let a = [ new Token(TERM, '1'), new Token(TERM, '+'), new Token(TERM, '1'), new Token(TERM, '$') ];
  return sdt.run(a);
})
.then((b) => {});
