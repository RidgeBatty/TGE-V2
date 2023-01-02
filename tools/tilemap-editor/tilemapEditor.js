import { TileMapRenderer } from "../../tileMapRenderer.js";
import { Types } from "../../engine.js";

const { Vector2:Vec2 } = Types;

const ImplementsEvents = 'beforedraw customdraw afterdraw mousedown';

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

class TilemapEditor extends TileMapRenderer {
    constructor(o) {
        super(o);     
        this.selectedTileIndex = -1;          
        this.addMouseControls();
    }
    
	addMouseControls() {
		const ui = this.engine.ui;			

		const mousemove = (e) => {                                  // move mouse on map		
			if (this._drag && (ui == null || ui.active == null)) {        
				this.position.set(this._oldPos.clone().sub(e.delta));		
			}			
		}
		
		const mouseup = (e) => {    			
			if (this._drag && (ui == null || ui.active == null)) {
				this.position.set(this._oldPos.clone().sub(e.delta));
			}
			this._drag = false;
		}

		const mousedown = (e) => {			
			if (ui != null && ui.active != null) return;

			const position = Vec2.Add(this.position, e.downPos);				// calculate the absolute clicked map position taking scrolling into account
			const tile     = Vec2.ToInt(position.clone().divScalar(this.map.tileSize));
			
			if (e.button == 0) {
				this.cursor.set(tile);
				this.events.fire('onMouseDown', { renderer:this, cursor:this.cursor });
			}
			if (e.button == 2) this._drag = true;

			this._oldPos = this.position.clone();
		}
		
		this.engine.events.register(this, { mousemove, mouseup, mousedown });
	}

    async init(params) {
        if ('url' in params) {
            console.log('Loading map:', params.url);
            const map = await this.loadMap({ url:params.url });
            if ('size' in params) map.rescaleTextures(params.size, params.size);    
        }

        this.events.create(ImplementsEvents);
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

export { TilemapEditor }