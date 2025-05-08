import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator, // Đảm bảo đã import
} from 'react-native';
// Import kiểu Navigation prop từ App.tsx
import type { ShippingAddressScreenNavProps } from '../../App'; // Đảm bảo đường dẫn đúng
// Import useCart để lấy các sản phẩm đã chọn
import { useCart } from '../context/CartContext'; // Đảm bảo đường dẫn đúng

// Định nghĩa kiểu cho thông tin giao hàng
interface ShippingInfo {
  fullName: string;
  phoneNumber: string;
  address: string; // Số nhà, tên đường
  city: string; // Tỉnh/Thành phố
  district: string; // Quận/Huyện
  ward?: string; // Phường/Xã (tùy chọn)
  notes?: string; // Ghi chú (tùy chọn)
}

// Định nghĩa kiểu cho CartItem khi truyền đi (chỉ lấy các trường cần thiết)
interface CartItemForPayment {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    // Không cần stock ở đây vì đã kiểm tra ở các bước trước
}


const ShippingAddressScreen: React.FC<ShippingAddressScreenNavProps> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Giữ lại nếu có xử lý bất đồng bộ sau này

  // Lấy hàm getSelectedItems từ CartContext
  const { getSelectedItems } = useCart();

  const handleContinue = () => {
    // Kiểm tra dữ liệu đầu vào cơ bản
    if (!fullName.trim() || !phoneNumber.trim() || !address.trim() || !city.trim() || !district.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường bắt buộc (*).');
      return;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.');
      return;
    }

    const shippingDetails: ShippingInfo = {
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      city: city.trim(),
      district: district.trim(),
      ward: ward.trim() || undefined, // Gán undefined nếu rỗng để nhất quán
      notes: notes.trim() || undefined, // Gán undefined nếu rỗng
    };

    // Lấy các sản phẩm đã được chọn từ giỏ hàng
    const selectedCartItemsFromContext = getSelectedItems();

    if (selectedCartItemsFromContext.length === 0) {
        Alert.alert("Lỗi", "Không có sản phẩm nào được chọn để thanh toán từ giỏ hàng.");
        // Có thể điều hướng về giỏ hàng nếu muốn
        // navigation.navigate('Cart');
        return;
    }

    // Chỉ lấy các trường cần thiết của CartItem để truyền đi
    const selectedCartItemsForPayment: CartItemForPayment[] = selectedCartItemsFromContext.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
    }));


    console.log('Thông tin giao hàng:', shippingDetails);
    console.log('Sản phẩm đã chọn để thanh toán:', selectedCartItemsForPayment);

    // --- Điều hướng đến màn hình Chọn Phương thức Thanh toán ---
    // và truyền dữ liệu shippingDetails cùng selectedCartItems
    navigation.navigate('PaymentMethod', {
      shippingDetails: shippingDetails,
      selectedCartItems: selectedCartItemsForPayment,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Thông Tin Giao Hàng</Text>

          <Text style={styles.label}>Họ và tên người nhận *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Số điện thoại *</Text>
          <TextInput
            style={styles.input}
            placeholder="09xxxxxxxx"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Địa chỉ (Số nhà, tên đường) *</Text>
          <TextInput
            style={styles.input}
            placeholder="123 Đường ABC"
            value={address}
            onChangeText={setAddress}
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Tỉnh/Thành phố *</Text>
          <TextInput
            style={styles.input}
            placeholder="TP. Hồ Chí Minh"
            value={city}
            onChangeText={setCity}
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Quận/Huyện *</Text>
          <TextInput
            style={styles.input}
            placeholder="Quận 1"
            value={district}
            onChangeText={setDistrict}
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Phường/Xã</Text>
          <TextInput
            style={styles.input}
            placeholder="Phường Bến Nghé (tùy chọn)"
            value={ward}
            onChangeText={setWard}
            returnKeyType="next"
            editable={!isLoading}
          />

          <Text style={styles.label}>Ghi chú thêm</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Giao hàng giờ hành chính, gọi trước khi giao..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            returnKeyType="done" // Nút cuối cùng nên là done
            onSubmitEditing={handleContinue} // Cho phép nhấn enter/done để tiếp tục
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Tiếp tục</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// --- Styles (Giữ nguyên) ---
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
    marginBottom: 25,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 18,
    fontSize: 16,
    color: '#495057',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  button: {
    width: '100%',
    backgroundColor: '#AC0013',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#AC0013',
  },
});

export default ShippingAddressScreen;
