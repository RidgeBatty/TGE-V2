/**

	Debug Tools for TGE
	Written by Ridge Batty (c) 2021
	
**/
import { Actor, Engine } from '../engine.js';
import { Enum_HitTestMode, Transform } from '../root.js';
import { ID, addElem, addEvent, getEnumKey } from '../utils.js';

console.warn('TGE DEBUG TOOLS are enabled!');

const sheet = new CSSStyleSheet();
sheet.insertRule('.tge-debug    { position:absolute; left:10px; top:10px; color:lime; text-shadow:1px 1px 1px black; font:12px monospace; pointer-events:none; }'); 
sheet.insertRule('.tge-controls { position:absolute; left:10px; bottom:10px; color:lime; text-shadow:1px 1px 1px black; font:12px monospace; pointer-events:none; }'); 
sheet.insertRule('h3 { margin-block-end:0; text-decoration:underline  }'); 
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

const el = {
	uptime : null,
	fps    : null,
	delta  : null,
	actors : null,
	olaps  : null,
	edges  : null,
	logic  : null,
	particles : null,
}

const onTick      = Engine.gameLoop._tick;
const onRender    = Engine.gameLoop._render;
const overlapFunc = Actor.prototype._testOverlaps;
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
const ath = {
	collisionCheckTime : 0,
}
const KeybState = [];

let overlapCallCount = 0;
let totalOverlaps    = 0;
let isPaused         = false;
let debugLayer       = null;
let controlLayer     = null;

/*
	Adds a layer (HTMLElement) for debug information (singleton)
*/
const addLayer = (elem = Engine._rootElem) => {
	debugLayer   = addElem({ parent:elem, tagName:'tge-debug' });	
	controlLayer = addElem({ parent:elem, tagName:'tge-controls' });	

	debugLayer.innerHTML = '<h3>TGE Debug Layer</h3>';

	for (const k of Object.keys(el)) el[k] = addElem({ parent:debugLayer });
}

const getLayer = () => {
	return debugLayer;
}

const pad = (variable, digits = 2) => {
	return ('' + variable).padStart(digits, '0');
}

Actor.prototype._testOverlaps = function(other) {
	overlapFunc.call(this, other);
	overlapCallCount++;
}

