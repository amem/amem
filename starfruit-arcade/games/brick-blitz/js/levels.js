/*
 * Brick Blitz — levels.js
 * The 12 hand-made levels. Each level is 12 columns wide (every row string has
 * exactly 12 characters) and up to 14 rows tall. Row 0 is the top row.
 *
 * LEGEND
 *   .   empty cell
 *   1   brick with 1 hit point
 *   2   brick with 2 hit points (armoured plate)
 *   3   brick with 3 hit points (heavy plate)
 *   S   steel — unbreakable, does not count for the level clear
 *   X   explosive — destroys its 8 neighbours (steel survives); chains into other X bricks
 *   ?   power-up brick — always drops a (positive) capsule
 *
 * Each level: { name, palette, rows }
 *   name     shown in the level intro banner and on the level-select grid
 *   palette  row colours from GAME_CONFIG.theme.palettes (optional, default theme.defaultPalette)
 *   rows     array of 12-character strings
 *
 * A level is cleared when every breakable brick (1, 2, 3, X, ?) is gone.
 */
(function () {
  'use strict';

  window.__GAME__._m.levels = [
    {
      name: 'WARM UP',
      palette: 'neon',
      rows: [
        '............',
        '............',
        '.1111111111.',
        '.1111111111.',
        '.111?11?111.',
        '.1111111111.',
        '.1111111111.'
      ]
    },
    {
      name: 'PYRAMID',
      palette: 'sunset',
      rows: [
        '.....22.....',
        '....2112....',
        '...211112...',
        '..2111?112..',
        '.2111111112.',
        '211?1111?112',
        '222222222222'
      ]
    },
    {
      name: 'HEART',
      palette: 'candy',
      rows: [
        '............',
        '.222....222.',
        '22112..21122',
        '211112211112',
        '2111?11?1112',
        '211111111112',
        '.2111111112.',
        '..21111112..',
        '...211112...',
        '....2112....',
        '.....22.....'
      ]
    },
    {
      name: 'CHECKERS',
      palette: 'ocean',
      rows: [
        '2.2.2.2.2.2.',
        '.1.1.1.1.1.1',
        '1.1.?.1.1.1.',
        '.2.2.2.2.2.2',
        '1.1.1.1.?.1.',
        '.1.1.1.1.1.1',
        '2.2.2.2.2.2.',
        '.1.1.1.1.1.1'
      ]
    },
    {
      name: 'INVADER',
      palette: 'toxic',
      rows: [
        '............',
        '...1.....1..',
        '....1...1...',
        '...2222222..',
        '..22X222X22.',
        '.22222222222',
        '.2.22?2222.2',
        '.1.1.....1.1',
        '....11.11...'
      ]
    },
    {
      name: 'SMILEY',
      palette: 'gold',
      rows: [
        '...222222...',
        '..21111112..',
        '.2111111112.',
        '.21X1111X12.',
        '.2111?11112.',
        '.2311111132.',
        '.2131111312.',
        '..21333312..',
        '...222222...'
      ]
    },
    {
      name: 'DIAMOND',
      palette: 'neon',
      rows: [
        '.....22.....',
        '....2112....',
        '...21XX12...',
        '..21X11X12..',
        '.21X1??1X12.',
        '21X111111X12',
        '.21X1111X12.',
        '..21X11X12..',
        '...21XX12...',
        '....2112....',
        '.....22.....'
      ]
    },
    {
      name: 'ARROW',
      palette: 'ocean',
      rows: [
        '.....33.....',
        '....3223....',
        '...322223...',
        '..32211223..',
        '.3221??1223.',
        '322111111223',
        '....2112....',
        '....2112....',
        '....2XX2....',
        '....2112....',
        'SSS.2112.SSS'
      ]
    },
    {
      name: 'CASTLE',
      palette: 'sunset',
      rows: [
        '2.2.2..2.2.2',
        '222222222222',
        'S1111111111S',
        'S12?1111?21S',
        'S1111XX1111S',
        'S1111111111S',
        'S1221221221S',
        'SSSS.33.SSSS'
      ]
    },
    {
      name: 'SPIRAL',
      palette: 'candy',
      rows: [
        '111111111111',
        '...........1',
        '.111111112.1',
        '.1.......2.1',
        '.1.22223.2.1',
        '.1.2...3.2.1',
        '.1.2.X.3.2.1',
        '.1.2.333.2.1',
        '.1.2..?..2.1',
        '.1.2222222.1',
        '.1.........1',
        '.11111111111'
      ]
    },
    {
      name: 'SKULL',
      palette: 'toxic',
      rows: [
        '...333333...',
        '..32222223..',
        '.3222222223.',
        '.32XX22XX23.',
        '.32XX22XX23.',
        '.3222SS2223.',
        '..32?22?23..',
        '...2.22.2...',
        '...2.22.2...'
      ]
    },
    {
      name: 'FINALE',
      palette: 'neon',
      rows: [
        '..33...3333.',
        '.323..32..23',
        '3223......23',
        '..2?.....23.',
        '..22....X2..',
        '..22...23...',
        '..22..3X....',
        '..2?.32.....',
        '3222.2222223',
        '............',
        'SSX.SSSS.XSS'
      ]
    }
  ];
})();
