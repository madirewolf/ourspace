import { useState } from "react";
import { AccountGateway } from "./account/AccountGateway";
import { Onboarding } from "./onboarding/Onboarding";
import { ProfilePage } from "./profile/ProfilePage";
import { GalleryPage } from "./gallery/GalleryPage";
import { RavePage } from "./rave/RavePage";
import { DiscoveryPage } from "./discovery/DiscoveryPage";
import { VisitorProfilePage } from "./discovery/VisitorProfilePage";
import { getDiscoveryCreator } from "./discovery/catalog";
import { useApp } from "./store";
import { withTransition } from "./navigation";

export function App() {
  const profile = useApp((s) => s.profile);
  const signedOut = useApp((s) => s.signedOut);
  const screen = useApp((s) => s.screen);
  const [creating, setCreating] = useState(false);

  // Creation must win over the existing-profile route. This also lets a
  // signed-out user deliberately replace the one local account supported in v0.
  if (creating) {
    return (
      <Onboarding
        onCancel={() => withTransition(() => setCreating(false))}
        onComplete={() => setCreating(false)}
      />
    );
  }
  if (!profile || signedOut) {
    return (
      <AccountGateway profile={profile} onCreate={() => withTransition(() => setCreating(true))} />
    );
  }
  if (screen.name === "gallery") return <GalleryPage moduleId={screen.moduleId} />;
  if (screen.name === "rave") return <RavePage moduleId={screen.moduleId} />;
  if (screen.name === "discovery") return <DiscoveryPage resume={screen.resume} />;
  if (screen.name === "visitor") return <VisitorProfilePage profileId={screen.profileId} />;
  if (screen.name === "visitorGallery") {
    const creator = getDiscoveryCreator(screen.profileId);
    if (creator) {
      return (
        <GalleryPage
          moduleId={screen.moduleId}
          profileOverride={creator.profile}
          returnScreen={{ name: "visitor", profileId: creator.id }}
        />
      );
    }
  }
  if (screen.name === "visitorRave") {
    const creator = getDiscoveryCreator(screen.profileId);
    if (creator) {
      return (
        <RavePage
          moduleId={screen.moduleId}
          profileOverride={creator.profile}
          returnScreen={{ name: "visitor", profileId: creator.id }}
        />
      );
    }
  }
  return <ProfilePage />;
}
