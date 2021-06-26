import {AddressPrefix, privateKeyToAddress} from '@nervosnetwork/ckb-sdk-utils';
import PWCore, {Address, AddressType, Amount, AmountUnit, AddressPrefix as PwAddressPrefix, getDefaultPrefix, RawProvider, SUDT} from '@lay2/pw-core';
import * as _ from 'lodash';
const yargs = require('yargs');

import Config from './config.js';
import {validateHash} from './Utils';
import BasicCollector from './BasicCollector';
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

async function initPwCore(chainType: ChainTypes, privateKey: string): Promise<PwObject>
{
	const provider = new RawProvider(privateKey);
	const collector = new BasicCollector(Config[ChainTypes[chainType] as ChainTypeString].ckbIndexerUrl);
	const pwCore = await new PWCore(Config[ChainTypes[chainType] as ChainTypeString].ckbRpcUrl).init(provider, collector);

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

function displayIssueSummary(networkType: string, issuerAddress: string, tokenId: string, destinationAddress: string, amount: BigInt, fee: BigInt, txId: string)
{
	// Print issue summary.
	process.stdout.write('\n');
	process.stdout.write(`Network Type:\t ${networkType}\n`);
	process.stdout.write(`SUDT Token ID:\t ${tokenId}\n`);
	process.stdout.write(`Issuer Address:\t ${issuerAddress}\n`);
	process.stdout.write(`Dest Address:\t ${destinationAddress}\n`);
	process.stdout.write(`Amount:\t\t ${amount}\n`);
	process.stdout.write(`Fee:\t\t ${fee}\n`);
	process.stdout.write('\n');
	process.stdout.write(`Transaction:\t${txId}\n`);

	// Print explorer URL only if not on the devnet.
	if(networkType !== 'devnet')
	{
		process.stdout.write(`Explorer URL:\t${Config[networkType as ChainTypeString].ckbExplorerUrl}transaction/${txId}\n`);
		process.stdout.write('Note: It may take 30-60 seconds before the transaction is available on the Explorer.\n');
		process.stdout.write('\n');
	}
}

async function issueSudt(networkType: string, privateKey: string, address_: string, amount_: BigInt, fee_: BigInt)
{
	// Init PW-Core with the specified network type.
	const chainType = (networkType === 'mainnet') ? ChainTypes.mainnet : ChainTypes.testnet;
	const pw = await initPwCore(chainType, privateKey);

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

	// Create an SUDT transaction.
	const builder = new SudtBuilder(sudt, issuerAddress, destinationAddress, amount, pw.collector, fee);
	const transaction = await builder.build();
	// console.info(transaction);

	// Submit transaction to the network.
	const txId = await pw.pwCore.sendTransaction(transaction);
	// console.info(`Transaction submitted: ${txId}`);

	// Display the summary information on the console.
	displayIssueSummary(networkType, issuerAddress.toCKBAddress(), sudt.toTypeScript().toHash(), destinationAddress.toCKBAddress(), amount_, fee_, txId);
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
	const args = initArgs();
	const command = args._[0];
	// console.log(args);

	switch(command)
	{
		case 'issue':
			issueSudt(args.networkType, args.privateKey, args.address, BigInt(args.amount), BigInt(args.fee));
			break;
		case 'balance':
			break;
		default:
			throw new Error('Invalid command specified.');
	}
}
main();

