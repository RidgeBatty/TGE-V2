/*

	Dialog
	Tiny Game Engine
	Written by Ridge Batty (c) 2020

	Displays a modal dialog window
	
*/
import { Engine } from './engine.js';

class Dialog {
	constructor(o) {		// o: { }
		if (!('body' in o)) throw 'Required field "body" missing from data';
		if (!('head' in o)) throw 'Required field "head" missing from data';
		
		this.name  = o.name;
		const elem = document.createElement(o.tagName || 'aw-dialog');
		const head = AE.newElem(elem, 'div', 'head');
		const body = AE.newElem(elem, 'div', 'body');
		const over = AE.newElem(elem, 'div', 'overlay');
		
		if ('id' in o) elem.id = o.id;
		AE.setText(head, o.head.caption);
		this._fadeInProgress = false;
		
		Object.assign(this, { elem, head, body, parentElem:ID(o.parentElemId) });
		
		AE.freezeProp(this, 'components', {});
		
		this.createComponents(o);
	}
	
	/*
		Create the components
	*/
	createComponents(o) {			
		const src = o.body;
		const trg = this.body;
		
		if ('caption' in src) AE.setText(trg, src.caption);
		
		if ('children' in src) {
			for (const b of src.children) {
				if (b.tagName == 'input')  this.addInput(Object.assign(b, { parentElem:trg })); else
				if (b.tagName == 'button') this.addButton(Object.assign(b, { parentElem:trg }));
			}
		}		
	}
	
	show() { this.parentElem.appendChild(this.elem); }	
	hide() { if (this.elem.parentNode != null) AE.removeElement(this.elem); }
	
	fadeOut(timeout = 0) {
		if (this._fadeInProgress) return;
		this.fadeInProgress = true;		
		AE.addClass(this.elem, 'fade-out');
		setTimeout(_ => { this.hide(); AE.removeClass(this.elem, 'fade-out'); this._fadeInProgress = false; }, timeout);
	}
	
	fadeIn(timeout = 0) {
		if (this._fadeInProgress) return;
		this.fadeInProgress = true;
		AE.removeClass(this.elem, 'fade-out');
		this.show();
		AE.addClass(this.elem, 'fade-in');
		setTimeout(_ => { AE.removeClass(this.elem, 'fade-in'); this._fadeInProgress = false; });
	}
		
	addInput(o) {	// o:{ ?name:String, ?caption:String, ?type:String, ?parentElem:HTMLElement, ?default:String }
		const elem  = AE.newElem(o.parentElem == null ? this.body : o.parentElem, 'div');
		const label = AE.newElem(elem, 'label');
		const input = AE.newElem(elem, 'input');
		
		if ('name' in o) label.setAttribute('for', o.name);
		if ('id' in o)   input.setAttribute('id', o.id);
		if ('name' in o || 'id' in o) input.setAttribute('id', o.id || o.name);
		
		if ('default' in o) input.setAttribute('value', o.default);
		if ('type' in o)    input.setAttribute('type', o.type);
			else input.setAttribute('type', 'text');
		if ('caption' in o) AE.setText(label, o.caption);
		
		if ('name' in o) this.components[o.name] = { container:elem, label, input }
	}
	
	addButton(o) { // o:{ ?name:String, ?caption:String, ?id:String, ?parentElem:HTMLElement }
		const bt = AE.newElem(o.parentElem, 'button');
		if ('name' in o) bt.setAttribute('name', o.name);		
		if ('id' in o) bt.setAttribute('id', o.id);
				
		AE.setText(bt, o.caption);
		
		if ('name' in o) this.components[o.name] = bt;		
	}
	
	static LoadFromFile(hjson) {
		return new Promise((resolve, reject) => {
			const callback = async (x) => {
				const res  = await fetch(hjson);
				const body = await res.text(res.body);
				const o    = Hjson.parse(body);				
				const d    = new Dialog(o);
				resolve(d);
			}			
			AE.require(Engine.url + 'ext/hjson.min.js', { callback });		
		});
	}
}

export { Dialog }