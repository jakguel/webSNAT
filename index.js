import http from 'http'
import url from 'url'
import {push_new_ip, refresh_nftables} from './pusnip.js'

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;

  if (req.method === "GET" && pathname === "/push") {
    const ip = query.ip;
    const name = query.name;
    console.log("GET /push?ip"+ip+"&name="+name);
    if (ip && name) {
      let puship = await push_new_ip(ip, name);
      if ( puship === true) {
        let refresh= await refresh_nftables();
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK\n"+refresh);
      }else {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("NOK\n"+ puship);
      }
    } else {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end('NOK\nMissing "ip" or "name" query parameters.\n');
    }
  }
  else if (req.method === "GET" && pathname === "/update") {
    console.log("GET /update");
    let refresh= await refresh_nftables();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK\n"+refresh);
  }
  else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found\n");
  }
});

const PORT = 80;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Try: http://localhost:${PORT}/push?ip=192.168.1.100&name=mydevice`,
  );
});
