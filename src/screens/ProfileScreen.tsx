import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import type { ProfileScreenNavProps } from '../../App'; // Đảm bảo đường dẫn đúng
import { useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn đúng
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface UserProfileData {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
  dateOfBirth?: string;
  customerID?: string;
}

const ProfileScreen: React.FC<ProfileScreenNavProps> = ({ navigation }) => {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState<string>(user?.displayName || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [ward, setWard] = useState<string>('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [customerID, setCustomerID] = useState<string>('');

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);

  const fetchUserProfile = useCallback(async () => {
    if (user && user.uid) {
      setIsProfileLoading(true);
      try {
        const userDocument = await firestore().collection('users').doc(user.uid).get();
        if (userDocument.exists()) { // Sửa ở đây nếu lỗi 'exists' còn
          const userData = userDocument.data() as UserProfileData;
          setPhoneNumber(userData.phoneNumber || '');
          setAddress(userData.address || '');
          setCity(userData.city || '');
          setDistrict(userData.district || '');
          setWard(userData.ward || '');
          setDateOfBirth(userData.dateOfBirth || '');
          setCustomerID(userData.customerID || user.uid.substring(0, 8).toUpperCase());
          if (user.displayName) {
            setDisplayName(user.displayName);
          } else if (userData.fullName) {
            setDisplayName(userData.fullName);
          }
        } else {
          const defaultCustomerID = user.uid.substring(0, 8).toUpperCase();
          setCustomerID(defaultCustomerID);
        }
      } catch (error) {
        console.error("[ProfileScreen] Lỗi lấy thông tin profile từ Firestore:", error);
        Alert.alert('Lỗi', 'Không thể tải thông tin cá nhân.');
      } finally {
        setIsProfileLoading(false);
      }
    } else {
      setIsProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      fetchUserProfile();
    }
  }, [user, fetchUserProfile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) { Alert.alert('Lỗi', 'Tên hiển thị không được để trống.'); return; }
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})\b$/;
    if (phoneNumber.trim() && !phoneRegex.test(phoneNumber.trim())) {
        Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.');
        return;
    }
    setIsUpdatingProfile(true);
    try {
      if (user.displayName !== displayName.trim()) {
        await user.updateProfile({ displayName: displayName.trim() });
      }
      const userDocRef = firestore().collection('users').doc(user.uid);
      const profileDataToSave: UserProfileData = {
        fullName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        ward: ward.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        customerID: customerID || user.uid.substring(0, 8).toUpperCase(),
      };
      await userDocRef.set(profileDataToSave, { merge: true });
      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
      setIsEditing(false);
    } catch (error: any) {
      console.error("[ProfileScreen] Lỗi cập nhật profile:", error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin. Vui lòng thử lại.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await auth().signOut(); }
    catch (error) { console.error("[ProfileScreen] Lỗi đăng xuất:", error); Alert.alert('Lỗi', 'Lỗi đăng xuất.'); setIsLoggingOut(false); }
  };

  const goToChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const goToOrderHistory = () => {
    navigation.navigate('OrderHistory');
  };

  // --- Hàm điều hướng đến Bảo hành của tôi ---
  const goToMyWarranties = () => {
    navigation.navigate('MyWarranties');
  };

  if (isProfileLoading && !user) {
    return ( <View style={styles.centeredLoading}><ActivityIndicator size="large" color="#e83e8c" /></View> );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=e83e8c&color=fff&size=128` }}
              style={styles.avatar}
            />
            <Text style={styles.userNameText}>{displayName || 'Chưa cập nhật tên'}</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {isProfileLoading && user ? (
             <ActivityIndicator size="small" color="#e83e8c" style={{marginVertical: 20}}/>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Mã khách hàng</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={customerID} editable={false} />
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Tên hiển thị *</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={displayName} onChangeText={setDisplayName} editable={isEditing} placeholder="Nhập tên hiển thị"/>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email</Text>
                <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={phoneNumber} onChangeText={setPhoneNumber} editable={isEditing} keyboardType="phone-pad" placeholder="Chưa cập nhật"/>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Địa chỉ (Số nhà, đường)</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={address} onChangeText={setAddress} editable={isEditing} placeholder="Chưa cập nhật"/>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Tỉnh/Thành phố</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={city} onChangeText={setCity} editable={isEditing} placeholder="Chưa cập nhật"/>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Quận/Huyện</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={district} onChangeText={setDistrict} editable={isEditing} placeholder="Chưa cập nhật"/>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Phường/Xã</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={ward} onChangeText={setWard} editable={isEditing} placeholder="Chưa cập nhật"/>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
                <TextInput style={[styles.input, !isEditing && styles.inputDisabled]} value={dateOfBirth} onChangeText={setDateOfBirth} editable={isEditing} placeholder="Ví dụ: 1995-12-31"/>
              </View>
              {isEditing ? (
                <TouchableOpacity style={[styles.button, styles.saveButton, isUpdatingProfile && styles.buttonDisabled]} onPress={handleUpdateProfile} disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Lưu thay đổi</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.button, styles.editButton]} onPress={() => setIsEditing(true)}>
                  <Text style={styles.buttonText}>Chỉnh sửa thông tin</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quản lý tài khoản</Text>
            <TouchableOpacity style={styles.menuItem} onPress={goToChangePassword}>
              <Text style={styles.menuItemText}>Cập nhật mật khẩu</Text>
              <Text style={styles.menuItemArrow}>{'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={goToOrderHistory}>
              <Text style={styles.menuItemText}>Lịch sử đơn hàng</Text>
              <Text style={styles.menuItemArrow}>{'>'}</Text>
            </TouchableOpacity>
            {/* --- Thêm mục Bảo hành của tôi --- */}
            <TouchableOpacity style={styles.menuItem} onPress={goToMyWarranties}>
              <Text style={styles.menuItemText}>Bảo hành của tôi</Text>
              <Text style={styles.menuItemArrow}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? <ActivityIndicator color="#fff" /> : <Text style={styles.logoutButtonText}>Đăng xuất</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1, backgroundColor: '#f4f6f8', },
  scrollContainer: { paddingBottom: 20, },
  container: { padding: 20, },
  centeredLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8', },
  avatarContainer: { alignItems: 'center', marginBottom: 25, paddingVertical: 20, backgroundColor: '#fff', borderRadius: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, borderWidth: 3, borderColor: '#e83e8c', },
  userNameText: { fontSize: 22, fontWeight: 'bold', color: '#343a40', },
  emailText: { fontSize: 15, color: '#6c757d', marginTop: 4, },
  section: { marginBottom: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#343a40', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, },
  infoRow: { marginBottom: 15, },
  label: { fontSize: 14, color: '#495057', marginBottom: 6, fontWeight: '500' },
  input: { height: 48, backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#dee2e6', borderRadius: 8, paddingHorizontal: 12, fontSize: 16, color: '#495057', },
  inputDisabled: { backgroundColor: '#e9ecef', color: '#6c757d', },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10, },
  editButton: { backgroundColor: '#007bff', },
  saveButton: { backgroundColor: '#28a745', },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', },
  logoutButton: { backgroundColor: '#dc3545', marginTop: 15 },
  logoutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', },
  buttonDisabled: { opacity: 0.7, },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', },
  menuItemText: { fontSize: 16, color: '#343a40', },
  menuItemArrow: { fontSize: 16, color: '#6c757d', },
});

export default ProfileScreen;
