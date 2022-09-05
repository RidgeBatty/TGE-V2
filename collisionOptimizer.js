import { Rect, Vector2 } from './types.js';

const V2 = (x, y) => new Vector2(x, y);
const MaxItems = 10;
const MaxDepth = 5;

class Quadtree {
    constructor(level, bounds) {    
        this.level  = level;
        this.bounds = bounds;
        this.items  = [];
        this.nodes  = [];
    }

    clear() {
        this.items.length = 0;
        for (i = 0; i < this.nodes.length; i++) {             
            n[i].clear(); 
            n[i] = null; 
        }
    }

    split() {
        const width  = this.bounds.width / 2;
        const height = this.bounds.height / 2;
        const x      = Math.floor(this.bounds.left);
        const y      = Math.floor(this.bounds.top);

        this.nodes[0] = new Quadtree(this.level + 1, Rect.FromStruct({ left: x + width, top:y, width, height }));
        this.nodes[1] = new Quadtree(this.level + 1, Rect.FromStruct({ left: x,         top:y, width, height }));
        this.nodes[2] = new Quadtree(this.level + 1, Rect.FromStruct({ left: x,         top:y + height, width, height }));
        this.nodes[3] = new Quadtree(this.level + 1, Rect.FromStruct({ left: x + width, top:y + height, width, height }));
    }

    getIndex(item) {
        let index = -1;

        const r       = item.rect;
        const b       = this.bounds;
        const center  = b.center;

        const top     = (r.top < center.y) && (r.bottom < center.y);
        const bottom  = (r.top > center.y);

        if ((r.left < center.x) && (r.right < center.x)) {              // fits inside left quadrants
            if (top) index = 1;
                else if (bottom) index = 2;
        } else
        if ((r.left > center.x)) {                                      // fits inside right quadrants
            if (top) index = 0;
                else if (bottom) index = 3;
        }

        return index;
    }

    insert(item) {
        if (this.nodes[0] != null) {
            const index = this.getIndex(item);
            if (index != -1) this.nodes[index].insert(item);
        }
        this.items.push(item);

        if (this.items.length > MaxItems && this.level < MaxDepth) {
            if (this.nodes[0] == null) this.split();
            let i = 0;
            while (i < this.items.length) {
                let index = this.getIndex(this.items[i]);                
                if (index != -1) {
                    this.nodes[index].insert(this.items.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }
}

class CollisionOptimizer {
    constructor(engine) {
        engine.collisionOptimizer = this;

        this.actors    = engine.gameLoop.actors;
        this.screen    = engine.dims;        
        this.tree      = new Quadtree(0, new Rect(0, 0, this.screen.x, this.screen.y));
    }

    tick() {        
        for (const a of this.actors) {
            if ('colliders' in a) for (const c of a.colliders.objects) {                
                this.tree.insert({ shape:c, rect:new Rect(c.extent.minX, c.extent.minY, c.extent.maxX, c.extent.maxY) });
            }
        }
    }
}

export { Quadtree, CollisionOptimizer }