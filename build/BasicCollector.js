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
const pw_core_1 = require("@lay2/pw-core");
const _ = __importStar(require("lodash"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class BasicCollector extends pw_core_1.Collector {
    constructor(indexerUrl) {
        super();
        this.cells = [];
        this.indexerUrl = indexerUrl;
    }
    async collectCapacity(address, neededAmount) {
        this.cells = [];
        const indexerQuery = {
            id: _.random(1000000),
            jsonrpc: "2.0",
            method: "get_cells",
            params: [
                {
                    script: address.toLockScript().serializeJson(),
                    script_type: "lock",
                },
                "asc",
                "0x2710",
            ]
        };
        const requestOptions = {
            method: "POST",
            body: JSON.stringify(indexerQuery),
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
            mode: "cors",
        };
        const result = await (await node_fetch_1.default(this.indexerUrl, requestOptions)).json();
        let amountTotal = pw_core_1.Amount.ZERO;
        const rawCells = result.result.objects;
        for (const rawCell of rawCells) {
            const amount = new pw_core_1.Amount(rawCell.output.capacity, pw_core_1.AmountUnit.shannon);
            const lockScript = pw_core_1.Script.fromRPC(rawCell.output.lock);
            const typeScript = pw_core_1.Script.fromRPC(rawCell.output.type);
            const outPoint = pw_core_1.OutPoint.fromRPC(rawCell.out_point);
            const outputData = rawCell.output_data;
            if (typeScript === undefined || typeScript === null) {
                // @ts-ignore
                const cell = new pw_core_1.Cell(amount, lockScript, undefined, outPoint, outputData);
                this.cells.push(cell);
                amountTotal = amountTotal.add(amount);
                if (amountTotal.gte(neededAmount))
                    break;
            }
        }
        if (amountTotal.lt(neededAmount))
            throw new Error(`Could not find enough input capacity. Needed ${neededAmount.toString(pw_core_1.AmountUnit.ckb)}, found ${amountTotal.toString(pw_core_1.AmountUnit.ckb)}.`);
        return this.cells;
    }
    async collectSUDT(sudt, address, neededAmount) {
        this.cells = [];
        const lockScript = address.toLockScript();
        const typeScript = sudt.toTypeScript();
        const indexerQuery = {
            id: _.random(1000000),
            jsonrpc: "2.0",
            method: "get_cells",
            params: [
                {
                    script: lockScript.serializeJson(),
                    script_type: "lock",
                    filter: {
                        script: typeScript.serializeJson(),
                    }
                },
                "asc",
                "0x2710",
            ]
        };
        const requestOptions = {
            method: "POST",
            body: JSON.stringify(indexerQuery),
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
            mode: "cors",
        };
        const result = await (await node_fetch_1.default(this.indexerUrl, requestOptions)).json();
        let amountSUDTTotal = pw_core_1.Amount.ZERO;
        const rawCells = result.result.objects;
        for (const rawCell of rawCells) {
            const amount = new pw_core_1.Amount(rawCell.output.capacity, pw_core_1.AmountUnit.shannon);
            const amountSUDT = pw_core_1.Amount.fromUInt128LE(rawCell.output_data.substring(0, 34));
            const lockScript = pw_core_1.Script.fromRPC(rawCell.output.lock);
            const typeScript = pw_core_1.Script.fromRPC(rawCell.output.type);
            const outPoint = pw_core_1.OutPoint.fromRPC(rawCell.out_point);
            const outputData = rawCell.output_data;
            // @ts-ignore
            const cell = new pw_core_1.Cell(amount, lockScript, typeScript, outPoint, outputData);
            this.cells.push(cell);
            amountSUDTTotal = amountSUDTTotal.add(amountSUDT);
            if (amountSUDTTotal.gte(neededAmount))
                break;
        }
        if (amountSUDTTotal.lt(neededAmount))
            throw new Error(`Could not find enough input SUDT cells. Needed ${neededAmount.toString(0)}, found ${amountSUDTTotal.toString(0)}.`);
        return this.cells;
    }
    async getCells(address) {
        this.cells = [];
        const indexerQuery = {
            id: _.random(1000000),
            jsonrpc: "2.0",
            method: "get_cells",
            params: [
                {
                    script: address.toLockScript().serializeJson(),
                    script_type: "lock",
                },
                "asc",
                "0x2710",
            ]
        };
        const requestOptions = {
            method: "POST",
            body: JSON.stringify(indexerQuery),
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
            mode: "cors",
        };
        const res = await (await node_fetch_1.default(this.indexerUrl, requestOptions)).json();
        const rawCells = res.result.objects;
        for (const rawCell of rawCells) {
            const amount = new pw_core_1.Amount(rawCell.output.capacity, pw_core_1.AmountUnit.shannon);
            const lockScript = pw_core_1.Script.fromRPC(rawCell.output.lock);
            const typeScript = pw_core_1.Script.fromRPC(rawCell.output.type);
            const outPoint = pw_core_1.OutPoint.fromRPC(rawCell.out_point);
            const outputData = rawCell.output_data;
            // @ts-ignore
            const cell = new pw_core_1.Cell(amount, lockScript, typeScript, outPoint, outputData);
            this.cells.push(cell);
        }
        return this.cells;
    }
    async getBalance(address) {
        const cells = await this.getCells(address);
        if (!cells.length)
            return pw_core_1.Amount.ZERO;
        const balance = cells
            .map((c) => c.capacity)
            .reduce((sum, cap) => (sum = sum.add(cap)));
        return balance;
    }
    async getSUDTBalance(sudt, address) {
        const cells = await this.getCells(address);
        if (!cells.length)
            return pw_core_1.Amount.ZERO;
        const sudtTypeHash = sudt.toTypeScript().toHash();
        let balance = new pw_core_1.Amount(String(0), 0);
        for (const cell of cells) {
            if (!!cell.type && cell.type.toHash() === sudtTypeHash && cell.getHexData().length >= 34) 
            // if(!!cell.type && cell.data.length >= 34)
            {
                const cellAmountData = cell.getHexData().substring(0, 34);
                const amount = pw_core_1.Amount.fromUInt128LE(cellAmountData);
                balance = balance.add(amount);
            }
        }
        return balance;
    }
    async collect(address, options) {
        const cells = await this.getCells(address);
        if (options.withData) {
            return cells.filter((c) => !c.isEmpty() && !c.type);
        }
        return cells.filter((c) => c.isEmpty() && !c.type);
    }
}
exports.default = BasicCollector;
