const capitalAlpha         = 'ABCDEFGHIJKLMNOPQRSTUVXYZ';
const lowerCaseAlpha       = capitalAlpha.toLowerCase();
const alpha                = (capitalAlpha + lowerCaseAlpha).split('');
const numbers              = '0123456789';
const punctuation          = '.,(){}[]'.split('');
const operators            = '+-*/%?=&|<>!'.split('');
const special              = ['..'];
const keywords             = 'const let for if then else func true false'.split(' ');

const is_whitespace = ch  => { return ' \t\n'.indexOf(ch) > -1; }
const is_digit      = ch  => { return numbers.indexOf(ch) > -1; }
const is_punc       = ch  => { return punctuation.indexOf(ch) > -1; }
const is_alpha      = ch  => { return alpha.indexOf(ch) > -1; }
const is_op         = ch  => { return operators.indexOf(ch) > -1; }
const is_keyword    = str => { return keywords.indexOf(str) > -1; }
const is_special    = str => { return special.indexOf(str) > -1; }

class Tokenizer {
    constructor(text) {        
        this.str    = text.replaceAll('\r\n', '\n');
        this.pos    = 0;
        this.line   = 1;
        this.column = 1;
    }

    get head() {                                            // get character at read head position
        return this.peek();
    }

    get eof() {
        return this.pos >= this.str.length;
    }

    peek(ofs = 0) {                                         // peek character with optional offset
        return this.str[this.pos + ofs];
    }

    match(str) {
        return this.str.substring(this.pos, this.pos + str.length) == str;
    }

    consume(length = 1) {
        const str = this.str.substring(this.pos, this.pos + length);
        this.pos += length;
        this.column += length;
        if (str == '\n') {
            this.line++;
            this.column = 1;
        }
        return str;
    }

    consumeWhile(p) {                                                       // consumes characters while they match the given predicate function - returns the matched string
        let result = '';
        while (!this.eof && p(this.peek())) {            
            result += this.consume();
        }
        return result;
    }

    anyOf(list) {                                                           // check if any item in the given list is found at HEAD position
        return list.find(e => { if (this.match(e)) return e });
    }

    nextToken() {
        this.consumeWhile(is_whitespace);
        if (this.eof) return null;
        const ch = this.head;
        
        if (ch == '#') {                                                // comment
            this.consume();
            const value = this.consumeWhile(ch => ch != '\n');
            return { type:'comment', value };
        }

        if (ch == '\'') {                                               // string literal
            this.consume();
            const value = this.consumeWhile(ch => ch != '\'');
            this.consume();                                             // consume the terminating ' character
            return { type:'string', value };
        }
        
        if (is_digit(ch)) {                                             // digit     
            const value = this.consumeWhile(is_digit);
            return { type:'number', value };
        }

        if (is_alpha(ch)) {                                             // identifier OR keyword
            const value = this.consumeWhile(ch => { return is_alpha(ch) || is_digit(ch) });
            if (is_keyword(value)) return { type:'keyword', value }
            return { type:'identifier', value };
        }

        if (is_op(ch)) {                                                // operator
            const value = this.consume();            
            return { type:'operator', value };
        }                

        if (is_punc(ch)) {                                              // punctuation | special
            const spec = this.anyOf(special);
            if (spec) {
                this.consume(spec.length);                
                return { type:'special', value:spec };                 
            }
            const value = this.consume();
            return { type:'punctuation', value };
        }
                
        return { type:'error', value:`Cannot tokenize character "${ch}" at line ${this.line}, column ${this.column}` };
    }
}

export {
    Tokenizer
}