// src/features/service/steps/Step6TechnicalParameters.tsx
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";
import { calculateHVACThermodynamics } from "../../../shared/utils/hvacCalculations";
import type { TechnicalParameters } from "../../../shared/types/service";

function LabeledInput({
  testID,
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  testID: string;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View className="flex-1 mr-2">
      <Text className="text-xs text-neutral-500">{label}</Text>
      <TextInput
        testID={testID}
        className="border border-neutral-300 rounded-lg p-2"
        keyboardType={keyboardType ?? "default"}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const CALC_FIELDS: { beforeKey: keyof TechnicalParameters; afterKey: keyof TechnicalParameters; label: string }[] = [
  { beforeKey: "ambientTempBefore", afterKey: "ambientTempAfter", label: "T. Ambiente (°C)" },
  { beforeKey: "roomTempBefore", afterKey: "roomTempAfter", label: "T. Interior / Cuarto Frío (°C)" },
  { beforeKey: "evaporatorOutletTempBefore", afterKey: "evaporatorOutletTempAfter", label: "T. Salida Evaporador (°C)" },
  { beforeKey: "compressorDischargeTempBefore", afterKey: "compressorDischargeTempAfter", label: "T. Descarga Compresor (°C)" },
  { beforeKey: "suctionPressureBefore", afterKey: "suctionPressureAfter", label: "Presión Succión (PSIG)" },
  { beforeKey: "dischargePressureBefore", afterKey: "dischargePressureAfter", label: "Presión Descarga (PSIG)" },
  { beforeKey: "liquidLineTempBefore", afterKey: "liquidLineTempAfter", label: "T. Línea Líquido (°C)" },
];

const DRYER_FILTER_OPTIONS = ["Bueno", "Regular", "Obstruido"];

export function Step6TechnicalParameters() {
  const params = useServiceWizardStore((state) => state.draft.technicalParams);
  const refrigerant = useServiceWizardStore((state) => state.draft.equipment.refrigerant);
  const updateTechnicalParams = useServiceWizardStore((state) => state.updateTechnicalParams);

  function update(field: keyof TechnicalParameters, value: string) {
    const nextParams = { ...params, [field]: value };

    const before = calculateHVACThermodynamics({
      refrigerant,
      ambientTemp: nextParams.ambientTempBefore,
      roomTemp: nextParams.roomTempBefore,
      evaporatorOutletTemp: nextParams.evaporatorOutletTempBefore,
      compressorDischargeTemp: nextParams.compressorDischargeTempBefore,
      suctionPressure: nextParams.suctionPressureBefore,
      dischargePressure: nextParams.dischargePressureBefore,
      liquidLineTemp: nextParams.liquidLineTempBefore,
    });
    const after = calculateHVACThermodynamics({
      refrigerant,
      ambientTemp: nextParams.ambientTempAfter,
      roomTemp: nextParams.roomTempAfter,
      evaporatorOutletTemp: nextParams.evaporatorOutletTempAfter,
      compressorDischargeTemp: nextParams.compressorDischargeTempAfter,
      suctionPressure: nextParams.suctionPressureAfter,
      dischargePressure: nextParams.dischargePressureAfter,
      liquidLineTemp: nextParams.liquidLineTempAfter,
    });

    updateTechnicalParams({
      [field]: value,
      superheatBefore: before.superheat !== null ? String(before.superheat) : "",
      subcoolingBefore: before.subcooling !== null ? String(before.subcooling) : "",
      roomEvapDeltaBefore: before.roomEvapDelta !== null ? String(before.roomEvapDelta) : "",
      superheatAfter: after.superheat !== null ? String(after.superheat) : "",
      subcoolingAfter: after.subcooling !== null ? String(after.subcooling) : "",
      roomEvapDeltaAfter: after.roomEvapDelta !== null ? String(after.roomEvapDelta) : "",
      thermodynamicDiagnosis: after.hasSufficientData
        ? after.summaryDiagnosis
        : before.hasSufficientData
          ? before.summaryDiagnosis
          : "",
    });
  }

  const diagnosis = calculateHVACThermodynamics({
    refrigerant,
    ambientTemp: params.ambientTempAfter,
    roomTemp: params.roomTempAfter,
    evaporatorOutletTemp: params.evaporatorOutletTempAfter,
    compressorDischargeTemp: params.compressorDischargeTempAfter,
    suctionPressure: params.suctionPressureAfter,
    dischargePressure: params.dischargePressureAfter,
    liquidLineTemp: params.liquidLineTempAfter,
  });

  return (
    <ScrollView className="flex-1 px-4">
      {CALC_FIELDS.map((field) => (
        <View key={field.beforeKey} className="mb-2">
          <Text className="text-sm font-semibold mb-1">{field.label}</Text>
          <View className="flex-row">
            <LabeledInput testID={`param-${field.beforeKey}`} label="Antes" keyboardType="numeric" value={(params[field.beforeKey] as string) ?? ""} onChangeText={(v) => update(field.beforeKey, v)} />
            <LabeledInput testID={`param-${field.afterKey}`} label="Después" keyboardType="numeric" value={(params[field.afterKey] as string) ?? ""} onChangeText={(v) => update(field.afterKey, v)} />
          </View>
        </View>
      ))}

      <View className="mb-2 flex-row">
        <LabeledInput testID="param-voltageBefore" label="Voltaje Antes (V)" keyboardType="numeric" value={params.voltageBefore} onChangeText={(v) => update("voltageBefore", v)} />
        <LabeledInput testID="param-voltageAfter" label="Voltaje Después (V)" keyboardType="numeric" value={params.voltageAfter} onChangeText={(v) => update("voltageAfter", v)} />
      </View>
      <View className="mb-2 flex-row">
        <LabeledInput testID="param-currentBefore" label="Amperaje Antes (A)" keyboardType="numeric" value={params.currentBefore} onChangeText={(v) => update("currentBefore", v)} />
        <LabeledInput testID="param-currentAfter" label="Amperaje Después (A)" keyboardType="numeric" value={params.currentAfter} onChangeText={(v) => update("currentAfter", v)} />
      </View>
      <View className="mb-2 flex-row">
        <LabeledInput testID="param-powerBefore" label="Potencia Antes" value={params.powerBefore} onChangeText={(v) => update("powerBefore", v)} />
        <LabeledInput testID="param-powerAfter" label="Potencia Después" value={params.powerAfter} onChangeText={(v) => update("powerAfter", v)} />
      </View>

      <Text className="text-sm font-semibold mb-1">Filtro Secador — Antes</Text>
      <View className="flex-row mb-2">
        {DRYER_FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            testID={`dryer-filter-before-${option}`}
            className={`mr-2 px-3 py-2 rounded-full ${params.dryerFilterBefore === option ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateTechnicalParams({ dryerFilterBefore: option })}
          >
            <Text className={params.dryerFilterBefore === option ? "text-white" : "text-neutral-700"}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text className="text-sm font-semibold mb-1">Filtro Secador — Después</Text>
      <View className="flex-row mb-2">
        {DRYER_FILTER_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            testID={`dryer-filter-after-${option}`}
            className={`mr-2 px-3 py-2 rounded-full ${params.dryerFilterAfter === option ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateTechnicalParams({ dryerFilterAfter: option })}
          >
            <Text className={params.dryerFilterAfter === option ? "text-white" : "text-neutral-700"}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-semibold mb-1">¿Cambio de válvula?</Text>
      <View className="flex-row mb-2">
        {["No", "Sí"].map((option) => (
          <TouchableOpacity
            key={option}
            testID={`valve-change-${option}`}
            className={`mr-2 px-3 py-2 rounded-full ${params.valveChange === option ? "bg-blue-600" : "bg-neutral-200"}`}
            onPress={() => updateTechnicalParams({ valveChange: option })}
          >
            <Text className={params.valveChange === option ? "text-white" : "text-neutral-700"}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {params.valveChange === "Sí" ? (
        <TextInput
          testID="valve-change-details-input"
          className="border border-neutral-300 rounded-lg p-2 mb-2"
          placeholder="Detalle del cambio de válvula"
          value={params.valveChangeDetails}
          onChangeText={(v) => updateTechnicalParams({ valveChangeDetails: v })}
        />
      ) : null}

      {diagnosis.hasSufficientData ? (
        <View testID="thermodynamic-diagnosis" className="p-3 bg-sky-50 rounded-lg mb-4">
          <Text className="font-semibold">Diagnóstico automático</Text>
          <Text>{diagnosis.summaryDiagnosis}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
