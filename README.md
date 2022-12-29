# HTTP Signature Forward-Reverse Proxy

A reverse proxy that is able to add [signature header](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures-12) to all received request and forward the request to the actual server.

## Usage

Steps:

1. Git-clone the repository.
1. Depending on the remote server you are trying to access, you might need to set values of [environment variables](./docker-compose.yml#9) using `export` command or by creating `./.env` file.
1. Run `docker-compose up`.
1. (Optional) if your tools need to verify SSL/TLS certificate, then 'locally' trust the generated CA Certificate in `./config/transport/ca.crt`. On the other hand, you can also replace or regenerate all keys inside `./config/{transport,signature}` directory, for example in case you want to use your own CA Certificate. Just make sure to restart the services afterwards.
1. Distribute the public key in `./config/signature/pubkey.pem` to the admin of the remote server you are trying to access in case it needs to verify the signature for all HTTP requests.

Note that you can use the `httpsig-frproxy` to sign any request to any host (even the one that does not verify the signature), as long as you can send the request to the proxy (e.g. by rewriting the IP Address of the Domain inside `/etc/hosts` file to IP where `httpsig-frproxy` is reachable)
