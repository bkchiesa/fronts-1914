# Fronts, 1914

Original turn-based hex strategy on the fronts of 1914. Cities produce Supply. Spend it to train units and research. Move, attack, capture cities, and take capitals to win.

Open `index.html` in a browser (file:// is enough). No server and no network.

In-game help is on the How to play button. Drag the map to pan, use the wheel to zoom.

## Maps

| Map | Nations |
|-----|---------|
| Western Front | Britain (BEF Base), France, Belgium, Germany |
| Eastern Front | Germany, Austria-Hungary, Russia |
| Gallipoli | Britain, France, Ottoman Empire |
| Europe 1914 | All ten, including the United States at AEF Base |

## Nations

Shared research unlocks cavalry, field artillery, ships, fighters, and Trenchworks (+1 infantry defense). Each nation also has one method and one unit: Britain Grand Fleet / Dreadnought, France Soixante-Quinze / 75mm gun, Germany Storm Tactics / Stormtrooper, Austria-Hungary Alpine Corps / Mountain Infantry, Russia Levy / Mass Infantry, Ottoman Empire Redoubt / Fortified Infantry, Italy Alpini Corps / Alpini, United States Air Service / Fighter (earlier and cheaper), Serbia Irregulars / Guerrilla, Belgium Forts / Fortress Gun.

Khaki Plate art is loaded from `art/terrain/`, `art/settlements/`, `art/nations/`, `art/units/`, and `art/ui/frame.png`. Flags stay `art/flag_*.png`. A unit with no matching plate uses the closest file for that nation. The title screen plays first; Begin opens the map and nation setup.

Original music and sound effects are generated in the browser. No audio files are downloaded. The Sound button at the top left turns them off or on for this tab session. Music starts on the first click: a fuller piece on the title screens, then a quieter loop once a match starts.
