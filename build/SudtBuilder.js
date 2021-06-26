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
Object.defineProperty(exports, "__esModule", { value: true });
const pw_core_1 = __importStar(require("@lay2/pw-core"));
class SudtBuilder extends pw_core_1.Builder {
    constructor(address, collector, fee, hash) {
        super();
        this.address = address;
        this.collector = collector;
        this.fee = fee;
        this.hash = hash;
    }
    async build() {
        // Aliases
        const address = this.address;
        const collector = this.collector;
        const fee = this.fee;
        const hash = this.hash;
        // Arrays for our input cells, output cells, and cell deps, which will be used in the final transaction.
        const inputCells = [];
        const outputCells = [];
        const cellDeps = [];
        // Create the SUDT output cell.
        const lockScript = address.toLockScript();
        const cell = new pw_core_1.Cell(new pw_core_1.Amount('93', pw_core_1.AmountUnit.ckb), lockScript, undefined, undefined, hash);
        outputCells.push(cell);
        // Calculate the required capacity. (SUDT cell + change cell minimum (61) + fee)
        const neededAmount = cell.capacity.add(new pw_core_1.Amount('61', pw_core_1.AmountUnit.ckb)).add(fee);
        // Add necessary capacity.
        const capacityCells = await collector.collectCapacity(address, neededAmount);
        for (const cell of capacityCells)
            inputCells.push(cell);
        // Calculate the input capacity and change cell amounts.
        const inputCapacity = inputCells.reduce((a, c) => a.add(c.capacity), pw_core_1.Amount.ZERO);
        const changeCapacity = inputCapacity.sub(neededAmount.sub(new pw_core_1.Amount("61", pw_core_1.AmountUnit.ckb)));
        // Add the change cell.
        const changeCell = new pw_core_1.Cell(changeCapacity, lockScript);
        outputCells.push(changeCell);
        // Add the required cell deps.
        cellDeps.push(pw_core_1.default.config.defaultLock.cellDep);
        cellDeps.push(pw_core_1.default.config.pwLock.cellDep);
        // Generate a transaction and calculate the fee. (The second argument for witness args is needed for more accurate fee calculation.)
        const RawSecp256k1WitnessArgs = { lock: '0x' + '0'.repeat(130), input_type: '', output_type: '' }; // Builder.WITNESS_ARGS.RawSecp256k1
        const tx = new pw_core_1.Transaction(new pw_core_1.RawTransaction(inputCells, outputCells, cellDeps), [RawSecp256k1WitnessArgs]);
        this.fee = pw_core_1.Builder.calcFee(tx);
        // Throw error if the fee is too low.
        if (this.fee.gt(fee))
            throw new Error(`Fee of ${fee} is below the calculated fee requirements of ${this.fee}.`);
        // Return our unsigned and non-broadcasted transaction.
        return tx;
    }
}
exports.default = SudtBuilder;
