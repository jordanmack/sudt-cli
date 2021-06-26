import {AddressPrefix, privateKeyToAddress} from '@nervosnetwork/ckb-sdk-utils';
import PWCore, {Address, AddressType, Amount, AmountUnit, AddressPrefix as PwAddressPrefix, CellDep, ChainID, Config as PwConfig, DepType, getDefaultPrefix, HashType, OutPoint, RawProvider, Script, SUDT} from '@lay2/pw-core';
import * as _ from 'lodash';
import fs from 'fs';
const yargs = require('yargs');

import Config from './config.js';
import Utils, {indexerReady, waitForConfirmation} from './Utils';
import {validateHash} from './Utils';
import BasicCollector from './BasicCollector';
import DeployBuilder from './DeployBuilder';
import SudtBuilder from './SudtBuilder';

interface PwObject
{
	pwCore: PWCore,
	provider: RawProvider,
	collector: BasicCollector,
}

enum ChainTypes
{
	mainnet,
	testnet,
}

type ChainTypeString = 'mainnet'|'testnet';

type NetworkTypeString = 'mainnet'|'testnet'|'devnet';

async function generateDevnetConfig(): Promise<PwConfig>
{
	const config: PwConfig =
	{
		daoType:
		{
			cellDep: new CellDep(DepType.code, new OutPoint('0xa563884b3686078ec7e7677a5f86449b15cf2693f3c1241766c6996f206cc541', '0x2')),
			script: new Script('0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e', '0x', HashType.type),
		},
		defaultLock:
		{
			cellDep: new CellDep(DepType.depGroup, new OutPoint('0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708', '0x0')),
			script: new Script('0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8', '0x', HashType.type),
		},
		multiSigLock:
		{
			cellDep: new CellDep(DepType.depGroup, new OutPoint('0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708', '0x1')),
			script: new Script('0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8', '0x', HashType.type),
		},
		pwLock: // Placeholder
		{
			cellDep: new CellDep(DepType.code, new OutPoint('0x'+'0'.repeat(64), '0x0')),
			script: new Script('0x'+'0'.repeat(64), '0x', HashType.data),
		},
		sudtType: // Placeholder
		{
			cellDep: new CellDep(DepType.code, new OutPoint('0x'+'0'.repeat(64), '0x0')),
			script: new Script('0x'+'0'.repeat(64), '0x', HashType.data),
		},
		acpLockList:
		[
		],
	};

	// If there is no config file, then return the current one with placeholders. This is needed so deployment can proceed.
	if(!fs.existsSync(Config.devnet.configFile))
		return config;

	// Read and parse devnet config file.
	const rawConfig = fs.readFileSync(Config.devnet.configFile, {encoding: 'utf8'});
	const jsonConfig = JSON.parse(rawConfig);

	// Fix keys.
	jsonConfig.pwLock.cellDep.out_point.tx_hash = jsonConfig.pwLock.cellDep.out_point.txHash;
	delete jsonConfig.pwLock.cellDep.out_point.txHash;
	jsonConfig.sudtType.cellDep.out_point.tx_hash = jsonConfig.sudtType.cellDep.out_point.txHash;
	delete jsonConfig.sudtType.cellDep.out_point.txHash;

	// Update pwLock config.
	config.pwLock =
	{
		cellDep: CellDep.fromRPC(jsonConfig.pwLock.cellDep)!,
		script: Script.fromRPC(jsonConfig.pwLock.script)!
	};

	// Update sudtType config.
	config.sudtType =
	{
		cellDep: CellDep.fromRPC(jsonConfig.sudtType.cellDep)!,
		script: Script.fromRPC(jsonConfig.sudtType.script)!
	};

	return config;
}

