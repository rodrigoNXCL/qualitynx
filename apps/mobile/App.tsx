import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { getMobileSupabaseClient, signIn, getCurrentSession } from '@qualitynx/database';
import { UserRole } from '@qualitynx/shared';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  companies: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkAuth = async () => {
    try {
      const { session } = await getCurrentSession();
      if (session) {
        const client = getMobileSupabaseClient();
        const { data: profile } = await client
          .from('users')
          .select('*, companies(*)')
          .eq('auth_id', session.user.id)
          .single();
        if (profile) {
          setUser(profile as UserProfile);
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingrese email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (data.user) {
        const client = getMobileSupabaseClient();
        const { data: profile } = await client
          .from('users')
          .select('*, companies(*)')
          .eq('auth_id', data.user.id)
          .single();
        
        if (profile) {
          setUser(profile as UserProfile);
        } else {
          Alert.alert('Error', 'Usuario no configurado en el sistema');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Error inesperado. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const client = getMobileSupabaseClient();
    await client.auth.signOut();
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>QNX</Text>
        </View>
        <Text style={styles.title}>QualityNX</Text>
        <Text style={styles.subtitle}>Gestión de calidad y trazabilidad</Text>
        
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
          <Button
            title="Iniciar sesión"
            onPress={handleLogin}
            disabled={loading}
            color="#16a34a"
          />
          {loading && <ActivityIndicator size="small" color="#16a34a" />}
        </View>
        
        <Text style={styles.version}>QualityNX v1.0.0 - FOUNDATION Stage</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>QNX</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.full_name}</Text>
          <Text style={styles.userRole}>{user.role.replace('_', ' ')}</Text>
          {user.companies && (
            <Text style={styles.companyName}>{user.companies.name}</Text>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Estado FOUNDATION</Text>
        <View style={styles.statusList}>
          <StatusItem label="Plataforma central (Supabase)" status="ok" />
          <StatusItem label="Base de datos (PostgreSQL)" status="ok" />
          <StatusItem label="Autenticación (Supabase Auth)" status="ok" />
          <StatusItem label="Multiempresa con RLS" status="ok" />
          <StatusItem label="Roles base" status="ok" />
          <StatusItem label="Auditoría base" status="ok" />
          <StatusItem label="Almacenamiento (Supabase Storage)" status="pending" />
        </View>

        <View style={styles.sectionTitle}>Acciones</View>
        <Button
          title="Cerrar sesión"
          onPress={handleLogout}
          color="#dc2626"
        />
      </View>

      <Text style={styles.version}>QualityNX v1.0.0 - FOUNDATION Stage</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function StatusItem({ label, status }: { label: string; status: 'ok' | 'pending' }) {
  return (
    <View style={styles.statusItem}>
      <View style={[
        styles.statusDot,
        status === 'ok' ? styles.statusOk : styles.statusPending
      ]} />
      <Text style={styles.statusLabel}>{label}</Text>
      {status === 'ok' && <Text style={styles.statusOkText}>✓</Text>}
      {status === 'pending' && <Text style={styles.statusPendingText}>⚠</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  userRole: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
    marginTop: 2,
  },
  companyName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    gap: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statusList: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusOk: {
    backgroundColor: '#16a34a',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  statusOkText: {
    color: '#16a34a',
    fontWeight: 'bold',
  },
  statusPendingText: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  version: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    fontSize: 12,
    color: '#9ca3af',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
