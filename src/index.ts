import {AddressPrefix, privateKeyToAddress} from '@nervosnetwork/ckb-sdk-utils';
import PWCore, {Address, AddressType, Amount, AddressPrefix as PwAddressPrefix, CellDep, ChainID, Config as PwConfig, DepType, getDefaultPrefix, HashType, OutPoint, RawProvider, Script, SUDT} from '@lay2/pw-core';
import * as _ from 'lodash';
import fs from 'fs';
import yargs from 'yargs';

import Config from './config.js';
import Utils, {indexerReady, waitForConfirmation} from './Utils';
import {validateHash,checkCellDepHasScript} from './Utils';
import BasicCollector from './BasicCollector';
import DeployBuilder from './DeployBuilder';
import SudtBuilder from './SudtBuilder';
import { RPC } from 'ckb-js-toolkit';

/**
 * Used as output from initPwCore().
 */
interface PwObject
{
	pwCore: PWCore,
	provider: RawProvider,
	collector: BasicCollector,
}

type ChainTypeString = 'mainnet'|'testnet';
type NetworkTypeString = 'mainnet'|'testnet'|'devnet';

/**
 * Generates a PwConfig instance which is used when initializing PW-Core for a devnet.
 * 
 * This function will search for a devnet config file that contains deployed binaries.
 * If the devnet config is not found, it will return zeroed out points as placeholders.
 * This is done to allow PW-Core to be initialized when the full config is not present.
 * 
 * @returns A PwConfig instance which is used to initialize a devnet.
 */
async function generateDevnetConfig(defaultLockTxHash: string, defaultLockScript: Script, defaultLockCellDep: CellDep): Promise<PwConfig>
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
			cellDep: defaultLockCellDep,
			script: defaultLockScript,
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

/**
 * Writes the devnet configuration file that contains the out points of deployed assets.
 * 
 * @param pwLockOutPoint - The out point for the PW-Lock script code binary.
 * @param sudtOutPoint - The out point for the SUDT script code binary.
 */
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

/**
 * Initializes PW-Core.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param privateKey - A 256-bit private key as a hex string.
 * @param defaultLockTxHash - The TX hash of the out point of the default lock script.
 * @param defaultLockIndex - The index of the out point of the default lock script.
 * @param defaultLockDepType - The dep type of the default lock script.
 * 
 * @returns A PwObject containing instances of PWCore, RawProvider, and BasicCollector.
 */
async function initPwCore(networkType: NetworkTypeString, privateKey: string,  defaultLockTxHash: string, defaultLockIndex: string, defaultLockDepType: DepType): Promise<PwObject>
{
	const provider = new RawProvider(privateKey);
	const collector = new BasicCollector(Config[networkType].ckbIndexerUrl);

	let pwCore;
	if (networkType === 'devnet')
	{
		const defaultLockScript = new Script('0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8', '0x', HashType.type);

		const defaultLockCellDepsToCheck =
		[
			// Typical CKB Devnet Out Point
			new CellDep(DepType.depGroup, new OutPoint('0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708', '0x0')),
			// Typical Godwoken-Kicker Devnet Out Point
			new CellDep(DepType.depGroup, new OutPoint('0x2db1b175e0436966e5fc8dd5cdf855970869b37a6c556e00e97ccb161c644eb5', '0x0')),
			// Custom User-Defined Out Point
			new CellDep(defaultLockDepType, new OutPoint(defaultLockTxHash, defaultLockIndex))
		];

		const rpc = new RPC(Config[networkType].ckbRpcUrl);
		let defaultLockCellDep: CellDep | null = null;
		for(const cellDepToCheck of defaultLockCellDepsToCheck)
		{
			if(await checkCellDepHasScript(rpc, cellDepToCheck, defaultLockScript))
			{
				defaultLockCellDep = cellDepToCheck;
				break;
			}
		}

		if(!defaultLockCellDep)
		{
			throw new Error(`Unable to find the default lock script in its cell dependency. Try changing --defaultLockTxHash.`);
		}

		const devnetConfig = await generateDevnetConfig(defaultLockTxHash, defaultLockScript, defaultLockCellDep);
		pwCore = await new PWCore(Config[networkType].ckbRpcUrl).init(provider, collector, networkTypeToChainId(networkType), devnetConfig);
	}
	else
		pwCore = await new PWCore(Config[networkType].ckbRpcUrl).init(provider, collector, networkTypeToChainId(networkType));

	return {pwCore, provider, collector};
}

