import { useState, useEffect } from "react";
import { storage } from "../utils/storage";

export function useSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return storage.get<boolean>("peopleos-sidebar-collapsed", false);
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    storage.set("peopleos-sidebar-collapsed", collapsed);
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);
  const toggleMobile = () => setMobileOpen((prev) => !prev);
  const closeMobile = () => setMobileOpen(false);

  return {
    collapsed,
    setCollapsed,
    toggleCollapsed,
    mobileOpen,
    setMobileOpen,
    toggleMobile,
    closeMobile,
  };
}
