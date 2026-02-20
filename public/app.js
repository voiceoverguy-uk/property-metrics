const APP_VERSION = '2.6';
const APP_VERSION_DATE = 'February 2026';

document.addEventListener('DOMContentLoaded', function() {
  const vf = document.getElementById('appVersionFooter');
  if (vf) vf.textContent = 'Version ' + APP_VERSION + ' \u2014 ' + APP_VERSION_DATE;
});

const form = document.getElementById('dealForm');
const resultsPanel = document.getElementById('resultsPanel');
const costItemsList = document.getElementById('costItemsList');
const addCostItemBtn = document.getElementById('addCostItem');
const costItemsTotalEl = document.getElementById('costItemsTotal');
const mapSection = document.getElementById('mapSection');
const mapContainer = document.getElementById('mapContainer');

function setResultsPanelContent(html) {
  const snap = document.getElementById('dealSnapshot');
  resultsPanel.innerHTML = '';
  if (snap) resultsPanel.appendChild(snap);
  resultsPanel.insertAdjacentHTML('beforeend', html);
}

let costItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }, { label: '', amount: 0 }];
let simpleCostItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }];
let runningCostItems = [{ label: '', amount: 0 }];
let map = null;
let marker = null;
let selectedLocation = null;
let currentMode = 'analyser';

const PROPERTY_COST_SUGGESTIONS = [
  "Refurb / repairs","Decorating","Redecoration","Painting","Plastering",
  "Electrics","Rewiring","New consumer unit","Lighting upgrades","Plumbing",
  "Boiler replacement","Central heating system","Radiators","Bathroom installation",
  "Kitchen installation","Flooring","Carpets","Laminate flooring","Tiling",
  "Windows replacement","Doors replacement","Roof repairs","New roof","Damp proofing",
  "Structural works","Extension","Loft conversion","Garage conversion","Chimney repairs",
  "Insulation","Solicitor fees","Stamp duty","Survey","Valuation fee","Broker fee",
  "Mortgage arrangement fee","Lender fee","Sourcing fee","Auction fees","Legal searches",
  "Land Registry fee","Bridging loan interest","Bridging arrangement fee","Refinance costs",
  "Product transfer fee","Early repayment charge","Mortgage exit fee","Accountant fees",
  "Company setup costs","Incorporation fee","Gas safety certificate","EICR","EPC",
  "Fire doors","Smoke alarms","Carbon monoxide alarms","HMO licence","Selective licence",
  "Planning permission","Building control","PAT testing","Legionella assessment",
  "Fire risk assessment","Tenancy agreement setup","Inventory","Deposit protection fee",
  "Referencing","Letting agent setup fee","Letting agent tenant-find fee",
  "Compliance upgrades","Furniture","Appliances","White goods","Beds","Sofas",
  "Wardrobes","Curtains / blinds","Garden works","Landscaping","Fence replacement",
  "Driveway works","Clearance","Waste removal","Skip hire","Deep cleaning",
  "Professional cleaning","End of tenancy clean","Pest control","Security system",
  "CCTV installation","Insurance","Landlord insurance","Service charge","Ground rent",
  "Maintenance allowance","Void allowance","Management fee","Bookkeeping",
  "Software subscriptions","Marketing costs",
  "Brickwork repairs","Repointing","Lintel replacement","Steel beam installation",
  "Wall removal","Load-bearing wall removal","Skimming","Ceiling replacement",
  "Artex removal","Chimney removal","Chimney breast removal","Chimney stack repair",
  "Gutter replacement","Soffits and fascias","Downpipes","Drainage repairs",
  "Unblocking drains","Manhole repair","Water main replacement","Stop tap replacement",
  "Loft insulation","Cavity wall insulation","Internal wall insulation",
  "External wall insulation","Double glazing upgrade","Triple glazing","Solar panels",
  "Battery storage","Air source heat pump","Extractor fans","Fire alarm system",
  "Emergency lighting","Fire panel","Intumescent strips","Fire door closers",
  "Thumb-turn locks","Handrails","Balustrade installation","Window restrictors",
  "Asbestos survey","Additional bathroom","Additional kitchen","Partition walls",
  "Soundproofing","Interlinked smoke alarms","Communal area refurb","Meter separation",
  "Sub-meter installation","Door entry system","Intercom system"
];

const RECURRING_MONTHLY_COST_SUGGESTIONS = [
  "Landlord insurance","Buildings insurance","Contents insurance",
  "Letting agent management fee","Rent guarantee insurance","Boiler cover",
  "Home emergency cover","Service charge","Ground rent","Maintenance allowance",
  "Void allowance","Repairs sinking fund","Property management software",
  "Accounting / bookkeeping","Company account fees","Mortgage protection insurance",
  "Portfolio admin costs","Marketing costs","Subscription services",
  "Compliance monitoring","Waste collection (private)","Communal electricity",
  "Communal cleaning","CCTV maintenance","Security monitoring"
];

function getShortAddress() {
  const addr = document.getElementById('address').value.trim();
  if (!addr) return '';
  const parts = addr.split(',');
  let short = parts[0].trim();
  short = short.replace(/^\d+\s+/, '');
  return short;
}

function updateDealRefPlaceholder() {
  const dealRefInput = document.getElementById('dealReference');
  if (!dealRefInput) return;
  const short = getShortAddress();
  dealRefInput.placeholder = short ? `${short} \u2013 BTL` : 'e.g. house with mortgage';
}

function setupDealRefAutocomplete() {
  const dealRefInput = document.getElementById('dealReference');
  if (!dealRefInput) return;
  const wrapper = dealRefInput.parentElement;
  wrapper.style.position = 'relative';

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  dropdown.style.display = 'none';
  wrapper.appendChild(dropdown);

  const suffixes = ['BTL', 'Mortgage', 'Project', 'Refurb'];

  function showSuggestions() {
    const short = getShortAddress();
    if (!short) { dropdown.style.display = 'none'; return; }
    const typed = dealRefInput.value.trim().toLowerCase();
    const suggestions = suffixes
      .map(s => `${short} \u2013 ${s}`)
      .filter(s => !typed || s.toLowerCase().includes(typed));
    if (suggestions.length === 0) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = suggestions.map(s =>
      `<div class="autocomplete-item">${escHtml(s)}</div>`
    ).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        dealRefInput.value = item.textContent;
        dropdown.style.display = 'none';
      });
    });
  }

  let activeIndex = -1;

  function getItems() {
    return dropdown.querySelectorAll('.autocomplete-item');
  }

  function updateActive() {
    getItems().forEach((el, i) => {
      el.classList.toggle('autocomplete-active', i === activeIndex);
    });
  }

  dealRefInput.addEventListener('focus', showSuggestions);
  dealRefInput.addEventListener('input', () => { activeIndex = -1; showSuggestions(); });
  dealRefInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; activeIndex = -1; }, 150);
  });
  dealRefInput.addEventListener('keydown', (e) => {
    const items = getItems();
    const isOpen = dropdown.style.display === 'block' && items.length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { showSuggestions(); activeIndex = 0; updateActive(); return; }
      activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      updateActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && items[activeIndex]) {
        dealRefInput.value = items[activeIndex].textContent;
        dropdown.style.display = 'none';
        activeIndex = -1;
      } else {
        dropdown.style.display = 'none';
        activeIndex = -1;
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIndex = -1;
    }
  });

  const addressInput = document.getElementById('address');
  if (addressInput) {
    addressInput.addEventListener('input', updateDealRefPlaceholder);
    addressInput.addEventListener('change', updateDealRefPlaceholder);
    const origSetValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const observer = new MutationObserver(() => updateDealRefPlaceholder());
    observer.observe(addressInput, { attributes: true });
  }
}

const CUSTOM_LABELS_KEY = 'rm_cost_label_custom_suggestions';

function getCustomCostLabels() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_LABELS_KEY)) || [];
  } catch { return []; }
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
}

function saveCustomCostLabel(raw, source) {
  const label = toTitleCase(raw.trim());
  if (label.length < 3 || label.length > 40) return;
  const lowerLabel = label.toLowerCase();
  if (PROPERTY_COST_SUGGESTIONS.some(s => s.toLowerCase() === lowerLabel)) return;
  let custom = getCustomCostLabels();
  if (custom.some(c => c.toLowerCase() === lowerLabel)) return;
  custom.unshift(label);
  if (custom.length > 30) custom = custom.slice(0, 30);
  localStorage.setItem(CUSTOM_LABELS_KEY, JSON.stringify(custom));
  try {
    fetch('/api/suggestions/cost-label', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, source: source || 'additional_costs' }),
    }).catch(() => {});
  } catch {}
}

function getCostLabelSource(input) {
  const list = input.closest('#runningCostItemsList, #simpleRunningCostItemsList');
  return list ? 'recurring_costs' : 'additional_costs';
}

function attachCostLabelAutocomplete(input, suggestionsList, maxItems) {
  const sourceList = suggestionsList || PROPERTY_COST_SUGGESTIONS;
  const maxShow = maxItems || 8;
  const row = input.closest('.cost-item-row');
  if (!row) return;
  row.style.position = 'relative';

  let dropdown = input._acDropdown;
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown cost-autocomplete';
    dropdown.style.display = 'none';
    row.appendChild(dropdown);
    input._acDropdown = dropdown;
  }

  let activeIndex = -1;

  function getItems() {
    return dropdown.querySelectorAll('.autocomplete-item');
  }

  function updateActive() {
    dropdown.classList.add('keyboard-nav');
    const items = getItems();
    items.forEach((el, i) => {
      el.classList.toggle('autocomplete-active', i === activeIndex);
    });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectItem(item) {
    input.value = item.textContent;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    dropdown.style.display = 'none';
    activeIndex = -1;
  }

  function showFiltered() {
    activeIndex = -1;
    dropdown.classList.remove('keyboard-nav');
    const typed = input.value.trim().toLowerCase();
    if (!typed) { dropdown.style.display = 'none'; return; }
    const custom = getCustomCostLabels();
    const customMatches = custom.filter(s => s.toLowerCase().includes(typed));
    const builtinMatches = sourceList.filter(s => s.toLowerCase().includes(typed));
    const seen = new Set();
    const combined = [];
    for (const m of [...customMatches, ...builtinMatches]) {
      const key = m.toLowerCase();
      if (!seen.has(key)) { seen.add(key); combined.push(m); }
      if (combined.length >= maxShow) break;
    }
    if (combined.length === 0) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = combined.map(m =>
      `<div class="autocomplete-item">${escHtml(m)}</div>`
    ).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(item);
      });
      item.addEventListener('mousemove', () => {
        dropdown.classList.remove('keyboard-nav');
      });
    });
  }

  input.addEventListener('input', showFiltered);
  input.addEventListener('focus', showFiltered);
  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; activeIndex = -1; }, 150);
    const val = input.value.trim();
    if (val.length >= 3) saveCustomCostLabel(val, getCostLabelSource(input));
  });
  input.addEventListener('keydown', (e) => {
    const items = getItems();
    const isOpen = dropdown.style.display === 'block' && items.length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) { showFiltered(); activeIndex = 0; updateActive(); return; }
      activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) return;
      activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      updateActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && activeIndex >= 0 && items[activeIndex]) {
        selectItem(items[activeIndex]);
      } else {
        dropdown.style.display = 'none';
        activeIndex = -1;
      }
      const val = input.value.trim();
      if (val.length >= 3) saveCustomCostLabel(val, getCostLabelSource(input));
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIndex = -1;
    }
  });
}
let lastSdltData = null;
let lastSdltPrice = null;

const routeToMode = { '/': 'analyser', '/simple-analyser': 'simple', '/deal-analyser': 'analyser', '/sdlt-calculator': 'sdlt' };
const modeToRoute = { 'analyser': '/', 'simple': '/simple-analyser', 'sdlt': '/sdlt-calculator' };
const modeMeta = {
  simple: {
    title: 'Rental Yield Calculator UK | Free BTL Tool',
    description: 'Free UK rental yield calculator. Estimate gross and net yield, cash flow and acquisition costs for buy-to-let property deals.',
    h1: 'Rental Yield Calculator UK',
    subheading: 'Calculate gross and net rental yield, monthly cash flow and acquisition costs in seconds.'
  },
  analyser: {
    title: 'Buy-to-Let Deal Analyser UK | Stress Test Deals',
    description: 'Analyse UK buy-to-let deals with stress testing, cash-on-cash return and full acquisition cost breakdown. Free online tool.',
    h1: 'Buy-to-Let Deal Analyser (UK)',
    subheading: 'Stress test your numbers, model mortgage impact and see if your deal really stacks up.'
  },
  sdlt: {
    title: 'Stamp Duty Calculator UK | Free SDLT Tool',
    description: 'Free UK Stamp Duty calculator for main residences, first-time buyers and investors. Accurate SDLT estimates in seconds.',
    h1: 'Stamp Duty Calculator UK (SDLT)',
    subheading: 'Instantly calculate Stamp Duty for main residences, first-time buyers and investors.'
  }
};
const modeFaqs = {
  simple: [
    { q: 'What is rental yield?', a: 'Rental yield measures the annual return on a buy-to-let property as a percentage of its purchase price. Gross yield uses the full annual rent, while net yield deducts running costs such as insurance, maintenance and letting agent fees. Most UK investors target a net yield between 5% and 8%.' },
    { q: 'What is the difference between gross and net yield?', a: 'Gross yield is calculated by dividing the annual rent by the property price and multiplying by 100. Net yield goes further by subtracting annual running costs from the rent before dividing by the total acquisition cost, including SDLT and solicitor fees. Net yield gives a more realistic picture of your actual return.' },
    { q: 'How much should I budget for solicitor fees?', a: 'Solicitor or conveyancing fees for a standard UK buy-to-let purchase typically range from \u00a31,000 to \u00a31,800 plus VAT. Costs can be higher for leasehold properties or complex transactions. Always get a fixed-fee quote that includes disbursements such as searches, Land Registry fees and bank transfer charges.' },
    { q: 'What is a good rental yield in the UK?', a: 'A good gross yield for UK buy-to-let is generally considered to be 6% or above, though this varies by region. Northern cities such as Liverpool, Manchester and Leeds often achieve 7\u201310%, while London yields tend to be lower at 3\u20135%. Always assess net yield after costs for a true comparison.' }
  ],
  analyser: [
    { q: 'What is cash-on-cash return?', a: 'Cash-on-cash return measures the annual pre-tax cash flow as a percentage of the total cash you invested, including your deposit, SDLT, solicitor fees and refurbishment costs. It is especially useful for leveraged purchases because it shows the return on your actual money in the deal rather than the full property price.' },
    { q: 'How does mortgage stress testing work?', a: 'Stress testing calculates your mortgage payment at a higher interest rate, typically 2\u20133% above your actual rate, to check whether the rental income still covers costs. UK lenders commonly stress-test at around 5.5\u20137%. If cash flow remains positive at the stress rate, the deal offers a safety margin against future rate rises.' },
    { q: 'What is annual cash flow on a buy-to-let?', a: 'Annual cash flow is the money left after deducting all costs from your rental income. This includes mortgage payments, letting agent fees, maintenance, insurance, void periods and any other running costs. Positive cash flow means the property pays for itself each month; negative cash flow requires you to top up from personal funds.' },
    { q: 'What costs are included in a deal analysis?', a: 'A full deal analysis includes the purchase price, Stamp Duty Land Tax, solicitor fees, survey costs, refurbishment and any other acquisition costs. It also factors in ongoing costs such as mortgage payments, letting agent fees with VAT, maintenance allowance, insurance and void periods to calculate accurate net yield and cash flow.' }
  ],
  sdlt: [
    { q: 'What are the current SDLT rates in England?', a: 'For standard residential purchases the rates are 0% up to \u00a3125,000, 2% from \u00a3125,001 to \u00a3250,000, 5% from \u00a3250,001 to \u00a3925,000, 10% from \u00a3925,001 to \u00a31.5 million, and 12% above \u00a31.5 million. These bands apply in England and Northern Ireland. Scotland and Wales have their own separate land transaction taxes with different thresholds.' },
    { q: 'What is the additional property SDLT surcharge?', a: 'Since April 2025, buyers purchasing an additional residential property in England or Northern Ireland pay a 5% surcharge on top of standard SDLT rates. This applies to buy-to-let investments and second homes. The surcharge is calculated on the entire purchase price and significantly increases the total tax bill on investment properties.' },
    { q: 'Do first-time buyers pay less Stamp Duty?', a: 'Yes, first-time buyers in England and Northern Ireland benefit from SDLT relief. They pay 0% on the first \u00a3300,000 and 5% on the portion from \u00a3300,001 to \u00a3500,000. If the property costs more than \u00a3500,000, the relief is lost entirely and standard rates apply to the full price.' },
    { q: 'Does SDLT apply in Scotland and Wales?', a: 'No, SDLT only applies in England and Northern Ireland. Scotland uses Land and Buildings Transaction Tax with different rate bands and thresholds. Wales uses Land Transaction Tax, also with its own structure. This calculator covers England and Northern Ireland only; separate tools are needed for Scottish and Welsh calculations.' }
  ]
};

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

window.addEventListener('popstate', (e) => {
  const mode = (e.state && e.state.mode) ? e.state.mode : (routeToMode[window.location.pathname] || 'simple');
  setMode(mode, false);
});

function updateMeta(mode) {
  const meta = modeMeta[mode];
  if (!meta) return;
  const url = 'https://rentalmetrics.co.uk' + window.location.pathname;
  document.title = meta.title;
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag) descTag.setAttribute('content', meta.description);
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', url);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', meta.title);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', meta.description);
  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', url);
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', meta.title);
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', meta.description);
  const h1El = document.getElementById('pageH1');
  if (h1El) h1El.textContent = meta.h1;
  const subEl = document.getElementById('pageSubheading');
  if (subEl) subEl.textContent = meta.subheading;
}

function updateFaqSchema(mode) {
  const existing = document.getElementById('faq-jsonld');
  if (existing) existing.remove();
  const faqs = modeFaqs[mode];
  if (!faqs) return;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(f => ({
      '@type': 'Question',
      'name': f.q,
      'acceptedAnswer': { '@type': 'Answer', 'text': f.a }
    }))
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'faq-jsonld';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function setMode(mode, pushHistory) {
  currentMode = mode;
  const btns = document.querySelectorAll('.mode-btn');
  btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.body.classList.remove('sdlt-mode', 'simple-mode', 'deal-mode');
  if (mode === 'sdlt') {
    document.body.classList.add('sdlt-mode');
    document.getElementById('monthlyRent').removeAttribute('required');
    setResultsPanelContent('<div class="results-placeholder"><p>Enter a price and click <strong>Calculate SDLT</strong> to see results.</p></div>');
  } else if (mode === 'simple') {
    document.body.classList.add('simple-mode');
    document.getElementById('monthlyRent').setAttribute('required', '');
    setResultsPanelContent('<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>');
  } else {
    document.body.classList.add('deal-mode');
    document.getElementById('monthlyRent').setAttribute('required', '');
    setResultsPanelContent('<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>');
  }
  if (typeof window.updateSnapshot === 'function') window.updateSnapshot();
  updateMeta(mode);
  updateFaqSchema(mode);
  if (pushHistory !== false) {
    const target = modeToRoute[mode] || '/';
    if (window.location.pathname !== target) {
      window.history.pushState({ mode }, '', target);
    }
  }
}

const CURRENCY_FIELDS = ['price', 'monthlyRent', 'solicitorFees', 'maintenanceFixed'];

function parseCurrencyValue(str) {
  if (typeof str === 'number') return str;
  return parseFloat(String(str).replace(/[^0-9.\-]/g, '')) || 0;
}

function formatCurrencyDisplay(val) {
  const num = parseCurrencyValue(val);
  if (!num && num !== 0) return '';
  if (num === 0) return '';
  if (num === Math.floor(num)) {
    return '\u00a3' + num.toLocaleString('en-GB');
  }
  return '\u00a3' + num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addCommasToNumber(str) {
  const clean = String(str).replace(/[^0-9]/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function liveFormatCurrency(input) {
  const cursorPos = input.selectionStart || 0;
  const oldVal = input.value;
  const digitsBeforeCursor = oldVal.slice(0, cursorPos).replace(/[^0-9]/g, '').length;
  const raw = oldVal.replace(/[^0-9]/g, '');
  input.dataset.rawValue = raw;
  if (!raw) { input.value = ''; return; }
  const formatted = addCommasToNumber(raw);
  input.value = formatted;
  let digitsSeen = 0;
  let newPos = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== ',') {
      digitsSeen++;
    }
    if (digitsSeen === digitsBeforeCursor) {
      newPos = i + 1;
      break;
    }
  }
  if (digitsBeforeCursor === 0) newPos = 0;
  input.setSelectionRange(newPos, newPos);
}

function initCurrencyFormatting() {
  CURRENCY_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.setAttribute('type', 'text');
    input.setAttribute('inputmode', 'numeric');
    const raw = input.value;
    if (raw) {
      input.dataset.rawValue = String(parseCurrencyValue(raw));
      input.value = formatCurrencyDisplay(raw);
    }

    input.addEventListener('input', () => { liveFormatCurrency(input); });

    input.addEventListener('blur', () => {
      const num = parseCurrencyValue(input.dataset.rawValue || input.value);
      input.dataset.rawValue = num || '';
      input.value = num ? formatCurrencyDisplay(num) : '';
    });

    input.addEventListener('focus', () => {
      const rv = input.dataset.rawValue || '';
      input.value = rv ? addCommasToNumber(rv) : '';
    });
  });
}

function applyCurrencyToCostAmount(input) {
  input.setAttribute('type', 'text');
  input.setAttribute('inputmode', 'numeric');

  input.addEventListener('input', () => {
    liveFormatCurrency(input);
    const idx = parseInt(input.dataset.index);
    costItems[idx].amount = parseCurrencyValue(input.dataset.rawValue || '0');
    updateCostTotal();
  });

  input.addEventListener('focus', () => {
    const rv = input.dataset.rawValue || '';
    input.value = rv ? addCommasToNumber(rv) : '';
  });

  input.addEventListener('blur', () => {
    const num = parseCurrencyValue(input.dataset.rawValue || input.value);
    input.dataset.rawValue = num || '';
    input.value = num ? formatCurrencyDisplay(num) : '';
  });
}

function applyCurrencyToRunningCostAmount(input) {
  input.setAttribute('type', 'text');
  input.setAttribute('inputmode', 'numeric');

  input.addEventListener('input', () => {
    liveFormatCurrency(input);
    const idx = parseInt(input.dataset.index);
    runningCostItems[idx].amount = parseCurrencyValue(input.dataset.rawValue || '0');
    updateRunningCostTotal();
  });

  input.addEventListener('focus', () => {
    const rv = input.dataset.rawValue || '';
    input.value = rv ? addCommasToNumber(rv) : '';
  });

  input.addEventListener('blur', () => {
    const num = parseCurrencyValue(input.dataset.rawValue || input.value);
    input.dataset.rawValue = num || '';
    input.value = num ? formatCurrencyDisplay(num) : '';
  });
}

function getCurrencyFieldValue(id) {
  const input = document.getElementById(id);
  if (!input) return 0;
  return parseCurrencyValue(input.dataset.rawValue || input.value);
}

