const form = document.getElementById('dealForm');
const resultsPanel = document.getElementById('resultsPanel');
const costItemsList = document.getElementById('costItemsList');
const addCostItemBtn = document.getElementById('addCostItem');
const costItemsTotalEl = document.getElementById('costItemsTotal');
const mapSection = document.getElementById('mapSection');
const mapContainer = document.getElementById('mapContainer');

let costItems = [{ label: '', amount: 0 }, { label: '', amount: 0 }, { label: '', amount: 0 }];
let map = null;
let marker = null;
let selectedLocation = null;

const CURRENCY_FIELDS = ['price', 'monthlyRent', 'solicitorFees', 'runningCosts', 'depositAmount'];

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

function getCurrencyFieldValue(id) {
  const input = document.getElementById(id);
  if (!input) return 0;
  return parseCurrencyValue(input.dataset.rawValue || input.value);
}

function syncMortgageInputsVisibility() {
  const checked = document.getElementById('includeMortgage').checked;
  document.getElementById('mortgageInputs').style.display = checked ? '' : 'none';
}

document.getElementById('mortgageToggle').addEventListener('click', function(e) {
  if (e.target.classList.contains('tooltip')) return;
  const fields = document.getElementById('mortgageFields');
  const arrow = this.querySelector('.mortgage-arrow');
  const isOpen = this.classList.contains('open');
  this.classList.toggle('open');
  fields.style.display = isOpen ? 'none' : '';
  if (arrow) arrow.innerHTML = isOpen ? '&#9654;' : '&#9660;';
  if (!isOpen) syncMortgageInputsVisibility();
});

