"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pw_core_1 = __importStar(require("@lay2/pw-core"));
const config_js_1 = __importDefault(require("./config.js"));
const Utils_1 = require("./Utils");
const BasicCollector_1 = __importDefault(require("./BasicCollector"));
const RawProvider_1 = __importDefault(require("./RawProvider"));
var ChainTypes;
(function (ChainTypes) {
    ChainTypes[ChainTypes["mainnet"] = 0] = "mainnet";
    ChainTypes[ChainTypes["testnet"] = 1] = "testnet";
})(ChainTypes || (ChainTypes = {}));
async function initPwCore(chainType) {
    const provider = new RawProvider_1.default(config_js_1.default[ChainTypes[chainType]].ckbRpcUrl);
    const collector = new BasicCollector_1.default(config_js_1.default[ChainTypes[chainType]].ckbIndexerUrl);
    const pwCore = await new pw_core_1.default(config_js_1.default[ChainTypes[chainType]].ckbRpcUrl).init(provider, collector);
    return { pwCore, provider, collector };
}
function parseArgs() {
    const chainType = (process.argv[2] === 'mainnet') ? ChainTypes.mainnet : ChainTypes.testnet;
    const privateKey = process.argv[3];
    const amount = new pw_core_1.Amount(Number(process.argv[4]).toString(), 0);
    const destinationAddress = new pw_core_1.Address(process.argv[5], pw_core_1.AddressType.ckb);
    return { chainType, privateKey, amount, destinationAddress };
}
function validate_input() {
    if (process.argv.length !== 6)
        throw new Error('Incorrect number of arguments. The correct usage is <mainnet|testnet> <privateKey> <amount> <destinationAddress>');
    if (process.argv[2] !== 'mainnet' && process.argv[2] !== 'testnet')
        throw new Error('Argument 1 must be either "mainnet" or "testnet"');
    if (!Utils_1.validateHash(process.argv[3], 256))
        throw new Error('Argument 2 must be a valid 256-bit private key hash in hex format prefixed with "0x".');
    if (Number(process.argv[4]) <= 0)
        throw new Error('Argument 3 must be a positive integer value that is greater than zero.');
    if (process.argv[5].length < 46 || !(process.argv[5].startsWith('ckb') || process.argv[5].startsWith('ckt')))
        throw new Error('Argument 4 must be a valid Nervos CKB address starting with either "ckb" or "ckt".');
    if (process.argv[2] === 'mainnet' && process.argv[5].startsWith('ckt'))
        throw new Error('Argument 1 is "mainnet" but argument 4 is a testnet address.');
    if (process.argv[2] === 'testnet' && process.argv[5].startsWith('ckb'))
        throw new Error('Argument 1 is "testnet" but argument 4 is a mainnet address.');
}
async function main() {
    const args = require('yargs')
        .scriptName('sudt-cli')
        .usage('$0 <command> [args]')
        .command('hello [name]', 'welcome ter yargs!', (yargs) => {
        yargs.positional('name', {
            type: 'string',
            default: 'Cambi',
            describe: 'the name to say hello to'
        });
    }, function (argv) {
        console.log('hello', argv.name, 'welcome to yargs!');
    })
        // .help()
        .argv;
    // parseArgs();
    // validate_input();
    // const args = parseArgs();
    console.log(args);
}
main();