let selectedPurchaseType = 'cash';
let depositInputMode = 'pct';
let mortgageType = 'interest-only';

function getSelectedPurchaseType() {
  return selectedPurchaseType;
}

function syncMortgageInputsVisibility() {
  const isMortgage = selectedPurchaseType === 'mortgage';
  document.getElementById('mortgageInputs').style.display = isMortgage ? '' : 'none';
}

document.querySelectorAll('.purchase-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.purchase-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPurchaseType = btn.dataset.purchase;
    syncMortgageInputsVisibility();
  });
});

function syncDepositInputType() {
  const depInput = document.getElementById('depositAmount');
  if (depositInputMode === 'pounds') {
    depInput.setAttribute('type', 'text');
    depInput.setAttribute('inputmode', 'numeric');
  } else {
    depInput.setAttribute('type', 'number');
    depInput.removeAttribute('inputmode');
  }
}

document.querySelectorAll('.deposit-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.deposit-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    depositInputMode = btn.dataset.depositMode;
    const depInput = document.getElementById('depositAmount');
    depInput.value = '';
    depInput.dataset.rawValue = '';
    depInput.placeholder = depositInputMode === 'pct' ? 'e.g. 25' : 'e.g. £40,000';
    syncDepositInputType();
    updateDepositHelperText();
  });
});

syncDepositInputType();

document.querySelectorAll('.mortgage-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mortgage-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mortgageType = btn.dataset.mortgageType;
  });
});

function getDepositRawValue() {
  const depInput = document.getElementById('depositAmount');
  if (depositInputMode === 'pounds') {
    return parseCurrencyValue(depInput.dataset.rawValue || depInput.value);
  }
  return parseFloat(depInput.value) || 0;
}

function updateDepositHelperText() {
  const helperEl = document.getElementById('depositHelperText');
  if (!helperEl) return;
  const price = getCurrencyFieldValue('price');
  const rawVal = getDepositRawValue();

  if (!price || price <= 0) {
    helperEl.textContent = 'Enter purchase price to calculate';
    return;
  }

  if (depositInputMode === 'pounds') {
    const pct = price > 0 ? ((rawVal / price) * 100) : 0;
    helperEl.textContent = rawVal > 0 ? `That's ${pct.toFixed(1)}% deposit` : '';
  } else {
    const clampedPct = Math.min(Math.max(rawVal, 0), 100);
    const depositPounds = Math.round(price * (clampedPct / 100));
    helperEl.textContent = clampedPct > 0 ? `That's ${fmt(depositPounds)} deposit` : '';
  }
}

function getDepositAmount() {
  const price = getCurrencyFieldValue('price');
  const rawVal = getDepositRawValue();
  if (depositInputMode === 'pct') {
    const clampedPct = Math.min(Math.max(rawVal, 0), 100);
    return Math.round(price * (clampedPct / 100));
  }
  return Math.min(rawVal, price || Infinity);
}

function calcSDLTClient(price, buyerType) {
  if (price <= 0) return 0;
  const applyBands = (p, bands) => {
    let tax = 0, prev = 0;
    for (const b of bands) {
      if (p <= prev) break;
      const taxable = Math.min(p, b.t) - prev;
      if (taxable > 0) tax += taxable * b.r;
      prev = b.t;
    }
    return Math.round(tax);
  };
  if (buyerType === 'ftb' && price <= 500000) {
    return applyBands(price, [{ t: 300000, r: 0 }, { t: 500000, r: 0.05 }]);
  }
  if (buyerType === 'investor' || buyerType === 'additional') {
    return applyBands(price, [{ t: 125000, r: 0.05 }, { t: 250000, r: 0.07 }, { t: 925000, r: 0.10 }, { t: 1500000, r: 0.15 }, { t: Infinity, r: 0.17 }]);
  }
  return applyBands(price, [{ t: 125000, r: 0 }, { t: 250000, r: 0.02 }, { t: 925000, r: 0.05 }, { t: 1500000, r: 0.10 }, { t: Infinity, r: 0.12 }]);
}

function computeSnapshot() {
  const isSimple = currentMode === 'simple';
  const price = getCurrencyFieldValue('price');
  const monthlyRent = getCurrencyFieldValue('monthlyRent');
  const buyerType = getSelectedBuyerType();

  const missing = [];
  if (!document.getElementById('address').value.trim()) missing.push('address');
  if (!price || price <= 0) missing.push('price');
  if (!monthlyRent || monthlyRent <= 0) missing.push('rent');

  const sdlt = price > 0 ? calcSDLTClient(price, buyerType === 'ftb' ? 'ftb' : (buyerType === 'investor' ? 'additional' : 'main')) : 0;
  const solicitorFees = isSimple ? 0 : (getCurrencyFieldValue('solicitorFees') || 0);
  const additionalCosts = isSimple ? getSimpleCostItemsTotal() : getCostItemsTotal();

  const isMortgage = selectedPurchaseType === 'mortgage';
  const deposit = isMortgage ? getDepositAmount() : 0;
  const mortgageAmount = isMortgage ? Math.max(price - deposit, 0) : 0;
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
  const mortgageTerm = parseFloat(document.getElementById('mortgageTerm').value) || 25;
  const mortgagePayment = isMortgage && mortgageAmount > 0 ? calcMortgagePayment(mortgageAmount, interestRate, mortgageTerm, mortgageType) : 0;

  let upfrontTotal;
  if (isMortgage) {
    upfrontTotal = deposit + sdlt + solicitorFees + additionalCosts;
  } else {
    upfrontTotal = price + sdlt + solicitorFees + additionalCosts;
  }

  const lettingAgentFee = getLettingAgentFeeMonthly();
  const baseRunningCosts = getRunningCostItemsTotal();
  let effectiveMonthlyRent = monthlyRent;
  let maintenanceMonthly = 0;

  if (!isSimple) {
    const voidPct = parseFloat(document.getElementById('voidAllowance').value) || 0;
    effectiveMonthlyRent = monthlyRent * (1 - voidPct / 100);
    maintenanceMonthly = getMaintenanceAnnual() / 12;
  }

  const monthlyCashflow = effectiveMonthlyRent - lettingAgentFee - baseRunningCosts - maintenanceMonthly - mortgagePayment;

  const netAnnualRent = (effectiveMonthlyRent - lettingAgentFee - baseRunningCosts - maintenanceMonthly) * 12;
  const netYield = price > 0 ? (netAnnualRent / price) * 100 : 0;

  const annualCashflowAfterMortgage = monthlyCashflow * 12;
  const cashInvested = isMortgage ? (deposit + sdlt + solicitorFees + additionalCosts) : upfrontTotal;
  const cashOnCash = cashInvested > 0 ? (annualCashflowAfterMortgage / cashInvested) * 100 : 0;

  return {
    missing,
    upfrontTotal,
    monthlyCashflow,
    netYield: Math.round(netYield * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 100) / 100,
    breakdown: {
      price,
      deposit,
      sdlt,
      solicitorFees,
      additionalCosts,
      lettingAgentFee,
      baseRunningCosts,
      maintenanceMonthly,
      mortgagePayment,
      mortgageAmount,
      effectiveMonthlyRent,
      isMortgage,
      cashInvested
    }
  };
}

function calcMortgagePayment(loanAmount, annualRate, termYears, type) {
  if (loanAmount <= 0) return 0;
  const monthlyRate = (annualRate / 100) / 12;
  const totalMonths = termYears * 12;

  if (type === 'interest-only') {
    return (loanAmount * (annualRate / 100)) / 12;
  }

  if (monthlyRate <= 0) {
    return totalMonths > 0 ? loanAmount / totalMonths : 0;
  }
  return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
}

document.getElementById('depositAmount').addEventListener('input', function() {
  if (depositInputMode === 'pounds') {
    liveFormatCurrency(this);
  }
  updateDepositHelperText();
});
document.getElementById('depositAmount').addEventListener('focus', function() {
  if (depositInputMode === 'pounds') {
    const rv = this.dataset.rawValue || '';
    this.value = rv ? addCommasToNumber(rv) : '';
  }
});
document.getElementById('depositAmount').addEventListener('blur', function() {
  if (depositInputMode === 'pounds') {
    const num = parseCurrencyValue(this.dataset.rawValue || this.value);
    this.dataset.rawValue = num || '';
    this.value = num ? formatCurrencyDisplay(num) : '';
  }
});
document.getElementById('price').addEventListener('input', updateDepositHelperText);
document.getElementById('price').addEventListener('blur', updateDepositHelperText);

let maintenanceMode = 'pct';

document.querySelectorAll('.maint-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.maint-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    maintenanceMode = btn.dataset.maint;
    document.getElementById('maintPctInput').style.display = maintenanceMode === 'pct' ? '' : 'none';
    document.getElementById('maintFixedInput').style.display = maintenanceMode === 'fixed' ? '' : 'none';
  });
});

let selectedBuyerType = 'investor';

document.querySelectorAll('.buyer-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.buyer-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedBuyerType = btn.dataset.buyer;
    if (currentMode === 'sdlt' && lastSdltData && lastSdltPrice) {
      renderSDLTStandaloneResults(lastSdltData, lastSdltPrice);
    }
  });
});

function getSelectedBuyerType() {
  return selectedBuyerType;
}

function getBuyerTypeLabel(bt) {
  if (bt === 'ftb') return 'First-Time Buyer';
  if (bt === 'main') return 'Main Residence';
  return 'Investor / Additional Property';
}

function getResultForBuyerType(result, bt) {
  if (bt === 'ftb') return result.ftb;
  if (bt === 'main') return result.main;
  return result.investor;
}

function getSdltApiDataForBuyerType(data, bt) {
  if (bt === 'ftb') return data.ftb;
  if (bt === 'main') return data.standard;
  return data.additional;
}

document.getElementById('mortgageCalcBtn').addEventListener('click', async () => {
  const price = getCurrencyFieldValue('price');
  const deposit = getDepositAmount();
  const isSimple = currentMode === 'simple';
  const solicitorFees = isSimple ? 0 : (getCurrencyFieldValue('solicitorFees') || 1500);
  const summary = document.getElementById('borrowingSummary');
  const solicitorRow = document.getElementById('borrowingSolicitor').closest('.borrowing-row');

  if (!price || price <= 0) {
    summary.style.display = 'none';
    return;
  }

  const mortgageAmt = Math.max(price - deposit, 0);
  const depositPctCalc = price > 0 ? ((deposit / price) * 100) : 0;
  document.getElementById('borrowingDepositLabel').textContent = 'Cash Deposit (' + depositPctCalc.toFixed(1).replace(/\.0$/, '') + '%)';
  document.getElementById('borrowingDeposit').textContent = fmt(deposit);
  document.getElementById('borrowingSolicitor').textContent = fmt(solicitorFees);
  document.getElementById('borrowingMortgage').textContent = fmt(mortgageAmt);
  solicitorRow.style.display = isSimple ? 'none' : '';
  console.log('Mortgage Calc Debug:', { purchasePrice: price, deposit: deposit, calculatedMortgageAmount: mortgageAmt });

  try {
    const res = await fetch(`/api/sdlt?price=${price}`);
    const data = await res.json();
    const buyerType = getSelectedBuyerType();
    const sdltData = getSdltApiDataForBuyerType(data, buyerType);
    const sdlt = sdltData.total;
    document.getElementById('borrowingSDLT').textContent = fmt(sdlt);
    const totalFunds = Math.max(deposit + sdlt + solicitorFees + mortgageAmt, 0);
    document.getElementById('borrowingAmount').textContent = fmt(totalFunds);
  } catch (e) {
    document.getElementById('borrowingSDLT').textContent = '-';
    const totalFunds = Math.max(deposit + solicitorFees + mortgageAmt, 0);
    document.getElementById('borrowingAmount').textContent = fmt(totalFunds);
  }

  summary.style.display = '';
});

async function initGoogleMaps() {
  try {
    const res = await fetch('/api/maps-key');
    const { key } = await res.json();
    if (!key) {
      console.warn('No Google Maps API key found');
      return;
    }
    console.log('Google Maps: loading API...');

    ((g) => {
      var h, a, k, p = 'The Google Maps JavaScript API', c = 'google', l = 'importLibrary',
        q = '__ib__', m = document, b = window;
      b = b[c] || (b[c] = {});
      var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams,
        u = () => h || (h = new Promise(async (f, n) => {
          await (a = m.createElement('script'));
          e.set('libraries', [...r] + '');
          for (k in g) e.set(k.replace(/[A-Z]/g, t => '_' + t[0].toLowerCase()), g[k]);
          e.set('callback', c + '.maps.' + q);
          a.src = 'https://maps.googleapis.com/maps/api/js?' + e;
          d[q] = f;
          a.onerror = () => h = n(Error(p + ' could not load.'));
          a.nonce = m.querySelector('script[nonce]')?.nonce || '';
          m.head.append(a);
        }));
      d[l] ? console.warn(p + ' only loads once. Ignoring:', g) :
        d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
    })({ key, v: 'weekly', loading: 'async' });

    try {
      const placesLib = await google.maps.importLibrary('places');
      await google.maps.importLibrary('maps');
      await google.maps.importLibrary('marker');
      console.log('Google Maps: libraries imported');
      console.log('Google Maps: AutocompleteSuggestion available:', !!placesLib.AutocompleteSuggestion);
      setupAutocomplete(placesLib);
    } catch (e) {
      console.error('Google Maps: failed to import libraries:', e);
    }
  } catch (e) {
    console.error('Google Maps failed to load:', e);
  }
}

function setupAutocomplete(placesLib) {
  const addressInput = document.getElementById('address');
  const wrapper = addressInput.parentElement;
  wrapper.style.position = 'relative';

  const dropdown = document.createElement('div');
  dropdown.className = 'address-dropdown';
  dropdown.style.display = 'none';
  wrapper.appendChild(dropdown);

  const AutocompleteSuggestion = placesLib.AutocompleteSuggestion;
  const AutocompleteSessionToken = placesLib.AutocompleteSessionToken;

  if (!AutocompleteSuggestion) {
    console.warn('Google Maps: AutocompleteSuggestion not available, trying classic Autocomplete');
    setupClassicAutocomplete(addressInput, dropdown);
    return;
  }

  let debounceTimer = null;
  let sessionToken = new AutocompleteSessionToken();
  let activeIndex = -1;

  console.log('Google Maps: autocomplete ready (new API)');

  function updateActiveItem() {
    const items = dropdown.querySelectorAll('.address-dropdown-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === activeIndex);
    });
    if (activeIndex >= 0 && items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectItem(item) {
    if (!item || !item._prediction) return;
    const pred = item._prediction;
    addressInput.value = pred.text.text;
    dropdown.style.display = 'none';
    activeIndex = -1;
    updateDealRefPlaceholder();

    (async () => {
      try {
        const place = pred.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        if (place.location) {
          selectedLocation = {
            lat: place.location.lat(),
            lng: place.location.lng(),
            address: place.formattedAddress || pred.text.text,
          };
          showMap(selectedLocation.lat, selectedLocation.lng, selectedLocation.address);
        }
        sessionToken = new AutocompleteSessionToken();
      } catch (err) {
        console.error('Google Maps: place details error:', err);
      }
    })();
  }

  addressInput.addEventListener('input', () => {
    const query = addressInput.value.trim();
    if (query.length < 3) {
      dropdown.style.display = 'none';
      activeIndex = -1;
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const request = {
          input: query,
          sessionToken,
          region: 'gb',
          language: 'en-GB',
        };

        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (!suggestions || suggestions.length === 0) {
          console.warn('Google Maps: no suggestions returned');
          dropdown.style.display = 'none';
          return;
        }
        renderDropdown(suggestions);
      } catch (e) {
        console.error('Google Maps autocomplete error:', e);
        dropdown.style.display = 'none';
      }
    }, 300);
  });

  addressInput.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.address-dropdown-item');
    if (!items.length || dropdown.style.display === 'none') return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
      updateActiveItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
      updateActiveItem();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        selectItem(items[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      activeIndex = -1;
    }
  });

  function renderDropdown(suggestions) {
    dropdown.innerHTML = '';
    activeIndex = -1;
    suggestions.forEach((suggestion) => {
      const pred = suggestion.placePrediction;
      if (!pred) return;

      const item = document.createElement('div');
      item.className = 'address-dropdown-item';
      item.textContent = pred.text.text;
      item._prediction = pred;
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(item);
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = '';
  }

  addressInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; activeIndex = -1; }, 200);
  });

  addressInput.addEventListener('focus', () => {
    if (dropdown.children.length > 0) dropdown.style.display = '';
  });
}

function setupClassicAutocomplete(addressInput, dropdown) {
  console.log('Google Maps: using classic Autocomplete widget');
  const autocomplete = new google.maps.places.Autocomplete(addressInput, {
    componentRestrictions: { country: 'gb' },
    fields: ['formatted_address', 'geometry', 'name'],
  });

  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.geometry && place.geometry.location) {
      selectedLocation = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name,
      };
      showMap(selectedLocation.lat, selectedLocation.lng, selectedLocation.address);
    }
    updateDealRefPlaceholder();
  });
}

function showMap(lat, lng, title) {
  mapSection.style.display = '';
  const pos = { lat, lng };

  if (!map) {
    map = new google.maps.Map(mapContainer, {
      center: pos,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
    });
  } else {
    map.setCenter(pos);
    map.setZoom(15);
  }

  if (marker) marker.setMap(null);
  marker = new google.maps.Marker({
    position: pos,
    map,
    title: title || 'Property Location',
    animation: google.maps.Animation.DROP,
  });

  const dirBtn = document.getElementById('getDirectionsBtn');
  if (dirBtn) {
    const dest = title ? encodeURIComponent(title) : `${lat},${lng}`;
    dirBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    dirBtn.style.display = '';
  }
}

initGoogleMaps();

initCurrencyFormatting();

(function initLandingToggle() {
  const btn = document.getElementById('landingToggleBtn');
  const content = document.getElementById('landingContent');
  if (!btn || !content) return;
  btn.addEventListener('click', () => {
    const expanded = content.classList.toggle('expanded');
    btn.textContent = expanded ? 'Hide calculator help' : 'Show calculator help';
    btn.setAttribute('aria-expanded', expanded);
  });
})();

(function initDealToggle() {
  const btn = document.getElementById('dealToggleBtn');
  const content = document.getElementById('dealContent');
  if (!btn || !content) return;
  btn.addEventListener('click', () => {
    const expanded = content.classList.toggle('expanded');
    btn.textContent = expanded ? 'Hide analyser help' : 'Show analyser help';
    btn.setAttribute('aria-expanded', expanded);
  });
})();

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function fmt(n) {
  if (n == null || isNaN(n)) return '\u00a30';
  if (n === Math.floor(n)) {
    return '\u00a3' + n.toLocaleString('en-GB');
  }
  return '\u00a3' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(v) {
  if (v == null) return '\u2014';
  var n = (typeof v === 'string') ? parseFloat(String(v).replace(/[\u00a3,]/g, '')) : v;
  if (isNaN(n) || !isFinite(n)) return '\u2014';
  n = Math.round(n);
  if (n < 1000) return '\u00a3' + n;
  if (n < 1000000) return '\u00a3' + Math.round(n / 1000) + 'k';
  return '\u00a3' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0.00%';
  return n.toFixed(2) + '%';
}

function getDealDisplayName(entry) {
  if (entry.dealReference && entry.address) return escHtml(entry.address) + ' <span class="history-card-ref">\u2014 ' + escHtml(entry.dealReference) + '</span>';
  if (entry.dealReference) return escHtml(entry.dealReference);
  if (entry.address) return escHtml(entry.address);
  var priceLabel = fmtShort(entry.price);
  if (priceLabel !== '\u2014') return priceLabel + ' Deal';
  return 'Untitled Deal';
}

function yieldClass(yieldVal, targetYield) {
  const diff = yieldVal - targetYield;
  if (Math.abs(diff) <= 0.2) return 'yield-near';
  if (diff >= 0) return 'yield-good';
  return 'yield-below';
}

function getDealRating(netYield) {
  const y = parseFloat(netYield);
  if (y >= 8) return { grade: 'A', label: 'Excellent', color: '#0a7a2e' };
  if (y >= 7) return { grade: 'B', label: 'Strong', color: '#1a9a4a' };
  if (y >= 6) return { grade: 'C', label: 'Fair', color: '#b8860b' };
  if (y >= 5) return { grade: 'D', label: 'Weak', color: '#cc5500' };
  return { grade: 'F', label: 'Very Weak', color: '#B11217' };
}

function calculateMortgage(price, data) {
  const depositAmount = getDepositAmount();
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 4.5;
  const mortgageTerm = parseFloat(document.getElementById('mortgageTerm').value) || 25;
  const isSimple = currentMode === 'simple';
  const baseRunningCosts = getRunningCostItemsTotal();
  const lettingAgentFee = getLettingAgentFeeMonthly();
  const maintenanceMonthly = isSimple ? 0 : (getMaintenanceAnnual() / 12);
  const runningCosts = baseRunningCosts + lettingAgentFee + maintenanceMonthly;
  const solicitorFees = isSimple ? 0 : getCurrencyFieldValue('solicitorFees');
  const refurbCosts = isSimple ? getSimpleCostItemsTotal() : getCostItemsTotal();

  const mortgageAmount = Math.max(price - depositAmount, 0);
  const depositPct = price > 0 ? (depositAmount / price) * 100 : 0;
  const totalMonths = mortgageTerm * 12;
  const monthlyPayment = calcMortgagePayment(mortgageAmount, interestRate, mortgageTerm, mortgageType);

  const effectiveMonthlyRent = (data.effectiveAnnualRent || data.annualRent) / 12;
  const monthlyCashFlow = effectiveMonthlyRent - monthlyPayment - runningCosts;
  const annualCashFlow = monthlyCashFlow * 12;
  const totalCashInvested = depositAmount + data.sdlt + solicitorFees + refurbCosts;
  const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  const stressRate = parseFloat(document.getElementById('stressTestRate').value) || 7.0;
  const stressMonthlyPayment = calcMortgagePayment(mortgageAmount, stressRate, mortgageTerm, mortgageType);
  const stressMonthlyCashFlow = effectiveMonthlyRent - stressMonthlyPayment - runningCosts;

  return {
    depositPct,
    depositAmount,
    mortgageAmount,
    interestRate,
    mortgageTerm,
    mortgageType,
    monthlyPayment,
    monthlyCashFlow,
    annualCashFlow,
    totalCashInvested,
    cashOnCashReturn,
    cashFlowPositive: monthlyCashFlow >= 0,
    stressRate,
    stressMonthlyPayment,
    stressMonthlyCashFlow,
    stressCashFlowPositive: stressMonthlyCashFlow >= 0,
  };
}

function getCostItemsTotal() {
  return costItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

function getLettingAgentPct() {
  return parseFloat(document.getElementById('lettingAgentFee').value) || 0;
}

function getLettingAgentFeeMonthly() {
  const pct = getLettingAgentPct();
  const monthlyRent = getCurrencyFieldValue('monthlyRent');
  const fee = monthlyRent * (pct / 100);
  const includeVat = document.getElementById('lettingAgentVat').checked;
  return includeVat ? fee * 1.2 : fee;
}

function getMaintenanceAnnual() {
  if (maintenanceMode === 'pct') {
    const pct = parseFloat(document.getElementById('maintenancePct').value) || 0;
    const monthlyRent = getCurrencyFieldValue('monthlyRent');
    const annualRent = monthlyRent * 12;
    const voidPct = parseFloat(document.getElementById('voidAllowance').value) || 0;
    const effectiveAnnualRent = annualRent * (1 - voidPct / 100);
    return effectiveAnnualRent * (pct / 100);
  } else {
    return getCurrencyFieldValue('maintenanceFixed');
  }
}

function renderCostItems() {
  costItemsList.innerHTML = '';
  costItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cost-item-row';
    const placeholders = ['e.g. Electrics', 'e.g. Decorating', 'e.g. Carpets / Flooring', 'e.g. Plumbing', 'e.g. Bathroom', 'e.g. Kitchen', 'e.g. Grounds Maintenance', 'e.g. Roofing', 'e.g. Windows & Doors', 'e.g. Damp / Timber Treatment'];
    const placeholder = placeholders[index] || 'e.g. Cost description';
    row.innerHTML = `
      <input type="text" class="cost-item-label" value="${item.label}" placeholder="${placeholder}" data-index="${index}">
      <input type="text" class="cost-item-amount" inputmode="numeric" value="${item.amount ? formatCurrencyDisplay(item.amount) : ''}" data-raw-value="${item.amount || ''}" placeholder="\u00a30" data-index="${index}">
      <button type="button" class="btn-remove-item" data-index="${index}" title="Remove">&times;</button>
    `;
    costItemsList.appendChild(row);
  });

  costItemsList.querySelectorAll('.cost-item-label').forEach(input => {
    input.addEventListener('input', (e) => {
      costItems[parseInt(e.target.dataset.index)].label = e.target.value;
    });
    attachCostLabelAutocomplete(input);
  });

  costItemsList.querySelectorAll('.cost-item-amount').forEach(input => {
    applyCurrencyToCostAmount(input);
  });

  costItemsList.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      costItems.splice(parseInt(e.target.dataset.index), 1);
      renderCostItems();
    });
  });

  updateCostTotal();
}

