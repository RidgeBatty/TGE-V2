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
        this.gridGap        = 3;
        this.customGridDraw = null;
        this.gridRects      = [];

        this.selectedItem   = -1;
        this.hoveredItem    = -1;                                       
        this.downItem       = -1;                                                                                           // mouse was over this item on button down

        this.recalculate();        
    }

    onMouseDown(e) {        
        this.selectedItem = -1;
        this.downItem     = this.hoveredItem;
        const gridPos = V2(this.hoveredItem % this.gridSize.x, Math.floor(this.hoveredItem / this.gridSize.x));
        this.events.fire('mousedown', { event:e, item:this.hoveredItem, gridPos });
    }

    onMouseUp(e) {        
        const gridPos = V2(this.hoveredItem % this.gridSize.x, Math.floor(this.hoveredItem / this.gridSize.x));
        this.events.fire('mouseup', { event:e, item:this.hoveredItem, gridPos });

        if (this.downItem == this.hoveredItem) this.selectedItem = this.hoveredItem;                                        // set selectedItem only when MB down and MB up were on the same grid element            
        this.events.fire('click', { event:e, item:this.selectedItem, gridPos });        
    }

    onMouseMove(e) {
        const { _gridSize, _gridItemSize, gridGap } = this;
        const g = V2(gridGap, gridGap);
        const p = e.position.sub(this.absoluteOffset);
        const v = Vec2.Div(p, Vec2.Add(_gridItemSize, g));        
        const i = Vec2.ToInt(v);        

        const gapPercentage = Vec2.Div(g, Vec2.Add(_gridItemSize, g));                                                      // calculate gap width as percentage
        if (v.x - i.x <= gapPercentage.x || v.y - i.y <= gapPercentage.y) return this.hoveredItem = -1;                     // if the position is in the gap, set active item to -1 and leave
        this.hoveredItem = i.y * _gridSize.x + i.x;
    }

    get gridSize() { return this._gridSize.clone(); }

    getData(pos) {
        const index = pos.y * this._gridSize.x + pos.x;
        if (index > -1 && index < this.gridRects.length) return this.gridRects[index].data;
    }

    setData(pos, data) {
        const index = pos.y * this._gridSize.x + pos.x;
        if (index > -1 && index < this.gridRects.length) this.gridRects[index].data = data;
    }

    /**
     * Reconstruct the grid rectangle cache and "size" property
     */
    recalculate() {
        const { _gridSize, _gridItemSize, gridGap } = this;
        if (this._size == 'auto') {
            this.size = V2(_gridSize.x * (_gridItemSize.x + gridGap) + gridGap, _gridSize.y * (_gridItemSize.y + gridGap) + gridGap);

            this.gridRects.length = _gridSize.x + _gridSize.y;
            const g = this._gridItemSize;
            for (let y = 0; y < _gridSize.y; y++) {
                for (let x = 0; x < _gridSize.x; x++) {
                    this.gridRects[y * _gridSize.x + x] = RECT(gridGap + x * (g.x + gridGap), gridGap + y * (g.y + gridGap), g.x, g.y);
                }
            }
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
                        
        for (let y = 0; y < _gridSize.y; y++)
            for (let x = 0; x < _gridSize.x; x++) {                
                const index = y * _gridSize.x + x;
                const r = this.gridRects[index];

                s.drawRect(r, { stroke:settings.cl3DDkShadow });
                if (this.hoveredItem == index) {                                                                 // active item
                    s.drawRect(r, { stroke:settings.clBtnShadow });                                                      
                    s.drawRect(r.clone().expand(1), { stroke:settings.clHoverHilite });                                  
                }

                if (this.customGridDraw) this.customGridDraw({ surface:s, rect:r, position:V2(x, y) });
            }
        
        //s.ctx.restore();
    }
}
