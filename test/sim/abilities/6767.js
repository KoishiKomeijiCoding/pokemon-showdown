'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('6767', () => {
	afterEach(() => {
		battle.destroy();
	});

	it('should set opposing active Pokemon to 67% HP on switch-in', () => {
		battle = common.createBattle({gameType: 'doubles'}, [[
			{species: 'SixSeven', ability: '6767', moves: ['sleeptalk']},
			{species: 'Wynaut', moves: ['sleeptalk']},
		], [
			{species: 'Charizard', moves: ['sleeptalk']},
			{species: 'Lucario', moves: ['sleeptalk']},
		]]);

		for (const foe of battle.p2.active) {
			const expectedHp = Math.trunc(foe.maxhp * 67 / 100);
			assert.equal(foe.hp, expectedHp);
		}
	});
});
