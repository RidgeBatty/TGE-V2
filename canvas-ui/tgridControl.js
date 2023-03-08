/**
 * 
 * TGridControl - base class for a grid
 * 
 */
 
import { Vector2 as Vec2, V2, Rect, RECT } from '../types.js';
import { TFocusControl } from './tfocusControl.js';

export class TGridControl extends TFocusControl {
    constructor(o) {
        super(o);
        this.settings       = {};        
        this.fetchDefaults('gridcontrol');
        
        this._size          = ('size' in o) ? o.size : V2(32, 32);
        this._gridSize      = ('gridSize' in o) ? o.gridSize : V2(0, 0);
        this._gridItemSize  = ('gridItemSize' in o) ? o.gridItemSize : V2(0, 0);
        this.gridGap        = 2;
        this.customGridDraw = null;

        this.recalculate();
    }

    get gridSize() { return this._gridSize.clone(); }

    recalculate() {
        const { _gridSize, _gridItemSize, gridGap } = this;
        if (this._size == 'auto') {
            this.size = V2(_gridSize.x * (_gridItemSize.x + gridGap) + gridGap, _gridSize.y * (_gridItemSize.y + gridGap) + gridGap);
        }
    }

    draw() {    
        const { settings, size, _gridSize, gridGap } = this;
     
        const s = this.surface;        
        const p = this.position;

        s.ctx.translate(p.x, p.y);

        s.drawRect(this.clientRect, { stroke:settings.cl3DLight });         
        s.clipRect(this.clientRect);        

        //s.ctx.save();
        
        const g = this._gridItemSize;
        
        for (let y = 0; y < _gridSize.y; y++)
            for (let x = 0; x < _gridSize.x; x++) {
                const r = RECT(gridGap + x * (g.x + gridGap), gridGap + y * (g.y + gridGap), g.x, g.y);                
                s.drawRect(r, { stroke:settings.cl3DDkShadow });
                if (this.customGridDraw) this.customGridDraw({ surface:s, rect:r, position:V2(x, y) });
            }
        
        //s.ctx.restore();
    }
}
