/**
 * AnimationPlayer
 * ---------------
 * Animations are collections of flipbooks (keyframe animation sets)
 * 
 * Call "AttachAnimationPlayer(actor)" to create the animation player and attach it to an Actor. 
 * It will replace the animation rendering mechanism of the actor (actor._renderAnimations).
 * 
 * written by Ridge Batty (c) 2023
 */

export class AnimationPlayer {
    constructor(actor) {
        this.actor      = actor;
        this.actor.animationPlayer = this;
        this.animations = [];
        this.current    = null;
        this.isPaused   = true;

        actor._renderAnimations = function(c) {	
            const animation = this.animationPlayer.current;

            animation.frames.length = 0;
            for (const fb of animation.flipbooks) {
                const n = fb.customRender;		
                
                if (n.img) {
                    let z = 0;
                    z = fb.sequence?.zOrder && Array.isArray(fb.sequence.zOrder) ? fb.sequence.zOrder[~~fb.sequence.frameIndex] : fb.sequence.zOrder;
                    
                    animation.frames.push({ fb, n, z, index:~~fb.sequence.frameIndex, seq:fb.sequence });                
                }
            }

            animation.frames.sort((a, b) => a.z - b.z);
            
            for (const frame of animation.frames) {
                const { n, fb, index, seq } = frame;
                const { rotation, scale, origin, size, offset, renderHints, renderPosition } = this;			
                
                size.x = n.w;
                size.y = n.h;

                const x  = (seq.ofs.length > 0) ? seq.ofs[index * 2 + 0] : 0;
                const y  = (seq.ofs.length > 0) ? seq.ofs[index * 2 + 1] : 0;

                const rx = (seq.rot.length > 0) ? seq.rot[index * 3 + 0] : 0;
                const ry = (seq.rot.length > 0) ? seq.rot[index * 3 + 1] : 0;
                const r  = (seq.rot.length > 0) ? seq.rot[index * 3 + 2] : 0;
/*
                if (fb.name == 'male-mining-head') c.filter = 'hue-rotate(-30deg) saturate(2.5) brightness(2)';    
                    else
                if (fb.name == 'mine-head-original') c.filter = 'hue-rotate(30deg) saturate(2.5) brightness(2)';
                    else c.globalAlpha = 0.5;
  */              
                c.setTransform((renderHints.mirrorX ? -1 : 1) * scale, 0, 0, (renderHints.mirrorY ? -1 : 1) * scale, renderPosition.x + offset.x + x, renderPosition.y + offset.y + y);
                c.rotate(rotation);
                if (seq.rot.length > 0) {
                    c.translate(rx, ry);
                    c.rotate(r);
                    c.translate(-rx, -ry);
                }
                c.translate(size.x * origin.x, size.y * origin.y);

                if (fb.filter) c.filter = fb.filter;
                if (fb.isAtlas) {						                                        // atlas
                    c.drawImage(n.img, n.a * n.w, n.b * n.h, n.w, n.h, 0, 0, n.w, n.h);                    
                    /*
                    if (fb.name == 'male-mining-head') {
                        c.font = '20px arial';
                        c.fillText(index, 0, 0);
                    }
                    */                
                } else {                                                                        // NOT Atlas - the flipbook contains an array of images
                    if (n.img.isCanvasSurface) c.drawImage(n.img.canvas, 0, 0);							
                        else c.drawImage(n.img, 0, 0);                
                }
    //            c.globalAlpha = 1;
                c.filter = 'none';
            }
        }
	}

    add(name, flipbooks, noClone) {
        const a = new Animation({ animationPlayer:this, name });
        this.animations.push(a);

        let i = 0;
        for (let f of flipbooks) {
            if (noClone) a.flipbooks.push(f);
                else a.flipbooks.push(f.clone());            
        }  
        
        this.current = a;
        return a;
    }

    /**
     * Plays a sequence named "sequenceName" in all flipbooks in the given animation "animationName"
     * @param {string} animationName 
     * @param {string} sequenceName 
     * @param {boolean} doNotRestart (Optional) do not restart the animation if it's already playing!
     * @returns 
     */
    play(animationName, sequenceName, doNotRestart = false) {
        const a = this.animations.find(f => f.name == animationName);
        if (!a) return null;

        this.current  = a;        
        for (const fb of a.flipbooks) fb.play(sequenceName, doNotRestart);
        this.isPaused = false;
        return a;
    }

    pause() {
        if (!this.current) return;

        if (!this.isPaused) {
            for (const fb of this.current.flipbooks) fb.stop();
            this.isPaused = true;            
        } else {
            for (const fb of this.current.flipbooks) if (fb.sequence) fb.sequence.isPaused = false;
            this.isPaused = false;
        }
    }

    /**
     * Attempts to roll back all sequences by 1 frame
     */
    moveBy(frames) {
        if (!this.current) return;

        for (const fb of this.current.flipbooks) if (fb.sequence) {
            const s = fb.sequence;
            const delta = s.frame - s.start;
            if (s.start + delta + frames < s.start) return s.playHead = s.start * 64;
            if (s.start + delta + frames > s.end) return s.playHead = s.end * 64;
            s.playHead = s.start * 64 + (delta + frames) * 64;
        }
    }

    changeSequence(offset) {
        if (!this.current) return;

        for (const fb of this.current.flipbooks) {
            const s = Object.values(fb.sequences);
            const currentIndex = s.indexOf(fb.sequence);
            if (currentIndex == -1) continue;

            const n = s[currentIndex + offset];
            if (n == null) continue;

            fb.sequence = n;
            fb.sequence.seek(0);                     // seek to first frame
        }
    }

    nextSequence() {
        this.changeSequence(1);
    }

    prevSequence() {
        this.changeSequence(-1);
    }

    tick() {                
        if (!this.current) return;
        for (const fb of this.current.flipbooks) fb.tick();
    }
}
export class Animation {
    constructor(o) {
        this.animationPlayer = o.animationPlayer;
        this.name            = o.name;
        this.flipbooks       = [];        
        this.frames          = [];
    }
}

export const AttachAnimationPlayer = (actor) => new AnimationPlayer(actor);