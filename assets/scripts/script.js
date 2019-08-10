window.addEventListener('DOMContentLoaded', () => {
    // Hexadecimal to RGB
    function hexToRgb(color) {
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        color = color.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });
    
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {
            r: 0,
            g: 0,
            b: 0
        };
    }

    // Set volume
    function updateVolume() {
        for(let i = 0; i < audio.length; i++) {
            audio[i].volume = (volume != 0) ? 0.33 * volume : 0;
        }
    }

    // Sprite loading function
    let loadSprite = (path) => {
        sprites[currentSprite] = new Image();
        loadedSprites[currentSprite] = false;
        sprites[currentSprite].src = path;

        sprites[currentSprite].onload = function () {
            loadedSprites[sprites.indexOf(this)] = true;
        };


        currentSprite++;
    };

    // Audio loading function
    let loadAudio = (path) => {
        audio[currentAudio] = new Audio(path);
        loadedAudio[currentAudio] = false;
        
        audio[currentAudio].addEventListener("loadeddata", function() {
            loadedAudio[audio.indexOf(this)] = true;
        });


        currentAudio++;
    };

    // Text class
    class Text {
        fonts = new Map();
        allFontsLoaded = false;
        loadedFonts = [];

        // Get text width
        getTextWidth = (text, font, size) => {
            let width = 0;
            let fontShortcut = this.fonts.get(font);

            for(let i = 0; i < text.length; i++) {
                // Line breaks
                 if(text[i] == " ") {
                    width += fontShortcut.spaceWidth * size;

                    continue;
                }

                width += (fontShortcut.sprites.get(text[i]).z + fontShortcut.glyphSpacing) * size;
            }



            return width;
        };

        // Text loading function
        loadText = (font, src) => {
            let thisFont = new TextFont(src);

            // Glyph loading
            let xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    let myObj = JSON.parse(this.responseText);

                    for(let i = 0; i < myObj.glyphs.length; i++) {
                        thisFont.add(myObj.glyphs[i].glyph, myObj.glyphs[i].x, myObj.glyphs[i].y, myObj.glyphs[i].width, myObj.glyphs[i].height);
                    }

                    thisFont.glyphSpacing = myObj.glyphSpacing;
                    thisFont.breakHeight = myObj.breakHeight;
                    thisFont.lineHeight = myObj.lineHeight;
                    thisFont.spaceWidth = myObj.spaceWidth;
                }
            };
            xmlhttp.open("GET", "./assets/fonts/FontStuck.json", true);
            xmlhttp.send();

            this.fonts.set(font, thisFont);
        };

        // Text drawing function
        drawText = (text, x, y, font, colour, size) => {
            let offsetX = 0;
            let offsetY = 0;
            let fontShortcut = this.fonts.get(font);

            for(let i = 0; i < text.length; i++) {
                // Line breaks
                if(text[i] == "\\" && text[i + 1] == "n") {
                    offsetX = 0;
                    offsetY += (fontShortcut.lineHeight + fontShortcut.breakHeight) * size;
                    i += 1;

                    continue;
                } else if(text[i] == " ") {
                    offsetX += fontShortcut.spaceWidth * size;

                    continue;
                }

                // Drawing
                let spriteShortcut = fontShortcut.sprites.get(text[i]);

                if(spriteShortcut !== undefined) {
                    ctxSprite.drawImage(fontShortcut.source, spriteShortcut.x, spriteShortcut.y, spriteShortcut.z, spriteShortcut.w, x + offsetX, y + offsetY, spriteShortcut.z * size, spriteShortcut.w * size);
                } else {
                    console.log("Glyph missing: " + text[i]);
                    break;
                }

                // Glyph movement
                offsetX += (spriteShortcut.z + fontShortcut.glyphSpacing) * size;
            }

            // Recolour
            var spriteData = ctxSprite.getImageData(0, 0, DOMcanvasSprite.width, DOMcanvasSprite.height);
            var data = spriteData.data;

            for(var p = 0; p < data.length; p += 4) {
                data[p + 0] = colour.r; // Red
                data[p + 1] = colour.g; // Green
                data[p + 2] = colour.b; // Blue
            }

            // Place on buffer
            ctxSprite.putImageData(spriteData, 0, 0);

            ctxBuffer.drawImage(DOMcanvasSprite, 0, 0);


            ctxSprite.clearRect(0, 0, DOMcanvasSprite.width, DOMcanvasSprite.height);
        };
    }

    // Text font object
    class TextFont {
        source = new Image();
        sprites = new Map();
        glyphSpacing = 0;
        breakHeight = 0;
        lineHeight = 0;
        spaceWidth = 0;

        constructor(src) {
            this.source = new Image();
            this.source.src = src;
        };

        // Add sprite
        add = (glyph, offsetx, offsety, width, height) => {
            this.sprites.set(glyph, new Vector4(offsetx, offsety, width, height));
        };
    }

    // Animated Gif object
    class AnimatedGif {
        frames = [];
        loadedFrames = [];
        timing = [];
        curTiming = 0;
        curFrame = 0;
        isPlaying = false;
        transform = new Vector4();

        constructor(frames, timing) {
            gifs[currentGif] = this;
            loadedGifs[currentGif] = false;

            for(let i = 0; i < frames.length; i++) {
                this.frames[i] = new Image();
                this.frames[i].src = frames[i];

                this.loadedFrames[i] = false;

                this.frames[i].onload = (e) => {
                    this.loadedFrames[this.frames.indexOf(e.path[0])] = true;

                    if(frames.length == this.loadedFrames.length) {
                        let hasFailed = false;
                        
                        for(let n = 0; n < this.loadedFrames.length; n++) {
                            if(this.loadedFrames[n] == false) {
                                hasFailed = true;
                                break;
                            }
                        }

                        if(!hasFailed) {
                            loadedGifs[gifs.indexOf(this)] = true;
                        }
                    }
                };
            }

            this.timing = timing;

            currentGif++;
        };

        setTransform = (x, y, width, height) => {
            this.transform = new Vector4(x, y, width, height);
        };

        start = () => {
            this.isPlaying = true;
        };

        stop = () => {
            this.isPlaying = false;
        };

        reset = () => {
            this.curFrame = 0;
            this.curTiming = this.timing[0];
        };

        update = () => {
            if(this.transform.z !== -1 && this.transform.w !== -1) {
                ctxBuffer.drawImage(this.frames[this.curFrame], this.transform.x, this.transform.y, this.transform.z, this.transform.w);
            } else {
                ctxBuffer.drawImage(this.frames[this.curFrame], this.transform.x, this.transform.y);
            }

            if(this.isPlaying) {
                if(this.curTiming <= 0) {
                    if(this.curFrame < this.frames.length - 1) {
                        this.curFrame++;
                    } else {
                        this.curFrame = 0;
                    }

                    this.curTiming = this.timing[this.curFrame];
                } else {
                    this.curTiming--;
                }
            }
        };
    }

    // Interactable
    class Interactable {
        transform = new Vector4();

        constructor(x, y, width, height) {
            this.transform = new Vector4(x, y, width, height);
        };

        check = () => {
            if(mousex >= this.transform.x && mousex <= this.transform.x + this.transform.z && mousey >= this.transform.y && mousey <= this.transform.y + this.transform.w) {
                return true;
            }

            return false;
        }
    }

    // Vector4 object
    function Vector4(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }



    // Canvas setup
    // Main canvas
    let DOMcanvas = document.querySelector("#gameCanvas");
    let ctx = DOMcanvas.getContext("2d");

    ctx.fillStyle = "#000000";
	ctx.font = "bold 13px Courier New";
    ctx.textAlign = "center";

    // Buffer canvas
    let DOMcanvasBuffer = document.querySelector("#bufferCanvas");
    let ctxBuffer = DOMcanvasBuffer.getContext("2d");

    ctxBuffer.fillStyle = "#000000";
	ctxBuffer.font = "bold 13px Courier New";
    ctxBuffer.textAlign = "center";

    // Sprite canvas
    let DOMcanvasSprite = document.querySelector("#spriteCanvas");
    let ctxSprite = DOMcanvasSprite.getContext("2d");

    ctxSprite.webkitImageSmoothingEnabled = false;
	ctxSprite.msImageSmoothingEnabled = false;
    ctxSprite.imageSmoothingEnabled = false;


    // Volume
    let volume = 3;

    // Mouse
    let mousex = 0;
    let mousey = 0;

    // Sprites
    let sprites = [];
	let loadedSprites = [];
    let allSpritesLoaded = false;
    let currentSprite = 0;

    // Volume control
    loadSprite("./assets/images/controls/Volume_01.png");
    loadSprite("./assets/images/controls/Volume_02.png");
    loadSprite("./assets/images/controls/Volume_03.png");
    loadSprite("./assets/images/controls/Volume_04.png");

    // Other
    loadSprite("./assets/images/BG1.png");
    loadSprite("./assets/images/BG2.png");
    loadSprite("./assets/images/Arrow.png");
    loadSprite("./assets/images/TextBox1.png");
    loadSprite("./assets/images/TextBox2.png");
    loadSprite("./assets/images/FuckButtons.png");
    loadSprite("./assets/images//Erisolsprite.png");


    // Audio
    let audio = [];
    let loadedAudio = [];
    let allAudioLoaded = false;
    let currentAudio = 0;

    loadAudio("./assets/audio/Elevatorstuck_Meows.mp3");
    audio[0].loop = true;


    // Gifs
    let gifs = [];
    let loadedGifs = [];
    let allGifsLoaded = false;
    let currentGif = 0;

    // Preloader
    let gifPreloader = new AnimatedGif([
        "./assets/images/animations/Preloader/Preloader_01.png",
        "./assets/images/animations/Preloader/Preloader_02.png"
    ], [
        0, 0
    ]);
    gifPreloader.setTransform(0, 0, -1, -1);
    gifPreloader.start();

    // Easteregg
    let gifEasteregg = new AnimatedGif([
        "./assets/images/animations/Easteregg/Easteregg_01.png", "./assets/images/animations/Easteregg/Easteregg_02.png",
        "./assets/images/animations/Easteregg/Easteregg_03.png", "./assets/images/animations/Easteregg/Easteregg_04.png",
        "./assets/images/animations/Easteregg/Easteregg_05.png", "./assets/images/animations/Easteregg/Easteregg_06.png",
        "./assets/images/animations/Easteregg/Easteregg_07.png", "./assets/images/animations/Easteregg/Easteregg_08.png",
        "./assets/images/animations/Easteregg/Easteregg_09.png", "./assets/images/animations/Easteregg/Easteregg_10.png",
        "./assets/images/animations/Easteregg/Easteregg_11.png", "./assets/images/animations/Easteregg/Easteregg_12.png",
        "./assets/images/animations/Easteregg/Easteregg_13.png", "./assets/images/animations/Easteregg/Easteregg_14.png",
        "./assets/images/animations/Easteregg/Easteregg_15.png", "./assets/images/animations/Easteregg/Easteregg_16.png",
        "./assets/images/animations/Easteregg/Easteregg_17.png", "./assets/images/animations/Easteregg/Easteregg_18.png",
        "./assets/images/animations/Easteregg/Easteregg_19.png", "./assets/images/animations/Easteregg/Easteregg_20.png",
        "./assets/images/animations/Easteregg/Easteregg_21.png", "./assets/images/animations/Easteregg/Easteregg_22.png"
    ], [
        20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20, 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 20
    ]);
    gifEasteregg.setTransform(216, 128, -1, -1);

    // Erisolsprite Hero
    let gifErisolpriteHero = new AnimatedGif([
        "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_01.png", "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_02.png",
        "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_03.png", "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_04.png",
        "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_05.png", "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_06.png",
        "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_07.png", "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_08.png",
        "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_09.png", "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_10.png",
        "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_11.png", "./assets/images/animations/Erisolsprite Hero/Erisolsprite_Hero_12.png"
    ], [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);
    gifErisolpriteHero.setTransform(521, 131, 442.96, 674.61);

    // Jasprosesprite Back
    let gifJasprosespriteBack = new AnimatedGif([
        "./assets/images/animations/Jasprosesprite Back/Jasprosesprite_Back_01.png",
        "./assets/images/animations/Jasprosesprite Back/Jasprosesprite_Back_02.png"
    ], [
        0, 0
    ]);
    gifJasprosespriteBack.setTransform(0, 0, -1, -1);


    // Fonts
    let mainText = new Text();
    mainText.loadText("FontStuck", "./assets/fonts/FontStuck.png");


    // Game specific
    let GAME_curFrame = 0;
    let GAME_fade = 0;
    let GAME_fadeOut = false;

    let GAME_messageFrame = 0;
    let GAME_fuckMessage = false;
    let GAME_jasproseMessage = 0;


    
    let GAME_erisolspriteHeroPosX = 521;
    let GAME_erisolspriteHeroPosY = 131;
    
    let GAME_erisolspriteArrowOffset = 0;
    let GAME_erisolspriteArrowDirection = false;

    let GAME_fuckButtonsPos = -165;

    

    // Interactables
    let GAME_interaction_screen = new Interactable(0, 0, 650, 450);
    let GAME_interaction_controlVolume = new Interactable(2, 3, 23, 22);
    let GAME_interaction_easteregg = new Interactable(225, 199, 55, 60);
    let GAME_interaction_erisolsprite = new Interactable(442, 135, 44.775, 70.2);
    let GAME_interaction_fuckButtons = new Interactable(33, 10, 164, 426);


    // Main loop
    let loop = setInterval(() => {
        if (allSpritesLoaded && mainText.allFontsLoaded && allGifsLoaded && allAudioLoaded) {
            // Reset canvas
            ctxBuffer.clearRect(0, 0, 650, 450);
            

            if(GAME_curFrame === 0) {
                gifPreloader.update();

                // "Click to start." text
                mainText.drawText("Click to start.", 325 - (mainText.getTextWidth("Click to start.", "FontStuck", 1) / 2), 400, "FontStuck", hexToRgb("#000000"), 1);
            } else if(GAME_curFrame === 1) {
                gifPreloader.update();

                // Fade out
                ctxBuffer.globalAlpha = GAME_fade;
                ctxBuffer.fillRect(0, 0, 650, 450);
                ctxBuffer.globalAlpha = 1;
                GAME_fade += .02;

                if(GAME_fade >= 1) {
                    GAME_curFrame += 1;

                    gifJasprosespriteBack.start();
                }
            } else if(GAME_curFrame === 2) {
                ctxBuffer.drawImage(sprites[4], 0, 0);

                ctxBuffer.drawImage(sprites[10], 442, 135 - GAME_erisolspriteArrowOffset, 44.775, 70.2);
                if(GAME_fade == 0) ctxBuffer.drawImage(sprites[6], 450, 113 + GAME_erisolspriteArrowOffset, 20.88, 12.96);

                gifJasprosespriteBack.update();
                gifEasteregg.update();


                // Erisolsprite arrow
                if(!GAME_erisolspriteArrowDirection) {
                    GAME_erisolspriteArrowOffset++;

                    if(GAME_erisolspriteArrowOffset >= 2) {
                        GAME_erisolspriteArrowDirection = true;
                    }
                } else {
                    GAME_erisolspriteArrowOffset--;

                    if(GAME_erisolspriteArrowOffset <= 0) {
                        GAME_erisolspriteArrowDirection = false;
                    }
                }

                // Easteregg
                if(gifEasteregg.curFrame == gifEasteregg.frames.length - 1) {
                    gifEasteregg.stop();
                }

                // Jasprose message
                if(GAME_jasproseMessage == 1) {
                    if(GAME_messageFrame == 2) {
                        ctxBuffer.drawImage(sprites[7], 56.5, 25, 537, 50);
                    } else if(GAME_messageFrame == 1) {
                        ctxBuffer.drawImage(sprites[7], 49.5, 24.5, 551, 51);
                    } else if(GAME_messageFrame == 0) {
                        ctxBuffer.drawImage(sprites[7], 191, 37.5, 268, 25);
                    }

                    if(GAME_messageFrame > 0) {
                        mainText.drawText("Who the fuck is this.", 80, 50 - 6, "FontStuck", hexToRgb("#000000"), 1);
                    }

                    if(GAME_messageFrame < 2) {
                        GAME_messageFrame++;
                    }
                } else if(GAME_jasproseMessage == 2) {
                    if(GAME_messageFrame == 2) {
                        ctxBuffer.drawImage(sprites[7], 56.5, 25, 537, 50);
                    } else if(GAME_messageFrame == 1) {
                        ctxBuffer.drawImage(sprites[7], 49.5, 24.5, 551, 51);
                    } else if(GAME_messageFrame == 0) {
                        ctxBuffer.drawImage(sprites[7], 191, 37.5, 268, 25);
                    }

                    if(GAME_messageFrame > 0) {
                        mainText.drawText("You interrogate the ghastly green sprite for answers.", 80, 50 - 6, "FontStuck", hexToRgb("#000000"), 1);
                    }

                    if(GAME_messageFrame < 2) {
                        GAME_messageFrame++;
                    }
                }

                // Fade out
                if(GAME_fadeOut) {
                    ctxBuffer.globalAlpha = GAME_fade;
                    ctxBuffer.fillRect(0, 0, 650, 450);
                    ctxBuffer.globalAlpha = 1;
                    GAME_fade += .05;

                    if(GAME_fade >= 1) {
                        GAME_curFrame += 1;
                        GAME_fadeOut = false;

                        gifJasprosespriteBack.start();
                    }
                } else {
                    // Fade in
                    if(GAME_fade >= 0.02) {
                        ctxBuffer.globalAlpha = GAME_fade;
                        ctxBuffer.fillRect(0, 0, 650, 450);
                        ctxBuffer.globalAlpha = 1;
                        GAME_fade -= .02;
                    } else if(GAME_fade < 0.02 && GAME_fade > 0) {
                        GAME_fade = 0;
                    }
                }
            } else if(GAME_curFrame === 3) {
                ctxBuffer.drawImage(sprites[5], 0, 0)
                ctxBuffer.drawImage(sprites[9], GAME_fuckButtonsPos, 10);

                gifErisolpriteHero.update();


                // ErisolspriteHero
                if(GAME_erisolspriteHeroPosX != 336) {
                    if(GAME_erisolspriteHeroPosX == 521) { GAME_erisolspriteHeroPosX = 487; GAME_erisolspriteHeroPosY = 109; }
                    else if(GAME_erisolspriteHeroPosX == 487) { GAME_erisolspriteHeroPosX = 455; GAME_erisolspriteHeroPosY = 89; }
                    else if(GAME_erisolspriteHeroPosX == 455) { GAME_erisolspriteHeroPosX = 422; GAME_erisolspriteHeroPosY = 70; }
                    else if(GAME_erisolspriteHeroPosX == 422) { GAME_erisolspriteHeroPosX = 397; GAME_erisolspriteHeroPosY = 52; }
                    else if(GAME_erisolspriteHeroPosX == 397) { GAME_erisolspriteHeroPosX = 371; GAME_erisolspriteHeroPosY = 35; }
                    else if(GAME_erisolspriteHeroPosX == 371) { GAME_erisolspriteHeroPosX = 347; GAME_erisolspriteHeroPosY = 20; }
                    else if(GAME_erisolspriteHeroPosX == 347) { GAME_erisolspriteHeroPosX = 336; GAME_erisolspriteHeroPosY = 12; gifErisolpriteHero.start(); }

                    gifErisolpriteHero.setTransform(GAME_erisolspriteHeroPosX, GAME_erisolspriteHeroPosY, 442.96, 674.61);
                }

                // Fuck buttons
                if(GAME_fuckButtonsPos != 33) {
                    if(GAME_fuckButtonsPos == -165) GAME_fuckButtonsPos = -164;
                    else if(GAME_fuckButtonsPos == -164) GAME_fuckButtonsPos = -122;
                    else if(GAME_fuckButtonsPos == -122) GAME_fuckButtonsPos = -82;
                    else if(GAME_fuckButtonsPos == -82) GAME_fuckButtonsPos = -40;
                    else if(GAME_fuckButtonsPos == -40) GAME_fuckButtonsPos = 0;
                    else if(GAME_fuckButtonsPos == 0) GAME_fuckButtonsPos = 42;
                    else if(GAME_fuckButtonsPos == 42) GAME_fuckButtonsPos = 33;
                }

                // Fuck buttons
                if(GAME_fuckMessage) {
                    if(GAME_messageFrame == 2) {
                        ctxBuffer.drawImage(sprites[8], 56.5, 225, 537, 177);
                    } else if(GAME_messageFrame == 1) {
                        ctxBuffer.drawImage(sprites[8], 46.5, 221.5, 557, 184);
                    } else if(GAME_messageFrame == 0) {
                        ctxBuffer.drawImage(sprites[8], 156.5, 258, 338, 111);
                    }

                    if(GAME_messageFrame > 0) {
                        mainText.drawText("fuck", 325 - mainText.getTextWidth("fuck", "FontStuck", 1) / 2, 225 + (177 / 2) - 4, "FontStuck", hexToRgb("#4ac925"), 1);
                    }

                    if(GAME_messageFrame < 2) {
                        GAME_messageFrame++;
                    }
                }

                // Fade
                if(GAME_fade >= 0.05) {
                    ctxBuffer.globalAlpha = GAME_fade;
                    ctxBuffer.fillRect(0, 0, 650, 450);
                    ctxBuffer.globalAlpha = 1;
                    GAME_fade -= .05;
                } else if(GAME_fade < 0.05 && GAME_fade > 0) {
                    GAME_fade = 0;
                }
            }
            

            // Controls
            ctxBuffer.drawImage(sprites[volume], 3, 2, 22.95, 21.65); // Volume

            
            // Update main canvas with buffer
            ctx.putImageData(ctxBuffer.getImageData(0, 0, DOMcanvasBuffer.width, DOMcanvasBuffer.height), 0, 0);
		} else {
            // Preloader
            if(loadedGifs[gifs.indexOf(gifPreloader)]) {
                gifPreloader.update();
            }

            // Controls - volume
            if(loadedSprites[volume]) {
                ctxBuffer.drawImage(sprites[volume], 3, 2, 22.95, 21.65); // Volume
            }



            // Sprites
            if(!allSpritesLoaded) {
                allSpritesLoaded = true;

                for (var n = 0; n < sprites.length; n++) {
                    if (loadedSprites[n] == false) {
                        allSpritesLoaded = false;
                        break;
                    }
                }
            }


            // Audio
            if(!allAudioLoaded) {
                allAudioLoaded = true;

                for (var n = 0; n < audio.length; n++) {
                    if (loadedAudio[n] == false) {
                        allAudioLoaded = false;
                        break;
                    }
                }
            }


            // Gifs
            if(!allGifsLoaded) {
                allGifsLoaded = true;

                for (var n = 0; n < gifs.length; n++) {
                    if (loadedGifs[n] == false) {
                        allGifsLoaded = false;
                        break;
                    }
                }
            }


            // Fonts
            if(!mainText.allFontsLoaded) {
                mainText.allFontsLoaded = true;

                for (var n = 0; n < mainText.fonts.length; n++) {
                    if (mainText.loadedFonts[n] == false) {
                        mainText.allFontsLoaded = false;
                        break;
                    }
                }
            }
        }
    }, 41);

    // Mouse move
    DOMcanvas.addEventListener("mousemove", (e) => {
        e = e || window.event;

        let box = DOMcanvas.getBoundingClientRect();
        mousex = e.clientX - box.left;
        mousey = e.clientY - box.top;


        // Game specific
        DOMcanvas.style.cursor = "default";

        // Control - volume
        if(GAME_interaction_controlVolume.check()) {
            DOMcanvas.style.cursor = "pointer";

            return;
        }

        // Erisolsprite
        if(GAME_curFrame == 2 && GAME_fade == 0 && GAME_jasproseMessage == 0) {
            if(GAME_interaction_erisolsprite.check()) {
                DOMcanvas.style.cursor = "pointer";

                return;
            }
        }

        // Fuck buttons
        if(GAME_curFrame == 3 && !GAME_fuckMessage && GAME_fade == 0) {
            if(GAME_interaction_fuckButtons.check()) {
                DOMcanvas.style.cursor = "pointer";

                return;
            }
        }
    });

    // Mouse click
    DOMcanvas.addEventListener("mousedown", (e) => {
        e = e || window.event;

        let box = DOMcanvas.getBoundingClientRect();
        mousex = e.clientX - box.left;
        mousey = e.clientY - box.top;

        // Game specific
        // Control - volume
        if(GAME_interaction_controlVolume.check()) {
            if(volume >= 3) volume = 0;
            else volume++;

            if(!audio[0].paused) {
                updateVolume();
            }

            return;
        }

        // Preloader screen
        if(GAME_curFrame == 0) {
            if(GAME_interaction_screen.check()) {
                GAME_curFrame += 1;
                audio[0].play();
                updateVolume();

                return;
            }
        }

        // Easteregg
        if(GAME_curFrame == 2 && GAME_fade == 0 && GAME_jasproseMessage == 0) {
            if(GAME_interaction_easteregg.check()) {
                gifEasteregg.reset();
                gifEasteregg.start();

                return;
            }
        }

        // Erisolsprite
        if(GAME_curFrame == 2 && GAME_fade == 0 && GAME_jasproseMessage == 0) {
            if(GAME_interaction_erisolsprite.check()) {
                GAME_messageFrame = 0;
                GAME_jasproseMessage = 1;

                return;
            }
        }

        // Continue jasprose message
        if(GAME_curFrame == 2 && GAME_jasproseMessage) {
            if(GAME_interaction_screen.check()) {
                GAME_messageFrame = 0;
                GAME_jasproseMessage++;

                if(GAME_jasproseMessage > 2) {
                    GAME_fadeOut = true;
                }

                return;
            }
        }

        // Fuck buttons
        if(GAME_curFrame == 3 && !GAME_fuckMessage && GAME_fade == 0) {
            if(GAME_interaction_fuckButtons.check()) {
                GAME_messageFrame = 0;
                GAME_fuckMessage = true;

                return;
            }
        }

        // Leave fuck message
        if(GAME_curFrame == 3 && GAME_fuckMessage) {
            if(GAME_interaction_screen.check()) {
                GAME_fuckMessage = false;

                return;
            }
        }
    });
});