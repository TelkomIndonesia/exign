# EXIGN Egress Proxy

An egress proxy that is capable to add [signature header](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures-12) to all received request and forward the request to the actual server.

## Usage

Steps:

1. Start exign container using [docker](https://docs.docker.com/desktop/) with the following command:

    ```bash
    docker run \
      --rm \
      --name exign \
      --pull 'always' \
      --env 'NODE_EXTRA_CA_CERTS=/src/config/upstream-transport/ca.crt' \
      --env 'EXIGN_DNS_RESOLVER=8.8.8.8' \
      --env 'EXIGN_DNS_ADVERTISED_ADDRESS=0.0.0.0' \
      --dns '8.8.8.8' \
      --publish '53:53/udp' \
      --publish '80:80' \
      --publish '443:443' \
      --publish '1080:1080' \
      --publish '127.0.0.1:3000:3000' \
      --volume "$(pwd)/config:/src/config" \
      --volume "$(pwd)/logs:/src/logs" \
      ghcr.io/telkomindonesia/exign
    ```

    In case you can't allocate port 80, 443, or 53 (UDP), then you can start exign without those ports. But in **step 3**, you can only use SOCKS5 Proxy if you need request redirection. Meanwhile port 1080 and 3000 (left side of `--publish` arguments) can be changed as necessary.

    ```bash
    docker run \
        --rm \
        --name exign \
        --pull 'always' \
        --env 'NODE_EXTRA_CA_CERTS=/src/config/upstream-transport/ca.crt' \
        --env 'EXIGN_REMOTE_CONFIG_URL=https://gw.etchpass.dev' \
        --publish '1080:1080' \
        --publish '127.0.0.1:3000:3000' \
        --volume "$(pwd)/config:/src/config" \
        --volume "$(pwd)/logs:/src/logs" \
        ghcr.io/telkomindonesia/exign
    ```

1. If the remote server you are trying to connect to need to verify the signature, then **distribute** the generated [public key](http://localhost:3000/config/signature/pubkey.pem?dl) to the **administrator of the remote server**. Meanwhile, keep the [private key](http://localhost:3000/config/signature/key.pem) **safe and private**.

1. Setup redirection to exign by doing one of the following:
    - Use **SOCKS5 proxy** at 127.0.0.1:1080 for all of your HTTP requests.
    - Change your **DNS resolver** to 127.0.0.1.
    - Add custom host-IP mapping to your hosts file manually.

1. If your tools need to verify TLS certificate, then trust the generated [CA Certificate](http://localhost:3000/config/transport/ca.crt?dl). For reference, checkout [Portswigger documentation](https://gw.etchpass.dev/index.html#:~:text=Portswigger%20documentation) on how to trust a particular CA Certificate.

## Container Signature

The container image is signed using [cosign](https://docs.sigstore.dev/cosign/overview/). You should verify that you are using the legitimate container as follow:

```bash
docker run \
     --rm \
     --env KEY=$'-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEE3il8roBEOKz2Ogu5adrXSvoCbrL\nq3kbKfGJXVmTTinmNd3VJ/VbOS+kGoB/F++AtQRY7GcCrSIfWWsPf6YyVg==\n-----END PUBLIC KEY-----' \
     gcr.io/projectsigstore/cosign:v1.13.1 \
          verify --key env://KEY \
          ghcr.io/telkomindonesia/exign
```
