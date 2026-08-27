'use strict';
const Storage=(()=>{const KEY='financialModelCalculator.iran.irt.v1';function save(state){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){console.warn('Autosave failed',e)}}function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}}function clear(){localStorage.removeItem(KEY)}return{save,load,clear}})();
