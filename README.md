# sudt-cli

![GitHub package.json version](https://img.shields.io/github/package-json/v/jordanmack/sudt-cli)
![GitHub last commit](https://img.shields.io/github/last-commit/jordanmack/sudt-cli)
![Travis (.org)](https://img.shields.io/travis/jordanmack/sudt-cli)
![Requires.io](https://img.shields.io/requires/github/jordanmack/sudt-cli)
![GitHub Repo stars](https://img.shields.io/github/stars/jordanmack/sudt-cli?style=social)

Sudt-cli a command line tool to create SUDT tokens on the Nervos Mainnet, Testnet, and on private Devnets.

## Installation

Sudt-cli can be used in multiple different ways.

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

You can download a standalone binary from the [sudt-cli releases page](https://github.com/jordanmack/sudt-cli/releases).

## Developing and Running from Source

### Supported OSs

The following operating systems are supported and tested. Other platforms may work but are untested.

- Ubuntu Linux 20.04 LTS

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
