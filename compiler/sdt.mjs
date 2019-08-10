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
  load(obj, globals) {
    let bnf = this.bnf = new ProductionList(), gen = this.gen = new CLR(), list = [], p, regexes = { list: [], hash: {} };
    for (let i = 0, prods = obj.productions, l = prods.length; i < l; i++) {
      p = new Production(Token.copyOf(prods[i].left), [], (prods[i].func ? eval(`${globals}; ${prods[i].func}`) : undefined), []);
      p.virt = prods[i].virt;
      p.index = prods[i].index;
      list.push(p);
    }
    for (let i = 0, regs = obj.regexes, l = regs.length; i < l; i++) {
      let o = { label: regs[i].label, regex: eval(regs[i].regex) };
      regexes.list.push(o);
      regexes.hash[o.label] = o;
    }
    gen.bnf = bnf;
    gen.graph = { charts: obj.charts };
    bnf.list = list;
    bnf.regexes = regexes;
  }
  useCLR() {
    this.gen = new CLR();
    if (!this.gen.load(this.bnf)) { return false; }
    return true;
  }
  useLALR() {
    this.gen = new LALR();
    if (!this.gen.load(this.bnf)) { return false; }
    return true;
  }
  run(tokens, cb) {
    let { gen } = this, out;
    if (!gen) { if (!this.useCLR()) { return false; } gen = this.gen; }
    if (!gen.parse(tokens)) { return false; }
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
    recurse(out = { children: this.gen.tree });
    let axiom = this.bnf.find('axiom-real')[0];
    if (cb) { cb(this.gen.tree[0].value); }
    return true;
  }
  toJSON() {
    let productions = [], regexes = [], prods = this.bnf.list, regs = this.bnf.regexes.list;
    for (let i = 0, l = prods.length; i < l; i++) {
      let { left, func, virt, index } = prods[i];
      productions.push({ left, func: func?func.toString():undefined, virt, index });
    }
    for (let i = 0, l = regs.length; i < l; i++) {
      let { label, regex } = regs[i];
      regexes.push({ label, regex: regex.toString() });
    }
    return { productions, charts: this.gen.graph.charts, regexes };
  }
}
