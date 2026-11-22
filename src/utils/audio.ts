import { MUSIC_TRACKS } from '../constants';

let bgmRuntime: any = null;
let isMusicPlaying = false;

export function playSoundEffect(kind: string, soundEnabled: boolean) {
  if (!soundEnabled) return;
  const Tone = (window as any).Tone;
  if (!Tone) return;
  try {
    if (Tone.context && Tone.context.state !== 'running') {
      Tone.start();
    }
    duckBackgroundMusicTemporarily();
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0.05, release: 0.2 }
    }).toDestination();
    synth.volume.value = -8;

    if (kind === 'correct') {
      synth.triggerAttackRelease('C5', '16n');
      setTimeout(() => synth.triggerAttackRelease('G5', '8n'), 95);
    } else if (kind === 'wrong') {
      synth.triggerAttackRelease('E3', '8n');
      setTimeout(() => synth.triggerAttackRelease('C3', '8n'), 120);
    } else if (kind === 'hop') {
      synth.triggerAttackRelease('E5', '32n');
    } else if (kind === 'ladder') {
      ['C4', 'E4', 'G4', 'B4', 'C5'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '16n'), idx * 75);
      });
    } else if (kind === 'snake') {
      ['G4', 'E4', 'C4', 'A3'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '16n'), idx * 85);
      });
    } else if (kind === 'win') {
      ['C5', 'E5', 'G5', 'C6'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '8n'), idx * 110);
      });
    } else if (kind === 'applause') {
      // Soundboard: Tepuk Tangan (serangkaian ketukan cepat gembira)
      ['G4', 'C5', 'E5', 'G5', 'C6', 'E5', 'G5'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '32n'), idx * 55);
      });
    } else if (kind === 'cheer') {
      // Soundboard: Sorak Sorai (Fanfare Kemenangan)
      ['C4', 'G4', 'C5', 'E5', 'G5', 'C6'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '8n'), idx * 90);
      });
    } else if (kind === 'tada') {
      // Soundboard: Ta-Da!
      ['C5', 'F5', 'A5', 'C6'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '8n'), idx * 100);
      });
    } else if (kind === 'boing') {
      // Soundboard: Boing Unik
      ['C3', 'G3', 'C4', 'E4', 'G4'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '16n'), idx * 45);
      });
    } else if (kind === 'laser') {
      // Soundboard: Bintang / Laser Semburat
      ['C6', 'A5', 'F5', 'D5', 'C5'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '32n'), idx * 35);
      });
    } else if (kind === 'drumroll') {
      // Soundboard: Drumroll Ketukan Cepat
      ['C3', 'C3', 'C3', 'C3', 'C3', 'C3', 'G3', 'C4'].forEach((n, idx) => {
        setTimeout(() => synth.triggerAttackRelease(n, '64n'), idx * 50);
      });
    }
  } catch (_) {}
}

export function stopAndDisposeBackgroundMusic() {
  const Tone = (window as any).Tone;
  try {
    if (Tone && Tone.Transport) {
      Tone.Transport.stop();
      Tone.Transport.cancel();
    }
    if (bgmRuntime) {
      bgmRuntime.melodySeq?.dispose();
      bgmRuntime.bassSeq?.dispose();
      bgmRuntime.melodySynth?.dispose();
      bgmRuntime.bassSynth?.dispose();
      bgmRuntime.filter?.dispose();
      bgmRuntime.masterGain?.dispose();
      bgmRuntime = null;
    }
  } catch (_) {}
  isMusicPlaying = false;
}

export async function startBackgroundMusic(musicEnabled: boolean, musicStyle: string) {
  if (!musicEnabled) return;
  const Tone = (window as any).Tone;
  if (!Tone) return;
  try {
    if (Tone.context && Tone.context.state !== 'running') {
      await Tone.start();
    }
    if (Tone.context.state !== 'running') return;

    stopAndDisposeBackgroundMusic();

    const track = MUSIC_TRACKS[musicStyle] || MUSIC_TRACKS.adventure;
    const masterGain = new Tone.Gain(0.24).toDestination();
    const filter = new Tone.Filter(1900, 'lowpass').connect(masterGain);

    const melodySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: musicStyle === 'chill' ? 'sine' : 'triangle' },
      envelope: { attack: 0.03, decay: 0.18, sustain: 0.16, release: 0.42 }
    }).connect(filter);
    melodySynth.volume.value = -8;

    const bassSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.25, release: 0.35 }
    }).connect(masterGain);
    bassSynth.volume.value = -12;

    Tone.Transport.bpm.value = track.bpm;

    const melodySeq = new Tone.Sequence((time: any, note: any) => {
      if (note && musicEnabled) {
        melodySynth.triggerAttackRelease(note, '8n', time);
      }
    }, track.melody, '8n');

    const bassSeq = new Tone.Sequence((time: any, note: any) => {
      if (note && musicEnabled) {
        bassSynth.triggerAttackRelease(note, '8n', time);
      }
    }, track.bass, '8n');

    melodySeq.start(0);
    bassSeq.start(0);
    Tone.Transport.start();

    bgmRuntime = { masterGain, filter, melodySynth, bassSynth, melodySeq, bassSeq };
    isMusicPlaying = true;
  } catch (_) {}
}

export function duckBackgroundMusicTemporarily() {
  const Tone = (window as any).Tone;
  if (!bgmRuntime || !bgmRuntime.masterGain || !isMusicPlaying || !Tone) return;
  try {
    const now = Tone.now();
    bgmRuntime.masterGain.gain.cancelScheduledValues(now);
    bgmRuntime.masterGain.gain.setTargetAtTime(0.07, now, 0.05);
    bgmRuntime.masterGain.gain.setTargetAtTime(0.24, now + 0.55, 0.18);
  } catch (_) {}
}
