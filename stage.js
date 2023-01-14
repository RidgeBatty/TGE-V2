/**
 * Planned feature to add "scenes" in the gameLoop
 * Instead of attaching the actors, layers, etc. directly in the gameLoop, it might make more sense to organize them in Stages
 * TGE has no such concept because usually the game runs only one scene at any given time anyway
 * But for editors and tools it is a useful enhancement.
 */
export class Stage {
    constructor(ownerGameLoop) {
        this.actors  = [];
        this.zLayers = [];
    }
}