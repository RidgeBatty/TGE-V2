/*

	Main Menu
	Tiny Game Engine
	Written by Ridge Batty (c) 2021	
	
	Default behavior:
		Mouse click - open menu or back to previous menu
		Mouse hover - play sound & visual effect
		Mouse wheel - change value of setting
	
*/
import { Engine, Events } from './engine.js';
import { getJSON } from './utils.js';

const ImplementsEvents = 'select change';
class MenuItem {
	constructor(fields, data) {
		Object.assign(this, fields);
		
		this.children = [];
		this.data     = {};
		
		if (this.parent == null) this._root = this;
		
		if (typeof data == 'object' && data != null) {
			for (const [k, v] of Object.entries(data)) if (k != 'items' && k != 'parent') this.data[k] = v;	
		
			if ('caption' in data) {						
				const elem     = AE.newElem(this.parent.container, 'tge-menu-item');
				this.label     = AE.newElem(elem, 'tge-menu-caption');				
				this.caption   = data.caption;				
				this.elem      = elem;								
				this.id        = ++this.root.mainmenu.id;				
				this.label.dataset.id = this.id;
			}			
			
			if ('items' in data) this.container = AE.newElem(this.root.mainmenu.container.parentNode, 'tge-menu-level');			
		}
	}
	
	get caption() { return this._caption; }
	
	set caption(value) {
		AE.setText(this.label, value);
		this._caption = value;
	}
		
	/*
		Checks this node and all its descendants for 'id'
	*/
	getById(id) {			
		function check(p) {
			if (p.id == id) return p;
			for (const c of p.children) { const res = check(c); if (res) return res; }
		}	
		return check(this);
	}
	
	get root() {
		let p = this;
		while (p) {
			if (p._root) return p._root;
			p = p.parent;
		}
		return null;
	}
	
	addChild(data) {				
		const node = new MenuItem({ parent:this }, data);
		this.children.push(node);		
		return node;
	}
	
	static BuildFrom(mainmenu, o) {		
		mainmenu.id    = 0;
		mainmenu.level = 0;		
		mainmenu.items = new MenuItem({ parent:null, container:mainmenu.container, mainmenu });
		
		const unpack = (parent, data) => {
			if ('items' in data) for (const item of data.items) {
				const newNode = parent.addChild(item);
				unpack(newNode, item);
			}			
		}
		
		unpack(mainmenu.items, o);
	}
}

class MainMenu {
	/**
	 * 
	 * @param {HTMLElement} container Where the main menu component will be placed?
	 * @param {object} events handlers for onClick and onHover events
	 */
	constructor(container) {		
		this.container         = AE.newElem(container, 'tge-menu-level');		
		this.currentLevel      = null;				
		this.animationDuration = {
			over  : 1,
			click : 0.3,
		}
		this.sounds            = [];
		this.events            = new Events(this, ImplementsEvents);
		
		this.installEventHandlers();
	}

	playSound(name) {
		if (!Engine.audio) return;
		const sfx = this.sounds.find(e => e.name == name);
		if (sfx) Engine.audio.spawn(sfx.name, true);								
	}

	installEventHandlers() {
		const mouseover = (e) => {
			if (e.target.tagName != 'TGE-MENU-ITEM') return;
			const caption = e.target.children[0];				
			this.playSound('over');
			AE.removeClass(caption, 'click');
			AE.addClass(caption, 'over');			
			setTimeout(_ => { AE.removeClass(caption, 'over') }, Math.floor(this.animationDuration.over * 1000));			
		}
		const mouseup = (e) => {
			if (e.target.tagName != 'TGE-MENU-ITEM') return;
			const caption = e.target.children[0];				
			this.playSound('click');
			AE.removeClass(caption, 'over');
			AE.addClass(caption,'click');
			this.click(e);
			setTimeout(_ => { AE.removeClass(caption, 'click') }, Math.floor(this.animationDuration.click * 1000));			

			this.events.fire('select', { item:this.items.getById(caption.dataset.id) });
		}
		const wheel = (e) => { this.wheel(e) }
		Engine.events.register(this, { mouseup, mouseover, wheel });				
	}
	
