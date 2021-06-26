"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pw_core_1 = require("@lay2/pw-core");
const pw_core_2 = require("@lay2/pw-core");
const ckb_sdk_utils_1 = require("@nervosnetwork/ckb-sdk-utils");
const pw_core_3 = require("@lay2/pw-core");
const ecpair_1 = __importDefault(require("@nervosnetwork/ckb-sdk-utils/lib/ecpair"));
class RawProvider extends pw_core_1.Provider {
    constructor(privateKey) {
        super(pw_core_1.Platform.ckb);
        this.privateKey = privateKey;
        this.keyPair = new ecpair_1.default(privateKey);
    }
    async init() {
        const pwPrefix = pw_core_2.getDefaultPrefix();
        const prefix = pwPrefix === pw_core_2.AddressPrefix.ckb
            ? ckb_sdk_utils_1.AddressPrefix.Mainnet
            : ckb_sdk_utils_1.AddressPrefix.Testnet;
        const address = ckb_sdk_utils_1.privateKeyToAddress(this.privateKey, { prefix });
        this.address = new pw_core_2.Address(address, pw_core_2.AddressType.ckb);
        return this;
    }
    hasher() {
        return new pw_core_3.Blake2bHasher();
    }
    async sign(message) {
        const sig = this.keyPair.signRecoverable(message);
        return sig;
    }
    async close() {
        return true;
    }
}
exports.default = RawProvider;
