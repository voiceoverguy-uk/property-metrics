const form = document.getElementById('dealForm');
const resultsPanel = document.getElementById('resultsPanel');
const costItemsList = document.getElementById('costItemsList');
const addCostItemBtn = document.getElementById('addCostItem');
const costItemsTotalEl = document.getElementById('costItemsTotal');
const mapSection = document.getElementById('mapSection');
const mapContainer = document.getElementById('mapContainer');

let costItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }, { label: '', amount: 0 }];
let simpleCostItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }];
let runningCostItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }];
let map = null;
let marker = null;
let selectedLocation = null;
let currentMode = 'simple';
let lastSdltData = null;
let lastSdltPrice = null;

const routeToMode = { '/': 'simple', '/deal-analyser': 'analyser', '/sdlt-calculator': 'sdlt' };
const modeToRoute = { 'simple': '/', 'analyser': '/deal-analyser', 'sdlt': '/sdlt-calculator' };
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
    description: 'Free UK Stamp Duty calculator for investors, additional properties and first-time buyers. Accurate SDLT estimates in seconds.',
    h1: 'Stamp Duty Calculator UK (SDLT)',
    subheading: 'Instantly calculate Stamp Duty for investors, additional properties and first-time buyers.'
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
    { q: 'What are the current SDLT rates in England?', a: 'For standard purchases the rates are 0% up to \u00a3250,000, 5% from \u00a3250,001 to \u00a3925,000, 10% from \u00a3925,001 to \u00a31.5 million, and 12% above \u00a31.5 million. These bands apply in England and Northern Ireland. Scotland and Wales have their own separate land transaction taxes with different thresholds.' },
    { q: 'What is the additional property SDLT surcharge?', a: 'Since April 2025, buyers purchasing an additional residential property in England or Northern Ireland pay a 5% surcharge on top of standard SDLT rates. This applies to buy-to-let investments and second homes. The surcharge is calculated on the entire purchase price and significantly increases the total tax bill on investment properties.' },
    { q: 'Do first-time buyers pay less Stamp Duty?', a: 'Yes, first-time buyers in England and Northern Ireland benefit from SDLT relief. They pay 0% on the first \u00a3425,000 and 5% on the portion from \u00a3425,001 to \u00a3625,000. If the property costs more than \u00a3625,000, the relief is lost entirely and standard rates apply to the full price.' },
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
  const url = 'https://rentalmetrics.co.uk' + modeToRoute[mode];
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
    resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter a price and click <strong>Calculate SDLT</strong> to see results.</p></div>';
  } else if (mode === 'simple') {
    document.body.classList.add('simple-mode');
    document.getElementById('monthlyRent').setAttribute('required', '');
    resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>';
  } else {
    document.body.classList.add('deal-mode');
    document.getElementById('monthlyRent').setAttribute('required', '');
    resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>';
  }
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

function initCurrencyFormatting() {
  CURRENCY_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.setAttribute('type', 'text');
    input.setAttribute('inputmode', 'numeric');
    const raw = input.value;
    if (raw) {
      input.dataset.rawValue = raw;
      input.value = formatCurrencyDisplay(raw);
    }

    input.addEventListener('focus', () => {
      const rv = input.dataset.rawValue || '';
      input.value = rv;
    });

    input.addEventListener('blur', () => {
      const num = parseCurrencyValue(input.value);
      input.dataset.rawValue = num || '';
      input.value = num ? formatCurrencyDisplay(num) : '';
    });
  });
}

function applyCurrencyToCostAmount(input) {
  input.setAttribute('type', 'text');
  input.setAttribute('inputmode', 'numeric');

  input.addEventListener('focus', () => {
    const rv = input.dataset.rawValue || '';
    input.value = rv;
  });

  input.addEventListener('blur', () => {
    const num = parseCurrencyValue(input.value);
    input.dataset.rawValue = num || '';
    input.value = num ? formatCurrencyDisplay(num) : '';
    const idx = parseInt(input.dataset.index);
    costItems[idx].amount = num;
    updateCostTotal();
  });
}

function applyCurrencyToRunningCostAmount(input) {
  input.setAttribute('type', 'text');
  input.setAttribute('inputmode', 'numeric');

  input.addEventListener('focus', () => {
    const rv = input.dataset.rawValue || '';
    input.value = rv;
  });

  input.addEventListener('blur', () => {
    const num = parseCurrencyValue(input.value);
    input.dataset.rawValue = num || '';
    input.value = num ? formatCurrencyDisplay(num) : '';
    const idx = parseInt(input.dataset.index);
    runningCostItems[idx].amount = num;
    updateRunningCostTotal();
  });
}

