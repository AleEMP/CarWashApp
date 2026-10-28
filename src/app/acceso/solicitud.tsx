import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { goBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import { fontSize, spacing } from '@/theme';

type Errors = { businessName?: string; contactName?: string; phone?: string; email?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SolicitudAcceso() {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = (): Errors => {
    const found: Errors = {};
    if (businessName.trim().length < 2) found.businessName = 'Escribe el nombre de tu local.';
    if (contactName.trim().length < 2) found.contactName = 'Escribe tu nombre.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 15) found.phone = 'Escribe un teléfono válido.';
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) found.email = 'Escribe un correo válido.';
    return found;
  };

  const submit = async () => {
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    const { error } = await supabase.from('owner_access_requests').insert({
      business_name: businessName.trim(),
      contact_name: contactName.trim(),
      phone: phone.trim(),
      email: email.trim() || null,
      address: address.trim() || null,
      message: message.trim() || null,
    });
    setBusy(false);

    if (error) {
      setFormError('No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.');
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <ScreenHeader />
          <AppText weight="display" size={28} style={styles.title}>
            ¡Recibimos tu solicitud!
          </AppText>
          <AppText weight="medium" size={fontSize.body} color="textSecondary">
            Un administrador revisará los datos de {businessName.trim()} y se comunicará contigo al {phone.trim()}.
          </AppText>
          <View style={styles.submit}>
            <Button label="Volver" onPress={goBack} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader />

          <AppText weight="display" size={28} style={styles.title}>
            Solicita acceso
          </AppText>
          <AppText weight="medium" size={fontSize.body} color="textSecondary">
            Cuéntanos de tu centro de lavado. Verificamos cada local antes de publicarlo en la app.
          </AppText>

          <View style={styles.form}>
            <TextField
              label="Nombre del local"
              value={businessName}
              onChangeText={setBusinessName}
              error={errors.businessName}
              autoCapitalize="words"
            />
            <TextField
              label="Tu nombre"
              value={contactName}
              onChangeText={setContactName}
              error={errors.contactName}
              autoCapitalize="words"
              autoComplete="name"
            />
            <TextField
              label="Teléfono o WhatsApp"
              value={phone}
              onChangeText={setPhone}
              error={errors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TextField
              label="Correo (opcional)"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextField label="Dirección (opcional)" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
            <TextField
              label="Mensaje (opcional)"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              placeholder="Servicios que ofreces, horarios, etc."
            />
          </View>

          {formError ? (
            <AppText weight="semibold" size={fontSize.small} color="danger" style={styles.message}>
              {formError}
            </AppText>
          ) : null}

          <View style={styles.submit}>
            <Button label="Enviar solicitud" onPress={submit} loading={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    marginTop: spacing.sm,
    letterSpacing: -0.8,
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  message: {
    marginTop: spacing.sm,
  },
  submit: {
    marginTop: spacing.lg,
  },
});
