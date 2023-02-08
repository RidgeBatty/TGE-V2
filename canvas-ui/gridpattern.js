import { Vector2 as Vec2, V2, Rect, RECT } from '../../types.js';

export function drawGridPattern() {
    const { settings } = this;
    const s = this.surface;
    const f = this.background.frame;                
    const t = s.ctx.getTransform();
    const sx = this.size.x;
    const sy = this.size.y;

    s.drawImage(V2(0, 0), f[0]);                                                        // 0 - top left

    s.ctx.fillStyle = s.ctx.createPattern(f[1], 'repeat-x');                            // 1 - top
    s.ctx.translate(f[0].width, 0);
    s.ctx.fillRect(0, 0, sx - (f[0].width + f[2].width), f[1].height);
    s.ctx.setTransform(t);
    
    s.drawImage(V2(sx - f[2].width, 0), f[2]);                                          // 2 - top right

    s.ctx.fillStyle = s.ctx.createPattern(f[3], 'repeat-y');                            // 3 - right
    s.ctx.translate(sx - f[2].width, f[2].height);
    s.ctx.fillRect(0, 0, sx - f[2].width, sy - (f[2].height + f[4].height));
    s.ctx.setTransform(t);

    s.drawImage(V2(sx - f[4].width, sy - f[4].height), f[4]);                           // 4 - bottom right

    s.ctx.fillStyle = s.ctx.createPattern(f[5], 'repeat-x');                            // 5 - bottom
    s.ctx.translate(f[6].width, sy - f[5].width);
    s.ctx.fillRect(0, 0, sx - (f[4].width + f[6].width), f[5].height);
    s.ctx.setTransform(t);
    
    s.drawImage(V2(0, sy - f[6].height), f[6]);                                         // 6 - bottom left

    s.ctx.fillStyle = s.ctx.createPattern(f[7], 'repeat-y');                            // 7 - left
    s.ctx.translate(0, f[1].height);
    s.ctx.fillRect(0, 0, sx - f[2].width, sy - (f[0].height + f[6].height));
    s.ctx.setTransform(t);
}