async function writeDevnetConfig(pwLockOutPoint: OutPoint, sudtOutPoint: OutPoint): Promise<void>
{
	// Generate file hashes.
	const pwLockHash = Utils.ckbHash(Utils.readFileToHexString(Config.assets.pwLockScriptCodeBinary));	
	const sudtHash = Utils.ckbHash(Utils.readFileToHexString(Config.assets.sudtScriptCodeBinary));	

	// Generate the config that we will save.
	const devnetConfig =
	{
		pwLock:
		{
			cellDep: (new CellDep(DepType.code, pwLockOutPoint)).serializeJson(),
			script: (new Script(pwLockHash, '0x', HashType.data)).serializeJson(),
		},
		sudtType:
		{
			cellDep: (new CellDep(DepType.code, sudtOutPoint)).serializeJson(),
			script: (new Script(sudtHash, '0x', HashType.data)).serializeJson(),
		},
	};

	// Save to the devnet config file.
	fs.writeFileSync(Config.devnet.configFile, JSON.stringify(devnetConfig, null, 4));

	// Print status.
	process.stdout.write('Write devnet config file. Done.\n');
}

async function initPwCore(networkType: NetworkTypeString, privateKey: string): Promise<PwObject>
{
	const provider = new RawProvider(privateKey);
	const collector = new BasicCollector(Config[networkType].ckbIndexerUrl);

	let pwCore;
	if(networkType === 'devnet')
	{
		pwCore = await new PWCore(Config[networkType].ckbRpcUrl).init(provider, collector, networkTypeToChainId(networkType), await generateDevnetConfig());
	}
	else
		pwCore = await new PWCore(Config[networkType].ckbRpcUrl).init(provider, collector, networkTypeToChainId(networkType));

	return {pwCore, provider, collector};
}

function initArgs()
{
	const args = yargs
	.scriptName('sudt-cli')
	.usage('Usage: $0 <command> [options]')
	.command('issue', 'Issue new SUDT tokens and send to the specified address.',
	{
		'private-key': {alias: 'k', describe: "Private key to use for issuance.", type: 'string', demand: true},
		'network-type': {alias: 't', describe: "The network type: mainnet|testnet|devnet", default: 'testnet', choices: ['mainnet', 'testnet', 'devnet']},
		amount: {alias: 'm', describe: "The number of SUDT tokens to issue.", type: 'string', demand: true},
		address: {alias: 'a', describe: "The address to send SUDT tokens to. If not specified, defaults to the address associated with the private key.", type: 'string', default: ''},
		fee: {alias: 'f', describe: "Transaction fee amount in Shannons.", type: 'string', default: '10000'},
	})
	.command('balance', 'Check the SUDT token balance on the specified address.',
	{
		'private-key': {alias: 'k', describe: "Private key to use for issuance.", type: 'string', demand: true},
		'network-type': {alias: 't', describe: "The network type: mainnet|testnet|devnet", default: 'testnet', choices: ['mainnet', 'testnet', 'devnet']},
		address: {alias: 'a', describe: "The address to check the SUDT balance of.", type: 'string', demand: true}
	})
	.check(validateArgs)
	.help('h')
	.alias('h', 'help')
	.wrap(Math.max(80, Math.min(120, yargs.terminalWidth())))
	.argv;

	return args;
}

function displayIssueInfo(networkType: string, issuerAddress: string, tokenId: string, destinationAddress: string, amount: BigInt, fee: BigInt)
{
	// Print issue info.
	process.stdout.write('\n');
	process.stdout.write(`Network Type:\t ${networkType}\n`);
	process.stdout.write(`SUDT Token ID:\t ${tokenId}\n`);
	process.stdout.write(`Issuer Address:\t ${issuerAddress}\n`);
	process.stdout.write(`Dest Address:\t ${destinationAddress}\n`);
	process.stdout.write(`Amount:\t\t ${amount}\n`);
	process.stdout.write(`Fee:\t\t ${fee}\n`);
	process.stdout.write('\n');
}

function displayIssueResult(networkType: string, txId: string)
{
	// Print the resulting TX ID.
	process.stdout.write(`Transaction:\t${txId}\n`);

	// Print explorer URL only if not on the devnet.
	if(networkType !== 'devnet')
	{
		process.stdout.write(`Explorer URL:\t${Config[networkType as ChainTypeString].ckbExplorerUrl}transaction/${txId}\n`);
		process.stdout.write('Note: It may take 30-60 seconds before the transaction is available on the Explorer.\n');
		process.stdout.write('\n');
	}
}

