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
  // --- State cho việc lưu email ---
  const [rememberEmail, setRememberEmail] = useState<boolean>(true); // Mặc định là bật

  // --- useEffect để tải email đã lưu khi màn hình mount ---
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
        if (savedEmail !== null) {
          setEmail(savedEmail); // Điền email đã lưu vào state
          console.log('Loaded saved email:', savedEmail);
        } else {
          console.log('No saved email found.');
        }
        // Có thể thêm logic để đọc trạng thái rememberEmail nếu muốn
      } catch (e) {
        console.error('Failed to load saved email from AsyncStorage', e);
      }
    };

    loadSavedEmail();
  }, []); // Mảng rỗng đảm bảo chỉ chạy 1 lần

  // --- Hàm xử lý đăng nhập (thêm logic lưu email) ---
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setIsLoading(true);

    // --- Lưu hoặc xóa email trước khi đăng nhập ---
    const emailToSave = email.trim(); // Lấy email đã trim
    try {
      if (rememberEmail && emailToSave) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, emailToSave);
        console.log('Saved email:', emailToSave);
      } else {
        // Nếu không chọn lưu hoặc email rỗng, xóa email đã lưu (nếu có)
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
        console.log('Removed saved email.');
      }
    } catch (e) {
      console.error('Failed to save/remove email in AsyncStorage', e);
      // Có thể không cần báo lỗi cho người dùng ở đây
    }
    // --- Kết thúc phần lưu/xóa email ---

    try {
      // Đăng nhập bằng Firebase
      const userCredential = await auth().signInWithEmailAndPassword(emailToSave, password);
      console.log('Đăng nhập Firebase thành công!', userCredential.user.email);
      // RootNavigator sẽ tự chuyển màn hình
    } catch (error: any) {
      console.error("Lỗi đăng nhập Firebase:", error);
      let errorMessage = 'Sai địa chỉ email hoặc mật khẩu.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
         errorMessage = 'Sai địa chỉ email hoặc mật khẩu.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Địa chỉ email không hợp lệ.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Tài khoản này đã bị vô hiệu hóa.';
      } else {
         errorMessage = 'Có lỗi xảy ra, vui lòng thử lại.';
      }
      Alert.alert('Đăng nhập thất bại', errorMessage);
      setIsLoading(false); // Chỉ tắt loading khi có lỗi vì đăng nhập thành công sẽ unmount
    }
    // Không cần setIsLoading(false) ở cuối nếu đăng nhập thành công
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
          value={email} // Giá trị lấy từ state (có thể đã được load từ AsyncStorage)
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

        {/* --- Thêm Switch để bật/tắt lưu email --- */}
        <View style={styles.rememberMeContainer}>
           <Text style={styles.rememberMeText}>Lưu địa chỉ email?</Text>
           <Switch
             trackColor={{ false: "#767577", true: "#AC0013" }} // Màu nền của switch
             thumbColor={rememberEmail ? "#AC0013" : "#f4f3f4"} // Màu của nút tròn
             ios_backgroundColor="#3e3e3e"
             onValueChange={setRememberEmail} // Cập nhật state khi switch thay đổi
             value={rememberEmail} // Giá trị hiện tại của switch
             disabled={isLoading} // Vô hiệu hóa khi đang loading
           />
        </View>
        {/* --- Kết thúc Switch --- */}


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

// --- Cập nhật Styles ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: '#f8f9fa', },
  logo: { width: 220, height: 90, marginBottom: 40, },
  title: { fontSize: 32, fontWeight: 'bold', color: '#343a40', marginBottom: 35, },
  input: { width: '100%', height: 55, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontSize: 16, color: '#495057', },
  // --- Style cho phần Lưu email ---
  rememberMeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Đẩy text và switch ra 2 bên
    alignItems: 'center', // Căn giữa theo chiều dọc
    width: '100%', // Chiếm toàn bộ chiều rộng
    marginBottom: 20, // Khoảng cách dưới
  },
  rememberMeText: {
    fontSize: 14,
    color: '#495057',
  },
  // --- Kết thúc Style Lưu email ---
  button: { width: '100%', backgroundColor: '#AC0013', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 5, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, }, // Giảm marginTop
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: '#AC0013', },
  linksContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 25, },
  linkText: { color: '#AC0013', fontSize: 15, },
  linkTextDisabled: { color: '#AC0013', },
});

export default LoginScreen;