/**
 * Initializes the arguments for the program using Yargs.
 * 
 * @returns An object with the parsed arguments.
 */
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
		defaultLockTxHash: {alias: 'dlth', describe: "Default lock cell dependency transaction hash override. A hex string. Provide this only if you have problems running commands without it.", type: 'string', default: '0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708'},
		defaultLockIndex: {alias: 'dli', describe: "Default lock cell dependency transaction outpoint override. A hex string.", type: 'string', default: '0x0'},
		defaultLockDepType: {alias: 'dldt', describe: "Default lock cell dependency transaction hash override. Allowed values: dep_group or code.", type: 'string', default: 'dep_group'},
	})
	.command('balance', 'Check the SUDT token balance on the specified address.',
	{
		'private-key': {alias: 'k', describe: "Private key to use for issuance.", type: 'string', demand: true},
		'network-type': {alias: 't', describe: "The network type: mainnet|testnet|devnet", default: 'testnet', choices: ['mainnet', 'testnet', 'devnet']},
		address: {alias: 'a', describe: "The address to check the SUDT balance of.", type: 'string', default: ''},
		defaultLockTxHash: {alias: 'dlth', describe: "Default lock cell dependency transaction hash override. A hex string. Provide this only if you have problems running commands without it.", type: 'string', default: '0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708'},
		defaultLockIndex: {alias: 'dli', describe: "Default lock cell dependency transaction outpoint override. A hex string.", type: 'string', default: '0x0'},
		defaultLockDepType: {alias: 'dldt', describe: "Default lock cell dependency transaction hash override. Allowed values: dep_group or code.", type: 'string', default: 'dep_group'},
	})
	.check(validateArgs)
	.help('h')
	.alias('h', 'help')
	.wrap(Math.max(80, yargs.terminalWidth()))
	.argv;

	return args;
}

/**
 * Display the ASCII art banner.
 */
function displayBanner()
{
	process.stdout.write('\n');
	process.stdout.write(' ____  _   _ ____ _____      ____ _     ___ \n');
	process.stdout.write('/ ___|| | | |  _ \\_   _|    / ___| |   |_ _|\n');
	process.stdout.write('\\___ \\| | | | | | || |_____| |   | |    | | \n');
	process.stdout.write(' ___) | |_| | |_| || |_____| |___| |___ | | \n');
	process.stdout.write('|____/ \\___/|____/ |_|      \\____|_____|___|\n');
	process.stdout.write('\n');
}

/**
 * Displays information about the tokens being issued.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param issuerAddress - The address of the SUDT issuer.
 * @param tokenId - The SUDT token ID. 
 * @param destinationAddress - The address that is being sent the issued SUDT tokens.
 * @param amount - The number of SUDT tokens to issue.
 * @param fee - The fee being paid for the transaction.
 */
function displayIssueInfo(networkType: string, issuerAddress: string, tokenId: string, destinationAddress: string, amount: BigInt, fee: BigInt, tokenTypeArgs: string)
{
	// Print issue info.
	process.stdout.write(`Network Type:\t ${networkType}\n`);
	process.stdout.write(`SUDT Token ID:\t ${tokenId}\n`);
	process.stdout.write(`Issuer Address:\t ${issuerAddress}\n`);
	process.stdout.write(`Dest Address:\t ${destinationAddress}\n`);
	process.stdout.write(`Amount:\t\t ${amount}\n`);
	process.stdout.write(`Fee:\t\t ${fee}\n`);
	process.stdout.write(`SUDT Type Args:\t ${tokenTypeArgs}\n`);
}