	async createFromObject(o) {		
		this.data = o;

		// parse menu
		MenuItem.BuildFrom(this, o);		
		this.openMenu(this.items);
		
		// assign programmable property values to CSS of menu captions
		const items = [...document.getElementsByTagName('TGE-MENU-CAPTION')];
		for (const el of items) {
			el.style.setProperty('--tge-duration-over', this.animationDuration.over + 's');
			el.style.setProperty('--tge-duration-click', this.animationDuration.click + 's');
		}			

		// parse sounds & visual effects 
		if ('effects' in o) {		
			for (const [k, v] of Object.entries(o.effects)) {
				if (v.sfx) this.sounds.push({ name:k, url:v.sfx });
			}			
			if (Engine.audio) await Engine.audio.addBunch(this.sounds);
				else if (this.sounds.length > 0) console.warn('Engine AudioLib is not initialized but the MainMenu contains sound effects.');
		}

		return o;
	}
		
	/**
	 * Detaches event handlers from the menu
	 */
	close() {
		this.container.remove();
		Engine.events.unregister(this)
	}
	
	/**
	 * WARNING! Do NOT call this function directly. 		
	 * @param {*} e 
	 * @returns 
	 */
	click(e) {		
		const id = e.target.children[0].dataset.id;		
		if (!id) return;

		const o  = { node:this.items.getById(id), preventDefault:false };
						
		if (o.preventDefault == false) {				
			this.openMenu(o.node);				
		//	const sound = this.sounds[name.toLowerCase()];
		//	if (sound) sound.play();
		}		
	}	

	/**
	 * WARNING! Do NOT call this function directly. 		
	 * @param {*} e 
	 * @returns 
	 */
	wheel(e) {	
		const id = e.target.children[0].dataset.id;				
		if (!id) return;
		
		const o  = { node:this.items.getById(id), preventDefault:false };
						
		const dir = Math.sign(e.event.wheelDelta);			
		if (o.preventDefault == false) {								
			const d = o.node.data;				
			if ('value' in d) {
				d.value += d.step * dir;
				if (d.value < d.range[0]) d.value = d.range[0];
					else if (d.value > d.range[1]) d.value = d.range[1];
						else {
							this.playSound('slide');
							this.events.fire('change', { item:o.node });
						}
				this.updateValue(o.node);
			}						
			if ('options' in d) {
				d.index += dir;
				if (d.index < 0) d.index = 0;
					else if (d.index > d.options.length - 1) d.index = d.options.length - 1;
						else {
							this.playSound('switch');
							this.events.fire('change', { item:o.node });
						}
				this.updateValue(o.node);
			}				
		}		
	}	
	
	updateValue(item) {
		const d = item.data;
		if ('value'   in d) item.caption = item.data.caption.replace('${value}', d.value); else
		if ('options' in d) item.caption = item.data.caption.replace('${value}', d.options[d.index]);				
	}
	
	/*
		Opens selected item in the menu
	*/
	openMenu(item) {
		if (typeof item != 'object' || item == null) return;		
		
		let target = null;		
		if ('target' in item.data) {												// target node for this menuitem is set in the JSON object			
			if (item.data.target == 'parent') target = item.parent.parent;			// parent of "back" node is the menu where it belongs to, we need to go one more level up!			
		} else		
			if (item.children.length > 0) target = item;							// the node has child nodes, so it can be "opened"
								
		if (target != null) {			
			if (this.currentLevel) AE.removeClass(this.currentLevel.container, 'active');
			AE.addClass(target.container, 'active');
			this.currentLevel = target;
						
			for (const v of Object.values(target.children)) this.updateValue(v);	// replace the placeholders with actual values of respective menu settings:
		}
	}
		
	/**
	 * Loads menu from JSON file and constructs it (unless 'doNotCreate' flags is true)
	 * @param {string} url 
	 * @param {boolean} doNotCreate 
	 * @returns 
	 */
	async loadFromFile(url, doNotCreate) {		
		const data = await getJSON(url);
		if (doNotCreate) return data; 
			else return await this.createFromObject(data);
	}
}
	
export { MainMenu }