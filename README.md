# Fronts, 1914

Original turn-based hex strategy set on the fronts of the First World War. Cities produce industry points (stars). Spend them on units and research. Move, attack, capture cities, and seize capitals to win.

**Not affiliated with any other strategy title.** Tribe names, unit names, art, and UI from other games are not used here.

## How to play

1. Open `index.html` in a modern browser (Chrome, Firefox, Edge). No build step and no server required.
2. Choose a **map**, your **nation**, and **Solo vs AI** or **Hotseat**.
3. Click **Begin Campaign**.

### Turn flow

- Each turn you gain stars from cities you own.
- Click a unit to select it. Blue overlays show legal moves. Red overlays show attack targets.
- Click an empty hex to move. Click an enemy to attack.
- Click one of your empty cities to open the recruit list.
- Open **Research (T)** to buy techs.
- Press **End Turn (E)** when finished.

### Controls

| Input | Action |
|--------|--------|
| Click | Select / move / attack / recruit |
| WASD or arrows | Pan the map |
| E or End Turn | End your turn |
| T | Toggle tech tree |
| Escape | Close panels |

### Victory and defeat

- **Win** if you are the last nation standing, or if you hold every capital on the map.
- **Lose** if you no longer own any cities.

Capturing a capital is decisive pressure even before total victory.

## Maps

| Map | Focus | Playable nations |
|-----|--------|------------------|
| Europe 1914 | Full theater, Channel to Black Sea | Britain, France, Germany, Austria-Hungary, Russia, Ottoman Empire, Italy, Serbia, Belgium |
| Western Front | Channel to Switzerland, trench belt | Britain, France, Germany, Belgium, United States |
| Eastern Front | Baltic to Carpathians | Germany, Austria-Hungary, Russia, Serbia |
| Gallipoli / Dardanelles | Peninsula landings and the strait | Britain, France, Ottoman Empire |

Nations that are not on a small map cannot be selected there. The United States is playable on the Western Front (AEF sector). It is not on the 1914 Europe opening roster.

## Nations and uniques

| Nation | Ability | Unique unit |
|--------|---------|-------------|
| Britain | Ships cost 1 less; starts with Coastal Patrol | Dreadnought |
| France | Artillery +1 damage; starts with Field Guns | Canon de 75 |
| Germany | Stormtroopers may move again after a killing blow | Stormtrooper |
| Austria-Hungary | Mountains cost 1 move | Mountain Infantry |
| Russia | Infantry cheaper; all tech costs +1 | Rifle Mass |
| Ottoman Empire | Fortified Infantry +2 defense in cities and trenches | Fortified Infantry |
| Italy | Alpini treat mountains as open and gain +1 attack there | Alpini |
| United States | After Factories, cities produce extra stars and may grow | (standard infantry focus) |
| Serbia | Guerrillas heal in forest and fight better from forest | Guerrilla |
| Belgium | Owned cities +2 defense | Fortress Gun |

Tech trees share the same skeleton (organization, industry, artillery, navy, air). Nations change some costs or starting nodes as listed in their abilities.

## Terrain

- **Plains / hills / desert**: normal movement.
- **Forest**: defense bonus; Serbia guerrillas thrive here.
- **Mountain**: slower (unless Alpine / mountain infantry / Austria-Hungary).
- **Water**: ships and fighters only (after navy / air techs).
- **Trench**: strong defense (Western Front).
- **Swamp**: slower movement.

## Project layout

```
ww1-fronts/
  index.html
  README.md
  css/game.css
  js/          hex, data, maps, art, game, ai, ui, main
  art/         PNG sprites (terrain, units, flags, UI)
  gen_art.py   regenerates default art
```

Drop replacement PNGs into `art/` using the same filenames. The loader (`js/art.js`) loads by filename and falls back to a simple procedural tile if a file is missing.

## AI

Opponents expand from cities, research toward organization and artillery, march on enemy cities, and attack when in range. They are aggressive but not optimal.

## License note

Original game code and generated art for this project. Historical names of countries and cities are used for setting only.
