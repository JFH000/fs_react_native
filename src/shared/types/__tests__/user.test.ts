import { createEmptyUserProfile } from "../user";

test("creates a profile with the given identity and sensible empty defaults", () => {
  const profile = createEmptyUserProfile("uid-1", "tech@fsapp.com", "google");

  expect(profile.uid).toBe("uid-1");
  expect(profile.email).toBe("tech@fsapp.com");
  expect(profile.authProvider).toBe("google");
  expect(profile.technicianName).toBe("");
  expect(profile.photoUrl).toBeNull();
  expect(profile.autoSignReports).toBe(false);
  expect(profile.darkModeEnabled).toBe(false);
});
