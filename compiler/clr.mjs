import { StateGraph } from './stategraph.mjs';
import { LRBase } from './lrbase.mjs';
export class CLR extends LRBase {
  load(bnf, K = 1) {
    super.load(bnf);
    if (!this.graph.build(bnf, this.K = K, false)) { return false; }
    this.graph.print();
    return true;
  }
}
