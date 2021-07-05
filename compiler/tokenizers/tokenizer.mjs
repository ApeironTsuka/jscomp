export class Tokenizer {
  constructor() { this.working = false; }
  init(K) { this._gen = this.parse(); this.K = K; this.working = true; }
  *parse() {}
  next() { return this._gen.next().value; }
}
