/**
 * IntBuffer2D represents a rectangular memory buffer primarily designed for pixelart graphics. Pixels are assumed to be addressed using int's. 
 * No automatic rounding/smoothing is performed. 
 * IntBuffer2D includes a selection of simple pixel manipulation methods, like drawing lines and rectangles in the buffer.
 * The pixel information is stored in 32-bit unsigned integers. 
 * The buffer can be exported to a Texture.
 */

import { Texture } from "./texture.js";
import * as Types from "./types.js";

const { Vector2 : Vec2, V2, Color, Rect, RECT } = Types;

export class IntBuffer2D {
    /**
     * 
     * @param {Vector2|number} w Dimensions in Vector2 | Width 
     * @param {number=} h Height
     */
    constructor(w, h) {
        this.size   = Vec2.IsVector2(w) ? V2(w.x, w.y) : V2(w, h);
        this.buffer = new Uint32Array(this.size.x * this.size.y);                
    }

    get bounds() { return RECT(0,0,this.size.x,this.size.y) }
    get length() { return this.size.x * this.size.y; }

    setPixel(x, y, c) { if (!(x < 0 || y < 0 || x >= this.size.x || y >= this.size.y)) this.buffer[this.size.x * y + x] = c; }
    getPixel(x, y) { return this.buffer[y * this.size.x + x]; }

    fill(i) { this.buffer.fill(i); };

    walk(e) {
        for (let y = 0; y < this.size.y; y++)
            for (let x = 0; x < this.size.x; x++) e(x, y, this.getPixel(x, y));
    }

    rect(p1, p2, fillColor) {
        const w    = Math.abs(p1.x - p2.x) + 1;
        const h    = Math.abs(p1.y - p2.y) + 1;
        const p    = V2(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));        
        for (let y = p.y; y < p.y + h; y++) {
            for (let x = p.x; x < p.x + w; x++) if (x == p.x || y == p.y || x == (p.x + w - 1) || y == (p.y + h - 1)) this.setPixel(x, y, fillColor);
        }        
    }    

    fillRect(p1, p2, fillColor) {
        const w    = Math.abs(p1.x - p2.x) + 1;
        const h    = Math.abs(p1.y - p2.y) + 1;
        const p    = V2(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y));
        for (let y = p.y; y < p.y + h; y++)
            for (let x = p.x; x < p.x + w; x++) this.setPixel(x, y, fillColor);                      
    }
    
    /**
     * Stack based floofill algorithm. Relatively optimized compared to naive recursive solution.
     * @param {number} x Integer
     * @param {number} y Integer
     * @param {number} targetColor Integer
     * @param {number} fillColor Integer
     * @returns 
     */
    floodFill(x, y, targetColor, fillColor) {
        if (!this.bounds.isPointInside(V2(x, y))) return;           // check if the initial point is within image bounds
        
        const w     = this.size.x;
        const stack = [x + y * w];
        let leftEdge, rightEdge, idx, p;

        while (stack.length) {
            idx = stack.pop();

            this.buffer[idx] = fillColor;

            leftEdge  = (idx % w) == 0;          
            rightEdge = ((idx + 1) % w) == 0;

            if (!leftEdge)  { p = this.buffer[idx - 1]; if (p != fillColor && p == targetColor) stack.push(idx - 1); }
            if (!rightEdge) { p = this.buffer[idx + 1]; if (p != fillColor && p == targetColor) stack.push(idx + 1); }
            p = this.buffer[idx - w]; if (p != fillColor && p == targetColor) stack.push(idx - w);
            p = this.buffer[idx + w]; if (p != fillColor && p == targetColor) stack.push(idx + w);
        }
    }

    bresenhamLine(i1, i2, edges) {
        const coords = [];

        let p1 = Vec2.ToInt(i1); 
        let p2 = Vec2.ToInt(i2);
        
        if (!edges.isPointInside(p1)) return [];

        const dx = Math.abs(p2.x - p1.x);
        const dy = Math.abs(p2.y - p1.y);
        const sx = (p1.x < p2.x) ? 1 : -1;
        const sy = (p1.y < p2.y) ? 1 : -1;
        let err = dx - dy;
            
        while (!((p1.x == p2.x) && (p1.y == p2.y))) {
            const e2 = err << 1;
            if (e2 > -dy) {
                err  -= dy;
                p1.x += sx;
            }
            if (e2 < dx) {
                err  += dx;
                p1.y += sy;
            }                        

            if (edges.isPointInside(p1)) coords.push(p1.clone());
        }     
        
        return coords;
    }

    /**
     * Mirrors the whole buffer across x or y axis (naive, unoptimized)
     * @param {string} axis "x" or "y"
     */
    mirror(axis) {                                                      
        const r = [];
        const { size, buffer:pixels } = this;
        r.length = size.x * size.y;
        if (axis == 'x') for (let y = 0; y < size.y; y++) for (let x = 0; x < size.x; x++) r[y * size.x + (size.x - 1 - x)] = pixels[y * size.x + x];
        if (axis == 'y') for (let y = 0; y < size.y; y++) for (let x = 0; x < size.x; x++) r[(size.y - 1 - y) * size.x + x] = pixels[y * size.x + x];
        this.buffer.set(r);
    }

    createTexture(name) {
        const t = new Texture(name, this.size);
        t.pixelWalkMode = 'int';
        t.walk((x, y, c) => {
            return this.getPixel(x, y);
        });
        return t;
    }
    
    /**
     * Creates a new IntBuffer by copying elements from a rectanglular area in another IntBuffer (naive, unoptimized)
     * @param {*} r 
     */
    static CopyFromRect(r, src, grow = Vec2.Zero()) {
        const gx = r.width  + grow.x;
        const gy = r.height + grow.y;
        
        const b = new IntBuffer2D(gx, gy);        
        for (let y = 0; y < gy; y++) {
            for (let x = 0; x < gx; x++) {
                b.buffer[y * gx + x] = src.buffer[(y + r.top) * src.size.x + (x + r.left)];
            }
        }
        return b;
    }
}