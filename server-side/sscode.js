import { Parser } from "./parser.js";

class SSCode {
    constructor(code, data) {
        Object.assign(this, code, data);
    }

    loadFromFile(url) {
        return new Promise(async resolve => {
            this.code = await fetch(url).then(t => t.text());
            resolve(this.code);
        });
    }

    run() {
        const p   = new Parser(this.code, this.data);
        const ast = p.parse();
        console.log(ast);
    }
}

export { SSCode }