import { Onboarding } from "./onboarding/Onboarding";
import { ProfilePage } from "./profile/ProfilePage";
import { GalleryPage } from "./gallery/GalleryPage";
import { useApp } from "./store";

export function App() {
  const profile = useApp((s) => s.profile);
  const screen = useApp((s) => s.screen);

  if (!profile) return <Onboarding />;
  if (screen.name === "gallery") return <GalleryPage moduleId={screen.moduleId} />;
  return <ProfilePage />;
}
