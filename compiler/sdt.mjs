import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { ProductionList } from './productionlist.mjs';
import { CLR } from './clr.mjs';
import { LALR } from './lalr.mjs';
import { NONTERM } from './consts.mjs';
export class SDT {
  create(jbnf, predef = undefined, K = 1) {
    let bnf = this.bnf = new ProductionList();
    this.K = K;
    bnf.build(jbnf);
    if (predef) {
      let pd = this.predef = new ProductionList();
      pd.build(predef, true);
      for (let i = 0, list = pd.list, l = list.length; i < l; i++) { list[i].index = bnf.list.length; bnf.list.push(list[i]); }
      for (let i = 0, list = pd.regexes.list, l = list.length; i < l; i++) { bnf.regexes.list.push(list[i]); bnf.regexes.hash[list[i].label] = list[i]; }
    }
    console.log(bnf.toString());
    bnf.genFirstOf(K);
    bnf.printFirstOf();
    bnf.genFollowOf(K);
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
    this.gen = new CLR(this.K);
    if (!this.gen.load(this.bnf)) { return false; }
    return true;
  }
  useLALR() {
    this.gen = new LALR(this.K);
    if (!this.gen.load(this.bnf)) { return false; }
    return true;
  }
  run(tokens, cb, err) {
    let { gen } = this, out, ret;
    if (!gen) { if (!this.useCLR()) { return cb ? false : Promise.reject(new Error('Failed to generate')); } gen = this.gen; }
    if (!gen.parse(tokens)) { return cb ? false : Promise.reject(new Error('Failed to parse')); }
    let callFunc = (func, left, right) => {
      if (!func) { return false; }
      return func(left, right);
    };
    let recurse = (p) => {
      let { bnf } = this, ind;
      for (let i = 0, list = p.children, l = list.length; i < l; i++) {
        if (list[i].type == NONTERM) { if (recurse(list[i]) === false) { return false; } }
        ind = list[i].index;
        if ((ind) && (bnf.list[ind].func)) {
          if (callFunc(bnf.list[ind].func, list[i], list[i].children) === false) {
            if (err) { err(list[i]); return false; }
            else if (!cb) { ret = Promise.reject(list[i]); return false; }
          }
        }
        else if (list[i].children.length == 1) { ((left, right) => { left.value = right[0].value; })(list[i], list[i].children); }
      }
    };
    if (recurse(out = { children: this.gen.tree }) === false) { return (ret ? ret : false); }
    let axiom = this.bnf.find('axiom-real')[0];
    if (cb) { cb(this.gen.tree[0].value); return true; }
    else { return Promise.resolve(this.gen.tree[0].value); }
  }
  toJSON() {
    let productions = [], regexes = [], prods = this.bnf.list, regs = this.bnf.regexes.list;
    for (let i = 0, l = prods.length; i < l; i++) {
      let { left, func, virt, index } = prods[i];
      productions.push({ left, func: func ? func.toString() : undefined, virt, index });
    }
    for (let i = 0, l = regs.length; i < l; i++) {
      let { label, regex } = regs[i];
      regexes.push({ label, regex: regex.toString() });
    }
    return { productions, charts: this.gen.graph.charts, regexes };
  }
}