function updateCostTotal() {
  costItemsTotalEl.textContent = fmt(getCostItemsTotal());
}

addCostItemBtn.addEventListener('click', () => {
  costItems.push({ label: '', amount: 0 });
  renderCostItems();
  const labels = costItemsList.querySelectorAll('.cost-item-label');
  if (labels.length > 0) labels[labels.length - 1].focus();
});

renderCostItems();

const simpleCostItemsList = document.getElementById('simpleCostItemsList');
const simpleCostItemsTotalEl = document.getElementById('simpleCostItemsTotal');

function getSimpleCostItemsTotal() {
  return simpleCostItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

function renderSimpleCostItems() {
  simpleCostItemsList.innerHTML = '';
  const placeholders = ['e.g. Electrics', 'e.g. Decorating', 'e.g. Carpets / Flooring', 'e.g. Plumbing', 'e.g. Bathroom', 'e.g. Kitchen', 'e.g. Grounds Maintenance', 'e.g. Roofing', 'e.g. Windows & Doors', 'e.g. Damp / Timber Treatment'];
  simpleCostItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cost-item-row';
    const placeholder = placeholders[index] || 'e.g. Cost description';
    row.innerHTML = `
      <input type="text" class="cost-item-label" value="${item.label}" placeholder="${placeholder}" data-index="${index}">
      <input type="text" class="cost-item-amount" inputmode="numeric" value="${item.amount ? formatCurrencyDisplay(item.amount) : ''}" data-raw-value="${item.amount || ''}" placeholder="\u00a30" data-index="${index}">
    `;
    simpleCostItemsList.appendChild(row);
  });

  simpleCostItemsList.querySelectorAll('.cost-item-label').forEach(input => {
    input.addEventListener('input', (e) => {
      simpleCostItems[parseInt(e.target.dataset.index)].label = e.target.value;
    });
    attachCostLabelAutocomplete(input);
  });

  simpleCostItemsList.querySelectorAll('.cost-item-amount').forEach(input => {
    input.addEventListener('focus', function() {
      const raw = this.dataset.rawValue || this.getAttribute('data-raw-value') || '';
      this.value = raw && raw !== '0' ? raw : '';
    });
    input.addEventListener('blur', function() {
      const raw = parseCurrencyValue(this.value);
      const idx = parseInt(this.dataset.index);
      simpleCostItems[idx].amount = raw;
      this.dataset.rawValue = raw || '';
      this.setAttribute('data-raw-value', raw || '');
      this.value = raw ? formatCurrencyDisplay(raw) : '';
      simpleCostItemsTotalEl.textContent = fmt(getSimpleCostItemsTotal());
    });
    input.addEventListener('input', function() {
      const raw = parseCurrencyValue(this.value);
      const idx = parseInt(this.dataset.index);
      simpleCostItems[idx].amount = raw;
    });
  });

  simpleCostItemsTotalEl.textContent = fmt(getSimpleCostItemsTotal());
}

renderSimpleCostItems();
setupDealRefAutocomplete();

const runningCostItemsList = document.getElementById('runningCostItemsList');
const runningCostItemsTotalEl = document.getElementById('runningCostItemsTotal');
const addRunningCostItemBtn = document.getElementById('addRunningCostItem');
const simpleRunningCostItemsList = document.getElementById('simpleRunningCostItemsList');
const simpleRunningCostItemsTotalEl = document.getElementById('simpleRunningCostItemsTotal');
const addSimpleRunningCostItemBtn = document.getElementById('addSimpleRunningCostItem');

function getRunningCostItemsTotal() {
  return runningCostItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

function renderRunningCostItems() {
  runningCostItemsList.innerHTML = '';
  runningCostItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cost-item-row';
    const placeholders = ['e.g. Landlord Insurance', 'e.g. Service Charge', 'e.g. Ground Rent', 'e.g. Boiler Cover', 'e.g. Buildings Insurance', 'e.g. Maintenance Allowance', 'e.g. Letting Agent Fee', 'e.g. Rent Guarantee Insurance', 'e.g. Communal Cleaning', 'e.g. Property Management'];
    const placeholder = placeholders[index] || 'e.g. Monthly cost';
    row.innerHTML = `
      <input type="text" class="cost-item-label" value="${escHtml(item.label)}" placeholder="${placeholder}" data-index="${index}">
      <input type="text" class="cost-item-amount" inputmode="numeric" value="${item.amount ? formatCurrencyDisplay(item.amount) : ''}" data-raw-value="${item.amount || ''}" placeholder="\u00a30" data-index="${index}">
      <button type="button" class="btn-remove-item" data-index="${index}" title="Remove">&times;</button>
    `;
    runningCostItemsList.appendChild(row);
  });

  runningCostItemsList.querySelectorAll('.cost-item-label').forEach(input => {
    input.addEventListener('input', (e) => {
      runningCostItems[parseInt(e.target.dataset.index)].label = e.target.value;
    });
    attachCostLabelAutocomplete(input, RECURRING_MONTHLY_COST_SUGGESTIONS, 6);
  });

  runningCostItemsList.querySelectorAll('.cost-item-amount').forEach(input => {
    applyCurrencyToRunningCostAmount(input);
  });

  runningCostItemsList.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      runningCostItems.splice(parseInt(e.target.dataset.index), 1);
      renderRunningCostItems();
    });
  });

  updateRunningCostTotal();
  renderSimpleRunningCostItems();
}

function updateRunningCostTotal() {
  runningCostItemsTotalEl.textContent = fmt(getRunningCostItemsTotal()) + '/mo';
  updateSimpleRunningCostTotal();
}

addRunningCostItemBtn.addEventListener('click', () => {
  runningCostItems.push({ label: '', amount: 0 });
  renderRunningCostItems();
  renderSimpleRunningCostItems();
  const labels = runningCostItemsList.querySelectorAll('.cost-item-label');
  if (labels.length > 0) labels[labels.length - 1].focus();
});

renderRunningCostItems();

function renderSimpleRunningCostItems() {
  if (!simpleRunningCostItemsList) return;
  simpleRunningCostItemsList.innerHTML = '';
  runningCostItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cost-item-row';
    const placeholders = ['e.g. Landlord Insurance', 'e.g. Service Charge', 'e.g. Ground Rent', 'e.g. Boiler Cover', 'e.g. Buildings Insurance', 'e.g. Maintenance Allowance', 'e.g. Letting Agent Fee', 'e.g. Rent Guarantee Insurance', 'e.g. Communal Cleaning', 'e.g. Property Management'];
    const placeholder = placeholders[index] || 'e.g. Monthly cost';
    row.innerHTML = `
      <input type="text" class="cost-item-label" value="${escHtml(item.label)}" placeholder="${placeholder}" data-index="${index}">
      <input type="text" class="cost-item-amount" inputmode="numeric" value="${item.amount ? formatCurrencyDisplay(item.amount) : ''}" data-raw-value="${item.amount || ''}" placeholder="\u00a30" data-index="${index}">
      <button type="button" class="btn-remove-item" data-index="${index}" title="Remove">&times;</button>
    `;
    simpleRunningCostItemsList.appendChild(row);
  });

  simpleRunningCostItemsList.querySelectorAll('.cost-item-label').forEach(input => {
    input.addEventListener('input', (e) => {
      runningCostItems[parseInt(e.target.dataset.index)].label = e.target.value;
    });
    attachCostLabelAutocomplete(input, RECURRING_MONTHLY_COST_SUGGESTIONS, 6);
  });

  simpleRunningCostItemsList.querySelectorAll('.cost-item-amount').forEach(input => {
    applyCurrencyToRunningCostAmount(input);
  });

  simpleRunningCostItemsList.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      runningCostItems.splice(parseInt(e.target.dataset.index), 1);
      renderSimpleRunningCostItems();
      renderRunningCostItems();
    });
  });

  updateSimpleRunningCostTotal();
}

function updateSimpleRunningCostTotal() {
  if (simpleRunningCostItemsTotalEl) {
    simpleRunningCostItemsTotalEl.textContent = fmt(getRunningCostItemsTotal()) + '/mo';
  }
}

renderSimpleRunningCostItems();

if (addSimpleRunningCostItemBtn) {
  addSimpleRunningCostItemBtn.addEventListener('click', () => {
    runningCostItems.push({ label: '', amount: 0 });
    renderSimpleRunningCostItems();
    renderRunningCostItems();
    const labels = simpleRunningCostItemsList.querySelectorAll('.cost-item-label');
    if (labels.length > 0) labels[labels.length - 1].focus();
  });
}

