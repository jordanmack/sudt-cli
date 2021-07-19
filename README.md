# SUDT-CLI

![GitHub package.json version](https://img.shields.io/github/package-json/v/jordanmack/sudt-cli)
![GitHub last commit](https://img.shields.io/github/last-commit/jordanmack/sudt-cli)
![Travis (.org)](https://travis-ci.com/jordanmack/sudt-cli.svg)
![Requires.io](https://img.shields.io/requires/github/jordanmack/sudt-cli)
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/jordanmack/sudt-cli?sort=semver)
![GitHub Repo stars](https://img.shields.io/github/stars/jordanmack/sudt-cli?style=social)

SUDT-CLI a command line tool used to create SUDT tokens on the Nervos Mainnet, Testnet, and on private Devnets.

The following basic functions can be performed with SUDT-CLI:

- Issue SUDT tokens and send them to an address.
- Check the balance of SUDT tokens on an address.

[Usage Examples](#usage-examples) and [Installation Instructions](#installation) can be found below.

## Usage Examples

You can always view the online help by using the `--help` switch.

```sh
sudt-cli --help
```

### Issue 100 SUDT Tokens on the Testnet

This command will issue 100 tokens on the Testnet and send them to the corresponding address of the owner. The private key is used to generate the both the Token ID and the address.

```sh
sudt-cli issue -k 0xab22a1d7b305b3b014ae5946e0408f7b020eb23f017a6ae21a2e343fa996438a -m 100
```

<details>
<summary>Click to View Output</summary>

```txt
 ____  _   _ ____ _____      ____ _     ___
/ ___|| | | |  _ \_   _|    / ___| |   |_ _|
\___ \| | | | | | || |_____| |   | |    | |
 ___) | |_| | |_| || |_____| |___| |___ | |
|____/ \___/|____/ |_|      \____|_____|___|

Network Type:      testnet
SUDT Token ID:     0x94dc9577762a3308b8e64cb37135a32c76e0568b78f3f62e1b30ea9878bce989
Issuer Lock Hash:  0xebb2bbf30a12d1512d98b1d200eca729d2c8a1f217b738e6fa839cc143bf8c9a (AKA SUDT Type Args)
Issuer Address:    ckt1qyq2jj6v40fgzhxn3q2kqcuvyn8nrxvknpusntxx2q
Dest Address:      ckt1qyq2jj6v40fgzhxn3q2kqcuvyn8nrxvknpusntxx2q
Amount:            100 Tokens
Fee:               10000 Shannons

Transaction:       0xae135b008b0ff4cc316d1c929ae9020e50bc5c58b66216fe631d53ad7a346f67
Explorer URL:      https://explorer.nervos.org/aggron/transaction/0xae135b008b0ff4cc316d1c929ae9020e50bc5c58b66216fe631d53ad7a346f67
Note:              It may take 1-2 minutes before the transaction is visible on the Explorer.
```

</details>

### Issue 100 SUDT Tokens on a Local Devnet

This command will issue 100 SUDT tokens on a local devnet, and send them to the specified address. The private key is used to generate the both the Token ID and the destination address is specified.

```sh
sudt-cli issue -t devnet -k 0xd00c06bfd800d27397002dca6fb0993d5ba6399b4238b2f29ee9deb97593d2bc -m 100 -a ckt1qyqx0x253nxxxzjhekcdx0f2yv3w2zfsaypq646g7l
```

<details>
<summary>Click to View Output</summary>

```txt
 ____  _   _ ____ _____      ____ _     ___
/ ___|| | | |  _ \_   _|    / ___| |   |_ _|
\___ \| | | | | | || |_____| |   | |    | |
 ___) | |_| | |_| || |_____| |___| |___ | |
|____/ \___/|____/ |_|      \____|_____|___|

Network Type:      devnet
SUDT Token ID:     0x2c824eaffc598d23afc3944856b5404a3f7d0d6cce8d4e4854a823df5f2cf0be
Issuer Lock Hash:  0x32e555f3ff8e135cece1351a6a2971518392c1e30375c1e006ad0ce8eac07947 (AKA SUDT Type Args)
Issuer Address:    ckt1qyqvsv5240xeh85wvnau2eky8pwrhh4jr8ts8vyj37
Dest Address:      ckt1qyqx0x253nxxxzjhekcdx0f2yv3w2zfsaypq646g7l
Amount:            100 Tokens
Fee:               10000 Shannons

Transaction:       0x5594e4f1809619b230e6e5afcbd43c14c5b84150222d6ce51ecf94a980660a8c
```

</details>

### Check the SUDT Balance of an Address on Mainnet

This command will check the SUDT balance of the specified token on the specified address. The private key is used to generate the Token ID and the balance address.

```sh
sudt-cli balance -t mainnet -k 0x0123456789012345678901234567890123456789012345678901234567890123
```

<details>
<summary>Click to View Output</summary>

```txt
 ____  _   _ ____ _____      ____ _     ___
/ ___|| | | |  _ \_   _|    / ___| |   |_ _|
\___ \| | | | | | || |_____| |   | |    | |
 ___) | |_| | |_| || |_____| |___| |___ | |
|____/ \___/|____/ |_|      \____|_____|___|

Network Type:      mainnet
SUDT Token ID:     0x1220c50c53af02a9c893a14f4e317a119be105a728003095020b9bc30c105c27
Issuer Lock Hash:  0x22500a11a331c914f09e9c56f6bbecdea66b8f457fb5b478c2b3a95c4a1f4ee0 (AKA SUDT Type Args)
Balance Address:   ckb1qyqvtjamvjcxra3q4jpj2sv0j5j67kdwdjkqscezae
Balance:           0 Tokens
```

</details>

### Check the SUDT Balance of an Address on Testnet

This command will check the SUDT balance of the specified token on the specified address. The private key is not specified. Instead, the Issuer Lock Hash of the SUDT is specified to generate the Token ID and the balance address is specified.

```sh
sudt-cli balance -i 0x22500a11a331c914f09e9c56f6bbecdea66b8f457fb5b478c2b3a95c4a1f4ee0 -a ckt1qyqvtjamvjcxra3q4jpj2sv0j5j67kdwdjkqda8a39
```

<details>
<summary>Click to View Output</summary>

```txt
 ____  _   _ ____ _____      ____ _     ___
/ ___|| | | |  _ \_   _|    / ___| |   |_ _|
\___ \| | | | | | || |_____| |   | |    | |
 ___) | |_| | |_| || |_____| |___| |___ | |
|____/ \___/|____/ |_|      \____|_____|___|

Network Type:      testnet
SUDT Token ID:     0x3a52229ea8e5698fd32f32d4f115b3a28f1a1284fd682427ce7efb2f89413d8e
Issuer Lock Hash:  0x22500a11a331c914f09e9c56f6bbecdea66b8f457fb5b478c2b3a95c4a1f4ee0 (AKA SUDT Type Args)
Balance Address:   ckt1qyqvtjamvjcxra3q4jpj2sv0j5j67kdwdjkqda8a39
Balance:           100 Tokens
```

</details>

## Installation

SUDT-CLI can be used in multiple different ways.

- As a global application installed with [NPM](https://en.wikipedia.org/wiki/Npm_(software)). (Recommended)
- As a standalone binary application.
- As a Node.js application run from the source files.

<!-- - As a global application using [NPX](https://www.npmjs.com/package/npx) -->

## Installing with NPM

This method will use NPM to install `sudt-cli` as a global application that can be run from the command line.

```sh
npm i -g sudt-cli
sudt-cli --help
```

<!-- ## Installing with NPX

This method will use NPX to run `sudt-cli` from the command line without installing globally.

```sh
npx sudt-cli --help
``` -->

## Installing a Standalone Binary

You can download a standalone binary from the [SUDT-CLI releases page](https://github.com/jordanmack/sudt-cli/releases).

## Developing and Running from Source

### Supported OSs

The following operating systems are supported and tested. Other platforms may work but are untested.

- Ubuntu Linux 20.04 LTS
- MacOS 10.14
- Windows 10

### Prerequisites

- Git [[Download](https://git-scm.com/downloads)]
- Node.js v14.17.1+ [[Download]](https://nodejs.org/en/download/)

### Clone the Git Repo

```sh
git clone https://github.com/jordanmack/sudt-cli.git
cd sudt-cli
```

### Install Dependencies

```sh
npm i
```

### Update the Configuration File

The most common configuration is already included and most users will not need to change it.

If you want to use the tool with a devnet that is not on `localhost`, you will need to update the URLs in the configuration.

To view and modify the configuration, open the `src/config.js` file.

### Compile the TypeScript to JavaScript

```sh
npm run compile
```

### Update Permissions (Linux and MacOS)

```sh
chmod 755 ./bin/sudt-cli
```

### Usage

On Linux and MacOS use the convenience shell script.

```sh
./bin/sudt-cli --help
```

If your platform does not support shell scripts (Windows), use this alternate command syntax.

```sh
npx ts-node --files src/index.ts --help
```

### Building Standalone Binaries

This will compile and package the application as an [nexe](https://github.com/nexe/nexe) packaged standalone binary for Linux, MacOS, and Windows. The resulting binaries can be found in the `dist` folder.

```sh
npm run build-all
```

You can then run the following command to compress the binaries in preparation for distribution.

```sh
npm run zip-all
```

## Other Tips

If you receive the following error during while issuing a token on a devnet, then SUDT-CLI was unable to find you default lock.

```txt
UnhandledPromiseRejectionWarning: Error: JSONRPCError: server error {"code":-301,"message":"TransactionFailedToResolve: Resolve failed Unknown([OutPoint(0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b70800000000)])","data":"Resolve(Unknown([OutPoint(0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b70800000000)]))"}
```

You will need to rerun the `issue` command with additional arguments that indicate where your default lock is found. ie: If you have a working chain config file (such as a Lumos config file) you can find these values under the default lock section (`SECP256K1_BLAKE160)`. You will need the `TX_HASH`, `INDEX`, and `DEP_TYPE` values. This corresponds to the following arguments you need to specify:

1. `--default-lock-tx-hash` or `--dlth`
2. `--default-lock-index` or `--dli`
3. `--default-lock-dep-type` or `--dldt`

The resulting command should look similar to this:

```sh
sudt-cli issue <YOUR_OTHER_PARAMETERS> --default-lock-tx-hash 0x2db1b175e0436966e5fc8dd5cdf855970869b37a6c556e00e97ccb161c644eb5 --default-lock-index 0x0 --default-lock-dep-type dep_group
```

Another example of a the complete command with all options specified:

```sh
yarn start issue -t devnet -k 0x6cd5e7be2f6504aa5ae7c0c04178d8f47b7cfc63b71d95d9e6282f5b090431bf -m 1000 -f 100000 -a ckt1qyqf22qfzaer95xm5d2m5km0f6k288x9warqnhsf4m --dlth 0x2db1b175e0436966e5fc8dd5cdf855970869b37a6c556e00e97ccb161c644eb5
```
