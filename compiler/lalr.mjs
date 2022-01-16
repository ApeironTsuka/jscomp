import { StateGraph } from './stategraph.mjs';
import { LRBase } from './lrbase.mjs';
export class LALR extends LRBase {
  constructor() { super(); this.optimize = true; this.allowConflicts = false; }
  load(bnf, K = 1) {
    super.load(bnf);
    if (!this.graph.build(bnf, this.K = K, this.optimize = true, this.allowConflicts = false)) { return false; }
    this.graph.print();
    return true;
  }
}