function renderSDLTTable(breakdown) {
  if (!breakdown || !breakdown.bands || breakdown.bands.length === 0) {
    return '<p style="font-size:0.85rem;color:#777;">No SDLT due</p>';
  }
  let html = '<table class="sdlt-band-table"><thead><tr><th>Band</th><th class="rate-col">Rate</th><th class="amount-col">Tax</th></tr></thead><tbody>';
  for (const b of breakdown.bands) {
    html += `<tr>
      <td>${fmt(b.from)} \u2013 ${fmt(b.to)}</td>
      <td class="rate-col">${(b.rate * 100).toFixed(0)}%</td>
      <td class="amount-col">${fmt(b.tax)}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function renderCostBreakdownRows(data) {
  const isSimple = currentMode === 'simple';
  let html = '';
  html += `<div class="result-row"><span class="label">Purchase Price</span><span class="value">${fmt(data.breakdown.price)}</span></div>`;
  html += `<div class="result-row"><span class="label">SDLT</span><span class="value">${fmt(data.breakdown.sdlt)}</span></div>`;

  if (isSimple) {
    const activeSimple = simpleCostItems.filter(i => (parseFloat(i.amount) || 0) > 0);
    for (const item of activeSimple) {
      html += `<div class="result-row"><span class="label">${escHtml(item.label || 'Additional cost')}</span><span class="value">${fmt(item.amount)}</span></div>`;
    }
  } else {
    html += `<div class="result-row"><span class="label">Solicitor Fees</span><span class="value">${fmt(data.breakdown.solicitorFees)}</span></div>`;
    if (data.breakdown.costItems && data.breakdown.costItems.length > 0) {
      for (const item of data.breakdown.costItems) {
        if (item.amount > 0) {
          html += `<div class="result-row"><span class="label">${escHtml(item.label || 'Cost item')}</span><span class="value">${fmt(item.amount)}</span></div>`;
        }
      }
    }
  }

  html += `<div class="result-row total"><span class="label">Total Acquisition Cost</span><span class="value">${fmt(data.totalCost)}</span></div>`;
  return html;
}

function renderRunningCostsBreakdown() {
  const runningItems = runningCostItems.filter(i => (parseFloat(i.amount) || 0) > 0);
  const baseRunning = getRunningCostItemsTotal();
  const agentPct = getLettingAgentPct();
  const vatChecked = document.getElementById('lettingAgentVat').checked;
  const agentFeeTotal = getLettingAgentFeeMonthly();
  const maintenanceAnnual = getMaintenanceAnnual();
  const maintenanceMonthly = maintenanceAnnual / 12;
  const buyerType = getSelectedBuyerType();
  let mortgageMonthly = 0;
  if (lastMortgageData) {
    const mortgageInfo = lastMortgageData[buyerType];
    if (mortgageInfo && mortgageInfo.monthlyPayment > 0) {
      mortgageMonthly = mortgageInfo.monthlyPayment;
    }
  }
  const totalMonthly = baseRunning + agentFeeTotal + maintenanceMonthly + mortgageMonthly;

  const monthlyRent = getCurrencyFieldValue('monthlyRent');

  let html = '';
  if (baseRunning > 0 || agentPct > 0 || maintenanceAnnual > 0 || mortgageMonthly > 0) {
    html += '<div class="result-section"><h3>Recurring Monthly Costs</h3>';
    html += `<div class="result-row"><span class="label">Monthly Rent</span><span class="value">${fmt(monthlyRent)}/mo</span></div>`;
    if (runningItems.length > 0) {
      runningItems.forEach(item => {
        html += `<div class="result-row"><span class="label">${escHtml(item.label || 'Running cost')}</span><span class="value">${fmt(item.amount)}/mo</span></div>`;
      });
    }
    if (agentPct > 0) {
      let agentLabel = `Letting Agent (${agentPct}%)`;
      if (vatChecked) agentLabel += ' inc. VAT';
      html += `<div class="result-row"><span class="label">${agentLabel}</span><span class="value">${fmt(agentFeeTotal)}/mo</span></div>`;
    }
    if (maintenanceAnnual > 0) {
      let maintLabel = maintenanceMode === 'pct'
        ? `Maintenance (${parseFloat(document.getElementById('maintenancePct').value) || 0}% of rent)`
        : 'Maintenance (fixed)';
      html += `<div class="result-row"><span class="label">${maintLabel}</span><span class="value">${fmt(maintenanceMonthly)}/mo</span></div>`;
    }
    if (mortgageMonthly > 0) {
      const mtType = lastMortgageData && lastMortgageData[buyerType] && lastMortgageData[buyerType].mortgageType;
      const mtLabel = mtType === 'interest-only' ? 'Interest Only' : 'Repayment';
      html += `<div class="result-row"><span class="label">Mortgage Payment <span class="mortgage-type-label">(${mtLabel})</span></span><span class="value">${fmt(mortgageMonthly)}/mo</span></div>`;
    }
    html += `<div class="result-row total"><span class="label">Total Monthly Costs</span><span class="value">${fmt(totalMonthly)}/mo</span></div>`;
    html += `<div class="result-row"><span class="label">Annual Running Costs</span><span class="value">${fmt(totalMonthly * 12)}/yr</span></div>`;
    html += '</div>';
  }
  return html;
}

function renderDealRating(netYield, targetYield) {
  const rating = getDealRating(netYield);
  return `
    <div class="deal-rating">
      <div class="deal-rating-circle" style="background:${rating.color};">${rating.grade}</div>
      <div class="deal-rating-info">
        <div class="deal-rating-label" style="color:${rating.color};">${rating.label}</div>
        <div class="deal-rating-detail">Net yield ${fmtPct(netYield)} vs ${fmtPct(targetYield)} target</div>
      </div>
    </div>
  `;
}

function renderMortgageSection(mortgage) {
  const cfClass = mortgage.cashFlowPositive ? 'cash-flow-positive' : 'cash-flow-negative';
  const cfLabel = mortgage.cashFlowPositive ? 'Cash Flow Positive' : 'Cash Flow Negative';
  const stressCfClass = mortgage.stressCashFlowPositive ? 'cash-flow-positive' : 'cash-flow-negative';
  const stressCfLabel = mortgage.stressCashFlowPositive ? 'Cash Flow Positive at Stress Rate' : 'Cash Flow Negative at Stress Rate';
  return `
    <div class="result-section">
      <h3>Mortgage Analysis</h3>
      <div class="result-row"><span class="label">Deposit (${fmtPct(mortgage.depositPct)})</span><span class="value">${fmt(mortgage.depositAmount)}</span></div>
      <div class="result-row"><span class="label">Mortgage Amount</span><span class="value">${fmt(mortgage.mortgageAmount)}</span></div>
      <div class="result-row"><span class="label">Monthly Mortgage Payment <span class="mortgage-type-label">(${mortgage.mortgageType === 'interest-only' ? 'Interest Only' : 'Repayment'} @ ${mortgage.interestRate}%, ${mortgage.mortgageTerm}yr)</span></span><span class="value">${fmt(mortgage.monthlyPayment)}/mo</span></div>
      <div class="result-row"><span class="label">Monthly Cash Flow <span class="tooltip" data-tip="Monthly rent minus monthly costs (and mortgage if used).">?</span></span><span class="value ${cfClass}">${fmt(mortgage.monthlyCashFlow)}</span></div>
      <div class="result-row"><span class="label">Cash-on-Cash Return</span><span class="value">${fmtPct(mortgage.cashOnCashReturn)}</span></div>
      <div class="result-row"><span class="label">Cash Invested <span class="tooltip" data-tip="Deposit + buying costs + any refurb/extra costs.">?</span></span><span class="value">${fmt(mortgage.totalCashInvested)}</span></div>
      <div class="stress-test-section">
        <h4>Stress Test (${mortgage.stressRate}%)</h4>
        <div class="result-row"><span class="label">Monthly Payment at ${mortgage.stressRate}%</span><span class="value">${fmt(mortgage.stressMonthlyPayment)}</span></div>
        <div class="result-row"><span class="label">Monthly Cash Flow at ${mortgage.stressRate}%</span><span class="value ${stressCfClass}">${fmt(mortgage.stressMonthlyCashFlow)}</span></div>
        <div class="cash-flow-indicator ${stressCfClass}">${stressCfLabel}</div>
      </div>
    </div>
  `;
}

function renderYieldGauge(netYield, targetYield) {
  const maxYield = 15;
  const clampedYield = Math.min(Math.max(netYield, 0), maxYield);
  const fillPct = clampedYield / maxYield;
  const targetPct = Math.min(Math.max(targetYield, 0), maxYield) / maxYield;

  const cx = 100, cy = 100, r = 80;
  const startAngle = Math.PI;
  const bgEndAngle = 0;
  const fillEndAngle = Math.PI - (fillPct * Math.PI);
  const targetAngle = Math.PI - (targetPct * Math.PI);

  function arcPoint(angle) {
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  }

  const bgStart = arcPoint(startAngle);
  const bgEnd = arcPoint(bgEndAngle);
  const bgPath = `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`;

  const fillEnd = arcPoint(fillEndAngle);
  const fillPath = fillPct > 0 ? `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 0 1 ${fillEnd.x} ${fillEnd.y}` : '';

  let fillColor = '#B11217';
  const diff = netYield - targetYield;
  if (diff >= 0) fillColor = '#1a9a4a';
  else if (diff >= -1) fillColor = '#b8860b';

  const tickInner = arcPoint(targetAngle);
  const tickOuter = { x: cx + (r + 12) * Math.cos(targetAngle), y: cy - (r + 12) * Math.sin(targetAngle) };

  return `
    <div class="yield-gauge">
      <svg width="200" height="110" viewBox="0 0 200 110">
        <path d="${bgPath}" fill="none" stroke="#e8e8e8" stroke-width="14" stroke-linecap="round"/>
        ${fillPath ? `<path d="${fillPath}" fill="none" stroke="${fillColor}" stroke-width="14" stroke-linecap="round"/>` : ''}
        <line x1="${tickInner.x}" y1="${tickInner.y}" x2="${tickOuter.x}" y2="${tickOuter.y}" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/>
        <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="28" font-weight="800" fill="${fillColor}">${fmtPct(netYield)}</text>
        <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="11" fill="#777">Net Yield (Asset)</text>
      </svg>
    </div>
  `;
}

function renderSDLTComparison(investorSDLT, ftbSDLT, mainSDLT) {
  const maxSDLT = Math.max(investorSDLT, ftbSDLT, mainSDLT || 0, 1);
  const investorPct = (investorSDLT / maxSDLT) * 100;
  const mainPct = ((mainSDLT || 0) / maxSDLT) * 100;
  const ftbPct = (ftbSDLT / maxSDLT) * 100;
  return `
    <div class="sdlt-comparison-chart">
      <h3>SDLT Comparison</h3>
      <div class="sdlt-bar-row">
        <span class="sdlt-bar-label">Investor</span>
        <div class="sdlt-bar-track">
          <div class="sdlt-bar-fill sdlt-bar-investor" style="width:${Math.max(investorPct, 2)}%"></div>
        </div>
        <span class="sdlt-bar-amount">${fmt(investorSDLT)}</span>
      </div>
      <div class="sdlt-bar-row">
        <span class="sdlt-bar-label">Main Res.</span>
        <div class="sdlt-bar-track">
          <div class="sdlt-bar-fill sdlt-bar-main" style="width:${Math.max(mainPct, 2)}%"></div>
        </div>
        <span class="sdlt-bar-amount">${fmt(mainSDLT || 0)}</span>
      </div>
      <div class="sdlt-bar-row">
        <span class="sdlt-bar-label">FTB</span>
        <div class="sdlt-bar-track">
          <div class="sdlt-bar-fill sdlt-bar-ftb" style="width:${Math.max(ftbPct, 2)}%"></div>
        </div>
        <span class="sdlt-bar-amount">${fmt(ftbSDLT)}</span>
      </div>
    </div>
  `;
}


function renderRefinanceScenario(price, mortgage) {
  if (!mortgage) return '';

  const defaultYears = 2;
  const defaultGrowth = 3;
  const defaultLtv = 75;

  return `
    <div class="result-section refinance-section">
      <h3 class="refinance-header" onclick="toggleRefinanceSection()">
        Refinance Scenario
        <span class="tooltip" data-tip="Simple refinance model for BRR-style investing. For guidance only.">?</span>
        <span class="refinance-arrow" id="refinanceArrow">&#9660;</span>
      </h3>
      <div id="refinanceContent" style="display:none;">
        <div class="refinance-inputs">
          <div class="form-row">
            <div class="form-group half">
              <label>Years until Refinance</label>
              <input type="number" id="refiYears" min="1" max="30" step="1" value="${defaultYears}" onchange="recalcRefinance()" oninput="recalcRefinance()">
            </div>
            <div class="form-group half">
              <label>Annual Growth (%)</label>
              <input type="number" id="refiGrowth" min="-20" max="30" step="any" value="${defaultGrowth}" onchange="recalcRefinance()" oninput="recalcRefinance()">
            </div>
          </div>
          <div class="form-group">
            <label>Refinance LTV (%)</label>
            <input type="number" id="refiLtv" min="1" max="100" step="any" value="${defaultLtv}" onchange="recalcRefinance()" oninput="recalcRefinance()">
          </div>
        </div>
        <div id="refinanceResults"></div>
      </div>
    </div>
  `;
}

const isLimitedCompany = false;

function renderSection24(mortgage, data) {
  if (!mortgage) return '';
  if (isLimitedCompany) {
    return `
    <div class="result-section collapsible-section">
      <h3 class="collapsible-header">Section 24 Tax Estimate</h3>
      <p class="section-note">Section 24 applies to individual landlords, not limited companies.</p>
    </div>`;
  }
  return `
    <div class="result-section collapsible-section">
      <h3 class="collapsible-header" onclick="toggleSection24()">
        Section 24 Tax Estimate
        <span class="tooltip" data-tip="Simplified estimate. Does not replace professional tax advice.">?</span>
        <span class="collapsible-arrow" id="s24Arrow">&#9660;</span>
      </h3>
      <p class="section-note">Estimate only — not tax advice.</p>
      <div id="section24Content" style="display:none;">
        <div class="s24-inputs">
          <div class="form-group">
            <label>Tax Band</label>
            <select id="s24TaxBand" onchange="recalcSection24()">
              <option value="20">Basic Rate (20%)</option>
              <option value="40" selected>Higher Rate (40%)</option>
              <option value="45">Additional Rate (45%)</option>
            </select>
          </div>
        </div>
        <div id="section24Results"></div>
      </div>
    </div>
  `;
}

function renderCapitalGrowth(price, mortgage) {
  return `
    <div class="result-section collapsible-section">
      <h3 class="collapsible-header" onclick="toggleCapitalGrowth()">
        Capital Growth Projection
        <span class="tooltip" data-tip="Illustrative projection, not a prediction.">?</span>
        <span class="collapsible-arrow" id="cgArrow">&#9660;</span>
      </h3>
      <div id="capitalGrowthContent" style="display:none;">
        <div class="cg-inputs">
          <div class="form-group">
            <label>Annual Price Growth (%)</label>
            <input type="number" id="cgGrowth" min="-10" max="20" step="any" value="3" onchange="recalcCapitalGrowth()" oninput="recalcCapitalGrowth()">
          </div>
        </div>
        <div id="capitalGrowthResults"></div>
      </div>
    </div>
  `;
}

window.toggleSection24 = function() {
  const content = document.getElementById('section24Content');
  const arrow = document.getElementById('s24Arrow');
  if (!content) return;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? '' : 'none';
  arrow.innerHTML = isHidden ? '&#9650;' : '&#9660;';
  if (isHidden) recalcSection24();
};

window.recalcSection24 = function() {
  const resultsDiv = document.getElementById('section24Results');
  if (!resultsDiv || !lastResult || !lastMortgageData) return;
  const buyerType = getSelectedBuyerType();
  const mortgage = lastMortgageData[buyerType];
  if (!mortgage) return;

  const taxRate = parseFloat(document.getElementById('s24TaxBand').value) / 100;
  const annualMortgageInterest = mortgage.mortgageAmount * (mortgage.interestRate / 100);
  const resultData = getResultForBuyerType(lastResult, buyerType);
  const effectiveRent = resultData.effectiveAnnualRent || resultData.annualRent;
  const taxableProfit = Math.max(effectiveRent - (getRunningCostItemsTotal() * 12) - (getLettingAgentFeeMonthly() * 12) - (getMaintenanceAnnual()), 0);
  const taxDue = taxableProfit * taxRate;
  const s24TaxCredit = annualMortgageInterest * 0.20;
  const netTaxDue = Math.max(taxDue - s24TaxCredit, 0);
  const afterTaxCashFlow = mortgage.annualCashFlow - netTaxDue;

  resultsDiv.innerHTML = `
    <div class="result-row"><span class="label">Rental Profit (pre-mortgage)</span><span class="value">${fmt(Math.round(taxableProfit))}</span></div>
    <div class="result-row"><span class="label">Tax at ${(taxRate * 100).toFixed(0)}%</span><span class="value">${fmt(Math.round(taxDue))}</span></div>
    <div class="result-row"><span class="label">Section 24 Tax Credit (20%)</span><span class="value cash-flow-positive">-${fmt(Math.round(s24TaxCredit))}</span></div>
    <div class="result-row total"><span class="label">Estimated Annual Tax Due</span><span class="value">${fmt(Math.round(netTaxDue))}</span></div>
    <div class="result-row"><span class="label">After-tax Annual Cash Flow</span><span class="value ${afterTaxCashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">${fmt(Math.round(afterTaxCashFlow))}</span></div>
    <div class="result-row"><span class="label">After-tax Monthly Cash Flow</span><span class="value ${afterTaxCashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">${fmt(Math.round(afterTaxCashFlow / 12))}</span></div>
  `;
};

window.toggleCapitalGrowth = function() {
  const content = document.getElementById('capitalGrowthContent');
  const arrow = document.getElementById('cgArrow');
  if (!content) return;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? '' : 'none';
  arrow.innerHTML = isHidden ? '&#9650;' : '&#9660;';
  if (isHidden) recalcCapitalGrowth();
};

window.recalcCapitalGrowth = function() {
  const resultsDiv = document.getElementById('capitalGrowthResults');
  if (!resultsDiv) return;
  const price = getCurrencyFieldValue('price');
  const growth = parseFloat(document.getElementById('cgGrowth').value) || 0;
  const buyerType = getSelectedBuyerType();
  const mortgage = lastMortgageData ? lastMortgageData[buyerType] : null;

  const val5 = price * Math.pow(1 + growth / 100, 5);
  const val10 = price * Math.pow(1 + growth / 100, 10);

  let eq5 = val5, eq10 = val10;
  let mortgageRows = '';
  if (mortgage && mortgage.mortgageAmount > 0) {
    const r = (mortgage.interestRate / 100) / 12;
    const n = mortgage.mortgageTerm * 12;
    const P = mortgage.mortgageAmount;

    function remainingBalance(months) {
      const m = Math.min(months, n);
      if (r === 0) return Math.max(P - (P / n) * m, 0);
      return Math.max(P * (Math.pow(1 + r, n) - Math.pow(1 + r, m)) / (Math.pow(1 + r, n) - 1), 0);
    }

    const bal5 = remainingBalance(60);
    const bal10 = remainingBalance(120);
    eq5 = val5 - bal5;
    eq10 = val10 - bal10;

    mortgageRows = `
      <div class="result-row"><span class="label">Mortgage Balance (5yr)</span><span class="value">${fmt(Math.round(bal5))}</span></div>
      <div class="result-row"><span class="label">Mortgage Balance (10yr)</span><span class="value">${fmt(Math.round(bal10))}</span></div>
    `;
  }

  resultsDiv.innerHTML = `
    <div class="cg-projection-grid">
      <div class="cg-projection-card">
        <div class="cg-projection-period">5 Years</div>
        <div class="cg-projection-value">${fmt(Math.round(val5))}</div>
        <div class="cg-projection-equity">Projected Equity: ${fmt(Math.round(eq5))}</div>
      </div>
      <div class="cg-projection-card">
        <div class="cg-projection-period">10 Years</div>
        <div class="cg-projection-value">${fmt(Math.round(val10))}</div>
        <div class="cg-projection-equity">Projected Equity: ${fmt(Math.round(eq10))}</div>
      </div>
    </div>
    ${mortgageRows}
  `;
};

window.toggleRefinanceSection = function() {
  const content = document.getElementById('refinanceContent');
  const arrow = document.getElementById('refinanceArrow');
  if (!content) return;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? '' : 'none';
  arrow.innerHTML = isHidden ? '&#9650;' : '&#9660;';
  if (isHidden) recalcRefinance();
};

window.recalcRefinance = function() {
  const resultsDiv = document.getElementById('refinanceResults');
  if (!resultsDiv || !lastResult || !lastMortgageData) return;

  const price = getCurrencyFieldValue('price');
  const buyerType = getSelectedBuyerType();
  const mortgage = lastMortgageData[buyerType];
  if (!mortgage) return;

  const years = parseFloat(document.getElementById('refiYears').value) || 2;
  const growth = parseFloat(document.getElementById('refiGrowth').value) || 0;
  const ltv = parseFloat(document.getElementById('refiLtv').value) || 75;

  const projectedValue = price * Math.pow(1 + growth / 100, years);
  const newMortgage = projectedValue * (ltv / 100);
  const equityReleased = newMortgage - mortgage.mortgageAmount;
  const updatedCashInvested = Math.max(mortgage.totalCashInvested - equityReleased, 0);
  const updatedCashOnCash = updatedCashInvested > 0 ? (mortgage.annualCashFlow / updatedCashInvested) * 100 : 0;

  resultsDiv.innerHTML = `
    <div class="result-row"><span class="label">Projected Value (${years}yr at ${growth}%)</span><span class="value">${fmt(Math.round(projectedValue))}</span></div>
    <div class="result-row"><span class="label">New Mortgage at ${ltv}% LTV</span><span class="value">${fmt(Math.round(newMortgage))}</span></div>
    <div class="result-row"><span class="label">Equity Released</span><span class="value ${equityReleased >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">${fmt(Math.round(equityReleased))}</span></div>
    <div class="result-row"><span class="label">Updated Cash Invested</span><span class="value">${fmt(Math.round(updatedCashInvested))}</span></div>
    <div class="result-row"><span class="label">Updated Cash-on-Cash Return</span><span class="value">${fmtPct(Math.round(updatedCashOnCash * 100) / 100)}</span></div>
    ${equityReleased > 0 ? `<div class="cash-flow-indicator cash-flow-positive">Capital Released</div>` : equityReleased < 0 ? `<div class="cash-flow-indicator cash-flow-negative">Additional Capital Required</div>` : ''}
  `;
};

function renderScenario(data, label, targetYield, mortgage) {
  const displayData = data;
  const offer = data.targetOffer;
  const isSimple = currentMode === 'simple';

  let offerHtml;
  if (offer && offer.achievable) {
    offerHtml = `
      <div class="offer-box">
        <div class="offer-label">Target Offer Price for ${fmtPct(targetYield)} Yield</div>
        <div class="offer-price">${fmt(offer.offerPrice)}</div>
        <div class="offer-note">To hit ${fmtPct(targetYield)} yield you'd need to pay around ${fmt(offer.offerPrice)}</div>
      </div>`;
  } else {
    offerHtml = `
      <div class="offer-box not-achievable">
        <div class="offer-label">Target Offer Price for ${fmtPct(targetYield)} Yield</div>
        <div class="offer-price">Not achievable with current inputs</div>
        <div class="offer-note">Try adjusting rent, costs, or target yield</div>
      </div>`;
  }

  let mortgageHtml = '';
  if (mortgage) {
    mortgageHtml = renderMortgageSection(mortgage);
  }

  const yieldNote = '';

  const voidPct = isSimple ? 0 : (parseFloat(document.getElementById('voidAllowance').value) || 0);

  return `
    ${isSimple ? '' : renderDealRating(displayData.netYield, targetYield)}

    <div class="result-section">
      <h3>SDLT — ${label}</h3>
      <p class="sdlt-rates-note">Rates based on current GOV.UK guidance (England &amp; Northern Ireland).</p>
      ${renderSDLTTable(data.sdltBreakdown)}
      <div class="result-row total">
        <span class="label">Total SDLT</span>
        <span class="value">${fmt(data.sdlt)}</span>
      </div>
    </div>

    <div class="result-section">
      <h3>Cost Breakdown</h3>
      ${renderCostBreakdownRows(data)}
    </div>

    <div class="result-section">
      <h3>Yield Analysis</h3>
      ${yieldNote}
      ${isSimple ? '' : renderYieldGauge(displayData.netYield, targetYield)}
      <div class="yield-cards">
        <div class="yield-card">
          <div class="yield-label">Gross Yield <span class="tooltip" data-tip="Annual rent ÷ purchase price.">?</span></div>
          <div class="yield-value ${isSimple ? '' : yieldClass(displayData.grossYield, targetYield)}">${fmtPct(displayData.grossYield)}</div>
        </div>
        <div class="yield-card">
          <div class="yield-label">Net Yield (Asset) <span class="tooltip" data-tip="Net Yield (Asset) = (Annual rent – operating costs) ÷ purchase price. Excludes mortgage.">?</span></div>
          <div class="yield-value ${isSimple ? '' : yieldClass(displayData.netYield, targetYield)}">${fmtPct(displayData.netYield)}</div>
        </div>
        ${mortgage ? `
        <div class="yield-card">
          <div class="yield-label">Cash-on-Cash Return <span class="tooltip" data-tip="Return on the actual cash you put in: annual cash flow ÷ cash invested.">?</span></div>
          <div class="yield-value">${fmtPct(mortgage.cashOnCashReturn)}</div>
        </div>
        <div class="yield-card">
          <div class="yield-label">Payback Period <span class="tooltip" data-tip="How long it may take to recover your cash invested from cash flow alone.">?</span></div>
          <div class="yield-value">${mortgage.annualCashFlow > 0 ? (mortgage.totalCashInvested / mortgage.annualCashFlow).toFixed(1) + ' yrs' : 'N/A'}</div>
        </div>
        ` : ''}
      </div>
      <div class="result-row"><span class="label">Annual Rent</span><span class="value">${fmt(data.annualRent)}</span></div>
      ${voidPct > 0 ? `<div class="result-row"><span class="label">Effective Annual Rent (after ${voidPct}% void)</span><span class="value">${fmt(data.effectiveAnnualRent || data.annualRent)}</span></div>` : ''}
      <div class="result-row"><span class="label">Net Annual Income (before finance)</span><span class="value">${fmt(data.netAnnualRent)}</span></div>
      ${mortgage ? `<div class="result-row"><span class="label">Annual Mortgage Cost</span><span class="value">${fmt(mortgage.monthlyPayment * 12)}</span></div>` : ''}
      ${mortgage ? `<div class="result-row"><span class="label">Annual Cashflow (after finance)</span><span class="value">${fmt(mortgage.annualCashFlow)}</span></div>` : ''}
      ${mortgage ? `<div class="result-row"><span class="label">Cash Invested</span><span class="value">${fmt(mortgage.totalCashInvested)}</span></div>` : ''}
      <div class="result-row"><span class="label">Total Acquisition Cost</span><span class="value">${fmt(data.totalCost)}</span></div>
    </div>

    ${isSimple && mortgage ? `
    <div class="result-section">
      <h3>Recurring Monthly Costs</h3>
      <div class="result-row"><span class="label">Monthly Rent</span><span class="value">${fmt(getCurrencyFieldValue('monthlyRent'))}/mo</span></div>
      ${runningCostItems.filter(i => (parseFloat(i.amount) || 0) > 0).map(item =>
        `<div class="result-row"><span class="label">${escHtml(item.label || 'Recurring cost')}</span><span class="value">${fmt(item.amount)}/mo</span></div>`
      ).join('')}
      <div class="result-row"><span class="label">Mortgage Payment <span class="mortgage-type-label">(${mortgage.mortgageType === 'interest-only' ? 'Interest Only' : 'Repayment'})</span></span><span class="value">${fmt(mortgage.monthlyPayment)}/mo</span></div>
      <div class="result-row total"><span class="label">Monthly Cash Flow</span><span class="value ${mortgage.monthlyCashFlow >= 0 ? 'cash-flow-positive' : 'cash-flow-negative'}">${fmt(mortgage.monthlyCashFlow)}/mo</span></div>
    </div>
    ` : ''}

    ${isSimple && !mortgage && getRunningCostItemsTotal() > 0 ? `
    <div class="result-section">
      <h3>Recurring Monthly Costs</h3>
      <div class="result-row"><span class="label">Monthly Rent</span><span class="value">${fmt(getCurrencyFieldValue('monthlyRent'))}/mo</span></div>
      ${runningCostItems.filter(i => (parseFloat(i.amount) || 0) > 0).map(item =>
        `<div class="result-row"><span class="label">${escHtml(item.label || 'Recurring cost')}</span><span class="value">${fmt(item.amount)}/mo</span></div>`
      ).join('')}
      <div class="result-row total"><span class="label">Total Recurring Costs</span><span class="value">${fmt(getRunningCostItemsTotal())}/mo</span></div>
    </div>
    ` : ''}

    ${isSimple ? '' : renderRunningCostsBreakdown()}

    ${mortgageHtml}

    ${!isSimple && mortgage ? renderRefinanceScenario(data.breakdown.price, mortgage) : ''}

    ${!isSimple && mortgage ? renderSection24(mortgage, data) : ''}
    ${isSimple ? '' : renderCapitalGrowth(data.breakdown.price, mortgage)}

    ${!isSimple ? `
    <div class="result-section">
      <h3>Target Offer Price <span class="tooltip" data-tip="Based on Net Yield (Asset), excluding mortgage.">?</span></h3>
      ${offerHtml}
    </div>` : ''}
  `;
}

let lastResult = null;
let lastMortgageData = null;

function renderResults(result) {
  lastResult = result;
  const addressRaw = document.getElementById('address').value || 'Property';
  const address = escHtml(addressRaw);
  const targetYield = result.targetYield;
  const price = getCurrencyFieldValue('price');
  const purchaseType = getSelectedPurchaseType();
  const includeMortgage = purchaseType === 'mortgage';
  const buyerType = getSelectedBuyerType();

  const data = getResultForBuyerType(result, buyerType);
  const label = getBuyerTypeLabel(buyerType);

  let mortgage = null;
  if (includeMortgage) {
    mortgage = calculateMortgage(price, data);
    lastMortgageData = { [buyerType]: mortgage };
  } else {
    lastMortgageData = null;
  }

  document.getElementById('savePdfBtn').style.display = '';

  const dealRef = escHtml(document.getElementById('dealReference').value || '');
  const html = `
    <div class="results-content">
      <div class="results-header-row">
        <div>
          <h2>Deal Analysis</h2>
          <p class="address-line">${address}</p>
          ${dealRef ? `<p class="deal-ref-line">${dealRef}</p>` : ''}
        </div>
        <div class="results-header-buttons">
          <button type="button" class="btn-share" onclick="shareDeal(this)">Share</button>
          <button type="button" class="btn-save-pdf-inline" onclick="printReport()">Save as PDF</button>
        </div>
      </div>

      ${renderScenario(data, label, targetYield, mortgage)}
    </div>
  `;

  setResultsPanelContent(html);
}

async function runCalculation() {
  const price = getCurrencyFieldValue('price');
  const monthlyRent = getCurrencyFieldValue('monthlyRent');

  if (!price || price <= 0) {
    alert('Please enter a valid asking price.');
    return;
  }
  if (!monthlyRent || monthlyRent <= 0) {
    alert('Please enter a valid monthly rent.');
    return;
  }

  const isSimple = currentMode === 'simple';

  let totalAdditionalCosts, lettingAgentFee, baseRunningCosts, maintenanceAnnual, maintenanceMonthly, totalRunningCosts;

  if (isSimple) {
    totalAdditionalCosts = getSimpleCostItemsTotal();
    lettingAgentFee = getLettingAgentFeeMonthly();
    baseRunningCosts = getRunningCostItemsTotal();
    maintenanceAnnual = 0;
    maintenanceMonthly = 0;
    totalRunningCosts = baseRunningCosts + lettingAgentFee;
  } else {
    totalAdditionalCosts = getCostItemsTotal();
    lettingAgentFee = getLettingAgentFeeMonthly();
    baseRunningCosts = getRunningCostItemsTotal() || 0;
    maintenanceAnnual = getMaintenanceAnnual();
    maintenanceMonthly = maintenanceAnnual / 12;
    totalRunningCosts = baseRunningCosts + lettingAgentFee + maintenanceMonthly;
  }

  const body = {
    price,
    monthlyRent,
    solicitorFees: isSimple ? 0 : (getCurrencyFieldValue('solicitorFees') || 1500),
    refurbCosts: totalAdditionalCosts,
    otherCosts: 0,
    costItems: isSimple
      ? simpleCostItems.filter(i => (parseFloat(i.amount) || 0) > 0).map(i => ({ label: i.label, amount: parseFloat(i.amount) || 0 }))
      : costItems.map(item => ({ label: item.label, amount: parseFloat(item.amount) || 0 })),
    voidPct: isSimple ? 0 : (parseFloat(document.getElementById('voidAllowance').value) || 0),
    runningCosts: totalRunningCosts,
    targetYield: isSimple ? 6.0 : (parseFloat(document.getElementById('targetYield').value) || 7.0),
    lettingAgentPct: getLettingAgentPct(),
    lettingAgentVat: document.getElementById('lettingAgentVat').checked,
    simpleMode: isSimple,
  };

  setResultsPanelContent('<div class="results-placeholder"><p>Calculating...</p></div>');

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Calculation failed');
    }

    const result = await res.json();
    renderResults(result);
    if (currentMode === 'analyser' || currentMode === 'simple') {
      addToHistory(result);
    }
    if (window.innerWidth <= 860) {
      setTimeout(() => {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  } catch (err) {
    setResultsPanelContent(`<div class="results-placeholder"><p style="color:#B11217;">Error: ${err.message}</p></div>`);
  }
}

function scrollToFieldBelowHeader(field) {
  const header = document.querySelector('header');
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const offset = headerHeight + 16;
  const top = field.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
  setTimeout(() => {
    field.focus({ preventScroll: true });
    if (!field.hasAttribute('required')) {
      field.setCustomValidity('Please fill in this field.');
      field.reportValidity();
      field.addEventListener('input', function clearMsg() {
        field.setCustomValidity('');
        field.removeEventListener('input', clearMsg);
      });
    } else {
      field.reportValidity();
    }
  }, 400);
}

function validateDealForm() {
  const requiredFields = currentMode === 'sdlt'
    ? [{ el: document.getElementById('price'), name: 'Asking Price' }]
    : [
        { el: document.getElementById('address'), name: 'Address' },
        { el: document.getElementById('price'), name: 'Asking Price' },
        { el: document.getElementById('monthlyRent'), name: 'Monthly Rent' }
      ];

  document.querySelectorAll('.field-validation-error').forEach(el => {
    el.classList.remove('field-validation-error');
  });

  for (const f of requiredFields) {
    const val = f.el.value.trim();
    if (!val || (f.el.type === 'number' && (isNaN(parseFloat(val)) || parseFloat(val) <= 0))) {
      f.el.classList.add('field-validation-error');
      f.el.addEventListener('input', function onFix() {
        f.el.classList.remove('field-validation-error');
        f.el.removeEventListener('input', onFix);
      });
      scrollToFieldBelowHeader(f.el);
      return false;
    }
  }
  return true;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateDealForm()) return;
  runCalculation();
  document.getElementById('startAgainBtn').style.display = '';
});

document.getElementById('startAgainBtn').addEventListener('click', () => {
  form.reset();
  costItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }, { label: '', amount: 0 }];
  renderCostItems();
  runningCostItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }];
  renderRunningCostItems();
  renderSimpleRunningCostItems();
  CURRENCY_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    if (input) { input.dataset.rawValue = ''; input.value = ''; }
  });
  document.getElementById('solicitorFees').dataset.rawValue = '';
  document.getElementById('solicitorFees').value = '';
  document.getElementById('voidAllowance').value = '';
  document.getElementById('maintenancePct').value = '';
  document.getElementById('maintenanceFixed').value = '';
  document.getElementById('maintenanceFixed').dataset.rawValue = '';
  maintenanceMode = 'pct';
  document.querySelectorAll('.maint-mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.maint-mode-btn[data-maint="pct"]').classList.add('active');
  document.getElementById('maintPctInput').style.display = '';
  document.getElementById('maintFixedInput').style.display = 'none';
  document.getElementById('targetYield').value = '7';
  document.getElementById('interestRate').value = '';
  document.getElementById('mortgageTerm').value = '25';
  document.getElementById('stressTestRate').value = '7.0';
  selectedBuyerType = 'investor';
  document.querySelectorAll('.buyer-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.buyer-type-btn[data-buyer="investor"]').classList.add('active');
  selectedPurchaseType = 'cash';
  document.querySelectorAll('.purchase-type-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.purchase-type-btn[data-purchase="cash"]').classList.add('active');
  syncMortgageInputsVisibility();
  depositInputMode = 'pounds';
  document.querySelectorAll('.deposit-mode-btn').forEach(b => b.classList.remove('active'));
  const poundsBtn = document.querySelector('.deposit-mode-btn[data-deposit-mode="pounds"]');
  if (poundsBtn) poundsBtn.classList.add('active');
  document.getElementById('depositAmount').placeholder = 'e.g. £40,000';
  document.getElementById('depositAmount').dataset.rawValue = '';
  syncDepositInputType();
  CURRENCY_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dataset.rawValue = '';
  });
  const helperEl = document.getElementById('depositHelperText');
  if (helperEl) helperEl.textContent = '';
  mortgageType = 'interest-only';
  document.querySelectorAll('.mortgage-type-btn').forEach(b => b.classList.remove('active'));
  const ioBtn = document.querySelector('.mortgage-type-btn[data-mortgage-type="interest-only"]');
  if (ioBtn) ioBtn.classList.add('active');
  document.getElementById('borrowingSummary').style.display = 'none';
  document.getElementById('dealReference').value = '';
  simpleCostItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }];
  renderSimpleCostItems();
  document.getElementById('targetYield').value = '7';
  document.getElementById('showStressTest').checked = false;
  document.getElementById('stressTestInput').style.display = 'none';
  setResultsPanelContent('<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>');
  if (typeof window.updateSnapshot === 'function') window.updateSnapshot();
  document.getElementById('savePdfBtn').style.display = 'none';
  document.getElementById('startAgainBtn').style.display = 'none';
  lastResult = null;
  lastMortgageData = null;
});

document.getElementById('showStressTest').addEventListener('change', function() {
  document.getElementById('stressTestInput').style.display = this.checked ? '' : 'none';
});

function safeStr(v) { return v == null ? '' : String(v); }

var _pdfLogoCache = null;
function loadPdfLogo() {
  if (_pdfLogoCache) return Promise.resolve(_pdfLogoCache);
  return new Promise(function(resolve) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      var c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      _pdfLogoCache = c.toDataURL('image/png');
      resolve(_pdfLogoCache);
    };
    img.onerror = function() { resolve(null); };
    img.src = '/rental-metrics-logo-primary-1200x120.png';
  });
}

function addPdfLogo(pdf, logoData, margins) {
  if (!logoData) return;
  var pageW = pdf.internal.pageSize.getWidth();
  var logoDisplayW = 40;
  var logoDisplayH = 4;
  var x = pageW - margins.right - logoDisplayW;
  var yPos = margins.top - 2;
  pdf.addImage(logoData, 'PNG', x, yPos, logoDisplayW, logoDisplayH);
}

function sanitizePdfText(val) {
  if (!val) return '';
  return String(val)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\u00A3\u00A0-\u00FF]/g, '')
    .trim();
}

function safePdfDownload(pdf, filename) {
  try {
    pdf.save(filename);
  } catch (e) {
    var blob = pdf.output('blob');
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
}

function pdfHelper(pdf, margins) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margins.left - margins.right;
  let y = margins.top;

  function checkPage(needed) {
    if (y + needed > pageH - margins.bottom) {
      pdf.addPage();
      y = margins.top;
    }
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)];
  }

  function title(text) {
    checkPage(14);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(text, pageW / 2, y, { align: 'center' });
    y += 8;
  }

  function subtitle(text) {
    checkPage(8);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(text, pageW / 2, y, { align: 'center' });
    y += 5;
  }

  function heading(text) {
    checkPage(12);
    y += 4;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...hexToRgb('#B11217'));
    pdf.text(text, margins.left, y);
    y += 1;
    pdf.setDrawColor(...hexToRgb('#B11217'));
    pdf.setLineWidth(0.5);
    pdf.line(margins.left, y, margins.left + contentW, y);
    y += 6;
  }

  function subheading(text) {
    checkPage(10);
    y += 2;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(80, 80, 80);
    pdf.text(text.toUpperCase(), margins.left, y);
    y += 5;
  }

  function textLine(text, opts) {
    opts = opts || {};
    text = safeStr(text);
    if (!text) return;
    pdf.setFontSize(opts.size || 10);
    pdf.setFont('helvetica', opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal');
    pdf.setTextColor(...(opts.color ? hexToRgb(opts.color) : [0, 0, 0]));
    const maxW = opts.maxWidth || contentW;
    const lines = pdf.splitTextToSize(text, maxW);
    const lineH = opts.lineHeight || 5;
    lines.forEach(line => {
      checkPage(lineH + 1);
      if (opts.align === 'center') {
        pdf.text(line, pageW / 2, y, { align: 'center' });
      } else {
        pdf.text(line, opts.x || margins.left, y);
      }
      y += lineH;
    });
  }

  function table(rows, opts) {
    opts = opts || {};
    const colWidths = opts.colWidths || [contentW * 0.65, contentW * 0.35];
    const rowH = 6;

    if (opts.headers) {
      checkPage(rowH + 2);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margins.left, y - 4, contentW, rowH, 'F');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      let hx = margins.left + 2;
      opts.headers.forEach((h, i) => {
        const align = i === opts.headers.length - 1 ? 'right' : 'left';
        if (align === 'right') {
          pdf.text(h, margins.left + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0) - 2, y, { align: 'right' });
        } else {
          pdf.text(h, hx, y);
        }
        hx += colWidths[i];
      });
      y += 2;
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margins.left, y, margins.left + contentW, y);
      y += 4;
    }

    rows.forEach(row => {
      if (!row || !row.cells) return;
      const isBold = row.bold || false;
      const isTotal = row.total || false;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', isBold || isTotal ? 'bold' : 'normal');
      let dynH = rowH;
      row.cells.forEach((cell, i) => {
        if (i < row.cells.length - 1) {
          const wrapped = pdf.splitTextToSize(safeStr(cell), colWidths[i] - 4);
          dynH = Math.max(dynH, wrapped.length * 4 + 2);
        }
      });
      checkPage(dynH + 1);

      if (isTotal) {
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.4);
        pdf.line(margins.left, y - 4, margins.left + contentW, y - 4);
        y += 1;
      }

      pdf.setFontSize(isBold || isTotal ? 9 : 9);
      pdf.setFont('helvetica', isBold || isTotal ? 'bold' : 'normal');
      pdf.setTextColor(...(row.color ? hexToRgb(row.color) : [0, 0, 0]));

      let cx = margins.left + 2;
      let extraLines = 0;
      row.cells.forEach((cell, i) => {
        const cellStr = safeStr(cell);
        const align = i === row.cells.length - 1 ? 'right' : 'left';
        if (align === 'right') {
          pdf.text(cellStr, margins.left + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0) - 2, y, { align: 'right' });
        } else {
          const wrapped = pdf.splitTextToSize(cellStr, colWidths[i] - 4);
          pdf.text(wrapped[0], cx, y);
          for (let wi = 1; wi < wrapped.length; wi++) {
            pdf.text(wrapped[wi], cx, y + wi * 4);
            extraLines = Math.max(extraLines, wi);
          }
        }
        cx += colWidths[i];
      });

      y += extraLines * 4 + 1;
      if (!isTotal) {
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.15);
        pdf.line(margins.left, y, margins.left + contentW, y);
      }
      y += 4;
    });
    y += 2;
  }

  function dealRating(grade, label, detail, color) {
    checkPage(22);
    const rgb = hexToRgb(color);
    const cx = margins.left + 12;
    const cy = y + 6;
    pdf.setFillColor(...rgb);
    pdf.circle(cx, cy, 10, 'F');
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(grade, cx, cy + 1.5, { align: 'center' });

    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, margins.left + 26, y + 4);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(detail, margins.left + 26, y + 10);
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Rating based on Net Yield (Asset) only.', margins.left + 26, y + 14);
    y += 24;
  }

  function yieldGauge(netYield, targetYield) {
    checkPage(52);
    const cx = margins.left + contentW / 2;
    const cy = y + 30;
    const radius = 25;
    const startAngle = Math.PI;
    const maxYield = Math.max(targetYield * 2, 15);
    const clampedYield = Math.max(0, Math.min(netYield, maxYield));
    const fraction = clampedYield / maxYield;

    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(5);
    const bgSteps = 40;
    for (let i = 0; i < bgSteps; i++) {
      const a1 = startAngle + (i / bgSteps) * Math.PI;
      const a2 = startAngle + ((i + 1) / bgSteps) * Math.PI;
      pdf.line(
        cx + radius * Math.cos(a1), cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2), cy + radius * Math.sin(a2)
      );
    }

    let arcColor;
    if (netYield >= targetYield) arcColor = [10, 122, 46];
    else if (netYield >= targetYield * 0.7) arcColor = [184, 134, 11];
    else arcColor = [177, 18, 23];
    pdf.setDrawColor(...arcColor);
    pdf.setLineWidth(5);
    const arcSteps = Math.max(1, Math.round(fraction * 40));
    for (let i = 0; i < arcSteps; i++) {
      const a1 = startAngle + (i / 40) * Math.PI;
      const a2 = startAngle + ((i + 1) / 40) * Math.PI;
      pdf.line(
        cx + radius * Math.cos(a1), cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2), cy + radius * Math.sin(a2)
      );
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...arcColor);
    pdf.text(fmtPct(netYield), cx, cy - 3, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text('Net Yield (Asset)', cx, cy + 3, { align: 'center' });
    y = cy + 10;
  }

  function yieldCards(cards) {
    checkPage(30);
    const cols = Math.min(cards.length, 4);
    const cardW = (contentW - (cols - 1) * 4) / cols;
    const cardH = 22;
    const startX = margins.left;
    const startY = y;

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + 4);
      const cy = startY + row * (cardH + 4);

      if (row > 0 && col === 0) checkPage(cardH + 4);

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.setFillColor(248, 248, 248);
      pdf.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      pdf.text(card.label.toUpperCase(), cx + cardW / 2, cy + 7, { align: 'center' });

      const valColor = card.color ? hexToRgb(card.color) : [0, 0, 0];
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...valColor);
      pdf.text(safeStr(card.value), cx + cardW / 2, cy + 17, { align: 'center' });
    });

    const totalRows = Math.ceil(cards.length / cols);
    y = startY + totalRows * (cardH + 4) + 2;
  }

  function separator() {
    checkPage(4);
    pdf.setDrawColor(210, 210, 210);
    pdf.setLineWidth(0.2);
    pdf.line(margins.left, y, margins.left + contentW, y);
    y += 4;
  }

  function disclaimer(text) {
    checkPage(20);
    y += 4;
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.rect(margins.left, y - 4, contentW, 18);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    const lines = pdf.splitTextToSize(text, contentW - 8);
    pdf.text(lines, margins.left + 4, y);
    y += Math.max(18, lines.length * 3.5);
  }

  function gap(n) { y += (n || 3); }

  function getY() { return y; }
  function setY(val) { y = val; }

  return { title, subtitle, heading, subheading, textLine, table, dealRating, yieldGauge, yieldCards, separator, disclaimer, gap, checkPage, getY, setY, contentW, pageW, pageH, margins, hexToRgb };
}

function printReport() {
  if (!lastResult) {
    alert('Please run a deal analysis first.');
    return;
  }

  const btn = document.querySelector('.btn-save-pdf-inline') || document.getElementById('savePdfBtn');
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.textContent = 'Generating PDF...'; btn.disabled = true; }

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      if (btn) { btn.textContent = origText; btn.disabled = false; }
      return;
    }

    const address = document.getElementById('address').value || 'Not specified';
    const dealRef = document.getElementById('dealReference').value || '';
    const price = getCurrencyFieldValue('price');
    const monthlyRent = getCurrencyFieldValue('monthlyRent');
    const isSimplePdf = currentMode === 'simple';
    const solicitorFees = isSimplePdf ? 0 : getCurrencyFieldValue('solicitorFees');
    const runningCosts = isSimplePdf ? 0 : getRunningCostItemsTotal();
    const targetYield = isSimplePdf ? '6.0' : document.getElementById('targetYield').value;
    const voidPct = isSimplePdf ? 0 : (parseFloat(document.getElementById('voidAllowance').value) || 0);
    const now = new Date();
    const timestamp = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      + ' at ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const sanitisedAddress = address.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').substring(0, 40);
    const sanitisedRef = dealRef.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').substring(0, 40);
    const parts = ['RentalMetrics'];
    if (sanitisedAddress) parts.push(sanitisedAddress);
    if (sanitisedRef) parts.push(sanitisedRef);
    parts.push(dateStr + '-' + timeStr);
    const filename = parts.join('-') + '.pdf';

    const buyerType = getSelectedBuyerType();
    const scenarioData = getResultForBuyerType(lastResult, buyerType);
    if (!scenarioData || !scenarioData.breakdown) {
      alert('Deal data is incomplete. Please run the analysis again.');
      if (btn) { btn.textContent = origText; btn.disabled = false; }
      return;
    }
    const selectedMortgage = lastMortgageData ? lastMortgageData[buyerType] : null;
    const displayData = scenarioData;
    const rating = getDealRating(displayData.netYield);

    const pdfMargins = { top: 15, bottom: 15, left: 15, right: 15 };
    loadPdfLogo().then(function(logoData) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const h = pdfHelper(pdf, pdfMargins);

    addPdfLogo(pdf, logoData, pdfMargins);
    h.title('RentalMetrics - Property Deal Report');
    h.subtitle('Generated: ' + timestamp);
    h.gap(2);
    h.textLine(sanitizePdfText(address), { size: 11, bold: true, align: 'center' });
    if (dealRef) h.textLine(sanitizePdfText(dealRef), { size: 10, bold: true, align: 'center' });
    h.gap(2);
    pdf.setDrawColor(...h.hexToRgb('#B11217'));
    pdf.setLineWidth(0.8);
    pdf.line(h.margins.left, h.getY(), h.margins.left + h.contentW, h.getY());
    h.gap(6);

    h.heading('Input Summary');
    const inputRows = [
      { cells: ['Asking Price', fmt(price)] },
      { cells: ['Expected Monthly Rent', fmt(monthlyRent)] },
    ];
    if (!isSimplePdf) {
      inputRows.push({ cells: ['Solicitor Fees', fmt(solicitorFees)] });
      inputRows.push({ cells: ['Void Allowance', voidPct + '%'] });
      const activeRunning = runningCostItems.filter(i => (parseFloat(i.amount) || 0) > 0);
      activeRunning.forEach(i => inputRows.push({ cells: [i.label || 'Running cost', fmt(i.amount) + '/mo'] }));
      if (runningCosts > 0) {
        inputRows.push({ cells: ['Total Monthly Running Costs', fmt(runningCosts) + '/mo'], bold: true });
      }
      const lettingAgentPct = getLettingAgentPct();
      if (lettingAgentPct > 0) {
        const lettingAgentVat = document.getElementById('lettingAgentVat').checked;
        let laLabel = 'Letting Agent (' + lettingAgentPct + '%)';
        if (lettingAgentVat) laLabel += ' inc. VAT';
        inputRows.push({ cells: [laLabel, fmt(getLettingAgentFeeMonthly()) + '/mo'] });
      }
      if (getMaintenanceAnnual() > 0) {
        const maintLabel = maintenanceMode === 'pct'
          ? (parseFloat(document.getElementById('maintenancePct').value) || 0) + '% of rent'
          : fmt(getMaintenanceAnnual()) + '/yr';
        inputRows.push({ cells: ['Maintenance Allowance', maintLabel] });
      }
      inputRows.push({ cells: ['Target Yield', targetYield + '%'] });
    } else {
      const activeSimpleCosts = simpleCostItems.filter(i => (parseFloat(i.amount) || 0) > 0);
      activeSimpleCosts.forEach(i => {
        inputRows.push({ cells: [i.label || 'Additional cost', fmt(i.amount)] });
      });
      if (activeSimpleCosts.length > 0) {
        inputRows.push({ cells: ['Total Additional Costs', fmt(getSimpleCostItemsTotal())], bold: true });
      }
    }
    h.table(inputRows);

    if (!isSimplePdf) {
      const activeCosts = costItems.filter(i => i.amount > 0);
      if (activeCosts.length > 0) {
        h.subheading('Additional Costs');
        const costRows = activeCosts.map(i => ({ cells: [i.label || 'Cost item', fmt(i.amount)] }));
        costRows.push({ cells: ['Total Additional Costs', fmt(getCostItemsTotal())], bold: true, total: true });
        h.table(costRows);
      }
    }

    h.separator();

    h.heading(getBuyerTypeLabel(buyerType));
    if (!isSimplePdf) {
      h.dealRating(
        rating.grade,
        rating.label,
        '(Net yield ' + fmtPct(displayData.netYield) + ' vs ' + fmtPct(parseFloat(targetYield)) + ' target)',
        rating.color
      );
    }

    h.subheading('SDLT Breakdown');
    if (scenarioData.sdltBreakdown && scenarioData.sdltBreakdown.bands && scenarioData.sdltBreakdown.bands.length > 0) {
      const sdltRows = scenarioData.sdltBreakdown.bands.map(b => ({
        cells: [fmt(b.from) + ' - ' + fmt(b.to), (b.rate * 100).toFixed(0) + '%', fmt(b.tax)]
      }));
      h.table(sdltRows, { headers: ['Band', 'Rate', 'Tax'], colWidths: [h.contentW * 0.5, h.contentW * 0.2, h.contentW * 0.3] });
    }
    h.textLine('Total SDLT: ' + fmt(scenarioData.sdlt), { bold: true, size: 10 });
    h.gap(3);

    h.subheading('Cost Breakdown');
    const costBreakdownRows = [
      { cells: ['Purchase Price', fmt(scenarioData.breakdown.price)] },
      { cells: ['SDLT', fmt(scenarioData.breakdown.sdlt)] },
      { cells: ['Solicitor Fees', fmt(scenarioData.breakdown.solicitorFees)] },
    ];
    if (scenarioData.breakdown.costItems) {
      scenarioData.breakdown.costItems.filter(i => i.amount > 0).forEach(i => {
        costBreakdownRows.push({ cells: [i.label || 'Cost item', fmt(i.amount)] });
      });
    }
    costBreakdownRows.push({ cells: ['Total Acquisition Cost', fmt(scenarioData.totalCost)], bold: true, total: true });
    h.table(costBreakdownRows);

    h.heading('Yield Analysis');
    if (selectedMortgage) {
      h.textLine('Net Yield (Asset) excludes mortgage. Cash-on-Cash includes mortgage and is based on cash invested.', { size: 9, align: 'center', color: '#555555' });
    }
    h.gap(2);
    if (!isSimplePdf) {
      h.yieldGauge(displayData.netYield, parseFloat(targetYield));
      h.gap(4);
    }

    const yieldCardData = [
      { label: 'Gross Yield', value: fmtPct(displayData.grossYield), color: '#333333' },
      { label: 'Net Yield (Asset)', value: fmtPct(displayData.netYield), color: isSimplePdf ? '#333333' : (displayData.netYield >= parseFloat(targetYield) ? '#0a7a2e' : '#B11217') },
    ];
    if (selectedMortgage) {
      yieldCardData.push({ label: 'Cash-on-Cash Return', value: fmtPct(selectedMortgage.cashOnCashReturn), color: selectedMortgage.cashOnCashReturn >= 0 ? '#0a7a2e' : '#B11217' });
      const payback = selectedMortgage.annualCashFlow > 0 ? (selectedMortgage.totalCashInvested / selectedMortgage.annualCashFlow).toFixed(1) + ' yrs' : 'N/A';
      yieldCardData.push({ label: 'Payback Period', value: payback, color: '#333333' });
    }
    h.yieldCards(yieldCardData);
    h.gap(2);

    h.subheading('Yield Breakdown');
    const yieldRows = [{ cells: ['Annual Rent', fmt(scenarioData.annualRent)] }];
    if (voidPct > 0) {
      yieldRows.push({ cells: ['Effective Annual Rent (after ' + voidPct + '% void)', fmt(scenarioData.effectiveAnnualRent || scenarioData.annualRent)] });
    }
    yieldRows.push({ cells: ['Net Annual Income (before finance)', fmt(scenarioData.netAnnualRent)] });
    if (selectedMortgage) {
      yieldRows.push({ cells: ['Annual Mortgage Cost', fmt(selectedMortgage.monthlyPayment * 12)] });
      yieldRows.push({ cells: ['Annual Cashflow (after finance)', fmt(selectedMortgage.annualCashFlow)] });
      yieldRows.push({ cells: ['Cash Invested', fmt(selectedMortgage.totalCashInvested)] });
    }
    yieldRows.push({ cells: ['Total Acquisition Cost', fmt(scenarioData.totalCost)] });
    h.table(yieldRows);

    if (selectedMortgage) {
      h.subheading('Mortgage Analysis');
      const mortRows = [
        { cells: ['Deposit (' + fmtPct(selectedMortgage.depositPct) + ')', fmt(selectedMortgage.depositAmount)] },
        { cells: ['Mortgage Amount', fmt(selectedMortgage.mortgageAmount)] },
        { cells: ['Interest Rate', selectedMortgage.interestRate + '%'] },
        { cells: ['Term', selectedMortgage.mortgageTerm + ' years'] },
        { cells: ['Monthly Mortgage Payment', fmt(selectedMortgage.monthlyPayment)] },
        { cells: ['Monthly Cash Flow', fmt(selectedMortgage.monthlyCashFlow)] },
        { cells: ['Annual Cash Flow', fmt(selectedMortgage.annualCashFlow)] },
        { cells: ['Total Cash Invested', fmt(selectedMortgage.totalCashInvested)] },
      ];
      h.table(mortRows);

      if (!isSimplePdf) {
        h.subheading('Stress Test (' + selectedMortgage.stressRate + '%)');
        h.table([
          { cells: ['Monthly Payment at Stress Rate', fmt(selectedMortgage.stressMonthlyPayment)] },
          { cells: ['Monthly Cash Flow at Stress Rate', fmt(selectedMortgage.stressMonthlyCashFlow)] },
        ]);
        const stressCfLabel = selectedMortgage.stressCashFlowPositive ? 'Cash Flow Positive at Stress Rate' : 'Cash Flow Negative at Stress Rate';
        h.textLine(stressCfLabel, { bold: true, color: selectedMortgage.stressCashFlowPositive ? '#0a7a2e' : '#B11217' });
      }
      h.gap(3);
    }

    if (!isSimplePdf) {
      const offer = scenarioData.targetOffer;
      if (offer && offer.achievable) {
        h.textLine('Target Offer Price (for ' + fmtPct(parseFloat(targetYield)) + ' Net Yield): ' + fmt(offer.offerPrice), { bold: true });
      } else {
        h.textLine('Target Offer Price (for ' + fmtPct(parseFloat(targetYield)) + ' Net Yield): Not achievable with current inputs', { bold: true });
      }
      h.textLine('Based on Net Yield (Asset), excluding mortgage.', { size: 8, color: '#666666' });

      h.gap(4);
      h.textLine('Capital growth projection available in the interactive tool.', { italic: true, size: 8, color: '#666666' });
      if (selectedMortgage) {
        h.textLine('Refinance scenario available in the interactive tool.', { italic: true, size: 8, color: '#666666' });
        if (!isLimitedCompany) {
          h.textLine('Section 24 tax estimate available in the interactive tool. Estimate only — not tax advice.', { italic: true, size: 8, color: '#666666' });
        } else {
          h.textLine('Section 24 applies to individual landlords, not limited companies.', { italic: true, size: 8, color: '#666666' });
        }
      }
    }

    h.textLine('RentalMetrics v' + APP_VERSION + ' - ' + APP_VERSION_DATE, { size: 7, align: 'center', color: '#999999' });
    h.gap(2);
    h.disclaimer('Disclaimer: These calculations are estimates only and do not constitute financial or tax advice. SDLT rates and thresholds can change. Always consult a qualified professional before making investment decisions. This tool covers England & Northern Ireland only.');

    safePdfDownload(pdf, filename);
    }).catch(function(err) {
      console.error('PDF generation failed:', err, err.stack);
      alert('PDF generation failed: ' + (err.message || err) + '\nPlease try again.');
    }).finally(function() {
      if (btn) { btn.textContent = origText; btn.disabled = false; }
    });
  } catch (err) {
    console.error('PDF generation failed:', err, err.stack);
    alert('PDF generation failed: ' + (err.message || err) + '\nPlease try again.');
    if (btn) { btn.textContent = origText; btn.disabled = false; }
  }
}

function renderSDLTStandaloneResults(data, price) {
  const address = document.getElementById('address').value || 'Property';
  const buyerType = getSelectedBuyerType();

  const renderSDLTSection = (label, info) => {
    let bandHtml = '';
    if (info.breakdown && info.breakdown.bands && info.breakdown.bands.length > 0) {
      bandHtml = renderSDLTTable(info.breakdown);
    } else {
      bandHtml = '<p style="font-size:0.85rem;color:#777;">No SDLT due</p>';
    }
    return `
      <div class="result-section">
        <h3>SDLT — ${label}</h3>
        ${bandHtml}
        <div class="result-row total">
          <span class="label">Total SDLT</span>
          <span class="value">${fmt(info.total)}</span>
        </div>
      </div>
    `;
  };

  const sdltLabel = getBuyerTypeLabel(buyerType);
  const sdltData = getSdltApiDataForBuyerType(data, buyerType);

  const html = `
    <div class="results-content">
      <div class="results-header-row">
        <div>
          <h2>SDLT Calculation</h2>
          <p class="sdlt-rates-note">Rates based on current GOV.UK guidance (England &amp; Northern Ireland).</p>
          <p class="address-line">${escHtml(address)} — ${fmt(price)}</p>
        </div>
        <div class="results-header-buttons">
          <button type="button" class="btn-share" onclick="shareSDLT(this)">Share</button>
        </div>
      </div>

      ${renderSDLTSection(sdltLabel, sdltData)}
    </div>
  `;

  setResultsPanelContent(html);
}

document.getElementById('sdltCalcBtn').addEventListener('click', async () => {
  const price = getCurrencyFieldValue('price');
  if (!price || price <= 0) {
    alert('Please enter a valid asking price.');
    return;
  }
  setResultsPanelContent('<div class="results-placeholder"><p>Calculating...</p></div>');
  try {
    const res = await fetch(`/api/sdlt?price=${encodeURIComponent(price)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'SDLT calculation failed');
    }
    const data = await res.json();
    lastSdltData = data;
    lastSdltPrice = price;
    renderSDLTStandaloneResults(data, price);
    setTimeout(() => {
      const buyerTypeEl = document.querySelector('.buyer-type-group');
      if (buyerTypeEl) {
        const headerHeight = document.querySelector('header')?.offsetHeight || 0;
        const top = buyerTypeEl.getBoundingClientRect().top + window.pageYOffset - headerHeight - 12;
        window.scrollTo({ top, behavior: 'smooth' });
      } else {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  } catch (err) {
    setResultsPanelContent(`<div class="results-placeholder"><p style="color:#B11217;">Error: ${err.message}</p></div>`);
  }
});

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('dealHistory')) || [];
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem('dealHistory', JSON.stringify(history));
}

