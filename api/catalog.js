import inventory from '../lib/inventory.js';
export default {
  async fetch(request) {
    const url=new URL(request.url);
    url.pathname='/api/catalog';
    return inventory.fetch(new Request(url,request),{},{});
  }
};
