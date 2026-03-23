import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

const parse = data => {
  const $ = cheerio.load(data, { xmlMode: false });

  return $('article.threadListCard, article[data-type="thread"]')
    .map((i, element) => {
      const title = $(element)
        .find('strong.thread-title--list, .threadListCard-title')
        .text()
        .trim();

      const link = 'https://www.dealabs.com' + ($(element)
        .find('a.cept-tt')
        .attr('href') || '');

      const priceText = $(element)
        .find('span.thread-price')
        .text()
        .trim();
      const price = parseFloat(priceText.replace(',', '.').replace(/[^0-9.]/g, ''));

      const discountText = $(element)
        .find('span.threadListCard-discount, .cept-discount-badge')
        .text()
        .trim();
      const discount = Math.abs(parseInt(discountText));

      const temperature = parseFloat($(element)
        .find('span.vote-temp')
        .text()
        .trim()) || 0;

      const comments = parseInt($(element)
        .find('span.cept-comment-count')
        .text()
        .trim()) || 0;

      return { title, price, discount, temperature, comments, link,
        'uuid': uuidv5(link, uuidv5.URL)
      };
    })
    .get()
    .filter(deal => deal.title);
};

const scrape = async url => {
  const response = await fetch(url);
  if (response.ok) {
    const body = await response.text();
    return parse(body);
  }
  console.error(response);
  return null;
};

export { scrape };