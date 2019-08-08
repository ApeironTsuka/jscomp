import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { ProductionList } from './productionlist.mjs';
import { CLR } from './clr.mjs';
import { LALR } from './lalr.mjs';
import { NONTERM } from './consts.mjs';
export class SDT {
  create(jbnf, predef) {
    let bnf = this.bnf = new ProductionList();
    bnf.build(jbnf);
    if (predef) {
      let pd = this.predef = new ProductionList();
      pd.build(predef);
      for (let i = 0, list = pd.list, l = list.length; i < l; i++) { list[i].index = bnf.list.length; bnf.list.push(list[i]); }
      for (let i = 0, list = pd.regexes.list, l = list.length; i < l; i++) { bnf.regexes.list.push(list[i]); bnf.regexes.hash[list[i].label] = list[i]; }
    }
    console.log(bnf.toString());
    bnf.genFirstOf();
    bnf.printFirstOf();
    bnf.genFollowOf();
    bnf.printFollowOf();
  }
  load(obj) {
    let bnf = this.bnf = new ProductionList(), clr = this.clr = new CLR(), list = [], p, regexes = { list: [], hash: {} };
    for (let i = 0, prods = obj.productions, l = prods.length; i < l; i++) {
      p = new Production(Token.copyOf(prods[i].left), Token.copyAll(prods[i].right), (prods[i].func ? eval(prods[i].func) : undefined), []);
      p.virt = prods[i].virt;
      p.index = prods[i].index;
      list.push(p);
    }
    for (let i = 0, regs = obj.regexes, l = regs.length; i < l; i++) {
      let o = { label: regs[i].label, regex: eval(regs[i].regex) };
      regexes.list.push(o);
      regexes.hash[o.label] = o;
    }
    clr.bnf = bnf;
    clr.graph = { charts: obj.charts };
    bnf.list = list;
    bnf.regexes = regexes;
  }
  useCLR() {
    this.clr = new CLR();
    if (!this.clr.load(this.bnf)) { return false; }
    return true;
  }
  useLALR() {
    this.clr = new LALR();
    if (!this.clr.load(this.bnf)) { return false; }
    return true;
  }
  run(tokens, cb) {
    let { clr } = this, out;
    if (!clr) { if (!this.useCLR()) { return false; } clr = this.clr; }
    if (!clr.parse(tokens)) { return false; }
    let callFunc = (func, left, right) => {
      if (!func) { return false; }
      return func(left, right);
    };
    let recurse = (p) => {
      let { bnf } = this, ind;
      for (let i = 0, list = p.children, l = list.length; i < l; i++) {
        if (list[i].type == NONTERM) { recurse(list[i]); }
        ind = list[i].index;
        if ((ind) && (bnf.list[ind].func)) { callFunc(bnf.list[ind].func, list[i], list[i].children); }
        else if (list[i].children.length == 1) { ((left, right) => { left.value = right[0].value; })(list[i], list[i].children); }
      }
    };
    recurse(out = { children: this.clr.tree });
    let axiom = this.bnf.find('axiom-real')[0];
    if (cb) { cb(this.clr.tree[0].value); }
    return true;
  }
  toJSON() {
    let productions = [], regexes = [], prods = this.bnf.list, regs = this.bnf.regexes.list;
    for (let i = 0, l = prods.length; i < l; i++) {
      let { left, right, func, virt, index } = prods[i];
      productions.push({ left, right, func: func?func.toString():undefined, virt, index });
    }
    for (let i = 0, l = regs.length; i < l; i++) {
      let { label, regex } = regs[i];
      regexes.push({ label, regex: regex.toString() });
    }
    return { productions, charts: this.clr.graph.charts, regexes };
  }
}
