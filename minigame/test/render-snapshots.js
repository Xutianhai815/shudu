#!/usr/bin/env node

const { writeVisualSnapshots } = require('../tools/render-snapshots');

const written = writeVisualSnapshots();
Object.values(written).forEach((filePath) => {
  console.log(filePath);
});
