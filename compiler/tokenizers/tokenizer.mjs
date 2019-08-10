export class Tokenizer {
  constructor() { this.working = false; }
  init() { this._gen = this.parse(); this.working = true; }
  *parse() {}
  next() { return this._gen.next().value; }
}
