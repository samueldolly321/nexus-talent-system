import { createContext, useContext } from "react";

// Contexte minimal partagé pour piloter le drawer mobile de la Sidebar depuis
// la TopBar (rendue dans chaque vue), sans prop-drilling à travers toutes les vues.
export const SidebarContext = createContext<{ openSidebar: () => void }>({
  openSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);
