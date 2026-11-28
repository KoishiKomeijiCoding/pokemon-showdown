'use strict';
// Fuzzer des ajouts custom (Sherlock Holmes, Hephaistos, Punk Cybernetique, forge, Detective...).
// Prérequis : `node build` à la racine. Usage : node worker.js <workerId> <count> <baseSeed> <outDir> [maxTurns=100] [mode]
// Modes : mixed | mine | extreme | long | stress | vanilla ; CLIENT=1 rejoue aussi chaque combat dans le client (CLIENT_DIR).
const path = require('path');
const W = path.join(__dirname, '../../dist/sim');
const {Dex, Teams, PRNG, BattleStream, getPlayerStreams} = require(W);
const {RandomPlayerAI} = require(W + '/tools/random-player-ai');
const {Pokemon} = require(W + '/pokemon');
const fs = require('fs');
const CLIENT = process.env.CLIENT === '1';
const clientEnv = CLIENT ? require('./client-env.js') : null;
const [,, workerId, count, baseSeed, outDir, maxTurnsArg, modeArg] = process.argv;
const MAX_TURNS = +(maxTurnsArg || 100);
const MODE = modeArg || 'mixed';

const NEW_SPECIES = ['Sherlock Holmes', 'Hephaistos', 'Punk Cybernetique', 'Le Coq Francais', 'Dodoria', 'Sixseven', 'Bouliste Hero'];
const NEW_MOVES = ['masterpiece', 'enquetespeciale', 'lameakebab', 'gicleedesaucealgerienne', 'durumexpress', 'balles', 'cocorico', 'tourdefrance', 'chantducoq', 'manif', 'chatter', 'hypervoice', 'boomburst'];
const NEW_ABILITIES = ['detective', 'dieudelaforge', 'brocherotative', 'patriotisme'];
const FORGE = Pokemon.FORGE_ITEMS.map(i => i.id);
const allSpecies = Dex.species.all().filter(s => s.exists && !s.isNonstandard || (s.exists && s.num >= 10000));
const customSpecies = Dex.species.all().filter(s => s.exists && s.num >= 10000 && !s.name.endsWith('-Mega'));
const normalSpecies = Dex.species.all().filter(s => s.exists && s.num > 0 && s.num < 10000 && !s.isNonstandard && !s.forme);
const shitMoves = Dex.moves.all().filter(m => m.exists && m.flags.shitpost && !m.isZ && !m.isMax).map(m => m.id);
const normalMoves = Dex.moves.all().filter(m => m.exists && !m.isNonstandard && !m.isZ && !m.isMax && !m.flags.shitpost).map(m => m.id);
const shitAbilities = Dex.abilities.all().filter(a => a.exists && a.flags.shitpost).map(a => a.id);
const allAbilities = Dex.abilities.all().filter(a => a.exists && a.id !== 'noability').map(a => a.id);
const allItems = Dex.items.all().filter(i => i.exists && !i.isNonstandard).map(i => i.id);

// IA aléatoire robuste : si le serveur refuse un choix (ex. cible donnée à une capacité devenue Max Guard avec Dynamax),
// on répond 'default' au lieu de planter, comme le ferait un joueur humain après un message d'erreur.
let aiInvalid = 0; const aiMsgs = {};
const aiExamples = [];
class SafeAI extends RandomPlayerAI {
	choose(c) { this.lastChoice = c; return super.choose(c); }
	receiveRequest(request) { this.lastRequest = request; return super.receiveRequest(request); }
	receiveError(error) {
		if (error.message.startsWith('[Unavailable choice]')) return;
		if (error.message.startsWith('[Invalid choice]')) { aiInvalid++; const k = error.message.replace(/for .*$|: .* needs a target/, ' needs a target').slice(0, 90); aiMsgs[k] = (aiMsgs[k] || 0) + 1; if (aiExamples.length < 5) aiExamples.push({msg: error.message, choice: this.lastChoice, active: this.lastRequest && this.lastRequest.active && this.lastRequest.active.map(a => a && a.moves.map(m => m.move + ':' + m.target + (m.disabled ? ':dis' : ''))), canDynamax: this.lastRequest && this.lastRequest.active && this.lastRequest.active.map(a => a && !!a.canDynamax)}); this.choose('default'); return; }
		throw error;
	}
}
const pick = (rng, arr) => arr[rng.random(arr.length)];
const chance = (rng, p) => rng.random(1000) < p * 1000;

