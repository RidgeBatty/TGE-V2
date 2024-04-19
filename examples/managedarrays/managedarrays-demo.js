/*

   NOTE! ManagerArrays are highly experimental feature! Do not use until you really know what you are doing.
   ManagedArray Demo

   Performance tests for ManagedArrays

*/
import { ManagedArray } from '../../managedArray.js';

let t0, t1;
const timerStart = () => { t0 = performance.now(); }
const timerStop  = () => { t1 = performance.now(); }
const timerGet   = () => { t1 = performance.now(); return (t1 - t0); }
const timerPrint = (digits) => { if (digits == undefined) digits = 2; t1 = performance.now(); return (t1 - t0).toFixed(digits); }

const main = () => {        
    console.log('Running Performance Tests...')
    const a = new Array();    
    const b = new Array();
    for (let i = 0; i < 2000000; i++) a.push({ name:i });        
    for (let i = 0; i < 2000000; i++) b.push({ name:i }); 

    timerStart();
    //for (let i = 0; i < 50000; i++) a.deleteByName(i);
    for (var i = 0; i < a.length; i++) a[i].name = 0;
    timerStop();
    console.log(timerPrint() + 'ms');

    timerStart();
    //for (let i = 0; i < 50000; i++) a.deleteByName(i);
    for (var i = 0; i < b.length; i++) b[i].name = 0;
    timerStop();
    console.log(timerPrint() + 'ms');

    timerStart();
    //for (let i = 0; i < 50000; i++) { const n = b.findIndex(e => e.name == i); b.splice(n, 1); }
    for (let i = 0; i < a.length; i++) a[i].name = 0;
    timerStop();    
    console.log(timerPrint() + 'ms');    

    timerStart();
    //for (let i = 0; i < 50000; i++) { const n = b.findIndex(e => e.name == i); b.splice(n, 1); }
    for (let i = 0; i < b.length; i++) b[i].name = 0;
    timerStop();    
    console.log(timerPrint() + 'ms');    
}

main();