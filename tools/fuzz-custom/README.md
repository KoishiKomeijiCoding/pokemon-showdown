# Fuzzer des ajouts custom

Lance des milliers de combats aléatoires (IA aléatoire, 100 tours max) avec Sherlock Holmes, Hephaistos, Punk Cybernetique,
Tung Tung Tung Sahur (AI Slop + Brainrot) et toutes les nouvelles capacités / talents / objets, et vérifie :
crashs du simulateur, parties bloquées, invariants du système de forge, et (CLIENT=1) rejeu de chaque combat dans le vrai client.

```bash
node build
cd tools/fuzz-custom && source run.sh
CLIENT=1 EXTRA=7 run mixed 63 1000000     # 700 combats répartis sur 11 processus, résultats dans out_mixed/ (puis : report out_mixed)
```

`summarize.js <dossier>` regroupe les erreurs par signature ; `dbg-client.js <journal>` rejoue un journal d'échec dans le client.
Bugs connus hors de ces ajouts : Lance Oiseau (type « Bird » absent du tableau des types), `|-ability|Mécaniques 1G` sans Pokémon,
`|-iearthemmune|` (Earth Eater), Transform sur soi avec Pouvoir Gigamax.
