import { BNFTokenizer } from './compiler/tokenizers/bnftokenizer.mjs';
import { BNFToken } from './compiler/tokens/bnftoken.mjs';
import { YBNFTokenizer } from './compiler/tokenizers/ybnftokenizer.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import { SDT } from './compiler/sdt.mjs';
import fs from 'fs';
// set of pre-defined BNF productions to help out
export const bnfpre = new Map([
  [ 'letter', [ { tokens: [ { type: TERM, label: 'letter-regex', regex: /^[a-zA-Z]$/ } ] } ] ],
  [ 'digit', [ { tokens: [ { type: TERM, label: 'digit-regex', regex: /^[0-9]$/ } ] } ] ],
  // during the CLR(1), these regexes are run against the terminal's value and the one that matches is used to represent it
  // makes defining special constants easier
  [ 'identifier', [ { tokens: [ { type: TERM, label: 'identifier-regex', regex: /^[a-zA-Z_][a-zA-Z0-9_]*$/ } ] } ] ],
  [ 'floating-constant', [ { tokens: [ { type: TERM, label: 'floating-constant-regex', regex: /^-?[0-9]*\.[0-9]+$/ } ], func: (left, right) => { left.value = parseFloat(right[0].value); } } ] ],
  [ 'decimal-constant-regex-wrap', [ { tokens: [ { type: TERM, label: 'decimal-constant-regex', regex: /^([1-9][0-9]*|0)$/ } ] } ] ],
  [ 'hex-constant-regex-wrap', [ { tokens: [ { type: TERM, label: 'hex-constant-regex', regex: /^0[xX][a-fA-F0-9]+$/ } ] } ] ],
  [ 'octal-constant-regex-wrap', [ { tokens: [ { type: TERM, label: 'octal-constant-regex', regex: /^0[0-7]+$/ } ] } ] ],
  [ 'binary-constant-regex-wrap', [ { tokens: [ { type: TERM, label: 'binary-constant-regex', regex: /^0[bB][0-1]+$/ } ] } ] ],
  [ 'decimal-constant-regex-signed-wrap', [ { tokens: [ { type: TERM, label: 'decimal-constant-regex-signed', regex: /^[+-]?([1-9][0-9]*|0)$/ } ] } ] ],
  [ 'hex-constant-regex-signed-wrap', [ { tokens: [ { type: TERM, label: 'hex-constant-regex-signed', regex: /^[+-]?0[xX][a-fA-F0-9]+$/ } ] } ] ],
  [ 'octal-constant-regex-signed-wrap', [ { tokens: [ { type: TERM, label: 'octal-constant-regex-signed', regex: /^[+-]?0[0-7]+$/ } ] } ] ],
  [ 'binary-constant-regex-signed-wrap', [ { tokens: [ { type: TERM, label: 'binary-constant-regex-signed', regex: /^[+-]?0[bB][0-1]+$/ } ] } ] ],
  [ 'decimal-constant-regex-signed-typed-wrap', [ { tokens: [ { type: TERM, label: 'decimal-constant-regex-signed-typed', regex: /^[+-]?([1-9][0-9]*|0)(\.[bwdq])?$/ } ] } ] ],
  [ 'hex-constant-regex-signed-typed-wrap', [ { tokens: [ { type: TERM, label: 'hex-constant-regex-signed-typed', regex: /^[+-]?0[xX][a-fA-F0-9]+(\.[bwdq])?$/ } ] } ] ],
  [ 'octal-constant-regex-signed-typed-wrap', [ { tokens: [ { type: TERM, label: 'octal-constant-regex-signed-typed', regex: /^[+-]?0[0-7]+(\.[bwdq])?$/ } ] } ] ],
  [ 'binary-constant-regex-signed-typed-wrap', [ { tokens: [ { type: TERM, label: 'binary-constant-regex-signed-typed', regex: /^[+-]?0[bB][0-1]+(\.[bwdq])?$/ } ] } ] ],
  [ 'decimal-constant', [ { tokens: [ { type: NONTERM, label: 'decimal-constant-regex-wrap' } ], func: (left, right) => { left.value = parseInt(right[0].value); } } ] ],
  [ 'hex-constant', [ { tokens: [ { type: NONTERM, label: 'hex-constant-regex-wrap' } ], func: (left, right) => { left.value = parseInt(right[0].value.substr(2), 16); } } ] ],
  [ 'octal-constant', [ { tokens: [ { type: NONTERM, label: 'octal-constant-regex-wrap' } ], func: (left, right) => { left.value = parseInt(right[0].value.substr(1), 8); } } ] ],
  [ 'binary-constant', [ { tokens: [ { type: NONTERM, label: 'binary-constant-regex-wrap' } ], func: (left, right) => { left.value = parseInt(right[0].value.substr(2), 2); } } ] ],
  [ 'integer-constant',
    [
      { tokens: [ { type: NONTERM, label: 'decimal-constant' } ] },
      { tokens: [ { type: NONTERM, label: 'hex-constant' } ] },
      { tokens: [ { type: NONTERM, label: 'octal-constant' } ] },
      { tokens: [ { type: NONTERM, label: 'binary-constant' } ] }
    ]
  ],
  [ 'number-constant',
    [
      { tokens: [ { type: NONTERM, label: 'integer-constant' } ] },
      { tokens: [ { type: NONTERM, label: 'floating-constant' } ] }
    ]
  ],
  [ 'enumeration-constant', [ { tokens: [ { type: NONTERM, label: 'identifier' } ] } ] ],
  [ 'character-constant', [ { tokens: [ { type: TERM, label: 'character-constant-regex', regex: /^'([\x20-\x7e\x80-\xff]|\\x[0-9a-fA-F]{1,2}|\\[abefnrtv\\'"?])'$/ } ] } ] ],
  [ 'string', [ { tokens: [ { type: TERM, label: 'string-regex', regex: /^"[\x20-\x7e\x80-\xff]*"$/ } ] } ] ],
  [ 'space', [ { tokens: [ { type: TERM, label: ' ' } ] } ] ]
]);
// a small set of extra pre-defines for the YBNF format
let ybnfpre_ = new Map([
  [ 'int_const', bnfpre.get('integer-constant') ],
  [ 'char_const', bnfpre.get('character-constant') ],
  [ 'float_const', bnfpre.get('floating-constant') ],
  [ 'id', bnfpre.get('identifier') ],
  [ 'enumeration_const', bnfpre.get('enumeration-constant') ]
]);
for (let bnfpair of bnfpre.entries()) { ybnfpre_[bnfpair[0]] = bnfpair[1]; }
export const ybnfpre = ybnfpre_;
// a couple helpers to make using this monstrosity easier
export async function parseBNF(sbnf, honorEmpty = true) {
  let t = new BNFTokenizer(sbnf), sdt = new SDT(),
      b = BNFToken.honorEmpty, p;
  BNFToken.honorEmpty = honorEmpty;
  sdt.load(JSON.parse(fs.readFileSync(new URL('./bnf/bnf.sdt', import.meta.url), 'utf8')));
  p = sdt.run(t);
  BNFToken.honorEmpty = b;
  return p;
}
export async function parseYBNF(sbnf) {
  let t = new YBNFTokenizer(sbnf), sdt = new SDT();
  sdt.load(JSON.parse(fs.readFileSync('./bnf/ybnf.sdt', 'utf8')));
  return sdt.run(t);
}
