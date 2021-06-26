"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHash = exports.add0x = void 0;
function add0x(hash) {
    if (hash.substring(0, 2) !== '0x')
        return '0x' + hash;
    else
        return hash;
}
exports.add0x = add0x;
function validateHash(hash, bits) {
    const size = bits / 8 * 2;
    const re = new RegExp(`^0x[0-9a-f]{${size}}$`, 'gi');
    const result = re.test(hash);
    return result;
}
exports.validateHash = validateHash;
