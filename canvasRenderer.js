/*

	TGE CanvasRenderer
	
	CanvasSurface wrapped inside class with helper methods

*/
import * as MultiCast from "./multicast.js";
import * as Engine from "./engine.js";
import { CanvasSurface } from "./canvasSurface.js";

const { Rect, Vector2, Color } = Engine.Types;

class CanvasRenderer extends CanvasSurface {
	constructor(HTMLContainer, flags = { pixelSmooth:true, clickMaskTest : false, alpha : false }) {
		super({ flags:flags.alpha });
		
		var HTMLContainer = (ID(HTMLContainer) == null) ? HTMLContainer : ID(HTMLContainer);
		
		HTMLContainer.appendChild(this.canvas);
		AE.style(this.canvas, 'position:absolute; left:0; top:0; right:0; bottom:0; width:100%; height:100%');
	
		this.canvas.width  = HTMLContainer.clientWidth;
		this.canvas.height = HTMLContainer.clientHeight;		
		
		this.clickMaskTest = flags.clickMaskTest;					// set this to true if you want to test mouse clicks against the alpha channel
		if (flags.clickMaskTest) canvas.style.opacity = 0;		
	}
	
	addEvent(evtType, handler) {	
		if (MultiCast.MouseEvts.indexOf(evtType) == -1) throw `CanvasRenderer: ${evtType} is not a mouse event`;
		
		MultiCast.addEvent(evtType, (e) => {
			const p   = AE.getPos(this.canvas);
			const pos = new Vector2(Math.round(e.clientX - p.left), Math.round(e.clientY - p.top));
			if (e.target == this.canvas) {
				let maskHitResult = false;
				if (this.clickMaskTest) maskHitResult = this.getPixel(pos);				
				handler(e, { pos, renderer:this, maskHitResult });
			}
		});
	}
}

export { CanvasRenderer }
