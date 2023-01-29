export class Heap {
    constructor(maxSize) {
        this.items     = [];
        for (let i = 0; i < maxSize; i++) this.items[i] = null;

        this._itemCount = 0;
    }

    get count() {
        return this._itemCount;
    }

    contains(item) {
        return this.items[item.index].data == item.data;
    }

    removeFirst() {
        const { items } = this;
        const firstItem = items[0];
        this._itemCount--;
        items[0] = items[this._itemCount];
        items[0].index = 0;
        this.sortDown(items[0]);
        return firstItem;
    }

    add(item) {        
        item.index = this._itemCount;
        this.items[this._itemCount] = item;
        this.sortUp(item);
        this._itemCount++;        
    }

    sortUp(item) {
        let parentIndex = ~~((item.index - 1) / 2);  
        while (true) {
            const parentItem = this.items[parentIndex];
            if (item.compareTo(parentItem) > 0) {
                this.swap(item, parentItem);
            } else {
                break;
            }
            parentIndex = ~~((item.index - 1) / 2);
        }
    }

    sortDown(item) {
        while (true) {
            const childIndexL = item.index * 2 + 1;
            const childIndexR = item.index * 2 + 2;
            let swapIndex = 0;
            
            if (childIndexL > this._itemCount) return;

            swapIndex = childIndexL;

            if (childIndexR < this._itemCount && this.items[childIndexL].compareTo(this.items[childIndexR]) < 0) swapIndex = childIndexR;
            if (item.compareTo(this.items[swapIndex]) >= 0) return;
            
            this.swap(item, this.items[swapIndex]);            
        }
    }
    
    updateItem(item) {
        this.sortUp(item);
    }

    swap(A, B) {
        this.items[A.index] = B;
        this.items[B.index] = A;
        const indexA = A.index;
        A.index = B.index;
        B.index = indexA;
    }
}

export class HeapItem {
    constructor(heap, data) {
        this._index = 0;
        this.heap   = heap;
        this.data   = data;
    }

    get index() {
        return this._index;
    }

    set index(v) {
        this._index = AE.clamp(v, 0, this.heap.count);
    }

    compareTo(item) {
        if (!item) return 1;
        return (item.data - this.data);
    }
}
