import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Tabs: Object.assign(
      ({ children }: { children: ReactNode }) => <>{children}</>,
      { Screen: ({ options }: { options: { title: string } }) => <Text>{options.title}</Text> }
    ),
  };
});

jest.mock("../../shared/lib/firebase", () => ({ auth: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));
jest.mock("../../features/auth/useAuthStore", () => ({
  useAuthStore: () => ({ user: { uid: "uid-1" }, isLoading: false }),
}));

import TabsLayout from "../(tabs)/_layout";

test("declares all six business module tabs", async () => {
  await render(<TabsLayout />);
  for (const title of ["Servicio", "Historial", "Repuestos", "IA", "Academia", "Perfil"]) {
    expect(screen.getByText(title)).toBeTruthy();
  }
});