document.getElementById('includeMortgage').addEventListener('change', syncMortgageInputsVisibility);

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

  console.log('Google Maps: autocomplete ready (new API)');

  addressInput.addEventListener('input', () => {
    const query = addressInput.value.trim();
    if (query.length < 3) {
      dropdown.style.display = 'none';
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

  function renderDropdown(suggestions) {
    dropdown.innerHTML = '';
    suggestions.forEach((suggestion) => {
      const pred = suggestion.placePrediction;
      if (!pred) return;

      const item = document.createElement('div');
      item.className = 'address-dropdown-item';
      item.textContent = pred.text.text;
      item.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        addressInput.value = pred.text.text;
        dropdown.style.display = 'none';

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
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = '';
  }

  addressInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
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
  const diff = netYield - targetYield;
  if (diff >= 3) return { grade: 'A+', label: 'Excellent Deal', color: '#0a7a2e' };
  if (diff >= 1.5) return { grade: 'A', label: 'Good Deal', color: '#1a9a4a' };
  if (diff >= 0.5) return { grade: 'B', label: 'Fair Deal', color: '#0d7377' };
  if (diff >= -0.5) return { grade: 'C', label: 'Below Target', color: '#b8860b' };
  if (diff >= -2) return { grade: 'D', label: 'Poor Deal', color: '#cc5500' };
  return { grade: 'F', label: 'Avoid', color: '#d42027' };
}

function calculateMortgage(price, data) {
  const depositAmount = getCurrencyFieldValue('depositAmount') || 0;
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 4.5;
  const mortgageTerm = parseFloat(document.getElementById('mortgageTerm').value) || 25;
  const baseRunningCosts = getCurrencyFieldValue('runningCosts');
  const lettingAgentFee = getLettingAgentFeeMonthly();
  const runningCosts = baseRunningCosts + lettingAgentFee;
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

  const monthlyRent = data.annualRent / 12;
  const monthlyCashFlow = monthlyRent - monthlyPayment - runningCosts;
  const annualCashFlow = monthlyCashFlow * 12;
  const totalCashInvested = depositAmount + data.sdlt + solicitorFees + refurbCosts;
  const cashOnCashReturn = totalCashInvested > 0 ? (annualCashFlow / totalCashInvested) * 100 : 0;

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
  const baseRunning = getCurrencyFieldValue('runningCosts');
  const agentPct = getLettingAgentPct();
  const vatChecked = document.getElementById('lettingAgentVat').checked;
  const agentFeeTotal = getLettingAgentFeeMonthly();
  const totalMonthly = baseRunning + agentFeeTotal;

  const monthlyRent = getCurrencyFieldValue('monthlyRent');

  let html = '';
  if (baseRunning > 0 || agentPct > 0) {
    html += '<div class="result-section"><h3>Monthly Running Costs</h3>';
    html += `<div class="result-row"><span class="label">Monthly Rent</span><span class="value">${fmt(monthlyRent)}/mo</span></div>`;
    if (baseRunning > 0) {
      html += `<div class="result-row"><span class="label">Other Running Costs</span><span class="value">${fmt(baseRunning)}/mo</span></div>`;
    }
    if (agentPct > 0) {
      let agentLabel = `Letting Agent (${agentPct}%)`;
      if (vatChecked) agentLabel += ' inc. VAT';
      html += `<div class="result-row"><span class="label">${agentLabel}</span><span class="value">${fmt(agentFeeTotal)}/mo</span></div>`;
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
  return `
    <div class="result-section">
      <h3>Mortgage Analysis</h3>
      <div class="result-row"><span class="label">Deposit (${fmtPct(mortgage.depositPct)})</span><span class="value">${fmt(mortgage.depositAmount)}</span></div>
      <div class="result-row"><span class="label">Mortgage Amount</span><span class="value">${fmt(mortgage.mortgageAmount)}</span></div>
      <div class="result-row"><span class="label">Monthly Mortgage Payment</span><span class="value">${fmt(mortgage.monthlyPayment)}</span></div>
      <div class="result-row"><span class="label">Monthly Cash Flow</span><span class="value ${cfClass}">${fmt(mortgage.monthlyCashFlow)}</span></div>
      <div class="result-row"><span class="label">Cash-on-Cash Return</span><span class="value">${fmtPct(mortgage.cashOnCashReturn)}</span></div>
      <div class="result-row"><span class="label">Total Cash Invested</span><span class="value">${fmt(mortgage.totalCashInvested)}</span></div>
      <div class="cash-flow-indicator ${cfClass}">${cfLabel}</div>
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
  const largeArc = fillPct > 0.5 ? 1 : 0;
  const fillPath = fillPct > 0 ? `M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}` : '';

  let fillColor = '#d42027';
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
  const grossYield = (data.annualRent / totalCashInvested) * 100;
  const annualMortgageCost = mortgage.monthlyPayment * 12;
  const netAnnualRent = data.netAnnualRent - annualMortgageCost;
  const netYield = (netAnnualRent / totalCashInvested) * 100;
  return {
    ...data,
    grossYield: Math.round(grossYield * 100) / 100,
    netYield: Math.round(netYield * 100) / 100,
    netAnnualRent: Math.round(netAnnualRent * 100) / 100,
    totalCost: totalCashInvested,
    mortgageAdjusted: true,
  };
}

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

  const yieldBasis = mortgage ? 'Cash Invested' : 'Total Cost';
  const yieldNote = mortgage
    ? `<div class="yield-basis-note">Yields based on ${fmt(mortgage.totalCashInvested)} cash invested (incl. mortgage costs)</div>`
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
          <div class="yield-label">Gross Yield</div>
          <div class="yield-value ${yieldClass(displayData.grossYield, targetYield)}">${fmtPct(displayData.grossYield)}</div>
        </div>
        <div class="yield-card">
          <div class="yield-label">Net Yield</div>
          <div class="yield-value ${yieldClass(displayData.netYield, targetYield)}">${fmtPct(displayData.netYield)}</div>
        </div>
      </div>
      <div class="result-row"><span class="label">Annual Rent</span><span class="value">${fmt(data.annualRent)}</span></div>
      <div class="result-row"><span class="label">Net Annual Rent${mortgage ? ' (after mortgage)' : ''}</span><span class="value">${fmt(displayData.netAnnualRent)}</span></div>
      ${mortgage ? `<div class="result-row"><span class="label">Annual Mortgage Cost</span><span class="value">${fmt(mortgage.monthlyPayment * 12)}</span></div>` : ''}
      <div class="result-row"><span class="label">${yieldBasis}</span><span class="value">${fmt(displayData.totalCost)}</span></div>
    </div>

    ${renderRunningCostsBreakdown()}

    ${mortgageHtml}

    <div class="result-section">
      <h3>Target Offer Price</h3>
      ${offerHtml}
    </div>
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
  const includeMortgage = document.getElementById('includeMortgage').checked;

  let investorMortgage = null;
  let ftbMortgage = null;

  if (includeMortgage) {
    investorMortgage = calculateMortgage(price, result.investor);
    ftbMortgage = calculateMortgage(price, result.ftb);
    lastMortgageData = { investor: investorMortgage, ftb: ftbMortgage };
  } else {
    lastMortgageData = null;
  }

  document.getElementById('savePdfBtn').style.display = '';

  const html = `
    <div class="results-content">
      <div class="results-header-row">
        <div>
          <h2>Deal Analysis</h2>
          <p class="address-line">${address}</p>
        </div>
        <div class="results-header-buttons">
          <button type="button" class="btn-share" onclick="shareDeal()">Share</button>
          <button type="button" class="btn-save-pdf-inline" onclick="printReport()">Save as PDF</button>
        </div>
      </div>

      ${renderSDLTComparison(result.investor.sdlt, result.ftb.sdlt)}

      <div class="scenario-tabs">
        <div class="scenario-tab active" data-view="comparison">Both Scenarios</div>
        <div class="scenario-tab" data-view="investor">Investor Only</div>
        <div class="scenario-tab" data-view="ftb">First-time Buyer Only</div>
      </div>

      <div id="view-comparison" class="view-content">
        <div class="comparison-grid">
          <div class="comparison-col">
            <h4>Investor / Additional Property</h4>
            ${renderScenario(result.investor, 'Investor', targetYield, investorMortgage)}
          </div>
          <div class="comparison-col">
            <h4>First-time Buyer</h4>
            ${renderScenario(result.ftb, 'First-time Buyer', targetYield, ftbMortgage)}
          </div>
        </div>
      </div>

      <div id="view-investor" class="view-content" style="display:none;">
        ${renderScenario(result.investor, 'Investor / Additional Property', targetYield, investorMortgage)}
      </div>

      <div id="view-ftb" class="view-content" style="display:none;">
        ${renderScenario(result.ftb, 'First-time Buyer', targetYield, ftbMortgage)}
      </div>
    </div>
  `;

  resultsPanel.innerHTML = html;

  const tabs = resultsPanel.querySelectorAll('.scenario-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.getAttribute('data-view');
      document.getElementById('view-comparison').style.display = view === 'comparison' ? '' : 'none';
      document.getElementById('view-investor').style.display = view === 'investor' ? '' : 'none';
      document.getElementById('view-ftb').style.display = view === 'ftb' ? '' : 'none';
    });
  });
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
  const baseRunningCosts = getCurrencyFieldValue('runningCosts') || 0;
  const totalRunningCosts = baseRunningCosts + lettingAgentFee;

  const body = {
    price,
    monthlyRent,
    solicitorFees: getCurrencyFieldValue('solicitorFees') || 1500,
    refurbCosts: totalAdditionalCosts,
    otherCosts: 0,
    costItems: costItems.map(item => ({ label: item.label, amount: parseFloat(item.amount) || 0 })),
    voidMonths: 0,
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
    resultsPanel.innerHTML = `<div class="results-placeholder"><p style="color:#d42027;">Error: ${err.message}</p></div>`;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runCalculation();
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
      </tbody>
    </table>
    <p><strong>${cfLabel}</strong></p>
  `;
}

function printScenario(data, label, targetYield, mortgage) {
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

      ${printDealRating(data.netYield, targetYield)}

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
          <tr><td>Net Annual Rent</td><td>${fmt(data.netAnnualRent)}</td></tr>
          <tr><td>Gross Yield</td><td>${fmtPct(data.grossYield)}</td></tr>
          <tr><td>Net Yield</td><td>${fmtPct(data.netYield)}</td></tr>
        </tbody>
      </table>

      ${printMortgageSection(mortgage)}

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
  const runningCosts = getCurrencyFieldValue('runningCosts');
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

  const investorMortgage = lastMortgageData ? lastMortgageData.investor : null;
  const ftbMortgage = lastMortgageData ? lastMortgageData.ftb : null;

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
    </div>

    <div class="print-section">
      <h2>Input Summary</h2>
      <table>
        <tbody>
          <tr><td>Asking Price</td><td>${fmt(price)}</td></tr>
          <tr><td>Expected Monthly Rent</td><td>${fmt(monthlyRent)}</td></tr>
          <tr><td>Solicitor Fees</td><td>${fmt(solicitorFees)}</td></tr>
          <tr><td>Monthly Running Costs</td><td>${fmt(runningCosts)}</td></tr>
          ${lettingAgentRow}
          <tr><td>Target Yield</td><td>${targetYield}%</td></tr>
        </tbody>
      </table>

      <h4>Additional Costs</h4>
      ${costItemsHtml}
    </div>

    <div class="print-section">
      <h2>Investor / Additional Property</h2>
      ${printScenario(lastResult.investor, 'Investor', lastResult.targetYield, investorMortgage)}
    </div>

    <div class="print-section">
      <h2>First-time Buyer</h2>
      ${printScenario(lastResult.ftb, 'First-time Buyer', lastResult.targetYield, ftbMortgage)}
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

  const maxSDLT = Math.max(data.additional.total, data.standard.total, data.ftb.total, 1);

  const html = `
    <div class="results-content">
      <div class="results-header-row">
        <div>
          <h2>SDLT Calculation</h2>
          <p class="address-line">${address} — ${fmt(price)}</p>
        </div>
      </div>

      <div class="sdlt-comparison-chart">
        <h3>SDLT Comparison</h3>
        <div class="sdlt-bar-row">
          <span class="sdlt-bar-label">Additional</span>
          <div class="sdlt-bar-track">
            <div class="sdlt-bar-fill sdlt-bar-investor" style="width:${Math.max((data.additional.total / maxSDLT) * 100, 2)}%"></div>
          </div>
          <span class="sdlt-bar-amount">${fmt(data.additional.total)}</span>
        </div>
        <div class="sdlt-bar-row">
          <span class="sdlt-bar-label">Standard</span>
          <div class="sdlt-bar-track">
            <div class="sdlt-bar-fill sdlt-bar-standard" style="width:${Math.max((data.standard.total / maxSDLT) * 100, 2)}%"></div>
          </div>
          <span class="sdlt-bar-amount">${fmt(data.standard.total)}</span>
        </div>
        <div class="sdlt-bar-row">
          <span class="sdlt-bar-label">FTB</span>
          <div class="sdlt-bar-track">
            <div class="sdlt-bar-fill sdlt-bar-ftb" style="width:${Math.max((data.ftb.total / maxSDLT) * 100, 2)}%"></div>
          </div>
          <span class="sdlt-bar-amount">${fmt(data.ftb.total)}</span>
        </div>
      </div>

      <div class="sdlt-standalone-tabs">
        <div class="scenario-tab active" data-sdlt-view="all">All Buyer Types</div>
        <div class="scenario-tab" data-sdlt-view="additional">Additional</div>
        <div class="scenario-tab" data-sdlt-view="standard">Standard</div>
        <div class="scenario-tab" data-sdlt-view="ftb">First-time Buyer</div>
      </div>

      <div id="sdlt-view-all" class="view-content">
        ${renderSDLTSection('Additional Property', data.additional)}
        ${renderSDLTSection('Standard', data.standard)}
        ${renderSDLTSection('First-time Buyer', data.ftb)}
      </div>
      <div id="sdlt-view-additional" class="view-content" style="display:none;">
        ${renderSDLTSection('Additional Property', data.additional)}
      </div>
      <div id="sdlt-view-standard" class="view-content" style="display:none;">
        ${renderSDLTSection('Standard', data.standard)}
      </div>
      <div id="sdlt-view-ftb" class="view-content" style="display:none;">
        ${renderSDLTSection('First-time Buyer', data.ftb)}
      </div>
    </div>
  `;

  resultsPanel.innerHTML = html;

  const tabs = resultsPanel.querySelectorAll('.sdlt-standalone-tabs .scenario-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.getAttribute('data-sdlt-view');
      ['all', 'additional', 'standard', 'ftb'].forEach(v => {
        document.getElementById('sdlt-view-' + v).style.display = v === view ? '' : 'none';
      });
    });
  });
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
    resultsPanel.innerHTML = `<div class="results-placeholder"><p style="color:#d42027;">Error: ${err.message}</p></div>`;
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

  const entry = {
    id: Date.now(),
    address: address,
    price: price,
    monthlyRent: monthlyRent,
    targetYield: targetYield,
    investorNetYield: result.investor.netYield,
    ftbNetYield: result.ftb.netYield,
    investorSDLT: result.investor.sdlt,
    ftbSDLT: result.ftb.sdlt,
    investorRating: investorRating.grade,
    solicitorFees: getCurrencyFieldValue('solicitorFees') || 1500,
    refurbCosts: getCostItemsTotal(),
    voidMonths: 0,
    runningCosts: getCurrencyFieldValue('runningCosts') || 0,
    lettingAgentPct: getLettingAgentPct(),
    lettingAgentVat: document.getElementById('lettingAgentVat').checked,
    buyerType: getSelectedBuyerType(),
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


  if (entry.runningCosts !== undefined) {
    const rcInput = document.getElementById('runningCosts');
    rcInput.dataset.rawValue = entry.runningCosts;
    rcInput.value = formatCurrencyDisplay(entry.runningCosts);
  }

  if (entry.targetYield !== undefined) {
    document.getElementById('targetYield').value = entry.targetYield;
  }

  if (entry.address) {
    document.getElementById('address').value = entry.address;
  }

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
    if (h2) h2.innerHTML = 'Comparison History <button type="button" class="btn-clear-history" onclick="clearHistory()">Clear All</button>';
  }

  let html = '';
  history.forEach(entry => {
    const rating = getDealRating(entry.investorNetYield, entry.targetYield);
    const displayAddress = escHtml(entry.address || 'No address');
    html += `
      <div class="history-card" onclick="loadHistoryItem(${entry.id})">
        <div class="history-card-grade" style="background:${rating.color};">${rating.grade}</div>
        <div class="history-card-info">
          <div class="history-card-address">${displayAddress}</div>
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

function shareDeal() {
  const price = getCurrencyFieldValue('price');
  const rent = getCurrencyFieldValue('monthlyRent');
  const sol = getCurrencyFieldValue('solicitorFees');
  const refurb = getCostItemsTotal();
  const running = getCurrencyFieldValue('runningCosts');
  const target = parseFloat(document.getElementById('targetYield').value) || 7;
  const addr = document.getElementById('address').value || '';

  const agentPct = getLettingAgentPct();
  const agentVat = document.getElementById('lettingAgentVat').checked;

  const params = new URLSearchParams();
  if (price) params.set('price', price);
  if (rent) params.set('rent', rent);
  if (sol) params.set('sol', sol);
  if (refurb) params.set('refurb', refurb);
  if (running) params.set('running', running);
  if (agentPct) params.set('agentpct', agentPct);
  if (agentVat) params.set('agentvat', '1');
  params.set('target', target);
  if (addr) params.set('addr', addr);
  params.set('buyer', getSelectedBuyerType());

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

  if (saved === 'true') {
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
    const rcInput = document.getElementById('runningCosts');
    rcInput.dataset.rawValue = running;
    rcInput.value = formatCurrencyDisplay(running);
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

  if (params.has('addr')) {
    document.getElementById('address').value = decodeURIComponent(params.get('addr'));
  }

  if (params.has('buyer')) {
    const bt = params.get('buyer');
    selectedBuyerType = bt;
    document.querySelectorAll('.buyer-type-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.buyer === bt);
    });
  }

  window.history.replaceState({}, '', window.location.pathname);

  setTimeout(() => runCalculation(), 300);
}

checkUrlParams();

