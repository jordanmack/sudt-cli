import { Cell, CellDep, DepType, OutPoint, Script } from '@lay2/pw-core';
import blake2b from 'blake2b';
import {Reader, RPC} from 'ckb-js-toolkit';
import fs from 'fs';
import Molecule from 'molecule-javascript';

export function add0x(hash: string)
{
	if(hash.substring(0, 2) !== '0x')
		return '0x'+hash;
	else
		return hash;
}

export function arrayBufferToHex(arrayBuffer: ArrayBuffer)
{
	return new Reader(arrayBuffer).serializeJson();
}

export function ckbHash(hexString: string)
{
	if(!hexString.startsWith('0x'))
		throw new Error('Invalid hex string.');

	const uint8Array = blake2b(32, null, null, new TextEncoder().encode("ckb-default-hash")).update(hexToUint8Array(hexString)).digest();
	const hex = arrayBufferToHex(uint8Array.buffer);

	return hex;
}

export function hexToArrayBuffer(hexString: string)
{
	return new Reader(hexString).toArrayBuffer();
}

export function hexToUint8Array(hexString: string)
{
	return new Uint8Array(hexToArrayBuffer(hexString));
}

export async function indexerReady(ckbRpcUrl: string, ckbIndexerUrl: string, updateProgress=((_indexerTip: BigInt, _rpcTip: BigInt)=>{}), options?: any): Promise<void>
{
	const defaults = {blockDifference: 0, timeoutMs: 300_000, recheckMs: 500};
	options = {...defaults, ...options};

	return new Promise(async (resolve, reject) =>
	{
		let timedOut = false;
		const timeoutTimer = (options.timeoutMs !== 0) ? setTimeout(()=>{timedOut = true;}, options.timeoutMs) : false;
		const ckbRpc = new RPC(ckbRpcUrl);
		const ckbIndexerRpc = new RPC(ckbIndexerUrl);

		let indexerFailureCount = 0;
		let rpcFailureCount = 0;

		while(true)
		{
			if(timedOut)
				return reject(Error("Transaction timeout."));

			const indexerTipObj = await ckbIndexerRpc.get_tip();
			if(!indexerTipObj)
			{
				if(++indexerFailureCount >= 5)
					return reject(Error("Indexer gave an unexpected response."));

				await new Promise((resolve)=>setTimeout(resolve, 200));
				continue;
			}
			
			const rpcResponse = await ckbRpc.get_tip_block_number();
			if(!rpcResponse)
			{
				if(++rpcFailureCount >= 5)
					return reject(Error("RPC gave an unexpected response."));

				await new Promise((resolve)=>setTimeout(resolve, 200));
				continue;
			}
	
			const indexerTip = BigInt(indexerTipObj.block_number);
			const rpcTip = BigInt(rpcResponse);

			if(indexerTip >= (rpcTip - BigInt(options.blockDifference)))
			{
				if(timeoutTimer)
					clearTimeout(timeoutTimer);

				break;
			}

			updateProgress(indexerTip, rpcTip);

			await new Promise(resolve=>setTimeout(resolve, options.recheckMs));
		}

		return resolve();
	});
}

export function readFileToHexString(filename: string)
{
	const data = fs.readFileSync(filename);
	const hexString = "0x" + data.toString("hex");

	return hexString;
}

export async function waitForConfirmation(ckbIndexerUrl: string, lockScript: any, txid: string, updateProgress=((_status: string)=>{}), options?: any): Promise<void>
{
	const defaults = {timeoutMs: 300_000, recheckMs: 500, throwOnNotFound: true};
	options = {...defaults, ...options};

	return new Promise(async (resolve, reject) =>
	{
		let timedOut = false;
		const timeoutTimer = (options.timeoutMs !== 0) ? setTimeout(()=>{timedOut = true;}, options.timeoutMs) : false;
		const rpc = new RPC(ckbIndexerUrl);

		while(true)
		{
			if(timedOut)
				return reject(Error("Transaction timeout."));

			const query = {script: lockScript, script_type: 'lock'};
			const transactions = await rpc.get_transactions(query, 'desc', '0x64');

			if(!!transactions)
			{
				const txHashes = new Set(transactions.objects?.map((o: any)=>o.tx_hash));
				const status = (txHashes.has(txid)) ? 'committed' : 'pending';

				updateProgress(status);

				if(status === "committed")
				{
					if(timeoutTimer)
						clearTimeout(timeoutTimer);

					break;
				}
			}
			else if(transactions === null)
			{
				if(options.throwOnNotFound)
					return reject(Error("Transaction was not found."));
				else
					updateProgress("not_found");
			}
			
			await new Promise(resolve=>setTimeout(resolve, options.recheckMs));
		}

		return resolve();
	});
}

export function validateHash(hash: string, bits: number)
{
	const size = bits / 8 * 2;
	const re = new RegExp(`^0x[0-9a-f]{${size}}$`, 'gi');

	const result = re.test(hash);

	return result;
}

export async function checkCellDepHasScript(rpc: RPC, cellDep: CellDep, script: Script): Promise<boolean> {
	if (cellDep.depType !== DepType.depGroup) {
		throw new Error('Unsupported operation: checkCellDepHasScript method only supports DepType.depGroup');
	}

	const response = await rpc.get_live_cell({
		tx_hash: cellDep.outPoint.txHash,
		index: cellDep.outPoint.index
	}, true);
	  
	const molecule = new Molecule({
		name: 'Bytes',
		type: 'fixvec',
		item: {
			type: 'byte',
		},
	} as any);

	if (!response?.cell?.data) {
		return false;
	}

	const depGroupDependencies = molecule.deserialize(response.cell.data.content);

	let scriptFound = false;
	for (const serializedOutPoint of depGroupDependencies) {
		const normalizedValue = new OutPoint(
			serializedOutPoint.slice(0, 66),
			add0x(parseInt(serializedOutPoint.slice(66, 68), 16).toString(16))
		);

		const cell = await Cell.loadFromBlockchain(rpc, normalizedValue);
		if (cell.type?.toHash() === script.codeHash) {
			scriptFound = true;
			break;
		}
	}

	return scriptFound;
}

export default {add0x, arrayBufferToHex, ckbHash, hexToArrayBuffer, hexToUint8Array, indexerReady, readFileToHexString, waitForConfirmation, validateHash, checkCellDepHasScript};