function getCurrencyFieldValue(id) {
  const input = document.getElementById(id);
  if (!input) return 0;
  return parseCurrencyValue(input.dataset.rawValue || input.value);
}

let selectedPurchaseType = 'cash';
let depositInputMode = 'pounds';
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

document.querySelectorAll('.deposit-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.deposit-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    depositInputMode = btn.dataset.depositMode;
    updateDepositHelperText();
  });
});

document.querySelectorAll('.mortgage-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mortgage-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mortgageType = btn.dataset.mortgageType;
  });
});

function updateDepositHelperText() {
  const helperEl = document.getElementById('depositHelperText');
  if (!helperEl) return;
  const price = getCurrencyFieldValue('price');
  const depositInput = document.getElementById('depositAmount');
  const rawVal = parseFloat(depositInput.value) || 0;

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
  const rawVal = parseFloat(document.getElementById('depositAmount').value) || 0;
  if (depositInputMode === 'pct') {
    const clampedPct = Math.min(Math.max(rawVal, 0), 100);
    return Math.round(price * (clampedPct / 100));
  }
  return Math.min(rawVal, price || Infinity);
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

document.getElementById('depositAmount').addEventListener('input', updateDepositHelperText);
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
  document.getElementById('borrowingDeposit').textContent = fmt(deposit);
  document.getElementById('borrowingSolicitor').textContent = fmt(solicitorFees);
  document.getElementById('borrowingMortgage').textContent = fmt(mortgageAmt);
  solicitorRow.style.display = isSimple ? 'none' : '';
  console.log('Mortgage Calc Debug:', { purchasePrice: price, deposit: deposit, calculatedMortgageAmount: mortgageAmt });

  try {
    const res = await fetch(`/api/sdlt?price=${price}`);
    const data = await res.json();
    const buyerType = getSelectedBuyerType();
    const sdlt = buyerType === 'ftb' ? data.ftb.total : data.additional.total;
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

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0.00%';
  return n.toFixed(2) + '%';
}

function yieldClass(yieldVal, targetYield) {
  const diff = yieldVal - targetYield;
  if (Math.abs(diff) <= 0.2) return 'yield-near';
  if (diff >= 0) return 'yield-good';
  return 'yield-below';
}

function getDealRating(netYield, targetYield) {
  const diff = parseFloat(netYield) - parseFloat(targetYield);
  if (diff >= 3) return { grade: 'A+', label: 'Excellent Deal', color: '#0a7a2e' };
  if (diff >= 1.5) return { grade: 'A', label: 'Great Deal', color: '#1a9a4a' };
  if (diff >= 0.5) return { grade: 'B', label: 'Good Deal', color: '#0d7377' };
  if (diff >= 0) return { grade: 'B-', label: 'On Target', color: '#2e8b57' };
  if (diff >= -1) return { grade: 'C', label: 'Below Target', color: '#b8860b' };
  if (diff >= -2) return { grade: 'D', label: 'Poor Deal', color: '#cc5500' };
  return { grade: 'F', label: 'Avoid', color: '#B11217' };
}

function calculateMortgage(price, data) {
  const depositAmount = getDepositAmount();
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 4.5;
  const mortgageTerm = parseFloat(document.getElementById('mortgageTerm').value) || 25;
  const isSimple = currentMode === 'simple';
  const baseRunningCosts = getRunningCostItemsTotal();
  const lettingAgentFee = isSimple ? 0 : getLettingAgentFeeMonthly();
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
    const placeholders = ['e.g. Refurb / Repairs', 'e.g. Decorating', 'e.g. Electrics'];
    const placeholder = placeholders[index] || 'e.g. Cost item';
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
  const placeholders = ['e.g. Solicitor Fees', 'e.g. Electrics'];
  simpleCostItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cost-item-row';
    const placeholder = placeholders[index] || 'e.g. Cost item';
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
    const placeholders = ['e.g. Insurance', 'e.g. Ground Rent'];
    const placeholder = placeholders[index] || 'e.g. Service charge';
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
    const placeholders = ['e.g. Insurance', 'e.g. Ground Rent'];
    const placeholder = placeholders[index] || 'e.g. Service charge';
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
  let mortgageMonthly = 0;
  if (lastMortgageData) {
    const buyerType = getSelectedBuyerType();
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
  const rating = getDealRating(netYield, targetYield);
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
      <div class="result-row"><span class="label">Monthly Mortgage Payment <span class="mortgage-type-label">(${mortgage.mortgageType === 'interest-only' ? 'Interest Only' : 'Repayment'})</span></span><span class="value">${fmt(mortgage.monthlyPayment)}/mo</span></div>
      <div class="result-row"><span class="label">Monthly Cash Flow <span class="tooltip" data-tip="Monthly rent minus monthly costs (and mortgage if used).">?</span></span><span class="value ${cfClass}">${fmt(mortgage.monthlyCashFlow)}</span></div>
      <div class="result-row"><span class="label">Cash-on-Cash Return</span><span class="value">${fmtPct(mortgage.cashOnCashReturn)}</span></div>
      <div class="result-row"><span class="label">Cash Invested <span class="tooltip" data-tip="Deposit + buying costs + any refurb/extra costs.">?</span></span><span class="value">${fmt(mortgage.totalCashInvested)}</span></div>
      <div class="cash-flow-indicator ${cfClass}">${cfLabel}</div>
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
        <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="11" fill="#777">Net Yield</text>
      </svg>
    </div>
  `;
}

function renderSDLTComparison(investorSDLT, ftbSDLT) {
  const maxSDLT = Math.max(investorSDLT, ftbSDLT, 1);
  const investorPct = (investorSDLT / maxSDLT) * 100;
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
        <span class="sdlt-bar-label">FTB</span>
        <div class="sdlt-bar-track">
          <div class="sdlt-bar-fill sdlt-bar-ftb" style="width:${Math.max(ftbPct, 2)}%"></div>
        </div>
        <span class="sdlt-bar-amount">${fmt(ftbSDLT)}</span>
      </div>
    </div>
  `;
}

function adjustYieldsForMortgage(data, mortgage) {
  if (!mortgage) return data;
  const totalCashInvested = mortgage.totalCashInvested;
  if (totalCashInvested <= 0) return data;
  const annualMortgageCost = mortgage.monthlyPayment * 12;
  const netAnnualRent = data.netAnnualRent - annualMortgageCost;
  const netYield = (netAnnualRent / totalCashInvested) * 100;
  return {
    ...data,
    netYield: Math.round(netYield * 100) / 100,
    netAnnualRent: Math.round(netAnnualRent * 100) / 100,
    cashInvested: totalCashInvested,
    annualMortgageCost: Math.round(annualMortgageCost * 100) / 100,
    mortgageAdjusted: true,
  };
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

function renderSection24(mortgage, data) {
  if (!mortgage) return '';
  return `
    <div class="result-section collapsible-section">
      <h3 class="collapsible-header" onclick="toggleSection24()">
        Section 24 Tax Estimate
        <span class="tooltip" data-tip="Simplified estimate. Does not replace professional tax advice.">?</span>
        <span class="collapsible-arrow" id="s24Arrow">&#9660;</span>
      </h3>
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
  const effectiveRent = (lastResult[buyerType === 'ftb' ? 'ftb' : 'investor'].effectiveAnnualRent) || (lastResult[buyerType === 'ftb' ? 'ftb' : 'investor'].annualRent);
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
        <div class="cg-projection-equity">Equity: ${fmt(Math.round(eq5))}</div>
      </div>
      <div class="cg-projection-card">
        <div class="cg-projection-period">10 Years</div>
        <div class="cg-projection-value">${fmt(Math.round(val10))}</div>
        <div class="cg-projection-equity">Equity: ${fmt(Math.round(eq10))}</div>
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
  const displayData = adjustYieldsForMortgage(data, mortgage);
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

  const yieldNote = mortgage
    ? `<div class="yield-basis-note">Net yield based on ${fmt(mortgage.totalCashInvested)} cash invested (after mortgage costs)</div>`
    : '';

  const voidPct = isSimple ? 0 : (parseFloat(document.getElementById('voidAllowance').value) || 0);

  return `
    ${isSimple ? '' : renderDealRating(displayData.netYield, targetYield)}

    <div class="result-section">
      <h3>SDLT \u2014 ${label}</h3>
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
          <div class="yield-label">${mortgage ? 'Net Yield (Cash-on-Cash)' : 'Net Yield'} <span class="tooltip" data-tip="Net annual rent ÷ total acquisition cost (purchase + SDLT + fees + costs).">?</span></div>
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
      ${mortgage ? `<div class="result-row"><span class="label">Annual Mortgage Cost</span><span class="value">${fmt(displayData.annualMortgageCost)}</span></div>` : ''}
      <div class="result-row"><span class="label">Net Annual Rent${mortgage ? ' (after mortgage)' : ''}</span><span class="value">${fmt(displayData.netAnnualRent)}</span></div>
      ${mortgage ? `<div class="result-row"><span class="label">Cash Invested</span><span class="value">${fmt(displayData.cashInvested)}</span></div>` : ''}
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

    ${!isSimple && document.getElementById('showTargetOffer').checked ? `
    <div class="result-section">
      <h3>Target Offer Price</h3>
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

  const data = buyerType === 'ftb' ? result.ftb : result.investor;
  const label = buyerType === 'ftb' ? 'First-time Buyer' : 'Investor / Additional Property';

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

  resultsPanel.innerHTML = html;
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
    lettingAgentFee = 0;
    baseRunningCosts = getRunningCostItemsTotal();
    maintenanceAnnual = 0;
    maintenanceMonthly = 0;
    totalRunningCosts = baseRunningCosts;
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
    lettingAgentPct: isSimple ? 0 : getLettingAgentPct(),
    lettingAgentVat: isSimple ? false : document.getElementById('lettingAgentVat').checked,
    simpleMode: isSimple,
  };

  resultsPanel.innerHTML = '<div class="results-placeholder"><p>Calculating...</p></div>';

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
    resultsPanel.innerHTML = `<div class="results-placeholder"><p style="color:#B11217;">Error: ${err.message}</p></div>`;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
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
  document.getElementById('targetYield').value = '';
  document.getElementById('interestRate').value = '4.5';
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
  document.getElementById('showTargetOffer').checked = false;
  document.getElementById('targetYieldGroup').style.display = 'none';
  document.getElementById('showStressTest').checked = false;
  document.getElementById('stressTestInput').style.display = 'none';
  resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>';
  document.getElementById('savePdfBtn').style.display = 'none';
  document.getElementById('startAgainBtn').style.display = 'none';
  lastResult = null;
  lastMortgageData = null;
});

document.getElementById('showTargetOffer').addEventListener('change', function() {
  document.getElementById('targetYieldGroup').style.display = this.checked ? '' : 'none';
});

document.getElementById('showStressTest').addEventListener('change', function() {
  document.getElementById('stressTestInput').style.display = this.checked ? '' : 'none';
});

function safeStr(v) { return v == null ? '' : String(v); }

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
    y += 20;
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
    pdf.text('Net Yield', cx, cy + 3, { align: 'center' });
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
    const scenarioData = buyerType === 'ftb' ? lastResult.ftb : lastResult.investor;
    if (!scenarioData || !scenarioData.breakdown) {
      alert('Deal data is incomplete. Please run the analysis again.');
      if (btn) { btn.textContent = origText; btn.disabled = false; }
      return;
    }
    const selectedMortgage = lastMortgageData ? lastMortgageData[buyerType] : null;
    const displayData = adjustYieldsForMortgage(scenarioData, selectedMortgage);
    const rating = getDealRating(displayData.netYield, parseFloat(targetYield));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const h = pdfHelper(pdf, { top: 15, bottom: 15, left: 15, right: 15 });

    h.title('RentalMetrics \u2013 Property Deal Report');
    h.subtitle('Generated: ' + timestamp);
    h.gap(2);
    h.textLine(address, { size: 11, bold: true, align: 'center' });
    if (dealRef) h.textLine(dealRef, { size: 10, bold: true, align: 'center' });
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

    h.heading(buyerType === 'ftb' ? 'First-time Buyer' : 'Investor / Additional Property');
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
        cells: [fmt(b.from) + ' \u2013 ' + fmt(b.to), (b.rate * 100).toFixed(0) + '%', fmt(b.tax)]
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
      h.textLine('Net yield based on ' + fmt(displayData.cashInvested) + ' cash invested (after mortgage costs)', { size: 9, align: 'center', color: '#555555' });
    }
    h.gap(2);
    if (!isSimplePdf) {
      h.yieldGauge(displayData.netYield, parseFloat(targetYield));
      h.gap(4);
    }

    const yieldCardData = [
      { label: 'Gross Yield', value: fmtPct(displayData.grossYield), color: '#333333' },
      { label: selectedMortgage ? 'Net Yield (Cash-on-Cash)' : 'Net Yield', value: fmtPct(displayData.netYield), color: isSimplePdf ? '#333333' : (displayData.netYield >= parseFloat(targetYield) ? '#0a7a2e' : '#B11217') },
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
    if (selectedMortgage) {
      yieldRows.push({ cells: ['Annual Mortgage Cost', fmt(displayData.annualMortgageCost)] });
    }
    yieldRows.push({ cells: ['Net Annual Rent' + (selectedMortgage ? ' (after mortgage)' : ''), fmt(displayData.netAnnualRent)] });
    if (selectedMortgage) {
      yieldRows.push({ cells: ['Cash Invested', fmt(displayData.cashInvested)] });
    }
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
        const cfLabel = selectedMortgage.cashFlowPositive ? 'Cash Flow Positive' : 'Cash Flow Negative';
        const stressCfLabel = selectedMortgage.stressCashFlowPositive ? 'Cash Flow Positive at Stress Rate' : 'Cash Flow Negative at Stress Rate';
        h.textLine(cfLabel, { bold: true, color: selectedMortgage.cashFlowPositive ? '#0a7a2e' : '#B11217' });
        h.textLine(stressCfLabel, { bold: true, color: selectedMortgage.stressCashFlowPositive ? '#0a7a2e' : '#B11217' });
      }
      h.gap(3);
    }

    if (!isSimplePdf) {
      const offer = scenarioData.targetOffer;
      if (offer && offer.achievable) {
        h.textLine('Target Offer Price (for ' + fmtPct(parseFloat(targetYield)) + ' yield): ' + fmt(offer.offerPrice), { bold: true });
      } else {
        h.textLine('Target Offer Price (for ' + fmtPct(parseFloat(targetYield)) + ' yield): Not achievable with current inputs', { bold: true });
      }

      h.gap(4);
      h.textLine('Capital growth projection available in the interactive tool.', { italic: true, size: 8, color: '#666666' });
      if (selectedMortgage) {
        h.textLine('Refinance scenario available in the interactive tool.', { italic: true, size: 8, color: '#666666' });
        h.textLine('Section 24 tax estimate available in the interactive tool.', { italic: true, size: 8, color: '#666666' });
      }
    }

    h.disclaimer('Disclaimer: These calculations are estimates only and do not constitute financial or tax advice. SDLT rates and thresholds can change. Always consult a qualified professional before making investment decisions. This tool covers England & Northern Ireland only.');

    safePdfDownload(pdf, filename);
  } catch (err) {
    console.error('PDF generation failed:', err, err.stack);
    alert('PDF generation failed: ' + (err.message || err) + '\nPlease try again.');
  } finally {
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

  const sdltLabel = buyerType === 'ftb' ? 'First-time Buyer' : 'Additional Property';
  const sdltData = buyerType === 'ftb' ? data.ftb : data.additional;

  const html = `
    <div class="results-content">
      <div class="results-header-row">
        <div>
          <h2>SDLT Calculation</h2>
          <p class="sdlt-rates-note">Rates correct as of January 2026</p>
          <p class="address-line">${escHtml(address)} — ${fmt(price)}</p>
        </div>
        <div class="results-header-buttons">
          <button type="button" class="btn-share" onclick="shareSDLT(this)">Share</button>
        </div>
      </div>

      ${renderSDLTSection(sdltLabel, sdltData)}
    </div>
  `;

  resultsPanel.innerHTML = html;
}

document.getElementById('sdltCalcBtn').addEventListener('click', async () => {
  const price = getCurrencyFieldValue('price');
  if (!price || price <= 0) {
    alert('Please enter a valid asking price.');
    return;
  }
  resultsPanel.innerHTML = '<div class="results-placeholder"><p>Calculating...</p></div>';
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
    if (window.innerWidth <= 860) {
      setTimeout(() => {
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  } catch (err) {
    resultsPanel.innerHTML = `<div class="results-placeholder"><p style="color:#B11217;">Error: ${err.message}</p></div>`;
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
  const investorRating = getDealRating(result.investor.netYield, targetYield);
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
    investorSDLT: result.investor.sdlt,
    ftbSDLT: result.ftb.sdlt,
    investorRating: investorRating.grade,
    investorGrossYield: result.investor.grossYield,
    ftbGrossYield: result.ftb.grossYield,
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
    lettingAgentPct: isSimple ? 0 : getLettingAgentPct(),
    lettingAgentVat: isSimple ? false : document.getElementById('lettingAgentVat').checked,
    buyerType: getSelectedBuyerType(),
    purchaseType: selectedPurchaseType,
    maintenanceMode: isSimple ? 'pct' : maintenanceMode,
    maintenancePct: isSimple ? 0 : (parseFloat(document.getElementById('maintenancePct').value) || 0),
    maintenanceFixed: isSimple ? 0 : (parseFloat(document.getElementById('maintenanceFixed').value) || 0),
    mode: currentMode,
    date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  };

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

  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No saved analyses yet. Run a deal analysis to see it here.</div>';
    if (section) {
      const h2 = section.querySelector('h2');
      if (h2) h2.innerHTML = 'Comparison History';
    }
    return;
  }

  if (section) {
    const h2 = section.querySelector('h2');
    if (h2) h2.innerHTML = 'Comparison History ' + (history.length >= 2 ? '<button type="button" class="btn-compare-deals" onclick="openCompare()">Compare Deals</button> ' : '') + '<button type="button" class="btn-clear-history" onclick="clearHistory()">Clear All</button>';
  }

  let html = '';
  history.forEach(entry => {
    const rating = getDealRating(entry.investorNetYield, entry.targetYield);
    const displayAddress = escHtml(entry.address || 'No address');
    const displayRef = entry.dealReference ? escHtml(entry.dealReference) : '';
    html += `
      <div class="history-card" onclick="loadHistoryItem(${entry.id})">
        <div class="history-card-grade" style="background:${rating.color};">${rating.grade}</div>
        <div class="history-card-info">
          <div class="history-card-address">${displayAddress}${displayRef ? ` <span class="history-card-ref">— ${displayRef}</span>` : ''}</div>
          <div class="history-card-details">${fmt(entry.price)} &middot; Net ${fmtPct(entry.investorNetYield)} &middot; ${entry.date}</div>
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

function openCompare() {
  const history = getHistory();
  if (history.length < 2) return;
  document.getElementById('compareOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  renderCompareTable();
}

function closeCompare() {
  document.getElementById('compareOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function renderCompareTable() {
  const history = getHistory();
  if (history.length === 0) return;
  
  const sortBy = document.getElementById('compareSortBy').value;
  const ratingOrder = { 'A+': 0, 'A': 1, 'B': 2, 'B-': 2.5, 'C': 3, 'D': 4, 'F': 5 };
  
  const entries = history.map(entry => {
    const isFtb = entry.buyerType === 'ftb';
    const netYield = isFtb ? (entry.ftbNetYield || entry.investorNetYield) : entry.investorNetYield;
    const sdlt = isFtb ? (entry.ftbSDLT || entry.investorSDLT) : entry.investorSDLT;
    const rating = getDealRating(netYield, entry.targetYield);

    const annualRent = entry.monthlyRent * 12;
    const effectiveAnnualRent = annualRent * (1 - (entry.voidPct || 0) / 100);
    const grossYield = isFtb
      ? (entry.ftbGrossYield || (entry.price > 0 ? (effectiveAnnualRent / entry.price) * 100 : 0))
      : (entry.investorGrossYield || (entry.price > 0 ? (effectiveAnnualRent / entry.price) * 100 : 0));

    const lettingPct = entry.lettingAgentPct || 0;
    let lettingMonthly = entry.monthlyRent * (lettingPct / 100);
    if (entry.lettingAgentVat) lettingMonthly *= 1.2;
    const maintenanceAnnual = entry.maintenanceMode === 'fixed'
      ? (entry.maintenanceFixed || 0)
      : effectiveAnnualRent * ((entry.maintenancePct || 0) / 100);
    const annualCashFlow = effectiveAnnualRent - (entry.runningCosts || 0) * 12 - lettingMonthly * 12 - maintenanceAnnual;

    return {
      ...entry,
      displayNetYield: netYield,
      displaySdlt: sdlt,
      rating,
      grossYieldCalc: Math.round(grossYield * 100) / 100,
      cashFlow: Math.round(annualCashFlow),
      ratingSort: ratingOrder[rating.grade] !== undefined ? ratingOrder[rating.grade] : 6
    };
  });
  
  entries.sort((a, b) => {
    switch (sortBy) {
      case 'rating': return a.ratingSort - b.ratingSort || b.displayNetYield - a.displayNetYield;
      case 'netYield': return b.displayNetYield - a.displayNetYield;
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
    const bestBadge = rank === 1 ? '<span class="best-deal-badge">Best Deal</span>' : '';
    const cashFlowClass = entry.cashFlow >= 0 ? 'compare-positive' : 'compare-negative';
    
    html += `
      <div class="compare-card ${rank === 1 ? 'compare-card-best' : ''}">
        <div class="compare-rank ${rankClass}">#${rank}</div>
        <div class="compare-card-header">
          <div class="compare-card-grade" style="background:${entry.rating.color};">${entry.rating.grade}</div>
          <div class="compare-card-title">
            <div class="compare-card-address">${escHtml(entry.address || 'No address')}${entry.dealReference ? ` <span class="compare-card-ref">— ${escHtml(entry.dealReference)}</span>` : ''}</div>
            <div class="compare-card-label">${entry.rating.label} ${bestBadge}</div>
          </div>
        </div>
        <div class="compare-card-metrics">
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
            <span class="compare-metric-label">Net Yield</span>
            <span class="compare-metric-value compare-highlight">${fmtPct(entry.displayNetYield)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">Cash Flow / yr</span>
            <span class="compare-metric-value ${cashFlowClass}">${fmt(entry.cashFlow)}</span>
          </div>
          <div class="compare-metric">
            <span class="compare-metric-label">SDLT</span>
            <span class="compare-metric-value">${fmt(entry.displaySdlt)}</span>
          </div>
        </div>
        <div class="compare-card-footer">
          <span class="compare-card-buyer">${entry.buyerType === 'ftb' ? 'First-Time Buyer' : 'Investor'}</span>
          <span class="compare-card-date">${entry.date}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  document.getElementById('compareBody').innerHTML = html;
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
    const ratingOrder = { 'A+': 0, 'A': 1, 'B': 2, 'B-': 2.5, 'C': 3, 'D': 4, 'F': 5 };

    const entries = history.map(entry => {
      const isFtb = entry.buyerType === 'ftb';
      const netYield = isFtb ? (entry.ftbNetYield || entry.investorNetYield) : entry.investorNetYield;
      const sdlt = isFtb ? (entry.ftbSDLT || entry.investorSDLT) : entry.investorSDLT;
      const rating = getDealRating(netYield, entry.targetYield);
      const annualRent = entry.monthlyRent * 12;
      const effectiveAnnualRent = annualRent * (1 - (entry.voidPct || 0) / 100);
      const grossYield = isFtb
        ? (entry.ftbGrossYield || (entry.price > 0 ? (effectiveAnnualRent / entry.price) * 100 : 0))
        : (entry.investorGrossYield || (entry.price > 0 ? (effectiveAnnualRent / entry.price) * 100 : 0));
      const lettingPct = entry.lettingAgentPct || 0;
      let lettingMonthly = entry.monthlyRent * (lettingPct / 100);
      if (entry.lettingAgentVat) lettingMonthly *= 1.2;
      const maintenanceAnnual = entry.maintenanceMode === 'fixed'
        ? (entry.maintenanceFixed || 0)
        : effectiveAnnualRent * ((entry.maintenancePct || 0) / 100);
      const annualCashFlow = effectiveAnnualRent - (entry.runningCosts || 0) * 12 - lettingMonthly * 12 - maintenanceAnnual;
      return { ...entry, displayNetYield: netYield, displaySdlt: sdlt, rating, grossYieldCalc: Math.round(grossYield * 100) / 100, cashFlow: Math.round(annualCashFlow), ratingSort: ratingOrder[rating.grade] !== undefined ? ratingOrder[rating.grade] : 6 };
    });

    entries.sort((a, b) => {
      switch (sortBy) {
        case 'rating': return a.ratingSort - b.ratingSort || b.displayNetYield - a.displayNetYield;
        case 'netYield': return b.displayNetYield - a.displayNetYield;
        case 'grossYield': return b.grossYieldCalc - a.grossYieldCalc;
        case 'price': return a.price - b.price;
        case 'rent': return b.monthlyRent - a.monthlyRent;
        default: return 0;
      }
    });

    const now = new Date();
    const timestamp = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const sortLabel = sortBy === 'rating' ? 'Deal Rating' : sortBy === 'netYield' ? 'Net Yield' : sortBy === 'grossYield' ? 'Gross Yield' : sortBy === 'price' ? 'Price' : 'Rent';

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const h = pdfHelper(pdf, { top: 15, bottom: 15, left: 10, right: 10 });

    h.title('RentalMetrics \u2013 Deal Comparison');
    h.subtitle('Generated: ' + timestamp);
    h.textLine(entries.length + ' deals compared \u00b7 Sorted by ' + sortLabel, { size: 9, align: 'center', color: '#333333' });
    h.gap(2);
    pdf.setDrawColor(...h.hexToRgb('#B11217'));
    pdf.setLineWidth(0.8);
    pdf.line(h.margins.left, h.getY(), h.margins.left + h.contentW, h.getY());
    h.gap(6);

    const headers = ['Rank', 'Grade', 'Property', 'Ref', 'Price', 'Rent/mo', 'Gross', 'Net', 'Cash Flow/yr', 'SDLT', 'Type'];
    const fixedW = 13 + 14 + 30 + 24 + 22 + 16 + 16 + 26 + 22 + 16;
    const colW = [13, 14, h.contentW - fixedW, 30, 24, 22, 16, 16, 26, 22, 16];
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
      const prop = e.address || 'No address';
      const ref = e.dealReference || '';
      const cashColor = e.cashFlow >= 0 ? [10, 122, 46] : [177, 18, 23];

      pdf.setFontSize(8);
      const propLines = pdf.splitTextToSize(prop, colW[2] - 2);
      pdf.setFontSize(7);
      const refLines = ref ? pdf.splitTextToSize(ref, colW[3] - 2) : [];
      const maxTextLines = Math.max(propLines.length, refLines.length);
      const dynRowH = Math.max(rowH, maxTextLines * 4 + 4);
      h.checkPage(dynRowH + 2);

      const textY = h.getY();
      const textMid = textY - 1.4;

      let cx = h.margins.left + 2;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      pdf.text(rank, cx, textY);
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

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      refLines.forEach((line, li) => {
        pdf.text(line, cx, textY + li * 3.5);
      });
      pdf.setTextColor(0, 0, 0);
      cx += colW[3];

      pdf.setFontSize(8);
      pdf.text(fmt(e.price), cx, textY);
      cx += colW[4];

      pdf.text(fmt(e.monthlyRent), cx, textY);
      cx += colW[5];

      pdf.text(fmtPct(e.grossYieldCalc), cx, textY);
      cx += colW[6];

      pdf.setFont('helvetica', 'bold');
      pdf.text(fmtPct(e.displayNetYield), cx, textY);
      cx += colW[7];

      pdf.setTextColor(...cashColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(fmt(e.cashFlow), cx, textY);
      cx += colW[8];

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(fmt(e.displaySdlt), cx, textY);
      cx += colW[9];

      pdf.text(e.buyerType === 'ftb' ? 'FTB' : 'Investor', cx, textY);

      h.setY(textY + dynRowH - 4);
      pdf.setDrawColor(230, 230, 230);
      pdf.setLineWidth(0.15);
      pdf.line(h.margins.left, h.getY(), h.margins.left + h.contentW, h.getY());
      h.setY(h.getY() + 2);
    });

    h.gap(6);
    h.disclaimer('Disclaimer: These calculations are estimates only and do not constitute financial or tax advice. Always consult a qualified professional before making investment decisions.');

    const compTimeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const filename = 'RentalMetrics-Deal-Comparison-' + dateStr + '-' + compTimeStr + '.pdf';
    safePdfDownload(pdf, filename);
  } catch (err) {
    console.error('Compare PDF generation failed:', err, err.stack);
    alert('PDF generation failed: ' + (err.message || err) + '\nPlease try again.');
  } finally {
    if (pdfBtn) { pdfBtn.textContent = origText; pdfBtn.disabled = false; }
  }
}

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

  const agentPct = isSimple ? 0 : getLettingAgentPct();
  const agentVat = isSimple ? false : document.getElementById('lettingAgentVat').checked;

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
    setMode('simple', false);
  }
})();

checkUrlParams();

