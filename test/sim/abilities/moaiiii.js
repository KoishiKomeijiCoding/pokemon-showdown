'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

describe("Moaiiii", () => {
	it(`should not announce its ability on opposing Pokemon when it boosts them`, () => {
		const battle = common.createBattle({ }, [[
			{ species: 'Mew', ability: 'moaiiii', moves: ['splash'] },
		], [
			{ species: 'Mew', moves: ['splash'] },
		]]);
		try {
			battle.makeChoices();

			assert(battle.log.some(line => line.startsWith('|-boost|p2a:')), `Moaiiii should still boost the opponent`);
			assert.false(battle.log.some(line => line.startsWith('|-ability|p2a:') && line.endsWith('|Moaiiii|boost')),
				`Moaiiii should not appear to be the opponent's ability`);
		} finally {
			battle.destroy();
		}
	});
});
