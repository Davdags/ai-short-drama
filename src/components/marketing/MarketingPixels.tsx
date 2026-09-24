'use client'

import Script from 'next/script'
import { PIXEL_IDS } from '@/lib/marketing/pixels'

/**
 * Loads the ad-network pixels that have an ID configured. Each script is the network's
 * own published snippet; nothing loads for a network you have not set up.
 *
 * Note for EU visitors: these are marketing trackers, so they should only load once the
 * visitor has consented. Gate this component behind your consent state when you add a
 * cookie banner — see docs/marketing-pixels.md.
 */
export function MarketingPixels() {
  return (
    <>
      {PIXEL_IDS.meta && (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${PIXEL_IDS.meta}');fbq('track','PageView');
        `}</Script>
      )}

      {PIXEL_IDS.tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">{`
          !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
          ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
          ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
          ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";
          o.async=!0;o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];
          a.parentNode.insertBefore(o,a)};
          ttq.load('${PIXEL_IDS.tiktok}');ttq.page();}(window,document,'ttq');
        `}</Script>
      )}

      {PIXEL_IDS.snapchat && (
        <Script id="snap-pixel" strategy="afterInteractive">{`
          (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){
          a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
          a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;
          r.src='https://sc-static.net/scevent.min.js';var u=t.getElementsByTagName(s)[0];
          u.parentNode.insertBefore(r,u);})(window,document);
          snaptr('init','${PIXEL_IDS.snapchat}');snaptr('track','PAGE_VIEW');
        `}</Script>
      )}

      {PIXEL_IDS.twitter && (
        <Script id="twitter-pixel" strategy="afterInteractive">{`
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},
          s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','${PIXEL_IDS.twitter}');
        `}</Script>
      )}

      {PIXEL_IDS.googleAds && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${PIXEL_IDS.googleAds}`} strategy="afterInteractive" />
          <Script id="google-ads-init" strategy="afterInteractive">{`
            window.dataLayer=window.dataLayer||[];
            function gtag(){dataLayer.push(arguments);}
            gtag('js',new Date());
            gtag('config','${PIXEL_IDS.googleAds}');
          `}</Script>
        </>
      )}
    </>
  )
}
