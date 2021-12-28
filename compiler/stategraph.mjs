import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { State } from './state.mjs';
import { Tokens } from './tokens.mjs';
import { TERM, SHIFT, REDUCE, GOTO } from './consts.mjs';
import { Printer, Channels } from './printer.mjs';
function mergeState(s1, s2) { // merge s1 into s2
  for (let i = 0, prodsA = s1.productions, prodsB = s2.productions, l = prodsA.length; i < l; i++) {
    for (let k = 0, kA = prodsA[i].lookaheads, kB = prodsB[i].lookaheads, kl = kA.size; k < kl; k++) {
      if (kB.add(kA.list[k])) {
        let s = kA.list[k].toString();
        if ((s1.state.has(s)) && (!s2.state.has(s))) {
          // I know it's not the best way, but.. FIXME ?
          s2.state.set(s, JSON.parse(JSON.stringify(s1.state.get(s))));
        }
      }
    }
  }
}
export class StateGraph {
  build(jbnf, K = 1, optimize = false, allowConflicts = false) {
    let states = [], { findKLookaheads } = State, state = new State(K, allowConflicts), tokens = [], p, k, z, o;
    let addToken = (t) => { if (tokens.indexOf(t) == -1) { tokens.push(t); } };
    let getSeeds = (prods) => {
      let z = new Map();
      // loop over this state's productions looking for seed productions
      for (let x = 0, xl = prods.length; x < xl; x++) {
        let lbl, p2, kb, map = new Map();
        // this production is a reduce, so skip it
        if (prods[x].cursor == prods[x].right.length) { continue; }
        k = kb = prods[x].right[prods[x].cursor];
        p = Production.copyOf(prods[x]);
        findKLookaheads(jbnf, K, p, p);
        for (let k = 0, la = p.lookaheads.list, kl = la.length; k < kl; k++) {
          la[k].list.unshift(kb);
          la[k].list.pop();
          for (let z = 0, zl = la[k].list.length; z < zl; z++) { addToken(la[k].list[z].label); }
          lbl = la[k].toString();
          if (!map.has(lbl)) {
            if (!z.has(lbl)) { z.set(lbl, { type: kb.type, prods: [] }); }
            p2 = Production.copyOf(prods[x]);
            p2.cursor++;
            z.get(lbl).prods.push(p2);
            map.set(lbl, true);
          }
        }
      }
      return z;
    };
    let spawnStates = (i, z, recurse = false) => {
      let p;
      for (let [ zkey, zvalue ] of z.entries()) {
        state = new State(K, allowConflicts);
        if (!state.build(jbnf, zvalue.prods)) { Printer.log(Channels.NORMAL, `Error in state ${states.length} (above) Incomplete states below`); this.printGraph(states); return false; }
        // check to see if this state already exists, and if not, add it to the list
        p = StateGraph.findState(states, state);
        if ((p == -1) && (optimize)) {
          p = StateGraph.findStateLazy(states, state);
          if (p != -1) {
            if (!states[p].contains(state)) {
              mergeState(state, states[p]);
              if (!recurse) { Printer.log(Channels.DEBUG, `Marking state ${p} as dirty`); states[p].dirty = true; }
              else {
                // for each shift in states[p], recursively rebuild that state. This spreads the lookahead changes to any already-existing state
                for (let n of states[p].state.values()) {
                  if (!(n instanceof Array)) { n = [ n ]; }
                  for (let ii = 0, l = n.length; ii < l; ii++) {
                    if (n[ii].act != SHIFT) { continue; }
                    if (p == i) { continue; }
                    Printer.log(Channels.DEBUG, `Respawning state ${p} (from ${i})`, (states[p].dirty ? '(it was dirty)' : ''));
                    spawnStates(p, getSeeds(states[p].productions), true);
                    if (states[p].dirty) { delete states[p].dirty; }
                  }
                }
              }
            }
          }
        }
        if (p == -1) { p = states.length; states.push(state); }
        o = { act: zvalue.type == TERM ? SHIFT : GOTO, n: p };
        if (states[i].state.has(zkey)) {
          let s = states[i].state.get(zkey);
          if (allowConflicts) {
            if (s instanceof Array) {
              let keep = true;
              for (let kz = 0, kzl = s.length; kz < kzl; kz++) {
                if ((s[kz].act == SHIFT) && (s[kz].n == p)) { keep = false; }
                else if ((s[kz].act == o.act) && (s[kz].act == p)) { keep = false; }
              }
              if (keep) { s.push(o); }
            }
            else if ((s.act == o.act) && (s.n == p)) { s = o; }
            else if ((s.act != SHIFT) || (s.n != p)) { s = [ s, o ]; }
            o = s;
          } else {
            if ((s.act == SHIFT) && (s.n != p)) {
              Printer.log(Channels.NORMAL, `Error: s/${states[i].state.get(zkey).act == SHIFT ? 's' : 'r'} conflict\nError in state ${i}, ${keys[x]} shifts to state ${p} but reduces to ${states[i].state.get(zkey).n}`);
              this.printGraph(states);
              return false;
            }
          }
        }
        states[i].state.set(zkey, o);
      }
    };
    states.push(state);
    // use the "virtual" axiom-real production as the seed for the initial state
    // this way axiom can be defined as `<axiom> ::= {<something>}*` without causing issues
    p = Production.copyOf(jbnf.find('axiom-real')[0]);
    p.lookaheads.add(Tokens.copyOf([ new Token(TERM, '$') ]));
    while (p.lookaheads.list[0].list.length < K) { p.lookaheads.list[0].list.push(new Token(TERM, '$')); }
    // build the initial state...
    if (!state.build(jbnf, [ p ])) { Printer.log(Channels.NORMAL, 'Error in state 0'); return false; }
    // ... and then build+check more
    for (let i = 0; i < states.length; i++) {
      // this holds the productions from the current state that become the seeds for new states
      z = getSeeds(states[i].productions);
      // loop over the seeds and generate states from them, checking for s/r conflicts
      // r/r conflicts are handled within state.build itself
      spawnStates(i, z);
    }
    if (optimize) {
      let dirty = 0;
      //while (true) {
      for (let i = 0; i < states.length; i++) {
        if (!states[i].dirty) { continue; }
        Printer.log(Channels.DEBUG, `Optimizing state ${i}`);
        delete states[i].dirty;
        z = getSeeds(states[i].productions);
        spawnStates(i, z, true);
        dirty++;
      }
      //if (dirty == 0) { break; }
      //}
    }
    this.states = states;
    this.tokens = tokens;
    this.buildCharts(allowConflicts);
    return true;
  }
  buildCharts(allowConflicts = false) {
    let charts = this.charts = [], chart, { states } = this;
    // all states are created and valid, now generate the state transition table
    for (let i = 0, l = states.length; i < l; i++) {
      charts[i] = chart = new Map();
      for (let [ statekey, statev ] of states[i].state.entries()) {
        let o = statev;
        if (chart.has(statekey)) {
          let chartv = chart.get(statekey);
          if (allowConflicts) {
            if (chartv instanceof Array) { o = chartv; o.push(statev); }
            else { o = [ chartv, statev ]; }
          } else {
            Printer.log(Channels.NORMAL, `Error: ${chartv.act} ${statev.act}`);
            return false;
          }
        }
        chart.set(statekey, o);
      }
    }
  }
  printGraph(s) {
    let states = s || this.states;
    if (!states) { return; }
    if (Printer.channel > Channels.VERBOSE) { return; }
    for (let i = 0, l = states.length; i < l; i++) { Printer.log(Channels.VERBOSE, `I${i}\n${states[i]}\n`); }
  }
  printCharts() {
    let act = (a) => a == SHIFT ? 'shift' : a == REDUCE ? 'reduce' : a == GOTO ? 'goto' : 'accept';
    if (Printer.channel > Channels.VERBOSE) { return; }
    for (let i = 0, charts = this.charts, l = charts.length; i < l; i++) {
      Printer.log(Channels.VERBOSE, `I${i}`);
      for (let [ chkey, ca ] of charts[i].entries()) {
        let out = `${chkey}: `;
        if (!(ca instanceof Array)) { ca = [ ca ]; }
        for (let c = 0, cl = ca.length; c < cl; c++) {
          let ch = ca[c];
          out += `${c == 0 ? '' : '; '}${act(ch.act)} ${ch.n}`;
        }
        Printer.log(Channels.VERBOSE, out);
      }
      Printer.log(Channels.VERBOSE, '');
    }
  }
  printPrettyChart() {
    let { charts } = this, cells = [], action = [], goto = [];
    let act = (a,n) => a == SHIFT ? `s${n}` : a == REDUCE ? `r${n}` : a == GOTO ? n : 'acpt';
    let addAction = (a) => { if (action.indexOf(a) == -1) { action.push(a); } };
    let addGoto = (a) => { if (goto.indexOf(a) == -1) { goto.push(a); } };
    if (Printer.channel > Channels.VERBOSE) { return; }
    for (let i = 0, l = charts.length; i < l; i++) {
      for (let [ chkey, ca ] of charts[i].entries()) {
        if (!(ca instanceof Array)) { ca = [ ca ]; }
        for (let c = 0, cl = ca.length; c < cl; c++) {
          let ch = ca[c];
          switch (ch.act) {
            case GOTO: addGoto(chkey); break;
            default: addAction(chkey); break;
          }
        }
      }
    }
    for (let i = 0, charts = this.charts, l = charts.length; i < l; i++) {
      cells[i] = [];
      for (let [ chkey, ca ] of charts[i].entries()) {
        if (!(ca instanceof Array)) { ca = [ ca ]; }
        for (let c = 0, cl = ca.length; c < cl; c++) {
          let ch = ca[c];
          switch (ch.act) {
            case GOTO: cells[i][goto.indexOf(keys[x]) + action.length] = act(ch.act, ch.n); break;
            default:
              {
                let cell = cells[i][action.indexOf(chkey)];
                if (!cell) { cell = act(ch.act, ch.n); }
                else { cell += ',' + act(ch.act, ch.n); }
                cells[i][action.indexOf(chkey)] = cell;
              }
              break;
          }
        }
      }
    }
    let longestAction = (() => { let out = 0; for (let i = 0, l = action.length; i < l; i++) { if (action[i].length > out) { out = action[i].length; } } return out; })();
    if (longestAction < 4) { longestAction = 4; }
    else if (longestAction < this.charts.length.toString().length + 1) { longestAction = this.charts.length.toString().length+1; }
    let widestCell = (() => { let out = 0; for (let i = 0, l = cells.length; i < l; i++) { for (let x = 0, c = cells[i], xl = c.length; x < xl; x++) { if (!c[x]) { continue; } if (c[x].length > out) { out = c[x].length; } } } return out; })();
    if (widestCell > longestAction) { longestAction = widestCell; }
    let longestGoto = (() => { let out = 0; for (let i = 0, l = goto.length; i < l; i++) { if (goto[i].length > out) { out = goto[i].length; } } return out; })();
    if (longestGoto < this.charts.length.toString().length) { longestGoto = this.charts.length.toString().length; }
    let sizeLen = this.charts.length.toString().length, s = '';
    let actionWidth = action.length * (longestAction + 1) + sizeLen, gotoWidth = goto.length * (longestGoto + 1);
    s = ' '.repeat(sizeLen);
    for (let i = 0, l = action.length; i < l; i++) { s += ' '.repeat(longestAction + 1 - action[i].length) + action[i]; }
    s += ' |';
    for (let i = 0, l = goto.length; i < l; i++) { s += ' '.repeat(longestGoto + 1 - goto[i].length) + goto[i]; }
    Printer.log(Channels.VERBOSE, s);
    for (let i = 0, l = cells.length; i < l; i++) {
      s = ' '.repeat(sizeLen - i.toString().length) + i;
      for (let x = 0, cell = cells[i], xl = action.length+goto.length; x < xl; x++) {
        if (typeof cell[x] == 'undefined') { cell[x] = ''; } else { cell[x] = cell[x].toString(); }
        if (x >= action.length) { s += ' '.repeat(longestGoto + 1 - cell[x].length) + cell[x]; }
        else { s += ' '.repeat(longestAction + 1 - cell[x].length) + cell[x]; }
        if (x+1 == action.length) { s += ' |'; }
      }
      Printer.log(Channels.VERBOSE, s.replace(/ *$/g, ''));
    }
  }
  print() { this.printGraph(); this.printCharts(); }
  static findState(states, state) { for (let i = 0, l = states.length; i < l; i++) { if (states[i].compare(state)) { return i; } } return -1; }
  static findStateLazy(states, state) { for (let i = 0, l = states.length; i < l; i++) { if (states[i].compareLazy(state)) { return i; } } return -1; }
}
