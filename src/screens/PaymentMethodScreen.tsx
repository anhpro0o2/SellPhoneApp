import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import type { PaymentMethodScreenNavProps, OrderDetailsForSummary } from '../../App'; // Đảm bảo đường dẫn đúng
interface CartItemForPayment { id: string; name: string; price: number; quantity: number; imageUrl: string; }
interface ShippingInfo { fullName: string; phoneNumber: string; address: string; city: string; district: string; ward?: string; notes?: string; }

// --- KHÔNG CẦN IMPORT ẢNH QR Ở ĐÂY NỮA ---
// import QR_COC_IMAGE from '../assets/QR_COC.jpg';
// import QR_NGANHANG_IMAGE from '../assets/QR_NGANHANG.jpg';
// --- KẾT THÚC ---

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { id: 'bankTransfer', label: 'Chuyển khoản ngân hàng' },
  { id: 'onlineWallet', label: 'Ví điện tử (Momo, ZaloPay,...)' },
];

const MIN_DEPOSIT_AMOUNT = 500000;
const DEPOSIT_REQUIRED_THRESHOLD = 500000;

type QrImageSource = number; // Kiểu trả về của require() là number

const PaymentMethodScreen: React.FC<PaymentMethodScreenNavProps> = ({ route, navigation }) => {
  const { shippingDetails, selectedCartItems } = route.params;

  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [currentQrImage, setCurrentQrImage] = useState<QrImageSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const totalPrice = useMemo(() => {
    if (!selectedCartItems || selectedCartItems.length === 0) return 0;
    return selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedCartItems]);

  const formatPrice = (price: number): string => {
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
    setCurrentQrImage(null); // Reset QR

    if (methodId === 'cod' && totalPrice >= DEPOSIT_REQUIRED_THRESHOLD) {
      try {
        // --- SỬ DỤNG require() Ở ĐÂY ---
        setCurrentQrImage(require('../assets/QR_COC.jpg'));
      } catch (e) {
        console.error("Lỗi tải ảnh QR_COC.jpg:", e);
        Alert.alert("Lỗi", "Không tìm thấy ảnh QR_COC.jpg. Kiểm tra lại đường dẫn và tên file trong thư mục assets.");
      }
    } else if (methodId === 'bankTransfer') {
      try {
        // --- SỬ DỤNG require() Ở ĐÂY ---
        setCurrentQrImage(require('../assets/QR_NGANHANG_.jpg'));
      } catch (e) {
        console.error("Lỗi tải ảnh QR_NGANHANG.jpg:", e);
        Alert.alert("Lỗi", "Không tìm thấy ảnh QR_NGANHANG.jpg. Kiểm tra lại đường dẫn và tên file trong thư mục assets.");
      }
    } else if (methodId === 'onlineWallet') {
      console.log("Selected Online Wallet - Further integration needed.");
    }
  };

  const handleContinue = () => {
    if (!selectedMethodId) {
      Alert.alert('Lỗi', 'Vui lòng chọn một phương thức thanh toán.');
      return;
    }

    if (selectedMethodId === 'cod' && totalPrice >= DEPOSIT_REQUIRED_THRESHOLD && !currentQrImage) {
        try {
            setCurrentQrImage(require('../assets/QR_COC.jpg')); // Dùng require()
        } catch (e) {
             Alert.alert("Lỗi", "Không tìm thấy ảnh QR_COC.jpg để hiển thị.");
             return;
        }
        Alert.alert("Yêu cầu đặt cọc", `Đơn hàng của bạn cần đặt cọc ${formatPrice(MIN_DEPOSIT_AMOUNT)}. Vui lòng quét mã QR và xác nhận đã chuyển khoản để tiếp tục.`);
        return;
    }

    const orderDetails: OrderDetailsForSummary = {
      shippingInfo: shippingDetails,
      paymentMethod: selectedMethodId,
      items: selectedCartItems,
      totalAmount: totalPrice,
      depositRequired: (selectedMethodId === 'cod' && totalPrice >= DEPOSIT_REQUIRED_THRESHOLD) ? MIN_DEPOSIT_AMOUNT : 0,
      paymentStatus: (selectedMethodId === 'bankTransfer' || selectedMethodId === 'onlineWallet') ? 'Đã thanh toán (Giả lập)' : 'Chưa thanh toán',
    };

    console.log('Order Details to pass to OrderSummary:', orderDetails);
    navigation.navigate('OrderSummary', { orderDetails: orderDetails });
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Chọn Phương Thức Thanh Toán</Text>

          {PAYMENT_METHODS.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[ styles.methodButton, selectedMethodId === method.id && styles.methodButtonSelected, ]}
              onPress={() => handleSelectMethod(method.id)}
            >
              <View style={styles.radioCircle}>
                {selectedMethodId === method.id && <View style={styles.radioFilled} />}
              </View>
              <Text style={styles.methodLabel}>{method.label}</Text>
            </TouchableOpacity>
          ))}

          {currentQrImage && (selectedMethodId === 'cod' || selectedMethodId === 'bankTransfer') && (
            <View style={styles.depositInfoContainer}>
              {selectedMethodId === 'cod' && totalPrice >= DEPOSIT_REQUIRED_THRESHOLD && (
                <Text style={styles.depositText}>
                  Đơn hàng của bạn có giá trị từ {formatPrice(DEPOSIT_REQUIRED_THRESHOLD)} trở lên.
                  Vui lòng đặt cọc trước <Text style={styles.depositAmountText}>{formatPrice(MIN_DEPOSIT_AMOUNT)}</Text> để hoàn tất đơn hàng.
                </Text>
              )}
              {selectedMethodId === 'bankTransfer' && (
                <Text style={styles.depositText}>
                  Vui lòng chuyển khoản tổng số tiền <Text style={styles.depositAmountText}>{formatPrice(totalPrice)}</Text> vào tài khoản sau:
                </Text>
              )}
              <Image source={currentQrImage} style={styles.qrCodeImage} resizeMode="contain" />
              <Text style={styles.qrInstructionText}>
                {selectedMethodId === 'cod' ? 'Quét mã QR để đặt cọc.' : 'Quét mã QR để thanh toán chuyển khoản.'}
              </Text>
            </View>
          )}

          {selectedMethodId === 'onlineWallet' && (
            <View style={styles.walletInfoContainer}>
              <Text style={styles.walletText}>
                Bạn sẽ được chuyển hướng đến ứng dụng ví điện tử để hoàn tất thanh toán.
              </Text>
              <TouchableOpacity style={styles.walletButton}>
                <Text style={styles.walletButtonText}>Thanh toán với Ví điện tử (Giả lập)</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (!selectedMethodId || isLoading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selectedMethodId || isLoading}
          >
            {isLoading ? (<ActivityIndicator size="small" color="#ffffff"/>) : (<Text style={styles.buttonText}>Tiếp tục</Text>)}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// --- Styles (Giữ nguyên) ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa', },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', },
  container: { paddingHorizontal: 25, paddingVertical: 20, },
  title: { fontSize: 24, fontWeight: 'bold', color: '#343a40', marginBottom: 30, textAlign: 'center', },
  methodButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingVertical: 18, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ced4da', marginBottom: 15, },
  methodButtonSelected: { borderColor: '#e83e8c', backgroundColor: '#fff0f7', },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e83e8c', alignItems: 'center', justifyContent: 'center', marginRight: 12, },
  radioFilled: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e83e8c', },
  methodLabel: { fontSize: 16, color: '#343a40', },
  depositInfoContainer: { marginTop: 20, padding: 15, backgroundColor: '#fff3cd', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ffeeba', },
  depositText: { fontSize: 15, color: '#856404', textAlign: 'center', marginBottom: 15, lineHeight: 22, },
  depositAmountText: { fontWeight: 'bold', },
  qrCodeImage: { width: 200, height: 200, marginBottom: 10, borderWidth: 1, borderColor: '#ccc' },
  qrInstructionText: { fontSize: 13, color: '#6c757d', textAlign: 'center', },
  walletInfoContainer: { marginTop: 20, padding: 15, backgroundColor: '#e9ecef', borderRadius: 8, alignItems: 'center', },
  walletText: { fontSize: 15, color: '#495057', textAlign: 'center', marginBottom: 15, },
  walletButton: { backgroundColor: '#007bff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, },
  walletButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
  button: { width: '100%', backgroundColor: '#e83e8c', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 30, },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
  buttonDisabled: { backgroundColor: '#f09dbf', },
});

export default PaymentMethodScreen;
