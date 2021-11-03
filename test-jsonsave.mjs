import { MathTokenizer } from './compiler/tokenizers/mathtokenizer.mjs';
import { SDT } from './compiler/sdt.mjs';
import { bnfpre, parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import { Printer, Channels } from './compiler/printer.mjs';
import fs from 'fs';
Printer.channel = Channels.VERBOSE;

parseBNF(fs.readFileSync('bnf/bnf.bnf').toString(), false)
.then((b) => {
  let sdt = new SDT();
  sdt.create(b);
  sdt.useDefault();
  fs.writeFileSync('bnf/bnf2.sdt', JSON.stringify(sdt.toJSON()));
});
