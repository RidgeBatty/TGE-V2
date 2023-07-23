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

# Getting started

Take a look at files in [primer](/primer/) folder for a barebones start up point for a TGE game.

# Collisions

Actor need to have at least one collider attached for collisions to work. By default, 3 different types of colliders are provided: Box, Circle and Polygon. During development **showColliders** flag can be set which will visualize the colliders on an overlay layer.

See the [colliders](/examples/colliders/colliders-demo.js) example.
