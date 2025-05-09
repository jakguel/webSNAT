import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {acquireLock, releaseLock, store, executeCommand} from './util.js'
import {mappingFilePath, nftablesConfigPath} from './globals.js'

/**
 * - Liest sourceip aus 'mapping.json' basierend auf dem Namen.
 * - Findet das Netzwerkinterface für die sourceip.
 *
 * @param {string} ip Die Quell-IP-Adresse für die neue Regel (ip saddr $ip).
 * @param {string} name Der Schlüssel, der in 'mapping.json' nachgeschlagen wird, um die Ziel-SNAT-IP zu finden.
 */
export const push_new_ip = async function (ip, name) {
    try {
        let jsonFileContent;
        try {
            jsonFileContent = await fs.readFile(mappingFilePath, 'utf-8');
        } catch (fileError) {
            throw new Error(`Error while parsing mapping configuration ${mappingFilePath}: ${fileError.message}`);
        }
        const mappingConfig = JSON.parse(jsonFileContent);
        const sourceip = mappingConfig[name];

        // todo: implement fallback or "default" IP
        if (!sourceip) {
            throw new Error(`Server '${name}' not found in ${mappingFilePath}`);
        }
        console.log(`push_new_ip: sNAT from '${name}(${ip})' to ${sourceip}`);
        // Fetch network interface by ip
        const dev = Object.entries(os.networkInterfaces()).find(([iface, addrs]) => addrs?.some(addr => addr.family === 'IPv4' && !addr.internal && addr.address === sourceip))?.[0];
        if (!dev)  throw new Error(`No Network interface found for sourceip '${sourceip}'`);
        // Store interface, client name and all ips in state file
        await store(state => state[name]={ip: ip, sourceip: sourceip, dev: dev});
    } catch (error) {
        console.error(`Error push_new_ip: ${error.message}`);
        if (error.stderr) console.error(`Stderr: ${error.stderr}`);
        return error.message;
    }
    return true;
}
/*
* Fügt eine neue NAT-Regel zu nftables hinzu und speichert die Konfiguration.
* - Fügt eine nftables SNAT-Regel hinzu.
* - Speichert das aktuelle nftables-Regelwerk nach 'nftables.conf' (im aktuellen Verzeichnis).
*/
export const refresh_nftables = async function (){

  try {
    acquireLock('ntftables.lock');
    // Prepare state for processing
    const state = await store();
    // Group state entries by device/sourceip, alternativley the code after this block also work with the original state object
    var devices = {};
    Object.entries(state).forEach(([name,value])=> devices[value.sourceip] = { sourceip: value.sourceip, dev: value.dev, ips: []} );
    Object.entries(state).forEach(([name,value])=> devices[value.sourceip].ips.push(value.ip) );
    Object.entries(devices).forEach(([name,value])=> value.ip_set = "{ " + value.ips.join(", ") +" }" );
    console.log(`push_new_ip: state dump`); // debug output grouped state
    console.log(devices);

    await executeCommand("sudo nft flush ruleset");
    await executeCommand("sudo nft add table nat ");
    await executeCommand("sudo nft 'add chain ip nat postrouting { type nat hook postrouting priority 100; policy accept; }'");
    for(const [name, entry] of Object.entries(devices)){
      console.log("push_new_ip`: processing rule for "+name);
      try {
        const nftCommandAdd = `sudo nft add rule nat postrouting ip saddr ${entry.ip_set} oif ${entry.dev} snat ${entry.sourceip}`;
        await executeCommand(nftCommandAdd);
      } catch (nftError) {
        throw new Error(`refresh_nftables: adding rule : ${nftError.message}\nStderr: ${nftError.stderr}`);
      }
    }
    const nftruleset = await executeCommand( `sudo nft list ruleset`);
    await fs.writeFile(nftablesConfigPath,`#!/usr/sbin/nft -f
flush ruleset
${nftruleset}`);
    console.log(`refresh_nftables: updated ${nftablesConfigPath}`)
  } catch (error) {
      console.error(`Error refresh_nftables: ${error.message}`);
      if (error.stderr) console.error(`Stderr: ${error.stderr}`);
      return error.message;
  } finally {
    await releaseLock('ntftables.lock');
  }
  return true;
}

/*
async function runExample() {
    await push_new_ip("10.0.0.6", "my-server");
    await push_new_ip("10.0.0.7", "my-server-1");
    await push_new_ip("10.0.0.6", "my-server-2");
    await push_new_ip("10.0.0.7", "my-server-2");
    await push_new_ip("10.0.0.8", "my-server-2");
    await push_new_ip("10.0.0.6", "my-server-3");
    await refresh_nftables();
}
runExample();
*/
