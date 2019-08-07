import { StateGraph } from './stategraph.mjs';
import { CLR } from './clr.mjs';
import { TERM, NONTERM, SHIFT, REDUCE, ACCEPT } from './consts.mjs';
export class LALR extends CLR {
  load(bnf) {
    this.bnf = bnf;
    let s = this.graph = new StateGraph();
    if (!s.build(bnf)) { return false; }
    s.optimize();
    s.print();
    return true;
  }
}