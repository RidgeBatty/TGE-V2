import { V2, Vector2 as Vec2 } from "./types.js";

export class Grid {
    /**
     * 
     * @param {number} x Number of grid elements in horizontal direction
     * @param {number} y Number of grid elements in vertical direction
     * @param {number=} itemSizeX Optional. X-size of each grid item (or X and Y size of a square). Defaults to 1.
     * @param {number=} itemSizeY Optional. Y-size of each grid item (if not specified, treat items as squares)
     */
    constructor(x, y, itemSizeX = 1, itemSizeY) {
        this.rows = y;
        this.cols = x;        
        this.itemSize = V2(itemSizeX, (itemSizeY == null) ? itemSizeX : itemSizeY);
        this.position = V2(0, 0);
        this.origin   = V2(-0.5, -0.5);
    }

    unproject(v) {
        return v.clone().sub(this.position).sub(this.dims.mul(this.origin)).div(this.itemSize);
    }

    project(v) {
        return Vec2.Add(this.position.clone().add(this.dims.mul(this.origin)), Vec2.Mul(v, this.itemSize));
    }

    /**
     * Returns the grid position and the coordinates of the top left corner of each item in the grid.
     * @param {Function} f Callback function
     */
    draw(f) {
        const v = V2(0, 0);
        const a = V2(0, 0);
        const d = this.dims.mul(this.origin);
        for (let y = 0; y < this.rows; y++)
            for (let x = 0; x < this.cols; x++) {
                v.x = this.position.x + d.x + x * this.itemSize.x;
                v.y = this.position.y + d.y + y * this.itemSize.y;
                a.x = x;
                a.y = y;
                f(v, a);
            }
    }

    get count() {
        return this.rows * this.cols;
    }

    get dims() {
        return V2(this.rows * this.itemSize.x, this.cols * this.itemSize.y);
    }
}
