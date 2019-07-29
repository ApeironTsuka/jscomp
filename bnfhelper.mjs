import { BNFTokenizer } from './compiler/tokenizers/bnftokenizer.mjs';
import { YBNFTokenizer } from './compiler/tokenizers/ybnftokenizer.mjs';
import { TERM, NONTERM, ZEROORONE, ONEPLUS, ZEROPLUS } from './compiler/consts.mjs';
import { SDT } from './compiler/sdt.mjs';
// helper function to convert the BNF into the internal format
function mkprod(f, left, right, k = 0) {
  let out = { tokens: [] }, hasCode = right[right.length-1].label == 'code';
  for (let i = f, l = right.length-1-(hasCode?1:0)+k; i < l; i++) { out.tokens.push(right[i].value); }
  if (hasCode) { out.func = eval(`(left, right) => { ${right[right.length-1].value} }`); }
  return out;
}
// set of pre-defined BNF productions to help out
export const bnfpre = {
  letter: [ { tokens: [ { type: TERM, label: 'letter-regex', regex: /^[a-zA-Z]$/ } ] } ],
  digit: [ { tokens: [ { type: TERM, label: 'digit-regex', regex: /^[0-9]$/ } ] } ],
  // during the CLR(1), these regexes are run against the terminal's value and the one that matches is used to represent it
  // makes defining special constants easier
  identifier: [ { tokens: [ { type: TERM, label: 'identifier-regex', regex: /^[a-zA-Z_][a-zA-Z0-9_]*$/ } ] } ],
  'floating-constant': [ { tokens: [ { type: TERM, label: 'floating-constant-regex', regex: /^[0-9]*\.[0-9]+$/ } ], func: (left, right) => { left.value = parseFloat(right[0].value); } } ],
  'decimal-constant': [ { tokens: [ { type: TERM, label: 'decimal-constant-regex', regex: /^([1-9][0-9]*|0)$/ } ], func: (left, right) => { left.value = parseInt(right[0].value); } } ],
  'hex-constant': [ { tokens: [ { type: TERM, label: 'hex-constant-regex', regex: /^0[xX][a-fA-F0-9]+$/ } ], func: (left, right) => { left.value = parseInt(right[0].value.substr(2), 16); } } ],
  'octal-constant': [ { tokens: [ { type: TERM, label: 'octal-constant-regex', regex: /^0[0-7]+$/ } ], func: (left, right) => { left.value = parseInt(right[0].value.substr(1), 8); } } ],
  'binary-constant': [ { tokens: [ { type: TERM, label: 'binary-constant-regex', regex: /^0[bB][0-1]+$/ } ], func: (left, right) => { left.value = parseInt(right[0].value.substr(2), 2); } } ],
  'integer-constant': [
    { tokens: [ { type: NONTERM, label: 'decimal-constant' } ] },
    { tokens: [ { type: NONTERM, label: 'hex-constant' } ] },
    { tokens: [ { type: NONTERM, label: 'octal-constant' } ] },
    { tokens: [ { type: NONTERM, label: 'binary-constant' } ] }
  ],
  'number-constant': [
    { tokens: [ { type: NONTERM, label: 'integer-constant' } ] },
    { tokens: [ { type: NONTERM, label: 'floating-constant' } ] }
  ],
  'enumeration-constant': [ { tokens: [ { type: NONTERM, label: 'identifier' } ] } ],
  'character-constant': [ { tokens: [ { type: TERM, label: 'character-constant-regex', regex: /^'([\x20-\x7e\x80-\xff]|\\x[0-9a-fA-F]{1,2}|\\[abefnrtv\\'"?])'$/ } ] } ],
  string: [ { tokens: [ { type: TERM, label: 'string-regex', regex: /^"[\x20-\x7e\x80-\xff]*"$/ } ] } ],
  space: [ { tokens: [ { type: TERM, label: ' ' } ] } ]
};
// a small set of extra pre-defines for the YBNF format
let ybnfpre_ = {
  int_const: bnfpre['integer-constant'],
  char_const: bnfpre['character-constant'],
  float_const: bnfpre['floating-constant'],
  id: bnfpre['identifier'],
  enumeration_const: bnfpre['enumeration-constant']
};
for (let i = 0, keys = Object.keys(bnfpre), l = keys.length; i < l; i++) { ybnfpre_[keys[i]] = bnfpre[keys[i]]; }
export const ybnfpre = ybnfpre_;
// a pre-tokenized representation of bnf/bnf.bnf. note that this is *not* the internal representation
let bnf = {
  axiom: [ { tokens: [ { type: NONTERM, label: 'root' } ] } ],
  root: [ { tokens: [ { type: NONTERM, label: 'definition', repeat: ONEPLUS } ], func: (left, right) => { let out = {}; for (let i = 0, l = right.length; i < l; i++) { out[right[i].value[0]] = right[i].value[1]; } left.value = out; } } ],
  definition: [ { tokens: [ { type: TERM, label: '[nonterm]' }, { type: TERM, label: '::=' }, { type: NONTERM, label: 'productions' } ], func: (left, right) => { left.value = [ right[0].value, right[2].value ]; } } ],
  productionB: [ { tokens: [ { type: TERM, label: '|' }, { type: NONTERM, label: 'token', repeat: ONEPLUS }, { type: TERM, label: '\\n' }, { type: NONTERM, label: 'code', repeat: ZEROORONE } ], func: (left, right) => { left.value = mkprod(1, left, right); } } ],
  productionA: [ { tokens: [ { type: NONTERM, label: 'token', repeat: ONEPLUS }, { type: TERM, label: '\\n' }, { type: NONTERM, label: 'code', repeat: ZEROORONE } ], func: (left, right) => { left.value = mkprod(0, left, right); } } ],
  productions: [ { tokens: [ { type: NONTERM, label: 'productionA' }, { type: NONTERM, label: 'productionB', repeat: ZEROPLUS } ], func: (left, right) => { let out = []; for (let i = 0, l = right.length; i < l; i++) { out.push(right[i].value); } left.value = out; } } ],
  code: [ { tokens: [ { type: TERM, label: '{' }, { type: TERM, label: '[code]' }, { type: TERM, label: '}' }, { type: TERM, label: '\\n' } ], func: (left, right) => { left.value = right[1].value; } } ],
  token: [
    { tokens: [ { type: TERM, label: '[term]' } ], func: (left, right) => { left.value = { type: right[0].orig._type, label: right[0].value }; } },
    { tokens: [ { type: TERM, label: '[nonterm]' } ], func: (left, right) => { left.value = { type: right[0].orig._type, label: right[0].value, repeat: right[0].orig.repeat }; } }
  ]
};
// a couple helpers to make using this monstrosity easier
// eventually these will be replaced by versions that directly use internal representations
// but for now, these help debug by existing. if something is changed and it can no longer tokenize or parse, it's pretty evident
export function parseBNF(sbnf, cb) {
  let t = new BNFTokenizer(sbnf), a = [], o, sdt;
  t.init();
  while (o = t.next()) { a.push(o); }
  sdt = new SDT(bnf, undefined);
  return sdt.run(a, cb);
}

export function parseYBNF(sbnf, cb) {
  parseBNF(`
<axiom> ::= <root>
<root> ::= {<definition>}+
         { let out = {}; for (let i = 0, l = right.length; i < l; i++) { out[right[i].value[0]] = right[i].value[1]; } left.value = out; }
<definition> ::= [nonterm] : <productions> ;
               { left.value = [ right[0].value, right[2].value ]; }
<productions> ::= <productionA> {<productionB>}*
                { let out = []; for (let i = 0, l = right.length; i < l; i++) { out.push(right[i].value); } left.value = out; }
<productionA> ::= {<token>}+
                { left.value = mkprod(0, left, right, 1); }
<productionB> ::= | {<token>}+
                { left.value = mkprod(1, left, right, 1); }
<token> ::= [term]
          { left.value = { type: right[0].orig._type, label: right[0].value }; }
          | [nonterm]
          { left.value = { type: right[0].orig._type, label: right[0].value }; }
`, (b) => {
    let t = new YBNFTokenizer(sbnf), a = [], o, sdt;
    t.init();
    while (o = t.next()) { a.push(o); }
    sdt = new SDT(b, undefined);
    return sdt.run(a, cb);
  });
}
