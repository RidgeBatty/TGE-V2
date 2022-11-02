
class Hitpoints {
    constructor(hp = 100, maxHP = 100, lives = 1) {
        this._HP    = hp;
        this._maxHP = maxHP;
        this.lives  = lives;
    }
    
    assignTo(actor) {        
        actor.events.create('damage death');        
    }

    set HP(value) {
        this._HP = AE.clamp(value, 0, this._maxHP); 
    }
    get HP() {
        return this._HP;
    }

    set maxHP(value) {
        this._maxHP = value;
        this._HP    = value;
    }
    get maxHP() {
        return this._maxHP;
    }
    
    takeDamage(amount, inflictor){
        this.HP -= amount;
        this.events.fire('damage', { amount, inflictor });

        if (this.HP < 0) {
            this.HP = 0;
            this.lives--;
            this.events.fire('death', { inflictor });
        }
    }
}

export { Hitpoints }
	