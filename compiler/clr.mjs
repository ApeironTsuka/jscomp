import { Token } from './tokens/token.mjs';
import { TreeToken } from './tokens/treetoken.mjs';
import { StateGraph } from './stategraph.mjs';
import { Tokenizer } from './tokenizers/tokenizer.mjs';
import { Tokens } from './tokens.mjs';
import { TERM, NONTERM, SHIFT, REDUCE, ACCEPT } from './consts.mjs';
export class CLR {
  constructor(K = 1) { this.K = K; }
  load(bnf) {
    this.bnf = bnf;
    let s = this.graph = new StateGraph(this.K);
    if (!s.build(bnf)) { return false; }
    s.print();
    return true;
  }
  parse(tokens) {
    let stack = [ 0 ], cursor = 0, { charts, tokens: chartTokens } = this.graph, { K } = this, chart, bnf = this.bnf.list, tree = this.tree = [], run = true, isGen = tokens instanceof Tokenizer, token, tokenLabel, tokenBuf = new Tokens();
    let shift = (a, _n) => { let n = _n; while (n--) { a.shift(); } };
    // move n from array a into p's children and set p's func to prod's
    let treeshift = (a, _n, p, prod) => { let n = _n; while (n--) { p.children.unshift(a.shift()); } a.unshift(p); p.index = prod.index; };
    let findByRegex = (label) => {
      let works = [];
      // find all of the regex it matches
      for (let i = 0, list = this.bnf.regexes.list, l = list.length; i < l; i++) { if (list[i].regex.test(label)) { works.push(list[i]); } }
      if (works.length == 1) { return works[0].label; }
      // remove the matches that doesn't have in the chart
      for (let i = 0, l = works.length; i < l; i++) { if (chartTokens.indexOf(works[i].label) == -1) { works.splice(i, 1); i--; l--; } }
      if (works.length == 1) { return works[0].label; }
      // either none matched, or too many matched and it doesn't know what to do
      return undefined;
    };
    let addNextToken = () => {
      let t, tr;
      if (isGen) { t = tokens.next(); }
      else { if (cursor < tokens.length) { t = tokens[cursor++]; } else { t = tokens[tokens.length-1]; } }
      tr = findByRegex(t.label);
      if (tr) { let k = t; t = new Token(TERM, tr, t.label); t.orig = k; }
      tokenBuf.list.push(t);
    };
    if (isGen) { if (!tokens.working) { tokens.init(K); } }
    for (let i = 0; i < K; i++) { addNextToken(); }
    token = tokenBuf.list[0];
    tokenLabel = token.label;
    while (run) {
      chart = charts[stack[0]];
      if (!chart[tokenLabel]) { tokenLabel = tokenBuf.toString(); }
      if (!chart[tokenLabel]) {
        console.log(`Unexpected '${tokenLabel}' at index ${cursor}`);
        console.log(tokenBuf);
        console.log(stack);
        console.log(Object.keys(chart));
        return false;
      }
      switch (chart[tokenLabel].act) {
        case SHIFT:
          stack.unshift(token);
          stack.unshift(chart[tokenLabel].n);
          tree.unshift(TreeToken.copyOf(token, token.virt));
          tokenBuf.list.shift(); addNextToken(); token = tokenBuf.list[0]; tokenLabel = token.label;
          if (!token) { token = new Token(TERM, '$'); }
          break;
        case REDUCE:
          shift(stack, 2*chart[tokenLabel].l);
          treeshift(tree, chart[tokenLabel].l, TreeToken.copyOf(bnf[chart[tokenLabel].n].left, bnf[chart[tokenLabel].n].virt), bnf[chart[tokenLabel].n]);
          stack.unshift(bnf[chart[tokenLabel].n].left);
          if (K > 1) {
            let lbl = Tokens.copyOf(tokenBuf);
            lbl.list.unshift(stack[0]);
            lbl.list.pop();
            lbl = lbl.toString();
            stack.unshift(charts[stack[1]][lbl].n);
          } else { stack.unshift(charts[stack[1]][stack[0].label].n); }
          break;
        case ACCEPT:
          shift(stack, 2);
          if ((stack.length == 1) && (stack[0] == 0)) { run = false; break; }
          console.log(`Unexpected ACCEPT at ${cursor}`);
          console.log(stack);
          return false;
        default: console.log(`DEFAULT ${token.label}`); console.log(chart[tokenLabel]); return false;
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