function makeSet(rng, speciesName, opts = {}) {
	const sp = Dex.species.get(speciesName);
	const moves = new Set(opts.mustMoves || []);
	const nMoves = opts.nMoves || (4 + rng.random(5)); // 4 à 8 capacités
	const newBias = opts.newBias ?? 0.5;
	let guard = 0;
	while (moves.size < nMoves && guard++ < 100) {
		const r = rng.random(100) / 100;
		if (r < newBias) moves.add(pick(rng, NEW_MOVES));
		else if (r < newBias + 0.25) moves.add(pick(rng, shitMoves));
		else moves.add(pick(rng, normalMoves));
	}
	let ability = opts.ability || Object.values(sp.abilities)[0];
	if (!opts.ability && chance(rng, 0.45)) {
		const r = rng.random(3);
		ability = r === 0 ? pick(rng, NEW_ABILITIES) : r === 1 ? pick(rng, shitAbilities) : pick(rng, allAbilities);
	}
	let item = opts.item;
	if (item === undefined) {
		if (sp.name === 'Hephaistos' && chance(rng, 0.85)) item = 'lingotdefer';
		else item = chance(rng, 0.5) ? pick(rng, chance(rng, 0.4) ? FORGE : allItems) : '';
	}
	const evs = {hp: rng.random(253), atk: rng.random(253), def: rng.random(253), spa: rng.random(253), spd: rng.random(253), spe: rng.random(253)};
	return {
		name: chance(rng, 0.3) ? 'Nick' + rng.random(99) : '', species: sp.name, item, ability, moves: [...moves],
		nature: pick(rng, ['Serious', 'Modest', 'Adamant', 'Timid', 'Bold']), gender: pick(rng, ['M', 'F', '']), evs,
		ivs: {hp: 31, atk: rng.random(32), def: 31, spa: 31, spd: 31, spe: 31}, level: chance(rng, 0.8) ? 100 : 1 + rng.random(100),
		teraType: chance(rng, 0.2) ? pick(rng, ['Normal', 'Fire', 'Psychic', 'Steel', 'Stellar']) : undefined,
	};
}