/**
 * Displays information about the result of the token issue transaction.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param txId - The resulting transaction ID.
 */
function displayIssueResult(networkType: string, txId: string)
{
	// Print the resulting TX ID.
	process.stdout.write(`Transaction:\t ${txId}\n`);

	// Print explorer URL only if not on the devnet.
	if(networkType !== 'devnet')
	{
		process.stdout.write(`Explorer URL:\t ${Config[networkType as ChainTypeString].ckbExplorerUrl}transaction/${txId}\n`);
		process.stdout.write('Note:\t\t It may take 1-2 minutes before the transaction is visible on the Explorer.\n');
	}
}

/**
 * Display an SUDT balance summary.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param issuerAddress - The address of the SUDT issuer.
 * @param tokenId - The SUDT token ID. 
 * @param balanceAddress - The address that the balance is being determined for.
 * @param balance - The balance of the address.
 */
function displaySudtSummary(networkType: string, issuerAddress: string, tokenId: string, balanceAddress: string, balance: string, tokenTypeArgs: string)
{
	// Print SUDT balance info.
	process.stdout.write(`Network Type:\t ${networkType}\n`);
	process.stdout.write(`SUDT Token ID:\t ${tokenId}\n`);
	process.stdout.write(`Issuer Address:\t ${issuerAddress}\n`);
	process.stdout.write(`Balance Address: ${balanceAddress}\n`);
	process.stdout.write(`Balance:\t ${balance}\n`);
	process.stdout.write(`SUDT Type Args:\t ${tokenTypeArgs}\n`);
}

/**
 * Deploys a local file to a cell so it can be used as a dependency.
 * This is intended for use on devnets only.
 * The destination address is 0x0, which is a burn.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param privateKey - A 256-bit private key as a hex string.
 * @param fee_ - The fee that should be paid for the transaction.
 * @param filename - The filename of the local file that will be deployed.
 * @param defaultLockTxHash - The TX hash of the out point of the default lock script.
 * @param defaultLockIndex - The index of the out point of the default lock script.
 * @param defaultLockDepType - The dep type of the default lock script.
 * 
 * @returns An OutPoint of the cell containing the file data.
 */
async function deployFile(networkType: string, privateKey: string, fee_: BigInt, filename: string, defaultLockTxHash: string, defaultLockIndex: string, defaultLockDepType: DepType)
{
	// Init PW-Core with the specified network type.
	const pw = await initPwCore(networkType as NetworkTypeString, privateKey, defaultLockTxHash, defaultLockIndex, defaultLockDepType);

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

	// Submit transaction to the network.
	const txId = await pw.pwCore.sendTransaction(transaction);

	// The out point index will always be 0x0 as specified in the DeployBuilder.
	return new OutPoint(txId, '0x0');
}

/**
 * Gets the SUDT balance using the private key to generate the issuer address and corresponding SUDT token ID.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param privateKey - A 256-bit private key as a hex string.
 * @param addressString - The address to get the balance of. If blank, the address will be generated from the private key.
 * @param defaultLockTxHash - The TX hash of the out point of the default lock script.
 * @param defaultLockIndex - The index of the out point of the default lock script.
 * @param defaultLockDepType - The dep type of the default lock script.
 */
async function getSudtBalance(networkType: string, privateKey: string, addressString: string, defaultLockTxHash: string, defaultLockIndex: string, defaultLockDepType: DepType)
{
	// Init PW-Core with the specified network type.
	const pw = await initPwCore(networkType as NetworkTypeString, privateKey, defaultLockTxHash, defaultLockIndex, defaultLockDepType);

	// Determine the address prefix for the current network type.
	const prefix = (getDefaultPrefix() === PwAddressPrefix.ckb) ? AddressPrefix.Mainnet : AddressPrefix.Testnet;

	// Determine the issuer address.
	const issuerAddress = new Address(privateKeyToAddress(privateKey, {prefix}), AddressType.ckb);
	const issuerLockHash = issuerAddress.toLockScript().toHash();

	// Determine the balance address.
	const balanceAddress = (addressString === '') ? issuerAddress : new Address(addressString, AddressType.ckb);

	// Determine SUDT token ID.
	const sudt = new SUDT(issuerLockHash);
	
	// Get the SUDT balance.
	const balance = await pw.collector.getSUDTBalance(sudt, balanceAddress);
	
	// Display the summary information on the console.
	const sudtTypeScript = sudt.toTypeScript();
	displaySudtSummary(networkType, issuerAddress.toCKBAddress(), sudtTypeScript.toHash(), balanceAddress.toCKBAddress(), balance.toString(0), sudtTypeScript.args);
}

