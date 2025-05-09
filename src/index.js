import http from 'http'
import url from 'url'
import {push_new_ip, refresh_nftables} from './pusnip.js'
import { API_KEY, PORT } from './globals.js'
import express from 'express';
const app = express();

app.get('/push', async (req, res) => {
  const ip = req.query.ip;
  const name = req.query.name;
  const _apikey = req.query.api_key;

  if( API_KEY ) {
    if (! _apikey || _apikey.trim() != API_KEY)
      return res.status(403).type('text/plain').send("Forbidden");
  }
  console.log("GET /push?ip="+ip+"&name="+name);

  if (ip && name) {
    let puship = await push_new_ip(ip, name);
    if (puship === true) {
      let refresh = await refresh_nftables();
      if(refresh === true){
        res.status(200).type('text/plain').send("OK");
      } else {
        res.status(500).type('text/plain').send("ERROR\n" + refresh);
      }
    } else {
      res.status(400).type('text/plain').send("ERROR\n"+ puship);
    }
  } else {
    res.status(400).type('text/plain').send('ERROR\nMissing "ip" or "name" query parameters.\n');
  }
});

app.get('/update', async (req, res) => {
  const _apikey = req.query.api_key;
  if( API_KEY ) {
    if (! _apikey || _apikey.trim() != API_KEY)
      return res.status(403).type('text/plain').send("Forbidden");
  }
  console.log("GET /update");
  let refresh = await refresh_nftables();
  if(refresh === true){
    res.status(200).type('text/plain').send("OK");
  } else {
    res.status(500).type('text/plain').send("ERROR\n"+refresh);
  }
});

app.use((req, res) => {
  const _apikey = req.query.api_key;
  if( API_KEY ) {
    if (! _apikey || _apikey.trim() != API_KEY)
      return res.status(403).type('text/plain').send("Forbidden");
  }
  res.status(404).type('text/plain').send("Not Found");
});

app.listen(PORT, () => {
  console.log(`Server running`);
  console.log(
    `Try: http://localhost:${PORT}/push?ip=192.168.1.100&name=mydevice`,
  );
});