async function deployFile(networkType: string, privateKey: string, fee_: BigInt, filename: string)
{
	// Init PW-Core with the specified network type.
	const pw = await initPwCore(networkType as NetworkTypeString, privateKey);

	// Determine the address prefix for the current network type.
	const prefix = (getDefaultPrefix() === PwAddressPrefix.ckb) ? AddressPrefix.Mainnet : AddressPrefix.Testnet;

	// Determine the issuer address.
	const issuerAddress = new Address(privateKeyToAddress(privateKey, {prefix}), AddressType.ckb);

	// Determine the destination address.
	const destinationAddress = new Script('0x'+'0'.repeat(64), '0x'+'0'.repeat(40), HashType.data).toAddress();

	// Determine the amount and fee.
	const fee = new Amount(fee_.toString(), 0);

	// Get data from file.
	const data = Utils.readFileToHexString(filename);

	// Create a deploy transaction.
	const builder = new DeployBuilder(issuerAddress, destinationAddress, pw.collector, fee, data);
	const transaction = await builder.build();
	// console.info(transaction);

	// Submit transaction to the network.
	const txId = await pw.pwCore.sendTransaction(transaction);
	// console.info(`Transaction submitted: ${txId}`);

	return new OutPoint(txId, '0x0');
}

async function initCellDeps(networkType: string, privateKey: string)
{
	// If this is not a devnet, skip.
	if(networkType !== 'devnet')
		return;

	// If no configuration is found, deploy the script code and create a config file.
	if(!fs.existsSync(Config.devnet.configFile))
	{
		process.stdout.write('No devnet config file was found. Generating.\n');

		// Check for existence of local PW-Lock asset file.
		if(!fs.existsSync(Config.assets.pwLockScriptCodeBinary))
			throw new Error('The PW-Lock script code binary is missing.');

		// Check for existence of local SUDT asset file.
		if(!fs.existsSync(Config.assets.sudtScriptCodeBinary))
			throw new Error('The SUDT script code binary is missing.');

		// Determine the issuer address.
		const issuerAddress = new Address(privateKeyToAddress(privateKey, {prefix: AddressPrefix.Testnet}), AddressType.ckb);
		const issuerLockScriptJson = issuerAddress.toLockScript().serializeJson();

		// We use a higher fee rate due to the size of the binaries.
		const fee = 100000n;

		// Deploy PW-Lock script code binaries.
		const pwLockOutPoint = await deployFile(networkType, privateKey, fee, Config.assets.pwLockScriptCodeBinary);
		process.stdout.write('Deploying PW-Lock script code binary');
		await waitForConfirmation(Config.devnet.ckbIndexerUrl, issuerLockScriptJson, pwLockOutPoint.txHash, (_status)=>{process.stdout.write('.');});
		process.stdout.write(' Done.\n');

		// Deploy SUDT script code binaries.
		const sudtOutPoint = await deployFile(networkType, privateKey, fee, Config.assets.sudtScriptCodeBinary);
		process.stdout.write('Deploying SUDT script code binary');
		await waitForConfirmation(Config.devnet.ckbIndexerUrl, issuerLockScriptJson, sudtOutPoint.txHash, (_status)=>{process.stdout.write('.');});
		process.stdout.write(' Done.\n');

		// Create a devnet config file with the new out points.
		await writeDevnetConfig(pwLockOutPoint, sudtOutPoint);
	}
}

