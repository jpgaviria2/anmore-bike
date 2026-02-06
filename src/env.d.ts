/// <reference types="leaflet" />
/// <reference types="leaflet-draw" />

declare global {
  interface Window {
    showProfileModal: () => void;
    showNsecModal: (nsec: string) => void;
    showLoginModal: () => void;
  }
}

export {};
