# Docs

## Changing levels/ending a game

To pause the game loop, including all timers, particles, animations and actors, etc.
```
GameLoop.pause();     
```

Another option is to keep things happening and only disable collisions:
```
GameLoop.flags.collisionsEnabled = false;
```
