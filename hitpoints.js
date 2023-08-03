/**
 * Hitpoints mixin.
 * Mixins should not have constructors. A create method (if defined) will be called instead. Use "this" to access all the shared properties with other mixed classes.
 */
import { clamp } from "./utils.js";
class Hitpoints {
    create(o) {     
        const hp = ('hp' in o) ? o.hp : 100;
    
        this._hp    = hp
        this._hpMax = ('hpMax' in o) ? o.hpMax : hp;
        this.lives  = ('lives' in o) ? o.lives : 1;

        this.events.create('damage death');
    }

    set hp(value) {
        this._hp = clamp(value, 0, this._hpMax); 
    }

    get hp() {
        return this._hp;
    }

    set hpMax(value) {
        this._hpMax = value;
        this._hp    = value;
    }
    
    get hpMax() {
        return this._hpMax;
    }
    
    /**
     * Inflicts damage to this actor, but lets the event subscriber change the actual damage applied!
     * @param {number} amount 
     * @param {Actor} inflictor other actor who attacked this actor
     * @returns 
     */
    inflictDamage(amount, inflictor) {
        const damageObject = { amount, inflictor, changeDamage:{ amount } };
        this.events.fire('damage', damageObject);
        if (this.onDamage) this.onDamage(damageObject);

        this.hp -= damageObject.changeDamage.amount;
        
        if (this.hp <= 0) {            
            const deathObject = { inflictor };
            this.hp = 0;
            this.lives--;            
            this.events.fire('death', deathObject);
            
            if (this.onDeath) this.onDeath(deathObject);
        }

        return this;
    }
}

export { Hitpoints }
	