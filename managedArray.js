/**
 * Highly experimental!
 * 
 * This is a possible replacement for JavaScript standard arrays used in TGE
 * The idea is to offer similar performance but more flexible and data-aware solution
 * 
 */
class ManagedArray {
    constructor(owner, itemClass, data) {
        this.owner     = owner;
        this.itemClass = itemClass;        
        this.array     = data ? [...data] : new Array();

        this.index     = (this.array.length > 0) ? 0 : -1;
    }

    next() {
        if (this.array.length == 0) return null;

        this.index++;
        if (this.index >= this.array.length) this.index = 0;        
        return this.array[this.index];
    }
    
    add(args) {
        const item = new this.itemClass(this, args);        
        this.array.push(item);
        return item;
    }

    push(...items) {
        this.array.push(...items);
    }

    pop() {
        return this.array.pop();
    }

    indexOf(a, b) {
        return this.array.indexOf(a, b);
    }

    deleteByName(name) {
        const a = this.array;
        for (let i = 0; i < a.length; i++) if (a[i].name == name) { a.splice(i, 1); return }
    }

    findByName(name) {
        const a = this.array;
        for (let i = 0; i < a.length; i++) if (a[i].name == name) return a[i];        
    }

    findIndexByName(name) {
        const a = this.array;
        for (let i = 0; i < a.length; i++) if (a[i].name == name) return i;        
        return -1;
    }

    findByField(field, value) {
        return this.array.filter(e => e[field] == value);		
    }

    insertBefore(name, item) {
        const index = this.findIndexByName(e => e.name == name);
		if (index > -1) this.array.splice(index, 0, item);	
    }

    insertAfter(name, item) {
        const index = this.findIndexByName(e => e.name == name);
		if (index > -1) this.array.splice(index + 1, 0, item);	
    }

    insertAt(index, item) {
        if (index > -1) this.array.splice(index, 0, item);	
    }    
}

export { ManagedArray }