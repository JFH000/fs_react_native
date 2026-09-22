import { Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "../../../shared/components/Screen";
import { useServiceWizardStore, WIZARD_STEP_COUNT } from "../../../features/service/useServiceWizardStore";
import { StepPlaceholder } from "../../../features/service/steps/StepPlaceholder";
import { Step1VisitData } from "../../../features/service/steps/Step1VisitData";
import { Step2CustomerData } from "../../../features/service/steps/Step2CustomerData";
import { Step3EquipmentData } from "../../../features/service/steps/Step3EquipmentData";
import { Step4Photos } from "../../../features/service/steps/Step4Photos";

const STEP_TITLES = [
  "Datos de Visita",
  "Datos del Cliente",
  "Datos del Equipo",
  "Evidencias Fotográficas",
  "Diagnóstico y Observaciones",
  "Parámetros Técnicos",
  "Concepto de IA",
  "Firmas de Conformidad",
  "Vista Previa PDF",
];

function StepBody({ step }: { step: number }) {
  if (step === 1) return <Step1VisitData />;
  if (step === 2) return <Step2CustomerData />;
  if (step === 3) return <Step3EquipmentData />;
  if (step === 4) return <Step4Photos />;
  return <StepPlaceholder title={STEP_TITLES[step - 1]} />;
}

export default function ServiceWizardScreen() {
  const router = useRouter();
  const currentStep = useServiceWizardStore((state) => state.currentStep);
  const validationError = useServiceWizardStore((state) => state.validationError);
  const nextStep = useServiceWizardStore((state) => state.nextStep);
  const prevStep = useServiceWizardStore((state) => state.prevStep);
  const isLastStep = currentStep === WIZARD_STEP_COUNT;

  return (
    <Screen>
      <View testID="wizard-progress-bar" className="h-1 bg-neutral-200">
        <View className="h-1 bg-blue-600" style={{ width: `${(currentStep / WIZARD_STEP_COUNT) * 100}%` }} />
      </View>
      <Text className="text-lg font-bold p-4">{STEP_TITLES[currentStep - 1]}</Text>
      <StepBody step={currentStep} />
      {validationError ? <Text className="mx-4 mb-2 text-red-600">{validationError}</Text> : null}
      <View className="flex-row justify-between p-4">
        <TouchableOpacity
          testID="wizard-prev-button"
          className="px-4 py-2 rounded-lg bg-neutral-200"
          onPress={() => (currentStep === 1 ? router.back() : prevStep())}
        >
          <Text>{currentStep === 1 ? "Cancelar" : "Atrás"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="wizard-next-button"
          disabled={isLastStep}
          className={`px-4 py-2 rounded-lg ${isLastStep ? "bg-neutral-300" : "bg-blue-600"}`}
          onPress={() => nextStep()}
        >
          <Text className={isLastStep ? "text-neutral-500 font-semibold" : "text-white font-semibold"}>
            {isLastStep ? "Guardar — próximamente" : "Siguiente"}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
