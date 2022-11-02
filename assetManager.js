import { Engine, Actor, Enum_ActorTypes, Types } from './engine.js';
import { Flipbook } from './flipbook.js';
import { Box, Circle, Poly } from './physics.js';
import { getJSON } from './utils.js';

const { V2 } = Types;

const validateFields = (o, list) => {

}

const unpackVec2 = (data) => {
    if (!(typeof data == 'object') && data != null) return;
    const keys = Object.keys(data);
    if (keys.length == 2 && keys.includes('x') && keys.includes('y')) return V2(data.x, data.y);        
}

const setDef = (target, source, field, useDefault) => {
    let src = source[field];
    if (typeof src == 'object') {
        let result = unpackVec2(src);
        if (result) target[field] = result;
        return;
    }
    if (field in source) target[field] = src;
        else if (useDefault) target[field] = useDefault;
}

class AssetManager {
    constructor() {
        this.flags = {
            addActorsToGameLoop : false,            
        }
        this.assets = {
            actors : []
        }
    }

    getAssetByName(str) {
        return this.assets.actors.find(e => e.name == str);
    }

    /**
     * Creates a new actor from JSON data. 
     * By default the actor is created and stored only in the assetManager as an offline 'class' ready to be instantiated quickly
     * Optionally this method adds the new actor into the gameloop (if assetManager.flags.addActorsToGameLoop is set to true)     
     * @param {*} data 
     * @returns 
     */
    async deserializeActor(data) {
        const params = {};

        setDef(params, data, 'type', 'actor');
        setDef(params, data, 'zIndex');
        setDef(params, data, 'scale');    
        setDef(params, data, 'rotation');
        setDef(params, data, 'position'); 
        setDef(params, data, 'offset'); 
        setDef(params, data, 'pivot'); 
        setDef(params, data, 'name');    
        setDef(params, data, 'isVisible', true);
        setDef(params, data, 'imgUrl');    
        
        const actor = Engine.gameLoop.createTypedActor(params.type, params);

        if (data.data) actor.data = data.data;
        
        if (data.flipbooks) {                                                                       // create flipbooks
            for (const fb of data.flipbooks) {
                const flipbook = new Flipbook({ actor, fps:fb.fps });            
                await flipbook.createSequencesFromVideo(fb.sequences);

                if ('autoplay' in fb) {
                    const seq = flipbook.sequences[fb.autoplay];
                    if (seq) seq.play();
                }
            }            
        }
    
        if (data.colliders) {                                                                       // create colliders
            for (const c of data.colliders) {                
                if (c.type == 'circle') {
                    actor.addCollider(new Circle(unpackVec2(c.position), c.radius));
                    continue;                    
                }

                const angle = ('angle' in c) ? c.angle : undefined;

                if (c.type == 'box') {                    
                    actor.addCollider(new Box(V2(c.points[0], c.points[1]), V2(c.points[2], c.points[3]), angle));
                    continue;
                }                
                if (c.type == 'poly') {                    
                    const p = new Poly(unpackVec2(c.position), angle);
                    p.fromArray(c.points);                    
                    actor.addCollider(p);
                    continue;
                }
            }
        }

        if (this.flags.addActorsToGameLoop) Engine.gameLoop._addActor(actor);
            else actor.owner = Engine.gameLoop;
        
        return actor;
    }

    async loadAsset(o) {
        const s = await getJSON(o.url);
        if (s.type == 'actor') {
            const actor = await this.deserializeActor(s.data);            
            this.assets.actors.push(actor);
        }
    }

    async load(o) {
        if ('urls' in o) {
            for (const u of o.urls) {
                let url = u;
                if ('path' in o) url = o.path + url;
                await this.loadAsset({ url });
            }
        }        
    }

    /**
     * Spawns a new Actor from the internal stash of AssetManager
     * @param {string|Actor} asset the asset must exist in AssetManager internal stash
     * @param {*} o 
     * @returns 
     */
    spawn(asset, o = {}) {
        if (typeof asset == 'string') {
            asset = this.getAssetByName(asset);
        }
        if (asset instanceof Actor) {
            const actor = asset.clone(true);
            if ('position' in o) actor.position = o.position;
            return actor;
        }
    }
}

export { AssetManager }