/**
 * Deploys the missing cell dependencies on a devnet.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param privateKey - A 256-bit private key as a hex string.
 * @param defaultLockTxHash - The TX hash of the out point of the default lock script.
 * @param defaultLockIndex - The index of the out point of the default lock script.
 * @param defaultLockDepType - The dep type of the default lock script.
 */
async function initCellDeps(networkType: string, privateKey: string, defaultLockTxHash: string, defaultLockIndex: string, defaultLockDepType: DepType)
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
		const fee = BigInt(100000);

		// Deploy PW-Lock script code binaries.
		const pwLockOutPoint = await deployFile(networkType, privateKey, fee, Config.assets.pwLockScriptCodeBinary, defaultLockTxHash, defaultLockIndex, defaultLockDepType);
		process.stdout.write('Deploying PW-Lock script code binary');
		await waitForConfirmation(Config.devnet.ckbIndexerUrl, issuerLockScriptJson, pwLockOutPoint.txHash, (_status)=>{process.stdout.write('.');});
		process.stdout.write(' Done.\n');

		// Deploy SUDT script code binaries.
		const sudtOutPoint = await deployFile(networkType, privateKey, fee, Config.assets.sudtScriptCodeBinary, defaultLockTxHash, defaultLockIndex, defaultLockDepType);
		process.stdout.write('Deploying SUDT script code binary');
		await waitForConfirmation(Config.devnet.ckbIndexerUrl, issuerLockScriptJson, sudtOutPoint.txHash, (_status)=>{process.stdout.write('.');});
		process.stdout.write(' Done.\n');

		// Create a devnet config file with the new out points.
		await writeDevnetConfig(pwLockOutPoint, sudtOutPoint);
		process.stdout.write('\n');
	}
}

/**
 * Issues an SUDT using the private key to generate the issuer address and corresponding SUDT token ID.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @param privateKey - A 256-bit private key as a hex string.
 * @param addressString - The destination address. If blank, the address will be generated from the private key. 
 * @param amount_ - The number of SUDT tokens to issue.
 * @param fee_ - The fee to be paid in Shannons.
 */
async function issueSudt(networkType: string, privateKey: string, addressString: string, amount_: BigInt, fee_: BigInt, defaultLockTxHash: string, defaultLockIndex: string, defaultLockDepType: DepType)
{
	// Init PW-Core with the specified network type.
	const pw = await initPwCore(networkType as NetworkTypeString, privateKey, defaultLockTxHash, defaultLockIndex, defaultLockDepType);

	// Determine the address prefix for the current network type.
	const prefix = (getDefaultPrefix() === PwAddressPrefix.ckb) ? AddressPrefix.Mainnet : AddressPrefix.Testnet;

	// Determine the issuer address.
	const issuerAddress = new Address(privateKeyToAddress(privateKey, {prefix}), AddressType.ckb);
	const issuerLockHash = issuerAddress.toLockScript().toHash();

	// Determine the destination address.
	const destinationAddress = (addressString === '') ? issuerAddress : new Address(addressString, AddressType.ckb);

	// Determine SUDT token ID.
	const sudt = new SUDT(issuerLockHash);

	// Determine the amount and fee.
	const amount = new Amount(amount_.toString(), 0);
	const fee = new Amount(fee_.toString(), 0);

	// Display the summary information on the console.
	const sudtTypeScript = sudt.toTypeScript();
	displayIssueInfo(networkType, issuerAddress.toCKBAddress(), sudtTypeScript.toHash(), destinationAddress.toCKBAddress(), amount_, fee_, sudtTypeScript.args);
	  
	// Create an SUDT transaction.
	const builder = new SudtBuilder(sudt, issuerAddress, destinationAddress, amount, pw.collector, fee);
	const transaction = await builder.build();

	// Submit transaction to the network.
	const txId = await pw.pwCore.sendTransaction(transaction);

	// Display the result information on the console.
	process.stdout.write('\n');
	displayIssueResult(networkType, txId);
}

