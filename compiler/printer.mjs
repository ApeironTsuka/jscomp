export const Channels = { DEBUG: 0, VVERBOSE: 1, VERBOSE: 2, NORMAL: 3, SILENT: 4 };
export class Printer {
  static channel = Channels.SILENT;
  static log(chan, ...args) { if (chan >= Printer.channel) { console.log(...args); } }
}
