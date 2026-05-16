import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Serves the eBay bookmarklet JS with the correct app URL injected.
// User drags the bookmarklet link to their bookmarks bar, then clicks it on the eBay purchases page.
export function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || `${reqUrl.protocol}//${reqUrl.host}`;
  // Strip trailing slash so we never produce //import
  const appUrl = rawAppUrl.replace(/\/$/, '');

  // eBay item titles are plain <a> tags linking to /itm/ — no reliable class names.
  // Strategy: find all item links, then walk up the DOM to extract price + date from
  // the surrounding order container.
  const source = `(function(){
  var items=[];
  var seen=new Set();

  // All eBay item page links contain /itm/ in the href
  var links=Array.from(document.querySelectorAll('a[href*="/itm/"]'));

  links.forEach(function(a){
    var title=(a.textContent||'').trim();
    // Skip image links, short labels, duplicates
    if(title.length<15||seen.has(title))return;
    seen.add(title);

    var price=null,date=null;
    // Walk up 10 levels to find the order block containing price + date
    var el=a.parentElement;
    for(var i=0;i<10&&el;i++){
      var text=el.innerText||'';
      if(!price){
        var pm=text.match(/US\\s*\\$\\s*([\\d,]+\\.?\\d*)|(?:Order total:\\s*US\\s*\\$|\\$)\\s*([\\d,]+\\.?\\d*)/);
        if(pm)price=parseFloat((pm[1]||pm[2]).replace(/,/g,''))||null;
      }
      if(!date){
        var dm=text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2},\\s+\\d{4}/);
        if(dm)date=dm[0];
      }
      if(price&&date)break;
      el=el.parentElement;
    }
    items.push({title:title,price:price,date:date});
  });

  if(items.length===0){
    alert('No purchases found. Make sure you are on: ebay.com/mye/myebay/purchase');
    return;
  }
  var encoded=btoa(unescape(encodeURIComponent(JSON.stringify(items))));
  window.location.href='${appUrl}/import?bd='+encodeURIComponent(encoded);
})();`;

  return new NextResponse(source, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
    },
  });
}
