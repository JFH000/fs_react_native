import type { PhotoCategory } from "../../shared/types/service";

export interface PhotoSlot {
  key: string;
  label: string;
  category: PhotoCategory;
  description: string;
  placeholderComment: string;
  color: string;
}

export const PHOTO_SLOTS: PhotoSlot[] = [
  { key: "manometro_baja", label: "Manómetro de Baja (Sugerido)", category: "Durante", description: "Lectura de presión en línea de succión / retorno.", placeholderComment: "Ej. Marcando 118 PSI estables, parámetros operativos térmicos ideales.", color: "sky" },
  { key: "manometro_alta", label: "Manómetro de Alta (Sugerido)", category: "Durante", description: "Lectura de presión en línea de líquido / descarga.", placeholderComment: "Ej. Marcando 340 PSI estables, intercambio térmico adecuado.", color: "rose" },
  { key: "etiqueta_equipo", label: "Etiqueta / Placa de Datos (Sugerido)", category: "Placa", description: "Placa de características técnica legible del fabricante.", placeholderComment: "Ej. Modelo 39HQ-012-G, serie UMA-CR-2024-89021A.", color: "slate" },
  { key: "evaporador_antes", label: "Evaporador - Antes (Sugerido)", category: "Antes", description: "Estado inicial del serpentín evaporador y bandeja.", placeholderComment: "Ej. Presencia de biofilm orgánico y lodo leve en bandeja de condensado.", color: "amber" },
  { key: "evaporador_despues", label: "Evaporador - Después (Sugerido)", category: "Después", description: "Serpentín desinfectado y bandeja libre de biofilm.", placeholderComment: "Ej. Serpentín hidrolavado químicamente con espuma desinfectante.", color: "emerald" },
  { key: "condensadora_antes", label: "Condensadora - Antes (Sugerido)", category: "Antes", description: "Estado inicial del serpentín condensador exterior.", placeholderComment: "Ej. Obstrucción severa por acumulación de polvo y hollín en aletas.", color: "amber" },
  { key: "condensadora_despues", label: "Condensadora - Después (Sugerido)", category: "Después", description: "Serpentín exterior libre de hollín e impurezas.", placeholderComment: "Ej. Disipación hidrolavada, aletas restauradas, paso de aire al 100%.", color: "emerald" },
];
