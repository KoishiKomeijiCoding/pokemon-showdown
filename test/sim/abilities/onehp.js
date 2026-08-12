'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

describe('One HP', () => {
	afterEach(() => {
		battle.destroy();
	});

	it('should allow its user to survive a hit when at exactly 1 HP', () => {
		battle = common.createBattle([[
			{ species: 'Wynaut', ability: 'onehp', moves: ['sleeptalk'] },
		], [
			{ species: 'Charizard', ability: 'drought', moves: ['fusionflare'] },
		]]);
		battle.makeChoices('move sleeptalk', 'move fusionflare');
		assert.equal(battle.p1.active[0].hp, 1);
	});

	it('should not activate when the user has more than 1 HP', () => {
		battle = common.createBattle([[
			{ species: 'Paras', ability: 'onehp', moves: ['sleeptalk'] },
		], [
			{ species: 'Charizard', ability: 'drought', moves: ['fusionflare'] },
		]]);
		battle.makeChoices('move sleeptalk', 'move fusionflare');
		assert.fainted(battle.p1.active[0]);
	});
});
