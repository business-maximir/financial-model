'use strict';
const App=(()=>{
  let state, model, errors={}, undo=[], redo=[];
  let resetModelTableScrollOnNextRender=true;
  let mobileChart=null;
  let mobileStickyCtaObserver=null;
  let startFilterState='', startFilterCityId='';
  let cityOverrides={added:[],hiddenIds:[],paymentRules:[],paymentOverrides:{}};
  let adminPaymentRulesDraft=[];
  let adminPaymentRulesDirty=false;
  let cityCache=null;
  let adminAuthenticated=false;
  let adminReturnFocus=null;
  let adminCitiesReturnFocus=null;
  let adminNotice={text:'',tone:''};
  let adminCitySearch='';
  let adminCityRegion='';
  let adminShowHiddenOnly=false;

  const CITY_OVERRIDES_KEY='maxim_ir_city_overrides_v1';
  const ADMIN_SESSION_KEY='maxim_ir_admin_session_v1';
  const DEFAULT_PAYMENT_RULES=Object.freeze([
    Object.freeze({id:'fee-base',minPopulation:0,amount:40000000}),
    Object.freeze({id:'fee-20001',minPopulation:20001,amount:50000000}),
    Object.freeze({id:'fee-50001',minPopulation:50001,amount:60000000}),
    Object.freeze({id:'fee-100001',minPopulation:100001,amount:70000000})
  ]);
  const baseCities=()=>Array.isArray(window.CityData)?window.CityData:CityData;
  const escapeCityHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

  function normalizeStoredCity(city){
    if(!city||typeof city!=='object')return null;
    const id=String(city.id||'').trim();
    const region=String(city.state||'').trim();
    const name=String(city.city||'').trim();
    const population=Math.round(Number(city.population));
    const initialPayment=Math.round(Number(city.initialPayment));
    if(!id||!region||!name||!Number.isFinite(population)||population<=0||!Number.isFinite(initialPayment)||initialPayment<0)return null;
    return {id,state:region,city:name,population,initialPayment,isCustom:true};
  }

  const cloneDefaultPaymentRules=()=>DEFAULT_PAYMENT_RULES.map(rule=>({...rule}));

  function normalizePaymentRules(rules){
    const normalized=(Array.isArray(rules)?rules:[]).map((rule,index)=>{
      const minPopulation=Math.max(0,Math.round(Number(rule?.minPopulation)));
      const amount=Math.max(0,Math.round(Number(rule?.amount)));
      if(!Number.isFinite(minPopulation)||!Number.isFinite(amount))return null;
      return {id:String(rule?.id||`fee-${Date.now().toString(36)}-${index}`),minPopulation,amount};
    }).filter(Boolean).sort((a,b)=>a.minPopulation-b.minPopulation);
    const unique=[];
    for(const rule of normalized){
      if(unique.some(item=>item.minPopulation===rule.minPopulation))continue;
      unique.push(rule);
    }
    if(!unique.length)return cloneDefaultPaymentRules();
    if(unique[0].minPopulation!==0)unique.unshift({id:'fee-base',minPopulation:0,amount:unique[0].amount});
    return unique;
  }

  function basePaymentForPopulation(population,rules=cityOverrides.paymentRules){
    const p=Math.max(0,Math.round(Number(population)||0));
    const ordered=normalizePaymentRules(rules);
    let selected=ordered[0];
    for(const rule of ordered){
      if(p>=rule.minPopulation)selected=rule;
      else break;
    }
    return Math.max(0,Math.round(Number(selected?.amount)||0));
  }

  function paymentForPopulation(population,rules=cityOverrides.paymentRules){
    return Math.round(basePaymentForPopulation(population,rules));
  }

  function normalizePaymentOverrides(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    return Object.fromEntries(Object.entries(value).map(([id,amount])=>[String(id),Math.max(0,Math.round(Number(amount)||0))]));
  }

  function loadCityOverrides(){
    try{
      const parsed=JSON.parse(localStorage.getItem(CITY_OVERRIDES_KEY)||'{}');
      const added=Array.isArray(parsed.added)?parsed.added.map(normalizeStoredCity).filter(Boolean):[];
      const legacyHidden=Array.isArray(parsed.hiddenIds)?parsed.hiddenIds:(Array.isArray(parsed.deletedIds)?parsed.deletedIds:[]);
      const hiddenIds=legacyHidden.map(String);
      const paymentRules=normalizePaymentRules(parsed.paymentRules);
      const paymentOverrides=normalizePaymentOverrides(parsed.paymentOverrides);
      cityOverrides={added,hiddenIds:[...new Set(hiddenIds)],paymentRules,paymentOverrides};
    }catch(_error){
      cityOverrides={added:[],hiddenIds:[],paymentRules:cloneDefaultPaymentRules(),paymentOverrides:{}};
    }
    adminPaymentRulesDraft=cityOverrides.paymentRules.map(rule=>({...rule}));
    adminPaymentRulesDirty=false;
    cityCache=null;
  }

  function saveCityOverrides(){
    try{
      localStorage.setItem(CITY_OVERRIDES_KEY,JSON.stringify({
        added:cityOverrides.added,
        hiddenIds:cityOverrides.hiddenIds,
        paymentRules:cityOverrides.paymentRules,
        paymentOverrides:cityOverrides.paymentOverrides
      }));
      cityCache=null;
      return true;
    }catch(_error){
      setAdminNotice('Не удалось сохранить изменения в браузере. Проверьте доступ к локальному хранилищу.','error');
      return false;
    }
  }

  function rebuildCityCache(){
    const priceOverrides=cityOverrides.paymentOverrides||{};
    const withEffectivePayment=(city,isCustom)=>({
      ...city,
      initialPayment:Object.prototype.hasOwnProperty.call(priceOverrides,String(city.id))
        ? Number(priceOverrides[String(city.id)])
        : (isCustom?Number(city.initialPayment):Number(city.initialPayment)),
      isCustom
    });
    cityCache=baseCities()
      .map(city=>withEffectivePayment(city,false))
      .concat(cityOverrides.added.map(city=>withEffectivePayment(city,true)))
      .sort((a,b)=>a.state.localeCompare(b.state,'en-US')||a.city.localeCompare(b.city,'en-US')||Number(a.population)-Number(b.population));
    return cityCache;
  }

  const allCities=()=>cityCache||rebuildCityCache();
  const hiddenCityIds=()=>new Set(cityOverrides.hiddenIds.map(String));
  const isCityVisible=id=>!hiddenCityIds().has(String(id));
  const cities=()=>{const hidden=hiddenCityIds();return allCities().filter(city=>!hidden.has(String(city.id)));};
  const cityById=id=>cities().find(c=>c.id===id)||null;
  const adminCityById=id=>allCities().find(c=>c.id===id)||null;
  const states=()=>[...new Set(cities().map(c=>c.state))].sort((a,b)=>a.localeCompare(b,'en-US'));

  function fallbackCredentialHash(value){
    let hash=0x811c9dc5;
    for(const char of String(value??'')){
      hash^=char.charCodeAt(0);
      hash=Math.imul(hash,0x01000193);
    }
    return (hash>>>0).toString(16).padStart(8,'0');
  }

  async function secureCredentialHash(value){
    try{
      if(window.crypto?.subtle&&window.TextEncoder){
        const digest=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value??'')));
        return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
      }
    }catch(_error){}
    return '';
  }

  function restoreAdminSession(){
    try{adminAuthenticated=sessionStorage.getItem(ADMIN_SESSION_KEY)==='1';}
    catch(_error){adminAuthenticated=false;}
  }

  function setAdminSession(active){
    adminAuthenticated=!!active;
    try{
      if(adminAuthenticated)sessionStorage.setItem(ADMIN_SESSION_KEY,'1');
      else sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }catch(_error){}
  }

  function setAdminNotice(textValue,tone=''){
    adminNotice={text:String(textValue||''),tone};
    renderAdminUI();
  }

  function renderAdminUI(){
    document.body.classList.toggle('admin-authenticated',adminAuthenticated);
    document.querySelectorAll('[data-admin-login]').forEach(button=>{button.hidden=adminAuthenticated;});
    document.querySelectorAll('[data-admin-session]').forEach(bar=>{bar.hidden=!adminAuthenticated;});
    document.querySelectorAll('[data-admin-panel]').forEach(panel=>{panel.hidden=true;});
    const modal=document.getElementById('adminCitiesModal');
    if(modal&&!modal.hidden&&adminAuthenticated)renderAdminCitiesModal();
  }

  function openAdminLogin(trigger){
    const modal=document.getElementById('adminLoginModal');
    const username=document.getElementById('adminUsernameInput');
    const password=document.getElementById('adminPasswordInput');
    const validation=document.getElementById('adminLoginValidation');
    if(!modal)return;
    adminReturnFocus=trigger||document.activeElement;
    if(username)username.value='';
    if(password)password.value='';
    if(validation){validation.hidden=true;validation.textContent='';}
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('admin-login-open');
    setTimeout(()=>username?.focus(),0);
  }

  function closeAdminLogin(restoreFocus=true){
    const modal=document.getElementById('adminLoginModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('admin-login-open');
    const focusTarget=adminReturnFocus;
    adminReturnFocus=null;
    if(restoreFocus)setTimeout(()=>focusTarget?.focus?.(),0);
  }

  async function confirmAdminLogin(){
    const username=document.getElementById('adminUsernameInput')?.value.trim()||'';
    const password=document.getElementById('adminPasswordInput')?.value||'';
    const validation=document.getElementById('adminLoginValidation');
    const config=window.MAXIM_ADMIN_CONFIG||{};
    const secureHash=await secureCredentialHash(password);
    const passwordMatches=secureHash
      ? secureHash===String(config.passwordHash||'')
      : fallbackCredentialHash(password)===String(config.fallbackHash||'');
    if(username===String(config.username||'')&&passwordMatches){
      setAdminSession(true);
      closeAdminLogin(false);
      adminNotice={text:'Доступ администратора подтверждён.',tone:'success'};
      renderStartScreen();
      renderMobileStartScreen();
      openAdminCities(document.querySelector('[data-admin-login]'));
      return;
    }
    if(validation){
      validation.textContent=Localization.t('invalidCredentials');
      validation.hidden=false;
    }
    document.getElementById('adminPasswordInput')?.select();
  }

  function openAdminCities(trigger){
    if(!adminAuthenticated){openAdminLogin(trigger);return;}
    const modal=document.getElementById('adminCitiesModal');
    if(!modal)return;
    adminCitiesReturnFocus=trigger||document.activeElement;
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('admin-cities-open');
    renderAdminCitiesModal();
    setTimeout(()=>document.getElementById('adminCitySearch')?.focus(),0);
  }

  function closeAdminCities(restoreFocus=true){
    const modal=document.getElementById('adminCitiesModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('admin-cities-open');
    const focusTarget=adminCitiesReturnFocus;
    adminCitiesReturnFocus=null;
    if(restoreFocus)setTimeout(()=>focusTarget?.focus?.(),0);
  }

  function renderAdminCitiesModal(){
    const modal=document.getElementById('adminCitiesModal');
    if(!modal||modal.hidden||!adminAuthenticated)return;
    renderAdminPaymentRules();
    updateAdminNewCityPaymentHint();
    const searchInput=document.getElementById('adminCitySearch');
    const regionSelect=document.getElementById('adminCityRegionFilter');
    const hiddenOnly=document.getElementById('adminHiddenOnly');
    if(searchInput&&searchInput.value!==adminCitySearch)searchInput.value=adminCitySearch;
    const allRegions=[...new Set(allCities().map(city=>city.state))].sort((a,b)=>a.localeCompare(b,'en-US'));
    if(regionSelect){
      regionSelect.innerHTML='<option value="">Все провинции</option>'+allRegions.map(region=>`<option value="${escapeCityHtml(region)}" ${region===adminCityRegion?'selected':''}>${escapeCityHtml(region)}</option>`).join('');
    }
    if(hiddenOnly)hiddenOnly.checked=adminShowHiddenOnly;
    const query=adminCitySearch.trim().toLocaleLowerCase('en-US');
    const hiddenSet=hiddenCityIds();
    const filtered=allCities().filter(city=>{
      const hidden=hiddenSet.has(String(city.id));
      if(adminCityRegion&&city.state!==adminCityRegion)return false;
      if(adminShowHiddenOnly&&!hidden)return false;
      if(query&&!`${city.city} ${city.state}`.toLocaleLowerCase('en-US').includes(query))return false;
      return true;
    });
    const activeCount=allCities().length-hiddenSet.size;
    const stats=document.getElementById('adminCityStats');
    if(stats)stats.innerHTML=`<span><strong>${fmtNumber(activeCount)}</strong> активных</span><span><strong>${fmtNumber(hiddenSet.size)}</strong> деактивировано</span><span><strong>${fmtNumber(cityOverrides.added.length)}</strong> добавлено</span>`;
    const body=document.getElementById('adminCitiesTableBody');
    if(body){
      body.innerHTML=filtered.length?filtered.map(city=>{
        const hidden=hiddenSet.has(String(city.id));
        return `<tr class="${hidden?'is-inactive':''}">
          <td><label class="admin-visibility-toggle"><input type="checkbox" data-admin-city-visible="${escapeCityHtml(city.id)}" ${hidden?'':'checked'}><span aria-hidden="true"></span><b>${hidden?'Скрыт':'Активен'}</b></label></td>
          <td>${escapeCityHtml(city.state)}</td>
          <td><strong>${escapeCityHtml(city.city)}</strong>${city.isCustom?'<em class="admin-custom-badge">Добавлен</em>':''}</td>
          <td>${fmtNumber(city.population)}</td>
          <td>${fmtBRL(city.initialPayment)}</td>
        </tr>`;
      }).join(''):`<tr><td colspan="5" class="admin-empty-state">По заданным условиям города не найдены.</td></tr>`;
    }
    const result=document.getElementById('adminCityResultCount');
    if(result)result.textContent=`Показано: ${fmtNumber(filtered.length)}`;
    const message=document.getElementById('adminCitiesMessage');
    if(message){
      message.textContent=adminNotice.text;
      message.className=`admin-message${adminNotice.tone?` is-${adminNotice.tone}`:''}`;
    }
  }

  function validatePaymentRules(rules=adminPaymentRulesDraft){
    const ordered=[...rules].sort((a,b)=>Number(a.minPopulation)-Number(b.minPopulation));
    if(!ordered.length)return {ok:false,message:'Добавьте хотя бы одно правило паушального взноса.'};
    if(Number(ordered[0].minPopulation)!==0)return {ok:false,message:'Первый порог должен начинаться с населения 0.'};
    const seen=new Set();
    for(const rule of ordered){
      const minPopulation=Math.round(Number(rule.minPopulation));
      const amount=Math.round(Number(rule.amount));
      if(!Number.isFinite(minPopulation)||minPopulation<0)return {ok:false,message:'Порог населения должен быть целым неотрицательным числом.'};
      if(!Number.isFinite(amount)||amount<0)return {ok:false,message:'Паушальный взнос должен быть неотрицательным числом.'};
      if(seen.has(minPopulation))return {ok:false,message:`Порог ${fmtNumber(minPopulation)} указан более одного раза.`};
      seen.add(minPopulation);
    }
    return {ok:true,rules:ordered.map(rule=>({...rule,minPopulation:Math.round(Number(rule.minPopulation)),amount:Math.round(Number(rule.amount))}))};
  }

  function renderAdminPaymentRules(){
    const body=document.getElementById('adminFeeRulesBody');
    if(!body)return;
    const ordered=[...adminPaymentRulesDraft].sort((a,b)=>Number(a.minPopulation)-Number(b.minPopulation));
    const cityList=allCities();
    body.innerHTML=ordered.map((rule,index)=>{
      const next=ordered[index+1];
      const min=Math.max(0,Math.round(Number(rule.minPopulation)||0));
      const max=next?Math.max(min,Math.round(Number(next.minPopulation)||0)-1):null;
      const count=cityList.filter(city=>Number(city.population)>=min&&(max===null||Number(city.population)<=max)).length;
      const range=max===null?`от ${fmtNumber(min)}`:`${fmtNumber(min)}–${fmtNumber(max)}`;
      return `<tr>
        <td><input type="number" min="0" step="1" inputmode="numeric" data-admin-fee-threshold="${escapeCityHtml(rule.id)}" value="${min}" ${index===0?'disabled':''} aria-label="Население от"></td>
        <td class="admin-fee-rule-range">${range}</td>
        <td><input type="number" min="0" step="1000" inputmode="numeric" data-admin-fee-amount="${escapeCityHtml(rule.id)}" value="${Math.max(0,Math.round(Number(rule.amount)||0))}" aria-label="Паушальный взнос"></td>
        <td class="admin-fee-rule-count">${fmtNumber(count)}</td>
        <td><button class="btn danger admin-fee-rule-delete" type="button" data-admin-fee-delete="${escapeCityHtml(rule.id)}" ${index===0?'disabled':''} aria-label="Удалить порог">×</button></td>
      </tr>`;
    }).join('');
    const meta=document.querySelector('.admin-fee-rules-meta');
    const status=document.getElementById('adminFeeRulesStatus');
    if(meta){meta.classList.toggle('is-dirty',adminPaymentRulesDirty);meta.classList.toggle('is-saved',!adminPaymentRulesDirty);}
    if(status)status.textContent=adminPaymentRulesDirty
      ? 'Есть несохранённые изменения. Цены городов пока не изменены.'
      : `Сохранено правил: ${fmtNumber(ordered.length)}. Для массового изменения цен нажмите «Применить ко всем».`;
  }

  function updatePaymentRuleDraft(id,field,value){
    const rule=adminPaymentRulesDraft.find(item=>item.id===id);
    if(!rule)return;
    rule[field]=Math.max(0,Math.round(Number(value)||0));
    adminPaymentRulesDirty=true;
    renderAdminPaymentRules();
    updateAdminNewCityPaymentHint();
  }

  function addAdminPaymentRule(){
    if(!adminAuthenticated)return;
    const ordered=[...adminPaymentRulesDraft].sort((a,b)=>Number(a.minPopulation)-Number(b.minPopulation));
    const last=ordered.at(-1)||{minPopulation:0,amount:10000000};
    const nextThreshold=Math.max(1,Math.round(Number(last.minPopulation)||0)+50000);
    adminPaymentRulesDraft.push({id:`fee-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,minPopulation:nextThreshold,amount:Math.max(0,Math.round(Number(last.amount)||0))});
    adminPaymentRulesDirty=true;
    renderAdminPaymentRules();
  }

  function deleteAdminPaymentRule(id){
    if(!adminAuthenticated)return;
    const ordered=[...adminPaymentRulesDraft].sort((a,b)=>Number(a.minPopulation)-Number(b.minPopulation));
    if(ordered[0]?.id===id)return;
    adminPaymentRulesDraft=adminPaymentRulesDraft.filter(rule=>rule.id!==id);
    adminPaymentRulesDirty=true;
    renderAdminPaymentRules();
    updateAdminNewCityPaymentHint();
  }

  function saveAdminPaymentRules(showNotice=true){
    if(!adminAuthenticated)return false;
    const validation=validatePaymentRules();
    if(!validation.ok){setAdminNotice(validation.message,'error');return false;}
    cityOverrides.paymentRules=validation.rules;
    adminPaymentRulesDraft=validation.rules.map(rule=>({...rule}));
    adminPaymentRulesDirty=false;
    if(!saveCityOverrides())return false;
    if(showNotice)setAdminNotice('Правила паушального взноса сохранены. Текущие цены в списке не изменены.','success');
    else renderAdminPaymentRules();
    return true;
  }

  function applyAdminPaymentRules(){
    if(!adminAuthenticated)return;
    const validation=validatePaymentRules();
    if(!validation.ok){setAdminNotice(validation.message,'error');return;}
    const previewRules=validation.rules;
    const list=allCities();
    const changed=list.filter(city=>Number(city.initialPayment)!==paymentForPopulation(city.population,previewRules)).length;
    const question=`Применить правила ко всем ${fmtNumber(list.length)} городам? Будет изменено цен: ${fmtNumber(changed)}. Изменение затронет также деактивированные записи.`;
    if(!window.confirm(question))return;
    cityOverrides.paymentRules=previewRules;
    adminPaymentRulesDraft=previewRules.map(rule=>({...rule}));
    cityOverrides.paymentOverrides=Object.fromEntries(list.map(city=>[String(city.id),paymentForPopulation(city.population,previewRules)]));
    adminPaymentRulesDirty=false;
    if(!saveCityOverrides())return;
    const selected=state?.selectedCityId?adminCityById(state.selectedCityId):null;
    if(selected&&state?.activeScenario?.assumptions){
      state.activeScenario.assumptions.initialInvestment=Number(selected.initialPayment)||0;
      state.selectedCitySnapshot={id:selected.id,state:selected.state,city:selected.city,population:Number(selected.population)||0,initialPayment:Number(selected.initialPayment)||0};
    }
    adminNotice={text:`Правила применены. Обновлено цен: ${fmtNumber(changed)}.`,tone:'success'};
    renderStartScreen();
    renderMobileStartScreen();
    if(selected)recalc();
    else renderAdminCitiesModal();
  }

  function resetAdminPaymentRules(){
    if(!adminAuthenticated)return;
    if(!window.confirm('Вернуть стандартные пороги 0 / 20 001 / 50 001 / 100 001? Цены в списке останутся без изменений, пока вы не нажмёте «Применить ко всем».'))return;
    adminPaymentRulesDraft=cloneDefaultPaymentRules();
    adminPaymentRulesDirty=true;
    renderAdminPaymentRules();
    updateAdminNewCityPaymentHint();
  }

  function updateAdminNewCityPaymentHint(){
    const population=Math.round(Number(document.getElementById('adminNewCityPopulation')?.value)||0);
    const hint=document.getElementById('adminNewCityPaymentHint');
    const input=document.getElementById('adminNewCityPayment');
    if(!hint||!input)return;
    const rules=validatePaymentRules().ok?adminPaymentRulesDraft:cityOverrides.paymentRules;
    const base=basePaymentForPopulation(population,rules);
    const suggested=paymentForPopulation(population,rules);
    hint.textContent=population>0
      ? `По текущему правилу: ${fmtBRL(suggested)}.`
      : 'Оставьте пустым для автоматического расчёта по населению.';
  }

  function readAdminCityForm(){
    const value=id=>document.getElementById(id)?.value??'';
    const population=Math.round(Number(value('adminNewCityPopulation')));
    const rawPayment=String(value('adminNewCityPayment')).trim();
    const draftValidation=validatePaymentRules();
    const rules=draftValidation.ok?draftValidation.rules:cityOverrides.paymentRules;
    return {
      state:String(value('adminNewCityState')).trim(),
      city:String(value('adminNewCityName')).trim(),
      population,
      initialPayment:rawPayment===''?paymentForPopulation(population,rules):Math.round(Number(rawPayment))
    };
  }

  function addAdminCity(){
    if(!adminAuthenticated)return;
    const city=readAdminCityForm();
    if(!city.state||!city.city){setAdminNotice('Укажите провинцию и название города.','error');return;}
    if(!Number.isFinite(city.population)||city.population<=0){setAdminNotice('Численность населения должна быть больше нуля.','error');return;}
    if(!Number.isFinite(city.initialPayment)||city.initialPayment<0){setAdminNotice('Укажите корректный паушальный взнос.','error');return;}
    const duplicate=allCities().find(item=>
      item.state.toLocaleLowerCase('en-US')===city.state.toLocaleLowerCase('en-US')&&
      item.city.toLocaleLowerCase('en-US')===city.city.toLocaleLowerCase('en-US')&&
      Number(item.population)===city.population&&Number(item.initialPayment)===city.initialPayment
    );
    if(duplicate){setAdminNotice('Такая запись уже есть в списке.','error');return;}
    const id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const added={id,...city,isCustom:true};
    cityOverrides.added.push(added);
    cityOverrides.hiddenIds=cityOverrides.hiddenIds.filter(item=>item!==id);
    if(!saveCityOverrides())return;
    ['adminNewCityName','adminNewCityPopulation','adminNewCityPayment'].forEach(idValue=>{const input=document.getElementById(idValue);if(input)input.value='';});
    adminCityRegion=added.state;
    adminCitySearch='';
    adminNotice={text:`Город «${added.city}» добавлен и доступен обычным пользователям.`,tone:'success'};
    renderStartScreen();
    renderMobileStartScreen();
    renderAdminCitiesModal();
  }

  function setAdminCityVisibility(id,visible){
    if(!adminAuthenticated)return;
    const city=adminCityById(id);
    if(!city)return;
    const hidden=new Set(cityOverrides.hiddenIds.map(String));
    if(visible)hidden.delete(String(id));
    else hidden.add(String(id));
    cityOverrides.hiddenIds=[...hidden];
    if(!saveCityOverrides())return;
    if(!visible){
      if(startFilterCityId===id)startFilterCityId='';
      if(state?.selectedCityId===id){state.selectedCityId=null;state.selectedCitySnapshot=null;}
      if(startFilterState&&!cities().some(item=>item.state===startFilterState))startFilterState='';
    }
    adminNotice={text:`Город «${city.city}» ${visible?'активирован и снова отображается':'деактивирован и скрыт'} для обычных пользователей.`,tone:'success'};
    renderStartScreen();
    renderMobileStartScreen();
    setScreen();
    renderAdminCitiesModal();
  }

  function resetAdminCities(){
    if(!adminAuthenticated)return;
    if(!window.confirm('Восстановить исходный список, цены и правила? Добавленные записи будут удалены, все деактивированные города снова станут доступными, а массовые изменения цен будут отменены.'))return;
    cityOverrides={added:[],hiddenIds:[],paymentRules:cloneDefaultPaymentRules(),paymentOverrides:{}};
    adminPaymentRulesDraft=cloneDefaultPaymentRules();
    adminPaymentRulesDirty=false;
    if(!saveCityOverrides())return;
    startFilterState='';
    startFilterCityId='';
    if(state?.selectedCityId&&!cityById(state.selectedCityId)){state.selectedCityId=null;state.selectedCitySnapshot=null;}
    adminCitySearch='';
    adminCityRegion='';
    adminShowHiddenOnly=false;
    adminNotice={text:'Исходный список, цены и стандартные правила паушального взноса восстановлены.',tone:'success'};
    renderStartScreen();
    renderMobileStartScreen();
    setScreen();
    renderAdminCitiesModal();
  }
  const fmtNumber=v=>Math.round(Number(v)||0).toLocaleString(Localization.numberLocale());
  const fmtBRL=v=>FinancialEngine.formatCurrencyFull(v);
  const fmtBRLCompact=v=>FinancialEngine.formatCurrencyCompact(v);

  function hydrate(){
    loadCityOverrides();
    restoreAdminSession();
    const saved=Storage.load();
    state=saved&&saved.scenarios ? saved : {language:'fa-IR',currency:'IRT',advanced:false,activeScenarioId:'base',selectedCityId:null,scenarios:ScenarioManager.builtIns()};
    state.currency='IRT';
    state.advanced=false;
    // Small App Iran uses one reference scenario; payback is calculated from demand rather than targeted.
    const baseScenario=(ScenarioManager.builtIns().find(s=>s.id==='base')||ScenarioManager.builtIns()[0]);
    const savedBase=(state.scenarios||[]).find(s=>s.id==='base');
    if(savedBase&&savedBase.assumptions){
      baseScenario.assumptions={...baseScenario.assumptions,...savedBase.assumptions,autoPopulationUsingService:false};
      baseScenario.notes=savedBase.notes||'';
    }
    state.scenarios=[baseScenario];
    state.activeScenarioId='base';
    if(!Localization.languages.includes(state.language))state.language='fa-IR';
    Localization.setLanguage(state.language);
    // The city selector must always start empty on a fresh app open.
    // Language and scenarios can persist, but the user explicitly chooses the city each time.
    state.selectedCityId=null;
    state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];
    state.activeScenarioId=state.activeScenario.id;
    startFilterState='';
    startFilterCityId='';
  }
  function snapshot(){return JSON.stringify({language:state.language,currency:'IRT',advanced:false,activeScenarioId:state.activeScenarioId,selectedCityId:state.selectedCityId,scenarios:state.scenarios})}
  function pushUndo(){undo.push(snapshot());if(undo.length>100)undo.shift();redo=[]}
  function restore(snap){const parsed=JSON.parse(snap);state={...parsed,currency:'IRT'};state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];recalc()}
  function persist(){Storage.save({language:state.language,currency:'IRT',advanced:false,activeScenarioId:state.activeScenarioId,selectedCityId:state.selectedCityId,scenarios:state.scenarios})}

  function applySelectedCity(city){
    if(!city)return;
    resetModelTableScrollOnNextRender=true;
    const initialInvestment=Math.max(0,Number(city.initialPayment)||FinancialEngine.initialPaymentForPopulation(city.population));
    state.selectedCityId=city.id;
    state.selectedCitySnapshot={id:city.id,state:city.state,city:city.city,population:Number(city.population)||0,initialPayment:initialInvestment};
    const population=Number(city.population)||0;
    const recommendedBudget=FinancialEngine.annualMarketingBudgetForPopulation(population);
    state.activeScenario.assumptions.population=population;
    state.activeScenario.assumptions.province=city.state;
    state.activeScenario.assumptions.dailyOrderPotentialOverride=Number(city.dailyOrderPotential)||0;
    state.activeScenario.assumptions.initialInvestment=initialInvestment;
    state.activeScenario.assumptions.useRecommendedValues=true;
    state.activeScenario.assumptions.averageFare=FinancialEngine.recommendedAverageFareForPopulation(population,city.state);
    state.activeScenario.assumptions.commission=FinancialEngine.recommendedCommissionForPopulation(population,city.state);
    state.activeScenario.assumptions.advertisingPackage=FinancialEngine.advertisingPackageForPopulation(population);
    state.activeScenario.assumptions.marketingBudget=recommendedBudget;
    state.activeScenario.assumptions.marketingDistributionPreset='auto';
    state.activeScenario.assumptions.marketingDistribution=FinancialEngine.marketingSharesForPopulation(population);
    state.activeScenario.assumptions.autoPopulationUsingService=false;
    startFilterState=city.state;
    startFilterCityId=city.id;
  }

  let parametersReturnFocus=null;

  function getSelectedProvince(){
    return cityById(state.selectedCityId)?.state||state.activeScenario?.assumptions?.province||'';
  }

  function getRecommendedParameters(){
    const population=Number(state.activeScenario?.assumptions?.population)||Number(cityById(state.selectedCityId)?.population)||0;
    const province=getSelectedProvince();
    return {
      marketingBudget:FinancialEngine.annualMarketingBudgetForPopulation(population),
      averageFare:FinancialEngine.recommendedAverageFareForPopulation(population,province),
      commission:FinancialEngine.recommendedCommissionForPopulation(population,province)
    };
  }

  function normalizeLocalizedDigits(value){
    return String(value??'')
      .replace(/[۰-۹]/g,ch=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)))
      .replace(/[٠-٩]/g,ch=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(ch)))
      .replace(/[٫,]/g,'.');
  }
  function parseGroupedInteger(value){
    const digits=normalizeLocalizedDigits(value).replace(/[^0-9]/g,'');
    return digits?Number(digits):NaN;
  }
  function parseLocalizedNumber(value){
    const normalized=normalizeLocalizedDigits(value).replace(/[^0-9.+-]/g,'');
    const number=Number(normalized);
    return Number.isFinite(number)?number:NaN;
  }

  function formatGroupedInteger(value){
    const number=Math.max(0,Math.round(Number(value)||0));
    return number.toLocaleString(Localization.numberLocale()).replace(/ /g,' ');
  }

  function formatBudgetInput(input){
    if(!input)return;
    const parsed=parseGroupedInteger(input.value);
    input.value=Number.isFinite(parsed)?formatGroupedInteger(parsed):'';
  }

  function setParametersFieldsDisabled(disabled){
    const fields=document.getElementById('parametersFields');
    if(fields)fields.classList.toggle('is-disabled',disabled);
    ['annualInvestmentBudgetInput','averageFareParameterInput','driverCommissionParameterInput'].forEach(id=>{
      const input=document.getElementById(id);
      if(input)input.disabled=disabled;
    });
  }

  function updateParameterLimits(){
    const fare=document.getElementById('averageFareParameterInput');
    const commission=document.getElementById('driverCommissionParameterInput');
    const fareHint=document.getElementById('averageFareLimitHint');
    const commissionHint=document.getElementById('commissionLimitHint');
    if(fare){fare.min='0';fare.removeAttribute('max');delete fare.dataset.minimumFare;}
    if(commission){commission.min='0';commission.removeAttribute('max');delete commission.dataset.maximumCommission;}
    if(fareHint)fareHint.textContent=Localization.t('averageFareZoneHint');
    if(commissionHint)commissionHint.textContent=Localization.t('commissionLimitHint');
  }

  function setParameterInputs(values){
    const budget=document.getElementById('annualInvestmentBudgetInput');
    const fare=document.getElementById('averageFareParameterInput');
    const commission=document.getElementById('driverCommissionParameterInput');
    const selfManaged=document.getElementById('selfManagedParameterInput');
    const ownPremises=document.getElementById('ownPremisesParameterInput');
    if(budget)budget.value=formatGroupedInteger(values.marketingBudget);
    if(fare)fare.value=String(Math.max(0,Number(values.averageFare)||0));
    if(commission)commission.value=String(Math.max(0,Number(values.commission)||0));
    if(selfManaged)selfManaged.checked=values.selfManaged===true;
    if(ownPremises)ownPremises.checked=values.useOwnPremises===true;
    updateParameterLimits();
  }

  function readParameterInputs(){
    return {
      marketingBudget:parseGroupedInteger(document.getElementById('annualInvestmentBudgetInput')?.value),
      averageFare:parseLocalizedNumber(document.getElementById('averageFareParameterInput')?.value),
      commission:parseLocalizedNumber(document.getElementById('driverCommissionParameterInput')?.value),
      selfManaged:false,
      useOwnPremises:false
    };
  }

  function validateParameterDraft(showValid=false){
    const validation=document.getElementById('parametersValidation');
    if(!validation)return true;
    const values=readParameterInputs();
    let message='';
    if(!Number.isFinite(values.marketingBudget)||values.marketingBudget<0)message=Localization.t('validationAnnualBudget');
    else if(!Number.isFinite(values.averageFare)||values.averageFare<0)message=Localization.t('validationFare');
    else if(!Number.isFinite(values.commission)||values.commission<0)message=Localization.t('validationCommission');
    validation.textContent=message; validation.hidden=!message;
    if(!message&&showValid)validation.hidden=true;
    return !message;
  }

  function updateBudgetAssessment(){
    const el=document.getElementById('investmentBudgetAssessment');
    if(!el)return;
    const recommended=getRecommendedParameters().marketingBudget;
    const population=Math.max(1,Number(state.activeScenario?.assumptions?.population)||1);
    const budget=Math.max(0,parseGroupedInteger(document.getElementById('annualInvestmentBudgetInput')?.value)||0);
    const ratio=recommended>0?budget/recommended:0;
    const factor=FinancialEngine.investmentDemandFactor(budget,population);
    let key='budgetAssessmentRecommended',tone='recommended';
    if(budget===0){key='budgetAssessmentZero';tone='critical';}
    else if(ratio<0.3){key='budgetAssessmentCritical';tone='critical';}
    else if(ratio<0.7){key='budgetAssessmentBelow';tone='warning';}
    else if(ratio<1){key='budgetAssessmentWorking';tone='working';}
    else if(ratio<=1.3){key='budgetAssessmentRecommended';tone='recommended';}
    else {key='budgetAssessmentDiminishing';tone='neutral';}
    el.className=`parameter-assessment is-${tone}`;
    el.textContent=Localization.t(key,{percent:Math.round(ratio*100),ordersPercent:Math.round(factor*100),recommended:fmtBRL(recommended)});
  }

  function updateFareAssessment(){
    const el=document.getElementById('averageFareAssessment');
    if(!el)return;
    const a=state.activeScenario?.assumptions||{};
    const population=Math.max(1,Number(a.population)||1);
    const fare=Math.max(0,parseLocalizedNumber(document.getElementById('averageFareParameterInput')?.value)||0);
    const recommended=FinancialEngine.recommendedAverageFareForPopulation(population,getSelectedProvince());
    const factor=FinancialEngine.fareDemandFactor(fare,population,getSelectedProvince());
    const ratio=recommended>0?fare/recommended:1;
    let key='fareAssessmentBase',tone='recommended';
    if(ratio<0.9){key='fareAssessmentLow';tone='working';}
    else if(ratio<=1.15){key='fareAssessmentBase';tone='recommended';}
    else if(ratio<5){key='fareAssessmentIntercity';tone='neutral';}
    else {key='fareAssessmentHigh';tone='warning';}
    el.className=`parameter-assessment is-${tone}`;
    el.textContent=Localization.t(key,{fare:fmtBRL(fare),ordersPercent:Math.round(factor*100)});
  }

  function updateCommissionAssessment(){
    const el=document.getElementById('driverCommissionAssessment');
    if(!el)return;
    const a=state.activeScenario?.assumptions||{};
    const commission=Math.max(0,parseLocalizedNumber(document.getElementById('driverCommissionParameterInput')?.value)||0);
    const factor=FinancialEngine.commissionFulfillmentFactor(commission,Number(a.population)||1,getSelectedProvince());
    let key='commissionAssessmentRecommended',tone='recommended';
    if(commission<12.5){key='commissionAssessmentLow';tone='working';}
    else if(commission<=13.5){key='commissionAssessmentRecommended';tone='recommended';}
    else if(commission<=15){key='commissionAssessmentElevated';tone='working';}
    else if(commission<18){key='commissionAssessmentHigh';tone='warning';}
    else {key='commissionAssessmentCritical';tone='critical';}
    el.className=`parameter-assessment is-${tone}`;
    el.textContent=Localization.t(key,{commission:Number(commission.toFixed(1)),ordersPercent:Math.round(factor*100)});
  }

  function updateParameterAssessments(){updateBudgetAssessment();updateFareAssessment();updateCommissionAssessment();}

  function refreshLocalizedParameterUI(){
    const budget=document.getElementById('annualInvestmentBudgetInput');
    if(budget&&budget.value){
      const value=parseGroupedInteger(budget.value);
      if(Number.isFinite(value))budget.value=formatGroupedInteger(value);
    }
    updateParameterLimits();
    updateParameterAssessments();
    validateParameterDraft();
    renderParameterButtonLabels();
  }

  function renderParameterButtonLabels(){
    const label=Localization.t('parameters');
    ['parametersBtn','mobileParametersBtn'].forEach(id=>{
      const button=document.getElementById(id);
      if(button){button.title=label;button.setAttribute('aria-label',label);}
    });
    const cityLabel=Localization.t('changeCity');
    ['changeCityBtn','mobileChangeCityBtn'].forEach(id=>{
      const button=document.getElementById(id);
      if(button){button.title=cityLabel;button.setAttribute('aria-label',cityLabel);}
    });
  }

  function openParametersModal(trigger){
    if(!cityById(state.selectedCityId))return;
    const modal=document.getElementById('parametersModal');
    const checkbox=document.getElementById('recommendedValuesCheckbox');
    const validation=document.getElementById('parametersValidation');
    if(!modal||!checkbox)return;
    parametersReturnFocus=trigger||document.activeElement;
    const current=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);
    const recommended=getRecommendedParameters();
    const useRecommended=current.useRecommendedValues!==false;
    checkbox.checked=useRecommended;
    modal.dataset.customBudget=String(current.marketingBudget);
    modal.dataset.customFare=String(current.averageFare);
    modal.dataset.customCommission=String(current.commission);
    setParameterInputs({...(useRecommended?recommended:current),selfManaged:current.selfManaged,useOwnPremises:current.useOwnPremises});
    setParametersFieldsDisabled(useRecommended);
    updateParameterLimits();
    updateParameterAssessments();
    if(validation){validation.hidden=true;validation.textContent='';}
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('parameters-modal-open');
    setTimeout(()=>{(useRecommended?checkbox:document.getElementById('annualInvestmentBudgetInput'))?.focus();},0);
  }

  function closeParametersModal(){
    const modal=document.getElementById('parametersModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('parameters-modal-open');
    const focusTarget=parametersReturnFocus;
    parametersReturnFocus=null;
    setTimeout(()=>focusTarget?.focus?.(),0);
  }

  function toggleRecommendedDraft(checked){
    const modal=document.getElementById('parametersModal');
    if(!modal)return;
    if(checked){
      const current=readParameterInputs();
      if(Number.isFinite(current.marketingBudget))modal.dataset.customBudget=String(current.marketingBudget);
      if(Number.isFinite(current.averageFare))modal.dataset.customFare=String(current.averageFare);
      if(Number.isFinite(current.commission))modal.dataset.customCommission=String(current.commission);
      const options=readParameterInputs();
      setParameterInputs({...getRecommendedParameters(),selfManaged:options.selfManaged,useOwnPremises:options.useOwnPremises});
    }else{
      const options=readParameterInputs();
      setParameterInputs({marketingBudget:Number(modal.dataset.customBudget),averageFare:Number(modal.dataset.customFare),commission:Number(modal.dataset.customCommission),selfManaged:options.selfManaged,useOwnPremises:options.useOwnPremises});
    }
    setParametersFieldsDisabled(checked);
    updateParameterAssessments();
  }

  function confirmParameters(){
    const checkbox=document.getElementById('recommendedValuesCheckbox');
    const validation=document.getElementById('parametersValidation');
    if(!checkbox)return;
    const useRecommended=checkbox.checked;
    const draft=readParameterInputs();
    const values=useRecommended?{...getRecommendedParameters(),selfManaged:draft.selfManaged,useOwnPremises:draft.useOwnPremises}:draft;
    let message='';
    if(!Number.isFinite(values.marketingBudget)||values.marketingBudget<0)message=Localization.t('validationAnnualBudget');
    else if(!Number.isFinite(values.averageFare)||values.averageFare<0)message=Localization.t('validationFare');
    else if(!Number.isFinite(values.commission)||values.commission<0)message=Localization.t('validationCommission');
    if(message){
      if(validation){validation.textContent=message;validation.hidden=false;}
      return;
    }
    pushUndo();
    const a=state.activeScenario.assumptions;
    a.useRecommendedValues=useRecommended;
    a.province=getSelectedProvince();
    a.marketingBudget=values.marketingBudget;
    a.averageFare=values.averageFare;
    a.commission=values.commission;
    a.selfManaged=false;
    a.useOwnPremises=false;
    a.marketingDistributionPreset='auto';
    a.marketingDistribution=FinancialEngine.marketingSharesForPopulation(a.population);
    closeParametersModal();
    recalc();
  }

  function setScreen(){
    const hasCity=!!cityById(state.selectedCityId);
    document.body.classList.toggle('city-start-mode',!hasCity);
    document.getElementById('startScreen').hidden=hasCity;
    document.getElementById('dashboard').hidden=!hasCity;
    document.querySelector('.topbar').hidden=!hasCity;
    if(!hasCity){delete document.body.dataset.mobileSlide; const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page='start';}
    else if(isMobileLayout()&&!document.body.dataset.mobileSlide){document.body.dataset.mobileSlide='kpi'; const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page='kpi';}
  }

  function renderSelectedCityBanner(){
    const box=document.getElementById('selectedCityBanner');
    const topbar=document.getElementById('topbarCityMeta');
    const c=cityById(state.selectedCityId);
    const effectiveInvestment=state.activeScenario?.assumptions?.initialInvestment??c?.initialPayment??0;
    const html=c ? `<div class="city-chip"><strong>${Localization.t('selectedCity')}:</strong> ${escapeCityHtml(c.city)}, ${escapeCityHtml(c.state)}</div><div class="city-chip"><strong>${Localization.t('populationHeader')}:</strong> ${fmtNumber(c.population)}</div><div class="city-chip"><strong>${Localization.t('initialPaymentHeader')}:</strong> ${fmtBRL(effectiveInvestment)}</div>` : '';
    if(box) box.innerHTML=html;
    if(topbar) topbar.innerHTML='';
  }

  function syncModelTableScrollRange(){
    const wrap=document.getElementById('modelTableWrap');
    const range=document.getElementById('modelTableScrollRange');
    const control=document.getElementById('modelTableScrollControl');
    if(!wrap||!range||!control)return;
    const max=Math.max(0,wrap.scrollWidth-wrap.clientWidth);
    const ratio=max>0?Math.min(1,Math.max(0,wrap.scrollLeft/max)):0;
    range.value=String(Math.round(ratio*1000));
    range.disabled=max<2;
    control.classList.toggle('is-static',max<2);
    range.setAttribute('aria-label',Localization.t('tableScrollAria'));
    control.setAttribute('aria-label',Localization.t('tableScrollAria'));
  }

  function setModelTableScrollFromRange(value){
    const wrap=document.getElementById('modelTableWrap');
    if(!wrap)return;
    const max=Math.max(0,wrap.scrollWidth-wrap.clientWidth);
    wrap.scrollLeft=max*(Math.max(0,Math.min(1000,Number(value)||0))/1000);
  }

  function renderStartScreen(){
    Localization.setLanguage(state.language);
    ['startLanguageSelect','mobileLanguageSelect','mobileDashboardLanguageSelect','languageSelect'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=state.language;});
    const stateSelect=document.getElementById('startStateSelect');
    const citySelect=document.getElementById('startCitySelect');
    if(!stateSelect||!citySelect)return;
    const st=states();
    const statePlaceholder=Localization.t('selectProvincePlaceholder');
    const cityFirstPlaceholder=Localization.t('selectKecamatanFirstPlaceholder');
    const cityPlaceholder=Localization.t('selectKecamatanPlaceholder');
    stateSelect.innerHTML=`<option value="">${statePlaceholder}</option>`+st.map(x=>`<option value="${escapeCityHtml(x)}" ${x===startFilterState?'selected':''}>${escapeCityHtml(x)}</option>`).join('');
    const filtered=startFilterState ? cities().filter(c=>c.state===startFilterState) : cities();
    citySelect.disabled=!startFilterState;
    citySelect.innerHTML=startFilterState
      ? `<option value="">${cityPlaceholder}</option>`+filtered.map(c=>`<option value="${escapeCityHtml(c.id)}" ${c.id===startFilterCityId?'selected':''}>${escapeCityHtml(c.city)}</option>`).join('')
      : `<option value="">${cityFirstPlaceholder}</option>`;
    const calculateBtn=document.getElementById('startCalculateBtn');
    if(calculateBtn)calculateBtn.disabled=!startFilterCityId;
    const table=document.getElementById('cityTable');
    const rows=filtered.map(c=>`<tr data-city-row="${escapeCityHtml(c.id)}" class="${c.id===startFilterCityId?'selected':''}"><td>${escapeCityHtml(c.state)}</td><td>${escapeCityHtml(c.city)}</td><td>${fmtNumber(c.population)}</td><td>${fmtBRL(c.initialPayment)}</td></tr>`).join('');
    table.innerHTML=`<thead><tr><th>${Localization.t('state')}</th><th>${Localization.t('city')}</th><th>${Localization.t('populationHeader')}</th><th>${Localization.t('initialPaymentHeader')}</th></tr></thead><tbody>${rows}</tbody>`;
    renderAdminUI();
  }


  function isMobileLayout(){
    return window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
  }

  function mobileActivateSlide(target){
    if(!isMobileLayout()){
      const el=document.querySelector(target);
      if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
      return;
    }
    const map={
      '.hero-row':'kpi',
      '.chart-card':'chart',
      '#mobileInsightsSummary':'summary'
    };
    const slide=map[target]||target||'kpi';
    document.body.dataset.mobileSlide=slide;
    const ma=document.getElementById('mobileApp'); if(ma)ma.dataset.page=slide;
    window.scrollTo({top:0,left:0,behavior:'auto'});
    setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}},40);
  }

  function mobileScrollTo(selector){
    mobileActivateSlide(selector);
  }

  function ensureMobilePresentation(){
    const dashboard=document.getElementById('dashboard');
    const hero=dashboard?.querySelector('.hero-row');
    const chart=dashboard?.querySelector('.chart-card');
    const modelCol=dashboard?.querySelector('.model-column');
    if(!dashboard||!hero||!chart||!modelCol)return;

    if(!document.getElementById('mobileKpiNext')){
      const btn=document.createElement('button');
      btn.id='mobileKpiNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','.chart-card');
      btn.setAttribute('aria-label',Localization.t('nextScreen'));
      btn.innerHTML='<span>↓</span>';
      hero.appendChild(btn);
    }

    if(!document.getElementById('mobileChartPrev')){
      const btn=document.createElement('button');
      btn.id='mobileChartPrev';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-top';
      btn.setAttribute('data-mobile-target','.hero-row');
      btn.setAttribute('aria-label',Localization.t('previousScreen'));
      btn.innerHTML='<span>↑</span>';
      chart.prepend(btn);
    }
    if(!document.getElementById('mobileChartNext')){
      const btn=document.createElement('button');
      btn.id='mobileChartNext';
      btn.type='button';
      btn.className='mobile-slide-button mobile-slide-button-bottom';
      btn.setAttribute('data-mobile-target','#mobileInsightsSummary');
      btn.setAttribute('aria-label',Localization.t('nextScreen'));
      btn.innerHTML='<span>↓</span>';
      chart.appendChild(btn);
    }

    let combined=document.getElementById('mobileInsightsSummary');
    if(!combined){
      combined=document.createElement('section');
      combined.id='mobileInsightsSummary';
      combined.className='side-card mobile-insights-summary-card';
      combined.innerHTML=`
        <button type="button" class="mobile-slide-button mobile-slide-button-top" data-mobile-target=".chart-card" aria-label="${Localization.t('previousScreen')}"><span>↑</span></button>
        <div class="mobile-combined-content">
          <div class="mobile-combined-block">
            <h3 data-mobile-insights-title></h3>
            <div id="mobileInsightsList"></div>
          </div>
          <div class="mobile-combined-block">
            <h3 data-mobile-summary-title></h3>
            <div id="mobileSummaryList"></div>
          </div>
        </div>
      `;
      chart.insertAdjacentElement('afterend',combined);
    }
    const it=combined.querySelector('[data-mobile-insights-title]');
    if(it)it.textContent=Localization.t('keyInsights');
    const st=combined.querySelector('[data-mobile-summary-title]');
    if(st)st.textContent=Localization.t('summary12');
  }

  function syncMobilePresentation(){
    ensureMobilePresentation();
    const srcInsights=document.getElementById('insightsList');
    const dstInsights=document.getElementById('mobileInsightsList');
    const srcSummary=document.getElementById('summaryList');
    const dstSummary=document.getElementById('mobileSummaryList');
    if(srcInsights&&dstInsights)dstInsights.innerHTML=srcInsights.innerHTML;
    if(srcSummary&&dstSummary)dstSummary.innerHTML=srcSummary.innerHTML;
  }



  function mobileSetPage(page){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    const next=(page==='detail'?'resumo':(page||'kpi'));
    app.dataset.page=next;
    document.body.dataset.mobileSlide=next;
    if(isMobileLayout()){
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      window.scrollTo(0,0);
      renderMobileKpis();
      renderMobileSummaryAndDetail();
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},20);
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));}catch(_e){}; renderMobileChart();},160);
    }
  }

  function renderMobileStartScreen(){
    const app=document.getElementById('mobileApp');
    if(!app)return;
    const mobileLang=document.getElementById('mobileLanguageSelect');
    if(mobileLang)mobileLang.value=state.language;
    const titleEl=document.querySelector('#mobileStartScreen .mobile-start-title');
    const subtitleEl=document.querySelector('#mobileStartScreen .mobile-start-subtitle');
    const stateSelect=document.getElementById('mobileStateSelect');
    const citySelect=document.getElementById('mobileCitySelect');
    const btn=document.getElementById('mobileCalculateBtn');
    if(titleEl)titleEl.textContent=Localization.t('mobileWelcomeTitle');
    if(subtitleEl)subtitleEl.textContent=Localization.t('mobileWelcomeSubtitle');
    if(!stateSelect||!citySelect||!btn)return;
    btn.textContent=Localization.t('mobileCalculate');
    const st=states();
    const statePlaceholder=Localization.t('selectProvincePlaceholder');
    const cityFirstPlaceholder=Localization.t('selectKecamatanFirstPlaceholder');
    const cityPlaceholder=Localization.t('selectKecamatanPlaceholder');
    stateSelect.innerHTML=`<option value="">${statePlaceholder}</option>`+st.map(x=>`<option value="${escapeCityHtml(x)}" ${x===startFilterState?'selected':''}>${escapeCityHtml(x)}</option>`).join('');
    const filtered=startFilterState ? cities().filter(c=>c.state===startFilterState) : [];
    citySelect.disabled=!startFilterState;
    citySelect.innerHTML=startFilterState
      ? `<option value="">${cityPlaceholder}</option>`+filtered.map(c=>`<option value="${escapeCityHtml(c.id)}" ${c.id===startFilterCityId?'selected':''}>${escapeCityHtml(c.city)}</option>`).join('')
      : `<option value="">${cityFirstPlaceholder}</option>`;
    btn.disabled=!startFilterCityId;
    renderAdminUI();
  }

  function mobileKpiIcon(name){
    const icons={
      city:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16"/><path d="M6 20V8.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2V20"/><path d="M9 10h.01M12 10h.01M15 10h.01M9 14h.01M12 14h.01M15 14h.01" stroke-linecap="round" stroke-width="2.2"/><path d="M10 20v-3.2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>`,
      briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
      target:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
      profit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/><path d="M5 21h14"/></svg>`,
      roi:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/></svg>`
    };
    return `<span class="mobile-kpi-icon">${icons[name]||icons.briefcase}</span>`;
  }

  const htmlEsc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  function mobileMonthLabel(value){
    const n=Number(value);
    if(!Number.isFinite(n)||n<=0)return Localization.t('notAchieved12');
    return Localization.formatMonthDuration(n);
  }

  function mobileSetText(elementId, i18nKey, vars={}){
    const el=document.getElementById(elementId);
    if(el)el.textContent=Localization.t(i18nKey,vars);
  }

  function mobileInsightIcon(name){
    const icons={
      briefcase:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1"/><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 12h16M10 12v2h4v-2"/></svg>`,
      calendar:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
      growth:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17l5-5 4 4 7-9"/><path d="M15 7h5v5"/></svg>`,
      coin:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 10.2c0-1.4 1.2-2.2 3-2.2s3 .8 3 2.2c0 1.3-1 1.9-3 2.1-2 .2-3 .8-3 2.1s1.2 2.2 3 2.2 3-.8 3-2.2"/></svg>`,
      balance:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M5 8h14M7 8l-3 6h6L7 8zM17 8l-3 6h6l-3-6z"/></svg>`
    };
    return icons[name]||icons.calendar;
  }

  let mobileTooltipSeq=0;
  function mobileInfoTooltip(text,className=''){
    const raw=String(text??'');
    const id='mobile-info-tooltip-'+(++mobileTooltipSeq);
    const aria=htmlEsc(raw.replace(/\s+/g,' ').trim());
    const body=htmlEsc(raw).replace(/\n/g,'<br>');
    const cls=className?' '+className:'';
    return `<button class="info-tooltip${cls}" type="button" aria-label="${aria}" aria-describedby="${id}"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path d="M8 7.1v4.2" stroke-linecap="round"/><circle cx="8" cy="4.8" r=".75" fill="currentColor" stroke="none"/></svg><span id="${id}" class="info-tooltip-bubble" role="tooltip">${body}</span></button>`;
  }

  function renderMobileKpis(){
    const holder=document.getElementById('mobileKpiContent');
    if(!holder||!model)return;
    const c=cityById(state.selectedCityId);
    const cityTitle=c?`${c.city}, ${c.state}`:'—';
    const pop=c?fmtNumber(c.population):'—';
    const pay=fmtBRL(model.summary.initialPayment||0);
    const paybackText=mobileMonthLabel(model.summary.paybackPeriod);
    const monthlyBreakEven=model.summary.breakEvenPeriod?Localization.t('monthlyBreakEvenValue',{n:Math.round(Number(model.summary.breakEvenPeriod))}):Localization.t('notAchieved12');
    const profitCompact=fmtBRLCompact(model.summary.netProfit);
    const cards=[
      {cls:'city',icon:'city',label:Localization.t('selectedCity'),value:cityTitle,sub:`${Localization.t('populationHeader')}: ${pop} · ${Localization.t('initialPaymentHeader')}: ${pay}`},
      {cls:'investment-editable',icon:'briefcase',label:Localization.t('initialInvestment'),value:fmtBRLCompact(model.summary.totalInvestment),sub:`${Localization.t('averageMonthlyInvestment')}: ${fmtBRLCompact((model.summary.totalMarketingInvestment||0)/12)}`},
      {icon:'target',label:Localization.t('breakEven'),value:paybackText,sub:`${Localization.t('monthlyEquilibrium')}: ${monthlyBreakEven}`},
      {icon:'profit',label:Localization.t('yearProfit'),value:profitCompact},
      {icon:'roi',label:Localization.t('kpiMargin'),value:Math.round(model.summary.roi)+' %'}
    ];
    const cardHtml=cards.map(x=>{
      return `<div class="mobile-kpi-card ${x.cls||''}">${mobileKpiIcon(x.icon)}<div class="mobile-kpi-copy"><div class="mobile-kpi-label">${htmlEsc(x.label)}</div><div class="mobile-kpi-value">${htmlEsc(x.value)}</div>${x.sub?`<div class="mobile-kpi-sub">${htmlEsc(x.sub)}</div>`:''}</div></div>`;
    }).join('');
    holder.innerHTML=cardHtml;
  }

  function mobileChartConfig(){
    if(!model)return null;
    const months=model.months.filter(x=>x.index>1);
    const labels=months.map((m,i)=>String(i+1));
    const net=months.map(x=>x.netProfit);
    const accumulated=months.map(x=>x.accumulated);
    return {
      type:'bar',
      data:{labels,datasets:[
        {label:Localization.t('monthlyNetProfit'),data:net,backgroundColor:net.map(v=>v<0?'rgba(226,71,71,.72)':'rgba(111,160,83,.72)'),borderColor:net.map(v=>v<0?'#e24747':'#6fa053'),borderWidth:1,borderRadius:6,barPercentage:.62,categoryPercentage:.72},
        {label:Localization.t('accumulatedNetProfit'),data:accumulated,backgroundColor:'rgba(23,59,99,.28)',borderColor:'#173b63',borderWidth:1,borderRadius:6,barPercentage:.62,categoryPercentage:.72}
      ]},
      options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${FinancialEngine.formatCurrencyFull(ctx.raw)}`}}},scales:{x:{grid:{display:false},ticks:{font:{size:10},autoSkip:false,maxRotation:0}},y:{ticks:{callback:v=>FinancialEngine.formatCurrencyCompact(v),font:{size:10},maxTicksLimit:6},grid:{color:'#e5e7eb'},beginAtZero:true}}}
    };
  }

  function renderMobileChart(){
    const canvas=document.getElementById('mobileCashFlowChart');
    if(!model||!isMobileLayout())return;
    const title=document.querySelector('#mobileChartScreen .mobile-chart-card h2');
    if(title)title.textContent=Localization.t('cashFlowOverview');
    const note=document.getElementById('mobileChartNote');
    if(note)note.textContent=model.summary.paybackPeriod?Localization.t('mobileCashFlowNote',{payback:mobileMonthLabel(model.summary.paybackPeriod)}):Localization.t('noPaybackText');
    if(!canvas||!window.Chart)return;
    const cfg=mobileChartConfig();
    if(!cfg)return;
    if(mobileChart&&mobileChart.config&&mobileChart.config.type!==cfg.type){mobileChart.destroy();mobileChart=null;}
    if(mobileChart){mobileChart.data=cfg.data;mobileChart.options=cfg.options;mobileChart.resize();mobileChart.update();}
    else mobileChart=new Chart(canvas,cfg);
    const legend=document.getElementById('mobileChartLegend');
    if(legend){
      legend.innerHTML=`<span><i class="mobile-chart-dot" style="background:#6fa053"></i>${Localization.t('monthlyNetProfit')}</span><span><i class="mobile-chart-dot" style="background:#173b63"></i>${Localization.t('accumulatedNetProfit')}</span>`;
    }
  }

  function updateMobileWhatsAppCta(){
    const finalCta=document.getElementById('mobileWhatsAppCta');
    const stickyCta=document.getElementById('mobileStickyCta');
    const href='http://ble.ir/maxim_franchise';
    const markup=`<span class="bale-cta-label">${Localization.t('contactInBale')}</span>`; 
    if(finalCta){
      finalCta.href=href;
      finalCta.setAttribute('aria-label',Localization.t('contactInBale'));
      if(!finalCta.querySelector('.bale-cta-label'))finalCta.innerHTML=markup;
    }
    if(stickyCta){
      stickyCta.href=href;
      stickyCta.setAttribute('aria-label',Localization.t('contactInBale'));
      if(!stickyCta.querySelector('.bale-cta-label'))stickyCta.innerHTML=markup;
    }
  }


  function setupMobileStickyCtaVisibility(){
    const stickyCta=document.getElementById('mobileStickyCta');
    const finalCta=document.querySelector('.final-cta-section');
    if(!stickyCta)return;
    const setHidden=hidden=>{
      stickyCta.classList.toggle('is-hidden',!!hidden);
      stickyCta.setAttribute('aria-hidden',hidden?'true':'false');
      if(hidden){stickyCta.dataset.prevTabindex=stickyCta.getAttribute('tabindex')||'';stickyCta.setAttribute('tabindex','-1');}
      else if(stickyCta.dataset.prevTabindex!==undefined){const prev=stickyCta.dataset.prevTabindex;if(prev)stickyCta.setAttribute('tabindex',prev);else stickyCta.removeAttribute('tabindex');delete stickyCta.dataset.prevTabindex;}
    };
    if(mobileStickyCtaObserver){
      try{mobileStickyCtaObserver.disconnect();}catch(_e){}
      mobileStickyCtaObserver=null;
    }
    if(!finalCta||!('IntersectionObserver' in window)){
      const onScroll=()=>{
        const target=document.querySelector('.final-cta-section');
        if(!target){setHidden(false);return;}
        const rect=target.getBoundingClientRect();
        const viewportHeight=window.innerHeight||document.documentElement.clientHeight||0;
        setHidden(rect.top < viewportHeight * 0.82 && rect.bottom > viewportHeight * 0.18);
      };
      if(stickyCta.dataset.scrollFallbackBound!=='1'){
        stickyCta.dataset.scrollFallbackBound='1';
        window.addEventListener('scroll',onScroll,{passive:true});
        window.addEventListener('resize',onScroll);
      }
      setTimeout(onScroll,0);
      return;
    }
    mobileStickyCtaObserver=new IntersectionObserver(([entry])=>{
      setHidden(entry && entry.isIntersecting);
    },{threshold:0.35});
    mobileStickyCtaObserver.observe(finalCta);
  }

  function renderMobileInsights(){
    const dst=document.getElementById('mobileStandaloneInsights');
    if(!dst||!model)return;
    const rows=UIRenderer.getInsightRows(model);
    dst.innerHTML=rows.map(row=>`<div class="insight" data-tone="${row.tone||'neutral'}"><div class="insight-badge">${mobileInsightIcon(row.icon)}</div><div><div class="insight-title">${htmlEsc(Localization.t(row.title))}</div><div class="insight-text">${htmlEsc(Localization.t(row.text,row.vars||{}))}</div></div></div>`).join('');
  }

  function renderMobileSummary(){
    const dst=document.getElementById('mobileStandaloneSummary');
    if(!dst||!model)return;
    const rows=[
      ['totalInvestment',model.summary.totalInvestment,'currency','summary-investment-row'],
      ['totalPartnerRevenue',model.summary.totalRevenue,'currency','summary-positive-row'],
      ['summaryOperatingExpenses',model.summary.totalOperatingExpenses,'currency','summary-expense-row'],
      ['netProfit',model.summary.netProfit,'currency','summary-positive-row'],
      ['roi12',model.summary.roi,'%','summary-positive-row'],
      ['paybackPeriod',model.summary.paybackPeriod?Localization.formatMonthDuration(model.summary.paybackPeriod):Localization.t('notAchieved12'),'','summary-positive-row']
    ];
    dst.innerHTML=rows.map(([key,val,type,cls])=>{
      const value=typeof val==='number'?(type==='%'?Math.round(val)+' %':fmtBRL(val)):val;
      return `<div class="summary-row ${cls||''}"><span>${htmlEsc(Localization.t(key))}</span><span>${htmlEsc(value)}</span></div>`;
    }).join('');
  }

  function renderMobileCompactTable(){
    const holder=document.getElementById('mobileCompactTable');
    const title=document.getElementById('mobileCompactTableTitle');
    const note=document.getElementById('mobileCompactTableNote');
    if(title)title.textContent=Localization.t('mobileCompactTableTitle');
    if(note)note.textContent=Localization.t('mobileCompactTableNote');
    if(!holder||!model)return;
    const sourceRows=Array.from(document.querySelectorAll('#modelTable tbody tr'));
    if(!sourceRows.length){holder.innerHTML='';return;}
    let html=`<table class="mobile-compact-table"><thead><tr><th>${htmlEsc(Localization.t('section'))}</th><th>${htmlEsc(Localization.t('month'))}</th><th>1</th><th>12</th></tr></thead><tbody>`;
    sourceRows.forEach(tr=>{
      const sectionCell=tr.querySelector('.table-section-title');
      let sectionHtml='';
      if(sectionCell){
        const sectionButton=sectionCell.querySelector('[data-model-detail]');
        const sectionText=(sectionCell.querySelector('.section-text')?.textContent||sectionCell.textContent||'').replace(Localization.t('detailsLink'),'').replace(/\s*[,،]?\s*(?:(?:в|in)\s+)?IRT\.?\s*$/i,'').trim();
        const rowSpan=Math.max(1,Number(sectionCell.getAttribute('rowspan'))||1);
        const key=sectionButton?.dataset.modelDetail||'';
        const tone=['investment','operations','expenses','profit'].find(x=>sectionCell.classList.contains(x))||'investment';
        sectionHtml=`<td class="mobile-compact-section-cell mobile-compact-${tone}" rowspan="${rowSpan}">${key?`<button type="button" class="mobile-compact-section-button" data-model-detail="${htmlEsc(key)}"><span>${htmlEsc(sectionText)}</span><span aria-hidden="true">›</span></button>`:`<span>${htmlEsc(sectionText)}</span>`}</td>`;
      }
      const metricCell=tr.querySelector('.table-row-label');
      const metricButton=metricCell?.querySelector('[data-model-detail]');
      const metricLabel=(metricCell?.querySelector('.metric-detail-button__text,.metric-plain-label')?.textContent||metricCell?.textContent||'').trim();
      const metricHtml=metricButton?`<button type="button" class="mobile-compact-metric-button" data-model-detail="${htmlEsc(metricButton.dataset.modelDetail||'')}"><span>${htmlEsc(metricLabel)}</span><span aria-hidden="true">›</span></button>`:`<span class="mobile-compact-metric-label">${htmlEsc(metricLabel)}</span>`;
      const cells=Array.from(tr.querySelectorAll('td.table-cell'));
      const first=cells[0];
      const last=cells[cells.length-1];
      const valueClass=cell=>['mobile-compact-value',cell?.classList.contains('positive')?'positive':'',cell?.classList.contains('negative')?'negative':'',cell?.classList.contains('muted-cell')?'muted':''].filter(Boolean).join(' ');
      const firstText=(first?.textContent||'—').trim();
      const lastText=(last?.textContent||'—').trim();
      html+=`<tr>${sectionHtml}<td class="mobile-compact-metric-cell">${metricHtml}</td><td class="${valueClass(first)}">${htmlEsc(firstText)}</td><td class="${valueClass(last)}">${htmlEsc(lastText)}</td></tr>`;
    });
    html+='</tbody></table>';
    holder.innerHTML=html;
  }

  function renderMobilePresentation(){
    mobileSetText('mobilePresentationTitle','mobilePresentationTitle');
    mobileSetText('mobilePresentationText','mobilePresentationText');
    mobileSetText('mobileFinalCtaTitle','mobileFinalCtaTitle');
    mobileSetText('mobileFinalCtaText','mobileFinalCtaText');
    mobileSetText('mobileDisclaimer','mobileDisclaimer');
    const list=document.getElementById('mobilePresentationList');
    if(list){
      list.innerHTML=[1,2,3,4,5].map(i=>`<li>${htmlEsc(Localization.t('mobilePresentationPoint'+i))}</li>`).join('');
    }
  }

  function renderMobileSummaryAndDetail(){
    const insightsTitle=document.querySelector('#mobileSummaryScreen .mobile-info-panel h2');
    const resumoTitle=document.querySelector('#mobileResumoScreen .mobile-info-panel h2');
    if(insightsTitle)insightsTitle.textContent=Localization.t('keyInsights');
    if(resumoTitle)resumoTitle.textContent=Localization.t('summary12');
    renderMobileInsights();
    renderMobileSummary();
    renderMobileCompactTable();
    renderMobilePresentation();
    updateMobileWhatsAppCta();
    setupMobileStickyCtaVisibility();
  }



  function mobilePageOrder(){return ['kpi','chart','summary','resumo','compact-table','presentation'];}
  function mobileNextPage(page){const a=mobilePageOrder();const i=a.indexOf(page);return i>=0&&i<a.length-1?a[i+1]:page;}
  function mobilePrevPage(page){const a=mobilePageOrder();const i=a.indexOf(page);return i>0?a[i-1]:page;}

  function bindMobileGestures(){
    const app=document.getElementById('mobileApp');
    if(!app||app.dataset.gesturesBound==='1')return;
    app.dataset.gesturesBound='1';
    // Mobile result now uses normal vertical scroll-flow.
    // Do not convert swipe gestures into slide navigation, otherwise
    // ordinary scrolling can jump back to KPI and hide later sections.
  }

  function renderMobileApp(){
    if(!document.getElementById('mobileApp'))return;
    renderMobileStartScreen();
    if(model){
      renderMobileKpis();
      renderMobileSummaryAndDetail();
      if(!document.getElementById('mobileApp').dataset.page)document.getElementById('mobileApp').dataset.page='kpi';
      if(isMobileLayout())setTimeout(renderMobileChart,50);
    }
  }

  function recalc(){
    state.activeScenario=state.scenarios.find(s=>s.id===state.activeScenarioId)||state.scenarios[0];
    const selectedCity=cityById(state.selectedCityId);
    if(selectedCity&&state.activeScenario?.assumptions){
      state.activeScenario.assumptions.province=selectedCity.state;
      state.activeScenario.assumptions.dailyOrderPotentialOverride=Number(selectedCity.dailyOrderPotential)||0;
    }
    state.activeScenario.assumptions=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);
    const v=Validation.validateAssumptions(state.activeScenario.assumptions);
    errors=v.errors;
    model=FinancialEngine.calculate(state.activeScenario.assumptions);
    model.currency='IRT';
    UIRenderer.renderAll(state,model,errors);
    renderSelectedCityBanner();
    if(resetModelTableScrollOnNextRender){
      setTimeout(()=>{
        const wrap=document.getElementById('modelTableWrap');
        const range=document.getElementById('modelTableScrollRange');
        if(wrap)wrap.scrollLeft=0;
        if(range)range.value='0';
        resetModelTableScrollOnNextRender=false;
        syncModelTableScrollRange();
      },0);
    }else{
      setTimeout(syncModelTableScrollRange,0);
    }
    renderParameterButtonLabels();
    renderStartScreen();
    syncMobilePresentation();
    renderMobileApp();
    setScreen();
    document.getElementById('undoBtn')?.classList.toggle('disabled',undo.length===0);
    document.getElementById('redoBtn')?.classList.toggle('disabled',redo.length===0);
    persist();
  }

  function onInput(e){
    const el=e.target;
    if(el.dataset.currencyInput!==undefined){return}
    if(el.dataset.input){
      pushUndo();
      state.activeScenario.assumptions[el.dataset.input]=Number(el.value);
      if(el.dataset.input==='operatingExpenses'){
        const rows=state.activeScenario.assumptions.expenseRows||[];
        const base=rows.find(r=>r.id==='other_costs')||rows.find(r=>r.id!=='assistente')||rows[0];
        if(base&&base.id!=='assistente')base.amount=Number(el.value);
      }
      recalc();return;
    }
    if(el.dataset.marketingPct){pushUndo();const idx=Number(el.dataset.marketingPct)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);a.marketingDistribution[idx]=Math.max(0,Number(el.value)||0);a.marketingDistributionPreset='manual';state.activeScenario.assumptions=a;recalc();return}
    if(el.dataset.ridesPct){pushUndo();const idx=Number(el.dataset.ridesPct)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);a.ridesDistribution[idx]=Math.max(0,Number(el.value)||0);a.ridesDistributionPreset='manual';state.activeScenario.assumptions=a;recalc();return}
    if(el.dataset.ruleThreshold){pushUndo();const row=(state.activeScenario.assumptions.revenueRules||[]).find(r=>r.id===el.dataset.ruleThreshold);if(row)row.threshold=Math.max(0,Number(el.value)||0);recalc();return}
    if(el.dataset.ruleShare){pushUndo();const row=(state.activeScenario.assumptions.revenueRules||[]).find(r=>r.id===el.dataset.ruleShare);if(row)row.maximShare=Math.min(100,Math.max(0,Number(el.value)||0));recalc();return}
    if(el.dataset.preset){pushUndo();state.activeScenario.assumptions=FinancialEngine.applyPreset(state.activeScenario.assumptions,el.dataset.preset,el.value);recalc();return}
    if(el.dataset.expenseVisible){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseVisible);if(row)row.showInModel=el.checked;recalc();return}
    if(el.dataset.expenseAmount){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseAmount);if(row&&row.id!=='assistente'){row.amount=Number(el.value);state.activeScenario.assumptions.operatingExpenses=Number(el.value)}recalc();return}
    if(el.dataset.expenseName){pushUndo();const row=(state.activeScenario.assumptions.expenseRows||[]).find(r=>r.id===el.dataset.expenseName);if(row&&row.id!=='assistente')row.name=el.value.trim()||'Expense';recalc();}
  }

  function bind(){
    document.body.addEventListener('change',onInput);
    document.body.addEventListener('keydown',e=>{
      const adminCitiesModal=document.getElementById('adminCitiesModal');
      if(!adminCitiesModal?.hidden&&e.key==='Escape'){e.preventDefault();closeAdminCities();return;}
      const adminModal=document.getElementById('adminLoginModal');
      if(!adminModal?.hidden&&e.key==='Escape'){e.preventDefault();closeAdminLogin();return;}
      if(!adminModal?.hidden&&e.key==='Enter'&&e.target?.tagName!=='BUTTON'){e.preventDefault();void confirmAdminLogin();return;}
      const subDetailModal=document.getElementById('modelSubDetailModal');
      if(!subDetailModal?.hidden&&e.key==='Escape'){e.preventDefault();ModelDetails.closeSubdetail();return;}
      const detailModal=document.getElementById('modelDetailModal');
      if(!detailModal?.hidden&&e.key==='Escape'){e.preventDefault();ModelDetails.close();return;}
      const modal=document.getElementById('parametersModal');
      if(!modal?.hidden&&e.key==='Escape'){e.preventDefault();closeParametersModal();}
      if(!modal?.hidden&&e.key==='Enter'&&e.target?.tagName!=='BUTTON'){e.preventDefault();confirmParameters();}
    });
    const mobileNavHandler=e=>{
      const nav=e.target.closest?.('[data-mobile-page-target]');
      if(nav&&isMobileLayout()){
        e.preventDefault();
        e.stopPropagation();
        mobileSetPage(nav.dataset.mobilePageTarget);
      }
    };
    document.body.addEventListener('pointerup',mobileNavHandler,{capture:true});
    document.body.addEventListener('touchend',mobileNavHandler,{capture:true,passive:false});
    document.body.addEventListener('click',e=>{
      const adminLoginTrigger=e.target.closest('[data-admin-login]');
      if(adminLoginTrigger){openAdminLogin(adminLoginTrigger);return}
      if(e.target.closest('[data-close-admin-login]')){closeAdminLogin();return}
      if(e.target.closest('#adminLoginSubmit')){void confirmAdminLogin();return}
      const adminPanelTrigger=e.target.closest('[data-open-admin-cities]');
      if(adminPanelTrigger){openAdminCities(adminPanelTrigger);return}
      if(e.target.closest('[data-close-admin-cities]')){closeAdminCities();return}
      if(e.target.closest('#adminAddCitySubmit')){addAdminCity();return}
      if(e.target.closest('#adminAddFeeRule')){addAdminPaymentRule();return}
      if(e.target.closest('#adminSaveFeeRules')){saveAdminPaymentRules();return}
      if(e.target.closest('#adminApplyFeeRules')){applyAdminPaymentRules();return}
      if(e.target.closest('#adminResetFeeRules')){resetAdminPaymentRules();return}
      const feeDelete=e.target.closest('[data-admin-fee-delete]');
      if(feeDelete){deleteAdminPaymentRule(feeDelete.dataset.adminFeeDelete);return}
      if(e.target.closest('[data-admin-reset]')){resetAdminCities();return}
      if(e.target.closest('[data-admin-logout]')){
        closeAdminCities(false);
        setAdminSession(false);
        adminNotice={text:'',tone:''};
        renderAdminUI();
        return;
      }
      const detailTrigger=e.target.closest('[data-model-detail]');
      if(detailTrigger){ModelDetails.open(detailTrigger.dataset.modelDetail,model);return}
      if(e.target.closest('[data-close-model-detail]')){ModelDetails.close();return}
      const subdetailTrigger=e.target.closest('[data-open-subdetail]');
      if(subdetailTrigger){ModelDetails.openSubdetail(subdetailTrigger.dataset.openSubdetail,model);return}
      if(e.target.closest('[data-close-subdetail]')){ModelDetails.closeSubdetail();return}
      const detailPanelToggle=e.target.closest('[data-detail-toggle]');
      if(detailPanelToggle){ModelDetails.togglePanel(detailPanelToggle.dataset.detailToggle,model);return}
      const parametersTrigger=e.target.closest('#parametersBtn, #mobileParametersBtn');
      if(parametersTrigger){openParametersModal(parametersTrigger);return}
      if(e.target.closest('[data-close-parameters-modal], #cancelParametersBtn')){closeParametersModal();return}
      if(e.target.closest('#confirmParametersBtn')){confirmParameters();return}
      const mobilePageNav=e.target.closest('[data-mobile-page-target]');
      if(mobilePageNav){mobileSetPage(mobilePageNav.dataset.mobilePageTarget);return}
      const mobileNav=e.target.closest('[data-mobile-target]');
      if(mobileNav){mobileScrollTo(mobileNav.dataset.mobileTarget);return}
      const cityRow=e.target.closest('[data-city-row]');
      if(cityRow){const city=cityById(cityRow.dataset.cityRow);if(city){startFilterState=city.state;startFilterCityId=city.id;}renderStartScreen();renderMobileStartScreen();return}
      const del=e.target.closest('[data-expense-delete]');
      if(del){pushUndo();const id=del.dataset.expenseDelete;state.activeScenario.assumptions.expenseRows=(state.activeScenario.assumptions.expenseRows||[]).filter(r=>r.id!==id || r.removable===false);recalc();return}
      const ruleDel=e.target.closest('[data-rule-delete]');
      if(ruleDel){pushUndo();const id=ruleDel.dataset.ruleDelete;state.activeScenario.assumptions.revenueRules=(state.activeScenario.assumptions.revenueRules||[]).filter(r=>r.id!==id || r.removable===false);recalc();return}
      if(e.target.id==='addRevenueRule'){pushUndo();const rules=state.activeScenario.assumptions.revenueRules||(state.activeScenario.assumptions.revenueRules=[]);rules.push(FinancialEngine.createRevenueRule(0,100));recalc();return}
      if(e.target.id==='addExpenseRow'){pushUndo();const rows=state.activeScenario.assumptions.expenseRows||(state.activeScenario.assumptions.expenseRows=[]);rows.push(FinancialEngine.createExpenseRow('New Expense',0));recalc();return}
      if(e.target.id==='startCalculateBtn'||e.target.id==='mobileCalculateBtn'){
        const city=cityById(startFilterCityId);
        if(!city)return;
        pushUndo();applySelectedCity(city);recalc();
        if(isMobileLayout())mobileSetPage('kpi');
        else window.scrollTo({top:0,behavior:'auto'});
        return;
      }
      if(e.target.closest('#changeCityBtn')||e.target.closest('#mobileChangeCityBtn')){
        state.selectedCityId=null;delete document.body.dataset.mobileSlide;renderStartScreen();setScreen();persist();return;
      }
    });
    document.body.addEventListener('dblclick',e=>{
      const cell=e.target.closest('[data-month-edit]');
      if(!cell||cell.querySelector('input.month-pct-editor'))return;
      const current=Number(cell.dataset.currentPct)||0;
      const input=document.createElement('input');input.className='month-pct-editor';input.type='number';input.step='0.1';input.min='0';input.value=current;
      cell.innerHTML='';cell.appendChild(input);input.focus();input.select();
      const commit=()=>{if(!input.isConnected)return;pushUndo();const idx=Number(cell.dataset.monthNo)-1;const a=FinancialEngine.normalizeAssumptions(state.activeScenario.assumptions);if(cell.dataset.monthEdit==='marketing'){a.marketingDistribution[idx]=Math.max(0,Number(input.value)||0);a.marketingDistributionPreset='manual'}if(cell.dataset.monthEdit==='rides'){a.ridesDistribution[idx]=Math.max(0,Number(input.value)||0);a.ridesDistributionPreset='manual'}state.activeScenario.assumptions=a;recalc()};
      input.addEventListener('blur',commit,{once:true});
      input.addEventListener('keydown',ev=>{if(ev.key==='Enter')input.blur();if(ev.key==='Escape')recalc()});
    });
    document.getElementById('startLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;resetModelTableScrollOnNextRender=true;Localization.setLanguage(state.language);renderStartScreen();renderMobileApp();refreshLocalizedParameterUI();persist()});
    document.getElementById('mobileStartLanguageButton')?.addEventListener('click',()=>{const list=Localization.languages;state.language=list[(list.indexOf(state.language)+1)%list.length];resetModelTableScrollOnNextRender=true;Localization.setLanguage(state.language);renderStartScreen();renderMobileApp();refreshLocalizedParameterUI();persist()});
    document.getElementById('mobileLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;resetModelTableScrollOnNextRender=true;Localization.setLanguage(state.language);renderStartScreen();renderMobileApp();if(state.selectedCityId)recalc();refreshLocalizedParameterUI();persist()});
    document.getElementById('mobileDashboardLanguageSelect')?.addEventListener('change',e=>{state.language=e.target.value;resetModelTableScrollOnNextRender=true;Localization.setLanguage(state.language);recalc();renderMobileApp();refreshLocalizedParameterUI();persist()});
    document.getElementById('modelTableScrollRange')?.addEventListener('input',e=>setModelTableScrollFromRange(e.target.value));
    document.getElementById('modelTableWrap')?.addEventListener('scroll',syncModelTableScrollRange,{passive:true});
    window.addEventListener('resize',()=>{if(isMobileLayout()&&cityById(state.selectedCityId)&&!document.body.dataset.mobileSlide)document.body.dataset.mobileSlide='kpi';syncModelTableScrollRange();});
    document.getElementById('recommendedValuesCheckbox')?.addEventListener('change',e=>toggleRecommendedDraft(e.target.checked));
    document.getElementById('annualInvestmentBudgetInput')?.addEventListener('input',event=>{formatBudgetInput(event.target);updateParameterAssessments();validateParameterDraft();});
    document.getElementById('averageFareParameterInput')?.addEventListener('input',()=>{updateParameterAssessments();validateParameterDraft();});
    document.getElementById('driverCommissionParameterInput')?.addEventListener('input',()=>{updateParameterAssessments();validateParameterDraft();});
    document.getElementById('startStateSelect').addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('startCitySelect').addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileStateSelect')?.addEventListener('change',e=>{startFilterState=e.target.value;startFilterCityId='';renderStartScreen();renderMobileStartScreen()});
    document.getElementById('mobileCitySelect')?.addEventListener('change',e=>{startFilterCityId=e.target.value;renderStartScreen();renderMobileStartScreen()});
    document.getElementById('adminCitySearch')?.addEventListener('input',e=>{adminCitySearch=e.target.value;renderAdminCitiesModal()});
    document.getElementById('adminCityRegionFilter')?.addEventListener('change',e=>{adminCityRegion=e.target.value;renderAdminCitiesModal()});
    document.getElementById('adminHiddenOnly')?.addEventListener('change',e=>{adminShowHiddenOnly=e.target.checked;renderAdminCitiesModal()});
    document.getElementById('adminCitiesTableBody')?.addEventListener('change',e=>{const input=e.target.closest('[data-admin-city-visible]');if(input)setAdminCityVisibility(input.dataset.adminCityVisible,input.checked)});
    document.getElementById('adminFeeRulesBody')?.addEventListener('change',e=>{
      const threshold=e.target.closest('[data-admin-fee-threshold]');
      if(threshold){updatePaymentRuleDraft(threshold.dataset.adminFeeThreshold,'minPopulation',threshold.value);return;}
      const amount=e.target.closest('[data-admin-fee-amount]');
      if(amount)updatePaymentRuleDraft(amount.dataset.adminFeeAmount,'amount',amount.value);
    });
    document.getElementById('adminNewCityPopulation')?.addEventListener('input',updateAdminNewCityPaymentHint);
    document.getElementById('notesArea')?.addEventListener('input',e=>{state.activeScenario.notes=e.target.value;persist()});
    document.getElementById('languageSelect')?.addEventListener('change',e=>{state.language=e.target.value;Localization.setLanguage(state.language);recalc();refreshLocalizedParameterUI();persist()});
    document.getElementById('modeToggle')?.addEventListener('click',()=>{state.advanced=!state.advanced;recalc()});
    document.getElementById('resetBtn')?.addEventListener('click',()=>{if(!confirm(Localization.t('confirmReset')))return;pushUndo();const type=['conservative','optimistic'].includes(state.activeScenarioId)?state.activeScenarioId:'base';state.activeScenario.assumptions=FinancialEngine.defaultAssumptions(type);const c=cityById(state.selectedCityId);if(c)applySelectedCity(c);recalc()});
    document.getElementById('undoBtn')?.addEventListener('click',()=>{if(!undo.length)return;redo.push(snapshot());restore(undo.pop())});
    document.getElementById('redoBtn')?.addEventListener('click',()=>{if(!redo.length)return;undo.push(snapshot());restore(redo.pop())});
  }
  function init(){hydrate();bind();bindMobileGestures();recalc()}
  return{init}
})();
document.addEventListener('DOMContentLoaded',App.init);

// Shared accessible info tooltip behavior for KPI and summary icons.
document.addEventListener('DOMContentLoaded',()=>{
  const closeAll=except=>document.querySelectorAll('.info-tooltip.is-open').forEach(el=>{if(el!==except)el.classList.remove('is-open')});
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.info-tooltip');
    if(btn){
      e.preventDefault();
      e.stopPropagation();
      const open=!btn.classList.contains('is-open');
      closeAll(btn);
      btn.classList.toggle('is-open',open);
      return;
    }
    closeAll();
  });
  document.addEventListener('pointerout',e=>{
    const btn=e.target.closest('.info-tooltip');
    if(btn&&e.relatedTarget&&!btn.contains(e.relatedTarget))btn.classList.remove('is-open');
  },true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});
});
