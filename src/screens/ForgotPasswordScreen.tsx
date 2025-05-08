import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
// Import kiểu Navigation prop TỪ App.tsx (Đảm bảo đường dẫn đúng)
import type { ForgotPasswordScreenNavProps } from '../../App';
// Import Firebase Auth
import auth from '@react-native-firebase/auth';

// Sử dụng kiểu ForgotPasswordScreenNavProps đã import
const ForgotPasswordScreen: React.FC<ForgotPasswordScreenNavProps> = ({ navigation }) => {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hàm xử lý gửi yêu cầu đặt lại mật khẩu với Firebase
  const handlePasswordResetRequest = async () => {
    Keyboard.dismiss();
    if (!email) { Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email.'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!emailRegex.test(email)) { Alert.alert('Lỗi', 'Định dạng email không hợp lệ.'); return; }

    setIsLoading(true);

    try {
      // Gửi email đặt lại mật khẩu
      await auth().sendPasswordResetEmail(email.trim());

      // Hiển thị thông báo thành công chung chung
      Alert.alert(
        'Yêu cầu đã được gửi',
        'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến (và cả thư mục spam).',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
      console.log('Yêu cầu đặt lại mật khẩu đã gửi thành công cho:', email);

    } catch (error: any) {
      console.error("Lỗi gửi email reset:", error);
      let errorMessage = 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Địa chỉ email không hợp lệ.';
        Alert.alert('Lỗi', errorMessage);
      } else {
         // Với các lỗi khác (user-not-found,...) vẫn hiển thị thông báo thành công chung
         Alert.alert(
            'Yêu cầu đã được gửi',
            'Nếu email của bạn tồn tại trong hệ thống, chúng tôi đã gửi một hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến (và cả thư mục spam).',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
      }
       // Chỉ tắt loading ở đây nếu có lỗi và không điều hướng đi
       if (error.code === 'auth/invalid-email') {
           setIsLoading(false);
       } else {
           // Nếu là lỗi khác mà vẫn hiện thông báo thành công thì không cần tắt loading ở đây
           // vì Alert sẽ điều hướng đi và component unmount
       }
    }
    // Không cần finally nếu Alert luôn điều hướng đi hoặc tắt loading trong catch
  };

  // Hàm quay lại màn hình Đăng nhập
  const goToLogin = () => { if (!isLoading) navigation.goBack(); };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
           <Image
               source={require('../assets/cellphones-logo.png')} // Đường dẫn đúng
               style={styles.logo}
               resizeMode="contain"
            />
          <Text style={styles.title}>Quên Mật khẩu</Text>
          <Text style={styles.instructions}>
            Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Địa chỉ Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handlePasswordResetRequest}
            editable={!isLoading}
          />

          <TouchableOpacity
             style={[styles.button, isLoading && styles.buttonDisabled]}
             onPress={handlePasswordResetRequest}
             disabled={isLoading}
            >
             {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Gửi Yêu Cầu</Text>
              )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={goToLogin}
            disabled={isLoading}
            >
            {/* --- SỬA LỖI Ở ĐÂY: styles.linkButtonDisabled --- */}
            <Text style={[styles.linkText, isLoading && styles.linkButtonDisabled]}>Quay lại Đăng nhập</Text>
            {/* --- KẾT THÚC SỬA LỖI --- */}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

// --- Giữ nguyên styles, đảm bảo có linkButtonDisabled ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: '#f8f9fa', },
   logo: { width: 220, height: 90, marginBottom: 40, },
  title: { fontSize: 30, fontWeight: 'bold', color: '#343a40', marginBottom: 15, },
  instructions: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 30, lineHeight: 24, },
  input: { width: '100%', height: 55, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 15, marginBottom: 25, fontSize: 16, color: '#495057', },
  button: { width: '100%', backgroundColor: '#AC0013', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 25, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: '#AC0013', },
  linkButton: { marginTop: 15, },
  linkText: { color: '#AC0013', fontSize: 15, },
   linkButtonDisabled: { // Đảm bảo style này tồn tại
    color: '#AC0013',
  },
});

export default ForgotPasswordScreen;
