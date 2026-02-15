const form = document.getElementById('dealForm');
const resultsPanel = document.getElementById('resultsPanel');
const costItemsList = document.getElementById('costItemsList');
const addCostItemBtn = document.getElementById('addCostItem');
const costItemsTotalEl = document.getElementById('costItemsTotal');
const mapSection = document.getElementById('mapSection');
const mapContainer = document.getElementById('mapContainer');

let costItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }, { label: '', amount: 0 }];
let runningCostItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }];
let map = null;
let marker = null;
let selectedLocation = null;

const CURRENCY_FIELDS = ['price', 'monthlyRent', 'solicitorFees', 'depositAmount', 'maintenanceFixed'];

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
  });
});

function getSelectedBuyerType() {
  return selectedBuyerType;
}

document.getElementById('mortgageCalcBtn').addEventListener('click', async () => {
  const price = getCurrencyFieldValue('price');
  const deposit = getCurrencyFieldValue('depositAmount') || 0;
  const solicitorFees = getCurrencyFieldValue('solicitorFees') || 1500;
  const summary = document.getElementById('borrowingSummary');

  if (!price || price <= 0) {
    summary.style.display = 'none';
    return;
  }

  document.getElementById('borrowingDeposit').textContent = fmt(deposit);
  document.getElementById('borrowingSolicitor').textContent = fmt(solicitorFees);

  try {
    const res = await fetch(`/api/sdlt?price=${price}`);
    const data = await res.json();
    const buyerType = getSelectedBuyerType();
    const sdlt = buyerType === 'ftb' ? data.ftb.total : data.additional.total;
    document.getElementById('borrowingSDLT').textContent = fmt(sdlt);
    const borrowed = Math.max(price - deposit + sdlt + solicitorFees, 0);
    document.getElementById('borrowingAmount').textContent = fmt(borrowed);
  } catch (e) {
    document.getElementById('borrowingSDLT').textContent = '-';
    const borrowed = Math.max(price - deposit + solicitorFees, 0);
    document.getElementById('borrowingAmount').textContent = fmt(borrowed);
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

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = async () => {
      console.log('Google Maps: script loaded');
      try {
        const placesLib = await google.maps.importLibrary('places');
        await google.maps.importLibrary('maps');
        console.log('Google Maps: libraries imported');
        console.log('Google Maps: AutocompleteSuggestion available:', !!placesLib.AutocompleteSuggestion);
        setupAutocomplete(placesLib);
      } catch (e) {
        console.error('Google Maps: failed to import libraries:', e);
      }
    };
    script.onerror = (e) => {
      console.error('Google Maps: script failed to load', e);
    };

    document.head.appendChild(script);
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
  const depositAmount = getCurrencyFieldValue('depositAmount') || 0;
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 4.5;
  const mortgageTerm = parseFloat(document.getElementById('mortgageTerm').value) || 25;
  const baseRunningCosts = getRunningCostItemsTotal();
  const lettingAgentFee = getLettingAgentFeeMonthly();
  const maintenanceMonthly = getMaintenanceAnnual() / 12;
  const runningCosts = baseRunningCosts + lettingAgentFee + maintenanceMonthly;
  const solicitorFees = getCurrencyFieldValue('solicitorFees');
  const refurbCosts = getCostItemsTotal();

  const mortgageAmount = Math.max(price - depositAmount, 0);
  const depositPct = price > 0 ? (depositAmount / price) * 100 : 0;
  const monthlyRate = (interestRate / 100) / 12;
  const totalMonths = mortgageTerm * 12;

  let monthlyPayment = 0;
  if (monthlyRate > 0 && totalMonths > 0 && mortgageAmount > 0) {
    monthlyPayment = mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  } else if (mortgageAmount > 0 && totalMonths > 0) {
    monthlyPayment = mortgageAmount / totalMonths;
  }

  const effectiveMonthlyRent = (data.effectiveAnnualRent || data.annualRent) / 12;
  const monthlyCashFlow = effectiveMonthlyRent - monthlyPayment - runningCosts;
  const annualCashFlow = monthlyCashFlow * 12;
  const totalCashInvested = depositAmount + data.sdlt + solicitorFees + refurbCosts;
  const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

  const stressRate = parseFloat(document.getElementById('stressTestRate').value) || 7.0;
  const stressMonthlyRate = (stressRate / 100) / 12;
  let stressMonthlyPayment = 0;
  if (stressMonthlyRate > 0 && totalMonths > 0 && mortgageAmount > 0) {
    stressMonthlyPayment = mortgageAmount * (stressMonthlyRate * Math.pow(1 + stressMonthlyRate, totalMonths)) / (Math.pow(1 + stressMonthlyRate, totalMonths) - 1);
  } else if (mortgageAmount > 0 && totalMonths > 0) {
    stressMonthlyPayment = mortgageAmount / totalMonths;
  }
  const stressMonthlyCashFlow = effectiveMonthlyRent - stressMonthlyPayment - runningCosts;

  return {
    depositPct,
    depositAmount,
    mortgageAmount,
    interestRate,
    mortgageTerm,
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
    const placeholders = ['e.g. Refurb / Repairs', 'e.g. Decorating', 'e.g. New Boiler'];
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

const runningCostItemsList = document.getElementById('runningCostItemsList');
const runningCostItemsTotalEl = document.getElementById('runningCostItemsTotal');
const addRunningCostItemBtn = document.getElementById('addRunningCostItem');

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
}

function updateRunningCostTotal() {
  runningCostItemsTotalEl.textContent = fmt(getRunningCostItemsTotal()) + '/mo';
}

addRunningCostItemBtn.addEventListener('click', () => {
  runningCostItems.push({ label: '', amount: 0 });
  renderRunningCostItems();
  const labels = runningCostItemsList.querySelectorAll('.cost-item-label');
  if (labels.length > 0) labels[labels.length - 1].focus();
});

renderRunningCostItems();

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
  let html = '';
  html += `<div class="result-row"><span class="label">Purchase Price</span><span class="value">${fmt(data.breakdown.price)}</span></div>`;
  html += `<div class="result-row"><span class="label">SDLT</span><span class="value">${fmt(data.breakdown.sdlt)}</span></div>`;
  html += `<div class="result-row"><span class="label">Solicitor Fees</span><span class="value">${fmt(data.breakdown.solicitorFees)}</span></div>`;

  if (data.breakdown.costItems && data.breakdown.costItems.length > 0) {
    for (const item of data.breakdown.costItems) {
      if (item.amount > 0) {
        html += `<div class="result-row"><span class="label">${escHtml(item.label || 'Cost item')}</span><span class="value">${fmt(item.amount)}</span></div>`;
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
    html += '<div class="result-section"><h3>Monthly Running Costs</h3>';
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
      html += `<div class="result-row"><span class="label">Mortgage Payment</span><span class="value">${fmt(mortgageMonthly)}/mo</span></div>`;
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
      <div class="result-row"><span class="label">Monthly Mortgage Payment</span><span class="value">${fmt(mortgage.monthlyPayment)}</span></div>
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

  return `
    ${renderDealRating(displayData.netYield, targetYield)}

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
      ${renderYieldGauge(displayData.netYield, targetYield)}
      <div class="yield-cards">
        <div class="yield-card">
          <div class="yield-label">Gross Yield <span class="tooltip" data-tip="Annual rent ÷ purchase price.">?</span></div>
          <div class="yield-value ${yieldClass(displayData.grossYield, targetYield)}">${fmtPct(displayData.grossYield)}</div>
        </div>
        <div class="yield-card">
          <div class="yield-label">${mortgage ? 'Net Yield (Cash-on-Cash)' : 'Net Yield'} <span class="tooltip" data-tip="Net annual rent ÷ total acquisition cost (purchase + SDLT + fees + costs).">?</span></div>
          <div class="yield-value ${yieldClass(displayData.netYield, targetYield)}">${fmtPct(displayData.netYield)}</div>
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
      ${(parseFloat(document.getElementById('voidAllowance').value) || 0) > 0 ? `<div class="result-row"><span class="label">Effective Annual Rent (after ${parseFloat(document.getElementById('voidAllowance').value) || 0}% void)</span><span class="value">${fmt(data.effectiveAnnualRent || data.annualRent)}</span></div>` : ''}
      ${mortgage ? `<div class="result-row"><span class="label">Annual Mortgage Cost</span><span class="value">${fmt(displayData.annualMortgageCost)}</span></div>` : ''}
      <div class="result-row"><span class="label">Net Annual Rent${mortgage ? ' (after mortgage)' : ''}</span><span class="value">${fmt(displayData.netAnnualRent)}</span></div>
      ${mortgage ? `<div class="result-row"><span class="label">Cash Invested</span><span class="value">${fmt(displayData.cashInvested)}</span></div>` : ''}
      <div class="result-row"><span class="label">Total Acquisition Cost</span><span class="value">${fmt(data.totalCost)}</span></div>
    </div>

    ${renderRunningCostsBreakdown()}

    ${mortgageHtml}

    ${mortgage ? renderRefinanceScenario(data.breakdown.price, mortgage) : ''}

    ${mortgage ? renderSection24(mortgage, data) : ''}
    ${renderCapitalGrowth(data.breakdown.price, mortgage)}

    ${document.getElementById('showTargetOffer').checked ? `
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
          <button type="button" class="btn-share" onclick="shareDeal()">Share</button>
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

  const totalAdditionalCosts = getCostItemsTotal();

  const lettingAgentFee = getLettingAgentFeeMonthly();
  const baseRunningCosts = getRunningCostItemsTotal() || 0;
  const maintenanceAnnual = getMaintenanceAnnual();
  const maintenanceMonthly = maintenanceAnnual / 12;
  const totalRunningCosts = baseRunningCosts + lettingAgentFee + maintenanceMonthly;

  const body = {
    price,
    monthlyRent,
    solicitorFees: getCurrencyFieldValue('solicitorFees') || 1500,
    refurbCosts: totalAdditionalCosts,
    otherCosts: 0,
    costItems: costItems.map(item => ({ label: item.label, amount: parseFloat(item.amount) || 0 })),
    voidPct: parseFloat(document.getElementById('voidAllowance').value) || 0,
    runningCosts: totalRunningCosts,
    targetYield: parseFloat(document.getElementById('targetYield').value) || 7.0,
    lettingAgentPct: getLettingAgentPct(),
    lettingAgentVat: document.getElementById('lettingAgentVat').checked,
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
    if (currentMode === 'analyser') {
      addToHistory(result);
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
  CURRENCY_FIELDS.forEach(id => {
    const input = document.getElementById(id);
    if (input) { input.dataset.rawValue = ''; input.value = ''; }
  });
  document.getElementById('solicitorFees').dataset.rawValue = '1500';
  document.getElementById('solicitorFees').value = formatCurrencyDisplay(1500);
  document.getElementById('voidAllowance').value = '5';
  document.getElementById('maintenancePct').value = '0';
  document.getElementById('maintenanceFixed').value = '';
  document.getElementById('maintenanceFixed').dataset.rawValue = '';
  maintenanceMode = 'pct';
  document.querySelectorAll('.maint-mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.maint-mode-btn[data-maint="pct"]').classList.add('active');
  document.getElementById('maintPctInput').style.display = '';
  document.getElementById('maintFixedInput').style.display = 'none';
  document.getElementById('targetYield').value = '7.0';
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
  document.getElementById('borrowingSummary').style.display = 'none';
  document.getElementById('dealReference').value = '';
  document.getElementById('showTargetOffer').checked = true;
  document.getElementById('targetYieldGroup').style.display = '';
  resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>';
  document.getElementById('savePdfBtn').style.display = 'none';
  document.getElementById('startAgainBtn').style.display = 'none';
  lastResult = null;
  lastMortgageData = null;
});

document.getElementById('showTargetOffer').addEventListener('change', function() {
  document.getElementById('targetYieldGroup').style.display = this.checked ? '' : 'none';
});

function printSDLTTable(breakdown) {
  if (!breakdown || !breakdown.bands || breakdown.bands.length === 0) {
    return '<p>No SDLT due</p>';
  }
  let html = '<table><thead><tr><th>Band</th><th>Rate</th><th>Tax</th></tr></thead><tbody>';
  for (const b of breakdown.bands) {
    html += `<tr><td>${fmt(b.from)} \u2013 ${fmt(b.to)}</td><td>${(b.rate * 100).toFixed(0)}%</td><td>${fmt(b.tax)}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function printDealRating(netYield, targetYield) {
  const rating = getDealRating(netYield, targetYield);
  return `
    <div class="print-deal-rating">
      <span class="print-deal-grade" style="color:${rating.color};">${rating.grade}</span>
      <span class="print-deal-label">${rating.label}</span>
      <span class="print-deal-detail">(Net yield ${fmtPct(netYield)} vs ${fmtPct(targetYield)} target)</span>
    </div>
  `;
}

function printMortgageSection(mortgage) {
  if (!mortgage) return '';
  const cfLabel = mortgage.cashFlowPositive ? 'Cash Flow Positive' : 'Cash Flow Negative';
  const stressCfLabel = mortgage.stressCashFlowPositive ? 'Cash Flow Positive at Stress Rate' : 'Cash Flow Negative at Stress Rate';
  return `
    <h4>Mortgage Analysis</h4>
    <table>
      <tbody>
        <tr><td>Deposit (${fmtPct(mortgage.depositPct)})</td><td>${fmt(mortgage.depositAmount)}</td></tr>
        <tr><td>Mortgage Amount</td><td>${fmt(mortgage.mortgageAmount)}</td></tr>
        <tr><td>Interest Rate</td><td>${mortgage.interestRate}%</td></tr>
        <tr><td>Term</td><td>${mortgage.mortgageTerm} years</td></tr>
        <tr><td>Monthly Mortgage Payment</td><td>${fmt(mortgage.monthlyPayment)}</td></tr>
        <tr><td>Monthly Cash Flow</td><td>${fmt(mortgage.monthlyCashFlow)}</td></tr>
        <tr><td>Annual Cash Flow</td><td>${fmt(mortgage.annualCashFlow)}</td></tr>
        <tr><td>Total Cash Invested</td><td>${fmt(mortgage.totalCashInvested)}</td></tr>
        <tr><td>Cash-on-Cash Return</td><td>${fmtPct(mortgage.cashOnCashReturn)}</td></tr>
        <tr><td>Payback Period</td><td>${mortgage.annualCashFlow > 0 ? (mortgage.totalCashInvested / mortgage.annualCashFlow).toFixed(1) + ' years' : 'N/A'}</td></tr>
        <tr><td colspan="2" style="padding-top:10px;font-weight:700;">Stress Test (${mortgage.stressRate}%)</td></tr>
        <tr><td>Monthly Payment at Stress Rate</td><td>${fmt(mortgage.stressMonthlyPayment)}</td></tr>
        <tr><td>Monthly Cash Flow at Stress Rate</td><td>${fmt(mortgage.stressMonthlyCashFlow)}</td></tr>
      </tbody>
    </table>
    <p><strong>${cfLabel}</strong></p>
    <p><strong>${stressCfLabel}</strong></p>
  `;
}

function printScenario(data, label, targetYield, mortgage) {
  const displayData = adjustYieldsForMortgage(data, mortgage);
  const offer = data.targetOffer;
  let offerText = '';
  if (offer && offer.achievable) {
    offerText = `<p><strong>Target Offer Price (for ${fmtPct(targetYield)} yield):</strong> ${fmt(offer.offerPrice)}</p>`;
  } else {
    offerText = `<p><strong>Target Offer Price (for ${fmtPct(targetYield)} yield):</strong> Not achievable with current inputs</p>`;
  }

  let costItemsHtml = '';
  if (data.breakdown.costItems && data.breakdown.costItems.length > 0) {
    for (const item of data.breakdown.costItems) {
      if (item.amount > 0) {
        costItemsHtml += `<tr><td>${escHtml(item.label || 'Cost item')}</td><td>${fmt(item.amount)}</td></tr>`;
      }
    }
  }

  return `
    <div class="print-scenario">
      <h3>${label}</h3>

      ${printDealRating(displayData.netYield, targetYield)}

      <h4>SDLT Breakdown</h4>
      ${printSDLTTable(data.sdltBreakdown)}
      <p class="print-total"><strong>Total SDLT:</strong> ${fmt(data.sdlt)}</p>

      <h4>Cost Breakdown</h4>
      <table>
        <tbody>
          <tr><td>Purchase Price</td><td>${fmt(data.breakdown.price)}</td></tr>
          <tr><td>SDLT</td><td>${fmt(data.breakdown.sdlt)}</td></tr>
          <tr><td>Solicitor Fees</td><td>${fmt(data.breakdown.solicitorFees)}</td></tr>
          ${costItemsHtml}
        </tbody>
        <tfoot><tr class="total-row"><td><strong>Total Acquisition Cost</strong></td><td><strong>${fmt(data.totalCost)}</strong></td></tr></tfoot>
      </table>

      <h4>Yield Analysis</h4>
      <table>
        <tbody>
          <tr><td>Annual Rent</td><td>${fmt(data.annualRent)}</td></tr>
          ${(parseFloat(document.getElementById('voidAllowance').value) || 0) > 0 ? `<tr><td>Effective Annual Rent (after ${parseFloat(document.getElementById('voidAllowance').value) || 0}% void)</td><td>${fmt(data.effectiveAnnualRent || data.annualRent)}</td></tr>` : ''}
          ${mortgage ? `<tr><td>Annual Mortgage Cost</td><td>${fmt(displayData.annualMortgageCost)}</td></tr>` : ''}
          <tr><td>Net Annual Rent${mortgage ? ' (after mortgage)' : ''}</td><td>${fmt(displayData.netAnnualRent)}</td></tr>
          <tr><td>Gross Yield</td><td>${fmtPct(displayData.grossYield)}</td></tr>
          <tr><td>${mortgage ? 'Net Yield (Cash-on-Cash)' : 'Net Yield'}</td><td>${fmtPct(displayData.netYield)}</td></tr>
          ${mortgage ? `<tr><td>Cash Invested</td><td>${fmt(displayData.cashInvested)}</td></tr>` : ''}
        </tbody>
      </table>

      ${printMortgageSection(mortgage)}

      ${mortgage ? '<p><em>Refinance scenario available in the interactive tool.</em></p>' : ''}

      ${mortgage ? '<p><em>Section 24 tax estimate available in the interactive tool.</em></p>' : ''}
      <p><em>Capital growth projection available in the interactive tool.</em></p>

      ${offerText}
    </div>
  `;
}

function printReport() {
  if (!lastResult) {
    alert('Please run a deal analysis first.');
    return;
  }

  const address = escHtml(document.getElementById('address').value || 'Not specified');
  const price = getCurrencyFieldValue('price');
  const monthlyRent = getCurrencyFieldValue('monthlyRent');
  const solicitorFees = getCurrencyFieldValue('solicitorFees');
  const runningCosts = getRunningCostItemsTotal();
  const targetYield = document.getElementById('targetYield').value;
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    + ' at ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const dateStr = now.getFullYear() + '-'
    + String(now.getMonth() + 1).padStart(2, '0') + '-'
    + String(now.getDate()).padStart(2, '0');
  const sanitisedAddress = address
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 40) || 'Property';
  const priceInt = Math.round(parseFloat(price) || 0);
  const suggestedFilename = `${sanitisedAddress}-${priceInt}-Deal-Report-${dateStr}.pdf`;

  let costItemsHtml = '';
  const activeCosts = costItems.filter(i => i.amount > 0);
  if (activeCosts.length > 0) {
    costItemsHtml = '<table><tbody>';
    activeCosts.forEach(item => {
      costItemsHtml += `<tr><td>${escHtml(item.label || 'Cost item')}</td><td>${fmt(item.amount)}</td></tr>`;
    });
    costItemsHtml += `</tbody><tfoot><tr class="total-row"><td><strong>Total Additional Costs</strong></td><td><strong>${fmt(getCostItemsTotal())}</strong></td></tr></tfoot></table>`;
  } else {
    costItemsHtml = '<p>None</p>';
  }

  const buyerType = getSelectedBuyerType();
  const selectedMortgage = lastMortgageData ? lastMortgageData[buyerType] : null;

  const lettingAgentPct = getLettingAgentPct();
  const lettingAgentVat = document.getElementById('lettingAgentVat').checked;
  const lettingAgentTotal = getLettingAgentFeeMonthly();

  let lettingAgentRow = '';
  if (lettingAgentPct > 0) {
    let label = `Letting Agent (${lettingAgentPct}%)`;
    if (lettingAgentVat) label += ' inc. VAT';
    lettingAgentRow = `<tr><td>${label}</td><td>${fmt(lettingAgentTotal)}/mo</td></tr>`;
  }

  const reportHtml = `
    <div class="print-header">
      <p class="print-filename">Suggested filename: ${suggestedFilename}</p>
      <h1>RentalMetrics &ndash; Property Deal Report</h1>
      <p class="print-date">Generated: ${timestamp}</p>
      <p class="print-address">${address}</p>
      ${(document.getElementById('dealReference').value || '') ? `<p class="print-deal-ref">${escHtml(document.getElementById('dealReference').value)}</p>` : ''}
    </div>

    <div class="print-section">
      <h2>Input Summary</h2>
      <table>
        <tbody>
          <tr><td>Asking Price</td><td>${fmt(price)}</td></tr>
          <tr><td>Expected Monthly Rent</td><td>${fmt(monthlyRent)}</td></tr>
          <tr><td>Solicitor Fees</td><td>${fmt(solicitorFees)}</td></tr>
          <tr><td>Void Allowance</td><td>${parseFloat(document.getElementById('voidAllowance').value) || 0}%</td></tr>
          ${runningCostItems.filter(i => (parseFloat(i.amount) || 0) > 0).map(i => `<tr><td>${escHtml(i.label || 'Running cost')}</td><td>${fmt(i.amount)}/mo</td></tr>`).join('')}
          ${runningCosts > 0 ? `<tr class="total-row"><td><strong>Total Monthly Running Costs</strong></td><td><strong>${fmt(runningCosts)}/mo</strong></td></tr>` : '<tr><td>Monthly Running Costs</td><td>None</td></tr>'}
          ${lettingAgentRow}
          ${getMaintenanceAnnual() > 0 ? `<tr><td>Maintenance Allowance</td><td>${maintenanceMode === 'pct' ? (parseFloat(document.getElementById('maintenancePct').value) || 0) + '% of rent' : fmt(getMaintenanceAnnual()) + '/yr'}</td></tr>` : ''}
          <tr><td>Target Yield</td><td>${targetYield}%</td></tr>
        </tbody>
      </table>

      <h4>Additional Costs</h4>
      ${costItemsHtml}
    </div>

    <div class="print-section">
      <h2>${buyerType === 'ftb' ? 'First-time Buyer' : 'Investor / Additional Property'}</h2>
      ${printScenario(buyerType === 'ftb' ? lastResult.ftb : lastResult.investor, buyerType === 'ftb' ? 'First-time Buyer' : 'Investor', lastResult.targetYield, selectedMortgage)}
    </div>

    <div class="print-disclaimer">
      <p><strong>Disclaimer:</strong> These calculations are estimates only and do not constitute financial or tax advice. SDLT rates and thresholds can change. Always consult a qualified professional before making investment decisions. This tool covers England & Northern Ireland only.</p>
    </div>
  `;

  document.getElementById('printReport').innerHTML = reportHtml;

  setTimeout(() => { window.print(); }, 100);
}

let currentMode = 'analyser';

function setMode(mode) {
  currentMode = mode;
  const btns = document.querySelectorAll('.mode-btn');
  btns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  const analyserEls = document.querySelectorAll('.analyser-only');
  const sdltEls = document.querySelectorAll('.sdlt-only');

  if (mode === 'sdlt') {
    document.body.classList.add('sdlt-mode');
    document.getElementById('monthlyRent').removeAttribute('required');
    resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter a price and click <strong>Calculate SDLT</strong> to see results.</p></div>';
  } else {
    document.body.classList.remove('sdlt-mode');
    document.getElementById('monthlyRent').setAttribute('required', '');
    resultsPanel.innerHTML = '<div class="results-placeholder"><p>Enter property details and click <strong>Analyse Deal</strong> to see results.</p></div>';
  }
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

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
    renderSDLTStandaloneResults(data, price);
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
  const targetYield = parseFloat(document.getElementById('targetYield').value) || 7.0;
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
    annualCashFlow: (result.investor.effectiveAnnualRent || result.investor.annualRent) - (getRunningCostItemsTotal() || 0) * 12 - getLettingAgentFeeMonthly() * 12 - getMaintenanceAnnual(),
    hasMortgage: selectedPurchaseType === 'mortgage',
    depositAmount: getCurrencyFieldValue('depositAmount') || 0,
    solicitorFees: getCurrencyFieldValue('solicitorFees') || 1500,
    refurbCosts: getCostItemsTotal(),
    voidPct: parseFloat(document.getElementById('voidAllowance').value) || 0,
    runningCosts: getRunningCostItemsTotal(),
    runningCostItems: runningCostItems.map(i => ({ label: i.label, amount: parseFloat(i.amount) || 0 })),
    lettingAgentPct: getLettingAgentPct(),
    lettingAgentVat: document.getElementById('lettingAgentVat').checked,
    buyerType: getSelectedBuyerType(),
    purchaseType: selectedPurchaseType,
    maintenanceMode: maintenanceMode,
    maintenancePct: parseFloat(document.getElementById('maintenancePct').value) || 0,
    maintenanceFixed: parseFloat(document.getElementById('maintenanceFixed').value) || 0,
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

  if (entry.refurbCosts !== undefined && entry.refurbCosts > 0) {
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
  const ratingOrder = { 'A+': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'F': 5 };
  
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

window.openCompare = openCompare;
window.closeCompare = closeCompare;
window.renderCompareTable = renderCompareTable;

function shareDeal() {
  const price = getCurrencyFieldValue('price');
  const rent = getCurrencyFieldValue('monthlyRent');
  const sol = getCurrencyFieldValue('solicitorFees');
  const refurb = getCostItemsTotal();
  const running = getRunningCostItemsTotal();
  const target = parseFloat(document.getElementById('targetYield').value) || 7;
  const addr = document.getElementById('address').value || '';

  const agentPct = getLettingAgentPct();
  const agentVat = document.getElementById('lettingAgentVat').checked;

  const voidPct = parseFloat(document.getElementById('voidAllowance').value) || 0;
  const maintMode = maintenanceMode;
  const maintPct = parseFloat(document.getElementById('maintenancePct').value) || 0;
  const maintFixed = parseFloat(document.getElementById('maintenanceFixed').value) || 0;

  const dealRef = document.getElementById('dealReference').value || '';

  const params = new URLSearchParams();
  if (price) params.set('price', price);
  if (rent) params.set('rent', rent);
  if (sol) params.set('sol', sol);
  if (refurb) params.set('refurb', refurb);
  if (running) params.set('running', running);
  if (agentPct) params.set('agentpct', agentPct);
  if (agentVat) params.set('agentvat', '1');
  if (voidPct) params.set('void', voidPct);
  if (maintMode === 'fixed') params.set('maintmode', 'fixed');
  if (maintPct) params.set('maintpct', maintPct);
  if (maintFixed) params.set('maintfixed', maintFixed);
  params.set('target', target);
  if (addr) params.set('addr', addr);
  if (dealRef) params.set('ref', dealRef);
  params.set('buyer', getSelectedBuyerType());
  params.set('purchase', selectedPurchaseType);

  const url = window.location.origin + window.location.pathname + '?' + params.toString();

  navigator.clipboard.writeText(url).then(() => {
    const btn = document.querySelector('.btn-share');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 2000);
    }
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    const btn = document.querySelector('.btn-share');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('copied');
      }, 2000);
    }
  });
}

function initDarkMode() {
  const toggle = document.getElementById('darkModeToggle');
  const saved = localStorage.getItem('darkMode');

  if (saved === null || saved === 'true') {
    document.body.classList.add('dark');
    toggle.innerHTML = '&#9728;';
  }

  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    toggle.innerHTML = isDark ? '&#9728;' : '&#9790;';
  });
}

initDarkMode();

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
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

  if (params.has('refurb')) {
    const refurb = parseFloat(params.get('refurb'));
    if (refurb > 0) {
      costItems = [{ label: '', amount: refurb }, { label: '', amount: 0 }, { label: '', amount: 0 }];
      renderCostItems();
    }
  }


  if (params.has('running')) {
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
    document.getElementById('voidAllowance').value = parseFloat(params.get('void')) || 5;
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

  window.history.replaceState({}, '', window.location.pathname);

  setTimeout(() => runCalculation(), 300);
}

checkUrlParams();

