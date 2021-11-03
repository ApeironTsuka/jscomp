import { Printer, Channels } from './compiler/printer.mjs';
import { SDT } from './compiler/sdt.mjs';
import { bnfpre, parseBNF } from './bnfhelper.mjs';
import { Token } from './compiler/tokens/token.mjs';
import { TERM, NONTERM } from './compiler/consts.mjs';
import { CTokenizer } from './compiler/tokenizers/ctokenizer.mjs';
import fs from 'fs';
Printer.channel = Channels.DEBUG;
let sdt;
parseBNF(fs.readFileSync('bnf/c.bnf').toString())
.then((b) => {
  sdt = new SDT();
  sdt.create(b, bnfpre);
  sdt.useGLR();
  let a = new CTokenizer(`void doThing() { printf(); }\nint main() { doThing(); return 0; }`);
  return sdt.run(a);
})
.then((b) => { console.log(sdt.gen.trees.length); });
