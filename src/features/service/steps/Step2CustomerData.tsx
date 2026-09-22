import { Text, TextInput, View } from "react-native";
import { useServiceWizardStore } from "../useServiceWizardStore";

export function Step2CustomerData() {
  const customer = useServiceWizardStore((state) => state.draft.customer);
  const updateCustomer = useServiceWizardStore((state) => state.updateCustomer);

  return (
    <View className="px-4">
      <TextInput testID="customer-company-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Empresa" value={customer.company} onChangeText={(company) => updateCustomer({ company })} />
      <TextInput testID="customer-contact-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Persona de contacto" value={customer.contactPerson} onChangeText={(contactPerson) => updateCustomer({ contactPerson })} />
      <TextInput testID="customer-address-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Dirección" value={customer.address} onChangeText={(address) => updateCustomer({ address })} />
      <TextInput testID="customer-city-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Ciudad" value={customer.city} onChangeText={(city) => updateCustomer({ city })} />
      <TextInput testID="customer-phone-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Teléfono" keyboardType="phone-pad" value={customer.phone} onChangeText={(phone) => updateCustomer({ phone })} />
      <TextInput testID="customer-email-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="Correo" autoCapitalize="none" keyboardType="email-address" value={customer.email} onChangeText={(email) => updateCustomer({ email })} />
      <TextInput testID="customer-nit-input" className="mb-2 border border-neutral-300 rounded-lg p-3" placeholder="NIT (opcional)" value={customer.nit} onChangeText={(nit) => updateCustomer({ nit })} />
    </View>
  );
}
