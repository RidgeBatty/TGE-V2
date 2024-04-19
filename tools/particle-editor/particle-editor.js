import * as TGE from '../../engine.js';
import { ParticleSystem }  from '../../particles.js';
import { getJSON, loadedJsonMap } from '../../utils.js';
import '../../ext/hjson.min.js';

const Engine = TGE.Engine;	

class ParticleEditor {        
    constructor() {
        this._followMouse   = false;
        this._autoCenter    = true;
        this._text          = '';
        this.recreatePS();
    }

    recreatePS() {
        if (this.particleSystem) this.particleSystem.destroy();
        this.particleSystem = new ParticleSystem(Engine);        
    }

    async fromParams(params) {
        console.log('Recreate the emitter');
        this.recreatePS();

        const emitter = await this.particleSystem.addEmitter(params);                
        this.emitter  = emitter;

        //emitter.analyze(params);        
        emitter.position = Engine.dims.mulScalar(0.5);
        emitter.addEvent('tick', e => this._onEmitterTick(e));
        emitter.start(); 
    }

    async fromEditorContent(text) {
        try {
            const p = Hjson.parse(text);
            this._text = text;
            await this.fromParams(p);
        } catch (e) {              
            return e;            
        }
    }

    async loadFromFile(f) {
        const params = await getJSON(f, true);
        this._text   = loadedJsonMap.get(params).text;
        await this.fromParams(params);
    }

    parse(text, filename, recreate) {        
        const isHjson = filename.split('.').pop().toLowerCase() == 'hsjon';
        let p;

        if (isHjson) {
            try { 
                p = Hjson.parse(text);              
            } catch (e) { 
                return e;
            }
        } else {
            try { 
                p = JSON.parse(text);              
            } catch (e) { 
                return e;
            }            
        }                
        if (recreate && p) this.params(p);
        return p;
    }

    _onEmitterTick(e) {
        if (this.followMouse) e.instigator.pivot = Engine.mousePos;             
        if (this.autoCenter)  e.instigator.pivot = Engine.dims.mulScalar(0.5);
    }

    get followMouse() {
        return this._followMouse;
    }

    set followMouse(v) {
        if (typeof v == 'boolean') this._followMouse = v;
    }

    get autoCenter() {
        return this._autoCenter;
    }

    set autoCenter(v) {
        if (typeof v == 'boolean') this._autoCenter = v;
    }
}

export { ParticleEditor }
