/*

	TGE CanvasRenderer
	
	CanvasSurface wrapped inside class with helper methods

*/
import { Engine, Events, Types, Utils } from "./engine.js";
import { CanvasSurface } from "./canvasSurface.js";

const { ID, style, getPos } = Utils;
const { Rect, Vector2, Color } = Types;

const ImplementsEvents = 'mousemove mouseup mousedown';
class CanvasRenderer extends CanvasSurface {
	constructor(HTMLContainer, flags = { pixelSmooth:true, clickMaskTest : false, alpha : false }) {
		super({ flags:flags.alpha });
		
		var HTMLContainer = (ID(HTMLContainer) == null) ? HTMLContainer : ID(HTMLContainer);
		
		HTMLContainer.appendChild(this.canvas);
		style(this.canvas, 'position:absolute; left:0; top:0; right:0; bottom:0; width:100%; height:100%');
	
		this.canvas.width  = HTMLContainer.clientWidth;
		this.canvas.height = HTMLContainer.clientHeight;		
		
		this.clickMaskTest = flags.clickMaskTest;										// set this to true if you want to test mouse clicks against the alpha channel
		if (flags.clickMaskTest) canvas.style.opacity = 0;		

		this.#installEventHandlers();	
	}

	#installEventHandlers() {		
		this.events = new Events(this, ImplementsEvents);			

		const mouseEvent = (name, e) => {
			const p   = getPos(this.canvas);
			const pos = new Vector2(Math.round(e.clientX - p.left), Math.round(e.clientY - p.top));
			if (e.target == this.canvas) {
				let maskHitResult = false;
				if (this.clickMaskTest) maskHitResult = this.getPixel(pos);				
				this.events.fire(name, { event:e, pos, renderer:this, maskHitResult });				
			}			
		}

		const mouseup   = (e) => mouseEvent('mouseup', e);
		const mousedown = (e) => mouseEvent('mousedown', e);
		const mousemove = (e) => mouseEvent('mousemove', e);
			
		Engine.events.register(this, { mousemove, mouseup, mousedown }, false);			// set event handlers inactive by default		
	}
}

export { CanvasRenderer }
