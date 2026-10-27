import inventory from '../lib/inventory.js';
import {getAccess} from '../server/billing.js';
export default {
  async fetch(request) {
    const url=new URL(request.url);url.pathname='/api/availability';
    try {
      const access=await getAccess(request);
      return inventory.fetch(new Request(url,request),{paid:access.paid},{});
    }catch{return Response.json({error:'Could not verify your plan. Try again shortly.',retryAt:Date.now()+60000},{status:503,headers:{'cache-control':'no-store'}});}
  }
};
