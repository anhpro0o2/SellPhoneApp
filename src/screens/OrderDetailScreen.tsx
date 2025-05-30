import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../App'; // Đảm bảo đường dẫn đúng
import { useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn đúng
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

// Kiểu OrderItemDetail (giữ nguyên)
interface OrderItemDetail {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  warrantyPeriod?: string;
}

// Kiểu ShippingInfo (giữ nguyên)
interface ShippingInfo {
  fullName: string;
  phoneNumber: string;
  address: string;
  city: string;
  district: string;
  ward?: string;
  notes?: string;
}

// Kiểu Order (giữ nguyên)
interface Order {
  id: string;
  orderId: string;
  userId: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  items: OrderItemDetail[]; // Đảm bảo items sử dụng OrderItemDetail
  shippingInfo: ShippingInfo;
  paymentMethod: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  depositRequired?: number | null;
  amountDue?: number;
  shippingFee?: number;
}

export type OrderDetailScreenNavProps = NativeStackScreenProps<MainStackParamList, 'OrderDetail'>;

const OrderDetailScreen: React.FC<OrderDetailScreenNavProps> = ({ route, navigation }) => {
  const { orderId: routeOrderId } = route.params;
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!user) {
      setError('Bạn cần đăng nhập để xem chi tiết đơn hàng.');
      setIsLoading(false);
      return;
    }
    if (!routeOrderId) {
      setError('Không tìm thấy ID đơn hàng.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const orderDocument = await firestore()
        .collection('orders')
        .doc(routeOrderId)
        .get();
      if (orderDocument.exists()) {
        const data = orderDocument.data();
        if (data?.userId !== user.uid) {
            setError('Bạn không có quyền xem đơn hàng này.');
            setOrder(null);
        } else {
            setOrder({
                id: orderDocument.id,
                orderId: data?.orderId,
                userId: data?.userId,
                createdAt: data?.createdAt as FirebaseFirestoreTypes.Timestamp,
                items: data?.items as OrderItemDetail[], // Ép kiểu ở đây
                shippingInfo: data?.shippingInfo,
                paymentMethod: data?.paymentMethod,
                totalAmount: data?.totalAmount,
                orderStatus: data?.orderStatus,
                paymentStatus: data?.paymentStatus,
                depositRequired: data?.depositRequired,
                amountDue: data?.amountDue,
                shippingFee: data?.shippingFee,
            } as Order);
        }
      } else {
        setError('Không tìm thấy đơn hàng.');
        setOrder(null);
      }
    } catch (e) {
      console.error("Lỗi lấy chi tiết đơn hàng:", e);
      setError('Không thể tải chi tiết đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [user, routeOrderId]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleMarkAsCompleted = async () => {
    if (!order) return;
    if (order.orderStatus !== 'Đang xử lý' && order.orderStatus !== 'Đang giao hàng') {
      Alert.alert('Thông báo', 'Chỉ có thể xác nhận hoàn tất cho đơn hàng đang xử lý hoặc đang giao.');
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await firestore().collection('orders').doc(order.id).update({
        orderStatus: 'Đã hoàn tất',
      });
      setOrder(prevOrder => prevOrder ? { ...prevOrder, orderStatus: 'Đã hoàn tất' } : null);
      Alert.alert('Thành công', 'Đơn hàng đã được cập nhật thành "Đã hoàn tất".');
    } catch (e) {
      console.error("Lỗi cập nhật trạng thái đơn hàng:", e);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (typeof price !== 'number' || isNaN(price)) return 'N/A';
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };
  const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp | null | undefined): string => {
    if (!timestamp) return 'Không rõ';
    return timestamp.toDate().toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  const getStatusStyle = (status: string | undefined) => { // Thêm undefined cho status
    switch (status?.toLowerCase()) {
      case 'đang xử lý': return styles.statusProcessing;
      case 'đang giao hàng': return styles.statusShipping;
      case 'đã hoàn tất': return styles.statusDelivered; // Thêm case cho đã hoàn tất
      case 'đã giao': return styles.statusDelivered;
      case 'đã hủy': return styles.statusCancelled;
      default: return styles.statusDefault;
    }
  };
  const calculateWarrantyEndDate = (orderDate: FirebaseFirestoreTypes.Timestamp | undefined, warrantyPeriod?: string): string => { // Thêm undefined cho orderDate
    if (!warrantyPeriod || !orderDate) return 'Không rõ';
    try {
        const monthsMatch = warrantyPeriod.match(/(\d+)\s*tháng/i);
        if (monthsMatch && monthsMatch[1]) {
            const months = parseInt(monthsMatch[1], 10);
            const startDate = orderDate.toDate();
            const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + months));
            return endDate.toLocaleDateString('vi-VN');
        }
        return 'Không xác định';
    } catch (e) {
        console.error("Error calculating warranty end date:", e);
        return 'Lỗi tính toán';
    }
  };

  if (isLoading) {
    return ( <View style={styles.centered}><ActivityIndicator size="large" color="#e83e8c" /><Text>Đang tải chi tiết đơn hàng...</Text></View> );
  }
  if (error) {
    return ( <View style={styles.centered}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Quay lại</Text></TouchableOpacity></View> );
  }
  if (!order) { // Kiểm tra !order trước khi truy cập các thuộc tính của nó
    return ( <View style={styles.centered}><Text style={styles.emptyText}>Không tìm thấy thông tin đơn hàng.</Text><TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Quay lại Lịch sử</Text></TouchableOpacity></View> );
  }

  // --- SỬA LỖI 1: Destructuring sau khi đã chắc chắn order không phải là null ---
  const { shippingInfo, paymentMethod, items, totalAmount, createdAt, orderStatus, paymentStatus, depositRequired, amountDue, shippingFee } = order;
  const subTotalAmount = totalAmount - (shippingFee || 0);
  const canMarkAsCompleted = orderStatus === 'Đang xử lý' || orderStatus === 'Đang giao hàng';
  // --- KẾT THÚC SỬA LỖI 1 ---

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.mainTitle}>Chi Tiết Đơn Hàng</Text>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdText}>Mã ĐH: {order.orderId}</Text>
            <View style={[styles.statusBadge, getStatusStyle(orderStatus)]}>
                <Text style={styles.statusText}>{orderStatus}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>Ngày đặt: {formatDate(createdAt)}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
            <Text style={styles.infoText}>Họ tên: {shippingInfo.fullName}</Text>
            <Text style={styles.infoText}>Điện thoại: {shippingInfo.phoneNumber}</Text>
            <Text style={styles.infoText}>Địa chỉ: {`${shippingInfo.address}, ${shippingInfo.ward || ''}, ${shippingInfo.district}, ${shippingInfo.city}`}</Text>
            {shippingInfo.notes && <Text style={styles.infoText}>Ghi chú: {shippingInfo.notes}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sản phẩm ({items.length})</Text>
            {/* --- SỬA LỖI 2: Thêm kiểu cho item --- */}
            {items.map((item: OrderItemDetail, index) => (
            // --- KẾT THÚC SỬA LỖI 2 ---
              <View key={item.id + index} style={styles.productItem}>
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>Đơn giá: {formatPrice(item.price)}</Text>
                  <Text style={styles.productQuantity}>Số lượng: {item.quantity}</Text>
                  {item.warrantyPeriod && (
                    <Text style={styles.warrantyText}>
                      Bảo hành: {item.warrantyPeriod} (đến {calculateWarrantyEndDate(createdAt, item.warrantyPeriod)})
                    </Text>
                  )}
                </View>
                <Text style={styles.productItemTotal}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chi tiết thanh toán</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phương thức:</Text>
              <Text style={styles.summaryValue}>{paymentMethod}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trạng thái TT:</Text>
              <Text style={styles.summaryValue}>{paymentStatus}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng tiền hàng:</Text>
              <Text style={styles.summaryValue}>{formatPrice(subTotalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Phí vận chuyển:</Text>
              <Text style={styles.summaryValue}>{formatPrice(shippingFee || 0)}</Text>
            </View>
            {typeof depositRequired === 'number' && depositRequired > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Đã đặt cọc:</Text>
                    <Text style={[styles.summaryValue, styles.highlightValuePositive]}>-{formatPrice(depositRequired)}</Text>
                </View>
            )}
            <View style={[styles.summaryRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>
                {paymentMethod.toLowerCase().includes('cod') && typeof amountDue === 'number' ? 'Cần thanh toán khi nhận:' : 'Tổng thanh toán:'}
              </Text>
              <Text style={styles.grandTotalValue}>{formatPrice(typeof amountDue === 'number' ? amountDue : totalAmount)}</Text>
            </View>
          </View>

          {canMarkAsCompleted && (
            <TouchableOpacity
              style={[styles.actionButton, isUpdatingStatus && styles.buttonDisabled]}
              onPress={handleMarkAsCompleted}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Đã nhận được hàng</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.buttonText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Styles (giữ nguyên)
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa', },
  scrollContainer: { paddingBottom: 30, },
  container: { paddingHorizontal: 15, paddingVertical: 20, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa', },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: '#343a40', textAlign: 'center', marginBottom: 10, },
  orderIdContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, },
  orderIdText: { fontSize: 16, color: '#495057', fontWeight: '600', },
  dateText: { fontSize: 13, color: '#6c757d', textAlign: 'center', marginBottom: 20, },
  section: { backgroundColor: '#ffffff', borderRadius: 8, padding: 15, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#343a40', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8, },
  infoText: { fontSize: 15, color: '#495057', lineHeight: 22, marginBottom: 5, },
  productItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'flex-start', },
  productImage: { width: 70, height: 70, borderRadius: 6, marginRight: 12, },
  productDetails: { flex: 1, justifyContent: 'center', },
  productName: { fontSize: 15, fontWeight: '600', color: '#343a40', marginBottom: 4, },
  productPrice: { fontSize: 13, color: '#6c757d', marginBottom: 2, },
  productQuantity: { fontSize: 13, color: '#6c757d', marginBottom: 4, },
  warrantyText: { fontSize: 12, color: '#28a745', fontStyle: 'italic', },
  productItemTotal: { fontSize: 15, fontWeight: 'bold', color: '#e83e8c', marginLeft: 10, textAlign: 'right', },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, },
  summaryLabel: { fontSize: 15, color: '#495057', },
  summaryValue: { fontSize: 15, color: '#343a40', fontWeight: '500', },
  highlightValuePositive: { color: '#28a745', },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#ddd', marginTop: 10, paddingTop: 10, },
  grandTotalLabel: { fontSize: 17, fontWeight: 'bold', color: '#343a40', },
  grandTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#e83e8c', },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 20, },
  emptyText: { fontSize: 16, color: '#6c757d', textAlign: 'center', },
  button: { backgroundColor: '#e83e8c', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, alignItems: 'center', marginTop: 20, },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, },
  statusText: { fontSize: 12, color: '#ffffff', fontWeight: 'bold', },
  statusProcessing: { backgroundColor: '#ffc107', },
  statusShipping: { backgroundColor: '#17a2b8', },
  statusDelivered: { backgroundColor: '#28a745', },
  statusCancelled: { backgroundColor: '#dc3545', },
  statusDefault: { backgroundColor: '#6c757d', },
  actionButton: { backgroundColor: '#28a745', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 10, },
  actionButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', },
  buttonDisabled: { opacity: 0.7, },
});

export default OrderDetailScreen;
