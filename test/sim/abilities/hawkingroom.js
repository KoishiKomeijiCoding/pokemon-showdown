'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('Hawking Room', () => {
	afterEach(() => {
		battle.destroy();
	});

	it('should activate Trick Room upon switch-in', () => {
		battle = common.createBattle([[
			{ species: 'Mew', ability: 'hawkingroom', moves: ['splash'] },
		], [
			{ species: 'Abra', ability: 'synchronize', moves: ['teleport'] },
		]]);
		assert(battle.field.getPseudoWeather('trickroom'));
	});
});
