const config =
{
	devnet:
	{
		ckbRpcUrl: 'http://localhost:8114',
		ckbIndexerUrl: 'http://localhost:8116',
		ckbExplorerUrl: '',
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
};

export default config;
