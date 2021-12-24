/**

	Debug Tools for TGE
	Written by Ridge Batty (c) 2021
	
**/
import { Actor, Scene, Engine } from '../engine.js';

console.warn('TGE DEBUG TOOLS are enabled!');

const sheet = new CSSStyleSheet();
sheet.insertRule('.tge-debug    { position:absolute; left:10px; top:10px; color:lime; text-shadow:1px 1px 1px black; font:14px monospace; pointer-events:none; }'); 
sheet.insertRule('.tge-controls { position:absolute; left:10px; bottom:10px; color:lime; text-shadow:1px 1px 1px black; font:14px monospace; pointer-events:none; }'); 
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

const el = {
	fps    : null,
	delta  : null,
	actors : null,
	olaps  : null,
	edges  : null,
	logic  : null,
	particles : null,
}

const onRender    = Engine.gameLoop._render;
const overlapFunc = Actor.prototype.testOverlaps;
const fps = {
	min:9999,
	max:0,
	current:0,
	total:0,
}
const logic = {
	min:9999,
	max:0,
	current:0,
	above5ms:0,
}
const mouse = {
	x:0,
	y:0,
}
const KeybState = [];

let overlapCallCount = 0;
let isPaused         = false;
let debugLayer       = null;
let controlLayer     = null;

/*
	Adds a layer (HTMLElement) for debug information (singleton)
*/
function addLayer(elem = Engine._rootElem) {
	debugLayer   = AE.newElem(elem, 'div', 'tge-debug');	
	controlLayer = AE.newElem(elem, 'div', 'tge-controls');	

	AE.setText(debugLayer, 'Tiny Game Engine Debug Layer');

	for (const k of Object.keys(el)) el[k] = AE.newElem(debugLayer, 'div');		
}

function getLayer() {
	return debugLayer;
}

Actor.prototype.testOverlaps = function(other) {
	overlapFunc.call(this, other);
	overlapCallCount++;
}

Engine.gameLoop._render = function(ts) {
	overlapCallCount = 0;
	
	onRender.call(Engine.gameLoop, ts);
	
	fps.current = Engine.getFPS();
	if (isFinite(fps.current) && Engine.gameLoop.frameCount > 60) {
		if (fps.current < fps.min) fps.min = fps.current;
		if (fps.current > fps.max) fps.max = fps.current;
	}
	fps.total = Engine.gameLoop.frameCount;
	
	logic.current = Engine.gameLoop._lastTick;
	if (isFinite(logic.current) && Engine.gameLoop.tickCount > 60) {
		if (logic.current < logic.min) logic.min = logic.current;
		if (logic.current > logic.max) logic.max = logic.current;
	}
	if (logic.current > 5) logic.above5ms++;
	
	if (el.fps)    el.fps.textContent    = `FPS: ${fps.current} | Min ${fps.min} | Max ${fps.max} | Total frames ${fps.total}`;
	if (el.delta)  el.delta.textContent  = `Frame delta: ${Engine.gameLoop.frameDelta.toFixed(2)}ms`;
	if (el.logic)  el.logic.textContent  = `Game logic: ${Engine.gameLoop.tickCount} ticks | ${Engine.gameLoop._tickQueue} queued | ${logic.current.toFixed(2)}ms | Min ${logic.min.toFixed(2)}ms | Max ${logic.max.toFixed(2)}ms | >5ms ${logic.above5ms} (${(logic.above5ms/fps.total*100).toFixed(2)}%)`;
	if (el.actors) el.actors.textContent = `Actors: ${Engine.gameLoop.actors.length} | zLayers: ${Engine.gameLoop.zLayers.length}`;
	if (el.olaps)  el.olaps.textContent  = `Overlaps: ${overlapCallCount} Tested | ${Engine.gameLoop.overlaps.length} Detected`;
	if (el.edges)  el.edges.textContent  = `Edges: L=${Engine.edges.left} | T=${Engine.edges.top} | R=${Engine.edges.right} | B=${Engine.edges.bottom}`;
	
	const ps = Engine.gameLoop.particleSystem;
	if (ps) {
		let dc = 0, ac = 0;
		ps.emitters.forEach(e => { dc += e.particles.length; ac += e.activeParticleCount; });
		if (el.particles)  el.particles.textContent  = `Particles: Emitters ${ps.emitters.length} | Draw Count: ${dc} | Active: ${ac}`;
	}

	if (controlLayer) {		
		const keys = Object.keys(KeybState).filter(e => KeybState[e] != false).join(' ');
		controlLayer.innerHTML = `Keys: ${keys}<br>Mouse: Screen ${mouse.x}:${mouse.y} | Viewport ${Engine.mousePos.asString()} | Touches:`;
	}
}

/*
	
	Visual debug elements

*/
function _box(div, x, y, w, h) {
	div.style.position = 'absolute';
	div.style.left   = x + 'px';
	div.style.top    = y + 'px';		
	div.style.width  = w + 'px';		
	div.style.height = h + 'px';
}	

/*
	Creates a new <div> from an array of corner points for debug purposes.
	The element is inserted inside Engine._rootElem container. Optional (id) can be attached to the element. 
	If an element with the same id exists, its position and dimensions are updated, preventing the creation of new instances.
	Returns the created HTMLElement.
*/	
function addBox(corners, id, params) {
	if (id == null || ID(id) == null) {
		const relativeTo = (params && 'relativeTo' in params) ? params.relativeTo : Engine._rootElem;
		var div = AE.newElem(relativeTo, 'div', 'tge-collider-bg-blue');
	} else var div = ID(id);
	
	_box(div, Math.min(corners[0].x, corners[1].x),
			  Math.min(corners[0].y, corners[1].y),
			  Math.abs(corners[0].x - corners[1].x),
			  Math.abs(corners[0].y - corners[1].y));
	
	if (id != null) div.id = id;
	return div;
}

function addRect(rect, id, params) {	
	return addBox([{x:rect.left, y:rect.top}, {x:rect.left + rect.width, y:rect.top + rect.height}], id, params);
}

/*
	Adds a crosshair in the viewport (for debugging purposes)
*/
function addCrosshair(x, y, id) {	
	if (id == null || ID(id) == null) {
		var div  = AE.newElem(Engine._rootElem, 'div');
		var vert = AE.newElem(div, 'div', 'tge-collider-bg-blue');		
		var horz = AE.newElem(div, 'div', 'tge-collider-bg-blue');				
		div.id   = id;		
	} else {		
		var div  = ID(id);		
		var vert = div.children[0];
		var horz = div.children[1];		
	}
	_box(vert, x - 1, 0, 0, Engine.screen.bottom);
	_box(horz, 0, y - 1, Engine.screen.right, 0);	
		
}

/*
	Adds debug info to all <video> tags of the document, if they are created by Animation class
*/
function addAnimationDebug() {
	let count = 0;
	for (let a of Engine.gameLoop.actors) {
		if ('animations' in a) {
			for (let v of a.animations.list) {
				v.video.setAttribute('name', v.name);
				v.video.setAttribute('url', v.url);
				count++;
			}
		}
	}
	console.log('Debug information added to', count, 'video tags.');
}

function init() {
	addLayer();	
	AE.addEvent(window, 'mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
	AE.addEvent(window, 'keydown', (e) => { KeybState[e.code] = true; });
	AE.addEvent(window, 'keyup', (e) => { KeybState[e.code] = false; });
}

init();
	
const Debug = {
	getLayer,
	addAnimationDebug,
	addCrosshair,
	addBox,
	addRect,
}

export default Debug;
