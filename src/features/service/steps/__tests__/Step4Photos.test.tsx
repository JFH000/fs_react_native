import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

let mockPhotos: { id: string; url: string; category: string; comment: string }[] = [];
const mockAddPhoto = jest.fn();
jest.mock("../../useServiceWizardStore", () => ({
  useServiceWizardStore: (selector: (s: { draft: { photos: typeof mockPhotos }; addPhoto: typeof mockAddPhoto }) => unknown) =>
    selector({ draft: { photos: mockPhotos }, addPhoto: mockAddPhoto }),
}));

import * as ImagePicker from "expo-image-picker";
import { Step4Photos } from "../Step4Photos";

beforeEach(() => {
  mockPhotos = [];
  mockAddPhoto.mockClear();
});

test("renders all seven suggested photo slots", async () => {
  await render(<Step4Photos />);
  expect(screen.getByText("Manómetro de Baja (Sugerido)")).toBeTruthy();
  expect(screen.getByText("Condensadora - Después (Sugerido)")).toBeTruthy();
});

test("capturing a photo for a slot stores it against that slot's id", async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///photo1.jpg" }],
  });
  await render(<Step4Photos />);
  fireEvent.press(screen.getByTestId("capture-button-etiqueta_equipo"));
  await waitFor(() =>
    expect(mockAddPhoto).toHaveBeenCalledWith({ id: "photo-etiqueta_equipo", url: "file:///photo1.jpg", category: "Placa", comment: "" })
  );
});

test("denied camera permission does not add a photo", async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false });
  await render(<Step4Photos />);
  fireEvent.press(screen.getByTestId("capture-button-etiqueta_equipo"));
  await waitFor(() => expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled());
  expect(mockAddPhoto).not.toHaveBeenCalled();
});
