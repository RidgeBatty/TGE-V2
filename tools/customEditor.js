/**
 * Custom editor which has the following properties:
 * 
 *  - 2d surface
 *  - grid
 *  - crosshair cursor
 *  - panning
 *  - zooming
 */

import { CustomLayer } from "../customLayer.js"
import { Engine, TinyGameEngine, Types } from "../engine.js";

const { Vector2 : Vec2, V2, Color, Rect, RECT } = Types;

export class CustomEditor extends CustomLayer {
    /**
     * 
     * @param {object} o Parameters object
     * @param {boolean} o.addLayer Adds the editor in the gameLoop (automatically displayed on update)
     * @param {function} o.onCustomDraw Place your stuff here if you want to draw somethig in editor's backbuffer during update() cycle
     * @param {TinyGameEngine} o.engine Reference to Engine instance
     */
    constructor(o) {        
        super({ engine:o.engine });

        this.position  = this.engine.dims.mulScalar(-0.5);             
        this.data      = {};        
        this.styles    = {
            editorBackground : '#222',         
        }
        this.grid      = {
            isVisible       : true,
            text            : { font:'16px arial', color:'white' },
            size            : V2(40, 40),
            showCoordinates : true,
            enableSnap      : false,
        }
        this.crosshair = {
            isVisible       : true,
            text            : { font:'14px arial', color:'lime', textBaseline:'bottom' },                
            hint            : ''
        }
        this.mouse = {
            coords          : Vec2.Zero(),
            startPos        : Vec2.Zero()
        }

        Object.seal(this.grid);
        Object.seal(this.crosshair);        

        this.onCustomDraw = ('onCustomDraw' in o) ? o.onCustomDraw : null;         
    }

    async init() {
        this.installEventHandlers();
        this.updateViewport();                                                      // init (this) CustomLayer's backbuffer        
    }    

    snapToGrid(coords) {
        if (!this.grid.enableSnap) return coords;
        const gx  = this.grid.size.x;
        const gy  = this.grid.size.y;
        coords.x  = Math.round((this.position.x + coords.x) / gx) * gx - this.position.x; 
        coords.y  = Math.round((this.position.y + coords.y) / gy) * gy - this.position.y;        
        return coords;
    }

    installEventHandlers() {      
        const ui = this.engine.ui;	

        const mousedown = (e) => { 
            if (ui.active != null) return;
            this.mouse.coords   = this.snapToGrid(Vec2.ToInt(e.position));
            this.mouse.startPos = this.snapToGrid(Vec2.ToInt(e.position));
            if (this.onMouseDown) this.onMouseDown(e, this.mouse);
        }

        const mousemove = (e) => {                           
            if (ui.active != null) return;
            this.mouse.coords = this.snapToGrid(Vec2.ToInt(e.position));            

            if (e.event.shiftKey && e.dragging) {
                const diff  = Vec2.Sub(this.mouse.startPos, this.mouse.coords);                
                this.offset = Vec2.ToInt(diff);                 
            }

            if (this.onMouseMove) this.onMouseMove(e, this.mouse);
        }

        const mouseup = (e) => {        
            if (ui.active != null) return;            
            if (e.event.shiftKey) {                
                this.position.add(this.offset);
                this.offset = V2(0, 0);
            }
            if (this.onMouseUp) this.onMouseUp(e, this.mouse);
        }

        const keydown = (e) => {
            if (this.onKeyDown) this.onKeyDown(e);
        }

        const mouseout  = (e) => { if (e.event.relatedTarget == null) this.mouseOut = true;  }
        const mouseover = (e) => { if (e.event.relatedTarget == null) this.mouseOut = false; }

        Engine.events.register(this, { mousemove, mouseup, mousedown, mouseout, mouseover, keydown });
    }

    drawCrosshair(s) {        
        if (this.mouseOut) return                                                  
        const m = this.mouse.coords;

        s.resetTransform();
        s.drawLine(V2(m.x, 0), V2(m.x, s.height), 'rgba(255,255,255,0.5)');
        s.drawLine(V2(0, m.y), V2(s.width, m.y), 'rgba(255,255,255,0.5)');

        if (this.crosshair.hint != '') s.textOut(V2(m.x + 4, m.y), this.crosshair.hint, this.crosshair.text);        
    }

    drawGrid(s) {
        const vx = this.engine.dims.x;
        const vy = this.engine.dims.y;
        const gx = this.grid.size.x;
        const gy = this.grid.size.y;
        const hLines = Math.round(vy / gy);
        const vLines = Math.round(vx / gx);

        const pos    = Vec2.Add(this.position, this.offset);
        
        for (let x = 0; x <= vLines; x++) {
            const px = x * gx - (pos.x % gx);
            const vertLineNum = x + Math.floor(pos.x / gx) + 1;            
            let cx = (Math.round(pos.x + px) % (gx * 4) == 0) ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)';            
            s.drawLine(V2(px, 0), V2(px, vy), cx);            
            if (this.grid.showCoordinates && vLines < 50 && x > 0) s.textOut(V2(px, vy - 4), vertLineNum, this.grid.text);            
        }                
        
        for (let y = 0; y <= hLines; y++) {
            const py = y * gy - (pos.y % gy);
            const horzLineNum = y + Math.floor(pos.y / gx) + 1;
            let cy = (Math.round(pos.y + py) % (gy * 4) == 0) ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)';
            s.drawLine(V2(0, py), V2(vx, py), cy);
            if (this.grid.showCoordinates && hLines < 30 && y < hLines - 1) s.textOut(V2(0, py - 4), horzLineNum, this.grid.text);                
        }      

        s.ctx.lineWidth = 3;
        s.ctx.setLineDash([5, 5]);
        s.drawLine(V2(-pos.x, 0), V2(-pos.x, vy), 'rgba(0,0,0,1)');
        s.drawLine(V2(0, -pos.y), V2(vx, -pos.y), 'rgba(0,0,0,1)');
        s.ctx.setLineDash([]);
        s.ctx.lineWidth = 1;        
    }

    update() {
        const s = this.buffer;
        s.resetTransform();               
        s.drawRectangle(0, 0, s.width, s.height, { fill:this.styles.editorBackground });                           // clear screen        

        if (this.grid.isVisible) this.drawGrid(s);
        if (this.onCustomDraw) this.onCustomDraw(s);
        if (this.crosshair.isVisible) this.drawCrosshair(s);

        const r = Engine.renderingSurface;                                                                         // flip buffers
        r.resetTransform();
        r.drawImage(Vec2.Zero(), s.canvas);
    }
}