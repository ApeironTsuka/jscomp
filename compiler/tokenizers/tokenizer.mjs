let eachline, ready = false;
async function initLibs() {
  if (ready) { return; }
  if (typeof window === 'undefined') { eachline = (await import('eachline')).default; }
  else { eachline = false; }
  ready = true;
}
class Reader {
  #gen = null;
  constructor(stream, withnl = false) { this.stream = stream; this.withnl = withnl; }
  async init() { await initLibs(); this.#gen = this.#reader(); }
  async *#reader() {
    let { stream, withnl } = this;
    if ((typeof stream === 'string') || (stream instanceof String)) {
      let lines = stream.split('\n');
      for (let i = 0, l = lines.length; i < l; i++) { yield withnl ? `${lines[i]}\n` : lines[i]; }
      return false;
    }
    if (eachline === false) { throw new Error('Only strings are supported in Reader outside of NodeJS'); }
    let lines = [], r, fin = false, prom = new Promise((res) => { r = res; });
    let el = eachline(stream, (l) => { lines.push(l); r(); });
    el.on('finish', () => { fin = true; });
    while (!fin) {
      await prom;
      for (let i = 0, l = lines.length; i < l; i++) { yield withnl ? `${lines[i]}\n` : lines[i]; }
      lines.length = 0;
      prom = new Promise((res) => { r = res; });
    }
  }
  async read() { let { value, done } = await this.#gen.next(); if (done) { return false; } return value; }
}
export class Tokenizer {
  constructor(stream, withnl = false) {
    this.working = false;
    this.reader = new Reader(stream, withnl);
  }
  async init(K) {
    let { reader } = this;
    await reader.init();
    this._gen = this.parse();
    this.K = K;
    this.working = true;
  }
  async *parse() {}
  async next() { return (await this._gen.next()).value; }
}
