import * as Types from "./types.js";

const { Vector2 : Vec2, V2, Color, Rect, RECT } = Types;

export class Shape {
    constructor(position) {
        this._position = position;        
    }

    get position() {
        return Vec2.Sub(this._position, Vec2.Add(this.owner.position, this.owner.offset));
    }

    set position(v) {
        this._position = v;
    }
    
    draw() {

    }

    isPointInside(p) {
        return RECT(this.position.x, this.position.y, this.size.x, this.size.y).isPointInside(p);
    }
}
export class Circle extends Shape {
    constructor(position, radius = 0) {
        super(position);
        this.radius = radius;
        this.type   = 1;
    }

    get size() {
        return V2(this.radius * 2, this.radius * 2);
    }

    isPointInside(p) {		
		return this.radius > Math.sqrt((p.x - this.position.x) ** 2 + (p.y - this.position.y) ** 2);
	}
}
export class Ellipse extends Shape {
    constructor(position, width = 0, height = 0) {
        super(position);
        this.origin = V2(0.5, 0.5);                                                                 // set to 0.5, 0.5 to expand the ellipse from the center OR set to 0, 0 to expand the ellipse from top left corner
        this.width  = width;
        this.height = height;        
        this.type   = 2;
    }

    set size(v) {
        this.width  = v.x;
        this.height = v.y;
    }

    get rect() {
        const wm = this.width;
        const hm = this.height;

        const shift = this.origin.clone().mulScalar(2).mul(V2(wm, hm));

        return RECT(this.position.x - shift.x, 
                    this.position.y - shift.y, 
                    wm + shift.x, 
                    hm + shift.y);        
    }

    isPointInside(p) {
        return this.rect.isPointInside(p);
    }
}
export class Rectangle extends Shape {
    constructor(position, width = 0, height = 0) {
        super(position);
        this.width  = width;
        this.height = height;
        this.type   = 3;
    }

    set size(v) {
        this.width  = v.x;
        this.height = v.y;
    }

    get rect() {
        return RECT(this.position.x, this.position.y, this.width, this.height);
    }

    get projectedPoints() {
        return [this.position.x, this.position.y, this.position.x + this.width, this.position.y + this.height];
    }

    get points() {
        return [this._position.x, this._position.y, this._position.x + this.width, this._position.y + this.height];
    }

    isPointInside(p) {
        return this.rect.isPointInside(p);
    }
}
export class Polygon extends Shape {
    constructor(position, points = []) {
        super(position);
        this.points = points;        
        this.type   = 4;
    }

    get size() {
        let minX = infinity, minY = infinity, maxX = -infinity, maxY = -infinity;        
        for (const p of this.points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        return V2(maxX - minX, maxY - minY);
    }

    get projectedPoints() {
        let result = [this.position];
        for (const p of this.points) result.push(Vec2.Sub(p, Vec2.Add(this.owner.position, this.owner.offset)));
        return result;
    }

    /**
     * Array of all points in shape space as a flat array
     */     
    get pointsFlatArray() {
        let result = [this._position.x, this._position.y];
        for (const p of this.points) result.push(p.x, p.y);
        return result;
    }

    isPointInside(p) {	
		const vs  = this.projectedPoints;
		
		var inside = false;		
		for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
			var xi = vs[i].x, yi = vs[i].y;
			var xj = vs[j].x, yj = vs[j].y;

			var intersect = ((yi > p.y) != (yj > p.y))
				&& (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
			if (intersect) inside = !inside;
		}
		
		return inside;		
	}
}

export class CustomShape extends Shape {
    constructor(position) {
        super(position);
        this.type   = 0;
    }
}

export class ShapeContainer {
    constructor(owner, surface) {
        this.owner   = owner;
        this.surface = surface;
        
        this.shapes  = [];
        this.defaultStyles = {
            Circle    : { stroke:'green',  fill:'rgba(0,255,0,0.3)' },
            Ellipse   : { stroke:'teal',   fill:'rgba(0,255,255,0.3)' },
            Rectangle : { stroke:'red',    fill:'rgba(255,0,0,0.3)' },
            Polygon   : { stroke:'yellow', fill:'rgba(255,255,0,0.3)' }
        }        
        this.styles  = [];
        this.active  = [];
    }

    indexOf(s) {
        return this.shapes.indexOf(s);
    }

    styleOf(s) {
        const i = this.shapes.indexOf(s);
        if (i == -1) return null;
        return this.styles[i];
    }

    add(s) {
        this.shapes.push(s);
        s.owner    = this.owner;
        
        const styles = Object.values(this.defaultStyles);
        this.styles.push({ 
            default: Object.assign({}, styles[s.type - 1]),
            active: Object.assign({ stroke:'white', fill:'rgba(255,255,255,0.5)'}) 
        });
    }

    delete(shape) {
        for (let i = this.shapes.length; i--;) if (this.shapes[i] == shape) this.shapes.splice(i, 1);
    }

    update() {
        const s = this.surface;
        let i = 0;
        for (const sh of this.shapes) { 
            const style = sh.hitTest ? this.styles[i].active : this.styles[i].default;
            if (sh.type == 0) sh.draw();
            if (sh.type == 1) s.drawCircle(sh.position, sh.radius, style);
            if (sh.type == 2) s.drawEllipse(sh.rect,               style);    
            if (sh.type == 3) s.drawRect(sh.rect,                  style);    
            if (sh.type == 4) s.drawPoly(sh.projectedPoints, style);            
            i++;
        }             
    }

    hitTest(p) {
        const hits = [];
        for (const s of this.shapes) { 
            if (s.isPointInside(p)) { 
                s.hitTest = true;
                hits.push(s);                
            } else s.hitTest = false;
        }
        this.active = hits;
        return hits;
    }

    /**
     * Stringifies shapes in TGE Collider format. All coordinates are in shape space.
     */
    stringify() {
        const list = [];
        const oVec = (v) => { return { x:v.x, y:v.y }};

        for (const shape of this.shapes) {
            let o = {};

            o.type = 'none circle ellipse box poly'.split(' ')[shape.type];
            if (shape.type == 1 || shape.type == 2) o.position = oVec(shape._position);                
            if (shape.type == 1) o.radius = shape.radius;                
            if (shape.type == 2) o.origin = oVec(shape.origin);       
            if (shape.type == 3) o.points = shape.points;              
            if (shape.type == 4) o.points = shape.pointsFlatArray;

            list.push(o);
        } 
        return JSON.stringify({ colliders:list }, null, 4)
    }
}