import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./worker.js',import.meta.url),'utf8');
const {deliverMonthlyWelcome}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {deliverMonthlyWelcome};').toString('base64'));
function setup({paid=true,mode='live'}={}) {
  const state={row:null,calls:[],responseStatus:200,ledgerReads:0};
  const env={DEPLOYMENT_MODE:mode,MACK_MONTHLY_WEBHOOK_URL:'https://app.macknified.com/api/webhooks/flow/test/private',DB:{prepare(sql){return {bind(...args){return {
    async first(){
      if(sql.includes('FROM payment_ledger')){state.ledgerReads++;return paid?{stripe_subscription_id:'sub_test',donor_email:'supporter@example.com',donor_name:'Supporter'}:null}
      if(sql.startsWith('UPDATE mack_monthly_welcomes')){if(state.row?.status==='accepted'||state.row?.status==='sending')return null;state.row={status:'sending'};return {subscription_id:'sub_test'}}
      if(sql.startsWith('SELECT status'))return state.row;
      throw Error('Unexpected first query')
    },
    async run(){
      if(sql.includes('INSERT OR IGNORE INTO mack_monthly_welcomes'))state.row??={status:'pending'};
      else if(sql.includes("status='accepted'"))state.row={status:'accepted'};
      else if(sql.includes("status='pending'"))state.row={status:'pending'};
      else throw Error('Unexpected run query')
      return {success:true}
    }
  }}}}}};
  const fetch=async(url,options)=>{state.calls.push({url,options,body:JSON.parse(options.body)});return new Response(null,{status:state.responseStatus})};
  return {env,state,fetch};
}
test('monthly welcome accepts once, exposes no private note, and deduplicates',async()=>{
 const {env,state,fetch}=setup();const old=globalThis.fetch;globalThis.fetch=fetch;
 try {await deliverMonthlyWelcome(env,'cs_test');await deliverMonthlyWelcome(env,'cs_test');
 assert.equal(state.calls.length,1);assert.equal(state.row.status,'accepted');
 assert.equal(state.calls[0].body.channel,'email');assert.equal(state.calls[0].body.contactEmail,'supporter@example.com');
 assert.equal('message' in state.calls[0].body,false);assert.equal(state.calls[0].options.redirect,'error');}
 finally{globalThis.fetch=old}
});
test('sandbox and missing integration never deliver',async()=>{
 const {env,state}=setup({mode:'sandbox'});await deliverMonthlyWelcome(env,'cs_test');
 assert.equal(state.ledgerReads,0);env.DEPLOYMENT_MODE='live';delete env.MACK_MONTHLY_WEBHOOK_URL;
 await deliverMonthlyWelcome(env,'cs_test');assert.equal(state.ledgerReads,0)
});
test('unpaid or ineligible ledger rows do not deliver',async()=>{const {env,state}=setup({paid:false});await deliverMonthlyWelcome(env,'cs_test');assert.equal(state.row,null)});
test('untrusted destination is rejected',async()=>{const {env}=setup();env.MACK_MONTHLY_WEBHOOK_URL='https://example.com/collect';await assert.rejects(()=>deliverMonthlyWelcome(env,'cs_test'),/Invalid welcome/)});
test('temporary Mack failures release delivery for a Stripe retry',async()=>{
 const {env,state,fetch}=setup();const old=globalThis.fetch;globalThis.fetch=fetch;
 try {state.responseStatus=503;await assert.rejects(()=>deliverMonthlyWelcome(env,'cs_test'),/delivery failed/);assert.equal(state.row.status,'pending');
 state.responseStatus=200;await deliverMonthlyWelcome(env,'cs_test');assert.equal(state.row.status,'accepted');assert.equal(state.calls.length,2)}
 finally{globalThis.fetch=old}
});
test('concurrent delivery does not send another request',async()=>{const {env,state}=setup();state.row={status:'sending'};await assert.rejects(()=>deliverMonthlyWelcome(env,'cs_test'),/in progress/);assert.equal(state.calls.length,0)});
