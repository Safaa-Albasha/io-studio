'use strict';
/**
 * I/O Studio — where the creator's project data lives.
 *
 * Project data:  <project>/.io/         (creator-profile.md, theme.json, project.json, plan.json, queue.json …)
 * Video editor:  ~/.io-editor/          (profile.json, logo — shared by every project)
 *
 * Backward compatibility (the plugin was called SKY before, and SAFAA Studio before that):
 * if the new folder does not exist but an old one does (<project>/.sky or <project>/.safaa,
 * ~/.sky-editor or ~/.safaa-studio), the newest old one is renamed once. If the rename fails
 * (read-only disk, permissions…), the old folder is used in place so nothing is lost. This file
 * is the ONLY place that knows the old names — everything else calls dataDir() / editorHome().
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const DATA_DIR = '.io';
const LEGACY_DATA_DIRS = ['.sky', '.safaa'];
const EDITOR_HOME = '.io-editor';
const LEGACY_EDITOR_HOMES = ['.sky-editor', '.safaa-studio'];

function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch (e) { return false; } }

/** new path, migrating the first existing legacy folder → new once; falls back to it when it cannot be moved. */
function resolve(base, name, legacy) {
  const cur = path.join(base, name);
  if (isDir(cur)) return cur;
  for (const l of legacy) {
    const old = path.join(base, l);
    if (!isDir(old)) continue;
    try { fs.renameSync(old, cur); return cur; } catch (e) { return old; }
  }
  return cur;
}

/** <dir>/.io (moves an old <dir>/.sky or <dir>/.safaa there the first time). */
function dataDir(dir = '.') { return resolve(dir || '.', DATA_DIR, LEGACY_DATA_DIRS); }

/** A file inside the project data folder: dataFile(dir, 'project.json'). */
function dataFile(dir, ...parts) { return path.join(dataDir(dir), ...parts); }

/** ~/.io-editor (moves an old ~/.sky-editor or ~/.safaa-studio there the first time). VAE_HOME overrides, as in the Python scripts. */
function editorHome(home = os.homedir()) {
  if (process.env.VAE_HOME) return process.env.VAE_HOME;
  return resolve(home, EDITOR_HOME, LEGACY_EDITOR_HOMES);
}

module.exports = { DATA_DIR, EDITOR_HOME, LEGACY_DATA_DIRS, LEGACY_EDITOR_HOMES, dataDir, dataFile, editorHome };
