import { StateGraph } from './stategraph.mjs';
import { LRBase } from './lrbase.mjs';
export class GLR extends LRBase {
  constructor() { super(); this.optimize = this.allowConflicts = true; }
  load(bnf, K = 1) {
    super.load(bnf);
    if (!this.graph.build(bnf, this.K = K, this.optimize = true, this.allowConflicts = true)) { return false; }
    this.graph.print();
    return true;
  }
}
