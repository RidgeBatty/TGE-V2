/*

	TGE - Tools - Plotter
	Written By Ridge Batty (c) 2021
	This is an experimental module class, an attempt to add very simple editors/helpers in TGE which aid in design phase.
	These should never be included in production version.
	
	Plotter creates a stringified JSON array out of coordinates plotted on a target HTMLElement.
	New plot is created on every mouse click.
	Current contents of the array is printed in the console every time HTMLElement is right clicked.
	
*/
import { addEvent, addElem, style, getPos } from '../utils-web.js';
import * as TGE from '../engine.js';
const Vec2 = TGE.Types.Vector2;

class PlotterClass {
	constructor(params) {		// params:{ target:HTMLElement, customDraw:Boolean }
		const { target } = params;
		
		target.style.cursor = 'crosshair';
		
		const p = getPos(target);
		const a = [];		
		const plot    = ()  => { return addElem({ parent:target, tagName:'i' }); }				
		const calcPos = (e) => { return { x: Math.floor(e.x - p.left) - (el.offsetWidth >> 1), y: Math.floor(e.y - p.top) - (el.offsetHeight >> 1) }; }
		
		let el = plot();
		
		addEvent(target, 'mousemove', (e) => {						
			const pos = calcPos(e);
			style(el, `position:absolute; left:${pos.x}px; top:${pos.y}px`);			
			if (!params.customDraw) style(el, 'width:4px; height:4px; border-radius:4px; background:red; border:1px solid black;');
		});
		
		addEvent(target, 'click', (e) => {
			const pos = calcPos(e);
			a.push(pos);		
			el = plot();
		});
		
		addEvent(target, 'contextmenu', (e) => {
			console.log(JSON.stringify(a));
		});
	}
}

const Plotter = (p) => new PlotterClass(p);

export { Plotter }
