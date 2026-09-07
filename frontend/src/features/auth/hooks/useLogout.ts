import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../../../components/ui/toast";

export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const openLogoutDialog = () => {
    setIsDialogOpen(true);
  };

  const closeLogoutDialog = () => {
    if (!isLoggingOut) {
      setIsDialogOpen(false);
    }
  };

  const confirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logout();
      toast.info("You have signed out of PeopleOS.", "Session Terminated", 3000);
    } catch {
      // Graceful fallback: client state is cleared by logout() even if network fails
      toast.warning("Signed out locally.", "Offline Session", 3000);
    } finally {
      setIsLoggingOut(false);
      setIsDialogOpen(false);
      navigate("/auth/login", { replace: true });
    }
  };

  return {
    isDialogOpen,
    isLoggingOut,
    openLogoutDialog,
    closeLogoutDialog,
    confirmLogout,
  };
}
