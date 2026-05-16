import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Serves the eBay bookmarklet JS with the correct app URL injected.
// User drags the bookmarklet link to their bookmarks bar, then clicks it on the eBay purchases page.
export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const source = `(function(){
  var items=[];
  var rows=document.querySelectorAll('[class*="purchase-history"] li, [class*="purchase"] tr, [data-testid*="item-card"], .ux-layout-section__row');
  if(!rows.length){rows=document.querySelectorAll('li');}
  rows.forEach(function(row){
    var titleEl=row.querySelector('a[class*="title"],h3,h2,[class*="item-title"],[class*="listing-title"]');
    var priceEl=row.querySelector('[class*="price"],[class*="amount"],[class*="cost"]');
    var dateEl=row.querySelector('[class*="date"],[class*="time"]');
    var title=titleEl?titleEl.textContent.trim():'';
    if(title.length>10){
      items.push({
        title:title,
        price:priceEl?priceEl.textContent.replace(/[^0-9.]/g,''):null,
        date:dateEl?dateEl.textContent.trim():null
      });
    }
  });
  if(items.length===0){
    alert('No purchases found. Make sure you are on your eBay Purchases page: ebay.com/mye/myebay/purchase');
    return;
  }
  var encoded=btoa(unescape(encodeURIComponent(JSON.stringify(items))));
  window.location.href='${appUrl}/import?bd='+encoded;
})();`;

  return new NextResponse(source, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
