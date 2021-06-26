# sudt-cli

![GitHub package.json version](https://img.shields.io/github/package-json/v/jordanmack/sudt-cli)
![GitHub last commit](https://img.shields.io/github/last-commit/jordanmack/sudt-cli)
![Travis (.org)](https://img.shields.io/travis/jordanmack/sudt-cli)
![Requires.io](https://img.shields.io/requires/github/jordanmack/sudt-cli)
![GitHub Repo stars](https://img.shields.io/github/stars/jordanmack/sudt-cli?style=social)

This is a command line tool to create SUDT tokens on the Nervos Mainnet and Testnet and on private Devnets.

## Setup

### Supported OSs

The following operating systems are supported and tested. Other platforms may work but are untested.

- Ubuntu Linux 20.04 LTS

### Prerequisites

- Git [[Download](https://git-scm.com/downloads)]
- Node.js v14.17.1 [[Download]](https://nodejs.org/en/download/)

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

Open the `src/config.js` file to view the configuration.

The most common configuration is already included and may not need to be changed.

If you are running a devnet that is not on `localhost`, you will need to update the URLs in the configuration.

### Update Permissions (Linux and MacOS)

```sh
chmod 755 ./sudt-cli
```

## Usage

On Linux and MacOS use the convenience shell script.

```sh
./sudt-cli --help
```

If your platform does not support shell scripts (Windows), use this alternate command syntax.

```sh
npx ts-node --files src/index.ts --help
```
