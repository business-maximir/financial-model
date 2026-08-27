'use strict';
const Validation=(()=>{
  function validateAssumptions(a){
    const errors={};
    const population=Number(a.population);
    const populationUsing=Number(a.percentagePopulationUsingService);
    const averageFare=Number(a.averageFare);
    const commission=Number(a.commission);
    if(!Number.isFinite(population)||population<=0)errors.population=Localization.t('validationPopulation');
    if(!Number.isFinite(populationUsing)||populationUsing<=0||populationUsing>5)errors.percentagePopulationUsingService=Localization.t('validationPopulationUsing');
    if(!Number.isFinite(averageFare)||averageFare<0)errors.averageFare=Localization.t('validationFare');
    if(!Number.isFinite(commission)||commission<0)errors.commission=Localization.t('validationCommission');
    if(!Number.isFinite(Number(a.rideGrowth))||Number(a.rideGrowth)<-90||Number(a.rideGrowth)>200)errors.rideGrowth=Localization.t('validationGrowth');
    if(!Number.isFinite(Number(a.marketingBudget))||Number(a.marketingBudget)<0)errors.marketingBudget=Localization.t('validationMarketing');
    if(!Number.isFinite(Number(a.initialInvestment))||Number(a.initialInvestment)<0)errors.initialInvestment=Localization.t('validationInvestment');
    if(!Number.isFinite(Number(a.operatingExpenses))||Number(a.operatingExpenses)<0)errors.operatingExpenses=Localization.t('validationExpenses');
    return{valid:Object.keys(errors).length===0,errors};
  }
  return{validateAssumptions};
})();
