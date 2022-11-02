class Weapon {
    constructor(owner, args = {}) {
        this.owner       = owner;
        this.reloadDelay = 60;                  // ticks
        this.reloading   = 60;                  // time left
        this.name        = 'name' in args ? args.name : '';

        owner.owner.owner.tickables.push(this);     // add to gameLoop tickables
    }

    tick() {
        if (this.reloading > 0) this.reloading--;
    }

    fire() {
        if (this.reloading == 0) {
            this.reloading = this.reloadDelay;
            return true;
        }
    }
}

export { Weapon }