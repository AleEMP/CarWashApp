import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { authErrorMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';
import { colors, fontSize, radius, spacing } from '@/theme';

type Mode = 'login' | 'register';
type Errors = { name?: string; email?: string; password?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

export default function Correo() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const changeMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError(null);
    setNotice(null);
  };

  const validate = (): Errors => {
    const found: Errors = {};
    if (isRegister && name.trim().length < 2) found.name = 'Escribe tu nombre.';
    if (!EMAIL_PATTERN.test(email.trim())) found.email = 'Escribe un correo válido.';
    if (isRegister && password.length < MIN_PASSWORD) {
      found.password = `Usa al menos ${MIN_PASSWORD} caracteres.`;
    } else if (!isRegister && password.length === 0) {
      found.password = 'Escribe tu contraseña.';
    }
    return found;
  };

  const submit = async () => {
    setFormError(null);
    setNotice(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    const credentials = { email: email.trim(), password };

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        ...credentials,
        options: { data: { full_name: name.trim() } },
      });
      if (error) {
        setFormError(authErrorMessage(error));
      } else if (data.user?.identities?.length === 0) {
        // Con la confirmación de correo activa, Supabase no devuelve error si el correo ya existe.
        setFormError('Ya existe una cuenta con este correo. Prueba ingresar.');
      } else if (!data.session) {
        setNotice('Te enviamos un correo para confirmar tu cuenta. Confírmalo y luego ingresa.');
        setMode('login');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) setFormError(authErrorMessage(error));
    }

    // Si se inició sesión, el guard del layout raíz reemplaza esta pantalla solo.
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader />

          <AppText weight="display" size={28} style={styles.title}>
            {isRegister ? 'Crea tu cuenta' : 'Ingresa con tu correo'}
          </AppText>
          <AppText weight="medium" size={fontSize.body} color="textSecondary">
            Solo necesitas una cuenta para publicar reseñas.
          </AppText>

          <View style={styles.tabs}>
            <Tab label="Ingresar" active={!isRegister} onPress={() => changeMode('login')} />
            <Tab label="Crear cuenta" active={isRegister} onPress={() => changeMode('register')} />
          </View>

          <View style={styles.form}>
            {isRegister ? (
              <TextField
                label="Nombre"
                value={name}
                onChangeText={setName}
                error={errors.name}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder="Tu nombre y apellido"
              />
            ) : null}
            <TextField
              label="Correo"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="tucorreo@ejemplo.com"
            />
            <TextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              textContentType={isRegister ? 'newPassword' : 'password'}
              placeholder={isRegister ? `Mínimo ${MIN_PASSWORD} caracteres` : 'Tu contraseña'}
              onSubmitEditing={submit}
            />
          </View>

          {formError ? (
            <AppText weight="semibold" size={fontSize.small} color="danger" style={styles.message}>
              {formError}
            </AppText>
          ) : null}
          {notice ? (
            <AppText weight="semibold" size={fontSize.small} color="success" style={styles.message}>
              {notice}
            </AppText>
          ) : null}

          <View style={styles.submit}>
            <Button label={isRegister ? 'Crear cuenta' : 'Ingresar'} onPress={submit} loading={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}>
      <AppText weight="bold" size={fontSize.body} color={active ? 'text' : 'textMuted'}>
        {label}
      </AppText>
    </Pressable>
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
  tabs: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
