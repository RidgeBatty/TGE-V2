
class Hitpoints {
    constructor(hp = 100, maxHP = 100, lives = 1) {
        this._HP    = hp;
        this._maxHP = maxHP;
        this.lives  = lives;
    }
    
    assignTo(actor) {
        actor._events.damage = [];
        actor._events.death  = [];        
        Object.assign(actor, this);
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
    
    takeDamage(amount, inflicter){
        this.HP -= amount;
        this._fireEvent('Damage', { amount, inflicter });

        if (this.HP < 0) {
            this.HP = 0;
            this.lives--;
            this._fireEvent('Death', { inflicter });
        }
    }
}

export { Hitpoints }
	