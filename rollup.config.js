import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import {nodeResolve} from '@rollup/plugin-node-resolve';

export default
{
	input: 'build/index.js',
	output:
	{
		file: 'build/bundle.js',
	},
	plugins:
	[
		json(),
		commonjs(),
		nodeResolve(),
	]
};
