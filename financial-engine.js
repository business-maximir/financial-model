'use strict';
const FinancialEngine=(()=>{
  const monthKeys=['setup','preparation',...Array.from({length:12},(_,i)=>`m${i+1}`)];
  const marketingPresets={
    balanced:[14,13,12,10,9,8,7,6,6,5,5,5],
    launchHeavy:[16,14,12,10,8,8,7,6,5,5,5,4],
    growth:[2,3,4,5,6,7,8,10,12,13,14,16],
    manual:null
  };
  const ridesPresets={
    balanced:[5,10,15,20,30,40,50,60,70,80,90,100],
    smallCityFast:[5,10,15,50,70,82,90,95,97,98,99,100],
    smallCityModerate:[5,10,15,28,40,54,66,77,86,92,96,100],
    slow:[3,6,10,14,18,25,34,45,57,70,84,100],
    aggressive:[8,14,21,29,38,49,61,73,83,90,96,100],
    manual:null
  };
  const SMS_RATE=30;
  const IVR_RATE=75;
  const CALL_CENTER_CALL_RATE=7500;
  const SMS_USAGE_SHARE=0.20;
  const IVR_USAGE_SHARE=2.00;
  const CALL_CENTER_USAGE_SHARE=0.05;
  const ACCEPTED_TO_COMPLETED_RATIO=1.35;
  const CONTACT_CENTER_SURCHARGE_SHARE=0.05;
  const CONTACT_CENTER_SURCHARGE_RATE=0.20;

  function n(v){return Number(v)||0}
  function uid(){return 'ex_'+Math.random().toString(36).slice(2,9)}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function roundTo(value,step){return Math.round(n(value)/step)*step}
  function advertisingPackageForPopulation(_population){return 0}

  function initialPaymentBaseForPopulation(population){
    const p=Math.max(0,n(population));
    if(p<=20000)return 40000000;
    if(p<=50000)return 50000000;
    if(p<=100000)return 60000000;
    return 70000000;
  }
  function initialPaymentForPopulation(population){return initialPaymentBaseForPopulation(population)}

  function monthlyMarketingBudgetForPopulation(population){
    const p=Math.max(0,n(population));
    if(p<=20000)return 10000000;
    if(p<=50000)return 15000000;
    if(p<=100000)return 20000000;
    return 30000000;
  }
  function annualMarketingBudgetForPopulation(population){return monthlyMarketingBudgetForPopulation(population)*12}

  // Province remains a city-picker field only. Iran V1 has no fare or commission caps.
  function transportZoneForProvince(_province){return 0}
  function minimumAverageFareForProvince(_province){return 0}
  function maximumCommissionForProvince(_province){return Number.POSITIVE_INFINITY}
  function recommendedAverageFareForPopulation(_population,_province){return 100000}
  function recommendedCommissionForPopulation(_population,_province){return 13}

  function royaltyRateForGrossRevenue(value){
    const profit=Math.max(0,n(value));
    if(profit<=10000000)return 0;
    if(profit<=20000000)return 10;
    if(profit<=30000000)return 15;
    if(profit<=40000000)return 20;
    if(profit<=50000000)return 25;
    if(profit<=500000000)return 30;
    if(profit<=1000000000)return 35;
    return 40;
  }
  function assistantFeeForGrossRevenue(value){
    const profit=Math.max(0,n(value));
    if(profit<=10000000)return 1500000;
    if(profit<=50000000)return 3500000;
    return 7500000;
  }
  function smsRateForGrossRevenue(_value){return SMS_RATE}
  function ivrRateForGrossRevenue(_value){return IVR_RATE}
  function callCenterCallRateForGrossRevenue(_value){return CALL_CENTER_CALL_RATE}

  // Iran base potential: conservative smooth absolute order potential.
  // <=20k: 1.1% of population
  // 20k-50k: 220 -> 405 orders/day
  // 50k-100k: 405 -> 558 orders/day
  // 100k-250k: 558 -> 744 orders/day
  // >250k: capped at 744 orders/day
  function recommendedDailyOrderPotentialForPopulation(population){
    const p=Math.max(0,n(population));
    if(p<=20000)return p*0.011;
    if(p<=50000)return 220+(p-20000)*(185/30000);
    if(p<=100000)return 405+(p-50000)*(153/50000);
    if(p<=250000)return 558+(p-100000)*(186/150000);
    return 744;
  }
  function recommendedDailyDemandRateForPopulation(population){
    const p=Math.max(0,n(population));
    if(p<=0)return 0;
    return recommendedDailyOrderPotentialForPopulation(p)/p*100;
  }
  function recommendedRidesDistributionForPopulation(_population){
    return clone(ridesPresets.balanced);
  }
  // Advertising effect on completed orders.
  // Up to the recommended annual budget, demand changes almost proportionally:
  // 0 budget keeps only ~1% organic demand; 50% budget -> ~50% of base orders; 100% -> 100%.
  // Above the recommendation, extra spending has diminishing returns:
  // 125% -> 105%, 150% -> 110%, 200% -> 115%, capped at 120% from 300% budget.
  function investmentDemandFactor(annualBudget,population){
    const recommended=annualMarketingBudgetForPopulation(population);
    const budget=Math.max(0,n(annualBudget));
    if(recommended<=0)return budget>0?1:0.01;
    const ratio=budget/recommended;
    if(ratio<=0)return 0.01;
    if(ratio<=1)return Math.max(0.01,ratio);
    if(ratio<=1.5)return 1+(ratio-1)*0.20;
    if(ratio<=2)return 1.10+(ratio-1.5)*0.10;
    return Math.min(1.20,1.15+(ratio-2)*0.05);
  }

  // Average fare models the mix between city and intercity orders.
  // Base fare = 100% of the city potential. Higher fares shift the scenario toward
  // fewer, more expensive (often intercity) trips. At 1,000,000 IRT the order
  // potential is about 5% of the base scenario. Cheaper city trips can increase
  // order volume, capped at 160%. Values between control points are interpolated.
  function fareDemandFactor(averageFare,population,province){
    const recommended=recommendedAverageFareForPopulation(population,province);
    const fare=Math.max(0,n(averageFare));
    if(recommended<=0)return 1;
    if(fare<=0)return 1.60;
    const ratio=fare/recommended;
    const points=[
      [0,1.60],[0.5,1.60],[0.6,1.50],[0.7,1.35],[0.8,1.20],[1,1.00],
      [1.5,0.70],[2,0.45],[3,0.30],[5,0.15],[7.5,0.08],[10,0.05],
      [15,0.033],[20,0.025]
    ];
    return Math.max(0.025,interpolateControlPoints(ratio,points));
  }

  function interpolateControlPoints(value,points){
    if(!points.length)return 1;
    if(value<=points[0][0])return points[0][1];
    for(let i=1;i<points.length;i++){
      const [x1,y1]=points[i-1], [x2,y2]=points[i];
      if(value<=x2){
        const t=(value-x1)/(x2-x1||1);
        return y1+(y2-y1)*t;
      }
    }
    return points[points.length-1][1];
  }

  // Driver commission has a limited positive effect when reduced below 13%,
  // a mild effect through 15%, followed by an increasingly sharp fulfillment drop above 15%.
  function commissionFulfillmentFactor(commission,population,province){
    const value=Math.max(0,n(commission));
    const points=[
      [0,1.05],[5,1.05],[8,1.05],[10,1.03],[12,1.01],[13,1.00],
      [14,0.98],[15,0.94],[16,0.86],[17,0.76],[18,0.65],[19,0.53],
      [20,0.40],[21,0.30],[22,0.22],[23,0.16],[25,0.10],[30,0.05]
    ];
    return Math.max(0.05,interpolateControlPoints(value,points));
  }
  function recommendedMarketingPatternForPopulation(population){
    const monthly=monthlyMarketingBudgetForPopulation(population);
    return Array.from({length:12},()=>monthly);
  }
  function marketingSharesForPopulation(population){
    const pattern=recommendedMarketingPatternForPopulation(population);
    const total=pattern.reduce((a,b)=>a+b,0)||1;
    return pattern.map(v=>v/total*100);
  }
  function monthlyMarketingBudgets(annualBudget,_population){
    const annual=Math.max(0,n(annualBudget));
    const monthly=roundTo(annual/12,1000);
    const budgets=Array.from({length:12},()=>monthly);
    budgets[11]+=annual-budgets.reduce((sum,value)=>sum+value,0);
    return budgets;
  }

  function operatingExpenseRatesForPopulation(_population){return{officeRent:0,managerSalary:0}}
  function fixedExpenseDefinitionsForPopulation(_population,_options={}){
    return [{id:'assistente',name:'assistente',amount:0,removable:false,showInModel:true,fixedType:'assistant'}];
  }
  function defaultExpenseRows(population=100000,options={}){return[
    ...fixedExpenseDefinitionsForPopulation(population,options).map(row=>({...row})),
    {id:'other_costs',name:'otherCosts',amount:0,removable:false,showInModel:false,hidden:true}
  ]}
  function normPctArray(arr,fallback){
    const src=Array.isArray(arr)&&arr.length===12?arr:fallback;
    return src.map(v=>Math.max(0,n(v)));
  }
  function normalizeAssumptions(input={}){
    const a={...defaultAssumptions(),...input};
    delete a.adminCost; delete a.activeUsers; delete a.callCenterEnabled;
    a.selfManaged=a.selfManaged===true;
    a.useOwnPremises=a.useOwnPremises===true;
    const sourceExpenseRows=Array.isArray(a.expenseRows)&&a.expenseRows.length?a.expenseRows:defaultExpenseRows(a.population,a);
    const fixedDefinitions=fixedExpenseDefinitionsForPopulation(a.population,a);
    const fixedIds=new Set(fixedDefinitions.map(row=>row.id));
    const customExpenseRows=sourceExpenseRows
      .filter(row=>row&&row.id&&!fixedIds.has(row.id)&&!['other_costs','office_rent','manager_salary'].includes(row.id))
      .map((r,i)=>({id:r.id||uid(),name:String(r.name||`Expense ${i+1}`),amount:n(r.amount),showInModel:r.showInModel!==false,removable:r.removable!==false,hidden:!!r.hidden,fixedType:r.fixedType||null}));
    a.expenseRows=[
      ...fixedDefinitions.map(row=>({...row})),
      ...customExpenseRows,
      {id:'other_costs',name:'otherCosts',amount:0,removable:false,showInModel:false,hidden:true,fixedType:null}
    ];
    a.province=String(a.province||'').trim();
    a.transportZone=0; a.minimumAverageFare=0; a.maximumCommission=Number.POSITIVE_INFINITY;
    const recommendedBudget=annualMarketingBudgetForPopulation(a.population);
    const recommendedFare=recommendedAverageFareForPopulation(a.population,a.province);
    const recommendedCommission=recommendedCommissionForPopulation(a.population,a.province);
    a.useRecommendedValues=a.useRecommendedValues!==false;
    if(a.useRecommendedValues){
      a.marketingBudget=recommendedBudget; a.averageFare=recommendedFare; a.commission=recommendedCommission;
    }else{
      a.marketingBudget=Math.max(0,n(a.marketingBudget));
      a.averageFare=Math.max(0,n(a.averageFare));
      a.commission=Math.max(0,n(a.commission));
    }
    a.recommendedMarketingBudget=recommendedBudget;
    a.recommendedAverageFare=recommendedFare;
    a.recommendedCommission=recommendedCommission;
    a.advertisingPackage=advertisingPackageForPopulation(a.population);
    a.marketingDistributionPreset='auto';
    a.marketingDistribution=marketingSharesForPopulation(a.population);
    a.ridesDistributionPreset=a.ridesDistributionPreset||'balanced';
    if(a.ridesDistributionPreset==='balanced')a.ridesDistribution=recommendedRidesDistributionForPopulation(a.population);
    else a.ridesDistribution=normPctArray(a.ridesDistribution,ridesPresets[a.ridesDistributionPreset]||ridesPresets.balanced);
    const basePotentialForAssumptions=n(a.dailyOrderPotentialOverride)>0?n(a.dailyOrderPotentialOverride):recommendedDailyOrderPotentialForPopulation(a.population);
    a.percentagePopulationUsingService=a.population>0?basePotentialForAssumptions/a.population*100:0;
    a.autoPopulationUsingService=false;
    if(!Array.isArray(a.revenueRules)||!a.revenueRules.length)a.revenueRules=defaultRevenueRules();
    a.revenueRules=a.revenueRules.map((r,i)=>({id:r.id||uid(),threshold:Math.max(0,n(r.threshold)),maximShare:Math.min(100,Math.max(0,n(r.maximShare))),removable:r.removable!==false})).sort((x,y)=>x.threshold-y.threshold);
    return a;
  }
  function defaultRevenueRules(){return[
    {id:'rr_0',threshold:0,maximShare:0,removable:false},
    {id:'rr_10000001',threshold:10000001,maximShare:10,removable:false},
    {id:'rr_20000001',threshold:20000001,maximShare:15,removable:false},
    {id:'rr_30000001',threshold:30000001,maximShare:20,removable:false},
    {id:'rr_40000001',threshold:40000001,maximShare:25,removable:false},
    {id:'rr_50000001',threshold:50000001,maximShare:30,removable:false},
    {id:'rr_500000001',threshold:500000001,maximShare:35,removable:false},
    {id:'rr_1000000001',threshold:1000000001,maximShare:40,removable:false}
  ]}
  function defaultAssumptions(type='base'){
    const common={population:100000,province:'Tehran Province',averageFare:100000,commission:13,rideGrowth:18,marketingBudget:240000000,initialInvestment:60000000,operatingExpenses:0,percentagePopulationUsingService:0.62,useRecommendedValues:true,selfManaged:false,useOwnPremises:false,expenseRows:defaultExpenseRows(100000),marketingDistributionPreset:'balanced',marketingDistribution:clone(marketingPresets.balanced)};
    const presets={
      conservative:{...common,rideGrowth:10,ridesDistributionPreset:'slow',ridesDistribution:clone(ridesPresets.slow)},
      base:{...common,ridesDistributionPreset:'balanced',ridesDistribution:clone(ridesPresets.balanced)},
      optimistic:{...common,rideGrowth:25,marketingDistributionPreset:'growth',marketingDistribution:clone(marketingPresets.growth),ridesDistributionPreset:'aggressive',ridesDistribution:clone(ridesPresets.aggressive)}
    };
    return clone(presets[type]||presets.base);
  }

  function calculateCore(assumptions){
    const a=normalizeAssumptions(assumptions);
    const months=[]; let accumulated=0;
    const baseTargetRidesDay=Math.round(n(a.dailyOrderPotentialOverride)>0?n(a.dailyOrderPotentialOverride):recommendedDailyOrderPotentialForPopulation(a.population));
    const baseDemandRate=a.population>0?baseTargetRidesDay/a.population*100:0;
    const budgetDemandFactor=investmentDemandFactor(a.marketingBudget,a.population);
    const fareFactor=fareDemandFactor(a.averageFare,a.population,a.province);
    const commissionFactor=commissionFulfillmentFactor(a.commission,a.population,a.province);
    const combinedDemandFactor=budgetDemandFactor*fareFactor*commissionFactor;
    const targetRidesDay=Math.max(0,Math.round(baseTargetRidesDay*combinedDemandFactor));
    const autoMarketingBudgets=monthlyMarketingBudgets(a.marketingBudget,a.population);

    for(let i=0;i<14;i++){
      const isSetup=i===0,isPrep=i===1,monthNo=i-1,mIndex=i-2;
      const marketingInvestment=i>1?autoMarketingBudgets[mIndex]:0;
      const investment=isSetup?n(a.initialInvestment):marketingInvestment;
      const ridesPerDay=i>1?Math.round(targetRidesDay*n(a.ridesDistribution[mIndex])/100):0;
      const ridesPerMonth=i>1?Math.round(ridesPerDay*30):0;
      const gross=ridesPerMonth*n(a.averageFare);
      const commissionFromRides=gross*n(a.commission)/100;
      const contactCenterSurchargeCount=i>1?ridesPerMonth*CONTACT_CENTER_SURCHARGE_SHARE:0;
      const contactCenterSurchargePerOrder=n(a.averageFare)*CONTACT_CENTER_SURCHARGE_RATE;
      const contactCenterSurcharge=contactCenterSurchargeCount*contactCenterSurchargePerOrder;
      const totalOperatingIncome=commissionFromRides+contactCenterSurcharge;
      const grossRevenue=totalOperatingIncome;

      const smsCount=i>1?ridesPerMonth*SMS_USAGE_SHARE:0;
      const ivrCount=i>1?ridesPerMonth*IVR_USAGE_SHARE:0;
      const acceptedOrdersCount=i>1?ridesPerMonth*ACCEPTED_TO_COMPLETED_RATIO:0;
      const callCenterCallCount=i>1?acceptedOrdersCount*CALL_CENTER_USAGE_SHARE:0;
      const smsRate=SMS_RATE, ivrRate=IVR_RATE, callCenterCallRate=CALL_CENTER_CALL_RATE;
      const smsExpense=smsCount*smsRate;
      const ivrExpense=ivrCount*ivrRate;
      const callCenterExpense=callCenterCallCount*callCenterCallRate;
      const communicationExpenses=smsExpense+ivrExpense+callCenterExpense;

      // Iran terms supplied for this version use gross profit as the threshold base.
      const grossProfit=Math.max(0,grossRevenue-communicationExpenses);
      const royaltyBase=grossProfit;
      const maximShare=royaltyRateForGrossRevenue(royaltyBase);
      const maximRevenue=royaltyBase*maximShare/100;
      const partner=totalOperatingIncome-maximRevenue;

      const fixedExpenses={}; let fixedExpenseTotal=0;
      if(i>1){
        a.expenseRows.filter(r=>r.showInModel!==false).forEach(r=>{
          const val=r.fixedType==='assistant'?assistantFeeForGrossRevenue(grossProfit):Math.round(n(r.amount));
          fixedExpenses[r.id]=val; fixedExpenseTotal+=val;
        });
      }
      const assistantExpense=fixedExpenses.assistente||0;
      const opEx=i>1?marketingInvestment+fixedExpenseTotal+communicationExpenses:0;
      const initialFeeInMonth=i===2?n(a.initialInvestment):0;
      const netProfit=i>1?(partner-opEx-initialFeeInMonth):0;
      const netCashFlow=i>1?netProfit:0;
      accumulated+=netCashFlow;
      const margin=partner?netProfit/partner*100:0;
      months.push({key:monthKeys[i],index:i,monthNo,isSetup,isPrep,marketingPct:i>1?n(a.marketingDistribution[mIndex]):0,ridesPct:i>1?n(a.ridesDistribution[mIndex]):0,targetRidesDay,investment,initialPurchase:isSetup?investment:0,marketingInvestment,ridesPerDay,ridesPerMonth,averageFare:n(a.averageFare),gross,commission:n(a.commission),commissionFromRides,contactCenterSurchargeCount,contactCenterSurchargePerOrder,contactCenterSurcharge,grossRevenue,grossProfit,smsCount,smsRate,ivrCount,ivrRate,acceptedOrdersCount,callCenterCallCount,callCenterCallRate,totalOperatingIncome,royaltyBase,maximShare,revenue:maximRevenue,maximRevenue,partnerShare:100-maximShare,partner,marketingExpense:marketingInvestment,assistantExpense,smsExpense,ivrExpense,callCenterExpense,communicationExpenses,royaltyExpense:maximRevenue,fixedExpenses,opEx,netProfit,margin,netCashFlow,accumulated});
    }

    const yearMonths=months.slice(2);
    const initialPayment=n(a.initialInvestment);
    const totalMarketingInvestment=yearMonths.reduce((s,x)=>s+x.marketingInvestment,0);
    const totalAssistantExpense=yearMonths.reduce((s,x)=>s+(x.fixedExpenses?.assistente||0),0);
    const totalOfficeRentExpense=0,totalManagerSalaryExpense=0;
    const totalSmsExpense=yearMonths.reduce((s,x)=>s+x.smsExpense,0);
    const totalIvrExpense=yearMonths.reduce((s,x)=>s+x.ivrExpense,0);
    const totalCallCenterExpense=yearMonths.reduce((s,x)=>s+x.callCenterExpense,0);
    const totalCommunicationExpenses=yearMonths.reduce((s,x)=>s+x.communicationExpenses,0);
    const totalRoyaltyExpense=yearMonths.reduce((s,x)=>s+x.royaltyExpense,0);
    const totalExpenses=yearMonths.reduce((s,x)=>s+x.opEx,0);
    const totalOperatingExpenses=Math.max(0,totalExpenses-totalMarketingInvestment)+totalRoyaltyExpense;
    const totalInvestment=initialPayment+totalMarketingInvestment;
    const totalCommissionFromRides=yearMonths.reduce((s,x)=>s+x.commissionFromRides,0);
    const totalContactCenterSurcharge=yearMonths.reduce((s,x)=>s+x.contactCenterSurcharge,0);
    const totalRevenue=totalCommissionFromRides+totalContactCenterSurcharge;
    const totalPartnerRevenue=totalRevenue;
    const averageMonthlyInvestment=totalInvestment/12;
    const netProfit=totalRevenue-totalInvestment-totalOperatingExpenses;
    const roi=totalInvestment?netProfit/totalInvestment*100:0;
    const breakEven=months.find(x=>x.index>1&&x.netProfit>=0);
    const payback=months.find(x=>x.index>1&&x.accumulated>=0);
    return{assumptions:a,months,summary:{initialPayment,totalMarketingInvestment,totalAssistantExpense,totalOfficeRentExpense,totalManagerSalaryExpense,totalSmsExpense,totalIvrExpense,totalCallCenterExpense,totalCommunicationExpenses,totalRoyaltyExpense,totalOperatingExpenses,totalInvestment,totalRevenue,totalPartnerRevenue,totalCommissionFromRides,totalContactCenterSurcharge,totalExpenses,averageMonthlyInvestment,netProfit,roi,breakEvenPeriod:breakEven?breakEven.monthNo:null,breakEvenKey:breakEven?breakEven.key:null,paybackPeriod:payback?payback.monthNo:null,paybackKey:payback?payback.key:null,targetRidesDay,baseTargetRidesDay,baseDemandRate,budgetDemandFactor,fareDemandFactor:fareFactor,commissionFulfillmentFactor:commissionFactor,combinedDemandFactor,recommendedMarketingBudget:a.recommendedMarketingBudget}};
  }
  function calculate(assumptions){return calculateCore(normalizeAssumptions(assumptions))}
  function formatMoney(v,compact=false){
    const value=n(v),abs=Math.abs(value),sign=value<0?'-':'';
    const locale=(typeof Localization!=='undefined'&&Localization.numberLocale)?Localization.numberLocale():'ru-RU';
    if(compact&&abs>=1000000){const scaled=abs/1000000,digits=scaled>=10||Number.isInteger(scaled)?0:1,unit=(typeof Localization!=='undefined')?Localization.t('millionShort'):'млн';return sign+scaled.toLocaleString(locale,{minimumFractionDigits:0,maximumFractionDigits:digits})+' '+unit;}
    if(compact&&abs>=1000){const scaled=abs/1000,digits=scaled>=100||Number.isInteger(scaled)?0:1,unit=(typeof Localization!=='undefined')?Localization.t('thousandShort'):'тыс.';return sign+scaled.toLocaleString(locale,{minimumFractionDigits:0,maximumFractionDigits:digits})+' '+unit;}
    return sign+Math.round(abs).toLocaleString(locale);
  }
  function currencyLabel(){return (typeof Localization!=='undefined'&&Localization.getLanguage&&Localization.getLanguage()==='fa-IR')?'تومان':'Toman'}
  function formatCurrencyFull(v){return `${n(v)<0?'-':''}${formatMoney(Math.abs(n(v)),false)} ${currencyLabel()}`}
  function formatCurrencyCompact(v){return `${n(v)<0?'-':''}${formatMoney(Math.abs(n(v)),true)} ${currencyLabel()}`}
  function formatPercent(v){const raw=`${Math.round(v)} %`;return (typeof Localization!=='undefined'&&Localization.localizeDigits)?Localization.localizeDigits(raw):raw}
  function createExpenseRow(name='New Expense',amount=0){return{id:uid(),name,amount,removable:true,showInModel:true}}
  function createRevenueRule(threshold=0,maximShare=100){return{id:uid(),threshold,maximShare,removable:true}}
  function applyPreset(assumptions,type,preset){const a=normalizeAssumptions(assumptions);if(type==='marketing'&&marketingPresets[preset]){a.marketingDistributionPreset=preset;a.marketingDistribution=clone(marketingPresets[preset])}if(type==='rides'&&ridesPresets[preset]){a.ridesDistributionPreset=preset;a.ridesDistribution=clone(ridesPresets[preset])}return a}

  return{calculate,defaultAssumptions,normalizeAssumptions,createExpenseRow,createRevenueRule,formatMoney,formatCurrencyFull,formatCurrencyCompact,formatPercent,monthKeys,marketingPresets,ridesPresets,applyPreset,advertisingPackageForPopulation,initialPaymentBaseForPopulation,initialPaymentForPopulation,monthlyMarketingBudgetForPopulation,annualMarketingBudgetForPopulation,transportZoneForProvince,minimumAverageFareForProvince,maximumCommissionForProvince,recommendedAverageFareForPopulation,recommendedCommissionForPopulation,royaltyRateForGrossRevenue,assistantFeeForGrossRevenue,smsRateForGrossRevenue,ivrRateForGrossRevenue,callCenterCallRateForGrossRevenue,recommendedDailyOrderPotentialForPopulation,recommendedDailyDemandRateForPopulation,recommendedRidesDistributionForPopulation,operatingExpenseRatesForPopulation,investmentDemandFactor,fareDemandFactor,commissionFulfillmentFactor,marketingSharesForPopulation,monthlyMarketingBudgets,SMS_USAGE_SHARE,IVR_USAGE_SHARE,CALL_CENTER_USAGE_SHARE,ACCEPTED_TO_COMPLETED_RATIO,CONTACT_CENTER_SURCHARGE_SHARE,CONTACT_CENTER_SURCHARGE_RATE,SMS_RATE,IVR_RATE,CALL_CENTER_CALL_RATE};
})();
