import { useEffect, type RefObject } from 'react';
import { clearFileDrop, setFileDrop } from '../canvas/fileDropStore';
import { canopyStore } from '../store';
import { appContext } from './context';
import { addDroppedFiles, describeDrop } from './fileDrop';

/** Drag and drop of pictures and map files onto the map or onto a topic. */
export function useFileDrop(host: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const carriesFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const inHost = (target: EventTarget | null) =>
      target instanceof Element && host.current?.contains(target) === true;

    /** The topic under the pointer, or null for empty canvas (the Core). */
    const topicAt = (target: EventTarget | null): string | null => {
      if (!(target instanceof Element)) return null;
      const id = target.closest('[data-topic-id]')?.getAttribute('data-topic-id');
      if (id) return id;
      return target.closest('textarea.title-editor') ? canopyStore.getState().editing : null;
    };

    const onOver = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      // Without this the browser would open the file in place of the map.
      e.preventDefault();
      if (!e.dataTransfer) return;
      if (!inHost(e.target)) {
        e.dataTransfer.dropEffect = 'none';
        clearFileDrop();
        return;
      }
      e.dataTransfer.dropEffect = 'copy';
      const target = topicAt(e.target);
      const { doc } = canopyStore.getState();
      const types = Array.from(e.dataTransfer.items ?? [], (item) => item.type);
      const title = target ? (doc.topics[target]?.title.trim() ?? '') : '';
      setFileDrop({
        active: true,
        target: target && doc.topics[target] ? target : null,
        label: describeDrop(types.length > 0 ? types : [''], target ? title || 'this topic' : null),
      });
    };

    const onLeave = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      if (!e.relatedTarget || !inHost(e.relatedTarget)) clearFileDrop();
    };

    const onDrop = (e: DragEvent) => {
      if (!carriesFiles(e)) return;
      e.preventDefault();
      clearFileDrop();
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (!inHost(e.target) || files.length === 0) return;
      void addDroppedFiles(appContext, files, topicAt(e.target));
    };

    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
      clearFileDrop();
    };
  }, [host]);
}
