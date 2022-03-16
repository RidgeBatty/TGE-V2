/**
 * Highly experimental!
 * 
 * This is a possible replacement for JavaScript standard arrays used in TGE
 * The idea is to offer similar performance but more flexible and data-aware solution
 * 
 */
class ManagedArray {
    constructor(o) {
        this.array = new Array();
    }

    push(...items) {
        this.array.push(...items);
    }

    pop() {
        return this.array.pop();
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