import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
// Import kiểu Navigation prop TỪ App.tsx (Đảm bảo đường dẫn đúng)
import type { RegisterScreenNavProps } from '../../App';
// --- BỎ COMMENT DÒNG NÀY ĐỂ IMPORT FIREBASE AUTH ---
import auth from '@react-native-firebase/auth';

// Sử dụng kiểu RegisterScreenNavProps đã import
const RegisterScreen: React.FC<RegisterScreenNavProps> = ({ navigation }) => {
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // Lưu ý: Firebase Auth cơ bản không lưu SĐT trực tiếp khi đăng ký bằng email
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hàm xử lý đăng ký với Firebase
  const handleRegister = async () => {
    // --- Kiểm tra đầu vào (giữ nguyên) ---
    if (!fullName || !email || !phoneNumber || !password || !confirmPassword) { Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.'); return; }
    if (password !== confirmPassword) { Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!emailRegex.test(email)) { Alert.alert('Lỗi', 'Định dạng email không hợp lệ.'); return; }
    const phoneRegex = /^[0-9]{10}$/; if (!phoneRegex.test(phoneNumber)) { Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (yêu cầu 10 chữ số).'); return; }
    if (password.length < 6) { Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.'); return; }

    setIsLoading(true); // Bắt đầu loading

    // --- TÍCH HỢP FIREBASE AUTH ---
    try {
      // Tạo người dùng mới bằng email và mật khẩu
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      console.log('Đăng ký Firebase thành công! User:', userCredential.user);

      // Cập nhật tên hiển thị (displayName) cho người dùng mới
      // .trim() để loại bỏ khoảng trắng thừa ở đầu/cuối tên
      await userCredential.user.updateProfile({
          displayName: fullName.trim()
      });
      console.log('Cập nhật profile thành công cho:', userCredential.user.email);

      // (Quan trọng): Lưu số điện thoại và các thông tin khác vào Firestore hoặc Realtime Database
      // Firebase Authentication không lưu các trường tùy chỉnh như số điện thoại khi đăng ký bằng email/pass.
      // Bạn cần dùng Firestore để tạo một collection 'users' và lưu thông tin này theo user.uid
      // Ví dụ (cần cài đặt @react-native-firebase/firestore):
      // import firestore from '@react-native-firebase/firestore';
      // await firestore().collection('users').doc(userCredential.user.uid).set({
      //   fullName: fullName.trim(),
      //   email: email.trim(),
      //   phoneNumber: phoneNumber,
      //   createdAt: firestore.FieldValue.serverTimestamp(),
      // });
      // console.log('Lưu thông tin bổ sung vào Firestore thành công!');

      // Thông báo thành công và chuyển về màn hình Login
       Alert.alert(
         'Đăng ký thành công!',
         'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập.',
         [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
       );

    } catch (error: any) { // Bắt lỗi từ Firebase
      console.error("Lỗi đăng ký Firebase:", error);
      let errorMessage = 'Đã có lỗi xảy ra trong quá trình đăng ký.';
      // Kiểm tra mã lỗi cụ thể từ Firebase
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Địa chỉ email này đã được sử dụng bởi tài khoản khác.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Địa chỉ email không hợp lệ.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác mạnh hơn (ít nhất 6 ký tự).';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Đăng ký bằng Email/Mật khẩu chưa được bật trong Firebase Console.';
      }
      Alert.alert('Đăng ký thất bại', errorMessage);
    } finally {
      setIsLoading(false); // Luôn tắt loading sau khi hoàn tất
    }
    // --- KẾT THÚC TÍCH HỢP FIREBASE ---
  };

  const goToLogin = () => { if (!isLoading) navigation.goBack(); };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Image
            source={require('../assets/cellphones-logo.png')} // Đường dẫn đúng
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Tạo Tài Khoản</Text>

          {/* --- Giữ nguyên các TextInput --- */}
          <TextInput style={styles.input} placeholder="Họ và tên" value={fullName} onChangeText={setFullName} autoCapitalize="words" returnKeyType="next" editable={!isLoading} />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" editable={!isLoading} />
          <TextInput style={styles.input} placeholder="Số điện thoại (10 chữ số)" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" returnKeyType="next" editable={!isLoading} />
          <TextInput style={styles.input} placeholder="Mật khẩu (ít nhất 6 ký tự)" value={password} onChangeText={setPassword} secureTextEntry={true} returnKeyType="next" editable={!isLoading} />
          <TextInput style={styles.input} placeholder="Xác nhận mật khẩu" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={true} returnKeyType="done" onSubmitEditing={handleRegister} editable={!isLoading} />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.buttonText}>Đăng Ký</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={goToLogin} disabled={isLoading}>
            <Text style={[styles.linkText, isLoading && styles.linkTextDisabled]}>Đã có tài khoản? Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Giữ nguyên styles ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', },
  container: { alignItems: 'center', paddingHorizontal: 30, paddingVertical: 20, backgroundColor: '#f8f9fa', },
  logo: { width: 180, height: 75, marginBottom: 30, },
  title: { fontSize: 30, fontWeight: 'bold', color: '#343a40', marginBottom: 30, },
  input: { width: '100%', height: 55, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16, color: '#495057', },
  button: { width: '100%', backgroundColor: '#AC0013', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: '#AC0013', },
  linkButton: { marginTop: 15, },
  linkText: { color: '#AC0013', fontSize: 15, },
  linkTextDisabled: { color: '#AC0013', },
});

export default RegisterScreen;
