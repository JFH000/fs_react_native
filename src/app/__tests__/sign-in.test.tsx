import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("../../features/auth/authService", () => ({
  signInWithEmail: jest.fn(() => Promise.resolve()),
  signInWithGoogle: jest.fn(() => Promise.resolve()),
  signInWithApple: jest.fn(() => Promise.resolve()),
}));

import { signInWithEmail } from "../../features/auth/authService";
import SignInScreen from "../(auth)/sign-in";

test("submits the entered email and password", async () => {
  await render(<SignInScreen />);
  await fireEvent.changeText(screen.getByTestId("email-input"), "tech@fsapp.com");
  await fireEvent.changeText(screen.getByTestId("password-input"), "secret123");
  await fireEvent.press(screen.getByTestId("email-sign-in-button"));

  await new Promise(process.nextTick);
  expect(signInWithEmail).toHaveBeenCalledWith("tech@fsapp.com", "secret123");
});
