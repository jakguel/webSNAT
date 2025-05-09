# webSNAT
A simple HTTP API service that configures source NAT mappings on a Linux gateway.

## Overview
This application provides an easy way to configure SNAT (Source Network Address Translation) mappings through a straightforward HTTP API interface. It allows clients to request specific source IP addresses for their outbound traffic by name reference.

## Features
- Simple HTTP API for SNAT configuration
- Name-based mapping management & persistent state file
- Automatic network interface detection & nftables rule management

## Requirements
- Linux server with nftables installed
- Node.js v14 or higher
- Network interfaces configured with desired source IPs

## How It Works

1. When a client calls `/push` with their IP and name, the service:
   - Looks up the name in the mappings.json file
   - Finds the appropriate network interface for the desired source IP
   - Configures an nftables rule to translate outbound traffic from the client IP
   - Persists the mapping in state.json

2. When the `/refresh` endpoint is called, the service:
   - Reloads all mappings from state.json
   - Flushes existing nftables rules
   - Recreates all rules based on the current state


## Installation

1. Clone the repository:
   ```
   git clone https://github.com/username/snat-mapping-gateway.git
   cd snat-mapping-gateway
   ```


2. Configure your mappings in `mappings.json`:

   See also [Configuration  mappings.json ](#mappings.json)
   ```json
   {
     "client1": "192.168.1.10",
     "client2": "192.168.1.11"
   }
   ```


3. Environment Variables:

    **Important** Environment Variable:
    ```
    NFTABLES_CONF=/etc/sysconf/nftables.conf # default is 'nftables.conf'
    ```
    This Variables defaults to 'nftables.conf' (local directory) and needs to be set to your real nftables.conf path (most probably '/etc/sysconf/nftables.conf')

    **What happens when you don't set the proper path to /etc/sysconf/nftables.conf ?**

    > Pushes will may have affect on a running system but after a restart nftables service will not reload the correct configuration

    **Optional** Environment Variables:
    ```
    MAPPING_JSON=mapping.json
    STATE_JSON=state.json
    ```

4. Start the service:
   ```
   node index.js
   ```


## API Endpoints

### Push Mapping

Maps a client to a specific source IP address.
Updates the state and recreates all nftables rules.

```
GET /push?ip={client_ip}&name={client_name}
```

Parameters:
- `ip`: The IP address of the client
- `name`: The name of the client (must exist in mappings.json)

Response:
- 200: Mapping successfully created
- 400: Missing parameters or invalid request
- 404: Client name not found in mappings.json or desired source IP not available on server
- 500: Server error or configuration problem

### Refresh Mappings

Reloads the state and recreates all nftables rules.

```
GET /refresh
```

Response:
- 200: Rules successfully refreshed
- 500: Error occurred during refresh

## Configuration

### mappings.json

This file contains the allowed client names and their assigned source IPs:
* _Key_ is client name
* _Value_ is Source IP - Must be available on one of the network interfaces
```json
{
  "client1": "192.168.0.100",
  "client2": "192.168.0.101",
  "marketing": "10.0.0.5"
}
```


### state.json

This file is automatically maintained by the application and stores the active mappings:

```json
{
  "mappings": [
    {
      "clientIp": "172.16.0.15",
      "name": "client1",
      "sourceIp": "192.168.0.100",
      "device": "eth0"
    },
    {
      "clientIp": "172.16.0.23",
      "name": "marketing",
      "sourceIp": "10.0.0.5",
      "device": "eth1"
    }
  ]
}
```

## Limitations

- No authentication or authorization mechanisms
- No HTTPS support out of the box
- Limited input validation
- Single server operation only
- nftables config will be flushed on every refresh, if you have your own config you should add it in [pusnip.js:74-76](/pushnip.js)

## License
Apache 2.0
See [LICENSE File](/LICENSE)
