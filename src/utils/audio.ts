// COPIA LOCAL DE PRUEBA (no se sube al proyecto): misma interfaz que el audio.ts real, sin sonido.
class SoundSynthesizer {
  private muted: boolean = false;
  public setMuted(muted: boolean) { this.muted = muted; }
  public isMuted(): boolean { return this.muted; }
  public playPieceSnap() {}
  public playSuccessChime() {}
  public playBridgeCreak() {}
  public playCorrectLetter() {}
  public playBuzzer() {}
  public playVictoryFanfare() {}
}

export const audioFx = new SoundSynthesizer();
