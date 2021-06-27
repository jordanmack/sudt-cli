import builtins from 'rollup-plugin-node-builtins';
import commonjs from '@rollup/plugin-commonjs';
import globals from 'rollup-plugin-node-globals';
import json from '@rollup/plugin-json';
import {nodeResolve} from '@rollup/plugin-node-resolve';

export default
{
	input: 'build/index.js',
	output:
	{
		file: 'build/bundle.js',
		format: 'cjs',
	},
	plugins:
	[
		nodeResolve(),
		commonjs(),
		json(),
		globals(),
		builtins(),
	]
};
