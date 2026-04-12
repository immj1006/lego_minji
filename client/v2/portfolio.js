// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};
//current sort and filter values
let currentSort = 'recently-published';
let filterBy50 = false;

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const url = `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`;
    console.log('fetchDeals url:', url);
    const response = await fetch(url);
    const body = await response.json();
    console.log('fetchDeals response:', body);

    if (body.success !== true) {
      console.error('fetchDeals failed:', body);
      return {result: [], meta: {currentPage: 1, pageCount: 1, count: 0}};
    }

    const data = body.data ?? body;

    if (Array.isArray(data)) {
      return {
        result: data,
        meta: {currentPage: 1, pageCount: 1, count: data.length}
      };
    }

    if (data.result && data.meta) {
      return data;
    }

    if (data.deals && data.pagination) {
      return {
        result: data.deals,
        meta: data.pagination
      };
    }

    if (data.result) {
      return {
        result: data.result,
        meta: data.meta || {currentPage: 1, pageCount: 1, count: data.result.length}
      };
    }

    return {
      result: Array.isArray(data) ? data : [],
      meta: {currentPage: 1, pageCount: 1, count: Array.isArray(data) ? data.length : 0}
    };
  } catch (error) {
    console.error(error);
    return {result: [], meta: {currentPage: 1, pageCount: 1, count: 0}};
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */


const renderDeals = deals => {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const template = safeDeals.length > 0 ? safeDeals.map(deal => {
    let pct = 0;
    if (deal.discount) {
      pct = deal.discount > 1 ? Math.round(deal.discount) : Math.round(deal.discount * 100);
    } else if (deal.msrp && deal.price) {
      pct = Math.round(((deal.msrp - deal.price) / deal.msrp) * 100);
    }

    const isFav = getFavorites().includes(deal.uuid);
    return `
      <div class="deal-item" id="${deal.uuid}">
        <span class="deal-id">${deal.id}</span>
        <a href="${deal.link}" target="_blank" class="deal-link">${deal.title}</a>
        <span class="deal-price">${deal.price} €</span>
        ${pct > 0 ? `<span class="deal-discount">-${pct}%</span>` : ''}
        <span class="deal-favorite" onclick="toggleFavorite('${deal.uuid}')">⭐</span>
      </div>
    `;
  }).join('') : '<div class="deal-item"><span>No deals available</span></div>';

  document.querySelector('#deals').innerHTML = '<h2>💎 Deals</h2>' + template;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const currentPage = parseInt(pagination?.currentPage, 10) || 1;
  const pageCount = parseInt(pagination?.pageCount, 10) || 1;
  const options = Array.from(
    {length: pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  if (selectPage.options.length > 0) {
    selectPage.selectedIndex = Math.min(currentPage - 1, selectPage.options.length - 1);
  }
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  console.log('render called:', {dealsLength: Array.isArray(deals) ? deals.length : 0, pagination});
  const processedDeals = getProcessedDeals(deals);
  console.log('render processedDeals length:', processedDeals.length);
  renderDeals(processedDeals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(Array.isArray(deals) ? deals : []);
};




/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});


/**
 * Select the page to display
 */
selectPage.addEventListener('change', async (event) => {
  // 1. Fetch deals using the NEW page value and the CURRENT size value
  const deals = await fetchDeals(
    parseInt(event.target.value), 
    parseInt(selectShow.value)
  );

  // 2. Update the global state and re-render
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});


/**
 * filtering
 */
const getProcessedDeals = (deals) => {
  let processed = [...deals];
  console.log('currentSort is:', currentSort); // ← add this
  // 1. Filter Logic
  if (filterBy50) {
    // We check both decimal (0.5) and whole number (50) possibilities
    processed = processed.filter(deal => (deal.discount >= 50 || deal.discount >= 0.5));
  }

  // 2. Sort Logic
  if (currentSort === 'best-discount') {
    console.log('sorting by discount!');
    processed.sort((a, b) => {
      const discA = a.discount || 0;
      const discB = b.discount || 0;
      return discB - discA; // Highest discount first
    });
  }
  // ... add other sorts here

  // by most commented
  if (currentSort === 'comments') {
  processed.sort((a, b) => {
    const commA = a.comments || 0;
    const commB = b.comments || 0;
    return commB - commA; // Most commented first
  });
  }

  //by hot deals
  if (currentSort === 'hot') {
  processed.sort((a, b) => {
    const tempA = a.temperature || 0;
    const tempB = b.temperature || 0;
    return tempB - tempA; // Highest temperature first
  });
  }

  //sort select
  if (currentSort === 'price-asc') {
  processed.sort((a, b) => a.price - b.price);
  }

  if (currentSort === 'price-desc') {
    processed.sort((a, b) => b.price - a.price);
  } 

  if (currentSort === 'date-asc') {
    processed.sort((a, b) => a.published - b.published); // Recent first
  }

  if (currentSort === 'date-desc') {
    processed.sort((a, b) => b.published - a.published); // Oldest first
  }

  //filter logic feature 14
  if (filterByFavorite) {
    const favorites = getFavorites();
    console.log('favorites:', favorites);
    console.log('deal uuids:', processed.map(d => d.uuid));
    processed = processed.filter(deal => favorites.includes(deal.uuid));
  }

  return processed;
};



// Filter Checkbox
document.querySelector('#more-than-50').addEventListener('change', (e) => {
  filterBy50 = e.target.checked;
  render(currentDeals, currentPagination);
});


// Sort Buttons

document.querySelector('#by-most-commented').addEventListener('click', () => {
  currentSort = 'comments';
  render(currentDeals, currentPagination);
});

document.querySelector('#by-hot-deals').addEventListener('click', () => {
  currentSort = 'hot';
  render(currentDeals, currentPagination);
});


document.querySelector('#by-discount').addEventListener('click', () => {
  currentSort = 'best-discount';
  console.log('deals discounts:', currentDeals.map(d => ({id: d.id, discount: d.discount, temperature: d.temperature, comments: d.comments})));
  render(currentDeals, currentPagination); 
});


document.querySelector('#sort-select').addEventListener('change', (event) => {
  currentSort = event.target.value;
  render(currentDeals, currentPagination);
});




/**
 * Sales section
 */
const fetchSales = async (id) => {
  try {
    const response = await fetch(`https://server-gamma-black-13.vercel.app/sales/search?legoSetId=${id}`);
    const body = await response.json();
    if (body.success !== true) {
      console.error(body);
      return [];
    }
    console.log('first sale:', body.data.result[0]); // ← here
    return body.data.result;
  } catch (error) {
    console.error(error);
    return [];
  }
};

const renderSales = (sales) => {
  const template = sales.map(sale => `
    <div class="sales-item">
      <a href="${sale.link}" target="_blank" class="sales-item-title">${sale.title}</a>
      <div class="sales-item-price">${sale.price.amount} €</div>
    </div>
  `).join('');

  document.querySelector('#sales-list').innerHTML = template || '<p>No sales found</p>';
};




const getFavorites = () => JSON.parse(localStorage.getItem('favorites') || '[]');

const toggleFavorite = (uuid) => {
  const favorites = getFavorites();
  const index = favorites.indexOf(uuid);
  
  if (index === -1) {
    favorites.push(uuid); // add
  } else {
    favorites.splice(index, 1); // remove
  }
  
  localStorage.setItem('favorites', JSON.stringify(favorites));
  render(currentDeals, currentPagination);
};




//listers for sales
selectLegoSetIds.addEventListener('change', async (event) => {
  const sales = await fetchSales(event.target.value);
  renderSales(sales);
  document.querySelector('#nbSales').innerHTML = sales.length;

  const prices = sales.map(s => parseFloat(s.price.amount)).sort((a, b) => a - b);

  const percentile = (arr, p) => {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  };

  document.querySelector('#p5').innerHTML = prices.length ? percentile(prices, 5) + ' €' : 0;
  document.querySelector('#p25').innerHTML = prices.length ? percentile(prices, 25) + ' €' : 0;
  document.querySelector('#p50').innerHTML = prices.length ? percentile(prices, 50) + ' €' : 0;

  // ← add here
  const dates = sales.map(s => s.published).sort((a, b) => a - b);
  const lifetime = dates.length > 1 
    ? Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24))
    : 0;
  document.querySelector('#lifetime').innerHTML = lifetime + ' days';
});

let filterByFavorite = false;

document.querySelector('#only-favorites').addEventListener('change', (e) => {
  filterByFavorite = e.target.checked;
  render(currentDeals, currentPagination);
});


