import type { Topic, TopicImage } from '../model';
import type { Size } from './types';

/** The most room a picture takes on a topic, so a big image never makes a giant card. */
export const IMAGE_MAX: Size = { w: 280, h: 200 };
/** Space around a picture inside its topic. */
export const IMAGE_PAD = 8;

/** The size a picture is drawn at: its own size, scaled down (never up) to fit the maximum. */
export function imageSize(image: Pick<TopicImage, 'w' | 'h'> | undefined): Size | null {
  if (!image || image.w < 1 || image.h < 1) return null;
  const scale = Math.min(1, IMAGE_MAX.w / image.w, IMAGE_MAX.h / image.h);
  return {
    w: Math.max(1, Math.round(image.w * scale)),
    h: Math.max(1, Math.round(image.h * scale)),
  };
}

/** Height taken above the title by a topic's picture, or 0 when it has none. */
export function imageOffset(topic: Pick<Topic, 'image'>): number {
  const size = imageSize(topic.image);
  return size ? IMAGE_PAD + size.h : 0;
}
