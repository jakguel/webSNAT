/*
* Set this to system path for real usage: /etc/sysconfig/nftables.conf
*/
export const NFTABLES_CONF = process.env.NFTABLES_CONF ?? 'nftables.conf';
export const API_KEY = new String(process.env.API_KEY ?? '').trim().length ==0 ? false : process.env.API_KEY.trim();
export const STATE_FILE = process.env.STATE_JSON ?? 'state.json';
export const MAPPINF_FILE = process.env.MAPPING_JSON ?? 'mapping.json';
export const PORT =  process.env.MAPPING_JSON ?? 80;

console.log ( "NFTABLES_CONF \t"+NFTABLES_CONF);
console.log ( `API_KEY \t${ API_KEY?'ENABLED':'DISABLED'}`);
console.log ( `PORT \t\t${ PORT }`);
