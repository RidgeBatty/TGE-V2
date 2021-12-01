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
		this.name = name;
	}

	async load(url) {
		this.elem = await Utils.preloadVideo({ url, muted:true });		
		return this.elem;
	}

	async unpackFrames(o) {							// o:{ frames:Number, ?onGetFrame:Function }
		// legacy solution to seek to frame:
		return new Promise(async resolveUnpack => {
			this.frames = [];

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
			const secsPerFrame = v.duration / o.frames;		
					
			for (i = 0; i < o.frames; i++) {				
				v.currentTime = i * secsPerFrame;			
				await paintFrame();
			}	
			
			resolveUnpack();
		});
	}
}

export { VideoStream }