async function issueSudt(networkType: string, privateKey: string, address_: string, amount_: BigInt, fee_: BigInt)
{
	// Init PW-Core with the specified network type.
	const pw = await initPwCore(networkType as NetworkTypeString, privateKey);

	// Determine the address prefix for the current network type.
	const prefix = (getDefaultPrefix() === PwAddressPrefix.ckb) ? AddressPrefix.Mainnet : AddressPrefix.Testnet;

	// Determine the issuer address.
	const issuerAddress = new Address(privateKeyToAddress(privateKey, {prefix}), AddressType.ckb);
	const issuerLockHash = issuerAddress.toLockScript().toHash();

	// Determine the destination address.
	const destinationAddress = (address_ === '') ? issuerAddress : new Address(address_, AddressType.ckb);

	// Determine SUDT token ID.
	const sudt = new SUDT(issuerLockHash);

	// Determine the amount and fee.
	const amount = new Amount(amount_.toString(), 0);
	const fee = new Amount(fee_.toString(), 0);

	// Display the summary information on the console.
	displayIssueInfo(networkType, issuerAddress.toCKBAddress(), sudt.toTypeScript().toHash(), destinationAddress.toCKBAddress(), amount_, fee_);

	// Create an SUDT transaction.
	const builder = new SudtBuilder(sudt, issuerAddress, destinationAddress, amount, pw.collector, fee);
	const transaction = await builder.build();
	// console.info(transaction);

	// Submit transaction to the network.
	const txId = await pw.pwCore.sendTransaction(transaction);
	// console.info(`Transaction submitted: ${txId}`);

	// Display the result information on the console.
	displayIssueResult(networkType, txId);
}

function networkTypeToChainId(networkType: string)
{
	switch(networkType)
	{
		case 'mainnet':
			return ChainID.ckb;
		case 'testnet':
			return ChainID.ckb_testnet;
		case 'devnet':
			return ChainID.ckb_dev;
		default:
			throw new Error('Invalid network type.');
	}
}

function validateArgs(args: any)
{
	const command = args._[0];

	if(command === "issue")
	{
		if(!validateHash(args.privateKey, 256))
			throw new Error('Private key must be a valid 256-bit private key hash in hex format prefixed with "0x".');

		if(BigInt(args.amount) <= 0n)
			throw new Error('Amount must be a positive integer that is greater than zero.');

		if(args.address.length !== 0 && (args.address.length < 46 || !(args.address.startsWith('ckb') || args.address.startsWith('ckt'))))
			throw new Error('Address must be a valid Nervos CKB address starting with either "ckb" or "ckt".');

		if(BigInt(args.fee) <= 0)
			throw new Error('Fee must be a positive integer that is greater than zero.');

		if(BigInt(args.fee) > 100_000_000n)
			throw new Error('The fee specified was greater than 100,000,000 Shannons. This is abnormally high and should be reduced.');
	}

	if(command === "issue" || command === "balance")
	{
		if(args.networkType === 'mainnet' && args.address.startsWith('ckt'))
			throw new Error('Network type is "mainnet" but the address specified is a testnet address.');

		if(args.networkType === 'testnet' && args.address.startsWith('ckb'))
			throw new Error('Network type is "testnet" but the address specified is a mainnet address.');

		if(args.networkType === 'devnet' && args.address.startsWith('ckb'))
			throw new Error('Network type is "devnet" but the address specified is a mainnet address.');
	}

	return true;
}

async function main()
{
	// Initialize the command line arguments.
	const args = initArgs();
	// console.log(args);

	// Wait for indexer to be ready.
	process.stdout.write('Waiting for indexer to sync.');
	await indexerReady(Config.devnet.ckbRpcUrl, Config.devnet.ckbIndexerUrl, (_indexerTip, _rpcTip)=>{process.stdout.write('.');});
	process.stdout.write(' Ready.\n');

	// Execute the command.
	switch(args._[0]) // args._[0] is the command specified.
	{
		case 'issue':
			await initCellDeps(args.networkType, args.privateKey);
			await issueSudt(args.networkType, args.privateKey, args.address, BigInt(args.amount), BigInt(args.fee));
			break;
		case 'balance':
			throw new Error('Not yet implemented.');
			break;
		default:
			throw new Error('Invalid command specified.');
	}
}
main();
