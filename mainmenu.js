/*

	Main Menu
	Tiny Game Engine
	Written by Ridge Batty (c) 2021	
	
	Default behavior:
		Mouse click - open menu or back to previous menu
		Mouse hover - no default
		Mouse wheel - change value of setting
	
*/
import * as MultiCast from "./multicast.js";

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
		
		function unpack(parent, data) {
			if ('items' in data) for (const item of data.items) {
				const newNode = parent.addChild(item);
				unpack(newNode, item);
			}			
		}
		
		unpack(mainmenu.items, o);
	}
}

class MainMenu {
	constructor(container, className, events) {		// container:HTMLElement, className:String(CSS class), events:{ onClick:Function, onHover:Function }
		this.container = AE.newElem(container, 'tge-menu-level');
		
		if (events) {
			this.onClick   = events.onClick;
			this.onHover   = events.onHover;
		}
		this.sounds    = {
			hover  : null,
			click  : null,
		}
		this.currentLevel = null;
		if (className) AE.addClass(container, className);
	}
	
	createFromObject(o) {		
		MenuItem.BuildFrom(this, o);		
		
		this.openMenu(this.items);
		 
		this.__onclick = (e) => this._onCustomEvent(e, 'Click');
		this.__onhover = (e) => this._onCustomEvent(e, 'Hover');
		this.__onwheel = (e) => this._onCustomEvent(e, 'Wheel');
		MultiCast.addEvent('click',     this.__onclick);
		MultiCast.addEvent('mouseover', this.__onhover);		
		MultiCast.addEvent('wheel',     this.__onwheel);
		
		return o;
	}
	
	/*
		Detaches event handlers from the menu
	*/
	close() {
		MultiCast.uninstall('click',     this.__onclick);
		MultiCast.uninstall('mouseover', this.__onhover);		
		MultiCast.uninstall('wheel',     this.__onwheel);
	}
	
	/*
		WARNING! Do NOT call this function. 
		Set 'this.onClick' or 'this.onHover' to point to you own handler function to process mainmenu click events
	*/
	_onCustomEvent(evt, name) {		
		const id = evt.target.dataset.id;		
		const o  = { node:this.items.getById(id), preventDefault:false };
		const e  = this['on' + name];
						
		if (name == 'Click' && id) {							// does this click event correspond to any menu item at all?
			if (AE.isFunction(e)) e(evt, o);			
			if (o.preventDefault == false) {				
				this.openMenu(o.node);				
				const sound = this.sounds[name.toLowerCase()];
				if (sound) sound.play();
			}
		}
		
		if (name == 'Wheel' && id) {
			const dir = Math.sign(evt.wheelDelta);			
			if (AE.isFunction(e)) e(evt, o);			
			if (o.preventDefault == false) {								
				const d = o.node.data;				
				if ('value' in d) {
					d.value += d.step * dir;
					if (d.value < d.range[0]) d.value = d.range[0];
					if (d.value > d.range[1]) d.value = d.range[1];
					this.updateValue(o.node);
				}						
				if ('options' in d) {
					d.index += dir;
					if (d.index < 0) d.index = 0;
					if (d.index > d.options.length - 1) d.index = d.options.length - 1;
					this.updateValue(o.node);
				}						
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
	
	/*
		Loads menu from JSON file and constructs it (unless 'doNotCreate' flags is true)
	*/	
	async loadFromFile(url, doNotCreate) {
		return await fetch(url)
			.then(r => { 
				if (r.ok) return r.json(); 
					else throw 'Error loading file';
				})
			.then(o => { if (doNotCreate) return o; else return this.createFromObject(o); })
			.catch(e => console.warn(e));
	}
}
	
export { MainMenu }