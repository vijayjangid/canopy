/** The filter that gives Playful sticker edges a slightly wavy, hand-cut outline. */
export function StickerDefs() {
  return (
    <defs>
      <filter id="sticker-wiggle" x="-20%" y="-60%" width="140%" height="220%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="1" seed="7" />
        <feDisplacementMap in="SourceGraphic" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  );
}
