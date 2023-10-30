import util from "util";
import mocha from "mocha";

class MochaLog {
  private _logMsgs: string[] = [];
  private _beforeMsgs: string[] = [];
  private _afterMsgs: string[] = [];

  static injectLogger(suite: mocha.Suite) {
    suite.beforeEach(function () {
      this.mlog = new MochaLog();
    });
    suite.afterEach(function () {
      this.mlog._beforeMsgs.forEach((args) =>
        console.log("        \x1b[0;35m<<<\x1b[0;90m", args)
      );
      this.mlog._logMsgs.forEach((args) =>
        console.log("        \x1b[0;37m===\x1b[0;90m", args)
      );
      this.mlog._afterMsgs.forEach((args) =>
        console.log("        \x1b[0;36m>>>\x1b[0;90m", args)
      );
      console.log("");
      this.mlog._logMsgs.length = 0;
      this.mlog._beforeMsgs.length = 0;
      this.mlog._afterMsgs.length = 0;
    });
  }

  log(msg?: any, ...args: any[]) {
    this._logMsgs.push(util.formatWithOptions({ colors: true }, ...arguments));
  }

  before(msg?: any, ...args: any[]) {
    this._beforeMsgs.push(
      util.formatWithOptions({ colors: true }, ...arguments)
    );
  }

  after(msg?: any, ...args: any[]) {
    this._afterMsgs.push(
      util.formatWithOptions({ colors: true }, ...arguments)
    );
  }
}

declare module "mocha" {
  export interface Context {
    mlog: MochaLog;
  }
}

export default MochaLog;
