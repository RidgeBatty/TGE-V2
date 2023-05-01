/**
 * Timeline
 * 
 * This class provides methods and properties to manipulate keyframed timelines. 
 * Timelines are more resource intesive and complex constructs than Flipbook Sequences. They allow more precise control over the display of individual frames of animations.
 * Note! 
 *  - Current version of timeline is an abstract class which does not include any way to display the animations. 
 *  - No interpolation between keyframe properties is done.
 *  - Serialization methods use encoded data instead of HJSON to conserve resources.
 */

import { Vector2 as Vec2, V2 } from '../../engine/types.js';
import { clamp } from "../../engine/utils.js";
import { Deserializer, DATATYPES } from './deserializer.js';

export class Keyframe {
    constructor(o) {
        this.timeline  = o.timeline;
        this.translate = Vec2.Zero();
        this.pivot     = Vec2.Zero();
        this.angle     = 0;
        this.scale     = 1;
        this.opacity   = 1;
        this.filter    = 'none';    
    }
}

export class Timeline {
    /**
     * Create a new Timeline instance 
     * @param {object} o 
     * @param {boolean|number} o.loop
     */
    constructor(o) {
        this.track      = [];
        this._playhead  = 0;
        this.loop       = ('loop' in o) ? o.loop : false;
        this.name       = ('name' in o) ? o.name : 'Noname';
        this.zLayersMax = 5;

        this.FPS        = 1;
        this.lengthMax  = 300;
        this.start      = 0;
        this.end        = 9;
        this.precision  = 1;                                                                // keyframe multiplier for increased precision (playhead is always moved using integer values)
    }

    set playhead(v) {
        this._playhead = v;
        this._playhead = clamp(this._playhead, this.start * this.precision, this.end * this.precision);
    }

    get playhead() {
        return this._playhead;
    }

    get frame() {
        return Math.floor(this._playhead / this.precision);
    }

    /**
     * Returns the list of Keyframes in the current playhead position
     * Iterate this list to draw the frames in correct z-order
     */
    get trackPosition() {
        return this.track[this.frame];
    }

    /** 
     * Overwrites a position in the track with new keyframe
     */
    addKeyframe(position, zLayer, info) {
        const v = this.track[position];
        if (v == null) this.track[position] = [];                                           // each playhead position contains an array of z-layers
        
        this.track[position][zLayer] = info;

        info.index         = clamp(position, 0, this.lengthMax - 1);
        info.zLayer        = clamp(zLayer, 0, this.zLayersMax - 1);
        info.timeline      = this;
    }

    getKeyframe(position, zLayer) {
        const tp = this.track[position];
        if (!tp) return null;
        return tp[zLayer];
    }
    
    moveKeyframeTo(position, zLayer, keyframe) {
        try {
            const f = this.track[keyframe.index][keyframe.zLayer];
            if (f == null) throw '[Timeline] Keyframe not found';
            
            this.track[keyframe.index][keyframe.zLayer] = null;                             // delete old keyframe position
            this.addKeyframe(position, zLayer, keyframe);                                   // add a new one
        } catch (e) {
            if (typeof e == 'string') console.warn(e);
                else {
                    console.warn('[Timeline] Error in moving keyframe');            
                    console.log(e);
                }
        }     
    }

    /**
     * Advance to next (or previous) keyframe on the timeline
     */
    step(direction = 1) {
        if (direction == 1) {
            if (this._playhead >= this.end * this.precision && this.loop) return this.toStart();        
        } else {
            if (this._playhead <= this.start * this.precision && this.loop) return this.toEnd();            
        }
        this.playhead += this.precision * direction;
    }

    /**
     * Moves the playhead to starting position
     */
    toStart() {
        this.playhead = this.start * this.precision;
    }

    /**
     * Moves the playhead to ending position
     */
    toEnd() {
        this.playhead = this.end * this.precision;
    }

    static async Parse(data) {
        const t = new Timeline({});
        const d = new Deserializer({ data });

        const idString = d.decode().data;

        if (idString.endsWith('v01.00')) throw 'Unsupported timeline version';
        
        t.name       = d.decode().data;                                     // name of the timeline
        t.start      = d.decode().data;                                     // starting keyframe
        t.end        = d.decode().data;                                     // ending keyframe
        t.FPS        = d.decode().data;                                     // frames per second
        t.loop       = d.decode().data;                                     // loop
        t.precision  = d.decode().data;                                     // precision
        t.playhead   = d.decode().data;                                     // playhead position        

        const isCustomData = d.decode().data;                               // custom data block?
        if (isCustomData) t.data = d.decode().data;                         // custom data is always a medium text string (up to 65k bytes)
 
        t.track.length = d.decode().data;                                   // track length

        for (let i = 0; i < d.track.length; i++) {
            const zLayers = d.decode().data;                                // number of z layers            

            t.track[i] = [];                                                // create z-layers

            for (let z = 0; z < zLayers; z++) {
                const layerFlags = d.decode().data;

                if (layerFlags == 0) continue;                              // Empty Z-layer

                // Active Z-layer (may contain 8-bit flags register in the future where the first bit is always set)

                const keyframe = {                                          // keyframe data
                    translate : d.decode().data,
                    pivot     : d.decode().data,
                    angle     : d.decode().data,
                    scale     : d.decode().data,
                    opacity   : d.decode().data,
                    filter    : d.decode().data,
                }
                t.addKeyframe(i, z, keyframe);                
            }
        }        
        return t;
    }
} 