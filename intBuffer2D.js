import { Texture } from "./texture.js";
import * as Types from "./types.js";

const { Vector2 : Vec2, V2, Color, Rect, RECT } = Types;

export class IntBuffer2D {
    constructor(w, h, i = 0) {
        this.size   = V2(w, h);
        this.buffer = new Uint32Array(w * h);
        this.buffer.fill(i);        
    }

    getPixel(x, y) {
        return this.buffer[y * this.size.x + x];
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
     * Creates a new IntBuffer by copying elements from a rectanglular area in another IntBuffer
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