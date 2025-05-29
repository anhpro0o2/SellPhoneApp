import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import type { OrderSummaryScreenNavProps } from '../../App';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';
import productsJsonData from '../data/products.json';

// Định nghĩa kiểu cho sản phẩm gốc từ JSON
interface ProductSourceData {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  brand?: string;
  oldPrice?: number | null;
  description?: string;
  stock?: number;
  discountPercent?: number | null;
  specifications?: { [key: string]: string | undefined };
  colors?: string[];
  warrantyPeriodInMonths?: number;
  defaultWarrantyMonths?: number;
}

// Kiểu dữ liệu ShippingInfo
interface ShippingInfo {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  district: string;
  ward?: string;
  notes?: string;
}

// --- QUAN TRỌNG: Đảm bảo interface này có warrantyPeriodInMonths ---
interface CartItemForSummary {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  warrantyPeriod?: string;
  warrantyPeriodInMonths?: number; // SỐ THÁNG BẢO HÀNH
}
// ---

// Kiểu OrderDetails mà màn hình này nhận từ route params
interface OrderDetails {
  shippingInfo: ShippingInfo;
  paymentMethod: string;
  items: CartItemForSummary[];
  totalAmount: number;
  depositRequired?: number;
  paymentStatus?: string;
}

const getProductDetailsFromSource = (productId: string): { warrantyPeriodInMonths?: number } | undefined => {
    const product = (productsJsonData as ProductSourceData[]).find(p => p.id === productId);
    if (product) {
        if (typeof product.warrantyPeriodInMonths === 'number') {
            return { warrantyPeriodInMonths: product.warrantyPeriodInMonths };
        } else if (typeof product.defaultWarrantyMonths === 'number') {
            return { warrantyPeriodInMonths: product.defaultWarrantyMonths };
        }
    }
    return undefined;
};

