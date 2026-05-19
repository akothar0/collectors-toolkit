import { NextResponse } from 'next/server';
import { resolveBookmarkletAppUrl } from '@/lib/bookmarklet-url';

export const runtime = 'nodejs';

// Serves the eBay bookmarklet JS with the correct app URL injected.
// User drags the bookmarklet link to their bookmarks bar, then clicks it on the eBay purchases page.
export function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const appUrl = resolveBookmarkletAppUrl(reqUrl);

  // eBay item titles are plain <a> tags linking to /itm/ — no reliable class names.
  // Strategy: find all item links, then walk up the DOM to extract price + date from
  // the surrounding order container.
  const source = `(function(){
  try {
  var items=[];
  var seen=new Set();

  function itemId(href){
    var m=(href||'').match(/\\/itm\\/([^/?#]+)/);
    return m?m[1]:href;
  }

  function linkTitle(a){
    var t=(a.textContent||'').trim();
    if(t.length>=10)return t;
    var aria=(a.getAttribute('aria-label')||'').trim();
    if(aria.length>=10)return aria;
    var attr=(a.getAttribute('title')||'').trim();
    if(attr.length>=10)return attr;
    return t;
  }

  var links=Array.from(document.querySelectorAll('a[href*="/itm/"]'));

  links.forEach(function(a){
    var title=linkTitle(a);
    var id=itemId(a.href);
    if(title.length<10||seen.has(id))return;
    seen.add(id);

    var price=null,date=null;
    var el=a.parentElement;
    for(var i=0;i<12&&el;i++){
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

  var linkCount=links.length;
  if(items.length===0){
    alert('No purchases found. Open ebay.com/mye/myebay/purchase, scroll to load orders, then try again.');
    window.location.href='${appUrl}/import?bm_debug=empty&links='+linkCount;
    return;
  }
  var payload=encodeURIComponent(JSON.stringify(items));
  var target='${appUrl}/import?bd='+payload;
  if(target.length>8000){
    alert('Too many items in URL ('+items.length+'). Saving first 30 — use screenshots for more.');
    target='${appUrl}/import?bd='+encodeURIComponent(JSON.stringify(items.slice(0,30)));
  }
  if(target.length>1800000){
    alert('Too many items to import at once ('+items.length+'). Try fewer visible orders or use screenshots.');
    window.location.href='${appUrl}/import?bm_debug=url_too_long&count='+items.length;
    return;
  }
  window.location.href=target;
  } catch(e) {
    var msg=(e&&e.message?e.message:String(e));
    alert('Import bookmarklet error: '+msg);
    window.location.href='${appUrl}/import?bm_debug=error&msg='+encodeURIComponent(msg);
  }
})();`;

  return new NextResponse(source, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
    },
  });
}
