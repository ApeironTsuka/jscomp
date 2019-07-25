import { Token } from './tokens/token.mjs';
import { TreeToken } from './tokens/treetoken.mjs';
import { StateGraph } from './stategraph.mjs';
import { TERM, NONTERM, SHIFT, REDUCE, ACCEPT } from './consts.mjs';
export class CLR {
  constructor() {}
  load(bnf) {
    this.bnf = bnf;
    let s = this.graph = new StateGraph();
    if (!s.build(bnf)) { return false; }
    s.print();
    return true;
  }
  parse(tokens) {
    let stack = [ 0 ], cursor = 0, charts = this.graph.charts, chart, token = tokens[cursor], bnf = this.bnf.list, tree = this.tree = [], run = true;
    let shift = (a, _n) => { let n = _n; while (n--) { a.shift(); } };
    let treeshift = (a, _n, p, prod) => { let n = _n; while (n--) { p.children.unshift(a.shift()); } a.unshift(p); p.func = prod.func; };
    let findByRegex = (label, chart) => {
      let works = [];
      // find all of the regex it matches
      for (let i = 0, list = this.bnf.regexes.list, l = list.length; i < l; i++) { if (list[i].regex.test(label)) { works.push(list[i]); } }
      if (works.length == 1) { return works[0].label; }
      // remove the matches that doesn't have in the chart
      for (let i = 0, l = works.length; i < l; i++) { if (!chart[works[i].label]) { works.splice(i, 1); i--; l--; } }
      if (works.length == 1) { return works[0].label; }
      // either none matched, or too many matched and it doesn't know what to do
      return undefined;
    };
    while (run) {
      chart = charts[stack[0]];
      if (!chart[token.label]) {
        let t = findByRegex(token.label, chart);
        if (chart[t]) { let k = token; token = new Token(TERM, t, token.label); token.orig = k; }
      }
      if (!chart[token.label]) {
        console.log(`Unexpected '${token}' at index ${cursor}`);
        console.log(stack);
        return false;
      }
      switch (chart[token.label].act) {
        case SHIFT:
          stack.unshift(token);
          stack.unshift(chart[token.label].n);
          tree.unshift(TreeToken.copyOf(token, token.virt));
          cursor++;
          token = tokens[cursor];
          if (!token) { token = new Token(TERM, '$'); }
          break;
        case REDUCE:
          shift(stack, 2*chart[token.label].l);
          treeshift(tree, chart[token.label].l, TreeToken.copyOf(bnf[chart[token.label].n].left, bnf[chart[token.label].n].virt), bnf[chart[token.label].n]);
          stack.unshift(bnf[chart[token.label].n].left);
          stack.unshift(charts[stack[1]][stack[0].label].n);
          break;
        case ACCEPT:
          shift(stack, 2);
          if ((stack.length == 1) && (stack[0] == 0)) { run = false; break; }
          console.log(`Unexpected ACCEPT at ${cursor}`);
          console.log(stack);
          return false;
        default: console.log(`DEFAULT ${token.label}`); console.log(chart[token.label]); return false;
      }
    }
    let fixvirts = (list) => {
      for (let i = 0, l = list.length; i < l; i++) {
        if (list[i].virt) { list.splice(i, 1, ...list[i].children); i--; l = list.length; continue; }
        fixvirts(list[i].children);
      }
    };
    fixvirts(this.tree);
    return true;
  }
}