const OrderSummaryScreen: React.FC<OrderSummaryScreenNavProps> = ({ route, navigation }) => {
  const { orderDetails } = route.params;
  const { removeItemFromCart } = useCart();
  const { user } = useAuth();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { shippingInfo, paymentMethod, items, totalAmount, depositRequired } = orderDetails;

  const formatPrice = (price: number): string => {
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const shippingFee = 0;

  let paymentMethodLabelText: string;
  let initialPaymentStatus: string;
  let uiPaymentStatusText: string | null = null;
  let finalSummaryLabel: string;
  let finalSummaryAmount: number = totalAmount + shippingFee;
  const initialOrderStatus = 'Đang xử lý';

  switch (paymentMethod) {
    case 'cod':
      paymentMethodLabelText = 'Thanh toán khi nhận hàng (COD)';
      initialPaymentStatus = depositRequired && depositRequired > 0 ? `Cần cọc ${formatPrice(depositRequired)}` : 'Chưa thanh toán';
      if (depositRequired && depositRequired > 0) {
        uiPaymentStatusText = `Cần đặt cọc: ${formatPrice(depositRequired)}`;
        finalSummaryAmount -= depositRequired;
      }
      finalSummaryLabel = "Thanh toán khi nhận hàng:";
      break;
    case 'bankTransfer':
      paymentMethodLabelText = 'Chuyển khoản ngân hàng';
      initialPaymentStatus = orderDetails.paymentStatus || 'Đã thanh toán (Chờ xác nhận)';
      uiPaymentStatusText = `${initialPaymentStatus}: ${formatPrice(totalAmount + shippingFee)}`;
      finalSummaryLabel = "Tổng tiền (Đã thanh toán):";
      break;
    case 'onlineWallet':
      paymentMethodLabelText = 'Ví điện tử';
      initialPaymentStatus = orderDetails.paymentStatus || 'Đã thanh toán (Chờ xác nhận)';
      uiPaymentStatusText = `${initialPaymentStatus}: ${formatPrice(totalAmount + shippingFee)}`;
      finalSummaryLabel = "Tổng tiền (Đã thanh toán):";
      break;
    default:
      paymentMethodLabelText = 'Không xác định';
      initialPaymentStatus = 'Không xác định';
      finalSummaryLabel = "Tổng thanh toán:";
      break;
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      setIsPlacingOrder(false);
      return;
    }
    setIsPlacingOrder(true);

    // --- THÊM CONSOLE.LOG ĐỂ KIỂM TRA items ---
    console.log('Dữ liệu items trong OrderSummaryScreen trước khi map:', JSON.stringify(items, null, 2));
    // ---

    try {
      const orderId = firestore().collection('orders').doc().id;
      const purchaseDate = firestore.FieldValue.serverTimestamp();

      const itemsForOrder = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl,
      }));

      const sanitizedShippingInfo = {
        fullName: shippingInfo.fullName,
        phoneNumber: shippingInfo.phoneNumber,
        address: shippingInfo.address,
        city: shippingInfo.city,
        district: shippingInfo.district,
        ward: shippingInfo.ward || null,
        notes: shippingInfo.notes || null,
      };

      const orderData = {
        orderId,
        userId: user.uid,
        createdAt: purchaseDate,
        items: itemsForOrder,
        shippingInfo: sanitizedShippingInfo,
        paymentMethod: paymentMethodLabelText,
        totalAmount: totalAmount + shippingFee,
        depositRequired: depositRequired && depositRequired > 0 ? depositRequired : null,
        amountDue: finalSummaryAmount,
        orderStatus: initialOrderStatus,
        paymentStatus: initialPaymentStatus,
      };

      await firestore().collection('orders').doc(orderId).set(orderData);
      console.log('Đơn hàng đã được lưu vào Firestore với ID:', orderId);

      const warrantyPromises = items.map(async (item: CartItemForSummary) => { // Thêm kiểu rõ ràng cho item
        const productSourceDetails = getProductDetailsFromSource(item.id);
        // Dòng này sẽ không báo lỗi nếu CartItemForSummary có warrantyPeriodInMonths
        // và dữ liệu item thực sự có trường này
        const warrantyPeriodInMonths = item.warrantyPeriodInMonths || productSourceDetails?.warrantyPeriodInMonths || 12;

        const warrantyData = {
          warrantyId: firestore().collection('warranties').doc().id,
          userId: user.uid,
          orderId: orderId,
          productId: item.id,
          productName: item.name,
          purchaseDate: purchaseDate,
          warrantyPeriodInMonths: warrantyPeriodInMonths,
          status: 'Còn hạn',
        };
        return firestore().collection('warranties').doc(warrantyData.warrantyId).set(warrantyData);
      });

      await Promise.all(warrantyPromises);
      console.log('Tất cả phiếu bảo hành đã được tạo cho đơn hàng:', orderId);

      items.forEach(item => {
        removeItemFromCart(item.id);
      });

      Alert.alert(
        'Đặt hàng thành công!',
        `Cảm ơn bạn đã mua hàng. Mã đơn hàng của bạn là: ${orderId}. Thông tin bảo hành đã được ghi nhận.`,
        [{ text: 'OK', onPress: () => navigation.popToTop() }]
      );

    } catch (error: any) {
      console.error("Lỗi khi đặt hàng và tạo bảo hành:", error);
      Alert.alert('Đặt hàng thất bại', `Đã có lỗi xảy ra. Vui lòng thử lại. Chi tiết: ${error.message}`);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Xác Nhận Đơn Hàng</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
            <Text style={styles.infoText}>Người nhận: {shippingInfo.fullName}</Text>
            <Text style={styles.infoText}>Điện thoại: {shippingInfo.phoneNumber}</Text>
            <Text style={styles.infoText}>Địa chỉ: {`${shippingInfo.address}, ${shippingInfo.ward ? shippingInfo.ward + ', ' : ''}${shippingInfo.district}, ${shippingInfo.city}`}</Text>
            {shippingInfo.notes && <Text style={styles.infoText}>Ghi chú: {shippingInfo.notes}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
            <Text style={styles.infoText}>{paymentMethodLabelText}</Text>
            {uiPaymentStatusText && paymentMethod !== 'cod' && (
                 <Text style={styles.infoTextHighlight}>{uiPaymentStatusText}</Text>
            )}
            {paymentMethod === 'cod' && depositRequired && depositRequired > 0 && uiPaymentStatusText && (
                <Text style={styles.infoTextHighlight}>{uiPaymentStatusText}</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sản phẩm đã chọn ({items.length})</Text>
            {items.map(item => (
              <View key={item.id} style={styles.productItem}>
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>Giá: {formatPrice(item.price)}</Text>
                  <Text style={styles.productQuantity}>Số lượng: {item.quantity}</Text>
                </View>
                <Text style={styles.productSubtotal}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tóm tắt chi phí</Text>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Tổng tiền hàng:</Text>
              <Text style={styles.costValue}>{formatPrice(totalAmount)}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Phí vận chuyển:</Text>
              <Text style={styles.costValue}>{formatPrice(shippingFee)}</Text>
            </View>
            {paymentMethod === 'cod' && depositRequired && depositRequired > 0 && (
                 <View style={styles.costRow}>
                   <Text style={styles.costLabel}>Đã đặt cọc:</Text>
                   <Text style={[styles.costValue, styles.depositValue]}>-{formatPrice(depositRequired)}</Text>
                 </View>
            )}
            <View style={[styles.costRow, styles.finalTotalRow]}>
              <Text style={[styles.costLabel, styles.finalTotalLabel]}>{finalSummaryLabel}</Text>
              <Text style={[styles.costValue, styles.finalTotalValue]}>{formatPrice(finalSummaryAmount)}</Text>
            </View>
          </View>

        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
            style={[styles.placeOrderButton, isPlacingOrder && styles.buttonDisabled]}
            onPress={handlePlaceOrder}
            disabled={isPlacingOrder}
        >
            {isPlacingOrder ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.placeOrderButtonText}>Xác nhận và Đặt hàng</Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa', },
  scrollContainer: { paddingBottom: 20, },
  container: { paddingHorizontal: 20, paddingVertical: 15, },
  title: { fontSize: 24, fontWeight: 'bold', color: '#343a40', marginBottom: 25, textAlign: 'center', },
  section: { marginBottom: 25, backgroundColor: '#fff', borderRadius: 8, padding: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#343a40', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, },
  infoText: { fontSize: 15, color: '#495057', marginBottom: 6, lineHeight: 22, },
  infoTextHighlight: { fontSize: 15, color: '#28a745', fontWeight: 'bold', marginBottom: 6, },
  productItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', },
  productImage: { width: 60, height: 60, borderRadius: 4, marginRight: 12, },
  productInfo: { flex: 1, },
  productName: { fontSize: 14, fontWeight: '600', color: '#343a40', marginBottom: 3, },
  productPrice: { fontSize: 13, color: '#6c757d', },
  productQuantity: { fontSize: 13, color: '#6c757d', },
  productSubtotal: { fontSize: 14, fontWeight: 'bold', color: '#e83e8c', },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, },
  costLabel: { fontSize: 15, color: '#495057', },
  costValue: { fontSize: 15, color: '#343a40', fontWeight: '500', },
  depositValue: { color: '#28a745', },
  finalTotalRow: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, marginTop: 5, },
  finalTotalLabel: { fontSize: 17, fontWeight: 'bold', color: '#343a40', },
  finalTotalValue: { fontSize: 19, fontWeight: 'bold', color: '#e83e8c', },
  footer: { padding: 15, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e0e0e0', },
  placeOrderButton: { backgroundColor: '#28a745', paddingVertical: 15, borderRadius: 8, alignItems: 'center', },
  buttonDisabled: { backgroundColor: '#a3d9a5', },
  placeOrderButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', },
});

export default OrderSummaryScreen;
