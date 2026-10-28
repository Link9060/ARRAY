# ARRAY cinematic audio

The site supports **nine optional MP3 clips** supplied by the project owner for the fictional software-dispatch interface. The clips are **not** stored in the public GitHub repository until their redistribution permissions are confirmed.

To enable the actual sounds, copy the exact nine files from the supplied audio bundle into `public/audio/` in this repository, commit and redeploy using the normal GitHub Pages workflow. Vite automatically copies them to `dist/audio/`. The app resolves assets relative to `import.meta.env.BASE_URL`, so the same code works at `/ARRAY/` or a root domain.

| UI event | Expected MP3 |
| --- | --- |
| Each of six virtual check switches | `dragon-studio-light-switch-on-382714.mp3` |
| Third switch chosen | `eaglaxle-electronic-beep-1-453381.mp3` |
| Either digital verification dial | `pietix-sound-effect-switch-2-535357.mp3` |
| First verification dial | `11325622-air-raid-siren-sound-effect-241383.mp3`, looped until software dispatch/reset/mute |
| Both digital dials verified, LED turns green | `edr-switch-click-and-beep-001a-11602.mp3` |
| Plastic protective cover lifted or lowered | `soundreality-switch-150130.mp3` |
| Dispatch button pressed | `freesound_community-breaker-switch-45684.mp3` |
| Dispatch button pressed, one-shot fictional alarm | `jeremayjimenez-greece-eas-alarm-451404.mp3` |
| Camera prop first begins its upward motion | `freesound_community-rocket-blastoff-76735.mp3` |

### Audio safety and UX
- Sound is **off by default**. Users must enable it via the volume control.
- Sirens are capped to lower relative gains, and the user can adjust volume or mute immediately.
- No audio plays on page load. A separate camera test never triggers a real AI mission.
- Switching to a hidden tab or leaving the console stops active effects.
- Missing files show a visible installation reminder and leave the UI fully usable.
- The audio and controls depict **fictional software tasks only**. No real-world weapons or equipment are operated.

### Asset rights
The audio may carry licenses, attribution obligations, or redistribution restrictions depending on the original creators and download sites. Confirm usage rights for each clip before adding files to the public repository, and retain applicable attribution in this directory. The filenames here identify user-provided files; they **do not establish a license**.
