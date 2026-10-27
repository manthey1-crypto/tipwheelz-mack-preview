import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/privacy-controls.js',import.meta.url),'utf8');
const key='tipwheelz_privacy_v1';
function setup({gpc=false,blocked=false,stored=null}={}){
 const data=new Map(stored?[[key,JSON.stringify(stored)]]:[]),events={},windowEvents={},emitted=[];
 function element(){return {hidden:false,open:false,isConnected:true,textContent:'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn},focus(){this.focused=true},closest(){return null},showModal(){this.open=true},close(){this.open=false;this.handlers.close?.()}}}
 const ids=Object.fromEntries(['tw-cookie-notice','tw-cookie-settings','tw-cookie-gpc','tw-cookie-signal','tw-cookie-footer-status','tw-cookie-saved'].map(id=>[id,element()]));
 const reject=[element(),element()],settings=[element(),element()],close=element();
 const document={getElementById:id=>ids[id],querySelectorAll:s=>s==='[data-tw-reject]'?reject:settings,querySelector:s=>s==='[data-tw-close]'?close:settings[1]};
 const window={addEventListener(k,fn){windowEvents[k]=fn},dispatchEvent(e){emitted.push(e)}};
 vm.runInNewContext(source,{document,window,navigator:{globalPrivacyControl:gpc},Date,JSON,localStorage:{getItem:k=>{if(blocked)throw Error();return data.get(k)||null},setItem(k,v){if(blocked)throw Error();data.set(k,v)}},CustomEvent:class {constructor(type,{detail}){this.type=type;this.detail=detail}}});
 return {ids,data,reject,settings,close,windowEvents,emitted};
}
test('fresh visit offers rejection; rejection persists only off settings and reopens',()=>{
 const x=setup();assert.equal(x.ids['tw-cookie-notice'].hidden,false);
 x.reject[0].handlers.click();const choice=JSON.parse(x.data.get(key));
 assert.equal(choice.analytics,false);assert.equal(choice.advertising,false);assert.equal(choice.saleOrSharing,false);
 assert.equal(x.ids['tw-cookie-notice'].hidden,true);assert.equal(x.emitted.length,1);
 x.settings[1].handlers.click();assert.equal(x.ids['tw-cookie-settings'].open,true);
 x.close.handlers.click();assert.equal(x.ids['tw-cookie-settings'].open,false);assert.equal(x.settings[1].focused,true);
 assert.equal(setup({stored:choice}).ids['tw-cookie-notice'].hidden,true);
});
test('GPC automatically opts out without prompting or storing personal information',()=>{
 const x=setup({gpc:true});assert.equal(x.ids['tw-cookie-notice'].hidden,true);
 assert.match(x.ids['tw-cookie-footer-status'].textContent,/Global Privacy Control honored/);
 assert.equal(x.data.size,0);x.settings[1].handlers.click();assert.match(x.ids['tw-cookie-signal'].textContent,/opt-out is honored/);
});
test('blocked, expired, malformed and opt-in storage never enables tracking',()=>{
 const x=setup({blocked:true});x.reject[0].handlers.click();assert.equal(x.ids['tw-cookie-notice'].hidden,true);assert.match(x.ids['tw-cookie-saved'].textContent,/prevented saving/);
 for(const stored of [{version:1,analytics:true,advertising:true,savedAt:Date.now()},{version:1,analytics:false,advertising:false,savedAt:0},{version:2,analytics:false,advertising:false,savedAt:Date.now()}])assert.equal(setup({stored}).ids['tw-cookie-notice'].hidden,false);
});
test('all public pages embed controls once and Stripe is not loaded during initial page render',()=>{
 for(const name of ['index.html','privacy/index.html','terms/index.html','wall/index.html','thanks/index.html','shop/index.html']){
  const html=readFileSync(new URL('../'+name,import.meta.url),'utf8');
  assert.equal((html.match(/id="tw-cookie-settings"/g)||[]).length,1,name);
  assert.equal((html.match(/<script data-tipwheelz-privacy>/g)||[]).length,1,name);
  assert.doesNotMatch(html,/<script\b[^>]*\bsrc=["']https:\/\/js\.stripe\.com/);
 }
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(home,/localStorage\.setItem\('tipwheelz_management_token'/);
 const loader=home.match(/let stripeScriptPromise=null;[\s\S]*?(?=function friendlyError)/)[0];
 const appended=[];const fakeStripe=()=>{};let canceled=0;
 const context={window:{},document:{createElement:()=>({remove(){}}),head:{appendChild(s){appended.push(s)}}},setTimeout:()=>1,clearTimeout:()=>canceled++,Promise,Error};
 vm.createContext(context);vm.runInContext(loader,context);assert.equal(appended.length,0);
 const first=vm.runInContext('waitForStripe()',context);assert.equal(appended.length,1);
 assert.equal(first,vm.runInContext('waitForStripe()',context));context.window.Stripe=fakeStripe;appended[0].onload();
 return first.then(value=>{assert.equal(value,fakeStripe);assert.equal(canceled,1)});
});
