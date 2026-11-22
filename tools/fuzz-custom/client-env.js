'use strict';
// Charge le vrai client (code compilé + données générées) dans Node, avec la scène factice, pour rejouer des journaux de combat.
const path = require('path');
const C = process.env.CLIENT_DIR;
if (!C) throw new Error('CLIENT=1 demande CLIENT_DIR=<chemin du client>/play.pokemonshowdown.com (client compilé avec node build)');
global.window = global;
global.BattleStatusAnims = {}; global.BattleOtherAnims = {}; global.BattleMoveAnims = {};
const realLog = console.log;
global.BattlePokedex = require(C + '/data/pokedex.js').BattlePokedex;
global.BattleMovedex = require(C + '/data/moves.js').BattleMovedex;
global.BattleItems = require(C + '/data/items.js').BattleItems;
global.BattleAbilities = require(C + '/data/abilities.js').BattleAbilities;
global.BattleTypeChart = require(C + '/data/typechart.js').BattleTypeChart;
global.BattleAliases = require(C + '/data/aliases.js').BattleAliases;
global.BattleText = require(C + '/data/text.js').BattleText;
try { global.BattleFormatsData = require(C + '/data/formats-data.js').BattleFormatsData; } catch (e) { /* facultatif */ }
require(C + '/js/battle-dex-data.js');
require(C + '/js/battle-dex.js');
require(C + '/js/battle-scene-stub.js');
require(C + '/js/battle-text-parser.js');
require(C + '/js/battle.js');
module.exports = {
	replay(allLines) {
		const errs = [];
		const lines = allLines;
		console.log = () => {}; // le client contient des console.log de debug
		try {
			const b = new global.Battle({debug: true, log: lines.slice()});
			if (b.seekTurn) b.seekTurn(Infinity);
		} catch (e) { errs.push('CLIENT: ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); }
		const tp = new global.BattleTextParser();
		for (const l of lines) {
			try { tp.extractMessage(l + '\n'); } catch (e) { errs.push('PARSER: ' + l.slice(0, 120) + ' -> ' + e.message); break; }
		}
		console.log = realLog;
		return errs;
	},
};
