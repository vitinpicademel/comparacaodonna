import { create } from 'zustand';

interface UploadState {
  metaFiles: File[];
  comparacaoFile: File | null;
  resultados: any;
  setMetaFiles: (files: File[]) => void;
  setComparacaoFile: (file: File | null) => void;
  setResultados: (resultados: any) => void;
  resetUploads: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  metaFiles: [],
  comparacaoFile: null,
  resultados: null,
  setMetaFiles: (files) => set({ metaFiles: files }),
  setComparacaoFile: (file) => set({ comparacaoFile: file }),
  setResultados: (resultados) => set({ resultados }),
  resetUploads: () => set({ metaFiles: [], comparacaoFile: null, resultados: null }),
})); 