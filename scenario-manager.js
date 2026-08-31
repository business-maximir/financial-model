'use strict';
const ScenarioManager=(()=>{
  function builtIns(){return [
    {id:'conservative',name:'Консервативный',builtIn:true,assumptions:FinancialEngine.defaultAssumptions('conservative'),notes:'Значения в Toman. Консервативный сценарий для Ирана.'},
    {id:'base',name:'Базовый',builtIn:true,assumptions:FinancialEngine.defaultAssumptions('base'),notes:'Значения в Toman. Рекомендуемый расчёт: средний чек 100 000 Toman, комиссия 13%.'},
    {id:'optimistic',name:'Оптимистичный',builtIn:true,assumptions:FinancialEngine.defaultAssumptions('optimistic'),notes:'Значения в Toman. Оптимистичный сценарий роста заказов.'}
  ]}
  function duplicate(s){return{...JSON.parse(JSON.stringify(s)),id:'custom_'+Date.now(),name:s.name+' — копия',builtIn:false}}
  return{builtIns,duplicate}
})();
