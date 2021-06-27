#!/usr/bin/env node

'use strict';

const {spawn} = require('child_process');

const args = [__dirname+'/../build/index.js'].concat(process.argv.slice(2))
const node = spawn('node', args);

node.stdout.on('data', (data)=>process.stdout.write(data));
node.stderr.on('data', (data)=>process.stderr.write(data));
