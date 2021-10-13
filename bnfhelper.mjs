import { BNFTokenizer } from './compiler/tokenizers/bnftokenizer.mjs';
import { BNFToken } from './compiler/tokens/bnftoken.mjs';
import { YBNFTokenizer } from './compiler/tokenizers/ybnftokenizer.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import { SDT } from './compiler/sdt.mjs';
import fs from 'fs';
// helper function to convert the BNF into the internal format
function mkprod(f, left, right, k = 0) {
  let out = { tokens: [] }, hasCode = right.length > 0 && right[right.length-1].label == 'code';
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
// a couple helpers to make using this monstrosity easier
export function parseBNF(sbnf, _honorEmpty = true, _cb = undefined) {
  let t = new BNFTokenizer(sbnf), sdt = new SDT(),
      honorEmpty = _honorEmpty, cb = _cb, b = BNFToken.honorEmpty, p;
  if (typeof _honorEmpty == 'function') { honorEmpty = true; cb = _honorEmpty; }
  BNFToken.honorEmpty = honorEmpty;
  sdt.load(JSON.parse(fs.readFileSync('./bnf/bnf2.sdt', 'utf8')), mkprod.toString());
  if (cb) { p = sdt.run(t, cb); }
  else { p = sdt.run(t); }
  BNFToken.honorEmpty = b;
  return p;
}
export function parseYBNF(sbnf, cb = undefined) {
  let t = new YBNFTokenizer(sbnf), sdt = new SDT();
  sdt.load(JSON.parse(fs.readFileSync('./bnf/ybnf.sdt', 'utf8')), mkprod.toString());
  if (cb) { return sdt.run(t, cb); }
  else { return sdt.run(t); }
}
