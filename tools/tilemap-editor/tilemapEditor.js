import { TileMapRenderer } from "../../tileMapRenderer.js";
import { Types } from "../../engine.js";

const { Vector2:Vec2 } = Types;

const ImplementsEvents = 'beforedraw customdraw afterdraw mousedown mousemove';

const beforedraw = (o) => {
    o.ctx.strokeStyle = 'black';    
    o.ctx.lineWidth = 1;
    o.ctx.beginPath();
}

const customdraw = (o) => {
    const size = o.renderer.map.tileSize;
    o.ctx.rect(o.drawPos.x, o.drawPos.y, size, size);
}

const afterdraw = (o) => {    
    o.ctx.stroke();
    const cursor = o.renderer.cursor;
    if (cursor.x > -1) {
        const size = o.renderer.map.tileSize;
        const ofs  = o.renderer.position;
        o.ctx.beginPath();
        o.ctx.strokeStyle = 'red';    
        o.ctx.lineWidth = 3;
        o.ctx.rect(cursor.x * size - ofs.x, cursor.y * size - ofs.y, size, size);
        o.ctx.stroke();        
    }
}

class TileMapEditor extends TileMapRenderer {
    constructor(o) {
        super(o);     
        this.selectedTileIndex = -1;          
        this._dragStartPos     = Vec2.Zero();																// Save the old position of the map before mouse drag+move. Required only in the editor(?)
        this._drag             = false;
        this._mouseDownButton  = 0;

        this.events.create(ImplementsEvents);  
        this.addMouseControls();
    }
    
	addMouseControls() {
		const ui = this.engine.ui;			

		const mouseup = (e) => {    	
            const position = e.position;

			if (this._drag && (ui == null || ui.active == null)) {
				this._dragStartPos = e.position.clone();
			}
			this._drag = false;
		}

		const mousedown = (e) => {	            
            if (ui != null && ui.active != null) return;

			const position = e.position;
			
            this.events.fire('mousedown', { renderer:this, position, dragStartPosition:this._dragStartPos.clone(), tileCoords:this.unProject(position), button:e.button, event:e.event });
            this._drag = true;
            this._dragStartPos = e.position.clone();		
            this._mouseDownButton = e.button;
		}
        
		const mousemove = (e) => {                                  // move mouse on map		
            if (ui != null && ui.active != null) return;

            const position = e.position;            
            this.events.fire('mousemove', { renderer:this, position, dragStartPosition:this._dragStartPos.clone(),tileCoords:this.unProject(position), drag:e.dragging, event:e.event, button:this._mouseDownButton });
            if (e.dragging) this._dragStartPos = position.clone();
		}
		
		this.engine.events.register(this, { mousemove, mouseup, mousedown });
	}

    async init(params) {
        if ('url' in params) {
            console.log('Loading map:', params.url);
            const map = await this.loadMap({ url:params.url });
            if ('size' in params) map.rescaleTextures(params.size, params.size);    
        }
    
        this.events.register(this, { beforedraw, customdraw, afterdraw });  
    /*      
        this.events.add('mousedown', e => {        
            if (Engine.ui.active == null) {                        
                if (this.selectedTileIndex == -1) return;
                this.map.tiles[e.cursor.y][e.cursor.x] = this.selectedTileIndex;
            }
        });
        */
    }    
}

export { TileMapEditor }