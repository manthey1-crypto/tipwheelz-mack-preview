"""Inline the shared privacy controls in standalone GitHub and Mack pages."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'

STRIPE_LOADER = """let stripeScriptPromise=null;
function waitForStripe(){
 if(typeof window.Stripe==='function')return Promise.resolve(window.Stripe);
 if(stripeScriptPromise)return stripeScriptPromise;
 stripeScriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  const fail=()=>{clearTimeout(timer);script.remove();stripeScriptPromise=null;reject(new Error('Stripe could not load. Please try again.'))};
  const timer=setTimeout(fail,12000);
  script.src='https://js.stripe.com/clover/stripe.js';script.async=true;
  script.onload=()=>{if(typeof window.Stripe!=='function')return fail();clearTimeout(timer);resolve(window.Stripe)};
  script.onerror=fail;document.head.appendChild(script);
 });
 return stripeScriptPromise;
}"""

COOKIE_NOTICE = """<section id="cookies"><h2>Cookies and privacy choices</h2>
<p>This site's pages do not install optional analytics scripts, advertising pixels, or cross-site advertising trackers. We do not sell supporter information or share it for cross-context behavioral advertising. Necessary payment, security, and preference storage remain available when you reject optional cookies.</p>
<p>Use <strong>Cookie &amp; privacy settings</strong> at the bottom of any public page to reject optional cookies or review the current categories. There is no optional tracking to accept in the current version. You do not need an account, and rejecting optional cookies does not prevent a payment or change your Wall of Thanks choice.</p>
<p>We save your rejection in this browser's local storage under <code>tipwheelz_privacy_v1</code> for 180 days. It contains the off settings and the time saved, not your name or email. It is specific to this browser and website address. Clearing browser data removes it; if storage is blocked, optional tracking still stays off but we may show the notice again.</p>
<p>When your browser sends Global Privacy Control through its supported browser setting, we recognize it automatically and display confirmation in the privacy settings and footer. Optional tracking remains off. This page control applies to this site's pages, not to an external website after you follow a link.</p>
<p>Stripe's payment library loads when you continue into secure checkout. Stripe may use cookies or similar technologies for payment security and fraud prevention. These necessary payment functions are not optional analytics or advertising. See <a href="https://stripe.com/legal/cookies-policy" target="_blank" rel="noopener noreferrer">Stripe's cookie policy</a>.</p>
<p>External fonts and images may contact their providers and disclose technical information such as an IP address even without setting a cookie. Social links, merchandise checkout, and Stripe's billing portal lead to services with their own privacy practices.</p></section>"""

def update(path):
    html = path.read_text()
    html = re.sub(r'<!-- TW-PRIVACY-START -->.*?<!-- TW-PRIVACY-END -->', '', html, flags=re.S)
    if 'function waitForStripe()' in html:
        html = re.sub(r'<script\b[^>]*\bsrc=[\"\']https://js\.stripe\.com/[^\"\']+[\"\'][^>]*>\s*</script>', '', html)
        if 'let stripeScriptPromise=' not in html:
            html, count = re.subn(r'function waitForStripe\(\)\{.*?(?=function friendlyError)', STRIPE_LOADER, html, count=1, flags=re.S)
            if count != 1: raise ValueError(f'Unrecognized Stripe loader: {path}')
        html = html.replace("if(selected.flow==='monthly'&&data.managementToken){localStorage.setItem('tipwheelz_management_token',data.managementToken)}", '')
    if '<section id="collect">' in html:
        html = html.replace('Effective October 4, 2026', 'Updated October 26, 2026')
        html = html.replace('<a href="#choices">Your choices</a>', '<a href="#cookies">Cookies and privacy choices</a><a href="#choices">Your choices</a>')
        html = re.sub(r'<li><strong>On your device:</strong>.*?</li>', '<li><strong>On your device:</strong> necessary browser storage remembers your privacy choice. Older versions may also have saved a signed billing-management token. Current monthly billing management uses Stripe’s email-verified login and does not require that old token. Payment providers may use cookies or similar technologies for payment security. See the cookie notice below.</li>', html, count=1, flags=re.S)
        html = html.replace('send or assist with receipts', 'send monthly welcome and billing-management emails, send or assist with receipts')
        html = html.replace('from the device where you signed up', 'using the same email address you subscribed with, on any device')
        html = re.sub(r'<section id="cookies">.*?</section>', '', html, flags=re.S)
        html = html.replace('<section id="choices">', COOKIE_NOTICE+'<section id="choices">')
    component = ('<!-- TW-PRIVACY-START --><style data-tipwheelz-privacy>' + (ASSETS/'privacy-controls.css').read_text() + '</style>' + (ASSETS/'privacy-controls.html').read_text() + '<script data-tipwheelz-privacy>' + (ASSETS/'privacy-controls.js').read_text() + '</script><!-- TW-PRIVACY-END -->')
    if '</body>' not in html: raise ValueError(f'Missing body: {path}')
    html = html.replace('</body>', component+'</body>', 1)
    path.write_text(html)

if __name__ == '__main__':
    for value in sys.argv[1:]:
        update(Path(value))