function addToHistory(result) {
  const address = document.getElementById('address').value || '';
  const price = getCurrencyFieldValue('price');
  const monthlyRent = getCurrencyFieldValue('monthlyRent');
  const isSimple = currentMode === 'simple';
  const targetYield = isSimple ? 6.0 : (parseFloat(document.getElementById('targetYield').value) || 7.0);
  const investorRating = getDealRating(result.investor.netYield);
  const now = new Date();

  const dealReference = document.getElementById('dealReference').value || '';
  const entry = {
    id: Date.now(),
    address: address,
    dealReference: dealReference,
    price: price,
    monthlyRent: monthlyRent,
    targetYield: targetYield,
    investorNetYield: result.investor.netYield,
    ftbNetYield: result.ftb.netYield,
    mainNetYield: result.main.netYield,
    investorSDLT: result.investor.sdlt,
    ftbSDLT: result.ftb.sdlt,
    mainSDLT: result.main.sdlt,
    investorRating: investorRating.grade,
    investorGrossYield: result.investor.grossYield,
    ftbGrossYield: result.ftb.grossYield,
    mainGrossYield: result.main.grossYield,
    annualCashFlow: isSimple
      ? (result.investor.annualRent)
      : ((result.investor.effectiveAnnualRent || result.investor.annualRent) - (getRunningCostItemsTotal() || 0) * 12 - getLettingAgentFeeMonthly() * 12 - getMaintenanceAnnual()),
    hasMortgage: selectedPurchaseType === 'mortgage',
    depositAmount: getDepositAmount(),
    solicitorFees: isSimple ? 0 : (getCurrencyFieldValue('solicitorFees') || 1500),
    refurbCosts: isSimple ? getSimpleCostItemsTotal() : getCostItemsTotal(),
    simpleCostItems: isSimple ? simpleCostItems.filter(i => (parseFloat(i.amount) || 0) > 0).map(i => ({ label: i.label, amount: parseFloat(i.amount) || 0 })) : [],
    voidPct: isSimple ? 0 : (parseFloat(document.getElementById('voidAllowance').value) || 0),
    runningCosts: getRunningCostItemsTotal(),
    runningCostItems: runningCostItems.map(i => ({ label: i.label, amount: parseFloat(i.amount) || 0 })),
    mortgageType: mortgageType,
    lettingAgentPct: getLettingAgentPct(),
    lettingAgentVat: document.getElementById('lettingAgentVat').checked,
    buyerType: getSelectedBuyerType(),
    purchaseType: selectedPurchaseType,
    mortgageMonthlyPayment: 0,
    mortgageCashOnCash: 0,
    mortgageTotalCashInvested: 0,
    mortgageStressMonthlyCashFlow: 0,
    mortgageStressCashFlowPositive: true,
    mortgageStressRate: 7.0,
    mortgageInterestRate: 4.5,
    maintenanceMode: isSimple ? 'pct' : maintenanceMode,
    maintenancePct: isSimple ? 0 : (parseFloat(document.getElementById('maintenancePct').value) || 0),
    maintenanceFixed: isSimple ? 0 : (parseFloat(document.getElementById('maintenanceFixed').value) || 0),
    mode: currentMode,
    date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  };

  if (entry.hasMortgage && lastMortgageData) {
    const bt = entry.buyerType || 'investor';
    const m = lastMortgageData[bt === 'ftb' ? 'ftb' : bt === 'main' ? 'main' : 'investor'];
    if (m) {
      entry.mortgageMonthlyPayment = m.monthlyPayment || 0;
      entry.mortgageCashOnCash = m.cashOnCashReturn || 0;
      entry.mortgageTotalCashInvested = m.totalCashInvested || 0;
      entry.mortgageMonthlyCashFlow = m.monthlyCashFlow || 0;
      entry.mortgageStressMonthlyCashFlow = m.stressMonthlyCashFlow || 0;
      entry.mortgageStressCashFlowPositive = m.stressCashFlowPositive !== false;
      entry.mortgageStressRate = m.stressRate || 7.0;
      entry.mortgageInterestRate = m.interestRate || 4.5;
    }
  }

  let history = getHistory();
  history.unshift(entry);
  if (history.length > 20) history = history.slice(0, 20);
  saveHistory(history);
  renderHistory();
}

