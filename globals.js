export const stateFile = process.env.STATE_JSON ?? 'state.json';
export const mappingFilePath = process.env.MAPPING_JSON ?? 'mapping.json';
export const nftablesConfigPath = process.env.NFTABLES_CONF ?? 'nftables.conf'; // Speichert im aktuellen Verzeichnis
console.log ( "nftables conf path : "+nftablesConfigPath);
