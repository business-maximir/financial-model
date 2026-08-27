'use strict';
const ModelDetails=(()=>{
  const adCategories=[
    {id:'branding',share:.25,unitCost:850000,ru:'Брендированные автомобили',en:'Branded vehicles',fa:'خودروهای برندشده',ruDesc:'Брендирование автомобилей такси — самая заметная мобильная реклама сервиса в городе.',enDesc:'Branding taxi vehicles creates the most visible mobile advertising for the service in the city.',faDesc:'برندینگ خودروهای تاکسی یکی از قابل‌مشاهده‌ترین تبلیغات متحرک سرویس در شهر است.'},
    {id:'outdoor',share:.25,unitCost:1500000,ru:'Наружная реклама',en:'Outdoor advertising',fa:'تبلیغات محیطی',ruDesc:'Билборды, баннеры и другие заметные конструкции на улицах города.',enDesc:'Billboards, banners and other visible constructions across the city.',faDesc:'بیلبوردها، بنرها و سایر سازه‌های تبلیغاتی قابل‌مشاهده در سطح شهر.'},
    {id:'partners',share:.15,unitCost:500000,ru:'Партнёрская реклама',en:'Partner advertising',fa:'تبلیغات مشارکتی',ruDesc:'Баннеры и носители на территории автомоек, магазинов, супермаркетов, пекарен и других партнёров.',enDesc:'Banners and placements at car washes, shops, supermarkets, bakeries and other partner locations.',faDesc:'بنر و تبلیغات در محل کارواش‌ها، فروشگاه‌ها، سوپرمارکت‌ها، نانوایی‌ها و سایر شرکای تجاری.'},
    {id:'print',share:.10,unitCost:2000,ru:'Печатные материалы',en:'Printed materials',fa:'اقلام چاپی',ruDesc:'Еврофлаеры, листовки А4 и А6 для массового охвата и привлечения водителей и клиентов.',enDesc:'Euro-flyers and A4/A6 leaflets for mass coverage and attracting drivers and customers.',faDesc:'فلایر و تراکت‌های A4 و A6 برای پوشش گسترده و جذب راننده و مشتری.'},
    {id:'online',share:.25,unitCost:500000,ru:'Интернет-реклама',en:'Online advertising',fa:'تبلیغات آنلاین',ruDesc:'Продвижение в локальных digital-каналах и социальных сетях.',enDesc:'Promotion in local digital channels and social media.',faDesc:'تبلیغ در کانال‌های دیجیتال محلی و شبکه‌های اجتماعی.'}
  ];

  const monthlyShares=[
    [0.1479,0.1479,0.1353,0.1539,0.2134,0.2134,0.2148,0.2810,0.3470,0.3470,0.3992,0.3992],
    [0.3969,0.3969,0.3630,0.2753,0.2727,0.2727,0.2745,0.2514,0.1293,0.1293,0.1190,0.1190],
    [0.0000,0.0000,0.0855,0.0973,0.0963,0.0963,0.1940,0.1776,0.2742,0.2742,0.2523,0.2523],
    [0.2001,0.2001,0.1830,0.2082,0.1546,0.1546,0.0519,0.0475,0.0000,0.0000,0.0000,0.0000],
    [0.2551,0.2551,0.2332,0.2653,0.2630,0.2630,0.2648,0.2425,0.2495,0.2495,0.2295,0.2295]
  ];

  const royaltyScale=[
    {threshold:'up to 10,000,000 IRT', rate:'0%'},
    {threshold:'over 10,000,000 IRT', rate:'10%'},
    {threshold:'over 20,000,000 IRT', rate:'15%'},
    {threshold:'over 30,000,000 IRT', rate:'20%'},
    {threshold:'over 40,000,000 IRT', rate:'25%'},
    {threshold:'over 50,000,000 IRT', rate:'30%'},
    {threshold:'over 500,000,000 IRT', rate:'35%'},
    {threshold:'over 1,000,000,000 IRT', rate:'40%'}
  ];

  const startupPackage=[
    {image:'assets/gallery/package_euroflyer.jpg', titleRu:'Еврофлаер 200×100', titleEn:'Euro-flyer 200×100', titleFa:'یوروفلایر ۲۰۰×۱۰۰', descRu:'Размещается на лобовых стеклах припаркованных автомобилей для привлечения водителей.', descEn:'Placed on windshields of parked cars to attract drivers.', descFa:'روی شیشه جلوی خودروهای پارک‌شده قرار می‌گیرد تا رانندگان جذب شوند.'},
    {image:'assets/gallery/package_a4.jpg', titleRu:'Листовка A4', titleEn:'A4 leaflet', titleFa:'تراکت A4', descRu:'Размещается на стенах, столбах и других поверхностях для привлечения внимания клиентов и продвижения междугородних поездок.', descEn:'Placed on walls, poles and other surfaces to attract customers and promote intercity rides.', descFa:'روی دیوارها، تیرها و سطوح دیگر نصب می‌شود تا توجه مشتریان را جلب و سفرهای بین‌شهری را تبلیغ کند.'},
    {image:'assets/gallery/package_a6.jpg', titleRu:'Листовка A6 (двусторонняя)', titleEn:'A6 leaflet (double-sided)', titleFa:'تراکت A6 دورو', descRu:'Используется в промо-акциях для раздачи из рук в руки и рекламы промокода для новых клиентов.', descEn:'Used in promo activities for hand-to-hand distribution and promoting a discount code for new customers.', descFa:'در کمپین‌های پروموشن برای توزیع مستقیم و معرفی کد تخفیف مشتریان جدید استفاده می‌شود.'},
    {image:'assets/gallery/package_car_stickers.jpg', titleRu:'Наклейки на автомобиль такси', titleEn:'Taxi car stickers', titleFa:'استیکر خودرو تاکسی', descRu:'4 наклейки на борта, 1 на капот и 1 на заднее стекло. Самая заметная реклама в городе.', descEn:'4 stickers for the sides, 1 for the hood and 1 for the rear window. The most visible advertising in the city.', descFa:'۴ استیکر برای بدنه، ۱ عدد روی کاپوت و ۱ عدد روی شیشه عقب؛ یکی از قابل‌مشاهده‌ترین تبلیغات در شهر.'},
    {image:'assets/gallery/package_partner_sticker.jpg', titleRu:'Стикеры для партнёров 1×1 м', titleEn:'Partner-location stickers 1×1 m', titleFa:'استیکر شرکای تجاری ۱×۱ متر', descRu:'Размещаются на территории партнёров: автомойки, магазины автозапчастей, супермаркеты, пекарни и другие точки.', descEn:'Placed at partner locations: car washes, auto-parts stores, supermarkets, bakeries and other points.', descFa:'در محل شرکای تجاری مانند کارواش، فروشگاه لوازم یدکی، سوپرمارکت، نانوایی و سایر نقاط نصب می‌شود.'}
  ];

  const brandbookItems=[
    {image:'assets/gallery/brand_vehicle.jpg', titleRu:'Брендированные автомобили', titleEn:'Branded vehicles', titleFa:'خودروهای برندشده', descRu:'Самая эффективная реклама, размещаемая на автомобилях такси.', descEn:'The most effective advertising placed on taxi vehicles.', descFa:'یکی از مؤثرترین انواع تبلیغات که روی خودروهای تاکسی اجرا می‌شود.'},
    {image:'assets/gallery/brand_rear_window.jpg', titleRu:'Наклейка на заднее стекло', titleEn:'Rear-window sticker', titleFa:'استیکر شیشه عقب', descRu:'Простой и заметный формат, который дополняет брендирование автомобиля.', descEn:'A simple and visible format that complements vehicle branding.', descFa:'فرمتی ساده و قابل‌مشاهده که برندینگ خودرو را تکمیل می‌کند.'},
    {image:'assets/gallery/brand_billboard.jpg', titleRu:'Билборды', titleEn:'Billboards', titleFa:'بیلبورد', descRu:'Официальная реклама, размещаемая через агентства на крупных конструкциях.', descEn:'Official advertising placed through agencies on large outdoor structures.', descFa:'تبلیغات رسمی روی سازه‌های بزرگ که معمولاً از طریق آژانس‌های تبلیغاتی اجرا می‌شود.'},
    {image:'assets/gallery/brand_partner_ad.jpg', titleRu:'Партнёрская реклама', titleEn:'Partner advertising', titleFa:'تبلیغات مشارکتی', descRu:'Баннер размещается обычно бесплатно на территории партнёра.', descEn:'The banner is usually placed free of charge at a partner location.', descFa:'بنر معمولاً بدون اجاره در محل شریک تجاری نصب می‌شود.'},
    {image:'assets/gallery/brand_wall_paint.jpg', titleRu:'Граффити (wall paint)', titleEn:'Graffiti / wall paint', titleFa:'نقاشی دیواری', descRu:'Эффективная наружная реклама, но размещается только с согласия муниципалитета.', descEn:'An effective outdoor format, but it is placed only with municipal approval.', descFa:'تبلیغات محیطی مؤثر که فقط با مجوز شهرداری اجرا می‌شود.'},
    {image:'assets/gallery/brand_pole_banner.jpg', titleRu:'Баннеры на столбах', titleEn:'Pole banners', titleFa:'بنر روی تیرهای شهری', descRu:'При большом количестве делают рекламу заметной и эффективной.', descEn:'When used in volume, they make the advertising highly visible and effective.', descFa:'در تعداد زیاد باعث دیده‌شدن مداوم و اثربخشی بیشتر تبلیغ می‌شوند.'},
    {image:'assets/gallery/brand_windshield.jpg', titleRu:'Листовки на лобовые стекла автомобилей', titleEn:'Leaflets on car windshields', titleFa:'تراکت روی شیشه خودرو', descRu:'Эффективная реклама для набора водителей.', descEn:'An effective format for driver recruitment.', descFa:'فرمتی مؤثر برای جذب رانندگان جدید.'},
    {image:'assets/gallery/brand_pole_posters.jpg', titleRu:'Листовки на столбах и стенах', titleEn:'Leaflets on poles and walls', titleFa:'تراکت روی تیر و دیوار', descRu:'Массовая и дешёвая реклама для быстрого охвата города.', descEn:'A mass-market and inexpensive format for quick city coverage.', descFa:'تبلیغ ارزان و گسترده برای پوشش سریع نقاط مختلف شهر.'}
  ];

  const copy={
    'ru-RU':{
      close:'Закрыть',
      startupPackage:'Пример стартового рекламного пакета',
      placementPlan:'План размещения рекламы',
      brandbook:'Брендбук',
      hide:'Скрыть',
      monthlyBudget:'Бюджет в месяц',
      annualBudget:'Бюджет за 12 месяцев',
      adPlanTitle:'Рекомендованный план рекламы и вложений',
      adPlanNote:'Ниже показан рекомендуемый план распределения рекламного бюджета по видам рекламы и по месяцам. Он основан на структуре из предыдущего Excel-калькулятора и используется как ориентир для запуска и развития подразделения.',
      category:'Вид рекламы', annualShare:'Доля за год', unitCost:'Цена единицы, IRT', approxQty:'Ориентир, ед./год', total:'Итого',
      galleryTitle:'Примеры',
      royaltyRevenue:'Выручка', royaltyRate:'Процент роялти',
      cohortPopulation:'Численность города', cohortFee:'Паушальный взнос',
      feeTableTitle:'Паушальный взнос по когорте города',
      royaltyTableTitle:'Шкала роялти',
      sectionInvestmentTitle:'Инвестиции', sectionIncomeTitle:'Доход', sectionExpensesTitle:'Операционные расходы', sectionProfitTitle:'Прибыль',
      allAmounts:'Все суммы в IRT',
      notWithin12:'не становится положительной в пределах 12 месяцев',
      paybackNotWithin12:'не выходит в плюс в пределах 12 месяцев'
    },
    'en-US':{
      close:'Close',
      startupPackage:'Example starter advertising package',
      placementPlan:'Advertising placement plan',
      brandbook:'Brandbook',
      hide:'Hide',
      monthlyBudget:'Monthly budget',
      annualBudget:'12-month budget',
      adPlanTitle:'Recommended advertising and spending plan',
      adPlanNote:'Below is a recommended plan for allocating the advertising budget across advertising formats and across months. It is based on the structure from the earlier Excel calculator and is intended as a practical guide for launch and territory development.',
      category:'Advertising type', annualShare:'Annual share', unitCost:'Unit cost, IRT', approxQty:'Approx. units/year', total:'Total',
      galleryTitle:'Examples',
      royaltyRevenue:'Revenue', royaltyRate:'Royalty rate',
      cohortPopulation:'City population', cohortFee:'Franchise fee',
      feeTableTitle:'Franchise fee by city cohort',
      royaltyTableTitle:'Royalty scale',
      sectionInvestmentTitle:'Investment', sectionIncomeTitle:'Revenue', sectionExpensesTitle:'Operating expenses', sectionProfitTitle:'Profit',
      allAmounts:'All amounts are shown in IRT',
      notWithin12:'does not become positive within 12 months',
      paybackNotWithin12:'does not turn positive within 12 months'
    },
    'fa-IR':{
      close:'بستن',startupPackage:'نمونه بسته تبلیغاتی شروع',placementPlan:'برنامه جانمایی تبلیغات',brandbook:'برندبوک',hide:'پنهان',
      monthlyBudget:'بودجه ماهانه',annualBudget:'بودجه ۱۲ ماهه',adPlanTitle:'برنامه پیشنهادی تبلیغات و هزینه‌کرد',
      adPlanNote:'در جدول زیر، پیشنهاد توزیع بودجه تبلیغاتی بر اساس نوع تبلیغ و ماه نمایش داده شده است. این برنامه به‌عنوان راهنمای عملی برای راه‌اندازی و توسعه شهر استفاده می‌شود.',
      category:'نوع تبلیغ',annualShare:'سهم سالانه',unitCost:'هزینه واحد، IRT',approxQty:'تعداد تقریبی در سال',total:'جمع',galleryTitle:'نمونه‌ها',
      royaltyRevenue:'درآمد مبنا',royaltyRate:'درصد رویالتی',cohortPopulation:'جمعیت شهر',cohortFee:'حق ورود فرانشیز',feeTableTitle:'حق ورود بر اساس گروه جمعیتی شهر',royaltyTableTitle:'جدول پلکانی رویالتی',
      assistantBase:'مبنای محاسبه',assistantFee:'هزینه Assistant',assistantTableTitle:'تعرفه خدمت Assistant',
      sectionInvestmentTitle:'سرمایه‌گذاری',sectionIncomeTitle:'درآمد',sectionExpensesTitle:'هزینه‌های عملیاتی',sectionProfitTitle:'سود',allAmounts:'تمام مبالغ به IRT',
      notWithin12:'در ۱۲ ماه مثبت نمی‌شود',paybackNotWithin12:'در ۱۲ ماه به نقطه بازگشت نمی‌رسد'
    }
  };

  const lang=()=>Localization.getLanguage&&Localization.getLanguage()||'fa-IR';
  const c=()=>copy[lang()]||copy['en-US'];
  const fmtMoney=value=>FinancialEngine.formatMoney(Math.round(Number(value)||0));
  const compact=value=>FinancialEngine.formatCurrencyCompact(Math.round(Number(value)||0));
  const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const tx=(ru,en,fa)=>lang()==='fa-IR'?(fa||en):lang()==='en-US'?en:ru;
  let currentKey=null;
  let returnFocus=null;

  function infoCard(label,value){return `<div class="model-detail-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;}
  function iconSvg(name){const icons={
    briefcase:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/><rect x="3.5" y="7" width="17" height="12" rx="2"/><path d="M3.5 11.5h17"/><path d="M10 11.5v2h4v-2"/></svg>',
    megaphone:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5 8.5 11H6a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h2.5L14 17.5V8.5Z"/><path d="M14 10v6"/><path d="M17 10.5a4.5 4.5 0 0 1 0 3"/><path d="M8.5 15.2 10 20"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17"/><path d="M8 12.5h3M8 16h3M13 12.5h3M13 16h3"/></svg>',
    chart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19.5h14"/><path d="M7.5 16v-3"/><path d="M12 16v-6"/><path d="M16.5 16V8"/></svg>',
    orders:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18.5h14"/><path d="M6 15l4-4 3 2 5-6"/><path d="M17 7h1.5v1.5"/></svg>',
    coins:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="7" rx="5.5" ry="2.5"/><path d="M6.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M6.5 11v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4"/></svg>',
    headset:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 0 1 14 0"/><rect x="4" y="12" width="4" height="6" rx="1.5"/><rect x="16" y="12" width="4" height="6" rx="1.5"/><path d="M16 18a4 4 0 0 1-4 3h-1"/></svg>',
    assistant:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M5 19a7 7 0 0 1 14 0"/></svg>',
    bell:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10a5 5 0 1 1 10 0c0 4 1.5 5 2 5H5c.5 0 2-1 2-5Z"/><path d="M10 18a2 2 0 0 0 4 0"/></svg>',
    phone:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5.5h3l1 4-1.8 1.8a14 14 0 0 0 4.8 4.8l1.8-1.8 4 1v3A1.5 1.5 0 0 1 19 20C10.7 20 4 13.3 4 5a1.5 1.5 0 0 1 1.5-1.5h2Z"/></svg>',
    percent:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7"/><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="16" r="2.5"/></svg>',
    calculator:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M9 7.5h6"/><path d="M9 11.5h1M12 11.5h1M15 11.5h1M9 14.5h1M12 14.5h1M15 14.5h1M9 17.5h1M12 17.5h1M15 17.5h1"/></svg>',
    profit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19.5h14"/><path d="M7 15l4-4 3 2 4-6"/><path d="M18 7h1.5v1.5"/></svg>',
    wallet:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5h12a2.5 2.5 0 0 1 2.5 2.5v6A2.5 2.5 0 0 1 17 18.5H5.5A2.5 2.5 0 0 1 3 16V9.5A2 2 0 0 1 5 7.5Z"/><path d="M5 7.5V6a1.5 1.5 0 0 1 1.5-1.5H17"/><circle cx="16" cy="13" r="1"/></svg>',
    info:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 10.5V16"/><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/></svg>'
  };return icons[name]||icons.info;}
  function block(title,body,iconName='info'){return `<section class="detail-block"><div class="detail-block-icon" aria-hidden="true">${iconSvg(iconName)}</div><div class="detail-block-content"><h4>${esc(title)}</h4><p>${body}</p></div></section>`;}
  function tableHtml(title,headers,rows){return `<section class="detail-block detail-block--table"><div class="detail-block-content"><h4>${esc(title)}</h4><div class="detail-table-wrap"><table class="detail-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></section>`;}
  function galleryText(item,type){if(lang()==='fa-IR')return item[type+'Fa']||item[type+'En']||item[type+'Ru'];if(lang()==='en-US')return item[type+'En']||item[type+'Ru'];return item[type+'Ru']||item[type+'En'];}
  function galleryHtml(id,items){return `<div id="${esc(id)}" class="detail-toggle-panel" hidden><div class="detail-gallery-grid">${items.map(item=>`<figure class="detail-gallery-item"><img src="${esc(item.image)}" alt="${esc(galleryText(item,'title'))}" loading="lazy"><figcaption><strong>${esc(galleryText(item,'title'))}</strong><span>${esc(galleryText(item,'desc'))}</span></figcaption></figure>`).join('')}</div></div>`;}
  function subdetailBtn(key,label){const meta={startupPackage:{icon:'briefcase',ru:'Макеты и материалы, которые входят в стартовый пакет',en:'Layouts and materials included in the starter package',fa:'نمونه‌ها و اقلام موجود در بسته شروع'},advertisingPlan:{icon:'calendar',ru:'12-месячное распределение рекламного бюджета',en:'12-month budget allocation by advertising material',fa:'توزیع بودجه تبلیغات در ۱۲ ماه'},brandbook:{icon:'briefcase',ru:'Примеры рекламных материалов Maxim',en:'Examples of Maxim advertising materials',fa:'نمونه‌های واقعی تبلیغات Maxim'}}[key]||{icon:'info',ru:'',en:''};const sub=lang()==='fa-IR'?meta.fa:lang()==='en-US'?meta.en:meta.ru;return `<button class="detail-link-card" type="button" data-open-subdetail="${esc(key)}"><span class="detail-link-card__icon" aria-hidden="true">${iconSvg(meta.icon)}</span><span class="detail-link-card__content"><span class="detail-link-card__title">${esc(label)}</span><span class="detail-link-card__subtitle">${esc(sub)}</span></span><span class="detail-link-card__chevron" aria-hidden="true">›</span></button>`;}
  function feeTable(){
    const cc=c();
    const rows=lang()==='fa-IR'?[
      ['تا ۲۰٬۰۰۰ نفر','۴۰٬۰۰۰٬۰۰۰ IRT'],
      ['۲۰٬۰۰۱ تا ۵۰٬۰۰۰ نفر','۵۰٬۰۰۰٬۰۰۰ IRT'],
      ['۵۰٬۰۰۱ تا ۱۰۰٬۰۰۰ نفر','۶۰٬۰۰۰٬۰۰۰ IRT'],
      ['بیش از ۱۰۰٬۰۰۰ نفر','۷۰٬۰۰۰٬۰۰۰ IRT'],
      ['Bushehr, Maragheh, Sirjan, Bojnurd, Zanjan','۱۰۰٬۰۰۰٬۰۰۰ IRT']
    ]:lang()==='en-US'?[
      ['Up to 20,000 people','40,000,000 IRT'],
      ['20,001–50,000 people','50,000,000 IRT'],
      ['50,001–100,000 people','60,000,000 IRT'],
      ['More than 100,000 people','70,000,000 IRT'],
      ['Bushehr, Maragheh, Sirjan, Bojnurd, Zanjan','100,000,000 IRT']
    ]:[
      ['До 20 000 человек','40 000 000 IRT'],
      ['20 001–50 000 человек','50 000 000 IRT'],
      ['50 001–100 000 человек','60 000 000 IRT'],
      ['Свыше 100 000 человек','70 000 000 IRT'],
      ['Bushehr, Maragheh, Sirjan, Bojnurd, Zanjan','100 000 000 IRT']
    ];
    return tableHtml(cc.feeTableTitle,[cc.cohortPopulation,cc.cohortFee],rows);
  }
  function royaltyTable(){
    const cc=c();
    const rows=lang()==='fa-IR'?[
        ['تا ۱۰٬۰۰۰٬۰۰۰ IRT','۰٪'],['بیش از ۱۰٬۰۰۰٬۰۰۰ IRT','۱۰٪'],['بیش از ۲۰٬۰۰۰٬۰۰۰ IRT','۱۵٪'],['بیش از ۳۰٬۰۰۰٬۰۰۰ IRT','۲۰٪'],['بیش از ۴۰٬۰۰۰٬۰۰۰ IRT','۲۵٪'],['بیش از ۵۰٬۰۰۰٬۰۰۰ IRT','۳۰٪'],['بیش از ۵۰۰٬۰۰۰٬۰۰۰ IRT','۳۵٪'],['بیش از ۱٬۰۰۰٬۰۰۰٬۰۰۰ IRT','۴۰٪']
      ]:lang()==='en-US'?royaltyScale.map(r=>[esc(r.threshold),esc(r.rate)]):[
        ['До 10 000 000 IRT','0%'],
        ['Свыше 10 000 000 IRT','10%'],
        ['Свыше 20 000 000 IRT','15%'],
        ['Свыше 30 000 000 IRT','20%'],
        ['Свыше 40 000 000 IRT','25%'],
        ['Свыше 50 000 000 IRT','30%'],
        ['Свыше 500 000 000 IRT','35%'],
        ['Свыше 1 000 000 000 IRT','40%']
      ];
    return tableHtml(cc.royaltyTableTitle,[cc.royaltyRevenue,cc.royaltyRate],rows);
  }
  function assistantTable(){
    const cc=c();
    const rows=lang()==='fa-IR'?[['تا ۱۰٬۰۰۰٬۰۰۰ IRT','۱٬۵۰۰٬۰۰۰ IRT'],['بیش از ۱۰٬۰۰۰٬۰۰۰ تا ۵۰٬۰۰۰٬۰۰۰ IRT','۳٬۵۰۰٬۰۰۰ IRT'],['بیش از ۵۰٬۰۰۰٬۰۰۰ IRT','۷٬۵۰۰٬۰۰۰ IRT']]:lang()==='en-US'?[['Up to 10,000,000 IRT','1,500,000 IRT'],['Over 10,000,000 to 50,000,000 IRT','3,500,000 IRT'],['Over 50,000,000 IRT','7,500,000 IRT']]:[['До 10 000 000 IRT','1 500 000 IRT'],['Свыше 10 000 000 до 50 000 000 IRT','3 500 000 IRT'],['Свыше 50 000 000 IRT','7 500 000 IRT']];
    return tableHtml(cc.assistantTableTitle||tx('Тариф «Ассистент»','Assistant fee','تعرفه Assistant'),[cc.assistantBase||tx('Расчётная база','Calculation base','مبنای محاسبه'),cc.assistantFee||tx('Стоимость','Fee','هزینه')],rows);
  }

  function advertisingPlan(model){
    const cc=c();
    const annual=Math.max(0,Number(model?.summary?.totalMarketingInvestment)||Number(model?.assumptions?.marketingBudget)||0);
    const monthly=annual/12;
    const rows=adCategories.map((cat,rowIndex)=>{
      const name=lang()==='fa-IR'?cat.fa:lang()==='en-US'?cat.en:cat.ru;
      const yearly=annual*cat.share;
      const qty=cat.unitCost>0?yearly/cat.unitCost:0;
      const monthCells=monthlyShares[rowIndex].map(share=>`<td>${fmtMoney(monthly*share)}</td>`).join('');
      return `<tr><th scope="row"><strong>${esc(name)}</strong></th>${monthCells}<td>${fmtMoney(yearly)}</td></tr>`;
    }).join('');
    const monthlyTotals=Array.from({length:12},()=>`<td>${fmtMoney(monthly)}</td>`).join('');
    return `<div id="advertising-plan-panel" class="detail-toggle-panel" hidden><div class="advertising-plan-head"><h4>${esc(cc.adPlanTitle)}</h4><p>${esc(cc.adPlanNote)}</p><div class="model-detail-stats">${infoCard(cc.monthlyBudget,fmtMoney(monthly)+' IRT')}${infoCard(cc.annualBudget,fmtMoney(annual)+' IRT')}</div></div><div class="advertising-plan-table-wrap"><table class="advertising-plan-table"><thead><tr><th>${esc(cc.category)}</th>${Array.from({length:12},(_,i)=>`<th>${i+1}</th>`).join('')}<th>${esc(cc.total)}</th></tr></thead><tbody>${rows}<tr class="advertising-plan-total"><th>${esc(cc.total)}</th>${monthlyTotals}<td>${fmtMoney(annual)}</td></tr></tbody></table></div></div>`;
  }
  function positiveMonthText(model){
    const n=Math.round(Number(model?.summary?.breakEvenPeriod)||0);
    return n?(lang()==='fa-IR'?`ماه ${n}`:lang()==='ru-RU'?`month ${n}`:`month ${n}`):c().notWithin12;
  }
  function paybackMonthText(model){
    const n=Math.round(Number(model?.summary?.paybackPeriod)||0);
    return n?(lang()==='fa-IR'?`ماه ${n}`:lang()==='ru-RU'?`month ${n}`:`month ${n}`):c().paybackNotWithin12;
  }

  function definitionMap(model){
    const feeValue=fmtMoney(model?.summary?.initialPayment||model?.assumptions?.initialInvestment||0)+' IRT';
    const positiveN=Math.round(Number(model?.summary?.breakEvenPeriod)||0);
    const paybackN=Math.round(Number(model?.summary?.paybackPeriod)||0);
    const positiveRu=positiveN?`на ${positiveN}-м месяце`:'не становится положительной в пределах 12 месяцев';
    const positiveEn=positiveN?`in month ${positiveN}`:'does not become positive within 12 months';
    const positiveFa=positiveN?`در ماه ${positiveN}`:'در بازه ۱۲ ماهه مثبت نمی‌شود';
    const paybackRu=paybackN?`на ${paybackN}-м месяце`:'не достигается в пределах 12 месяцев';
    const paybackEn=paybackN?`in month ${paybackN}`:'is not reached within 12 months';
    const paybackFa=paybackN?`در ماه ${paybackN}`:'در بازه ۱۲ ماهه محقق نمی‌شود';
    const definitions={
      investment:{title:tx('Инвестиции','Investment','سرمایه‌گذاری'),subtitle:c().allAmounts,html:`
        ${block(tx('Паушальный взнос','Franchise fee','حق ورود فرانشیز'),tx(
          `Паушальный взнос — это разовый платёж за право использовать лицензию, бренд и технологии Maxim в выбранном городе. Базовый взнос для этой территории составляет <strong>${esc(feeValue)}</strong>.`,
          `The franchise fee is a one-time payment for the right to use the Maxim licence, brand and technology in the selected city. The base fee for this territory is <strong>${esc(feeValue)}</strong>.`,
          `حق ورود فرانشیز یک پرداخت یک‌باره برای استفاده از مجوز، برند و فناوری‌های Maxim در شهر انتخاب‌شده است. مبلغ پایه برای این شهر <strong>${esc(feeValue)}</strong> است.`),'briefcase')}
        ${block(tx('Реклама','Advertising','تبلیغات'),tx(
          'Реклама — это ежемесячные инвестиции в продвижение, необходимые для привлечения пользователей и повышения узнаваемости бренда. В них входят стикеры, баннеры, аренда рекламных конструкций, интернет-реклама и другие рекламные материалы. При прочих равных больший бюджет помогает привлечь больше пользователей и заказов, однако эффект ограничен рыночным потенциалом территории.',
          'Advertising is the monthly investment in promotion needed to attract users and build brand awareness. It includes stickers, banners, rental of advertising structures, online advertising and other promotional materials. All else equal, a larger budget helps attract more users and orders, although the effect is limited by the territory’s market potential.',
          'تبلیغات، سرمایه‌گذاری ماهانه برای جذب کاربر و افزایش آگاهی از برند است. این هزینه شامل استیکر، بنر، اجاره سازه‌های تبلیغاتی، تبلیغات آنلاین و سایر اقلام تبلیغاتی می‌شود. با ثابت بودن سایر شرایط، بودجه بیشتر می‌تواند کاربر و سفارش بیشتری جذب کند، اما اثر آن به ظرفیت بازار شهر محدود است.'),'megaphone')}
      `},
      income:{title:tx('Доход','Revenue','درآمد'),subtitle:tx('Описание показателей раздела и принципов формирования дохода.','Definitions of section metrics and how revenue is formed.','تعریف شاخص‌های این بخش و نحوه شکل‌گیری درآمد.'),html:`
        ${block(tx('Заказов в день','Orders per day','سفارش در روز'),tx('Среднее количество заказов, выполненных водителями в день в соответствующем месяце.','The average number of orders completed by drivers per day in the corresponding month.','میانگین تعداد سفارش‌هایی که رانندگان در هر روز از ماه مربوطه انجام می‌دهند.'),'orders')}
        ${block(tx('Заказов в месяц','Orders per month','سفارش در ماه'),tx('Общее количество заказов, выполненных водителями в течение соответствующего месяца.','The total number of orders completed by drivers during the corresponding month.','مجموع سفارش‌هایی که رانندگان در طول ماه مربوطه انجام داده‌اند.'),'calendar')}
        ${block(tx('Комиссия','Commission','کمیسیون'),tx('За каждый выполненный заказ водитель платит сервису комиссию. Эта комиссия формирует вашу валовую выручку. Ставку можно изменить в разделе «Параметры»; рекомендуемый уровень — около 13%.','For every completed order, the driver pays the service a commission. This commission forms your gross revenue. The rate can be adjusted in “Parameters”; the recommended level is about 13%.','برای هر سفارش انجام‌شده، راننده درصدی را به‌عنوان کمیسیون به سرویس پرداخت می‌کند. این کمیسیون بخش اصلی درآمد شما را تشکیل می‌دهد. نرخ در بخش «پارامترها» قابل تغییر است و سطح پیشنهادی حدود ۱۳٪ است.'),'coins')}
        ${block(tx('Надбавка оператора','Operator surcharge','افزوده اپراتور'),tx('Это дополнительная надбавка к заказу, оформленному через Контакт-центр, которую оплачивает клиент. Надбавка составляет 20% от стоимости заказа и предназначена для покрытия расходов на звонки Контакт-центра.','This is an extra surcharge added to an order created through the contact center and paid by the customer. The surcharge equals 20% of the order value and is added to cover call-center costs.','این مبلغ اضافه برای سفارشی است که از طریق مرکز تماس ثبت شده و توسط مشتری پرداخت می‌شود. مقدار آن ۲۰٪ مبلغ سفارش است و برای پوشش هزینه‌های تماس مرکز تماس در نظر گرفته شده است.'),'headset')}
      `},
      expenses:{title:tx('Операционные расходы','Operating expenses','هزینه‌های عملیاتی'),subtitle:c().allAmounts,html:`
        ${block(tx('Ассистент','Assistant','Assistant'),tx('Команда поддержки обрабатывает обращения пассажиров и водителей, проверяет фотоконтроль и заказы, помогает с регистрацией водителей, фиксирует нарушения и выполняет другие операционные задачи. На практике услуга может заменить одного-двух сотрудников поддержки.','The support team handles incoming requests from passengers and drivers, checks photo controls and orders, assists with driver registration, records violations and performs other operational tasks. In practice, the service can replace one or two support employees.','تیم پشتیبانی درخواست‌های مسافران و رانندگان را بررسی می‌کند، کنترل عکس و سفارش‌ها را انجام می‌دهد، به ثبت‌نام رانندگان کمک می‌کند، تخلفات را ثبت کرده و سایر کارهای عملیاتی را انجام می‌دهد. در عمل این خدمت می‌تواند جایگزین یک یا دو نیروی پشتیبانی شود.'),'assistant')}
        ${assistantTable()}
        ${block(tx('Оповещения (SMS + IVR)','Notifications (SMS + IVR)','اطلاع‌رسانی (SMS + IVR)'),tx('SMS — это одноразовые коды подтверждения, которые отправляются пользователям для регистрации и авторизации в приложениях. Одно сообщение стоит 30 IRT. IVR — автоматические голосовые оповещения клиентов о назначенном водителе и о том, что автомобиль подъехал, а также звонки между клиентом и водителем внутри приложения.','SMS messages are one-time verification codes sent to users for registration and authorisation in the apps. One message costs 30 IRT. IVR means automated voice notifications to customers about the assigned driver and arrived car, as well as calls between the customer and driver inside the app.','SMS شامل کدهای یک‌بارمصرف برای ثبت‌نام و ورود کاربران به اپلیکیشن است و هر پیام ۳۰ IRT هزینه دارد. IVR شامل تماس‌های صوتی خودکار برای اعلام تخصیص راننده و رسیدن خودرو و همچنین تماس‌های داخل اپلیکیشن بین مشتری و راننده است.'),'bell')}
        ${block(tx('Звонки в Контакт-центр','Contact-center calls','تماس‌های مرکز تماس'),tx('Каждый звонок в Контакт-центр стоит 7 500 IRT. Это плата за телефонию и работу операторов, которые обрабатывают запрос клиента и создают заказ.','Each contact-center call costs 7,500 IRT. This covers telephony and the work of operators who process the customer request and create the order.','هزینه هر تماس با مرکز تماس ۷٬۵۰۰ IRT است. این مبلغ هزینه تلفن و کار اپراتورهایی را پوشش می‌دهد که درخواست مشتری را پردازش و سفارش را ثبت می‌کنند.'),'phone')}
        ${block(tx('Роялти','Royalty','رویالتی'),tx('Роялти — это плата сервису за использование лицензии. Расчётная база — комиссия и надбавка оператора за вычетом расходов на Контакт-центр, SMS и IVR. Ставка определяется по ступенчатой шкале ниже.','Royalty is the fee paid to the service for use of the licence. The calculation base is commission plus operator surcharge minus contact-center, SMS and IVR expenses. The rate is determined by the tiered scale below.','رویالتی هزینه استفاده از مجوز سرویس است. مبنای محاسبه برابر است با کمیسیون + افزوده اپراتور منهای هزینه مرکز تماس، SMS و IVR. درصد رویالتی طبق جدول پلکانی زیر تعیین می‌شود.'),'percent')}
        ${royaltyTable()}
        ${block(tx('Итого','Total','جمع'),tx('Сумма всех операционных расходов за месяц. Большинство расходов меняется по мере роста подразделения: роялти, расходы на SMS и услугу «Ассистент» увеличиваются вместе с объёмом заказов, одновременно растёт и общая выручка.','The sum of all operating expenses for the month. Most expenses change as the unit grows: royalties, SMS charges and the Assistant service increase with order volume, while total revenue also grows.','مجموع تمام هزینه‌های عملیاتی ماه. با رشد واحد، بیشتر هزینه‌ها نیز تغییر می‌کنند: رویالتی، هزینه SMS و خدمت Assistant همراه با تعداد سفارش‌ها افزایش می‌یابد و هم‌زمان درآمد کل نیز رشد می‌کند.'),'calculator')}
      `},
      profit:{title:tx('Прибыль','Profit','سود'),subtitle:c().allAmounts,html:`
        ${block(tx('Чистая прибыль','Net profit','سود خالص'),tx(`Чистая прибыль — это разница между общей выручкой (комиссия + надбавка оператора) и расходами на рекламу и операционную деятельность. В этом сценарии ежемесячная чистая прибыль становится положительной ${positiveRu}.`,`Net profit is total revenue (commission + operator surcharge) minus advertising and operating expenses. In this scenario, monthly net profit becomes positive ${positiveEn}.`,`سود خالص برابر است با درآمد کل (کمیسیون + افزوده اپراتور) منهای هزینه تبلیغات و هزینه‌های عملیاتی. در این سناریو سود خالص ماهانه ${positiveFa}.`),'profit')}
        ${block(tx('Накопленная чистая прибыль','Accumulated net profit','سود خالص تجمعی'),tx(`Накопленная чистая прибыль — это общий финансовый результат с момента запуска: сумма прибыли или убытка каждого месяца с учётом паушального взноса, рекламы и операционных расходов. Когда показатель становится положительным, все вложения полностью возвращены — расчётно ${paybackRu}.`,`Accumulated net profit is the total financial result since launch: the sum of each month’s profit or loss, including the franchise fee, advertising and operating expenses. When the figure becomes positive, all investment has been recovered — estimated ${paybackEn}.`,`سود خالص تجمعی نتیجه مالی از زمان شروع است: مجموع سود یا زیان ماهانه با درنظرگرفتن حق ورود، تبلیغات و هزینه‌های عملیاتی. وقتی این عدد مثبت شود، تمام سرمایه‌گذاری انجام‌شده بازگشته است — برآورد ${paybackFa}.`),'wallet')}
      `},
      initialFee:{title:tx('Паушальный взнос','Franchise fee','حق ورود فرانشیز'),subtitle:c().allAmounts,html:`
        ${block(tx('Паушальный взнос','Franchise fee','حق ورود فرانشیز'),tx('Паушальный взнос — это лицензионный платёж за запуск франшизы Maxim. Он включает программную платформу, приложения, брендбук и стандарты работы. Кроме того, Maxim обучает вас ведению бизнеса, готовит карту города, настраивает тарифы, помогает с подготовкой к запуску и предоставляет персонального менеджера. В стоимость также входит стартовый рекламный пакет, который печатается и отправляется вам до запуска.','The entry fee is the license payment for launching a Maxim franchise. It includes the software platform, applications, brand book, and operating standards. In addition, Maxim trains you to run the business, prepares the map, configures pricing, assists with launch preparation, and provides a personal manager. The fee also includes a starter advertising package that is printed and sent to you before launch.','حق ورود، پرداخت مربوط به مجوز راه‌اندازی فرانشیز Maxim است. این مبلغ شامل پلتفرم نرم‌افزاری، اپلیکیشن‌ها، برندبوک و استانداردهای کاری است. Maxim همچنین آموزش کسب‌وکار، آماده‌سازی نقشه شهر، تنظیم تعرفه‌ها، کمک در آماده‌سازی راه‌اندازی و مدیر پشتیبان اختصاصی را ارائه می‌کند. بسته تبلیغاتی شروع که پیش از راه‌اندازی چاپ و ارسال می‌شود نیز در این مبلغ قرار دارد.'),'briefcase')}
        ${feeTable()}
        <div class="model-detail-actions model-detail-actions--single">${subdetailBtn('startupPackage',c().startupPackage)}</div>
      `},
      advertising:{title:tx('Реклама','Advertising','تبلیغات'),subtitle:c().allAmounts,html:`
        ${block(tx('Реклама','Advertising','تبلیغات'),tx('Расходы на рекламу — основные инвестиции франчайзи в развитие территории. Размещение и контроль рекламы — одна из ключевых задач: реклама повышает узнаваемость бренда Maxim и мотивирует пользователей устанавливать приложение и оформлять заказы. Франчайзи получают брендбук, набор рекламных форматов и структурированную систему размещения. Ниже можно посмотреть рекомендованный план рекламного бюджета и примеры брендированных материалов.','Advertising expenses are the franchisee’s main investment in developing the territory. Placing and controlling advertising is one of the key tasks: it builds Maxim brand awareness and motivates users to install the app and place orders. Franchisees receive a brand book, a set of advertising formats and a structured placement system. Below you can review the recommended advertising budget plan and examples of branded materials.','هزینه تبلیغات مهم‌ترین سرمایه‌گذاری فرانشیزگیرنده برای توسعه شهر است. جانمایی و کنترل تبلیغات یکی از وظایف کلیدی است: تبلیغات آگاهی از برند Maxim را افزایش داده و کاربران را به نصب اپلیکیشن و ثبت سفارش ترغیب می‌کند. فرانشیزگیرنده برندبوک، مجموعه قالب‌های تبلیغاتی و سیستم ساختاریافته جانمایی دریافت می‌کند. در ادامه می‌توانید برنامه پیشنهادی بودجه و نمونه تبلیغات واقعی را ببینید.'),'megaphone')}
        <div class="model-detail-actions">${subdetailBtn('advertisingPlan',c().placementPlan)}${subdetailBtn('brandbook',c().brandbook)}</div>
      `}
    };
    return definitions;
  }

  function open(key,model){
    const modal=document.getElementById('modelDetailModal');
    const title=document.getElementById('modelDetailTitle');
    const subtitle=document.getElementById('modelDetailSubtitle');
    const body=document.getElementById('modelDetailBody');
    if(!modal||!title||!subtitle||!body)return;
    const defs=definitionMap(model);
    const def=defs[key];
    if(!def)return;
    currentKey=key;
    returnFocus=document.activeElement;
    title.textContent=def.title;
    subtitle.textContent=def.subtitle;
    const titleIcon=document.getElementById('modelDetailTitleIcon');
    if(titleIcon){const iconName={investment:'briefcase',income:'coins',expenses:'calculator',profit:'profit',initialFee:'briefcase',advertising:'megaphone'}[key]||'info';titleIcon.innerHTML=iconSvg(iconName);}
    modal.querySelector('.model-detail-panel')?.setAttribute('data-detail-kind',key);
    body.innerHTML=`${key==='income'?'':`<div class="model-detail-currency-note">${esc(c().allAmounts)}</div>`}<div class="model-detail-copy">${def.html}</div>`;
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('model-detail-open');
    setTimeout(()=>modal.querySelector('.model-detail-close')?.focus(),0);
  }

  function openSubdetail(key,model){
    const modal=document.getElementById('modelSubDetailModal');
    const title=document.getElementById('modelSubDetailTitle');
    const subtitle=document.getElementById('modelSubDetailSubtitle');
    const body=document.getElementById('modelSubDetailBody');
    if(!modal||!title||!subtitle||!body)return;
    const isRu=lang()==='ru-RU', isFa=lang()==='fa-IR';
    if(key==='startupPackage'){
      title.textContent=isFa?'بسته تبلیغاتی شروع':isRu?'Стартовый рекламный пакет':'Starter advertising package';
      subtitle.textContent=isFa?'اقلامی که پیش از راه‌اندازی برای شریک آماده می‌شوند.':isRu?'Материалы, которые подготавливаются для партнёра перед запуском подразделения.':'Materials prepared for the partner before launch.';
      const intro=isFa?'نمونه طرح‌ها و اقلام تبلیغاتی موجود در بسته شروع.':isRu?'Примеры макетов и рекламных материалов, входящих в стартовый пакет.':'Examples of layouts and advertising materials included in the starter package.';
      body.innerHTML=`<div class="subdetail-intro">${intro}</div>${galleryHtml('sub-startup-package',startupPackage).replace(' hidden','')}`;
    }else if(key==='brandbook'){
      title.textContent=isFa?'برندبوک: نمونه تبلیغات':isRu?'Брендбук: примеры рекламы':'Brandbook: advertising examples';
      subtitle.textContent=isFa?'نمونه‌های واقعی تبلیغات Maxim در ایران.':isRu?'Реальные примеры размещения рекламы Maxim в Иране.':'Real examples of Maxim advertising placements in Iran.';
      const intro=isFa?'فرمت‌هایی که برای افزایش آگاهی از برند و جذب راننده و مشتری قابل استفاده هستند.':isRu?'Форматы, которые можно использовать для повышения узнаваемости бренда и привлечения водителей и клиентов.':'Formats that can be used to build brand awareness and attract drivers and customers.';
      body.innerHTML=`<div class="subdetail-intro">${intro}</div>${galleryHtml('sub-brandbook',brandbookItems).replace(' hidden','')}`;
    }else if(key==='advertisingPlan'){
      title.textContent=isFa?'برنامه جانمایی تبلیغات':isRu?'План размещения рекламы':'Advertising placement plan';
      subtitle.textContent=isFa?'توزیع پیشنهادی بودجه تبلیغات برای ۱۲ ماه.':isRu?'Рекомендованное распределение рекламного бюджета на 12 месяцев.':'Recommended advertising budget distribution for 12 months.';
      body.innerHTML=advertisingPlan(model).replace(' hidden','');
    }else return;
    modal.hidden=false;
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('model-subdetail-open');
    setTimeout(()=>modal.querySelector('.model-subdetail-close')?.focus(),0);
  }

  function closeSubdetail(){
    const modal=document.getElementById('modelSubDetailModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('model-subdetail-open');
  }

  function togglePanel(panelId){
    const panel=document.getElementById(panelId);
    if(!panel)return;
    const isHidden=panel.hidden;
    panel.hidden=!isHidden;
  }

  function close(){
    const modal=document.getElementById('modelDetailModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('model-detail-open');
    currentKey=null;
    const target=returnFocus;returnFocus=null;
    setTimeout(()=>target?.focus?.(),0);
  }

  return{open,close,togglePanel,openSubdetail,closeSubdetail};
})();
