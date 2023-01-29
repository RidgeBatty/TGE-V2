import { Vector2 as Vec2, V2 } from './types.js';

const dirs = [V2(0, -1), V2(-1, -1), V2(-1, 0), V2(-1, 1), V2(1, 0), V2(1, 1), V2(0, 1), V2(1, -1)];

const heuristic = (node, target, D = 10, D2 = 14) => {
    const dx = Math.abs(node.v.x - target.v.x);
    const dy = Math.abs(node.v.y - target.v.y);
    return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy);
}

export class Node {
    constructor(p, v) {        
        this.p = p;
        this.v = v;
        this.G = 0;
        this.H = 0;        
    }

    get F() {
        return this.G + this.H;
    }

    update(start, end) {
        this.G = heuristic(this, start);
        this.H = heuristic(this, end);        
    }
}

export class Pathfinder {
    constructor(startVec, endVec) {
        this.open         = [];
        this.closed       = [];
        this.obstacles    = [];
        this.start        = new Node(null, startVec);
        this.end          = new Node(null, endVec);
        this.path         = [];
        this.updatePath   = false;
        this.complete     = false;                                       // is the path complete?
        this.lookups      = 0;
        this.hitObstacles = 0;                                           // number of obstacles we hit on the way (for bragging rights)

        this.end.update(this.end, this.start);        

        this.current     = this.start;
        this.open.push(this.start);
        this.updateList(this.open);
    }

    updateList(list) {
        for (let i of list) i.update(this.start, this.end);
    }

    add(parentNode, vec) {
        const n = new Node(parentNode, vec);
        n.update(this.start, this.end);
        return n;
    }

    addObstacles(list) {
        for (const v of list) {
            const n = this.add(null, v);
            this.obstacles.push(n);
        }
    }

    findFromList(list, v) {    
        return list.find(p => (p.v.x == v.x && p.v.y == v.y));
    }

    remove(list, node) {
        for (let i = list.length; i--;) if (list[i] == node) return list.splice(i, 1);
    }

    makePath(node) {
        this.path.length = 0;
        this.path.push(this.start.v);
        let n = node;
        while (n.p) {
            this.path.push(n.v);
            n = n.p;
        }    
    }

    reveal(position) {
        const node = this.findFromList(this.open, position);            
        if (this.updatePath) this.path.push(this.start.v);
        if (node) {
            this.checkSurroundings(node);            
            if (this.updatePath) this.makePath(node);                                       // if this.updatePath is true, update the path on every reveal
            return node;
        }
        return false;
    } 

    checkSurroundings(node) {
        for (let d of dirs) {
            const pos = node.v.clone().add(d);

            if (this.end.v.x == pos.x && this.end.v.y == pos.y) {
                this.end.p = node;
                this.current = this.end;
                this.closed.push(node);
                return;
            }

            const isObstacleList = this.findFromList(this.obstacles, pos);
            if (isObstacleList) {
                this.hitObstacles++;
                continue;
            }

            const isClosedList = this.findFromList(this.closed, pos);
            if (isClosedList) continue;

            const isOpenList = this.findFromList(this.open, pos);
            if (!isOpenList) {
                const n = this.add(node, pos);
                this.open.push(n);        
            }
        }

        this.lookups++;
        this.remove(this.open, node);
        this.closed.push(node);        
    }

    /**
     * Takes the next step towards finding the path
     */
    step() {
        if (this.current == this.end || this.open.length == 0) {    
            this.complete = true;        
            return { status:(this.current == this.end) ? 'completed' : 'not found', lookups:this.lookups, path:this.path }
        }
        if (this.open.length == 1) {
            this.reveal(this.open[0].v);                    
        } else {
            this.open.sort((a, b) => { if (a.F == b.F) return a.H - b.H; else return (a.F - b.F) });
            //this.open.sort((a, b) => (a.F - b.F));
            this.current = this.open[0];            
            this.reveal(this.open[0].v);            
        }                        
    }
}