Engine.gameLoop._render = function(ts) {
	const gameLoop = Engine.gameLoop;

	overlapCallCount = 0;
	
	onRender.call(gameLoop, ts);
	
	fps.current = Engine.getFPS();
	if (isFinite(fps.current) && Engine.gameLoop.frameCount > 60) {
		if (fps.current < fps.min) fps.min = fps.current;
		if (fps.current > fps.max) fps.max = fps.current;
	}
	fps.total = gameLoop.frameCount;
	
	logic.current = gameLoop._lastTick;
	if (isFinite(logic.current) && gameLoop.tickCount > 60) {
		if (logic.current < logic.min) logic.min = logic.current;
		if (logic.current > logic.max) logic.max = logic.current;
	}
	if (logic.current > 5) logic.above5ms++;
	
	if (el.uptime) el.uptime.textContent = `Uptime: ${gameLoop.runningTime.toFixed(2)} sec`;
	if (el.fps)    el.fps.textContent    = `FPS: ${pad(fps.current)} | Min ${pad(fps.min)} | Max ${fps.max} | Total frames ${fps.total}`;
	if (el.delta)  el.delta.textContent  = `Frame delta: ${gameLoop.frameDelta.toFixed(2)}ms`;
	if (el.logic)  el.logic.textContent  = `Game logic: ${gameLoop.tickCount} ticks | ${gameLoop._tickQueue} queued | ${logic.current.toFixed(2)}ms | Min ${logic.min.toFixed(2)}ms | Max ${logic.max.toFixed(2)}ms | >5ms ${logic.above5ms} (${(logic.above5ms/fps.total*100).toFixed(2)}%)`;
	if (el.actors) el.actors.textContent = `Actors: ${pad(gameLoop.actors.length, 3)} | zLayers: ${gameLoop.zLayers.length}`;
	if (el.olaps)  {
		if (gameLoop.collisionCheckTime > ath.collisionCheckTime) ath.collisionCheckTime = gameLoop.collisionCheckTime;
		el.olaps.textContent  = `Overlaps: Currently Testing ${pad(overlapCallCount,3)} | Total Detected ${pad(totalOverlaps,3)} | Test Time ${gameLoop.collisionCheckTime.toFixed(2)}ms | Max ${ath.collisionCheckTime.toFixed(2)}ms`;		
	}
	if (el.edges)  el.edges.textContent  = `Edges: L=${Engine.edges.left} | T=${Engine.edges.top} | R=${Engine.edges.right} | B=${Engine.edges.bottom}`;
	
	const ps = gameLoop.particleSystems;
	if (ps) {
		let pc = 0, ac = 0, ec = 0;
		ps.forEach(ps => ps.emitters.forEach(e => { ec++; pc += e.particles.length; ac += e.activeParticleCount; }));
		if (el.particles)  el.particles.textContent  = `Particle System: Emitters ${ec} | Particles: ${pc} | Active: ${ac}`;
	}

	if (el.player)  {
		let result = '<h3>Player Info</h3>';
		const p = gameLoop.players[0];
		const s = [];
		if (p?.flipbooks) {
			let i = 0;
			p.flipbooks.forEach(f => { 
				const sequences = f.sequenceList.map(m => (f.sequence?.name == m.name) ? `(${m.name})` : `&nbsp;${m.name}&nbsp;`).join(''); 
				s.push(`Flipbook #${i++} Sequences: ${sequences}<br>`)
			});
		}

		const transform = p?.transform.asString(2, ['Position: ', 'Rotation: ', 'Scale: ']);
		result += `Players: ${gameLoop.players.length} | Player #0 | Name ${p?.name}<br>`;
		result += `Controllers: ${Object.keys(p.controllers).join(',')}<br>`;
		result += `Colliders: ${p?.colliders?.objects.length}<br>`;
		if (p.hasColliders) {
			result += `Collision channels:<br>`;
			for (const [k, v] of Object.entries(p.hitTestFlag)) {								
				const modeName = getEnumKey(Enum_HitTestMode, v);
				result += `&nbsp;${k}: ${modeName}<br>`
			}
		}
		result += `${transform}<br>Flipbooks: ${p?.flipbooks?.length}<br>${s}`;

		el.player.innerHTML = result;
	}

	if (el.zLayers)  {
		const zLayers = gameLoop.zLayers;
		let result = '<h3>Z-Layers</h3>';
		let i = 0;
		for (const z of zLayers) {
			let objects = {};
			for (const o of z) {
				const name = o.constructor.name;
				if (objects[name] == null) objects[name] = 0;
				objects[name]++;									
			}
			
			let objectInfo = [];
			for (const [k, v] of Object.entries(objects)) objectInfo.push(`${k} (${v})`);
			result += `${i++}:${objectInfo.join('|')}<br>`;			
		}
		el.zLayers.innerHTML = result;
	}

	if (controlLayer) {		
		const keys = Object.keys(KeybState).filter(e => KeybState[e] != false).join(' ');
		controlLayer.innerHTML = `Keys: ${keys}<br>Mouse: Screen ${mouse.x}:${mouse.y} | Viewport ${Engine.mousePos.asString()} | Touches:<br>Toggle Details: (P)layer, (Z)-Layers`;
	}
	
}

Engine.gameLoop._tick = () => {
	onTick.call(Engine.gameLoop);
	totalOverlaps += Engine.gameLoop.overlaps.length;					// number of overlap events after a tick is completed: if two actors overlap each other, this will increase by 2 (it can never increase by 1)
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
		var div = addElem({ parent:relativeTo, tagName:'tge-collider-bg-blue' });
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
		var div  = addElem({ parent:Engine._rootElem });
		var vert = addElem({ parent:div, tagName:'tge-collider-bg-blue' });
		var horz = addElem({ parent:div, tagName:'tge-collider-bg-blue' });
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
	
	addEvent(window, 'mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
	addEvent(window, 'keydown', (e) => { KeybState[e.code] = true; });
	addEvent(window, 'keyup', (e) => { 
		KeybState[e.code] = false; 
		if (e.code == 'KeyP') {			
			if (el.player) { el.player.remove(); delete el.player; } else { el.player = addElem({ parent:debugLayer }); el.player.style.marginLeft = '1em'; }
		}
		if (e.code == 'KeyZ') {			
			if (el.zLayers) { el.zLayers.remove(); delete el.zLayers; } else { el.zLayers = addElem({ parent:debugLayer }); el.zLayers.style.marginLeft = '1em'; }
		}
	});
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

