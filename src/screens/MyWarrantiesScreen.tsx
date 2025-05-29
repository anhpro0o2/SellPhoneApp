import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity, // Thêm TouchableOpacity nếu muốn item có thể nhấn được
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../App'; // Đảm bảo đường dẫn đúng
import { useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn đúng
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

// Kiểu dữ liệu cho một Phiếu Bảo Hành
interface Warranty {
  id: string; // Document ID từ Firestore (chính là warrantyId đã lưu)
  warrantyId: string;
  userId: string;
  orderId: string;
  productId: string;
  productName: string;
  purchaseDate: FirebaseFirestoreTypes.Timestamp; // Ngày mua hàng
  warrantyPeriodInMonths: number; // Thời hạn bảo hành (số tháng)
  // warrantyEndDate: FirebaseFirestoreTypes.Timestamp; // Ngày hết hạn (nếu đã lưu)
  status: string; // Trạng thái bảo hành: "Còn hạn", "Hết hạn", "Đang xử lý yêu cầu"
}

export type MyWarrantiesScreenNavProps = NativeStackScreenProps<MainStackParamList, 'MyWarranties'>;

const MyWarrantiesScreen: React.FC<MyWarrantiesScreenNavProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateWarrantyEndDate = (purchaseTimestamp: FirebaseFirestoreTypes.Timestamp, periodInMonths: number): Date => {
    const purchaseDate = purchaseTimestamp.toDate();
    const endDate = new Date(purchaseDate);
    endDate.setMonth(purchaseDate.getMonth() + periodInMonths);
    return endDate;
  };

  const fetchWarranties = useCallback(async () => {
    if (!user) {
      setError('Bạn cần đăng nhập để xem thông tin bảo hành.');
      setIsLoading(false);
      setWarranties([]);
      return;
    }

    console.log('[MyWarrantiesScreen] Fetching warranties...');
    setIsLoading(true);
    setError(null);

    try {
      const warrantiesSnapshot = await firestore()
        .collection('warranties')
        .where('userId', '==', user.uid)
        .orderBy('purchaseDate', 'desc') // Sắp xếp theo ngày mua mới nhất
        .get();

      const fetchedWarranties: Warranty[] = warrantiesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          warrantyId: data.warrantyId,
          userId: data.userId,
          orderId: data.orderId,
          productId: data.productId,
          productName: data.productName,
          purchaseDate: data.purchaseDate as FirebaseFirestoreTypes.Timestamp,
          warrantyPeriodInMonths: data.warrantyPeriodInMonths,
          status: data.status,
        } as Warranty;
      });
      setWarranties(fetchedWarranties);
      console.log('[MyWarrantiesScreen] Warranties fetched:', fetchedWarranties.length);
    } catch (e) {
      console.error("[MyWarrantiesScreen] Lỗi lấy danh sách bảo hành:", e);
      setError('Không thể tải danh sách bảo hành. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchWarranties();
    }, [fetchWarranties])
  );

  const formatDate = (timestamp: FirebaseFirestoreTypes.Timestamp | Date | null | undefined): string => {
    if (!timestamp) return 'Không rõ';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  };

  const getStatusStyle = (status: string, endDate: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0); // Chuẩn hóa ngày hôm nay để so sánh
    const warrantyEndDate = new Date(endDate);
    warrantyEndDate.setHours(0,0,0,0); // Chuẩn hóa ngày hết hạn

    if (status.toLowerCase() === 'đã xử lý' || status.toLowerCase() === 'đã từ chối') {
        return styles.statusProcessed; // Ví dụ màu xám cho trạng thái đã xử lý
    }
    if (warrantyEndDate < today) {
        return styles.statusExpired; // Hết hạn
    }
    if (status.toLowerCase() === 'đang xử lý yêu cầu') {
        return styles.statusPendingRequest; // Đang yêu cầu
    }
    return styles.statusActive; // Còn hạn
  };
   const getStatusText = (status: string, endDate: Date): string => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const warrantyEndDate = new Date(endDate);
    warrantyEndDate.setHours(0,0,0,0);

    if (status.toLowerCase() === 'đã xử lý' || status.toLowerCase() === 'đã từ chối') {
        return status;
    }
    if (warrantyEndDate < today) {
        return 'Hết hạn';
    }
     if (status.toLowerCase() === 'đang xử lý yêu cầu') {
        return 'Đang xử lý YC';
    }
    return 'Còn hạn';
  };


  const renderWarrantyItem = ({ item }: { item: Warranty }) => {
    const warrantyEndDate = calculateWarrantyEndDate(item.purchaseDate, item.warrantyPeriodInMonths);
    const currentStatusText = getStatusText(item.status, warrantyEndDate);
    const currentStatusStyle = getStatusStyle(item.status, warrantyEndDate);

    return (
      <View style={styles.warrantyItem}>
        <Text style={styles.productNameText} numberOfLines={2}>{item.productName}</Text>
        <Text style={styles.detailText}>Mã đơn hàng: {item.orderId}</Text>
        <Text style={styles.detailText}>Ngày mua: {formatDate(item.purchaseDate)}</Text>
        <Text style={styles.detailText}>Thời hạn BH: {item.warrantyPeriodInMonths} tháng</Text>
        <Text style={styles.detailText}>Ngày hết hạn BH: {formatDate(warrantyEndDate)}</Text>
        <View style={[styles.statusBadge, currentStatusStyle]}>
            <Text style={styles.statusText}>{currentStatusText}</Text>
        </View>
        {/*
        // Tùy chọn: Thêm nút yêu cầu bảo hành nếu còn hạn
        {currentStatusText === 'Còn hạn' && (
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => Alert.alert('Yêu cầu bảo hành', `Bạn muốn gửi yêu cầu bảo hành cho sản phẩm: ${item.productName}?`)}
          >
            <Text style={styles.requestButtonText}>Yêu cầu bảo hành</Text>
          </TouchableOpacity>
        )}
        */}
      </View>
    );
  };


  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#D70018" />
        <Text style={{ marginTop: 10, color: '#333' }}>Đang tải thông tin bảo hành...</Text>
      </View>
    );
  }

  if (error && user) {
    return ( <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View> );
  }
  if (!user && error) {
    return ( <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View> );
  }

  if (!warranties.length && user) {
    return ( <View style={styles.centered}><Text style={styles.emptyText}>Bạn chưa có sản phẩm nào được bảo hành.</Text></View> );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <FlatList
        data={warranties}
        renderItem={renderWarrantyItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContentContainer}
        ListHeaderComponent={<Text style={styles.screenTitle}>Bảo Hành Của Tôi</Text>}
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
    color: '#D70018',
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
    color: '#D70018',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  warrantyItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  productNameText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 4,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start', // Chỉ chiếm độ rộng cần thiết
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statusActive: { // Còn hạn
    backgroundColor: '#28a745', // Xanh lá
  },
  statusExpired: { // Hết hạn
    backgroundColor: '#6c757d', // Xám
  },
  statusPendingRequest: { // Đang xử lý yêu cầu
    backgroundColor: '#ffc107', // Vàng
  },
   statusProcessed: { // Đã xử lý/Từ chối (ví dụ)
    backgroundColor: '#adb5bd', // Xám nhạt
  },
  requestButton: {
    marginTop: 12,
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  requestButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default MyWarrantiesScreen;
