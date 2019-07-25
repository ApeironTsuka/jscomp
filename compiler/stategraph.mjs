import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { State } from './state.mjs';
import { TERM, SHIFT, REDUCE, GOTO } from './consts.mjs';
export class StateGraph {
  build(jbnf) {
    let states = [], state = new State(), p, k, z;
    states.push(state);
    p = Production.copyOf(jbnf.find('axiom-real')[0]);
    p.lookaheads = [ new Token(TERM, '$') ];
    if (!state.build(jbnf, [ p ])) { console.log('Error in state 0'); return false; }
    for (let i = 0; i < states.length; i++) {
      z = {};
      for (let x = 0, prods = states[i].productions, xl = prods.length; x < xl; x++) {
        if (prods[x].cursor == prods[x].right.length) { continue; }
        k = prods[x].right[prods[x].cursor];
        if (!z[k.label]) { z[k.label] = { type: k.type, prods: [] }; }
        p = Production.copyOf(prods[x]);
        p.cursor++;
        z[k.label].prods.push(p);
      }
      for (let x = 0, keys = Object.keys(z), xl = keys.length; x < xl; x++) {
        state = new State();
        if (!state.build(jbnf, z[keys[x]].prods)) { console.log(`Error in state ${states.length} (above) Incomplete states below`); this.printGraph(states); return false; }
        p = StateGraph.findState(states, state);
        if (p == -1) { p = states.length; states.push(state); }
        if (states[i].state[keys[x]]) { console.log(`Error: s/${states[i].state[keys[x]].act==SHIFT?'s':'r'} conflict\nError in state ${i}, ${keys[x]} shifts to state ${p} but reduces to ${states[i].state[keys[x]].n}`); this.printGraph(states); return false; }
        process.stderr.write(`\rSolving state ${p+1} (${i})       `);
        states[i].state[keys[x]] = { act: z[keys[x]].type==TERM?SHIFT:GOTO, n: p };
      }
    }
    process.stderr.write('\n');
    this.states = states;
    let charts = this.charts = [], chart;
    for (let i = 0, l = states.length; i < l; i++) {
      charts[i] = chart = {};
      for (let x = 0, keys = Object.keys(states[i].state), xl = keys.length; x < xl; x++) {
        if (chart[keys[x]]) {
          console.log(`Error: ${chart[keys[x]].act} ${states[i].state[keys[x]].act}`);
          return false;
        }
        chart[keys[x]] = states[i].state[keys[x]];
      }
    }
    return true;
  }
  printGraph(s) {
    let states = s||this.states;
    if (!states) { return; }
    for (let i = 0, l = states.length; i < l; i++) { console.log(`I${i}\n${states[i]}\n`); }
  }
  printCharts() {
    let chart;
    let act = (a) => a==SHIFT?'shift':a==REDUCE?'reduce':a==GOTO?'goto':'accept';
    for (let i = 0, charts = this.charts, l = charts.length; i < l; i++) {
      chart = charts[i];
      console.log(`I${i}`);
      for (let x = 0, keys = Object.keys(charts[i]), xl = keys.length; x < xl; x++) { console.log(`${keys[x]}: ${act(chart[keys[x]].act)} ${chart[keys[x]].n}`); }
      console.log();
    }
  }
  printPrettyChart() {
    let chart, { charts } = this, cells = [], action = [], goto = [];
    let act = (a,n) => a==SHIFT?`s${n}`:a==REDUCE?`r${n}`:a==GOTO?n:'acpt';
    let addAction = (a) => { if (action.indexOf(a) == -1) { action.push(a); } };
    let addGoto = (a) => { if (goto.indexOf(a) == -1) { goto.push(a); } };
    for (let i = 0, l = charts.length; i < l; i++) {
      chart = charts[i];
      cells[i] = [];
      for (let x = 0, keys = Object.keys(chart), xl = keys.length; x < xl; x++) {
        switch (chart[keys[x]].act) {
          case GOTO: addGoto(keys[x]); break;
          default: addAction(keys[x]); break;
        }
      }
    }
    for (let i = 0, charts = this.charts, l = charts.length; i < l; i++) {
      chart = charts[i];
      cells[i] = [];
      for (let x = 0, keys = Object.keys(chart), xl = keys.length; x < xl; x++) {
        switch (chart[keys[x]].act) {
          case GOTO: cells[i][goto.indexOf(keys[x])+action.length] = act(chart[keys[x]].act, chart[keys[x]].n); break;
          default: cells[i][action.indexOf(keys[x])] = act(chart[keys[x]].act, chart[keys[x]].n); break;
        }
      }
    }
    let longestAction = (() => { let out = 0; for (let i = 0, l = action.length; i < l; i++) { if (action[i].length > out) { out = action[i].length; } } return out; })();
    if (longestAction < 4) { longestAction = 4; }
    else if (longestAction < this.charts.length.toString().length+1) { longestAction = this.charts.length.toString().length+1; }
    let longestGoto = (() => { let out = 0; for (let i = 0, l = goto.length; i < l; i++) { if (goto[i].length > out) { out = goto[i].length; } } return out; })();
    if (longestGoto < this.charts.length.toString().length) { longestGoto = this.charts.length.toString().length; }
    let sizeLen = this.charts.length.toString().length, s = '';
    let actionWidth = action.length*(longestAction+1)+sizeLen, gotoWidth = goto.length*(longestGoto+1);
    s = ' '.repeat(sizeLen);
    for (let i = 0, l = action.length; i < l; i++) { s += ' '.repeat(longestAction+1-action[i].length)+action[i]; }
    s += ' |';
    for (let i = 0, l = goto.length; i < l; i++) { s += ' '.repeat(longestGoto+1-goto[i].length)+goto[i]; }
    console.log(s);
    for (let i = 0, l = cells.length; i < l; i++) {
      s = ' '.repeat(sizeLen-i.toString().length)+i;
      for (let x = 0, cell = cells[i], xl = action.length+goto.length; x < xl; x++) {
        if (typeof cell[x] == 'undefined') { cell[x] = ''; } else { cell[x] = cell[x].toString(); }
        if (x >= action.length) { s += ' '.repeat(longestGoto+1-cell[x].length)+cell[x]; }
        else { s += ' '.repeat(longestAction+1-cell[x].length)+cell[x]; }
        if (x+1 == action.length) { s += ' |'; }
      }
      console.log(s.replace(/ *$/g, ''));
    }
  }
  print() { this.printGraph(); this.printPrettyChart(); }
  static findState(states, state) { for (let i = 0, l = states.length; i < l; i++) { if (states[i].compare(state)) { return i; } } return -1; }
}
