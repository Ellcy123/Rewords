# Static UI font instances

Derived locally from `Assets/CatGame/Fonts/NotoSansSC.ttf` using fontTools varLib.instancer, fixing wght to 500 and 700. Original font is retained. The derived fonts are renamed Cat UI Medium / Cat UI Bold; SIL OFL license is included unchanged.

UiFactory loads these static instances and uses FontStyle.Normal for both. Titles/primary actions choose the Bold font file rather than synthesized bold. This avoids the original variable font's default wght=100 in Unity's legacy Text renderer.
