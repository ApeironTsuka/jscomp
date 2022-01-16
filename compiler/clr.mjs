import { StateGraph } from './stategraph.mjs';
import { LRBase } from './lrbase.mjs';
export class CLR extends LRBase {
  constructor() { super(); this.optimize = this.allowConflicts = false; }
  load(bnf, K = 1) {
    super.load(bnf);
    if (!this.graph.build(bnf, this.K = K, this.optimize = false, this.allowConflicts = false)) { return false; }
    this.graph.print();
    return true;
  }
}
