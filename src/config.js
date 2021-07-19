import path from 'path';
import {homedir} from 'os';

const config =
{
	devnet:
	{
		ckbRpcUrl: 'http://localhost:8114',
		ckbIndexerUrl: 'http://localhost:8116',
		ckbExplorerUrl: '',
		configFile: path.join(homedir(), '.sudt-cli', 'devnet-config.json'),
		genesisCell1PrivateKey: '0xd00c06bfd800d27397002dca6fb0993d5ba6399b4238b2f29ee9deb97593d2bc',
		genesisCell2PrivateKey: '0x63d86723e08f0f813a36ce6aa123bb2289d90680ae1e99d4de8cdb334553f24d',
	},
	mainnet:
	{
		ckbRpcUrl: 'http://3.235.223.161:8114',
		ckbIndexerUrl: 'http://3.235.223.161:8116',
		ckbExplorerUrl: 'https://explorer.nervos.org/',
	},
	testnet:
	{
		ckbRpcUrl: 'http://3.235.223.161:18114',
		ckbIndexerUrl: 'http://3.235.223.161:18116',
		ckbExplorerUrl: 'https://explorer.nervos.org/aggron/',
	},
	assets:
	{
		acpScriptCodeBinary: __dirname+'/../assets/binaries/acp',
		pwLockScriptCodeBinary: __dirname+'/../assets/binaries/pwlock',
		sudtScriptCodeBinary: __dirname+'/../assets/binaries/sudt',
	}
};

export default config;