function makeTeam(rng, kind, minSize = 1) {
	const size = Math.max(minSize, 1 + rng.random(6));
	const team = [];
	if (kind === 'stress') {
		// Stress du système de forge : plusieurs Hephaistos + objets/capacités qui forcent des sorties, copient, volent, échangent...
		const disruptors = ['uturn', 'voltswitch', 'batonpass', 'transform', 'skillswap', 'trick', 'switcheroo', 'knockoff', 'haze', 'destinybond',
			'explosion', 'partingshot', 'roar', 'whirlwind', 'dragontail', 'rolePlay', 'entrainment', 'gastroacid', 'worryseed', 'wish', 'revivalblessing',
			'soulswap', 'brainrot', 'recycle', 'bestow', 'corrosivegas', 'imprison', 'spectralthief', 'suckerpunch', 'counter'].map(m => m.toLowerCase());
		const items = ['ejectbutton', 'ejectpack', 'redcard', 'sitrusberry', 'whiteherb', 'mentalherb', 'airballoon', 'weaknesspolicy', 'mirrorherb', 'leftovers', 'abilityshield', 'clearamulet', 'covertcloak', ''];
		const n = Math.max(minSize, 3 + rng.random(4));
		for (let i = 0; i < n; i++) {
			const name = chance(rng, 0.7) ? 'Hephaistos' : pick(rng, NEW_SPECIES);
			const set = makeSet(rng, name, {mustMoves: ['masterpiece', pick(rng, disruptors), pick(rng, disruptors), pick(rng, disruptors)], nMoves: 6 + rng.random(3), newBias: 0.1});
			set.item = name === 'Hephaistos' && chance(rng, 0.7) ? 'lingotdefer' : pick(rng, items);
			set.moves = set.moves.filter(m => Dex.moves.get(m).exists);
			team.push(set);
		}
		return team;
	}
	if (kind === 'vanilla') {
		// Témoin : uniquement des Pokémon et capacités officiels (aucun ajout custom)
		const n = Math.max(minSize, 2 + rng.random(5));
		for (let i = 0; i < n; i++) {
			const sp = pick(rng, normalSpecies);
			const moves = new Set(); while (moves.size < 4) moves.add(pick(rng, normalMoves));
			team.push({name: '', species: sp.name, item: '', ability: Object.values(sp.abilities)[0], moves: [...moves], nature: 'Serious', gender: '', evs: {hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85}, ivs: {}, level: 100});
		}
		return team;
	}
	if (kind === 'long') {
		// Combats qui durent : capacités surtout de statut, équipes robustes (jusqu'à 100 tours)
		const n = Math.max(minSize, 2 + rng.random(5));
		const stall = ['masterpiece', 'enquetespeciale', 'durumexpress', 'splash', 'recover', 'roost', 'protect', 'lameakebab', 'softboiled', 'synthesis'];
		for (let i = 0; i < n; i++) {
			const name = pick(rng, [...NEW_SPECIES, 'Tung Tung Tung Sahur', 'Blissey', 'Taira no Fumikado', 'Chansey']);
			const set = makeSet(rng, name, {mustMoves: [pick(rng, stall), pick(rng, stall), pick(rng, stall), 'splash'], nMoves: 6, newBias: 0});
			set.moves = [...new Set([...set.moves.filter(m => stall.includes(m)), 'splash'])];
			set.evs = {hp: 252, atk: 0, def: 252, spa: 0, spd: 252, spe: 0}; set.level = 100;
			team.push(set);
		}
		return team;
	}
	if (kind === 'extreme') {
		// Tung Tung Tung Sahur (AI Slop) + Brainrot + toutes les nouvelles attaques
		const n = 2 + rng.random(5);
		for (let i = 0; i < n; i++) {
			if (i === 0 || chance(rng, 0.5)) {
				team.push(makeSet(rng, 'Tung Tung Tung Sahur', {ability: 'aislop', mustMoves: ['brainrot', ...NEW_MOVES.slice(0, 5)], nMoves: 8 + rng.random(4)}));
			} else team.push(makeSet(rng, pick(rng, NEW_SPECIES), {newBias: 0.7}));
		}
		return team;
	}
	for (let i = 0; i < size; i++) {
		const r = rng.random(100);
		let name;
		if (kind === 'mine' || r < 35) name = pick(rng, NEW_SPECIES);
		else if (r < 70) name = pick(rng, customSpecies).name;
		else name = pick(rng, normalSpecies).name;
		const opts = {};
		if (name === 'Hephaistos') opts.mustMoves = ['masterpiece'];
		if (name === 'Sherlock Holmes') opts.mustMoves = ['enquetespeciale'];
		if (name === 'Punk Cybernetique') opts.mustMoves = ['lameakebab', 'durumexpress'];
		if (name === 'Tung Tung Tung Sahur') opts.mustMoves = ['brainrot'];
		if (name === 'Le Coq Francais') opts.mustMoves = ['tourdefrance', 'chantducoq', 'manif'];
		team.push(makeSet(rng, name, opts));
	}
	return team;
}