function deleteHistoryItem(id) {
  let history = getHistory();
  history = history.filter(h => h.id !== id);
  saveHistory(history);
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem('dealHistory');
  renderHistory();
}

function applyHistoryEntry(entry) {
  if (entry.mode && (entry.mode === 'simple' || entry.mode === 'analyser')) {
    setMode(entry.mode);
  }

  const priceInput = document.getElementById('price');
  priceInput.dataset.rawValue = entry.price;
  priceInput.value = formatCurrencyDisplay(entry.price);

  const rentInput = document.getElementById('monthlyRent');
  rentInput.dataset.rawValue = entry.monthlyRent;
  rentInput.value = formatCurrencyDisplay(entry.monthlyRent);

  if (entry.solicitorFees !== undefined) {
    const solInput = document.getElementById('solicitorFees');
    solInput.dataset.rawValue = entry.solicitorFees;
    solInput.value = formatCurrencyDisplay(entry.solicitorFees);
  }


  if (entry.runningCostItems && entry.runningCostItems.length > 0) {
    runningCostItems = entry.runningCostItems.map(i => ({ label: i.label || '', amount: parseFloat(i.amount) || 0 }));
    renderRunningCostItems();
  } else if (entry.runningCosts !== undefined && entry.runningCosts > 0) {
    runningCostItems = [{ label: '', amount: entry.runningCosts }, { label: '', amount: 0 }];
    renderRunningCostItems();
  }

  if (entry.targetYield !== undefined) {
    document.getElementById('targetYield').value = entry.targetYield;
  }

  if (entry.address) {
    document.getElementById('address').value = entry.address;
  }

  document.getElementById('dealReference').value = entry.dealReference || '';

  if (entry.lettingAgentPct !== undefined) {
    document.getElementById('lettingAgentFee').value = entry.lettingAgentPct || 0;
  }

  if (entry.lettingAgentVat !== undefined) {
    document.getElementById('lettingAgentVat').checked = entry.lettingAgentVat;
  }

  if (entry.buyerType) {
    selectedBuyerType = entry.buyerType;
    document.querySelectorAll('.buyer-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.buyer === entry.buyerType);
    });
  }

  if (entry.mode === 'simple' && entry.simpleCostItems && entry.simpleCostItems.length > 0) {
    simpleCostItems = entry.simpleCostItems.map(i => ({ label: i.label || '', amount: parseFloat(i.amount) || 0 }));
    while (simpleCostItems.length < 2) simpleCostItems.push({ label: '', amount: 0 });
    renderSimpleCostItems();
  } else if (entry.mode === 'simple' && entry.refurbCosts !== undefined && entry.refurbCosts > 0) {
    simpleCostItems = [{ label: '', amount: entry.refurbCosts }, { label: '', amount: 0 }];
    renderSimpleCostItems();
  } else if (entry.refurbCosts !== undefined && entry.refurbCosts > 0) {
    costItems = [{ label: '', amount: entry.refurbCosts }, { label: '', amount: 0 }, { label: '', amount: 0 }];
    renderCostItems();
  }

  if (entry.voidPct !== undefined) {
    document.getElementById('voidAllowance').value = entry.voidPct;
  }

  if (entry.maintenanceMode) {
    maintenanceMode = entry.maintenanceMode;
    document.querySelectorAll('.maint-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.maint === entry.maintenanceMode);
    });
    document.getElementById('maintPctInput').style.display = maintenanceMode === 'pct' ? '' : 'none';
    document.getElementById('maintFixedInput').style.display = maintenanceMode === 'fixed' ? '' : 'none';
  }

  if (entry.maintenancePct !== undefined) {
    document.getElementById('maintenancePct').value = entry.maintenancePct;
  }

  if (entry.maintenanceFixed !== undefined) {
    const mfInput = document.getElementById('maintenanceFixed');
    mfInput.dataset.rawValue = entry.maintenanceFixed;
    mfInput.value = entry.maintenanceFixed ? formatCurrencyDisplay(entry.maintenanceFixed) : '';
  }

  if (entry.purchaseType) {
    selectedPurchaseType = entry.purchaseType;
    document.querySelectorAll('.purchase-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.purchase === entry.purchaseType);
    });
    const mortgageSection = document.getElementById('mortgageSection');
    if (mortgageSection) {
      mortgageSection.style.display = entry.purchaseType === 'mortgage' ? '' : 'none';
    }
  }

  if (entry.mortgageType) {
    mortgageType = entry.mortgageType;
    document.querySelectorAll('.mortgage-type-btn').forEach(b => b.classList.remove('active'));
    const mtBtn = document.querySelector(`.mortgage-type-btn[data-mortgage-type="${entry.mortgageType}"]`);
    if (mtBtn) mtBtn.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  runCalculation();
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  const history = getHistory();
  const section = document.getElementById('historySection');

  const metaEl = document.getElementById('historyMeta');
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No saved analyses yet. Run a deal analysis to see it here.</div>';
    if (section) {
      const h2 = section.querySelector('h2');
      if (h2) h2.innerHTML = 'Comparison History';
    }
    if (metaEl) metaEl.style.display = 'none';
    return;
  }

  if (metaEl) metaEl.style.display = '';

  if (section) {
    const h2 = section.querySelector('h2');
    if (h2) h2.innerHTML = 'Comparison History ' + (history.length >= 2 ? '<button type="button" class="btn-compare-deals" onclick="openCompare()">Compare Deals</button> ' : '') + '<button type="button" class="btn-clear-history" onclick="clearHistory()">Clear All</button>';
  }

  const sorted = history.map((entry, idx) => {
    const bt = entry.buyerType || 'investor';
    const ny = bt === 'ftb' ? (entry.ftbNetYield || entry.investorNetYield)
      : bt === 'main' ? (entry.mainNetYield || entry.investorNetYield)
      : entry.investorNetYield;
    const parsed = parseFloat(ny);
    return { entry, sortYield: Number.isFinite(parsed) ? parsed : -Infinity, idx };
  }).sort((a, b) => b.sortYield - a.sortYield || a.idx - b.idx);

  const showRanks = document.getElementById('showRanksToggle') && document.getElementById('showRanksToggle').checked;
  let html = '';
  sorted.forEach(({ entry, sortYield }, rank) => {
    const bt = entry.buyerType || 'investor';
    const netYield = bt === 'ftb' ? (entry.ftbNetYield || entry.investorNetYield)
      : bt === 'main' ? (entry.mainNetYield || entry.investorNetYield)
      : entry.investorNetYield;
    const rating = getDealRating(netYield);
    const displayName = getDealDisplayName(entry);
    const isMortgage = entry.hasMortgage || entry.purchaseType === 'mortgage';
    const purchaseIcon = isMortgage ? '<span class="history-purchase-type" title="Mortgage">\u{1F3E6}</span>' : '<span class="history-purchase-type" title="Cash">\u{1F4B7}</span>';

    const annualRent = entry.monthlyRent * 12;
    const effectiveAnnualRent = annualRent * (1 - (entry.voidPct || 0) / 100);
    const lettingPct = entry.lettingAgentPct || 0;
    let lettingMonthly = entry.monthlyRent * (lettingPct / 100);
    if (entry.lettingAgentVat) lettingMonthly *= 1.2;
    const maintenanceAnnual = entry.maintenanceMode === 'fixed'
      ? (entry.maintenanceFixed || 0)
      : effectiveAnnualRent * ((entry.maintenancePct || 0) / 100);
    const netAnnualIncome = effectiveAnnualRent - (entry.runningCosts || 0) * 12 - lettingMonthly * 12 - maintenanceAnnual;

    let monthlyCf;
    if (isMortgage && entry.mortgageMonthlyCashFlow !== undefined) {
      monthlyCf = entry.mortgageMonthlyCashFlow;
    } else if (isMortgage && entry.mortgageMonthlyPayment) {
      monthlyCf = (netAnnualIncome / 12) - entry.mortgageMonthlyPayment;
    } else {
      monthlyCf = netAnnualIncome / 12;
    }
    monthlyCf = Math.round(monthlyCf);
    const cfSign = monthlyCf >= 0 ? '+' : '';
    const cfClass = monthlyCf >= 0 ? 'history-cf-positive' : 'history-cf-negative';

    let detailLine = '<span class="history-chunk">' + fmtShort(entry.price) + '</span>';
    detailLine += ' \u00b7 <span class="history-chunk">Yield ' + (parseFloat(netYield) || 0).toFixed(1) + '%</span>';
    if (isMortgage && entry.mortgageCashOnCash !== undefined && entry.mortgageCashOnCash !== 0) {
      detailLine += ' \u00b7 <span class="history-chunk-nowrap">C-o-C ' + (parseFloat(entry.mortgageCashOnCash) || 0).toFixed(1) + '%</span>';
    }
    detailLine += ' \u00b7 <span class="history-chunk-nowrap ' + cfClass + '">' + cfSign + '\u00a3' + Math.abs(monthlyCf).toLocaleString('en-GB') + '/mo</span>';
    detailLine += ' ' + purchaseIcon;

    html += `
      <div class="history-card" onclick="loadHistoryItem(${entry.id})">
        <div class="history-card-grade" style="background:${rating.color};" onclick="event.stopPropagation(); openCompareForDeal(${entry.id});" title="Tap to compare">${rating.grade}</div>
        <div class="history-card-info">
          <div class="history-card-address">${showRanks ? '<span class="rank-badge">#' + (rank + 1) + '</span>' : ''}${displayName}</div>
          <div class="history-card-details">${detailLine}</div>
        </div>
        <button type="button" class="history-card-delete" onclick="event.stopPropagation(); deleteHistoryItem(${entry.id});">&times;</button>
      </div>
    `;
  });

  historyList.innerHTML = html;
}

window.loadHistoryItem = function(id) {
  const history = getHistory();
  const entry = history.find(h => h.id === id);
  if (entry) applyHistoryEntry(entry);
};

renderHistory();

function hideSnapshotForCompare() {
  var snap = document.querySelector('.deal-snapshot');
  var bar = document.getElementById('snapshotMobileBar');
  if (snap) snap.classList.add('snapshot-hidden');
  if (bar) bar.classList.add('snapshot-hidden');
}

function restoreSnapshotAfterCompare() {
  var snap = document.querySelector('.deal-snapshot');
  var bar = document.getElementById('snapshotMobileBar');
  if (snap) snap.classList.remove('snapshot-hidden');
  if (bar) bar.classList.remove('snapshot-hidden');
}

