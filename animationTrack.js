import { V2, Vector2 as Vec2, Vector2 } from "./types.js";

export const flip    = x => 1 - x;
export const easeIn  = t => t * t;
export const easeOut = t => flip(flip(t)**2);
export const lerp    = (s, e, t) => s + (e - s) * t;

/**
 * AnimationTrack object
 * A simple interpolator which modifies the property of a given object on every tick().
 * Basically any property of any object can be animated.
 * --------------------
 *  object      object              - object to be animated
 *  property    string              - property to be animated
 *  frame       number              - current frame (initialized to 0)
 *  duration    number              - as frames
 *  easing      string              - one of: ease-in | ease-out | ease-in-out | linear
 *  template    string              - template property can be used to animate properties which are strings. Hashtag # character is replaced by the interpolated value
 *  start       number              - start value for interpolation
 *  end         number              - end value for interpolation
 *  onEnd       function
 */

export class AnimationTrack {
    /**
     * Creates a new AnimationTrack object
     * @param {object} o parameters
     * @param {object} o.owner owner object 
     * @param {string} o.name Optional. Name of this AnimationTrack 
     * @param {boolean} o.autoPlay If true, set initial state to 'playing' instead of 'paused'
     */
    constructor(o) {
        this.owner  = o.owner;
        this.name   = o.name;
        this.list   = [];
        this.status = o.autoPlay === true ? 'playing' : 'paused';        
        this.frame  = 0;
        this.completed = 0;
        
        this.onEnd         = null;
        this.onComplete    = null;

        this.onResolvePlay = null;      // promise
    }

    clear() {
        this.list.length = 0;
    }

    /**
     * Adds a new AnimationClip in the list of animations.
     * @param {object} o parameters
     * @param {number} o.channel Optional. Channel number (defaults to 0)
     * @param {object} o.object Object to be animated
     * @param {string} o.property Object property to be animated
     * @param {string} o.easing Optional. Easing mode (ease-in, ease-out, ease-in-out)
     * @param {number|Vector2} o.start Starting interpolation value
     * @param {number|Vector2} o.end Ending interpolation value
     * @param {number} o.duration Duration of the animation in ticks
     * @param {number} o.startFrame Start Frame of the animation
     * @param {string} o.template String template if interpolated value is embedded in a string. Hashtag # in the string is replaced by the value.
     */
    add(o) {
        if (o.startFrame === undefined) throw new Error('AnimationTrack: Clip\'s startFrame must be defined.');
        this.list.push(o);
    }

    async play() {
        return new Promise(resolve => {
            this.onResolvePlay = resolve;
            this.status        = 'playing';
        })        
    }

    stop() {
        this.frame     = 0;
        this.completed = 0;
        this.status    = 'stopped';
    }
 
    tick() {        
        if (this.status != 'playing') return;

        for (let i = 0; i < this.list.length; i++) {            
            const ani = this.list[i];                
            
            if (this.frame < ani.startFrame) continue;                                                                 // is it time for this animation fragment to play yet?
            if (this.frame > ani.startFrame + ani.duration) continue;                                                  // is clip played to the end?

            const p = ani.object[ani.property];        
            if (p == null) throw new Error('AnimationTrack: Animated object property cannot be null.');

            const t = (this.frame - ani.startFrame) / ani.duration;

            let v = t;
            if (ani.easing == 'ease-in-out') v = lerp(easeIn(t), easeOut(t), t);
            if (ani.easing == 'ease-in')     v = easeIn(t);
            if (ani.easing == 'ease-out')    v = easeOut(t);
            
            if ('template' in ani) {
                ani.object[ani.property] = ani.template.replace('#', lerp(ani.start, ani.end, v));
            } else
            if (Vec2.IsVector2(p)) {                                                                                    // vec2                           
                ani.object[ani.property].x = lerp(ani.start.x, ani.end.x, v);
                ani.object[ani.property].y = lerp(ani.start.y, ani.end.y, v);            
            } else {                                                                                                    // number
                ani.object[ani.property] = lerp(ani.start, ani.end, v);
            }
            
            if (this.frame == ani.startFrame + ani.duration) {
                this.completed++;
                if (ani.onEnd) ani.onEnd(ani);                   
            } 
        }       

        this.frame++;       
        
        if (this.completed == this.list.length) {
            this.status = 'paused';
            if (this.onComplete) this.onComplete(this);
            if (this.onResolvePlay) this.onResolvePlay(this);
        }        
    }

}