function checkInvariants(b) {
	const v = [];
	if (!b) return v;
	for (const side of b.sides) for (const p of side.pokemon) {
		const id = `${side.id}:${p.name}`;
		if (p.forgeSwapping) v.push(`${id} forgeSwapping resté vrai`);
		if (p.itemState && p.itemState.forged) v.push(`${id} itemState forgé installé comme objet tenu`);
		const ids = p.forgedItems.map(f => f.id);
		if (new Set(ids).size !== ids.length) v.push(`${id} objets forgés en double: ${ids}`);
		if (ids.length > 22) v.push(`${id} plus de 22 objets forgés`);
		if (ids.some(x => !FORGE.includes(x))) v.push(`${id} objet forgé inconnu: ${ids}`);
		if (!(p.forgePending >= 0)) v.push(`${id} forgePending=${p.forgePending}`);
		if (p.forgeOffer && b.requestState !== 'forge') v.push(`${id} proposition de forge restée hors requête`);
		if (p.forgeOffer && (p.forgeOffer.length < 1 || p.forgeOffer.length > 3)) v.push(`${id} proposition de taille ${p.forgeOffer.length}`);
		const t = p.abilityState && p.abilityState.tranches;
		if (p.ability === 'brocherotative' && t !== undefined && !(t >= 0 && t <= 3)) v.push(`${id} tranches=${t}`);
		if (p.hp === 0 && (p.forgePending > 0 || p.forgeOffer) && b.requestState === 'forge') v.push(`${id} KO avec forge en attente pendant une requête`);
		if (p.hp < 0 || p.hp > p.maxhp || !Number.isInteger(p.hp)) v.push(`${id} hp invalide ${p.hp}/${p.maxhp}`);
		if (p.hp === 0 && !p.fainted && !p.faintQueued && b.turn > 0) v.push(`${id} hp=0 non KO`);
	}
	if (b.requestState === 'forge') {
		for (const side of b.sides) {
			const req = side.activeRequest;
			if (req && req.forge && !side.active.some(p => p && p.forgeOffer)) v.push(`${side.id} requête forge sans proposition`);
		}
	}
	return v;
}