/**
 * Converts a network type string into a PW-SDK Chain ID.
 * 
 * @param networkType - A network type string. (mainnet/testnet/devnet)
 * @returns A PW-SDK Chain ID.
 */
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

/**
 * Waits for the indexer to sync and displays appropriate text.
 */
async function waitForIndexer(networkType: string)
{
	// Begin checking the indexer, but do not display a message for the first n ticks (quietTicks).
	const quietTicks = 10;
	let tickCount = 0;
	const statusTick = (_indexerTip: BigInt, _rpcTip: BigInt)=>
	{
		if(tickCount === quietTicks)
			process.stdout.write('Waiting for CKB Indexer to sync.');
		else if(tickCount > quietTicks)
			process.stdout.write('.');
		tickCount++;
	};

	// Wait for indexer to be ready. Block difference is set to 1, which is the normal amount it can fall out of sync temporarily while still being up to date.
	await indexerReady(Config[networkType as NetworkTypeString].ckbRpcUrl, Config[networkType as NetworkTypeString].ckbIndexerUrl, statusTick, {blockDifference: 1});

	// Only show the "ready" message if the "waiting" message has been printed. 
	if(tickCount >= quietTicks)
		process.stdout.write(' Ready.\n\n');
}

/**
 * Perform basic validation on the command line arguments.
 * 
 * @param args - An object that contains all arguments that were parsed by Yargs.
 * @returns True on success, an error is thrown otherwise.
 */
function validateArgs(args: any)
{
	const command = args._[0];

	if(command === "issue")
	{
		if(!validateHash(args.privateKey, 256))
			throw new Error('Private key must be a valid 256-bit private key hash in hex format prefixed with "0x".');

		if(BigInt(args.amount) <= BigInt(0))
			throw new Error('Amount must be a positive integer that is greater than zero.');

		if(args.address.length !== 0 && (args.address.length < 46 || !(args.address.startsWith('ckb') || args.address.startsWith('ckt'))))
			throw new Error('Address must be a valid Nervos CKB address starting with either "ckb" or "ckt".');

		if(BigInt(args.fee) <= 0)
			throw new Error('Fee must be a positive integer that is greater than zero.');

		if(BigInt(args.fee) > BigInt(100_000_000))
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

/**
 * Main program entry point.
 */
async function main()
{
	// Initialize the command line arguments.
	const args: any = initArgs();

	// Execute the command.
	switch(args._[0]) // args._[0] is the command specified.
	{
		case 'issue':
			displayBanner();
			if(args.networkType === 'devnet')
				await waitForIndexer(args.networkType);
			await initCellDeps(args.networkType, args.privateKey, args.defaultLockTxHash, args.defaultLockIndex, args.defaultLockDepType);
			await issueSudt(args.networkType, args.privateKey, args.address, BigInt(args.amount), BigInt(args.fee), args.defaultLockTxHash, args.defaultLockIndex, args.defaultLockDepType);
			break;
		case 'balance':
			displayBanner();
			if(args.networkType === 'devnet')
				await waitForIndexer(args.networkType);
			await getSudtBalance(args.networkType, args.privateKey, args.address, args.defaultLockTxHash, args.defaultLockIndex, args.defaultLockDepType);
			break;
		default:
			displayBanner();
			yargs.showHelp();
	}

	process.stdout.write('\n');
}
main();