function captureSnapshot() {
  var card = document.querySelector('.snapshot-card');
  if (!card || !window.html2canvas) return;
  var btn = card.querySelector('.btn-capture-snapshot');
  if (btn) { btn.textContent = 'Capturing...'; btn.disabled = true; }
  html2canvas(card, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  }).then(function(canvas) {
    var logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = '/rental-metrics-logo-primary-2400x240.png';
    return new Promise(function(resolve) {
      logo.onload = function() {
        var ctx = canvas.getContext('2d');
        var maxW = 180 * 2;
        var ratio = logo.naturalHeight / logo.naturalWidth;
        var drawW = Math.min(maxW, logo.naturalWidth);
        var drawH = drawW * ratio;
        var pad = 24 * 2;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logo, canvas.width - drawW - pad, canvas.height - drawH - pad, drawW, drawH);
        ctx.globalAlpha = 1.0;
        resolve(canvas);
      };
      logo.onerror = function() { resolve(canvas); };
    });
  }).then(function(canvas) {
    var link = document.createElement('a');
    var now = new Date();
    var ds = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var ts = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    link.download = 'RentalMetrics-Deal-Snapshot-' + ds + '-' + ts + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(function(err) {
    console.error('Snapshot capture failed:', err);
    alert('Could not capture snapshot. Please try again.');
  }).finally(function() {
    if (btn) { btn.textContent = 'Capture Snapshot'; btn.disabled = false; }
  });
}
window.captureSnapshot = captureSnapshot;

function toggleBenchmarkInput() {
  var row = document.getElementById('benchmarkInputRow');
  if (row) row.style.display = row.style.display === 'none' ? 'flex' : 'none';
}
window.toggleBenchmarkInput = toggleBenchmarkInput;

function saveBenchmark() {
  var input = document.getElementById('benchmarkYieldInput');
  if (!input) return;
  var val = parseFloat(input.value);
  if (!Number.isFinite(val) || val < 0 || val > 30) {
    alert('Please enter a valid benchmark yield (0-30%).');
    return;
  }
  localStorage.setItem('rm_benchmark_yield', val);
  document.getElementById('benchmarkInputRow').style.display = 'none';
  if (typeof updateSnapshot === 'function') updateSnapshot();
}
window.saveBenchmark = saveBenchmark;

function clearBenchmark() {
  localStorage.removeItem('rm_benchmark_yield');
  document.getElementById('benchmarkInputRow').style.display = 'none';
  if (typeof updateSnapshot === 'function') updateSnapshot();
}
window.clearBenchmark = clearBenchmark;

function openCompare() {
  const history = getHistory();
  if (history.length < 2) return;
  document.getElementById('compareOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  hideSnapshotForCompare();
  renderCompareTable();
}

function closeCompare() {
  document.getElementById('compareOverlay').style.display = 'none';
  document.body.style.overflow = '';
  restoreSnapshotAfterCompare();
}

function openCompareForDeal(dealId) {
  const history = getHistory();
  if (history.length < 1) return;
  document.getElementById('compareOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  hideSnapshotForCompare();
  renderCompareTable(dealId);
}
window.openCompareForDeal = openCompareForDeal;

function renderCompareTable(highlightDealId) {
  const history = getHistory();
  if (history.length === 0) return;
  
  const sortBy = document.getElementById('compareSortBy').value;
  const ratingOrder = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'F': 4 };
  
  const entries = history.map(entry => {
    const bt = entry.buyerType || 'investor';
    const netYield = bt === 'ftb' ? (entry.ftbNetYield || entry.investorNetYield)
      : bt === 'main' ? (entry.mainNetYield || entry.investorNetYield)
      : entry.investorNetYield;
    const sdlt = bt === 'ftb' ? (entry.ftbSDLT || entry.investorSDLT)
      : bt === 'main' ? (entry.mainSDLT || entry.investorSDLT)
      : entry.investorSDLT;
    const rating = getDealRating(netYield);

    const annualRent = entry.monthlyRent * 12;
    const effectiveAnnualRent = annualRent * (1 - (entry.voidPct || 0) / 100);
    const grossYield = bt === 'ftb'
      ? (entry.ftbGrossYield || (entry.price > 0 ? (annualRent / entry.price) * 100 : 0))
      : bt === 'main'
      ? (entry.mainGrossYield || entry.investorGrossYield || (entry.price > 0 ? (annualRent / entry.price) * 100 : 0))
      : (entry.investorGrossYield || (entry.price > 0 ? (annualRent / entry.price) * 100 : 0));

    const lettingPct = entry.lettingAgentPct || 0;
    let lettingMonthly = entry.monthlyRent * (lettingPct / 100);
    if (entry.lettingAgentVat) lettingMonthly *= 1.2;
    const maintenanceAnnual = entry.maintenanceMode === 'fixed'
      ? (entry.maintenanceFixed || 0)
      : effectiveAnnualRent * ((entry.maintenancePct || 0) / 100);
    const netAnnualIncome = effectiveAnnualRent - (entry.runningCosts || 0) * 12 - lettingMonthly * 12 - maintenanceAnnual;

    const isMortgage = entry.hasMortgage || entry.purchaseType === 'mortgage';
    let monthlyCf;
    if (isMortgage && entry.mortgageMonthlyCashFlow !== undefined) {
      monthlyCf = entry.mortgageMonthlyCashFlow;
    } else if (isMortgage && entry.mortgageMonthlyPayment) {
      monthlyCf = (netAnnualIncome / 12) - entry.mortgageMonthlyPayment;
    } else {
      monthlyCf = netAnnualIncome / 12;
    }
    monthlyCf = Math.round(monthlyCf);

    const coc = isMortgage ? (entry.mortgageCashOnCash || 0) : null;
    const cashInvested = isMortgage ? (entry.mortgageTotalCashInvested || 0) : null;

    return {
      ...entry,
      displayNetYield: netYield,
      displaySdlt: sdlt,
      rating,
      grossYieldCalc: Math.round(grossYield * 100) / 100,
      monthlyCashFlow: monthlyCf,
      cashOnCash: coc,
      cashInvested: cashInvested,
      isMortgage: isMortgage,
      ratingSort: ratingOrder[rating.grade] !== undefined ? ratingOrder[rating.grade] : 5
    };
  });

  const bestNetYieldEntry = entries.reduce((best, e) => (!best || e.displayNetYield > best.displayNetYield) ? e : best, null);
  
  entries.sort((a, b) => {
    switch (sortBy) {
      case 'rating': return a.ratingSort - b.ratingSort || b.displayNetYield - a.displayNetYield;
      case 'netYield': return b.displayNetYield - a.displayNetYield;
      case 'cashOnCash': {
        const aCoc = a.cashOnCash !== null ? a.cashOnCash : -Infinity;
        const bCoc = b.cashOnCash !== null ? b.cashOnCash : -Infinity;
        return bCoc - aCoc;
      }
      case 'cashflow': return b.monthlyCashFlow - a.monthlyCashFlow;
      case 'grossYield': return b.grossYieldCalc - a.grossYieldCalc;
      case 'price': return a.price - b.price;
      case 'rent': return b.monthlyRent - a.monthlyRent;
      default: return 0;
    }
  });
  
  let html = '<div class="compare-cards">';
  
  entries.forEach((entry, idx) => {
    const rank = idx + 1;
    const rankClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : '';
    const isBest = bestNetYieldEntry && entry.id === bestNetYieldEntry.id;
    const bestBadge = isBest ? '<span class="best-deal-badge">Best Deal</span><span class="best-deal-helper">Based on highest Net Yield (Asset)</span>' : '';
    const cfClass = entry.monthlyCashFlow >= 0 ? 'compare-positive' : 'compare-negative';
    const cfSign = entry.monthlyCashFlow >= 0 ? '+' : '';
    const highlightClass = highlightDealId && entry.id === highlightDealId ? 'compare-card-highlight' : '';
    const displayName = getDealDisplayName(entry);
    const purchaseLabel = entry.isMortgage ? '\u{1F3E6} Mortgage' : '\u{1F4B7} Cash';

    let stressBadge = '';
    if (entry.isMortgage && entry.mortgageStressRate) {
      const stressPositive = entry.mortgageStressCashFlowPositive !== false;
      stressBadge = stressPositive
        ? '<span class="compare-stress-badge compare-stress-positive">Stress: Positive</span>'
        : '<span class="compare-stress-badge compare-stress-negative">Stress: Negative</span>';
    }

    html += `
      <div class="compare-card ${isBest ? 'compare-card-best' : ''} ${highlightClass}">
        <div class="compare-rank ${rankClass}">#${rank}</div>
        <div class="compare-card-header">
          <div class="compare-card-grade" style="background:${entry.rating.color};">${entry.rating.grade}</div>
          <div class="compare-card-title">
            <div class="compare-card-address">${displayName}</div>
            <div class="compare-card-label">${entry.rating.label} ${bestBadge} ${stressBadge}</div>
            <div class="compare-card-rating-note">Rating based on Net Yield (Asset) only.</div>
          </div>
        </div>
        <div class="compare-section-label">Key Metrics</div>
        <div class="compare-card-metrics compare-primary">
          <div class="compare-metric">
            <span class="compare-metric-label">Net Yield (Asset)</span>
            <span class="compare-metric-value compare-highlight">${fmtPct(entry.displayNetYield)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Monthly Cashflow</span>
            <span class="compare-metric-value ${cfClass}">${cfSign}${fmt(Math.abs(entry.monthlyCashFlow))}/mo</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Cash-on-Cash</span>
            <span class="compare-metric-value">${entry.cashOnCash !== null ? fmtPct(entry.cashOnCash) : '\u2014'}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Cash Invested</span>
            <span class="compare-metric-value">${entry.cashInvested !== null ? fmt(entry.cashInvested) : '\u2014'}</span>
          </div>
        </div>
        <div class="compare-section-label">Details</div>
        <div class="compare-card-metrics compare-secondary">
          <div class="compare-metric">
            <span class="compare-metric-label">Price</span>
            <span class="compare-metric-value">${fmt(entry.price)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Monthly Rent</span>
            <span class="compare-metric-value">${fmt(entry.monthlyRent)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Gross Yield</span>
            <span class="compare-metric-value">${fmtPct(entry.grossYieldCalc)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">SDLT</span>
            <span class="compare-metric-value">${fmt(entry.displaySdlt)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Purchase</span>
            <span class="compare-metric-value">${purchaseLabel}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Buyer</span>
            <span class="compare-metric-value">${getBuyerTypeLabel(entry.buyerType || 'investor')}</span>
          </div>
        </div>
        <div class="compare-card-footer">
          <span class="compare-card-date">${entry.date}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  document.getElementById('compareBody').innerHTML = html;

  if (highlightDealId) {
    const el = document.querySelector('.compare-card-highlight');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

document.getElementById('compareOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeCompare();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.getElementById('compareOverlay').style.display !== 'none') {
    closeCompare();
  }
});

function downloadComparePdf() {
  const history = getHistory();
  if (history.length < 2) return;

  const pdfBtn = document.querySelector('.btn-compare-pdf');
  const origText = pdfBtn ? pdfBtn.textContent : '';
  if (pdfBtn) { pdfBtn.textContent = 'Generating...'; pdfBtn.disabled = true; }

  try {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF library not loaded. Please refresh the page and try again.');
      if (pdfBtn) { pdfBtn.textContent = origText; pdfBtn.disabled = false; }
      return;
    }

    const sortBy = document.getElementById('compareSortBy').value;
    const ratingOrder = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'F': 4 };

    const entries = history.map(entry => {
      const bt = entry.buyerType || 'investor';
      const netYield = bt === 'ftb' ? (entry.ftbNetYield || entry.investorNetYield)
        : bt === 'main' ? (entry.mainNetYield || entry.investorNetYield)
        : entry.investorNetYield;
      const sdlt = bt === 'ftb' ? (entry.ftbSDLT || entry.investorSDLT)
        : bt === 'main' ? (entry.mainSDLT || entry.investorSDLT)
        : entry.investorSDLT;
      const rating = getDealRating(netYield);
      const annualRent = entry.monthlyRent * 12;
      const effectiveAnnualRent = annualRent * (1 - (entry.voidPct || 0) / 100);
      const defaultGross = entry.price > 0 ? (annualRent / entry.price) * 100 : 0;
      const grossYield = bt === 'ftb'
        ? (entry.ftbGrossYield || defaultGross)
        : bt === 'main'
        ? (entry.mainGrossYield || entry.investorGrossYield || defaultGross)
        : (entry.investorGrossYield || defaultGross);
      const lettingPct = entry.lettingAgentPct || 0;
      let lettingMonthly = entry.monthlyRent * (lettingPct / 100);
      if (entry.lettingAgentVat) lettingMonthly *= 1.2;
      const maintenanceAnnual = entry.maintenanceMode === 'fixed'
        ? (entry.maintenanceFixed || 0)
        : effectiveAnnualRent * ((entry.maintenancePct || 0) / 100);
      const netAnnualIncome = effectiveAnnualRent - (entry.runningCosts || 0) * 12 - lettingMonthly * 12 - maintenanceAnnual;

      const isMortgage = entry.hasMortgage || entry.purchaseType === 'mortgage';
      let monthlyCf;
      if (isMortgage && entry.mortgageMonthlyCashFlow !== undefined) {
        monthlyCf = entry.mortgageMonthlyCashFlow;
      } else if (isMortgage && entry.mortgageMonthlyPayment) {
        monthlyCf = (netAnnualIncome / 12) - entry.mortgageMonthlyPayment;
      } else {
        monthlyCf = netAnnualIncome / 12;
      }
      monthlyCf = Math.round(monthlyCf);

      const coc = isMortgage ? (entry.mortgageCashOnCash || 0) : null;

      return { ...entry, displayNetYield: netYield, displaySdlt: sdlt, rating, grossYieldCalc: Math.round(grossYield * 100) / 100, monthlyCashFlow: monthlyCf, cashOnCash: coc, isMortgage: isMortgage, ratingSort: ratingOrder[rating.grade] !== undefined ? ratingOrder[rating.grade] : 5 };
    });

    const bestNetYieldEntry = entries.reduce((best, e) => (!best || e.displayNetYield > best.displayNetYield) ? e : best, null);

    entries.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return a.ratingSort - b.ratingSort || b.displayNetYield - a.displayNetYield;
        case 'netYield': return b.displayNetYield - a.displayNetYield;
        case 'cashOnCash': {
          const aCoc = a.cashOnCash !== null ? a.cashOnCash : -Infinity;
          const bCoc = b.cashOnCash !== null ? b.cashOnCash : -Infinity;
          return bCoc - aCoc;
        }
        case 'cashflow': return b.monthlyCashFlow - a.monthlyCashFlow;
        case 'grossYield': return b.grossYieldCalc - a.grossYieldCalc;
        case 'price': return a.price - b.price;
        case 'rent': return b.monthlyRent - a.monthlyRent;
        default: return 0;
      }
    });

    const now = new Date();
    const timestamp = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const sortLabel = sortBy === 'rating' ? 'Deal Rating' : sortBy === 'netYield' ? 'Net Yield (Asset)' : sortBy === 'cashOnCash' ? 'Cash-on-Cash' : sortBy === 'cashflow' ? 'Monthly Cashflow' : sortBy === 'price' ? 'Price' : 'Rent';

    const cmpMargins = { top: 15, bottom: 15, left: 10, right: 10 };
    loadPdfLogo().then(function(logoData) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const h = pdfHelper(pdf, cmpMargins);

    addPdfLogo(pdf, logoData, cmpMargins);
    h.title('RentalMetrics - Deal Comparison');
    h.subtitle('Generated: ' + timestamp);
    h.textLine(entries.length + ' deals compared \u00b7 Sorted by ' + sortLabel, { size: 9, align: 'center', color: '#333333' });
    h.gap(2);
    pdf.setDrawColor(...h.hexToRgb('#B11217'));
    pdf.setLineWidth(0.8);
    pdf.line(h.margins.left, h.getY(), h.margins.left + h.contentW, h.getY());
    h.gap(6);

    const headers = ['Rank', 'Grade', 'Property', 'Price', 'Rent/mo', 'Net', 'CF/mo', 'Cash-on-Cash', 'SDLT', 'Type'];
    const fixedW = 13 + 14 + 24 + 22 + 16 + 22 + 24 + 22 + 16;
    const colW = [13, 14, h.contentW - fixedW, 24, 22, 16, 22, 24, 22, 16];
    const rowH = 9;

    h.checkPage(rowH + 4);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(h.margins.left, h.getY() - 4, h.contentW, rowH, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(80, 80, 80);
    let hx = h.margins.left + 2;
    headers.forEach((header, i) => {
      pdf.text(header, hx, h.getY());
      hx += colW[i];
    });
    h.setY(h.getY() + 2);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(h.margins.left, h.getY(), h.margins.left + h.contentW, h.getY());
    h.setY(h.getY() + 4);

    entries.forEach((e, idx) => {
      const rank = '#' + (idx + 1);
      const propShort = fmtShort(e.price);
      const prop = sanitizePdfText(e.address || e.dealReference || (propShort !== '\u2014' && propShort !== '-' ? propShort + ' Deal' : 'Untitled Deal'));
      const cfSign = e.monthlyCashFlow >= 0 ? '+' : '';
      const cashColor = e.monthlyCashFlow >= 0 ? [10, 122, 46] : [177, 18, 23];
      const isBestPdf = bestNetYieldEntry && e.id === bestNetYieldEntry.id;

      pdf.setFontSize(8);
      const propLines = pdf.splitTextToSize(prop, colW[2] - 2);
      const dynRowH = Math.max(rowH, propLines.length * 4 + 4);
      h.checkPage(dynRowH + 2);

      if (isBestPdf) {
        pdf.setFillColor(235, 250, 240);
        pdf.rect(h.margins.left, h.getY() - 4, h.contentW, dynRowH + 2, 'F');
      }

      const textY = h.getY();
      const textMid = textY - 1.4;

      let cx = h.margins.left + 2;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(rank + (isBestPdf ? ' *' : ''), cx, textY);
      cx += colW[0];

      const gradeRgb = h.hexToRgb(e.rating.color);
      pdf.setFillColor(...gradeRgb);
      pdf.circle(cx + 5, textMid, 3.5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text(e.rating.grade, cx + 5, textMid + 1, { align: 'center' });
      cx += colW[1];

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      propLines.forEach((line, li) => {
        pdf.setFontSize(li === 0 ? 8 : 6.5);
        pdf.text(line, cx, textY + li * 3.5);
      });
      cx += colW[2];

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(fmt(e.price), cx, textY);
      cx += colW[3];

      pdf.text(fmt(e.monthlyRent), cx, textY);
      cx += colW[4];

      pdf.setFont('helvetica', 'bold');
      pdf.text(fmtPct(e.displayNetYield), cx, textY);
      cx += colW[5];

      pdf.setTextColor(...cashColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cfSign + fmt(Math.abs(e.monthlyCashFlow)), cx, textY);
      cx += colW[6];

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(e.cashOnCash !== null ? fmtPct(e.cashOnCash) : '-', cx, textY);
      cx += colW[7];

      pdf.text(fmt(e.displaySdlt), cx, textY);
      cx += colW[8];

      pdf.text(e.buyerType === 'ftb' ? 'FTB' : e.buyerType === 'main' ? 'Main Res.' : 'Investor', cx, textY);

      h.setY(textY + dynRowH - 4);
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.15);
      pdf.line(h.margins.left, h.getY(), h.margins.left + h.contentW, h.getY());
      h.setY(h.getY() + 2);
    });

    h.gap(4);
    h.textLine('* Best Deal - Based on highest Net Yield (Asset)', { size: 7, align: 'left', color: '#666666' });
    h.gap(4);
    h.textLine('RentalMetrics v' + APP_VERSION + ' - ' + APP_VERSION_DATE, { size: 7, align: 'center', color: '#999999' });
    h.gap(2);
    h.disclaimer('Disclaimer: These calculations are estimates only and do not constitute financial or tax advice. Always consult a qualified professional before making investment decisions.');

    const compTimeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const filename = 'RentalMetrics-Deal-Comparison-' + dateStr + '-' + compTimeStr + '.pdf';
    safePdfDownload(pdf, filename);
    }).catch(function(err) {
      console.error('Compare PDF generation failed:', err, err.stack);
      alert('PDF generation failed: ' + (err.message || err) + '\nPlease try again.');
    }).finally(function() {
      if (pdfBtn) { pdfBtn.textContent = origText; pdfBtn.disabled = false; }
    });
  } catch (err) {
    console.error('Compare PDF generation failed:', err, err.stack);
    alert('PDF generation failed: ' + (err.message || err) + '\nPlease try again.');
    if (pdfBtn) { pdfBtn.textContent = origText; pdfBtn.disabled = false; }
  }
}

function toggleRanks() {
  renderHistory();
  if (document.getElementById('compareOverlay').style.display === 'flex') {
    renderCompareTable();
  }
}
window.toggleRanks = toggleRanks;
window.openCompare = openCompare;
window.closeCompare = closeCompare;
window.renderCompareTable = renderCompareTable;
window.downloadComparePdf = downloadComparePdf;

function shareDeal(btnEl) {
  const price = getCurrencyFieldValue('price');
  const rent = getCurrencyFieldValue('monthlyRent');
  const isSimple = currentMode === 'simple';
  const sol = isSimple ? 0 : getCurrencyFieldValue('solicitorFees');
  const refurb = isSimple ? getSimpleCostItemsTotal() : getCostItemsTotal();
  const running = getRunningCostItemsTotal();
  const target = isSimple ? 6 : (parseFloat(document.getElementById('targetYield').value) || 7);
  const addr = document.getElementById('address').value || '';

  const agentPct = getLettingAgentPct();
  const agentVat = document.getElementById('lettingAgentVat').checked;

  const voidPct = isSimple ? 0 : (parseFloat(document.getElementById('voidAllowance').value) || 0);
  const maintMode = isSimple ? 'pct' : maintenanceMode;
  const maintPct = isSimple ? 0 : (parseFloat(document.getElementById('maintenancePct').value) || 0);
  const maintFixed = isSimple ? 0 : (parseFloat(document.getElementById('maintenanceFixed').value) || 0);

  const dealRef = document.getElementById('dealReference').value || '';

  const params = new URLSearchParams();
  if (isSimple) {
    params.set('mode', 'simple');
    const activeSimple = simpleCostItems.filter(i => (parseFloat(i.amount) || 0) > 0);
    if (activeSimple.length > 0) {
      params.set('scitems', JSON.stringify(activeSimple.map(i => ({ l: i.label, a: i.amount }))));
    }
  }
  const activeRunning = runningCostItems.filter(i => (parseFloat(i.amount) || 0) > 0);
  if (activeRunning.length > 0) {
    params.set('rcitems', JSON.stringify(activeRunning.map(i => ({ l: i.label, a: i.amount }))));
  }
  if (price) params.set('price', price);
  if (rent) params.set('rent', rent);
  if (!isSimple && sol) params.set('sol', sol);
  if (!isSimple && refurb) params.set('refurb', refurb);
  if (running) params.set('running', running);
  if (!isSimple && agentPct) params.set('agentpct', agentPct);
  if (!isSimple && agentVat) params.set('agentvat', '1');
  if (!isSimple && voidPct) params.set('void', voidPct);
  if (!isSimple && maintMode === 'fixed') params.set('maintmode', 'fixed');
  if (!isSimple && maintPct) params.set('maintpct', maintPct);
  if (!isSimple && maintFixed) params.set('maintfixed', maintFixed);
  params.set('target', target);
  if (addr) params.set('addr', addr);
  if (dealRef) params.set('ref', dealRef);
  params.set('buyer', getSelectedBuyerType());
  params.set('purchase', selectedPurchaseType);
  if (selectedPurchaseType === 'mortgage') params.set('mtype', mortgageType);

  const url = window.location.origin + window.location.pathname + '?' + params.toString();
  shareOrCopy(url, btnEl);
}

function shareSDLT(btnEl) {
  const price = getCurrencyFieldValue('price');
  const buyer = getSelectedBuyerType();
  const addr = document.getElementById('address').value || '';
  const params = new URLSearchParams();
  params.set('mode', 'sdlt');
  if (price) params.set('price', price);
  if (addr) params.set('addr', addr);
  params.set('buyer', buyer);
  const url = window.location.origin + '/sdlt-calculator?' + params.toString();
  shareOrCopy(url, btnEl);
}

function copyToClipboard(url, btnEl) {
  navigator.clipboard.writeText(url).then(() => {
    flashShareBtn(btnEl, 'Link copied!');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    flashShareBtn(btnEl, 'Link copied!');
  });
}

function shareOrCopy(url, btnEl) {
  if (navigator.share) {
    navigator.share({ title: document.title, url: url }).catch(() => {
      copyToClipboard(url, btnEl);
    });
  } else {
    copyToClipboard(url, btnEl);
  }
}

function flashShareBtn(btnEl, msg) {
  const btn = btnEl || document.querySelector('.btn-share');
  if (btn) {
    const orig = btn.innerHTML;
    btn.textContent = msg;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('copied');
    }, 2000);
  }
}

function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const toggleMobile = document.getElementById('darkModeToggleMobile');
  const saved = localStorage.getItem('darkMode');
  const sunIcon = '&#9728;';
  const moonIcon = '&#9790;';

  function updateIcons(isDark) {
    const icon = isDark ? sunIcon : moonIcon;
    if (toggle) toggle.innerHTML = icon;
    if (toggleMobile) toggleMobile.innerHTML = icon;
  }

  if (saved === 'true') {
    document.body.classList.add('dark');
  }
  updateIcons(saved === 'true');

  function handleToggle() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    updateIcons(isDark);
  }

  if (toggle) toggle.addEventListener('click', handleToggle);
  if (toggleMobile) toggleMobile.addEventListener('click', handleToggle);
}

initDarkMode();

(function initStickyHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
})();

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('mode')) {
    const m = params.get('mode');
    if (m === 'simple' || m === 'analyser' || m === 'sdlt') {
      setMode(m);
    }
  }

  if (!params.has('price')) return;

  const price = parseFloat(params.get('price'));
  if (!price || price <= 0) return;

  const priceInput = document.getElementById('price');
  priceInput.dataset.rawValue = price;
  priceInput.value = formatCurrencyDisplay(price);

  if (params.has('rent')) {
    const rent = parseFloat(params.get('rent'));
    const rentInput = document.getElementById('monthlyRent');
    rentInput.dataset.rawValue = rent;
    rentInput.value = formatCurrencyDisplay(rent);
  }

  if (params.has('sol')) {
    const sol = parseFloat(params.get('sol'));
    const solInput = document.getElementById('solicitorFees');
    solInput.dataset.rawValue = sol;
    solInput.value = formatCurrencyDisplay(sol);
  }

  if (currentMode === 'simple' && params.has('scitems')) {
    try {
      const items = JSON.parse(params.get('scitems'));
      if (Array.isArray(items) && items.length > 0) {
        simpleCostItems = items.map(i => ({ label: i.l || '', amount: parseFloat(i.a) || 0 }));
        while (simpleCostItems.length < 2) simpleCostItems.push({ label: '', amount: 0 });
        renderSimpleCostItems();
      }
    } catch (e) {}
  } else if (params.has('refurb')) {
    const refurb = parseFloat(params.get('refurb'));
    if (refurb > 0) {
      if (currentMode === 'simple') {
        simpleCostItems = [{ label: '', amount: refurb }, { label: '', amount: 0 }];
        renderSimpleCostItems();
      } else {
        costItems = [{ label: '', amount: refurb }, { label: '', amount: 0 }, { label: '', amount: 0 }];
        renderCostItems();
      }
    }
  }


  if (params.has('rcitems')) {
    try {
      const items = JSON.parse(params.get('rcitems'));
      if (Array.isArray(items) && items.length > 0) {
        runningCostItems = items.map(i => ({ label: i.l || '', amount: parseFloat(i.a) || 0 }));
        while (runningCostItems.length < 2) runningCostItems.push({ label: '', amount: 0 });
        renderRunningCostItems();
      }
    } catch (e) {}
  } else if (params.has('running')) {
    const running = parseFloat(params.get('running'));
    if (running > 0) {
      runningCostItems = [{ label: '', amount: running }, { label: '', amount: 0 }];
      renderRunningCostItems();
    }
  }

  if (params.has('target')) {
    document.getElementById('targetYield').value = parseFloat(params.get('target')) || 7;
  }

  if (params.has('agentpct')) {
    document.getElementById('lettingAgentFee').value = parseFloat(params.get('agentpct')) || 0;
  }

  if (params.has('agentvat') && params.get('agentvat') === '1') {
    document.getElementById('lettingAgentVat').checked = true;
  }

  if (params.has('void')) {
    document.getElementById('voidAllowance').value = parseFloat(params.get('void')) || 0;
  }

  if (params.has('maintmode')) {
    const mm = params.get('maintmode');
    maintenanceMode = mm;
    document.querySelectorAll('.maint-mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.maint === mm);
    });
    document.getElementById('maintPctInput').style.display = mm === 'pct' ? '' : 'none';
    document.getElementById('maintFixedInput').style.display = mm === 'fixed' ? '' : 'none';
  }

  if (params.has('maintpct')) {
    document.getElementById('maintenancePct').value = parseFloat(params.get('maintpct')) || 0;
  }

  if (params.has('maintfixed')) {
    const mf = parseFloat(params.get('maintfixed')) || 0;
    const mfInput = document.getElementById('maintenanceFixed');
    mfInput.dataset.rawValue = mf;
    mfInput.value = mf ? formatCurrencyDisplay(mf) : '';
  }

  if (params.has('addr')) {
    document.getElementById('address').value = decodeURIComponent(params.get('addr'));
  }

  if (params.has('ref')) {
    document.getElementById('dealReference').value = decodeURIComponent(params.get('ref'));
  }

  if (params.has('buyer')) {
    const bt = params.get('buyer');
    selectedBuyerType = bt;
    document.querySelectorAll('.buyer-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.buyer === bt);
    });
  }

  if (params.has('purchase')) {
    const pt = params.get('purchase');
    selectedPurchaseType = pt;
    document.querySelectorAll('.purchase-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.purchase === pt);
    });
    const mortgageSection = document.getElementById('mortgageSection');
    if (mortgageSection) {
      mortgageSection.style.display = pt === 'mortgage' ? '' : 'none';
    }
  }

  if (params.has('mtype')) {
    const mt = params.get('mtype');
    mortgageType = mt;
    document.querySelectorAll('.mortgage-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mortgageType === mt);
    });
  }

  window.history.replaceState({}, '', window.location.pathname);

  const isSDLT = currentMode === 'sdlt' || window.location.pathname === '/sdlt-calculator';
  if (isSDLT) {
    setTimeout(() => document.getElementById('sdltCalcBtn').click(), 300);
  } else {
    setTimeout(() => runCalculation(), 300);
  }
}

document.querySelectorAll('.sdlt-cta a, .landing-underfold a[href^="/"]').forEach(function(link) {
  link.addEventListener('click', function(e) {
    const path = this.getAttribute('href');
    const mode = routeToMode[path];
    if (mode) {
      e.preventDefault();
      setMode(mode);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

(function initRouteMode() {
  const path = window.location.pathname;
  const modeFromRoute = routeToMode[path];
  if (modeFromRoute) {
    setMode(modeFromRoute, false);
    window.history.replaceState({ mode: modeFromRoute }, '', path + window.location.search);
  } else {
    setMode('analyser', false);
  }
})();

checkUrlParams();

(function initTooltips() {
  let activeTooltip = null;

  function showTooltip(el) {
    hideAllTooltips();
    let bubble = el.querySelector('.tooltip-bubble');
    if (!bubble) {
      bubble = document.createElement('span');
      bubble.className = 'tooltip-bubble';
      bubble.textContent = el.getAttribute('data-tip');
      el.appendChild(bubble);
    }
    bubble.classList.remove('below', 'nudge-left', 'nudge-right');
    bubble.classList.add('visible');

    const rect = bubble.getBoundingClientRect();
    if (rect.top < 4) {
      bubble.classList.add('below');
    }
    const bRect = bubble.getBoundingClientRect();
    if (bRect.right > window.innerWidth - 8) {
      bubble.classList.add('nudge-left');
    } else if (bRect.left < 8) {
      bubble.classList.add('nudge-right');
    }
    activeTooltip = el;
  }

  function hideTooltip(el) {
    const bubble = el.querySelector('.tooltip-bubble');
    if (bubble) bubble.classList.remove('visible');
    if (activeTooltip === el) activeTooltip = null;
  }

  function hideAllTooltips() {
    document.querySelectorAll('.tooltip-bubble.visible').forEach(b => b.classList.remove('visible'));
    activeTooltip = null;
  }

  document.addEventListener('mouseover', (e) => {
    const tip = e.target.closest('.tooltip');
    if (tip) showTooltip(tip);
  });
  document.addEventListener('mouseout', (e) => {
    const tip = e.target.closest('.tooltip');
    if (tip) hideTooltip(tip);
  });

  document.addEventListener('click', (e) => {
    const tip = e.target.closest('.tooltip');
    if (tip) {
      e.preventDefault();
      e.stopPropagation();
      if (activeTooltip === tip) {
        hideTooltip(tip);
      } else {
        showTooltip(tip);
      }
    } else {
      hideAllTooltips();
    }
  }, true);

  document.addEventListener('scroll', hideAllTooltips, true);
})();

(function initDealSnapshot() {
  try {
  const snapshotEl = document.getElementById('dealSnapshot');
  const mobileBar = document.getElementById('snapshotMobileBar');
  const mobileUpfront = document.getElementById('snapshotMobileUpfront');
  const mobileCashflow = document.getElementById('snapshotMobileCashflow');
  const mobileYield = document.getElementById('snapshotMobileYield');
  const mobileDetails = document.getElementById('snapshotMobileDetails');
  const mobileToggle = document.getElementById('snapshotMobileToggle');
  const mobileReturnLabel = document.getElementById('snapshotMobileReturnLabel');
  const mobileReturnItem = document.getElementById('snapshotMobileReturnItem');
  let mobileExpanded = false;
  let breakdownOpen = false;
  let lastReturnValue = '';
  let lastPurchaseType = selectedPurchaseType;
  let pulseTimeout = null;

  function triggerPulse() {
    if (!mobileReturnItem) return;
    mobileReturnItem.classList.remove('snapshot-pulse');
    void mobileReturnItem.offsetWidth;
    mobileReturnItem.classList.add('snapshot-pulse');
  }

  const fieldLabels = { address: 'Address / Postcode', price: 'Asking Price', rent: 'Expected Monthly Rent' };

  function renderSnapshot() {
    try {
    if (currentMode === 'sdlt') {
      snapshotEl.style.display = 'none';
      mobileBar.classList.remove('visible');
      if (typeof syncBarPadding === 'function') syncBarPadding();
      return;
    }

    const snap = computeSnapshot();
    snapshotEl.style.display = '';

    if (snap.missing.length > 0 && snap.missing.includes('price') && snap.missing.includes('rent')) {
      const warningItems = snap.missing.map(k => `<span class="snapshot-missing-field" data-field="${k}">${fieldLabels[k]}</span>`).join(', ');
      const warnDealRef = document.getElementById('dealReference') ? document.getElementById('dealReference').value.trim() : '';
    snapshotEl.innerHTML = `<div class="snapshot-card snapshot-card-warning">
        <div class="snapshot-header-row">
          <div>
            <h2 class="snapshot-title">Deal Snapshot</h2>
            ${warnDealRef ? '<div class="snapshot-deal-ref">' + escHtml(warnDealRef) + '</div>' : ''}
          </div>
        </div>
        <div class="snapshot-warning">Enter ${warningItems} to see live totals</div>
      </div>`;
      mobileBar.classList.remove('visible');
      if (typeof syncBarPadding === 'function') syncBarPadding();
      snapshotEl.querySelectorAll('.snapshot-missing-field').forEach(el => {
        el.addEventListener('click', () => scrollToSnapshotField(el.dataset.field));
      });
      return;
    }

    const b = snap.breakdown;
    const cashflowClass = snap.monthlyCashflow >= 0 ? 'snapshot-positive' : 'snapshot-negative';
    const cashflowSign = snap.monthlyCashflow >= 0 ? '+' : '';

    const isSimpleSnap = currentMode === 'simple';
    const targetYieldSnap = isSimpleSnap ? 6.0 : (parseFloat(document.getElementById('targetYield').value) || 7.0);
    const yieldThresholdSnap = isSimpleSnap ? 6.0 : targetYieldSnap;
    let yieldColorClass;
    let yieldInlineColor = '';
    if (snap.netYield >= yieldThresholdSnap) {
      yieldColorClass = 'snapshot-yield-good';
    } else if (snap.netYield >= yieldThresholdSnap * 0.5) {
      const ratio = (snap.netYield - yieldThresholdSnap * 0.5) / (yieldThresholdSnap * 0.5);
      const r = Math.round(192 + (26 - 192) * ratio);
      const g = Math.round(57 + (140 - 57) * ratio);
      const bv = Math.round(43 + (58 - 43) * ratio);
      yieldColorClass = '';
      yieldInlineColor = `color:rgb(${r},${g},${bv})`;
    } else {
      yieldColorClass = 'snapshot-yield-bad';
    }

    let breakdownHtml = '';
    if (b.isMortgage) {
      breakdownHtml += `<div class="snapshot-breakdown-row"><span>Deposit</span><span>${fmt(b.deposit)}</span></div>`;
    } else {
      breakdownHtml += `<div class="snapshot-breakdown-row"><span>Purchase Price</span><span>${fmt(b.price)}</span></div>`;
    }
    breakdownHtml += `<div class="snapshot-breakdown-row"><span>SDLT</span><span>${fmt(b.sdlt)}</span></div>`;
    if (b.solicitorFees > 0) breakdownHtml += `<div class="snapshot-breakdown-row"><span>Solicitor Fees</span><span>${fmt(b.solicitorFees)}</span></div>`;
    if (b.additionalCosts > 0) breakdownHtml += `<div class="snapshot-breakdown-row"><span>Additional Costs <span class="snapshot-hint">(electrics, decorating, carpets etc)</span></span><span>${fmt(b.additionalCosts)}</span></div>`;
    if (b.isMortgage && b.mortgageAmount > 0) breakdownHtml += `<div class="snapshot-breakdown-row snapshot-breakdown-highlight"><span>Mortgage Amount</span><span>${fmt(b.mortgageAmount)}</span></div>`;

    breakdownHtml += `<div class="snapshot-breakdown-divider"></div>`;
    breakdownHtml += `<div class="snapshot-breakdown-row"><span>Rent</span><span>${fmt(b.effectiveMonthlyRent)}/mo</span></div>`;
    if (b.lettingAgentFee > 0) breakdownHtml += `<div class="snapshot-breakdown-row"><span>Agent Fee</span><span>-${fmt(b.lettingAgentFee)}/mo</span></div>`;
    if (b.baseRunningCosts > 0) breakdownHtml += `<div class="snapshot-breakdown-row"><span>Running Costs</span><span>-${fmt(b.baseRunningCosts)}/mo</span></div>`;
    if (b.maintenanceMonthly > 0) breakdownHtml += `<div class="snapshot-breakdown-row"><span>Maintenance</span><span>-${fmt(Math.round(b.maintenanceMonthly))}/mo</span></div>`;
    if (b.mortgagePayment > 0) breakdownHtml += `<div class="snapshot-breakdown-row"><span>Mortgage</span><span>-${fmt(Math.round(b.mortgagePayment))}/mo</span></div>`;

    breakdownHtml += `<div class="snapshot-breakdown-divider"></div>`;
    breakdownHtml += `<div class="snapshot-breakdown-row"><span>Net Yield (Asset)</span><span>${snap.netYield.toFixed(2)}%</span></div>`;
    if (b.isMortgage) {
      breakdownHtml += `<div class="snapshot-breakdown-row"><span>Cash-on-Cash</span><span>${snap.cashOnCash.toFixed(2)}%</span></div>`;
    }

    const benchmarkVal = parseFloat(localStorage.getItem('rm_benchmark_yield'));
    let benchmarkHtml = '';
    if (Number.isFinite(benchmarkVal)) {
      const delta = snap.netYield - benchmarkVal;
      const deltaClass = delta >= 0 ? 'benchmark-positive' : 'benchmark-negative';
      const deltaSign = delta >= 0 ? '+' : '';
      benchmarkHtml = '<div class="benchmark-line"><span class="benchmark-label">Benchmark: ' + benchmarkVal.toFixed(1) + '%</span> <span class="benchmark-delta ' + deltaClass + '">(' + String.fromCharCode(916) + ' ' + deltaSign + delta.toFixed(1) + '%)</span></div>';
    }
    benchmarkHtml += '<div class="benchmark-link-row"><a href="#" class="benchmark-set-link" onclick="event.preventDefault();toggleBenchmarkInput();">' + (Number.isFinite(benchmarkVal) ? 'Edit benchmark' : 'Set benchmark') + '</a></div>';
    benchmarkHtml += '<div class="benchmark-input-row" id="benchmarkInputRow" style="display:none;"><input type="number" step="0.1" min="0" max="30" id="benchmarkYieldInput" placeholder="e.g. 7.0" value="' + (Number.isFinite(benchmarkVal) ? benchmarkVal : '') + '"><button type="button" onclick="saveBenchmark()">Save</button><button type="button" onclick="clearBenchmark()">Clear</button></div>';

    let desktopYieldMetrics = `
      <div class="snapshot-total-item">
        <span class="snapshot-total-label">Net Yield (Asset) <span class="tooltip" data-tip="Net Yield (Asset) = (Annual rent – operating costs) ÷ purchase price. Excludes mortgage.">?</span></span>
        <span class="snapshot-total-value snapshot-yield-primary ${yieldColorClass}" style="${yieldInlineColor}">${snap.netYield.toFixed(1)}%</span>
        ${benchmarkHtml}
      </div>`;

    if (b.isMortgage) {
      const cocClass = snap.cashOnCash >= 0 ? 'snapshot-positive' : 'snapshot-negative';
      desktopYieldMetrics += `
      <div class="snapshot-total-item">
        <span class="snapshot-total-label">Cash-on-Cash <span class="tooltip" data-tip="Cash-on-Cash = annual cashflow after mortgage ÷ cash invested. Changes with leverage.">?</span></span>
        <span class="snapshot-total-value ${cocClass}">${snap.cashOnCash.toFixed(1)}%</span>
      </div>`;
    }

    const snapDealRef = document.getElementById('dealReference') ? document.getElementById('dealReference').value.trim() : '';
    snapshotEl.innerHTML = `<div class="snapshot-card">
      <div class="snapshot-header-row">
        <div>
          <h2 class="snapshot-title">Deal Snapshot</h2>
          ${snapDealRef ? '<div class="snapshot-deal-ref">' + escHtml(snapDealRef) + '</div>' : ''}
        </div>
        <button type="button" class="btn-capture-snapshot" onclick="captureSnapshot()" title="Download snapshot as image">Capture Snapshot</button>
      </div>
      <div class="snapshot-totals">
        <div class="snapshot-total-item">
          <span class="snapshot-total-label">Upfront Total</span>
          <span class="snapshot-total-value snapshot-upfront-value">${fmt(Math.round(snap.upfrontTotal))}</span>
        </div>
        <div class="snapshot-total-item">
          <span class="snapshot-total-label">Monthly Cashflow <span class="tooltip" data-tip="Monthly rent minus operating costs (agent, running costs, maintenance, voids) and mortgage payment.">?</span></span>
          <span class="snapshot-total-value ${cashflowClass}">${cashflowSign}${fmt(Math.round(snap.monthlyCashflow))}/mo</span>
        </div>
        ${desktopYieldMetrics}
      </div>
      <details class="snapshot-details"${breakdownOpen ? ' open' : ''}>
        <summary>Breakdown</summary>
        <div class="snapshot-breakdown">${breakdownHtml}</div>
      </details>
    </div>`;

    snapshotEl.querySelector('.snapshot-details').addEventListener('toggle', function() {
      breakdownOpen = this.open;
    });

    mobileBar.classList.add('visible');
    if (typeof syncBarPadding === 'function') syncBarPadding();
    mobileUpfront.textContent = fmt(Math.round(snap.upfrontTotal));
    const mCfSign = snap.monthlyCashflow >= 0 ? '+' : '';
    mobileCashflow.textContent = mCfSign + fmt(Math.round(snap.monthlyCashflow)) + '/mo';
    mobileCashflow.className = cashflowClass;

    const isSimple = currentMode === 'simple';
    const targetYieldVal = isSimple ? 6.0 : (parseFloat(document.getElementById('targetYield').value) || 7.0);
    const yieldThreshold = isSimple ? 6.0 : targetYieldVal;

    const isMortgageSnap = snap.breakdown.isMortgage;
    if (isMortgageSnap) {
      mobileReturnLabel.textContent = 'Cash-on-Cash';
      const cocVal = snap.cashOnCash.toFixed(1) + '%';
      mobileYield.textContent = cocVal;
      mobileYield.style.color = '';
      mobileYield.className = snap.cashOnCash >= 0 ? 'snapshot-positive' : 'snapshot-negative';
    } else {
      mobileReturnLabel.textContent = 'Net Yield';
      mobileYield.textContent = snap.netYield.toFixed(1) + '%';
      if (snap.netYield >= yieldThreshold) {
        mobileYield.style.color = '';
        mobileYield.className = 'snapshot-yield-good';
      } else if (snap.netYield >= yieldThreshold * 0.5) {
        const ratio = (snap.netYield - yieldThreshold * 0.5) / (yieldThreshold * 0.5);
        const r = Math.round(192 + (26 - 192) * ratio);
        const g = Math.round(57 + (140 - 57) * ratio);
        const bv = Math.round(43 + (58 - 43) * ratio);
        mobileYield.className = '';
        mobileYield.style.color = `rgb(${r},${g},${bv})`;
      } else {
        mobileYield.style.color = '';
        mobileYield.className = 'snapshot-yield-bad';
      }
    }

    mobileDetails.innerHTML = breakdownHtml;

    const currentReturnValue = isMortgageSnap ? snap.cashOnCash.toFixed(1) : snap.netYield.toFixed(1);
    const currentPurchaseType = selectedPurchaseType;

    if (currentPurchaseType !== lastPurchaseType) {
      triggerPulse();
      lastPurchaseType = currentPurchaseType;
    } else if (currentReturnValue !== lastReturnValue && lastReturnValue !== '') {
      clearTimeout(pulseTimeout);
      pulseTimeout = setTimeout(triggerPulse, 300);
    }
    lastReturnValue = currentReturnValue;
    } catch (renderErr) {
      console.error('Snapshot render error:', renderErr);
    }
  }

  function scrollToSnapshotField(field) {
    const idMap = { address: 'address', price: 'price', rent: 'monthlyRent' };
    const el = document.getElementById(idMap[field]);
    if (el) {
      scrollToFieldBelowHeader(el);
      el.focus();
    }
  }

  mobileToggle.addEventListener('click', () => {
    mobileExpanded = !mobileExpanded;
    mobileDetails.classList.toggle('expanded', mobileExpanded);
    mobileToggle.textContent = mobileExpanded ? 'Hide' : 'Details';
    mobileToggle.setAttribute('aria-expanded', mobileExpanded);
  });

  const inputIds = ['price', 'monthlyRent', 'solicitorFees', 'voidAllowance', 'maintenancePct', 'maintenanceFixed', 'lettingAgentFee', 'depositAmount', 'interestRate', 'mortgageTerm', 'address'];
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', renderSnapshot);
  });

  document.getElementById('lettingAgentVat').addEventListener('change', renderSnapshot);
  document.getElementById('showStressTest')?.addEventListener('change', renderSnapshot);

  document.querySelectorAll('.buyer-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderSnapshot, 0));
  });
  document.querySelectorAll('.purchase-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderSnapshot, 0));
  });
  document.querySelectorAll('.mortgage-type-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderSnapshot, 0));
  });
  document.querySelectorAll('.maint-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderSnapshot, 0));
  });
  document.querySelectorAll('.deposit-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(renderSnapshot, 0));
  });

  const costContainers = ['costItemsList', 'simpleCostItemsList', 'runningCostItemsList', 'simpleRunningCostItemsList'];
  costContainers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', renderSnapshot);
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-item')) setTimeout(renderSnapshot, 0);
      });
    }
  });

  ['addCostItem', 'addSimpleRunningCostItem', 'addRunningCostItem'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => setTimeout(renderSnapshot, 50));
  });

  const isMobileWidth = () => window.innerWidth < 992;

  function syncBarPadding() {
    const siteHeader = document.getElementById('siteHeader');
    if (!isMobileWidth() || !mobileBar.classList.contains('visible')) {
      document.body.style.paddingTop = '';
      if (siteHeader) siteHeader.classList.remove('snapshot-active');
      return;
    }
    const barH = mobileBar.offsetHeight || 0;
    document.body.style.paddingTop = barH + 'px';
    if (siteHeader) siteHeader.classList.add('snapshot-active');
  }

  syncBarPadding();
  window.addEventListener('resize', syncBarPadding);
  if (window.ResizeObserver) {
    new ResizeObserver(syncBarPadding).observe(mobileBar);
  }

  let scrollTimer = null;
  document.addEventListener('focusin', (e) => {
    if (!isMobileWidth()) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      clearTimeout(scrollTimer);
      const targetEl = e.target;
      scrollTimer = setTimeout(() => {
        if (document.activeElement !== targetEl) return;
        const barH = mobileBar.classList.contains('visible') ? (mobileBar.offsetHeight || 0) : 0;
        const hdr = document.querySelector('header');
        const hdrBottom = hdr ? Math.max(0, hdr.getBoundingClientRect().bottom) : 0;
        const topOffset = Math.max(barH, hdrBottom + barH) + 12;
        const rect = targetEl.getBoundingClientRect();
        if (rect.top < topOffset) {
          window.scrollBy({ top: rect.top - topOffset, behavior: 'smooth' });
        }
      }, 350);
    }
  });

  window.updateSnapshot = renderSnapshot;
  renderSnapshot();
  } catch (err) {
    console.error('Deal Snapshot init error:', err);
  }
})();

