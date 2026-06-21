import { create } from 'zustand';

export interface IdentificationMatch {
  species_id: number;
  common_name: string;
  scientific_name: string;
  confidence: number;
  iNaturalistTaxonId: number;
  image_url: string;
}

export interface CatchFormData {
  photoUri: string | null;
  photoUrl: string | null;
  identification: IdentificationMatch | null;
  allMatches: IdentificationMatch[];
  isIdentifying: boolean;
  speciesPickerOpen: boolean;
  selectedSpeciesId: number | null;
  weightKg: string;
  weightMethod: 'measured' | 'estimated_species';
  lengthCm: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  waterBody: string;
  notes: string;
  isReleased: boolean;
  isSaving: boolean;
  isUploading: boolean;
  uploadProgress: number;
}

interface CatchStore extends CatchFormData {
  setPhoto: (uri: string | null) => void;
  setPhotoUrl: (url: string | null) => void;
  setIdentification: (match: IdentificationMatch | null, allMatches: IdentificationMatch[]) => void;
  setIsIdentifying: (v: boolean) => void;
  setSpeciesPickerOpen: (v: boolean) => void;
  setSelectedSpeciesId: (id: number | null) => void;
  setWeightKg: (v: string) => void;
  setWeightMethod: (v: 'measured' | 'estimated_species') => void;
  setLengthCm: (v: string) => void;
  setLocation: (lat: number, lng: number, name: string, water: string) => void;
  setLocationName: (v: string) => void;
  setWaterBody: (v: string) => void;
  setNotes: (v: string) => void;
  setIsReleased: (v: boolean) => void;
  setIsSaving: (v: boolean) => void;
  setIsUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
  reset: () => void;
}

const initialState: CatchFormData = {
  photoUri: null,
  photoUrl: null,
  identification: null,
  allMatches: [],
  isIdentifying: false,
  speciesPickerOpen: false,
  selectedSpeciesId: null,
  weightKg: '',
  weightMethod: 'estimated_species',
  lengthCm: '',
  latitude: null,
  longitude: null,
  locationName: '',
  waterBody: '',
  notes: '',
  isReleased: true,
  isSaving: false,
  isUploading: false,
  uploadProgress: 0,
};

export const useCatchStore = create<CatchStore>((set) => ({
  ...initialState,

  setPhoto: (uri) => set({ photoUri: uri }),

  setPhotoUrl: (url) => set({ photoUrl: url }),

  setIdentification: (match, allMatches) =>
    set({
      identification: match,
      allMatches,
      selectedSpeciesId: match?.species_id ?? null,
    }),

  setIsIdentifying: (v) => set({ isIdentifying: v }),

  setSpeciesPickerOpen: (v) => set({ speciesPickerOpen: v }),

  setSelectedSpeciesId: (id) => set({ selectedSpeciesId: id }),

  setWeightKg: (v) => set({ weightKg: v }),

  setWeightMethod: (v) => set({ weightMethod: v }),

  setLengthCm: (v) => set({ lengthCm: v }),

  setLocation: (lat, lng, name, water) =>
    set({
      latitude: lat,
      longitude: lng,
      locationName: name,
      waterBody: water,
    }),

  setLocationName: (v) => set({ locationName: v }),

  setWaterBody: (v) => set({ waterBody: v }),

  setNotes: (v) => set({ notes: v }),

  setIsReleased: (v) => set({ isReleased: v }),

  setIsSaving: (v) => set({ isSaving: v }),

  setIsUploading: (v) => set({ isUploading: v }),

  setUploadProgress: (v) => set({ uploadProgress: v }),

  reset: () => set({ ...initialState }),
}));
