function add0x(hash: string)
{
	if(hash.substring(0, 2) !== '0x')
		return '0x'+hash;
	else
		return hash;
}

function validateHash(hash: string, bits: number)
{
	const size = bits / 8 * 2;
	const re = new RegExp(`^0x[0-9a-f]{${size}}$`, 'gi');

	const result = re.test(hash);

	return result;
}

export {add0x, validateHash};
