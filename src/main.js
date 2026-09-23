/**
 * Entry: boot the game on the canvas, run the loop, expose it for debugging.
 */

import { startLoop } from "./engine/loop.js";
import { createGame } from "./game/game.js";

const canvas = document.getElementById("game");
const game = createGame(canvas, document.getElementById("ui"));
game.loop = startLoop(canvas, game);
window.__game = game;
