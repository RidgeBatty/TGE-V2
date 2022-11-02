/*

	VideoStream
	Tiny Game Engine
	Written by Ridge Batty (c) 2021	

    Module for drawing individual frames of a video file on a canvasSurface, for more control over the graphics
	
*/
import * as Utils from './utils.js';
import { Engine, Types } from './engine.js';
import { CanvasSurface as Surface } from './canvasSurface.js';
const Vec2 = Types.Vector2;

class VideoStream {
    constructor(name) {
		this.name   = name;
		this.frames = [];		
	}

	async load(url, preload = false) {
		this.elem = await Utils.preloadVideo({ url, muted:true, promise:preload });		
		return this.elem;
	}

	/**
	 * Converts a video to a list of CanvasSurface objects
	 * @param {object} o
	 * @param {number?} o.frames give either the number of "frames" to extract, or "startFrame" and "endFrame"
	 * @param {number?} o.startFrame
	 * @param {number?} o.endFrame
	 * @param {function?} o.onGetFrame
	 * @returns 
	 */
	async unpackFrames(o) {							
		// legacy solution to seek to frame:
		return new Promise(async resolveUnpack => {
			this.frames = [];

			const startFrame = 'startFrame' in o ? o.startFrame : 0;
			const endFrame   = 'endFrame' in o   ? o.endFrame + 1 : o.frames;
			const frames     = endFrame - startFrame;

			const v = this.elem;
			let onFramePainted, i;

			async function paintFrame() {
				return new Promise(resolve => {						
					onFramePainted = resolve;				
				});
			}

			AE.addEvent(v, 'seeked', _ => { 			
				const s = new Surface({ dims:{x:v.videoWidth, y:v.videoHeight } });			
				s.drawImage(Vec2.Zero(), v);		
				this.frames.push(s);			
				if ('onGetFrame' in o) o.onGetFrame({ surface:s, frameNumber:i })
				onFramePainted();
			});

			await v.play();
			await v.pause();
			const secsPerFrame = v.duration / frames;		
					
			for (i = startFrame; i < endFrame; i++) {	
				v.currentTime = i * secsPerFrame;			
				await paintFrame();
			}	
			
			resolveUnpack();
		});
	}
}

export { VideoStream }