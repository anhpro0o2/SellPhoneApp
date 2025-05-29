import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
// Đảm bảo bạn import đúng kiểu props từ App.tsx
import type { OrderHistoryScreenNavProps } from '../../App';
import { useAuth } from '../context/AuthContext';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

// Kiểu dữ liệu cho một đơn hàng lấy từ Firestore
interface Order {
  id: string; // Document ID từ Firestore, cũng chính là orderId đã lưu
  orderId: string;
  userId: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    warrantyPeriod?: string;
  }>;
  shippingInfo: {
    fullName: string;
    phoneNumber: string;
    address: string;
    city: string;
    district: string;
    ward?: string;
  };
  paymentMethod: string;
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  // Thêm các trường khác nếu cần
}

const OrderHistoryScreen: React.FC<OrderHistoryScreenNavProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hàm fetch danh sách đơn hàng
  const fetchOrders = useCallback(async () => {
    if (!user) {
      // Nếu người dùng chưa đăng nhập, không fetch và có thể hiển thị thông báo
      // RootNavigator sẽ tự động chuyển về màn hình Login nếu user là null.
      // Tuy nhiên, để tránh lỗi nếu màn hình này vô tình được render, ta set loading false và orders rỗng.
      setError('Bạn cần đăng nhập để xem lịch sử đơn hàng.');
      setIsLoading(false);
      setOrders([]);
      return;
    }

    console.log('[OrderHistoryScreen] Fetching orders...'); // Log để theo dõi
    setIsLoading(true);
    setError(null);

    try {
      const ordersSnapshot = await firestore()
        .collection('orders')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc') // Sắp xếp mới nhất lên đầu
        .get();

      const fetchedOrders: Order[] = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId,
          userId: data.userId,
          createdAt: data.createdAt as FirebaseFirestoreTypes.Timestamp,
          items: data.items,
          shippingInfo: data.shippingInfo,
          paymentMethod: data.paymentMethod,
          totalAmount: data.totalAmount,
          orderStatus: data.orderStatus,
          paymentStatus: data.paymentStatus,
        } as Order;
      });
      setOrders(fetchedOrders);
      console.log('[OrderHistoryScreen] Orders fetched:', fetchedOrders.length);
    } catch (e) {
      console.error("[OrderHistoryScreen] Lỗi lấy lịch sử đơn hàng:", e);
      setError('Không thể tải lịch sử đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [user]); // fetchOrders phụ thuộc vào user

  // Sử dụng useFocusEffect để fetch lại đơn hàng mỗi khi màn hình được focus
  // Điều này đảm bảo dữ liệu được cập nhật khi người dùng quay lại từ OrderDetailScreen
  useFocusEffect(
    useCallback(() => {
      fetchOrders(); // Gọi hàm fetchOrders khi màn hình được focus

      return () => {
        // Hàm dọn dẹp (cleanup) nếu cần, ví dụ: hủy bỏ một subscription
        // console.log('[OrderHistoryScreen] Screen blurred or unmounted');
      };
    }, [fetchOrders]) // Dependency là fetchOrders (đã được bọc trong useCallback)
  );

  const formatPrice = (price: number): string => {
    return price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp | null | undefined): string => {
    if (!timestamp) return 'Không rõ';
    return timestamp.toDate().toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'đang xử lý':
        return styles.statusProcessing;
      case 'đang giao hàng':
        return styles.statusShipping;
      case 'đã hoàn tất': // Thêm trạng thái này nếu bạn dùng nó
        return styles.statusDelivered; // Có thể dùng chung style với "Đã giao"
      case 'đã giao':
        return styles.statusDelivered;
      case 'đã hủy':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>Mã ĐH: {item.orderId}</Text>
        <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.orderInfoText}>Tổng tiền: <Text style={styles.totalAmountText}>{formatPrice(item.totalAmount)}</Text></Text>
        <View style={[styles.statusBadge, getStatusStyle(item.orderStatus)]}>
            <Text style={styles.statusText}>{item.orderStatus}</Text>
        </View>
      </View>
       <Text style={styles.orderInfoText}>Sản phẩm: {item.items.length > 0 ? item.items[0].name : 'N/A'}{item.items.length > 1 ? ` và ${item.items.length -1} sản phẩm khác` : ''}</Text>
       <Text style={styles.paymentStatusText}>Thanh toán: {item.paymentStatus}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e83e8c" />
        <Text>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  // Nếu không có user, RootNavigator sẽ xử lý chuyển về Login.
  // Chỉ hiển thị lỗi nếu user tồn tại mà vẫn có lỗi fetch.
  if (error && user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  
  // Nếu !user và có lỗi (ví dụ, "Bạn cần đăng nhập...")
  if (!user && error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {/* Không cần nút Login ở đây vì RootNavigator sẽ xử lý */}
      </View>
    );
  }

  if (!orders.length && user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={<Text style={styles.screenTitle}>Lịch Sử Đơn Hàng</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContentContainer: {
    padding: 15,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 20,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  orderItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#343a40',
  },
  orderDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfoText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
  },
  totalAmountText: {
    fontWeight: 'bold',
    color: '#e83e8c',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statusProcessing: {
    backgroundColor: '#ffc107', // Vàng
  },
  statusShipping: {
    backgroundColor: '#17a2b8', // Xanh dương
  },
  statusDelivered: { // Bao gồm cả "Đã hoàn tất"
    backgroundColor: '#28a745', // Xanh lá
  },
  statusCancelled: {
    backgroundColor: '#dc3545', // Đỏ
  },
  statusDefault: {
    backgroundColor: '#6c757d', // Xám
  },
  paymentStatusText: {
    fontSize: 13,
    color: '#5a6268',
    fontStyle: 'italic',
    marginTop: 4,
  }
});

export default OrderHistoryScreen;
