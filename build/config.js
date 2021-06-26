"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    testnet: {
        ckbRpcUrl: 'http://3.235.223.161:18114',
        ckbIndexerUrl: 'http://3.235.223.161:18116',
        ckbExplorerUrl: 'https://explorer.nervos.org/aggron/',
    },
    mainnet: {
        ckbRpcUrl: 'http://3.235.223.161:8114',
        ckbIndexerUrl: 'http://3.235.223.161:8116',
        ckbExplorerUrl: 'https://explorer.nervos.org/',
    },
};
exports.default = config;
