/**
 * Tree structure
 * Written by Ridge Batty (c) 2021-2022
 * License: https://creativecommons.org/licenses/by/4.0/
 */
let id = 0;

class TreeNode {
    constructor(value) {        
        this.value    = value;
        this.children = [];   
        this.parent   = null;        
        this.level    = 0;     
        this.root     = null;         
    }

    get length() {
        return this.children.length;
    }

    addChild(v) {
        const ch = new TreeNode(v);
        if (this.root && this.root.flags && this.root.flags.useIds) ch.id = id++;
        Object.seal(ch);

        this.children.push(ch);
        ch.parent = this;     
        ch.level  = this.level + 1;
        if ('root' in this) ch.root = this.root;
        return ch;
    }

    async findByField(f, v) {
        return new Promise((resolve, reject) => {
            function search(a) {
                console.log('Finding');
                if (f in a && a[f] == v) resolve(v);
                for (const ch of a.children) search(v)
            }
            search(this);
        });
    }
    
    flatten() {
        const a = [];
        function go(n) {
            a.push(n);            
            for (const i of n.children) go(i);
        }
        go(this);
        return a;
    }

    walk(callback, onlyImmediateChildren) {
        function go(n) {
            callback(n);            
            for (const i of n.children) go(i);
        }
        if (onlyImmediateChildren) {
            callback(n);            
            for (const i of n.children) callback(i);
            return;
        }
        go(this);
    }

    get depth() {
        let depth = 0, start = this.level;
        function go(n) {
            if (n.level - start > depth) depth = n.level - start;
            for (const i of n.children) go(i);
        }
        go(this);        
        return depth;
    }

    orderByLevel() {
        const levels = {};
        this.walk(i => { (levels[i.level] == null) ? levels[i.level] = [i] : levels[i.level].push(i); });        
        return levels;
    }

    leaves() {
        const a = [];
        this.walk(i => { if (i.children.length == 0) a.push(i); });        
        return a;
    }

    get previousSibling() {
        let p = this.parent;
        if (p) {           
            let index = p.children.findIndex(e => e == this);
            if (index > 0) return p.children[index - 1];
        }
    }

    get nextSibling() {
        let p = this.parent;
        if (p) {           
            let index = p.children.findIndex(e => e == this);
            if (index > -1 && index < p.children.length - 1) return p.children[index + 1];
        }
    }

    get lastChild() {
        return this.children[this.children.length - 1];
    }

    get path() {
        let p = this;
        const result = [];
        while (p) {
            result.push(p);
            p = p.parent;
        }
        return result.reverse();
    }
}

class Tree extends TreeNode {
    constructor(value, flags= { useIds : false }) {
        super(value);        
        this.root  = this;
        this.flags = flags;        
        if (flags && flags.useIds) this.id = id++;

        Object.seal(this);
    }
}

export { TreeNode, Tree }