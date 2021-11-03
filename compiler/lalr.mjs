import { StateGraph } from './stategraph.mjs';
import { LRBase } from './lrbase.mjs';
export class LALR extends LRBase {
  load(bnf, K = 1) {
    super.load(bnf);
    if (!this.graph.build(bnf, this.K = K, this.optimize = true)) { return false; }
    this.graph.print();
    return true;
  }
}
