# TGE-V2
HTML/Canvas/JavaScript based game engine designed for making retro style (80's and early 90's) games.

Clone the repository and start making games. Examples folder contains code snippets/demos which are useful when learning the engine features. Overview of rendering architecture is in the docs folder. V2 is currently in the last stages of complete overhaul from using pure HTML to 2D Canvas rendering. Some of the modules are not updated yet, but core functionality is more than adequate for creating retro games.

## Motivation
There are many excellent frameworks and engines for making browser games. But sometimes the existing solutions do not tick all the boxes. Couple of things affected the birth of TGE.
- Learning experience. First of all I wanted to understand how browser works as a 2D gaming platform - everything from real time audio processing to gamepad controls. While poking around already existing game engines will probably do the same thing, it does not come close to walking the walk yourself.
- Small footprint. Some of the existing solutions are jam packed with features and it shows. The footprint can be quite substantial. TGE is supposed to do all you need in less about 250kB code (compressed).
- Retro games. While there are indeed existing 2D and retro game engines, it is a much narrower market than ALL javascript game engines. In addition, using engines which render all game assets in 3D to mimic 2D is not exactly the same thing.

## Design principles
- Efficient and modern JavaScript code
- Perfect balance between flexibility and built-in features
- Small footprint with modular design
 
## Roadmap
V2 is based on 2D Canvas rendering with a overlay of HTML based UI components. It is currently in the last stages of complete overhaul. Some of the modules are not updated yet, but core functionality is more than adequate for creating retro games.

V3 is a planned upgrade with WebGL support. 

# Using the engine

This section will provide full details on how you should organize your game files and how to use the engine in the way it's designed.

## Getting started

Take a look at files in [primer](/primer/) folder for a barebones start up point for a TGE game.

## Game project files and folders

Make a folder for your game and create the subfolders as you do with any other game project. Clone the engine as another subfolder.
The barebones template files main.js, index.html, default.css and settings.hjson are included in the engine. Expan on them to create your game.
Take a look at the example:

```
--> Pacman
  --> js            (your game code, which may contain your .JS files and extended engine classes)
  --> TGE-V2        (game engine in its own sub-folder)
  --> images
  --> sounds
  --> music
  main.js           
  index.html        
  default.css       
  settings.hjson
```

## Extending game classes

TGE provides barebones classes from Player, Enemy, etc. Usually you never use these classes directly, but create your own extensions instead.
For example:

```
pacman.js

export class Pacman extends Player {
  constructor() {
    super();
  }
}
```

## Actors

The most important class in the engine is probably the Actor. It represents entities you have in your game, for example players, enemies, projectiles, obstacles, powerups, etc.
There are more sophisticated classes which derive from the basic Actor class, such as Player, Enemy and Projectile classes.

## Collisions

Actor need to have at least one collider attached for collisions to work. By default, 3 different types of colliders are provided: Box, Circle and Polygon. During development **showColliders** flag can be set which will visualize the colliders on an overlay layer.

See the [colliders](/examples/colliders/colliders-demo.js) example.
