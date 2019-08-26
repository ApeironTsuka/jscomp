import { Token } from './tokens/token.mjs';
import { Production } from './production.mjs';
import { State } from './state.mjs';
import { TERM, SHIFT, REDUCE, GOTO } from './consts.mjs';
export class StateGraph {
  build(jbnf) {
    let states = [], state = new State(), p, k, z;
    states.push(state);
    // use the "virtual" axiom-real production as the seed for the initial state
    // this way axiom can be defined as `<axiom> ::= {<something>}*` without causing issues
    p = Production.copyOf(jbnf.find('axiom-real')[0]);
    p.lookaheads = [ new Token(TERM, '$') ];
    // build the initial state...
    if (!state.build(jbnf, [ p ])) { console.log('Error in state 0'); return false; }
    // ... and then build+check more
    for (let i = 0; i < states.length; i++) {
      // this holds the productions from the current state that become the seeds for new states
      z = {};
      // loop over this state's productions looking for seed productions
      for (let x = 0, prods = states[i].productions, xl = prods.length; x < xl; x++) {
        // this production is a reduce, so skip it
        if (prods[x].cursor == prods[x].right.length) { continue; }
        k = prods[x].right[prods[x].cursor];
        if (!z[k.label]) { z[k.label] = { type: k.type, prods: [] }; }
        p = Production.copyOf(prods[x]);
        p.cursor++;
        z[k.label].prods.push(p);
      }
      // loop over the seeds and generate states from them, checkng for s/s and s/r conflicts
      // r/r conflicts are handled within state.build itself
      for (let x = 0, keys = Object.keys(z), xl = keys.length; x < xl; x++) {
        state = new State();
        if (!state.build(jbnf, z[keys[x]].prods)) { console.log(`Error in state ${states.length} (above) Incomplete states below`); this.printGraph(states); return false; }
        // check to see if this state already exists, and if not, add it to the list
        p = StateGraph.findState(states, state);
        if (p == -1) { p = states.length; states.push(state); }
        if (states[i].state[keys[x]]) { console.log(`Error: s/${states[i].state[keys[x]].act==SHIFT?'s':'r'} conflict\nError in state ${i}, ${keys[x]} shifts to state ${p} but reduces to ${states[i].state[keys[x]].n}`); this.printGraph(states); return false; }
        states[i].state[keys[x]] = { act: z[keys[x]].type==TERM?SHIFT:GOTO, n: p };
      }
    }
    process.stderr.write('\n');
    this.states = states;
    this.buildCharts();
    return true;
  }
  buildCharts() {
    let charts = this.charts = [], chart, { states } = this;
    // all states are created and valid, now generate the state transition table
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
  }
  // optimize states into minimum equiv (CLR -> LALR)
  optimize() {
    let links = {}, { states } = this, counter = 1, ind, stateCount = states.length;
    let has = (a, p) => { for (let i = 0, l = a.length; i < l; i++) { if (a[i].compare(p)) { return a[i]; } } return false; };
    // step 1: build the list of equiv states
    for (let A = 0, Al = states.length; A < Al; A++) {
      if (links[A]) { continue; }
      for (let B = 0, Bl = states.length; B < Bl; B++) {
        if (A == B) { continue; }
        if (links[B]) { continue; }
        if (states[A].compareLazy(states[B])) {
          if (!links[A]) { links[A] = counter++; }
          links[B] = links[A];
        }
      }
    }
    counter--;
    if (!counter) { console.log(`Unable to optimize`); return; }
    // extend the states
    for (let i = 0; i < counter; i++) { states.push(undefined); }
    // step 2: create/merge/redirect states/transitions
    for (let A = 0, Al = states.length-counter-1; A < Al; A++) {
      for (let i = 0, { state } = states[A], keys = Object.keys(state), l = keys.length; i < l; i++) {
        // redirect shift/goto to its new slot if it's pointing to one of the redundant states
        switch (state[keys[i]].act) {
          case SHIFT: case GOTO:
            if (links[state[keys[i]].n]) { state[keys[i]].n = Al+links[state[keys[i]].n]; }
            break;
          default: break;
        }
      }
      ind = Al+links[A];
      // create the new state if needed by just copying this one as its base and move on
      if (!states[ind]) { states[ind] = State.copyOf(states[A]); continue; }
      // otherwise, merge the lookaheads of each production in this state into the new one
      for (let i = 0, prodsA = states[A].productions, prodsB = states[ind].productions, l = prodsA.length; i < l; i++) {
        for (let k = 0, kA = prodsA[i].lookaheads, kB = prodsB[i].lookaheads, kl = kA.length; k < kl; k++) {
          if (!has(kB, kA[k])) {
            kB.push(kA[k]);
            if ((states[A].state[kA[k]]) && (!states[ind].state[kA[k]])) {
              // I know it's not the best way, but.. FIXME ?
              states[ind].state[kA[k]] = JSON.parse(JSON.stringify(states[A].state[kA[k]]));
            }
          }
        }
      }
    }
    // step 3: remove the redundant states entirely
    let x = 0;
    for (let A = states.length-1; A >= 0; A--) {
      // keep a counter of the empty sections to compensate for
      // reduces how often it needs to run back over the entire state list
      if (links[A]) { states.splice(A, 1); x++; }
      else {
        if (x == 0) { continue; }
        // remove the counter from every shift/goto when exiting an empty section
        for (let B = states.length-1; B >= 0; B--) {
          for (let i = 0, { state } = states[B], keys = Object.keys(state), l = keys.length; i < l; i++) {
            switch (state[keys[i]].act) {
              case SHIFT: case GOTO:
                if (state[keys[i]].n > A) { state[keys[i]].n -= x; }
                break;
              default: break;
            }
          }
        }
        // reset counter
        x = 0;
      }
    }
    console.log(`Optimized ${stateCount} states down to ${states.length} states`);
    this.buildCharts();
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
