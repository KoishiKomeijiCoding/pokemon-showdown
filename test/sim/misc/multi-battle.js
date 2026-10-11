'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('Free-for-all', () => {
	afterEach(() => {
		battle.destroy();
	});

	/*it(`should support forfeiting`, () => {
		battle = common.createBattle({ gameType: 'freeforall' }, [[
			{ species: 'wynaut', moves: ['vitalthrow'] },
		], [
			{ species: 'scyther', moves: ['sleeptalk'] },
		], [
			{ species: 'scyther', moves: ['sleeptalk', 'uturn'] },
			{ species: 'wynaut', moves: ['vitalthrow'] },
		], [
			{ species: 'scyther', moves: ['sleeptalk'] },
		]]);
		battle.makeChoices();
		battle.lose('p2');
		assert(battle.p2.activeRequest.wait);
		battle.makeChoices('auto', '', 'move uturn 1', 'auto');
		battle.lose('p3');
		battle.makeChoices();
		assert.equal(battle.turn, 4);
	});*/

	it('should finish a four-team battle using only Brainrot', () => {
		const teams = Array.from({ length: 4 }, () => Array.from({ length: 6 }, () => ({
			species: 'Tung Tung Tung Sahur', ability: 'aislop', moves: ['brainrot','uturn'],
		})));
		battle = common.createBattle({ gameType: 'freeforall' }, teams);

		let turns = 0;
		while (!battle.ended && turns < 1000) {
			battle.makeChoices();
			turns++;
		}
		console.log(turns);

		assert(battle.ended, 'The battle should end with one team remaining');
		assert(battle.winner, 'The battle should have a winner');
	});
});
