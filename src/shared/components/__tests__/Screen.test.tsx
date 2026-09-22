import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Screen } from "../Screen";

test("renders its children inside the safe area", async () => {
  await render(
    <Screen>
      <Text>contenido</Text>
    </Screen>
  );
  expect(screen.getByText("contenido")).toBeTruthy();
  expect(screen.getByTestId("screen-root")).toBeTruthy();
});
