import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView, // <-- Thêm ScrollView vào đây
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../App'; // Đảm bảo đường dẫn đúng
import { useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn đúng
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Props cho màn hình này
export type ChangePasswordScreenNavProps = NativeStackScreenProps<MainStackParamList, 'ChangePassword'>;

const ChangePasswordScreen: React.FC<ChangePasswordScreenNavProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hàm để xác thực lại người dùng
  const reauthenticate = async (password: string): Promise<FirebaseAuthTypes.UserCredential | null> => {
    if (!user || !user.email) {
      throw new Error("Không tìm thấy thông tin người dùng hoặc email.");
    }
    try {
      const credential = auth.EmailAuthProvider.credential(user.email, password);
      return await user.reauthenticateWithCredential(credential);
    } catch (reauthError: any) {
      console.error("Lỗi xác thực lại:", reauthError);
      if (reauthError.code === 'auth/wrong-password') {
        throw new Error('Mật khẩu hiện tại không đúng.');
      } else if (reauthError.code === 'auth/user-mismatch') {
         throw new Error('Thông tin xác thực không khớp với người dùng hiện tại.');
      } else if (reauthError.code === 'auth/too-many-requests'){
        throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau.');
      }
      throw new Error('Không thể xác thực lại. Vui lòng thử lại.');
    }
  };

  const handleChangePassword = async () => {
    setError(null);

    if (!currentPassword.trim()) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
     if (newPassword === currentPassword) {
        setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
        return;
    }

    setIsLoading(true);
    try {
      await reauthenticate(currentPassword);
      console.log("Xác thực lại thành công!");

      if (user) {
        await user.updatePassword(newPassword);
        Alert.alert(
          'Thành công',
          'Mật khẩu của bạn đã được cập nhật thành công.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        throw new Error("Không tìm thấy thông tin người dùng để cập nhật mật khẩu.");
      }
    } catch (e: any) {
      console.error("Lỗi cập nhật mật khẩu:", e);
      setError(e.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
    >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
                <Text style={styles.title}>Cập Nhật Mật Khẩu</Text>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mật khẩu hiện tại</Text>
                    <TextInput
                        style={styles.input}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        placeholder="Nhập mật khẩu hiện tại"
                        placeholderTextColor="#adb5bd"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mật khẩu mới</Text>
                    <TextInput
                        style={styles.input}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                        placeholderTextColor="#adb5bd"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry
                        placeholder="Nhập lại mật khẩu mới"
                        placeholderTextColor="#adb5bd"
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Cập nhật mật khẩu</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#343a40',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
    borderColor: '#ced4da',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#495057',
  },
  button: {
    backgroundColor: '#e83e8c',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonDisabled: {
    backgroundColor: '#f4a5c8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 5,
  },
});

export default ChangePasswordScreen;
