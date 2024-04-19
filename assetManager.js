/**
 * @desc
 * AssetMananger for TGE
 * =====================
 * 
 * Important usage note!
 * 
 * Since AssetManager creates an in-memory copy of the game assets, custom, extended and singleton objects (such as the Player) might be problematic. 
 * Be careful when creating stuff in the constructor of your extended Actor, since those objects and properties will not be automatically cloned 
 * when AssetManager.spawn() is called! Instead you should add an init() method to your extended/custom actor and call it manually after calling AssetManager.spawn()
 * 
 * Currently only the following objects/properties inside "params" object are parsed automatically:
 *  - Vector2
 *  - data                  ( may contain only JSON parseable types )
 * 
 * Everything else is sent to the Actor's constructor as is.
 * 
 */

import { Engine, Actor, Enum_ActorTypes, Types } from './engine.js';
import { Flipbook } from './flipbook.js';
import { Box, Circle, Poly } from './physics.js';
import { getJSON, preloadImages, sealProp } from './utils.js';

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
        else if (useDefault != undefined) target[field] = useDefault;
}

class AssetManager {
    /**
     * 
     * @param {TinyGameEngine} engine 
     * @param {boolean} assignAsDefault Assign this assetManager as Engine's default asset manager
     */
    constructor(engine, assignAsDefault = true) {
        this.engine        = engine;        
        this.onDeserialize = null;

        sealProp(this, 'flags', {
            addActorsToGameLoop : false,            
        });

        this.assets = {
            actors        : [],
            images        : [],
            emitterParams : [],                                                  // particle system emitter parameters
            audio         : [],
        };

        if (assignAsDefault) this.engine.assetManager = this;
    }

    getAssetByName(str) {
        const actor = this.assets.actors.find(e => e.name == str);
        if (actor) return actor;

        const image = this.assets.images.find(e => e.name == str);
        if (image) return image;
    }

    /**
     * 
     * @param {function} e Predicate function. Each image asset is sent to the predicate function as a parameter. Return the value you want to collect to the resulting array.
     * @returns {array}
     */
    filterImages(e) {
        const res = [];
        this.assets.images.forEach(f => { const r = e(f); if (r) res.push(r); });
        return res;
    }

    /**
     * Creates a new actor from (H)JSON data. 
     * By default the actor is created and stored only in the assetManager as an offline 'class' ready to be instantiated quickly
     * Optionally this method adds the new actor into the gameloop (if assetManager.flags.addActorsToGameLoop is set to true)     
     * @param {object} data Parsed (H)JSON object containing asset information
     * @param {object} o Parameters of AssetManager.load() call
     * @returns 
     */
    async parseActor(data, o) {
        const params = data.params;  

        setDef(params, params, 'position');
        setDef(params, params, 'zIndex');
        setDef(params, params, 'scale');
        setDef(params, params, 'rotation');
        setDef(params, params, 'offset');
        setDef(params, params, 'origin');
        setDef(params, params, 'imgUrl');
        setDef(params, params, 'imageReload', false);                                              // this will cause the actor to delete the "imgUrl" property after the image is loaded (effectively causing all clones to recycle the image object)

        // check if a custom constructor was given to this actor (or not, in which case use the built-in actor types)
        if ('class' in data && 'constructors' in o && o.constructors[data.class]) {             
            var actor = new o.constructors[data.class](params);                           
        } else 
            var actor = Engine.gameLoop.createTypedActor(params.type, params);        

        if (this.onDeserialize) this.onDeserialize(actor, data, o);                                 // callback when AssetManager is about to deserialize an actor
        
        if (data.data) actor.data = data.data;                                                      // user data        

        if (Array.isArray(data.audio)) {                                                            // audio files
            for (const a of data.audio) {
                Engine.audio.add(a);
                actor.addAudio(a);
            }
        }
        if (data.flipbooks) actor.flipbooks = await Flipbook.Parse(data.flipbooks, actor);          // create flipbooks

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

    /**
     * Loads an asset using ".asset.hjson" file
     * @param {object} o parameters object
     * @param {string} o.url URL to ".asset.hjson" file
     * @param {object} options Optional "options" object which is sent to the deserialization method
     * @returns 
     */

    async loadAsset(o, options) {
        const s = await getJSON(o.url);                
        if (s.type == 'actor') {
            if (this.getAssetByName(s.data.params.name) == null) {
                const actor = await this.parseActor(s.data, options);
                return this.assets.actors.push(actor);            
            } else {
                console.warn('Duplicate actor:', s.data.params.name);
            }
            return null;
        } 
        if (s.type == 'images') {
            const names  = s.data.map(e => e.name);
            const data   = s.data.map(e => e.data);
            const path   = s.path ? s.path : '';
            const images = await preloadImages({ path, urls:s.data.map(e => e.url) });
            const result = [];
            for (let i = 0; i < images.length; i++) {
                result.push({ name:names[i], image:images[i], data:data[i] });
                this.assets.images.push(o);
            }
            return result;
        } 
        throw 'Only object types "actor" and "images" is supported by the AssetManager';
    }

    /**
     * Loads a bunch of ".asset.hjson" files
     * @param {object} o 
     * @param {string} o.path Optional. Path shared by urls
     * @param {array} o.urls Array of urls
     * @param {*} options 
     */
    async load(o, options) {
        if ('urls' in o) {
            for (const u of o.urls) {
                let url = u;
                if (u.indexOf('.') == -1) url += '.asset.hjson';                        // if no dots are found in the url, assume '.asset.hjson' extension
                if ('path' in o) url = o.path + url;
                await this.loadAsset({ url }, options);
            }
        }        
    }

    /**
     * Spawns a new Actor from the internal stash of AssetManager
     * @param {string|Actor} asset the asset must exist in AssetManager internal stash
     * @param {*} o Optional. Pass createparams to the asset (if applicable)
     * @returns 
     */
    spawn(asset, o = {}) {
        if (typeof asset == 'string') {
            const test = this.getAssetByName(asset);
            if (test == null) throw new Error('Asset not found: ' + asset);
            asset = test;                                                               // proceed to (attempt to) create the actor 
        }
        if (asset instanceof Actor) {      
            const actor = asset.clone(true, o);
            if (actor.onSpawn) actor.onSpawn();                                         // call onSpawn()
            return actor;
        }        
    }
}

export { AssetManager }