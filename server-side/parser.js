import { Tokenizer } from "./tokenizer.js";

const precedence = {
    '='  : 1,
    '||' : 2,
    '&&' : 3,
    '<'  : 7, '>' : 7, '<=' : 7, '>=' : 7, '==' : 7, '!=' : 7,
    '+'  : 10, '-' : 10,
    '*'  : 20, '/' : 20, '%' : 20,
} 

class Parser {
    constructor(code, data) {
        this.code = code;
        this.data = data;
        this.tokens = [];
        this.pos    = 0;
    }    

    get eof() {
        return this.pos >= this.tokens.length;
    }

    peek() {
        return this.tokens[this.pos];
    }

    next() {
        this.pos++;
        if (this.eof) return null;
        return this.peek();
    }

    is_punc(ch) { 
        const t = this.peek();
        return t && t.type == 'punctuation' && (!ch || t.value == ch) && t;
    }

    is_op(op) {
        const t = this.peek();
        return t && t.type == 'operator' && (!op || t.value == op) && t;
    }

    is_keyword(kw) {
        const t = this.peek();
        return t && t.type == 'keyword' && (!kw || t.value == kw) && t;
    }

    skip_punc(ch) {
        if (this.is_punc(ch)) this.next();
            else throw 'Expecting punctuation symbol: ' + ch;
    }

    skip_keyword(kw) {
        if (this.is_keyword(kw)) this.next();
            else throw 'Expecting keyword: ' + kw;
    }

    delimited(left, right, sep, parser) {        
        let a = [], first = true;        
        this.skip_punc(left);    
        while (!this.eof) {
            if (this.is_punc(right)) break;
            if (first) first = false; else this.skip_punc(sep);
            if (this.is_punc(right)) break;
            a.push(parser.call(this));
        }
        this.skip_punc(right);
        return a;
    }

    maybeCall(expr) {
        expr = expr();
        return this.is_punc('(') ? parseCall(expr) : expr;
    }

    maybeBinary(left, precA) {
        const t = this.is_op();            
        if (t) {
            const precB = precedence[t.value];
            if (precB > precA) {                
                this.next();
                return this.maybeBinary({
                    type      : t.value == '=' ? 'assign' : 'binary',
                    operator  : t.value,
                    left,
                    right     : this.maybeBinary(this.parseAtom(), precB)
                }, precA);
            }
        }
        return left;
    }

    parseAtom() {        
        return this.maybeCall(() => {
            const p = this.peek();            

            console.log('ATOM:', p);

            if (p && p.type == 'comment') {
                this.next();
                return p;
            }
            if (this.is_punc('(')) {
                this.next();
                const exp = this.parseExpression();
                this.skip_punc(')');
                return exp;
            }

            // place unary operations here!

            if (this.is_punc('{')) return this.parseBlock();
            if (this.is_keyword('if')) return this.parseIf();            
            if (this.is_keyword('func')) {
                this.next();
                return this.parseFunction();
            }

            if (p.type == 'number' || p.type == 'string') {
                this.next();
                return p;
            }
                    
            throw `Unexpected token "${p.type}"`;
        });
    }

    parseBool() {
        return {
            type  : 'boolean',
            value : this.next().value == 'true'
        }
    }

    parseArgName() {
        const name = this.peek();
        if (name.type != 'identifier') throw 'Identifier expected';
        this.next();
        return name.value;
    }
     
    parseFunction() {
        return {
            type : 'function',
            args : this.delimited('(', ')', ',', this.parseArgName),
            body : this.parseExpression()
        }
    }

    parseIf() {
        this.skip_keyword('if');
        const condition = this.parseExpression();
        if (!this.is_punc('{')) this.skip_keyword('then');
        const then = this.parseExpression();
        const res  = {
            type : 'if',
            condition,
            then,
        }
        if (this.is_keyword('else')) {
            this.next();
            res.else = this.parseExpression();
        }
        return res;
    }
    
    parseExpression() {
        return this.maybeCall(() => {
            return this.maybeBinary(this.parseAtom(), 0);
        });
    }

    parseBlock() {
        const block = this.delimited('{', '}', '', this.parseExpression);
        if (block.length == 0) return { type:'boolean', value:false }
        if (block.length == 1) return block[0];
        return { type:'block', block }
    }

    parseProgram() {
        const p = [];
        while (!this.eof) {
            p.push(this.parseExpression());            
        }
        return { type: "program", program:p }
    }

    parse() {
        const t = new Tokenizer(this.code);
        const tokens = [];
        try {
            while (!t.eof) {
                const token = t.nextToken();
                if (token == null) { console.log('Done.'); break; }
                if (token.type == 'error') { throw token.value; }            
                tokens.push(token);            
            }        
            console.log(tokens);
        } catch (e) {
            console.log('Tokenizer failed to execute.');
            return
        }

        this.tokens = tokens;
        return this.parseProgram();
    }
}
    
export { Parser }