async function runBattle(i) {
	const seed = [+baseSeed + i, 7 * i + 1, 13 * i + 5, 29 * i + 11];
	const rng = new PRNG(seed);
	const r = rng.random(100);
	const kind = MODE === 'mixed' ? (r < 25 ? 'extreme' : r < 65 ? 'mine' : 'wild') : MODE;
	const fr = MODE === 'vanilla' ? 90 : rng.random(100);
	const format = fr < 55 ? 'gen9customgame' : fr < 75 ? 'gen9customgame@@@!teampreview' : 'gen9doublescustomgame';
	const minSize = format.includes('doubles') ? 2 : 1;
	const t1 = makeTeam(rng, kind, minSize), t2 = makeTeam(rng, (kind === 'vanilla' || chance(rng, 0.5)) ? kind : 'wild', minSize);
	const p1team = Teams.pack(t1), p2team = Teams.pack(t2);
	const stream = new BattleStream();
	const streams = getPlayerStreams(stream);
	const errors = [];
	const specLines = [];
	if (CLIENT) (async () => { for await (const c of streams.spectator) for (const l of c.split('\n')) if (l.startsWith('|')) specLines.push(l); })().catch(() => {});
	const ai = (s, k) => new SafeAI(s, {seed: [seed[0] + k, 3, 5, 7], move: 0.75, mega: process.env.MEGA !== undefined ? +process.env.MEGA : 0.5});
	const p1 = ai(streams.p1, 1), p2 = ai(streams.p2, 2);
	p1.start().catch(e => errors.push('P1AI: ' + (e && e.stack || e)));
	p2.start().catch(e => errors.push('P2AI: ' + (e && e.stack || e)));
	const spec = {formatid: format, seed};
	void streams.omniscient.write(`>start ${JSON.stringify(spec)}\n>player p1 ${JSON.stringify({name: 'P1', team: p1team})}\n>player p2 ${JSON.stringify({name: 'P2', team: p2team})}`);
	let turn = 0, forced = false, ended = false;
	const ring = [];
	const stats = {forge: 0, ddos: 0, reveal: 0, slices: 0, masterpiece: 0, ens: 0, kebab: 0, sauce: 0, durum: 0};
	try {
		while (true) {
			const TIMEOUT = Symbol('timeout');
			const chunk = await Promise.race([streams.omniscient.read(), new Promise(r => setTimeout(() => r(TIMEOUT), 6000))]);
			if (chunk === TIMEOUT) { errors.push('STALL: aucun message pendant 6 s (partie bloquée), tour ' + turn); break; }
			if (chunk === null || chunk === undefined) break;
			for (const line of chunk.split('\n')) {
				if (line.startsWith('|turn|')) turn = +line.slice(6);
				if (line.startsWith('|win|') || line === '|tie') ended = true;
				if (line.startsWith('|error|')) errors.push('ERRLINE: ' + line);
				if (/Forge: \d/.test(line)) stats.forge++;
				if (/lance un DDoS/.test(line)) stats.ddos++;
				if (/^\|-revealteam/.test(line)) stats.reveal++;
				if (/Tranches: \d/.test(line)) stats.slices++;
				if (/\|move\|[^|]*\|Masterpiece\|/.test(line)) stats.masterpiece++;
				if (/\|move\|[^|]*\|Enquete speciale\|/.test(line)) stats.ens++;
				if (/\|move\|[^|]*\|Lame a Kebab\|/.test(line)) stats.kebab++;
				if (/\|move\|[^|]*\|Giclee de Sauce Algerienne\|/.test(line)) stats.sauce++;
				if (/\|move\|[^|]*\|Durum Express\|/.test(line)) stats.durum++;
				ring.push(line); if (ring.length > 60) ring.shift();
			}
			const viol = checkInvariants(stream.battle);
			if (viol.length) { errors.push('INVARIANT: ' + viol.join(' ; ') + ' (tour ' + turn + ')'); break; }
			if (turn >= MAX_TURNS && !forced && !ended) { forced = true; void streams.omniscient.write('>forcetie'); }
		}
	} catch (e) {
		errors.push('STREAM: ' + (e && e.stack || e));
	}
	if (CLIENT && !errors.length) { await new Promise(r => setTimeout(r, 20)); for (const e of clientEnv.replay(specLines)) errors.push(e); if (errors.length) fs.writeFileSync(`${outDir}/fail_${i}.log`, specLines.join('\n') + '\n'); }
	return {i, seed, format, kind, turn, ended, errors, stats, p1team, p2team, tail: errors.length ? ring.slice(-40) : undefined};
}

(async () => {
	const out = fs.createWriteStream(`${outDir}/worker${workerId}.jsonl`);
	let done = 0, crashed = 0, turns = 0;
	const agg = {forge: 0, ddos: 0, reveal: 0, slices: 0, masterpiece: 0, ens: 0, kebab: 0, sauce: 0, durum: 0};
	const my = +count + (+workerId <= +(process.env.EXTRA || 0) ? 1 : 0);
	for (let i = 0; i < my; i++) {
		const idx = +workerId * 100000 + i;
		process.stdout.write(`START ${idx}\n`);
		let res;
		try { res = await runBattle(idx); } catch (e) { res = {i: idx, errors: ['DRIVER: ' + (e && e.stack || e)]}; }
		done++; turns += res.turn || 0;
		for (const k in agg) agg[k] += (res.stats && res.stats[k]) || 0;
		if (res.errors.length) { crashed++; out.write(JSON.stringify(res) + '\n'); }
		process.stdout.write(`DONE ${idx} turns=${res.turn} err=${res.errors.length}\n`);
	}
	process.stdout.write('SUMMARY ' + JSON.stringify({workerId, done, crashed, turns, agg, aiInvalid, aiMsgs, aiExamples}) + '\n');
	out.end();
})();
