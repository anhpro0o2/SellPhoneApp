import React, { useState, useEffect } from 'react'; // Thêm useEffect
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Switch // Import Switch để làm nút bật/tắt lưu email
} from 'react-native';
import type { LoginScreenNavProps } from '../../App';
import auth from '@react-native-firebase/auth';
// --- Import AsyncStorage ---
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Key để lưu email trong AsyncStorage ---
const SAVED_EMAIL_KEY = '@MyAppSellPhone:savedEmail';

const LoginScreen: React.FC<LoginScreenNavProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rememberEmail, setRememberEmail] = useState<boolean>(true); // Mặc định là bật

  // --- useEffect để tải email đã lưu khi màn hình mount ---
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
        if (savedEmail !== null) {
          setEmail(savedEmail);
          console.log('Loaded saved email:', savedEmail);
        } else {
          console.log('No saved email found.');
        }
      } catch (e) {
        console.error('Failed to load saved email from AsyncStorage', e);
      }
    };

    loadSavedEmail();
  }, []);

  // --- Hàm xử lý đăng nhập (thêm logic lưu email) ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    const emailToSave = email.trim();
    try {
      if (rememberEmail && emailToSave) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, emailToSave);
        console.log('Saved email:', emailToSave);
      } else {
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
        console.log('Removed saved email.');
      }
    } catch (e) {
      console.error('Failed to save/remove email in AsyncStorage', e);
    }

    try {
      const userCredential = await auth().signInWithEmailAndPassword(emailToSave, password);
      console.log('Đăng nhập Firebase thành công!', userCredential.user.email);
      // RootNavigator sẽ tự chuyển màn hình, không cần setIsLoading(false) ở đây
    } catch (error: any) {
      console.error("Lỗi đăng nhập Firebase:", error.code, error.message); // Log cả code và message
      let errorMessage = 'Có lỗi xảy ra, vui lòng thử lại.'; // Mặc định

      // --- SỬA LỖI Ở ĐÂY: Cập nhật thông báo lỗi ---
      if (
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential' // Thêm mã lỗi này
      ) {
          errorMessage = 'Bạn đã nhập sai mật khẩu hoặc email.'; // Thông báo mong muốn
      }
      // --- KẾT THÚC SỬA LỖI ---
      else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Địa chỉ email không hợp lệ.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tài khoản này đã bị vô hiệu hóa.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.';
      }
      // Bạn có thể thêm các mã lỗi khác của Firebase Auth nếu cần

      Alert.alert('Đăng nhập thất bại', errorMessage);
      setIsLoading(false); // Chỉ tắt loading khi có lỗi
    }
  };

  const goToRegister = () => { if (!isLoading) navigation.navigate('Register'); };
  const goToForgotPassword = () => { if (!isLoading) navigation.navigate('ForgotPassword'); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <View style={styles.container}>
        <Image source={require('../assets/cellphones-logo.png')} style={styles.logo} resizeMode="contain"/>
        <Text style={styles.title}>Đăng Nhập</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          editable={!isLoading}
        />

        <View style={styles.rememberMeContainer}>
           <Text style={styles.rememberMeText}>Lưu địa chỉ email?</Text>
           <Switch
             trackColor={{ false: "#767577", true: "#AC0013" }}
             thumbColor={rememberEmail ? "#AC0013" : "#f4f3f4"}
             ios_backgroundColor="#3e3e3e"
             onValueChange={setRememberEmail}
             value={rememberEmail}
             disabled={isLoading}
           />
        </View>

        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
           {isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.buttonText}>Đăng Nhập</Text>}
        </TouchableOpacity>
        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={goToRegister} disabled={isLoading}>
            <Text style={[styles.linkText, isLoading && styles.linkTextDisabled]}>Đăng ký</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToForgotPassword} disabled={isLoading}>
            <Text style={[styles.linkText, isLoading && styles.linkTextDisabled]}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: '#f8f9fa', },
  logo: { width: 220, height: 90, marginBottom: 40, },
  title: { fontSize: 32, fontWeight: 'bold', color: '#343a40', marginBottom: 35, },
  input: { width: '100%', height: 55, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontSize: 16, color: '#495057', },
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#495057',
  },
  button: { width: '100%', backgroundColor: '#AC0013', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: '#AC0013', opacity: 0.7 }, // Thêm opacity khi disable
  linksContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 25, },
  linkText: { color: '#AC0013', fontSize: 15, },
  linkTextDisabled: { color: '#AC0013', opacity: 0.5 }, // Thêm opacity khi disable
});

export default LoginScreen;
